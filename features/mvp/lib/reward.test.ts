import { describe, expect, it } from "vitest";
import type { AppEvent, StatRankState } from "@/features/mvp/types/domain";
import { computeCharacterRank, rankByBandIndex } from "./rank";
import {
  applyCharacterRankPromotion,
  applyMissionCompletionReward,
  applyRecoveryReward,
  createInitialStats,
  createNoRewardOutcome,
  evaluateQuestRewardGate,
  getDateKey
} from "./reward";

function createXpEvent(taskId: string, at: Date): AppEvent {
  return {
    id: `event-${taskId}-${at.getTime()}`,
    eventName: "xp_gained",
    timestamp: at.toISOString(),
    sessionId: "session-test",
    source: "local",
    taskId,
    missionId: null,
    meta: {
      axpGain: 10
    }
  };
}

describe("reward gate", () => {
  it("getDateKey는 로컬 04:00 기준으로 일일 키를 롤오버한다", () => {
    const beforeReset = new Date(2026, 1, 28, 3, 59, 59);
    const atReset = new Date(2026, 1, 28, 4, 0, 0);

    expect(getDateKey(beforeReset)).toBe("2026-02-27");
    expect(getDateKey(atReset)).toBe("2026-02-28");
  });

  it("오늘 보상 퀘스트가 5개면 6번째 taskId는 보상 차단된다", () => {
    const now = new Date(2026, 1, 28, 12, 0, 0);
    const events = Array.from({ length: 5 }, (_, index) =>
      createXpEvent(`task-${index + 1}`, new Date(2026, 1, 28, 9, index, 0))
    );

    const result = evaluateQuestRewardGate({
      events,
      taskId: "task-6",
      now
    });

    expect(result.granted).toBe(false);
    expect(result.reason).toBe("daily_limit_reached");
    expect(result.todayRewardedTaskCount).toBe(5);
  });

  it("같은 taskId는 같은 날 보상을 한 번만 허용한다", () => {
    const now = new Date(2026, 1, 28, 16, 0, 0);
    const events = [
      createXpEvent("task-repeat", new Date(2026, 1, 28, 11, 0, 0))
    ];

    const repeatedTaskResult = evaluateQuestRewardGate({
      events,
      taskId: "task-repeat",
      now
    });
    const newTaskResult = evaluateQuestRewardGate({
      events,
      taskId: "task-new",
      now
    });

    expect(repeatedTaskResult.granted).toBe(false);
    expect(repeatedTaskResult.reason).toBe("task_already_rewarded_today");
    expect(newTaskResult.granted).toBe(true);
    expect(newTaskResult.reason).toBe("granted");
  });
});

describe("reward outcome v3 (integer model)", () => {
  it("no-reward helper는 필요 시 todayCompleted만 증가시키고 gain은 0으로 유지한다", () => {
    const baseStats = {
      ...createInitialStats("2026-02-28"),
      todayCompleted: 2,
      todayAxpGain: 40,
      todaySgpGain: 5,
      axp: 33
    };

    const outcome = createNoRewardOutcome({
      stats: baseStats,
      incrementTodayCompleted: true
    });

    expect(outcome.axpGain).toBe(0);
    expect(outcome.accountLevelUps).toBe(0);
    expect(outcome.sgpGainByStat).toEqual({
      initiation: 0,
      focus: 0,
      breakdown: 0,
      recovery: 0,
      consistency: 0
    });
    expect(outcome.rankPromotions).toEqual([]);
    expect(outcome.characterRankChanged).toBe(false);
    expect(outcome.nextStats.todayCompleted).toBe(3);
    expect(outcome.nextStats.todayAxpGain).toBe(40);
    expect(outcome.nextStats.todaySgpGain).toBe(5);
    expect(outcome.nextStats.axp).toBe(33);
  });

  it("미션 1회 보상은 기존 대비 작은 정수 SGP를 지급하고 누적 상태를 유지한다", () => {
    const baseStats = {
      ...createInitialStats("2026-02-28"),
      axp: 70,
      accountLevel: 1,
      todayAxpGain: 10,
      todaySgpGain: 4,
      todayCompleted: 2
    };

    const outcome = applyMissionCompletionReward({
      stats: baseStats,
      estMinutes: 10,
      actualSeconds: 600
    });

    expect(outcome.axpGain).toBe(39);
    expect(outcome.accountLevelUps).toBe(1);
    expect(outcome.sgpGainByStat).toEqual({
      initiation: 13,
      focus: 15,
      breakdown: 13,
      recovery: 12,
      consistency: 13
    });
    expect(outcome.rankPromotions).toStrictEqual([]);
    expect(outcome.characterRankChanged).toBe(false);
    expect(outcome.previousCharacterRank).toEqual({
      rank: "F",
      bandIndex: 0,
      minScoreInBand: 0
    });

    expect(outcome.nextStats.axp).toBe(29);
    expect(outcome.nextStats.accountLevel).toBe(2);
    expect(outcome.nextStats.todayAxpGain).toBe(49);
    expect(outcome.nextStats.todaySgpGain).toBe(70);
    expect(outcome.nextStats.todayCompleted).toBe(3);
    expect(outcome.nextStats.characterRank).toEqual({
      rank: "F",
      bandIndex: 0,
      minScoreInBand: 12
    });

    expect(Number.isInteger(outcome.sgpGain)).toBe(true);
    expect(Number.isInteger(outcome.nextStats.todaySgpGain)).toBe(true);
  });

  it("동일 퀘스트 N개 미션 누적 + 마지막 퀘스트 보너스가 정수 carry 기반으로 합산된다", () => {
    let stats = createInitialStats("2026-02-28");
    const missionSgpGains: number[] = [];

    for (let mission = 0; mission < 4; mission += 1) {
      const outcome = applyMissionCompletionReward({
        stats,
        estMinutes: 8,
        actualSeconds: 480,
        questCompleted: mission === 3,
        questMissionCount: 4
      });
      missionSgpGains.push(outcome.sgpGain);
      stats = outcome.nextStats;
    }

    expect(missionSgpGains[0]).toBe(66);
    expect(missionSgpGains[3]).toBeGreaterThan(missionSgpGains[0]);
    expect(missionSgpGains.reduce((sum, value) => sum + value, 0)).toBe(550);

    expect(stats.statRanks.initiation.totalScore).toBe(110);
    expect(stats.statRanks.focus.totalScore).toBe(125);
    expect(stats.statRanks.breakdown.totalScore).toBe(105);
    expect(stats.statRanks.recovery.totalScore).toBe(100);
    expect(stats.statRanks.consistency.totalScore).toBe(110);
    expect(stats.characterRank.rank).toBe("F");
    expect(stats.characterRank.bandIndex).toBe(0);
  });

  it("cleanQuestCompletion=true면 회복력 보상량이 추가 상승한다", () => {
    const baseStats = createInitialStats("2026-02-28");

    const normalQuestOutcome = applyMissionCompletionReward({
      stats: baseStats,
      estMinutes: 8,
      actualSeconds: 480,
      questCompleted: true,
      questMissionCount: 4,
      cleanQuestCompletion: false
    });
    const cleanQuestOutcome = applyMissionCompletionReward({
      stats: baseStats,
      estMinutes: 8,
      actualSeconds: 480,
      questCompleted: true,
      questMissionCount: 4,
      cleanQuestCompletion: true
    });

    expect(normalQuestOutcome.sgpGainByStat.recovery).toBe(62);
    expect(cleanQuestOutcome.sgpGainByStat.recovery).toBe(87);
    expect(cleanQuestOutcome.sgpGainByStat.recovery).toBeGreaterThan(normalQuestOutcome.sgpGainByStat.recovery);
    expect(cleanQuestOutcome.sgpGainByStat.initiation).toBe(normalQuestOutcome.sgpGainByStat.initiation);
    expect(cleanQuestOutcome.nextStats.statRanks.recovery.totalScore).toBe(87);
  });

  it("랭크업 이후에도 totalScore는 초기화되지 않고 누적 유지된다", () => {
    let stats = createInitialStats("2026-02-28");

    for (let mission = 0; mission < 4; mission += 1) {
      stats = applyMissionCompletionReward({
        stats,
        estMinutes: 8,
        actualSeconds: 480,
        questCompleted: mission === 3,
        questMissionCount: 4
      }).nextStats;
    }

    expect(stats.statRanks.recovery.rank).toBe("E-");
    expect(stats.statRanks.recovery.totalScore).toBe(100);

    const postRankUpOutcome = applyMissionCompletionReward({
      stats,
      estMinutes: 8,
      actualSeconds: 480
    });

    expect(postRankUpOutcome.sgpGainByStat.recovery).toBe(6);
    expect(postRankUpOutcome.nextStats.statRanks.recovery.rank).toBe("E-");
    expect(postRankUpOutcome.nextStats.statRanks.recovery.totalScore).toBe(106);
  });

  it("수동 승급 버튼을 누르기 전에는 캐릭터 랭크가 유지되고 누르면 1단계만 승급된다", () => {
    let stats = createInitialStats("2026-02-28");

    for (let mission = 0; mission < 4; mission += 1) {
      stats = applyMissionCompletionReward({
        stats,
        estMinutes: 8,
        actualSeconds: 480,
        questCompleted: mission === 3,
        questMissionCount: 4
      }).nextStats;
    }

    expect(stats.characterRank.bandIndex).toBe(0);
    expect(stats.characterRank.rank).toBe("F");

    const promotion = applyCharacterRankPromotion({ stats });

    expect(promotion.promoted).toBe(true);
    expect(promotion.previousCharacterRank).toEqual({
      rank: "F",
      bandIndex: 0,
      minScoreInBand: 99
    });
    expect(promotion.nextCharacterRank).toEqual({
      rank: "E-",
      bandIndex: 1,
      minScoreInBand: 0
    });
    expect(promotion.pendingPromotionCount).toBe(0);
    expect(promotion.nextStats.characterRank.rank).toBe("E-");
    expect(promotion.nextStats.characterRank.bandIndex).toBe(1);
    expect(promotion.nextStats.statRanks.recovery.displayScore).toBe(0);
  });

  it("수동 승급 대기 상태에서는 AXP 스케일이 확정 캐릭터 랭크 기준으로 계산된다", () => {
    const highBandStats: StatRankState = {
      initiation: { rank: rankByBandIndex(25), totalScore: 2500, displayScore: 99, carry: 0 },
      focus: { rank: rankByBandIndex(25), totalScore: 2500, displayScore: 99, carry: 0 },
      breakdown: { rank: rankByBandIndex(25), totalScore: 2500, displayScore: 99, carry: 0 },
      recovery: { rank: rankByBandIndex(25), totalScore: 2500, displayScore: 99, carry: 0 },
      consistency: { rank: rankByBandIndex(25), totalScore: 2500, displayScore: 99, carry: 0 }
    };

    const pendingPromotionStats = {
      ...createInitialStats("2026-02-28"),
      statRanks: highBandStats,
      characterRank: {
        rank: "F",
        bandIndex: 0,
        minScoreInBand: 99
      }
    };

    const missionOutcome = applyMissionCompletionReward({
      stats: pendingPromotionStats,
      estMinutes: 10,
      actualSeconds: 600
    });
    const recoveryOutcome = applyRecoveryReward(pendingPromotionStats);

    expect(missionOutcome.axpGain).toBe(39);
    expect(recoveryOutcome.axpGain).toBe(18);
    expect(missionOutcome.nextStats.characterRank.bandIndex).toBe(0);
    expect(recoveryOutcome.nextStats.characterRank.bandIndex).toBe(0);
  });

  it("CB가 높아지면 mission/recovery AXP 모두 동일 감쇠 함수 F(CB) 하한 40%를 사용한다", () => {
    const highBandStats: StatRankState = {
      initiation: { rank: rankByBandIndex(25), totalScore: 2500, displayScore: 0, carry: 0 },
      focus: { rank: rankByBandIndex(25), totalScore: 2500, displayScore: 0, carry: 0 },
      breakdown: { rank: rankByBandIndex(25), totalScore: 2500, displayScore: 0, carry: 0 },
      recovery: { rank: rankByBandIndex(25), totalScore: 2500, displayScore: 0, carry: 0 },
      consistency: { rank: rankByBandIndex(25), totalScore: 2500, displayScore: 0, carry: 0 }
    };

    const baseStats = {
      ...createInitialStats("2026-02-28"),
      statRanks: highBandStats,
      characterRank: computeCharacterRank(highBandStats)
    };

    const missionOutcome = applyMissionCompletionReward({
      stats: baseStats,
      estMinutes: 10,
      actualSeconds: 600
    });
    const recoveryOutcome = applyRecoveryReward(baseStats);

    expect(baseStats.characterRank.bandIndex).toBe(25);
    expect(missionOutcome.axpGain).toBe(15);
    expect(recoveryOutcome.axpGain).toBe(7);
  });
});
