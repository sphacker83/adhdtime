import { describe, expect, it } from "vitest";
import {
  STAT_META,
  buildRadarShape,
  formatClock,
  formatEventMeta,
  formatOptionalDateTime,
  formatPercentValue,
  formatTimeToStart,
  getXpProgressPercent,
  missionStatusLabel,
  normalizeLoadedEvents,
  taskStatusLabel
} from "@/features/mvp/shared";
import type { AppEvent } from "@/features/mvp/types/domain";

describe("display and events model", () => {
  it("formats status and summary values", () => {
    const baseNow = new Date(2026, 1, 27, 9, 0, 0);
    const todayIso = new Date(2026, 1, 27, 14, 5, 0).toISOString();
    const tomorrowIso = new Date(2026, 1, 28, 9, 15, 0).toISOString();
    const futureIso = new Date(2026, 2, 2, 18, 20, 0).toISOString();

    expect(missionStatusLabel("running")).toBe("진행 중");
    expect(missionStatusLabel("done")).toBe("완료");
    expect(taskStatusLabel("in_progress")).toBe("진행 중");
    expect(taskStatusLabel("todo")).toBe("대기");
    expect(formatClock(65)).toBe("01:05");
    expect(formatPercentValue(null)).toBe("데이터 없음");
    expect(formatPercentValue(42)).toBe("42%");
    expect(formatTimeToStart(125)).toBe("2분 05초");
    expect(formatOptionalDateTime(undefined)).toBe("미설정");
    expect(formatOptionalDateTime(todayIso, baseNow)).toBe("오늘 14:05");
    expect(formatOptionalDateTime(tomorrowIso, baseNow)).toBe("내일 09:15");
    expect(formatOptionalDateTime(futureIso, baseNow)).toBe("D-3 18:20");
    expect(formatOptionalDateTime("not-a-date", baseNow)).toBe("미설정");
  });

  it("computes xp progress and radar shape", () => {
    const statsFixture = {
      axp: 50,
      accountLevel: 1,
      todayDateKey: "2026-02-27",
      todayAxpGain: 0,
      todaySgpGain: 0,
      todayCompleted: 0,
      statRanks: {
        initiation: { rank: "F", displayScore: 10, progress: 80, mastery: 0 },
        focus: { rank: "F", displayScore: 20, progress: 80, mastery: 0 },
        breakdown: { rank: "F", displayScore: 30, progress: 80, mastery: 0 },
        recovery: { rank: "F", displayScore: 40, progress: 80, mastery: 0 },
        consistency: { rank: "F", displayScore: 50, progress: 80, mastery: 0 }
      },
      characterRank: {
        rank: "F",
        progress: 30,
        displayScore: 30,
        score: 0.3
      }
    } as unknown as Parameters<typeof getXpProgressPercent>[0];

    expect(getXpProgressPercent(statsFixture)).toBe(63);

    const shape = buildRadarShape({
      initiation: { rank: "F", displayScore: 1, progress: 99, mastery: 0 },
      focus: { rank: "E", displayScore: 20, progress: 10, mastery: 0 },
      breakdown: { rank: "D", displayScore: 30, progress: 10, mastery: 0 },
      recovery: { rank: "C", displayScore: 40, progress: 10, mastery: 0 },
      consistency: { rank: "B", displayScore: 50, progress: 10, mastery: 0 }
    } as unknown as Parameters<typeof buildRadarShape>[0]);
    expect(STAT_META).toHaveLength(5);
    expect(shape.grid).toHaveLength(4);
    expect(shape.data.length).toBeGreaterThan(0);

    const firstPoint = shape.data.split(" ")[0];
    const firstY = Number(firstPoint?.split(",")[1]);
    expect(firstY).toBeGreaterThan(59);
    expect(firstY).toBeLessThan(59.8);
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
        missionId: null,
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
    expect(normalized[0]?.missionId).toBeNull();
    expect(formatEventMeta(events[0]?.meta)).toContain("a:1");
  });
});
