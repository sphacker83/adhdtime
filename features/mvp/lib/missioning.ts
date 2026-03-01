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
