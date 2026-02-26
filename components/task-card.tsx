import React from "react";
import {
  calculateDeadlineProgress,
  formatTimeToDeadline,
  isOverdue,
  resolveProgressColor
} from "@/lib/deadline";
import { DeadlineProgressBar } from "@/components/deadline-progress-bar";
import type { Importance, TaskItem } from "@/types/task";

interface TaskCardProps {
  task: TaskItem;
  now: Date;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
}

function importanceLabel(importance: Importance): string {
  if (importance === "HIGH") {
    return "높음";
  }
  if (importance === "MEDIUM") {
    return "중간";
  }
  return "낮음";
}

function toTimeLabel(value: string): string {
  const date = new Date(value);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function TaskCard({ task, now, selected, onSelect, onToggleComplete, onEdit, onDelete }: TaskCardProps) {
  const createdAt = new Date(task.createdAt);
  const dueAt = new Date(task.dueAt);
  const progress = calculateDeadlineProgress(now, createdAt, dueAt);
  const overdue = isOverdue(now, dueAt);
  const tone = resolveProgressColor(progress, overdue);
  const deadlineText = formatTimeToDeadline(now, dueAt);

  return (
    <article className={selected ? "task-card selected" : "task-card"}>
      <header className="task-header">
        <button type="button" className="task-title-btn" onClick={() => onSelect(task.id)}>
          <strong>{task.title}</strong>
        </button>
        <div className="task-header-actions">
          <span className={`importance-badge importance-${task.importance.toLowerCase()}`}>
            중요도 {importanceLabel(task.importance)}
          </span>
          <span className="priority-badge">P{task.priority}</span>
        </div>
      </header>

      <p className="task-meta">마감 {toTimeLabel(task.dueAt)}</p>
      <p className={overdue ? "task-deadline overdue" : "task-deadline"}>{deadlineText}</p>
      <DeadlineProgressBar progress={progress} tone={tone} />

      <footer className="task-footer">
        <button type="button" className="ghost-btn" onClick={() => onToggleComplete(task.id)}>
          {task.completed ? "미완료로" : "완료"}
        </button>
        <button type="button" className="ghost-btn" onClick={() => onEdit(task)}>
          편집
        </button>
        <button type="button" className="danger-btn" onClick={() => onDelete(task.id)}>
          삭제
        </button>
      </footer>
    </article>
  );
}
