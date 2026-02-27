import type { AppEvent, Chunk, StatsState, Task } from "@/features/mvp/types/domain";

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

export function formatOptionalDateTime(isoValue?: string): string {
  if (!isoValue) {
    return "미설정";
  }

  return new Date(isoValue).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function chunkStatusLabel(status: Chunk["status"]): string {
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
  const maxXp = 100 + (stats.level - 1) * 45;
  if (maxXp <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((stats.xp / maxXp) * 100));
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
