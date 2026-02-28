import { useState, type DragEvent, type MouseEvent } from "react";
import { RecoveryActions } from "@/features/mvp/recovery";
import {
  missionStatusLabel,
  formatClock,
  formatOptionalDateTime,
  isActionableMissionStatus,
  isReorderableMissionStatus,
  orderMissions
} from "@/features/mvp/shared";
import { MissionPrimaryActions, MissionQuickAdjustActions } from "@/features/mvp/timer-runtime";
import type { Mission, Task } from "@/features/mvp/types/domain";

type CssModuleClassMap = Readonly<Record<string, string>>;

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function resolveTaskIcon(task: Task, openMissions: number): string {
  if (task.status === "done") {
    return "😺";
  }

  if (task.status === "in_progress") {
    return openMissions <= 1 ? "👾" : "😈";
  }

  if (openMissions <= 1) {
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

function resolveCurrentQuestMonsterIcon(task: Task | null, openMissions: number): string {
  if (!task) {
    return "👾";
  }

  return resolveTaskIcon(task, openMissions);
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

function formatScheduledStartTime(isoValue?: string): string {
  if (!isoValue) {
    return "--:--";
  }

  return formatOptionalDateTime(isoValue);
}

export interface HomeViewProps {
  styles: CssModuleClassMap;
  homeMission: Mission | null;
  homeTask: Task | null;
  homeRemaining: number;
  homeTaskBudgetUsage: number;
  completionRate: number;
  homeTaskCards: Task[];
  missions: Mission[];
  expandedHomeTaskId: string | null;
  remainingSecondsByMission: Record<string, number>;
  isExecutionLocked: boolean;
  onSetActiveTaskId: (taskId: string) => void;
  onToggleExpandedHomeTaskId: (taskId: string) => void;
  onStartMission: (missionId: string) => void;
  onPauseMission: (missionId: string) => void;
  onCompleteMission: (missionId: string) => void;
  onAdjustRunningMissionMinutes: (deltaMinutes: -5 | -1 | 1 | 5) => void;
  canAdjustMinusFive: boolean;
  canAdjustMinusOne: boolean;
  canAdjustPlusOne: boolean;
  canAdjustPlusFive: boolean;
  onRemission: (missionId: string) => void;
  onReschedule: (taskId: string) => void;
  onEditTaskTotalMinutes: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onReorderTaskMissions: (taskId: string, draggedMissionId: string, targetMissionId: string) => void;
  onEditMission: (mission: Mission) => void;
  onDeleteMission: (mission: Mission) => void;
}

export function HomeView({
  styles,
  homeMission,
  homeTask,
  homeRemaining,
  homeTaskBudgetUsage,
  completionRate,
  homeTaskCards,
  missions,
  expandedHomeTaskId,
  remainingSecondsByMission,
  isExecutionLocked,
  onSetActiveTaskId,
  onToggleExpandedHomeTaskId,
  onStartMission,
  onPauseMission,
  onCompleteMission,
  onAdjustRunningMissionMinutes,
  canAdjustMinusFive,
  canAdjustMinusOne,
  canAdjustPlusOne,
  canAdjustPlusFive,
  onRemission,
  onReschedule,
  onEditTaskTotalMinutes,
  onDeleteTask,
  onReorderTaskMissions,
  onEditMission,
  onDeleteMission
}: HomeViewProps) {
  const getClassName = (classKey: string) => styles[classKey] ?? "";
  const [draggingMissionId, setDraggingMissionId] = useState<string | null>(null);
  const [dragOverMissionId, setDragOverMissionId] = useState<string | null>(null);
  const waitingTasks = homeTaskCards.filter((task) => task.status !== "done");
  const homeTaskActionableMissions = homeTask
    ? orderMissions(missions.filter((mission) => mission.taskId === homeTask.id && isActionableMissionStatus(mission.status)))
    : [];
  const nextActionableMissions = (() => {
    if (!homeMission) {
      return [] as Mission[];
    }

    const currentIndex = homeTaskActionableMissions.findIndex((mission) => mission.id === homeMission.id);
    const followingMissions = currentIndex >= 0
      ? homeTaskActionableMissions.slice(currentIndex + 1)
      : homeTaskActionableMissions.filter((mission) => mission.id !== homeMission.id);

    return followingMissions.slice(0, 3);
  })();
  const currentQuestTitle = homeMission ? (homeTask?.title ?? homeMission.action) : "없음";
  const expectedDurationText = homeTask ? `${homeTaskBudgetUsage}/${homeTask.totalMinutes}분` : "--";
  const dueAtText = homeTask?.dueAt ? formatOptionalDateTime(homeTask.dueAt) : "--";
  const dueRemainingText = formatRemainingToDeadline(homeTask?.dueAt);
  const homeTaskBudgetedMissions = homeTask
    ? missions.filter((mission) => mission.taskId === homeTask.id && mission.status !== "archived")
    : [];
  const totalEnergySeconds = homeTaskBudgetedMissions.reduce((total, mission) => total + mission.estMinutes * 60, 0);
  const remainingEnergySeconds = homeTaskBudgetedMissions.reduce((total, mission) => {
    if (mission.status === "done" || mission.status === "abandoned") {
      return total;
    }

    return total + Math.max(0, remainingSecondsByMission[mission.id] ?? mission.estMinutes * 60);
  }, 0);
  const energyRatio = totalEnergySeconds > 0 ? Math.max(0, Math.min(1, remainingEnergySeconds / totalEnergySeconds)) : 0;
  const energyPercent = Math.round(energyRatio * 100);
  const energyAngle = Math.max(0, Math.min(360, energyRatio * 360));
  const energyHue = Math.max(0, Math.min(120, Math.round(energyRatio * 120)));
  const ringAccentColor = `hsl(${energyHue} 74% 44%)`;
  const ringTrackColor = `hsl(${energyHue} 44% 84%)`;
  const ringGlowColor = `hsla(${energyHue}, 72%, 34%, 0.24)`;
  const ringInnerBorderColor = `hsl(${energyHue} 34% 72%)`;
  const dueCardBorderColor = `hsl(${energyHue} 48% 72%)`;
  const dueCardBackgroundColor = `hsl(${energyHue} 74% 94%)`;
  const dueCardTextColor = `hsl(${energyHue} 58% 28%)`;
  const currentQuestMonsterIcon = resolveCurrentQuestMonsterIcon(homeTask, homeTaskActionableMissions.length);
  const currentQuestMonsterRingStyle = {
    background: `conic-gradient(${ringAccentColor} 0deg ${energyAngle}deg, ${ringTrackColor} ${energyAngle}deg 360deg)`,
    boxShadow: `inset 0 0 0 1px ${ringTrackColor}, 0 6px 12px ${ringGlowColor}`
  };
  const currentQuestMonsterCoreStyle = {
    borderColor: ringInnerBorderColor
  };
  const dueCardStyle = {
    borderColor: dueCardBorderColor,
    background: dueCardBackgroundColor
  };
  const dueCardValueStyle = {
    color: dueCardTextColor
  };

  const handleTaskMenuAction = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    action();
    const detailsElement = event.currentTarget.closest("details");
    if (detailsElement) {
      detailsElement.removeAttribute("open");
    }
  };

  const clearDragState = () => {
    setDraggingMissionId(null);
    setDragOverMissionId(null);
  };

  const handleMissionDragStart = (event: DragEvent<HTMLLIElement>, missionId: string, canReorder: boolean) => {
    if (!canReorder) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", missionId);
    setDraggingMissionId(missionId);
    setDragOverMissionId(null);
  };

  const handleMissionDragOver = (
    event: DragEvent<HTMLLIElement>,
    targetMissionId: string,
    targetCanAcceptDrop: boolean
  ) => {
    if (!draggingMissionId || draggingMissionId === targetMissionId || !targetCanAcceptDrop) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverMissionId !== targetMissionId) {
      setDragOverMissionId(targetMissionId);
    }
  };

  const handleMissionDrop = (
    event: DragEvent<HTMLLIElement>,
    taskId: string,
    targetMissionId: string,
    targetCanAcceptDrop: boolean
  ) => {
    if (!targetCanAcceptDrop) {
      clearDragState();
      return;
    }
    event.preventDefault();
    const draggedMissionId = draggingMissionId || event.dataTransfer.getData("text/plain");
    if (!draggedMissionId || draggedMissionId === targetMissionId) {
      clearDragState();
      return;
    }
    onReorderTaskMissions(taskId, draggedMissionId, targetMissionId);
    clearDragState();
  };

  return (
    <>
      <section className={getClassName("currentMissionCard")}>
        <header className={getClassName("currentQuestHeader")}>
          <p className={getClassName("sectionLabel")}>{`퀘스트: ${currentQuestTitle}`}</p>
        </header>

        {homeMission ? (
          <>
            <div className={getClassName("currentQuestMainGrid")}>
              <div className={getClassName("currentQuestTitleBlock")}>
                <h2>{homeMission.action}</h2>
              </div>
              <p className={getClassName("timerValue")}>{formatClock(homeRemaining)}</p>
              <div className={getClassName("currentQuestMonsterWrap")}>
                <div
                  className={getClassName("currentQuestMonsterRing")}
                  style={currentQuestMonsterRingStyle}
                  aria-label={`퀘스트 에너지 ${energyPercent}%`}
                >
                  <div className={getClassName("currentQuestMonsterCore")} style={currentQuestMonsterCoreStyle}>
                    <span className={getClassName("currentQuestMonster")} aria-hidden="true">{currentQuestMonsterIcon}</span>
                    <span className={getClassName("currentQuestMonsterPercent")}>{`${energyPercent}%`}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={getClassName("currentQuestInfoGrid")}>
              <p className={getClassName("currentQuestInfoItem")}>
                <span className={getClassName("currentQuestInfoLabel")}>
                  <span className={getClassName("currentQuestInfoIcon")} aria-hidden="true">⏱</span>
                  예상소요시간
                </span>
                <strong className={getClassName("currentQuestInfoValue")}>{expectedDurationText}</strong>
              </p>
              <p className={getClassName("currentQuestInfoItem")} style={dueCardStyle}>
                <span className={getClassName("currentQuestInfoLabel")} style={dueCardValueStyle}>
                  <span className={getClassName("currentQuestInfoIcon")} aria-hidden="true">📅</span>
                  마감시간
                </span>
                <strong className={getClassName("currentQuestInfoValue")} style={dueCardValueStyle}>{dueAtText}</strong>
              </p>
              <p className={getClassName("currentQuestInfoItem")}>
                <span className={getClassName("currentQuestInfoLabel")}>
                  <span className={getClassName("currentQuestInfoIcon")} aria-hidden="true">🔥</span>
                  마감까지
                </span>
                <strong className={getClassName("currentQuestInfoValue")}>{dueRemainingText}</strong>
              </p>
            </div>

            <div className={getClassName("actionRow")}>
              <MissionPrimaryActions
                styles={styles}
                mission={homeMission}
                onStartMission={onStartMission}
                onPauseMission={onPauseMission}
                onCompleteMission={onCompleteMission}
                startButtonClassKey="primaryButton"
                pauseButtonClassKey="ghostButton"
                completeButtonClassKey="successButton"
              />
            </div>

            {homeMission.status === "running" ? (
              <MissionQuickAdjustActions
                styles={styles}
                onAdjustRunningMissionMinutes={onAdjustRunningMissionMinutes}
                canAdjustMinusFive={canAdjustMinusFive}
                canAdjustMinusOne={canAdjustMinusOne}
                canAdjustPlusOne={canAdjustPlusOne}
                canAdjustPlusFive={canAdjustPlusFive}
              />
            ) : null}

            <section className={getClassName("nextMissionSection")} aria-label="다음 미션">
              <p className={getClassName("nextMissionTitle")}>다음 미션</p>
              {nextActionableMissions.length > 0 ? (
                <ol className={getClassName("nextMissionList")}>
                  {nextActionableMissions.map((mission) => (
                    <li key={mission.id} className={getClassName("nextMissionItem")}>
                      <span className={getClassName("nextMissionLead")}>
                        <span className={getClassName("nextMissionIcon")} aria-hidden="true">{resolveMissionIcon(mission.iconKey)}</span>
                        <span className={getClassName("nextMissionContent")}>
                          <span className={getClassName("nextMissionAction")}>{mission.action}</span>
                          <span className={getClassName("nextMissionMeta")}>{mission.estMinutes}분</span>
                        </span>
                      </span>
                      <span className={getClassName("nextMissionButtons")}>
                        <button
                          type="button"
                          className={joinClassNames(getClassName("smallButton"), getClassName("missionIconButton"))}
                          onClick={() => onEditMission(mission)}
                          disabled={isExecutionLocked}
                          aria-label="미션 수정"
                          title="미션 수정"
                        >
                          <span aria-hidden="true">✏️</span>
                        </button>
                        <button
                          type="button"
                          className={joinClassNames(getClassName("smallButtonDanger"), getClassName("missionIconButton"))}
                          onClick={() => onDeleteMission(mission)}
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
                <p className={getClassName("nextMissionEmpty")}>현재 미션 이후의 미션이 없습니다.</p>
              )}
            </section>
            <RecoveryActions
              styles={styles}
              mission={homeMission}
              onRemission={onRemission}
              onReschedule={onReschedule}
            />
            <p className={getClassName("vibrationHint")}>⏰ 5분마다 미세 진동 알림</p>
          </>
        ) : (
          <p className={getClassName("helperText")}>입력창에서 할 일을 넣고 첫 미션를 만들어보세요.</p>
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
            const orderedVisibleTaskMissions = orderMissions(
              missions.filter((mission) => mission.taskId === task.id && mission.status !== "archived")
            );
            const actionableTaskMissions = orderedVisibleTaskMissions.filter((mission) => isActionableMissionStatus(mission.status));
            const openMissions = actionableTaskMissions.length;
            const isExpanded = expandedHomeTaskId === task.id;
            const estimatedMinutes = actionableTaskMissions.reduce((total, mission) => total + mission.estMinutes, 0);

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
                    aria-controls={`home-task-missions-${task.id}`}
                  >
                    <span className={getClassName("homeTaskMonster")} aria-hidden="true">
                      {resolveTaskIcon(task, openMissions)}
                    </span>
                    <span className={getClassName("homeTaskMain")}>
                      <span className={getClassName("homeTaskTitleRow")}>
                        <span className={getClassName("homeTaskTitle")}>{task.title}</span>
                        <strong className={getClassName("homeTaskRemaining")}>{openMissions}개 남음</strong>
                      </span>
                      <span className={getClassName("homeTaskMetaRow")}>
                        <span className={getClassName("homeTaskMetaItem")}>
                          <span className={getClassName("homeTaskMetaIcon")} aria-hidden="true">🕒</span>
                          <span className={getClassName("homeTaskMetaValue")}>{formatScheduledStartTime(task.scheduledFor)} 시작</span>
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
                  <details className={getClassName("homeTaskMenu")}>
                    <summary className={getClassName("homeTaskMenuTrigger")} aria-label="퀘스트 메뉴">
                      ⋯
                    </summary>
                    <div className={getClassName("homeTaskMenuPanel")}>
                      <button
                        type="button"
                        className={joinClassNames(getClassName("smallButton"), getClassName("homeTaskMenuItem"))}
                        onClick={(event) => handleTaskMenuAction(event, () => onEditTaskTotalMinutes(task))}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className={joinClassNames(getClassName("smallButtonDanger"), getClassName("homeTaskMenuItemDanger"))}
                        onClick={(event) => handleTaskMenuAction(event, () => onDeleteTask(task))}
                      >
                        삭제
                      </button>
                    </div>
                  </details>
                </div>
                {isExpanded ? (
                  <ul id={`home-task-missions-${task.id}`} className={getClassName("homeTaskMissionList")}>
                    {orderedVisibleTaskMissions.length === 0 ? (
                      <li className={getClassName("homeTaskMissionEmpty")}>미션가 없습니다.</li>
                    ) : null}
                    {orderedVisibleTaskMissions.map((mission) => {
                      const isMissionReorderable = isReorderableMissionStatus(mission.status);
                      const isDragging = draggingMissionId === mission.id;
                      const isDragOver = dragOverMissionId === mission.id && draggingMissionId !== mission.id && isMissionReorderable;
                      return (
                        <li
                          key={mission.id}
                          className={joinClassNames(
                            getClassName("homeTaskMissionRow"),
                            isMissionReorderable ? getClassName("homeTaskMissionDraggable") : getClassName("homeTaskMissionLocked"),
                            mission.status === "done" ? getClassName("homeTaskMissionDone") : undefined,
                            isDragging ? getClassName("homeTaskMissionDragging") : undefined,
                            isDragOver ? getClassName("homeTaskMissionDragOver") : undefined
                          )}
                          draggable={isMissionReorderable}
                          onDragStart={(event) => handleMissionDragStart(event, mission.id, isMissionReorderable)}
                          onDragOver={(event) => handleMissionDragOver(event, mission.id, isMissionReorderable)}
                          onDrop={(event) => handleMissionDrop(event, task.id, mission.id, isMissionReorderable)}
                          onDragEnd={clearDragState}
                        >
                          <span className={getClassName("homeTaskMissionDragHandle")} aria-hidden="true">⠿</span>
                          <span className={getClassName("homeTaskMissionBody")}>
                            <span className={getClassName("homeTaskMissionAction")}>{mission.action}</span>
                            <span className={getClassName("homeTaskMissionInfo")}>
                              {`${mission.estMinutes}분 · ${missionStatusLabel(mission.status)}`}
                            </span>
                          </span>
                          <span className={getClassName("homeTaskMissionButtons")}>
                            <button
                              type="button"
                              className={joinClassNames(getClassName("smallButton"), getClassName("missionIconButton"))}
                              onClick={() => onEditMission(mission)}
                              disabled={isExecutionLocked}
                              aria-label="미션 수정"
                              title="미션 수정"
                            >
                              <span aria-hidden="true">✏️</span>
                            </button>
                            <button
                              type="button"
                              className={joinClassNames(getClassName("smallButtonDanger"), getClassName("missionIconButton"))}
                              onClick={() => onDeleteMission(mission)}
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
