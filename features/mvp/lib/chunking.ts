import {
  MAX_TASK_TOTAL_MINUTES,
  MAX_CHUNK_EST_MINUTES,
  MIN_TASK_TOTAL_MINUTES,
  MIN_CHUNK_EST_MINUTES,
  RECOMMENDED_MAX_CHUNK_COUNT,
  RECOMMENDED_MIN_CHUNK_COUNT,
  TASK_SUMMARY_MAX_LENGTH,
  type ChunkTemplate,
  type ChunkingResult
} from "@/features/mvp/types/domain";
import chunkPresetsJson from "@/docs/adhd_chunk_presets_50.json";

export interface ChunkingValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface AiChunkingAdapter {
  generate: (params: { taskId: string; title: string }) => Promise<ChunkingResult>;
}

interface ChunkPresetMeta {
  keywords: string[];
  keyword_weights: Record<string, number>;
  intent: string;
  priority: number;
  negative_keywords: string[];
  examples: string[];
  updated_at: string;
}

interface ChunkPresetTaskChunk {
  step: string;
  min: number;
  done: string;
}

interface ChunkPresetTask {
  id: string;
  estimated_time_min: number;
  difficulty: number;
  chunks: ChunkPresetTaskChunk[];
}

interface ChunkPreset {
  schema_version: string;
  meta: ChunkPresetMeta;
  task: ChunkPresetTask;
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
  preset: ChunkPreset;
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
const DEFAULT_CHUNK_NOTE = "완료 조건 체크";

const JSON_PRESETS: readonly ChunkPreset[] = Array.isArray(chunkPresetsJson)
  ? (chunkPresetsJson as unknown as readonly ChunkPreset[])
  : [];


const ACTION_START_VERB_PATTERN =
  /^(시작|준비|정리|분류|작성|확인|검토|실행|제출|저장|기록|예약|마무리|요약|복습|정돈|선택|고르|읽|적|풀|버리|담|옮기|닦|체크|보내|완료|쪼개|정하|계획)/;
const ACTION_END_VERB_PATTERN =
  /(하기|해보기|작성|정리|확인|검토|실행|준비|제출|저장|기록|예약|마무리|요약|복습|정돈|정하기|적기|읽기|풀기|버리기|담기|옮기기|닦기|고르기|체크하기|보내기|완료|종료)$/;
const ACTION_CONTAINS_VERB_PATTERN =
  /(하기|해보기|작성|정리|확인|검토|실행|준비|제출|저장|기록|예약|마무리|요약|복습|정돈|정하|적기|읽기|풀기|버리기|담기|옮기기|닦기|고르기|체크|보내|시작|종료)/;
const ACTION_KOREAN_DECLARATIVE_END_PATTERN = /[가-힣]+(다|요)(\([^)]*\))?$/;

const EST_MINUTES_RANGE_LABEL = `${MIN_CHUNK_EST_MINUTES}~${MAX_CHUNK_EST_MINUTES}분`;
const CHUNK_COUNT_RECOMMENDED_LABEL = `${RECOMMENDED_MIN_CHUNK_COUNT}~${RECOMMENDED_MAX_CHUNK_COUNT}개`;

export function clampTaskTotalMinutes(totalMinutes: number, fallback = MIN_TASK_TOTAL_MINUTES): number {
  const baseValue = Number.isFinite(totalMinutes) ? totalMinutes : fallback;
  return Math.min(MAX_TASK_TOTAL_MINUTES, Math.max(MIN_TASK_TOTAL_MINUTES, Math.floor(baseValue)));
}

function clampMinutes(minutes: number): number {
  const safeMinutes = Number.isFinite(minutes) ? Math.floor(minutes) : MIN_CHUNK_EST_MINUTES;
  return Math.min(MAX_CHUNK_EST_MINUTES, Math.max(MIN_CHUNK_EST_MINUTES, safeMinutes));
}

function clampDifficulty(difficulty: number, fallback = 2): number {
  const safeDifficulty = Number.isFinite(difficulty) ? Math.floor(difficulty) : fallback;
  return Math.min(3, Math.max(1, safeDifficulty));
}

export function sumChunkEstMinutes<T extends { estMinutes: number }>(chunks: T[]): number {
  return chunks.reduce((sum, chunk) => sum + clampMinutes(chunk.estMinutes), 0);
}

export function isWithinTaskChunkBudget<T extends { estMinutes: number }>(chunks: T[], totalMinutes: number): boolean {
  return sumChunkEstMinutes(chunks) <= clampTaskTotalMinutes(totalMinutes);
}

export function enforceChunkBudget<T extends { estMinutes: number }>(chunks: T[], totalMinutes: number): T[] {
  const budget = clampTaskTotalMinutes(totalMinutes);
  const maxChunkCount = Math.max(1, Math.floor(budget / MIN_CHUNK_EST_MINUTES));
  const normalized = chunks.slice(0, maxChunkCount).map(
    (chunk) =>
      ({
        ...chunk,
        estMinutes: clampMinutes(chunk.estMinutes)
      }) as T
  );

  let total = sumChunkEstMinutes(normalized);
  if (total <= budget) {
    return normalized;
  }

  for (let index = normalized.length - 1; index >= 0 && total > budget; index -= 1) {
    const chunk = normalized[index];
    const reducible = chunk.estMinutes - MIN_CHUNK_EST_MINUTES;
    if (reducible <= 0) {
      continue;
    }

    const reduceBy = Math.min(reducible, total - budget);
    normalized[index] = {
      ...chunk,
      estMinutes: chunk.estMinutes - reduceBy
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

function buildIntentProfiles(presets: readonly ChunkPreset[]): Record<string, IntentProfile> {
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
  meta: ChunkPresetMeta,
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

function scoreNegativeKeywords(meta: ChunkPresetMeta, normalizedTitle: string, compactTitle: string): number {
  return meta.negative_keywords.reduce((penalty, keyword) => {
    if (!hasScoreTerm(normalizedTitle, compactTitle, keyword)) {
      return penalty;
    }

    return penalty + PRESET_NEGATIVE_KEYWORD_PENALTY;
  }, 0);
}

function scoreAdhdExecution(task: ChunkPresetTask): number {
  const difficulty = clampDifficulty(task.difficulty);
  const estimatedTime = Number.isFinite(task.estimated_time_min)
    ? Math.max(1, Math.floor(task.estimated_time_min))
    : MAX_CHUNK_EST_MINUTES;
  const firstChunkMin = Number.isFinite(task.chunks[0]?.min)
    ? Math.max(1, Math.floor(task.chunks[0].min))
    : MAX_CHUNK_EST_MINUTES;

  const difficultyBonus = (4 - difficulty) * 2.5;
  const shortTimeBonus = Math.max(0, 15 - estimatedTime) * 0.4;
  const firstChunkBonus = firstChunkMin >= 1 && firstChunkMin <= 2 ? 2.5 : 0;

  return difficultyBonus + shortTimeBonus + firstChunkBonus;
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

function mapPresetChunksToTemplates(preset: ChunkPreset): ChunkTemplate[] | null {
  if (!Array.isArray(preset.task.chunks) || preset.task.chunks.length === 0) {
    return null;
  }

  const difficulty = clampDifficulty(preset.task.difficulty);
  const templates = preset.task.chunks
    .map((chunk): ChunkTemplate | null => {
      const action = normalizeActionText(chunk.step ?? "");
      if (!action) {
        return null;
      }

      const notes = normalizeActionText(chunk.done ?? "") || DEFAULT_CHUNK_NOTE;
      return {
        action,
        estMinutes: clampMinutes(chunk.min),
        difficulty,
        notes
      };
    })
    .filter((template): template is ChunkTemplate => template !== null);

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
      : MAX_CHUNK_EST_MINUTES;
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

function selectJsonPresetTemplates(title: string): ChunkTemplate[] | null {
  const rankedCandidates = scorePresetCandidates(title).sort(compareScoredPresetCandidates);
  for (const candidate of rankedCandidates) {
    const mappedTemplates = mapPresetChunksToTemplates(candidate.preset);
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
  return `chunks[${index}].estMinutes는 ${EST_MINUTES_RANGE_LABEL} 범위여야 합니다.`;
}

function buildResult(taskId: string, title: string, templates: ChunkTemplate[]): ChunkingResult {
  const safeTitle = normalizeTitle(title);

  return {
    taskId,
    title: safeTitle,
    context: safeTitle,
    chunks: templates.map((template, index) => ({
      chunkId: crypto.randomUUID(),
      order: index + 1,
      action: template.action,
      estMinutes: clampMinutes(template.estMinutes),
      difficulty: clampDifficulty(template.difficulty),
      notes: template.notes
    })),
    safety: {
      requiresCaution: false,
      notes: ""
    }
  };
}

function buildDefaultTemplates(title: string): ChunkTemplate[] {
  const safeTitle = normalizeTitle(title);

  return [
    { action: `시작 준비물 3개만 꺼내기`, estMinutes: 3, difficulty: 1, notes: "몸을 먼저 움직이기" },
    { action: `${safeTitle}의 목표를 한 줄로 적기`, estMinutes: 4, difficulty: 1, notes: "완벽하지 않아도 괜찮음" },
    { action: `첫 행동을 10분 안에 끝낼 만큼 작게 쪼개기`, estMinutes: 6, difficulty: 2, notes: "작은 단위 유지" },
    { action: `핵심 행동 1개 바로 실행하기`, estMinutes: 10, difficulty: 2, notes: "타이머와 함께 시작" },
    { action: `진행 상태를 2문장으로 기록하기`, estMinutes: 4, difficulty: 1, notes: "다음 행동 연결" },
    { action: `다음 청크를 예약하고 마무리하기`, estMinutes: 3, difficulty: 1, notes: "복귀 마찰 줄이기" }
  ];
}

export function generateLocalChunking(taskId: string, title: string): ChunkingResult | null {
  const jsonTemplates = selectJsonPresetTemplates(title);
  if (jsonTemplates) {
    return buildResult(taskId, title, jsonTemplates);
  }
  return null;
}

export function generateTemplateChunking(taskId: string, title: string): ChunkingResult {
  return buildResult(taskId, title, buildDefaultTemplates(title));
}

export function createAiFallbackAdapter(delayMs = 600): AiChunkingAdapter {
  return {
    async generate({ taskId, title }) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      return generateTemplateChunking(taskId, title);
    }
  };
}

export function validateChunkingResult(payload: ChunkingResult): ChunkingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payload.taskId.trim()) {
    errors.push("taskId가 비어 있습니다.");
  }

  if (!payload.title.trim()) {
    errors.push("title이 비어 있습니다.");
  }

  if (!Array.isArray(payload.chunks) || payload.chunks.length === 0) {
    errors.push("chunks가 비어 있습니다.");
    return {
      ok: false,
      errors,
      warnings
    };
  }

  if (payload.chunks.length < RECOMMENDED_MIN_CHUNK_COUNT || payload.chunks.length > RECOMMENDED_MAX_CHUNK_COUNT) {
    warnings.push(
      `chunks 개수는 ${CHUNK_COUNT_RECOMMENDED_LABEL}를 권장합니다. 현재 ${payload.chunks.length}개이며, 생성은 경고만 남기고 계속 진행됩니다.`
    );
  }

  let nonVerbStartCount = 0;

  payload.chunks.forEach((chunk, index) => {
    if (!chunk.chunkId.trim()) {
      errors.push(`chunks[${index}].chunkId가 비어 있습니다.`);
    }

    const normalizedAction = normalizeActionText(chunk.action);
    if (!normalizedAction) {
      errors.push(`chunks[${index}].action이 비어 있습니다.`);
    }

    if (chunk.order !== index + 1) {
      errors.push(`chunks[${index}]의 순서가 올바르지 않습니다.`);
    }

    if (
      !Number.isFinite(chunk.estMinutes)
      || chunk.estMinutes < MIN_CHUNK_EST_MINUTES
      || chunk.estMinutes > MAX_CHUNK_EST_MINUTES
    ) {
      errors.push(buildEstMinutesRangeError(index));
    }

    const actionQuality = analyzeActionQuality(normalizedAction);
    if (!actionQuality.isActionable) {
      errors.push(`chunks[${index}]는 실행 가능한 행동 문장이어야 합니다.`);
    }

    if (actionQuality.isActionable && !actionQuality.startsWithVerb) {
      nonVerbStartCount += 1;
    }
  });

  if (nonVerbStartCount > 0) {
    warnings.push(`action은 동사 시작을 권장합니다. 현재 ${nonVerbStartCount}개 청크가 동사형 시작이 아닙니다.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}
