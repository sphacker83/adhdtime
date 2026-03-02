import type { StatKey, StatRankState } from "@/features/mvp/types/domain";

export const STAT_META: Array<{ key: StatKey; label: string }> = [
  { key: "initiation", label: "시작력" },
  { key: "focus", label: "몰입력" },
  { key: "breakdown", label: "분해력" },
  { key: "recovery", label: "회복력" },
  { key: "consistency", label: "지속력" }
];
export const RADAR_ABSOLUTE_STAGE_CAP = 15;

export function pointsToString(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function resolveStageValue(value: unknown): number {
  if (!value || typeof value !== "object") {
    return 0;
  }

  const withTotalScore = value as { totalScore?: unknown };
  if (typeof withTotalScore.totalScore !== "number" || !Number.isFinite(withTotalScore.totalScore)) {
    return 0;
  }

  const totalScore = Math.max(0, withTotalScore.totalScore);
  const stageBase = Math.floor(totalScore / 100);
  const stageProgress = (totalScore % 100) / 100;

  return stageBase + stageProgress;
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

  const stageValues = STAT_META.map(({ key }) => resolveStageValue(statRanks[key]));

  const data = pointsToString(
    axes.map(([x, y], index) => {
      const ratio = clampRatio(stageValues[index] / RADAR_ABSOLUTE_STAGE_CAP);
      return [
        center + (x - center) * ratio,
        center + (y - center) * ratio
      ] as [number, number];
    })
  );

  return { data, grid };
}
