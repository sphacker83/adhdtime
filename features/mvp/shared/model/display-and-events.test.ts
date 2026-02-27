import { describe, expect, it } from "vitest";
import {
  STAT_META,
  buildRadarShape,
  chunkStatusLabel,
  formatClock,
  formatEventMeta,
  formatOptionalDateTime,
  formatPercentValue,
  formatTimeToStart,
  getXpProgressPercent,
  normalizeLoadedEvents,
  taskStatusLabel
} from "@/features/mvp/shared";
import type { AppEvent } from "@/features/mvp/types/domain";

describe("display and events model", () => {
  it("formats status and summary values", () => {
    expect(chunkStatusLabel("running")).toBe("진행 중");
    expect(chunkStatusLabel("done")).toBe("완료");
    expect(taskStatusLabel("in_progress")).toBe("진행 중");
    expect(taskStatusLabel("todo")).toBe("대기");
    expect(formatClock(65)).toBe("01:05");
    expect(formatPercentValue(null)).toBe("데이터 없음");
    expect(formatPercentValue(42)).toBe("42%");
    expect(formatTimeToStart(125)).toBe("2분 05초");
    expect(formatOptionalDateTime(undefined)).toBe("미설정");
  });

  it("computes xp progress and radar shape", () => {
    expect(
      getXpProgressPercent({
        xp: 50,
        level: 1,
        todayDateKey: "2026-02-27",
        todayXpGain: 0,
        todayCompleted: 0,
        todayStatGain: { initiation: 0, focus: 0, breakdown: 0, recovery: 0, consistency: 0 },
        initiation: 10,
        focus: 20,
        breakdown: 30,
        recovery: 40,
        consistency: 50
      })
    ).toBe(50);

    const shape = buildRadarShape({
      initiation: 10,
      focus: 20,
      breakdown: 30,
      recovery: 40,
      consistency: 50
    });
    expect(STAT_META).toHaveLength(5);
    expect(shape.grid).toHaveLength(4);
    expect(shape.data.length).toBeGreaterThan(0);
  });

  it("normalizes loaded events and event meta text", () => {
    const events: AppEvent[] = [
      {
        id: "e1",
        eventName: "task_created",
        timestamp: new Date("2026-02-27T00:00:00.000Z").toISOString(),
        sessionId: "",
        source: "local",
        taskId: null,
        chunkId: null,
        meta: {
          a: 1,
          b: true,
          c: "x",
          d: "ignored"
        }
      }
    ];

    const normalized = normalizeLoadedEvents(events, "fallback-session");
    expect(normalized[0]?.sessionId).toBe("fallback-session");
    expect(normalized[0]?.taskId).toBeNull();
    expect(normalized[0]?.chunkId).toBeNull();
    expect(formatEventMeta(events[0]?.meta)).toContain("a:1");
  });
});
