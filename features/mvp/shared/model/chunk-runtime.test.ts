import { describe, expect, it } from "vitest";
import { getTaskBudgetUsage, getTaskBudgetedChunks, isActionableChunkStatus, isTaskClosedStatus, orderChunks, withReorderedTaskChunks } from "@/features/mvp/shared";
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
});
