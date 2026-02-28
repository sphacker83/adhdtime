import type { StatKey, StatRankState } from "@/features/mvp/types/domain";

export const STAT_META: Array<{ key: StatKey; label: string }> = [
  { key: "initiation", label: "시작력" },
  { key: "focus", label: "몰입력" },
  { key: "breakdown", label: "분해력" },
  { key: "recovery", label: "회복력" },
  { key: "consistency", label: "지속력" }
];

export function pointsToString(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function clampDisplayScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(99, Math.round(value)));
}

function resolveDisplayScore(value: unknown): number {
  if (!value || typeof value !== "object") {
    return 0;
  }

  const withDisplayScore = value as { displayScore?: unknown; progress?: unknown };
  if (typeof withDisplayScore.displayScore === "number" && Number.isFinite(withDisplayScore.displayScore)) {
    return clampDisplayScore(withDisplayScore.displayScore);
  }

  if (typeof withDisplayScore.progress === "number" && Number.isFinite(withDisplayScore.progress)) {
    return clampDisplayScore(withDisplayScore.progress);
  }

  return 0;
}

export function buildRadarShape(statRanks: StatRankState): { data: string; grid: string[] } {
  const center = 60;
  const radius = 48;

  const axes = STAT_META.map((_, index) => {
    const angle = (-Math.PI / 2) + (index * Math.PI * 2) / STAT_META.length;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return [x, y] as [number, number];
  });

  const grid = [0.25, 0.5, 0.75, 1].map((ratio) =>
    pointsToString(
      axes.map(([x, y]) => [
        center + (x - center) * ratio,
        center + (y - center) * ratio
      ])
    )
  );

  const data = pointsToString(
    axes.map(([x, y], index) => {
      const key = STAT_META[index].key;
      const displayScore = resolveDisplayScore(statRanks[key]);
      const ratio = displayScore / 99;
      return [
        center + (x - center) * ratio,
        center + (y - center) * ratio
      ] as [number, number];
    })
  );

  return { data, grid };
}
