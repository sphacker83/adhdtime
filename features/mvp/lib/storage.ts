import {
  MAX_TASK_TOTAL_MINUTES,
  MIN_TASK_TOTAL_MINUTES,
  type AppEvent,
  type Chunk,
  type ChunkStatus,
  type EventMetaValue,
  type EventName,
  type EventSource,
  type PersistedState,
  type StatsState,
  type Task,
  TASK_SUMMARY_MAX_LENGTH,
  type TimerSession,
  type TimerSessionState,
  type UserSettings
} from "@/features/mvp/types/domain";
import { createInitialStats } from "@/features/mvp/lib/reward";

const STORAGE_KEY = "adhdtime:mvp-state:v1";
const TASK_STATUS_VALUES: Task["status"][] = ["todo", "in_progress", "done", "archived"];
const CHUNK_STATUS_VALUES: ChunkStatus[] = ["todo", "running", "paused", "done", "abandoned", "archived"];
const TIMER_SESSION_STATE_VALUES: TimerSessionState[] = ["running", "paused", "ended"];
const ACTIVE_TAB_VALUES: PersistedState["activeTab"][] = ["home", "tasks", "stats", "settings"];
const EVENT_NAME_VALUES: EventName[] = [
  "task_created",
  "chunk_generated",
  "chunk_started",
  "chunk_paused",
  "chunk_completed",
  "chunk_abandoned",
  "rechunk_requested",
  "reschedule_requested",
  "task_rescheduled",
  "chunk_time_adjusted",
  "task_time_updated",
  "xp_gained",
  "level_up",
  "haptic_fired",
  "safety_blocked"
];
const EVENT_SOURCE_VALUES: EventSource[] = ["local", "ai", "system", "user"];
const FALLBACK_TASK_SUMMARY = "새 과업";
const FALLBACK_TASK_TOTAL_MINUTES = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isTaskStatus(value: unknown): value is Task["status"] {
  return isString(value) && TASK_STATUS_VALUES.includes(value as Task["status"]);
}

function isChunkStatus(value: unknown): value is ChunkStatus {
  return isString(value) && CHUNK_STATUS_VALUES.includes(value as ChunkStatus);
}

function isTimerSessionState(value: unknown): value is TimerSessionState {
  return isString(value) && TIMER_SESSION_STATE_VALUES.includes(value as TimerSessionState);
}

function isEventName(value: unknown): value is EventName {
  return isString(value) && EVENT_NAME_VALUES.includes(value as EventName);
}

function isEventSource(value: unknown): value is EventSource {
  return isString(value) && EVENT_SOURCE_VALUES.includes(value as EventSource);
}

function isIsoDateTime(value: unknown): value is string {
  return isString(value) && Number.isFinite(Date.parse(value));
}

function sanitizeIsoDateTime(value: unknown): string | undefined {
  if (!isIsoDateTime(value)) {
    return undefined;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return new Date(parsed).toISOString();
}

function sanitizeTaskTotalMinutes(totalMinutes: unknown, fallbackMinutes: number): number {
  const numericFallback = Number.isFinite(fallbackMinutes)
    ? Math.floor(fallbackMinutes)
    : FALLBACK_TASK_TOTAL_MINUTES;
  const rawValue = isNumber(totalMinutes) ? totalMinutes : numericFallback;
  return Math.min(MAX_TASK_TOTAL_MINUTES, Math.max(MIN_TASK_TOTAL_MINUTES, Math.floor(rawValue)));
}

function sanitizeChunkIconKey(value: unknown): string | undefined {
  if (!isString(value)) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function buildChunkMinuteFallbackByTaskId(chunks: Chunk[]): Map<string, number> {
  const taskMinutes = new Map<string, number>();

  chunks.forEach((chunk) => {
    const current = taskMinutes.get(chunk.taskId) ?? 0;
    taskMinutes.set(chunk.taskId, current + Math.max(0, Math.floor(chunk.estMinutes)));
  });

  return taskMinutes;
}

interface TaskTimelineFallback {
  startedAt?: string;
  completedAt?: string;
  hasOpenChunks: boolean;
}

function buildTaskTimelineFallbackByTaskId(chunks: Chunk[]): Map<string, TaskTimelineFallback> {
  const timelineByTaskId = new Map<string, TaskTimelineFallback>();

  chunks.forEach((chunk) => {
    const current = timelineByTaskId.get(chunk.taskId) ?? { hasOpenChunks: false };

    if (chunk.startedAt && (!current.startedAt || Date.parse(chunk.startedAt) < Date.parse(current.startedAt))) {
      current.startedAt = chunk.startedAt;
    }

    if (chunk.completedAt && (!current.completedAt || Date.parse(chunk.completedAt) > Date.parse(current.completedAt))) {
      current.completedAt = chunk.completedAt;
    }

    if (chunk.status === "todo" || chunk.status === "running" || chunk.status === "paused") {
      current.hasOpenChunks = true;
    }

    timelineByTaskId.set(chunk.taskId, current);
  });

  return timelineByTaskId;
}

function sanitizeTaskRecord(
  value: unknown,
  minuteFallbackByTaskId: Map<string, number>,
  timelineFallbackByTaskId: Map<string, TaskTimelineFallback>
): Task | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isString(value.id) || !isString(value.title)) {
    return null;
  }

  const fallbackMinutes = minuteFallbackByTaskId.get(value.id) ?? FALLBACK_TASK_TOTAL_MINUTES;
  const timeline = timelineFallbackByTaskId.get(value.id);
  const createdAt = sanitizeIsoDateTime(value.createdAt) ?? new Date().toISOString();
  const scheduledFor = sanitizeIsoDateTime(value.scheduledFor);
  const dueAtCandidate = sanitizeIsoDateTime(value.dueAt);
  const dueAt =
    scheduledFor && dueAtCandidate && Date.parse(scheduledFor) > Date.parse(dueAtCandidate)
      ? scheduledFor
      : dueAtCandidate;

  const normalizedSummary = sanitizeTaskSummary((isString(value.summary) ? value.summary : value.title) ?? value.title);
  const status = isTaskStatus(value.status) ? value.status : "todo";
  const completedAtCandidate = sanitizeIsoDateTime(value.completedAt) ?? timeline?.completedAt;
  const completedAt = status === "done" ? completedAtCandidate : undefined;

  return {
    id: value.id,
    title: normalizedSummary,
    summary: normalizedSummary,
    totalMinutes: sanitizeTaskTotalMinutes(value.totalMinutes, fallbackMinutes),
    createdAt,
    scheduledFor,
    startedAt: sanitizeIsoDateTime(value.startedAt) ?? timeline?.startedAt,
    dueAt,
    completedAt,
    status
  };
}

function isChunk(value: unknown): value is Chunk {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id)
    && isString(value.taskId)
    && isNumber(value.order)
    && isString(value.action)
    && isNumber(value.estMinutes)
    && isChunkStatus(value.status)
    && (value.startedAt === undefined || isString(value.startedAt))
    && (value.completedAt === undefined || isString(value.completedAt))
    && (value.actualSeconds === undefined || isNumber(value.actualSeconds))
    && (value.parentChunkId === undefined || isString(value.parentChunkId))
    && (value.rescheduledFor === undefined || isString(value.rescheduledFor))
    && (value.iconKey === undefined || isString(value.iconKey))
  );
}

function isTimerSession(value: unknown): value is TimerSession {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id)
    && isString(value.chunkId)
    && isTimerSessionState(value.state)
    && isString(value.startedAt)
    && (value.pausedAt === undefined || isString(value.pausedAt))
    && (value.endedAt === undefined || isString(value.endedAt))
    && isNumber(value.pauseCount)
  );
}

function isEventMetaValue(value: unknown): value is EventMetaValue {
  return value === null || isString(value) || isNumber(value) || isBoolean(value);
}

function isEventMeta(value: unknown): value is Record<string, EventMetaValue> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((metaValue) => isEventMetaValue(metaValue));
}

function isAppEvent(value: unknown): value is AppEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id)
    && isEventName(value.eventName)
    && isString(value.timestamp)
    && isString(value.sessionId)
    && isEventSource(value.source)
    && (value.taskId === null || isString(value.taskId))
    && (value.chunkId === null || isString(value.chunkId))
    && (value.meta === undefined || isEventMeta(value.meta))
  );
}

function isStatsState(value: unknown): value is StatsState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.initiation)
    && isNumber(value.focus)
    && isNumber(value.breakdown)
    && isNumber(value.recovery)
    && isNumber(value.consistency)
    && isNumber(value.xp)
    && isNumber(value.level)
    && isString(value.todayDateKey)
    && isNumber(value.todayXpGain)
    && isNumber(value.todayCompleted)
    && isRecord(value.todayStatGain)
    && isNumber(value.todayStatGain.initiation)
    && isNumber(value.todayStatGain.focus)
    && isNumber(value.todayStatGain.breakdown)
    && isNumber(value.todayStatGain.recovery)
    && isNumber(value.todayStatGain.consistency)
  );
}

function isUserSettings(value: unknown): value is UserSettings {
  return isRecord(value) && isBoolean(value.hapticEnabled);
}

function isActiveTab(value: unknown): value is PersistedState["activeTab"] {
  return isString(value) && ACTIVE_TAB_VALUES.includes(value as PersistedState["activeTab"]);
}

export function sanitizeTaskSummary(rawInput: string): string {
  const normalized = rawInput.trim().replace(/\s+/g, " ").slice(0, TASK_SUMMARY_MAX_LENGTH);
  return normalized || FALLBACK_TASK_SUMMARY;
}

function sanitizeChunkForStorage(chunk: Chunk): Chunk {
  return {
    ...chunk,
    iconKey: sanitizeChunkIconKey(chunk.iconKey)
  };
}

function sanitizeTaskForStorage(task: Task, minuteFallbackByTaskId: Map<string, number>): Task {
  const safeSummary = sanitizeTaskSummary(task.summary ?? task.title);
  const scheduledFor = sanitizeIsoDateTime(task.scheduledFor);
  const dueAtCandidate = sanitizeIsoDateTime(task.dueAt);
  const dueAt =
    scheduledFor && dueAtCandidate && Date.parse(scheduledFor) > Date.parse(dueAtCandidate)
      ? scheduledFor
      : dueAtCandidate;
  const fallbackMinutes = minuteFallbackByTaskId.get(task.id) ?? FALLBACK_TASK_TOTAL_MINUTES;
  const completedAtCandidate = sanitizeIsoDateTime(task.completedAt);
  const completedAt = task.status === "done" ? completedAtCandidate : undefined;

  return {
    id: task.id,
    title: safeSummary,
    summary: safeSummary,
    totalMinutes: sanitizeTaskTotalMinutes(task.totalMinutes, fallbackMinutes),
    createdAt: sanitizeIsoDateTime(task.createdAt) ?? new Date().toISOString(),
    scheduledFor,
    startedAt: sanitizeIsoDateTime(task.startedAt),
    dueAt,
    completedAt,
    status: task.status
  };
}

function sanitizeStateForStorage(state: PersistedState): PersistedState {
  const sanitizedChunks = state.chunks.map((chunk) => sanitizeChunkForStorage(chunk));
  const minuteFallbackByTaskId = buildChunkMinuteFallbackByTaskId(sanitizedChunks);

  return {
    ...state,
    chunks: sanitizedChunks,
    tasks: state.tasks.map((task) => sanitizeTaskForStorage(task, minuteFallbackByTaskId))
  };
}

function sanitizeRemainingSecondsByChunk(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const next: Record<string, number> = {};
  Object.entries(value).forEach(([chunkId, seconds]) => {
    if (isString(chunkId) && isNumber(seconds)) {
      next[chunkId] = Math.max(0, Math.floor(seconds));
    }
  });
  return next;
}

export function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    const sanitizedChunks = Array.isArray(parsed.chunks)
      ? parsed.chunks
        .filter((chunk): chunk is Chunk => isChunk(chunk))
        .map((chunk) => sanitizeChunkForStorage(chunk))
      : [];
    const minuteFallbackByTaskId = buildChunkMinuteFallbackByTaskId(sanitizedChunks);
    const timelineFallbackByTaskId = buildTaskTimelineFallbackByTaskId(sanitizedChunks);
    const sanitizedTasks = Array.isArray(parsed.tasks)
      ? parsed.tasks
        .map((task) => sanitizeTaskRecord(task, minuteFallbackByTaskId, timelineFallbackByTaskId))
        .filter((task): task is Task => task !== null)
      : [];
    const sanitizedTimerSessions = Array.isArray(parsed.timerSessions)
      ? parsed.timerSessions.filter((session): session is TimerSession => isTimerSession(session))
      : [];
    const sanitizedEvents = Array.isArray(parsed.events)
      ? parsed.events.filter((event): event is AppEvent => isAppEvent(event))
      : [];
    const sanitizedStats = isStatsState(parsed.stats) ? parsed.stats : createInitialStats();
    const sanitizedSettings = isUserSettings(parsed.settings) ? parsed.settings : { hapticEnabled: true };
    const sanitizedActiveTaskId = isString(parsed.activeTaskId) ? parsed.activeTaskId : null;
    const sanitizedActiveTab = isActiveTab(parsed.activeTab) ? parsed.activeTab : "home";
    const sanitizedRemainingSecondsByChunk = sanitizeRemainingSecondsByChunk(parsed.remainingSecondsByChunk);

    return {
      tasks: sanitizedTasks,
      chunks: sanitizedChunks,
      timerSessions: sanitizedTimerSessions,
      stats: sanitizedStats,
      settings: sanitizedSettings,
      events: sanitizedEvents,
      activeTaskId: sanitizedActiveTaskId,
      activeTab: sanitizedActiveTab,
      remainingSecondsByChunk: sanitizedRemainingSecondsByChunk
    };
  } catch {
    return null;
  }
}

export function savePersistedState(state: PersistedState): void {
  if (typeof window === "undefined") {
    return;
  }

  const sanitized = sanitizeStateForStorage(state);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
}
