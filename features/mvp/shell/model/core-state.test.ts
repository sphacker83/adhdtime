import { describe, expect, it } from "vitest";
import {
  createInitialCoreState,
  DEFAULT_CORE_SETTINGS,
  hydrateCoreState,
  mvpCoreStateReducer,
  setActiveTaskId,
  setChunks,
  setTasks
} from "./core-state";
import type { Chunk, Task } from "@/features/mvp/types/domain";

function createTask(id: string): Task {
  return {
    id,
    title: `task-${id}`,
    totalMinutes: 30,
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "todo"
  };
}

function createChunk(id: string, taskId: string): Chunk {
  return {
    id,
    taskId,
    order: 1,
    action: `chunk-${id}`,
    estMinutes: 5,
    status: "todo"
  };
}

describe("core state reducer/actions", () => {
  it("creates default core state", () => {
    const initial = createInitialCoreState();

    expect(initial.tasks).toEqual([]);
    expect(initial.chunks).toEqual([]);
    expect(initial.activeTab).toBe("home");
    expect(initial.activeTaskId).toBeNull();
    expect(initial.settings).toEqual(DEFAULT_CORE_SETTINGS);
  });

  it("applies set_tasks and set_chunks actions", () => {
    const initial = createInitialCoreState();
    const firstTask = createTask("t1");
    const secondTask = createTask("t2");
    const firstChunk = createChunk("c1", "t1");

    const withTask = mvpCoreStateReducer(initial, setTasks([firstTask]));
    const withTaskUpdater = mvpCoreStateReducer(
      withTask,
      setTasks((prev) => [...prev, secondTask])
    );
    const withChunk = mvpCoreStateReducer(withTaskUpdater, setChunks([firstChunk]));

    expect(withTask.tasks).toEqual([firstTask]);
    expect(withTaskUpdater.tasks).toEqual([firstTask, secondTask]);
    expect(withChunk.chunks).toEqual([firstChunk]);
  });

  it("applies set_active_task_id action", () => {
    const initial = createInitialCoreState();

    const next = mvpCoreStateReducer(initial, setActiveTaskId("task-1"));

    expect(next.activeTaskId).toBe("task-1");
  });

  it("hydrates full snapshot", () => {
    const initial = createInitialCoreState();
    const snapshot = {
      ...initial,
      tasks: [createTask("t1")],
      chunks: [createChunk("c1", "t1")],
      activeTaskId: "t1" as string | null,
      activeTab: "tasks" as const,
      remainingSecondsByChunk: { c1: 120 }
    };

    const next = mvpCoreStateReducer(initial, hydrateCoreState(snapshot));

    expect(next).toBe(snapshot);
  });
});
