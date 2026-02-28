import { isActionableMissionStatus } from "@/features/mvp/shared";
import type { Mission } from "@/features/mvp/types/domain";

type CssModuleClassMap = Readonly<Record<string, string>>;

export interface MissionPrimaryActionsProps {
  styles: CssModuleClassMap;
  mission: Pick<Mission, "id" | "status">;
  onStartMission: (missionId: string) => void;
  onPauseMission: (missionId: string) => void;
  onCompleteMission: (missionId: string) => void;
  startButtonClassKey: string;
  pauseButtonClassKey: string;
  completeButtonClassKey: string;
}

export function MissionPrimaryActions({
  styles,
  mission,
  onStartMission,
  onPauseMission,
  onCompleteMission,
  startButtonClassKey,
  pauseButtonClassKey,
  completeButtonClassKey
}: MissionPrimaryActionsProps) {
  const isActionable = isActionableMissionStatus(mission.status);
  const getClassName = (classKey: string) => styles[classKey] ?? "";

  return (
    <>
      <button
        type="button"
        className={getClassName(startButtonClassKey)}
        onClick={() => onStartMission(mission.id)}
        disabled={!isActionable || mission.status === "running"}
      >
        시작
      </button>
      <button
        type="button"
        className={getClassName(pauseButtonClassKey)}
        onClick={() => onPauseMission(mission.id)}
        disabled={mission.status !== "running"}
      >
        일시정지
      </button>
      <button
        type="button"
        className={getClassName(completeButtonClassKey)}
        onClick={() => onCompleteMission(mission.id)}
        disabled={!isActionable}
      >
        완료
      </button>
    </>
  );
}
