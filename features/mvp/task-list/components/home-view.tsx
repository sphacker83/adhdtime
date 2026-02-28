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

function resolveMissionIcon(iconKey?: string): string {
  if (!iconKey) {
    return "🧩";
  }

  const normalizedKey = iconKey.toLowerCase();
  if (normalizedKey.includes("routine")) return "⏰";
  if (normalizedKey.includes("organize")) return "🧹";
  if (normalizedKey.includes("record")) return "📝";
  if (normalizedKey.includes("review")) return "✅";
  if (normalizedKey.includes("schedule")) return "📅";
  if (normalizedKey.includes("break")) return "☕";
  if (normalizedKey.includes("execute")) return "⚔️";
  return "🧩";
}

function formatRemainingToDeadline(isoValue?: string, now = new Date()): string {
  if (!isoValue) {
    return "--";
  }

  const dueDate = new Date(isoValue);
  if (Number.isNaN(dueDate.getTime())) {
    return "--";
  }

  const diffMs = dueDate.getTime() - now.getTime();
  if (diffMs <= 0) {
    return "마감 지남";
  }

  const totalMinutes = Math.ceil(diffMs / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes}분`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remainMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    return remainMinutes > 0 ? `${totalHours}시간 ${remainMinutes}분` : `${totalHours}시간`;
  }

  const days = Math.floor(totalHours / 24);
  const remainHours = totalHours % 24;
  return remainHours > 0 ? `${days}일 ${remainHours}시간` : `${days}일`;
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
  isExecutionLocked: boolean;
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
  onEditTaskTotalMinutes: (task: Task) => void;
  onEditChunk: (chunk: Chunk) => void;
  onDeleteChunk: (chunk: Chunk) => void;
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
  isExecutionLocked,
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
  onReschedule,
  onEditTaskTotalMinutes,
  onEditChunk,
  onDeleteChunk
}: HomeViewProps) {
  const getClassName = (classKey: string) => styles[classKey] ?? "";
  const waitingTasks = homeTaskCards.filter((task) => task.status !== "done");
  const homeTaskActionableChunks = homeTask
    ? orderChunks(chunks.filter((chunk) => chunk.taskId === homeTask.id && isActionableChunkStatus(chunk.status)))
    : [];
  const nextActionableChunks = (() => {
    if (!homeChunk) {
      return [] as Chunk[];
    }

    const currentIndex = homeTaskActionableChunks.findIndex((chunk) => chunk.id === homeChunk.id);
    const followingChunks = currentIndex >= 0
      ? homeTaskActionableChunks.slice(currentIndex + 1)
      : homeTaskActionableChunks.filter((chunk) => chunk.id !== homeChunk.id);

    return followingChunks.slice(0, 3);
  })();
  const currentQuestTitle = homeChunk ? (homeTask?.title ?? homeChunk.action) : "없음";
  const expectedDurationText = homeTask ? `${homeTaskBudgetUsage}/${homeTask.totalMinutes}분` : "--";
  const dueAtText = homeTask?.dueAt ? formatOptionalDateTime(homeTask.dueAt) : "--";
  const dueRemainingText = formatRemainingToDeadline(homeTask?.dueAt);

  return (
    <>
      <section className={getClassName("currentChunkCard")}>
        <header className={getClassName("currentQuestHeader")}>
          <p className={getClassName("sectionLabel")}>{`퀘스트 : ${currentQuestTitle}`}</p>
        </header>

        {homeChunk ? (
          <>
            <div className={getClassName("currentQuestTop")}>
              <div>
                <h2>{homeChunk.action}</h2>
              </div>
              <span className={getClassName("currentQuestMonster")} aria-hidden="true">👾</span>
            </div>
            <p className={getClassName("timerValue")}>{formatClock(homeRemaining)}</p>
            <div className={getClassName("currentQuestInfoGrid")}>
              <p className={getClassName("currentQuestInfoItem")}>
                <span className={getClassName("currentQuestInfoLabel")}>예상소요시간</span>
                <strong className={getClassName("currentQuestInfoValue")}>{expectedDurationText}</strong>
              </p>
              <p className={getClassName("currentQuestInfoItem")}>
                <span className={getClassName("currentQuestInfoLabel")}>마감시간</span>
                <strong className={getClassName("currentQuestInfoValue")}>{dueAtText}</strong>
              </p>
              <p className={getClassName("currentQuestInfoItem")}>
                <span className={getClassName("currentQuestInfoLabel")}>마감까지</span>
                <strong className={getClassName("currentQuestInfoValue")}>{dueRemainingText}</strong>
              </p>
            </div>

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

            <section className={getClassName("nextMissionSection")} aria-label="다음 미션">
              <p className={getClassName("nextMissionTitle")}>다음 미션</p>
              {nextActionableChunks.length > 0 ? (
                <ol className={getClassName("nextMissionList")}>
                  {nextActionableChunks.map((chunk) => (
                    <li key={chunk.id} className={getClassName("nextMissionItem")}>
                      <span className={getClassName("nextMissionLead")}>
                        <span className={getClassName("nextMissionIcon")} aria-hidden="true">{resolveMissionIcon(chunk.iconKey)}</span>
                        <span className={getClassName("nextMissionContent")}>
                          <span className={getClassName("nextMissionAction")}>{chunk.action}</span>
                          <span className={getClassName("nextMissionMeta")}>{chunk.estMinutes}분</span>
                        </span>
                      </span>
                      <span className={getClassName("nextMissionButtons")}>
                        <button
                          type="button"
                          className={joinClassNames(getClassName("smallButton"), getClassName("missionIconButton"))}
                          onClick={() => onEditChunk(chunk)}
                          disabled={isExecutionLocked}
                          aria-label="미션 수정"
                          title="미션 수정"
                        >
                          <span aria-hidden="true">✏️</span>
                        </button>
                        <button
                          type="button"
                          className={joinClassNames(getClassName("smallButtonDanger"), getClassName("missionIconButton"))}
                          onClick={() => onDeleteChunk(chunk)}
                          disabled={isExecutionLocked}
                          aria-label="미션 삭제"
                          title="미션 삭제"
                        >
                          <span aria-hidden="true">🗑️</span>
                        </button>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={getClassName("nextMissionEmpty")}>현재 청크 이후의 미션이 없습니다.</p>
              )}
            </section>
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

      <section className={joinClassNames(getClassName("listCard"), getClassName("waitingSection"))}>
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
                <div className={getClassName("homeTaskHeaderRow")}>
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
                  <button
                    type="button"
                    className={joinClassNames(getClassName("smallButton"), getClassName("homeTaskEditButton"))}
                    onClick={() => onEditTaskTotalMinutes(task)}
                  >
                    퀘스트 수정
                  </button>
                </div>
                {isExpanded ? (
                  <ul id={`home-task-chunks-${task.id}`} className={getClassName("homeTaskChunkList")}>
                    {actionableTaskChunks.length === 0 ? (
                      <li className={getClassName("homeTaskChunkEmpty")}>청크가 없습니다.</li>
                    ) : null}
                    {actionableTaskChunks.map((chunk) => {
                      const remaining = remainingSecondsByChunk[chunk.id] ?? chunk.estMinutes * 60;
                      return (
                        <li key={chunk.id} className={getClassName("homeTaskChunkRow")}>
                          <span className={getClassName("homeTaskChunkBody")}>
                            <span className={getClassName("homeTaskChunkAction")}>{chunk.action}</span>
                            <span className={getClassName("homeTaskChunkInfo")}>
                              {chunk.estMinutes}분 · {formatClock(remaining)} · {chunkStatusLabel(chunk.status)}
                            </span>
                          </span>
                          <span className={getClassName("homeTaskChunkButtons")}>
                            <button
                              type="button"
                              className={joinClassNames(getClassName("smallButton"), getClassName("missionIconButton"))}
                              onClick={() => onEditChunk(chunk)}
                              disabled={isExecutionLocked}
                              aria-label="미션 수정"
                              title="미션 수정"
                            >
                              <span aria-hidden="true">✏️</span>
                            </button>
                            <button
                              type="button"
                              className={joinClassNames(getClassName("smallButtonDanger"), getClassName("missionIconButton"))}
                              onClick={() => onDeleteChunk(chunk)}
                              disabled={isExecutionLocked}
                              aria-label="미션 삭제"
                              title="미션 삭제"
                            >
                              <span aria-hidden="true">🗑️</span>
                            </button>
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
