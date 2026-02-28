import type { AppEvent, EventName, EventSource } from "@/features/mvp/types/domain";

const MAX_EVENTS = 400;

export function createEvent(params: {
  eventName: EventName;
  sessionId: string;
  source: EventSource;
  taskId?: string;
  missionId?: string;
  meta?: AppEvent["meta"];
}): AppEvent {
  return {
    id: crypto.randomUUID(),
    eventName: params.eventName,
    sessionId: params.sessionId,
    source: params.source,
    timestamp: new Date().toISOString(),
    taskId: params.taskId ?? null,
    missionId: params.missionId ?? null,
    meta: params.meta
  };
}

export function appendEvent(queue: AppEvent[], event: AppEvent): AppEvent[] {
  const nextQueue = [event, ...queue];
  if (nextQueue.length <= MAX_EVENTS) {
    return nextQueue;
  }
  return nextQueue.slice(0, MAX_EVENTS);
}
