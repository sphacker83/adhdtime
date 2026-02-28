import { describe, expect, it } from "vitest";
import {
  addMinutesToDate,
  buildNextRescheduleDate,
  buildTaskSummary,
  formatDateTimeLocalInput,
  getDiffMinutes,
  getTaskMetaConstraintFeedback,
  isTaskTotalMinutesInRange,
  normalizeTaskScheduleFromLocalInputs,
  normalizeTaskScheduleIso,
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
    expect(parseDateTimeLocalInput("2026-03-01 09:15")).toBeNull();
    expect(parseDateTimeLocalInput("2026-03-01T09")).toBeNull();
    expect(parseDateTimeLocalInput("2026-13-01T09:15")).toBeNull();

    const iso = parseOptionalDateTimeInput("2026-03-01T09:15");
    expect(typeof iso).toBe("string");
    expect(Number.isFinite(Date.parse(iso ?? ""))).toBe(true);
    expect(parseOptionalDateTimeInput("")).toBeUndefined();
    expect(parseOptionalDateTimeInput("2026-03-01 09:15")).toBeUndefined();
  });

  it("normalizes local schedule inputs for task creation", () => {
    const fromScheduledOnly = normalizeTaskScheduleFromLocalInputs({
      scheduledForInput: "2026-03-01T09:15",
      dueAtInput: "",
      totalMinutes: 60
    });
    expect(fromScheduledOnly).not.toBeNull();
    expect(fromScheduledOnly?.scheduledFor).toBeDefined();
    expect(fromScheduledOnly?.dueAt).toBeDefined();
    expect(
      getDiffMinutes(
        new Date(fromScheduledOnly?.scheduledFor ?? ""),
        new Date(fromScheduledOnly?.dueAt ?? "")
      )
    ).toBe(60);

    const fromDueOnly = normalizeTaskScheduleFromLocalInputs({
      scheduledForInput: "",
      dueAtInput: "2026-03-01T11:15",
      totalMinutes: 30
    });
    expect(fromDueOnly).not.toBeNull();
    expect(
      getDiffMinutes(
        new Date(fromDueOnly?.scheduledFor ?? ""),
        new Date(fromDueOnly?.dueAt ?? "")
      )
    ).toBe(30);

    const fromReversed = normalizeTaskScheduleFromLocalInputs({
      scheduledForInput: "2026-03-01T14:00",
      dueAtInput: "2026-03-01T13:00",
      totalMinutes: 45
    });
    expect(fromReversed).not.toBeNull();
    expect(
      getDiffMinutes(
        new Date(fromReversed?.scheduledFor ?? ""),
        new Date(fromReversed?.dueAt ?? "")
      )
    ).toBe(45);

    const fromEmpty = normalizeTaskScheduleFromLocalInputs({
      scheduledForInput: "",
      dueAtInput: "",
      totalMinutes: 50,
      fallbackStartAt: new Date("2026-03-01T08:00:00.000Z")
    });
    expect(fromEmpty).not.toBeNull();
    expect(fromEmpty?.scheduledFor).toBe("2026-03-01T08:00:00.000Z");
    expect(fromEmpty?.dueAt).toBe("2026-03-01T08:50:00.000Z");

    const invalid = normalizeTaskScheduleFromLocalInputs({
      scheduledForInput: "2026-03-01 09:15",
      dueAtInput: "",
      totalMinutes: 60
    });
    expect(invalid).toBeNull();
  });

  it("normalizes persisted task schedule for manual chunk path", () => {
    const normalizedEmpty = normalizeTaskScheduleIso({
      totalMinutes: 40,
      fallbackStartAt: new Date("2026-03-01T09:00:00.000Z")
    });
    expect(normalizedEmpty.changed).toBe(true);
    expect(normalizedEmpty.scheduledFor).toBe("2026-03-01T09:00:00.000Z");
    expect(normalizedEmpty.dueAt).toBe("2026-03-01T09:40:00.000Z");

    const normalizedReversed = normalizeTaskScheduleIso({
      scheduledFor: "2026-03-01T10:00:00.000Z",
      dueAt: "2026-03-01T09:00:00.000Z",
      totalMinutes: 20
    });
    expect(normalizedReversed.changed).toBe(true);
    expect(normalizedReversed.scheduledFor).toBe("2026-03-01T10:00:00.000Z");
    expect(normalizedReversed.dueAt).toBe("2026-03-01T10:20:00.000Z");

    const alreadyAligned = normalizeTaskScheduleIso({
      scheduledFor: "2026-03-01T12:00:00.000Z",
      dueAt: "2026-03-01T12:30:00.000Z",
      totalMinutes: 30
    });
    expect(alreadyAligned.changed).toBe(false);
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
