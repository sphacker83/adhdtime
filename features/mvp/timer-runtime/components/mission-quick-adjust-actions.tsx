type CssModuleClassMap = Readonly<Record<string, string>>;

export interface MissionQuickAdjustActionsProps {
  styles: CssModuleClassMap;
  onAdjustRunningMissionMinutes: (deltaMinutes: -5 | -1 | 1 | 5) => void;
  canAdjustMinusFive: boolean;
  canAdjustMinusOne: boolean;
  canAdjustPlusOne: boolean;
  canAdjustPlusFive: boolean;
}

export function MissionQuickAdjustActions({
  styles,
  onAdjustRunningMissionMinutes,
  canAdjustMinusFive,
  canAdjustMinusOne,
  canAdjustPlusOne,
  canAdjustPlusFive
}: MissionQuickAdjustActionsProps) {
  const getClassName = (classKey: string) => styles[classKey] ?? "";

  return (
    <div className={getClassName("quickAdjustRow")}>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onAdjustRunningMissionMinutes(-5)}
        disabled={!canAdjustMinusFive}
        aria-label="미션 시간 5분 감소"
      >
        -5분
      </button>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onAdjustRunningMissionMinutes(-1)}
        disabled={!canAdjustMinusOne}
        aria-label="미션 시간 1분 감소"
      >
        -1분
      </button>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onAdjustRunningMissionMinutes(1)}
        disabled={!canAdjustPlusOne}
        aria-label="미션 시간 1분 증가"
      >
        +1분
      </button>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onAdjustRunningMissionMinutes(5)}
        disabled={!canAdjustPlusFive}
        aria-label="미션 시간 5분 증가"
      >
        +5분
      </button>
    </div>
  );
}
