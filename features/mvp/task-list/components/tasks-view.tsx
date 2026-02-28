import {
  missionStatusLabel,
  formatClock,
  formatOptionalDateTime,
  isActionableMissionStatus,
  taskStatusLabel
} from "@/features/mvp/shared";
import { MissionPrimaryActions } from "@/features/mvp/timer-runtime";
import type { Mission, Task } from "@/features/mvp/types/domain";

type CssModuleClassMap = Readonly<Record<string, string>>;

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function formatScheduledStartTime(isoValue?: string): string {
  if (!isoValue) {
    return "--:--";
  }

  return formatOptionalDateTime(isoValue);
}

export interface TasksViewProps {
  styles: CssModuleClassMap;
  tasks: Task[];
  activeTask: Task | null;
  activeTaskId: string | null;
  activeTaskBudgetUsage: number;
  activeTaskMissions: Mission[];
  currentMissionId: string | null;
  remainingSecondsByMission: Record<string, number>;
  isExecutionLocked: boolean;
  onSetActiveTaskId: (taskId: string) => void;
  onEditTaskTotalMinutes: (task: Task) => void;
  onStartMission: (missionId: string) => void;
  onPauseMission: (missionId: string) => void;
  onCompleteMission: (missionId: string) => void;
  onEditMission: (mission: Mission) => void;
  onDeleteMission: (mission: Mission) => void;
}

export function TasksView({
  styles,
  tasks,
  activeTask,
  activeTaskId,
  activeTaskBudgetUsage,
  activeTaskMissions,
  currentMissionId,
  remainingSecondsByMission,
  isExecutionLocked,
  onSetActiveTaskId,
  onEditTaskTotalMinutes,
  onStartMission,
  onPauseMission,
  onCompleteMission,
  onEditMission,
  onDeleteMission
}: TasksViewProps) {
  const getClassName = (classKey: string) => styles[classKey] ?? "";
  const currentMission =
    activeTaskMissions.find((mission) => mission.id === currentMissionId && isActionableMissionStatus(mission.status))
    ?? activeTaskMissions.find((mission) => isActionableMissionStatus(mission.status))
    ?? null;

  return (
    <section className={getClassName("listCard")}>
      <header className={getClassName("listHeader")}>
        <h3>미션 목록</h3>
        <p>{activeTask ? activeTask.title : "과업을 선택하세요"}</p>
      </header>
      {activeTask ? (
        <div className={getClassName("taskBudgetRow")}>
          <p className={getClassName("helperText")}>
            총 {activeTask.totalMinutes}분 · 미션 합계 {activeTaskBudgetUsage}분 · 상태 {taskStatusLabel(activeTask.status)}
            {" "}· 시작 예정 {formatScheduledStartTime(activeTask.scheduledFor)} · 마감 {formatOptionalDateTime(activeTask.dueAt)}
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

      <ul className={getClassName("missionList")}>
        {activeTaskMissions.length === 0 ? <li className={getClassName("emptyRow")}>선택된 과업의 미션가 없습니다.</li> : null}
        {activeTaskMissions.map((mission) => {
          const remaining = remainingSecondsByMission[mission.id] ?? mission.estMinutes * 60;
          return (
            <li
              key={mission.id}
              className={joinClassNames(
                getClassName("missionItem"),
                currentMission?.id === mission.id ? getClassName("missionItemCurrent") : undefined
              )}
            >
              <div>
                <p className={getClassName("missionOrder")}>#{mission.order}</p>
                <h4>{mission.action}</h4>
                <p className={getClassName("missionInfo")}>
                  {mission.estMinutes}분 · {formatClock(remaining)} · {missionStatusLabel(mission.status)}
                </p>
              </div>
              <div className={getClassName("missionButtons")}>
                <MissionPrimaryActions
                  styles={styles}
                  mission={mission}
                  onStartMission={onStartMission}
                  onPauseMission={onPauseMission}
                  onCompleteMission={onCompleteMission}
                  startButtonClassKey="smallButton"
                  pauseButtonClassKey="smallButton"
                  completeButtonClassKey="smallButton"
                />
                <button
                  type="button"
                  className={getClassName("smallButton")}
                  onClick={() => onEditMission(mission)}
                  disabled={isExecutionLocked}
                >
                  수정
                </button>
                <button
                  type="button"
                  className={getClassName("smallButtonDanger")}
                  onClick={() => onDeleteMission(mission)}
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
