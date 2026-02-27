import {
  MAX_TASK_TOTAL_MINUTES,
  MIN_TASK_TOTAL_MINUTES
} from "@/features/mvp/types/domain";

export function parseTaskTotalMinutesInput(rawInput: string): number | null {
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

export function parseLooseMinuteInput(rawInput: string): number | null {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.floor(parsed);
}

export function isTaskTotalMinutesInRange(totalMinutes: number): boolean {
  return totalMinutes >= MIN_TASK_TOTAL_MINUTES && totalMinutes <= MAX_TASK_TOTAL_MINUTES;
}

export function getTaskMetaConstraintFeedback(
  totalMinutes: number | null,
  scheduledFor: Date | null,
  dueAt: Date | null
): string | null {
  if (totalMinutes !== null && !isTaskTotalMinutesInRange(totalMinutes)) {
    return `총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 범위로 입력해주세요.`;
  }

  if (scheduledFor && dueAt && scheduledFor.getTime() > dueAt.getTime()) {
    return "시작 예정 시간은 마감 시간보다 늦을 수 없습니다.";
  }

  return null;
}

export function buildTaskSummary(rawInput: string): string {
  return rawInput.trim().replace(/\s+/g, " ").slice(0, 60);
}
