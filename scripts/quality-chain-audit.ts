import { readFile } from "node:fs/promises";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

type Counts = {
  concepts: number;
  clusters: number;
  mapEntries: number;
  templates: number;
  lexemeEntries: number;
};

type FanoutStats = {
  min: number;
  p50: number;
  p90: number;
  max: number;
};

type ConcentrationStats = {
  top1: number;
  top5: number;
  top20: number;
};

type Metrics = {
  lexiconCoveragePct: number;
  mapFanout: FanoutStats;
  clusterConcentrationPct: ConcentrationStats;
  templateGenericActionSharePct: number;
  missionActionUniqueRatioPct: number;
  clusterConceptOverlapPct: number;
  domainMismatchCount: number;
};

type Guardrails = {
  pass: boolean;
  failedRules: string[];
  warnings: string[];
};

type Report = {
  counts: Counts;
  metrics: Metrics;
  guardrails: Guardrails;
};

type Baseline = {
  lexiconCoveragePct: number;
  targetLexiconCoveragePct: number;
  maxCoverageDropPct: number;
  templateGenericActionSharePct: number;
  maxGenericActionIncreasePct: number;
  missionActionUniqueRatioPct: number;
  maxUniqueRatioDropPct: number;
  top1ConcentrationPct: number;
  maxTop1ConcentrationIncreasePct: number;
};

const EPSILON = 1e-9;

const GENERIC_ACTION_MIN_REUSE_COUNT = 100;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    const str = asString(item);
    if (str) result.push(str);
  }
  return result;
}

function dedupeStrings(items: readonly string[]): string[] {
  return [...new Set(items)];
}

function round(value: number, digits = 2): number {
  const unit = 10 ** digits;
  return Math.round((value + Number.EPSILON) * unit) / unit;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return (part / whole) * 100;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (p <= 0) return sorted[0];
  if (p >= 1) return sorted[sorted.length - 1];

  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low];
  const weight = index - low;
  return sorted[low] + (sorted[high] - sorted[low]) * weight;
}

function domainFromConceptId(conceptId: string): string {
  return conceptId.split(".")[0] ?? "";
}

function domainFromClusterKey(clusterKey: string): string {
  return clusterKey.split("_")[0] ?? "";
}

function normalizeAction(action: string): string {
  return action.trim().replace(/\s+/g, " ").toLowerCase();
}

function intersectionSize<T>(a: Set<T>, b: Set<T>): number {
  let count = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const value of small) {
    if (large.has(value)) count += 1;
  }
  return count;
}

async function loadJson(relPath: string): Promise<unknown> {
  const absPath = path.resolve(process.cwd(), relPath);
  const raw = await readFile(absPath, "utf8");
  return JSON.parse(raw) as unknown;
}

function parseBaseline(value: unknown): Baseline {
  if (!isRecord(value)) {
    throw new Error("data/quality_baseline.json 루트가 객체가 아닙니다.");
  }

  const readNumber = (key: keyof Baseline): number => {
    const raw = value[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      throw new Error(`data/quality_baseline.json: ${String(key)}는 숫자여야 합니다.`);
    }
    return raw;
  };

  return {
    lexiconCoveragePct: readNumber("lexiconCoveragePct"),
    targetLexiconCoveragePct: readNumber("targetLexiconCoveragePct"),
    maxCoverageDropPct: readNumber("maxCoverageDropPct"),
    templateGenericActionSharePct: readNumber("templateGenericActionSharePct"),
    maxGenericActionIncreasePct: readNumber("maxGenericActionIncreasePct"),
    missionActionUniqueRatioPct: readNumber("missionActionUniqueRatioPct"),
    maxUniqueRatioDropPct: readNumber("maxUniqueRatioDropPct"),
    top1ConcentrationPct: readNumber("top1ConcentrationPct"),
    maxTop1ConcentrationIncreasePct: readNumber(
      "maxTop1ConcentrationIncreasePct",
    ),
  };
}

function lessThan(a: number, b: number): boolean {
  return a < b - EPSILON;
}

function greaterThan(a: number, b: number): boolean {
  return a > b + EPSILON;
}

async function main(): Promise<void> {
  const gateMode = process.argv.includes("--gate");

  const [
    conceptsJson,
    clustersJson,
    mapJson,
    templatesJson,
    lexiconJson,
    baselineJson,
  ] = await Promise.all([
    loadJson("data/concepts.json"),
    loadJson("data/clusters.json"),
    loadJson("data/concept_to_cluster.json"),
    loadJson("data/templates.json"),
    loadJson("data/lexicon.json"),
    loadJson("data/quality_baseline.json"),
  ]);

  const conceptsRoot = isRecord(conceptsJson) ? conceptsJson : {};
  const clustersRoot = isRecord(clustersJson) ? clustersJson : {};
  const mapRoot = isRecord(mapJson) ? mapJson : {};
  const templatesRoot = isRecord(templatesJson) ? templatesJson : {};
  const lexiconRoot = isRecord(lexiconJson) ? lexiconJson : {};

  const concepts = asArray(conceptsRoot.concepts);
  const clusters = asArray(clustersRoot.clusters);
  const mapEntries = asArray(mapRoot.map);
  const templates = asArray(templatesRoot.templates);
  const lexemeEntries = asArray(lexiconRoot.conceptLexemes);
  const ambiguousClusters = asStringArray(
    isRecord(mapRoot.defaults) ? mapRoot.defaults.ambiguousClusters : undefined,
  );

  const counts: Counts = {
    concepts: concepts.length,
    clusters: clusters.length,
    mapEntries: mapEntries.length,
    templates: templates.length,
    lexemeEntries: lexemeEntries.length,
  };

  const conceptDomainById = new Map<string, string>();
  for (const concept of concepts) {
    if (!isRecord(concept)) continue;
    const conceptId = asString(concept.conceptId);
    if (!conceptId) continue;

    const domain =
      asString(concept.domain)?.toUpperCase() ?? domainFromConceptId(conceptId);
    conceptDomainById.set(conceptId, domain);
  }

  const clusterDomainByKey = new Map<string, string>();
  for (const cluster of clusters) {
    if (!isRecord(cluster)) continue;
    const clusterKey = asString(cluster.clusterKey);
    if (!clusterKey) continue;

    const domain =
      asString(cluster.domain)?.toUpperCase() ?? domainFromClusterKey(clusterKey);
    clusterDomainByKey.set(clusterKey, domain);
  }

  const conceptSet = new Set(conceptDomainById.keys());
  const clusterSet = new Set(clusterDomainByKey.keys());

  const unknownRefs = new Set<string>();
  const domainMismatchPairs = new Set<string>();

  const declaredClusterConceptEdges = new Set<string>();
  for (const cluster of clusters) {
    if (!isRecord(cluster)) continue;
    const clusterKey = asString(cluster.clusterKey);
    if (!clusterKey) continue;

    for (const conceptId of asStringArray(cluster.concepts)) {
      declaredClusterConceptEdges.add(`${conceptId}|${clusterKey}`);

      if (!conceptSet.has(conceptId)) {
        unknownRefs.add(
          `clusters.json:${clusterKey}.concepts -> unknown conceptId(${conceptId})`,
        );
        continue;
      }

      if (!clusterSet.has(clusterKey)) {
        unknownRefs.add(
          `clusters.json:unknown clusterKey(${clusterKey}) in concepts reference`,
        );
        continue;
      }

      const conceptDomain = conceptDomainById.get(conceptId);
      const clusterDomain = clusterDomainByKey.get(clusterKey);
      if (conceptDomain && clusterDomain && conceptDomain !== clusterDomain) {
        domainMismatchPairs.add(`${conceptId}|${clusterKey}`);
      }
    }
  }

  for (const clusterKey of ambiguousClusters) {
    if (!clusterSet.has(clusterKey)) {
      unknownRefs.add(
        `concept_to_cluster.json:defaults.ambiguousClusters -> unknown clusterKey(${clusterKey})`,
      );
    }
  }

  const fanoutValues: number[] = [];
  const mapClusterEdgeCounts = new Map<string, number>();
  const mapEdgePairs = new Set<string>();

  for (const entry of mapEntries) {
    if (!isRecord(entry)) {
      fanoutValues.push(0);
      continue;
    }

    const conceptId = asString(entry.conceptId);
    const clusterKeys = dedupeStrings(asStringArray(entry.clusters));
    fanoutValues.push(clusterKeys.length);

    if (!conceptId) {
      unknownRefs.add("concept_to_cluster.json:map entry has invalid conceptId");
      continue;
    }

    if (!conceptSet.has(conceptId)) {
      unknownRefs.add(`concept_to_cluster.json:unknown conceptId(${conceptId})`);
      continue;
    }

    for (const clusterKey of clusterKeys) {
      if (!clusterSet.has(clusterKey)) {
        unknownRefs.add(
          `concept_to_cluster.json:${conceptId} -> unknown clusterKey(${clusterKey})`,
        );
        continue;
      }

      mapEdgePairs.add(`${conceptId}|${clusterKey}`);
      mapClusterEdgeCounts.set(
        clusterKey,
        (mapClusterEdgeCounts.get(clusterKey) ?? 0) + 1,
      );

      const conceptDomain = conceptDomainById.get(conceptId);
      const clusterDomain = clusterDomainByKey.get(clusterKey);
      if (conceptDomain && clusterDomain && conceptDomain !== clusterDomain) {
        domainMismatchPairs.add(`${conceptId}|${clusterKey}`);
      }
    }
  }

  const templateClusterConceptEdges = new Set<string>();
  const allMissionActions: string[] = [];

  for (const template of templates) {
    if (!isRecord(template)) continue;

    const templateId = asString(template.id) ?? "(unknown-template-id)";
    const clusterKey = asString(template.clusterKey);

    if (!clusterKey) {
      unknownRefs.add(`templates.json:${templateId} has invalid clusterKey`);
    } else if (!clusterSet.has(clusterKey)) {
      unknownRefs.add(
        `templates.json:${templateId} -> unknown clusterKey(${clusterKey})`,
      );
    }

    const templateConcepts = asStringArray(template.concepts);
    for (const conceptId of templateConcepts) {
      if (!clusterKey) continue;
      templateClusterConceptEdges.add(`${conceptId}|${clusterKey}`);

      if (!conceptSet.has(conceptId)) {
        unknownRefs.add(
          `templates.json:${templateId}.concepts -> unknown conceptId(${conceptId})`,
        );
        continue;
      }

      if (!clusterSet.has(clusterKey)) continue;

      const conceptDomain = conceptDomainById.get(conceptId);
      const clusterDomain = clusterDomainByKey.get(clusterKey);
      if (conceptDomain && clusterDomain && conceptDomain !== clusterDomain) {
        domainMismatchPairs.add(`${conceptId}|${clusterKey}`);
      }
    }

    for (const stateConceptId of asStringArray(template.states)) {
      if (!conceptSet.has(stateConceptId)) {
        unknownRefs.add(
          `templates.json:${templateId}.states -> unknown conceptId(${stateConceptId})`,
        );
      }
    }

    for (const mission of asArray(template.missions)) {
      if (!isRecord(mission)) continue;
      const action = asString(mission.action);
      if (action) allMissionActions.push(action);
    }
  }

  for (const entry of lexemeEntries) {
    if (!isRecord(entry)) continue;
    const conceptId = asString(entry.conceptId);
    if (!conceptId) {
      unknownRefs.add("lexicon.json:conceptLexemes entry has invalid conceptId");
      continue;
    }
    if (!conceptSet.has(conceptId)) {
      unknownRefs.add(`lexicon.json:unknown conceptId(${conceptId})`);
    }
  }

  const coveredConcepts = new Set<string>();
  for (const entry of lexemeEntries) {
    if (!isRecord(entry)) continue;
    const conceptId = asString(entry.conceptId);
    if (conceptId && conceptSet.has(conceptId)) {
      coveredConcepts.add(conceptId);
    }
  }

  const lexiconCoveragePct =
    conceptSet.size > 0 ? pct(coveredConcepts.size, conceptSet.size) : 100;

  const sortedFanout = [...fanoutValues].sort((a, b) => a - b);
  const mapFanout: FanoutStats = {
    min: round(sortedFanout[0] ?? 0),
    p50: round(percentile(sortedFanout, 0.5)),
    p90: round(percentile(sortedFanout, 0.9)),
    max: round(sortedFanout[sortedFanout.length - 1] ?? 0),
  };

  const sortedClusterEdgeCounts = [...mapClusterEdgeCounts.values()].sort(
    (a, b) => b - a,
  );
  const totalMapEdges = sortedClusterEdgeCounts.reduce((sum, v) => sum + v, 0);
  const topShare = (n: number): number => {
    if (totalMapEdges === 0) return 0;
    const topSum = sortedClusterEdgeCounts
      .slice(0, n)
      .reduce((sum, v) => sum + v, 0);
    return pct(topSum, totalMapEdges);
  };

  const clusterConcentrationPct: ConcentrationStats = {
    top1: round(topShare(1)),
    top5: round(topShare(5)),
    top20: round(topShare(20)),
  };

  const normalizedMissionActions = allMissionActions.map((a) => normalizeAction(a));
  const actionFrequency = new Map<string, number>();
  for (const action of normalizedMissionActions) {
    actionFrequency.set(action, (actionFrequency.get(action) ?? 0) + 1);
  }

  let genericActionCount = 0;
  for (const action of normalizedMissionActions) {
    if ((actionFrequency.get(action) ?? 0) >= GENERIC_ACTION_MIN_REUSE_COUNT) {
      genericActionCount += 1;
    }
  }

  const templateGenericActionSharePct =
    allMissionActions.length > 0
      ? pct(genericActionCount, allMissionActions.length)
      : 0;

  const uniqueActions = new Set(normalizedMissionActions);
  const missionActionUniqueRatioPct =
    allMissionActions.length > 0
      ? pct(uniqueActions.size, allMissionActions.length)
      : 100;

  const overlapUnion = new Set<string>([
    ...declaredClusterConceptEdges,
    ...templateClusterConceptEdges,
  ]);
  const overlapIntersection = intersectionSize(
    declaredClusterConceptEdges,
    templateClusterConceptEdges,
  );
  const clusterConceptOverlapPct =
    overlapUnion.size > 0 ? pct(overlapIntersection, overlapUnion.size) : 100;

  const metrics: Metrics = {
    lexiconCoveragePct: round(lexiconCoveragePct),
    mapFanout,
    clusterConcentrationPct,
    templateGenericActionSharePct: round(templateGenericActionSharePct),
    missionActionUniqueRatioPct: round(missionActionUniqueRatioPct),
    clusterConceptOverlapPct: round(clusterConceptOverlapPct),
    domainMismatchCount: domainMismatchPairs.size,
  };

  const baseline = parseBaseline(baselineJson);

  const failedRules: string[] = [];
  const warnings: string[] = [];

  if (unknownRefs.size > 0) {
    failedRules.push(
      `unknown 참조 발견: ${unknownRefs.size}건 (예: ${[...unknownRefs][0]})`,
    );
  }

  if (lessThan(metrics.clusterConceptOverlapPct, 100)) {
    failedRules.push(
      `clusterConceptOverlapPct ${metrics.clusterConceptOverlapPct}% < 100%`,
    );
  }

  if (metrics.domainMismatchCount > 0) {
    failedRules.push(`domainMismatchCount ${metrics.domainMismatchCount} > 0`);
  }

  if (
    lessThan(
      metrics.lexiconCoveragePct,
      baseline.lexiconCoveragePct - baseline.maxCoverageDropPct,
    )
  ) {
    failedRules.push(
      `lexiconCoveragePct ${metrics.lexiconCoveragePct}% < baseline(${baseline.lexiconCoveragePct}%) - drop(${baseline.maxCoverageDropPct}%)`,
    );
  }

  if (
    greaterThan(
      metrics.templateGenericActionSharePct,
      baseline.templateGenericActionSharePct +
        baseline.maxGenericActionIncreasePct,
    )
  ) {
    failedRules.push(
      `templateGenericActionSharePct ${metrics.templateGenericActionSharePct}% > baseline(${baseline.templateGenericActionSharePct}%) + increase(${baseline.maxGenericActionIncreasePct}%)`,
    );
  }

  if (
    lessThan(
      metrics.missionActionUniqueRatioPct,
      baseline.missionActionUniqueRatioPct - baseline.maxUniqueRatioDropPct,
    )
  ) {
    failedRules.push(
      `missionActionUniqueRatioPct ${metrics.missionActionUniqueRatioPct}% < baseline(${baseline.missionActionUniqueRatioPct}%) - drop(${baseline.maxUniqueRatioDropPct}%)`,
    );
  }

  if (
    greaterThan(
      metrics.clusterConcentrationPct.top1,
      baseline.top1ConcentrationPct + baseline.maxTop1ConcentrationIncreasePct,
    )
  ) {
    failedRules.push(
      `clusterConcentrationPct.top1 ${metrics.clusterConcentrationPct.top1}% > baseline(${baseline.top1ConcentrationPct}%) + increase(${baseline.maxTop1ConcentrationIncreasePct}%)`,
    );
  }

  if (lessThan(metrics.lexiconCoveragePct, baseline.targetLexiconCoveragePct)) {
    warnings.push(
      `lexiconCoveragePct ${metrics.lexiconCoveragePct}% < targetLexiconCoveragePct ${baseline.targetLexiconCoveragePct}%`,
    );
  }

  const guardrails: Guardrails = {
    pass: failedRules.length === 0,
    failedRules,
    warnings,
  };

  const report: Report = {
    counts,
    metrics,
    guardrails,
  };

  console.log("dataset:quality summary");
  console.log(`- mode: ${gateMode ? "gate" : "report"}`);
  console.log(`- counts: ${JSON.stringify(counts)}`);
  console.log(
    `- lexiconCoveragePct: ${metrics.lexiconCoveragePct}% (covered=${coveredConcepts.size}/${conceptSet.size})`,
  );
  console.log(
    `- mapFanout: min=${metrics.mapFanout.min}, p50=${metrics.mapFanout.p50}, p90=${metrics.mapFanout.p90}, max=${metrics.mapFanout.max}`,
  );
  console.log(
    `- clusterConcentrationPct: top1=${metrics.clusterConcentrationPct.top1}%, top5=${metrics.clusterConcentrationPct.top5}%, top20=${metrics.clusterConcentrationPct.top20}%`,
  );
  console.log(
    `- templateGenericActionSharePct: ${metrics.templateGenericActionSharePct}% (${genericActionCount}/${allMissionActions.length})`,
  );
  console.log(
    `- missionActionUniqueRatioPct: ${metrics.missionActionUniqueRatioPct}% (${uniqueActions.size}/${allMissionActions.length})`,
  );
  console.log(`- clusterConceptOverlapPct: ${metrics.clusterConceptOverlapPct}%`);
  console.log(`- domainMismatchCount: ${metrics.domainMismatchCount}`);
  console.log(`- unknownReferences: ${unknownRefs.size}`);
  console.log(
    `- guardrails: ${guardrails.pass ? "PASS" : "FAIL"} (failed=${guardrails.failedRules.length}, warnings=${guardrails.warnings.length})`,
  );

  if (unknownRefs.size > 0) {
    const unknownSample = [...unknownRefs].slice(0, 10);
    for (const item of unknownSample) {
      console.log(`  - unknown: ${item}`);
    }
    if (unknownRefs.size > unknownSample.length) {
      console.log(
        `  - unknown: ... ${unknownRefs.size - unknownSample.length} more`,
      );
    }
  }

  console.log(JSON.stringify(report));

  if (gateMode && !guardrails.pass) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[dataset:quality] fatal: ${message}`);
  process.exitCode = 1;
});
