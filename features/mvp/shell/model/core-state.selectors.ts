import { isActionableMissionStatus, orderMissions } from "@/features/mvp/shared";
import type { Mission, Task } from "@/features/mvp/types/domain";
import type { MvpCoreState } from "./core-state.types";

export function selectActiveTask(state: MvpCoreState): Task | null {
  return state.tasks.find((task) => task.id === state.activeTaskId) ?? null;
}

export function selectActiveTaskMissions(state: MvpCoreState): Mission[] {
  if (!state.activeTaskId) {
    return [];
  }

  return orderMissions(state.missions.filter((mission) => mission.taskId === state.activeTaskId));
}

export function selectRunningMission(state: MvpCoreState): Mission | null {
  return state.missions.find((mission) => mission.status === "running") ?? null;
}

export function selectCompletionRate(state: MvpCoreState): number {
  if (state.missions.length === 0) {
    return 0;
  }

  const doneCount = state.missions.filter((mission) => mission.status === "done").length;
  return Math.round((doneCount / state.missions.length) * 100);
}

export function selectHomeMission(state: MvpCoreState, currentMissionId: string | null = null): Mission | null {
  return selectRunningMission(state) ?? selectCurrentMission(state, currentMissionId);
}

export function selectHomeTask(state: MvpCoreState, currentMissionId: string | null = null): Task | null {
  const activeTask = selectActiveTask(state);
  const homeMission = selectHomeMission(state, currentMissionId);
  if (!homeMission) {
    return activeTask;
  }

  return state.tasks.find((task) => task.id === homeMission.taskId) ?? activeTask;
}

export function selectHomeRemaining(state: MvpCoreState, currentMissionId: string | null = null): number {
  const homeMission = selectHomeMission(state, currentMissionId);
  if (!homeMission) {
    return 0;
  }

  return state.remainingSecondsByMission[homeMission.id] ?? homeMission.estMinutes * 60;
}

function selectCurrentMission(state: MvpCoreState, currentMissionId: string | null): Mission | null {
  const activeTaskMissions = selectActiveTaskMissions(state);

  return (
    activeTaskMissions.find((mission) => mission.id === currentMissionId && isActionableMissionStatus(mission.status))
    ?? activeTaskMissions.find((mission) => isActionableMissionStatus(mission.status))
    ?? null
  );
}
