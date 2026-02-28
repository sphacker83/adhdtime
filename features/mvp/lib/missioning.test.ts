import { describe, expect, it } from "vitest";
import {
  generateLocalMissioning,
  generateTemplateMissioning,
  mapMissioningResultToMissions,
  rankLocalPresetCandidates,
  validateMissioningResult
} from "./missioning";

describe("generateLocalMissioning", () => {
  it("sleep/wake 입력은 sleep_wake_routine 계열 프리셋을 우선 추천한다", () => {
    const query = "취침 전에 알람 맞추고 수면 루틴 정리해야 해";
    const ranked = rankLocalPresetCandidates(query, 1);
    expect(ranked[0]?.intent).toBe("sleep_wake_routine");

    const result = generateLocalMissioning("task-sleep", query);

    expect(result).not.toBeNull();
    if (!result) {
      return;
    }

    expect(result.missions.length).toBeGreaterThan(0);
    expect(result.missions[0]?.action).toBeTruthy();
    expect(result.missions[0]?.estMinutes).toBe(2);
    expect(result.missions[0]?.difficulty).toBe(1);
    expect(result.missions[0]?.notes).toBeTruthy();
    expect(result.missions[0]?.iconKey).toBeTruthy();
    expect(validateMissioningResult(result).ok).toBe(true);
  });

  it("범용 청소 입력은 시작 장벽이 낮은 프리셋을 우선한다", () => {
    const query = "청소해야돼";
    const ranked = rankLocalPresetCandidates(query, 1);
    expect(ranked[0]?.intent).toBe("home_cleaning");

    const result = generateLocalMissioning("task-clean", query);

    expect(result).not.toBeNull();
    if (!result) {
      return;
    }

    expect(result.missions.length).toBeGreaterThan(0);
    expect(result.missions[0]?.estMinutes).toBeLessThanOrEqual(3);
    expect(result.missions[0]?.difficulty).toBeLessThanOrEqual(3);
    expect(result.missions[0]?.action).toMatch(/정리|구역|물건|타이머/);
    expect(result.missions[0]?.iconKey).toBeTruthy();
  });

  it("forcePresetId가 있으면 입력과 무관하게 해당 preset을 강제 실행한다", () => {
    const forcePresetId = "STU-DAY-HYGIENE-001";

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
    expect(first.missions[0]?.action).toContain("위생");
  });

  it("preferTopRank=true면 top1 랭크 preset을 우선 사용한다", () => {
    const query = "청소해야돼";
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

  it("JSON/LOCAL 모두 매칭 실패하면 null을 반환한다", () => {
    const result = generateLocalMissioning("task-none", "zxqv pqow");
    expect(result).toBeNull();
  });

  it("exact title 입력이면 해당 preset id가 deterministic하게 top1이다", () => {
    const query = "출근 직후 오늘의 탑3 설정";
    const ranked = rankLocalPresetCandidates(query, 3);

    expect(ranked[0]).toBeDefined();
    expect(ranked[0]?.id).toBe("WRK-DAY-WORK-002");
  });

  it("exact title top1은 rerank/route confidence를 1로 노출한다", () => {
    const query = "출근 직후 오늘의 탑3 설정";
    const top = rankLocalPresetCandidates(query, 1)[0];

    expect(top).toBeDefined();
    expect(top?.id).toBe("WRK-DAY-WORK-002");
    expect(top?.rerankConfidence).toBe(1);
    expect(top?.routeConfidence).toBe(1);
  });

  it("일상 입력은 의도에 맞는 상위 intent로 랭크된다", () => {
    const cases: Array<{ query: string; expectedIntent: string }> = [
      { query: "청소해야 돼", expectedIntent: "home_cleaning" },
      { query: "빨래 미루고 있어", expectedIntent: "laundry_clothing" },
      { query: "양치하고 자야지", expectedIntent: "grooming_hygiene" },
      { query: "내일 아침 알람 맞춰야 해", expectedIntent: "sleep_wake_routine" },
      { query: "장보러 가야 해", expectedIntent: "outing_mobility" },
      { query: "공과금 납부해야 해", expectedIntent: "admin_finance" },
      { query: "다운로드 폴더 정리", expectedIntent: "digital_organizing" },
      { query: "답장 너무 밀렸어", expectedIntent: "relationship_communication" },
      { query: "공부 시작이 안 돼", expectedIntent: "study_growth" },
      { query: "업무 다시 시작해야 해", expectedIntent: "work_start_recovery" },
      { query: "스트레칭 좀 해야겠다", expectedIntent: "health_exercise" }
    ];

    cases.forEach(({ query, expectedIntent }) => {
      const ranked = rankLocalPresetCandidates(query, 1);
      expect(ranked[0]?.intent).toBe(expectedIntent);
    });
  });

  it("회피 발화 2종은 no-match 없이 유효 quest로 매칭된다", () => {
    const avoidanceInputs = ["회사 가기 싫어", "사무실 가기 싫어"];

    avoidanceInputs.forEach((input, index) => {
      const taskId = `task-avoid-${index}`;
      const result = generateLocalMissioning(taskId, input);
      expect(result).not.toBeNull();
      if (!result) {
        return;
      }

      expect(validateMissioningResult(result).ok).toBe(true);
      expect(result.missions.length).toBeGreaterThan(0);

      const ranked = rankLocalPresetCandidates(input, 1);
      expect(ranked[0]).toBeDefined();
      expect(ranked[0]?.intent).toBe("work_start_recovery");
      expect(ranked[0]?.difficulty).toBeLessThanOrEqual(1);
      expect(ranked[0]?.estimatedTimeMin).toBeLessThanOrEqual(10);
    });
  });

  it("persona/type 라우팅이 non_routine 트랙으로 분기된다", () => {
    const ranked = rankLocalPresetCandidates("주말 여행 준비물 체크리스트 정리", 1);

    expect(ranked[0]).toBeDefined();
    expect(ranked[0]?.persona).toBe("travel");
    expect(ranked[0]?.type).toBe("non_routine");
    expect(ranked[0]?.domain).toBe("non_routine");
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
