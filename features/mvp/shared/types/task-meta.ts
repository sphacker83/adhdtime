export type TaskMetaField = "totalMinutes" | "scheduledFor" | "dueAt";

export type TaskMetaInputs = {
  totalMinutesInput: string;
  scheduledForInput: string;
  dueAtInput: string;
};

export const TASK_META_PAIR_PRIORITY: Record<TaskMetaField, TaskMetaField[]> = {
  totalMinutes: ["scheduledFor", "dueAt"],
  scheduledFor: ["totalMinutes", "dueAt"],
  dueAt: ["totalMinutes", "scheduledFor"]
};
