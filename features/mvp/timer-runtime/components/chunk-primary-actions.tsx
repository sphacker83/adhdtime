import { isActionableChunkStatus } from "@/features/mvp/shared";
import type { Chunk } from "@/features/mvp/types/domain";

type CssModuleClassMap = Readonly<Record<string, string>>;

export interface ChunkPrimaryActionsProps {
  styles: CssModuleClassMap;
  chunk: Pick<Chunk, "id" | "status">;
  onStartChunk: (chunkId: string) => void;
  onPauseChunk: (chunkId: string) => void;
  onCompleteChunk: (chunkId: string) => void;
  startButtonClassKey: string;
  pauseButtonClassKey: string;
  completeButtonClassKey: string;
}

export function ChunkPrimaryActions({
  styles,
  chunk,
  onStartChunk,
  onPauseChunk,
  onCompleteChunk,
  startButtonClassKey,
  pauseButtonClassKey,
  completeButtonClassKey
}: ChunkPrimaryActionsProps) {
  const isActionable = isActionableChunkStatus(chunk.status);
  const getClassName = (classKey: string) => styles[classKey] ?? "";

  return (
    <>
      <button
        type="button"
        className={getClassName(startButtonClassKey)}
        onClick={() => onStartChunk(chunk.id)}
        disabled={!isActionable || chunk.status === "running"}
      >
        시작
      </button>
      <button
        type="button"
        className={getClassName(pauseButtonClassKey)}
        onClick={() => onPauseChunk(chunk.id)}
        disabled={chunk.status !== "running"}
      >
        일시정지
      </button>
      <button
        type="button"
        className={getClassName(completeButtonClassKey)}
        onClick={() => onCompleteChunk(chunk.id)}
        disabled={!isActionable}
      >
        완료
      </button>
    </>
  );
}
