export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type ChunkStatus = "todo" | "running" | "paused" | "done" | "abandoned" | "archived";
export type TimerSessionState = "running" | "paused" | "ended";
export type EventSource = "local" | "ai" | "system" | "user";

export type EventName =
  | "task_created"
  | "chunk_generated"
  | "chunk_started"
  | "chunk_paused"
  | "chunk_completed"
  | "chunk_abandoned"
  | "rechunk_requested"
  | "reschedule_requested"
  | "task_rescheduled"
  | "chunk_time_adjusted"
  | "task_time_updated"
  | "xp_gained"
  | "level_up"
  | "haptic_fired"
  | "safety_blocked";

export const TASK_SUMMARY_MAX_LENGTH = 60;
export const MIN_TASK_TOTAL_MINUTES = 10;
export const MAX_TASK_TOTAL_MINUTES = 480;
export const MIN_CHUNK_EST_MINUTES = 2;
export const MAX_CHUNK_EST_MINUTES = 15;
export const RECOMMENDED_MIN_CHUNK_COUNT = 5;
export const RECOMMENDED_MAX_CHUNK_COUNT = 12;

export interface Task {
  id: string;
  title: string;
  summary?: string;
  totalMinutes: number;
  createdAt: string;
  scheduledFor?: string;
  startedAt?: string;
  dueAt?: string;
  completedAt?: string;
  status: TaskStatus;
}

export interface Chunk {
  id: string;
  taskId: string;
  order: number;
  action: string;
  estMinutes: number;
  status: ChunkStatus;
  startedAt?: string;
  completedAt?: string;
  actualSeconds?: number;
  parentChunkId?: string;
  rescheduledFor?: string;
}

export interface TimerSession {
  id: string;
  chunkId: string;
  state: TimerSessionState;
  startedAt: string;
  pausedAt?: string;
  endedAt?: string;
  pauseCount: number;
}

export interface FiveStats {
  initiation: number;
  focus: number;
  breakdown: number;
  recovery: number;
  consistency: number;
}

export interface StatsState extends FiveStats {
  xp: number;
  level: number;
  todayDateKey: string;
  todayXpGain: number;
  todayCompleted: number;
  todayStatGain: FiveStats;
}

export interface UserSettings {
  hapticEnabled: boolean;
}

export type EventMetaValue = string | number | boolean | null;

export interface AppEvent {
  id: string;
  eventName: EventName;
  timestamp: string;
  sessionId: string;
  source: EventSource;
  taskId: string | null;
  chunkId: string | null;
  meta?: Record<string, EventMetaValue>;
}

export interface ChunkTemplate {
  action: string;
  estMinutes: number;
  difficulty: number;
  notes: string;
}

export interface ChunkingResult {
  taskId: string;
  title: string;
  context: string;
  chunks: Array<{
    chunkId: string;
    order: number;
    action: string;
    estMinutes: number;
    difficulty: number;
    notes: string;
  }>;
  safety: {
    requiresCaution: boolean;
    notes: string;
  };
}

export interface PersistedState {
  tasks: Task[];
  chunks: Chunk[];
  timerSessions: TimerSession[];
  stats: StatsState;
  settings: UserSettings;
  events: AppEvent[];
  activeTaskId: string | null;
  activeTab: "home" | "tasks" | "stats" | "settings";
  remainingSecondsByChunk: Record<string, number>;
}
