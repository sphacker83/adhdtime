import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const DAY_MS = 24 * 60 * 60 * 1000;

const GATE9_REQUIRED_EVENTS = [
  "task_created",
  "task_time_updated",
  "task_rescheduled",
  "reschedule_requested",
  "mission_generated",
  "mission_time_adjusted",
  "mission_started",
  "mission_paused",
  "mission_completed",
  "remission_requested",
  "xp_gained",
  "level_up",
  "rank_promoted",
  "character_rank_changed",
  "haptic_fired",
  "safety_blocked"
];
const GATE9_OPTIONAL_EVENTS = ["mission_abandoned"];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const kpiModulePath = path.join(projectRoot, "features/mvp/lib/kpi.ts");
const dashboardModulePath = path.join(projectRoot, "features/mvp/components/mvp-dashboard.tsx");
const homeViewPath = path.join(projectRoot, "features/mvp/task-list/components/home-view.tsx");
const recoveryActionsPath = path.join(projectRoot, "features/mvp/recovery/components/recovery-actions.tsx");

let hasFailure = false;

function pass(message) {
  console.log(`[verify:gate] PASS: ${message}`);
}

function fail(message) {
  hasFailure = true;
  console.error(`[verify:gate] FAIL: ${message}`);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeNumber(value) {
  return isFiniteNumber(value) && value >= 0;
}

function isValidPercent(value) {
  if (value === null) {
    return true;
  }
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

function createEvent({ eventName, timestampMs, sessionId, taskId = null, missionId = null, meta }) {
  return {
    id: `${eventName}-${sessionId}-${timestampMs}`,
    eventName,
    timestamp: new Date(timestampMs).toISOString(),
    sessionId,
    source: "local",
    taskId,
    missionId,
    meta
  };
}

function getMissingSignals(source, signals) {
  return signals.filter((signal) => !source.includes(signal));
}

async function loadKpiModule() {
  const source = await fs.readFile(kpiModulePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler
    },
    fileName: kpiModulePath
  });

  const encoded = Buffer.from(transpiled.outputText, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

function verifyGate3Automation(dashboardSource) {
  const requiredSignals = [
    "startClickCountByTaskId",
    "timeToFirstStartMs",
    "withinThreeMinutes",
    "eventName: \"mission_started\"",
    "startClickCount"
  ];
  const missingSignals = getMissingSignals(dashboardSource, requiredSignals);
  if (missingSignals.length > 0) {
    fail(
      `Gate-3 자동 판정 근거 누락 (${path.relative(projectRoot, dashboardModulePath)}): `
        + `${missingSignals.join(", ")}. mission_started 메타에 시작 탭 수/3분 내 시작 여부를 남기도록 보강하세요.`
    );
    return;
  }

  pass("Gate-3 자동 판정 근거(첫 시작 탭/3분 메타)가 코드에 존재합니다.");
}

function verifyGate7Automation(dashboardSource, recoverySource) {
  const dashboardSignals = [
    "recoveryClickCountByTaskId",
    "eventName: \"remission_requested\"",
    "eventName: \"reschedule_requested\"",
    "recoveryClickCount"
  ];
  const recoveryUiSignals = [
    "더 작게 다시 나누기",
    "내일로 다시 등록"
  ];

  const missingDashboardSignals = getMissingSignals(dashboardSource, dashboardSignals);
  const missingRecoveryUiSignals = getMissingSignals(recoverySource, recoveryUiSignals);

  if (missingDashboardSignals.length > 0 || missingRecoveryUiSignals.length > 0) {
    const details = [
      missingDashboardSignals.length > 0
        ? `대시보드 누락: ${missingDashboardSignals.join(", ")}`
        : null,
      missingRecoveryUiSignals.length > 0
        ? `복귀 UI 누락: ${missingRecoveryUiSignals.join(", ")}`
        : null
    ].filter(Boolean);

    fail(
      `Gate-7 자동 판정 근거 누락 (${path.relative(projectRoot, dashboardModulePath)}, `
        + `${path.relative(projectRoot, recoveryActionsPath)}): ${details.join(" / ")}`
    );
    return;
  }

  pass("Gate-7 자동 판정 근거(복귀 동선 CTA + recovery 탭 계측 이벤트)가 코드에 존재합니다.");
}

function verifyGate8TaskPolicy(dashboardSource, homeViewSource, recoverySource) {
  const requiredSignals = [
    ...getMissingSignals(dashboardSource, [
      "const handleReschedule = (targetTaskId",
      "mission.taskId === targetTaskId && isActionableMissionStatus(mission.status)",
      "if (mission.taskId !== targetTaskId || !isActionableMissionStatus(mission.status))",
      "setActiveTaskId(targetTaskId)",
      "taskId: targetTaskId"
    ]),
    ...getMissingSignals(homeViewSource, [
      "onReschedule: (taskId: string) => void"
    ]),
    ...getMissingSignals(recoverySource, [
      "onReschedule: (taskId: string) => void",
      "onClick={() => onReschedule(mission.taskId)}"
    ])
  ];

  if (requiredSignals.length > 0) {
    fail(
      `Gate-8 Task 단위 재일정 근거 누락: ${requiredSignals.join(", ")}. `
        + "재일정 엔트리/전이/이벤트가 missionId 중심이 아닌 taskId 중심으로 동작해야 합니다."
    );
    return;
  }

  pass("Gate-8 Task 단위 재일정 정책 근거(taskId 기반 엔트리/전이)가 확인됩니다.");
}

function verifyRequiredEventDefinition(getRequiredEventNames) {
  const requiredEventNames = getRequiredEventNames();
  const missingGate9RequiredEvents = GATE9_REQUIRED_EVENTS.filter(
    (eventName) => !requiredEventNames.includes(eventName)
  );
  const supportedEvents = new Set([...GATE9_REQUIRED_EVENTS, ...GATE9_OPTIONAL_EVENTS]);
  const unexpectedEvents = requiredEventNames.filter((eventName) => !supportedEvents.has(eventName));

  if (missingGate9RequiredEvents.length > 0) {
    fail(
      `Gate-9 필수 이벤트 정의 누락: ${missingGate9RequiredEvents.join(", ")}. `
        + "features/mvp/lib/kpi.ts의 REQUIRED_EVENT_NAMES를 문서 기준으로 동기화하세요."
    );
  }

  if (unexpectedEvents.length > 0) {
    fail(
      `Gate-9 필수 이벤트 정의에 예상 외 항목 존재: ${unexpectedEvents.join(", ")}. `
        + "문서/도메인 이벤트 계약과 불일치 여부를 점검하세요."
    );
  }

  if (missingGate9RequiredEvents.length === 0 && unexpectedEvents.length === 0) {
    pass("Gate-9 필수 이벤트 정의가 문서 기준 목록과 일치합니다.");
  }

  const missingOptionalEvents = GATE9_OPTIONAL_EVENTS.filter((eventName) => !requiredEventNames.includes(eventName));
  if (missingOptionalEvents.length === 0) {
    pass("Gate-9 보조 이벤트(mission_abandoned)도 KPI 필수 목록에 포함되어 있습니다.");
  } else {
    pass(`Gate-9 보조 이벤트(${missingOptionalEvents.join(", ")})는 선택 항목으로 간주합니다.`);
  }
}

function verifyKpiComputability(computeMvpKpis) {
  const baseMs = Date.parse("2026-02-20T09:00:00.000Z");
  const events = [
    createEvent({ eventName: "task_created", timestampMs: baseMs, sessionId: "s1", taskId: "t1" }),
    createEvent({
      eventName: "task_time_updated",
      timestampMs: baseMs + 500,
      sessionId: "s1",
      taskId: "t1",
      meta: { updatedDuringRun: false }
    }),
    createEvent({
      eventName: "mission_generated",
      timestampMs: baseMs + 1_000,
      sessionId: "s1",
      taskId: "t1",
      meta: { missionCount: 3 }
    }),
    createEvent({
      eventName: "mission_started",
      timestampMs: baseMs + 2_000,
      sessionId: "s1",
      taskId: "t1",
      missionId: "m1",
      meta: {
        startClickCount: 1,
        firstStart: true,
        timeToFirstStartMs: 120_000,
        withinThreeMinutes: true
      }
    }),
    createEvent({
      eventName: "mission_time_adjusted",
      timestampMs: baseMs + 2_500,
      sessionId: "s1",
      taskId: "t1",
      missionId: "m1",
      meta: { deltaMinutes: 1 }
    }),
    createEvent({ eventName: "mission_paused", timestampMs: baseMs + 3_000, sessionId: "s1", taskId: "t1", missionId: "m1" }),
    createEvent({ eventName: "mission_completed", timestampMs: baseMs + 4_000, sessionId: "s1", taskId: "t1", missionId: "m1" }),
    createEvent({ eventName: "mission_abandoned", timestampMs: baseMs + 5_000, sessionId: "s1", taskId: "t1", missionId: "m2" }),
    createEvent({
      eventName: "remission_requested",
      timestampMs: baseMs + 6_000,
      sessionId: "s1",
      taskId: "t1",
      missionId: "m2",
      meta: { recoveryClickCount: 1 }
    }),
    createEvent({
      eventName: "task_rescheduled",
      timestampMs: baseMs + 6_500,
      sessionId: "s1",
      taskId: "t1",
      meta: { movedMissionCount: 2, recoveryClickCount: 2 }
    }),
    createEvent({
      eventName: "reschedule_requested",
      timestampMs: baseMs + 7_000,
      sessionId: "s1",
      taskId: "t1",
      meta: { movedMissionCount: 2, recoveryClickCount: 2 }
    }),
    createEvent({ eventName: "xp_gained", timestampMs: baseMs + 8_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "level_up", timestampMs: baseMs + 9_000, sessionId: "s1", taskId: "t1" }),
    createEvent({
      eventName: "rank_promoted",
      timestampMs: baseMs + 9_500,
      sessionId: "s1",
      taskId: "t1",
      meta: {
        statKey: "focus",
        fromRank: "F",
        toRank: "E",
        promotedCount: 1
      }
    }),
    createEvent({
      eventName: "character_rank_changed",
      timestampMs: baseMs + 9_750,
      sessionId: "s1",
      taskId: "t1",
      meta: {
        previousRank: "F",
        nextRank: "E"
      }
    }),
    createEvent({ eventName: "haptic_fired", timestampMs: baseMs + 10_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "safety_blocked", timestampMs: baseMs + 11_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "task_created", timestampMs: baseMs + DAY_MS + 30_000, sessionId: "s1", taskId: "t2" }),
    createEvent({ eventName: "task_created", timestampMs: baseMs + DAY_MS * 7 + 30_000, sessionId: "s1", taskId: "t3" }),
    createEvent({ eventName: "task_created", timestampMs: baseMs + 100_000, sessionId: "s2", taskId: "t4" })
  ];

  const summary = computeMvpKpis(events);

  const allCoverageSatisfied = GATE9_REQUIRED_EVENTS.every(
    (eventName) => summary.eventCoverage[eventName] === true
  );

  if (!allCoverageSatisfied) {
    const uncoveredEvents = GATE9_REQUIRED_EVENTS.filter((eventName) => !summary.eventCoverage[eventName]);
    fail(
      `Gate-9 샘플 이벤트 커버리지 누락: ${uncoveredEvents.join(", ")}. `
        + "샘플 이벤트 생성 또는 REQUIRED_EVENT_NAMES 정의를 동기화하세요."
    );
  } else {
    pass("Gate-9 샘플 이벤트가 필수 이벤트 커버리지를 충족합니다.");
  }

  const kpiCheckResults = [
    typeof summary.activationRate.value === "number",
    typeof summary.averageTimeToStartMs === "number",
    typeof summary.missionCompletionRate.value === "number",
    typeof summary.recoveryRate.value === "number",
    typeof summary.d1Retention.value === "number",
    typeof summary.d7Retention.value === "number"
  ];

  if (kpiCheckResults.some((result) => result === false)) {
    fail("Gate-9 KPI 계산 가능성 검증 실패: 핵심 KPI 중 number 결과를 만들지 못했습니다.");
  } else {
    pass("Gate-9 핵심 KPI 계산 가능성을 확인했습니다.");
  }

  const ratioMetricChecks = [
    ["activationRate", summary.activationRate],
    ["missionCompletionRate", summary.missionCompletionRate],
    ["recoveryRate", summary.recoveryRate],
    ["d1Retention", summary.d1Retention],
    ["d7Retention", summary.d7Retention]
  ];

  ratioMetricChecks.forEach(([metricName, metric]) => {
    if (!isNonNegativeNumber(metric.numerator)) {
      fail(`${metricName}.numerator 값이 NaN/Infinity/음수입니다: ${metric.numerator}`);
    }
    if (!isNonNegativeNumber(metric.denominator)) {
      fail(`${metricName}.denominator 값이 NaN/Infinity/음수입니다: ${metric.denominator}`);
    }
    if (!isValidPercent(metric.value)) {
      fail(`${metricName}.value 값이 유효 범위(0~100) 밖이거나 NaN/Infinity입니다: ${metric.value}`);
    }
  });

  const scalarMetricChecks = [
    ["averageTimeToStartMs", summary.averageTimeToStartMs],
    ["averageTimeToStartSeconds", summary.averageTimeToStartSeconds],
    ["samples.sessions", summary.samples.sessions],
    ["samples.tasksCreated", summary.samples.tasksCreated],
    ["samples.tasksStarted", summary.samples.tasksStarted],
    ["samples.tasksAbandoned", summary.samples.tasksAbandoned],
    ["samples.generatedMissions", summary.samples.generatedMissions],
    ["samples.completedMissions", summary.samples.completedMissions]
  ];

  scalarMetricChecks.forEach(([metricName, value]) => {
    if (value !== null && !isNonNegativeNumber(value)) {
      fail(`${metricName} 값이 NaN/Infinity/음수입니다: ${value}`);
    }
  });

  if (!hasFailure) {
    pass("Gate-9 KPI 수치 유효성(유한수/음수/퍼센트 범위)을 확인했습니다.");
  }

  const emptySummary = computeMvpKpis([]);
  const emptySafe = [
    emptySummary.activationRate.value === null,
    emptySummary.averageTimeToStartMs === null,
    emptySummary.missionCompletionRate.value === null,
    emptySummary.recoveryRate.value === null,
    emptySummary.d1Retention.value === null,
    emptySummary.d7Retention.value === null
  ].every(Boolean);

  if (!emptySafe) {
    fail("Gate-9 빈 이벤트 입력에 대한 KPI null 안전 처리 조건을 만족하지 못했습니다.");
  } else {
    pass("Gate-9 빈 이벤트 입력에서도 KPI null 안전 처리가 유지됩니다.");
  }
}

async function main() {
  try {
    const [loadedModule, dashboardSource, homeViewSource, recoverySource] = await Promise.all([
      loadKpiModule(),
      fs.readFile(dashboardModulePath, "utf8"),
      fs.readFile(homeViewPath, "utf8"),
      fs.readFile(recoveryActionsPath, "utf8")
    ]);
    const { computeMvpKpis, getRequiredEventNames } = loadedModule;

    if (typeof computeMvpKpis !== "function") {
      fail("computeMvpKpis export를 찾을 수 없습니다. features/mvp/lib/kpi.ts를 확인하세요.");
    }

    if (typeof getRequiredEventNames !== "function") {
      fail("getRequiredEventNames export를 찾을 수 없습니다. features/mvp/lib/kpi.ts를 확인하세요.");
    }

    verifyGate3Automation(dashboardSource);
    verifyGate7Automation(dashboardSource, recoverySource);
    verifyGate8TaskPolicy(dashboardSource, homeViewSource, recoverySource);

    if (typeof computeMvpKpis === "function" && typeof getRequiredEventNames === "function") {
      verifyRequiredEventDefinition(getRequiredEventNames);
      verifyKpiComputability(computeMvpKpis);
    }
  } catch (error) {
    fail(`게이트 실행 중 예외 발생: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (hasFailure) {
    process.exit(1);
  }

  console.log("[verify:gate] SUCCESS: 릴리즈 게이트 검증을 통과했습니다.");
}

void main();
