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

export interface ChunkingValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface AiChunkingAdapter {
  generate: (params: { taskId: string; title: string }) => Promise<ChunkingResult>;
}

interface LocalPatternRule {
  keywords: string[];
  templates: ChunkTemplate[];
}

const LOCAL_RULES: LocalPatternRule[] = [
  {
    keywords: ["청소", "정리", "방 정리", "집안일"],
    templates: [
      { action: "정리할 구역 하나 정하기", estMinutes: 3, difficulty: 1, notes: "가장 쉬운 구역부터" },
      { action: "바닥 물건을 분류 바구니에 담기", estMinutes: 6, difficulty: 1, notes: "버릴 것과 보관할 것 분리" },
      { action: "책상 위 물건을 제자리로 옮기기", estMinutes: 7, difficulty: 2, notes: "한 번에 5개만" },
      { action: "먼지 닦기 도구 준비 후 닦기", estMinutes: 8, difficulty: 2, notes: "눈에 보이는 곳만" },
      { action: "쓰레기 봉투 정리하고 버리기", estMinutes: 5, difficulty: 1, notes: "문 앞까지 이동" },
      { action: "완료 구역 사진 찍고 마무리", estMinutes: 3, difficulty: 1, notes: "작은 성취 기록" }
    ]
  },
  {
    keywords: ["보고서", "제안서", "문서", "리포트"],
    templates: [
      { action: "문서 목표와 제출 형식 확인하기", estMinutes: 4, difficulty: 1, notes: "완료 기준 먼저 정의" },
      { action: "핵심 목차를 5줄로 적기", estMinutes: 6, difficulty: 1, notes: "완벽보다 빠른 초안" },
      { action: "첫 번째 섹션 초안 작성하기", estMinutes: 10, difficulty: 2, notes: "문장 품질보다 분량 우선" },
      { action: "두 번째 섹션 초안 작성하기", estMinutes: 10, difficulty: 2, notes: "근거 2개만 추가" },
      { action: "결론과 다음 액션 정리하기", estMinutes: 6, difficulty: 1, notes: "실행 항목 명확히" },
      { action: "오탈자 점검 후 제출 파일 저장", estMinutes: 5, difficulty: 1, notes: "버전명 포함" }
    ]
  },
  {
    keywords: ["공부", "학습", "복습", "시험"],
    templates: [
      { action: "오늘 학습 범위를 한 문장으로 정하기", estMinutes: 3, difficulty: 1, notes: "범위 축소가 핵심" },
      { action: "핵심 개념 3개만 빠르게 읽기", estMinutes: 8, difficulty: 2, notes: "전체를 다 보려 하지 않기" },
      { action: "개념 1개를 메모로 요약하기", estMinutes: 7, difficulty: 2, notes: "문장 2개면 충분" },
      { action: "예제 문제 2개만 풀어보기", estMinutes: 10, difficulty: 2, notes: "정답 확인 포함" },
      { action: "틀린 포인트 다시 확인하기", estMinutes: 6, difficulty: 1, notes: "원인 한 줄 기록" },
      { action: "다음 시작 지점 체크하고 종료", estMinutes: 4, difficulty: 1, notes: "내일 바로 이어서" }
    ]
  },
  {
    keywords: ["메일", "이메일", "답장", "연락"],
    templates: [
      { action: "답장 필요한 메일 3개만 고르기", estMinutes: 4, difficulty: 1, notes: "긴급도 기준" },
      { action: "첫 번째 메일 핵심 답장 작성", estMinutes: 7, difficulty: 1, notes: "요점 2줄" },
      { action: "두 번째 메일 답장 작성", estMinutes: 7, difficulty: 1, notes: "요청 사항 분리" },
      { action: "세 번째 메일 답장 작성", estMinutes: 7, difficulty: 1, notes: "마감 기재" },
      { action: "보낸 메일 라벨/폴더 정리", estMinutes: 5, difficulty: 1, notes: "후속 액션 표시" }
    ]
  }
];

const ACTION_START_VERB_PATTERN =
  /^(시작|준비|정리|분류|작성|확인|검토|실행|제출|저장|기록|예약|마무리|요약|복습|정돈|선택|고르|읽|적|풀|버리|담|옮기|닦|체크|보내|완료|쪼개|정하|계획)/;
const ACTION_END_VERB_PATTERN =
  /(하기|해보기|작성|정리|확인|검토|실행|준비|제출|저장|기록|예약|마무리|요약|복습|정돈|정하기|적기|읽기|풀기|버리기|담기|옮기기|닦기|고르기|체크하기|보내기|완료|종료)$/;
const ACTION_CONTAINS_VERB_PATTERN =
  /(하기|해보기|작성|정리|확인|검토|실행|준비|제출|저장|기록|예약|마무리|요약|복습|정돈|정하|적기|읽기|풀기|버리기|담기|옮기기|닦기|고르기|체크|보내|시작|종료)/;

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
  const hasSentenceShape = tokens.length >= 2 && /[가-힣]/.test(normalizedAction);

  return {
    isActionable: hasSentenceShape && (endsWithVerb || containsVerb),
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
      difficulty: Math.max(1, Math.min(3, Math.floor(template.difficulty))),
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
  const safeTitle = normalizeTitle(title).toLowerCase();
  const matchedRule = LOCAL_RULES.find((rule) => rule.keywords.some((keyword) => safeTitle.includes(keyword)));

  if (!matchedRule) {
    return null;
  }

  return buildResult(taskId, title, matchedRule.templates);
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
