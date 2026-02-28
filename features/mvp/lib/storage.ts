import {
  MAX_TASK_TOTAL_MINUTES,
  MIN_TASK_TOTAL_MINUTES,
  type AppEvent,
  type Mission,
  type MissionStatus,
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
const MISSION_STATUS_VALUES: MissionStatus[] = ["todo", "running", "paused", "done", "abandoned", "archived"];
const TIMER_SESSION_STATE_VALUES: TimerSessionState[] = ["running", "paused", "ended"];
const ACTIVE_TAB_VALUES: PersistedState["activeTab"][] = ["home", "tasks", "stats", "settings"];
const EVENT_NAME_VALUES: EventName[] = [
  "task_created",
  "mission_generated",
  "mission_started",
  "mission_paused",
  "mission_completed",
  "mission_abandoned",
  "remission_requested",
  "reschedule_requested",
  "task_rescheduled",
  "mission_time_adjusted",
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

function isMissionStatus(value: unknown): value is MissionStatus {
  return isString(value) && MISSION_STATUS_VALUES.includes(value as MissionStatus);
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

function sanitizeMissionIconKey(value: unknown): string | undefined {
  if (!isString(value)) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function buildMissionMinuteFallbackByTaskId(missions: Mission[]): Map<string, number> {
  const taskMinutes = new Map<string, number>();

  missions.forEach((mission) => {
    const current = taskMinutes.get(mission.taskId) ?? 0;
    taskMinutes.set(mission.taskId, current + Math.max(0, Math.floor(mission.estMinutes)));
  });

  return taskMinutes;
}

interface TaskTimelineFallback {
  startedAt?: string;
  completedAt?: string;
  hasOpenMissions: boolean;
}

function buildTaskTimelineFallbackByTaskId(missions: Mission[]): Map<string, TaskTimelineFallback> {
  const timelineByTaskId = new Map<string, TaskTimelineFallback>();

  missions.forEach((mission) => {
    const current = timelineByTaskId.get(mission.taskId) ?? { hasOpenMissions: false };

    if (mission.startedAt && (!current.startedAt || Date.parse(mission.startedAt) < Date.parse(current.startedAt))) {
      current.startedAt = mission.startedAt;
    }

    if (mission.completedAt && (!current.completedAt || Date.parse(mission.completedAt) > Date.parse(current.completedAt))) {
      current.completedAt = mission.completedAt;
    }

    if (mission.status === "todo" || mission.status === "running" || mission.status === "paused") {
      current.hasOpenMissions = true;
    }

    timelineByTaskId.set(mission.taskId, current);
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

function isMission(value: unknown): value is Mission {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id)
    && isString(value.taskId)
    && isNumber(value.order)
    && isString(value.action)
    && isNumber(value.estMinutes)
    && isMissionStatus(value.status)
    && (value.startedAt === undefined || isString(value.startedAt))
    && (value.completedAt === undefined || isString(value.completedAt))
    && (value.actualSeconds === undefined || isNumber(value.actualSeconds))
    && (value.parentMissionId === undefined || isString(value.parentMissionId))
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
    && isString(value.missionId)
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
    && (value.missionId === null || isString(value.missionId))
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

function sanitizeMissionForStorage(mission: Mission): Mission {
  return {
    ...mission,
    iconKey: sanitizeMissionIconKey(mission.iconKey)
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
  const sanitizedMissions = state.missions.map((mission) => sanitizeMissionForStorage(mission));
  const minuteFallbackByTaskId = buildMissionMinuteFallbackByTaskId(sanitizedMissions);

  return {
    ...state,
    missions: sanitizedMissions,
    tasks: state.tasks.map((task) => sanitizeTaskForStorage(task, minuteFallbackByTaskId))
  };
}

function sanitizeRemainingSecondsByMission(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const next: Record<string, number> = {};
  Object.entries(value).forEach(([missionId, seconds]) => {
    if (isString(missionId) && isNumber(seconds)) {
      next[missionId] = Math.max(0, Math.floor(seconds));
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

    const sanitizedMissions = Array.isArray(parsed.missions)
      ? parsed.missions
        .filter((mission): mission is Mission => isMission(mission))
        .map((mission) => sanitizeMissionForStorage(mission))
      : [];
    const minuteFallbackByTaskId = buildMissionMinuteFallbackByTaskId(sanitizedMissions);
    const timelineFallbackByTaskId = buildTaskTimelineFallbackByTaskId(sanitizedMissions);
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
    const sanitizedRemainingSecondsByMission = sanitizeRemainingSecondsByMission(parsed.remainingSecondsByMission);

    return {
      tasks: sanitizedTasks,
      missions: sanitizedMissions,
      timerSessions: sanitizedTimerSessions,
      stats: sanitizedStats,
      settings: sanitizedSettings,
      events: sanitizedEvents,
      activeTaskId: sanitizedActiveTaskId,
      activeTab: sanitizedActiveTab,
      remainingSecondsByMission: sanitizedRemainingSecondsByMission
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
