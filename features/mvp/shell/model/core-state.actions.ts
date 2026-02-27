import type { SetStateAction } from "react";
import type {
  AppEvent,
  Chunk,
  StatsState,
  Task,
  TimerSession,
  UserSettings
} from "@/features/mvp/types/domain";
import type { MvpCoreState, MvpCoreTab } from "./core-state.types";

export type SetTasksAction = {
  type: "set_tasks";
  updater: SetStateAction<Task[]>;
};

export type SetChunksAction = {
  type: "set_chunks";
  updater: SetStateAction<Chunk[]>;
};

export type SetTimerSessionsAction = {
  type: "set_timer_sessions";
  updater: SetStateAction<TimerSession[]>;
};

export type SetStatsAction = {
  type: "set_stats";
  updater: SetStateAction<StatsState>;
};

export type SetSettingsAction = {
  type: "set_settings";
  updater: SetStateAction<UserSettings>;
};

export type SetEventsAction = {
  type: "set_events";
  updater: SetStateAction<AppEvent[]>;
};

export type SetActiveTaskIdAction = {
  type: "set_active_task_id";
  updater: SetStateAction<string | null>;
};

export type SetActiveTabAction = {
  type: "set_active_tab";
  updater: SetStateAction<MvpCoreTab>;
};

export type SetRemainingSecondsByChunkAction = {
  type: "set_remaining_seconds_by_chunk";
  updater: SetStateAction<Record<string, number>>;
};

export type HydrateCoreStateAction = {
  type: "hydrate";
  state: MvpCoreState;
};

export type MvpCoreAction =
  | SetTasksAction
  | SetChunksAction
  | SetTimerSessionsAction
  | SetStatsAction
  | SetSettingsAction
  | SetEventsAction
  | SetActiveTaskIdAction
  | SetActiveTabAction
  | SetRemainingSecondsByChunkAction
  | HydrateCoreStateAction;

export function setTasks(updater: SetStateAction<Task[]>): SetTasksAction {
  return { type: "set_tasks", updater };
}

export function setChunks(updater: SetStateAction<Chunk[]>): SetChunksAction {
  return { type: "set_chunks", updater };
}

export function setTimerSessions(updater: SetStateAction<TimerSession[]>): SetTimerSessionsAction {
  return { type: "set_timer_sessions", updater };
}

export function setStats(updater: SetStateAction<StatsState>): SetStatsAction {
  return { type: "set_stats", updater };
}

export function setSettings(updater: SetStateAction<UserSettings>): SetSettingsAction {
  return { type: "set_settings", updater };
}

export function setEvents(updater: SetStateAction<AppEvent[]>): SetEventsAction {
  return { type: "set_events", updater };
}

export function setActiveTaskId(updater: SetStateAction<string | null>): SetActiveTaskIdAction {
  return { type: "set_active_task_id", updater };
}

export function setActiveTab(updater: SetStateAction<MvpCoreTab>): SetActiveTabAction {
  return { type: "set_active_tab", updater };
}

export function setRemainingSecondsByChunk(
  updater: SetStateAction<Record<string, number>>
): SetRemainingSecondsByChunkAction {
  return { type: "set_remaining_seconds_by_chunk", updater };
}

export function hydrateCoreState(state: MvpCoreState): HydrateCoreStateAction {
  return { type: "hydrate", state };
}
