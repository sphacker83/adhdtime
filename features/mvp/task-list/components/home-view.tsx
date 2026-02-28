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

function resolveTaskIcon(task: Task, openChunks: number): string {
  if (task.status === "done") {
    return "😺";
  }

  if (task.status === "in_progress") {
    return openChunks <= 1 ? "👾" : "😈";
  }

  if (openChunks <= 1) {
    return "🧊";
  }

  return "👹";
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
  const waitingTasks = homeTaskCards;

  return (
    <>
      <section className={getClassName("currentChunkCard")}>
        <header className={getClassName("currentQuestHeader")}>
          <p className={getClassName("sectionLabel")}>현재의 퀘스트</p>
          <strong className={getClassName("currentQuestCount")}>{homeChunk ? "1개 +" : "0개 +"}</strong>
        </header>

        {homeChunk ? (
          <>
            <div className={getClassName("currentQuestTop")}>
              <div>
                <h2>{homeChunk.action}</h2>
                {homeTask ? <p className={getClassName("taskTitle")}>요약: {homeTask.title}</p> : null}
              </div>
              <span className={getClassName("currentQuestMonster")} aria-hidden="true">👾</span>
            </div>
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
            <p className={getClassName("vibrationHint")}>⏰ 5분마다 미세 진동 알림</p>
          </>
        ) : (
          <p className={getClassName("helperText")}>입력창에서 할 일을 넣고 첫 청크를 만들어보세요.</p>
        )}
      </section>

      <section className={getClassName("waitingSection")}>
        <header className={getClassName("waitingHeader")}>
          <h3>대기 중인 퀘스트</h3>
          <p>{waitingTasks.length}개 · 완료율 {completionRate}%</p>
        </header>

        <ul className={getClassName("taskPreviewList")}>
          {waitingTasks.length === 0 ? <li className={getClassName("emptyRow")}>대기 중인 과업이 없습니다.</li> : null}
          {waitingTasks.map((task) => {
            const actionableTaskChunks = orderChunks(
              chunks.filter((chunk) => chunk.taskId === task.id && isActionableChunkStatus(chunk.status))
            );
            const openChunks = actionableTaskChunks.length;
            const isExpanded = expandedHomeTaskId === task.id;
            const estimatedMinutes = actionableTaskChunks.reduce((total, chunk) => total + chunk.estMinutes, 0);

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
                  <span className={getClassName("homeTaskMonster")} aria-hidden="true">
                    {resolveTaskIcon(task, openChunks)}
                  </span>
                  <span className={getClassName("homeTaskMain")}>
                    <span className={getClassName("homeTaskTitleRow")}>
                      <span className={getClassName("homeTaskTitle")}>{task.title}</span>
                      <strong className={getClassName("homeTaskRemaining")}>{openChunks}개 남음</strong>
                    </span>
                    <span className={getClassName("homeTaskMetaRow")}>
                      <span className={getClassName("homeTaskMetaItem")}>
                        <span className={getClassName("homeTaskMetaIcon")} aria-hidden="true">🕒</span>
                        <span className={getClassName("homeTaskMetaValue")}>{formatOptionalDateTime(task.scheduledFor)} 시작</span>
                        <span className={getClassName("homeTaskMetaLabel")}>(Start)</span>
                      </span>
                      <span className={getClassName("homeTaskMetaItem")}>
                        <span className={getClassName("homeTaskMetaIcon")} aria-hidden="true">📅</span>
                        <span className={getClassName("homeTaskMetaValue")}>{formatOptionalDateTime(task.dueAt)} 마감</span>
                        <span className={getClassName("homeTaskMetaLabel")}>(Due)</span>
                      </span>
                      <span className={getClassName("homeTaskMetaItem")}>
                        <span className={getClassName("homeTaskMetaIcon")} aria-hidden="true">⏳</span>
                        <span className={getClassName("homeTaskMetaValue")}>{estimatedMinutes}분 소요</span>
                        <span className={getClassName("homeTaskMetaLabel")}>(Est. Min.)</span>
                      </span>
                    </span>
                  </span>
                  <span className={getClassName("homeTaskAccordionIndicator")} aria-hidden="true">
                    <span className={getClassName("homeTaskChevron")}>{isExpanded ? "▴" : "▾"}</span>
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
