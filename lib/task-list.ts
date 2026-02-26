import type {
  Importance,
  TaskImportanceFilter,
  TaskItem,
  TaskRunState,
  TaskSortOption
} from "@/types/task";

interface TaskListParams {
  importanceFilter: TaskImportanceFilter;
  sortOption: TaskSortOption;
}

const importanceRank: Record<Importance, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};

const runStateRank: Record<TaskRunState, number> = {
  RUNNING: 0,
  READY: 1,
  COMPLETED: 2
};

function applyDomainSort(a: TaskItem, b: TaskItem, sortOption: TaskSortOption): number {
  if (sortOption === "importance") {
    const rankGap = importanceRank[a.importance] - importanceRank[b.importance];
    if (rankGap !== 0) {
      return rankGap;
    }
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  }

  return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
}

export function getVisibleTasks(tasks: TaskItem[], params: TaskListParams): TaskItem[] {
  return tasks
    .filter((task) => {
      const due = new Date(task.dueAt);
      if (Number.isNaN(due.getTime())) {
        return false;
      }

      if (params.importanceFilter !== "ALL" && task.importance !== params.importanceFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const runStateGap = runStateRank[a.runState] - runStateRank[b.runState];
      if (runStateGap !== 0) {
        return runStateGap;
      }
      return applyDomainSort(a, b, params.sortOption);
    });
}
