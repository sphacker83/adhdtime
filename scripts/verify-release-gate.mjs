import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const DAY_MS = 24 * 60 * 60 * 1000;

const EXPECTED_REQUIRED_EVENTS = [
  "task_created",
  "mission_generated",
  "mission_started",
  "mission_paused",
  "mission_completed",
  "mission_abandoned",
  "remission_requested",
  "reschedule_requested",
  "xp_gained",
  "level_up",
  "haptic_fired",
  "safety_blocked"
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const kpiModulePath = path.join(projectRoot, "features/mvp/lib/kpi.ts");

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

function verifyRequiredEventDefinition(getRequiredEventNames) {
  const requiredEventNames = getRequiredEventNames();
  const missing = EXPECTED_REQUIRED_EVENTS.filter((eventName) => !requiredEventNames.includes(eventName));
  const extra = requiredEventNames.filter((eventName) => !EXPECTED_REQUIRED_EVENTS.includes(eventName));

  if (missing.length > 0) {
    fail(`필수 이벤트 정의 누락: ${missing.join(", ")}`);
  }

  if (extra.length > 0) {
    fail(`필수 이벤트 정의에 예상 외 항목 존재: ${extra.join(", ")}`);
  }

  if (missing.length === 0 && extra.length === 0) {
    pass("필수 이벤트 정의가 기대 목록과 일치합니다.");
  }
}

function verifyKpiComputability(computeMvpKpis) {
  const baseMs = Date.parse("2026-02-20T09:00:00.000Z");
  const events = [
    createEvent({ eventName: "task_created", timestampMs: baseMs, sessionId: "s1", taskId: "t1" }),
    createEvent({
      eventName: "mission_generated",
      timestampMs: baseMs + 1_000,
      sessionId: "s1",
      taskId: "t1",
      meta: { missionCount: 3 }
    }),
    createEvent({ eventName: "mission_started", timestampMs: baseMs + 2_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "mission_paused", timestampMs: baseMs + 3_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "mission_completed", timestampMs: baseMs + 4_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "mission_abandoned", timestampMs: baseMs + 5_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "remission_requested", timestampMs: baseMs + 6_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "reschedule_requested", timestampMs: baseMs + 7_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "xp_gained", timestampMs: baseMs + 8_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "level_up", timestampMs: baseMs + 9_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "haptic_fired", timestampMs: baseMs + 10_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "safety_blocked", timestampMs: baseMs + 11_000, sessionId: "s1", taskId: "t1" }),
    createEvent({ eventName: "task_created", timestampMs: baseMs + DAY_MS + 30_000, sessionId: "s1", taskId: "t2" }),
    createEvent({ eventName: "task_created", timestampMs: baseMs + DAY_MS * 7 + 30_000, sessionId: "s1", taskId: "t3" }),
    createEvent({ eventName: "task_created", timestampMs: baseMs + 100_000, sessionId: "s2", taskId: "t4" })
  ];

  const summary = computeMvpKpis(events);

  const allCoverageSatisfied = EXPECTED_REQUIRED_EVENTS.every(
    (eventName) => summary.eventCoverage[eventName] === true
  );

  if (!allCoverageSatisfied) {
    const uncoveredEvents = EXPECTED_REQUIRED_EVENTS.filter((eventName) => !summary.eventCoverage[eventName]);
    fail(`샘플 이벤트 커버리지 누락: ${uncoveredEvents.join(", ")}`);
  } else {
    pass("샘플 이벤트가 필수 이벤트 커버리지를 충족합니다.");
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
    fail("핵심 KPI의 계산 가능성을 확인하지 못했습니다.");
  } else {
    pass("핵심 KPI 계산 가능성을 확인했습니다.");
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
    pass("KPI 수치 유효성(유한수/음수/퍼센트 범위)을 확인했습니다.");
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
    fail("빈 이벤트 입력에 대한 안전 처리(null) 조건을 만족하지 못했습니다.");
  } else {
    pass("빈 이벤트 입력에서도 KPI 안전 처리(null)가 유지됩니다.");
  }
}

async function main() {
  try {
    const loadedModule = await loadKpiModule();
    const { computeMvpKpis, getRequiredEventNames } = loadedModule;

    if (typeof computeMvpKpis !== "function") {
      fail("computeMvpKpis export를 찾을 수 없습니다.");
    }

    if (typeof getRequiredEventNames !== "function") {
      fail("getRequiredEventNames export를 찾을 수 없습니다.");
    }

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
