import { calculateDeadlineProgress } from "@/lib/deadline";
import type { TaskItem, TaskRunState } from "@/types/task";

export type TaskActionIcon = "play" | "check" | "reset";

interface TaskActionUi {
  ariaLabel: string;
  icon: TaskActionIcon;
  stateClass: string;
}

export function isTaskCompleted(task: TaskItem): boolean {
  return task.runState === "COMPLETED";
}

export function isTaskRunning(task: TaskItem): boolean {
  return task.runState === "RUNNING";
}

export function getTaskProgressPercent(task: TaskItem, now: Date): number {
  if (task.runState === "COMPLETED") {
    return 100;
  }
  if (task.runState === "READY" || !task.startedAt) {
    return 0;
  }
  const startedAt = new Date(task.startedAt);
  const dueAt = new Date(task.dueAt);
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(dueAt.getTime())) {
    return 0;
  }
  return calculateDeadlineProgress(now, startedAt, dueAt);
}

export function getTaskRemainingPercent(task: TaskItem, now: Date): number {
  if (task.runState === "COMPLETED") {
    return 100;
  }
  if (task.runState === "READY") {
    return 0;
  }
  return Math.max(0, 100 - getTaskProgressPercent(task, now));
}

export function cycleTaskRunState(task: TaskItem, nowIso: string): TaskItem {
  if (task.runState === "READY") {
    return {
      ...task,
      runState: "RUNNING",
      startedAt: nowIso
    };
  }
  if (task.runState === "RUNNING") {
    return {
      ...task,
      runState: "COMPLETED"
    };
  }
  return {
    ...task,
    runState: "READY",
    startedAt: null
  };
}

export function getTaskActionUi(runState: TaskRunState): TaskActionUi {
  if (runState === "READY") {
    return {
      ariaLabel: "일정 시작",
      icon: "play",
      stateClass: "is-ready"
    };
  }
  if (runState === "RUNNING") {
    return {
      ariaLabel: "일정 완료 처리",
      icon: "check",
      stateClass: "is-running"
    };
  }
  return {
    ariaLabel: "시작대기로 리셋",
    icon: "reset",
    stateClass: "is-completed"
  };
}
