import { describe, expect, it } from "vitest";
import type { StatRankProgress, StatRankState } from "@/features/mvp/types/domain";
import {
  applyQuestScoreGain,
  bandIndexFromTotalScore,
  buildStatRadarPercents,
  computeCharacterRank,
  createInitialStatRanks,
  isRankTierString,
  questsRequiredForTransition,
  rankByBandIndex,
  syncDisplayScores
} from "./rank";

describe("rank helpers (integer model)", () => {
  it("bandIndex -> rank 문자열 매핑을 확장 규칙대로 계산한다", () => {
    expect(rankByBandIndex(0)).toBe("F");
    expect(rankByBandIndex(1)).toBe("E-");
    expect(rankByBandIndex(2)).toBe("E0");
    expect(rankByBandIndex(3)).toBe("E+");
    expect(rankByBandIndex(4)).toBe("D-");
    expect(rankByBandIndex(15)).toBe("A+");
    expect(rankByBandIndex(16)).toBe("S-");
    expect(rankByBandIndex(17)).toBe("S0");
    expect(rankByBandIndex(18)).toBe("S+");
    expect(rankByBandIndex(19)).toBe("SS-");
    expect(rankByBandIndex(21)).toBe("SS+");
  });

  it("rank 문자열 검증은 F 또는 [EDCBA|S+] + suffix(-/0/+)만 허용한다", () => {
    expect(isRankTierString("F")).toBe(true);
    expect(isRankTierString("E-")).toBe(true);
    expect(isRankTierString("A+")).toBe(true);
    expect(isRankTierString("S0")).toBe(true);
    expect(isRankTierString("SS+")).toBe(true);

    expect(isRankTierString("E")).toBe(false);
    expect(isRankTierString("S")).toBe(false);
    expect(isRankTierString("SS")).toBe(false);
    expect(isRankTierString("F+")).toBe(false);
    expect(isRankTierString("Z+")).toBe(false);
  });

  it("전이 필요 퀘스트 수는 초기 1/2/2, 장기 리스트, 이후 1.18배 반올림을 따른다", () => {
    expect(questsRequiredForTransition(0)).toBe(1);
    expect(questsRequiredForTransition(1)).toBe(2);
    expect(questsRequiredForTransition(2)).toBe(2);
    expect(questsRequiredForTransition(3)).toBe(18);
    expect(questsRequiredForTransition(4)).toBe(24);
    expect(questsRequiredForTransition(14)).toBe(488);
    expect(questsRequiredForTransition(15)).toBe(576);
    expect(questsRequiredForTransition(16)).toBe(679);
  });

  it("createInitialStatRanks는 F/0/0/0 정수 구조로 초기화하고 참조를 공유하지 않는다", () => {
    const initial = createInitialStatRanks();

    expect(initial).toEqual({
      initiation: { rank: "F", totalScore: 0, displayScore: 0, carry: 0 },
      focus: { rank: "F", totalScore: 0, displayScore: 0, carry: 0 },
      breakdown: { rank: "F", totalScore: 0, displayScore: 0, carry: 0 },
      recovery: { rank: "F", totalScore: 0, displayScore: 0, carry: 0 },
      consistency: { rank: "F", totalScore: 0, displayScore: 0, carry: 0 }
    });

    initial.initiation.totalScore = 1;
    expect(initial.focus.totalScore).toBe(0);
  });

  it("weight 100/100 기준으로 F -> E+는 5퀘스트에 도달한다", () => {
    let current: StatRankProgress = {
      rank: "F",
      totalScore: 0,
      displayScore: 0,
      carry: 0
    };

    const sequence: Array<{ rank: string; totalScore: number }> = [];

    for (let quest = 0; quest < 5; quest += 1) {
      const result = applyQuestScoreGain(current, 100, 100);
      current = result.next;
      sequence.push({ rank: current.rank, totalScore: current.totalScore });
    }

    expect(sequence).toEqual([
      { rank: "E-", totalScore: 100 },
      { rank: "E-", totalScore: 150 },
      { rank: "E0", totalScore: 200 },
      { rank: "E0", totalScore: 250 },
      { rank: "E+", totalScore: 300 }
    ]);
  });

  it("E+ -> A+ 장기 페이싱은 지정 Q_b 리스트 합(1825퀘)과 일치한다", () => {
    let current: StatRankProgress = {
      rank: "E+",
      totalScore: 300,
      displayScore: 0,
      carry: 0
    };

    for (let quest = 0; quest < 1825; quest += 1) {
      current = applyQuestScoreGain(current, 100, 100).next;
    }

    expect(bandIndexFromTotalScore(current.totalScore)).toBe(15);
    expect(current.rank).toBe("A+");
    expect(current.totalScore).toBe(1500);
    expect(current.carry).toBe(0);
  });

  it("가중치와 carry 계산은 정수로 누적된다", () => {
    const result = applyQuestScoreGain(
      { rank: "E+", totalScore: 350, displayScore: 50, carry: 0 },
      125,
      100
    );

    expect(result.gainedScore).toBe(6);
    expect(result.next.totalScore).toBe(356);
    expect(result.next.carry).toBe(1700);
    expect(result.next.totalScore % 1).toBe(0);
    expect(result.next.carry % 1).toBe(0);
  });

  it("character rank는 5개 스탯의 min(totalScore) 밴드를 기준으로 결정된다", () => {
    const statRanks: StatRankState = {
      initiation: { rank: "D-", totalScore: 420, displayScore: 0, carry: 0 },
      focus: { rank: "E+", totalScore: 340, displayScore: 0, carry: 0 },
      breakdown: { rank: "D+", totalScore: 450, displayScore: 0, carry: 0 },
      recovery: { rank: "D-", totalScore: 401, displayScore: 0, carry: 0 },
      consistency: { rank: "D-", totalScore: 410, displayScore: 0, carry: 0 }
    };

    const characterRank = computeCharacterRank(statRanks);
    const synced = syncDisplayScores(statRanks, characterRank.bandIndex);

    expect(characterRank).toEqual({
      rank: "E+",
      bandIndex: 3,
      minScoreInBand: 40
    });
    expect(synced.focus.displayScore).toBe(40);
    expect(synced.initiation.displayScore).toBe(99);
    expect(synced.breakdown.displayScore).toBe(99);
    expect(buildStatRadarPercents(synced)).toEqual({
      initiation: 99,
      focus: 40,
      breakdown: 99,
      recovery: 99,
      consistency: 99
    });
  });
});
