import { describe, expect, it } from "vitest";
import { computeMvpKpis } from "./kpi";
import type { AppEvent, EventName } from "../types/domain";

const DAY_MS = 24 * 60 * 60 * 1000;

function createEvent(params: {
  eventName: EventName;
  timestampMs: number;
  sessionId: string;
  taskId?: string;
  chunkId?: string;
  meta?: AppEvent["meta"];
}): AppEvent {
  return {
    id: `event-${params.eventName}-${params.timestampMs}`,
    eventName: params.eventName,
    timestamp: new Date(params.timestampMs).toISOString(),
    sessionId: params.sessionId,
    source: "local",
    taskId: params.taskId ?? null,
    chunkId: params.chunkId ?? null,
    meta: params.meta
  };
}

describe("computeMvpKpis", () => {
  it("calculates KPI summary from event streams", () => {
    const baseMs = Date.parse("2026-02-20T09:00:00.000Z");
    const events: AppEvent[] = [
      createEvent({ eventName: "task_created", timestampMs: baseMs, sessionId: "s1", taskId: "t1" }),
      createEvent({
        eventName: "chunk_generated",
        timestampMs: baseMs + 5_000,
        sessionId: "s1",
        taskId: "t1",
        meta: { chunkCount: 5 }
      }),
      createEvent({ eventName: "chunk_started", timestampMs: baseMs + 300_000, sessionId: "s1", taskId: "t1" }),
      createEvent({ eventName: "chunk_completed", timestampMs: baseMs + 3_600_000, sessionId: "s1", taskId: "t1" }),
      createEvent({ eventName: "chunk_abandoned", timestampMs: baseMs + 7_200_000, sessionId: "s1", taskId: "t1" }),
      createEvent({ eventName: "reschedule_requested", timestampMs: baseMs + 7_300_000, sessionId: "s1", taskId: "t1" }),
      createEvent({ eventName: "task_created", timestampMs: baseMs + DAY_MS + 9_000_000, sessionId: "s1", taskId: "t3" }),
      createEvent({ eventName: "task_created", timestampMs: baseMs + DAY_MS * 7 + 100_000, sessionId: "s1", taskId: "t4" }),

      createEvent({ eventName: "task_created", timestampMs: baseMs + 11_000, sessionId: "s2", taskId: "t2" }),
      createEvent({
        eventName: "chunk_generated",
        timestampMs: baseMs + 12_000,
        sessionId: "s2",
        taskId: "t2",
        meta: { chunkCount: 4 }
      }),
      createEvent({ eventName: "chunk_started", timestampMs: baseMs + 7_200_000, sessionId: "s2", taskId: "t2" })
    ];

    const summary = computeMvpKpis(events);

    expect(summary.activationRate.value).toBe(50);
    expect(summary.chunkCompletionRate.value).toBe(11.1);
    expect(summary.recoveryRate.value).toBe(100);
    expect(summary.d1Retention.value).toBe(100);
    expect(summary.d7Retention.value).toBe(100);
    expect(summary.averageTimeToStartSeconds).toBe(3_745);
    expect(summary.samples.sessions).toBe(2);
    expect(summary.samples.generatedChunks).toBe(9);
    expect(summary.samples.completedChunks).toBe(1);
    expect(summary.eventCoverage.task_created).toBe(true);
    expect(summary.eventCoverage.chunk_completed).toBe(true);
  });

  it("returns safe null/zero defaults when events are empty", () => {
    const summary = computeMvpKpis([]);

    expect(summary.activationRate).toEqual({
      value: null,
      numerator: 0,
      denominator: 0
    });
    expect(summary.chunkCompletionRate.value).toBeNull();
    expect(summary.recoveryRate.value).toBeNull();
    expect(summary.d1Retention.value).toBeNull();
    expect(summary.d7Retention.value).toBeNull();
    expect(summary.averageTimeToStartMs).toBeNull();
    expect(summary.samples.sessions).toBe(0);
  });

  it("does not count recovery when recovery event is earlier than abandonment", () => {
    const baseMs = Date.parse("2026-02-20T09:00:00.000Z");
    const events: AppEvent[] = [
      createEvent({ eventName: "task_created", timestampMs: baseMs, sessionId: "s1", taskId: "t1" }),
      createEvent({ eventName: "reschedule_requested", timestampMs: baseMs + 1000, sessionId: "s1", taskId: "t1" }),
      createEvent({ eventName: "chunk_abandoned", timestampMs: baseMs + 2000, sessionId: "s1", taskId: "t1" })
    ];

    const summary = computeMvpKpis(events);
    expect(summary.recoveryRate.value).toBe(0);
    expect(summary.recoveryRate.numerator).toBe(0);
    expect(summary.recoveryRate.denominator).toBe(1);
  });

  it("counts recovery when any abandonment has recovery within 24h", () => {
    const baseMs = Date.parse("2026-02-20T09:00:00.000Z");
    const events: AppEvent[] = [
      createEvent({ eventName: "task_created", timestampMs: baseMs, sessionId: "s1", taskId: "t1" }),
      createEvent({ eventName: "chunk_abandoned", timestampMs: baseMs + 1_000, sessionId: "s1", taskId: "t1" }),
      createEvent({
        eventName: "reschedule_requested",
        timestampMs: baseMs + DAY_MS + 10_000,
        sessionId: "s1",
        taskId: "t1"
      }),
      createEvent({
        eventName: "chunk_abandoned",
        timestampMs: baseMs + DAY_MS * 2,
        sessionId: "s1",
        taskId: "t1"
      }),
      createEvent({
        eventName: "rechunk_requested",
        timestampMs: baseMs + DAY_MS * 2 + 30_000,
        sessionId: "s1",
        taskId: "t1"
      })
    ];

    const summary = computeMvpKpis(events);
    expect(summary.recoveryRate.value).toBe(100);
    expect(summary.recoveryRate.numerator).toBe(1);
    expect(summary.recoveryRate.denominator).toBe(1);
  });

  it("applies D1/D7 windows with inclusive start and exclusive end", () => {
    const baseMs = Date.parse("2026-02-20T09:00:00.000Z");
    const events: AppEvent[] = [
      createEvent({ eventName: "task_created", timestampMs: baseMs, sessionId: "s1", taskId: "t1" }),
      createEvent({ eventName: "chunk_completed", timestampMs: baseMs + DAY_MS, sessionId: "s1", taskId: "t1" }),
      createEvent({ eventName: "task_created", timestampMs: baseMs + DAY_MS, sessionId: "s1", taskId: "t2" }),
      createEvent({ eventName: "task_created", timestampMs: baseMs + DAY_MS * 2, sessionId: "s1", taskId: "t3" }),
      createEvent({ eventName: "task_created", timestampMs: baseMs + DAY_MS * 7, sessionId: "s1", taskId: "t4" }),
      createEvent({ eventName: "task_created", timestampMs: baseMs + DAY_MS * 8, sessionId: "s1", taskId: "t5" }),
      createEvent({ eventName: "task_created", timestampMs: baseMs + 5_000, sessionId: "s2", taskId: "t6" })
    ];

    const summary = computeMvpKpis(events);
    expect(summary.activationRate.value).toBe(50);
    expect(summary.d1Retention.value).toBe(100);
    expect(summary.d7Retention.value).toBe(100);
    expect(summary.samples.sessions).toBe(2);
  });

  it("counts D1/D7 return events across different sessions on a single-user timeline", () => {
    const baseMs = Date.parse("2026-02-20T09:00:00.000Z");
    const events: AppEvent[] = [
      createEvent({ eventName: "task_created", timestampMs: baseMs, sessionId: "s1", taskId: "t1" }),
      createEvent({ eventName: "task_created", timestampMs: baseMs + DAY_MS + 5_000, sessionId: "s2", taskId: "t2" }),
      createEvent({ eventName: "chunk_started", timestampMs: baseMs + DAY_MS * 7 + 5_000, sessionId: "s3", taskId: "t3" })
    ];

    const summary = computeMvpKpis(events);
    expect(summary.d1Retention).toEqual({
      value: 100,
      numerator: 1,
      denominator: 1
    });
    expect(summary.d7Retention).toEqual({
      value: 100,
      numerator: 1,
      denominator: 1
    });
  });

  it("ignores invalid chunkCount values safely", () => {
    const baseMs = Date.parse("2026-02-20T09:00:00.000Z");
    const events: AppEvent[] = [
      createEvent({ eventName: "task_created", timestampMs: baseMs, sessionId: "s1", taskId: "t1" }),
      createEvent({
        eventName: "chunk_generated",
        timestampMs: baseMs + 1_000,
        sessionId: "s1",
        taskId: "t1",
        meta: { chunkCount: -3 }
      }),
      createEvent({
        eventName: "chunk_generated",
        timestampMs: baseMs + 2_000,
        sessionId: "s1",
        taskId: "t1",
        meta: { chunkCount: 2.8 }
      }),
      createEvent({
        eventName: "chunk_generated",
        timestampMs: baseMs + 3_000,
        sessionId: "s1",
        taskId: "t1",
        meta: { chunkCount: Number.NaN }
      }),
      createEvent({
        eventName: "chunk_generated",
        timestampMs: baseMs + 4_000,
        sessionId: "s1",
        taskId: "t1",
        meta: {}
      }),
      createEvent({ eventName: "chunk_completed", timestampMs: baseMs + 5_000, sessionId: "s1", taskId: "t1" })
    ];

    const summary = computeMvpKpis(events);
    expect(summary.samples.generatedChunks).toBe(2);
    expect(summary.samples.completedChunks).toBe(1);
    expect(summary.chunkCompletionRate.value).toBe(50);
  });

  it("drops invalid timestamp events without throwing", () => {
    const events: AppEvent[] = [
      {
        id: "invalid-ts",
        eventName: "task_created",
        timestamp: "not-a-timestamp",
        sessionId: "s1",
        source: "local",
        taskId: "t1",
        chunkId: null
      }
    ];

    const summary = computeMvpKpis(events);
    expect(summary.samples.sessions).toBe(0);
    expect(summary.activationRate.value).toBeNull();
    expect(summary.eventCoverage.task_created).toBe(false);
  });
});
