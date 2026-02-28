import {
  chunkStatusLabel,
  formatClock,
  formatOptionalDateTime,
  isActionableChunkStatus,
  taskStatusLabel
} from "@/features/mvp/shared";
import { ChunkPrimaryActions } from "@/features/mvp/timer-runtime";
import type { Chunk, Task } from "@/features/mvp/types/domain";

type CssModuleClassMap = Readonly<Record<string, string>>;

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export interface TasksViewProps {
  styles: CssModuleClassMap;
  tasks: Task[];
  activeTask: Task | null;
  activeTaskId: string | null;
  activeTaskBudgetUsage: number;
  activeTaskChunks: Chunk[];
  currentChunkId: string | null;
  remainingSecondsByChunk: Record<string, number>;
  isExecutionLocked: boolean;
  onSetActiveTaskId: (taskId: string) => void;
  onEditTaskTotalMinutes: (task: Task) => void;
  onStartChunk: (chunkId: string) => void;
  onPauseChunk: (chunkId: string) => void;
  onCompleteChunk: (chunkId: string) => void;
  onEditChunk: (chunk: Chunk) => void;
  onDeleteChunk: (chunk: Chunk) => void;
}

export function TasksView({
  styles,
  tasks,
  activeTask,
  activeTaskId,
  activeTaskBudgetUsage,
  activeTaskChunks,
  currentChunkId,
  remainingSecondsByChunk,
  isExecutionLocked,
  onSetActiveTaskId,
  onEditTaskTotalMinutes,
  onStartChunk,
  onPauseChunk,
  onCompleteChunk,
  onEditChunk,
  onDeleteChunk
}: TasksViewProps) {
  const getClassName = (classKey: string) => styles[classKey] ?? "";
  const currentChunk =
    activeTaskChunks.find((chunk) => chunk.id === currentChunkId && isActionableChunkStatus(chunk.status))
    ?? activeTaskChunks.find((chunk) => isActionableChunkStatus(chunk.status))
    ?? null;

  return (
    <section className={getClassName("listCard")}>
      <header className={getClassName("listHeader")}>
        <h3>청크 목록</h3>
        <p>{activeTask ? activeTask.title : "과업을 선택하세요"}</p>
      </header>
      {activeTask ? (
        <div className={getClassName("taskBudgetRow")}>
          <p className={getClassName("helperText")}>
            총 {activeTask.totalMinutes}분 · 청크 합계 {activeTaskBudgetUsage}분 · 상태 {taskStatusLabel(activeTask.status)}
            {" "}· 시작 예정 {formatOptionalDateTime(activeTask.scheduledFor)} · 마감 {formatOptionalDateTime(activeTask.dueAt)}
          </p>
          <button
            type="button"
            className={getClassName("smallButton")}
            onClick={() => onEditTaskTotalMinutes(activeTask)}
          >
            총 시간 수정
          </button>
        </div>
      ) : null}

      <div className={getClassName("taskSelector")}>
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            className={task.id === activeTaskId ? getClassName("taskChipActive") : getClassName("taskChip")}
            onClick={() => onSetActiveTaskId(task.id)}
          >
            {task.title}
          </button>
        ))}
      </div>

      <ul className={getClassName("chunkList")}>
        {activeTaskChunks.length === 0 ? <li className={getClassName("emptyRow")}>선택된 과업의 청크가 없습니다.</li> : null}
        {activeTaskChunks.map((chunk) => {
          const remaining = remainingSecondsByChunk[chunk.id] ?? chunk.estMinutes * 60;
          return (
            <li
              key={chunk.id}
              className={joinClassNames(
                getClassName("chunkItem"),
                currentChunk?.id === chunk.id ? getClassName("chunkItemCurrent") : undefined
              )}
            >
              <div>
                <p className={getClassName("chunkOrder")}>#{chunk.order}</p>
                <h4>{chunk.action}</h4>
                <p className={getClassName("chunkInfo")}>
                  {chunk.estMinutes}분 · {formatClock(remaining)} · {chunkStatusLabel(chunk.status)}
                </p>
              </div>
              <div className={getClassName("chunkButtons")}>
                <ChunkPrimaryActions
                  styles={styles}
                  chunk={chunk}
                  onStartChunk={onStartChunk}
                  onPauseChunk={onPauseChunk}
                  onCompleteChunk={onCompleteChunk}
                  startButtonClassKey="smallButton"
                  pauseButtonClassKey="smallButton"
                  completeButtonClassKey="smallButton"
                />
                <button
                  type="button"
                  className={getClassName("smallButton")}
                  onClick={() => onEditChunk(chunk)}
                  disabled={isExecutionLocked}
                >
                  수정
                </button>
                <button
                  type="button"
                  className={getClassName("smallButtonDanger")}
                  onClick={() => onDeleteChunk(chunk)}
                  disabled={isExecutionLocked}
                >
                  삭제
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
