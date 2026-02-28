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
import missionPresetsJson from "@/docs/adhd_mission_presets_50.json";

export interface MissioningValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface AiMissioningAdapter {
  generate: (params: { taskId: string; title: string }) => Promise<MissioningResult>;
}

interface MissionPresetMeta {
  keywords: string[];
  keyword_weights: Record<string, number>;
  intent: string;
  priority: number;
  negative_keywords: string[];
  examples: string[];
  updated_at: string;
}

interface MissionPresetTaskMission {
  step: string;
  min: number;
  done: string;
}

interface MissionPresetTask {
  id: string;
  estimated_time_min: number;
  difficulty: number;
  missions: MissionPresetTaskMission[];
}

interface MissionPreset {
  schema_version: string;
  meta: MissionPresetMeta;
  task: MissionPresetTask;
}

interface IntentProfile {
  keywords: string[];
  examples: string[];
}

interface IntentSignalScore {
  score: number;
  keywordHits: number;
  exampleScore: number;
}

interface ScoredPresetCandidate {
  preset: MissionPreset;
  totalScore: number;
  priority: number;
  difficulty: number;
  estimatedTimeMin: number;
  taskId: string;
}

const PRESET_INTENT_SCORE_WEIGHT = 1.3;
const PRESET_NEGATIVE_KEYWORD_PENALTY = 7;
const PRESET_KEYWORD_FALLBACK_WEIGHT = 1;
const PRESET_MIN_SIGNAL_SCORE = 2;
const PRESET_MIN_EXAMPLE_SCORE = 3;
const DEFAULT_MISSION_NOTE = "완료 조건 체크";

const JSON_PRESETS: readonly MissionPreset[] = Array.isArray(missionPresetsJson)
  ? (missionPresetsJson as unknown as readonly MissionPreset[])
  : [];


const ACTION_START_VERB_PATTERN =
  /^(시작|준비|정리|분류|작성|확인|검토|실행|제출|저장|기록|예약|마무리|요약|복습|정돈|선택|고르|읽|적|풀|버리|담|옮기|닦|체크|보내|완료|쪼개|정하|계획)/;
const ACTION_END_VERB_PATTERN =
  /(하기|해보기|작성|정리|확인|검토|실행|준비|제출|저장|기록|예약|마무리|요약|복습|정돈|정하기|적기|읽기|풀기|버리기|담기|옮기기|닦기|고르기|체크하기|보내기|완료|종료)$/;
const ACTION_CONTAINS_VERB_PATTERN =
  /(하기|해보기|작성|정리|확인|검토|실행|준비|제출|저장|기록|예약|마무리|요약|복습|정돈|정하|적기|읽기|풀기|버리기|담기|옮기기|닦기|고르기|체크|보내|시작|종료)/;
const ACTION_KOREAN_DECLARATIVE_END_PATTERN = /[가-힣]+(다|요)(\([^)]*\))?$/;

const EST_MINUTES_RANGE_LABEL = `${MIN_MISSION_EST_MINUTES}~${MAX_MISSION_EST_MINUTES}분`;
const MISSION_COUNT_RECOMMENDED_LABEL = `${RECOMMENDED_MIN_MISSION_COUNT}~${RECOMMENDED_MAX_MISSION_COUNT}개`;
const DEFAULT_MISSION_ICON_KEY: MissionIconKey = "default";
const MISSION_ICON_RULES: Array<{ iconKey: MissionIconKey; keywords: string[] }> = [
  { iconKey: "routine", keywords: ["알람", "기상", "취침", "잠", "루틴", "아침", "저녁", "세면", "물", "침대"] },
  { iconKey: "organize", keywords: ["정리", "청소", "정돈", "분류", "버리", "치우", "옮기", "정렬"] },
  { iconKey: "record", keywords: ["작성", "적기", "기록", "메모", "입력", "정리노트"] },
  { iconKey: "review", keywords: ["확인", "검토", "체크", "점검", "요약", "마무리", "완료"] },
  { iconKey: "schedule", keywords: ["일정", "예약", "계획", "마감", "시간"] },
  { iconKey: "break", keywords: ["휴식", "스트레칭", "호흡", "산책", "쉬기"] },
  { iconKey: "execute", keywords: ["시작", "실행", "집중", "작업", "진행", "핵심", "처리"] }
];

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

function tokenizeScoreText(input: string): string[] {
  return normalizeScoreText(input)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

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

function isFuzzyTokenMatch(sourceToken: string, targetToken: string): boolean {
  if (sourceToken === targetToken) {
    return true;
  }

  if (sourceToken.length < 2 || targetToken.length < 2) {
    return false;
  }

  return sourceToken.includes(targetToken) || targetToken.includes(sourceToken);
}

function scoreExampleMatch(normalizedInput: string, compactInput: string, example: string): number {
  const normalizedExample = normalizeScoreText(example);
  if (!normalizedExample) {
    return 0;
  }

  if (hasScoreTerm(normalizedInput, compactInput, normalizedExample)) {
    return 12;
  }

  const inputTokens = tokenizeScoreText(normalizedInput);
  const exampleTokens = tokenizeScoreText(normalizedExample);
  if (inputTokens.length === 0 || exampleTokens.length === 0) {
    return 0;
  }

  const matchedTokenCount = exampleTokens.reduce((count, exampleToken) => {
    const hasMatch = inputTokens.some((inputToken) => isFuzzyTokenMatch(inputToken, exampleToken));
    return count + (hasMatch ? 1 : 0);
  }, 0);

  const overlapRatio = matchedTokenCount / Math.max(inputTokens.length, exampleTokens.length);
  return overlapRatio * 10;
}

function buildIntentProfiles(presets: readonly MissionPreset[]): Record<string, IntentProfile> {
  const profileMap = new Map<string, { keywords: Set<string>; examples: Set<string> }>();

  presets.forEach((preset) => {
    const normalizedIntent = normalizeScoreText(preset.meta.intent);
    if (!normalizedIntent) {
      return;
    }

    if (!profileMap.has(normalizedIntent)) {
      profileMap.set(normalizedIntent, {
        keywords: new Set<string>(),
        examples: new Set<string>()
      });
    }

    const profile = profileMap.get(normalizedIntent);
    if (!profile) {
      return;
    }

    const weightedKeywords = Object.keys(preset.meta.keyword_weights);
    [...preset.meta.keywords, ...weightedKeywords].forEach((keyword) => {
      const normalizedKeyword = normalizeScoreText(keyword);
      if (normalizedKeyword) {
        profile.keywords.add(normalizedKeyword);
      }
    });

    preset.meta.examples.forEach((example) => {
      const normalizedExample = normalizeScoreText(example);
      if (normalizedExample) {
        profile.examples.add(normalizedExample);
      }
    });
  });

  return Array.from(profileMap.entries()).reduce<Record<string, IntentProfile>>((acc, [intent, profile]) => {
    acc[intent] = {
      keywords: Array.from(profile.keywords),
      examples: Array.from(profile.examples)
    };
    return acc;
  }, {});
}

const INTENT_PROFILE_MAP = buildIntentProfiles(JSON_PRESETS);

function computeIntentSignalScores(normalizedTitle: string, compactTitle: string): Record<string, IntentSignalScore> {
  return Object.entries(INTENT_PROFILE_MAP).reduce<Record<string, IntentSignalScore>>((acc, [intent, profile]) => {
    let keywordHits = 0;
    profile.keywords.forEach((keyword) => {
      if (hasScoreTerm(normalizedTitle, compactTitle, keyword)) {
        keywordHits += 1;
      }
    });

    const exampleScore = profile.examples.reduce((maxScore, example) => {
      return Math.max(maxScore, scoreExampleMatch(normalizedTitle, compactTitle, example));
    }, 0);
    const intentText = intent.replace(/_/g, " ");
    const directIntentScore = hasScoreTerm(normalizedTitle, compactTitle, intentText) ? 6 : 0;
    const score = keywordHits * 2 + exampleScore + directIntentScore;

    acc[intent] = {
      score,
      keywordHits,
      exampleScore
    };

    return acc;
  }, {});
}

function scoreKeywordWeights(
  meta: MissionPresetMeta,
  normalizedTitle: string,
  compactTitle: string
): { score: number; hitCount: number } {
  let score = 0;
  let hitCount = 0;
  const weightedKeywords = new Set<string>();

  Object.entries(meta.keyword_weights).forEach(([keyword, weight]) => {
    weightedKeywords.add(keyword);
    if (!hasScoreTerm(normalizedTitle, compactTitle, keyword)) {
      return;
    }

    const safeWeight = Number.isFinite(weight) ? weight : 0;
    score += safeWeight;
    hitCount += 1;
  });

  meta.keywords.forEach((keyword) => {
    if (weightedKeywords.has(keyword)) {
      return;
    }

    if (!hasScoreTerm(normalizedTitle, compactTitle, keyword)) {
      return;
    }

    score += PRESET_KEYWORD_FALLBACK_WEIGHT;
    hitCount += 1;
  });

  return {
    score,
    hitCount
  };
}

function scoreNegativeKeywords(meta: MissionPresetMeta, normalizedTitle: string, compactTitle: string): number {
  return meta.negative_keywords.reduce((penalty, keyword) => {
    if (!hasScoreTerm(normalizedTitle, compactTitle, keyword)) {
      return penalty;
    }

    return penalty + PRESET_NEGATIVE_KEYWORD_PENALTY;
  }, 0);
}

function scoreAdhdExecution(task: MissionPresetTask): number {
  const difficulty = clampDifficulty(task.difficulty);
  const estimatedTime = Number.isFinite(task.estimated_time_min)
    ? Math.max(1, Math.floor(task.estimated_time_min))
    : MAX_MISSION_EST_MINUTES;
  const firstMissionMin = Number.isFinite(task.missions[0]?.min)
    ? Math.max(1, Math.floor(task.missions[0].min))
    : MAX_MISSION_EST_MINUTES;

  const difficultyBonus = (4 - difficulty) * 2.5;
  const shortTimeBonus = Math.max(0, 15 - estimatedTime) * 0.4;
  const firstMissionBonus = firstMissionMin >= 1 && firstMissionMin <= 2 ? 2.5 : 0;

  return difficultyBonus + shortTimeBonus + firstMissionBonus;
}

function compareScoredPresetCandidates(a: ScoredPresetCandidate, b: ScoredPresetCandidate): number {
  if (b.totalScore !== a.totalScore) {
    return b.totalScore - a.totalScore;
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
  if (!Array.isArray(preset.task.missions) || preset.task.missions.length === 0) {
    return null;
  }

  const difficulty = clampDifficulty(preset.task.difficulty);
  const templates = preset.task.missions
    .map((mission): MissionTemplate | null => {
      const action = normalizeActionText(mission.step ?? "");
      if (!action) {
        return null;
      }

      const notes = normalizeActionText(mission.done ?? "") || DEFAULT_MISSION_NOTE;
      return {
        action,
        estMinutes: clampMinutes(mission.min),
        difficulty,
        notes,
        iconKey: resolveMissionIconKey(action, notes)
      };
    })
    .filter((template): template is MissionTemplate => template !== null);

  return templates.length > 0 ? templates : null;
}

function scorePresetCandidates(title: string): ScoredPresetCandidate[] {
  const normalizedTitle = normalizeScoreText(title);
  if (!normalizedTitle) {
    return [];
  }

  const compactTitle = normalizedTitle.replace(/\s+/g, "");
  const intentSignals = computeIntentSignalScores(normalizedTitle, compactTitle);

  return JSON_PRESETS.reduce<ScoredPresetCandidate[]>((candidates, preset) => {
    const normalizedIntent = normalizeScoreText(preset.meta.intent);
    const intentSignal = intentSignals[normalizedIntent];
    const { score: keywordScore, hitCount: keywordHitCount } = scoreKeywordWeights(
      preset.meta,
      normalizedTitle,
      compactTitle
    );
    const priority = Number.isFinite(preset.meta.priority) ? preset.meta.priority : 0;
    const difficulty = clampDifficulty(preset.task.difficulty);
    const estimatedTimeMin = Number.isFinite(preset.task.estimated_time_min)
      ? Math.max(1, Math.floor(preset.task.estimated_time_min))
      : MAX_MISSION_EST_MINUTES;
    const negativePenalty = scoreNegativeKeywords(preset.meta, normalizedTitle, compactTitle);
    const adhdScore = scoreAdhdExecution(preset.task);
    const safeIntentScore = intentSignal?.score ?? 0;
    const signalMatched = keywordHitCount > 0
      || (intentSignal?.keywordHits ?? 0) > 0
      || (intentSignal?.exampleScore ?? 0) >= PRESET_MIN_EXAMPLE_SCORE
      || safeIntentScore >= PRESET_MIN_SIGNAL_SCORE;

    if (!signalMatched) {
      return candidates;
    }

    const totalScore = Number(
      (
        safeIntentScore * PRESET_INTENT_SCORE_WEIGHT
        + keywordScore
        + priority
        + adhdScore
        - negativePenalty
      ).toFixed(4)
    );

    candidates.push({
      preset,
      totalScore,
      priority,
      difficulty,
      estimatedTimeMin,
      taskId: preset.task.id
    });

    return candidates;
  }, []);
}

function selectJsonPresetTemplates(title: string): MissionTemplate[] | null {
  const rankedCandidates = scorePresetCandidates(title).sort(compareScoredPresetCandidates);
  for (const candidate of rankedCandidates) {
    const mappedTemplates = mapPresetMissionsToTemplates(candidate.preset);
    if (mappedTemplates) {
      return mappedTemplates;
    }
  }

  return null;
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
    { action: `시작 준비물 3개만 꺼내기`, estMinutes: 3, difficulty: 1, notes: "몸을 먼저 움직이기" },
    { action: `${safeTitle}의 목표를 한 줄로 적기`, estMinutes: 4, difficulty: 1, notes: "완벽하지 않아도 괜찮음" },
    { action: `첫 행동을 10분 안에 끝낼 만큼 작게 쪼개기`, estMinutes: 6, difficulty: 2, notes: "작은 단위 유지" },
    { action: `핵심 행동 1개 바로 실행하기`, estMinutes: 10, difficulty: 2, notes: "타이머와 함께 시작" },
    { action: `진행 상태를 2문장으로 기록하기`, estMinutes: 4, difficulty: 1, notes: "다음 행동 연결" },
    { action: `다음 미션를 예약하고 마무리하기`, estMinutes: 3, difficulty: 1, notes: "복귀 마찰 줄이기" }
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

export function generateLocalMissioning(taskId: string, title: string): MissioningResult | null {
  const jsonTemplates = selectJsonPresetTemplates(title);
  if (jsonTemplates) {
    return buildResult(taskId, title, jsonTemplates);
  }
  return null;
}

export function generateTemplateMissioning(taskId: string, title: string): MissioningResult {
  return buildResult(taskId, title, buildDefaultTemplates(title));
}

export function createAiFallbackAdapter(delayMs = 600): AiMissioningAdapter {
  return {
    async generate({ taskId, title }) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      return generateTemplateMissioning(taskId, title);
    }
  };
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
    warnings.push(`action은 동사 시작을 권장합니다. 현재 ${nonVerbStartCount}개 미션가 동사형 시작이 아닙니다.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}
