import { isActionableChunkStatus } from "@/features/mvp/shared";
import type { Chunk } from "@/features/mvp/types/domain";

type CssModuleClassMap = Readonly<Record<string, string>>;

export interface RecoveryActionsProps {
  styles: CssModuleClassMap;
  chunk: Pick<Chunk, "id" | "status">;
  onRechunk: (chunkId: string) => void;
  onReschedule: (chunkId: string) => void;
}

export function RecoveryActions({
  styles,
  chunk,
  onRechunk,
  onReschedule
}: RecoveryActionsProps) {
  const isActionable = isActionableChunkStatus(chunk.status);
  const getClassName = (classKey: string) => styles[classKey] ?? "";

  return (
    <div className={getClassName("recoveryRow")}>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onRechunk(chunk.id)}
        disabled={!isActionable}
      >
        더 작게 다시 나누기
      </button>
      <button
        type="button"
        className={getClassName("subtleButton")}
        onClick={() => onReschedule(chunk.id)}
        disabled={!isActionable}
      >
        내일로 다시 등록
      </button>
    </div>
  );
}
