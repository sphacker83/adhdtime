export type ProgressTone = "safe" | "warning" | "danger" | "overdue";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function calculateDeadlineProgress(
  now: Date,
  createdAt: Date,
  dueAt: Date
): number {
  const total = dueAt.getTime() - createdAt.getTime();
  if (total <= 0) {
    return 100;
  }

  const elapsed = now.getTime() - createdAt.getTime();
  const ratio = (elapsed / total) * 100;
  return clamp(ratio, 0, 100);
}

export function isOverdue(now: Date, dueAt: Date): boolean {
  return now.getTime() > dueAt.getTime();
}

export function resolveProgressColor(progress: number, overdue: boolean): ProgressTone {
  if (overdue) {
    return "overdue";
  }
  if (progress >= 85) {
    return "danger";
  }
  if (progress >= 60) {
    return "warning";
  }
  return "safe";
}

export function formatTimeToDeadline(now: Date, dueAt: Date): string {
  const diffMs = dueAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "마감 초과";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `마감까지 ${days}일 ${hours}시간`;
  }
  if (hours > 0) {
    return `마감까지 ${hours}시간 ${minutes}분`;
  }
  return `마감까지 ${minutes}분`;
}

export function formatHMS(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}
