import { describe, expect, it } from "vitest";
import {
  generateLocalMissioning,
  generateTemplateMissioning,
  mapMissioningResultToMissions,
  rankLocalPresetCandidates,
  validateMissioningResult
} from "./missioning";

describe("generateLocalMissioning (dataset-native)", () => {
  it("집 정리 입력은 dataset 후보를 반환하고 필수 필드를 채운다", () => {
    const ranked = rankLocalPresetCandidates("집 정리 빠르게 시작하고 싶어", 3);

    expect(ranked.length).toBeGreaterThan(0);
    ranked.forEach((candidate) => {
      expect(candidate.id).toBeTruthy();
      expect(candidate.title).toBeTruthy();
      expect(Number.isFinite(candidate.rerankConfidence)).toBe(true);
      expect(Number.isFinite(candidate.routeConfidence)).toBe(true);
      expect(candidate.estimatedTimeMin).toBeGreaterThanOrEqual(1);
    });

    const result = generateLocalMissioning("task-clean", "집 정리 빠르게 시작하고 싶어");
    expect(result).not.toBeNull();

    if (!result) {
      return;
    }

    expect(result.missions.length).toBeGreaterThan(0);
    expect(result.missions[0]?.action).toBeTruthy();
    expect(result.missions[0]?.estMinutes).toBeGreaterThanOrEqual(1);
    expect(result.missions[0]?.difficulty).toBeGreaterThanOrEqual(1);
    expect(result.missions[0]?.notes).toBeTruthy();
    expect(result.missions[0]?.iconKey).toBeTruthy();
    expect(validateMissioningResult(result).ok).toBe(true);
  });

  it("exact title 입력이면 deterministic top1이며 confidence를 1로 노출한다", () => {
    const query = "부엌 리셋 10분 짧게 집";
    const ranked = rankLocalPresetCandidates(query, 1);

    expect(ranked[0]).toBeDefined();
    expect(ranked[0]?.id).toBe("TPL_HOME_KITCHEN_RESET_MIN_10_HOME_01");
    expect(ranked[0]?.rerankConfidence).toBe(1);
    expect(ranked[0]?.routeConfidence).toBe(1);
  });

  it("forcePresetId가 있으면 입력과 무관하게 동일 템플릿을 강제 실행한다", () => {
    const forcePresetId = "TPL_HOME_KITCHEN_RESET_MIN_10_HOME_01";

    const first = generateLocalMissioning("task-force-1", "청소해야돼", { forcePresetId });
    const second = generateLocalMissioning("task-force-2", "회의록 정리", { forcePresetId });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    if (!first || !second) {
      return;
    }

    expect(first.missions.map((mission) => mission.action)).toEqual(
      second.missions.map((mission) => mission.action)
    );
  });

  it("존재하지 않는 forcePresetId는 null을 반환한다", () => {
    const result = generateLocalMissioning("task-force-none", "아무거나", { forcePresetId: "UNKNOWN_TEMPLATE_ID" });
    expect(result).toBeNull();
  });

  it("preferTopRank=true면 top1 랭크 템플릿을 우선 사용한다", () => {
    const query = "집 정리 빠르게 시작하고 싶어";
    const topRankId = rankLocalPresetCandidates(query, 1)[0]?.id;

    expect(topRankId).toBeTruthy();
    if (!topRankId) {
      return;
    }

    const preferred = generateLocalMissioning("task-prefer-top", query, { preferTopRank: true });
    const forcedTop = generateLocalMissioning("task-force-top", query, { forcePresetId: topRankId });

    expect(preferred).not.toBeNull();
    expect(forcedTop).not.toBeNull();

    if (!preferred || !forcedTop) {
      return;
    }

    expect(preferred.missions.map((mission) => mission.action)).toEqual(
      forcedTop.missions.map((mission) => mission.action)
    );
  });

  it("무의미 입력은 랭크/생성 모두 null 또는 빈 목록을 반환한다", () => {
    const ranked = rankLocalPresetCandidates("zxqv pqow", 3);
    const result = generateLocalMissioning("task-none", "zxqv pqow");

    expect(ranked).toHaveLength(0);
    expect(result).toBeNull();
  });

  it("회피 발화 입력도 no-match 없이 생성 가능하다", () => {
    const input = "회사 가기 싫어";

    const ranked = rankLocalPresetCandidates(input, 1);
    expect(ranked[0]).toBeDefined();
    expect(ranked[0]?.difficulty).toBeLessThanOrEqual(2);

    const result = generateLocalMissioning("task-avoidance", input);
    expect(result).not.toBeNull();

    if (!result) {
      return;
    }

    expect(validateMissioningResult(result).ok).toBe(true);
    expect(result.missions.length).toBeGreaterThan(0);
  });

  it("template 경로에서도 iconKey를 생성한다", () => {
    const result = generateTemplateMissioning("task-template", "집중해서 보고서 마무리");
    const missingIconCount = result.missions.filter((mission) => !mission.iconKey).length;
    expect(missingIconCount).toBe(0);
  });

  it("꺼내기/모으기/비우기 문장을 포함한 미션은 검증을 통과한다", () => {
    const validation = validateMissioningResult({
      taskId: "task-action-verbs",
      title: "청소 루프",
      context: "청소 루프",
      missions: [
        {
          missionId: "m-1",
          order: 1,
          action: "서랍에서 청소도구 꺼내기",
          estMinutes: 3,
          difficulty: 1,
          notes: "준비 단계",
          iconKey: "organize"
        },
        {
          missionId: "m-2",
          order: 2,
          action: "책상 위 문서 모으기",
          estMinutes: 4,
          difficulty: 1,
          notes: "집중 구역 정리",
          iconKey: "organize"
        },
        {
          missionId: "m-3",
          order: 3,
          action: "휴지통 비우기",
          estMinutes: 3,
          difficulty: 1,
          notes: "마무리 단계",
          iconKey: "organize"
        }
      ],
      safety: {
        requiresCaution: false,
        notes: ""
      }
    });

    expect(validation.ok).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("MissioningResult -> Mission 매핑에서 iconKey를 보존한다", () => {
    const result = generateTemplateMissioning("task-map", "자료 정리");
    result.missions[0] = {
      ...result.missions[0],
      iconKey: "custom-icon"
    };

    const mapped = mapMissioningResultToMissions(result, { taskId: "task-map", status: "todo" });
    expect(mapped[0]?.iconKey).toBe("custom-icon");
  });
});
