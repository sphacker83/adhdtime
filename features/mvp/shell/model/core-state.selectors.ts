import { isActionableChunkStatus, orderChunks } from "@/features/mvp/shared";
import type { Chunk, Task } from "@/features/mvp/types/domain";
import type { MvpCoreState } from "./core-state.types";

export function selectActiveTask(state: MvpCoreState): Task | null {
  return state.tasks.find((task) => task.id === state.activeTaskId) ?? null;
}

export function selectActiveTaskChunks(state: MvpCoreState): Chunk[] {
  if (!state.activeTaskId) {
    return [];
  }

  return orderChunks(state.chunks.filter((chunk) => chunk.taskId === state.activeTaskId));
}

export function selectRunningChunk(state: MvpCoreState): Chunk | null {
  return state.chunks.find((chunk) => chunk.status === "running") ?? null;
}

export function selectCompletionRate(state: MvpCoreState): number {
  if (state.chunks.length === 0) {
    return 0;
  }

  const doneCount = state.chunks.filter((chunk) => chunk.status === "done").length;
  return Math.round((doneCount / state.chunks.length) * 100);
}

export function selectHomeChunk(state: MvpCoreState, currentChunkId: string | null = null): Chunk | null {
  return selectRunningChunk(state) ?? selectCurrentChunk(state, currentChunkId);
}

export function selectHomeTask(state: MvpCoreState, currentChunkId: string | null = null): Task | null {
  const activeTask = selectActiveTask(state);
  const homeChunk = selectHomeChunk(state, currentChunkId);
  if (!homeChunk) {
    return activeTask;
  }

  return state.tasks.find((task) => task.id === homeChunk.taskId) ?? activeTask;
}

export function selectHomeRemaining(state: MvpCoreState, currentChunkId: string | null = null): number {
  const homeChunk = selectHomeChunk(state, currentChunkId);
  if (!homeChunk) {
    return 0;
  }

  return state.remainingSecondsByChunk[homeChunk.id] ?? homeChunk.estMinutes * 60;
}

function selectCurrentChunk(state: MvpCoreState, currentChunkId: string | null): Chunk | null {
  const activeTaskChunks = selectActiveTaskChunks(state);

  return (
    activeTaskChunks.find((chunk) => chunk.id === currentChunkId && isActionableChunkStatus(chunk.status))
    ?? activeTaskChunks.find((chunk) => isActionableChunkStatus(chunk.status))
    ?? null
  );
}
