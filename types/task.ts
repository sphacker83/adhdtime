export type Importance = "HIGH" | "MEDIUM" | "LOW";
export type TaskImportanceFilter = "ALL" | Importance;
export type TaskSortOption = "dueAt" | "importance";
export type TaskRunState = "READY" | "RUNNING" | "COMPLETED";

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  importance: Importance;
  createdAt: string;
  startedAt: string | null;
  dueAt: string;
  runState: TaskRunState;
}
