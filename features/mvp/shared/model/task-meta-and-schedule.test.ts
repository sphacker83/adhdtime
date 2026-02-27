import { describe, expect, it } from "vitest";
import {
  addMinutesToDate,
  buildNextRescheduleDate,
  buildTaskSummary,
  formatDateTimeLocalInput,
  getDiffMinutes,
  getTaskMetaConstraintFeedback,
  isTaskTotalMinutesInRange,
  parseDateTimeLocalInput,
  parseLooseMinuteInput,
  parseOptionalDateTimeInput,
  parseTaskTotalMinutesInput
} from "@/features/mvp/shared";

describe("task-meta constraints and schedule model", () => {
  it("parses and validates task total minutes", () => {
    expect(parseTaskTotalMinutesInput("60")).toBe(60);
    expect(parseTaskTotalMinutesInput("9")).toBeNull();
    expect(parseTaskTotalMinutesInput("481")).toBeNull();
    expect(parseTaskTotalMinutesInput("abc")).toBeNull();
  });

  it("supports loose minute parsing and range check", () => {
    expect(parseLooseMinuteInput(" 12.9 ")).toBe(12);
    expect(parseLooseMinuteInput("")).toBeNull();
    expect(isTaskTotalMinutesInRange(10)).toBe(true);
    expect(isTaskTotalMinutesInRange(480)).toBe(true);
    expect(isTaskTotalMinutesInRange(9)).toBe(false);
  });

  it("returns feedback for invalid meta constraints", () => {
    expect(getTaskMetaConstraintFeedback(999, null, null)).toContain("총 소요 시간");
    const start = new Date("2026-02-27T10:00:00.000Z");
    const end = new Date("2026-02-27T09:00:00.000Z");
    expect(getTaskMetaConstraintFeedback(30, start, end)).toContain("시작 예정 시간");
    expect(getTaskMetaConstraintFeedback(30, end, start)).toBeNull();
  });

  it("normalizes summary text length", () => {
    const longText = "  hello   world  ".repeat(10);
    const summary = buildTaskSummary(longText);
    expect(summary.trim().length).toBeGreaterThan(0);
    expect(summary.includes("  ")).toBe(false);
    expect(summary.length).toBeLessThanOrEqual(60);
  });

  it("parses and formats schedule dates", () => {
    const parsed = parseDateTimeLocalInput("2026-03-01T09:15");
    expect(parsed).not.toBeNull();
    if (!parsed) {
      return;
    }

    expect(formatIsoLike(formatDateTimeLocalInput(parsed))).toBe("2026-03-01T09:15");
    expect(parseDateTimeLocalInput("")).toBeNull();

    const iso = parseOptionalDateTimeInput("2026-03-01T09:15");
    expect(typeof iso).toBe("string");
    expect(Number.isFinite(Date.parse(iso ?? ""))).toBe(true);
    expect(parseOptionalDateTimeInput("")).toBeUndefined();
  });

  it("computes minute deltas and next reschedule date", () => {
    const base = new Date("2026-02-27T00:00:00.000Z");
    const plus = addMinutesToDate(base, 90);
    expect(getDiffMinutes(base, plus)).toBe(90);

    const nextIso = buildNextRescheduleDate(new Date("2026-02-27T22:10:00.000Z"));
    const nextDate = new Date(nextIso);
    expect(Number.isFinite(nextDate.getTime())).toBe(true);
    expect(nextDate.getHours()).toBe(9);
  });
});

function formatIsoLike(value: string): string {
  return value.slice(0, 16);
}
