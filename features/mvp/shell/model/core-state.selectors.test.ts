import { describe, expect, it } from "vitest";
import {
  createInitialCoreState,
  selectActiveTask,
  selectActiveTaskChunks,
  selectCompletionRate,
  selectHomeChunk,
  selectHomeRemaining,
  selectHomeTask,
  selectRunningChunk
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

function createChunk(params: {
  id: string;
  taskId: string;
  order: number;
  status?: Chunk["status"];
  estMinutes?: number;
}): Chunk {
  return {
    id: params.id,
    taskId: params.taskId,
    order: params.order,
    action: `chunk-${params.id}`,
    estMinutes: params.estMinutes ?? 5,
    status: params.status ?? "todo"
  };
}

describe("core state selectors", () => {
  it("selects active task/chunks/running chunk", () => {
    const taskA = createTask("t1");
    const taskB = createTask("t2");
    const chunkA1 = createChunk({ id: "c1", taskId: "t1", order: 2 });
    const chunkA2 = createChunk({ id: "c2", taskId: "t1", order: 1 });
    const chunkB = createChunk({ id: "c3", taskId: "t2", order: 1, status: "running" });

    const state = {
      ...createInitialCoreState(),
      tasks: [taskA, taskB],
      chunks: [chunkA1, chunkA2, chunkB],
      activeTaskId: "t1" as string | null
    };

    expect(selectActiveTask(state)?.id).toBe("t1");
    expect(selectActiveTaskChunks(state).map((chunk) => chunk.id)).toEqual(["c2", "c1"]);
    expect(selectRunningChunk(state)?.id).toBe("c3");
  });

  it("calculates completion rate", () => {
    const state = {
      ...createInitialCoreState(),
      chunks: [
        createChunk({ id: "c1", taskId: "t1", order: 1, status: "done" }),
        createChunk({ id: "c2", taskId: "t1", order: 2, status: "done" }),
        createChunk({ id: "c3", taskId: "t1", order: 3, status: "todo" }),
        createChunk({ id: "c4", taskId: "t1", order: 4, status: "paused" })
      ]
    };

    expect(selectCompletionRate(state)).toBe(50);
  });

  it("returns current chunk based home selectors when no running chunk", () => {
    const taskA = createTask("t1");
    const chunkA1 = createChunk({ id: "c1", taskId: "t1", order: 1, status: "todo", estMinutes: 7 });

    const state = {
      ...createInitialCoreState(),
      tasks: [taskA],
      chunks: [chunkA1],
      activeTaskId: "t1" as string | null,
      remainingSecondsByChunk: { c1: 111 }
    };

    expect(selectHomeChunk(state, "c1")?.id).toBe("c1");
    expect(selectHomeTask(state, "c1")?.id).toBe("t1");
    expect(selectHomeRemaining(state, "c1")).toBe(111);
  });
});
