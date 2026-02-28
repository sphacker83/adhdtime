#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DESIGN_PATH = resolve(process.cwd(), "docs/QUEST_PRESET_PERSONA_WEEKLY_DESIGN.md");
const OUTPUT_PATH = resolve(process.cwd(), "docs/adhd_mission_presets.json");
const SCHEMA_VERSION = "1.0.0";
const CREATED_AT = "2026-02-28T00:00:00.000Z";
const UPDATED_AT = "2026-02-28T00:00:00.000Z";

const PERSONA_BY_PREFIX = {
  STU: { persona: "student", type: "routine" },
  WRK: { persona: "worker", type: "routine" },
  HME: { persona: "homemaker", type: "routine" },
  DEV: { persona: "developer", type: "routine" },
  OFC: { persona: "office_worker", type: "routine" },
  WRT: { persona: "writer", type: "routine" },
  ENT: { persona: "entertainment", type: "non_routine" },
  TRV: { persona: "travel", type: "non_routine" },
  EXR: { persona: "exercise", type: "non_routine" }
};

const DOMAIN_BY_INTENT = {
  home_cleaning: "life_ops",
  laundry_clothing: "life_ops",
  meal_nutrition: "life_ops",
  outing_mobility: "life_ops",
  admin_finance: "life_ops",
  digital_organizing: "life_ops",
  study_growth: "productivity_growth",
  work_start_recovery: "productivity_growth",
  relationship_communication: "productivity_growth",
  grooming_hygiene: "recovery_health",
  health_exercise: "recovery_health",
  sleep_wake_routine: "recovery_health",
  entertainment_refresh: "non_routine",
  travel_planning: "non_routine",
  exercise_challenge: "non_routine"
};

const TIME_WINDOW_BY_CONTEXT = {
  morning: { start: "06:00", end: "09:30", flexMin: 40 },
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

const ICON_BY_INTENT = {
  home_cleaning: "organize",
  laundry_clothing: "organize",
  meal_nutrition: "routine",
  outing_mobility: "schedule",
  admin_finance: "record",
  digital_organizing: "organize",
  study_growth: "execute",
  work_start_recovery: "execute",
  relationship_communication: "review",
  grooming_hygiene: "routine",
  health_exercise: "break",
  sleep_wake_routine: "routine",
  entertainment_refresh: "break",
  travel_planning: "schedule",
  exercise_challenge: "execute"
};

const PURPOSE_BY_INTENT = {
  home_cleaning: "생활 동선을 가볍게 복구",
  laundry_clothing: "의류 준비 마찰을 줄이기",
  meal_nutrition: "식사/주방 루틴을 안정화",
  outing_mobility: "외출/이동 준비를 단순화",
  admin_finance: "생활 행정과 정산 누락을 예방",
  digital_organizing: "디지털 작업 환경을 정돈",
  study_growth: "학습/집필 집중 흐름을 재가동",
  work_start_recovery: "업무 착수 장벽을 낮추고 복귀",
  relationship_communication: "협업/연락 누락을 줄이기",
  grooming_hygiene: "기본 위생 컨디션을 빠르게 확보",
  health_exercise: "몸 회복과 체력 리듬을 유지",
  sleep_wake_routine: "수면-기상 리듬을 안정화",
  entertainment_refresh: "여가 소비를 계획적으로 실행",
  travel_planning: "이동/예산 리스크를 사전 점검",
  exercise_challenge: "운동 실행률과 회복 기록을 유지"
};

const RECORD_MISSION_ACTION = "완료 결과를 1줄 기록하고 다음 행동을 예약하기";

function parseRows(markdownText) {
  const rowPattern = /^\|\s*([A-Z]{3}-(?:DAY|WEEK)-[A-Z_]+-\d{3})\s*\|\s*(DAY|WEEK)\s*\|\s*([a-z_]+)\s*\|\s*(.+?)\s*\|$/gm;
  const rows = [];
  for (const match of markdownText.matchAll(rowPattern)) {
    rows.push({
      id: match[1],
      cadenceRaw: match[2],
      intent: match[3],
      title: match[4]
    });
  }
  return rows;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function detectTimeContext(title, cadence, type) {
  if (/(출근길|통근|등교길|이동\s*중)/.test(title)) {
    return "commute";
  }
  if (/(아침|기상|등교|출발|출근\s*전|워밍업)/.test(title)) {
    return "morning";
  }
  if (/(오전|1교시)/.test(title)) {
    return "work_am";
  }
  if (/(점심|공강)/.test(title)) {
    return "lunch";
  }
  if (/(오후|하원|심부름|회의|업무|집필|코딩|퇴고)/.test(title)) {
    return "work_pm";
  }
  if (/(퇴근|귀가|저녁|관람|감상)/.test(title)) {
    return "evening";
  }
  if (/(야간|취침|수면|밤)/.test(title)) {
    return "night";
  }
  if (/(출발\s*전|예약|체크리스트|서류)/.test(title)) {
    return "pre_event";
  }
  if (/(영수증|후\s*정리|회복\s*기록)/.test(title)) {
    return "post_event";
  }

  if (cadence === "weekly") {
    return type === "non_routine" ? "weekend_pm" : "weekend_am";
  }

  return type === "non_routine" ? "pre_event" : "work_pm";
}

function buildWeekdayMask(cadence, type) {
  if (cadence === "daily") {
    return [1, 1, 1, 1, 1, 1, 1];
  }

  if (type === "non_routine") {
    return [0, 0, 0, 0, 1, 1, 1];
  }

  return [1, 0, 0, 0, 0, 0, 1];
}

function computeDifficulty({ cadence, intent, title, type }) {
  let difficulty = cadence === "weekly" ? 2 : 1;

  if (/(심화|결산|점검|리뷰|정산|배포|투고|보고서|체크리스트|진척률)/.test(title)) {
    difficulty += 1;
  }

  if (intent === "exercise_challenge" || intent === "travel_planning") {
    difficulty = Math.max(difficulty, 2);
  }

  if (intent === "work_start_recovery" && /(5분|10분|재시동|탑3|탑1)/.test(title)) {
    difficulty = 1;
  }

  if (intent === "sleep_wake_routine" || intent === "grooming_hygiene") {
    difficulty = Math.min(difficulty, 2);
  }

  if (type === "non_routine" && cadence === "weekly") {
    difficulty = Math.max(difficulty, 2);
  }

  return clamp(difficulty, 1, 3);
}

function missionMinutePlan(cadence, difficulty) {
  if (cadence === "weekly") {
    if (difficulty >= 3) {
      return [4, 4, 4, 4, 3];
    }
    return [3, 4, 3, 4, 3];
  }

  if (difficulty >= 3) {
    return [3, 3, 3, 3, 2];
  }
  if (difficulty === 2) {
    return [2, 3, 2, 3, 2];
  }
  return [2, 2, 2, 2, 2];
}

function buildMissionActions(intent, title, persona) {
  const actionMap = {
    home_cleaning: [
      "정리할 구역 1곳을 정하고 타이머를 켜기",
      "눈에 보이는 물건 10개를 제자리로 옮기기",
      "핵심 표면 1곳을 닦아 동선을 비우기",
      "다음 정리 시작점을 문앞에 배치하기"
    ],
    laundry_clothing: [
      "세탁/복장 우선순위 1세트를 정하기",
      "필수 의류를 분류해 즉시 처리 구역으로 옮기기",
      "건조 또는 수납까지 한 번에 연결하기",
      "내일 입을 조합을 보이는 곳에 배치하기"
    ],
    meal_nutrition: [
      "식사/주방 목표를 1문장으로 정하기",
      "필요한 재료와 도구를 3개만 먼저 꺼내기",
      "핵심 조리 또는 섭취 단계 1회를 완료하기",
      "식기/조리대 1구역을 즉시 정리하기"
    ],
    outing_mobility: [
      "오늘 이동 목적과 목적지 1곳을 확정하기",
      "필수 준비물 3개를 한곳에 모으기",
      "이동 동선/소요시간을 1회 점검하기",
      "출발 직전 체크 항목을 체크리스트에 기록하기"
    ],
    admin_finance: [
      "처리할 행정/정산 항목 1개를 선택하기",
      "필요 문서나 영수증을 한 화면에 모으기",
      "핵심 입력 또는 제출 단계를 끝내기",
      "다음 납부/정산 일정을 캘린더에 예약하기"
    ],
    digital_organizing: [
      "정리 대상 폴더/앱 1개를 정하기",
      "불필요 파일 또는 알림 10개를 정리하기",
      "중요 항목을 분류 폴더로 이동하기",
      "유지 규칙 1개를 메모해 고정하기"
    ],
    relationship_communication: [
      "연락/협업 대상 1명을 우선순위로 지정하기",
      "핵심 메시지 3줄 초안을 작성하기",
      "답장 또는 공유를 실제로 전송하기",
      "후속 일정/할일을 캘린더에 반영하기"
    ],
    study_growth: [
      "오늘 학습/집필 목표를 1줄로 선언하기",
      "자료와 도구를 3개 이내로 제한해 세팅하기",
      "집중 블록 1회를 타이머로 실행하기",
      "핵심 포인트 3줄을 요약하기"
    ],
    work_start_recovery: [
      "오늘 탑1 업무를 1줄로 적고 시작선 고정하기",
      "첫 5분 착수 행동 1개를 즉시 실행하기",
      "방해 알림 1개를 끄고 10분 집중하기",
      "중단 포인트와 다음 행동을 체크하기"
    ],
    grooming_hygiene: [
      "기본 위생 단계 1세트를 선택하기",
      "양치/세안 또는 샤워를 바로 시작하기",
      "외출/휴식에 필요한 마무리 단계를 진행하기",
      "다음 위생 루틴 시작물을 보이는 곳에 두기"
    ],
    health_exercise: [
      "오늘 몸 상태를 한 줄로 체크하기",
      "무리 없는 워밍업 1세트를 시작하기",
      "핵심 회복 또는 운동 동작을 1회 수행하기",
      "호흡/스트레칭으로 마무리하기"
    ],
    sleep_wake_routine: [
      "기상/취침 목표 시간을 1개 확정하기",
      "알람/조명/차단 설정을 먼저 조정하기",
      "잠들기 전 또는 기상 직후 루틴 1회를 실행하기",
      "다음 수면 루틴 준비물을 침대 주변에 배치하기"
    ],
    entertainment_refresh: [
      "오늘 즐길 콘텐츠 1개를 선택하기",
      "종료 시간과 소비 상한을 먼저 정하기",
      "집중 감상 블록 1회를 완료하기",
      "감상 포인트 2줄을 간단히 기록하기"
    ],
    travel_planning: [
      "여행/이동 핵심 일정 1개를 확정하기",
      "예약/서류/체크리스트 항목 5개를 점검하기",
      "예산 상한과 동선 리스크를 업데이트하기",
      "출발/복귀 후 해야 할 정리 항목을 메모하기"
    ],
    exercise_challenge: [
      "오늘 운동 목표 강도 1개를 정하기",
      "워밍업 루틴을 5분 안에 시작하기",
      "유산소 또는 근력 세션 1회를 수행하기",
      "회복 루틴과 수분 보충을 마무리하기"
    ]
  };

  const actions = actionMap[intent] ?? [
    `${title} 시작 조건을 1개 정하기`,
    "첫 실행 단계를 5분 안에 시작하기",
    "핵심 행동 1회를 마무리하기",
    "다음 행동을 예약하기"
  ];

  if (intent === "work_start_recovery" && (persona === "worker" || persona === "office_worker") && /출근|사무/.test(title)) {
    return [
      "출근 전 7분 재시동 루틴을 시작하기",
      "오늘 탑1 업무를 종이에 1줄로 적기",
      "방해 요소 1개를 끄고 8분 집중하기",
      "다음 착수 시점을 캘린더에 고정하기"
    ];
  }

  return actions;
}

function buildEnergyCost(intent, difficulty) {
  if (intent === "health_exercise" || intent === "exercise_challenge") {
    return difficulty >= 2 ? "high" : "mid";
  }
  if (difficulty <= 1) {
    return "low";
  }
  if (difficulty >= 3) {
    return "high";
  }
  return "mid";
}

function buildExamples({ title, intent, persona }) {
  const base = [
    `${title} 해야 하는데 시작이 안 돼`,
    `${title} 미루고 있어`
  ];

  if (intent === "work_start_recovery" && (persona === "worker" || persona === "office_worker")) {
    base.unshift("회사 가기 싫어", "사무실 가기 싫어", "일 하기 싫어");
  } else if (intent === "study_growth") {
    base.push("공부 시작이 안 돼");
  } else if (intent === "travel_planning") {
    base.push("여행 준비가 막막해");
  } else if (intent === "exercise_challenge") {
    base.push("운동 시작이 너무 귀찮아");
  }

  return Array.from(new Set(base))
    .map((line) => line.trim())
    .filter((line) => line.length >= 6)
    .slice(0, 8);
}

function buildSummary({ cadence, intent, title }) {
  const cadenceLabel = cadence === "daily" ? "오늘" : "이번 주";
  const purpose = PURPOSE_BY_INTENT[intent] ?? "실행 마찰을 줄이기";
  return `${cadenceLabel} ${purpose} 위해 ${title}를 작은 단계로 완료합니다.`;
}

function buildPriority({ cadence, intent, title, type }) {
  let priority = cadence === "weekly" ? 2 : 2;

  if (["work_start_recovery", "study_growth", "sleep_wake_routine", "health_exercise"].includes(intent)) {
    priority = 3;
  }

  if (/마감|점검|결산|보고|결재|리뷰/.test(title)) {
    priority = 3;
  }

  if (type === "non_routine" && cadence === "daily") {
    priority = Math.min(priority, 2);
  }

  return clamp(priority, 1, 3);
}

function buildTags({ persona, type, cadence, intent, domain, timeContext, difficulty, estimatedTimeMin }) {
  const tags = [persona, type, cadence, intent, domain, timeContext];

  if (cadence === "weekly") {
    tags.push("weekly_reset");
  }

  if (difficulty <= 1 && estimatedTimeMin <= 10 && type === "routine") {
    tags.push("micro_routine");
  }

  return Array.from(new Set(tags)).slice(0, 8);
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const prefix = row.id.slice(0, 3);
    const personaConfig = PERSONA_BY_PREFIX[prefix];
    if (!personaConfig) {
      throw new Error(`Unknown persona prefix: ${prefix}`);
    }

    const cadence = row.cadenceRaw === "WEEK" ? "weekly" : "daily";
    const persona = personaConfig.persona;
    const type = personaConfig.type;
    const domain = DOMAIN_BY_INTENT[row.intent] ?? "life_ops";
    const timeContext = detectTimeContext(row.title, cadence, type);
    const timeWindow = TIME_WINDOW_BY_CONTEXT[timeContext] ?? TIME_WINDOW_BY_CONTEXT.work_pm;
    const difficulty = computeDifficulty({ cadence, intent: row.intent, title: row.title, type });
    const missionMinutes = missionMinutePlan(cadence, difficulty);
    const missionActions = buildMissionActions(row.intent, row.title, persona);
    const iconKey = ICON_BY_INTENT[row.intent] ?? "execute";

    const missions = missionMinutes.map((estMinutes, index) => {
      const action = missionActions[index] ?? missionActions[missionActions.length - 1] ?? `${row.title} 실행 단계 ${index + 1} 진행하기`;
      return {
        action,
        estMinutes,
        difficulty,
        iconKey,
        notes: `${row.title} 실행 체크` 
      };
    });

    missions[missions.length - 1] = {
      ...missions[missions.length - 1],
      action: RECORD_MISSION_ACTION,
      iconKey: "record"
    };

    const estimatedTimeMin = missionMinutes.reduce((sum, minutes) => sum + minutes, 0);
    const energyCost = buildEnergyCost(row.intent, difficulty);
    const summary = buildSummary({ cadence, intent: row.intent, title: row.title });
    const priority = buildPriority({ cadence, intent: row.intent, title: row.title, type });

    return {
      schemaVersion: SCHEMA_VERSION,
      id: row.id,
      persona,
      type,
      cadence,
      weekdayMask: buildWeekdayMask(cadence, type),
      timeWindow,
      intent: row.intent,
      title: row.title,
      summary,
      priority,
      estimatedTimeMin,
      difficulty,
      energyCost,
      examples: buildExamples({ title: row.title, intent: row.intent, persona }),
      missions,
      successCriteria: {
        minCompletedMissions: Math.ceil(missions.length * 0.7),
        mustIncludeRecordMission: true
      },
      fallbackQuestIds: [],
      tags: buildTags({
        persona,
        type,
        cadence,
        intent: row.intent,
        domain,
        timeContext,
        difficulty,
        estimatedTimeMin
      }),
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT
    };
  });
}

function attachFallbackQuestIds(presets) {
  const groupMap = new Map();
  presets.forEach((preset) => {
    const key = `${preset.persona}:${preset.type}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key).push(preset);
  });

  groupMap.forEach((group) => {
    group.sort((a, b) => a.id.localeCompare(b.id, "en"));
    const length = group.length;

    group.forEach((preset, index) => {
      const fallbackIds = [];
      if (length > 1) {
        fallbackIds.push(group[(index + 1) % length].id);
      }
      if (length > 2) {
        fallbackIds.push(group[(index + 2) % length].id);
      }

      preset.fallbackQuestIds = fallbackIds;
    });
  });

  return presets;
}

function validatePresets(presets) {
  if (presets.length < 96) {
    throw new Error(`Preset count must be >= 96. actual=${presets.length}`);
  }

  const ids = new Set();
  const personaCounts = new Map();

  presets.forEach((preset) => {
    if (ids.has(preset.id)) {
      throw new Error(`Duplicate id: ${preset.id}`);
    }
    ids.add(preset.id);

    personaCounts.set(preset.persona, (personaCounts.get(preset.persona) ?? 0) + 1);

    const missionSum = preset.missions.reduce((sum, mission) => sum + mission.estMinutes, 0);
    if (Math.abs(preset.estimatedTimeMin - missionSum) > 5) {
      throw new Error(`estimatedTimeMin mismatch: ${preset.id}`);
    }

    if (preset.weekdayMask.length !== 7 || !preset.weekdayMask.some((day) => day === 1)) {
      throw new Error(`weekdayMask invalid: ${preset.id}`);
    }

    if (preset.fallbackQuestIds.length < 1 || preset.fallbackQuestIds.length > 3) {
      throw new Error(`fallbackQuestIds length invalid: ${preset.id}`);
    }

    if (preset.fallbackQuestIds.includes(preset.id)) {
      throw new Error(`fallbackQuestIds contains self id: ${preset.id}`);
    }

    if (preset.missions.length < 4 || preset.missions.length > 6) {
      throw new Error(`missions length invalid: ${preset.id}`);
    }

    if (preset.examples.length < 2 || preset.examples.length > 8) {
      throw new Error(`examples length invalid: ${preset.id}`);
    }

    if (preset.title.length < 6 || preset.title.length > 40) {
      throw new Error(`title length invalid: ${preset.id}`);
    }

    if (preset.summary.length < 10 || preset.summary.length > 120) {
      throw new Error(`summary length invalid: ${preset.id}`);
    }

    if (preset.type === "non_routine" && !preset.tags.some((tag) => ["entertainment", "travel", "exercise"].includes(tag))) {
      throw new Error(`non_routine tag missing: ${preset.id}`);
    }

    if (
      preset.type === "routine"
      && ["entertainment_refresh", "travel_planning", "exercise_challenge"].includes(preset.intent)
    ) {
      throw new Error(`routine intent invalid: ${preset.id}`);
    }
  });

  const expectedPersonaCounts = {
    student: 20,
    worker: 20,
    homemaker: 20,
    developer: 6,
    office_worker: 6,
    writer: 6,
    entertainment: 6,
    travel: 6,
    exercise: 6
  };

  Object.entries(expectedPersonaCounts).forEach(([persona, expectedCount]) => {
    const actualCount = personaCounts.get(persona) ?? 0;
    if (actualCount !== expectedCount) {
      throw new Error(`persona count mismatch (${persona}): expected=${expectedCount}, actual=${actualCount}`);
    }
  });

  presets.forEach((preset) => {
    preset.fallbackQuestIds.forEach((fallbackId) => {
      if (!ids.has(fallbackId)) {
        throw new Error(`fallbackQuestId not found: ${preset.id} -> ${fallbackId}`);
      }
    });
  });
}

function main() {
  const markdownText = readFileSync(DESIGN_PATH, "utf8");
  const rows = parseRows(markdownText);
  const normalized = normalizeRows(rows);
  const presets = attachFallbackQuestIds(normalized);

  validatePresets(presets);

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(presets, null, 2)}\n`, "utf8");
  console.log(`Generated ${presets.length} presets -> ${OUTPUT_PATH}`);
}

main();
