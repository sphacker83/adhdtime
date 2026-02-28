import { isActionableMissionStatus } from "@/features/mvp/shared";
import type { Mission } from "@/features/mvp/types/domain";

type CssModuleClassMap = Readonly<Record<string, string>>;

export interface RecoveryActionsProps {
  styles: CssModuleClassMap;
  mission: Pick<Mission, "id" | "status">;
  onRemission: (missionId: string) => void;
  onReschedule: (missionId: string) => void;
}

export function RecoveryActions({
  styles,
  mission,
  onRemission,
  onReschedule
}: RecoveryActionsProps) {
  const isActionable = isActionableMissionStatus(mission.status);
  const getClassName = (classKey: string) => styles[classKey] ?? "";

  return (
    <div className={getClassName("recoveryRow")}>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onRemission(mission.id)}
        disabled={!isActionable}
      >
        더 작게 다시 나누기
      </button>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onReschedule(mission.id)}
        disabled={!isActionable}
      >
        내일로 다시 등록
      </button>
    </div>
  );
}
