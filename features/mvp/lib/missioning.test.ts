import { describe, expect, it } from "vitest";
import {
  generateLocalMissioning,
  generateTemplateMissioning,
  mapMissioningResultToMissions,
  validateMissioningResult
} from "./missioning";

describe("generateLocalMissioning", () => {
  it("sleep/wake 입력은 sleep_wake_routine 계열 프리셋을 우선 추천한다", () => {
    const result = generateLocalMissioning("task-sleep", "내일 일어나서 준비해야 하는데");

    expect(result).not.toBeNull();
    if (!result) {
      return;
    }

    expect(result.missions.length).toBeGreaterThan(0);
    expect(result.missions[0]?.action).toMatch(/알람|침대|조명|창문|타이머/);
    expect(result.missions[0]?.estMinutes).toBe(2);
    expect(result.missions[0]?.difficulty).toBe(1);
    expect(result.missions[0]?.notes).toMatch(/커튼|충전|창문|자연광/);
    expect(result.missions[0]?.iconKey).toBeTruthy();
    expect(validateMissioningResult(result).ok).toBe(true);
  });

  it("범용 청소 입력은 시작 장벽이 낮은 프리셋을 우선한다", () => {
    const result = generateLocalMissioning("task-clean", "청소해야돼");

    expect(result).not.toBeNull();
    if (!result) {
      return;
    }

    expect(result.missions.length).toBeGreaterThan(0);
    expect(result.missions[0]?.estMinutes).toBe(2);
    expect(result.missions[0]?.difficulty).toBeLessThanOrEqual(2);
    expect(result.missions[0]?.action).not.toContain("청소기 플러그");
    expect(result.missions[0]?.iconKey).toBeTruthy();
    expect(validateMissioningResult(result).ok).toBe(true);
  });

  it("JSON/LOCAL 모두 매칭 실패하면 null을 반환한다", () => {
    const result = generateLocalMissioning("task-none", "zxqv pqow");
    expect(result).toBeNull();
  });

  it("template 경로에서도 iconKey를 생성한다", () => {
    const result = generateTemplateMissioning("task-template", "집중해서 보고서 마무리");
    const missingIconCount = result.missions.filter((mission) => !mission.iconKey).length;
    expect(missingIconCount).toBe(0);
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
