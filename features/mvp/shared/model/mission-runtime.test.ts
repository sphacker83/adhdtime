import { describe, expect, it } from "vitest";
import {
  getTaskBudgetUsage,
  getTaskBudgetedMissions,
  isActionableMissionStatus,
  isReorderableMissionStatus,
  isTaskClosedStatus,
  orderMissions,
  reorderTaskMissionsKeepingLocked,
  withReorderedTaskMissions
} from "@/features/mvp/shared";
import type { Mission } from "@/features/mvp/types/domain";

describe("mission runtime model", () => {
  const missions: Mission[] = [
    {
      id: "c1",
      taskId: "t1",
      order: 3,
      action: "a1",
      estMinutes: 5,
      status: "todo"
    },
    {
      id: "c2",
      taskId: "t1",
      order: 1,
      action: "a2",
      estMinutes: 8,
      status: "archived"
    },
    {
      id: "c3",
      taskId: "t1",
      order: 2,
      action: "a3",
      estMinutes: 6,
      status: "paused"
    },
    {
      id: "c4",
      taskId: "t2",
      order: 1,
      action: "a4",
      estMinutes: 7,
      status: "todo"
    }
  ];

  it("filters budgeted missions and computes usage", () => {
    const budgeted = getTaskBudgetedMissions(missions, "t1");
    expect(budgeted.map((mission) => mission.id)).toEqual(["c1", "c3"]);
    expect(getTaskBudgetUsage(missions, "t1")).toBe(11);
    expect(getTaskBudgetUsage(missions, "t1", "c3")).toBe(5);
  });

  it("classifies statuses", () => {
    expect(isActionableMissionStatus("todo")).toBe(true);
    expect(isActionableMissionStatus("running")).toBe(true);
    expect(isActionableMissionStatus("paused")).toBe(true);
    expect(isActionableMissionStatus("done")).toBe(false);
    expect(isReorderableMissionStatus("todo")).toBe(true);
    expect(isReorderableMissionStatus("running")).toBe(false);
    expect(isReorderableMissionStatus("done")).toBe(false);
    expect(isTaskClosedStatus("done")).toBe(true);
    expect(isTaskClosedStatus("abandoned")).toBe(true);
    expect(isTaskClosedStatus("archived")).toBe(true);
    expect(isTaskClosedStatus("todo")).toBe(false);
  });

  it("orders and reorders task missions deterministically", () => {
    const ordered = orderMissions(missions.filter((mission) => mission.taskId === "t1"));
    expect(ordered.map((mission) => mission.id)).toEqual(["c2", "c3", "c1"]);

    const reordered = withReorderedTaskMissions(missions, "t1");
    const t1Missions = reordered.filter((mission) => mission.taskId === "t1");
    expect(t1Missions.map((mission) => mission.order)).toEqual([3, 1, 2]);
    expect(t1Missions.find((mission) => mission.id === "c2")?.order).toBe(1);
    expect(t1Missions.find((mission) => mission.id === "c3")?.order).toBe(2);
    expect(t1Missions.find((mission) => mission.id === "c1")?.order).toBe(3);
  });

  it("reorders only todo missions while keeping running/done missions fixed", () => {
    const taskMissions: Mission[] = orderMissions([
      {
        id: "todo-1",
        taskId: "t1",
        order: 1,
        action: "todo 1",
        estMinutes: 5,
        status: "todo"
      },
      {
        id: "done-1",
        taskId: "t1",
        order: 2,
        action: "done",
        estMinutes: 5,
        status: "done"
      },
      {
        id: "todo-2",
        taskId: "t1",
        order: 3,
        action: "todo 2",
        estMinutes: 5,
        status: "todo"
      },
      {
        id: "running-1",
        taskId: "t1",
        order: 4,
        action: "running",
        estMinutes: 5,
        status: "running"
      },
      {
        id: "todo-3",
        taskId: "t1",
        order: 5,
        action: "todo 3",
        estMinutes: 5,
        status: "todo"
      }
    ]);

    const reordered = reorderTaskMissionsKeepingLocked(taskMissions, "todo-3", "todo-1");
    expect(reordered?.map((mission) => mission.id)).toEqual([
      "todo-3",
      "done-1",
      "todo-1",
      "running-1",
      "todo-2"
    ]);
    expect(reordered?.[1]?.id).toBe("done-1");
    expect(reordered?.[3]?.id).toBe("running-1");
  });

  it("returns null when trying to move non-reorderable missions", () => {
    const taskMissions: Mission[] = orderMissions([
      {
        id: "todo-1",
        taskId: "t1",
        order: 1,
        action: "todo 1",
        estMinutes: 5,
        status: "todo"
      },
      {
        id: "done-1",
        taskId: "t1",
        order: 2,
        action: "done",
        estMinutes: 5,
        status: "done"
      }
    ]);

    expect(reorderTaskMissionsKeepingLocked(taskMissions, "done-1", "todo-1")).toBeNull();
    expect(reorderTaskMissionsKeepingLocked(taskMissions, "todo-1", "done-1")).toBeNull();
  });
});
