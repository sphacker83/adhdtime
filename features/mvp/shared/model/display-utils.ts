import type { AppEvent, Mission, StatsState, Task } from "@/features/mvp/types/domain";

const DAY_IN_MS = 86_400_000;

function getLocalDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_IN_MS);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatTimeOfDayLabel(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatRelativeDateLabel(date: Date, now = new Date()): string {
  const dayDiff = getLocalDayNumber(date) - getLocalDayNumber(now);
  if (dayDiff === 0) {
    return "오늘";
  }

  if (dayDiff === 1) {
    return "내일";
  }

  if (dayDiff > 1) {
    return `D-${dayDiff}`;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatOptionalDateTime(isoValue?: string, now = new Date()): string {
  if (!isoValue) {
    return "미설정";
  }

  const parsedDate = new Date(isoValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "미설정";
  }

  return `${formatRelativeDateLabel(parsedDate, now)} ${formatTimeOfDayLabel(parsedDate)}`;
}

export function missionStatusLabel(status: Mission["status"]): string {
  if (status === "running") {
    return "진행 중";
  }
  if (status === "paused") {
    return "일시정지";
  }
  if (status === "done") {
    return "완료";
  }
  if (status === "abandoned") {
    return "중단";
  }
  if (status === "archived") {
    return "보관됨";
  }
  return "대기";
}

export function taskStatusLabel(status: Task["status"]): string {
  if (status === "in_progress") {
    return "진행 중";
  }
  if (status === "done") {
    return "완료";
  }
  if (status === "archived") {
    return "보관됨";
  }
  return "대기";
}

export function getXpProgressPercent(stats: StatsState): number {
  const safeAccountLevel = Math.max(1, Math.floor(stats.accountLevel));
  const levelOffset = safeAccountLevel - 1;
  const requiredAxp = 80 + 22 * levelOffset + 4 * (levelOffset ** 2);
  if (requiredAxp <= 0) {
    return 0;
  }

  const safeAxp = Math.max(0, Math.floor(stats.axp));
  return Math.min(100, Math.round((safeAxp / requiredAxp) * 100));
}

export function formatPercentValue(value: number | null): string {
  if (value === null) {
    return "데이터 없음";
  }
  return `${value}%`;
}

export function formatTimeToStart(seconds: number | null): string {
  if (seconds === null) {
    return "데이터 없음";
  }

  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}분 ${String(remainSeconds).padStart(2, "0")}초`;
}

export function formatEventMeta(meta?: AppEvent["meta"]): string {
  if (!meta) {
    return "";
  }

  return Object.entries(meta)
    .slice(0, 3)
    .map(([key, value]) => `${key}:${String(value)}`)
    .join(" · ");
}
