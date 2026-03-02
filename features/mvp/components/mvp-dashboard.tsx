"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  enforceMissionBudget,
  generateLocalMissioning,
  isWithinTaskMissionBudget,
  mapMissioningResultToMissions,
  rankLocalPresetCandidates,
  sumMissionEstMinutes
} from "@/features/mvp/lib/missioning";
import { appendEvent, createEvent } from "@/features/mvp/lib/events";
import { computeMvpKpis } from "@/features/mvp/lib/kpi";
import {
  applyCharacterRankPromotion,
  applyMissionCompletionReward,
  applyRecoveryReward
} from "@/features/mvp/lib/reward";
import {
  computeCharacterRank,
  createInitialStatRanks,
  syncDisplayScores
} from "@/features/mvp/lib/rank";
import {
  canShowNotification,
  createSttRecognition,
  createSyncMockAdapter,
  getNotificationCapability,
  getSttCapability,
  requestNotificationPermission,
  type ExternalSyncConflict,
  type ExternalSyncJobStatus,
  type NotificationCapability,
  type NotificationPermissionState,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
  type SttCapability,
  type SyncMockOutcome
} from "@/features/mvp/integrations";
import { SettingsView } from "@/features/mvp/settings";
import { useMvpStore } from "@/features/mvp/shell/hooks/use-mvp-store";
import {
  selectActiveTask,
  selectActiveTaskMissions,
  selectCompletionRate,
  selectHomeMission,
  selectHomeRemaining,
  selectHomeTask,
  selectRunningMission
} from "@/features/mvp/shell/model/core-state";
import { StatsView } from "@/features/mvp/stats";
import {
  STAT_META,
  TASK_META_PAIR_PRIORITY,
  addMinutesToDate,
  applyDueOnlyScheduleOverride,
  buildNextRescheduleDate,
  buildRadarShape,
  getTaskMetaConstraintFeedback,
  getTaskBudgetUsage,
  getTaskBudgetedMissions,
  getDiffMinutes,
  isActionableMissionStatus,
  isTaskClosedStatus,
  isTaskTotalMinutesInRange,
  normalizeTaskScheduleFromLocalInputs,
  normalizeTaskScheduleIso,
  orderMissions,
  formatDateTime,
  formatDateTimeLocalInput,
  getXpProgressPercent,
  parseDateTimeLocalInput,
  parseLooseMinuteInput,
  parseTaskTotalMinutesInput,
  reorderTaskMissionsKeepingLocked,
  withReorderedTaskMissions,
  buildTaskSummary,
  type TaskMetaField,
  type TaskMetaInputs
} from "@/features/mvp/shared";
import {
  applyElapsedToMissionRemaining,
  applyElapsedWindow,
  createTimerElapsedAccumulator
} from "@/features/mvp/lib/timer-accuracy";
import { TaskInputSection } from "@/features/mvp/task-input";
import { HomeView, TasksView } from "@/features/mvp/task-list";
import {
  MAX_MISSION_EST_MINUTES,
  MAX_TASK_TOTAL_MINUTES,
  MIN_MISSION_EST_MINUTES,
  MIN_TASK_TOTAL_MINUTES,
  type AppEvent,
  type EventSource,
  type Mission,
  type Task,
  type TimerSession
} from "@/features/mvp/types/domain";
import styles from "./mvp-dashboard.module.css";

const TAB_ITEMS = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "tasks", label: "할 일", icon: "🗒️" },
  { key: "stats", label: "스탯", icon: "📊" },
  { key: "settings", label: "설정", icon: "⚙️" }
] as const;
const LEFT_TAB_ITEMS = TAB_ITEMS.slice(0, 2);
const RIGHT_TAB_ITEMS = TAB_ITEMS.slice(2);

const RISKY_INPUT_PATTERN = /(자해|죽고\s?싶|폭탄|불법|마약|살인|테러)/i;

const DEFAULT_TASK_TOTAL_MINUTES = 60;
const ROLLING_TIP_INTERVAL_MS = 5000;
const TOAST_AUTO_DISMISS_MS = 3600;
const RANK_UP_CTA_PULSE_MS = 900;
const RADAR_LABEL_CENTER_PERCENT = 50;
const RADAR_LABEL_RADIUS_PERCENT = 42;
const RECENT_RADAR_WINDOW_DAYS = 7;
const RECENT_RADAR_WINDOW_MS = RECENT_RADAR_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const ROLLING_TIPS = [
  "작게 시작하면 꾸준함이 쉬워져요.",
  "미션은 5~15분 단위로 더 잘 굴러갑니다.",
  "완벽보다 완료가 오늘의 우선순위예요.",
  "먼저 1단계만 실행해도 흐름이 생겨요.",
  "집중이 깨지면 회복 미션으로 다시 붙잡아요.",
  "마감이 보이면 지금 할 1개만 고르세요."
] as const;
const FEEDBACK_TOAST_ERROR_PATTERN =
  /(오류|에러|실패|취소|초과|불가|차단|찾을\s*수\s*없|수\s*없(?:습니다)?|검증|문제|이상이어야|잠그)/i;

const RECOVERY_FEEDBACK = {
  safetyBlocked: "괜찮아요. 안전을 위해 이 입력은 청킹하지 않았어요. 안전한 할 일로 다시 입력해 주세요.",
  remissioned: "괜찮아요. 더 작은 단계로 다시 나눴어요. 첫 단계부터 이어가요.",
  rescheduled: "괜찮아요. 내일로 다시 등록했어요. 바로 시작할 미션를 준비해뒀어요."
} as const;

type RankBandKey = "F" | "E" | "D" | "C" | "B" | "A" | "S";

const RANK_BAND_PALETTE: Record<RankBandKey, { base: string; fill: string }> = {
  F: { base: "#6b7280", fill: "rgba(107, 114, 128, 0.32)" },
  E: { base: "#5567c9", fill: "rgba(85, 103, 201, 0.32)" },
  D: { base: "#3f7fdd", fill: "rgba(63, 127, 221, 0.32)" },
  C: { base: "#2e9c97", fill: "rgba(46, 156, 151, 0.32)" },
  B: { base: "#2f9f59", fill: "rgba(47, 159, 89, 0.32)" },
  A: { base: "#b7802f", fill: "rgba(183, 128, 47, 0.32)" },
  S: { base: "#c24d3a", fill: "rgba(194, 77, 58, 0.32)" }
};

const DEFAULT_NOTIFICATION_CAPABILITY: NotificationCapability = {
  supported: false,
  secureContext: false,
  permission: "unsupported",
  canRequestPermission: false
};

const DEFAULT_STT_CAPABILITY: SttCapability = {
  supported: false,
  secureContext: false,
  engine: "unsupported",
  canStartRecognition: false
};

const SYNC_STATUS_LABEL: Record<ExternalSyncJobStatus, string> = {
  IDLE: "idle",
  QUEUED: "queued",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
  CONFLICT: "conflict"
};

type QuestSuggestion = Pick<
  ReturnType<typeof rankLocalPresetCandidates>[number],
  "id" | "title" | "estimatedTimeMin"
>;
type RankedPresetCandidate = ReturnType<typeof rankLocalPresetCandidates>[number];

const QUEST_SUGGESTION_LIMIT = 5;
const QUEST_CANDIDATE_POOL_SIZE = 20;

type SubmitTaskResult = {
  ok: boolean;
  reason: string;
  message: string;
};

type RewardOutcomeLike =
  | ReturnType<typeof applyMissionCompletionReward>
  | ReturnType<typeof applyRecoveryReward>;

type RankPromotionEntry = {
  statKey: string;
  promotionCount: number;
  fromRank?: string;
  toRank?: string;
};

type StatTotalSnapshot = {
  initiation: number;
  focus: number;
  breakdown: number;
  recovery: number;
  consistency: number;
};

type RewardOutcomeCompat = RewardOutcomeLike;
type MissionCompletionRewardParams = Parameters<typeof applyMissionCompletionReward>[0] & {
  questCompleted?: boolean;
  questMissionCount?: number;
};

function resolveQuestCompletionBonusApplied(reward: RewardOutcomeCompat, questCompleted: boolean): boolean {
  const withBonus = reward as RewardOutcomeCompat & {
    questCompletionBonusApplied?: unknown;
    questCompletedBonusApplied?: unknown;
    questCompletionBonusGranted?: unknown;
  };

  if (typeof withBonus.questCompletionBonusApplied === "boolean") {
    return withBonus.questCompletionBonusApplied;
  }
  if (typeof withBonus.questCompletedBonusApplied === "boolean") {
    return withBonus.questCompletedBonusApplied;
  }
  if (typeof withBonus.questCompletionBonusGranted === "boolean") {
    return withBonus.questCompletionBonusGranted;
  }

  return questCompleted;
}

function deriveNotificationState(capability: NotificationCapability): NotificationPermissionState {
  if (!capability.supported || !capability.secureContext) {
    return "unsupported";
  }

  return capability.permission;
}

function getNotificationFallbackText(state: NotificationPermissionState): string | null {
  if (state === "denied") {
    return "브라우저 설정에서 알림 권한을 허용으로 변경해야 알림을 받을 수 있어요.";
  }

  if (state === "unsupported") {
    return "이 환경은 알림 API를 지원하지 않거나 HTTPS 보안 컨텍스트가 아니어서 알림을 보낼 수 없어요.";
  }

  return null;
}

function getSttSupportState(capability: SttCapability): "supported" | "unsupported" {
  return capability.canStartRecognition ? "supported" : "unsupported";
}

function extractTranscriptBuffers(event: SpeechRecognitionEventLike): {
  finalTranscript: string;
  interimTranscript: string;
} {
  const finalSegments: string[] = [];
  const interimSegments: string[] = [];

  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index];
    if (!result) {
      continue;
    }

    const primary = result[0];
    const transcript = primary?.transcript?.trim();
    if (!transcript) {
      continue;
    }

    if (result.isFinal) {
      finalSegments.push(transcript);
      continue;
    }

    interimSegments.push(transcript);
  }

  return {
    finalTranscript: finalSegments.join(" ").trim(),
    interimTranscript: interimSegments.join(" ").trim()
  };
}

function clampMinuteInput(minutes: number): number {
  return Math.min(
    MAX_MISSION_EST_MINUTES,
    Math.max(MIN_MISSION_EST_MINUTES, Math.floor(minutes))
  );
}

function clampTaskTotalMinutes(totalMinutes: number): number {
  return Math.min(MAX_TASK_TOTAL_MINUTES, Math.max(MIN_TASK_TOTAL_MINUTES, Math.floor(totalMinutes)));
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clampDisplayScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(99, Math.round(value)));
}

function resolveDisplayScore(value: unknown): number {
  if (!value || typeof value !== "object") {
    return 0;
  }

  const withDisplayScore = value as { minScoreInBand?: unknown; displayScore?: unknown; progress?: unknown };
  if (typeof withDisplayScore.minScoreInBand === "number" && Number.isFinite(withDisplayScore.minScoreInBand)) {
    return clampDisplayScore(withDisplayScore.minScoreInBand);
  }

  if (typeof withDisplayScore.displayScore === "number" && Number.isFinite(withDisplayScore.displayScore)) {
    return clampDisplayScore(withDisplayScore.displayScore);
  }

  if (typeof withDisplayScore.progress === "number" && Number.isFinite(withDisplayScore.progress)) {
    return clampDisplayScore(withDisplayScore.progress);
  }

  return 0;
}

function resolveTotalScore(value: unknown): number {
  if (!value || typeof value !== "object") {
    return 0;
  }

  const withTotalScore = value as { totalScore?: unknown };
  if (typeof withTotalScore.totalScore === "number" && Number.isFinite(withTotalScore.totalScore)) {
    return Math.max(0, Math.floor(withTotalScore.totalScore));
  }

  return 0;
}

function resolveMetaTotalScore(meta: AppEvent["meta"], key: string): number | null {
  if (!meta) {
    return null;
  }

  const raw = meta[key];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.floor(raw));
  }

  if (typeof raw === "string" && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return null;
}

function extractStatTotalSnapshot(meta: AppEvent["meta"]): StatTotalSnapshot | null {
  const initiation = resolveMetaTotalScore(meta, "statTotalInitiation");
  const focus = resolveMetaTotalScore(meta, "statTotalFocus");
  const breakdown = resolveMetaTotalScore(meta, "statTotalBreakdown");
  const recovery = resolveMetaTotalScore(meta, "statTotalRecovery");
  const consistency = resolveMetaTotalScore(meta, "statTotalConsistency");

  if (
    initiation === null
    || focus === null
    || breakdown === null
    || recovery === null
    || consistency === null
  ) {
    return null;
  }

  return {
    initiation,
    focus,
    breakdown,
    recovery,
    consistency
  };
}

function restoreStatRanksFromTotalSnapshot(snapshot: StatTotalSnapshot): RewardOutcomeLike["nextStats"]["statRanks"] {
  const restored = createInitialStatRanks();
  restored.initiation.totalScore = snapshot.initiation;
  restored.focus.totalScore = snapshot.focus;
  restored.breakdown.totalScore = snapshot.breakdown;
  restored.recovery.totalScore = snapshot.recovery;
  restored.consistency.totalScore = snapshot.consistency;

  const characterRank = computeCharacterRank(restored);
  return syncDisplayScores(restored, characterRank.bandIndex);
}

function resolveCharacterTotalScoreFromStatRanks(statRanks: RewardOutcomeLike["nextStats"]["statRanks"]): number {
  const statScores = Object.values(statRanks).map((rankState) => resolveTotalScore(rankState));
  if (statScores.length === 0) {
    return 0;
  }

  return Math.min(...statScores);
}

function resolveRankBand(rank: string): RankBandKey {
  const safe = rank.trim().toUpperCase();
  if (safe.startsWith("S")) {
    return "S";
  }
  if (safe.startsWith("A")) {
    return "A";
  }
  if (safe.startsWith("B")) {
    return "B";
  }
  if (safe.startsWith("C")) {
    return "C";
  }
  if (safe.startsWith("D")) {
    return "D";
  }
  if (safe.startsWith("E")) {
    return "E";
  }
  return "F";
}

function resolveCharacterBandIndex(value: unknown): number {
  if (!value || typeof value !== "object") {
    return 0;
  }

  const withBandIndex = value as { bandIndex?: unknown };
  if (typeof withBandIndex.bandIndex === "number" && Number.isFinite(withBandIndex.bandIndex)) {
    return Math.max(0, Math.floor(withBandIndex.bandIndex));
  }

  return 0;
}

function resolveRankPalette(rank: string): { base: string; fill: string } {
  return RANK_BAND_PALETTE[resolveRankBand(rank)];
}

function resolveRewardSgpGain(reward: RewardOutcomeCompat): number {
  if (typeof reward.sgpGain === "number" && Number.isFinite(reward.sgpGain)) {
    return roundTo(Math.max(0, reward.sgpGain), 2);
  }

  if (!reward.sgpGainByStat) {
    return 0;
  }

  const total = Object.values(reward.sgpGainByStat).reduce((sum, amount) => {
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  return roundTo(Math.max(0, total), 2);
}

function extractRankPromotions(reward: RewardOutcomeCompat): RankPromotionEntry[] {
  if (Array.isArray(reward.rankPromotions) && reward.rankPromotions.length > 0) {
    const parsed = reward.rankPromotions.map((promotion): RankPromotionEntry => ({
      statKey: promotion.statKey,
      promotionCount: Number.isFinite(promotion.promotedCount)
        ? Math.max(1, Math.floor(promotion.promotedCount))
        : 1,
      fromRank: promotion.fromRank,
      toRank: promotion.toRank
    }));

    if (parsed.length > 0) {
      return parsed;
    }
  }

  if (Array.isArray(reward.promotedStats) && reward.promotedStats.length > 0) {
    return reward.promotedStats.map((statKey) => ({
      statKey,
      promotionCount: 1
    }));
  }

  return [];
}

function mapCandidateToSuggestion(candidate: RankedPresetCandidate): QuestSuggestion {
  return {
    id: candidate.id,
    title: candidate.title,
    estimatedTimeMin: candidate.estimatedTimeMin
  };
}

function normalizeQuestSuggestionTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function composeQuestSuggestions(rankedCandidates: RankedPresetCandidate[]): QuestSuggestion[] {
  if (rankedCandidates.length === 0) {
    return [];
  }

  const sortedCandidates = [...rankedCandidates].sort((left, right) => {
    if (left.routeConfidence !== right.routeConfidence) {
      return right.routeConfidence - left.routeConfidence;
    }

    if (left.totalScore !== right.totalScore) {
      return right.totalScore - left.totalScore;
    }

    return left.title.localeCompare(right.title, "ko");
  });

  const selectedCandidates: RankedPresetCandidate[] = [];
  const normalizedTitles = new Set<string>();

  for (const candidate of sortedCandidates) {
    const normalizedTitle = normalizeQuestSuggestionTitle(candidate.title);
    if (normalizedTitles.has(normalizedTitle)) {
      continue;
    }

    normalizedTitles.add(normalizedTitle);
    selectedCandidates.push(candidate);
    if (selectedCandidates.length >= QUEST_SUGGESTION_LIMIT) {
      break;
    }
  }

  return selectedCandidates.map(mapCandidateToSuggestion);
}

export function MvpDashboard() {
  const sessionIdRef = useRef(crypto.randomUUID());
  const {
    coreState,
    tasks,
    missions,
    stats,
    settings,
    events,
    activeTaskId,
    activeTab,
    remainingSecondsByMission,
    hydrated,
    setTasks,
    setMissions,
    setTimerSessions,
    setStats,
    setSettings,
    setEvents,
    setActiveTaskId,
    setActiveTab,
    setRemainingSecondsByMission,
    resetCoreState
  } = useMvpStore({ sessionId: sessionIdRef.current });

  const [taskInput, setTaskInput] = useState("");
  const [selectedQuestSuggestionId, setSelectedQuestSuggestionId] = useState<string | null>(null);
  const [taskTotalMinutesInput, setTaskTotalMinutesInput] = useState("");
  const [taskScheduledForInput, setTaskScheduledForInput] = useState("");
  const [taskDueAtInput, setTaskDueAtInput] = useState("");
  const [taskMetaFeedback, setTaskMetaFeedback] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isQuestComposerOpen, setIsQuestComposerOpen] = useState(false);
  const [questComposerMode, setQuestComposerMode] = useState<"create" | "edit">("create");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [missionEditDraft, setMissionEditDraft] = useState<{
    missionId: string;
    action: string;
    estMinutesInput: string;
  } | null>(null);
  const [missionEditError, setMissionEditError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("오늘은 가장 작은 행동부터 시작해요.");
  const [rollingTipIndex, setRollingTipIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [clock, setClock] = useState(new Date());
  const [currentMissionId, setCurrentMissionId] = useState<string | null>(null);
  const [expandedHomeTaskId, setExpandedHomeTaskId] = useState<string | null>(null);
  const [notificationCapability, setNotificationCapability] = useState<NotificationCapability>(
    DEFAULT_NOTIFICATION_CAPABILITY
  );
  const [isRequestingNotificationPermission, setIsRequestingNotificationPermission] = useState(false);
  const [sttCapability, setSttCapability] = useState<SttCapability>(DEFAULT_STT_CAPABILITY);
  const [isSttListening, setIsSttListening] = useState(false);
  const [sttTranscript, setSttTranscript] = useState("");
  const [sttError, setSttError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<ExternalSyncJobStatus>("IDLE");
  const [syncLastJobId, setSyncLastJobId] = useState<string | null>(null);
  const [syncConflict, setSyncConflict] = useState<ExternalSyncConflict | null>(null);
  const [syncMessage, setSyncMessage] = useState("동기화 대기 중");
  const [isRankUpCtaHighlighted, setIsRankUpCtaHighlighted] = useState(false);

  const tickAccumulatorRef = useRef(createTimerElapsedAccumulator());
  const sttRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sttFinalTranscriptRef = useRef("");
  const sttInterimTranscriptRef = useRef("");
  const syncMockAdapterRef = useRef(createSyncMockAdapter("GOOGLE_CALENDAR"));
  const lastHapticBucketByMissionRef = useRef<Record<string, number>>({});
  const taskMetaEditingFieldRef = useRef<TaskMetaField | null>(null);
  const taskMetaLastDistinctEditedFieldRef = useRef<TaskMetaField | null>(null);
  const gateMetricsRef = useRef<{
    startClickCountByTaskId: Record<string, number>;
    firstStartLoggedByTaskId: Record<string, boolean>;
    recoveryClickCountByTaskId: Record<string, number>;
  }>({
    startClickCountByTaskId: {},
    firstStartLoggedByTaskId: {},
    recoveryClickCountByTaskId: {}
  });

  const activeTask = useMemo(
    () => selectActiveTask(coreState),
    [coreState]
  );

  const activeTaskMissions = useMemo(
    () => selectActiveTaskMissions(coreState),
    [coreState]
  );
  const runningMission = useMemo(
    () => selectRunningMission(coreState),
    [coreState]
  );
  const executionLockedMission = useMemo(
    () => missions.find((mission) => mission.status === "running" || mission.status === "paused") ?? null,
    [missions]
  );
  const executionLockedTaskId = executionLockedMission?.taskId ?? null;
  const isExecutionLocked = executionLockedMission !== null;
  const activeTaskBudgetUsage = useMemo(
    () => (activeTaskId ? getTaskBudgetUsage(missions, activeTaskId) : 0),
    [missions, activeTaskId]
  );

  const completionRate = useMemo(
    () => selectCompletionRate(coreState),
    [coreState]
  );

  const axpProgressPercent = getXpProgressPercent(stats);
  const dailyProgressPercent = Math.max(0, Math.min(100, completionRate));
  const todaySgpGainScore = Math.max(0, Math.round(stats.todaySgpGain));
  const characterTotalScore = resolveCharacterTotalScoreFromStatRanks(stats.statRanks);
  const characterRankPalette = resolveRankPalette(stats.characterRank.rank);
  const characterRankPromotionPreview = useMemo(
    () => applyCharacterRankPromotion({ stats }),
    [stats]
  );
  const canPromoteCharacterRank = characterRankPromotionPreview.promoted;
  const pendingCharacterPromotionCount = canPromoteCharacterRank
    ? characterRankPromotionPreview.pendingPromotionCount + 1
    : 0;
  const dailyProgressRingStyle = {
    background: `conic-gradient(#4a88d4 0 ${dailyProgressPercent}%, #dbe5f2 ${dailyProgressPercent}% 100%)`
  };
  const kpis = useMemo(() => computeMvpKpis(events), [events]);
  const rollingTip = ROLLING_TIPS[rollingTipIndex % ROLLING_TIPS.length];

  const radar = useMemo(
    () => buildRadarShape(stats.statRanks),
    [stats.statRanks]
  );
  const radarBaseline = useMemo(() => {
    const cutoffMs = Date.now() - RECENT_RADAR_WINDOW_MS;
    const snapshots = events.reduce<Array<{ timestampMs: number; statRanks: RewardOutcomeLike["nextStats"]["statRanks"] }>>(
      (accumulator, event) => {
        if (event.eventName !== "xp_gained") {
          return accumulator;
        }

        const timestampMs = Date.parse(event.timestamp);
        if (!Number.isFinite(timestampMs)) {
          return accumulator;
        }

        const snapshot = extractStatTotalSnapshot(event.meta);
        if (!snapshot) {
          return accumulator;
        }

        accumulator.push({
          timestampMs,
          statRanks: restoreStatRanksFromTotalSnapshot(snapshot)
        });

        return accumulator;
      },
      []
    );

    const baselineSnapshot = snapshots.find((snapshot) => snapshot.timestampMs <= cutoffMs)
      ?? snapshots.filter((snapshot) => snapshot.timestampMs > cutoffMs).at(-1)
      ?? null;

    if (!baselineSnapshot) {
      return null;
    }

    return buildRadarShape(baselineSnapshot.statRanks);
  }, [events]);
  const notificationState = deriveNotificationState(notificationCapability);
  const notificationFallbackText = getNotificationFallbackText(notificationState);
  const sttSupportState = getSttSupportState(sttCapability);
  const syncStatusLabel = SYNC_STATUS_LABEL[syncStatus];
  const isSyncBusy = syncStatus === "QUEUED" || syncStatus === "RUNNING";
  const questSuggestions = useMemo<QuestSuggestion[]>(() => {
    const normalizedInput = taskInput.trim();
    if (normalizedInput.length < 2) {
      return [];
    }

    const rankedCandidates = rankLocalPresetCandidates(normalizedInput, QUEST_CANDIDATE_POOL_SIZE);
    return composeQuestSuggestions(rankedCandidates);
  }, [taskInput]);

  const handleTaskInputChange = (value: string) => {
    setTaskInput(value);
    setSelectedQuestSuggestionId(null);
  };

  const clearSttTranscriptRefs = () => {
    sttFinalTranscriptRef.current = "";
    sttInterimTranscriptRef.current = "";
  };

  const resetSttTranscriptBuffers = () => {
    clearSttTranscriptRefs();
    setSttTranscript("");
  };

  const mergeSttTranscript = (finalTranscript: string, interimTranscript: string): string =>
    [finalTranscript, interimTranscript].filter(Boolean).join(" ").trim();

  const resetTaskComposerDraft = () => {
    setTaskInput("");
    setSelectedQuestSuggestionId(null);
    setTaskTotalMinutesInput("");
    setTaskScheduledForInput("");
    setTaskDueAtInput("");
    setTaskMetaFeedback(null);
    taskMetaEditingFieldRef.current = null;
    taskMetaLastDistinctEditedFieldRef.current = null;
  };

  const closeQuestComposer = () => {
    setIsQuestComposerOpen(false);
    setQuestComposerMode("create");
    setEditingTaskId(null);
    resetTaskComposerDraft();
  };

  const formatTaskIsoToLocalInput = (isoValue?: string): string => {
    if (!isoValue) {
      return "";
    }
    const parsedDate = new Date(isoValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }
    return formatDateTimeLocalInput(parsedDate);
  };

  const openQuestComposerForCreate = () => {
    setQuestComposerMode("create");
    setEditingTaskId(null);
    resetTaskComposerDraft();
    setIsQuestComposerOpen(true);
  };

  const openQuestComposerForEdit = (task: Task) => {
    const fallbackStartAtMs = Date.parse(task.createdAt);
    const fallbackStartAt = Number.isFinite(fallbackStartAtMs) ? new Date(fallbackStartAtMs) : new Date();
    const normalizedSchedule = normalizeTaskScheduleIso({
      scheduledFor: task.scheduledFor,
      dueAt: task.dueAt,
      totalMinutes: task.totalMinutes,
      fallbackStartAt
    });
    const normalizedScheduleWithDueOnlyOverride = applyDueOnlyScheduleOverride(
      normalizedSchedule,
      task.scheduledFor,
      task.dueAt
    ) ?? normalizedSchedule;

    setQuestComposerMode("edit");
    setEditingTaskId(task.id);
    setTaskInput(task.title);
    setSelectedQuestSuggestionId(null);
    setTaskTotalMinutesInput(String(task.totalMinutes));
    setTaskScheduledForInput(formatTaskIsoToLocalInput(normalizedScheduleWithDueOnlyOverride.scheduledFor));
    setTaskDueAtInput(formatTaskIsoToLocalInput(normalizedScheduleWithDueOnlyOverride.dueAt));
    setTaskMetaFeedback(null);
    taskMetaEditingFieldRef.current = null;
    taskMetaLastDistinctEditedFieldRef.current = null;
    setIsQuestComposerOpen(true);
  };

  const closeMissionEditModal = () => {
    setMissionEditDraft(null);
    setMissionEditError(null);
  };

  useEffect(() => {
    const tick = window.setInterval(() => {
      setClock(new Date());
    }, 1000);

    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const tipInterval = window.setInterval(() => {
      setRollingTipIndex((prevIndex) => (prevIndex + 1) % ROLLING_TIPS.length);
    }, ROLLING_TIP_INTERVAL_MS);

    return () => window.clearInterval(tipInterval);
  }, []);

  useEffect(() => {
    const trimmedFeedback = feedback.trim();
    if (!trimmedFeedback || !FEEDBACK_TOAST_ERROR_PATTERN.test(trimmedFeedback)) {
      return;
    }

    setToastMessage(trimmedFeedback);
  }, [feedback]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const dismissTimer = window.setTimeout(() => {
      setToastMessage(null);
    }, TOAST_AUTO_DISMISS_MS);

    return () => window.clearTimeout(dismissTimer);
  }, [toastMessage]);

  useEffect(() => {
    if (!canPromoteCharacterRank) {
      setIsRankUpCtaHighlighted(false);
      return;
    }

    setIsRankUpCtaHighlighted(true);
    const pulseTimer = window.setInterval(() => {
      setIsRankUpCtaHighlighted((prev) => !prev);
    }, RANK_UP_CTA_PULSE_MS);

    return () => window.clearInterval(pulseTimer);
  }, [canPromoteCharacterRank]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    setNotificationCapability(getNotificationCapability());
    setSttCapability(getSttCapability());
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      setNotificationCapability(getNotificationCapability());
      setSttCapability(getSttCapability());
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hydrated]);

  useEffect(() => {
    return () => {
      if (sttRecognitionRef.current) {
        sttRecognitionRef.current.stop();
        sttRecognitionRef.current = null;
      }

      clearSttTranscriptRefs();
    };
  }, []);

  useEffect(() => {
    if (tasks.length === 0) {
      if (activeTaskId !== null) {
        setActiveTaskId(null);
      }
      return;
    }

    if (activeTaskId && tasks.some((task) => task.id === activeTaskId && task.status !== "archived")) {
      return;
    }

    const nextTask = tasks.find((task) => task.status === "in_progress")
      ?? tasks.find((task) => task.status === "todo")
      ?? tasks.find((task) => task.status !== "archived")
      ?? tasks[0];
    if (nextTask) {
      setActiveTaskId(nextTask.id);
    }
  }, [tasks, activeTaskId, setActiveTaskId]);

  useEffect(() => {
    if (!expandedHomeTaskId) {
      return;
    }

    if (!tasks.some((task) => task.id === expandedHomeTaskId)) {
      setExpandedHomeTaskId(null);
    }
  }, [tasks, expandedHomeTaskId]);

  useEffect(() => {
    if (!activeTaskId) {
      if (currentMissionId !== null) {
        setCurrentMissionId(null);
      }
      return;
    }

    const usableMissions = activeTaskMissions.filter((mission) => isActionableMissionStatus(mission.status));
    if (usableMissions.length === 0) {
      if (currentMissionId !== null) {
        setCurrentMissionId(null);
      }
      return;
    }

    if (currentMissionId && usableMissions.some((mission) => mission.id === currentMissionId)) {
      return;
    }

    const nextMission = usableMissions.find((mission) => mission.status === "running") ?? usableMissions[0];
    setCurrentMissionId(nextMission.id);
  }, [activeTaskId, activeTaskMissions, currentMissionId]);

  useEffect(() => {
    if (!runningMission) {
      tickAccumulatorRef.current = createTimerElapsedAccumulator();
      return;
    }

    const applyTick = () => {
      if (!runningMission) {
        return;
      }

      const tickResult = applyElapsedWindow({
        nowMs: Date.now(),
        accumulator: tickAccumulatorRef.current
      });
      tickAccumulatorRef.current = tickResult.nextAccumulator;

      setRemainingSecondsByMission((prev) => {
        return applyElapsedToMissionRemaining({
          remainingSecondsByMission: prev,
          missionId: runningMission.id,
          missionTotalSeconds: runningMission.estMinutes * 60,
          elapsedSeconds: tickResult.elapsedSeconds
        });
      });
    };

    const intervalId = window.setInterval(applyTick, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        applyTick();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [runningMission, setRemainingSecondsByMission]);

  useEffect(() => {
    if (!runningMission || !settings.hapticEnabled) {
      return;
    }

    const total = runningMission.estMinutes * 60;
    const remaining = remainingSecondsByMission[runningMission.id] ?? total;
    const elapsed = Math.max(0, total - remaining);
    const currentBucket = Math.floor(elapsed / 300);
    const previousBucket = lastHapticBucketByMissionRef.current[runningMission.id] ?? 0;

    if (currentBucket > previousBucket && currentBucket > 0) {
      lastHapticBucketByMissionRef.current[runningMission.id] = currentBucket;

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(35);
      }

      setEvents((prev) =>
        appendEvent(
          prev,
          createEvent({
            eventName: "haptic_fired",
            sessionId: sessionIdRef.current,
            source: "local",
            taskId: runningMission.taskId,
            missionId: runningMission.id,
            meta: {
              minuteMark: currentBucket * 5
            }
          })
        )
      );
    }
  }, [remainingSecondsByMission, runningMission, settings.hapticEnabled, setEvents]);

  useEffect(() => {
    setTasks((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const nowIso = new Date().toISOString();
      const next = prev.map((task) => {
        if (task.status === "archived") {
          return task;
        }

        const fallbackStartAtMs = Date.parse(task.createdAt);
        const fallbackStartAt = Number.isFinite(fallbackStartAtMs) ? new Date(fallbackStartAtMs) : new Date(nowIso);
        const normalizedSchedule = normalizeTaskScheduleIso({
          scheduledFor: task.scheduledFor,
          dueAt: task.dueAt,
          totalMinutes: task.totalMinutes,
          fallbackStartAt
        });
        const normalizedScheduleWithDueOnlyOverride = applyDueOnlyScheduleOverride(
          normalizedSchedule,
          task.scheduledFor,
          task.dueAt
        ) ?? normalizedSchedule;
        const nextScheduledFor = normalizedScheduleWithDueOnlyOverride.scheduledFor;
        const nextDueAt = normalizedScheduleWithDueOnlyOverride.dueAt;

        const taskMissions = missions.filter((mission) => mission.taskId === task.id);
        const openTaskMissions = taskMissions.filter((mission) => !isTaskClosedStatus(mission.status));
        if (taskMissions.length === 0) {
          if (task.scheduledFor === nextScheduledFor && task.dueAt === nextDueAt) {
            return task;
          }

          return {
            ...task,
            scheduledFor: nextScheduledFor,
            dueAt: nextDueAt
          };
        }

        const allClosed = taskMissions.every((mission) => isTaskClosedStatus(mission.status));
        const hasRunningOrPaused = openTaskMissions.some((mission) => mission.status === "running" || mission.status === "paused");
        const inferredStartedAt = openTaskMissions
          .map((mission) => mission.startedAt)
          .filter((startedAt): startedAt is string => Boolean(startedAt))
          .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
        const inferredCompletedAt = taskMissions
          .map((mission) => mission.completedAt)
          .filter((completedAt): completedAt is string => Boolean(completedAt))
          .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

        const hasStarted = Boolean(task.startedAt || inferredStartedAt);
        const nextStatus: Task["status"] = allClosed
          ? "done"
          : hasRunningOrPaused || hasStarted
            ? "in_progress"
            : "todo";
        const nextStartedAt = task.startedAt ?? inferredStartedAt;
        const nextCompletedAt = nextStatus === "done"
          ? task.completedAt ?? inferredCompletedAt ?? nowIso
          : undefined;

        if (
          task.status === nextStatus
          && task.startedAt === nextStartedAt
          && task.completedAt === nextCompletedAt
          && task.scheduledFor === nextScheduledFor
          && task.dueAt === nextDueAt
        ) {
          return task;
        }

        return {
          ...task,
          status: nextStatus,
          startedAt: nextStartedAt,
          completedAt: nextCompletedAt,
          scheduledFor: nextScheduledFor,
          dueAt: nextDueAt
        };
      });

      const changed = next.some((task, index) => task !== prev[index]);
      return changed ? next : prev;
    });
  }, [missions, setTasks]);

  const upsertTimerSession = (missionId: string, nextState: TimerSession["state"], nowIso: string) => {
    setTimerSessions((prev) => {
      const activeSessionIndex = prev.findIndex(
        (session) => session.missionId === missionId && session.state !== "ended"
      );

      if (activeSessionIndex === -1) {
        if (nextState === "ended") {
          return prev;
        }

        return [
          {
            id: crypto.randomUUID(),
            missionId,
            state: nextState,
            startedAt: nowIso,
            pausedAt: nextState === "paused" ? nowIso : undefined,
            pauseCount: nextState === "paused" ? 1 : 0
          },
          ...prev
        ];
      }

      const current = prev[activeSessionIndex];
      const nextSession: TimerSession =
        nextState === "paused"
          ? {
              ...current,
              state: "paused",
              pausedAt: nowIso,
              pauseCount: current.pauseCount + 1
            }
          : nextState === "running"
            ? {
                ...current,
                state: "running",
                pausedAt: undefined
              }
            : {
                ...current,
                state: "ended",
                endedAt: nowIso
              };

      return prev.map((session, index) => (index === activeSessionIndex ? nextSession : session));
    });
  };

  const logEvent = (params: {
    eventName: AppEvent["eventName"];
    source: EventSource;
    taskId?: string;
    missionId?: string;
    meta?: AppEvent["meta"];
  }) => {
    setEvents((prev) =>
      appendEvent(
        prev,
        createEvent({
          ...params,
          sessionId: sessionIdRef.current
        })
      )
    );
  };

  const logRewardOutcomeEvents = (params: {
    reward: RewardOutcomeLike;
    rewardGranted: boolean;
    taskId: string;
    missionId?: string;
    reason?: "mission_completion" | "remission" | "reschedule";
    recoveryClickCount?: number;
    previousCharacterRank: RewardOutcomeLike["nextStats"]["characterRank"];
  }) => {
    if (!params.rewardGranted) {
      return;
    }

    const reward: RewardOutcomeCompat = params.reward;
    const sgpGain = resolveRewardSgpGain(reward);
    const commonMeta: NonNullable<AppEvent["meta"]> = {
      axpGain: reward.axpGain,
      sgpGain,
      accountLevel: reward.nextStats.accountLevel,
      ...(params.reason ? { reason: params.reason } : {}),
      ...(typeof params.recoveryClickCount === "number"
        ? { recoveryClickCount: params.recoveryClickCount }
        : {})
    };
    const rewardStatTotalMeta: NonNullable<AppEvent["meta"]> = {
      statTotalInitiation: resolveTotalScore(reward.nextStats.statRanks.initiation),
      statTotalFocus: resolveTotalScore(reward.nextStats.statRanks.focus),
      statTotalBreakdown: resolveTotalScore(reward.nextStats.statRanks.breakdown),
      statTotalRecovery: resolveTotalScore(reward.nextStats.statRanks.recovery),
      statTotalConsistency: resolveTotalScore(reward.nextStats.statRanks.consistency)
    };

    logEvent({
      eventName: "xp_gained",
      source: "local",
      taskId: params.taskId,
      missionId: params.missionId,
      meta: {
        ...commonMeta,
        ...rewardStatTotalMeta
      }
    });

    if (reward.accountLevelUps > 0) {
      logEvent({
        eventName: "level_up",
        source: "local",
        taskId: params.taskId,
        missionId: params.missionId,
        meta: {
          ...commonMeta,
          accountLevelUps: reward.accountLevelUps
        }
      });
    }

    const rankPromotions = extractRankPromotions(reward);
    rankPromotions.forEach((promotion) => {
      logEvent({
        eventName: "rank_promoted",
        source: "local",
        taskId: params.taskId,
        missionId: params.missionId,
        meta: {
          ...commonMeta,
          statKey: promotion.statKey,
          promotionCount: promotion.promotionCount,
          ...(promotion.fromRank ? { previousRank: promotion.fromRank } : {}),
          ...(promotion.toRank ? { nextRank: promotion.toRank } : {})
        }
      });
    });

    const previousCharacterRank = reward.previousCharacterRank ?? params.previousCharacterRank;
    const characterRankChanged = reward.characterRankChanged
      || previousCharacterRank.rank !== reward.nextStats.characterRank.rank;

    if (characterRankChanged) {
      const previousBandIndex = resolveCharacterBandIndex(previousCharacterRank);
      const nextBandIndex = resolveCharacterBandIndex(reward.nextStats.characterRank);

      logEvent({
        eventName: "character_rank_changed",
        source: "local",
        taskId: params.taskId,
        missionId: params.missionId,
        meta: {
          ...commonMeta,
          previousRank: previousCharacterRank.rank,
          nextRank: reward.nextStats.characterRank.rank,
          previousBandIndex,
          nextBandIndex,
          previousScoreInBand: resolveDisplayScore(previousCharacterRank),
          nextScoreInBand: resolveDisplayScore(reward.nextStats.characterRank)
        }
      });
    }
  };

  const pushLoopNotification = (params: {
    eventName: "mission_started" | "mission_completed" | "reschedule_requested" | "task_rescheduled";
    taskTitle: string;
    missionAction: string;
  }) => {
    const capability = getNotificationCapability();
    setNotificationCapability(capability);

    if (!canShowNotification(capability)) {
      return;
    }

    if (typeof window === "undefined" || typeof window.Notification !== "function") {
      return;
    }

    const title =
      params.eventName === "mission_started"
        ? "미션 시작"
        : params.eventName === "mission_completed"
          ? "미션 완료"
          : "내일로 재등록";
    const body =
      params.eventName === "mission_started"
        ? `${params.taskTitle} · ${params.missionAction}`
        : params.eventName === "mission_completed"
          ? `${params.taskTitle} · ${params.missionAction} 미션를 완료했어요.`
          : `${params.taskTitle} · ${params.missionAction} 미션를 내일로 옮겼어요.`;
    const notification = new window.Notification(title, {
      body,
      tag: `adhdtime-${params.eventName}-${Date.now()}`
    });

    window.setTimeout(() => {
      notification.close();
    }, 4500);
  };

  const handleRequestNotification = async () => {
    setIsRequestingNotificationPermission(true);
    try {
      await requestNotificationPermission();
    } finally {
      setNotificationCapability(getNotificationCapability());
      setIsRequestingNotificationPermission(false);
    }
  };

  const handleStartStt = () => {
    const capability = getSttCapability();
    setSttCapability(capability);

    if (!capability.canStartRecognition) {
      setIsSttListening(false);
      resetSttTranscriptBuffers();
      setSttError("현재 환경에서는 STT를 사용할 수 없습니다.");
      return;
    }

    if (sttRecognitionRef.current) {
      sttRecognitionRef.current.stop();
      sttRecognitionRef.current = null;
    }

    const recognition = createSttRecognition("ko-KR");
    if (!recognition) {
      resetSttTranscriptBuffers();
      setSttError("STT 엔진 초기화에 실패했습니다.");
      return;
    }

    setSttError(null);
    resetSttTranscriptBuffers();

    recognition.onresult = (event) => {
      const { finalTranscript, interimTranscript } = extractTranscriptBuffers(event);
      sttFinalTranscriptRef.current = finalTranscript;
      sttInterimTranscriptRef.current = interimTranscript;
      setSttTranscript(interimTranscript);

      const mergedTranscript = mergeSttTranscript(finalTranscript, interimTranscript);
      if (mergedTranscript) {
        handleTaskInputChange(mergedTranscript);
      }
    };
    recognition.onerror = (event) => {
      setSttError(`음성 인식 오류: ${event.error}`);
      setIsSttListening(false);
      sttRecognitionRef.current = null;
      resetSttTranscriptBuffers();
    };
    recognition.onend = () => {
      setIsSttListening(false);
      sttRecognitionRef.current = null;
      resetSttTranscriptBuffers();
    };

    sttRecognitionRef.current = recognition;

    try {
      recognition.start();
      setIsSttListening(true);
    } catch {
      setIsSttListening(false);
      setSttError("STT 시작 중 오류가 발생했습니다.");
      sttRecognitionRef.current = null;
      resetSttTranscriptBuffers();
    }
  };

  const handleStopStt = () => {
    if (sttRecognitionRef.current) {
      sttRecognitionRef.current.stop();
      sttRecognitionRef.current = null;
    }
    setIsSttListening(false);
    resetSttTranscriptBuffers();
  };

  const handleRunSyncMock = async (outcome: SyncMockOutcome) => {
    if (isSyncBusy) {
      return;
    }

    setSyncConflict(null);

    try {
      await syncMockAdapterRef.current.simulateSync({
        outcome,
        onTransition: ({ job, conflict }) => {
          setSyncStatus(job.status);
          setSyncLastJobId(job.id);

          if (job.status === "QUEUED") {
            setSyncMessage("queued: 동기화 요청을 큐에 등록했습니다.");
            setSyncConflict(null);
            return;
          }

          if (job.status === "RUNNING") {
            setSyncMessage("running: 외부 provider와 데이터를 비교 중입니다.");
            return;
          }

          if (job.status === "SUCCESS") {
            setSyncMessage("success: mock 동기화가 정상 완료되었습니다.");
            setSyncConflict(null);
            return;
          }

          if (job.status === "FAILED") {
            setSyncMessage("failed: mock 동기화가 실패했습니다.");
            setSyncConflict(null);
            return;
          }

          if (job.status === "CONFLICT") {
            setSyncMessage("conflict: 충돌이 감지되어 사용자 확인이 필요합니다.");
            setSyncConflict(conflict);
          }
        }
      });
    } catch {
      setSyncStatus("FAILED");
      setSyncMessage("failed: mock 어댑터 실행 중 예외가 발생했습니다.");
    }
  };

  const handleTaskMetaInputChange = (
    editedField: TaskMetaField,
    nextValue: string,
    options?: { forcedAnchorField?: TaskMetaField }
  ) => {
    const nextInputs: TaskMetaInputs = {
      totalMinutesInput: editedField === "totalMinutes" ? nextValue : taskTotalMinutesInput,
      scheduledForInput: editedField === "scheduledFor" ? nextValue : taskScheduledForInput,
      dueAtInput: editedField === "dueAt" ? nextValue : taskDueAtInput
    };

    const parsedTotalMinutes = parseLooseMinuteInput(nextInputs.totalMinutesInput);
    const parsedScheduledFor = parseDateTimeLocalInput(nextInputs.scheduledForInput);
    const parsedDueAt = parseDateTimeLocalInput(nextInputs.dueAtInput);

    const hasValidValue = (field: TaskMetaField): boolean => {
      if (field === "totalMinutes") {
        return parsedTotalMinutes !== null;
      }
      if (field === "scheduledFor") {
        return parsedScheduledFor !== null;
      }
      return parsedDueAt !== null;
    };

    if (taskMetaEditingFieldRef.current !== editedField) {
      taskMetaLastDistinctEditedFieldRef.current = taskMetaEditingFieldRef.current;
      taskMetaEditingFieldRef.current = editedField;
    }

    const previousEditedField = taskMetaLastDistinctEditedFieldRef.current;
    const pairCandidates = TASK_META_PAIR_PRIORITY[editedField];
    const preferredAnchorField =
      previousEditedField
      && previousEditedField !== editedField
      && pairCandidates.includes(previousEditedField)
      && hasValidValue(previousEditedField)
        ? previousEditedField
        : null;
    const forcedAnchorField =
      options?.forcedAnchorField && options.forcedAnchorField !== editedField && hasValidValue(options.forcedAnchorField)
        ? options.forcedAnchorField
        : null;
    const anchorField = forcedAnchorField ?? preferredAnchorField ?? pairCandidates.find((field) => hasValidValue(field)) ?? null;

    let immediateFeedback: string | null = null;

    if (anchorField) {
      const derivedField = (["totalMinutes", "scheduledFor", "dueAt"] as const).find(
        (field) => field !== editedField && field !== anchorField
      );

      if (derivedField === "dueAt" && parsedTotalMinutes !== null && parsedScheduledFor) {
        if (!isTaskTotalMinutesInRange(parsedTotalMinutes)) {
          immediateFeedback = `총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 범위로 입력해주세요.`;
        } else {
          nextInputs.dueAtInput = formatDateTimeLocalInput(addMinutesToDate(parsedScheduledFor, parsedTotalMinutes));
        }
      }

      const shouldPreserveDueOnlyInput = editedField === "totalMinutes"
        && nextInputs.scheduledForInput.trim().length === 0
        && nextInputs.dueAtInput.trim().length > 0;
      if (
        derivedField === "scheduledFor"
        && editedField !== "dueAt"
        && !shouldPreserveDueOnlyInput
        && parsedTotalMinutes !== null
        && parsedDueAt
      ) {
        if (!isTaskTotalMinutesInRange(parsedTotalMinutes)) {
          immediateFeedback = `총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 범위로 입력해주세요.`;
        } else {
          nextInputs.scheduledForInput = formatDateTimeLocalInput(addMinutesToDate(parsedDueAt, -parsedTotalMinutes));
        }
      }

      if (derivedField === "totalMinutes" && parsedScheduledFor && parsedDueAt) {
        if (parsedScheduledFor.getTime() > parsedDueAt.getTime()) {
          immediateFeedback = "시작 예정 시간은 마감 시간보다 늦을 수 없습니다.";
        } else {
          const derivedTotalMinutes = getDiffMinutes(parsedScheduledFor, parsedDueAt);
          if (!isTaskTotalMinutesInRange(derivedTotalMinutes)) {
            immediateFeedback = `총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 범위로 입력해주세요.`;
          } else {
            nextInputs.totalMinutesInput = String(derivedTotalMinutes);
          }
        }
      }
    }

    const finalTotalMinutes = parseLooseMinuteInput(nextInputs.totalMinutesInput);
    const finalScheduledFor = parseDateTimeLocalInput(nextInputs.scheduledForInput);
    const finalDueAt = parseDateTimeLocalInput(nextInputs.dueAtInput);

    setTaskTotalMinutesInput(nextInputs.totalMinutesInput);
    setTaskScheduledForInput(nextInputs.scheduledForInput);
    setTaskDueAtInput(nextInputs.dueAtInput);
    setTaskMetaFeedback(immediateFeedback ?? getTaskMetaConstraintFeedback(finalTotalMinutes, finalScheduledFor, finalDueAt));
  };

  const handleTaskScheduledForInputChange = (nextValue: string) => {
    handleTaskMetaInputChange("scheduledFor", nextValue, { forcedAnchorField: "totalMinutes" });
  };

  const handleTaskDueAtInputChange = (nextValue: string) => {
    handleTaskMetaInputChange("dueAt", nextValue, { forcedAnchorField: "scheduledFor" });
  };

  const handleSetTaskTotalMinutesFromScheduled = (nextMinutes: number) => {
    if (!Number.isFinite(nextMinutes)) {
      return;
    }

    const normalizedMinutes = Math.min(
      MAX_TASK_TOTAL_MINUTES,
      Math.max(MIN_TASK_TOTAL_MINUTES, Math.floor(nextMinutes))
    );
    handleTaskMetaInputChange("totalMinutes", String(normalizedMinutes), {
      forcedAnchorField: "scheduledFor"
    });
  };

  const handleAdjustTaskTotalMinutesFromScheduled = (deltaMinutes: -5 | -1 | 1 | 5) => {
    const parsedTotalMinutes = parseLooseMinuteInput(taskTotalMinutesInput);
    const safeTotalMinutes = parsedTotalMinutes ?? DEFAULT_TASK_TOTAL_MINUTES;
    handleSetTaskTotalMinutesFromScheduled(safeTotalMinutes + deltaMinutes);
  };

  const handleGenerateTask = async (): Promise<SubmitTaskResult> => {
    const rawInput = taskInput.trim();
    if (!rawInput) {
      const message = "할 일을 입력하면 바로 10분 단위로 쪼개드릴게요.";
      setFeedback(message);
      return { ok: false, reason: "empty_input", message };
    }

    if (taskMetaFeedback) {
      const message = `입력 단계 오류를 먼저 해결해주세요: ${taskMetaFeedback}`;
      setFeedback(message);
      return { ok: false, reason: "invalid_meta", message };
    }

    const normalizedTotalInput = taskTotalMinutesInput.trim();
    const parsedTotalMinutes = normalizedTotalInput
      ? parseTaskTotalMinutesInput(normalizedTotalInput)
      : null;
    if (normalizedTotalInput && parsedTotalMinutes === null) {
      const message = `총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 사이로 입력해주세요.`;
      setFeedback(message);
      return { ok: false, reason: "invalid_total_minutes", message };
    }

    if (RISKY_INPUT_PATTERN.test(rawInput)) {
      logEvent({
        eventName: "safety_blocked",
        source: "system",
        meta: {
          reason: "risky_input",
          inputLength: rawInput.length
        }
      });
      const message = RECOVERY_FEEDBACK.safetyBlocked;
      setFeedback(message);
      return { ok: false, reason: "safety_blocked", message };
    }

    setIsGenerating(true);

    try {
      const taskId = crypto.randomUUID();
      const summary = buildTaskSummary(rawInput);
      const missioningStartedAt = Date.now();
      const source: EventSource = "local";
      const missioning = generateLocalMissioning(taskId, rawInput, {
        forcePresetId: selectedQuestSuggestionId ?? undefined,
        preferTopRank: selectedQuestSuggestionId === null
      });
      if (!missioning) {
        const message = "입력과 유사한 퀘스트/미션 추천을 찾지 못했습니다. 문장을 조금 더 구체적으로 입력해주세요.";
        setFeedback(message);
        return { ok: false, reason: "no_candidates", message };
      }

      const missioningLatencyMs = Date.now() - missioningStartedAt;
      const effectiveTotalMinutes = clampTaskTotalMinutes(
        parsedTotalMinutes ?? sumMissionEstMinutes(missioning.missions)
      );
      const normalizedSchedule = applyDueOnlyScheduleOverride(
        normalizeTaskScheduleFromLocalInputs({
          scheduledForInput: taskScheduledForInput,
          dueAtInput: taskDueAtInput,
          totalMinutes: effectiveTotalMinutes,
          fallbackStartAt: new Date()
        }),
        taskScheduledForInput,
        taskDueAtInput
      );
      if (!normalizedSchedule) {
        const message = "일정 시간 형식이 올바르지 않습니다. 날짜와 시간을 다시 확인해주세요.";
        setFeedback(message);
        return { ok: false, reason: "invalid_schedule", message };
      }
      const { scheduledFor, dueAt } = normalizedSchedule;
      const createdAt = new Date().toISOString();

      const safeTitle = summary || "새 과업";
      const adjustedMissionTemplates = enforceMissionBudget(missioning.missions, effectiveTotalMinutes).map((mission, index) => ({
        ...mission,
        order: index + 1
      }));

      const nextTask: Task = {
        id: taskId,
        title: safeTitle,
        summary: safeTitle,
        totalMinutes: effectiveTotalMinutes,
        createdAt,
        scheduledFor,
        dueAt,
        status: "todo"
      };

      const nextMissions: Mission[] = mapMissioningResultToMissions(
        {
          ...missioning,
          missions: adjustedMissionTemplates
        },
        {
          taskId,
          status: "todo"
        }
      );

      if (!isWithinTaskMissionBudget(nextMissions, effectiveTotalMinutes)) {
        const message = "미션 시간 합계가 과업 총 시간 예산을 초과해 생성이 취소되었습니다.";
        setFeedback(message);
        return { ok: false, reason: "mission_budget_exceeded", message };
      }

      setTasks((prev) => [nextTask, ...prev]);
      setMissions((prev) => [...nextMissions, ...prev]);
      setRemainingSecondsByMission((prev) => {
        const next = { ...prev };
        nextMissions.forEach((mission) => {
          next[mission.id] = mission.estMinutes * 60;
        });
        return next;
      });
      gateMetricsRef.current.startClickCountByTaskId[taskId] = 0;
      gateMetricsRef.current.firstStartLoggedByTaskId[taskId] = false;
      gateMetricsRef.current.recoveryClickCountByTaskId[taskId] = 0;

      setActiveTaskId(taskId);
      setCurrentMissionId(nextMissions[0]?.id ?? null);
      resetTaskComposerDraft();
      setQuestComposerMode("create");
      setEditingTaskId(null);
      setActiveTab("home");
      const message = "연관도 기반 추천으로 바로 시작할 수 있게 준비했어요.";
      setFeedback(message);

      logEvent({
        eventName: "task_created",
        source: "user",
        taskId,
        meta: {
          summaryLength: safeTitle.length,
          missionCount: nextMissions.length,
          totalMinutes: effectiveTotalMinutes,
          scheduledFor: scheduledFor ?? null,
          dueAt: dueAt ?? null
        }
      });

      logEvent({
        eventName: "mission_generated",
        source,
        taskId,
        meta: {
          missionCount: nextMissions.length,
          originalMissionCount: missioning.missions.length,
          adjustedForBudget: missioning.missions.length !== nextMissions.length
            || sumMissionEstMinutes(missioning.missions) !== sumMissionEstMinutes(nextMissions),
          missioningLatencyMs,
          withinTenSeconds: missioningLatencyMs <= 10_000
        }
      });
      return { ok: true, reason: "created", message };
    } catch (error) {
      const message = "퀘스트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      console.error("퀘스트 생성 실패:", error);
      setFeedback(message);
      return { ok: false, reason: "unexpected_error", message };
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateTask = async (): Promise<SubmitTaskResult> => {
    try {
      const targetTask = editingTaskId ? tasks.find((task) => task.id === editingTaskId) : null;
      if (!targetTask) {
        const message = "수정할 퀘스트를 찾을 수 없습니다.";
        setFeedback(message);
        return { ok: false, reason: "task_not_found", message };
      }

      const rawInput = taskInput.trim();
      if (!rawInput) {
        const message = "퀘스트 이름을 입력해주세요.";
        setFeedback(message);
        return { ok: false, reason: "empty_input", message };
      }

      if (taskMetaFeedback) {
        const message = `입력 단계 오류를 먼저 해결해주세요: ${taskMetaFeedback}`;
        setFeedback(message);
        return { ok: false, reason: "invalid_meta", message };
      }

      const normalizedTotalInput = taskTotalMinutesInput.trim();
      const parsedTotalMinutes = normalizedTotalInput
        ? parseTaskTotalMinutesInput(normalizedTotalInput)
        : targetTask.totalMinutes;
      if (parsedTotalMinutes === null) {
        const message = `총 소요 시간은 ${MIN_TASK_TOTAL_MINUTES}~${MAX_TASK_TOTAL_MINUTES}분 사이로 입력해주세요.`;
        setFeedback(message);
        return { ok: false, reason: "invalid_total_minutes", message };
      }

      const fallbackStartAtMs = Date.parse(targetTask.createdAt);
      const fallbackStartAt = Number.isFinite(fallbackStartAtMs) ? new Date(fallbackStartAtMs) : new Date();
      const normalizedSchedule = applyDueOnlyScheduleOverride(
        normalizeTaskScheduleFromLocalInputs({
          scheduledForInput: taskScheduledForInput,
          dueAtInput: taskDueAtInput,
          totalMinutes: parsedTotalMinutes,
          fallbackStartAt
        }),
        taskScheduledForInput,
        taskDueAtInput
      );
      if (!normalizedSchedule) {
        const message = "일정 시간 형식이 올바르지 않습니다. 날짜와 시간을 다시 확인해주세요.";
        setFeedback(message);
        return { ok: false, reason: "invalid_schedule", message };
      }

      const taskHasExecutionLockedMission = executionLockedTaskId === targetTask.id;
      if (taskHasExecutionLockedMission && parsedTotalMinutes < targetTask.totalMinutes) {
        const message = "실행 중에는 과업 총 시간을 줄일 수 없습니다. 증가만 가능합니다.";
        setFeedback(message);
        return { ok: false, reason: "execution_locked", message };
      }

      const currentBudgetMissions = getTaskBudgetedMissions(missions, targetTask.id);
      if (!isWithinTaskMissionBudget(currentBudgetMissions, parsedTotalMinutes)) {
        const message = "현재 미션 시간 합계보다 작게 과업 총 시간을 줄일 수 없습니다.";
        setFeedback(message);
        return { ok: false, reason: "mission_budget_exceeded", message };
      }

      const safeTitle = buildTaskSummary(rawInput) || targetTask.title;
      const titleChanged = safeTitle !== targetTask.title || safeTitle !== (targetTask.summary ?? targetTask.title);
      const totalChanged = parsedTotalMinutes !== targetTask.totalMinutes;
      const scheduleChanged = normalizedSchedule.scheduledFor !== targetTask.scheduledFor
        || normalizedSchedule.dueAt !== targetTask.dueAt;

      if (!titleChanged && !totalChanged && !scheduleChanged) {
        const message = "변경된 내용이 없습니다.";
        setFeedback(message);
        return { ok: false, reason: "no_changes", message };
      }

      setTasks((prev) =>
        prev.map((task) =>
          task.id === targetTask.id
            ? {
                ...task,
                title: safeTitle,
                summary: safeTitle,
                totalMinutes: parsedTotalMinutes,
                scheduledFor: normalizedSchedule.scheduledFor,
                dueAt: normalizedSchedule.dueAt
              }
            : task
        )
      );
      setActiveTaskId(targetTask.id);
      setActiveTab("home");
      resetTaskComposerDraft();
      setQuestComposerMode("create");
      setEditingTaskId(null);
      const message = "퀘스트를 수정했습니다.";
      setFeedback(message);

      logEvent({
        eventName: "task_time_updated",
        source: "user",
        taskId: targetTask.id,
        meta: {
          previousTotalMinutes: targetTask.totalMinutes,
          nextTotalMinutes: parsedTotalMinutes,
          updatedDuringRun: taskHasExecutionLockedMission,
          titleChanged,
          scheduleChanged
        }
      });

      return { ok: true, reason: "updated", message };
    } catch (error) {
      const message = "퀘스트 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      console.error("퀘스트 수정 실패:", error);
      setFeedback(message);
      return { ok: false, reason: "unexpected_error", message };
    }
  };

  const handleSubmitTask = (): Promise<SubmitTaskResult> => {
    if (questComposerMode === "edit") {
      return handleUpdateTask();
    }

    return handleGenerateTask();
  };

  const handleStartMission = (missionId: string) => {
    const target = missions.find((mission) => mission.id === missionId);
    if (!target || !isActionableMissionStatus(target.status)) {
      return;
    }

    const metricState = gateMetricsRef.current;
    const startClickCount = (metricState.startClickCountByTaskId[target.taskId] ?? 0) + 1;
    metricState.startClickCountByTaskId[target.taskId] = startClickCount;
    const isFirstStart = !metricState.firstStartLoggedByTaskId[target.taskId];
    metricState.firstStartLoggedByTaskId[target.taskId] = true;

    const createdAtRaw = tasks.find((task) => task.id === target.taskId)?.createdAt;
    const createdAtMs = createdAtRaw ? new Date(createdAtRaw).getTime() : Number.NaN;
    const timeToFirstStartMs =
      isFirstStart && Number.isFinite(createdAtMs)
        ? Math.max(0, Date.now() - createdAtMs)
        : undefined;

    const nowIso = new Date().toISOString();
    const runningMissionIds = missions
      .filter((mission) => mission.status === "running" && mission.id !== missionId)
      .map((mission) => mission.id);

    setMissions((prev) =>
      prev.map((mission) => {
        if (mission.id === missionId) {
          return {
            ...mission,
            status: "running",
            startedAt: mission.startedAt ?? nowIso
          };
        }

        if (mission.status === "running") {
          return {
            ...mission,
            status: "paused"
          };
        }

        return mission;
      })
    );

    setTasks((prev) =>
      prev.map((task) =>
        task.id === target.taskId
          ? {
              ...task,
              status: task.status === "archived" ? "archived" : "in_progress",
              startedAt: task.startedAt ?? nowIso,
              completedAt: undefined
            }
          : task
      )
    );

    runningMissionIds.forEach((runningId) => {
      upsertTimerSession(runningId, "paused", nowIso);
    });

    upsertTimerSession(missionId, "running", nowIso);

    setRemainingSecondsByMission((prev) => ({
      ...prev,
      [missionId]: prev[missionId] ?? target.estMinutes * 60
    }));

    tickAccumulatorRef.current = createTimerElapsedAccumulator(Date.now());
    setCurrentMissionId(missionId);
    setActiveTaskId(target.taskId);

    logEvent({
      eventName: "mission_started",
      source: "local",
      taskId: target.taskId,
      missionId,
      meta: {
        startClickCount,
        firstStart: isFirstStart,
        timeToFirstStartMs: timeToFirstStartMs ?? null,
        withinThreeMinutes: timeToFirstStartMs !== undefined ? timeToFirstStartMs <= 180_000 : null
      }
    });

    const taskTitle = tasks.find((task) => task.id === target.taskId)?.title ?? "과업";
    pushLoopNotification({
      eventName: "mission_started",
      taskTitle,
      missionAction: target.action
    });
  };

  const handlePauseMission = (missionId: string) => {
    const target = missions.find((mission) => mission.id === missionId);
    if (!target || target.status !== "running") {
      return;
    }

    const nowIso = new Date().toISOString();

    setMissions((prev) =>
      prev.map((mission) =>
        mission.id === missionId
          ? {
              ...mission,
              status: "paused"
            }
          : mission
      )
    );

    upsertTimerSession(missionId, "paused", nowIso);
    tickAccumulatorRef.current = createTimerElapsedAccumulator();

    logEvent({
      eventName: "mission_paused",
      source: "local",
      taskId: target.taskId,
      missionId
    });
  };

  const handleCompleteMission = (missionId: string) => {
    const target = missions.find((mission) => mission.id === missionId);
    if (!target || !isActionableMissionStatus(target.status)) {
      return;
    }

    const nowIso = new Date().toISOString();
    const totalSeconds = target.estMinutes * 60;
    const remaining = remainingSecondsByMission[missionId] ?? totalSeconds;
    const actualSeconds = Math.max(1, totalSeconds - remaining);
    const questMissions = missions.filter((item) => item.taskId === target.taskId);
    const activeQuestMissions = questMissions.filter((mission) => mission.status !== "archived");
    const questMissionCount = Math.max(1, activeQuestMissions.length);
    const questCompleted = questMissions.every((mission) =>
      mission.id === missionId || isTaskClosedStatus(mission.status)
    );
    const hasAbandonedMission = activeQuestMissions.some((mission) => mission.status === "abandoned");
    const cleanQuestCompletion = questCompleted
      && !hasAbandonedMission
      && activeQuestMissions.every((mission) => mission.id === missionId || mission.status === "done");

    const candidateMissions = orderMissions(
      missions.filter((item) => item.taskId === target.taskId && item.id !== target.id)
    );
    const nextMission = candidateMissions.find((mission) => mission.order > target.order && isActionableMissionStatus(mission.status))
      ?? candidateMissions.find((mission) => isActionableMissionStatus(mission.status))
      ?? null;
    const runningMissionIdsToPause = missions
      .filter((mission) => mission.status === "running" && mission.id !== missionId && mission.id !== nextMission?.id)
      .map((mission) => mission.id);

    setMissions((prev) =>
      prev.map((mission) => {
        if (mission.id === missionId) {
          return {
            ...mission,
            status: "done",
            completedAt: nowIso,
            actualSeconds
          };
        }

        if (nextMission && mission.id === nextMission.id) {
          return {
            ...mission,
            status: "running",
            startedAt: mission.startedAt ?? nowIso
          };
        }

        if (nextMission && mission.status === "running") {
          return {
            ...mission,
            status: "paused"
          };
        }

        return mission;
      })
    );

    setRemainingSecondsByMission((prev) => {
      const next: Record<string, number> = {
        ...prev,
        [missionId]: 0
      };

      if (nextMission) {
        next[nextMission.id] = prev[nextMission.id] ?? nextMission.estMinutes * 60;
      }

      return next;
    });

    upsertTimerSession(missionId, "ended", nowIso);
    runningMissionIdsToPause.forEach((runningId) => {
      upsertTimerSession(runningId, "paused", nowIso);
    });
    if (nextMission) {
      upsertTimerSession(nextMission.id, "running", nowIso);
    }
    setCurrentMissionId(nextMission?.id ?? null);
    setActiveTaskId(target.taskId);
    tickAccumulatorRef.current = nextMission
      ? createTimerElapsedAccumulator(Date.now())
      : createTimerElapsedAccumulator();

    const previousCharacterRank = stats.characterRank;
    const missionCompletionRewardParams: MissionCompletionRewardParams = {
      stats,
      estMinutes: target.estMinutes,
      actualSeconds,
      questCompleted,
      questMissionCount,
      cleanQuestCompletion
    };
    const reward = applyMissionCompletionReward(missionCompletionRewardParams);
    const questCompletionBonusApplied = resolveQuestCompletionBonusApplied(reward, questCompleted);

    setStats(reward.nextStats);

    logEvent({
      eventName: "mission_completed",
      source: "local",
      taskId: target.taskId,
      missionId,
      meta: {
        actualSeconds,
        estMinutes: target.estMinutes,
        rewardGranted: true,
        questCompleted,
        cleanQuestCompletion,
        questMissionCount,
        questCompletionBonusApplied,
        axpGain: reward.axpGain,
        sgpGain: resolveRewardSgpGain(reward),
        accountLevel: reward.nextStats.accountLevel
      }
    });

    logRewardOutcomeEvents({
      reward,
      rewardGranted: true,
      taskId: target.taskId,
      missionId,
      reason: "mission_completion",
      previousCharacterRank
    });

    const taskTitle = tasks.find((task) => task.id === target.taskId)?.title ?? "과업";
    pushLoopNotification({
      eventName: "mission_completed",
      taskTitle,
      missionAction: target.action
    });
    if (nextMission) {
      logEvent({
        eventName: "mission_started",
        source: "system",
        taskId: target.taskId,
        missionId: nextMission.id,
        meta: {
          trigger: "auto_chain_after_complete",
          previousMissionId: missionId
        }
      });
    }

    const sgpGain = Math.max(0, Math.round(resolveRewardSgpGain(reward)));
    const questBonusFeedback = questCompletionBonusApplied
      ? "퀘스트 완료 보너스가 반영됐어요."
      : questCompleted
        ? "퀘스트는 완료했지만 완료 보너스는 적용되지 않았어요."
        : "퀘스트 완료 보너스는 아직 없어요.";
    setFeedback(
      `좋아요. +${reward.axpGain} AXP · +${sgpGain} SGP 획득! ${questBonusFeedback} ${
        nextMission ? "다음 미션로 바로 이어가요." : "오늘 루프를 완료했어요."
      }`
    );
  };

  const handleAdjustRunningMissionMinutes = (deltaMinutes: -5 | -1 | 1 | 5) => {
    if (!runningMission) {
      return;
    }

    const ownerTask = tasks.find((task) => task.id === runningMission.taskId);
    if (!ownerTask) {
      return;
    }

    const nextMinutes = runningMission.estMinutes + deltaMinutes;
    if (nextMinutes < MIN_MISSION_EST_MINUTES) {
      setFeedback(`실행 중 미션는 최소 ${MIN_MISSION_EST_MINUTES}분 이상이어야 합니다.`);
      return;
    }
    if (nextMinutes > MAX_MISSION_EST_MINUTES) {
      setFeedback(`실행 중 미션는 최대 ${MAX_MISSION_EST_MINUTES}분까지만 늘릴 수 있습니다.`);
      return;
    }

    const projectedMissions = [
      ...getTaskBudgetedMissions(missions, runningMission.taskId, runningMission.id),
      {
        ...runningMission,
        estMinutes: nextMinutes
      }
    ];
    if (!isWithinTaskMissionBudget(projectedMissions, ownerTask.totalMinutes)) {
      setFeedback("과업 총 시간 예산을 초과해서 미션 시간을 늘릴 수 없습니다.");
      return;
    }

    const previousMinutes = runningMission.estMinutes;
    const nowIso = new Date().toISOString();

    setMissions((prev) =>
      prev.map((mission) =>
        mission.id === runningMission.id
          ? {
              ...mission,
              estMinutes: nextMinutes
            }
          : mission
      )
    );

    setRemainingSecondsByMission((prev) => {
      const oldTotalSeconds = previousMinutes * 60;
      const nextTotalSeconds = nextMinutes * 60;
      const currentRemaining = prev[runningMission.id] ?? oldTotalSeconds;
      const progressRatio = oldTotalSeconds > 0 ? currentRemaining / oldTotalSeconds : 1;

      return {
        ...prev,
        [runningMission.id]: Math.max(0, Math.round(nextTotalSeconds * progressRatio))
      };
    });

    logEvent({
      eventName: "mission_time_adjusted",
      source: "user",
      taskId: runningMission.taskId,
      missionId: runningMission.id,
      meta: {
        deltaMinutes,
        previousMinutes,
        nextMinutes,
        adjustedAt: nowIso
      }
    });

    setFeedback(`실행 중 미션 시간을 ${nextMinutes}분으로 조정했습니다.`);
  };

  const handleEditTaskTotalMinutes = (task: Task) => {
    openQuestComposerForEdit(task);
  };

  const handleDeleteTask = (task: Task) => {
    if (executionLockedTaskId === task.id) {
      setFeedback("실행 중인 퀘스트는 삭제할 수 없습니다. 먼저 일시정지 또는 완료하세요.");
      return;
    }

    const confirmed = window.confirm(`"${task.title}" 퀘스트를 삭제할까요?`);
    if (!confirmed) {
      return;
    }

    const targetMissionIds = missions.filter((mission) => mission.taskId === task.id).map((mission) => mission.id);
    const missionIdSet = new Set(targetMissionIds);

    setTasks((prev) => prev.filter((item) => item.id !== task.id));
    setMissions((prev) => prev.filter((mission) => mission.taskId !== task.id));
    setTimerSessions((prev) => prev.filter((session) => !missionIdSet.has(session.missionId)));
    setRemainingSecondsByMission((prev) => {
      const next = { ...prev };
      targetMissionIds.forEach((missionId) => {
        delete next[missionId];
      });
      return next;
    });

    if (activeTaskId === task.id) {
      setActiveTaskId(null);
    }
    if (expandedHomeTaskId === task.id) {
      setExpandedHomeTaskId(null);
    }
    if (currentMissionId && missionIdSet.has(currentMissionId)) {
      setCurrentMissionId(null);
    }
    delete gateMetricsRef.current.startClickCountByTaskId[task.id];
    delete gateMetricsRef.current.firstStartLoggedByTaskId[task.id];
    delete gateMetricsRef.current.recoveryClickCountByTaskId[task.id];
    setFeedback(`퀘스트 "${task.title}"를 삭제했습니다.`);
  };

  const handleEditMission = (mission: Mission) => {
    if (isExecutionLocked) {
      setFeedback("실행 중에는 프롬프트 편집을 잠그고, 현재 미션의 ±1/±5분 조정만 허용됩니다.");
      return;
    }

    setMissionEditDraft({
      missionId: mission.id,
      action: mission.action,
      estMinutesInput: String(mission.estMinutes)
    });
    setMissionEditError(null);
  };

  const handleSubmitMissionEdit = () => {
    if (!missionEditDraft) {
      return;
    }

    const targetMission = missions.find((mission) => mission.id === missionEditDraft.missionId);
    if (!targetMission) {
      setMissionEditError("수정할 미션을 찾을 수 없습니다.");
      return;
    }

    const nextAction = missionEditDraft.action.trim();
    if (!nextAction) {
      setMissionEditError("미션 제목을 입력해주세요.");
      return;
    }

    const parsedMinutes = Number(missionEditDraft.estMinutesInput);
    if (!Number.isFinite(parsedMinutes)) {
      setMissionEditError("소요 시간은 숫자로 입력해주세요.");
      return;
    }

    const nextMinutes = clampMinuteInput(parsedMinutes);
    const ownerTask = tasks.find((task) => task.id === targetMission.taskId);
    if (!ownerTask) {
      setMissionEditError("미션 소유 퀘스트를 찾을 수 없습니다.");
      return;
    }

    const projectedBudgetMissions = [
      ...getTaskBudgetedMissions(missions, targetMission.taskId, targetMission.id),
      {
        ...targetMission,
        estMinutes: nextMinutes
      }
    ];
    if (!isWithinTaskMissionBudget(projectedBudgetMissions, ownerTask.totalMinutes)) {
      setMissionEditError("과업 총 시간 예산을 초과하여 미션 시간을 수정할 수 없습니다.");
      return;
    }

    setMissions((prev) =>
      prev.map((item) =>
        item.id === targetMission.id
          ? {
              ...item,
              action: nextAction,
              estMinutes: nextMinutes
            }
          : item
      )
    );

    setRemainingSecondsByMission((prev) => {
      if (targetMission.status === "done") {
        return prev;
      }

      const oldTotal = targetMission.estMinutes * 60;
      const newTotal = nextMinutes * 60;
      const current = prev[targetMission.id] ?? oldTotal;
      const ratio = oldTotal > 0 ? current / oldTotal : 1;

      return {
        ...prev,
        [targetMission.id]: Math.max(0, Math.round(newTotal * ratio))
      };
    });

    setFeedback("미션 정보를 수정했습니다.");
    closeMissionEditModal();
  };

  const handleReorderTaskMissions = (taskId: string, draggedMissionId: string, targetMissionId: string) => {
    if (draggedMissionId === targetMissionId) {
      return;
    }
    if (executionLockedTaskId === taskId) {
      setFeedback("실행 중인 퀘스트는 미션 순서를 변경할 수 없습니다.");
      return;
    }

    const orderedTaskMissions = orderMissions(missions.filter((mission) => mission.taskId === taskId));
    const reorderedTaskMissions = reorderTaskMissionsKeepingLocked(orderedTaskMissions, draggedMissionId, targetMissionId);
    if (!reorderedTaskMissions) {
      setFeedback("실행 중이거나 완료된 미션은 순서를 변경할 수 없습니다.");
      return;
    }

    const nextOrderById = new Map(reorderedTaskMissions.map((mission, index) => [mission.id, index + 1]));
    setMissions((prev) =>
      prev.map((mission) =>
        mission.taskId === taskId && nextOrderById.has(mission.id)
          ? {
              ...mission,
              order: nextOrderById.get(mission.id) ?? mission.order
            }
          : mission
      )
    );

    if (activeTaskId === taskId) {
      const nextPrimaryMission = reorderedTaskMissions.find((mission) => isActionableMissionStatus(mission.status)) ?? null;
      if (!nextPrimaryMission) {
        if (currentMissionId !== null) {
          setCurrentMissionId(null);
        }
      } else if (currentMissionId !== nextPrimaryMission.id) {
        setCurrentMissionId(nextPrimaryMission.id);
      }
    }

    setFeedback("미션 순서를 변경했습니다.");
  };

  const handleDeleteMission = (mission: Mission) => {
    const ok = window.confirm("이 미션를 삭제할까요?");
    if (!ok) {
      return;
    }

    const isDeletingRunningMission = mission.status === "running";
    const nowIso = new Date().toISOString();
    const nextCandidate = orderMissions(
      missions.filter((item) => item.taskId === mission.taskId && item.id !== mission.id)
    ).find((item) => isActionableMissionStatus(item.status)) ?? null;

    setMissions((prev) => withReorderedTaskMissions(prev.filter((item) => item.id !== mission.id), mission.taskId));

    setRemainingSecondsByMission((prev) => {
      const next = { ...prev };
      delete next[mission.id];
      return next;
    });

    if (isDeletingRunningMission) {
      upsertTimerSession(mission.id, "ended", nowIso);
      tickAccumulatorRef.current = createTimerElapsedAccumulator();
      delete lastHapticBucketByMissionRef.current[mission.id];
    }

    if (currentMissionId === mission.id || isDeletingRunningMission) {
      setCurrentMissionId(nextCandidate?.id ?? null);
    }
  };

  const handleRemission = (targetMissionId = currentMissionId) => {
    if (!targetMissionId) {
      return;
    }

    const target = missions.find((mission) => mission.id === targetMissionId);
    if (!target || !isActionableMissionStatus(target.status)) {
      return;
    }
    const ownerTask = tasks.find((task) => task.id === target.taskId);
    if (!ownerTask) {
      return;
    }

    const metricState = gateMetricsRef.current;
    const recoveryClickCount = (metricState.recoveryClickCountByTaskId[target.taskId] ?? 0) + 1;
    metricState.recoveryClickCountByTaskId[target.taskId] = recoveryClickCount;

    const nowIso = new Date().toISOString();

    const newMissions: Mission[] = [
      {
        id: crypto.randomUUID(),
        taskId: target.taskId,
        order: target.order + 1,
        action: `${target.action} - 첫 5분 버전`,
        estMinutes: Math.max(MIN_MISSION_EST_MINUTES, Math.floor(target.estMinutes / 2)),
        status: "todo",
        iconKey: target.iconKey,
        parentMissionId: target.id
      },
      {
        id: crypto.randomUUID(),
        taskId: target.taskId,
        order: target.order + 2,
        action: `${target.action} - 마무리 5분 버전`,
        estMinutes: Math.max(
          MIN_MISSION_EST_MINUTES,
          target.estMinutes -
            Math.max(MIN_MISSION_EST_MINUTES, Math.floor(target.estMinutes / 2))
        ),
        status: "todo",
        iconKey: target.iconKey,
        parentMissionId: target.id
      }
    ];

    const projectedBudgetMissions = [
      ...getTaskBudgetedMissions(missions, target.taskId, target.id),
      ...newMissions
    ];
    if (!isWithinTaskMissionBudget(projectedBudgetMissions, ownerTask.totalMinutes)) {
      setFeedback("리미션 결과가 과업 총 시간 예산을 초과해서 적용할 수 없습니다.");
      return;
    }

    setMissions((prev) => {
      const shifted: Mission[] = prev.map((mission): Mission => {
        if (mission.id === target.id) {
          return {
            ...mission,
            status: "archived"
          };
        }

        if (mission.taskId !== target.taskId) {
          return mission;
        }

        if (mission.order > target.order) {
          return {
            ...mission,
            order: mission.order + 2
          };
        }

        return mission;
      });

      return withReorderedTaskMissions([...shifted, ...newMissions], target.taskId);
    });

    setRemainingSecondsByMission((prev) => {
      const next = { ...prev };
      next[target.id] = 0;
      newMissions.forEach((mission) => {
        next[mission.id] = mission.estMinutes * 60;
      });
      return next;
    });

    upsertTimerSession(target.id, "ended", nowIso);
    tickAccumulatorRef.current = createTimerElapsedAccumulator();

    const previousCharacterRank = stats.characterRank;
    const recovery = applyRecoveryReward(stats);
    setStats(recovery.nextStats);

    setCurrentMissionId(newMissions[0].id);
    setActiveTaskId(target.taskId);

    logEvent({
      eventName: "remission_requested",
      source: "local",
      taskId: target.taskId,
      missionId: target.id,
      meta: {
        parentMissionId: target.id,
        newMissionCount: newMissions.length,
        recoveryClickCount,
        axpGain: recovery.axpGain,
        sgpGain: resolveRewardSgpGain(recovery),
        accountLevel: recovery.nextStats.accountLevel,
        rewardGranted: true
      }
    });

    logRewardOutcomeEvents({
      reward: recovery,
      rewardGranted: true,
      taskId: target.taskId,
      missionId: target.id,
      reason: "remission",
      recoveryClickCount,
      previousCharacterRank
    });

    setFeedback(RECOVERY_FEEDBACK.remissioned);
  };

  const handleReschedule = (targetTaskId = activeTaskId ?? homeTask?.id ?? null) => {
    if (!targetTaskId) {
      return;
    }

    const ownerTask = tasks.find((task) => task.id === targetTaskId);
    if (!ownerTask) {
      return;
    }

    const movedMissions = orderMissions(
      missions.filter((mission) => mission.taskId === targetTaskId && isActionableMissionStatus(mission.status))
    );
    if (movedMissions.length === 0) {
      return;
    }
    const primaryMission = movedMissions[0];

    const metricState = gateMetricsRef.current;
    const recoveryClickCount = (metricState.recoveryClickCountByTaskId[targetTaskId] ?? 0) + 1;
    metricState.recoveryClickCountByTaskId[targetTaskId] = recoveryClickCount;

    const nowIso = new Date().toISOString();
    const rescheduledFor = buildNextRescheduleDate();
    const activeSessionMissionIds = movedMissions
      .filter((mission) => mission.status === "running" || mission.status === "paused")
      .map((mission) => mission.id);

    setTasks((prev) =>
      prev.map((task) =>
        task.id === ownerTask.id
          ? {
              ...task,
              scheduledFor: rescheduledFor,
              dueAt: task.dueAt && Date.parse(task.dueAt) < Date.parse(rescheduledFor) ? rescheduledFor : task.dueAt,
              status: "todo",
              startedAt: undefined,
              completedAt: undefined
            }
          : task
      )
    );

    setMissions((prev) =>
      prev.map((mission) => {
        if (mission.taskId !== targetTaskId || !isActionableMissionStatus(mission.status)) {
          return mission;
        }

        return {
          ...mission,
          status: "todo",
          startedAt: undefined,
          rescheduledFor
        };
      })
    );

    setRemainingSecondsByMission((prev) => {
      const next = { ...prev };
      movedMissions.forEach((mission) => {
        next[mission.id] = Math.max(0, prev[mission.id] ?? mission.estMinutes * 60);
      });
      return next;
    });

    activeSessionMissionIds.forEach((sessionMissionId) => {
      upsertTimerSession(sessionMissionId, "ended", nowIso);
    });
    tickAccumulatorRef.current = createTimerElapsedAccumulator();
    setCurrentMissionId(movedMissions[0]?.id ?? null);
    setActiveTaskId(targetTaskId);

    const previousCharacterRank = stats.characterRank;
    const recovery = applyRecoveryReward(stats);
    setStats(recovery.nextStats);

    logEvent({
      eventName: "task_rescheduled",
      source: "local",
      taskId: targetTaskId,
      meta: {
        rescheduledFor,
        movedMissionCount: movedMissions.length,
        recoveryClickCount,
        axpGain: recovery.axpGain,
        sgpGain: resolveRewardSgpGain(recovery),
        accountLevel: recovery.nextStats.accountLevel,
        rewardGranted: true
      }
    });

    logEvent({
      eventName: "reschedule_requested",
      source: "local",
      taskId: targetTaskId,
      meta: {
        rescheduledFor,
        movedMissionCount: movedMissions.length,
        recoveryClickCount,
        axpGain: recovery.axpGain,
        sgpGain: resolveRewardSgpGain(recovery),
        accountLevel: recovery.nextStats.accountLevel,
        rewardGranted: true
      }
    });

    logRewardOutcomeEvents({
      reward: recovery,
      rewardGranted: true,
      taskId: targetTaskId,
      reason: "reschedule",
      recoveryClickCount,
      previousCharacterRank
    });

    setFeedback(RECOVERY_FEEDBACK.rescheduled);

    const taskTitle = ownerTask.title;
    pushLoopNotification({
      eventName: "task_rescheduled",
      taskTitle,
      missionAction: primaryMission?.action ?? "다음 미션"
    });
  };

  const handleResetAll = () => {
    const ok = window.confirm("모든 로컬 데이터를 초기화할까요?");
    if (!ok) {
      return;
    }

    resetCoreState();
    setCurrentMissionId(null);
    tickAccumulatorRef.current = createTimerElapsedAccumulator();
    resetSttTranscriptBuffers();
    setSttError(null);
    setIsSttListening(false);
    if (sttRecognitionRef.current) {
      sttRecognitionRef.current.stop();
      sttRecognitionRef.current = null;
    }
    setSyncStatus("IDLE");
    setSyncLastJobId(null);
    setSyncConflict(null);
    setSyncMessage("동기화 대기 중");
    setNotificationCapability(getNotificationCapability());
    setSttCapability(getSttCapability());
    setTaskMetaFeedback(null);
    setSelectedQuestSuggestionId(null);
    taskMetaEditingFieldRef.current = null;
    taskMetaLastDistinctEditedFieldRef.current = null;
    setFeedback("초기화 완료. 새 루프를 시작해보세요.");
  };

  const handlePromoteCharacterRank = () => {
    const promotion = applyCharacterRankPromotion({ stats });
    if (!promotion.promoted) {
      setFeedback("아직 승급 가능한 캐릭터 랭크가 없습니다. 스탯 누적을 조금 더 진행해보세요.");
      return;
    }

    setStats(promotion.nextStats);
    logEvent({
      eventName: "character_rank_changed",
      source: "user",
      meta: {
        reason: "manual_rank_up",
        previousRank: promotion.previousCharacterRank.rank,
        nextRank: promotion.nextCharacterRank.rank,
        previousBandIndex: promotion.previousCharacterRank.bandIndex,
        nextBandIndex: promotion.nextCharacterRank.bandIndex,
        previousScoreInBand: resolveDisplayScore(promotion.previousCharacterRank),
        nextScoreInBand: resolveDisplayScore(promotion.nextCharacterRank),
        pendingPromotionCount: promotion.pendingPromotionCount
      }
    });

    const pendingText = promotion.pendingPromotionCount > 0
      ? ` (추가 대기 ${promotion.pendingPromotionCount}단계)`
      : "";
    setFeedback(
      `랭크 업! 캐릭터 랭크가 ${promotion.previousCharacterRank.rank} → ${promotion.nextCharacterRank.rank}로 승급했어요.${pendingText}`
    );
  };

  const homeMission = useMemo(
    () => selectHomeMission(coreState, currentMissionId),
    [coreState, currentMissionId]
  );
  const homeTask = useMemo(
    () => selectHomeTask(coreState, currentMissionId),
    [coreState, currentMissionId]
  );
  const homeRemaining = useMemo(
    () => selectHomeRemaining(coreState, currentMissionId),
    [coreState, currentMissionId]
  );
  const homeTaskBudgetUsage = homeTask ? getTaskBudgetUsage(missions, homeTask.id) : 0;
  const runningOwnerTask = runningMission
    ? tasks.find((task) => task.id === runningMission.taskId) ?? null
    : null;
  const canAdjustRunningMissionMinutes = (deltaMinutes: -5 | -1 | 1 | 5): boolean => {
    if (!runningMission || !runningOwnerTask) {
      return false;
    }

    const nextMinutes = runningMission.estMinutes + deltaMinutes;
    if (nextMinutes < MIN_MISSION_EST_MINUTES || nextMinutes > MAX_MISSION_EST_MINUTES) {
      return false;
    }

    return isWithinTaskMissionBudget(
      [
        ...getTaskBudgetedMissions(missions, runningMission.taskId, runningMission.id),
        {
          ...runningMission,
          estMinutes: nextMinutes
        }
      ],
      runningOwnerTask.totalMinutes
    );
  };
  const canAdjustMinusFive = canAdjustRunningMissionMinutes(-5);
  const canAdjustMinusOne = canAdjustRunningMissionMinutes(-1);
  const canAdjustPlusOne = canAdjustRunningMissionMinutes(1);
  const canAdjustPlusFive = canAdjustRunningMissionMinutes(5);

  const homeTaskCards = tasks.filter((task) => task.status !== "archived" && task.status !== "done");

  return (
    <div className={styles.shell}>
      <div className={styles.noiseLayer} aria-hidden="true" />

      <header className={styles.topBar}>
        <div className={styles.topBarMain}>
          <div className={styles.titleGroup}>
            <h1 className={styles.brandTitle}>ADHDTime</h1>
            <p className={styles.levelSummary}>
              계정 LV.{stats.accountLevel} · 캐릭터 랭크 <span style={{ color: characterRankPalette.base }}>{stats.characterRank.rank}</span>
            </p>
          </div>
          <div className={styles.progressGroup}>
            <p className={styles.progressTitle}>
              오늘의 달성도
              <span>DAILY PROGRESS!</span>
            </p>
            <div className={styles.progressRing} style={dailyProgressRingStyle} aria-label={`오늘의 달성도 ${dailyProgressPercent}%`}>
              <div className={styles.progressRingInner}>
                <strong>{dailyProgressPercent}%</strong>
              </div>
            </div>
          </div>
        </div>
        <p className={styles.headerDateTime} suppressHydrationWarning>{formatDateTime(clock)}</p>
        <p className={styles.rollingTip} aria-live="polite">{rollingTip}</p>
      </header>

      {toastMessage ? (
        <div className={styles.toastPopup} role="alert" aria-live="assertive">
          {toastMessage}
        </div>
      ) : null}

      <main className={styles.app}>
        <TaskInputSection
          styles={styles}
          isComposerOpen={isQuestComposerOpen}
          composerMode={questComposerMode}
          onCloseComposer={closeQuestComposer}
          sttSupportState={sttSupportState}
          taskInput={taskInput}
          onTaskInputChange={handleTaskInputChange}
          questSuggestions={questSuggestions}
          selectedQuestSuggestionId={selectedQuestSuggestionId}
          onSelectQuestSuggestion={(suggestionId, title, estimatedTimeMin?: number) => {
            setTaskInput(title);
            setSelectedQuestSuggestionId(suggestionId);
            const matchedEstimatedTimeMin = typeof estimatedTimeMin === "number" && Number.isFinite(estimatedTimeMin)
              ? estimatedTimeMin
              : questSuggestions.find((suggestion) => suggestion.id === suggestionId)?.estimatedTimeMin;
            if (typeof matchedEstimatedTimeMin === "number" && Number.isFinite(matchedEstimatedTimeMin)) {
              handleSetTaskTotalMinutesFromScheduled(matchedEstimatedTimeMin);
            }
          }}
          isSttListening={isSttListening}
          onStartStt={handleStartStt}
          onStopStt={handleStopStt}
          sttCapability={sttCapability}
          onSubmitTask={handleSubmitTask}
          feedbackMessage={feedback}
          isGenerating={isGenerating}
          taskTotalMinutesInput={taskTotalMinutesInput}
          onSetTaskTotalMinutesFromScheduled={handleSetTaskTotalMinutesFromScheduled}
          onAdjustTaskTotalMinutesFromScheduled={handleAdjustTaskTotalMinutesFromScheduled}
          taskScheduledForInput={taskScheduledForInput}
          onTaskScheduledForInputChange={handleTaskScheduledForInputChange}
          taskDueAtInput={taskDueAtInput}
          onTaskDueAtInputChange={handleTaskDueAtInputChange}
          taskMetaFeedback={taskMetaFeedback}
          sttTranscript={sttTranscript}
          sttError={sttError}
        />

        {missionEditDraft ? (
          <div
            className={styles.questModalBackdrop}
            onClick={closeMissionEditModal}
            role="presentation"
          >
            <section
              className={styles.questModal}
              role="dialog"
              aria-modal="true"
              aria-label="미션 수정"
              onClick={(event) => event.stopPropagation()}
            >
              <header className={styles.questModalHeader}>
                <h3>미션 수정</h3>
                <button
                  type="button"
                  className={styles.subtleButton}
                  onClick={closeMissionEditModal}
                  aria-label="미션 수정 모달 닫기"
                >
                  ✕
                </button>
              </header>

              <div className={styles.missionEditForm}>
                <label className={styles.metaField} htmlFor="mission-edit-action">
                  <span>미션 제목</span>
                  <input
                    id="mission-edit-action"
                    value={missionEditDraft.action}
                    onChange={(event) =>
                      setMissionEditDraft((prev) => (prev ? { ...prev, action: event.target.value } : prev))
                    }
                    className={styles.input}
                    placeholder="미션 제목"
                  />
                </label>

                <label className={styles.metaField} htmlFor="mission-edit-minutes">
                  <span>소요 시간(분)</span>
                  <input
                    id="mission-edit-minutes"
                    type="number"
                    min={MIN_MISSION_EST_MINUTES}
                    max={MAX_MISSION_EST_MINUTES}
                    value={missionEditDraft.estMinutesInput}
                    onChange={(event) =>
                      setMissionEditDraft((prev) => (prev ? { ...prev, estMinutesInput: event.target.value } : prev))
                    }
                    className={styles.input}
                    inputMode="numeric"
                  />
                </label>
              </div>

              {missionEditError ? <p className={styles.errorText}>{missionEditError}</p> : null}

              <div className={styles.questModalFooter}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSubmitMissionEdit}
                >
                  미션 저장
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "home" || activeTab === "stats" ? (
          <section className={styles.statusSection}>
            <div className={styles.statusCard}>
              <h2 className={styles.statusCardTitle}>캐릭터 상태</h2>
              <div className={styles.levelBlock}>
                <div className={styles.avatarRow}>
                  <div className={styles.characterAvatar} aria-hidden="true">🧙</div>
                  {canPromoteCharacterRank ? (
                    <div className={styles.rankUpCtaRow}>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={handlePromoteCharacterRank}
                        style={{
                          height: 36,
                          paddingInline: 12,
                          transform: isRankUpCtaHighlighted ? "translateY(-1px) scale(1.03)" : "translateY(0) scale(1)",
                          boxShadow: isRankUpCtaHighlighted
                            ? "0 8px 20px rgba(242, 114, 30, 0.4)"
                            : "0 4px 12px rgba(242, 114, 30, 0.22)",
                          transition: "transform 220ms ease, box-shadow 220ms ease"
                        }}
                      >
                        [랭크UP!]
                      </button>
                      <p className={`${styles.helperText} ${styles.rankUpNextLabel}`}>
                        다음 랭크 {characterRankPromotionPreview.nextCharacterRank.rank}
                        {pendingCharacterPromotionCount > 1 ? ` · 추가 대기 ${pendingCharacterPromotionCount - 1}단계` : ""}
                      </p>
                    </div>
                  ) : null}
                </div>
                <p className={styles.levelLabel}>계정 레벨 LV.{stats.accountLevel}</p>
                <p className={styles.levelXp}>AXP {stats.axp}</p>
                <p className={styles.levelLabel} style={{ color: characterRankPalette.base }}>
                  캐릭터 랭크 {stats.characterRank.rank} · {characterTotalScore}
                </p>
                <div className={styles.xpTrack} aria-hidden="true">
                  <span style={{ width: `${axpProgressPercent}%` }} />
                </div>
                <p className={styles.todaySummary}>
                  오늘 완료 {stats.todayCompleted}개 · +{stats.todayAxpGain} AXP · +{todaySgpGainScore} SGP
                </p>
              </div>

              <div className={styles.radarBlock}>
                <div className={styles.radarWrap}>
                  <svg viewBox="0 0 120 120" className={styles.radarSvg} role="img" aria-label="5스탯 레이더 차트">
                    {radar.grid.map((gridLine, index) => (
                      <polygon key={gridLine} points={gridLine} className={styles.radarGrid} data-level={index} />
                    ))}
                    {STAT_META.map((_, index) => {
                      const angle = (-Math.PI / 2) + (index * Math.PI * 2) / STAT_META.length;
                      const x = 60 + Math.cos(angle) * 48;
                      const y = 60 + Math.sin(angle) * 48;
                      return <line key={STAT_META[index].key} x1={60} y1={60} x2={x} y2={y} className={styles.radarAxis} />;
                    })}
                    {radarBaseline ? (
                      <polygon
                        points={radarBaseline.data}
                        className={styles.radarBaselineData}
                      />
                    ) : null}
                    <polygon
                      points={radar.data}
                      className={styles.radarData}
                      style={{ fill: characterRankPalette.fill, stroke: characterRankPalette.base }}
                    />
                  </svg>
                  <div className={styles.radarLabelLayer} aria-hidden="true">
                    {STAT_META.map((item, index) => {
                      const angle = (-Math.PI / 2) + (index * Math.PI * 2) / STAT_META.length;
                      const x = RADAR_LABEL_CENTER_PERCENT + Math.cos(angle) * RADAR_LABEL_RADIUS_PERCENT;
                      const y = RADAR_LABEL_CENTER_PERCENT + Math.sin(angle) * RADAR_LABEL_RADIUS_PERCENT;
                      const rankState = stats.statRanks[item.key];
                      const statPalette = resolveRankPalette(rankState.rank);
                      return (
                        <div
                          key={item.key}
                          className={styles.radarStatBadge}
                          style={{ left: `${x}%`, top: `${y}%`, color: statPalette.base }}
                        >
                          <span>{item.label}</span>
                          <strong>{rankState.rank}</strong>
                          <small>{resolveTotalScore(rankState)}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {radarBaseline ? (
                  <div className={styles.radarLegend} aria-hidden="true">
                    <span className={styles.radarLegendItem}>
                      <span
                        className={`${styles.radarLegendSwatch} ${styles.radarLegendCurrentSwatch}`}
                        style={{ color: characterRankPalette.base }}
                      />
                      현재
                    </span>
                    <span className={styles.radarLegendItem}>
                      <span className={`${styles.radarLegendSwatch} ${styles.radarLegendBaselineSwatch}`} />
                      {RECENT_RADAR_WINDOW_DAYS}일 전
                    </span>
                  </div>
                ) : (
                  <p className={styles.radarHelperText}>최근 7일 데이터 수집 중</p>
                )}
                <ul className={styles.statList} aria-hidden="true">
                  {STAT_META.map((item) => {
                    const rankState = stats.statRanks[item.key];
                    const statPalette = resolveRankPalette(rankState.rank);
                    return (
                      <li key={item.key}>
                        <span>{item.label}</span>
                        <strong style={{ color: statPalette.base }}>
                          {rankState.rank} · {resolveTotalScore(rankState)}
                        </strong>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "home" ? (
          <HomeView
            styles={styles}
            homeMission={homeMission}
            homeTask={homeTask}
            homeRemaining={homeRemaining}
            homeTaskBudgetUsage={homeTaskBudgetUsage}
            completionRate={completionRate}
            homeTaskCards={homeTaskCards}
            missions={missions}
            expandedHomeTaskId={expandedHomeTaskId}
            remainingSecondsByMission={remainingSecondsByMission}
            isExecutionLocked={isExecutionLocked}
            onSetActiveTaskId={setActiveTaskId}
            onToggleExpandedHomeTaskId={(taskId) => {
              setExpandedHomeTaskId((prev) => (prev === taskId ? null : taskId));
            }}
            onStartMission={handleStartMission}
            onPauseMission={handlePauseMission}
            onCompleteMission={handleCompleteMission}
            onAdjustRunningMissionMinutes={handleAdjustRunningMissionMinutes}
            canAdjustMinusFive={canAdjustMinusFive}
            canAdjustMinusOne={canAdjustMinusOne}
            canAdjustPlusOne={canAdjustPlusOne}
            canAdjustPlusFive={canAdjustPlusFive}
            onRemission={handleRemission}
            onReschedule={handleReschedule}
            onEditTaskTotalMinutes={handleEditTaskTotalMinutes}
            onDeleteTask={handleDeleteTask}
            onReorderTaskMissions={handleReorderTaskMissions}
            onEditMission={handleEditMission}
            onDeleteMission={handleDeleteMission}
          />
        ) : null}

        {activeTab === "tasks" ? (
          <TasksView
            styles={styles}
            tasks={tasks}
            activeTask={activeTask}
            activeTaskId={activeTaskId}
            activeTaskBudgetUsage={activeTaskBudgetUsage}
            activeTaskMissions={activeTaskMissions}
            currentMissionId={currentMissionId}
            remainingSecondsByMission={remainingSecondsByMission}
            isExecutionLocked={isExecutionLocked}
            onSetActiveTaskId={setActiveTaskId}
            onEditTaskTotalMinutes={handleEditTaskTotalMinutes}
            onStartMission={handleStartMission}
            onPauseMission={handlePauseMission}
            onCompleteMission={handleCompleteMission}
            onEditMission={handleEditMission}
            onDeleteMission={handleDeleteMission}
          />
        ) : null}

        {activeTab === "stats" ? (
          <StatsView
            styles={styles}
            stats={stats}
            completionRate={completionRate}
            kpis={kpis}
            events={events}
          />
        ) : null}

        {activeTab === "settings" ? (
          <SettingsView
            styles={styles}
            notificationState={notificationState}
            notificationFallbackText={notificationFallbackText}
            notificationCapability={notificationCapability}
            isRequestingNotificationPermission={isRequestingNotificationPermission}
            onRequestNotification={handleRequestNotification}
            settings={settings}
            onHapticEnabledChange={(enabled) => {
              setSettings((prev) => ({
                ...prev,
                hapticEnabled: enabled
              }));
            }}
            syncStatusLabel={syncStatusLabel}
            syncMessage={syncMessage}
            syncLastJobId={syncLastJobId}
            syncConflict={syncConflict}
            isSyncBusy={isSyncBusy}
            onRunSyncMock={handleRunSyncMock}
            onResetAll={handleResetAll}
          />
        ) : null}
      </main>

      <nav className={styles.tabBar} aria-label="하단 탭">
        <div className={styles.tabGroup}>
          {LEFT_TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={tab.key === activeTab ? styles.tabButtonActive : styles.tabButton}
              onClick={() => setActiveTab(tab.key)}
              aria-label={tab.label}
            >
              <span className={styles.tabIcon} aria-hidden="true">{tab.icon}</span>
              <span className={styles.tabLabelKr}>{tab.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.tabCreateButton}
          onClick={openQuestComposerForCreate}
          aria-label="AI 퀘스트 생성 모달 열기"
          title="AI 퀘스트 생성"
        >
          <span className={styles.tabCreateIcon} aria-hidden="true">⚔️</span>
          <span className={styles.tabCreateLabel}>
            <span className={styles.tabCreateLabelLine}>퀘스트</span>
            <span className={styles.tabCreateLabelLine}>생성</span>
          </span>
        </button>
        <div className={styles.tabGroup}>
          {RIGHT_TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={tab.key === activeTab ? styles.tabButtonActive : styles.tabButton}
              onClick={() => setActiveTab(tab.key)}
              aria-label={tab.label}
            >
              <span className={styles.tabIcon} aria-hidden="true">{tab.icon}</span>
              <span className={styles.tabLabelKr}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
