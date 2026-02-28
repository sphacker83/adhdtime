import { describe, expect, it } from "vitest";
import {
  getTaskBudgetUsage,
  getTaskBudgetedChunks,
  isActionableChunkStatus,
  isReorderableChunkStatus,
  isTaskClosedStatus,
  orderChunks,
  reorderTaskChunksKeepingLocked,
  withReorderedTaskChunks
} from "@/features/mvp/shared";
import type { Chunk } from "@/features/mvp/types/domain";

describe("chunk runtime model", () => {
  const chunks: Chunk[] = [
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

  it("filters budgeted chunks and computes usage", () => {
    const budgeted = getTaskBudgetedChunks(chunks, "t1");
    expect(budgeted.map((chunk) => chunk.id)).toEqual(["c1", "c3"]);
    expect(getTaskBudgetUsage(chunks, "t1")).toBe(11);
    expect(getTaskBudgetUsage(chunks, "t1", "c3")).toBe(5);
  });

  it("classifies statuses", () => {
    expect(isActionableChunkStatus("todo")).toBe(true);
    expect(isActionableChunkStatus("running")).toBe(true);
    expect(isActionableChunkStatus("paused")).toBe(true);
    expect(isActionableChunkStatus("done")).toBe(false);
    expect(isReorderableChunkStatus("todo")).toBe(true);
    expect(isReorderableChunkStatus("running")).toBe(false);
    expect(isReorderableChunkStatus("done")).toBe(false);
    expect(isTaskClosedStatus("done")).toBe(true);
    expect(isTaskClosedStatus("abandoned")).toBe(true);
    expect(isTaskClosedStatus("archived")).toBe(true);
    expect(isTaskClosedStatus("todo")).toBe(false);
  });

  it("orders and reorders task chunks deterministically", () => {
    const ordered = orderChunks(chunks.filter((chunk) => chunk.taskId === "t1"));
    expect(ordered.map((chunk) => chunk.id)).toEqual(["c2", "c3", "c1"]);

    const reordered = withReorderedTaskChunks(chunks, "t1");
    const t1Chunks = reordered.filter((chunk) => chunk.taskId === "t1");
    expect(t1Chunks.map((chunk) => chunk.order)).toEqual([3, 1, 2]);
    expect(t1Chunks.find((chunk) => chunk.id === "c2")?.order).toBe(1);
    expect(t1Chunks.find((chunk) => chunk.id === "c3")?.order).toBe(2);
    expect(t1Chunks.find((chunk) => chunk.id === "c1")?.order).toBe(3);
  });

  it("reorders only todo chunks while keeping running/done chunks fixed", () => {
    const taskChunks: Chunk[] = orderChunks([
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

    const reordered = reorderTaskChunksKeepingLocked(taskChunks, "todo-3", "todo-1");
    expect(reordered?.map((chunk) => chunk.id)).toEqual([
      "todo-3",
      "done-1",
      "todo-1",
      "running-1",
      "todo-2"
    ]);
    expect(reordered?.[1]?.id).toBe("done-1");
    expect(reordered?.[3]?.id).toBe("running-1");
  });

  it("returns null when trying to move non-reorderable chunks", () => {
    const taskChunks: Chunk[] = orderChunks([
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

    expect(reorderTaskChunksKeepingLocked(taskChunks, "done-1", "todo-1")).toBeNull();
    expect(reorderTaskChunksKeepingLocked(taskChunks, "todo-1", "done-1")).toBeNull();
  });
});
