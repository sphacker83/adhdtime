"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createAiFallbackAdapter,
  enforceChunkBudget,
  generateLocalChunking,
  mapChunkingResultToChunks,
  generateTemplateChunking,
  isWithinTaskChunkBudget,
  sumChunkEstMinutes,
  validateChunkingResult
} from "@/features/mvp/lib/chunking";
import { appendEvent, createEvent } from "@/features/mvp/lib/events";
import { computeMvpKpis } from "@/features/mvp/lib/kpi";
import {
  applyChunkCompletionReward,
  applyRecoveryReward
} from "@/features/mvp/lib/reward";
import {
  canShowNotification,
  createSttRecognition,
  createSyncMockAdapter,
  getNotificationCapability,
  getSttCapability,
  requestNotificationPermission,
  type ExternalSyncConflict,
  type ExternalSyncJobStatus,
  type NotificationCapability,
  type NotificationPermissionState,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
  type SttCapability,
  type SyncMockOutcome
} from "@/features/mvp/integrations";
import { SettingsView } from "@/features/mvp/settings";
import { useMvpStore } from "@/features/mvp/shell/hooks/use-mvp-store";
import {
  selectActiveTask,
  selectActiveTaskChunks,
  selectCompletionRate,
  selectHomeChunk,
  selectHomeRemaining,
  selectHomeTask,
  selectRunningChunk
} from "@/features/mvp/shell/model/core-state";
import { StatsView } from "@/features/mvp/stats";
import {
  STAT_META,
  TASK_META_PAIR_PRIORITY,
  addMinutesToDate,
  buildNextRescheduleDate,
  buildRadarShape,
  getTaskMetaConstraintFeedback,
  getTaskBudgetUsage,
  getTaskBudgetedChunks,
  getDiffMinutes,
  isActionableChunkStatus,
  isTaskClosedStatus,
  isTaskTotalMinutesInRange,
  normalizeTaskScheduleFromLocalInputs,
  normalizeTaskScheduleIso,
  orderChunks,
  formatDateTime,
  formatDateTimeLocalInput,
  getXpProgressPercent,
  parseDateTimeLocalInput,
  parseLooseMinuteInput,
  parseTaskTotalMinutesInput,
  withReorderedTaskChunks,
  buildTaskSummary,
  type TaskMetaField,
  type TaskMetaInputs
} from "@/features/mvp/shared";
import {
  applyElapsedToChunkRemaining,
  applyElapsedWindow,
  createTimerElapsedAccumulator
} from "@/features/mvp/lib/timer-accuracy";
import { TaskInputSection } from "@/features/mvp/task-input";
import { HomeView, TasksView } from "@/features/mvp/task-list";
import {
  MAX_CHUNK_EST_MINUTES,
  MAX_TASK_TOTAL_MINUTES,
  MIN_CHUNK_EST_MINUTES,
  MIN_TASK_TOTAL_MINUTES,
  type AppEvent,
  type Chunk,
  type EventSource,
  type Task,
  type TimerSession
} from "@/features/mvp/types/domain";
import styles from "./mvp-dashboard.module.css";

const TAB_ITEMS = [
  { key: "home", labelKr: "홈", labelEn: "HOME", icon: "🏠" },
  { key: "tasks", labelKr: "할 일", labelEn: "TASKS", icon: "🗒️" },
  { key: "stats", labelKr: "스탯", labelEn: "STATS", icon: "📊" },
  { key: "settings", labelKr: "설정", labelEn: "SETTINGS", icon: "⚙️" }
] as const;

const RISKY_INPUT_PATTERN = /(자해|죽고\s?싶|폭탄|불법|마약|살인|테러)/i;

const DEFAULT_TASK_TOTAL_MINUTES = 60;

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

export function MvpDashboard() {
  const sessionIdRef = useRef(crypto.randomUUID());
  const {
    coreState,
    tasks,
    chunks,
    stats,
    settings,
    events,
    activeTaskId,
    activeTab,
    remainingSecondsByChunk,
    hydrated,
    setTasks,
    setChunks,
    setTimerSessions,
    setStats,
    setSettings,
    setEvents,
    setActiveTaskId,
    setActiveTab,
    setRemainingSecondsByChunk,
    resetCoreState
  } = useMvpStore({ sessionId: sessionIdRef.current });

  const [taskInput, setTaskInput] = useState("");
  const [taskTotalMinutesInput, setTaskTotalMinutesInput] = useState("");
  const [taskScheduledForInput, setTaskScheduledForInput] = useState("");
  const [taskDueAtInput, setTaskDueAtInput] = useState("");
  const [taskMetaFeedback, setTaskMetaFeedback] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setFeedback] = useState<string>("오늘은 가장 작은 행동부터 시작해요.");
  const [clock, setClock] = useState(new Date());
  const [currentChunkId, setCurrentChunkId] = useState<string | null>(null);
  const [expandedHomeTaskId, setExpandedHomeTaskId] = useState<string | null>(null);
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
  const tickAccumulatorRef = useRef(createTimerElapsedAccumulator());
  const sttRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sttFinalTranscriptRef = useRef("");
  const sttInterimTranscriptRef = useRef("");
  const syncMockAdapterRef = useRef(createSyncMockAdapter("GOOGLE_CALENDAR"));
  const lastHapticBucketByChunkRef = useRef<Record<string, number>>({});
  const taskMetaEditingFieldRef = useRef<TaskMetaField | null>(null);
  const taskMetaLastDistinctEditedFieldRef = useRef<TaskMetaField | null>(null);
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
    () => selectActiveTask(coreState),
    [coreState]
  );

  const activeTaskChunks = useMemo(
    () => selectActiveTaskChunks(coreState),
    [coreState]
  );
  const runningChunk = useMemo(
    () => selectRunningChunk(coreState),
    [coreState]
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

  const completionRate = useMemo(
    () => selectCompletionRate(coreState),
    [coreState]
  );

  const xpProgressPercent = getXpProgressPercent(stats);
  const dailyProgressPercent = Math.max(0, Math.min(100, completionRate));
  const dailyProgressRingStyle = {
    background: `conic-gradient(#4a88d4 0 ${dailyProgressPercent}%, #dbe5f2 ${dailyProgressPercent}% 100%)`
  };
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
  }, [tasks, activeTaskId, setActiveTaskId]);

  useEffect(() => {
    if (!expandedHomeTaskId) {
      return;
    }

    if (!tasks.some((task) => task.id === expandedHomeTaskId)) {
      setExpandedHomeTaskId(null);
    }
  }, [tasks, expandedHomeTaskId]);

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
  }, [runningChunk, setRemainingSecondsByChunk]);

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
  }, [remainingSecondsByChunk, runningChunk, settings.hapticEnabled, setEvents]);

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

        const fallbackStartAtMs = Date.parse(task.createdAt);
        const fallbackStartAt = Number.isFinite(fallbackStartAtMs) ? new Date(fallbackStartAtMs) : new Date(nowIso);
        const normalizedSchedule = normalizeTaskScheduleIso({
          scheduledFor: task.scheduledFor,
          dueAt: task.dueAt,
          totalMinutes: task.totalMinutes,
          fallbackStartAt
        });
        const nextScheduledFor = normalizedSchedule.scheduledFor;
        const nextDueAt = normalizedSchedule.dueAt;

        const taskChunks = chunks.filter((chunk) => chunk.taskId === task.id);
        const openTaskChunks = taskChunks.filter((chunk) => !isTaskClosedStatus(chunk.status));
        if (taskChunks.length === 0) {
          if (task.scheduledFor === nextScheduledFor && task.dueAt === nextDueAt) {
            return task;
          }

          return {
            ...task,
            scheduledFor: nextScheduledFor,
            dueAt: nextDueAt
          };
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
          && task.scheduledFor === nextScheduledFor
          && task.dueAt === nextDueAt
        ) {
          return task;
        }

        return {
          ...task,
          status: nextStatus,
          startedAt: nextStartedAt,
          completedAt: nextCompletedAt,
          scheduledFor: nextScheduledFor,
          dueAt: nextDueAt
        };
      });

      const changed = next.some((task, index) => task !== prev[index]);
      return changed ? next : prev;
    });
  }, [chunks, setTasks]);

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

  const handleTaskMetaInputChange = (
    editedField: TaskMetaField,
    nextValue: string,
    options?: { forcedAnchorField?: TaskMetaField }
  ) => {
    const nextInputs: TaskMetaInputs = {
      totalMinutesInput: editedField === "totalMinutes" ? nextValue : taskTotalMinutesInput,
      scheduledForInput: editedField === "scheduledFor" ? nextValue : taskScheduledForInput,
      dueAtInput: editedField === "dueAt" ? nextValue : taskDueAtInput
    };

    const parsedTotalMinutes = parseLooseMinuteInput(nextInputs.totalMinutesInput);
    const parsedScheduledFor = parseDateTimeLocalInput(nextInputs.scheduledForInput);
    const parsedDueAt = parseDateTimeLocalInput(nextInputs.dueAtInput);

    const hasValidValue = (field: TaskMetaField): boolean => {
      if (field === "totalMinutes") {
        return parsedTotalMinutes !== null;
      }
      if (field === "scheduledFor") {
        return parsedScheduledFor !== null;
      }
      return parsedDueAt !== null;
    };

    if (taskMetaEditingFieldRef.current !== editedField) {
      taskMetaLastDistinctEditedFieldRef.current = taskMetaEditingFieldRef.current;
      taskMetaEditingFieldRef.current = editedField;
    }

    const previousEditedField = taskMetaLastDistinctEditedFieldRef.current;
    const pairCandidates = TASK_META_PAIR_PRIORITY[editedField];
    const preferredAnchorField =
      previousEditedField
      && previousEditedField !== editedField
      && pairCandidates.includes(previousEditedField)
      && hasValidValue(previousEditedField)
        ? previousEditedField
        : null;
    const forcedAnchorField =
      options?.forcedAnchorField && options.forcedAnchorField !== editedField && hasValidValue(options.forcedAnchorField)
        ? options.forcedAnchorField
        : null;
    const anchorField = forcedAnchorField ?? preferredAnchorField ?? pairCandidates.find((field) => hasValidValue(field)) ?? null;

    let immediateFeedback: string | null = null;

    if (anchorField) {
      const derivedField = (["totalMinutes", "scheduledFor", "dueAt"] as const).find(
        (field) => field !== editedField && field !== anchorField
      );

      if (derivedField === "dueAt" && parsedTotalMinutes !== null && parsedScheduledFor) {
        if (!isTaskTotalMinutesInRange(parsedTotalMinutes)) {
          immediateFeedback = `총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 범위로 입력해주세요.`;
        } else {
          nextInputs.dueAtInput = formatDateTimeLocalInput(addMinutesToDate(parsedScheduledFor, parsedTotalMinutes));
        }
      }

      if (derivedField === "scheduledFor" && parsedTotalMinutes !== null && parsedDueAt) {
        if (!isTaskTotalMinutesInRange(parsedTotalMinutes)) {
          immediateFeedback = `총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 범위로 입력해주세요.`;
        } else {
          nextInputs.scheduledForInput = formatDateTimeLocalInput(addMinutesToDate(parsedDueAt, -parsedTotalMinutes));
        }
      }

      if (derivedField === "totalMinutes" && parsedScheduledFor && parsedDueAt) {
        if (parsedScheduledFor.getTime() > parsedDueAt.getTime()) {
          immediateFeedback = "시작 예정 시간은 마감 시간보다 늦을 수 없습니다.";
        } else {
          const derivedTotalMinutes = getDiffMinutes(parsedScheduledFor, parsedDueAt);
          if (!isTaskTotalMinutesInRange(derivedTotalMinutes)) {
            immediateFeedback = `총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 범위로 입력해주세요.`;
          } else {
            nextInputs.totalMinutesInput = String(derivedTotalMinutes);
          }
        }
      }
    }

    const finalTotalMinutes = parseLooseMinuteInput(nextInputs.totalMinutesInput);
    const finalScheduledFor = parseDateTimeLocalInput(nextInputs.scheduledForInput);
    const finalDueAt = parseDateTimeLocalInput(nextInputs.dueAtInput);

    setTaskTotalMinutesInput(nextInputs.totalMinutesInput);
    setTaskScheduledForInput(nextInputs.scheduledForInput);
    setTaskDueAtInput(nextInputs.dueAtInput);
    setTaskMetaFeedback(immediateFeedback ?? getTaskMetaConstraintFeedback(finalTotalMinutes, finalScheduledFor, finalDueAt));
  };

  const handleTaskScheduledForInputChange = (nextValue: string) => {
    handleTaskMetaInputChange("scheduledFor", nextValue, { forcedAnchorField: "totalMinutes" });
  };

  const handleTaskDueAtInputChange = (nextValue: string) => {
    handleTaskMetaInputChange("dueAt", nextValue, { forcedAnchorField: "totalMinutes" });
  };

  const handleSetTaskTotalMinutesFromScheduled = (nextMinutes: number) => {
    if (!Number.isFinite(nextMinutes)) {
      return;
    }

    const normalizedMinutes = Math.min(
      MAX_TASK_TOTAL_MINUTES,
      Math.max(MIN_TASK_TOTAL_MINUTES, Math.floor(nextMinutes))
    );
    handleTaskMetaInputChange("totalMinutes", String(normalizedMinutes), {
      forcedAnchorField: "scheduledFor"
    });
  };

  const handleAdjustTaskTotalMinutesFromScheduled = (deltaMinutes: -5 | -1 | 1 | 5) => {
    const parsedTotalMinutes = parseLooseMinuteInput(taskTotalMinutesInput);
    const safeTotalMinutes = parsedTotalMinutes ?? DEFAULT_TASK_TOTAL_MINUTES;
    handleSetTaskTotalMinutesFromScheduled(safeTotalMinutes + deltaMinutes);
  };

  const handleGenerateTask = async (): Promise<boolean> => {
    const rawInput = taskInput.trim();
    if (!rawInput) {
      setFeedback("할 일을 입력하면 바로 10분 단위로 쪼개드릴게요.");
      return false;
    }

    if (taskMetaFeedback) {
      setFeedback(`입력 단계 오류를 먼저 해결해주세요: ${taskMetaFeedback}`);
      return false;
    }

    const normalizedTotalInput = taskTotalMinutesInput.trim();
    const parsedTotalMinutes = normalizedTotalInput
      ? parseTaskTotalMinutesInput(normalizedTotalInput)
      : DEFAULT_TASK_TOTAL_MINUTES;
    if (parsedTotalMinutes === null) {
      setFeedback(`총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 사이로 입력해주세요.`);
      return false;
    }

    const normalizedSchedule = normalizeTaskScheduleFromLocalInputs({
      scheduledForInput: taskScheduledForInput,
      dueAtInput: taskDueAtInput,
      totalMinutes: parsedTotalMinutes,
      fallbackStartAt: new Date()
    });
    if (!normalizedSchedule) {
      setFeedback("일정 시간 형식이 올바르지 않습니다. 날짜와 시간을 다시 확인해주세요.");
      return false;
    }
    const { scheduledFor, dueAt } = normalizedSchedule;

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
      return false;
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

      const nextChunks: Chunk[] = mapChunkingResultToChunks(
        {
          ...chunking,
          chunks: adjustedChunkTemplates
        },
        {
          taskId,
          status: "todo"
        }
      );

      if (!isWithinTaskChunkBudget(nextChunks, parsedTotalMinutes)) {
        setFeedback("청크 시간 합계가 과업 총 시간 예산을 초과해 생성이 취소되었습니다.");
        return false;
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
      setTaskTotalMinutesInput("");
      setTaskScheduledForInput("");
      setTaskDueAtInput("");
      setTaskMetaFeedback(null);
      taskMetaEditingFieldRef.current = null;
      taskMetaLastDistinctEditedFieldRef.current = null;
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
      return true;
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

  const handleAdjustRunningChunkMinutes = (deltaMinutes: -5 | -1 | 1 | 5) => {
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
          ? (() => {
              const fallbackStartAtMs = Date.parse(item.createdAt);
              const fallbackStartAt = Number.isFinite(fallbackStartAtMs) ? new Date(fallbackStartAtMs) : new Date();
              const normalizedSchedule = normalizeTaskScheduleIso({
                scheduledFor: item.scheduledFor,
                dueAt: item.dueAt,
                totalMinutes: parsedTotal,
                fallbackStartAt
              });

              return {
                ...item,
                totalMinutes: parsedTotal,
                scheduledFor: normalizedSchedule.scheduledFor,
                dueAt: normalizedSchedule.dueAt
              };
            })()
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

    setFeedback(`과업 총 시간을 ${parsedTotal}분으로 업데이트하고 시작/마감 일정을 동기화했습니다.`);
  };

  const handleEditChunk = (chunk: Chunk) => {
    if (isExecutionLocked) {
      setFeedback("실행 중에는 프롬프트 편집을 잠그고, 현재 청크의 ±1/±5분 조정만 허용됩니다.");
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
        iconKey: target.iconKey,
        parentChunkId: target.id
      },
      {
        id: crypto.randomUUID(),
        taskId: target.taskId,
        order: target.order + 2,
        action: `${target.action} - 마무리 5분 버전`,
        estMinutes: Math.max(2, target.estMinutes - Math.max(2, Math.floor(target.estMinutes / 2))),
        status: "todo",
        iconKey: target.iconKey,
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

    resetCoreState();
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
    setTaskMetaFeedback(null);
    taskMetaEditingFieldRef.current = null;
    taskMetaLastDistinctEditedFieldRef.current = null;
    setFeedback("초기화 완료. 새 루프를 시작해보세요.");
  };

  const homeChunk = useMemo(
    () => selectHomeChunk(coreState, currentChunkId),
    [coreState, currentChunkId]
  );
  const homeTask = useMemo(
    () => selectHomeTask(coreState, currentChunkId),
    [coreState, currentChunkId]
  );
  const homeRemaining = useMemo(
    () => selectHomeRemaining(coreState, currentChunkId),
    [coreState, currentChunkId]
  );
  const homeTaskBudgetUsage = homeTask ? getTaskBudgetUsage(chunks, homeTask.id) : 0;
  const runningOwnerTask = runningChunk
    ? tasks.find((task) => task.id === runningChunk.taskId) ?? null
    : null;
  const canAdjustRunningChunkMinutes = (deltaMinutes: -5 | -1 | 1 | 5): boolean => {
    if (!runningChunk || !runningOwnerTask) {
      return false;
    }

    const nextMinutes = runningChunk.estMinutes + deltaMinutes;
    if (nextMinutes < MIN_CHUNK_EST_MINUTES || nextMinutes > MAX_CHUNK_EST_MINUTES) {
      return false;
    }

    return isWithinTaskChunkBudget(
      [
        ...getTaskBudgetedChunks(chunks, runningChunk.taskId, runningChunk.id),
        {
          ...runningChunk,
          estMinutes: nextMinutes
        }
      ],
      runningOwnerTask.totalMinutes
    );
  };
  const canAdjustMinusFive = canAdjustRunningChunkMinutes(-5);
  const canAdjustMinusOne = canAdjustRunningChunkMinutes(-1);
  const canAdjustPlusOne = canAdjustRunningChunkMinutes(1);
  const canAdjustPlusFive = canAdjustRunningChunkMinutes(5);

  const homeTaskCards = tasks.filter((task) => task.status !== "archived" && task.status !== "done");

  return (
    <div className={styles.shell}>
      <div className={styles.noiseLayer} aria-hidden="true" />

      <header className={styles.topBar}>
        <div className={styles.topBarMain}>
          <div className={styles.titleGroup}>
            <h1 className={styles.brandTitle}>ADHDTime</h1>
            <p className={styles.levelSummary}>레벨 {stats.level} (LV.{stats.level}) 모험가</p>
          </div>
          <div className={styles.progressGroup}>
            <p className={styles.progressTitle}>
              오늘의 달성도
              <span>DAILY PROGRESS!</span>
            </p>
            <div className={styles.progressRing} style={dailyProgressRingStyle} aria-label={`오늘의 달성도 ${dailyProgressPercent}%`}>
              <div className={styles.progressRingInner}>
                <strong>{dailyProgressPercent}%</strong>
              </div>
            </div>
          </div>
        </div>
        <p className={styles.headerDateTime} suppressHydrationWarning>{formatDateTime(clock)}</p>
      </header>

      <main className={styles.app}>
        <TaskInputSection
          styles={styles}
          sttSupportState={sttSupportState}
          taskInput={taskInput}
          onTaskInputChange={setTaskInput}
          isSttListening={isSttListening}
          onStartStt={handleStartStt}
          onStopStt={handleStopStt}
          sttCapability={sttCapability}
          onGenerateTask={handleGenerateTask}
          isGenerating={isGenerating}
          taskTotalMinutesInput={taskTotalMinutesInput}
          onSetTaskTotalMinutesFromScheduled={handleSetTaskTotalMinutesFromScheduled}
          onAdjustTaskTotalMinutesFromScheduled={handleAdjustTaskTotalMinutesFromScheduled}
          taskScheduledForInput={taskScheduledForInput}
          onTaskScheduledForInputChange={handleTaskScheduledForInputChange}
          taskDueAtInput={taskDueAtInput}
          onTaskDueAtInputChange={handleTaskDueAtInputChange}
          taskMetaFeedback={taskMetaFeedback}
          sttTranscript={sttTranscript}
          sttError={sttError}
        />

        {activeTab === "home" || activeTab === "stats" ? (
          <section className={styles.statusSection}>
            <header className={styles.sectionHeader}>
              <h2>캐릭터 상태</h2>
            </header>
            <div className={styles.statusCard}>
              <div className={styles.levelBlock}>
                <div className={styles.characterAvatar} aria-hidden="true">🧙</div>
                <p className={styles.levelLabel}>레벨 {stats.level}</p>
                <p className={styles.levelXp}>XP {stats.xp}</p>
                <div className={styles.xpTrack} aria-hidden="true">
                  <span style={{ width: `${xpProgressPercent}%` }} />
                </div>
                <p className={styles.todaySummary}>오늘 완료 {stats.todayCompleted}개 · +{stats.todayXpGain} XP</p>
              </div>

              <div className={styles.radarBlock}>
                <div className={styles.radarWrap}>
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
                  <div className={styles.radarLabelLayer} aria-hidden="true">
                    {STAT_META.map((item, index) => {
                      const angle = (-Math.PI / 2) + (index * Math.PI * 2) / STAT_META.length;
                      const x = 75 + Math.cos(angle) * 63;
                      const y = 75 + Math.sin(angle) * 63;
                      return (
                        <div
                          key={item.key}
                          className={styles.radarStatBadge}
                          style={{ left: `${x}px`, top: `${y}px` }}
                        >
                          <span>{item.label}</span>
                          <strong>{stats[item.key]}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <ul className={styles.statList} aria-hidden="true">
                  {STAT_META.map((item) => (
                    <li key={item.key}>
                      <span>{item.label}</span>
                      <strong>{stats[item.key]}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "home" ? (
          <HomeView
            styles={styles}
            homeChunk={homeChunk}
            homeTask={homeTask}
            homeRemaining={homeRemaining}
            homeTaskBudgetUsage={homeTaskBudgetUsage}
            completionRate={completionRate}
            homeTaskCards={homeTaskCards}
            chunks={chunks}
            expandedHomeTaskId={expandedHomeTaskId}
            remainingSecondsByChunk={remainingSecondsByChunk}
            isExecutionLocked={isExecutionLocked}
            onSetActiveTaskId={setActiveTaskId}
            onToggleExpandedHomeTaskId={(taskId) => {
              setExpandedHomeTaskId((prev) => (prev === taskId ? null : taskId));
            }}
            onStartChunk={handleStartChunk}
            onPauseChunk={handlePauseChunk}
            onCompleteChunk={handleCompleteChunk}
            onAdjustRunningChunkMinutes={handleAdjustRunningChunkMinutes}
            canAdjustMinusFive={canAdjustMinusFive}
            canAdjustMinusOne={canAdjustMinusOne}
            canAdjustPlusOne={canAdjustPlusOne}
            canAdjustPlusFive={canAdjustPlusFive}
            onRechunk={handleRechunk}
            onReschedule={handleReschedule}
            onEditTaskTotalMinutes={handleEditTaskTotalMinutes}
            onEditChunk={handleEditChunk}
            onDeleteChunk={handleDeleteChunk}
          />
        ) : null}

        {activeTab === "tasks" ? (
          <TasksView
            styles={styles}
            tasks={tasks}
            activeTask={activeTask}
            activeTaskId={activeTaskId}
            activeTaskBudgetUsage={activeTaskBudgetUsage}
            activeTaskChunks={activeTaskChunks}
            currentChunkId={currentChunkId}
            remainingSecondsByChunk={remainingSecondsByChunk}
            isExecutionLocked={isExecutionLocked}
            onSetActiveTaskId={setActiveTaskId}
            onEditTaskTotalMinutes={handleEditTaskTotalMinutes}
            onStartChunk={handleStartChunk}
            onPauseChunk={handlePauseChunk}
            onCompleteChunk={handleCompleteChunk}
            onEditChunk={handleEditChunk}
            onDeleteChunk={handleDeleteChunk}
          />
        ) : null}

        {activeTab === "stats" ? (
          <StatsView
            styles={styles}
            stats={stats}
            completionRate={completionRate}
            kpis={kpis}
            events={events}
          />
        ) : null}

        {activeTab === "settings" ? (
          <SettingsView
            styles={styles}
            notificationState={notificationState}
            notificationFallbackText={notificationFallbackText}
            notificationCapability={notificationCapability}
            isRequestingNotificationPermission={isRequestingNotificationPermission}
            onRequestNotification={handleRequestNotification}
            settings={settings}
            onHapticEnabledChange={(enabled) => {
              setSettings((prev) => ({
                ...prev,
                hapticEnabled: enabled
              }));
            }}
            syncStatusLabel={syncStatusLabel}
            syncMessage={syncMessage}
            syncLastJobId={syncLastJobId}
            syncConflict={syncConflict}
            isSyncBusy={isSyncBusy}
            onRunSyncMock={handleRunSyncMock}
            onResetAll={handleResetAll}
          />
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
            <span className={styles.tabIcon} aria-hidden="true">{tab.icon}</span>
            <span className={styles.tabLabelKr}>{tab.labelKr}</span>
            <span className={styles.tabLabelEn}>{tab.labelEn}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
