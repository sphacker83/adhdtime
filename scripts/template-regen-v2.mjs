#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_PATHS = {
  clusters: "data/clusters.json",
  concepts: "data/concepts.json",
  mapsDir: "data/_rewrite_maps",
  allocation: "data/_staging/template-allocation-v2.json",
};

const REQUIRED_TEMPLATE_FIELDS = [
  "id",
  "clusterKey",
  "type",
  "title",
  "concepts",
  "contexts",
  "states",
  "time",
  "missions",
  "meta",
];

const TITLE_SUFFIXES = [
  "짧고 선명하게",
  "흐름 유지",
  "지금 바로",
  "가볍게 시작",
  "집중 마무리",
  "잡음 없이",
];

function printHelp() {
  console.log(`Usage:
  node scripts/template-regen-v2.mjs --domains HOME,ROUTINE --out data/_staging/shards/home_routine.json

Options:
  --domains      Comma-separated domain list (required)
  --out          Output shard json path (required)
  --clusters     clusters.json path (default: ${DEFAULT_PATHS.clusters})
  --concepts     concepts.json path (default: ${DEFAULT_PATHS.concepts})
  --maps-dir     rewrite maps directory (default: ${DEFAULT_PATHS.mapsDir})
  --allocation   allocation json path (default: ${DEFAULT_PATHS.allocation})
  --help         Show this help
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      throw new Error(`Unknown positional argument: ${token}`);
    }
    const [rawKey, inlineValue] = token.split("=", 2);
    const key = rawKey.slice(2);
    if (key === "help") {
      args.help = true;
      continue;
    }
    const value = inlineValue ?? argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    args[key] = value;
    if (inlineValue === undefined) {
      i += 1;
    }
  }
  return args;
}

async function loadJson(jsonPath) {
  const raw = await readFile(jsonPath, "utf8");
  return JSON.parse(raw);
}

function pick(list, fallback, seed) {
  if (Array.isArray(list) && list.length > 0) {
    return list[Math.abs(seed) % list.length];
  }
  if (Array.isArray(fallback) && fallback.length > 0) {
    return fallback[Math.abs(seed) % fallback.length];
  }
  return undefined;
}

function normalizeBands(defaultTimeBands) {
  const bands = Array.isArray(defaultTimeBands)
    ? defaultTimeBands
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0)
    : [];
  if (bands.length === 0) {
    return [10];
  }
  return [...new Set(bands)].sort((a, b) => a - b);
}

function computeDefaultTime(cluster, templateIndexZeroBased) {
  const bands = normalizeBands(cluster.defaultTimeBands);
  const anchor = bands[templateIndexZeroBased % bands.length];
  const offsets = [0, -1, 1, 2, -2, 0, 1, -1];
  const offset = offsets[templateIndexZeroBased % offsets.length];
  const minBand = Math.max(3, bands[0] - 2);
  const maxBand = bands[bands.length - 1] + 2;
  return Math.max(3, Math.min(maxBand, Math.max(minBand, anchor + offset)));
}

function computeMissionCount(defaultTime, templateIndexZeroBased) {
  const base =
    defaultTime <= 8 ? 3 : defaultTime <= 14 ? 4 : defaultTime <= 22 ? 4 : 5;
  const wobble = (templateIndexZeroBased % 3) - 1;
  const count = base + wobble;
  const upperBound = Math.min(5, defaultTime);
  return Math.max(3, Math.min(upperBound, count));
}

function distributeMinutes(totalMinutes, missionCount, seed) {
  const minutes = new Array(missionCount).fill(Math.floor(totalMinutes / missionCount));
  let remainder = totalMinutes % missionCount;
  let cursor = Math.abs(seed) % missionCount;
  while (remainder > 0) {
    minutes[cursor] += 1;
    cursor = (cursor + 1) % missionCount;
    remainder -= 1;
  }
  for (let i = 0; i < minutes.length; i += 1) {
    if (minutes[i] < 1) {
      minutes[i] = 1;
    }
  }
  let sum = minutes.reduce((acc, n) => acc + n, 0);
  while (sum > totalMinutes) {
    const idx = minutes.findIndex((n) => n > 1);
    if (idx === -1) {
      break;
    }
    minutes[idx] -= 1;
    sum -= 1;
  }
  while (sum < totalMinutes) {
    minutes[sum % missionCount] += 1;
    sum += 1;
  }
  return minutes;
}

function buildMissionIndexOrder(length, seed) {
  if (length <= 1) {
    return [0];
  }
  const stepCandidates = [1, 2, 3, 4];
  let step = stepCandidates[seed % stepCandidates.length];
  while (gcd(step, length) !== 1) {
    step += 1;
  }
  const order = [];
  let cursor = (seed * 2) % length;
  const seen = new Set();
  while (order.length < length) {
    if (!seen.has(cursor)) {
      order.push(cursor);
      seen.add(cursor);
    }
    cursor = (cursor + step) % length;
  }
  return order;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const tmp = y;
    y = x % y;
    x = tmp;
  }
  return x;
}

function toTemplateId(clusterKey, indexOneBased) {
  const width = indexOneBased >= 100 ? 3 : 2;
  return `TPL_${clusterKey}_${String(indexOneBased).padStart(width, "0")}`;
}

function toStateList(cluster, conceptIndex) {
  if (cluster.domain !== "STATE") {
    return [];
  }
  const stateConcepts = (cluster.concepts || []).filter(
    (conceptId) =>
      typeof conceptId === "string" &&
      conceptId.startsWith("STATE.") &&
      conceptIndex.conceptSet.has(conceptId)
  );
  if (stateConcepts.length === 0) {
    throw new Error(
      `STATE cluster ${cluster.clusterKey} must include at least one STATE.* conceptId present in concepts.json`
    );
  }
  return [stateConcepts[0]];
}

function toType(cluster) {
  if (cluster.domain === "STATE") {
    return "friction";
  }
  return cluster.primaryType || "process";
}

function makeMeta(cluster, templateIndexZeroBased) {
  const axes = cluster.variantAxes || {};
  const domainFallback = [cluster.domain];
  return {
    intensity: pick(axes.intensity, ["MIN", "STD", "FULL"], templateIndexZeroBased),
    goalFocus: pick(axes.goalFocus, ["GENERAL"], templateIndexZeroBased + 1),
    contextVariant: pick(axes.context, domainFallback, templateIndexZeroBased + 2),
    stateMode: pick(
      axes.stateMode,
      cluster.domain === "STATE" ? ["LOW_MOTIVATION"] : ["NORMAL"],
      templateIndexZeroBased + 3
    ),
  };
}

function makeTitle({
  titleTemplates,
  defaultTime,
  templateIndexZeroBased,
  usedTitleSet,
}) {
  const fallbackTitles =
    Array.isArray(titleTemplates) && titleTemplates.length > 0
      ? titleTemplates
      : ["집중 세션 시작하기"];
  const base = fallbackTitles[templateIndexZeroBased % fallbackTitles.length];
  let candidate;
  if (templateIndexZeroBased < fallbackTitles.length) {
    candidate = base;
  } else {
    const suffix = TITLE_SUFFIXES[templateIndexZeroBased % TITLE_SUFFIXES.length];
    candidate =
      templateIndexZeroBased % 2 === 0
        ? `${base} ${suffix}`
        : `${base} (${defaultTime}분 ${suffix})`;
  }
  if (!usedTitleSet.has(candidate)) {
    usedTitleSet.add(candidate);
    return candidate;
  }
  let dedupeCounter = 2;
  while (usedTitleSet.has(`${candidate} ${dedupeCounter}회차`)) {
    dedupeCounter += 1;
  }
  const deduped = `${candidate} ${dedupeCounter}회차`;
  usedTitleSet.add(deduped);
  return deduped;
}

function makeMissions({ missionBlueprints, missionCount, defaultTime, seed }) {
  const source =
    Array.isArray(missionBlueprints) && missionBlueprints.length >= 3
      ? missionBlueprints
      : [
          "할 일을 가장 작은 단위로 쪼개 첫 동작부터 시작하세요.",
          "타이머를 켜고 지금 할 1가지만 집중해서 진행하세요.",
          "마지막 1분은 완료 체크와 다음 한 줄 계획으로 마무리하세요.",
        ];
  const order = buildMissionIndexOrder(source.length, seed);
  const chosen = order.slice(0, missionCount).map((idx) => source[idx]);
  const minutes = distributeMinutes(defaultTime, missionCount, seed + 7);
  return chosen.map((action, idx) => ({
    action,
    estMin: minutes[idx],
  }));
}

function buildConceptIndex(conceptsJson) {
  const concepts = Array.isArray(conceptsJson.concepts) ? conceptsJson.concepts : [];
  const conceptSet = new Set();
  const byDomain = {};
  for (const concept of concepts) {
    if (!concept || typeof concept.conceptId !== "string") {
      continue;
    }
    conceptSet.add(concept.conceptId);
    const domain = concept.domain;
    if (typeof domain === "string") {
      if (!byDomain[domain]) {
        byDomain[domain] = [];
      }
      byDomain[domain].push(concept.conceptId);
    }
  }
  return { conceptSet, byDomain };
}

function parseAllocation(allocationJson) {
  const out = {
    total: 0,
    domainTargets: {},
    clusterCounts: {},
  };
  if (allocationJson && allocationJson.domains && typeof allocationJson.domains === "object") {
    for (const [domain, payload] of Object.entries(allocationJson.domains)) {
      const target = Number(payload?.target || 0);
      out.domainTargets[domain] = target;
      const clusters = payload?.clusters || {};
      for (const [clusterKey, count] of Object.entries(clusters)) {
        out.clusterCounts[clusterKey] = Number(count);
      }
    }
    out.total = Number(allocationJson.total || 0);
    return out;
  }
  if (
    allocationJson &&
    allocationJson.clusterAllocations &&
    typeof allocationJson.clusterAllocations === "object"
  ) {
    for (const [clusterKey, count] of Object.entries(allocationJson.clusterAllocations)) {
      out.clusterCounts[clusterKey] = Number(count);
      out.total += Number(count);
    }
    out.domainTargets = allocationJson.domainTargets || {};
    return out;
  }
  throw new Error("Unsupported allocation schema.");
}

function validateTemplate(template) {
  for (const key of REQUIRED_TEMPLATE_FIELDS) {
    if (!(key in template)) {
      throw new Error(`Template ${template.id} missing required field: ${key}`);
    }
  }
  if (!Array.isArray(template.missions) || template.missions.length < 3) {
    throw new Error(`Template ${template.id} must have at least 3 missions.`);
  }
  const missionMinutes = template.missions.reduce((acc, m) => acc + Number(m.estMin || 0), 0);
  if (missionMinutes !== template.time.default) {
    throw new Error(
      `Template ${template.id} has mission sum ${missionMinutes} but default time ${template.time.default}.`
    );
  }
  if (template.clusterKey.startsWith("STATE_")) {
    if (template.type !== "friction") {
      throw new Error(`Template ${template.id} must use type=friction for STATE domain.`);
    }
    if (!Array.isArray(template.states) || template.states.length === 0) {
      throw new Error(`Template ${template.id} must have non-empty states for STATE domain.`);
    }
    const hasInvalidStateConcept = template.states.some(
      (state) => typeof state !== "string" || !state.startsWith("STATE.")
    );
    if (hasInvalidStateConcept) {
      throw new Error(
        `Template ${template.id} must use STATE.* conceptId values in states for STATE domain.`
      );
    }
  } else if (Array.isArray(template.states) && template.states.length > 0) {
    throw new Error(`Template ${template.id} must have empty states for non-STATE domain.`);
  }
}

async function loadRewriteMaps(mapsDir) {
  const files = (await readdir(mapsDir)).filter((file) => file.endsWith(".json")).sort();
  const merged = {};
  for (const file of files) {
    const data = await loadJson(path.join(mapsDir, file));
    const clusters = data?.clusters;
    if (!clusters || typeof clusters !== "object") {
      throw new Error(`Invalid rewrite map schema in ${file}`);
    }
    for (const [clusterKey, spec] of Object.entries(clusters)) {
      merged[clusterKey] = spec;
    }
  }
  return merged;
}

function ensureDomainList(domainsCsv, allowedDomains) {
  if (!domainsCsv || typeof domainsCsv !== "string") {
    throw new Error("--domains is required.");
  }
  const parsed = [...new Set(domainsCsv.split(",").map((d) => d.trim().toUpperCase()).filter(Boolean))];
  if (parsed.length === 0) {
    throw new Error("No domains were parsed from --domains.");
  }
  for (const domain of parsed) {
    if (!allowedDomains.has(domain)) {
      throw new Error(`Unknown domain in --domains: ${domain}`);
    }
  }
  return parsed;
}

function buildTemplates({
  selectedDomains,
  clusters,
  conceptIndex,
  rewriteMap,
  allocation,
}) {
  const templates = [];
  const selected = clusters.filter((cluster) => selectedDomains.includes(cluster.domain));

  for (const cluster of selected) {
    const count = Number(allocation.clusterCounts[cluster.clusterKey]);
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error(`Missing or invalid allocation for cluster ${cluster.clusterKey}`);
    }
    if (cluster.clusterKey === "HOME_KITCHEN_RESET" && count < 10) {
      throw new Error(
        "HOME_KITCHEN_RESET must allocate at least 10 templates to guarantee TPL_HOME_KITCHEN_RESET_10."
      );
    }
    const rewriteSpec = rewriteMap[cluster.clusterKey];
    if (!rewriteSpec) {
      throw new Error(`Missing rewrite map entry for cluster ${cluster.clusterKey}`);
    }
    const titleTemplates = Array.isArray(rewriteSpec.titleTemplates)
      ? rewriteSpec.titleTemplates
      : [];
    const missionBlueprints = Array.isArray(rewriteSpec.missionBlueprints)
      ? rewriteSpec.missionBlueprints
      : [];
    if (missionBlueprints.length < 3) {
      throw new Error(`Cluster ${cluster.clusterKey} has fewer than 3 mission blueprints.`);
    }

    const validatedConcepts = (cluster.concepts || []).filter((id) => conceptIndex.conceptSet.has(id));
    const concepts =
      validatedConcepts.length > 0
        ? validatedConcepts
        : [conceptIndex.byDomain[cluster.domain]?.[0]].filter(Boolean);
    if (concepts.length === 0) {
      throw new Error(`No concept found for cluster ${cluster.clusterKey}`);
    }

    const usedTitleSet = new Set();
    for (let index = 1; index <= count; index += 1) {
      const zero = index - 1;
      const defaultTime = computeDefaultTime(cluster, zero);
      const missionCount = computeMissionCount(defaultTime, zero);
      const meta = makeMeta(cluster, zero);
      const title = makeTitle({
        titleTemplates,
        defaultTime,
        templateIndexZeroBased: zero,
        usedTitleSet,
      });
      const templateId = toTemplateId(cluster.clusterKey, index);

      const finalTitle =
        cluster.clusterKey === "HOME_KITCHEN_RESET" && templateId === "TPL_HOME_KITCHEN_RESET_10"
          ? "부엌 리셋 10분 짧게 집"
          : title;

      const template = {
        id: templateId,
        clusterKey: cluster.clusterKey,
        type: toType(cluster),
        title: finalTitle,
        concepts,
        contexts: [meta.contextVariant || cluster.domain],
        states: toStateList(cluster, conceptIndex),
        time: {
          min: Math.max(1, defaultTime - 4),
          max: defaultTime + 6,
          default: defaultTime,
        },
        missions: makeMissions({
          missionBlueprints,
          missionCount,
          defaultTime,
          seed: zero,
        }),
        meta,
      };

      validateTemplate(template);
      templates.push(template);
    }
  }

  const shouldEnforceKitchenCompat = selectedDomains.includes("HOME");
  if (shouldEnforceKitchenCompat) {
    const compat = templates.find((tpl) => tpl.id === "TPL_HOME_KITCHEN_RESET_10");
    if (!compat) {
      throw new Error("Compatibility template TPL_HOME_KITCHEN_RESET_10 was not generated.");
    }
    if (compat.title !== "부엌 리셋 10분 짧게 집") {
      throw new Error("Compatibility title mismatch for TPL_HOME_KITCHEN_RESET_10.");
    }
  }

  return templates;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const clustersPath = args.clusters || DEFAULT_PATHS.clusters;
  const conceptsPath = args.concepts || DEFAULT_PATHS.concepts;
  const mapsDir = args["maps-dir"] || DEFAULT_PATHS.mapsDir;
  const allocationPath = args.allocation || DEFAULT_PATHS.allocation;
  const outPath = args.out;
  if (!outPath) {
    throw new Error("--out is required.");
  }

  const [clustersJson, conceptsJson, allocationJson, rewriteMap] = await Promise.all([
    loadJson(clustersPath),
    loadJson(conceptsPath),
    loadJson(allocationPath),
    loadRewriteMaps(mapsDir),
  ]);

  const clusters = Array.isArray(clustersJson.clusters) ? clustersJson.clusters : [];
  if (clusters.length === 0) {
    throw new Error("clusters.json has no clusters array.");
  }
  const allowedDomains = new Set(clusters.map((cluster) => cluster.domain).filter(Boolean));
  const selectedDomains = ensureDomainList(args.domains, allowedDomains);
  const conceptIndex = buildConceptIndex(conceptsJson);
  const allocation = parseAllocation(allocationJson);

  const templates = buildTemplates({
    selectedDomains,
    clusters,
    conceptIndex,
    rewriteMap,
    allocation,
  });

  const expectedCount = clusters
    .filter((cluster) => selectedDomains.includes(cluster.domain))
    .reduce((sum, cluster) => sum + Number(allocation.clusterCounts[cluster.clusterKey] || 0), 0);
  if (templates.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} templates but generated ${templates.length}.`);
  }

  const domainSummary = {};
  for (const template of templates) {
    const domain = template.clusterKey.split("_")[0];
    domainSummary[domain] = (domainSummary[domain] || 0) + 1;
  }

  const output = {
    version: 2,
    generatedAt: new Date().toISOString(),
    domains: selectedDomains,
    templateCount: templates.length,
    domainSummary,
    templates,
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        outPath,
        domains: selectedDomains,
        templateCount: templates.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[template-regen-v2] ${error.message}`);
  process.exitCode = 1;
});
