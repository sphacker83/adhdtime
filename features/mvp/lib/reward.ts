import type {
  AppEvent,
  CharacterRankState,
  RankTier,
  StatKey,
  StatRankState,
  StatsState
} from "@/features/mvp/types/domain";
import {
  applyQuestScoreGain,
  computeCharacterRank,
  createInitialStatRanks,
  rankByBandIndex,
  STAT_KEYS,
  syncDisplayScores
} from "@/features/mvp/lib/rank";

export const DAILY_REWARD_RESET_HOUR = 4;
export const DAILY_REWARD_TASK_LIMIT = 5;

const EMPTY_SGP_GAIN_BY_STAT: Record<StatKey, number> = {
  initiation: 0,
  focus: 0,
  breakdown: 0,
  recovery: 0,
  consistency: 0
};

const STAT_SCORE_WEIGHTS: Record<StatKey, { weightNum: number; weightDen: number }> = {
  initiation: { weightNum: 110, weightDen: 100 },
  focus: { weightNum: 125, weightDen: 100 },
  breakdown: { weightNum: 105, weightDen: 100 },
  recovery: { weightNum: 100, weightDen: 100 },
  consistency: { weightNum: 110, weightDen: 100 }
};

const MISSION_SGP_SCALE_DEN = 8;
const MISSION_SGP_UNITS = 1;
const QUEST_COMPLETION_BONUS_UNITS_PER_MISSION = 1;
const CLEAN_QUEST_RECOVERY_BONUS_DIVISOR = 2;

const RECOVERY_REWARD_SGP_SCALE_DEN = 8;
const RECOVERY_REWARD_BASE_UNITS = 1;
const RECOVERY_REWARD_RECOVERY_UNITS = 4;

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function createEmptySgpGainByStat(): Record<StatKey, number> {
  return {
    ...EMPTY_SGP_GAIN_BY_STAT
  };
}

function normalizeQuestGainByStat(questGainByStat: Record<StatKey, number>): Record<StatKey, number> {
  return {
    initiation: toNonNegativeInteger(questGainByStat.initiation),
    focus: toNonNegativeInteger(questGainByStat.focus),
    breakdown: toNonNegativeInteger(questGainByStat.breakdown),
    recovery: toNonNegativeInteger(questGainByStat.recovery),
    consistency: toNonNegativeInteger(questGainByStat.consistency)
  };
}

function sumSgpGainByStat(sgpGainByStat: Record<StatKey, number>): number {
  return STAT_KEYS.reduce((sum, statKey) => sum + sgpGainByStat[statKey], 0);
}

function resolveCharacterRankSnapshot(
  statRanks: StatRankState,
  confirmedBandIndex: number
): { nextStatRanks: StatRankState; characterRank: CharacterRankState } {
  const safeBandIndex = toNonNegativeInteger(confirmedBandIndex);
  const nextStatRanks = syncDisplayScores(statRanks, safeBandIndex);
  const minScoreInBand = Math.min(
    ...STAT_KEYS.map((statKey) => toNonNegativeInteger(nextStatRanks[statKey].displayScore))
  );

  return {
    nextStatRanks,
    characterRank: {
      rank: rankByBandIndex(safeBandIndex),
      bandIndex: safeBandIndex,
      minScoreInBand
    }
  };
}

function requiredAxpForAccountLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  const baseLevel = safeLevel - 1;

  return 80 + (22 * baseLevel) + (4 * baseLevel * baseLevel);
}

function resolveAccountProgress(stats: StatsState, axpGain: number): {
  axp: number;
  accountLevel: number;
  accountLevelUps: number;
} {
  let nextAxp = toNonNegativeInteger(stats.axp) + toNonNegativeInteger(axpGain);
  let nextAccountLevel = Math.max(1, toNonNegativeInteger(stats.accountLevel));
  let accountLevelUps = 0;

  while (nextAxp >= requiredAxpForAccountLevel(nextAccountLevel)) {
    nextAxp -= requiredAxpForAccountLevel(nextAccountLevel);
    nextAccountLevel += 1;
    accountLevelUps += 1;
  }

  return {
    axp: nextAxp,
    accountLevel: nextAccountLevel,
    accountLevelUps
  };
}

function computeAxpScalePercent(characterBandIndex: number): number {
  const safeBandIndex = toNonNegativeInteger(characterBandIndex);
  const penaltySteps = Math.max(0, safeBandIndex - 3);
  return Math.max(40, 100 - (3 * penaltySteps));
}

function computeMissionAxpGain(estMinutes: number, actualSeconds: number, characterBandIndex: number): number {
  const safeEstMinutes = Math.max(1, toNonNegativeInteger(estMinutes));
  const safeActualSeconds = Math.max(1, toNonNegativeInteger(actualSeconds));
  const targetSeconds = Math.max(60, safeEstMinutes * 60);
  const paceBonus = safeActualSeconds <= targetSeconds ? 5 : 2;
  const base = 24 + safeEstMinutes + paceBonus;
  const scalePercent = computeAxpScalePercent(characterBandIndex);

  return Math.floor((base * scalePercent) / 100);
}

function computeRecoveryAxpGain(characterBandIndex: number): number {
  const base = 18;
  const scalePercent = computeAxpScalePercent(characterBandIndex);
  return Math.floor((base * scalePercent) / 100);
}

function resolveMissionSgpGainByStat(params: {
  questCompleted?: boolean;
  questMissionCount?: number;
  cleanQuestCompletion?: boolean;
}): { questGainScaleDen: number; questGainByStat: Record<StatKey, number> } {
  const questCompleted = params.questCompleted ?? false;
  const questMissionCount = Math.max(1, toNonNegativeInteger(params.questMissionCount ?? 1));
  const cleanQuestCompletion = params.cleanQuestCompletion ?? false;

  const questCompletionBonusUnits = questCompleted
    ? questMissionCount * QUEST_COMPLETION_BONUS_UNITS_PER_MISSION
    : 0;
  const cleanQuestRecoveryBonusUnits = questCompleted && cleanQuestCompletion
    ? Math.max(1, Math.ceil(questMissionCount / CLEAN_QUEST_RECOVERY_BONUS_DIVISOR))
    : 0;
  const baseUnits = MISSION_SGP_UNITS + questCompletionBonusUnits;

  return {
    questGainScaleDen: MISSION_SGP_SCALE_DEN,
    questGainByStat: {
      initiation: baseUnits,
      focus: baseUnits,
      breakdown: baseUnits,
      recovery: baseUnits + cleanQuestRecoveryBonusUnits,
      consistency: baseUnits
    }
  };
}

function resolveStatRankProgress(
  statRanks: StatRankState,
  questGainByStat: Record<StatKey, number>,
  questGainScaleDen: number
): {
  nextStatRanks: StatRankState;
  sgpGainByStat: Record<StatKey, number>;
  rankPromotions: RankPromotion[];
} {
  const nextStatRanks: StatRankState = {
    initiation: { ...statRanks.initiation },
    focus: { ...statRanks.focus },
    breakdown: { ...statRanks.breakdown },
    recovery: { ...statRanks.recovery },
    consistency: { ...statRanks.consistency }
  };
  const sgpGainByStat = createEmptySgpGainByStat();
  const rankPromotions: RankPromotion[] = [];
  const safeQuestGainScaleDen = Math.max(1, toNonNegativeInteger(questGainScaleDen));

  STAT_KEYS.forEach((statKey) => {
    const current = statRanks[statKey];
    const questGainCount = toNonNegativeInteger(questGainByStat[statKey]);
    const { weightNum, weightDen } = STAT_SCORE_WEIGHTS[statKey];

    if (questGainCount <= 0) {
      sgpGainByStat[statKey] = 0;
      return;
    }

    const result = applyQuestScoreGain(
      current,
      weightNum * questGainCount,
      weightDen * safeQuestGainScaleDen
    );

    nextStatRanks[statKey] = result.next;
    sgpGainByStat[statKey] = result.gainedScore;

    if (result.promotedCount > 0) {
      rankPromotions.push({
        statKey,
        fromRank: current.rank,
        toRank: result.next.rank,
        promotedCount: result.promotedCount
      });
    }
  });

  return {
    nextStatRanks,
    sgpGainByStat,
    rankPromotions
  };
}

function buildRewardOutcome(params: {
  stats: StatsState;
  axpGain: number;
  questGainByStat: Record<StatKey, number>;
  questGainScaleDen?: number;
  todayCompletedIncrement?: number;
  today?: string;
}): RewardOutcome {
  const safeStats = rollDailyStats(params.stats, params.today);
  const safeAxpGain = toNonNegativeInteger(params.axpGain);
  const safeQuestGainByStat = normalizeQuestGainByStat(params.questGainByStat);
  const safeQuestGainScaleDen = Math.max(1, toNonNegativeInteger(params.questGainScaleDen ?? 1));
  const todayCompletedIncrement = toNonNegativeInteger(params.todayCompletedIncrement ?? 0);

  const { axp, accountLevel, accountLevelUps } = resolveAccountProgress(safeStats, safeAxpGain);
  const {
    characterRank: previousCharacterRank
  } = resolveCharacterRankSnapshot(safeStats.statRanks, safeStats.characterRank.bandIndex);
  const {
    nextStatRanks: rawNextStatRanks,
    sgpGainByStat,
    rankPromotions
  } = resolveStatRankProgress(safeStats.statRanks, safeQuestGainByStat, safeQuestGainScaleDen);
  const {
    nextStatRanks,
    characterRank: nextCharacterRank
  } = resolveCharacterRankSnapshot(rawNextStatRanks, previousCharacterRank.bandIndex);
  const promotedStats = rankPromotions.map((promotion) => promotion.statKey);
  const sgpGain = sumSgpGainByStat(sgpGainByStat);

  return {
    nextStats: {
      ...safeStats,
      axp,
      accountLevel,
      todayAxpGain: safeStats.todayAxpGain + safeAxpGain,
      todaySgpGain: safeStats.todaySgpGain + sgpGain,
      todayCompleted: safeStats.todayCompleted + todayCompletedIncrement,
      statRanks: nextStatRanks,
      characterRank: nextCharacterRank
    },
    axpGain: safeAxpGain,
    accountLevelUps,
    sgpGainByStat,
    rankPromotions,
    characterRankChanged: false,
    previousCharacterRank,
    sgpGain,
    promotedStats,
    xpGain: safeAxpGain,
    levelUps: accountLevelUps
  };
}

export function getDateKey(date = new Date()): string {
  const adjusted = new Date(date);
  if (adjusted.getHours() < DAILY_REWARD_RESET_HOUR) {
    adjusted.setDate(adjusted.getDate() - 1);
  }
  return toLocalDateKey(adjusted);
}

export function getTodayRewardedTaskIds(events: AppEvent[], now = new Date()): Set<string> {
  const todayDateKey = getDateKey(now);
  const rewardedTaskIds = new Set<string>();

  events.forEach((event) => {
    if (event.eventName !== "xp_gained" || !event.taskId) {
      return;
    }

    const eventDate = new Date(event.timestamp);
    if (Number.isNaN(eventDate.getTime())) {
      return;
    }

    if (getDateKey(eventDate) === todayDateKey) {
      rewardedTaskIds.add(event.taskId);
    }
  });

  return rewardedTaskIds;
}

export type RewardGateReason = "granted" | "daily_limit_reached" | "task_already_rewarded_today";

export interface RewardGateResult {
  granted: boolean;
  reason: RewardGateReason;
  todayRewardedTaskCount: number;
  todayRewardedTaskIds: Set<string>;
}

export function evaluateQuestRewardGate(params: {
  events: AppEvent[];
  taskId: string;
  now?: Date;
  maxRewardedTasks?: number;
}): RewardGateResult {
  const rewardedTaskIds = getTodayRewardedTaskIds(params.events, params.now);
  const maxRewardedTasks = params.maxRewardedTasks ?? DAILY_REWARD_TASK_LIMIT;

  if (rewardedTaskIds.has(params.taskId)) {
    return {
      granted: false,
      reason: "task_already_rewarded_today",
      todayRewardedTaskCount: rewardedTaskIds.size,
      todayRewardedTaskIds: rewardedTaskIds
    };
  }

  if (rewardedTaskIds.size >= maxRewardedTasks) {
    return {
      granted: false,
      reason: "daily_limit_reached",
      todayRewardedTaskCount: rewardedTaskIds.size,
      todayRewardedTaskIds: rewardedTaskIds
    };
  }

  return {
    granted: true,
    reason: "granted",
    todayRewardedTaskCount: rewardedTaskIds.size,
    todayRewardedTaskIds: rewardedTaskIds
  };
}

export function createInitialStats(today = getDateKey()): StatsState {
  const statRanks = createInitialStatRanks();
  const characterRank = computeCharacterRank(statRanks);

  return {
    axp: 0,
    accountLevel: 1,
    todayDateKey: today,
    todayAxpGain: 0,
    todaySgpGain: 0,
    todayCompleted: 0,
    statRanks: syncDisplayScores(statRanks, characterRank.bandIndex),
    characterRank
  };
}

export function rollDailyStats(stats: StatsState, today = getDateKey()): StatsState {
  if (stats.todayDateKey === today) {
    return stats;
  }

  return {
    ...stats,
    todayDateKey: today,
    todayAxpGain: 0,
    todaySgpGain: 0,
    todayCompleted: 0
  };
}

export interface RankPromotion {
  statKey: StatKey;
  fromRank: RankTier;
  toRank: RankTier;
  promotedCount: number;
}

export interface RewardOutcome {
  // Core reward contract
  nextStats: StatsState;
  axpGain: number;
  accountLevelUps: number;
  sgpGainByStat: Record<StatKey, number>;
  rankPromotions: RankPromotion[];
  characterRankChanged: boolean;
  previousCharacterRank: CharacterRankState;

  // Compatibility aliases used by existing UI
  sgpGain: number;
  promotedStats: StatKey[];
  xpGain: number;
  levelUps: number;
}

export interface CharacterRankPromotionOutcome {
  nextStats: StatsState;
  promoted: boolean;
  previousCharacterRank: CharacterRankState;
  nextCharacterRank: CharacterRankState;
  pendingPromotionCount: number;
}

export function createNoRewardOutcome(params: {
  stats: StatsState;
  today?: string;
  incrementTodayCompleted?: boolean;
}): RewardOutcome {
  const safeStats = rollDailyStats(params.stats, params.today);
  const todayCompletedIncrement = params.incrementTodayCompleted ? 1 : 0;

  return {
    nextStats: {
      ...safeStats,
      todayCompleted: safeStats.todayCompleted + todayCompletedIncrement
    },
    axpGain: 0,
    accountLevelUps: 0,
    sgpGainByStat: createEmptySgpGainByStat(),
    rankPromotions: [],
    characterRankChanged: false,
    previousCharacterRank: {
      ...safeStats.characterRank
    },
    sgpGain: 0,
    promotedStats: [],
    xpGain: 0,
    levelUps: 0
  };
}

export function applyCharacterRankPromotion(params: {
  stats: StatsState;
  today?: string;
}): CharacterRankPromotionOutcome {
  const safeStats = rollDailyStats(params.stats, params.today);
  const {
    nextStatRanks: currentStatRanks,
    characterRank: previousCharacterRank
  } = resolveCharacterRankSnapshot(safeStats.statRanks, safeStats.characterRank.bandIndex);
  const maxPossibleBandIndex = computeCharacterRank(currentStatRanks).bandIndex;
  const promoted = maxPossibleBandIndex > previousCharacterRank.bandIndex;
  const promotedBandIndex = promoted ? previousCharacterRank.bandIndex + 1 : previousCharacterRank.bandIndex;
  const {
    nextStatRanks,
    characterRank: nextCharacterRank
  } = resolveCharacterRankSnapshot(currentStatRanks, promotedBandIndex);

  return {
    nextStats: {
      ...safeStats,
      statRanks: nextStatRanks,
      characterRank: nextCharacterRank
    },
    promoted,
    previousCharacterRank,
    nextCharacterRank,
    pendingPromotionCount: Math.max(0, maxPossibleBandIndex - promotedBandIndex)
  };
}

export function applyMissionCompletionReward(params: {
  stats: StatsState;
  estMinutes: number;
  actualSeconds: number;
  questCompleted?: boolean;
  questMissionCount?: number;
  cleanQuestCompletion?: boolean;
  today?: string;
}): RewardOutcome {
  const currentCharacterBandIndex = toNonNegativeInteger(params.stats.characterRank.bandIndex);
  const axpGain = computeMissionAxpGain(
    params.estMinutes,
    params.actualSeconds,
    currentCharacterBandIndex
  );
  const missionSgpGain = resolveMissionSgpGainByStat({
    questCompleted: params.questCompleted,
    questMissionCount: params.questMissionCount,
    cleanQuestCompletion: params.cleanQuestCompletion
  });

  return buildRewardOutcome({
    stats: params.stats,
    axpGain,
    questGainByStat: missionSgpGain.questGainByStat,
    questGainScaleDen: missionSgpGain.questGainScaleDen,
    todayCompletedIncrement: 1,
    today: params.today
  });
}

export function applyRecoveryReward(stats: StatsState, today = getDateKey()): RewardOutcome {
  const currentCharacterBandIndex = toNonNegativeInteger(stats.characterRank.bandIndex);
  const axpGain = computeRecoveryAxpGain(currentCharacterBandIndex);

  return buildRewardOutcome({
    stats,
    axpGain,
    questGainByStat: {
      initiation: RECOVERY_REWARD_BASE_UNITS,
      focus: RECOVERY_REWARD_BASE_UNITS,
      breakdown: RECOVERY_REWARD_BASE_UNITS,
      recovery: RECOVERY_REWARD_RECOVERY_UNITS,
      consistency: RECOVERY_REWARD_BASE_UNITS
    },
    questGainScaleDen: RECOVERY_REWARD_SGP_SCALE_DEN,
    today,
    todayCompletedIncrement: 0
  });
}
