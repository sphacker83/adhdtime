import type { FiveStats, StatsState } from "@/features/mvp/types/domain";

const STAT_MIN = 0;
const STAT_MAX = 100;

function clampStat(value: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(value)));
}

export function getDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function createInitialStats(today = getDateKey()): StatsState {
  return {
    initiation: 12,
    focus: 12,
    breakdown: 12,
    recovery: 12,
    consistency: 12,
    xp: 0,
    level: 1,
    todayDateKey: today,
    todayXpGain: 0,
    todayCompleted: 0,
    todayStatGain: {
      initiation: 0,
      focus: 0,
      breakdown: 0,
      recovery: 0,
      consistency: 0
    }
  };
}

export function rollDailyStats(stats: StatsState, today = getDateKey()): StatsState {
  if (stats.todayDateKey === today) {
    return stats;
  }

  return {
    ...stats,
    todayDateKey: today,
    todayXpGain: 0,
    todayCompleted: 0,
    todayStatGain: {
      initiation: 0,
      focus: 0,
      breakdown: 0,
      recovery: 0,
      consistency: 0
    }
  };
}

function requiredXpForLevel(level: number): number {
  return 100 + (level - 1) * 45;
}

function addFiveStats(current: FiveStats, delta: FiveStats): FiveStats {
  return {
    initiation: clampStat(current.initiation + delta.initiation),
    focus: clampStat(current.focus + delta.focus),
    breakdown: clampStat(current.breakdown + delta.breakdown),
    recovery: clampStat(current.recovery + delta.recovery),
    consistency: clampStat(current.consistency + delta.consistency)
  };
}

export interface RewardOutcome {
  nextStats: StatsState;
  xpGain: number;
  levelUps: number;
  statGain: FiveStats;
}

export function applyChunkCompletionReward(params: {
  stats: StatsState;
  estMinutes: number;
  actualSeconds: number;
}): RewardOutcome {
  const safeStats = rollDailyStats(params.stats);
  const targetSeconds = Math.max(60, Math.floor(params.estMinutes * 60));
  const actualSeconds = Math.max(1, Math.floor(params.actualSeconds));
  const paceBonus = actualSeconds <= targetSeconds ? 5 : 2;
  const baseXp = 10 + Math.max(2, params.estMinutes * 2);
  const xpGain = baseXp + paceBonus;

  const statGain: FiveStats = {
    initiation: 1,
    focus: actualSeconds <= targetSeconds * 1.2 ? 2 : 1,
    breakdown: params.estMinutes <= 10 ? 1 : 0,
    recovery: 0,
    consistency: 1
  };

  let nextXp = safeStats.xp + xpGain;
  let nextLevel = safeStats.level;
  let levelUps = 0;

  while (nextXp >= requiredXpForLevel(nextLevel)) {
    nextXp -= requiredXpForLevel(nextLevel);
    nextLevel += 1;
    levelUps += 1;
  }

  const gainedStats = addFiveStats(safeStats, statGain);

  return {
    xpGain,
    levelUps,
    statGain,
    nextStats: {
      ...safeStats,
      ...gainedStats,
      xp: nextXp,
      level: nextLevel,
      todayXpGain: safeStats.todayXpGain + xpGain,
      todayCompleted: safeStats.todayCompleted + 1,
      todayStatGain: {
        initiation: safeStats.todayStatGain.initiation + statGain.initiation,
        focus: safeStats.todayStatGain.focus + statGain.focus,
        breakdown: safeStats.todayStatGain.breakdown + statGain.breakdown,
        recovery: safeStats.todayStatGain.recovery + statGain.recovery,
        consistency: safeStats.todayStatGain.consistency + statGain.consistency
      }
    }
  };
}

export function applyRecoveryReward(stats: StatsState): RewardOutcome {
  const safeStats = rollDailyStats(stats);
  const xpGain = 8;
  const statGain: FiveStats = {
    initiation: 0,
    focus: 0,
    breakdown: 0,
    recovery: 2,
    consistency: 1
  };

  let nextXp = safeStats.xp + xpGain;
  let nextLevel = safeStats.level;
  let levelUps = 0;

  while (nextXp >= requiredXpForLevel(nextLevel)) {
    nextXp -= requiredXpForLevel(nextLevel);
    nextLevel += 1;
    levelUps += 1;
  }

  const gainedStats = addFiveStats(safeStats, statGain);

  return {
    xpGain,
    levelUps,
    statGain,
    nextStats: {
      ...safeStats,
      ...gainedStats,
      xp: nextXp,
      level: nextLevel,
      todayXpGain: safeStats.todayXpGain + xpGain,
      todayStatGain: {
        initiation: safeStats.todayStatGain.initiation,
        focus: safeStats.todayStatGain.focus,
        breakdown: safeStats.todayStatGain.breakdown,
        recovery: safeStats.todayStatGain.recovery + statGain.recovery,
        consistency: safeStats.todayStatGain.consistency + statGain.consistency
      }
    }
  };
}
