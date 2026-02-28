import { describe, expect, it } from "vitest";
import type { AppEvent } from "@/features/mvp/types/domain";
import {
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
      xpGain: 10
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

  it("no-reward helper는 미션 완료 경로에서 todayCompleted를 증가시킨다", () => {
    const baseStats = {
      ...createInitialStats("2026-02-28"),
      todayCompleted: 2,
      todayXpGain: 40,
      xp: 33
    };

    const outcome = createNoRewardOutcome({
      stats: baseStats,
      incrementTodayCompleted: true
    });

    expect(outcome.xpGain).toBe(0);
    expect(outcome.levelUps).toBe(0);
    expect(outcome.nextStats.todayCompleted).toBe(3);
    expect(outcome.nextStats.todayXpGain).toBe(40);
    expect(outcome.nextStats.xp).toBe(33);
  });
});
