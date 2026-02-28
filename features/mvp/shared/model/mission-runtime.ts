import { sumMissionEstMinutes } from "@/features/mvp/lib/missioning";
import type { Mission } from "@/features/mvp/types/domain";

const ACTIONABLE_MISSION_STATUSES: Mission["status"][] = ["todo", "running", "paused"];
const REORDERABLE_MISSION_STATUSES: Mission["status"][] = ["todo"];

export function isBudgetCountedMissionStatus(status: Mission["status"]): boolean {
  return status !== "archived";
}

export function getTaskBudgetedMissions(missions: Mission[], taskId: string, excludeMissionId?: string): Mission[] {
  return missions.filter((mission) =>
    mission.taskId === taskId
    && mission.id !== excludeMissionId
    && isBudgetCountedMissionStatus(mission.status)
  );
}

export function getTaskBudgetUsage(missions: Mission[], taskId: string, excludeMissionId?: string): number {
  return sumMissionEstMinutes(getTaskBudgetedMissions(missions, taskId, excludeMissionId));
}

export function isActionableMissionStatus(status: Mission["status"]): boolean {
  return ACTIONABLE_MISSION_STATUSES.includes(status);
}

export function isTaskClosedStatus(status: Mission["status"]): boolean {
  return status === "done" || status === "abandoned" || status === "archived";
}

export function isReorderableMissionStatus(status: Mission["status"]): boolean {
  return REORDERABLE_MISSION_STATUSES.includes(status);
}

export function orderMissions(list: Mission[]): Mission[] {
  return [...list].sort((a, b) => a.order - b.order);
}

export function reorderTaskMissionsKeepingLocked(
  orderedTaskMissions: Mission[],
  draggedMissionId: string,
  targetMissionId: string
): Mission[] | null {
  const reorderableMissions = orderedTaskMissions.filter((mission) => isReorderableMissionStatus(mission.status));
  const fromIndex = reorderableMissions.findIndex((mission) => mission.id === draggedMissionId);
  const toIndex = reorderableMissions.findIndex((mission) => mission.id === targetMissionId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return null;
  }

  const reorderedReorderableMissions = [...reorderableMissions];
  const [movedMission] = reorderedReorderableMissions.splice(fromIndex, 1);
  if (!movedMission) {
    return null;
  }
  reorderedReorderableMissions.splice(toIndex, 0, movedMission);

  let reorderableCursor = 0;
  return orderedTaskMissions.map((mission) => {
    if (!isReorderableMissionStatus(mission.status)) {
      return mission;
    }

    const nextMission = reorderedReorderableMissions[reorderableCursor];
    reorderableCursor += 1;
    return nextMission ?? mission;
  });
}

export function withReorderedTaskMissions(missions: Mission[], taskId: string): Mission[] {
  const targetMissions = orderMissions(missions.filter((mission) => mission.taskId === taskId));
  const reorderedMap = new Map(
    targetMissions.map((mission, index) => [
      mission.id,
      {
        ...mission,
        order: index + 1
      }
    ])
  );

  return missions.map((mission) => reorderedMap.get(mission.id) ?? mission);
}
