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

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
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

function scoreClusters(conceptScores: Map<string, number>, routeProfile: RouteProfile): Map<string, number> {
  const source = getDatasetRuntimeSource();
  const scores = new Map<string, number>();

  conceptScores.forEach((conceptScore, conceptId) => {
    const mappedClusters = source.conceptToClusters.get(conceptId) ?? [];
    mappedClusters.forEach((clusterKey, index) => {
      const weight = index === 0 ? 1 : index === 1 ? 0.8 : 0.6;
      scores.set(clusterKey, Number(((scores.get(clusterKey) ?? 0) + conceptScore * weight).toFixed(4)));
    });
  });

  if (scores.size === 0 && routeProfile.signalCount > 0) {
    source.clusters.forEach((cluster) => {
      if (mapClusterDomainToRouteDomain(cluster) === routeProfile.domain) {
        const fallbackScore = routeProfile.quickMode ? 2.2 : 1.6;
        scores.set(cluster.clusterKey, fallbackScore);
      }
    });
  }

  return scores;
}

function detectState(normalizedInput: string): { state: RouteState; explicit: boolean } {
  if (/(회사\s*가기\s*싫|사무실\s*가기\s*싫|일\s*하기\s*싫|아무것도\s*하기\s*싫|하기\s*싫어)/.test(normalizedInput)) {
    return { state: "avoidance_refusal", explicit: true };
  }

  if (/(시작이\s*안|미루|손이\s*안|착수\s*지연|못\s*하겠)/.test(normalizedInput)) {
    return { state: "start_delay", explicit: true };
  }

  if (/(막혔|안\s*풀|막막|어려워|블로커)/.test(normalizedInput)) {
    return { state: "blocked", explicit: true };
  }

  if (/(피곤|지쳤|무기력|힘들|기운\s*없)/.test(normalizedInput)) {
    return { state: "fatigued", explicit: true };
  }

  if (/(마감|끝내|완료|제출|마무리|정리\s*완료)/.test(normalizedInput)) {
    return { state: "completion_push", explicit: true };
  }

  if (/(리셋|정리\s*필요|재정비|초기화)/.test(normalizedInput)) {
    return { state: "reset_needed", explicit: true };
  }

  return { state: "in_progress", explicit: false };
}

function detectTimeContext(normalizedInput: string): { timeContext: RouteTimeContext; explicit: boolean } {
  const rules: Array<{ pattern: RegExp; timeContext: RouteTimeContext }> = [
    { pattern: /(출근길|통근|등교길|이동\s*중)/, timeContext: "commute" },
    { pattern: /(아침|기상|출근\s*전|등교\s*전|오전\s*일찍)/, timeContext: "morning" },
    { pattern: /(오전|1교시|오전\s*업무)/, timeContext: "work_am" },
    { pattern: /(점심|공강|식사\s*후)/, timeContext: "lunch" },
    { pattern: /(오후|업무\s*중|회의\s*전|집필\s*블록)/, timeContext: "work_pm" },
    { pattern: /(저녁|퇴근|귀가)/, timeContext: "evening" },
    { pattern: /(밤|야간|취침|자기\s*전)/, timeContext: "night" },
    { pattern: /(주말\s*오전)/, timeContext: "weekend_am" },
    { pattern: /(주말\s*오후)/, timeContext: "weekend_pm" },
    { pattern: /(주말\s*밤)/, timeContext: "weekend_night" },
    { pattern: /(출발\s*전|예약\s*전|이벤트\s*전)/, timeContext: "pre_event" },
    { pattern: /(운동\s*후|여행\s*후|행사\s*후)/, timeContext: "post_event" }
  ];

  const matched = rules.find((rule) => rule.pattern.test(normalizedInput));
  if (matched) {
    return { timeContext: matched.timeContext, explicit: true };
  }

  return { timeContext: "work_pm", explicit: false };
}

function detectDomain(normalizedInput: string): { domain: RouteDomain; explicit: boolean } {
  if (/(수면|기상|양치|세안|샤워|운동|스트레칭|회복|피곤|휴식|호흡)/.test(normalizedInput)) {
    return { domain: "recovery_health", explicit: true };
  }

  if (/(공부|과제|시험|업무|출근|사무실|회의|집필|투고|답장|협업|마감|프로젝트)/.test(normalizedInput)) {
    return { domain: "productivity_growth", explicit: true };
  }

  if (/(청소|정리|빨래|세탁|장보기|공과금|납부|주방|식사|집안|정돈|행정)/.test(normalizedInput)) {
    return { domain: "life_ops", explicit: true };
  }

  if (/(여행|관람|공연|이벤트|콘텐츠|전시)/.test(normalizedInput)) {
    return { domain: "non_routine", explicit: true };
  }

  return { domain: "productivity_growth", explicit: false };
}

function detectPersona(normalizedInput: string, domain: RouteDomain): { persona: PresetPersona; explicit: boolean } {
  const rules: Array<{ pattern: RegExp; persona: PresetPersona }> = [
    { pattern: /(학생|학교|수업|교시|공강|과제|시험|복습|공부)/, persona: "student" },
    { pattern: /(개발|코딩|버그|pr|코드리뷰|배포|이슈|커밋)/, persona: "developer" },
    { pattern: /(작가|집필|원고|퇴고|투고|챕터|자유쓰기)/, persona: "writer" },
    { pattern: /(주부|가사|집안|하원|도시락|세탁|장보기)/, persona: "homemaker" },
    { pattern: /(사무실|결재|보고서|부서|문서|회의 안건|메일함)/, persona: "office_worker" },
    { pattern: /(콘텐츠|감상|관람|공연|전시|영화|드라마)/, persona: "entertainment" },
    { pattern: /(여행|숙소|항공|기차|여권|출발|동선|체크리스트)/, persona: "travel" },
    { pattern: /(운동|헬스|러닝|유산소|근력|워밍업|피로도)/, persona: "exercise" },
    { pattern: /(회사|직장|출근|퇴근|업무|프로젝트|팀)/, persona: "worker" }
  ];

  const matched = rules.find((rule) => rule.pattern.test(normalizedInput));
  if (matched) {
    return { persona: matched.persona, explicit: true };
  }

  const fallbackByDomain: Record<RouteDomain, PresetPersona> = {
    life_ops: "homemaker",
    productivity_growth: "worker",
    recovery_health: "exercise",
    non_routine: "entertainment"
  };

  return {
    persona: fallbackByDomain[domain],
    explicit: false
  };
}

function inferType(normalizedInput: string, persona: PresetPersona, domain: RouteDomain): { type: PresetType; explicit: boolean } {
  if (domain === "non_routine" || ["travel", "entertainment"].includes(persona)) {
    return { type: "non_routine", explicit: true };
  }

  if (/(여행|관람|공연|이벤트|챌린지|레저)/.test(normalizedInput)) {
    return { type: "non_routine", explicit: true };
  }

  return { type: "routine", explicit: false };
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

function buildRouteProfile(normalizedInput: string): RouteProfile {
  const source = getDatasetRuntimeSource();
  const state = detectState(normalizedInput);
  const time = detectTimeContext(normalizedInput);
  const domain = detectDomain(normalizedInput);
  const persona = detectPersona(normalizedInput, domain.domain);
  const type = inferType(normalizedInput, persona.persona, domain.domain);

  const quickMode = source.lexicon.timeHints.quickTokens.some((token) => normalizedInput.includes(token.toLowerCase()))
    || source.lexicon.timeHints.nowTokens.some((token) => normalizedInput.includes(token.toLowerCase()));
  const deepMode = source.lexicon.timeHints.deepTokens.some((token) => normalizedInput.includes(token.toLowerCase()));
  const preferredMinutes = extractPreferredMinutes(normalizedInput, source.lexicon);

  const signalCount = [state.explicit, time.explicit, domain.explicit, persona.explicit, type.explicit]
    .filter(Boolean)
    .length
    + (quickMode ? 1 : 0)
    + (deepMode ? 1 : 0)
    + (preferredMinutes ? 1 : 0);

  return {
    persona: persona.persona,
    type: type.type,
    domain: domain.domain,
    state: state.state,
    timeContext: time.timeContext,
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

function scoreRouteAlignment(entry: TemplateSearchIndex, routeProfile: RouteProfile): number {
  let score = 0;

  if (entry.routeDomain === routeProfile.domain) {
    score += 0.35;
  }

  if (entry.persona === routeProfile.persona) {
    score += 0.2;
  } else if (isPersonaCompatible(routeProfile.persona, entry.persona, routeProfile.type)) {
    score += 0.1;
  }

  if (entry.type === routeProfile.type) {
    score += 0.1;
  }

  if (entry.timeContext === routeProfile.timeContext) {
    score += 0.2;
  } else if (isNeighborTimeContext(routeProfile.timeContext, entry.timeContext)) {
    score += 0.1;
  }

  if (entry.state === routeProfile.state) {
    score += 0.15;
  }

  if (routeProfile.state === "avoidance_refusal" && entry.difficulty <= 1 && entry.estimatedTimeMin <= 10) {
    score += 0.2;
  }

  return clamp01(score);
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
  if (!routeProfile.preferredMinutes) {
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

function rankCore(input: string): DatasetRankCandidate[] {
  const source = getDatasetRuntimeSource();
  const normalizedInput = normalizeInput(input, source.lexicon);

  if (!normalizedInput) {
    return [];
  }

  const routeProfile = buildRouteProfile(normalizedInput);
  const exactTitleTemplateIds = new Set<string>([
    ...findExactTitleTemplateIds(input),
    ...findExactTitleTemplateIds(normalizedInput)
  ]);

  const conceptScores = scoreConcepts(normalizedInput);
  if (conceptScores.size === 0 && routeProfile.signalCount === 0 && exactTitleTemplateIds.size === 0) {
    return [];
  }

  const clusterScores = scoreClusters(conceptScores, routeProfile);
  const queryVector = buildSparseVector(normalizedInput);
  const queryTokens = new Set(tokenizeScoreText(normalizedInput));
  const contextSignals = detectContextSignals(normalizedInput);
  const maxClusterScore = Math.max(...Array.from(clusterScores.values()), 1);

  const ranked = getTemplateSearchIndex().reduce<DatasetRankCandidate[]>((accumulator, entry) => {
    const isExactTitleMatch = exactTitleTemplateIds.has(entry.template.id);
    const clusterScore = clusterScores.get(entry.template.clusterKey) ?? 0;
    const clusterNormalized = clamp01(clusterScore / maxClusterScore);

    const similarity = computeCosineSimilarity(queryVector, entry.vector);
    const titleSimilarity = computeCosineSimilarity(queryVector, entry.titleVector);
    const missionSimilarity = computeCosineSimilarity(queryVector, entry.missionVector);
    const tokenOverlap = computeTokenOverlapRatio(queryTokens, entry.tokens);

    let templateScore = clusterScore;
    entry.template.concepts.forEach((conceptId) => {
      templateScore += (conceptScores.get(conceptId) ?? 0) * 0.7;
    });

    if (entry.template.contexts.some((context) => contextSignals.has(context.toUpperCase()))) {
      templateScore += 2;
    }

    if (routeProfile.quickMode && entry.estimatedTimeMin <= 10) {
      templateScore += 2.4;
    }

    if (routeProfile.deepMode && entry.estimatedTimeMin >= 20) {
      templateScore += 1.8;
    }

    templateScore += computePreferredMinutesFit(routeProfile, entry.estimatedTimeMin);

    const routeAlignment = scoreRouteAlignment(entry, routeProfile);
    const routeConfidence = isExactTitleMatch
      ? 1
      : clamp01(0.05 + routeAlignment * 0.62 + clusterNormalized * 0.33);

    const rerankConfidence = isExactTitleMatch
      ? 1
      : clamp01(
        similarity * 0.68
        + titleSimilarity * 0.58
        + missionSimilarity * 0.4
        + tokenOverlap * 0.3
        + clusterNormalized * 0.34
        + routeAlignment * 0.52
      );

    const signalScore = Math.max(similarity, titleSimilarity, missionSimilarity, tokenOverlap)
      + clusterNormalized * 0.4
      + routeAlignment * 0.4;

    if (!isExactTitleMatch && signalScore < 0.08) {
      return accumulator;
    }

    if (!isExactTitleMatch && clusterScore <= 0 && rerankConfidence < 0.28 && routeConfidence < 0.24) {
      return accumulator;
    }

    const totalScore = Number(
      (
        similarity * 125
        + titleSimilarity * 88
        + missionSimilarity * 52
        + tokenOverlap * 28
        + templateScore * 6
        + routeConfidence * 44
        + rerankConfidence * 38
        + entry.priority * 3
        + (isExactTitleMatch ? 10_000 : 0)
      ).toFixed(4)
    );

    accumulator.push({
      id: entry.template.id,
      intent: entry.intent,
      title: entry.template.title,
      persona: entry.persona,
      type: entry.type,
      domain: entry.routeDomain,
      state: entry.state,
      timeContext: entry.timeContext,
      totalScore,
      similarity,
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

  return ranked.sort((a, b) => {
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

    return a.id.localeCompare(b.id, "en");
  });
}

export function rankDatasetTemplates(input: string, limit = 5): DatasetRankCandidate[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 5;
  return rankCore(input).slice(0, safeLimit);
}

export function selectDatasetTemplateCandidate(input: string): DatasetRankCandidate | null {
  const rankedCandidates = rankCore(input).slice(0, 12);
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
  return findDatasetTemplateById(templateId);
}
