import type { PersistedState, UserSettings } from "@/features/mvp/types/domain";

export const DEFAULT_CORE_SETTINGS: UserSettings = {
  hapticEnabled: true
};

export type MvpCoreTab = PersistedState["activeTab"];

export type MvpCoreState = Pick<
  PersistedState,
  | "tasks"
  | "missions"
  | "timerSessions"
  | "stats"
  | "settings"
  | "events"
  | "activeTaskId"
  | "activeTab"
  | "remainingSecondsByMission"
>;
