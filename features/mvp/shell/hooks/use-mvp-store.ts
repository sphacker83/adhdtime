"use client";

import { useCallback, useEffect, useReducer, useState, type SetStateAction } from "react";
import { clampTaskTotalMinutes } from "@/features/mvp/lib/missioning";
import { rollDailyStats } from "@/features/mvp/lib/reward";
import { loadPersistedState, savePersistedState } from "@/features/mvp/lib/storage";
import {
  hydrateCoreState,
  createInitialCoreState,
  mvpCoreStateReducer,
  setActiveTab as setActiveTabAction,
  setActiveTaskId as setActiveTaskIdAction,
  setMissions as setMissionsAction,
  setEvents as setEventsAction,
  setRemainingSecondsByMission as setRemainingSecondsByMissionAction,
  setSettings as setSettingsAction,
  setStats as setStatsAction,
  setTasks as setTasksAction,
  setTimerSessions as setTimerSessionsAction,
  type MvpCoreState
} from "@/features/mvp/shell/model/core-state";
import { normalizeLoadedEvents } from "@/features/mvp/shared";
import type { AppEvent, Mission, PersistedState, StatsState, Task, TimerSession, UserSettings } from "@/features/mvp/types/domain";

const DEFAULT_TASK_TOTAL_MINUTES = 60;

interface UseMvpStoreParams {
  sessionId: string;
}

interface UseMvpStoreResult extends MvpCoreState {
  coreState: MvpCoreState;
  hydrated: boolean;
  setTasks: (updater: SetStateAction<Task[]>) => void;
  setMissions: (updater: SetStateAction<Mission[]>) => void;
  setTimerSessions: (updater: SetStateAction<TimerSession[]>) => void;
  setStats: (updater: SetStateAction<StatsState>) => void;
  setSettings: (updater: SetStateAction<UserSettings>) => void;
  setEvents: (updater: SetStateAction<AppEvent[]>) => void;
  setActiveTaskId: (updater: SetStateAction<string | null>) => void;
  setActiveTab: (updater: SetStateAction<PersistedState["activeTab"]>) => void;
  setRemainingSecondsByMission: (updater: SetStateAction<Record<string, number>>) => void;
  resetCoreState: () => void;
}

function buildHydratedCoreState(loaded: PersistedState, sessionId: string): MvpCoreState {
  const loadedMissionMinutesByTask = loaded.missions.reduce<Record<string, number>>((acc, mission) => {
    acc[mission.taskId] = (acc[mission.taskId] ?? 0) + mission.estMinutes;
    return acc;
  }, {});

  return {
    tasks: loaded.tasks.map((task) => ({
      ...task,
      summary: task.summary ?? task.title,
      totalMinutes: clampTaskTotalMinutes(
        task.totalMinutes,
        loadedMissionMinutesByTask[task.id] ?? DEFAULT_TASK_TOTAL_MINUTES
      )
    })),
    missions: loaded.missions,
    timerSessions: loaded.timerSessions,
    stats: rollDailyStats(loaded.stats),
    settings: loaded.settings,
    events: normalizeLoadedEvents(loaded.events, sessionId),
    activeTaskId: loaded.activeTaskId,
    activeTab: loaded.activeTab,
    remainingSecondsByMission: loaded.remainingSecondsByMission
  };
}

export function useMvpStore(params: UseMvpStoreParams): UseMvpStoreResult {
  const { sessionId } = params;
  const [coreState, dispatchCoreState] = useReducer(mvpCoreStateReducer, undefined, createInitialCoreState);
  const [hydrated, setHydrated] = useState(false);

  const setTasks = useCallback((updater: SetStateAction<Task[]>) => {
    dispatchCoreState(setTasksAction(updater));
  }, []);
  const setMissions = useCallback((updater: SetStateAction<Mission[]>) => {
    dispatchCoreState(setMissionsAction(updater));
  }, []);
  const setTimerSessions = useCallback((updater: SetStateAction<TimerSession[]>) => {
    dispatchCoreState(setTimerSessionsAction(updater));
  }, []);
  const setStats = useCallback((updater: SetStateAction<StatsState>) => {
    dispatchCoreState(setStatsAction(updater));
  }, []);
  const setSettings = useCallback((updater: SetStateAction<UserSettings>) => {
    dispatchCoreState(setSettingsAction(updater));
  }, []);
  const setEvents = useCallback((updater: SetStateAction<AppEvent[]>) => {
    dispatchCoreState(setEventsAction(updater));
  }, []);
  const setActiveTaskId = useCallback((updater: SetStateAction<string | null>) => {
    dispatchCoreState(setActiveTaskIdAction(updater));
  }, []);
  const setActiveTab = useCallback((updater: SetStateAction<PersistedState["activeTab"]>) => {
    dispatchCoreState(setActiveTabAction(updater));
  }, []);
  const setRemainingSecondsByMission = useCallback((updater: SetStateAction<Record<string, number>>) => {
    dispatchCoreState(setRemainingSecondsByMissionAction(updater));
  }, []);
  const resetCoreState = useCallback(() => {
    dispatchCoreState(hydrateCoreState(createInitialCoreState()));
  }, []);

  useEffect(() => {
    const loaded = loadPersistedState();
    if (loaded) {
      dispatchCoreState(hydrateCoreState(buildHydratedCoreState(loaded, sessionId)));
    }
    setHydrated(true);
  }, [sessionId]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    savePersistedState(coreState);
  }, [coreState, hydrated]);

  return {
    coreState,
    ...coreState,
    hydrated,
    setTasks,
    setMissions,
    setTimerSessions,
    setStats,
    setSettings,
    setEvents,
    setActiveTaskId,
    setActiveTab,
    setRemainingSecondsByMission,
    resetCoreState
  };
}
