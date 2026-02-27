import type { AppEvent } from "@/features/mvp/types/domain";

export function normalizeLoadedEvents(rawEvents: AppEvent[] | undefined, fallbackSessionId: string): AppEvent[] {
  return (rawEvents ?? []).map((event) => ({
    ...event,
    sessionId: event.sessionId || fallbackSessionId,
    source: event.source || "local",
    taskId: event.taskId ?? null,
    chunkId: event.chunkId ?? null
  }));
}
