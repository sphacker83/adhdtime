import {
  MAX_MISSION_EST_MINUTES,
  MIN_MISSION_EST_MINUTES
} from "@/features/mvp/types/domain";
import {
  type DatasetCluster,
  type DatasetLexicon,
  type DatasetTemplate,
  findDatasetTemplateById,
  findExactTitleTemplateIds,
  getDatasetRuntimeSource
} from "./dataset-runtime-source";

export type PresetPersona =
  | "student"
  | "worker"
  | "homemaker"
  | "developer"
  | "office_worker"
  | "writer"
  | "entertainment"
  | "travel"
  | "exercise";

export type PresetType = "routine" | "non_routine";

export type RouteDomain = "life_ops" | "productivity_growth" | "recovery_health" | "non_routine";

export type RouteState =
  | "start_delay"
  | "in_progress"
  | "blocked"
  | "fatigued"
  | "completion_push"
  | "reset_needed"
  | "avoidance_refusal";

export type RouteTimeContext =
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

interface SparseVector {
  weights: Map<string, number>;
  norm: number;
}

interface RouteProfile {
  persona: PresetPersona;
  type: PresetType;
  domain: RouteDomain;
  state: RouteState;
  timeContext: RouteTimeContext;
  preferredMinutes: number | null;
  quickMode: boolean;
  deepMode: boolean;
  signalCount: number;
}

interface TemplateSearchIndex {
  template: DatasetTemplate;
  vector: SparseVector;
  titleVector: SparseVector;
  missionVector: SparseVector;
  tokens: Set<string>;
  routeDomain: RouteDomain;
  persona: PresetPersona;
  type: PresetType;
  state: RouteState;
  timeContext: RouteTimeContext;
  intent: string;
  priority: number;
  difficulty: number;
  estimatedTimeMin: number;
}

export interface DatasetRankCandidate {
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
  isExactTitleMatch: boolean;
  template: DatasetTemplate;
}

const WORD_TOKEN_WEIGHT = 1;
const BIGRAM_TOKEN_WEIGHT = 0.45;
const TRIGRAM_TOKEN_WEIGHT = 0.25;

const ROUTINE_PERSONA_FAMILY = new Set<PresetPersona>(["worker", "office_worker", "developer", "writer"]);

const SCORE_STOPWORDS = new Set<string>([
  "먼저",
  "단계",
  "진행",
  "시작",
  "루틴",
  "완료",
  "체크",
  "해야",
  "해",
  "미루고",
  "있어",
  "다음",
  "행동",
  "결과",
  "기록",
  "정리"
]);

const DOMAIN_TO_ROUTE: Record<string, RouteDomain> = {
  HOME: "life_ops",
  ADMIN: "life_ops",
  ROUTINE: "life_ops",
  WORK: "productivity_growth",
  STUDY: "productivity_growth",
  SOCIAL: "productivity_growth",
  HEALTH: "recovery_health",
  STATE: "recovery_health"
};

const DOMAIN_TO_PERSONA: Record<string, PresetPersona> = {
  HOME: "homemaker",
  ADMIN: "office_worker",
  ROUTINE: "worker",
  WORK: "worker",
  STUDY: "student",
  SOCIAL: "entertainment",
  HEALTH: "exercise",
  STATE: "worker"
};

const CONTEXT_TO_TIME: Record<string, RouteTimeContext> = {
  MORNING: "morning",
  AFTER_LUNCH: "lunch",
  AFTER_WORK: "evening",
  BEFORE_SLEEP: "night",
  EVENING: "evening",
  WEEKEND: "weekend_pm",
  WEEKDAY: "work_pm",
  WORKDAY: "work_pm",
  WORK: "work_pm",
  OFFICE: "work_pm",
  DESK: "work_pm",
  STUDY: "work_pm",
  HOME: "evening",
  TRANSITION: "pre_event",
  MOBILE: "commute",
  ANYWHERE: "work_pm",
  SOCIAL: "evening",
  ADMIN: "work_pm",
  HEALTH: "post_event"
};

const LEGACY_TEMPLATE_ID_ALIASES: Record<string, string> = {
  TPL_HOME_KITCHEN_RESET_MIN_10_HOME_01: "TPL_HOME_KITCHEN_RESET_10"
};

const LEGACY_EXACT_TITLE_TO_TEMPLATE_ID: Record<string, string> = {
  "부엌 리셋 10분 짧게 집": "TPL_HOME_KITCHEN_RESET_10"
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function renormalizeRouteConfidence(rawRouteConfidence: number): number {
  const safe = clamp01(rawRouteConfidence);
  if (safe === 1) {
    return 1;
  }

  const curved = safe ** 0.68;
  const normalized = curved * 1.14 - 0.03;
  return clamp01(normalized);
}

function normalizeLookupTitle(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, " ");
}

function buildCanonicalToLegacyTemplateIdMap(): Map<string, string> {
  const canonicalToLegacyTemplateId = new Map<string, string>();
  Object.entries(LEGACY_TEMPLATE_ID_ALIASES).forEach(([legacyTemplateId, canonicalTemplateId]) => {
    if (!canonicalToLegacyTemplateId.has(canonicalTemplateId)) {
      canonicalToLegacyTemplateId.set(canonicalTemplateId, legacyTemplateId);
    }
  });

  return canonicalToLegacyTemplateId;
}

const CANONICAL_TO_LEGACY_TEMPLATE_ID = buildCanonicalToLegacyTemplateIdMap();

function resolveCanonicalTemplateId(templateId: string): string {
  return LEGACY_TEMPLATE_ID_ALIASES[templateId] ?? templateId;
}

function findLegacyExactMatches(input: string, normalizedInput: string): Map<string, string> {
  const normalizedCandidates = new Set<string>([
    normalizeLookupTitle(input),
    normalizeLookupTitle(normalizedInput)
  ]);
  const matchedCanonicalToLegacy = new Map<string, string>();

  Object.entries(LEGACY_EXACT_TITLE_TO_TEMPLATE_ID).forEach(([legacyTitle, canonicalTemplateId]) => {
    const normalizedLegacyTitle = normalizeLookupTitle(legacyTitle);
    if (!normalizedCandidates.has(normalizedLegacyTitle)) {
      return;
    }

    const legacyTemplateId = CANONICAL_TO_LEGACY_TEMPLATE_ID.get(canonicalTemplateId);
    if (legacyTemplateId) {
      matchedCanonicalToLegacy.set(canonicalTemplateId, legacyTemplateId);
    }
  });

  return matchedCanonicalToLegacy;
}

function normalizeScoreText(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, " ");
}

function tokenizeScoreText(input: string): string[] {
  return normalizeScoreText(input)
    .split(/[^0-9a-zA-Z가-힣_]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !SCORE_STOPWORDS.has(token));
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

function normalizeInput(input: string, lexicon: DatasetLexicon): string {
  let normalized = input;

  if (lexicon.normalization.lowercase) {
    normalized = normalized.toLowerCase();
  }

  for (const [typo, replacement] of Object.entries(lexicon.typos)) {
    normalized = normalized.replaceAll(typo.toLowerCase(), replacement.toLowerCase());
  }

  if (lexicon.normalization.removeFillers) {
    for (const filler of lexicon.fillers) {
      const pattern = new RegExp(`\\b${filler.toLowerCase()}\\b`, "g");
      normalized = normalized.replace(pattern, " ");
    }
  }

  if (lexicon.normalization.collapseSpaces) {
    normalized = normalized.replace(/\s+/g, " ").trim();
  }

  return normalized;
}

function hasTextPattern(input: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, "i").test(input);
  } catch {
    return false;
  }
}

function scoreConcepts(input: string): Map<string, number> {
  const source = getDatasetRuntimeSource();
  const conceptScores = new Map<string, number>();
  const queryTokens = tokenizeScoreText(input);

  source.lexicon.conceptLexemes.forEach((entry) => {
    let score = 0;

    entry.keywords.forEach((keyword) => {
      if (input.includes(keyword.toLowerCase())) {
        score += 3;
      }
    });

    entry.variants.forEach((variant) => {
      if (input.includes(variant.toLowerCase())) {
        score += 2;
      }
    });

    entry.patterns.forEach((pattern) => {
      if (hasTextPattern(input, pattern)) {
        score += 4;
      }
    });

    (entry.negativePatterns ?? []).forEach((pattern) => {
      if (hasTextPattern(input, pattern)) {
        score -= 4;
      }
    });

    const concept = source.conceptById.get(entry.conceptId);
    if (concept) {
      const lowerLabel = concept.label.toLowerCase();
      if (lowerLabel && input.includes(lowerLabel)) {
        score += 2;
      }

      concept.tags.forEach((tag) => {
        const normalizedTag = tag.toLowerCase();
        if (normalizedTag && input.includes(normalizedTag)) {
          score += 1.2;
        }
      });

      const aliasTokens = source.lexicon.aliases.conceptAlias[entry.conceptId] ?? [];
      aliasTokens.forEach((alias) => {
        if (alias && input.includes(alias.toLowerCase())) {
          score += 1.2;
        }
      });
    }

    if (score > 0) {
      conceptScores.set(entry.conceptId, Number(score.toFixed(4)));
    }
  });

  Object.entries(source.lexicon.stateHints).forEach(([conceptId, hints]) => {
    if (hints.some((hint) => input.includes(hint.toLowerCase()))) {
      conceptScores.set(conceptId, Number(((conceptScores.get(conceptId) ?? 0) + 2).toFixed(4)));
    }
  });

  if (queryTokens.length > 0) {
    source.concepts.forEach((concept) => {
      if (conceptScores.has(concept.conceptId)) {
        return;
      }

      const matchedTagCount = concept.tags.reduce((count, tag) => {
        const normalizedTag = tag.toLowerCase();
        if (!normalizedTag) {
          return count;
        }

        return count + (queryTokens.some((token) => normalizedTag.includes(token) || token.includes(normalizedTag)) ? 1 : 0);
      }, 0);

      if (matchedTagCount > 0) {
        conceptScores.set(concept.conceptId, Number((matchedTagCount * 0.75).toFixed(4)));
      }
    });
  }

  const knownConceptIds = new Set(source.concepts.map((concept) => concept.conceptId));
  return new Map(
    Array.from(conceptScores.entries()).filter(([conceptId, score]) => knownConceptIds.has(conceptId) && score > 0)
  );
}

const DEFAULT_TOP_K_CLUSTERS = 8;
const MAX_CLUSTER_PRIOR = 0.72;

interface ConceptDistribution {
  domainScores: Map<RouteDomain, number>;
  stateScores: Map<RouteState, number>;
  totalScore: number;
  topConceptIds: string[];
}

function addScore<K extends string>(map: Map<K, number>, key: K, delta: number): void {
  if (!Number.isFinite(delta) || delta <= 0) {
    return;
  }

  map.set(key, Number(((map.get(key) ?? 0) + delta).toFixed(4)));
}

function mapConceptDomainToRouteDomain(domain: string): RouteDomain {
  return DOMAIN_TO_ROUTE[domain] ?? "productivity_growth";
}

function mapStateConceptToRouteState(conceptId: string, mappedClusterKeys: readonly string[]): RouteState {
  const normalizedConceptId = conceptId.toUpperCase();

  if (normalizedConceptId.includes("AVOIDANCE") || normalizedConceptId.includes("REFUSAL") || normalizedConceptId.includes("HOPELESS")) {
    return "avoidance_refusal";
  }

  if (normalizedConceptId.includes("FINISH") || normalizedConceptId.includes("DEADLINE") || normalizedConceptId.includes("SUBMIT")) {
    return "completion_push";
  }

  if (
    normalizedConceptId.includes("DISTRACT")
    || normalizedConceptId.includes("DOOMSCROLL")
    || normalizedConceptId.includes("CHECKING")
    || normalizedConceptId.includes("FORGETFUL")
  ) {
    return "reset_needed";
  }

  if (
    normalizedConceptId.includes("BURNOUT")
    || normalizedConceptId.includes("FOGGY")
    || normalizedConceptId.includes("GROGGY")
    || normalizedConceptId.includes("HUNGRY")
    || normalizedConceptId.includes("HEADACHE")
    || normalizedConceptId.includes("BLOOD_SUGAR")
    || normalizedConceptId.includes("CAFFEINE_CRASH")
  ) {
    return "fatigued";
  }

  if (
    normalizedConceptId.includes("ANX")
    || normalizedConceptId.includes("OVERWHELM")
    || normalizedConceptId.includes("FREEZE")
    || normalizedConceptId.includes("DECISION")
    || normalizedConceptId.includes("PANIC")
  ) {
    return "blocked";
  }

  if (normalizedConceptId.includes("FIRST_ACTION") || normalizedConceptId.includes("PROCRAST")) {
    return "start_delay";
  }

  if (mappedClusterKeys.some((clusterKey) => clusterKey.includes("DISTRACTION"))) {
    return "reset_needed";
  }
  if (mappedClusterKeys.some((clusterKey) => clusterKey.includes("LOW_ENERGY"))) {
    return "fatigued";
  }
  if (mappedClusterKeys.some((clusterKey) => clusterKey.includes("OVERWHELM") || clusterKey.includes("ANXIETY"))) {
    return "blocked";
  }
  if (mappedClusterKeys.some((clusterKey) => clusterKey.includes("LOW_MOTIVATION"))) {
    return "start_delay";
  }

  return "in_progress";
}

function pickTopScoreKey<K extends string>(scores: Map<K, number>, fallback: K): { key: K; confidence: number } {
  const entries = Array.from(scores.entries()).sort((left, right) => right[1] - left[1]);
  if (entries.length === 0) {
    return {
      key: fallback,
      confidence: 0
    };
  }

  const total = entries.reduce((sum, [, score]) => sum + score, 0);
  return {
    key: entries[0][0],
    confidence: total > 0 ? clamp01(entries[0][1] / total) : 0
  };
}

function inferPersonaFromTopConcepts(topConceptIds: readonly string[], domain: RouteDomain): PresetPersona {
  const mergedConceptText = topConceptIds.join(" ").toUpperCase();

  if (/(CODE|DEBUG|DEPLOY|COMMIT|REVIEW)/.test(mergedConceptText)) {
    return "developer";
  }
  if (/(WRITE|DRAFT|MANUSCRIPT|ESSAY|PUBLISH)/.test(mergedConceptText)) {
    return "writer";
  }
  if (/(TRAVEL|ITINERARY|FLIGHT|HOTEL|PACK)/.test(mergedConceptText)) {
    return "travel";
  }
  if (/(WORKOUT|RUN|STRETCH|CARDIO|EXERCISE)/.test(mergedConceptText)) {
    return "exercise";
  }
  if (/(STUDY|EXAM|COURSE|HOMEWORK|LECTURE)/.test(mergedConceptText)) {
    return "student";
  }

  const fallbackByDomain: Record<RouteDomain, PresetPersona> = {
    life_ops: "homemaker",
    productivity_growth: "worker",
    recovery_health: "exercise",
    non_routine: "entertainment"
  };

  return fallbackByDomain[domain];
}

function inferTypeFromDistribution(domainScores: Map<RouteDomain, number>, persona: PresetPersona): PresetType {
  const nonRoutineScore = domainScores.get("non_routine") ?? 0;
  const routineScore = (domainScores.get("life_ops") ?? 0)
    + (domainScores.get("productivity_growth") ?? 0)
    + (domainScores.get("recovery_health") ?? 0);

  if (["travel", "entertainment"].includes(persona)) {
    return "non_routine";
  }

  if (nonRoutineScore > 0 && nonRoutineScore >= routineScore * 0.55) {
    return "non_routine";
  }

  return "routine";
}

function inferTimeContextFromSignals(
  contextSignals: Set<string>,
  quickMode: boolean,
  deepMode: boolean,
  preferredMinutes: number | null
): RouteTimeContext {
  const timeScores = new Map<RouteTimeContext, number>();

  contextSignals.forEach((contextKey) => {
    const mappedTime = CONTEXT_TO_TIME[contextKey];
    if (mappedTime) {
      addScore(timeScores, mappedTime, 1);
    }
  });

  if (quickMode) {
    addScore(timeScores, "commute", 0.35);
    addScore(timeScores, "work_pm", 0.25);
  }

  if (deepMode) {
    addScore(timeScores, "work_pm", 0.3);
    addScore(timeScores, "evening", 0.25);
  }

  if (preferredMinutes !== null) {
    if (preferredMinutes <= 10) {
      addScore(timeScores, "commute", 0.15);
    } else if (preferredMinutes >= 20) {
      addScore(timeScores, "evening", 0.15);
    }
  }

  return pickTopScoreKey(timeScores, "work_pm").key;
}

function buildConceptDistribution(conceptScores: Map<string, number>): ConceptDistribution {
  const source = getDatasetRuntimeSource();
  const domainScores = new Map<RouteDomain, number>();
  const stateScores = new Map<RouteState, number>();
  let totalScore = 0;

  conceptScores.forEach((rawScore, conceptId) => {
    const concept = source.conceptById.get(conceptId);
    if (!concept || rawScore <= 0) {
      return;
    }

    const priorityBoost = 1 + Math.max(0, Math.min(0.35, (concept.priority - 5) * 0.03));
    const weightedScore = rawScore * priorityBoost;
    totalScore += weightedScore;

    const routeDomain = mapConceptDomainToRouteDomain(concept.domain);
    addScore(domainScores, routeDomain, weightedScore);

    if (concept.domain === "STATE") {
      const mappedClusters = source.conceptToClusters.get(conceptId) ?? [];
      const routeState = mapStateConceptToRouteState(conceptId, mappedClusters);
      addScore(stateScores, routeState, weightedScore * 1.12);
      addScore(domainScores, "recovery_health", weightedScore * 0.2);
    }
  });

  const topConceptIds = Array.from(conceptScores.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([conceptId]) => conceptId);

  return {
    domainScores,
    stateScores,
    totalScore,
    topConceptIds
  };
}

function scoreClusters(conceptScores: Map<string, number>): Map<string, number> {
  const source = getDatasetRuntimeSource();
  const scores = new Map<string, number>();

  conceptScores.forEach((conceptScore, conceptId) => {
    const concept = source.conceptById.get(conceptId);
    if (!concept || conceptScore <= 0) {
      return;
    }

    const mappedClusters = source.conceptToClusters.get(conceptId) ?? [];
    const conceptWeight = concept.domain === "STATE" ? 0.92 : 1;

    mappedClusters.forEach((clusterKey, index) => {
      const rankWeight = index === 0 ? 1 : index === 1 ? 0.76 : 0.58;
      addScore(scores, clusterKey, conceptScore * conceptWeight * rankWeight);
    });
  });

  return scores;
}

function selectTopClusterKeys(clusterScores: Map<string, number>, topK: number): string[] {
  if (clusterScores.size === 0) {
    return [];
  }

  return Array.from(clusterScores.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, Math.max(1, topK))
    .map(([clusterKey]) => clusterKey);
}

function extractPreferredMinutes(normalizedInput: string, lexicon: DatasetLexicon): number | null {
  const rangeMatches = lexicon.timeHints.rangePatterns
    .map((pattern) => {
      try {
        return normalizedInput.match(new RegExp(pattern, "i"));
      } catch {
        return null;
      }
    })
    .filter((match): match is RegExpMatchArray => Boolean(match));

  if (rangeMatches.length > 0) {
    const lower = Number(rangeMatches[0][1]);
    const upper = Number(rangeMatches[0][2]);
    if (Number.isFinite(lower) && Number.isFinite(upper)) {
      return Math.max(MIN_MISSION_EST_MINUTES, Math.floor((lower + upper) / 2));
    }
  }

  const minuteMatches = lexicon.timeHints.minsPatterns
    .map((pattern) => {
      try {
        return normalizedInput.match(new RegExp(pattern, "i"));
      } catch {
        return null;
      }
    })
    .filter((match): match is RegExpMatchArray => Boolean(match));

  if (minuteMatches.length > 0) {
    const value = Number(minuteMatches[0][1]);
    if (Number.isFinite(value)) {
      return Math.max(MIN_MISSION_EST_MINUTES, Math.floor(value));
    }
  }

  return null;
}

function buildRouteProfile(normalizedInput: string, conceptScores: Map<string, number>, contextSignals: Set<string>): RouteProfile {
  const source = getDatasetRuntimeSource();
  const conceptDistribution = buildConceptDistribution(conceptScores);
  const domain = pickTopScoreKey(conceptDistribution.domainScores, "productivity_growth");
  const state = pickTopScoreKey(conceptDistribution.stateScores, "in_progress");
  const persona = inferPersonaFromTopConcepts(conceptDistribution.topConceptIds, domain.key);
  const type = inferTypeFromDistribution(conceptDistribution.domainScores, persona);

  const quickMode = source.lexicon.timeHints.quickTokens.some((token) => normalizedInput.includes(token.toLowerCase()))
    || source.lexicon.timeHints.nowTokens.some((token) => normalizedInput.includes(token.toLowerCase()));
  const deepMode = source.lexicon.timeHints.deepTokens.some((token) => normalizedInput.includes(token.toLowerCase()));
  const preferredMinutes = extractPreferredMinutes(normalizedInput, source.lexicon);
  const timeContext = inferTimeContextFromSignals(contextSignals, quickMode, deepMode, preferredMinutes);

  const signalCount = (conceptScores.size > 0 ? 1 : 0)
    + (contextSignals.size > 0 ? 1 : 0)
    + (domain.confidence > 0 ? 1 : 0)
    + (state.confidence > 0 ? 1 : 0)
    + (quickMode ? 1 : 0)
    + (deepMode ? 1 : 0)
    + (preferredMinutes !== null ? 1 : 0);

  return {
    persona,
    type,
    domain: domain.key,
    state: state.key,
    timeContext,
    preferredMinutes,
    quickMode,
    deepMode,
    signalCount
  };
}

function mapClusterDomainToRouteDomain(cluster: DatasetCluster): RouteDomain {
  return DOMAIN_TO_ROUTE[cluster.domain] ?? "productivity_growth";
}

function mapClusterToPersona(cluster: DatasetCluster): PresetPersona {
  return DOMAIN_TO_PERSONA[cluster.domain] ?? "worker";
}

function mapTemplateType(cluster: DatasetCluster): PresetType {
  if (cluster.domain === "SOCIAL") {
    return "non_routine";
  }

  return "routine";
}

function mapTemplateState(template: DatasetTemplate): RouteState {
  const stateMode = template.meta?.stateMode ?? "";

  if (stateMode === "LOW_MOTIVATION") {
    return "start_delay";
  }
  if (stateMode === "LOW_ENERGY") {
    return "fatigued";
  }
  if (stateMode === "OVERWHELM") {
    return "blocked";
  }
  if (stateMode === "DISTRACTED") {
    return "reset_needed";
  }

  return "in_progress";
}

function mapTemplateTimeContext(template: DatasetTemplate): RouteTimeContext {
  const context = template.meta?.contextVariant ?? template.contexts[0] ?? "";
  const mapped = CONTEXT_TO_TIME[context];

  return mapped ?? "work_pm";
}

function mapTemplateIntent(template: DatasetTemplate): string {
  return template.clusterKey.toLowerCase();
}

function resolveTemplateDifficulty(template: DatasetTemplate): number {
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

function resolveTemplatePriority(template: DatasetTemplate): number {
  const defaultMinutes = Number.isFinite(template.time.default) ? Math.max(1, Math.floor(template.time.default)) : 15;
  if (defaultMinutes <= 10) {
    return 3;
  }
  if (defaultMinutes <= 15) {
    return 2;
  }
  return 1;
}

function buildTemplateSearchText(template: DatasetTemplate): string {
  const source = getDatasetRuntimeSource();

  const conceptText = template.concepts
    .map((conceptId) => {
      const concept = source.conceptById.get(conceptId);
      if (!concept) {
        return "";
      }

      return [concept.label, concept.description ?? "", ...concept.tags].join(" ");
    })
    .join(" ");

  const missionText = template.missions.map((mission) => mission.action).join(" ");

  return [
    template.title,
    template.clusterKey,
    ...template.contexts,
    ...template.states,
    template.meta?.goalFocus ?? "",
    template.meta?.stateMode ?? "",
    missionText,
    conceptText
  ]
    .map((segment) => normalizeScoreText(segment))
    .filter(Boolean)
    .join(" ");
}

let cachedTemplateSearchIndex: readonly TemplateSearchIndex[] | null = null;

function getTemplateSearchIndex(): readonly TemplateSearchIndex[] {
  if (cachedTemplateSearchIndex) {
    return cachedTemplateSearchIndex;
  }

  const source = getDatasetRuntimeSource();
  cachedTemplateSearchIndex = source.templates.map((template) => {
    const cluster = source.clusterByKey.get(template.clusterKey);
    const routeDomain = cluster ? mapClusterDomainToRouteDomain(cluster) : "productivity_growth";
    const persona = cluster ? mapClusterToPersona(cluster) : "worker";
    const type = cluster ? mapTemplateType(cluster) : "routine";
    const state = mapTemplateState(template);
    const timeContext = mapTemplateTimeContext(template);
    const searchText = buildTemplateSearchText(template);
    const missionText = template.missions.map((mission) => mission.action).join(" ");

    return {
      template,
      vector: buildSparseVector(searchText),
      titleVector: buildSparseVector(template.title),
      missionVector: buildSparseVector(missionText),
      tokens: new Set(tokenizeScoreText(searchText)),
      routeDomain,
      persona,
      type,
      state,
      timeContext,
      intent: mapTemplateIntent(template),
      priority: resolveTemplatePriority(template),
      difficulty: resolveTemplateDifficulty(template),
      estimatedTimeMin: Number.isFinite(template.time.default)
        ? Math.min(MAX_MISSION_EST_MINUTES, Math.max(MIN_MISSION_EST_MINUTES, Math.floor(template.time.default)))
        : MAX_MISSION_EST_MINUTES
    };
  });

  return cachedTemplateSearchIndex;
}

function isPersonaCompatible(routePersona: PresetPersona, templatePersona: PresetPersona, type: PresetType): boolean {
  if (routePersona === templatePersona) {
    return true;
  }

  if (type === "non_routine") {
    return ["travel", "entertainment", "exercise"].includes(routePersona)
      && ["travel", "entertainment", "exercise"].includes(templatePersona);
  }

  if (ROUTINE_PERSONA_FAMILY.has(routePersona) && ROUTINE_PERSONA_FAMILY.has(templatePersona)) {
    return true;
  }

  if ((routePersona === "student" && templatePersona === "writer") || (routePersona === "writer" && templatePersona === "student")) {
    return true;
  }

  if ((routePersona === "homemaker" && templatePersona === "worker") || (routePersona === "worker" && templatePersona === "homemaker")) {
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

function detectContextSignals(normalizedInput: string): Set<string> {
  const source = getDatasetRuntimeSource();
  const matchedContexts = new Set<string>();

  Object.entries(source.lexicon.contextHints).forEach(([contextKey, hints]) => {
    if (hints.some((hint) => normalizedInput.includes(hint.toLowerCase()))) {
      matchedContexts.add(contextKey.toUpperCase());
    }
  });

  return matchedContexts;
}

function computePreferredMinutesFit(routeProfile: RouteProfile, estimatedTimeMin: number): number {
  if (routeProfile.preferredMinutes === null) {
    return 0;
  }

  const gap = Math.abs(routeProfile.preferredMinutes - estimatedTimeMin);
  if (gap <= 2) {
    return 2.8;
  }
  if (gap <= 5) {
    return 1.6;
  }
  if (gap <= 8) {
    return 0.8;
  }

  return -0.8;
}

function scoreProfileCompatibility(entry: TemplateSearchIndex, routeProfile: RouteProfile): number {
  let score = 0;

  if (entry.routeDomain === routeProfile.domain) {
    score += 0.42;
  }

  if (entry.persona === routeProfile.persona) {
    score += 0.24;
  } else if (isPersonaCompatible(routeProfile.persona, entry.persona, routeProfile.type)) {
    score += 0.12;
  }

  if (entry.type === routeProfile.type) {
    score += 0.14;
  }

  return clamp01(score);
}

function scoreContextStateTimeFit(
  entry: TemplateSearchIndex,
  routeProfile: RouteProfile,
  contextSignals: Set<string>
): number {
  let score = 0;

  const hasContextSignalMatch = entry.template.contexts.some((context) => contextSignals.has(context.toUpperCase()));
  if (hasContextSignalMatch) {
    score += 0.32;
  }

  if (entry.state === routeProfile.state) {
    score += routeProfile.state === "in_progress" ? 0.14 : 0.28;
  } else if (routeProfile.state === "avoidance_refusal" && entry.difficulty <= 1 && entry.estimatedTimeMin <= 10) {
    score += 0.18;
  } else if (routeProfile.state === "fatigued" && entry.difficulty <= 2) {
    score += 0.12;
  }

  if (entry.timeContext === routeProfile.timeContext) {
    score += 0.24;
  } else if (isNeighborTimeContext(routeProfile.timeContext, entry.timeContext)) {
    score += 0.12;
  }

  if (routeProfile.quickMode && entry.estimatedTimeMin <= 10) {
    score += 0.16;
  }

  if (routeProfile.deepMode && entry.estimatedTimeMin >= 20) {
    score += 0.14;
  }

  score += computePreferredMinutesFit(routeProfile, entry.estimatedTimeMin) / 4.5;

  return clamp01(score);
}

interface LexicalSignals {
  lexicalSimilarity: number;
  semanticSimilarity: number;
}

function computeLexicalSignals(
  queryVector: SparseVector,
  queryTokens: Set<string>,
  entry: TemplateSearchIndex
): LexicalSignals {
  const semanticSimilarity = computeCosineSimilarity(queryVector, entry.vector);
  const titleSimilarity = computeCosineSimilarity(queryVector, entry.titleVector);
  const missionSimilarity = computeCosineSimilarity(queryVector, entry.missionVector);
  const tokenOverlap = computeTokenOverlapRatio(queryTokens, entry.tokens);

  const lexicalSimilarity = clamp01(
    semanticSimilarity * 0.52
    + titleSimilarity * 0.3
    + missionSimilarity * 0.16
    + tokenOverlap * 0.24
  );

  return {
    lexicalSimilarity,
    semanticSimilarity
  };
}

function computeConceptCoverage(
  template: DatasetTemplate,
  conceptScores: Map<string, number>,
  conceptScoreTotal: number
): number {
  if (conceptScoreTotal <= 0 || conceptScores.size === 0) {
    return 0;
  }

  let matchedConceptScore = 0;
  let matchedConceptCount = 0;
  template.concepts.forEach((conceptId) => {
    const conceptScore = conceptScores.get(conceptId);
    if (!conceptScore) {
      return;
    }

    matchedConceptScore += conceptScore;
    matchedConceptCount += 1;
  });

  if (matchedConceptScore <= 0) {
    return 0;
  }

  const scoreCoverage = matchedConceptScore / conceptScoreTotal;
  const countCoverage = matchedConceptCount / Math.max(1, Math.min(4, conceptScores.size));
  return clamp01(scoreCoverage * 1.2 + countCoverage * 0.2);
}

function buildCandidateTemplatePool(
  topClusterKeys: readonly string[],
  conceptScores: Map<string, number>,
  exactTitleTemplateIds: Set<string>
): Set<string> {
  const source = getDatasetRuntimeSource();
  const candidateTemplateIds = new Set<string>();

  topClusterKeys.forEach((clusterKey) => {
    source.templatesByCluster.get(clusterKey)?.forEach((template) => {
      candidateTemplateIds.add(template.id);
    });
  });

  const scoredConcepts = new Set(conceptScores.keys());
  if (scoredConcepts.size > 0) {
    getTemplateSearchIndex().forEach((entry) => {
      if (entry.template.concepts.some((conceptId) => scoredConcepts.has(conceptId))) {
        candidateTemplateIds.add(entry.template.id);
      }
    });
  }

  exactTitleTemplateIds.forEach((templateId) => candidateTemplateIds.add(templateId));
  return candidateTemplateIds;
}

function sortCandidatesByScore(candidates: DatasetRankCandidate[]): DatasetRankCandidate[] {
  return candidates.sort((left, right) => {
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }

    if (right.rerankConfidence !== left.rerankConfidence) {
      return right.rerankConfidence - left.rerankConfidence;
    }

    if (right.routeConfidence !== left.routeConfidence) {
      return right.routeConfidence - left.routeConfidence;
    }

    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    if (left.difficulty !== right.difficulty) {
      return left.difficulty - right.difficulty;
    }

    if (left.estimatedTimeMin !== right.estimatedTimeMin) {
      return left.estimatedTimeMin - right.estimatedTimeMin;
    }

    return left.id.localeCompare(right.id, "en");
  });
}

function computeNovelConceptRatio(template: DatasetTemplate, coveredConceptIds: Set<string>): number {
  if (template.concepts.length === 0) {
    return 0;
  }

  let novelConceptCount = 0;
  template.concepts.forEach((conceptId) => {
    if (!coveredConceptIds.has(conceptId)) {
      novelConceptCount += 1;
    }
  });

  return clamp01(novelConceptCount / template.concepts.length);
}

function rerankWithDiversity(candidates: DatasetRankCandidate[], limit: number): DatasetRankCandidate[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 5;
  if (candidates.length === 0) {
    return [];
  }

  const remaining = [...candidates];
  const selected: DatasetRankCandidate[] = [];
  const clusterCounts = new Map<string, number>();
  const coveredConceptIds = new Set<string>();

  const takeCandidateByIndex = (index: number): void => {
    const [picked] = remaining.splice(index, 1);
    if (!picked) {
      return;
    }

    selected.push(picked);
    picked.template.concepts.forEach((conceptId) => coveredConceptIds.add(conceptId));
    const clusterKey = picked.template.clusterKey;
    clusterCounts.set(clusterKey, (clusterCounts.get(clusterKey) ?? 0) + 1);
  };

  const exactMatchIndex = remaining.findIndex((candidate) => candidate.isExactTitleMatch);
  if (exactMatchIndex >= 0) {
    takeCandidateByIndex(exactMatchIndex);
  }

  const distinctClusterBudget = Math.min(
    3,
    safeLimit,
    new Set([...selected, ...remaining].map((candidate) => candidate.template.clusterKey)).size
  );

  const selectBestIndex = (requireNewCluster: boolean): number => {
    const representedClusters = new Set(selected.map((candidate) => candidate.template.clusterKey));
    const topTotalScore = remaining[0]?.totalScore ?? 1;

    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const clusterKey = candidate.template.clusterKey;
      const existingInCluster = clusterCounts.get(clusterKey) ?? 0;
      const isNewCluster = !representedClusters.has(clusterKey);

      if (existingInCluster >= 2) {
        continue;
      }
      if (requireNewCluster && !isNewCluster) {
        continue;
      }

      const relevance = clamp01(candidate.totalScore / Math.max(1, topTotalScore));
      const novelConceptRatio = computeNovelConceptRatio(candidate.template, coveredConceptIds);
      const mmrScore = relevance * 0.68
        + novelConceptRatio * 0.22
        + (isNewCluster ? (requireNewCluster ? 0.18 : 0.08) : 0)
        + candidate.routeConfidence * 0.04
        + candidate.rerankConfidence * 0.04;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIndex = index;
        continue;
      }

      if (bestIndex >= 0 && mmrScore === bestScore) {
        const previousBest = remaining[bestIndex];
        if (candidate.totalScore > previousBest.totalScore) {
          bestIndex = index;
          continue;
        }
        if (candidate.totalScore === previousBest.totalScore && candidate.id.localeCompare(previousBest.id, "en") < 0) {
          bestIndex = index;
        }
      }
    }

    return bestIndex;
  };

  while (selected.length < safeLimit && remaining.length > 0) {
    const representedClusterCount = new Set(selected.map((candidate) => candidate.template.clusterKey)).size;
    const needsMoreClusterCoverage = representedClusterCount < distinctClusterBudget;

    let nextIndex = selectBestIndex(needsMoreClusterCoverage);
    if (nextIndex < 0 && needsMoreClusterCoverage) {
      nextIndex = selectBestIndex(false);
    }
    if (nextIndex < 0) {
      break;
    }

    takeCandidateByIndex(nextIndex);
  }

  return selected;
}

function rankCore(input: string): DatasetRankCandidate[] {
  const source = getDatasetRuntimeSource();
  const normalizedInput = normalizeInput(input, source.lexicon);

  if (!normalizedInput) {
    return [];
  }

  const exactTitleTemplateIds = new Set<string>([
    ...findExactTitleTemplateIds(input),
    ...findExactTitleTemplateIds(normalizedInput)
  ]);
  const legacyExactMatches = findLegacyExactMatches(input, normalizedInput);
  legacyExactMatches.forEach((_, canonicalTemplateId) => {
    exactTitleTemplateIds.add(canonicalTemplateId);
  });

  const conceptScores = scoreConcepts(normalizedInput);
  const contextSignals = detectContextSignals(normalizedInput);
  const routeProfile = buildRouteProfile(normalizedInput, conceptScores, contextSignals);

  if (conceptScores.size === 0 && exactTitleTemplateIds.size === 0) {
    return [];
  }

  const clusterScores = scoreClusters(conceptScores);
  const topClusterKeys = selectTopClusterKeys(clusterScores, DEFAULT_TOP_K_CLUSTERS);
  const candidateTemplatePool = buildCandidateTemplatePool(topClusterKeys, conceptScores, exactTitleTemplateIds);

  if (candidateTemplatePool.size === 0 && exactTitleTemplateIds.size === 0) {
    return [];
  }

  const queryVector = buildSparseVector(normalizedInput);
  const queryTokens = new Set(tokenizeScoreText(normalizedInput));
  const maxClusterScore = Math.max(...Array.from(clusterScores.values()), 1);
  const conceptScoreTotal = Array.from(conceptScores.values()).reduce((sum, score) => sum + score, 0);

  const ranked = getTemplateSearchIndex().reduce<DatasetRankCandidate[]>((accumulator, entry) => {
    if (!candidateTemplatePool.has(entry.template.id)) {
      return accumulator;
    }

    const isExactTitleMatch = exactTitleTemplateIds.has(entry.template.id);
    const clusterScore = clusterScores.get(entry.template.clusterKey) ?? 0;
    const clusterNormalized = clamp01(clusterScore / maxClusterScore);

    const cappedClusterPrior = Math.min(MAX_CLUSTER_PRIOR, clusterNormalized);
    const conceptCoverage = computeConceptCoverage(entry.template, conceptScores, conceptScoreTotal);
    const { lexicalSimilarity, semanticSimilarity } = computeLexicalSignals(queryVector, queryTokens, entry);
    const contextStateTimeFit = scoreContextStateTimeFit(entry, routeProfile, contextSignals);
    const profileCompatibility = scoreProfileCompatibility(entry, routeProfile);

    const templateScore = conceptCoverage + lexicalSimilarity + contextStateTimeFit + cappedClusterPrior;
    const rerankConfidence = isExactTitleMatch ? 1 : clamp01(templateScore / 3.2);
    const rawRouteConfidence = isExactTitleMatch
      ? 1
      : clamp01(
        contextStateTimeFit * 0.28
        + conceptCoverage * 0.2
        + lexicalSimilarity * 0.28
        + semanticSimilarity * 0.08
        + cappedClusterPrior * 0.09
        + profileCompatibility * 0.07
      );
    const routeConfidence = renormalizeRouteConfidence(rawRouteConfidence);

    const signalScore = Math.max(conceptCoverage, lexicalSimilarity, contextStateTimeFit, cappedClusterPrior);

    if (!isExactTitleMatch && signalScore < 0.1) {
      return accumulator;
    }
    if (!isExactTitleMatch && conceptCoverage === 0 && lexicalSimilarity < 0.14 && routeProfile.signalCount <= 1) {
      return accumulator;
    }
    if (!isExactTitleMatch && rerankConfidence < 0.22 && rawRouteConfidence < 0.2) {
      return accumulator;
    }

    const totalScore = Number(
      (
        conceptCoverage * 36
        + lexicalSimilarity * 31
        + contextStateTimeFit * 23
        + cappedClusterPrior * 10
        + (isExactTitleMatch ? 10_000 : 0)
      ).toFixed(4)
    );

    accumulator.push({
      id: legacyExactMatches.get(entry.template.id) ?? entry.template.id,
      intent: entry.intent,
      title: entry.template.title,
      persona: entry.persona,
      type: entry.type,
      domain: entry.routeDomain,
      state: entry.state,
      timeContext: entry.timeContext,
      totalScore,
      similarity: semanticSimilarity,
      rerankConfidence,
      routeConfidence,
      priority: entry.priority,
      difficulty: entry.difficulty,
      estimatedTimeMin: entry.estimatedTimeMin,
      isExactTitleMatch,
      template: entry.template
    });

    return accumulator;
  }, []);

  return sortCandidatesByScore(ranked);
}

export function rankDatasetTemplates(input: string, limit = 5): DatasetRankCandidate[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 5;
  return rerankWithDiversity(rankCore(input), safeLimit);
}

export function selectDatasetTemplateCandidate(input: string): DatasetRankCandidate | null {
  const rankedCandidates = rerankWithDiversity(rankCore(input), 12);
  const topCandidate = rankedCandidates[0];

  if (!topCandidate) {
    return null;
  }

  if (topCandidate.isExactTitleMatch) {
    return topCandidate;
  }

  const secondCandidate = rankedCandidates[1];
  const rerankGap = topCandidate.rerankConfidence - (secondCandidate?.rerankConfidence ?? 0);

  if (topCandidate.rerankConfidence >= 0.76 && rerankGap >= 0.06) {
    return topCandidate;
  }

  if (topCandidate.routeConfidence >= 0.58 && topCandidate.rerankConfidence >= 0.34) {
    return topCandidate;
  }

  const safeDefault = rankedCandidates.find((candidate) => {
    return candidate.difficulty <= 1
      && candidate.estimatedTimeMin <= 10
      && candidate.routeConfidence >= 0.34;
  });

  if (safeDefault) {
    return safeDefault;
  }

  if (topCandidate.rerankConfidence >= 0.44 || topCandidate.routeConfidence >= 0.62) {
    return topCandidate;
  }

  return null;
}

export function findRankedTemplateById(templateId: string): DatasetTemplate | null {
  return findDatasetTemplateById(resolveCanonicalTemplateId(templateId));
}
