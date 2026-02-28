import { describe, expect, it } from "vitest";
import {
  createInitialCoreState,
  selectActiveTask,
  selectActiveTaskMissions,
  selectCompletionRate,
  selectHomeMission,
  selectHomeRemaining,
  selectHomeTask,
  selectRunningMission
} from "./core-state";
import type { Mission, Task } from "@/features/mvp/types/domain";

function createTask(id: string): Task {
  return {
    id,
    title: `task-${id}`,
    totalMinutes: 30,
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "todo"
  };
}

function createMission(params: {
  id: string;
  taskId: string;
  order: number;
  status?: Mission["status"];
  estMinutes?: number;
}): Mission {
  return {
    id: params.id,
    taskId: params.taskId,
    order: params.order,
    action: `mission-${params.id}`,
    estMinutes: params.estMinutes ?? 5,
    status: params.status ?? "todo"
  };
}

describe("core state selectors", () => {
  it("selects active task/missions/running mission", () => {
    const taskA = createTask("t1");
    const taskB = createTask("t2");
    const missionA1 = createMission({ id: "c1", taskId: "t1", order: 2 });
    const missionA2 = createMission({ id: "c2", taskId: "t1", order: 1 });
    const missionB = createMission({ id: "c3", taskId: "t2", order: 1, status: "running" });

    const state = {
      ...createInitialCoreState(),
      tasks: [taskA, taskB],
      missions: [missionA1, missionA2, missionB],
      activeTaskId: "t1" as string | null
    };

    expect(selectActiveTask(state)?.id).toBe("t1");
    expect(selectActiveTaskMissions(state).map((mission) => mission.id)).toEqual(["c2", "c1"]);
    expect(selectRunningMission(state)?.id).toBe("c3");
  });

  it("calculates completion rate", () => {
    const state = {
      ...createInitialCoreState(),
      missions: [
        createMission({ id: "c1", taskId: "t1", order: 1, status: "done" }),
        createMission({ id: "c2", taskId: "t1", order: 2, status: "done" }),
        createMission({ id: "c3", taskId: "t1", order: 3, status: "todo" }),
        createMission({ id: "c4", taskId: "t1", order: 4, status: "paused" })
      ]
    };

    expect(selectCompletionRate(state)).toBe(50);
  });

  it("returns current mission based home selectors when no running mission", () => {
    const taskA = createTask("t1");
    const missionA1 = createMission({ id: "c1", taskId: "t1", order: 1, status: "todo", estMinutes: 7 });

    const state = {
      ...createInitialCoreState(),
      tasks: [taskA],
      missions: [missionA1],
      activeTaskId: "t1" as string | null,
      remainingSecondsByMission: { c1: 111 }
    };

    expect(selectHomeMission(state, "c1")?.id).toBe("c1");
    expect(selectHomeTask(state, "c1")?.id).toBe("t1");
    expect(selectHomeRemaining(state, "c1")).toBe(111);
  });
});
