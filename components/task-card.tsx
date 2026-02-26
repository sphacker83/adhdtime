import React from "react";
import {
  formatHourMinuteApprox,
  formatDDayLabel,
  formatDueDateLabel
} from "@/lib/deadline";
import { DeadlineProgressBar } from "@/components/deadline-progress-bar";
import {
  getTaskActionUi,
  getTaskRemainingPercent,
  type TaskActionIcon
} from "@/lib/task-state";
import {
  CheckIcon,
  ImportanceHighIcon,
  ImportanceLowIcon,
  ImportanceMediumIcon,
  PencilSquareIcon,
  PlayIcon,
  RotateCcwIcon,
  SparklesIcon,
  TrashIcon
} from "@/components/ui-icons";
import type { Importance, TaskItem } from "@/types/task";

interface TaskCardProps {
  task: TaskItem;
  now: Date;
  selected: boolean;
  onSelect: (id: string) => void;
  onCycleRunState: (id: string) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
}

function ImportanceIcon({ importance }: { importance: Importance }) {
  if (importance === "HIGH") {
    return <ImportanceHighIcon className="ui-icon" />;
  }
  if (importance === "MEDIUM") {
    return <ImportanceMediumIcon className="ui-icon" />;
  }
  return <ImportanceLowIcon className="ui-icon" />;
}

function TaskActionIconSvg({ icon }: { icon: TaskActionIcon }) {
  if (icon === "play") {
    return <PlayIcon className="task-action-icon" />;
  }
  if (icon === "check") {
    return <CheckIcon className="task-action-icon" />;
  }
  return <RotateCcwIcon className="task-action-icon" />;
}

export function TaskCard({
  task,
  now,
  selected,
  onSelect,
  onCycleRunState,
  onEdit,
  onDelete
}: TaskCardProps) {
  const dueAt = new Date(task.dueAt);
  const progressPercent = getTaskRemainingPercent(task, now);
  const dueLabel = formatDueDateLabel(now, dueAt);
  const dDayLabel = formatDDayLabel(now, dueAt);
  const remainingMs = Math.max(0, dueAt.getTime() - now.getTime());
  const remainingClock = formatHourMinuteApprox(remainingMs);
  const actionUi = getTaskActionUi(task.runState);

  const handleDelete = () => {
    const ok = window.confirm("이 일정을 삭제할까요?");
    if (ok) {
      onDelete(task.id);
    }
  };

  return (
    <article className={selected ? "task-card selected" : "task-card"}>
      <header className="task-header">
        <button type="button" className="task-title-btn" onClick={() => onSelect(task.id)}>
          <span className="task-title-main">
            <span className={`task-importance-icon ${task.importance.toLowerCase()}`} aria-hidden="true">
              <ImportanceIcon importance={task.importance} />
            </span>
            <strong>{task.title}</strong>
          </span>
        </button>
        <div className="task-header-actions">
          <button type="button" className="icon-btn subtle small edit" onClick={() => onEdit(task)} aria-label="일정 편집">
            <PencilSquareIcon className="ui-icon" />
          </button>
          <button type="button" className="icon-btn subtle small danger" onClick={handleDelete} aria-label="일정 삭제">
            <TrashIcon className="ui-icon" />
          </button>
        </div>
      </header>

      <div className="task-due-row">
        <p className="task-due-text">
          {dueLabel} · {dDayLabel}
        </p>
        <p className={`task-remaining-inline ${task.runState === "COMPLETED" ? "is-complete" : ""}`}>
          {task.runState === "COMPLETED" ? (
            <span className="task-complete-reward">
              <SparklesIcon className="ui-icon" />
              <strong>Complete</strong>
              <SparklesIcon className="ui-icon" />
            </span>
          ) : (
            remainingClock
          )}
        </p>
      </div>

      <div className="task-progress-row">
        <button
          type="button"
          className={`task-complete-btn ${actionUi.stateClass}`}
          onClick={() => onCycleRunState(task.id)}
          aria-label={actionUi.ariaLabel}
          aria-pressed={task.runState === "RUNNING"}
        >
          <TaskActionIconSvg icon={actionUi.icon} />
        </button>
        <div className="task-progress-wrap">
          <DeadlineProgressBar progress={progressPercent} runState={task.runState} />
        </div>
      </div>
    </article>
  );
}
