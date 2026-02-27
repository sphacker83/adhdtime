import type { SetStateAction } from "react";
import { createInitialStats } from "@/features/mvp/lib/reward";
import type { MvpCoreAction } from "./core-state.actions";
import { DEFAULT_CORE_SETTINGS, type MvpCoreState } from "./core-state.types";

export function createInitialCoreState(): MvpCoreState {
  return {
    tasks: [],
    chunks: [],
    timerSessions: [],
    stats: createInitialStats(),
    settings: DEFAULT_CORE_SETTINGS,
    events: [],
    activeTaskId: null,
    activeTab: "home",
    remainingSecondsByChunk: {}
  };
}

export function mvpCoreStateReducer(state: MvpCoreState, action: MvpCoreAction): MvpCoreState {
  switch (action.type) {
    case "set_tasks":
      return { ...state, tasks: resolveStateAction(state.tasks, action.updater) };
    case "set_chunks":
      return { ...state, chunks: resolveStateAction(state.chunks, action.updater) };
    case "set_timer_sessions":
      return { ...state, timerSessions: resolveStateAction(state.timerSessions, action.updater) };
    case "set_stats":
      return { ...state, stats: resolveStateAction(state.stats, action.updater) };
    case "set_settings":
      return { ...state, settings: resolveStateAction(state.settings, action.updater) };
    case "set_events":
      return { ...state, events: resolveStateAction(state.events, action.updater) };
    case "set_active_task_id":
      return { ...state, activeTaskId: resolveStateAction(state.activeTaskId, action.updater) };
    case "set_active_tab":
      return { ...state, activeTab: resolveStateAction(state.activeTab, action.updater) };
    case "set_remaining_seconds_by_chunk":
      return {
        ...state,
        remainingSecondsByChunk: resolveStateAction(state.remainingSecondsByChunk, action.updater)
      };
    case "hydrate":
      return action.state;
    default:
      return state;
  }
}

function resolveStateAction<T>(current: T, updater: SetStateAction<T>): T {
  if (typeof updater === "function") {
    return (updater as (prevState: T) => T)(current);
  }
  return updater;
}
