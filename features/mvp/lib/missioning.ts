import {
  type Mission,
  type MissionDraft,
  type MissionIconKey,
  MAX_TASK_TOTAL_MINUTES,
  MAX_MISSION_EST_MINUTES,
  MIN_TASK_TOTAL_MINUTES,
  MIN_MISSION_EST_MINUTES,
  RECOMMENDED_MAX_MISSION_COUNT,
  RECOMMENDED_MIN_MISSION_COUNT,
  TASK_SUMMARY_MAX_LENGTH,
  type MissionTemplate,
  type MissioningResult
} from "@/features/mvp/types/domain";
import missionPresetsJson from "@/docs/adhd_mission_presets.json";

export interface MissioningValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

type PresetPersona =
  | "student"
  | "worker"
  | "homemaker"
  | "developer"
  | "office_worker"
  | "writer"
  | "entertainment"
  | "travel"
  | "exercise";
type PresetType = "routine" | "non_routine";
type PresetCadence = "daily" | "weekly";
type PresetEnergyCost = "low" | "mid" | "high";

type RouteDomain = "life_ops" | "productivity_growth" | "recovery_health" | "non_routine";
type RouteState =
  | "start_delay"
  | "in_progress"
  | "blocked"
  | "fatigued"
  | "completion_push"
  | "reset_needed"
  | "avoidance_refusal";
type RouteTimeContext =
  | "morning"
  | "commute"
  | "work_am"
  | "lunch"
  | "work_pm"
  | "evening"
  | "night"
  | "weekend_am"
  | "weekend_pm"
  | "weekend_night"
  | "pre_event"
  | "post_event";

interface PresetTimeWindow {
  start: string;
  end: string;
  flexMin: number;
}

interface PresetSuccessCriteria {
  minCompletedMissions: number;
  mustIncludeRecordMission: boolean;
}

interface PresetMission {
  action: string;
  estMinutes: number;
  difficulty: number;
  notes: string;
  iconKey?: MissionIconKey;
}

interface RawMissionPreset {
  schemaVersion?: unknown;
  id?: unknown;
  persona?: unknown;
  type?: unknown;
  cadence?: unknown;
  weekdayMask?: unknown;
  timeWindow?: unknown;
  intent?: unknown;
  title?: unknown;
  summary?: unknown;
  priority?: unknown;
  estimatedTimeMin?: unknown;
  difficulty?: unknown;
  energyCost?: unknown;
  examples?: unknown;
  missions?: unknown;
  successCriteria?: unknown;
  fallbackQuestIds?: unknown;
  tags?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface MissionPreset {
  schemaVersion: string;
  id: string;
  persona: PresetPersona;
  type: PresetType;
  cadence: PresetCadence;
  weekdayMask: number[];
  timeWindow: PresetTimeWindow;
  intent: string;
  title: string;
  summary: string;
  priority: number;
  estimatedTimeMin: number;
  difficulty: number;
  energyCost: PresetEnergyCost;
  examples: string[];
  missions: PresetMission[];
  successCriteria: PresetSuccessCriteria;
  fallbackQuestIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  domain: RouteDomain;
  timeContext: RouteTimeContext;
}

interface RouteCandidate {
  domain: RouteDomain;
  state: RouteState;
  timeContext: RouteTimeContext;
  persona: PresetPersona;
  type: PresetType;
  personaExplicit: boolean;
  domainExplicit: boolean;
  timeExplicit: boolean;
  typeExplicit: boolean;
  confidence: number;
  reasonCodes: string[];
}

interface NormalizedRoutingInput {
  rawText: string;
  normalizedText: string;
  compactText: string;
  tokens: string[];
  hasHangul: boolean;
  hasKnownEnglishKeyword: boolean;
}

interface QueryRoutingContext {
  normalizedInput: NormalizedRoutingInput;
  routeCandidates: RouteCandidate[];
}

interface ScoredPresetCandidate {
  preset: MissionPreset;
  totalScore: number;
  similarity: number;
  rerankConfidence: number;
  routeConfidence: number;
  routeCandidate: RouteCandidate | null;
  priority: number;
  difficulty: number;
  estimatedTimeMin: number;
  taskId: string;
  isExactTitleMatch: boolean;
}

export interface LocalPresetRankCandidate {
  id: string;
  intent: string;
  title: string;
  persona: PresetPersona;
  type: PresetType;
  domain: RouteDomain;
  state: RouteState;
  timeContext: RouteTimeContext;
  totalScore: number;
  similarity: number;
  rerankConfidence: number;
  routeConfidence: number;
  priority: number;
  difficulty: number;
  estimatedTimeMin: number;
}

export interface GenerateLocalMissioningOptions {
  forcePresetId?: string;
  preferTopRank?: boolean;
}

interface SparseVector {
  weights: Map<string, number>;
  norm: number;
}

interface PresetSearchIndex {
  preset: MissionPreset;
  vector: SparseVector;
  tokens: Set<string>;
  titleVector: SparseVector;
  intentVector: SparseVector;
  exampleVectors: SparseVector[];
}

interface RouteAlignmentResult {
  score: number;
  normalized: number;
  routeCandidate: RouteCandidate | null;
}

const VALID_PERSONAS: readonly PresetPersona[] = [
  "student",
  "worker",
  "homemaker",
  "developer",
  "office_worker",
  "writer",
  "entertainment",
  "travel",
  "exercise"
];
const NON_ROUTINE_PERSONAS = new Set<PresetPersona>(["entertainment", "travel", "exercise"]);
const VALID_TYPES: readonly PresetType[] = ["routine", "non_routine"];
const VALID_CADENCES: readonly PresetCadence[] = ["daily", "weekly"];
const VALID_ENERGY_COSTS: readonly PresetEnergyCost[] = ["low", "mid", "high"];

const DEFAULT_SCHEMA_VERSION = "1.0.0";
const DEFAULT_WEEKDAY_MASK = [1, 1, 1, 1, 1, 1, 1];
const DEFAULT_CREATED_AT = "2026-02-28T00:00:00.000Z";

const RULE_PRIMARY_CONFIDENCE_THRESHOLD = 0.72;
const RERANK_TOP1_CONFIDENCE_THRESHOLD = 0.78;
const RERANK_TOP1_GAP_THRESHOLD = 0.06;
const FALLBACK_ROUTE_CONFIDENCE_THRESHOLD = 0.62;

const WORD_TOKEN_WEIGHT = 1;
const BIGRAM_TOKEN_WEIGHT = 0.45;
const TRIGRAM_TOKEN_WEIGHT = 0.25;
const PRESET_SIMILARITY_SCORE_WEIGHT = 100;
const PRESET_TITLE_SIMILARITY_WEIGHT = 36;
const PRESET_EXAMPLE_SIMILARITY_WEIGHT = 42;
const PRESET_INTENT_SIMILARITY_WEIGHT = 22;
const PRESET_TOKEN_OVERLAP_WEIGHT = 18;
const PRESET_INTENT_HINT_WEIGHT = 24;
const PRESET_PRIORITY_WEIGHT = 4;
const PRESET_ROUTE_SCORE_WEIGHT = 40;
const PRESET_RERANK_CONFIDENCE_WEIGHT = 64;
const PRESET_INTENT_HINT_SIGNAL_BONUS = 0.09;
const PRESET_MIN_SIGNAL_SCORE = 0.07;
const PRESET_EXACT_TITLE_MATCH_BONUS = 10_000;
const DEFAULT_MISSION_NOTE = "완료 조건 체크";
const TIME_VALUE_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const INTENT_HINTS: Record<string, string[]> = {
  home_cleaning: ["청소", "정리", "치우기", "집안일", "리셋", "구역 정리"],
  laundry_clothing: ["빨래", "세탁", "옷 정리", "건조", "옷장", "복장 준비"],
  meal_nutrition: ["식사", "밥", "설거지", "주방", "냉장고", "수분"],
  grooming_hygiene: ["양치", "세안", "샤워", "위생", "출발 준비"],
  sleep_wake_routine: ["기상", "취침", "잠", "알람", "수면", "아침 루틴"],
  health_exercise: ["운동", "스트레칭", "걷기", "피로", "회복", "호흡"],
  outing_mobility: ["외출", "장보기", "병원", "택배", "이동", "심부름"],
  admin_finance: ["공과금", "자동이체", "영수증", "생활비", "정산", "납부"],
  digital_organizing: ["파일 정리", "다운로드", "알림", "백업", "메일함", "디지털"],
  relationship_communication: ["연락", "답장", "약속", "협업", "가족", "메시지"],
  study_growth: ["공부", "복습", "학습", "시험", "집필", "퇴고"],
  work_start_recovery: [
    "업무", "재시작", "복귀", "회의", "메일", "출근", "사무실", "회사 가기 싫어", "사무실 가기 싫어", "일 하기 싫어"
  ],
  entertainment_refresh: ["콘텐츠", "감상", "관람", "공연", "전시", "엔터테인먼트"],
  travel_planning: ["여행", "예약", "동선", "출발", "서류", "예산"],
  exercise_challenge: ["운동", "유산소", "근력", "워밍업", "피로도", "회복"],
  work_execution: ["업무", "문서", "보고", "실행"]
};

const INTENT_DOMAIN_MAP: Record<string, RouteDomain> = {
  home_cleaning: "life_ops",
  laundry_clothing: "life_ops",
  meal_nutrition: "life_ops",
  outing_mobility: "life_ops",
  admin_finance: "life_ops",
  digital_organizing: "life_ops",
  study_growth: "productivity_growth",
  work_start_recovery: "productivity_growth",
  relationship_communication: "productivity_growth",
  work_execution: "productivity_growth",
  grooming_hygiene: "recovery_health",
  health_exercise: "recovery_health",
  sleep_wake_routine: "recovery_health",
  entertainment_refresh: "non_routine",
  travel_planning: "non_routine",
  exercise_challenge: "non_routine"
};

const QUERY_EXPANSION_RULES: Array<{ trigger: RegExp; expansions: string[] }> = [
  { trigger: /(청소|정리|치우)/, expansions: ["청소", "정리", "집안일", "리셋"] },
  { trigger: /(빨래|세탁|의류|옷장|복장)/, expansions: ["빨래", "세탁", "옷 정리", "복장 준비"] },
  { trigger: /(밥|식사|설거지|주방|냉장고|수분)/, expansions: ["식사", "주방", "설거지", "식재료", "수분"] },
  { trigger: /(양치|세안|샤워|위생)/, expansions: ["위생", "세면", "그루밍"] },
  { trigger: /(잠|수면|기상|취침|알람)/, expansions: ["기상", "취침", "수면 루틴"] },
  { trigger: /(운동|걷기|스트레칭|피로|호흡|러닝|근력)/, expansions: ["운동", "스트레칭", "회복", "워밍업"] },
  { trigger: /(외출|장보기|장보|병원|택배|심부름|이동)/, expansions: ["외출", "이동", "심부름", "장보기"] },
  { trigger: /(공과금|납부|자동이체|영수증|생활비|정산)/, expansions: ["납부", "자동이체", "생활비", "정산"] },
  { trigger: /(파일|다운로드|바탕화면|알림|백업|메일함)/, expansions: ["파일 정리", "디지털 정리", "알림 관리"] },
  { trigger: /(답장|연락|약속|가족|지인|협업)/, expansions: ["연락", "답장", "약속", "협업"] },
  { trigger: /(공부|복습|학습|시험|집필|원고|퇴고|투고)/, expansions: ["공부", "학습", "복습", "집필"] },
  { trigger: /(업무|재시동|복귀|회의|메일|출근|회사|사무실)/, expansions: ["업무", "재시작", "복귀", "work_start_recovery"] },
  { trigger: /(콘텐츠|영화|공연|전시|감상|드라마)/, expansions: ["entertainment", "콘텐츠", "감상"] },
  { trigger: /(여행|예약|출발|숙소|동선|예산)/, expansions: ["travel", "여행", "체크리스트"] },
  { trigger: /(운동 챌린지|운동 계획|유산소|근력)/, expansions: ["exercise", "운동", "회복"] },
  { trigger: /(회사 가기 싫어|사무실 가기 싫어|일 하기 싫어)/, expansions: ["출근", "재시동", "탑1 업무", "work_start_recovery"] }
];

const ROUTE_EXPANSIONS: {
  byPersona: Record<PresetPersona, string[]>;
  byDomain: Record<RouteDomain, string[]>;
  byState: Record<RouteState, string[]>;
} = {
  byPersona: {
    student: ["공부", "복습", "과제"],
    worker: ["출근", "업무", "회의"],
    homemaker: ["가사", "세탁", "주방"],
    developer: ["개발", "코딩", "리뷰"],
    office_worker: ["사무실", "결재", "보고"],
    writer: ["집필", "원고", "퇴고"],
    entertainment: ["콘텐츠", "감상", "관람"],
    travel: ["여행", "예약", "동선"],
    exercise: ["운동", "워밍업", "회복"]
  },
  byDomain: {
    life_ops: ["생활", "정리", "운영"],
    productivity_growth: ["착수", "집중", "실행"],
    recovery_health: ["회복", "수면", "스트레칭"],
    non_routine: ["비일상", "준비", "이벤트"]
  },
  byState: {
    start_delay: ["작게 시작", "착수", "5분"],
    in_progress: ["진행", "유지"],
    blocked: ["막힘 해소", "우선순위"],
    fatigued: ["회복", "부담 낮게"],
    completion_push: ["마감", "마무리"],
    reset_needed: ["리셋", "정돈"],
    avoidance_refusal: ["재시동", "탑1", "7분", "10분"]
  }
};

const SCORE_STOPWORDS = new Set<string>([
  "먼저",
  "단계",
  "진행하기",
  "시작하기",
  "루틴",
  "완료",
  "체크",
  "체크하기",
  "해야",
  "해",
  "미루고",
  "있어",
  "다음",
  "행동",
  "결과",
  "기록",
  "예약"
]);

const ACTION_START_VERB_PATTERN =
  /^(시작|준비|정리|분류|작성|확인|검토|실행|제출|저장|기록|예약|마무리|요약|복습|정돈|선택|고르|읽|적|풀|버리|담|옮기|닦|체크|보내|완료|쪼개|정하|계획)/;
const ACTION_END_VERB_PATTERN =
  /(하기|해보기|작성|정리|확인|검토|실행|준비|제출|저장|기록|예약|마무리|요약|복습|정돈|정하기|적기|읽기|풀기|버리기|담기|옮기기|닦기|고르기|체크하기|보내기|꺼내기|모으기|비우기|완료|종료)$/;
const ACTION_CONTAINS_VERB_PATTERN =
  /(하기|해보기|작성|정리|확인|검토|실행|준비|제출|저장|기록|예약|마무리|요약|복습|정돈|정하|적기|읽기|풀기|버리기|담기|옮기기|닦기|고르기|체크|보내|꺼내|모으|비우|시작|종료)/;
const ACTION_KOREAN_DECLARATIVE_END_PATTERN = /[가-힣]+(다|요)(\([^)]*\))?$/;

const EST_MINUTES_RANGE_LABEL = `${MIN_MISSION_EST_MINUTES}~${MAX_MISSION_EST_MINUTES}분`;
const MISSION_COUNT_RECOMMENDED_LABEL = `${RECOMMENDED_MIN_MISSION_COUNT}~${RECOMMENDED_MAX_MISSION_COUNT}개`;
const DEFAULT_MISSION_ICON_KEY: MissionIconKey = "default";
const MISSION_ICON_RULES: Array<{ iconKey: MissionIconKey; keywords: string[] }> = [
  { iconKey: "routine", keywords: ["알람", "기상", "취침", "잠", "루틴", "아침", "저녁", "세면", "물", "침대"] },
  { iconKey: "organize", keywords: ["정리", "청소", "정돈", "분류", "버리", "치우", "옮기", "정렬"] },
  { iconKey: "record", keywords: ["작성", "적기", "기록", "메모", "입력", "정리노트"] },
  { iconKey: "review", keywords: ["확인", "검토", "체크", "점검", "요약", "마무리", "완료"] },
  { iconKey: "schedule", keywords: ["일정", "예약", "계획", "마감", "시간", "동선", "출발"] },
  { iconKey: "break", keywords: ["휴식", "스트레칭", "호흡", "산책", "쉬기", "회복"] },
  { iconKey: "execute", keywords: ["시작", "실행", "집중", "작업", "진행", "핵심", "처리", "착수"] }
];

const TIME_CONTEXT_WINDOWS: Record<RouteTimeContext, PresetTimeWindow> = {
  morning: { start: "06:00", end: "09:30", flexMin: 45 },
  commute: { start: "07:00", end: "09:30", flexMin: 30 },
  work_am: { start: "09:00", end: "12:30", flexMin: 45 },
  lunch: { start: "12:00", end: "14:00", flexMin: 35 },
  work_pm: { start: "13:30", end: "18:30", flexMin: 50 },
  evening: { start: "18:00", end: "21:30", flexMin: 45 },
  night: { start: "21:00", end: "23:59", flexMin: 30 },
  weekend_am: { start: "08:00", end: "11:30", flexMin: 60 },
  weekend_pm: { start: "12:00", end: "18:30", flexMin: 60 },
  weekend_night: { start: "19:00", end: "23:30", flexMin: 45 },
  pre_event: { start: "17:00", end: "21:00", flexMin: 60 },
  post_event: { start: "20:00", end: "23:30", flexMin: 45 }
};

const ROUTINE_PERSONA_FAMILY = new Set<PresetPersona>(["worker", "office_worker", "developer", "writer"]);
const NON_ROUTINE_INTENTS = new Set<string>(["entertainment_refresh", "travel_planning", "exercise_challenge"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeWeekdayMask(value: unknown, cadence: PresetCadence): number[] {
  if (Array.isArray(value) && value.length === 7) {
    const normalized = value.map((day) => (day === 1 ? 1 : 0));
    if (normalized.some((day) => day === 1)) {
      return normalized;
    }
  }

  if (cadence === "weekly") {
    return [1, 0, 0, 0, 0, 0, 1];
  }

  return [...DEFAULT_WEEKDAY_MASK];
}

function normalizeTimeWindow(value: unknown, fallbackTimeContext: RouteTimeContext): PresetTimeWindow {
  if (isRecord(value)) {
    const start = typeof value.start === "string" ? value.start.trim() : "";
    const end = typeof value.end === "string" ? value.end.trim() : "";
    const flexMinRaw = Number(value.flexMin);
    const flexMin = Number.isFinite(flexMinRaw) ? Math.max(0, Math.min(180, Math.floor(flexMinRaw))) : NaN;

    if (TIME_VALUE_PATTERN.test(start) && TIME_VALUE_PATTERN.test(end) && Number.isFinite(flexMin)) {
      return { start, end, flexMin };
    }
  }

  return TIME_CONTEXT_WINDOWS[fallbackTimeContext];
}

function inferPersonaFromId(id: string): PresetPersona {
  const prefix = id.slice(0, 3);
  const byPrefix: Record<string, PresetPersona> = {
    STU: "student",
    WRK: "worker",
    HME: "homemaker",
    DEV: "developer",
    OFC: "office_worker",
    WRT: "writer",
    ENT: "entertainment",
    TRV: "travel",
    EXR: "exercise"
  };

  return byPrefix[prefix] ?? "worker";
}

function inferDomainFromIntent(intent: string, type: PresetType): RouteDomain {
  if (INTENT_DOMAIN_MAP[intent]) {
    return INTENT_DOMAIN_MAP[intent];
  }

  if (type === "non_routine") {
    return "non_routine";
  }

  if (/(sleep|wake|hygiene|exercise|health)/.test(intent)) {
    return "recovery_health";
  }

  if (/(study|work|relationship|growth|execution)/.test(intent)) {
    return "productivity_growth";
  }

  return "life_ops";
}

function inferTimeContextFromText(input: string, cadence: PresetCadence, type: PresetType): RouteTimeContext {
  if (/(출근길|통근|등교길|이동\s*중)/.test(input)) {
    return "commute";
  }
  if (/(아침|기상|등교|출근\s*전|출발|워밍업)/.test(input)) {
    return "morning";
  }
  if (/(오전|1교시)/.test(input)) {
    return "work_am";
  }
  if (/(점심|공강)/.test(input)) {
    return "lunch";
  }
  if (/(오후|하원|업무|회의|집필|코딩|리뷰|배포)/.test(input)) {
    return "work_pm";
  }
  if (/(퇴근|귀가|저녁|관람|감상)/.test(input)) {
    return "evening";
  }
  if (/(야간|취침|수면|밤)/.test(input)) {
    return "night";
  }
  if (/(출발\s*전|예약|서류|체크리스트)/.test(input)) {
    return "pre_event";
  }
  if (/(운동\s*후|여행\s*후|영수증|회복\s*기록|정산)/.test(input)) {
    return "post_event";
  }

  if (cadence === "weekly") {
    return type === "non_routine" ? "weekend_pm" : "weekend_am";
  }

  return type === "non_routine" ? "pre_event" : "work_pm";
}

function inferTimeContextFromWindow(
  timeWindow: PresetTimeWindow,
  cadence: PresetCadence,
  type: PresetType,
  title: string
): RouteTimeContext {
  const textBased = inferTimeContextFromText(title, cadence, type);
  if (textBased !== "work_pm" || /업무|정리|집중|작업/.test(title)) {
    return textBased;
  }

  const hour = Number.parseInt(timeWindow.start.slice(0, 2), 10);
  if (cadence === "weekly") {
    if (hour < 12) {
      return "weekend_am";
    }

    if (hour < 19) {
      return "weekend_pm";
    }

    return "weekend_night";
  }

  if (hour < 9) {
    return "morning";
  }
  if (hour < 12) {
    return "work_am";
  }
  if (hour < 14) {
    return "lunch";
  }
  if (hour < 18) {
    return "work_pm";
  }
  if (hour < 21) {
    return "evening";
  }

  return "night";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? normalizeTaskSummary(entry) : ""))
    .filter((entry) => entry.length > 0);
}

function normalizePresetMissions(value: unknown, fallbackDifficulty: number): PresetMission[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((mission): PresetMission | null => {
      if (!isRecord(mission)) {
        return null;
      }

      const action = normalizeActionText(typeof mission.action === "string" ? mission.action : "");
      if (!action) {
        return null;
      }

      const rawNotes = typeof mission.notes === "string" ? mission.notes : "";
      const notes = normalizeActionText(rawNotes) || DEFAULT_MISSION_NOTE;
      const estMinutesRaw = Number(mission.estMinutes);
      const difficultyRaw = Number(mission.difficulty);

      return {
        action,
        estMinutes: clampMinutes(estMinutesRaw),
        difficulty: clampDifficulty(difficultyRaw, fallbackDifficulty),
        notes,
        iconKey: resolveMissionIconKey(action, notes, mission.iconKey)
      };
    })
    .filter((mission): mission is PresetMission => mission !== null);
}

function normalizeSuccessCriteria(value: unknown, missionCount: number): PresetSuccessCriteria {
  if (isRecord(value)) {
    const minCompletedMissionsRaw = Number(value.minCompletedMissions);
    const mustIncludeRecordMission = Boolean(value.mustIncludeRecordMission);

    if (Number.isFinite(minCompletedMissionsRaw)) {
      return {
        minCompletedMissions: Math.max(1, Math.min(6, Math.floor(minCompletedMissionsRaw))),
        mustIncludeRecordMission
      };
    }
  }

  return {
    minCompletedMissions: Math.max(1, Math.ceil(Math.max(1, missionCount) * 0.7)),
    mustIncludeRecordMission: true
  };
}

function normalizeFallbackIds(value: unknown, currentId: string): string[] {
  return normalizeStringArray(value)
    .filter((id) => id !== currentId)
    .slice(0, 3);
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_CREATED_AT;
  }

  const trimmed = value.trim();
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    return DEFAULT_CREATED_AT;
  }

  return new Date(timestamp).toISOString();
}

function normalizePreset(rawPreset: unknown): MissionPreset | null {
  if (!isRecord(rawPreset)) {
    return null;
  }

  const raw = rawPreset as RawMissionPreset;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const title = typeof raw.title === "string" ? normalizeTitle(raw.title) : "";
  const intent = typeof raw.intent === "string" ? normalizeTaskSummary(raw.intent) : "";

  if (!id || !title || !intent) {
    return null;
  }

  const inferredPersona = inferPersonaFromId(id);
  const persona = VALID_PERSONAS.includes(raw.persona as PresetPersona)
    ? (raw.persona as PresetPersona)
    : inferredPersona;

  const type = VALID_TYPES.includes(raw.type as PresetType)
    ? (raw.type as PresetType)
    : (NON_ROUTINE_PERSONAS.has(persona) ? "non_routine" : "routine");

  const cadence = VALID_CADENCES.includes(raw.cadence as PresetCadence)
    ? (raw.cadence as PresetCadence)
    : (id.includes("-WEEK-") ? "weekly" : "daily");

  const summarySource = typeof raw.summary === "string" && raw.summary.trim().length > 0
    ? raw.summary
    : `${title}를 작게 쪼개 실행하기`;
  const summary = normalizeTaskSummary(summarySource);

  const priorityRaw = Number(raw.priority);
  const priority = Number.isFinite(priorityRaw) ? Math.max(1, Math.min(3, Math.floor(priorityRaw))) : 2;

  const difficultyRaw = Number(raw.difficulty);
  const difficulty = clampDifficulty(difficultyRaw, 2);

  const missions = normalizePresetMissions(raw.missions, difficulty);
  if (missions.length === 0) {
    return null;
  }

  const missionSum = sumMissionEstMinutes(missions);
  const estimatedTimeRaw = Number(raw.estimatedTimeMin);
  const estimatedTimeMin = Number.isFinite(estimatedTimeRaw)
    ? Math.max(5, Math.min(35, Math.floor(estimatedTimeRaw)))
    : Math.max(5, Math.min(35, missionSum));

  const examplesRaw = normalizeStringArray(raw.examples);
  const examples = examplesRaw.length > 0
    ? examplesRaw
    : [`${title} 해야 하는데 시작이 안 돼`, `${title} 미루고 있어`];

  const fallbackTimeContext = inferTimeContextFromText(`${title} ${summary}`, cadence, type);
  const timeWindow = normalizeTimeWindow(raw.timeWindow, fallbackTimeContext);
  const timeContext = inferTimeContextFromWindow(timeWindow, cadence, type, `${title} ${summary}`);

  const weekdayMask = normalizeWeekdayMask(raw.weekdayMask, cadence);

  const schemaVersion = typeof raw.schemaVersion === "string" && raw.schemaVersion.trim().length > 0
    ? raw.schemaVersion.trim()
    : DEFAULT_SCHEMA_VERSION;

  const energyCost = VALID_ENERGY_COSTS.includes(raw.energyCost as PresetEnergyCost)
    ? (raw.energyCost as PresetEnergyCost)
    : (difficulty <= 1 ? "low" : (difficulty >= 3 ? "high" : "mid"));

  const fallbackQuestIds = normalizeFallbackIds(raw.fallbackQuestIds, id);
  const tags = normalizeStringArray(raw.tags);
  const createdAt = normalizeTimestamp(raw.createdAt);
  const updatedAt = normalizeTimestamp(raw.updatedAt);
  const successCriteria = normalizeSuccessCriteria(raw.successCriteria, missions.length);
  const domain = inferDomainFromIntent(intent, type);

  return {
    schemaVersion,
    id,
    persona,
    type,
    cadence,
    weekdayMask,
    timeWindow,
    intent,
    title,
    summary,
    priority,
    estimatedTimeMin,
    difficulty,
    energyCost,
    examples,
    missions,
    successCriteria,
    fallbackQuestIds,
    tags,
    createdAt,
    updatedAt,
    domain,
    timeContext
  };
}

function areFallbackCompatible(source: MissionPreset, target: MissionPreset): boolean {
  return source.id !== target.id && source.persona === target.persona && source.type === target.type;
}

function ensureFallbackCompatibility(presets: MissionPreset[]): MissionPreset[] {
  const presetById = new Map(presets.map((preset) => [preset.id, preset]));

  return presets.map((preset) => {
    const fallbackQuestIds = preset.fallbackQuestIds
      .map((fallbackId) => presetById.get(fallbackId))
      .filter((target): target is MissionPreset => Boolean(target))
      .filter((target) => areFallbackCompatible(preset, target))
      .slice(0, 3)
      .map((target) => target.id);

    if (fallbackQuestIds.length > 0) {
      return {
        ...preset,
        fallbackQuestIds
      };
    }

    const defaultFallback = presets.find((candidate) => areFallbackCompatible(preset, candidate));

    return {
      ...preset,
      fallbackQuestIds: defaultFallback ? [defaultFallback.id] : []
    };
  });
}

function normalizePresets(rawPresets: unknown): MissionPreset[] {
  if (!Array.isArray(rawPresets)) {
    return [];
  }

  const normalized = rawPresets
    .map((rawPreset) => normalizePreset(rawPreset))
    .filter((preset): preset is MissionPreset => preset !== null);

  return ensureFallbackCompatibility(normalized);
}

const JSON_PRESETS: readonly MissionPreset[] = normalizePresets(missionPresetsJson);
const PRESET_BY_ID = new Map(JSON_PRESETS.map((preset) => [preset.id, preset]));

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function compactIconScoreText(input: string): string {
  return normalizeScoreText(input).replace(/\s+/g, "");
}

function resolveMissionIconKey(action: string, notes?: string, rawIconKey?: unknown): MissionIconKey {
  if (isNonEmptyString(rawIconKey)) {
    return rawIconKey.trim();
  }

  const actionText = compactIconScoreText(action);
  const notesText = compactIconScoreText(notes ?? "");
  const targetText = `${actionText}${notesText}`;

  for (const rule of MISSION_ICON_RULES) {
    const hasMatch = rule.keywords.some((keyword) => {
      const compactKeyword = compactIconScoreText(keyword);
      return compactKeyword.length > 0 && targetText.includes(compactKeyword);
    });

    if (hasMatch) {
      return rule.iconKey;
    }
  }

  return DEFAULT_MISSION_ICON_KEY;
}

export function clampTaskTotalMinutes(totalMinutes: number, fallback = MIN_TASK_TOTAL_MINUTES): number {
  const baseValue = Number.isFinite(totalMinutes) ? totalMinutes : fallback;
  return Math.min(MAX_TASK_TOTAL_MINUTES, Math.max(MIN_TASK_TOTAL_MINUTES, Math.floor(baseValue)));
}

function clampMinutes(minutes: number): number {
  const safeMinutes = Number.isFinite(minutes) ? Math.floor(minutes) : MIN_MISSION_EST_MINUTES;
  return Math.min(MAX_MISSION_EST_MINUTES, Math.max(MIN_MISSION_EST_MINUTES, safeMinutes));
}

function clampDifficulty(difficulty: number, fallback = 2): number {
  const safeDifficulty = Number.isFinite(difficulty) ? Math.floor(difficulty) : fallback;
  return Math.min(3, Math.max(1, safeDifficulty));
}

export function sumMissionEstMinutes<T extends { estMinutes: number }>(missions: T[]): number {
  return missions.reduce((sum, mission) => sum + clampMinutes(mission.estMinutes), 0);
}

export function isWithinTaskMissionBudget<T extends { estMinutes: number }>(missions: T[], totalMinutes: number): boolean {
  return sumMissionEstMinutes(missions) <= clampTaskTotalMinutes(totalMinutes);
}

export function enforceMissionBudget<T extends { estMinutes: number }>(missions: T[], totalMinutes: number): T[] {
  const budget = clampTaskTotalMinutes(totalMinutes);
  const maxMissionCount = Math.max(1, Math.floor(budget / MIN_MISSION_EST_MINUTES));
  const normalized = missions.slice(0, maxMissionCount).map(
    (mission) =>
      ({
        ...mission,
        estMinutes: clampMinutes(mission.estMinutes)
      }) as T
  );

  let total = sumMissionEstMinutes(normalized);
  if (total <= budget) {
    return normalized;
  }

  for (let index = normalized.length - 1; index >= 0 && total > budget; index -= 1) {
    const mission = normalized[index];
    const reducible = mission.estMinutes - MIN_MISSION_EST_MINUTES;
    if (reducible <= 0) {
      continue;
    }

    const reduceBy = Math.min(reducible, total - budget);
    normalized[index] = {
      ...mission,
      estMinutes: mission.estMinutes - reduceBy
    };
    total -= reduceBy;
  }

  return normalized;
}

export function normalizeTaskSummary(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, TASK_SUMMARY_MAX_LENGTH);
}

function normalizeTitle(title: string): string {
  return normalizeTaskSummary(title);
}

function normalizeScoreText(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, " ");
}

interface PresetTitleExactMatchIndex {
  byNormalized: Map<string, readonly string[]>;
  byCompact: Map<string, readonly string[]>;
}

function buildPresetTitleExactMatchIndex(presets: readonly MissionPreset[]): PresetTitleExactMatchIndex {
  const mutableByNormalized = new Map<string, string[]>();
  const mutableByCompact = new Map<string, string[]>();

  presets.forEach((preset) => {
    const normalizedTitle = normalizeScoreText(preset.title);
    if (!normalizedTitle) {
      return;
    }

    const compactTitle = normalizedTitle.replace(/\s+/g, "");
    const normalizedBucket = mutableByNormalized.get(normalizedTitle) ?? [];
    normalizedBucket.push(preset.id);
    mutableByNormalized.set(normalizedTitle, normalizedBucket);

    if (compactTitle) {
      const compactBucket = mutableByCompact.get(compactTitle) ?? [];
      compactBucket.push(preset.id);
      mutableByCompact.set(compactTitle, compactBucket);
    }
  });

  return {
    byNormalized: new Map(
      Array.from(mutableByNormalized.entries()).map(([key, presetIds]) => [key, Object.freeze([...presetIds])])
    ),
    byCompact: new Map(
      Array.from(mutableByCompact.entries()).map(([key, presetIds]) => [key, Object.freeze([...presetIds])])
    )
  };
}

function tokenizeScoreText(input: string): string[] {
  return normalizeScoreText(input)
    .split(/[^0-9a-zA-Z가-힣_]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !SCORE_STOPWORDS.has(token));
}

function hasScoreTerm(normalizedInput: string, compactInput: string, term: string): boolean {
  const normalizedTerm = normalizeScoreText(term);
  if (!normalizedTerm) {
    return false;
  }

  if (normalizedInput.includes(normalizedTerm)) {
    return true;
  }

  const compactTerm = normalizedTerm.replace(/\s+/g, "");
  return compactTerm.length > 0 && compactInput.includes(compactTerm);
}

function addTokenWeight(map: Map<string, number>, token: string, weight: number): void {
  map.set(token, (map.get(token) ?? 0) + weight);
}

function buildCharacterNgrams(input: string, size: number): string[] {
  const compactInput = normalizeScoreText(input).replace(/\s+/g, "");
  if (compactInput.length < size) {
    return [];
  }

  const ngrams: string[] = [];
  for (let index = 0; index <= compactInput.length - size; index += 1) {
    ngrams.push(compactInput.slice(index, index + size));
  }

  return ngrams;
}

function buildSparseVector(input: string): SparseVector {
  const weights = new Map<string, number>();

  tokenizeScoreText(input).forEach((token) => {
    addTokenWeight(weights, `w:${token}`, WORD_TOKEN_WEIGHT);
  });
  buildCharacterNgrams(input, 2).forEach((token) => {
    addTokenWeight(weights, `c2:${token}`, BIGRAM_TOKEN_WEIGHT);
  });
  buildCharacterNgrams(input, 3).forEach((token) => {
    addTokenWeight(weights, `c3:${token}`, TRIGRAM_TOKEN_WEIGHT);
  });

  const sumSquares = Array.from(weights.values()).reduce((sum, weight) => sum + weight ** 2, 0);

  return {
    weights,
    norm: Math.sqrt(sumSquares)
  };
}

function computeCosineSimilarity(source: SparseVector, target: SparseVector): number {
  if (source.norm === 0 || target.norm === 0) {
    return 0;
  }

  const [smaller, larger] = source.weights.size <= target.weights.size
    ? [source.weights, target.weights]
    : [target.weights, source.weights];
  let dot = 0;
  smaller.forEach((sourceWeight, token) => {
    const targetWeight = larger.get(token);
    if (!targetWeight) {
      return;
    }

    dot += sourceWeight * targetWeight;
  });

  return dot / (source.norm * target.norm);
}

function computeTokenOverlapRatio(sourceTokens: Set<string>, targetTokens: Set<string>): number {
  if (sourceTokens.size === 0 || targetTokens.size === 0) {
    return 0;
  }

  let overlapCount = 0;
  sourceTokens.forEach((token) => {
    if (targetTokens.has(token)) {
      overlapCount += 1;
    }
  });

  return overlapCount / Math.max(sourceTokens.size, targetTokens.size);
}

function normalizeRoutingInput(input: string): NormalizedRoutingInput {
  const normalizedText = normalizeScoreText(input)
    .replace(/(.)\1{2,}/g, "$1$1")
    .normalize("NFKC");

  return {
    rawText: input,
    normalizedText,
    compactText: normalizedText.replace(/\s+/g, ""),
    tokens: tokenizeScoreText(normalizedText),
    hasHangul: /[가-힣]/.test(normalizedText),
    hasKnownEnglishKeyword: /(work|study|clean|sleep|health|travel|exercise|office|developer|writer|laundry|meal)/.test(normalizedText)
  };
}

function detectPersona(normalizedInput: NormalizedRoutingInput): { persona: PresetPersona; explicit: boolean; reasonCode: string } {
  const text = normalizedInput.normalizedText;

  const rules: Array<{ persona: PresetPersona; pattern: RegExp; score: number; reasonCode: string }> = [
    { persona: "office_worker", pattern: /(사무실|결재|보고서|부서|문서|회의 안건|메일함)/, score: 2.3, reasonCode: "persona.office_worker" },
    { persona: "developer", pattern: /(개발|코딩|버그|pr|코드리뷰|배포|이슈|커밋)/, score: 2.2, reasonCode: "persona.developer" },
    { persona: "writer", pattern: /(작가|집필|원고|퇴고|투고|챕터|자유쓰기)/, score: 2.2, reasonCode: "persona.writer" },
    { persona: "student", pattern: /(학생|학교|수업|교시|공강|과제|시험|복습|동아리)/, score: 2.0, reasonCode: "persona.student" },
    { persona: "homemaker", pattern: /(주부|가사|집안|하원|도시락|세탁|가족 일정|장보기 리스트)/, score: 2.0, reasonCode: "persona.homemaker" },
    { persona: "entertainment", pattern: /(콘텐츠|감상|관람|공연|전시|영화|드라마)/, score: 2.1, reasonCode: "persona.entertainment" },
    { persona: "travel", pattern: /(여행|숙소|항공|기차|여권|출발|동선|체크리스트)/, score: 2.1, reasonCode: "persona.travel" },
    { persona: "exercise", pattern: /(운동|헬스|러닝|유산소|근력|워밍업|피로도)/, score: 2.1, reasonCode: "persona.exercise" },
    { persona: "worker", pattern: /(회사|직장|출근|퇴근|업무|프로젝트|팀)/, score: 1.8, reasonCode: "persona.worker" }
  ];

  let bestPersona: PresetPersona = "worker";
  let bestScore = 0;
  let bestReasonCode = "persona.default.worker";

  rules.forEach((rule) => {
    if (!rule.pattern.test(text)) {
      return;
    }

    if (rule.score > bestScore) {
      bestScore = rule.score;
      bestPersona = rule.persona;
      bestReasonCode = rule.reasonCode;
    }
  });

  return {
    persona: bestPersona,
    explicit: bestScore > 0,
    reasonCode: bestReasonCode
  };
}

function inferType(persona: PresetPersona, normalizedInput: NormalizedRoutingInput): { type: PresetType; explicit: boolean; reasonCode: string } {
  if (NON_ROUTINE_PERSONAS.has(persona)) {
    return {
      type: "non_routine",
      explicit: true,
      reasonCode: "type.by_persona.non_routine"
    };
  }

  if (/(콘텐츠|여행|운동 챌린지|관람|출발\s*전)/.test(normalizedInput.normalizedText)) {
    return {
      type: "non_routine",
      explicit: true,
      reasonCode: "type.by_keyword.non_routine"
    };
  }

  return {
    type: "routine",
    explicit: false,
    reasonCode: "type.default.routine"
  };
}

function detectState(normalizedInput: NormalizedRoutingInput): { state: RouteState; reasonCode: string } {
  const text = normalizedInput.normalizedText;

  if (/(회사\s*가기\s*싫|사무실\s*가기\s*싫|일\s*하기\s*싫|아무것도\s*하기\s*싫|하기\s*싫어)/.test(text)) {
    return {
      state: "avoidance_refusal",
      reasonCode: "state.avoidance_refusal"
    };
  }

  if (/(시작이\s*안|미루|손이\s*안|착수\s*지연|못\s*하겠)/.test(text)) {
    return {
      state: "start_delay",
      reasonCode: "state.start_delay"
    };
  }

  if (/(막혔|안\s*풀|막막|어려워|블로커)/.test(text)) {
    return {
      state: "blocked",
      reasonCode: "state.blocked"
    };
  }

  if (/(피곤|지쳤|무기력|힘들|기운\s*없)/.test(text)) {
    return {
      state: "fatigued",
      reasonCode: "state.fatigued"
    };
  }

  if (/(마감|끝내|완료|제출|마무리|정리\s*완료)/.test(text)) {
    return {
      state: "completion_push",
      reasonCode: "state.completion_push"
    };
  }

  if (/(리셋|정리\s*필요|재정비|초기화)/.test(text)) {
    return {
      state: "reset_needed",
      reasonCode: "state.reset_needed"
    };
  }

  return {
    state: "in_progress",
    reasonCode: "state.default.in_progress"
  };
}

function detectTimeContext(normalizedInput: NormalizedRoutingInput, type: PresetType): { timeContext: RouteTimeContext; explicit: boolean; reasonCode: string } {
  const text = normalizedInput.normalizedText;

  const rules: Array<{ timeContext: RouteTimeContext; pattern: RegExp; reasonCode: string }> = [
    { timeContext: "commute", pattern: /(출근길|통근|등교길|이동\s*중)/, reasonCode: "time.commute" },
    { timeContext: "morning", pattern: /(아침|기상|출근\s*전|등교\s*전|오전\s*일찍)/, reasonCode: "time.morning" },
    { timeContext: "work_am", pattern: /(오전|1교시|오전\s*업무)/, reasonCode: "time.work_am" },
    { timeContext: "lunch", pattern: /(점심|공강|식사\s*후)/, reasonCode: "time.lunch" },
    { timeContext: "work_pm", pattern: /(오후|업무\s*중|회의\s*전|집필\s*블록)/, reasonCode: "time.work_pm" },
    { timeContext: "evening", pattern: /(저녁|퇴근|귀가)/, reasonCode: "time.evening" },
    { timeContext: "night", pattern: /(밤|야간|취침|자기\s*전)/, reasonCode: "time.night" },
    { timeContext: "weekend_am", pattern: /(주말\s*오전)/, reasonCode: "time.weekend_am" },
    { timeContext: "weekend_pm", pattern: /(주말\s*오후)/, reasonCode: "time.weekend_pm" },
    { timeContext: "weekend_night", pattern: /(주말\s*밤)/, reasonCode: "time.weekend_night" },
    { timeContext: "pre_event", pattern: /(출발\s*전|예약\s*전|이벤트\s*전)/, reasonCode: "time.pre_event" },
    { timeContext: "post_event", pattern: /(운동\s*후|여행\s*후|행사\s*후)/, reasonCode: "time.post_event" }
  ];

  const matchedRule = rules.find((rule) => rule.pattern.test(text));
  if (matchedRule) {
    return {
      timeContext: matchedRule.timeContext,
      explicit: true,
      reasonCode: matchedRule.reasonCode
    };
  }

  if (type === "non_routine") {
    return {
      timeContext: "pre_event",
      explicit: false,
      reasonCode: "time.default.pre_event"
    };
  }

  return {
    timeContext: "work_pm",
    explicit: false,
    reasonCode: "time.default.work_pm"
  };
}

function detectDomain(
  normalizedInput: NormalizedRoutingInput,
  type: PresetType
): { domain: RouteDomain; explicit: boolean; reasonCode: string } {
  const text = normalizedInput.normalizedText;

  if (type === "non_routine") {
    return {
      domain: "non_routine",
      explicit: true,
      reasonCode: "domain.non_routine"
    };
  }

  if (/(수면|기상|양치|세안|샤워|운동|스트레칭|회복|피곤)/.test(text)) {
    return {
      domain: "recovery_health",
      explicit: true,
      reasonCode: "domain.recovery_health"
    };
  }

  if (/(공부|과제|시험|업무|출근|사무실|회의|집필|투고|답장|협업|마감)/.test(text)) {
    return {
      domain: "productivity_growth",
      explicit: true,
      reasonCode: "domain.productivity_growth"
    };
  }

  if (/(청소|정리|빨래|세탁|장보기|공과금|납부|주방|식사|디지털\s*정리)/.test(text)) {
    return {
      domain: "life_ops",
      explicit: true,
      reasonCode: "domain.life_ops"
    };
  }

  return {
    domain: "productivity_growth",
    explicit: false,
    reasonCode: "domain.default.productivity_growth"
  };
}

function computeRuleConfidence(args: {
  personaExplicit: boolean;
  domainExplicit: boolean;
  timeExplicit: boolean;
  typeExplicit: boolean;
  state: RouteState;
}): number {
  let confidence = 0.54;

  if (args.personaExplicit) {
    confidence += 0.15;
  }
  if (args.domainExplicit) {
    confidence += 0.12;
  }
  if (args.timeExplicit) {
    confidence += 0.08;
  }
  if (args.typeExplicit) {
    confidence += 0.06;
  }
  if (args.state !== "in_progress") {
    confidence += 0.08;
  }
  if (args.state === "avoidance_refusal") {
    confidence += 0.07;
  }

  return clamp01(confidence);
}

function buildRouteCandidates(primary: RouteCandidate): RouteCandidate[] {
  const candidates: RouteCandidate[] = [primary];

  if (primary.state === "avoidance_refusal" && primary.type === "routine") {
    const altPersona: PresetPersona = primary.persona === "office_worker" ? "worker" : "office_worker";

    candidates.push({
      ...primary,
      persona: altPersona,
      confidence: clamp01(primary.confidence - 0.06),
      reasonCodes: [...primary.reasonCodes, "fallback.avoidance.alt_persona"]
    });

    candidates.push({
      ...primary,
      domain: "recovery_health",
      state: "fatigued",
      timeContext: "morning",
      confidence: clamp01(primary.confidence - 0.12),
      reasonCodes: [...primary.reasonCodes, "fallback.avoidance.recovery_shift"]
    });
  }

  if (primary.type === "routine" && primary.persona !== "worker") {
    candidates.push({
      ...primary,
      persona: "worker",
      confidence: clamp01(primary.confidence - 0.1),
      reasonCodes: [...primary.reasonCodes, "fallback.routine.worker_general"]
    });
  }

  if (primary.type === "non_routine" && primary.persona !== "travel") {
    candidates.push({
      ...primary,
      persona: "travel",
      timeContext: "pre_event",
      confidence: clamp01(primary.confidence - 0.1),
      reasonCodes: [...primary.reasonCodes, "fallback.non_routine.travel_general"]
    });
  }

  const deduped = new Map<string, RouteCandidate>();

  candidates.forEach((candidate) => {
    const key = `${candidate.domain}|${candidate.state}|${candidate.timeContext}|${candidate.persona}|${candidate.type}`;
    const existing = deduped.get(key);
    if (!existing || existing.confidence < candidate.confidence) {
      deduped.set(key, candidate);
    }
  });

  return Array.from(deduped.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

function classifyRouting(normalizedInput: NormalizedRoutingInput): QueryRoutingContext {
  if (!normalizedInput.normalizedText) {
    return {
      normalizedInput,
      routeCandidates: []
    };
  }

  const personaResult = detectPersona(normalizedInput);
  const typeResult = inferType(personaResult.persona, normalizedInput);
  const domainResult = detectDomain(normalizedInput, typeResult.type);
  const stateResult = detectState(normalizedInput);
  const timeResult = detectTimeContext(normalizedInput, typeResult.type);

  const primary: RouteCandidate = {
    domain: domainResult.domain,
    state: stateResult.state,
    timeContext: timeResult.timeContext,
    persona: personaResult.persona,
    type: typeResult.type,
    personaExplicit: personaResult.explicit,
    domainExplicit: domainResult.explicit,
    timeExplicit: timeResult.explicit,
    typeExplicit: typeResult.explicit,
    confidence: computeRuleConfidence({
      personaExplicit: personaResult.explicit,
      domainExplicit: domainResult.explicit,
      timeExplicit: timeResult.explicit,
      typeExplicit: typeResult.explicit,
      state: stateResult.state
    }),
    reasonCodes: [
      personaResult.reasonCode,
      typeResult.reasonCode,
      domainResult.reasonCode,
      stateResult.reasonCode,
      timeResult.reasonCode
    ]
  };

  return {
    normalizedInput,
    routeCandidates: buildRouteCandidates(primary)
  };
}

function buildRouteAugmentationTerms(routeCandidates: RouteCandidate[]): string[] {
  if (routeCandidates.length === 0) {
    return [];
  }

  const topRoute = routeCandidates[0];
  const expansions = new Set<string>();

  if (topRoute.state !== "in_progress" || topRoute.confidence >= RULE_PRIMARY_CONFIDENCE_THRESHOLD) {
    ROUTE_EXPANSIONS.byState[topRoute.state].forEach((term) => expansions.add(term));
  }

  if (topRoute.confidence >= RULE_PRIMARY_CONFIDENCE_THRESHOLD && topRoute.personaExplicit) {
    ROUTE_EXPANSIONS.byPersona[topRoute.persona].forEach((term) => expansions.add(term));
  }

  if (topRoute.confidence >= RULE_PRIMARY_CONFIDENCE_THRESHOLD && topRoute.domainExplicit) {
    ROUTE_EXPANSIONS.byDomain[topRoute.domain].forEach((term) => expansions.add(term));
  }

  if (topRoute.state === "avoidance_refusal") {
    expansions.add("회사 가기 싫어");
    expansions.add("사무실 가기 싫어");
    expansions.add("일 하기 싫어");
  }

  return Array.from(expansions);
}

function buildAugmentedQueryText(normalizedQuery: string, routeCandidates: RouteCandidate[]): string {
  const expansions = new Set<string>();

  QUERY_EXPANSION_RULES.forEach((rule) => {
    if (!rule.trigger.test(normalizedQuery)) {
      return;
    }
    rule.expansions.forEach((term) => expansions.add(term));
  });

  buildRouteAugmentationTerms(routeCandidates).forEach((term) => expansions.add(term));

  if (expansions.size === 0) {
    return normalizedQuery;
  }

  return `${normalizedQuery} ${Array.from(expansions).join(" ")}`.trim();
}

function buildPresetSearchText(preset: MissionPreset): string {
  const intentText = normalizeScoreText(preset.intent).replace(/_/g, " ");
  const personaText = preset.persona.replace(/_/g, " ");
  const typeText = preset.type.replace(/_/g, " ");
  const cadenceText = preset.cadence;
  const domainText = preset.domain.replace(/_/g, " ");
  const timeContextText = preset.timeContext.replace(/_/g, " ");
  const missionText = preset.missions.map((mission) => normalizeScoreText(mission.action)).join(" ");
  const tagText = preset.tags.join(" ");

  return [
    preset.title,
    preset.summary,
    intentText,
    personaText,
    typeText,
    cadenceText,
    domainText,
    timeContextText,
    ...preset.examples,
    tagText,
    missionText
  ]
    .map((segment) => normalizeScoreText(segment))
    .filter(Boolean)
    .join(" ");
}

const PRESET_SEARCH_INDEX: readonly PresetSearchIndex[] = JSON_PRESETS.map((preset) => {
  const searchText = buildPresetSearchText(preset);

  return {
    preset,
    vector: buildSparseVector(searchText),
    tokens: new Set(tokenizeScoreText(searchText)),
    titleVector: buildSparseVector(preset.title),
    intentVector: buildSparseVector(preset.intent.replace(/_/g, " ")),
    exampleVectors: preset.examples.map((example) => buildSparseVector(example))
  };
});
const PRESET_TITLE_EXACT_MATCH_INDEX = buildPresetTitleExactMatchIndex(JSON_PRESETS);

function findExactTitlePresetIds(title: string): Set<string> {
  const matchedPresetIds = new Set<string>();
  const normalizedTitle = normalizeScoreText(title);
  if (!normalizedTitle) {
    return matchedPresetIds;
  }

  PRESET_TITLE_EXACT_MATCH_INDEX.byNormalized.get(normalizedTitle)?.forEach((presetId) => matchedPresetIds.add(presetId));

  const compactTitle = normalizedTitle.replace(/\s+/g, "");
  if (!compactTitle) {
    return matchedPresetIds;
  }

  PRESET_TITLE_EXACT_MATCH_INDEX.byCompact.get(compactTitle)?.forEach((presetId) => matchedPresetIds.add(presetId));
  return matchedPresetIds;
}

function scoreAdhdExecution(preset: MissionPreset): number {
  const difficulty = clampDifficulty(preset.difficulty);
  const estimatedTime = Number.isFinite(preset.estimatedTimeMin)
    ? Math.max(1, Math.floor(preset.estimatedTimeMin))
    : MAX_MISSION_EST_MINUTES;
  const firstMissionMin = Number.isFinite(preset.missions[0]?.estMinutes)
    ? Math.max(1, Math.floor(preset.missions[0].estMinutes))
    : MAX_MISSION_EST_MINUTES;

  const difficultyBonus = (4 - difficulty) * 1.8;
  const shortTimeBonus = Math.max(0, 15 - estimatedTime) * 0.25;
  const firstMissionBonus = firstMissionMin >= 1 && firstMissionMin <= 2 ? 1.8 : 0;

  return difficultyBonus + shortTimeBonus + firstMissionBonus;
}

function isPersonaCompatible(routePersona: PresetPersona, presetPersona: PresetPersona, type: PresetType): boolean {
  if (routePersona === presetPersona) {
    return true;
  }

  if (type === "non_routine") {
    return NON_ROUTINE_PERSONAS.has(routePersona) && NON_ROUTINE_PERSONAS.has(presetPersona);
  }

  if (ROUTINE_PERSONA_FAMILY.has(routePersona) && ROUTINE_PERSONA_FAMILY.has(presetPersona)) {
    return true;
  }

  if ((routePersona === "student" && presetPersona === "writer") || (routePersona === "writer" && presetPersona === "student")) {
    return true;
  }

  if ((routePersona === "homemaker" && presetPersona === "worker") || (routePersona === "worker" && presetPersona === "homemaker")) {
    return true;
  }

  return false;
}

function isNeighborTimeContext(source: RouteTimeContext, target: RouteTimeContext): boolean {
  const neighborGroups: RouteTimeContext[][] = [
    ["morning", "commute", "work_am"],
    ["work_am", "lunch", "work_pm"],
    ["work_pm", "evening", "night"],
    ["weekend_am", "weekend_pm", "weekend_night"],
    ["pre_event", "weekend_pm", "post_event"]
  ];

  return neighborGroups.some((group) => group.includes(source) && group.includes(target));
}

function scoreRouteAlignment(preset: MissionPreset, routeCandidates: RouteCandidate[]): RouteAlignmentResult {
  if (routeCandidates.length === 0) {
    return {
      score: 0,
      normalized: 0,
      routeCandidate: null
    };
  }

  let bestScore = -Infinity;
  let bestRoute: RouteCandidate | null = null;

  routeCandidates.forEach((routeCandidate) => {
    let score = 0;

    if (preset.type === routeCandidate.type) {
      score += 18;
    } else {
      score -= 22;
    }

    if (preset.persona === routeCandidate.persona) {
      score += 22;
    } else if (isPersonaCompatible(routeCandidate.persona, preset.persona, routeCandidate.type)) {
      score += 8;
    }

    if (preset.domain === routeCandidate.domain) {
      score += 16;
    } else if (routeCandidate.domain === "productivity_growth" && preset.intent === "work_start_recovery") {
      score += 7;
    } else if (routeCandidate.domain === "recovery_health" && ["sleep_wake_routine", "health_exercise"].includes(preset.intent)) {
      score += 6;
    }

    if (preset.timeContext === routeCandidate.timeContext) {
      score += 9;
    } else if (isNeighborTimeContext(routeCandidate.timeContext, preset.timeContext)) {
      score += 4;
    }

    if (routeCandidate.state === "avoidance_refusal") {
      if (["work_start_recovery", "study_growth", "sleep_wake_routine"].includes(preset.intent)) {
        score += 20;
      }

      if (preset.difficulty <= 1) {
        score += 8;
      }

      if (preset.estimatedTimeMin <= 10) {
        score += 8;
      }
    }

    if (routeCandidate.state === "start_delay" && ["work_start_recovery", "study_growth"].includes(preset.intent)) {
      score += 10;
    }

    if (routeCandidate.state === "fatigued" && ["health_exercise", "sleep_wake_routine", "grooming_hygiene"].includes(preset.intent)) {
      score += 9;
    }

    if (routeCandidate.state === "reset_needed" && ["home_cleaning", "digital_organizing", "admin_finance"].includes(preset.intent)) {
      score += 8;
    }

    if (routeCandidate.state === "completion_push" && ["work_start_recovery", "admin_finance", "relationship_communication"].includes(preset.intent)) {
      score += 7;
    }

    score *= 0.82 + routeCandidate.confidence * 0.24;

    if (score > bestScore) {
      bestScore = score;
      bestRoute = routeCandidate;
    }
  });

  const normalized = clamp01((bestScore + 20) / 90);

  return {
    score: Number(bestScore.toFixed(4)),
    normalized,
    routeCandidate: bestRoute
  };
}

function computeRerankConfidence(args: {
  similarity: number;
  titleSimilarity: number;
  exampleSimilarity: number;
  intentSimilarity: number;
  tokenOverlap: number;
  routeNormalized: number;
  intentHintSignal: number;
}): number {
  return clamp01(
    args.similarity * 0.9
    + args.titleSimilarity * 0.55
    + args.exampleSimilarity * 0.5
    + args.intentSimilarity * 0.35
    + args.tokenOverlap * 0.4
    + args.routeNormalized * 0.55
    + args.intentHintSignal
  );
}

function compareScoredPresetCandidates(a: ScoredPresetCandidate, b: ScoredPresetCandidate): number {
  if (b.totalScore !== a.totalScore) {
    return b.totalScore - a.totalScore;
  }

  if (b.rerankConfidence !== a.rerankConfidence) {
    return b.rerankConfidence - a.rerankConfidence;
  }

  if (b.routeConfidence !== a.routeConfidence) {
    return b.routeConfidence - a.routeConfidence;
  }

  if (b.priority !== a.priority) {
    return b.priority - a.priority;
  }

  if (a.difficulty !== b.difficulty) {
    return a.difficulty - b.difficulty;
  }

  if (a.estimatedTimeMin !== b.estimatedTimeMin) {
    return a.estimatedTimeMin - b.estimatedTimeMin;
  }

  return a.taskId.localeCompare(b.taskId, "en");
}

function mapPresetMissionsToTemplates(preset: MissionPreset): MissionTemplate[] | null {
  if (!Array.isArray(preset.missions) || preset.missions.length === 0) {
    return null;
  }

  const fallbackDifficulty = clampDifficulty(preset.difficulty);
  const templates = preset.missions
    .map((mission): MissionTemplate | null => {
      const action = normalizeActionText(mission.action ?? "");
      if (!action) {
        return null;
      }

      const notes = normalizeActionText(mission.notes ?? "") || DEFAULT_MISSION_NOTE;
      return {
        action,
        estMinutes: clampMinutes(mission.estMinutes),
        difficulty: clampDifficulty(mission.difficulty ?? fallbackDifficulty, fallbackDifficulty),
        notes,
        iconKey: resolveMissionIconKey(action, notes, mission.iconKey)
      };
    })
    .filter((template): template is MissionTemplate => template !== null);

  return templates.length > 0 ? templates : null;
}

function isMeaningfulRoutingInput(routingContext: QueryRoutingContext): boolean {
  const { normalizedInput, routeCandidates } = routingContext;
  if (!normalizedInput.normalizedText) {
    return false;
  }

  if (normalizedInput.tokens.length === 0) {
    return false;
  }

  if (normalizedInput.hasHangul || normalizedInput.hasKnownEnglishKeyword) {
    return true;
  }

  const topRoute = routeCandidates[0];
  return Boolean(topRoute && topRoute.confidence >= RULE_PRIMARY_CONFIDENCE_THRESHOLD);
}

function scorePresetCandidates(title: string): { candidates: ScoredPresetCandidate[]; routingContext: QueryRoutingContext } {
  const normalizedInput = normalizeRoutingInput(title);
  const routingContext = classifyRouting(normalizedInput);
  const exactTitlePresetIds = findExactTitlePresetIds(title);

  if (!normalizedInput.normalizedText) {
    return {
      candidates: [],
      routingContext
    };
  }

  const augmentedQuery = buildAugmentedQueryText(normalizedInput.normalizedText, routingContext.routeCandidates);
  const queryVector = buildSparseVector(augmentedQuery);
  const queryTokens = new Set(tokenizeScoreText(augmentedQuery));
  const hasWeeklySignal = /(주간|이번 주|주말|weekend|weekly)/.test(normalizedInput.normalizedText);

  if (queryVector.norm === 0 && queryTokens.size === 0 && exactTitlePresetIds.size === 0) {
    return {
      candidates: [],
      routingContext
    };
  }

  const candidates = PRESET_SEARCH_INDEX.reduce<ScoredPresetCandidate[]>((accumulator, indexEntry) => {
    const { preset, vector, tokens, titleVector, intentVector, exampleVectors } = indexEntry;
    const isExactTitleMatch = exactTitlePresetIds.has(preset.id);
    const similarity = computeCosineSimilarity(queryVector, vector);
    const titleSimilarity = computeCosineSimilarity(queryVector, titleVector);
    const intentSimilarity = computeCosineSimilarity(queryVector, intentVector);
    const exampleSimilarity = exampleVectors.reduce((bestScore, exampleVector) => {
      return Math.max(bestScore, computeCosineSimilarity(queryVector, exampleVector));
    }, 0);
    const tokenOverlap = computeTokenOverlapRatio(queryTokens, tokens);

    const intentHintMatches = (INTENT_HINTS[preset.intent] ?? []).reduce((hitCount, hint) => {
      return hitCount + (hasScoreTerm(normalizedInput.normalizedText, normalizedInput.compactText, hint) ? 1 : 0);
    }, 0);

    const routeAlignment = scoreRouteAlignment(preset, routingContext.routeCandidates);
    const intentHintSignal = intentHintMatches > 0 ? PRESET_INTENT_HINT_SIGNAL_BONUS : 0;
    const signalScore = Math.max(similarity, titleSimilarity, intentSimilarity, exampleSimilarity, tokenOverlap)
      + intentHintSignal
      + routeAlignment.normalized * 0.3;

    if (!isExactTitleMatch && signalScore < PRESET_MIN_SIGNAL_SCORE) {
      return accumulator;
    }

    const priority = Number.isFinite(preset.priority) ? preset.priority : 0;
    const difficulty = clampDifficulty(preset.difficulty);
    const estimatedTimeMin = Number.isFinite(preset.estimatedTimeMin)
      ? Math.max(1, Math.floor(preset.estimatedTimeMin))
      : MAX_MISSION_EST_MINUTES;
    const adhdScore = scoreAdhdExecution(preset);
    const intentHintScore = intentHintMatches * PRESET_INTENT_HINT_WEIGHT;
    const cadenceScore = hasWeeklySignal
      ? (preset.cadence === "weekly" ? 8 : -2)
      : (preset.cadence === "daily" ? 6 : -6);
    const rerankConfidence = computeRerankConfidence({
      similarity,
      titleSimilarity,
      exampleSimilarity,
      intentSimilarity,
      tokenOverlap,
      routeNormalized: routeAlignment.normalized,
      intentHintSignal
    });

    const totalScore = Number(
      (
        similarity * PRESET_SIMILARITY_SCORE_WEIGHT
        + titleSimilarity * PRESET_TITLE_SIMILARITY_WEIGHT
        + exampleSimilarity * PRESET_EXAMPLE_SIMILARITY_WEIGHT
        + intentSimilarity * PRESET_INTENT_SIMILARITY_WEIGHT
        + tokenOverlap * PRESET_TOKEN_OVERLAP_WEIGHT
        + intentHintScore
        + priority * PRESET_PRIORITY_WEIGHT
        + cadenceScore
        + routeAlignment.score * PRESET_ROUTE_SCORE_WEIGHT * 0.01
        + rerankConfidence * PRESET_RERANK_CONFIDENCE_WEIGHT
        + adhdScore
        + (isExactTitleMatch ? PRESET_EXACT_TITLE_MATCH_BONUS : 0)
      ).toFixed(4)
    );

    accumulator.push({
      preset,
      totalScore,
      similarity,
      rerankConfidence,
      routeConfidence: routeAlignment.normalized,
      routeCandidate: routeAlignment.routeCandidate,
      priority,
      difficulty,
      estimatedTimeMin,
      taskId: preset.id,
      isExactTitleMatch
    });

    return accumulator;
  }, []);

  return {
    candidates,
    routingContext
  };
}

function selectFallbackCandidateByPresetLinks(seed: ScoredPresetCandidate, rankedCandidates: ScoredPresetCandidate[]): ScoredPresetCandidate | null {
  const rankedById = new Map(rankedCandidates.map((candidate) => [candidate.preset.id, candidate]));

  for (const fallbackQuestId of seed.preset.fallbackQuestIds) {
    const candidate = rankedById.get(fallbackQuestId);
    if (candidate && areFallbackCompatible(seed.preset, candidate.preset)) {
      return candidate;
    }

    const preset = PRESET_BY_ID.get(fallbackQuestId);
    if (preset && areFallbackCompatible(seed.preset, preset)) {
      return {
        preset,
        totalScore: seed.totalScore - 5,
        similarity: seed.similarity,
        rerankConfidence: seed.rerankConfidence * 0.9,
        routeConfidence: seed.routeConfidence,
        routeCandidate: seed.routeCandidate,
        priority: preset.priority,
        difficulty: preset.difficulty,
        estimatedTimeMin: preset.estimatedTimeMin,
        taskId: preset.id,
        isExactTitleMatch: false
      };
    }
  }

  return null;
}

function selectCandidateFromRoutingPipeline(
  rankedCandidates: ScoredPresetCandidate[],
  routingContext: QueryRoutingContext
): ScoredPresetCandidate | null {
  const topCandidate = rankedCandidates[0];
  if (!topCandidate) {
    return null;
  }

  const secondCandidate = rankedCandidates[1];
  const rerankGap = topCandidate.rerankConfidence - (secondCandidate?.rerankConfidence ?? 0);

  if (
    topCandidate.rerankConfidence >= RERANK_TOP1_CONFIDENCE_THRESHOLD
    && rerankGap >= RERANK_TOP1_GAP_THRESHOLD
  ) {
    return topCandidate;
  }

  if (!isMeaningfulRoutingInput(routingContext)) {
    return null;
  }

  const primaryRoute = routingContext.routeCandidates[0] ?? topCandidate.routeCandidate;

  if (primaryRoute?.state === "avoidance_refusal") {
    const avoidanceCandidate = rankedCandidates.find((candidate) => {
      const intentMatch = ["work_start_recovery", "study_growth", "sleep_wake_routine"].includes(candidate.preset.intent);
      return intentMatch && candidate.difficulty <= 1 && candidate.estimatedTimeMin <= 10 && candidate.routeConfidence >= 0.4;
    });

    if (avoidanceCandidate) {
      return avoidanceCandidate;
    }
  }

  if (primaryRoute && primaryRoute.confidence >= RULE_PRIMARY_CONFIDENCE_THRESHOLD) {
    const strictRouteCandidate = rankedCandidates.find((candidate) => {
      return candidate.preset.persona === primaryRoute.persona
        && candidate.preset.type === primaryRoute.type
        && candidate.routeConfidence >= 0.42;
    });

    if (strictRouteCandidate) {
      return strictRouteCandidate;
    }

    const compatibleRouteCandidate = rankedCandidates.find((candidate) => {
      return candidate.preset.type === primaryRoute.type
        && isPersonaCompatible(primaryRoute.persona, candidate.preset.persona, primaryRoute.type)
        && candidate.routeConfidence >= 0.4;
    });

    if (compatibleRouteCandidate) {
      return compatibleRouteCandidate;
    }
  }

  const presetFallbackCandidate = selectFallbackCandidateByPresetLinks(topCandidate, rankedCandidates);
  if (presetFallbackCandidate) {
    return presetFallbackCandidate;
  }

  if (topCandidate.routeConfidence >= FALLBACK_ROUTE_CONFIDENCE_THRESHOLD || topCandidate.rerankConfidence >= 0.45) {
    const safeDefault = rankedCandidates.find((candidate) => candidate.difficulty <= 1 && candidate.estimatedTimeMin <= 10)
      ?? rankedCandidates.find((candidate) => candidate.difficulty <= 2 && candidate.routeConfidence >= 0.5);

    if (safeDefault) {
      return safeDefault;
    }
  }

  return null;
}

function selectJsonPresetTemplates(title: string): MissionTemplate[] | null {
  const { candidates, routingContext } = scorePresetCandidates(title);
  const rankedCandidates = candidates.sort(compareScoredPresetCandidates);
  const selectedCandidate = selectCandidateFromRoutingPipeline(rankedCandidates, routingContext);
  if (!selectedCandidate) {
    return null;
  }

  return mapPresetMissionsToTemplates(selectedCandidate.preset);
}

function selectPresetTemplatesById(presetId: string): MissionTemplate[] | null {
  const preset = PRESET_BY_ID.get(presetId);
  if (!preset) {
    return null;
  }

  return mapPresetMissionsToTemplates(preset);
}

function selectTopRankPresetTemplates(title: string): MissionTemplate[] | null {
  const topCandidate = rankLocalPresetCandidates(title, 1)[0];
  if (!topCandidate) {
    return null;
  }

  return selectPresetTemplatesById(topCandidate.id);
}

export function rankLocalPresetCandidates(title: string, limit = 5): LocalPresetRankCandidate[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 5;
  return scorePresetCandidates(title).candidates
    .sort(compareScoredPresetCandidates)
    .slice(0, safeLimit)
    .map((candidate) => {
      const exposureRerankConfidence = candidate.isExactTitleMatch ? 1 : candidate.rerankConfidence;
      const exposureRouteConfidence = candidate.isExactTitleMatch ? 1 : candidate.routeConfidence;

      return {
        id: candidate.preset.id,
        intent: candidate.preset.intent,
        title: candidate.preset.title,
        persona: candidate.preset.persona,
        type: candidate.preset.type,
        domain: candidate.preset.domain,
        state: candidate.routeCandidate?.state ?? "in_progress",
        timeContext: candidate.preset.timeContext,
        totalScore: candidate.totalScore,
        similarity: candidate.similarity,
        rerankConfidence: exposureRerankConfidence,
        routeConfidence: exposureRouteConfidence,
        priority: candidate.priority,
        difficulty: candidate.difficulty,
        estimatedTimeMin: candidate.estimatedTimeMin
      };
    });
}

function normalizeActionText(action: string): string {
  return action.trim().replace(/\s+/g, " ");
}

function analyzeActionQuality(action: string): { isActionable: boolean; startsWithVerb: boolean } {
  const normalizedAction = normalizeActionText(action);
  if (normalizedAction.length < 4) {
    return {
      isActionable: false,
      startsWithVerb: false
    };
  }

  const tokens = normalizedAction.split(" ");
  const firstToken = tokens[0] ?? "";
  const lastToken = tokens[tokens.length - 1] ?? "";
  const startsWithVerb = ACTION_START_VERB_PATTERN.test(firstToken);
  const endsWithVerb = ACTION_END_VERB_PATTERN.test(lastToken);
  const containsVerb = ACTION_CONTAINS_VERB_PATTERN.test(normalizedAction);
  const endsWithKoreanDeclarative = ACTION_KOREAN_DECLARATIVE_END_PATTERN.test(lastToken);
  const hasSentenceShape = tokens.length >= 2 && /[가-힣]/.test(normalizedAction);

  return {
    isActionable: hasSentenceShape && (endsWithVerb || containsVerb || endsWithKoreanDeclarative),
    startsWithVerb
  };
}

function buildEstMinutesRangeError(index: number): string {
  return `missions[${index}].estMinutes는 ${EST_MINUTES_RANGE_LABEL} 범위여야 합니다.`;
}

function buildResult(taskId: string, title: string, templates: MissionTemplate[]): MissioningResult {
  const safeTitle = normalizeTitle(title);

  return {
    taskId,
    title: safeTitle,
    context: safeTitle,
    missions: templates.map((template, index) => ({
      missionId: crypto.randomUUID(),
      order: index + 1,
      action: template.action,
      estMinutes: clampMinutes(template.estMinutes),
      difficulty: clampDifficulty(template.difficulty),
      notes: template.notes,
      iconKey: resolveMissionIconKey(template.action, template.notes, template.iconKey)
    })),
    safety: {
      requiresCaution: false,
      notes: ""
    }
  };
}

function buildDefaultTemplates(title: string): MissionTemplate[] {
  const safeTitle = normalizeTitle(title);

  return [
    { action: "시작 준비물 3개만 꺼내기", estMinutes: 3, difficulty: 1, notes: "몸을 먼저 움직이기" },
    { action: `${safeTitle}의 목표를 한 줄로 적기`, estMinutes: 4, difficulty: 1, notes: "완벽하지 않아도 괜찮음" },
    { action: "첫 행동을 10분 안에 끝낼 만큼 작게 쪼개기", estMinutes: 6, difficulty: 2, notes: "작은 단위 유지" },
    { action: "핵심 행동 1개 바로 실행하기", estMinutes: 10, difficulty: 2, notes: "타이머와 함께 시작" },
    { action: "진행 상태를 2문장으로 기록하기", estMinutes: 4, difficulty: 1, notes: "다음 행동 연결" },
    { action: "다음 미션을 예약하고 마무리하기", estMinutes: 3, difficulty: 1, notes: "복귀 마찰 줄이기" }
  ].map((template) => ({
    ...template,
    iconKey: resolveMissionIconKey(template.action, template.notes)
  }));
}

export function withNormalizedMissionIcons(payload: MissioningResult): MissioningResult {
  return {
    ...payload,
    missions: payload.missions.map((mission): MissionDraft => ({
      ...mission,
      iconKey: resolveMissionIconKey(mission.action, mission.notes, mission.iconKey)
    }))
  };
}

export function mapMissioningResultToMissions(
  payload: MissioningResult,
  options?: { taskId?: string; status?: Mission["status"] }
): Mission[] {
  const normalized = withNormalizedMissionIcons(payload);
  const taskId = options?.taskId ?? normalized.taskId;
  const status = options?.status ?? "todo";

  return normalized.missions.map((mission): Mission => ({
    id: mission.missionId,
    taskId,
    order: mission.order,
    action: mission.action,
    estMinutes: clampMinutes(mission.estMinutes),
    status,
    iconKey: mission.iconKey
  }));
}

export function generateLocalMissioning(
  taskId: string,
  title: string,
  options?: GenerateLocalMissioningOptions
): MissioningResult | null {
  const forcedPresetId = options?.forcePresetId?.trim();
  if (forcedPresetId) {
    const forcedTemplates = selectPresetTemplatesById(forcedPresetId);
    return forcedTemplates ? buildResult(taskId, title, forcedTemplates) : null;
  }

  if (options?.preferTopRank) {
    const topRankTemplates = selectTopRankPresetTemplates(title);
    if (topRankTemplates) {
      return buildResult(taskId, title, topRankTemplates);
    }
  }

  const jsonTemplates = selectJsonPresetTemplates(title);
  if (jsonTemplates) {
    return buildResult(taskId, title, jsonTemplates);
  }
  return null;
}

export function generateTemplateMissioning(taskId: string, title: string): MissioningResult {
  return buildResult(taskId, title, buildDefaultTemplates(title));
}

export function validateMissioningResult(payload: MissioningResult): MissioningValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  payload.missions = withNormalizedMissionIcons(payload).missions;

  if (!payload.taskId.trim()) {
    errors.push("taskId가 비어 있습니다.");
  }

  if (!payload.title.trim()) {
    errors.push("title이 비어 있습니다.");
  }

  if (!Array.isArray(payload.missions) || payload.missions.length === 0) {
    errors.push("missions가 비어 있습니다.");
    return {
      ok: false,
      errors,
      warnings
    };
  }

  if (payload.missions.length < RECOMMENDED_MIN_MISSION_COUNT || payload.missions.length > RECOMMENDED_MAX_MISSION_COUNT) {
    warnings.push(
      `missions 개수는 ${MISSION_COUNT_RECOMMENDED_LABEL}를 권장합니다. 현재 ${payload.missions.length}개이며, 생성은 경고만 남기고 계속 진행됩니다.`
    );
  }

  let nonVerbStartCount = 0;

  payload.missions.forEach((mission, index) => {
    if (!mission.missionId.trim()) {
      errors.push(`missions[${index}].missionId가 비어 있습니다.`);
    }

    const normalizedAction = normalizeActionText(mission.action);
    if (!normalizedAction) {
      errors.push(`missions[${index}].action이 비어 있습니다.`);
    }

    if (mission.order !== index + 1) {
      errors.push(`missions[${index}]의 순서가 올바르지 않습니다.`);
    }

    if (
      !Number.isFinite(mission.estMinutes)
      || mission.estMinutes < MIN_MISSION_EST_MINUTES
      || mission.estMinutes > MAX_MISSION_EST_MINUTES
    ) {
      errors.push(buildEstMinutesRangeError(index));
    }

    const actionQuality = analyzeActionQuality(normalizedAction);
    if (!actionQuality.isActionable) {
      errors.push(`missions[${index}]는 실행 가능한 행동 문장이어야 합니다.`);
    }

    if (actionQuality.isActionable && !actionQuality.startsWithVerb) {
      nonVerbStartCount += 1;
    }
  });

  if (nonVerbStartCount > 0) {
    warnings.push(`action은 동사 시작을 권장합니다. 현재 ${nonVerbStartCount}개 미션이 동사형 시작이 아닙니다.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}
