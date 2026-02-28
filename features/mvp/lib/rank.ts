import type {
  CharacterRankState,
  RankTier,
  StatKey,
  StatRankProgress,
  StatRankState
} from "@/features/mvp/types/domain";

export const STAT_KEYS: StatKey[] = ["initiation", "focus", "breakdown", "recovery", "consistency"];

const RANK_SUFFIXES = ["-", "0", "+"] as const;
const BASE_RANKS = ["E", "D", "C", "B", "A"] as const;
const LONG_TERM_QUESTS_PER_TRANSITION = [18, 24, 32, 44, 59, 80, 108, 146, 198, 267, 361, 488] as const;
const RANK_TIER_PATTERN = /^(?:F|(?:[EDCBA]|S+)(?:-|0|\+))$/;

function toNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function clampDisplayScore(value: number): number {
  return Math.max(0, Math.min(99, Math.floor(value)));
}

function createInitialStatRank(): StatRankProgress {
  return {
    rank: "F",
    totalScore: 0,
    displayScore: 0,
    carry: 0
  };
}

function normalizeStatRankProgress(current: StatRankProgress): StatRankProgress {
  const totalScore = toNonNegativeInteger(current.totalScore);
  const ownBandDisplay = totalScore % 100;

  return {
    rank: isRankTierString(current.rank) ? current.rank : rankByBandIndex(bandIndexFromTotalScore(totalScore)),
    totalScore,
    displayScore: Number.isFinite(current.displayScore)
      ? clampDisplayScore(current.displayScore)
      : ownBandDisplay,
    carry: toNonNegativeInteger(current.carry)
  };
}

export function rankByBandIndex(bandIndex: number): RankTier {
  const safeBandIndex = toNonNegativeInteger(bandIndex);

  if (safeBandIndex === 0) {
    return "F";
  }

  const baseIndex = safeBandIndex - 1;
  const group = Math.floor(baseIndex / 3);
  const suffix = RANK_SUFFIXES[baseIndex % 3];

  if (group <= 4) {
    return `${BASE_RANKS[group]}${suffix}`;
  }

  return `${"S".repeat(group - 4)}${suffix}`;
}

export function isRankTierString(rank: string): rank is RankTier {
  return RANK_TIER_PATTERN.test(rank);
}

export function bandIndexFromTotalScore(score: number): number {
  return Math.floor(toNonNegativeInteger(score) / 100);
}

export function questsRequiredForTransition(fromBandIndex: number): number {
  const safeBandIndex = toNonNegativeInteger(fromBandIndex);

  if (safeBandIndex === 0) {
    return 1;
  }

  if (safeBandIndex === 1 || safeBandIndex === 2) {
    return 2;
  }

  if (safeBandIndex >= 3 && safeBandIndex <= 14) {
    return LONG_TERM_QUESTS_PER_TRANSITION[safeBandIndex - 3];
  }

  const scaled = Math.round(488 * (1.18 ** (safeBandIndex - 14)));
  return Math.max(1, scaled);
}

export function createInitialStatRanks(): StatRankState {
  return {
    initiation: createInitialStatRank(),
    focus: createInitialStatRank(),
    breakdown: createInitialStatRank(),
    recovery: createInitialStatRank(),
    consistency: createInitialStatRank()
  };
}

export function applyQuestScoreGain(
  current: StatRankProgress,
  weightNum: number,
  weightDen: number
): { next: StatRankProgress; gainedScore: number; promotedCount: number } {
  const normalized = normalizeStatRankProgress(current);
  const safeWeightNum = toNonNegativeInteger(weightNum);
  const safeWeightDen = Math.max(1, toNonNegativeInteger(weightDen));

  if (safeWeightNum <= 0) {
    return {
      next: normalized,
      gainedScore: 0,
      promotedCount: 0
    };
  }

  const fromBandIndex = bandIndexFromTotalScore(normalized.totalScore);
  const questsRequired = questsRequiredForTransition(fromBandIndex);
  const denominator = Math.max(1, questsRequired * safeWeightDen);

  const nextCarryRaw = normalized.carry + (100 * safeWeightNum);
  const gainedScore = Math.floor(nextCarryRaw / denominator);
  const nextCarry = nextCarryRaw % denominator;
  const nextTotalScore = normalized.totalScore + gainedScore;
  const toBandIndex = bandIndexFromTotalScore(nextTotalScore);

  return {
    next: {
      rank: rankByBandIndex(toBandIndex),
      totalScore: nextTotalScore,
      displayScore: nextTotalScore % 100,
      carry: nextCarry
    },
    gainedScore,
    promotedCount: Math.max(0, toBandIndex - fromBandIndex)
  };
}

export function computeCharacterRank(statRanks: StatRankState): CharacterRankState {
  const statScores = STAT_KEYS.map((statKey) => toNonNegativeInteger(statRanks[statKey].totalScore));
  const characterBandIndex = Math.min(...statScores.map((score) => bandIndexFromTotalScore(score)));
  const minScoreInBand = Math.min(
    ...statScores.map((score) => clampDisplayScore(score - (characterBandIndex * 100)))
  );

  return {
    rank: rankByBandIndex(characterBandIndex),
    bandIndex: characterBandIndex,
    minScoreInBand
  };
}

export function syncDisplayScores(
  statRanks: StatRankState,
  characterBandIndex: number
): StatRankState {
  const safeCharacterBandIndex = toNonNegativeInteger(characterBandIndex);

  const next: Partial<StatRankState> = {};

  STAT_KEYS.forEach((statKey) => {
    const normalized = normalizeStatRankProgress(statRanks[statKey]);

    next[statKey] = {
      rank: rankByBandIndex(bandIndexFromTotalScore(normalized.totalScore)),
      totalScore: normalized.totalScore,
      displayScore: clampDisplayScore(normalized.totalScore - (safeCharacterBandIndex * 100)),
      carry: normalized.carry
    };
  });

  return next as StatRankState;
}

export function toRadarPercent(rankState: StatRankProgress): number {
  return clampDisplayScore(rankState.displayScore);
}

export function buildStatRadarPercents(statRanks: StatRankState): Record<StatKey, number> {
  return {
    initiation: toRadarPercent(statRanks.initiation),
    focus: toRadarPercent(statRanks.focus),
    breakdown: toRadarPercent(statRanks.breakdown),
    recovery: toRadarPercent(statRanks.recovery),
    consistency: toRadarPercent(statRanks.consistency)
  };
}
