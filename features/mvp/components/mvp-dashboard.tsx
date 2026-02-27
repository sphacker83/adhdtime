"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clampTaskTotalMinutes,
  createAiFallbackAdapter,
  enforceChunkBudget,
  generateLocalChunking,
  generateTemplateChunking,
  isWithinTaskChunkBudget,
  sumChunkEstMinutes,
  validateChunkingResult
} from "@/features/mvp/lib/chunking";
import { appendEvent, createEvent } from "@/features/mvp/lib/events";
import { computeMvpKpis } from "@/features/mvp/lib/kpi";
import {
  applyChunkCompletionReward,
  applyRecoveryReward,
  createInitialStats,
  rollDailyStats
} from "@/features/mvp/lib/reward";
import { loadPersistedState, savePersistedState } from "@/features/mvp/lib/storage";
import {
  applyElapsedToChunkRemaining,
  applyElapsedWindow,
  createTimerElapsedAccumulator
} from "@/features/mvp/lib/timer-accuracy";
import {
  MAX_CHUNK_EST_MINUTES,
  MAX_TASK_TOTAL_MINUTES,
  MIN_CHUNK_EST_MINUTES,
  MIN_TASK_TOTAL_MINUTES,
  type AppEvent,
  type Chunk,
  type EventSource,
  type FiveStats,
  type PersistedState,
  type StatsState,
  type Task,
  type TimerSession,
  type UserSettings
} from "@/features/mvp/types/domain";
import {
  canShowNotification,
  createSttRecognition,
  createSyncMockAdapter,
  getNotificationCapability,
  getSttCapability,
  requestNotificationPermission,
  type NotificationCapability,
  type NotificationPermissionState,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
  type SttCapability,
  type SyncMockOutcome
} from "@/features/p1/helpers";
import type { ExternalSyncConflict, ExternalSyncJobStatus } from "@/features/p1/types";
import styles from "./mvp-dashboard.module.css";

const TAB_ITEMS = [
  { key: "home", label: "홈" },
  { key: "tasks", label: "할 일" },
  { key: "stats", label: "스탯" },
  { key: "settings", label: "설정" }
] as const;

type TabKey = (typeof TAB_ITEMS)[number]["key"];

const STAT_META: Array<{ key: keyof FiveStats; label: string }> = [
  { key: "initiation", label: "시작력" },
  { key: "focus", label: "몰입력" },
  { key: "breakdown", label: "분해력" },
  { key: "recovery", label: "회복력" },
  { key: "consistency", label: "지속력" }
];

const RISKY_INPUT_PATTERN = /(자해|죽고\s?싶|폭탄|불법|마약|살인|테러)/i;

const DEFAULT_SETTINGS: UserSettings = {
  hapticEnabled: true
};
const DEFAULT_TASK_TOTAL_MINUTES = 60;

const ACTIONABLE_CHUNK_STATUSES: Chunk["status"][] = ["todo", "running", "paused"];

const RECOVERY_FEEDBACK = {
  safetyBlocked: "괜찮아요. 안전을 위해 이 입력은 청킹하지 않았어요. 안전한 할 일로 다시 입력해 주세요.",
  rechunked: "괜찮아요. 더 작은 단계로 다시 나눴어요. 첫 단계부터 이어가요.",
  rescheduled: "괜찮아요. 내일로 다시 등록했어요. 바로 시작할 청크를 준비해뒀어요."
} as const;

const DEFAULT_NOTIFICATION_CAPABILITY: NotificationCapability = {
  supported: false,
  secureContext: false,
  permission: "unsupported",
  canRequestPermission: false
};

const DEFAULT_STT_CAPABILITY: SttCapability = {
  supported: false,
  secureContext: false,
  engine: "unsupported",
  canStartRecognition: false
};

const SYNC_STATUS_LABEL: Record<ExternalSyncJobStatus, string> = {
  IDLE: "idle",
  QUEUED: "queued",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
  CONFLICT: "conflict"
};

function deriveNotificationState(capability: NotificationCapability): NotificationPermissionState {
  if (!capability.supported || !capability.secureContext) {
    return "unsupported";
  }

  return capability.permission;
}

function getNotificationFallbackText(state: NotificationPermissionState): string | null {
  if (state === "denied") {
    return "브라우저 설정에서 알림 권한을 허용으로 변경해야 알림을 받을 수 있어요.";
  }

  if (state === "unsupported") {
    return "이 환경은 알림 API를 지원하지 않거나 HTTPS 보안 컨텍스트가 아니어서 알림을 보낼 수 없어요.";
  }

  return null;
}

function getSttSupportState(capability: SttCapability): "supported" | "unsupported" {
  return capability.canStartRecognition ? "supported" : "unsupported";
}

function extractTranscriptBuffers(event: SpeechRecognitionEventLike): {
  finalTranscript: string;
  interimTranscript: string;
} {
  const finalSegments: string[] = [];
  const interimSegments: string[] = [];

  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index];
    if (!result) {
      continue;
    }

    const primary = result[0];
    const transcript = primary?.transcript?.trim();
    if (!transcript) {
      continue;
    }

    if (result.isFinal) {
      finalSegments.push(transcript);
      continue;
    }

    interimSegments.push(transcript);
  }

  return {
    finalTranscript: finalSegments.join(" ").trim(),
    interimTranscript: interimSegments.join(" ").trim()
  };
}

function clampMinuteInput(minutes: number): number {
  return Math.min(15, Math.max(2, Math.floor(minutes)));
}

function parseTaskTotalMinutesInput(rawInput: string): number | null {
  const parsed = Number(rawInput);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const normalized = Math.floor(parsed);
  if (normalized < MIN_TASK_TOTAL_MINUTES || normalized > MAX_TASK_TOTAL_MINUTES) {
    return null;
  }

  return normalized;
}

function buildTaskSummary(rawInput: string): string {
  return rawInput.trim().replace(/\s+/g, " ").slice(0, 60);
}

function parseOptionalDateTimeInput(rawInput: string): string | undefined {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return undefined;
  }

  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
}

function buildNextRescheduleDate(now = new Date()): string {
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}

function isBudgetCountedChunkStatus(status: Chunk["status"]): boolean {
  return status !== "archived";
}

function getTaskBudgetedChunks(chunks: Chunk[], taskId: string, excludeChunkId?: string): Chunk[] {
  return chunks.filter((chunk) =>
    chunk.taskId === taskId
    && chunk.id !== excludeChunkId
    && isBudgetCountedChunkStatus(chunk.status)
  );
}

function getTaskBudgetUsage(chunks: Chunk[], taskId: string, excludeChunkId?: string): number {
  return sumChunkEstMinutes(getTaskBudgetedChunks(chunks, taskId, excludeChunkId));
}

function isActionableChunkStatus(status: Chunk["status"]): boolean {
  return ACTIONABLE_CHUNK_STATUSES.includes(status);
}

function isTaskClosedStatus(status: Chunk["status"]): boolean {
  return status === "done" || status === "abandoned" || status === "archived";
}

function normalizeLoadedEvents(rawEvents: AppEvent[] | undefined, fallbackSessionId: string): AppEvent[] {
  return (rawEvents ?? []).map((event) => ({
    ...event,
    sessionId: event.sessionId || fallbackSessionId,
    source: event.source || "local",
    taskId: event.taskId ?? null,
    chunkId: event.chunkId ?? null
  }));
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatOptionalDateTime(isoValue?: string): string {
  if (!isoValue) {
    return "미설정";
  }

  return new Date(isoValue).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function chunkStatusLabel(status: Chunk["status"]): string {
  if (status === "running") {
    return "진행 중";
  }
  if (status === "paused") {
    return "일시정지";
  }
  if (status === "done") {
    return "완료";
  }
  if (status === "abandoned") {
    return "중단";
  }
  if (status === "archived") {
    return "보관됨";
  }
  return "대기";
}

function taskStatusLabel(status: Task["status"]): string {
  if (status === "in_progress") {
    return "진행 중";
  }
  if (status === "done") {
    return "완료";
  }
  if (status === "archived") {
    return "보관됨";
  }
  return "대기";
}

function orderChunks(list: Chunk[]): Chunk[] {
  return [...list].sort((a, b) => a.order - b.order);
}

function getXpProgressPercent(stats: StatsState): number {
  const maxXp = 100 + (stats.level - 1) * 45;
  if (maxXp <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((stats.xp / maxXp) * 100));
}

function pointsToString(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function formatPercentValue(value: number | null): string {
  if (value === null) {
    return "데이터 없음";
  }
  return `${value}%`;
}

function formatTimeToStart(seconds: number | null): string {
  if (seconds === null) {
    return "데이터 없음";
  }

  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}분 ${String(remainSeconds).padStart(2, "0")}초`;
}

function buildRadarShape(stats: FiveStats): { data: string; grid: string[] } {
  const center = 60;
  const radius = 48;

  const axes = STAT_META.map((_, index) => {
    const angle = (-Math.PI / 2) + (index * Math.PI * 2) / STAT_META.length;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return [x, y] as [number, number];
  });

  const grid = [0.25, 0.5, 0.75, 1].map((ratio) =>
    pointsToString(
      axes.map(([x, y]) => [
        center + (x - center) * ratio,
        center + (y - center) * ratio
      ])
    )
  );

  const data = pointsToString(
    axes.map(([x, y], index) => {
      const key = STAT_META[index].key;
      const ratio = Math.max(0, Math.min(1, stats[key] / 100));
      return [
        center + (x - center) * ratio,
        center + (y - center) * ratio
      ] as [number, number];
    })
  );

  return { data, grid };
}

function buildInitialState(): PersistedState {
  return {
    tasks: [],
    chunks: [],
    timerSessions: [],
    stats: createInitialStats(),
    settings: DEFAULT_SETTINGS,
    events: [],
    activeTaskId: null,
    activeTab: "home",
    remainingSecondsByChunk: {}
  };
}

function withReorderedTaskChunks(chunks: Chunk[], taskId: string): Chunk[] {
  const targetChunks = orderChunks(chunks.filter((chunk) => chunk.taskId === taskId));
  const reorderedMap = new Map(
    targetChunks.map((chunk, index) => [
      chunk.id,
      {
        ...chunk,
        order: index + 1
      }
    ])
  );

  return chunks.map((chunk) => reorderedMap.get(chunk.id) ?? chunk);
}

function formatEventMeta(meta?: AppEvent["meta"]): string {
  if (!meta) {
    return "";
  }

  return Object.entries(meta)
    .slice(0, 3)
    .map(([key, value]) => `${key}:${String(value)}`)
    .join(" · ");
}

export function MvpDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [timerSessions, setTimerSessions] = useState<TimerSession[]>([]);
  const [stats, setStats] = useState<StatsState>(createInitialStats());
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [remainingSecondsByChunk, setRemainingSecondsByChunk] = useState<Record<string, number>>({});

  const [taskInput, setTaskInput] = useState("");
  const [taskTotalMinutesInput, setTaskTotalMinutesInput] = useState(String(DEFAULT_TASK_TOTAL_MINUTES));
  const [taskScheduledForInput, setTaskScheduledForInput] = useState("");
  const [taskDueAtInput, setTaskDueAtInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<string>("오늘은 가장 작은 행동부터 시작해요.");
  const [clock, setClock] = useState(new Date());
  const [currentChunkId, setCurrentChunkId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notificationCapability, setNotificationCapability] = useState<NotificationCapability>(
    DEFAULT_NOTIFICATION_CAPABILITY
  );
  const [isRequestingNotificationPermission, setIsRequestingNotificationPermission] = useState(false);
  const [sttCapability, setSttCapability] = useState<SttCapability>(DEFAULT_STT_CAPABILITY);
  const [isSttListening, setIsSttListening] = useState(false);
  const [sttTranscript, setSttTranscript] = useState("");
  const [sttError, setSttError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<ExternalSyncJobStatus>("IDLE");
  const [syncLastJobId, setSyncLastJobId] = useState<string | null>(null);
  const [syncConflict, setSyncConflict] = useState<ExternalSyncConflict | null>(null);
  const [syncMessage, setSyncMessage] = useState("동기화 대기 중");

  const aiAdapterRef = useRef(createAiFallbackAdapter());
  const sessionIdRef = useRef(crypto.randomUUID());
  const tickAccumulatorRef = useRef(createTimerElapsedAccumulator());
  const sttRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sttFinalTranscriptRef = useRef("");
  const sttInterimTranscriptRef = useRef("");
  const syncMockAdapterRef = useRef(createSyncMockAdapter("GOOGLE_CALENDAR"));
  const lastHapticBucketByChunkRef = useRef<Record<string, number>>({});
  const gateMetricsRef = useRef<{
    startClickCountByTaskId: Record<string, number>;
    firstStartLoggedByTaskId: Record<string, boolean>;
    recoveryClickCountByTaskId: Record<string, number>;
  }>({
    startClickCountByTaskId: {},
    firstStartLoggedByTaskId: {},
    recoveryClickCountByTaskId: {}
  });

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) ?? null,
    [tasks, activeTaskId]
  );

  const activeTaskChunks = useMemo(() => {
    if (!activeTaskId) {
      return [];
    }
    return orderChunks(chunks.filter((chunk) => chunk.taskId === activeTaskId));
  }, [chunks, activeTaskId]);

  const runningChunk = useMemo(
    () => chunks.find((chunk) => chunk.status === "running") ?? null,
    [chunks]
  );
  const executionLockedChunk = useMemo(
    () => chunks.find((chunk) => chunk.status === "running" || chunk.status === "paused") ?? null,
    [chunks]
  );
  const executionLockedTaskId = executionLockedChunk?.taskId ?? null;
  const isExecutionLocked = executionLockedChunk !== null;
  const activeTaskBudgetUsage = useMemo(
    () => (activeTaskId ? getTaskBudgetUsage(chunks, activeTaskId) : 0),
    [chunks, activeTaskId]
  );

  const completionRate = useMemo(() => {
    if (chunks.length === 0) {
      return 0;
    }
    const doneCount = chunks.filter((chunk) => chunk.status === "done").length;
    return Math.round((doneCount / chunks.length) * 100);
  }, [chunks]);

  const xpProgressPercent = getXpProgressPercent(stats);
  const kpis = useMemo(() => computeMvpKpis(events), [events]);

  const radar = useMemo(
    () => buildRadarShape(stats),
    [stats]
  );
  const notificationState = deriveNotificationState(notificationCapability);
  const notificationFallbackText = getNotificationFallbackText(notificationState);
  const sttSupportState = getSttSupportState(sttCapability);
  const syncStatusLabel = SYNC_STATUS_LABEL[syncStatus];
  const isSyncBusy = syncStatus === "QUEUED" || syncStatus === "RUNNING";

  const clearSttTranscriptRefs = () => {
    sttFinalTranscriptRef.current = "";
    sttInterimTranscriptRef.current = "";
  };

  const resetSttTranscriptBuffers = () => {
    clearSttTranscriptRefs();
    setSttTranscript("");
  };

  const mergeSttTranscript = (finalTranscript: string, interimTranscript: string): string =>
    [finalTranscript, interimTranscript].filter(Boolean).join(" ").trim();

  useEffect(() => {
    const tick = window.setInterval(() => {
      setClock(new Date());
    }, 1000);

    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const loaded = loadPersistedState();
    if (loaded) {
      const loadedChunkMinutesByTask = (loaded.chunks ?? []).reduce<Record<string, number>>((acc, chunk) => {
        acc[chunk.taskId] = (acc[chunk.taskId] ?? 0) + chunk.estMinutes;
        return acc;
      }, {});

      setTasks(
        (loaded.tasks ?? []).map((task) => ({
          ...task,
          summary: task.summary ?? task.title,
          totalMinutes: clampTaskTotalMinutes(
            task.totalMinutes,
            loadedChunkMinutesByTask[task.id] ?? DEFAULT_TASK_TOTAL_MINUTES
          )
        }))
      );
      setChunks(loaded.chunks ?? []);
      setTimerSessions(loaded.timerSessions ?? []);
      setStats(rollDailyStats(loaded.stats ?? createInitialStats()));
      setSettings(loaded.settings ?? DEFAULT_SETTINGS);
      setEvents(normalizeLoadedEvents(loaded.events, sessionIdRef.current));
      setActiveTaskId(loaded.activeTaskId ?? null);
      setActiveTab((loaded.activeTab ?? "home") as TabKey);
      setRemainingSecondsByChunk(loaded.remainingSecondsByChunk ?? {});
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    setNotificationCapability(getNotificationCapability());
    setSttCapability(getSttCapability());
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      setNotificationCapability(getNotificationCapability());
      setSttCapability(getSttCapability());
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hydrated]);

  useEffect(() => {
    return () => {
      if (sttRecognitionRef.current) {
        sttRecognitionRef.current.stop();
        sttRecognitionRef.current = null;
      }

      clearSttTranscriptRefs();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    savePersistedState({
      tasks,
      chunks,
      timerSessions,
      stats,
      settings,
      events,
      activeTaskId,
      activeTab,
      remainingSecondsByChunk
    });
  }, [
    hydrated,
    tasks,
    chunks,
    timerSessions,
    stats,
    settings,
    events,
    activeTaskId,
    activeTab,
    remainingSecondsByChunk
  ]);

  useEffect(() => {
    if (tasks.length === 0) {
      if (activeTaskId !== null) {
        setActiveTaskId(null);
      }
      return;
    }

    if (activeTaskId && tasks.some((task) => task.id === activeTaskId && task.status !== "archived")) {
      return;
    }

    const nextTask = tasks.find((task) => task.status === "in_progress")
      ?? tasks.find((task) => task.status === "todo")
      ?? tasks.find((task) => task.status !== "archived")
      ?? tasks[0];
    if (nextTask) {
      setActiveTaskId(nextTask.id);
    }
  }, [tasks, activeTaskId]);

  useEffect(() => {
    if (!activeTaskId) {
      if (currentChunkId !== null) {
        setCurrentChunkId(null);
      }
      return;
    }

    const usableChunks = activeTaskChunks.filter((chunk) => isActionableChunkStatus(chunk.status));
    if (usableChunks.length === 0) {
      if (currentChunkId !== null) {
        setCurrentChunkId(null);
      }
      return;
    }

    if (currentChunkId && usableChunks.some((chunk) => chunk.id === currentChunkId)) {
      return;
    }

    const nextChunk = usableChunks.find((chunk) => chunk.status === "running") ?? usableChunks[0];
    setCurrentChunkId(nextChunk.id);
  }, [activeTaskId, activeTaskChunks, currentChunkId]);

  useEffect(() => {
    if (!runningChunk) {
      tickAccumulatorRef.current = createTimerElapsedAccumulator();
      return;
    }

    const applyTick = () => {
      if (!runningChunk) {
        return;
      }

      const tickResult = applyElapsedWindow({
        nowMs: Date.now(),
        accumulator: tickAccumulatorRef.current
      });
      tickAccumulatorRef.current = tickResult.nextAccumulator;

      setRemainingSecondsByChunk((prev) => {
        return applyElapsedToChunkRemaining({
          remainingSecondsByChunk: prev,
          chunkId: runningChunk.id,
          chunkTotalSeconds: runningChunk.estMinutes * 60,
          elapsedSeconds: tickResult.elapsedSeconds
        });
      });
    };

    const intervalId = window.setInterval(applyTick, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        applyTick();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [runningChunk]);

  useEffect(() => {
    if (!runningChunk || !settings.hapticEnabled) {
      return;
    }

    const total = runningChunk.estMinutes * 60;
    const remaining = remainingSecondsByChunk[runningChunk.id] ?? total;
    const elapsed = Math.max(0, total - remaining);
    const currentBucket = Math.floor(elapsed / 300);
    const previousBucket = lastHapticBucketByChunkRef.current[runningChunk.id] ?? 0;

    if (currentBucket > previousBucket && currentBucket > 0) {
      lastHapticBucketByChunkRef.current[runningChunk.id] = currentBucket;

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(35);
      }

      setEvents((prev) =>
        appendEvent(
          prev,
          createEvent({
            eventName: "haptic_fired",
            sessionId: sessionIdRef.current,
            source: "local",
            taskId: runningChunk.taskId,
            chunkId: runningChunk.id,
            meta: {
              minuteMark: currentBucket * 5
            }
          })
        )
      );
    }
  }, [remainingSecondsByChunk, runningChunk, settings.hapticEnabled]);

  useEffect(() => {
    setTasks((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const nowIso = new Date().toISOString();
      const next = prev.map((task) => {
        if (task.status === "archived") {
          return task;
        }

        const taskChunks = chunks.filter((chunk) => chunk.taskId === task.id);
        const openTaskChunks = taskChunks.filter((chunk) => !isTaskClosedStatus(chunk.status));
        if (taskChunks.length === 0) {
          return task;
        }

        const allClosed = taskChunks.every((chunk) => isTaskClosedStatus(chunk.status));
        const hasRunningOrPaused = openTaskChunks.some((chunk) => chunk.status === "running" || chunk.status === "paused");
        const inferredStartedAt = openTaskChunks
          .map((chunk) => chunk.startedAt)
          .filter((startedAt): startedAt is string => Boolean(startedAt))
          .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
        const inferredCompletedAt = taskChunks
          .map((chunk) => chunk.completedAt)
          .filter((completedAt): completedAt is string => Boolean(completedAt))
          .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

        const hasStarted = Boolean(task.startedAt || inferredStartedAt);
        const nextStatus: Task["status"] = allClosed
          ? "done"
          : hasRunningOrPaused || hasStarted
            ? "in_progress"
            : "todo";
        const nextStartedAt = task.startedAt ?? inferredStartedAt;
        const nextCompletedAt = nextStatus === "done"
          ? task.completedAt ?? inferredCompletedAt ?? nowIso
          : undefined;

        if (
          task.status === nextStatus
          && task.startedAt === nextStartedAt
          && task.completedAt === nextCompletedAt
        ) {
          return task;
        }

        return {
          ...task,
          status: nextStatus,
          startedAt: nextStartedAt,
          completedAt: nextCompletedAt
        };
      });

      const changed = next.some((task, index) => task !== prev[index]);
      return changed ? next : prev;
    });
  }, [chunks]);

  const upsertTimerSession = (chunkId: string, nextState: TimerSession["state"], nowIso: string) => {
    setTimerSessions((prev) => {
      const activeSessionIndex = prev.findIndex(
        (session) => session.chunkId === chunkId && session.state !== "ended"
      );

      if (activeSessionIndex === -1) {
        if (nextState === "ended") {
          return prev;
        }

        return [
          {
            id: crypto.randomUUID(),
            chunkId,
            state: nextState,
            startedAt: nowIso,
            pausedAt: nextState === "paused" ? nowIso : undefined,
            pauseCount: nextState === "paused" ? 1 : 0
          },
          ...prev
        ];
      }

      const current = prev[activeSessionIndex];
      const nextSession: TimerSession =
        nextState === "paused"
          ? {
              ...current,
              state: "paused",
              pausedAt: nowIso,
              pauseCount: current.pauseCount + 1
            }
          : nextState === "running"
            ? {
                ...current,
                state: "running",
                pausedAt: undefined
              }
            : {
                ...current,
                state: "ended",
                endedAt: nowIso
              };

      return prev.map((session, index) => (index === activeSessionIndex ? nextSession : session));
    });
  };

  const logEvent = (params: {
    eventName: AppEvent["eventName"];
    source: EventSource;
    taskId?: string;
    chunkId?: string;
    meta?: AppEvent["meta"];
  }) => {
    setEvents((prev) =>
      appendEvent(
        prev,
        createEvent({
          ...params,
          sessionId: sessionIdRef.current
        })
      )
    );
  };

  const pushLoopNotification = (params: {
    eventName: "chunk_started" | "chunk_completed" | "reschedule_requested" | "task_rescheduled";
    taskTitle: string;
    chunkAction: string;
  }) => {
    const capability = getNotificationCapability();
    setNotificationCapability(capability);

    if (!canShowNotification(capability)) {
      return;
    }

    if (typeof window === "undefined" || typeof window.Notification !== "function") {
      return;
    }

    const title =
      params.eventName === "chunk_started"
        ? "청크 시작"
        : params.eventName === "chunk_completed"
          ? "청크 완료"
          : "내일로 재등록";
    const body =
      params.eventName === "chunk_started"
        ? `${params.taskTitle} · ${params.chunkAction}`
        : params.eventName === "chunk_completed"
          ? `${params.taskTitle} · ${params.chunkAction} 청크를 완료했어요.`
          : `${params.taskTitle} · ${params.chunkAction} 청크를 내일로 옮겼어요.`;
    const notification = new window.Notification(title, {
      body,
      tag: `adhdtime-${params.eventName}-${Date.now()}`
    });

    window.setTimeout(() => {
      notification.close();
    }, 4500);
  };

  const handleRequestNotification = async () => {
    setIsRequestingNotificationPermission(true);
    try {
      await requestNotificationPermission();
    } finally {
      setNotificationCapability(getNotificationCapability());
      setIsRequestingNotificationPermission(false);
    }
  };

  const handleStartStt = () => {
    const capability = getSttCapability();
    setSttCapability(capability);

    if (!capability.canStartRecognition) {
      setIsSttListening(false);
      resetSttTranscriptBuffers();
      setSttError("현재 환경에서는 STT를 사용할 수 없습니다.");
      return;
    }

    if (sttRecognitionRef.current) {
      sttRecognitionRef.current.stop();
      sttRecognitionRef.current = null;
    }

    const recognition = createSttRecognition("ko-KR");
    if (!recognition) {
      resetSttTranscriptBuffers();
      setSttError("STT 엔진 초기화에 실패했습니다.");
      return;
    }

    setSttError(null);
    resetSttTranscriptBuffers();

    recognition.onresult = (event) => {
      const { finalTranscript, interimTranscript } = extractTranscriptBuffers(event);
      sttFinalTranscriptRef.current = finalTranscript;
      sttInterimTranscriptRef.current = interimTranscript;
      setSttTranscript(interimTranscript);

      const mergedTranscript = mergeSttTranscript(finalTranscript, interimTranscript);
      if (mergedTranscript) {
        setTaskInput(mergedTranscript);
      }
    };
    recognition.onerror = (event) => {
      setSttError(`음성 인식 오류: ${event.error}`);
      setIsSttListening(false);
      sttRecognitionRef.current = null;
      resetSttTranscriptBuffers();
    };
    recognition.onend = () => {
      setIsSttListening(false);
      sttRecognitionRef.current = null;
      resetSttTranscriptBuffers();
    };

    sttRecognitionRef.current = recognition;

    try {
      recognition.start();
      setIsSttListening(true);
    } catch {
      setIsSttListening(false);
      setSttError("STT 시작 중 오류가 발생했습니다.");
      sttRecognitionRef.current = null;
      resetSttTranscriptBuffers();
    }
  };

  const handleStopStt = () => {
    if (sttRecognitionRef.current) {
      sttRecognitionRef.current.stop();
      sttRecognitionRef.current = null;
    }
    setIsSttListening(false);
    resetSttTranscriptBuffers();
  };

  const handleRunSyncMock = async (outcome: SyncMockOutcome) => {
    if (isSyncBusy) {
      return;
    }

    setSyncConflict(null);

    try {
      await syncMockAdapterRef.current.simulateSync({
        outcome,
        onTransition: ({ job, conflict }) => {
          setSyncStatus(job.status);
          setSyncLastJobId(job.id);

          if (job.status === "QUEUED") {
            setSyncMessage("queued: 동기화 요청을 큐에 등록했습니다.");
            setSyncConflict(null);
            return;
          }

          if (job.status === "RUNNING") {
            setSyncMessage("running: 외부 provider와 데이터를 비교 중입니다.");
            return;
          }

          if (job.status === "SUCCESS") {
            setSyncMessage("success: mock 동기화가 정상 완료되었습니다.");
            setSyncConflict(null);
            return;
          }

          if (job.status === "FAILED") {
            setSyncMessage("failed: mock 동기화가 실패했습니다.");
            setSyncConflict(null);
            return;
          }

          if (job.status === "CONFLICT") {
            setSyncMessage("conflict: 충돌이 감지되어 사용자 확인이 필요합니다.");
            setSyncConflict(conflict);
          }
        }
      });
    } catch {
      setSyncStatus("FAILED");
      setSyncMessage("failed: mock 어댑터 실행 중 예외가 발생했습니다.");
    }
  };

  const handleGenerateTask = async () => {
    const rawInput = taskInput.trim();
    if (!rawInput) {
      setFeedback("할 일을 입력하면 바로 10분 단위로 쪼개드릴게요.");
      return;
    }

    const parsedTotalMinutes = parseTaskTotalMinutesInput(taskTotalMinutesInput);
    if (parsedTotalMinutes === null) {
      setFeedback(`총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 사이로 입력해주세요.`);
      return;
    }

    const hasScheduledForInput = taskScheduledForInput.trim().length > 0;
    const hasDueAtInput = taskDueAtInput.trim().length > 0;
    const scheduledFor = parseOptionalDateTimeInput(taskScheduledForInput);
    const dueAt = parseOptionalDateTimeInput(taskDueAtInput);
    if ((hasScheduledForInput && !scheduledFor) || (hasDueAtInput && !dueAt)) {
      setFeedback("일정 시간 형식이 올바르지 않습니다. 날짜와 시간을 다시 확인해주세요.");
      return;
    }
    if (scheduledFor && dueAt && Date.parse(scheduledFor) > Date.parse(dueAt)) {
      setFeedback("시작 예정 시간은 마감 시간보다 늦을 수 없습니다.");
      return;
    }

    if (RISKY_INPUT_PATTERN.test(rawInput)) {
      logEvent({
        eventName: "safety_blocked",
        source: "system",
        meta: {
          reason: "risky_input",
          inputLength: rawInput.length
        }
      });
      setFeedback(RECOVERY_FEEDBACK.safetyBlocked);
      return;
    }

    setIsGenerating(true);

    try {
      const taskId = crypto.randomUUID();
      const summary = buildTaskSummary(rawInput);
      const chunkingStartedAt = Date.now();
      let source: EventSource = "local";
      let chunking = generateLocalChunking(taskId, rawInput);

      if (!chunking) {
        source = "ai";
        try {
          chunking = await aiAdapterRef.current.generate({ taskId, title: rawInput });
        } catch {
          chunking = null;
        }
      }

      if (!chunking) {
        source = "local";
        chunking = generateTemplateChunking(taskId, rawInput);
      }

      let usedValidationFallback = false;
      const validation = validateChunkingResult(chunking);
      if (!validation.ok) {
        usedValidationFallback = true;
        source = "local";
        chunking = generateTemplateChunking(taskId, rawInput);
      }

      const chunkingLatencyMs = Date.now() - chunkingStartedAt;
      const createdAt = new Date().toISOString();

      const safeTitle = summary || "새 과업";
      const adjustedChunkTemplates = enforceChunkBudget(chunking.chunks, parsedTotalMinutes).map((chunk, index) => ({
        ...chunk,
        order: index + 1
      }));

      const nextTask: Task = {
        id: taskId,
        title: safeTitle,
        summary: safeTitle,
        totalMinutes: parsedTotalMinutes,
        createdAt,
        scheduledFor,
        dueAt,
        status: "todo"
      };

      const nextChunks: Chunk[] = adjustedChunkTemplates.map((chunk) => ({
        id: chunk.chunkId,
        taskId,
        order: chunk.order,
        action: chunk.action,
        estMinutes: chunk.estMinutes,
        status: "todo"
      }));

      if (!isWithinTaskChunkBudget(nextChunks, parsedTotalMinutes)) {
        setFeedback("청크 시간 합계가 과업 총 시간 예산을 초과해 생성이 취소되었습니다.");
        return;
      }

      setTasks((prev) => [nextTask, ...prev]);
      setChunks((prev) => [...nextChunks, ...prev]);
      setRemainingSecondsByChunk((prev) => {
        const next = { ...prev };
        nextChunks.forEach((chunk) => {
          next[chunk.id] = chunk.estMinutes * 60;
        });
        return next;
      });
      gateMetricsRef.current.startClickCountByTaskId[taskId] = 0;
      gateMetricsRef.current.firstStartLoggedByTaskId[taskId] = false;
      gateMetricsRef.current.recoveryClickCountByTaskId[taskId] = 0;

      setActiveTaskId(taskId);
      setCurrentChunkId(nextChunks[0]?.id ?? null);
      setTaskInput("");
      setTaskScheduledForInput("");
      setTaskDueAtInput("");
      setActiveTab("home");
      setFeedback(
        source === "local"
          ? "로컬 청킹으로 바로 시작할 수 있게 준비했어요."
          : "AI 폴백으로 청킹을 완료했어요."
      );

      logEvent({
        eventName: "task_created",
        source: "user",
        taskId,
        meta: {
          summaryLength: safeTitle.length,
          chunkCount: nextChunks.length,
          totalMinutes: parsedTotalMinutes,
          scheduledFor: scheduledFor ?? null,
          dueAt: dueAt ?? null
        }
      });

      logEvent({
        eventName: "chunk_generated",
        source,
        taskId,
        meta: {
          chunkCount: nextChunks.length,
          originalChunkCount: chunking.chunks.length,
          adjustedForBudget: chunking.chunks.length !== nextChunks.length
            || sumChunkEstMinutes(chunking.chunks) !== sumChunkEstMinutes(nextChunks),
          chunkingLatencyMs,
          withinTenSeconds: chunkingLatencyMs <= 10_000,
          usedValidationFallback
        }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartChunk = (chunkId: string) => {
    const target = chunks.find((chunk) => chunk.id === chunkId);
    if (!target || !isActionableChunkStatus(target.status)) {
      return;
    }

    const metricState = gateMetricsRef.current;
    const startClickCount = (metricState.startClickCountByTaskId[target.taskId] ?? 0) + 1;
    metricState.startClickCountByTaskId[target.taskId] = startClickCount;
    const isFirstStart = !metricState.firstStartLoggedByTaskId[target.taskId];
    metricState.firstStartLoggedByTaskId[target.taskId] = true;

    const createdAtRaw = tasks.find((task) => task.id === target.taskId)?.createdAt;
    const createdAtMs = createdAtRaw ? new Date(createdAtRaw).getTime() : Number.NaN;
    const timeToFirstStartMs =
      isFirstStart && Number.isFinite(createdAtMs)
        ? Math.max(0, Date.now() - createdAtMs)
        : undefined;

    const nowIso = new Date().toISOString();
    const runningChunkIds = chunks
      .filter((chunk) => chunk.status === "running" && chunk.id !== chunkId)
      .map((chunk) => chunk.id);

    setChunks((prev) =>
      prev.map((chunk) => {
        if (chunk.id === chunkId) {
          return {
            ...chunk,
            status: "running",
            startedAt: chunk.startedAt ?? nowIso
          };
        }

        if (chunk.status === "running") {
          return {
            ...chunk,
            status: "paused"
          };
        }

        return chunk;
      })
    );

    setTasks((prev) =>
      prev.map((task) =>
        task.id === target.taskId
          ? {
              ...task,
              status: task.status === "archived" ? "archived" : "in_progress",
              startedAt: task.startedAt ?? nowIso,
              completedAt: undefined
            }
          : task
      )
    );

    runningChunkIds.forEach((runningId) => {
      upsertTimerSession(runningId, "paused", nowIso);
    });

    upsertTimerSession(chunkId, "running", nowIso);

    setRemainingSecondsByChunk((prev) => ({
      ...prev,
      [chunkId]: prev[chunkId] ?? target.estMinutes * 60
    }));

    tickAccumulatorRef.current = createTimerElapsedAccumulator(Date.now());
    setCurrentChunkId(chunkId);
    setActiveTaskId(target.taskId);

    logEvent({
      eventName: "chunk_started",
      source: "local",
      taskId: target.taskId,
      chunkId,
      meta: {
        startClickCount,
        firstStart: isFirstStart,
        timeToFirstStartMs: timeToFirstStartMs ?? null,
        withinThreeMinutes: timeToFirstStartMs !== undefined ? timeToFirstStartMs <= 180_000 : null
      }
    });

    const taskTitle = tasks.find((task) => task.id === target.taskId)?.title ?? "과업";
    pushLoopNotification({
      eventName: "chunk_started",
      taskTitle,
      chunkAction: target.action
    });
  };

  const handlePauseChunk = (chunkId: string) => {
    const target = chunks.find((chunk) => chunk.id === chunkId);
    if (!target || target.status !== "running") {
      return;
    }

    const nowIso = new Date().toISOString();

    setChunks((prev) =>
      prev.map((chunk) =>
        chunk.id === chunkId
          ? {
              ...chunk,
              status: "paused"
            }
          : chunk
      )
    );

    upsertTimerSession(chunkId, "paused", nowIso);
    tickAccumulatorRef.current = createTimerElapsedAccumulator();

    logEvent({
      eventName: "chunk_paused",
      source: "local",
      taskId: target.taskId,
      chunkId
    });
  };

  const handleCompleteChunk = (chunkId: string) => {
    const target = chunks.find((chunk) => chunk.id === chunkId);
    if (!target || !isActionableChunkStatus(target.status)) {
      return;
    }

    const nowIso = new Date().toISOString();
    const totalSeconds = target.estMinutes * 60;
    const remaining = remainingSecondsByChunk[chunkId] ?? totalSeconds;
    const actualSeconds = Math.max(1, totalSeconds - remaining);

    const candidateChunks = orderChunks(
      chunks.filter((item) => item.taskId === target.taskId && item.id !== target.id)
    );
    const nextChunk = candidateChunks.find((chunk) => chunk.order > target.order && isActionableChunkStatus(chunk.status))
      ?? candidateChunks.find((chunk) => isActionableChunkStatus(chunk.status))
      ?? null;

    setChunks((prev) =>
      prev.map((chunk) =>
        chunk.id === chunkId
          ? {
              ...chunk,
              status: "done",
              completedAt: nowIso,
              actualSeconds
            }
          : chunk
      )
    );

    setRemainingSecondsByChunk((prev) => ({
      ...prev,
      [chunkId]: 0
    }));

    upsertTimerSession(chunkId, "ended", nowIso);
    setCurrentChunkId(nextChunk?.id ?? null);
    tickAccumulatorRef.current = createTimerElapsedAccumulator();

    const reward = applyChunkCompletionReward({
      stats,
      estMinutes: target.estMinutes,
      actualSeconds
    });

    setStats(reward.nextStats);

    logEvent({
      eventName: "chunk_completed",
      source: "local",
      taskId: target.taskId,
      chunkId,
      meta: {
        actualSeconds,
        estMinutes: target.estMinutes
      }
    });

    logEvent({
      eventName: "xp_gained",
      source: "local",
      taskId: target.taskId,
      chunkId,
      meta: {
        xpGain: reward.xpGain
      }
    });

    if (reward.levelUps > 0) {
      logEvent({
        eventName: "level_up",
        source: "local",
        taskId: target.taskId,
        chunkId,
        meta: {
          levelUps: reward.levelUps,
          currentLevel: reward.nextStats.level
        }
      });
    }

    const taskTitle = tasks.find((task) => task.id === target.taskId)?.title ?? "과업";
    pushLoopNotification({
      eventName: "chunk_completed",
      taskTitle,
      chunkAction: target.action
    });

    setFeedback(`좋아요. +${reward.xpGain} XP 획득! ${nextChunk ? "다음 청크로 바로 이어가요." : "오늘 루프를 완료했어요."}`);
  };

  const handleAdjustRunningChunkMinutes = (deltaMinutes: -1 | 1) => {
    if (!runningChunk) {
      return;
    }

    const ownerTask = tasks.find((task) => task.id === runningChunk.taskId);
    if (!ownerTask) {
      return;
    }

    const nextMinutes = runningChunk.estMinutes + deltaMinutes;
    if (nextMinutes < MIN_CHUNK_EST_MINUTES) {
      setFeedback(`실행 중 청크는 최소 ${MIN_CHUNK_EST_MINUTES}분 이상이어야 합니다.`);
      return;
    }
    if (nextMinutes > MAX_CHUNK_EST_MINUTES) {
      setFeedback(`실행 중 청크는 최대 ${MAX_CHUNK_EST_MINUTES}분까지만 늘릴 수 있습니다.`);
      return;
    }

    const projectedChunks = [
      ...getTaskBudgetedChunks(chunks, runningChunk.taskId, runningChunk.id),
      {
        ...runningChunk,
        estMinutes: nextMinutes
      }
    ];
    if (!isWithinTaskChunkBudget(projectedChunks, ownerTask.totalMinutes)) {
      setFeedback("과업 총 시간 예산을 초과해서 청크 시간을 늘릴 수 없습니다.");
      return;
    }

    const previousMinutes = runningChunk.estMinutes;
    const nowIso = new Date().toISOString();

    setChunks((prev) =>
      prev.map((chunk) =>
        chunk.id === runningChunk.id
          ? {
              ...chunk,
              estMinutes: nextMinutes
            }
          : chunk
      )
    );

    setRemainingSecondsByChunk((prev) => {
      const oldTotalSeconds = previousMinutes * 60;
      const nextTotalSeconds = nextMinutes * 60;
      const currentRemaining = prev[runningChunk.id] ?? oldTotalSeconds;
      const progressRatio = oldTotalSeconds > 0 ? currentRemaining / oldTotalSeconds : 1;

      return {
        ...prev,
        [runningChunk.id]: Math.max(0, Math.round(nextTotalSeconds * progressRatio))
      };
    });

    logEvent({
      eventName: "chunk_time_adjusted",
      source: "user",
      taskId: runningChunk.taskId,
      chunkId: runningChunk.id,
      meta: {
        deltaMinutes,
        previousMinutes,
        nextMinutes,
        adjustedAt: nowIso
      }
    });

    setFeedback(`실행 중 청크 시간을 ${nextMinutes}분으로 조정했습니다.`);
  };

  const handleEditTaskTotalMinutes = (task: Task) => {
    const nextTotalRaw = window.prompt(
      `과업 총 시간(분)을 입력하세요. ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}`,
      String(task.totalMinutes)
    );
    if (!nextTotalRaw) {
      return;
    }

    const parsedTotal = parseTaskTotalMinutesInput(nextTotalRaw);
    if (parsedTotal === null) {
      setFeedback(`총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 사이여야 합니다.`);
      return;
    }

    const taskHasExecutionLockedChunk = executionLockedTaskId === task.id;
    if (taskHasExecutionLockedChunk && parsedTotal < task.totalMinutes) {
      setFeedback("실행 중에는 과업 총 시간을 줄일 수 없습니다. 증가만 가능합니다.");
      return;
    }

    const currentBudgetChunks = getTaskBudgetedChunks(chunks, task.id);
    if (!isWithinTaskChunkBudget(currentBudgetChunks, parsedTotal)) {
      setFeedback("현재 청크 시간 합계보다 작게 과업 총 시간을 줄일 수 없습니다.");
      return;
    }

    if (parsedTotal === task.totalMinutes) {
      return;
    }

    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? {
              ...item,
              totalMinutes: parsedTotal
            }
          : item
      )
    );

    logEvent({
      eventName: "task_time_updated",
      source: "user",
      taskId: task.id,
      meta: {
        previousTotalMinutes: task.totalMinutes,
        nextTotalMinutes: parsedTotal,
        updatedDuringRun: taskHasExecutionLockedChunk
      }
    });

    setFeedback(`과업 총 시간을 ${parsedTotal}분으로 업데이트했습니다.`);
  };

  const handleEditChunk = (chunk: Chunk) => {
    if (isExecutionLocked) {
      setFeedback("실행 중에는 프롬프트 편집을 잠그고, 현재 청크의 +/- 1분 조정만 허용됩니다.");
      return;
    }

    const nextAction = window.prompt("행동 청크를 수정하세요", chunk.action);
    if (!nextAction) {
      return;
    }

    const nextMinutesRaw = window.prompt("예상 시간(2~15분)", String(chunk.estMinutes));
    if (!nextMinutesRaw) {
      return;
    }

    const parsedMinutes = Number(nextMinutesRaw);
    if (!Number.isFinite(parsedMinutes)) {
      setFeedback("시간은 숫자로 입력해주세요.");
      return;
    }

    const nextMinutes = clampMinuteInput(parsedMinutes);
    const ownerTask = tasks.find((task) => task.id === chunk.taskId);
    if (!ownerTask) {
      return;
    }

    const projectedBudgetChunks = [
      ...getTaskBudgetedChunks(chunks, chunk.taskId, chunk.id),
      {
        ...chunk,
        estMinutes: nextMinutes
      }
    ];
    if (!isWithinTaskChunkBudget(projectedBudgetChunks, ownerTask.totalMinutes)) {
      setFeedback("과업 총 시간 예산을 초과하여 청크 시간을 수정할 수 없습니다.");
      return;
    }

    setChunks((prev) =>
      prev.map((item) =>
        item.id === chunk.id
          ? {
              ...item,
              action: nextAction.trim() || item.action,
              estMinutes: nextMinutes
            }
          : item
      )
    );

    setRemainingSecondsByChunk((prev) => {
      if (chunk.status === "done") {
        return prev;
      }

      const oldTotal = chunk.estMinutes * 60;
      const newTotal = nextMinutes * 60;
      const current = prev[chunk.id] ?? oldTotal;
      const ratio = oldTotal > 0 ? current / oldTotal : 1;

      return {
        ...prev,
        [chunk.id]: Math.max(0, Math.round(newTotal * ratio))
      };
    });
  };

  const handleDeleteChunk = (chunk: Chunk) => {
    const ok = window.confirm("이 청크를 삭제할까요?");
    if (!ok) {
      return;
    }

    const isDeletingRunningChunk = chunk.status === "running";
    const nowIso = new Date().toISOString();
    const nextCandidate = orderChunks(
      chunks.filter((item) => item.taskId === chunk.taskId && item.id !== chunk.id)
    ).find((item) => isActionableChunkStatus(item.status)) ?? null;

    setChunks((prev) => withReorderedTaskChunks(prev.filter((item) => item.id !== chunk.id), chunk.taskId));

    setRemainingSecondsByChunk((prev) => {
      const next = { ...prev };
      delete next[chunk.id];
      return next;
    });

    if (isDeletingRunningChunk) {
      upsertTimerSession(chunk.id, "ended", nowIso);
      tickAccumulatorRef.current = createTimerElapsedAccumulator();
      delete lastHapticBucketByChunkRef.current[chunk.id];
    }

    if (currentChunkId === chunk.id || isDeletingRunningChunk) {
      setCurrentChunkId(nextCandidate?.id ?? null);
    }
  };

  const handleRechunk = (targetChunkId = currentChunkId) => {
    if (!targetChunkId) {
      return;
    }

    const target = chunks.find((chunk) => chunk.id === targetChunkId);
    if (!target || !isActionableChunkStatus(target.status)) {
      return;
    }
    const ownerTask = tasks.find((task) => task.id === target.taskId);
    if (!ownerTask) {
      return;
    }

    const metricState = gateMetricsRef.current;
    const recoveryClickCount = (metricState.recoveryClickCountByTaskId[target.taskId] ?? 0) + 1;
    metricState.recoveryClickCountByTaskId[target.taskId] = recoveryClickCount;

    const nowIso = new Date().toISOString();

    const newChunks: Chunk[] = [
      {
        id: crypto.randomUUID(),
        taskId: target.taskId,
        order: target.order + 1,
        action: `${target.action} - 첫 5분 버전`,
        estMinutes: Math.max(2, Math.floor(target.estMinutes / 2)),
        status: "todo",
        parentChunkId: target.id
      },
      {
        id: crypto.randomUUID(),
        taskId: target.taskId,
        order: target.order + 2,
        action: `${target.action} - 마무리 5분 버전`,
        estMinutes: Math.max(2, target.estMinutes - Math.max(2, Math.floor(target.estMinutes / 2))),
        status: "todo",
        parentChunkId: target.id
      }
    ];

    const projectedBudgetChunks = [
      ...getTaskBudgetedChunks(chunks, target.taskId, target.id),
      ...newChunks
    ];
    if (!isWithinTaskChunkBudget(projectedBudgetChunks, ownerTask.totalMinutes)) {
      setFeedback("리청크 결과가 과업 총 시간 예산을 초과해서 적용할 수 없습니다.");
      return;
    }

    setChunks((prev) => {
      const shifted: Chunk[] = prev.map((chunk): Chunk => {
        if (chunk.id === target.id) {
          return {
            ...chunk,
            status: "archived"
          };
        }

        if (chunk.taskId !== target.taskId) {
          return chunk;
        }

        if (chunk.order > target.order) {
          return {
            ...chunk,
            order: chunk.order + 2
          };
        }

        return chunk;
      });

      return withReorderedTaskChunks([...shifted, ...newChunks], target.taskId);
    });

    setRemainingSecondsByChunk((prev) => {
      const next = { ...prev };
      next[target.id] = 0;
      newChunks.forEach((chunk) => {
        next[chunk.id] = chunk.estMinutes * 60;
      });
      return next;
    });

    upsertTimerSession(target.id, "ended", nowIso);
    tickAccumulatorRef.current = createTimerElapsedAccumulator();

    const recovery = applyRecoveryReward(stats);
    setStats(recovery.nextStats);

    setCurrentChunkId(newChunks[0].id);
    setActiveTaskId(target.taskId);

    logEvent({
      eventName: "rechunk_requested",
      source: "local",
      taskId: target.taskId,
      chunkId: target.id,
      meta: {
        parentChunkId: target.id,
        newChunkCount: newChunks.length,
        recoveryClickCount
      }
    });

    logEvent({
      eventName: "xp_gained",
      source: "local",
      taskId: target.taskId,
      chunkId: target.id,
      meta: {
        xpGain: recovery.xpGain,
        reason: "rechunk",
        recoveryClickCount
      }
    });

    setFeedback(RECOVERY_FEEDBACK.rechunked);
  };

  const handleReschedule = (targetChunkId = currentChunkId) => {
    if (!targetChunkId) {
      return;
    }

    const target = chunks.find((chunk) => chunk.id === targetChunkId);
    if (!target || !isActionableChunkStatus(target.status)) {
      return;
    }
    const ownerTask = tasks.find((task) => task.id === target.taskId);
    if (!ownerTask) {
      return;
    }

    const metricState = gateMetricsRef.current;
    const recoveryClickCount = (metricState.recoveryClickCountByTaskId[target.taskId] ?? 0) + 1;
    metricState.recoveryClickCountByTaskId[target.taskId] = recoveryClickCount;

    const nowIso = new Date().toISOString();
    const rescheduledFor = buildNextRescheduleDate();
    const movedChunks = orderChunks(
      chunks.filter((chunk) => chunk.taskId === target.taskId && isActionableChunkStatus(chunk.status))
    );
    const activeSessionChunkIds = movedChunks
      .filter((chunk) => chunk.status === "running" || chunk.status === "paused")
      .map((chunk) => chunk.id);

    setTasks((prev) =>
      prev.map((task) =>
        task.id === ownerTask.id
          ? {
              ...task,
              scheduledFor: rescheduledFor,
              dueAt: task.dueAt && Date.parse(task.dueAt) < Date.parse(rescheduledFor) ? rescheduledFor : task.dueAt,
              status: "todo",
              startedAt: undefined,
              completedAt: undefined
            }
          : task
      )
    );

    setChunks((prev) =>
      prev.map((chunk) => {
        if (chunk.taskId !== target.taskId || !isActionableChunkStatus(chunk.status)) {
          return chunk;
        }

        return {
          ...chunk,
          status: "todo",
          startedAt: undefined,
          rescheduledFor
        };
      })
    );

    setRemainingSecondsByChunk((prev) => {
      const next = { ...prev };
      movedChunks.forEach((chunk) => {
        next[chunk.id] = Math.max(0, prev[chunk.id] ?? chunk.estMinutes * 60);
      });
      return next;
    });

    activeSessionChunkIds.forEach((sessionChunkId) => {
      upsertTimerSession(sessionChunkId, "ended", nowIso);
    });
    tickAccumulatorRef.current = createTimerElapsedAccumulator();
    setCurrentChunkId(movedChunks[0]?.id ?? null);
    setActiveTaskId(target.taskId);

    const recovery = applyRecoveryReward(stats);
    setStats(recovery.nextStats);

    logEvent({
      eventName: "task_rescheduled",
      source: "local",
      taskId: target.taskId,
      chunkId: target.id,
      meta: {
        rescheduledFor,
        movedChunkCount: movedChunks.length,
        recoveryClickCount
      }
    });

    logEvent({
      eventName: "reschedule_requested",
      source: "local",
      taskId: target.taskId,
      chunkId: target.id,
      meta: {
        rescheduledFor,
        movedChunkCount: movedChunks.length,
        recoveryClickCount
      }
    });

    logEvent({
      eventName: "xp_gained",
      source: "local",
      taskId: target.taskId,
      chunkId: target.id,
      meta: {
        xpGain: recovery.xpGain,
        reason: "reschedule",
        recoveryClickCount
      }
    });

    setFeedback(RECOVERY_FEEDBACK.rescheduled);

    const taskTitle = tasks.find((task) => task.id === target.taskId)?.title ?? "과업";
    pushLoopNotification({
      eventName: "task_rescheduled",
      taskTitle,
      chunkAction: target.action
    });
  };

  const handleResetAll = () => {
    const ok = window.confirm("모든 로컬 데이터를 초기화할까요?");
    if (!ok) {
      return;
    }

    const initial = buildInitialState();

    setTasks(initial.tasks);
    setChunks(initial.chunks);
    setTimerSessions(initial.timerSessions);
    setStats(initial.stats);
    setSettings(initial.settings);
    setEvents(initial.events);
    setActiveTaskId(initial.activeTaskId);
    setActiveTab(initial.activeTab);
    setRemainingSecondsByChunk(initial.remainingSecondsByChunk);
    setCurrentChunkId(null);
    tickAccumulatorRef.current = createTimerElapsedAccumulator();
    resetSttTranscriptBuffers();
    setSttError(null);
    setIsSttListening(false);
    if (sttRecognitionRef.current) {
      sttRecognitionRef.current.stop();
      sttRecognitionRef.current = null;
    }
    setSyncStatus("IDLE");
    setSyncLastJobId(null);
    setSyncConflict(null);
    setSyncMessage("동기화 대기 중");
    setNotificationCapability(getNotificationCapability());
    setSttCapability(getSttCapability());
    setFeedback("초기화 완료. 새 루프를 시작해보세요.");
  };

  const currentChunk =
    activeTaskChunks.find((chunk) => chunk.id === currentChunkId && isActionableChunkStatus(chunk.status))
    ?? activeTaskChunks.find((chunk) => isActionableChunkStatus(chunk.status))
    ?? null;

  const homeChunk = runningChunk ?? currentChunk;

  const homeTask = homeChunk
    ? tasks.find((task) => task.id === homeChunk.taskId) ?? activeTask
    : activeTask;

  const homeRemaining = homeChunk
    ? remainingSecondsByChunk[homeChunk.id] ?? homeChunk.estMinutes * 60
    : 0;
  const homeTaskBudgetUsage = homeTask ? getTaskBudgetUsage(chunks, homeTask.id) : 0;
  const canDecreaseRunningChunkMinutes = homeChunk?.status === "running" && homeChunk.estMinutes > MIN_CHUNK_EST_MINUTES;
  const canIncreaseRunningChunkMinutes = homeChunk?.status === "running" && homeTask
    ? homeChunk.estMinutes < MAX_CHUNK_EST_MINUTES
      && isWithinTaskChunkBudget(
        [
          ...getTaskBudgetedChunks(chunks, homeChunk.taskId, homeChunk.id),
          {
            ...homeChunk,
            estMinutes: homeChunk.estMinutes + 1
          }
        ],
        homeTask.totalMinutes
      )
    : false;

  const homeTaskCards = tasks.slice(0, 3);

  return (
    <div className={styles.shell}>
      <div className={styles.noiseLayer} aria-hidden="true" />

      <main className={styles.app}>
        <header className={styles.topBar}>
          <div>
            <p className={styles.eyebrow}>ADHDTIME MVP LOOP</p>
            <h1>입력하고 바로 실행</h1>
            <p className={styles.clock} suppressHydrationWarning>
              {formatDateTime(clock)}
            </p>
          </div>
          <p className={styles.feedback}>{feedback}</p>
        </header>

        <section className={styles.statusCard}>
          <div className={styles.levelBlock}>
            <p className={styles.levelLabel}>LV {stats.level}</p>
            <p className={styles.levelXp}>XP {stats.xp}</p>
            <div className={styles.xpTrack} aria-hidden="true">
              <span style={{ width: `${xpProgressPercent}%` }} />
            </div>
            <p className={styles.todaySummary}>오늘 완료 {stats.todayCompleted}개 · +{stats.todayXpGain} XP</p>
          </div>

          <div className={styles.radarBlock}>
            <svg viewBox="0 0 120 120" className={styles.radarSvg} role="img" aria-label="5스탯 레이더 차트">
              {radar.grid.map((gridLine, index) => (
                <polygon key={gridLine} points={gridLine} className={styles.radarGrid} data-level={index} />
              ))}
              {STAT_META.map((_, index) => {
                const angle = (-Math.PI / 2) + (index * Math.PI * 2) / STAT_META.length;
                const x = 60 + Math.cos(angle) * 48;
                const y = 60 + Math.sin(angle) * 48;
                return <line key={STAT_META[index].key} x1={60} y1={60} x2={x} y2={y} className={styles.radarAxis} />;
              })}
              <polygon points={radar.data} className={styles.radarData} />
            </svg>
            <ul className={styles.statList}>
              {STAT_META.map((item) => (
                <li key={item.key}>
                  <span>{item.label}</span>
                  <strong>{stats[item.key]}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.inputCard}>
          <div className={styles.capabilityHeader}>
            <label className={styles.inputLabel} htmlFor="task-input">
              무지성 태스크 청킹
            </label>
            <span className={`${styles.capabilityBadge} ${styles[`capability_${sttSupportState}`]}`}>
              STT {sttSupportState}
            </span>
          </div>
          <div className={styles.inputRow}>
            <input
              id="task-input"
              value={taskInput}
              onChange={(event) => setTaskInput(event.target.value)}
              placeholder="예: 방 청소, 제안서 마무리, 메일 답장"
              className={styles.input}
            />
            <button
              type="button"
              className={isSttListening ? styles.successButton : styles.ghostButton}
              onClick={isSttListening ? handleStopStt : handleStartStt}
              disabled={!sttCapability.canStartRecognition && !isSttListening}
            >
              {isSttListening ? "음성 중지" : "음성 시작"}
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={isGenerating}
              onClick={handleGenerateTask}
            >
              {isGenerating ? "생성 중..." : "AI가 쪼개기"}
            </button>
          </div>
          <div className={styles.taskMetaGrid}>
            <label className={styles.metaField} htmlFor="task-total-minutes">
              <span>총 소요 시간(필수)</span>
              <input
                id="task-total-minutes"
                type="number"
                min={MIN_TASK_TOTAL_MINUTES}
                max={MAX_TASK_TOTAL_MINUTES}
                value={taskTotalMinutesInput}
                onChange={(event) => setTaskTotalMinutesInput(event.target.value)}
                className={styles.input}
                inputMode="numeric"
                required
              />
            </label>
            <label className={styles.metaField} htmlFor="task-scheduled-for">
              <span>시작 예정(선택)</span>
              <input
                id="task-scheduled-for"
                type="datetime-local"
                value={taskScheduledForInput}
                onChange={(event) => setTaskScheduledForInput(event.target.value)}
                className={styles.input}
              />
            </label>
            <label className={styles.metaField} htmlFor="task-due-at">
              <span>마감(선택)</span>
              <input
                id="task-due-at"
                type="datetime-local"
                value={taskDueAtInput}
                onChange={(event) => setTaskDueAtInput(event.target.value)}
                className={styles.input}
              />
            </label>
          </div>
          <p className={styles.helperText}>
            총 시간은 {MIN_TASK_TOTAL_MINUTES}~{MAX_TASK_TOTAL_MINUTES}분 범위이며, 시작 예정 시간은 마감보다 늦을 수 없습니다.
          </p>
          <p className={styles.helperText}>로컬 패턴 우선, 필요 시 AI 폴백으로 청킹합니다. STT 엔진: {sttCapability.engine}</p>
          {sttTranscript ? <p className={styles.transcriptPreview}>미리보기: {sttTranscript}</p> : null}
          {sttError ? <p className={styles.errorText}>{sttError}</p> : null}
          {!sttCapability.canStartRecognition ? (
            <p className={styles.fallbackText}>STT를 지원하지 않는 환경입니다. 직접 텍스트 입력을 사용해주세요.</p>
          ) : null}
        </section>

        {activeTab === "home" ? (
          <>
            <section className={styles.currentChunkCard}>
              <header>
                <p className={styles.sectionLabel}>현재 퀘스트</p>
                <h2>{homeChunk ? homeChunk.action : "진행할 청크가 없어요"}</h2>
                {homeTask ? <p className={styles.taskTitle}>과업: {homeTask.title}</p> : null}
              </header>

              {homeChunk ? (
                <>
                  <p className={styles.timerValue}>{formatClock(homeRemaining)}</p>
                  <div className={styles.chunkMetaRow}>
                    <span>{homeChunk.estMinutes}분 청크</span>
                    <span className={`${styles.statusBadge} ${styles[`status_${homeChunk.status}`]}`}>
                      {chunkStatusLabel(homeChunk.status)}
                    </span>
                  </div>
                  {homeTask ? (
                    <p className={styles.chunkBudget}>
                      예산 {homeTaskBudgetUsage}/{homeTask.totalMinutes}분 · 시작 예정 {formatOptionalDateTime(homeTask.scheduledFor)}
                      {" "}· 마감 {formatOptionalDateTime(homeTask.dueAt)}
                    </p>
                  ) : null}

                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => handleStartChunk(homeChunk.id)}
                      disabled={!isActionableChunkStatus(homeChunk.status) || homeChunk.status === "running"}
                    >
                      시작
                    </button>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() => handlePauseChunk(homeChunk.id)}
                      disabled={homeChunk.status !== "running"}
                    >
                      일시정지
                    </button>
                    <button
                      type="button"
                      className={styles.successButton}
                      onClick={() => handleCompleteChunk(homeChunk.id)}
                      disabled={!isActionableChunkStatus(homeChunk.status)}
                    >
                      완료
                    </button>
                  </div>

                  {homeChunk.status === "running" ? (
                    <div className={styles.quickAdjustRow}>
                      <button
                        type="button"
                        className={styles.subtleButton}
                        onClick={() => handleAdjustRunningChunkMinutes(-1)}
                        disabled={!canDecreaseRunningChunkMinutes}
                      >
                        -1분
                      </button>
                      <button
                        type="button"
                        className={styles.subtleButton}
                        onClick={() => handleAdjustRunningChunkMinutes(1)}
                        disabled={!canIncreaseRunningChunkMinutes}
                      >
                        +1분
                      </button>
                    </div>
                  ) : null}

                  <div className={styles.recoveryRow}>
                    <button
                      type="button"
                      className={styles.subtleButton}
                      onClick={() => handleRechunk(homeChunk.id)}
                      disabled={!isActionableChunkStatus(homeChunk.status)}
                    >
                      더 작게 다시 나누기
                    </button>
                    <button
                      type="button"
                      className={styles.subtleButton}
                      onClick={() => handleReschedule(homeChunk.id)}
                      disabled={!isActionableChunkStatus(homeChunk.status)}
                    >
                      내일로 다시 등록
                    </button>
                  </div>
                </>
              ) : (
                <p className={styles.helperText}>입력창에서 할 일을 넣고 첫 청크를 만들어보세요.</p>
              )}
            </section>

            <section className={styles.listCard}>
              <header className={styles.listHeader}>
                <h3>오늘의 퀘스트</h3>
                <p>완료율 {completionRate}%</p>
              </header>

              <ul className={styles.taskPreviewList}>
                {homeTaskCards.length === 0 ? <li className={styles.emptyRow}>아직 생성된 과업이 없습니다.</li> : null}
                {homeTaskCards.map((task) => {
                  const openChunks = chunks.filter(
                    (chunk) => chunk.taskId === task.id && isActionableChunkStatus(chunk.status)
                  ).length;
                  return (
                    <li key={task.id}>
                      <button type="button" onClick={() => setActiveTaskId(task.id)}>
                        <span>{task.title}</span>
                        <strong>{openChunks}개 남음</strong>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        ) : null}

        {activeTab === "tasks" ? (
          <section className={styles.listCard}>
            <header className={styles.listHeader}>
              <h3>청크 목록</h3>
              <p>{activeTask ? activeTask.title : "과업을 선택하세요"}</p>
            </header>
            {activeTask ? (
              <div className={styles.taskBudgetRow}>
                <p className={styles.helperText}>
                  총 {activeTask.totalMinutes}분 · 청크 합계 {activeTaskBudgetUsage}분 · 상태 {taskStatusLabel(activeTask.status)}
                  {" "}· 시작 예정 {formatOptionalDateTime(activeTask.scheduledFor)} · 마감 {formatOptionalDateTime(activeTask.dueAt)}
                </p>
                <button
                  type="button"
                  className={styles.smallButton}
                  onClick={() => handleEditTaskTotalMinutes(activeTask)}
                >
                  총 시간 수정
                </button>
              </div>
            ) : null}

            <div className={styles.taskSelector}>
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={task.id === activeTaskId ? styles.taskChipActive : styles.taskChip}
                  onClick={() => setActiveTaskId(task.id)}
                >
                  {task.title}
                </button>
              ))}
            </div>

            <ul className={styles.chunkList}>
              {activeTaskChunks.length === 0 ? <li className={styles.emptyRow}>선택된 과업의 청크가 없습니다.</li> : null}
              {activeTaskChunks.map((chunk) => {
                const remaining = remainingSecondsByChunk[chunk.id] ?? chunk.estMinutes * 60;
                return (
                  <li
                    key={chunk.id}
                    className={`${styles.chunkItem} ${currentChunk?.id === chunk.id ? styles.chunkItemCurrent : ""}`}
                  >
                    <div>
                      <p className={styles.chunkOrder}>#{chunk.order}</p>
                      <h4>{chunk.action}</h4>
                      <p className={styles.chunkInfo}>
                        {chunk.estMinutes}분 · {formatClock(remaining)} · {chunkStatusLabel(chunk.status)}
                      </p>
                    </div>
                    <div className={styles.chunkButtons}>
                      <button
                        type="button"
                        className={styles.smallButton}
                        onClick={() => handleStartChunk(chunk.id)}
                        disabled={!isActionableChunkStatus(chunk.status) || chunk.status === "running"}
                      >
                        시작
                      </button>
                      <button
                        type="button"
                        className={styles.smallButton}
                        onClick={() => handlePauseChunk(chunk.id)}
                        disabled={chunk.status !== "running"}
                      >
                        일시정지
                      </button>
                      <button
                        type="button"
                        className={styles.smallButton}
                        onClick={() => handleCompleteChunk(chunk.id)}
                        disabled={!isActionableChunkStatus(chunk.status)}
                      >
                        완료
                      </button>
                      <button
                        type="button"
                        className={styles.smallButton}
                        onClick={() => handleEditChunk(chunk)}
                        disabled={isExecutionLocked}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className={styles.smallButtonDanger}
                        onClick={() => handleDeleteChunk(chunk)}
                        disabled={isExecutionLocked}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {activeTab === "stats" ? (
          <section className={styles.listCard}>
            <header className={styles.listHeader}>
              <h3>오늘 리포트</h3>
              <p>5초 안에 확인하는 요약</p>
            </header>

            <div className={styles.reportGrid}>
              <article>
                <p>완료 청크</p>
                <strong>{stats.todayCompleted}</strong>
              </article>
              <article>
                <p>완료율</p>
                <strong>{completionRate}%</strong>
              </article>
              <article>
                <p>획득 XP</p>
                <strong>+{stats.todayXpGain}</strong>
              </article>
              <article>
                <p>다시 시작 점수</p>
                <strong>+{stats.todayStatGain.recovery}</strong>
              </article>
            </div>

            <div className={styles.kpiBlock}>
              <h4>MVP KPI 스냅샷</h4>
              <div className={styles.kpiGrid}>
                <article>
                  <p>Activation</p>
                  <strong>{formatPercentValue(kpis.activationRate.value)}</strong>
                  <span>
                    {kpis.activationRate.numerator}/{kpis.activationRate.denominator}
                  </span>
                </article>
                <article>
                  <p>Time to Start</p>
                  <strong>{formatTimeToStart(kpis.averageTimeToStartSeconds)}</strong>
                  <span>{kpis.samples.tasksStarted}개 과업 기준</span>
                </article>
                <article>
                  <p>Completion Rate</p>
                  <strong>{formatPercentValue(kpis.chunkCompletionRate.value)}</strong>
                  <span>
                    {kpis.samples.completedChunks}/{kpis.samples.generatedChunks} chunks
                  </span>
                </article>
                <article>
                  <p>Recovery Rate</p>
                  <strong>{formatPercentValue(kpis.recoveryRate.value)}</strong>
                  <span>
                    {kpis.recoveryRate.numerator}/{kpis.recoveryRate.denominator}
                  </span>
                </article>
                <article>
                  <p>D1 Retention</p>
                  <strong>{formatPercentValue(kpis.d1Retention.value)}</strong>
                  <span>사용자 타임라인 기준</span>
                </article>
                <article>
                  <p>D7 Retention</p>
                  <strong>{formatPercentValue(kpis.d7Retention.value)}</strong>
                  <span>사용자 타임라인 기준</span>
                </article>
              </div>
              <p className={styles.helperText}>
                이벤트 샘플: 세션 {kpis.samples.sessions}개 · 과업 {kpis.samples.tasksCreated}개 · 중단 과업 {kpis.samples.tasksAbandoned}개
              </p>
            </div>

            <div className={styles.eventBlock}>
              <h4>최근 이벤트</h4>
              <ul>
                {events.slice(0, 8).map((event) => {
                  const metaText = formatEventMeta(event.meta);
                  return (
                    <li key={event.id}>
                      <div className={styles.eventInfo}>
                        <strong>{event.eventName}</strong>
                        <span className={styles.eventMeta}>
                          [{event.source}]
                          {metaText ? ` ${metaText}` : ""}
                        </span>
                      </div>
                      <time suppressHydrationWarning>{new Date(event.timestamp).toLocaleTimeString("ko-KR")}</time>
                    </li>
                  );
                })}
                {events.length === 0 ? <li className={styles.emptyRow}>아직 이벤트가 없습니다.</li> : null}
              </ul>
            </div>
          </section>
        ) : null}

        {activeTab === "settings" ? (
          <section className={styles.listCard}>
            <header className={styles.listHeader}>
              <h3>설정</h3>
              <p>실행 흐름에 필요한 최소 옵션</p>
            </header>

            <div className={styles.settingsRow}>
              <div className={styles.settingsBody}>
                <strong>브라우저 알림</strong>
                <p>
                  상태{" "}
                  <span className={`${styles.capabilityBadge} ${styles[`capability_${notificationState}`]}`}>
                    {notificationState}
                  </span>
                </p>
                {notificationFallbackText ? (
                  <p className={styles.fallbackText}>{notificationFallbackText}</p>
                ) : (
                  <p className={styles.helperText}>
                    chunk_started/chunk_completed/task_rescheduled 이벤트 시 1회 알림을 보냅니다.
                  </p>
                )}
              </div>
              <button
                type="button"
                className={styles.smallButton}
                onClick={() => void handleRequestNotification()}
                disabled={!notificationCapability.canRequestPermission || isRequestingNotificationPermission}
              >
                {isRequestingNotificationPermission ? "요청 중..." : "권한 요청"}
              </button>
            </div>

            <div className={styles.settingsRow}>
              <div className={styles.settingsBody}>
                <strong>5분 미세 햅틱</strong>
                <p>진행 중 5분마다 짧게 진동합니다.</p>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={settings.hapticEnabled}
                  onChange={(event) => {
                    setSettings((prev) => ({
                      ...prev,
                      hapticEnabled: event.target.checked
                    }));
                  }}
                />
                <span>{settings.hapticEnabled ? "ON" : "OFF"}</span>
              </label>
            </div>

            <div className={styles.settingsRow}>
              <div className={styles.settingsBody}>
                <strong>외부 동기화 Mock</strong>
                <p>
                  상태{" "}
                  <span className={`${styles.capabilityBadge} ${styles[`syncStatus_${syncStatusLabel}`]}`}>
                    {syncStatusLabel}
                  </span>
                  {syncLastJobId ? ` · job ${syncLastJobId.slice(0, 8)}` : ""}
                </p>
                <p>{syncMessage}</p>
                {syncConflict ? (
                  <p className={styles.conflictText}>
                    conflict: {syncConflict.localEntityId} ↔ {syncConflict.sourceEventId}
                  </p>
                ) : null}
              </div>
              <div className={styles.syncButtonRow}>
                <button
                  type="button"
                  className={styles.smallButton}
                  onClick={() => void handleRunSyncMock("SUCCESS")}
                  disabled={isSyncBusy}
                >
                  성공
                </button>
                <button
                  type="button"
                  className={styles.smallButton}
                  onClick={() => void handleRunSyncMock("FAILED")}
                  disabled={isSyncBusy}
                >
                  실패
                </button>
                <button
                  type="button"
                  className={styles.smallButtonDanger}
                  onClick={() => void handleRunSyncMock("CONFLICT")}
                  disabled={isSyncBusy}
                >
                  충돌
                </button>
              </div>
            </div>

            <div className={styles.settingsRow}>
              <div className={styles.settingsBody}>
                <strong>데이터 초기화</strong>
                <p>로컬에 저장된 과업/청크/스탯을 모두 삭제합니다.</p>
              </div>
              <button type="button" className={styles.smallButtonDanger} onClick={handleResetAll}>
                초기화
              </button>
            </div>

            <p className={styles.helperText}>원문 입력 텍스트는 로컬 저장을 최소화하도록 과업 제목만 유지합니다.</p>
          </section>
        ) : null}
      </main>

      <nav className={styles.tabBar} aria-label="하단 탭">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={tab.key === activeTab ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
