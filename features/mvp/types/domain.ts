export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type MissionStatus = "todo" | "running" | "paused" | "done" | "abandoned" | "archived";
export type TimerSessionState = "running" | "paused" | "ended";
export type EventSource = "local" | "ai" | "system" | "user";
export type MissionIconKey = string;
export type StatKey = "initiation" | "focus" | "breakdown" | "recovery" | "consistency";
export type RankTier = string;

export type EventName =
  | "task_created"
  | "mission_generated"
  | "mission_started"
  | "mission_paused"
  | "mission_completed"
  | "mission_abandoned"
  | "remission_requested"
  | "reschedule_requested"
  | "task_rescheduled"
  | "mission_time_adjusted"
  | "task_time_updated"
  | "xp_gained"
  | "level_up"
  | "rank_promoted"
  | "character_rank_changed"
  | "haptic_fired"
  | "safety_blocked";

export const TASK_SUMMARY_MAX_LENGTH = 60;
export const MIN_TASK_TOTAL_MINUTES = 10;
export const MAX_TASK_TOTAL_MINUTES = 480;
export const MIN_MISSION_EST_MINUTES = 1;
export const MAX_MISSION_EST_MINUTES = 15;
export const RECOMMENDED_MIN_MISSION_COUNT = 5;
export const RECOMMENDED_MAX_MISSION_COUNT = 12;

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

export interface Mission {
  id: string;
  taskId: string;
  order: number;
  action: string;
  estMinutes: number;
  status: MissionStatus;
  iconKey?: MissionIconKey;
  startedAt?: string;
  completedAt?: string;
  actualSeconds?: number;
  parentMissionId?: string;
  rescheduledFor?: string;
}

export interface TimerSession {
  id: string;
  missionId: string;
  state: TimerSessionState;
  startedAt: string;
  pausedAt?: string;
  endedAt?: string;
  pauseCount: number;
}

export interface StatRankProgress {
  rank: RankTier;
  totalScore: number;
  displayScore: number;
  carry: number;
}

export type StatRankState = Record<StatKey, StatRankProgress>;

export interface CharacterRankState {
  rank: RankTier;
  bandIndex: number;
  minScoreInBand: number;
}

export interface StatsState {
  axp: number;
  accountLevel: number;
  todayDateKey: string;
  todayAxpGain: number;
  todaySgpGain: number;
  todayCompleted: number;
  statRanks: StatRankState;
  characterRank: CharacterRankState;
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
  missionId: string | null;
  meta?: Record<string, EventMetaValue>;
}

export interface MissionTemplate {
  action: string;
  estMinutes: number;
  difficulty: number;
  notes: string;
  iconKey?: MissionIconKey;
}

export interface MissionDraft {
  missionId: string;
  order: number;
  action: string;
  estMinutes: number;
  difficulty: number;
  notes: string;
  iconKey?: MissionIconKey;
}

export interface MissioningResult {
  taskId: string;
  title: string;
  context: string;
  missions: MissionDraft[];
  safety: {
    requiresCaution: boolean;
    notes: string;
  };
}

export interface PersistedState {
  tasks: Task[];
  missions: Mission[];
  timerSessions: TimerSession[];
  stats: StatsState;
  settings: UserSettings;
  events: AppEvent[];
  activeTaskId: string | null;
  activeTab: "home" | "tasks" | "stats" | "settings";
  remainingSecondsByMission: Record<string, number>;
}
