type CssModuleClassMap = Readonly<Record<string, string>>;

export interface ChunkQuickAdjustActionsProps {
  styles: CssModuleClassMap;
  onAdjustRunningChunkMinutes: (deltaMinutes: -5 | -1 | 1 | 5) => void;
  canAdjustMinusFive: boolean;
  canAdjustMinusOne: boolean;
  canAdjustPlusOne: boolean;
  canAdjustPlusFive: boolean;
}

export function ChunkQuickAdjustActions({
  styles,
  onAdjustRunningChunkMinutes,
  canAdjustMinusFive,
  canAdjustMinusOne,
  canAdjustPlusOne,
  canAdjustPlusFive
}: ChunkQuickAdjustActionsProps) {
  const getClassName = (classKey: string) => styles[classKey] ?? "";

  return (
    <div className={getClassName("quickAdjustRow")}>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onAdjustRunningChunkMinutes(-5)}
        disabled={!canAdjustMinusFive}
      >
        -5분
      </button>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onAdjustRunningChunkMinutes(-1)}
        disabled={!canAdjustMinusOne}
      >
        -1분
      </button>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onAdjustRunningChunkMinutes(1)}
        disabled={!canAdjustPlusOne}
      >
        +1분
      </button>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onAdjustRunningChunkMinutes(5)}
        disabled={!canAdjustPlusFive}
      >
        +5분
      </button>
    </div>
  );
}
