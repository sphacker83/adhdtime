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

import {
  findRankedTemplateById,
  rankDatasetTemplates,
  selectDatasetTemplateCandidate,
  type PresetPersona,
  type PresetType,
  type RouteDomain,
  type RouteState,
  type RouteTimeContext
} from "./dataset-ranker";
import type { DatasetTemplate } from "./dataset-runtime-source";

export interface MissioningValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
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
  titleRelevanceConfidence: number;
  priority: number;
  difficulty: number;
  estimatedTimeMin: number;
}

export interface GenerateLocalMissioningOptions {
  forcePresetId?: string;
  preferTopRank?: boolean;
}

const DEFAULT_MISSION_NOTE = "완료 조건 체크";

const ACTION_START_VERB_PATTERN =
  /^(시작|준비|정리|분류|작성|확인|검토|실행|제출|저장|기록|예약|마무리|요약|복습|정돈|선택|고르|읽|적|풀|버리|담|옮기|닦|체크|보내|완료|쪼개|정하|계획|이어가|유지하|진행하)/;
const ACTION_END_VERB_PATTERN =
  /(하기|해보기|작성|정리|확인|검토|실행|준비|제출|저장|기록|예약|마무리|요약|복습|정돈|정하기|적기|읽기|풀기|버리기|담기|옮기기|닦기|고르기|체크하기|보내기|꺼내기|모으기|비우기|완료|종료|(이어가|유지하|진행하)(기|세요)?)$/;
const ACTION_CONTAINS_VERB_PATTERN =
  /(하기|해보기|작성|정리|확인|검토|실행|준비|제출|저장|기록|예약|마무리|요약|복습|정돈|정하|적기|읽기|풀기|버리기|담기|옮기기|닦기|고르기|체크|보내|꺼내|모으|비우|시작|종료|이어가|유지하|진행하)/;
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
const TITLE_RELEVANCE_STOPWORDS = new Set<string>([
  "그리고",
  "그냥",
  "근데",
  "나는",
  "내가",
  "너무",
  "다시",
  "당장",
  "또",
  "뭔가",
  "뭐",
  "먼저",
  "만",
  "만좀",
  "부터",
  "부터는",
  "좀",
  "조금",
  "지금",
  "해서",
  "해야",
  "해야지",
  "하기",
  "할일",
  "할일들",
  "해",
  "the",
  "a",
  "an",
  "to",
  "for",
  "and",
  "or",
  "my",
  "your",
  "task"
]);
const TITLE_RELEVANCE_JOSA_SUFFIXES = [
  "으로부터",
  "으로는",
  "으로도",
  "에게서",
  "한테서",
  "에서는",
  "에서만",
  "에게",
  "한테",
  "보다",
  "처럼",
  "까지",
  "부터",
  "으로",
  "에서",
  "로는",
  "로도",
  "라도",
  "이나",
  "이랑",
  "랑",
  "으로",
  "로",
  "와",
  "과",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "에",
  "도",
  "만"
] as const;
const TITLE_RELEVANCE_ENDING_SUFFIXES = [
  "하기",
  "하고",
  "하면",
  "하며",
  "했다",
  "했어",
  "했던",
  "하는",
  "하게",
  "하다",
  "해요",
  "해야",
  "해서",
  "한",
  "할",
  "된",
  "되는",
  "되다",
  "되어",
  "되",
  "인"
] as const;
const TITLE_RELEVANCE_PHRASE_NORMALIZATIONS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /받은\s*편지함/gi, replacement: "받은편지함" },
  { pattern: /in\s*box/gi, replacement: "inbox" },
  { pattern: /빨래\s*감/gi, replacement: "빨랫감" }
];
const TITLE_RELEVANCE_SYNONYM_GROUPS: readonly string[][] = [
  ["빨래", "세탁", "세탁물", "빨랫감", "laundry"],
  ["개기", "접기", "개다", "접다", "폴딩", "fold"],
  ["널기", "널다", "말리기", "말리다", "건조", "건조기", "dry"],
  ["메일", "이메일", "email", "mail", "전자우편", "지메일", "gmail"],
  ["인박스", "받은편지함", "메일함", "inbox", "inboxzero", "인박스제로"],
  ["회신", "답장", "reply", "respond"],
  ["정리", "분류", "트리아지", "triage", "처리"]
];
const TITLE_RELEVANCE_SYNONYM_MAP = buildTitleRelevanceSynonymMap();

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeScoreText(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, " ");
}

function normalizeActionText(action: string): string {
  return action.trim().replace(/\s+/g, " ");
}

function normalizeTitle(title: string): string {
  return normalizeTaskSummary(title);
}

function normalizeTitleRelevanceText(input: string): string {
  let normalized = normalizeScoreText(input);

  for (const phraseNormalization of TITLE_RELEVANCE_PHRASE_NORMALIZATIONS) {
    normalized = normalized.replace(phraseNormalization.pattern, phraseNormalization.replacement);
  }

  return normalized
    .replace(/[^0-9a-zA-Z가-힣\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactTitleRelevanceText(input: string): string {
  return normalizeTitleRelevanceText(input).replace(/\s+/g, "");
}

function isKoreanToken(token: string): boolean {
  return /[가-힣]/.test(token);
}

function stripTokenSuffix(token: string, suffixes: readonly string[]): string {
  for (const suffix of suffixes) {
    if (token.length > suffix.length + 1 && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }

  return token;
}

function simplifyKoreanToken(token: string): string {
  const withoutJosa = stripTokenSuffix(token, TITLE_RELEVANCE_JOSA_SUFFIXES);
  const withoutEnding = stripTokenSuffix(withoutJosa, TITLE_RELEVANCE_ENDING_SUFFIXES);
  return withoutEnding.length >= 2 ? withoutEnding : withoutJosa;
}

function normalizeTitleRelevanceToken(token: string): string {
  const normalizedToken = token.toLowerCase().trim();
  if (!normalizedToken) {
    return "";
  }

  if (!isKoreanToken(normalizedToken)) {
    return normalizedToken;
  }

  return simplifyKoreanToken(normalizedToken);
}

function tokenizeTitleRelevanceText(input: string): string[] {
  const normalizedText = normalizeTitleRelevanceText(input);
  if (!normalizedText) {
    return [];
  }

  const tokens = normalizedText
    .split(/[^0-9a-zA-Z가-힣]+/)
    .map(normalizeTitleRelevanceToken)
    .filter((token) => {
      if (!token || TITLE_RELEVANCE_STOPWORDS.has(token)) {
        return false;
      }

      if (token.length === 1 && !/^\d$/.test(token)) {
        return false;
      }

      return true;
    });

  return Array.from(new Set(tokens));
}

function buildTitleRelevanceSynonymMap(): Map<string, string> {
  const synonymMap = new Map<string, string>();

  for (const synonymGroup of TITLE_RELEVANCE_SYNONYM_GROUPS) {
    const normalizedTokens = synonymGroup
      .map((token) => normalizeTitleRelevanceToken(token))
      .filter((token) => token.length > 0);

    const canonicalToken = normalizedTokens[0];
    if (!canonicalToken) {
      continue;
    }

    for (const token of normalizedTokens) {
      synonymMap.set(token, canonicalToken);
    }
  }

  return synonymMap;
}

function resolveTitleRelevanceCanonicalToken(token: string): string {
  const normalizedToken = normalizeTitleRelevanceToken(token);
  if (!normalizedToken) {
    return "";
  }

  return TITLE_RELEVANCE_SYNONYM_MAP.get(normalizedToken) ?? normalizedToken;
}

function computeExactTokenMatchScore(queryToken: string, titleToken: string): number {
  if (queryToken === titleToken) {
    return 1;
  }

  if (queryToken.length >= 2 && titleToken.includes(queryToken)) {
    return 0.74;
  }

  if (titleToken.length >= 2 && queryToken.includes(titleToken)) {
    return 0.68;
  }

  return 0;
}

function computeSemanticTokenMatchScore(queryToken: string, titleToken: string): number {
  const exactMatchScore = computeExactTokenMatchScore(queryToken, titleToken);
  if (exactMatchScore > 0) {
    return exactMatchScore;
  }

  const queryCanonical = resolveTitleRelevanceCanonicalToken(queryToken);
  const titleCanonical = resolveTitleRelevanceCanonicalToken(titleToken);
  if (!queryCanonical || !titleCanonical) {
    return 0;
  }

  if (queryCanonical === titleCanonical) {
    return 0.93;
  }

  if (queryCanonical.length >= 2 && titleCanonical.includes(queryCanonical)) {
    return 0.72;
  }

  if (titleCanonical.length >= 2 && queryCanonical.includes(titleCanonical)) {
    return 0.68;
  }

  return 0;
}

type TokenMatcher = (queryToken: string, titleToken: string) => number;

function computeTokenCoverageScore(
  queryTokens: readonly string[],
  titleTokens: readonly string[],
  tokenMatcher: TokenMatcher
): number {
  if (queryTokens.length === 0 || titleTokens.length === 0) {
    return 0;
  }

  const matchTotal = queryTokens.reduce((sum, queryToken) => {
    let bestMatch = 0;

    for (const titleToken of titleTokens) {
      const nextScore = tokenMatcher(queryToken, titleToken);
      if (nextScore > bestMatch) {
        bestMatch = nextScore;
      }
      if (bestMatch >= 1) {
        break;
      }
    }

    return sum + bestMatch;
  }, 0);

  return clamp01(matchTotal / queryTokens.length);
}

function computeOrderedTokenCoverageScore(queryTokens: readonly string[], titleTokens: readonly string[]): number {
  if (queryTokens.length === 0 || titleTokens.length === 0) {
    return 0;
  }

  let titleIndex = 0;
  let matchedScore = 0;

  for (const queryToken of queryTokens) {
    while (titleIndex < titleTokens.length) {
      const score = computeSemanticTokenMatchScore(queryToken, titleTokens[titleIndex]);
      titleIndex += 1;
      if (score >= 0.7) {
        matchedScore += score;
        break;
      }
    }
  }

  return clamp01(matchedScore / queryTokens.length);
}

function buildTitleRelevanceBigrams(input: string): string[] {
  const compactText = compactTitleRelevanceText(input);
  if (compactText.length < 2) {
    return [];
  }

  const bigrams: string[] = [];
  for (let index = 0; index <= compactText.length - 2; index += 1) {
    bigrams.push(compactText.slice(index, index + 2));
  }

  return bigrams;
}

function computeTitleRelevanceDiceScore(source: string, target: string): number {
  const sourceBigrams = buildTitleRelevanceBigrams(source);
  const targetBigrams = buildTitleRelevanceBigrams(target);

  if (sourceBigrams.length === 0 || targetBigrams.length === 0) {
    return 0;
  }

  const sourceCountMap = new Map<string, number>();
  sourceBigrams.forEach((bigram) => {
    sourceCountMap.set(bigram, (sourceCountMap.get(bigram) ?? 0) + 1);
  });

  let overlapCount = 0;
  targetBigrams.forEach((bigram) => {
    const currentCount = sourceCountMap.get(bigram) ?? 0;
    if (currentCount <= 0) {
      return;
    }

    overlapCount += 1;
    sourceCountMap.set(bigram, currentCount - 1);
  });

  return clamp01((2 * overlapCount) / (sourceBigrams.length + targetBigrams.length));
}

function computeTitleRelevanceConfidence(query: string, title: string): number {
  const normalizedQuery = normalizeTitleRelevanceText(query);
  const normalizedTitle = normalizeTitleRelevanceText(title);
  if (!normalizedQuery || !normalizedTitle) {
    return 0;
  }

  const queryTokens = tokenizeTitleRelevanceText(normalizedQuery);
  const titleTokens = tokenizeTitleRelevanceText(normalizedTitle);

  const exactCoverage = computeTokenCoverageScore(queryTokens, titleTokens, computeExactTokenMatchScore);
  const semanticCoverage = computeTokenCoverageScore(queryTokens, titleTokens, computeSemanticTokenMatchScore);
  const orderedCoverage = computeOrderedTokenCoverageScore(queryTokens, titleTokens);
  const diceScore = computeTitleRelevanceDiceScore(normalizedQuery, normalizedTitle);

  const compactQuery = compactTitleRelevanceText(normalizedQuery);
  const compactTitle = compactTitleRelevanceText(normalizedTitle);
  const hasDirectPhraseMatch = compactQuery.length >= 2 && compactTitle.includes(compactQuery);
  if (hasDirectPhraseMatch) {
    const directMatchBoostedScore = 0.85 + (semanticCoverage * 0.1) + (Math.max(diceScore, orderedCoverage) * 0.05);
    return clamp01(directMatchBoostedScore);
  }

  let score = (semanticCoverage * 0.48)
    + (exactCoverage * 0.24)
    + (orderedCoverage * 0.12)
    + (diceScore * 0.16);

  if (semanticCoverage >= 0.85) {
    score += 0.06;
  } else if (semanticCoverage >= 0.65 && diceScore >= 0.45) {
    score += 0.04;
  }

  return clamp01(score);
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

function resolveTemplateMissionDifficulty(template: DatasetTemplate): number {
  const intensity = template.meta?.intensity ?? "";
  if (intensity === "MIN") {
    return 1;
  }
  if (intensity === "STD") {
    return 2;
  }
  if (intensity === "FULL") {
    return 3;
  }

  const defaultMinutes = Number.isFinite(template.time.default) ? template.time.default : 15;
  if (defaultMinutes <= 10) {
    return 1;
  }
  if (defaultMinutes <= 17) {
    return 2;
  }
  return 3;
}

function buildMissionNote(template: DatasetTemplate, action: string): string {
  const goalFocus = normalizeActionText(template.meta?.goalFocus ?? "");
  if (goalFocus) {
    return `${goalFocus.toLowerCase()} 중심 실행`;
  }

  if (/기록|적기|작성|체크/.test(action)) {
    return "결과를 짧게 기록";
  }

  return DEFAULT_MISSION_NOTE;
}

function mapDatasetTemplateToTemplates(template: DatasetTemplate): MissionTemplate[] | null {
  if (!Array.isArray(template.missions) || template.missions.length === 0) {
    return null;
  }

  const fallbackDifficulty = resolveTemplateMissionDifficulty(template);

  const mapped = template.missions
    .map((mission): MissionTemplate | null => {
      const action = normalizeActionText(mission.action ?? "");
      if (!action) {
        return null;
      }

      const notes = buildMissionNote(template, action);
      const estMinutes = clampMinutes(Number(mission.estMin));

      return {
        action,
        estMinutes,
        difficulty: clampDifficulty(fallbackDifficulty, fallbackDifficulty),
        notes,
        iconKey: resolveMissionIconKey(action, notes)
      };
    })
    .filter((entry): entry is MissionTemplate => entry !== null);

  return mapped.length > 0 ? mapped : null;
}

function selectPresetTemplatesById(presetId: string): MissionTemplate[] | null {
  const template = findRankedTemplateById(presetId);
  if (!template) {
    return null;
  }

  return mapDatasetTemplateToTemplates(template);
}

function selectTopRankPresetTemplates(title: string): MissionTemplate[] | null {
  const topCandidate = rankDatasetTemplates(title, 1)[0];
  if (!topCandidate) {
    return null;
  }

  return mapDatasetTemplateToTemplates(topCandidate.template);
}

function selectRankedTemplates(title: string): MissionTemplate[] | null {
  const selectedCandidate = selectDatasetTemplateCandidate(title);
  if (!selectedCandidate) {
    return null;
  }

  return mapDatasetTemplateToTemplates(selectedCandidate.template);
}

export function rankLocalPresetCandidates(title: string, limit = 5): LocalPresetRankCandidate[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 5;

  return rankDatasetTemplates(title, safeLimit).map((candidate) => ({
    id: candidate.id,
    intent: candidate.intent,
    title: candidate.title,
    persona: candidate.persona,
    type: candidate.type,
    domain: candidate.domain,
    state: candidate.state,
    timeContext: candidate.timeContext,
    totalScore: candidate.totalScore,
    similarity: candidate.similarity,
    rerankConfidence: candidate.isExactTitleMatch ? 1 : clamp01(candidate.rerankConfidence),
    routeConfidence: candidate.isExactTitleMatch ? 1 : clamp01(candidate.routeConfidence),
    titleRelevanceConfidence: candidate.isExactTitleMatch ? 1 : computeTitleRelevanceConfidence(title, candidate.title),
    priority: candidate.priority,
    difficulty: candidate.difficulty,
    estimatedTimeMin: candidate.estimatedTimeMin
  }));
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

  const rankedTemplates = selectRankedTemplates(title);
  if (rankedTemplates) {
    return buildResult(taskId, title, rankedTemplates);
  }

  return null;
}

export function generateTemplateMissioning(taskId: string, title: string): MissioningResult {
  return buildResult(taskId, title, buildDefaultTemplates(title));
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
