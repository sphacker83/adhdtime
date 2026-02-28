import type { AppEvent, EventName } from "@/features/mvp/types/domain";

const DAY_MS = 24 * 60 * 60 * 1000;

const REQUIRED_EVENT_NAMES: EventName[] = [
  "task_created",
  "task_time_updated",
  "task_rescheduled",
  "reschedule_requested",
  "mission_generated",
  "mission_time_adjusted",
  "mission_started",
  "mission_paused",
  "mission_completed",
  "mission_abandoned",
  "remission_requested",
  "xp_gained",
  "level_up",
  "rank_promoted",
  "character_rank_changed",
  "haptic_fired",
  "safety_blocked"
];

interface NormalizedEvent extends AppEvent {
  timestampMs: number;
}

export interface KpiMetric {
  value: number | null;
  numerator: number;
  denominator: number;
}

export interface MvpKpiSummary {
  activationRate: KpiMetric;
  averageTimeToStartMs: number | null;
  averageTimeToStartSeconds: number | null;
  missionCompletionRate: KpiMetric;
  recoveryRate: KpiMetric;
  d1Retention: KpiMetric;
  d7Retention: KpiMetric;
  samples: {
    sessions: number;
    tasksCreated: number;
    tasksStarted: number;
    tasksAbandoned: number;
    generatedMissions: number;
    completedMissions: number;
  };
  eventCoverage: Record<EventName, boolean>;
}

function toTimestampMs(iso: string): number | null {
  const timestampMs = Date.parse(iso);
  return Number.isFinite(timestampMs) ? timestampMs : null;
}

function normalizeEvents(events: AppEvent[]): NormalizedEvent[] {
  return events
    .map((event) => {
      const timestampMs = toTimestampMs(event.timestamp);
      if (timestampMs === null) {
        return null;
      }
      return {
        ...event,
        timestampMs
      };
    })
    .filter((event): event is NormalizedEvent => event !== null)
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

function toPercent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
}

function createMetric(numerator: number, denominator: number): KpiMetric {
  return {
    value: toPercent(numerator, denominator),
    numerator,
    denominator
  };
}

function extractMissionCount(event: AppEvent): number {
  const rawCount = event.meta?.missionCount;
  if (typeof rawCount !== "number" || !Number.isFinite(rawCount)) {
    return 0;
  }
  return Math.max(0, Math.floor(rawCount));
}

function createEventCoverageMap(events: AppEvent[]): Record<EventName, boolean> {
  const coverage = Object.fromEntries(
    REQUIRED_EVENT_NAMES.map((eventName) => [eventName, false])
  ) as Record<EventName, boolean>;

  events.forEach((event) => {
    coverage[event.eventName] = true;
  });

  return coverage;
}

function hasEventWithinWindow(
  events: NormalizedEvent[],
  fromMs: number,
  windowStartDayOffset: number,
  windowEndDayOffset: number
): boolean {
  const windowStart = fromMs + windowStartDayOffset * DAY_MS;
  const windowEnd = fromMs + windowEndDayOffset * DAY_MS;

  return events.some((event) => event.timestampMs >= windowStart && event.timestampMs < windowEnd);
}

export function computeMvpKpis(events: AppEvent[]): MvpKpiSummary {
  const normalized = normalizeEvents(events);
  const eventsBySessionId = new Map<string, NormalizedEvent[]>();
  const firstEventBySessionId = new Map<string, number>();
  const createdAtByTaskId = new Map<string, number>();
  const firstStartedAtByTaskId = new Map<string, number>();
  const abandonedAtByTaskId = new Map<string, number[]>();
  const recoveryEventsByTaskId = new Map<string, number[]>();

  let generatedMissions = 0;
  let completedMissions = 0;

  normalized.forEach((event) => {
    const currentEvents = eventsBySessionId.get(event.sessionId) ?? [];
    currentEvents.push(event);
    eventsBySessionId.set(event.sessionId, currentEvents);

    if (!firstEventBySessionId.has(event.sessionId)) {
      firstEventBySessionId.set(event.sessionId, event.timestampMs);
    }

    if (event.eventName === "task_created" && event.taskId) {
      const prev = createdAtByTaskId.get(event.taskId);
      if (prev === undefined || event.timestampMs < prev) {
        createdAtByTaskId.set(event.taskId, event.timestampMs);
      }
    }

    if (event.eventName === "mission_started" && event.taskId) {
      const prev = firstStartedAtByTaskId.get(event.taskId);
      if (prev === undefined || event.timestampMs < prev) {
        firstStartedAtByTaskId.set(event.taskId, event.timestampMs);
      }
    }

    if (event.eventName === "mission_generated") {
      generatedMissions += extractMissionCount(event);
    }

    if (event.eventName === "mission_completed") {
      completedMissions += 1;
    }

    if (event.eventName === "mission_abandoned" && event.taskId) {
      const abandonedAt = abandonedAtByTaskId.get(event.taskId) ?? [];
      abandonedAt.push(event.timestampMs);
      abandonedAtByTaskId.set(event.taskId, abandonedAt);
    }

    if ((event.eventName === "remission_requested" || event.eventName === "reschedule_requested") && event.taskId) {
      const recovered = recoveryEventsByTaskId.get(event.taskId) ?? [];
      recovered.push(event.timestampMs);
      recoveryEventsByTaskId.set(event.taskId, recovered);
    }
  });

  const activationSessions = Array.from(firstEventBySessionId.entries());
  let activationHits = 0;

  activationSessions.forEach(([sessionId, firstEventMs]) => {
    const sessionEvents = eventsBySessionId.get(sessionId) ?? [];
    const completedWithin24h = sessionEvents.some(
      (event) => event.eventName === "mission_completed"
        && event.timestampMs >= firstEventMs
        && event.timestampMs <= firstEventMs + DAY_MS
    );
    if (completedWithin24h) {
      activationHits += 1;
    }
  });

  const timeToStartSamples: number[] = [];
  createdAtByTaskId.forEach((createdAtMs, taskId) => {
    const startedAtMs = firstStartedAtByTaskId.get(taskId);
    if (startedAtMs === undefined || startedAtMs < createdAtMs) {
      return;
    }
    timeToStartSamples.push(startedAtMs - createdAtMs);
  });

  const averageTimeToStartMs = timeToStartSamples.length > 0
    ? Math.round(timeToStartSamples.reduce((sum, value) => sum + value, 0) / timeToStartSamples.length)
    : null;

  const abandonedTasks = Array.from(abandonedAtByTaskId.entries());
  let recoveredWithin24hCount = 0;
  abandonedTasks.forEach(([taskId, abandonedAtEvents]) => {
    const recoveries = recoveryEventsByTaskId.get(taskId) ?? [];
    const recoveredWithin24h = abandonedAtEvents.some((abandonedAtMs) =>
      recoveries.some((recoveryAtMs) =>
        recoveryAtMs >= abandonedAtMs && recoveryAtMs <= abandonedAtMs + DAY_MS
      )
    );
    if (recoveredWithin24h) {
      recoveredWithin24hCount += 1;
    }
  });

  const firstUserEventMs = normalized[0]?.timestampMs ?? null;
  const d1Hits =
    firstUserEventMs !== null && hasEventWithinWindow(normalized, firstUserEventMs, 1, 2) ? 1 : 0;
  const d7Hits =
    firstUserEventMs !== null && hasEventWithinWindow(normalized, firstUserEventMs, 7, 8) ? 1 : 0;
  const retentionDenominator = firstUserEventMs === null ? 0 : 1;

  return {
    activationRate: createMetric(activationHits, activationSessions.length),
    averageTimeToStartMs,
    averageTimeToStartSeconds: averageTimeToStartMs === null ? null : Math.round(averageTimeToStartMs / 1000),
    missionCompletionRate: createMetric(completedMissions, generatedMissions),
    recoveryRate: createMetric(recoveredWithin24hCount, abandonedTasks.length),
    d1Retention: createMetric(d1Hits, retentionDenominator),
    d7Retention: createMetric(d7Hits, retentionDenominator),
    samples: {
      sessions: activationSessions.length,
      tasksCreated: createdAtByTaskId.size,
      tasksStarted: firstStartedAtByTaskId.size,
      tasksAbandoned: abandonedTasks.length,
      generatedMissions,
      completedMissions
    },
    eventCoverage: createEventCoverageMap(normalized)
  };
}

export function getRequiredEventNames(): EventName[] {
  return [...REQUIRED_EVENT_NAMES];
}
