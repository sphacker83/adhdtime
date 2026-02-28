import { RecoveryActions } from "@/features/mvp/recovery";
import {
  chunkStatusLabel,
  formatClock,
  formatOptionalDateTime,
  isActionableChunkStatus,
  orderChunks
} from "@/features/mvp/shared";
import { ChunkPrimaryActions, ChunkQuickAdjustActions } from "@/features/mvp/timer-runtime";
import type { Chunk, Task } from "@/features/mvp/types/domain";

type CssModuleClassMap = Readonly<Record<string, string>>;

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export interface HomeViewProps {
  styles: CssModuleClassMap;
  homeChunk: Chunk | null;
  homeTask: Task | null;
  homeRemaining: number;
  homeTaskBudgetUsage: number;
  completionRate: number;
  homeTaskCards: Task[];
  chunks: Chunk[];
  expandedHomeTaskId: string | null;
  remainingSecondsByChunk: Record<string, number>;
  onSetActiveTaskId: (taskId: string) => void;
  onToggleExpandedHomeTaskId: (taskId: string) => void;
  onStartChunk: (chunkId: string) => void;
  onPauseChunk: (chunkId: string) => void;
  onCompleteChunk: (chunkId: string) => void;
  onAdjustRunningChunkMinutes: (deltaMinutes: -5 | -1 | 1 | 5) => void;
  canAdjustMinusFive: boolean;
  canAdjustMinusOne: boolean;
  canAdjustPlusOne: boolean;
  canAdjustPlusFive: boolean;
  onRechunk: (chunkId: string) => void;
  onReschedule: (chunkId: string) => void;
}

export function HomeView({
  styles,
  homeChunk,
  homeTask,
  homeRemaining,
  homeTaskBudgetUsage,
  completionRate,
  homeTaskCards,
  chunks,
  expandedHomeTaskId,
  remainingSecondsByChunk,
  onSetActiveTaskId,
  onToggleExpandedHomeTaskId,
  onStartChunk,
  onPauseChunk,
  onCompleteChunk,
  onAdjustRunningChunkMinutes,
  canAdjustMinusFive,
  canAdjustMinusOne,
  canAdjustPlusOne,
  canAdjustPlusFive,
  onRechunk,
  onReschedule
}: HomeViewProps) {
  const getClassName = (classKey: string) => styles[classKey] ?? "";
  const statusClassName = homeChunk ? getClassName(`status_${homeChunk.status}`) : "";

  return (
    <>
      <section className={getClassName("currentChunkCard")}>
        <header>
          <p className={getClassName("sectionLabel")}>현재 퀘스트</p>
          <h2>{homeChunk ? homeChunk.action : "진행할 청크가 없어요"}</h2>
          {homeTask ? <p className={getClassName("taskTitle")}>과업: {homeTask.title}</p> : null}
        </header>

        {homeChunk ? (
          <>
            <p className={getClassName("timerValue")}>{formatClock(homeRemaining)}</p>
            <div className={getClassName("chunkMetaRow")}>
              <span>{homeChunk.estMinutes}분 청크</span>
              <span className={joinClassNames(getClassName("statusBadge"), statusClassName)}>
                {chunkStatusLabel(homeChunk.status)}
              </span>
            </div>
            {homeTask ? (
              <p className={getClassName("chunkBudget")}>
                예산 {homeTaskBudgetUsage}/{homeTask.totalMinutes}분 · 시작 예정 {formatOptionalDateTime(homeTask.scheduledFor)}
                {" "}· 마감 {formatOptionalDateTime(homeTask.dueAt)}
              </p>
            ) : null}

            <div className={getClassName("actionRow")}>
              <ChunkPrimaryActions
                styles={styles}
                chunk={homeChunk}
                onStartChunk={onStartChunk}
                onPauseChunk={onPauseChunk}
                onCompleteChunk={onCompleteChunk}
                startButtonClassKey="primaryButton"
                pauseButtonClassKey="ghostButton"
                completeButtonClassKey="successButton"
              />
            </div>

            {homeChunk.status === "running" ? (
              <ChunkQuickAdjustActions
                styles={styles}
                onAdjustRunningChunkMinutes={onAdjustRunningChunkMinutes}
                canAdjustMinusFive={canAdjustMinusFive}
                canAdjustMinusOne={canAdjustMinusOne}
                canAdjustPlusOne={canAdjustPlusOne}
                canAdjustPlusFive={canAdjustPlusFive}
              />
            ) : null}

            <RecoveryActions
              styles={styles}
              chunk={homeChunk}
              onRechunk={onRechunk}
              onReschedule={onReschedule}
            />
          </>
        ) : (
          <p className={getClassName("helperText")}>입력창에서 할 일을 넣고 첫 청크를 만들어보세요.</p>
        )}
      </section>

      <section className={getClassName("listCard")}>
        <header className={getClassName("listHeader")}>
          <h3>오늘의 퀘스트</h3>
          <p>완료율 {completionRate}%</p>
        </header>

        <ul className={getClassName("taskPreviewList")}>
          {homeTaskCards.length === 0 ? <li className={getClassName("emptyRow")}>아직 생성된 과업이 없습니다.</li> : null}
          {homeTaskCards.map((task) => {
            const actionableTaskChunks = orderChunks(
              chunks.filter((chunk) => chunk.taskId === task.id && isActionableChunkStatus(chunk.status))
            );
            const openChunks = actionableTaskChunks.length;
            const isExpanded = expandedHomeTaskId === task.id;

            return (
              <li key={task.id} className={getClassName("homeTaskItem")}>
                <button
                  type="button"
                  className={getClassName("homeTaskToggle")}
                  onClick={() => {
                    onSetActiveTaskId(task.id);
                    onToggleExpandedHomeTaskId(task.id);
                  }}
                  aria-expanded={isExpanded}
                  aria-controls={`home-task-chunks-${task.id}`}
                >
                  <span className={getClassName("homeTaskTitle")}>{task.title}</span>
                  <strong>{openChunks}개 남음</strong>
                  <span className={getClassName("homeTaskChevron")} aria-hidden="true">
                    {isExpanded ? "▾" : "▸"}
                  </span>
                </button>
                {isExpanded ? (
                  <ul id={`home-task-chunks-${task.id}`} className={getClassName("homeTaskChunkList")}>
                    {actionableTaskChunks.length === 0 ? (
                      <li className={getClassName("homeTaskChunkEmpty")}>청크가 없습니다.</li>
                    ) : null}
                    {actionableTaskChunks.map((chunk) => {
                      const remaining = remainingSecondsByChunk[chunk.id] ?? chunk.estMinutes * 60;
                      return (
                        <li key={chunk.id} className={getClassName("homeTaskChunkRow")}>
                          <span className={getClassName("homeTaskChunkAction")}>{chunk.action}</span>
                          <span className={getClassName("homeTaskChunkInfo")}>
                            {chunk.estMinutes}분 · {formatClock(remaining)} · {chunkStatusLabel(chunk.status)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
