import { sumChunkEstMinutes } from "@/features/mvp/lib/chunking";
import type { Chunk } from "@/features/mvp/types/domain";

const ACTIONABLE_CHUNK_STATUSES: Chunk["status"][] = ["todo", "running", "paused"];

export function isBudgetCountedChunkStatus(status: Chunk["status"]): boolean {
  return status !== "archived";
}

export function getTaskBudgetedChunks(chunks: Chunk[], taskId: string, excludeChunkId?: string): Chunk[] {
  return chunks.filter((chunk) =>
    chunk.taskId === taskId
    && chunk.id !== excludeChunkId
    && isBudgetCountedChunkStatus(chunk.status)
  );
}

export function getTaskBudgetUsage(chunks: Chunk[], taskId: string, excludeChunkId?: string): number {
  return sumChunkEstMinutes(getTaskBudgetedChunks(chunks, taskId, excludeChunkId));
}

export function isActionableChunkStatus(status: Chunk["status"]): boolean {
  return ACTIONABLE_CHUNK_STATUSES.includes(status);
}

export function isTaskClosedStatus(status: Chunk["status"]): boolean {
  return status === "done" || status === "abandoned" || status === "archived";
}

export function orderChunks(list: Chunk[]): Chunk[] {
  return [...list].sort((a, b) => a.order - b.order);
}

export function withReorderedTaskChunks(chunks: Chunk[], taskId: string): Chunk[] {
  const targetChunks = orderChunks(chunks.filter((chunk) => chunk.taskId === taskId));
  const reorderedMap = new Map(
    targetChunks.map((chunk, index) => [
      chunk.id,
      {
        ...chunk,
        order: index + 1
      }
    ])
  );

  return chunks.map((chunk) => reorderedMap.get(chunk.id) ?? chunk);
}
