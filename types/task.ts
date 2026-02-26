export type Importance = "HIGH" | "MEDIUM" | "LOW";

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  importance: Importance;
  priority: number;
  createdAt: string;
  dueAt: string;
  completed: boolean;
}
