import type { TimerPhase } from "@/lib/timer";

export type TimerAnalyticsEvent =
  | "timer_started"
  | "timer_paused"
  | "timer_resumed"
  | "timer_completed"
  | "timer_stopped"
  | "timer_next_phase";

type AnalyticsMetaValue = string | number | boolean | null;

export interface TimerEventPayload {
  event: TimerAnalyticsEvent;
  taskId: string | null;
  phase: TimerPhase;
  timestamp: string;
  meta?: Record<string, AnalyticsMetaValue>;
}

const timerEventQueue: TimerEventPayload[] = [];
const MAX_QUEUE_SIZE = 300;

export function trackTimerEvent(params: Omit<TimerEventPayload, "timestamp">): TimerEventPayload {
  const payload: TimerEventPayload = {
    ...params,
    timestamp: new Date().toISOString()
  };

  timerEventQueue.unshift(payload);
  if (timerEventQueue.length > MAX_QUEUE_SIZE) {
    timerEventQueue.length = MAX_QUEUE_SIZE;
  }

  console.info("[timer-event]", payload);
  return payload;
}

export function getTimerEventQueue(): TimerEventPayload[] {
  return [...timerEventQueue];
}
