import { readFile } from "node:fs/promises";
import path from "node:path";

type IssueLevel = "error" | "warn";

type Issue = {
  level: IssueLevel;
  code: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string");
}

function formatIssue(issue: Issue): string {
  const prefix = issue.level === "error" ? "ERROR" : "WARN";
  return `[${prefix}] ${issue.code}: ${issue.message}`;
}

async function loadJsonFile(
  relPath: string,
  issues: Issue[],
): Promise<unknown | undefined> {
  const absPath = path.resolve(process.cwd(), relPath);
  try {
    const raw = await readFile(absPath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    issues.push({
      level: "error",
      code: "FILE_LOAD_FAILED",
      message: `${relPath} 읽기/파싱 실패: ${msg}`,
    });
    return undefined;
  }
}

function checkDuplicates(
  name: string,
  ids: string[],
  issues: Issue[],
): { uniqueCount: number } {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);

  for (const [id, count] of counts.entries()) {
    if (count > 1) {
      issues.push({
        level: "error",
        code: "DUPLICATE_ID",
        message: `${name} 중복: ${id} (x${count})`,
      });
    }
  }

  return { uniqueCount: counts.size };
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function main(): Promise<void> {
  const issues: Issue[] = [];

  const [
    templatesJson,
    conceptsJson,
    clustersJson,
    mappingJson,
    lexiconJson,
    validationRulesJson,
  ] = await Promise.all([
      loadJsonFile("data/templates.json", issues),
      loadJsonFile("data/concepts.json", issues),
      loadJsonFile("data/clusters.json", issues),
      loadJsonFile("data/concept_to_cluster.json", issues),
      loadJsonFile("data/lexicon.json", issues),
      loadJsonFile("data/validation_rules.json", issues),
    ]);

  const templatesRoot = isRecord(templatesJson) ? templatesJson : undefined;
  const conceptsRoot = isRecord(conceptsJson) ? conceptsJson : undefined;
  const clustersRoot = isRecord(clustersJson) ? clustersJson : undefined;
  const mappingRoot = isRecord(mappingJson) ? mappingJson : undefined;
  const lexiconRoot = isRecord(lexiconJson) ? lexiconJson : undefined;
  const rulesRoot = isRecord(validationRulesJson)
    ? validationRulesJson
    : undefined;

  if (!templatesRoot)
    issues.push({
      level: "error",
      code: "SCHEMA_INVALID",
      message: "data/templates.json: 루트가 객체가 아닙니다.",
    });
  if (!conceptsRoot)
    issues.push({
      level: "error",
      code: "SCHEMA_INVALID",
      message: "data/concepts.json: 루트가 객체가 아닙니다.",
    });
  if (!clustersRoot)
    issues.push({
      level: "error",
      code: "SCHEMA_INVALID",
      message: "data/clusters.json: 루트가 객체가 아닙니다.",
    });
  if (!mappingRoot)
    issues.push({
      level: "error",
      code: "SCHEMA_INVALID",
      message: "data/concept_to_cluster.json: 루트가 객체가 아닙니다.",
    });
  if (!lexiconRoot)
    issues.push({
      level: "error",
      code: "SCHEMA_INVALID",
      message: "data/lexicon.json: 루트가 객체가 아닙니다.",
    });
  if (!rulesRoot)
    issues.push({
      level: "error",
      code: "SCHEMA_INVALID",
      message: "data/validation_rules.json: 루트가 객체가 아닙니다.",
    });

  const templateRules = isRecord(rulesRoot?.templateRules)
    ? rulesRoot?.templateRules
    : undefined;
  const missionsMin =
    typeof templateRules?.missionsMin === "number" &&
    Number.isInteger(templateRules.missionsMin)
      ? templateRules.missionsMin
      : undefined;
  const missionsMaxRaw = templateRules?.missionsMax;
  const missionsMax =
    missionsMaxRaw === null
      ? null
      : typeof missionsMaxRaw === "number" && Number.isInteger(missionsMaxRaw)
      ? missionsMaxRaw
      : undefined;
  const mustMatchTimeDefaultExactly =
    typeof templateRules?.mustMatchTimeDefaultExactly === "boolean"
      ? templateRules.mustMatchTimeDefaultExactly
      : undefined;
  const mustSatisfyTimeOrder =
    typeof templateRules?.mustSatisfyTimeOrder === "boolean"
      ? templateRules.mustSatisfyTimeOrder
      : undefined;
  const clusterKeyForbiddenTokens = safeStringArray(
    rulesRoot?.clusterKeyForbiddenTokens,
  );
  const clusterKeyForbiddenSegmentPatterns = safeStringArray(
    rulesRoot?.clusterKeyForbiddenSegmentPatterns,
  );

  const clusterKeyPattern =
    typeof rulesRoot?.clusterKeyPattern === "string"
      ? rulesRoot.clusterKeyPattern
      : undefined;

  if (!templateRules) {
    issues.push({
      level: "error",
      code: "RULES_INVALID",
      message: "data/validation_rules.json: templateRules가 객체가 아닙니다.",
    });
  }
  if (missionsMin === undefined) {
    issues.push({
      level: "error",
      code: "RULES_INVALID",
      message:
        "data/validation_rules.json: templateRules.missionsMin은 필수 정수여야 합니다.",
    });
  }
  if (missionsMax === undefined) {
    issues.push({
      level: "error",
      code: "RULES_INVALID",
      message:
        "data/validation_rules.json: templateRules.missionsMax는 정수 또는 null이어야 합니다.",
    });
  }
  if (
    mustMatchTimeDefaultExactly === undefined ||
    mustSatisfyTimeOrder === undefined
  ) {
    issues.push({
      level: "error",
      code: "RULES_INVALID",
      message:
        "data/validation_rules.json: templateRules.mustMatchTimeDefaultExactly/mustSatisfyTimeOrder가 boolean이 아닙니다.",
    });
  }
  if (!clusterKeyPattern) {
    issues.push({
      level: "error",
      code: "RULES_INVALID",
      message: "data/validation_rules.json: clusterKeyPattern이 문자열이 아닙니다.",
    });
  }

  if (templatesRoot && !Array.isArray(templatesRoot.templates)) {
    issues.push({
      level: "error",
      code: "SCHEMA_INVALID",
      message: "data/templates.json: templates가 배열이 아닙니다.",
    });
  }
  if (conceptsRoot && !Array.isArray(conceptsRoot.concepts)) {
    issues.push({
      level: "error",
      code: "SCHEMA_INVALID",
      message: "data/concepts.json: concepts가 배열이 아닙니다.",
    });
  }
  if (clustersRoot && !Array.isArray(clustersRoot.clusters)) {
    issues.push({
      level: "error",
      code: "SCHEMA_INVALID",
      message: "data/clusters.json: clusters가 배열이 아닙니다.",
    });
  }
  if (mappingRoot && !Array.isArray(mappingRoot.map)) {
    issues.push({
      level: "error",
      code: "SCHEMA_INVALID",
      message: "data/concept_to_cluster.json: map이 배열이 아닙니다.",
    });
  }
  if (lexiconRoot && !Array.isArray(lexiconRoot.conceptLexemes)) {
    issues.push({
      level: "error",
      code: "SCHEMA_INVALID",
      message: "data/lexicon.json: conceptLexemes가 배열이 아닙니다.",
    });
  }

  const templates = safeArray(templatesRoot?.templates);
  const concepts = safeArray(conceptsRoot?.concepts);
  const clusters = safeArray(clustersRoot?.clusters);
  const mapEntries = safeArray(mappingRoot?.map);
  const conceptLexemes = safeArray(lexiconRoot?.conceptLexemes);

  const templateIds: string[] = [];
  const conceptIds: string[] = [];
  const clusterKeys: string[] = [];

  for (const c of concepts) {
    if (!isRecord(c) || !isNonEmptyString(c.conceptId)) {
      issues.push({
        level: "error",
        code: "CONCEPT_ID_INVALID",
        message: `data/concepts.json: conceptId가 유효하지 않습니다: ${JSON.stringify(c)}`,
      });
      continue;
    }
    conceptIds.push(c.conceptId);
  }

  for (const cl of clusters) {
    if (!isRecord(cl) || !isNonEmptyString(cl.clusterKey)) {
      issues.push({
        level: "error",
        code: "CLUSTER_KEY_INVALID",
        message: `data/clusters.json: clusterKey가 유효하지 않습니다: ${JSON.stringify(cl)}`,
      });
      continue;
    }
    clusterKeys.push(cl.clusterKey);

    const pattern = clusterKeyPattern ? new RegExp(clusterKeyPattern) : undefined;
    if (pattern && !pattern.test(cl.clusterKey)) {
      issues.push({
        level: "error",
        code: "CLUSTER_KEY_PATTERN",
        message: `clusterKey 패턴 위반: ${cl.clusterKey} (pattern=${clusterKeyPattern})`,
      });
    }

    const segments = cl.clusterKey.split("_").filter((s: string) => s.length > 0);
    for (const seg of segments) {
      if (clusterKeyForbiddenTokens.includes(seg)) {
        issues.push({
          level: "error",
          code: "CLUSTER_KEY_FORBIDDEN_TOKEN",
          message: `clusterKey 금지 토큰 포함: ${cl.clusterKey} (segment=${seg})`,
        });
      }
      for (const pat of clusterKeyForbiddenSegmentPatterns) {
        try {
          if (new RegExp(pat).test(seg)) {
            issues.push({
              level: "error",
              code: "CLUSTER_KEY_FORBIDDEN_SEGMENT",
              message: `clusterKey 금지 세그먼트 패턴 매칭: ${cl.clusterKey} (segment=${seg}, pattern=${pat})`,
            });
          }
        } catch {
          issues.push({
            level: "error",
            code: "RULES_INVALID",
            message: `data/validation_rules.json: clusterKeyForbiddenSegmentPatterns 정규식이 유효하지 않습니다: ${JSON.stringify(pat)}`,
          });
        }
      }
    }
  }

  for (const t of templates) {
    if (!isRecord(t) || !isNonEmptyString(t.id)) {
      issues.push({
        level: "error",
        code: "TEMPLATE_ID_INVALID",
        message: `data/templates.json: template.id가 유효하지 않습니다: ${JSON.stringify(t)}`,
      });
      continue;
    }
    templateIds.push(t.id);
  }

  checkDuplicates("templates.id", templateIds, issues);
  checkDuplicates("concepts.conceptId", conceptIds, issues);
  checkDuplicates("clusters.clusterKey", clusterKeys, issues);

  const conceptIdSet = new Set(conceptIds);
  const clusterKeySet = new Set(clusterKeys);

  // 1) 참조 무결성 + 2) templates 품질
  for (const t of templates) {
    if (!isRecord(t) || !isNonEmptyString(t.id)) continue;
    const templateId = t.id;

    if (!isNonEmptyString(t.clusterKey)) {
      issues.push({
        level: "error",
        code: "TEMPLATE_CLUSTERKEY_INVALID",
        message: `template ${templateId}: clusterKey가 유효하지 않습니다.`,
      });
    } else if (!clusterKeySet.has(t.clusterKey)) {
      issues.push({
        level: "error",
        code: "REF_INTEGRITY",
        message: `template ${templateId}: clusterKey가 clusters에 없습니다: ${t.clusterKey}`,
      });
    }

    const conceptsArr = safeArray(t.concepts);
    if (conceptsArr.length === 0) {
      issues.push({
        level: "error",
        code: "TEMPLATE_CONCEPTS_EMPTY",
        message: `template ${templateId}: concepts가 비어 있습니다.`,
      });
    }
    if (conceptsArr.length > 5) {
      issues.push({
        level: "warn",
        code: "TEMPLATE_CONCEPTS_TOO_MANY",
        message: `template ${templateId}: concepts가 5개를 초과합니다 (${conceptsArr.length}).`,
      });
    }
    for (const conceptId of conceptsArr) {
      if (!isNonEmptyString(conceptId)) {
        issues.push({
          level: "error",
          code: "TEMPLATE_CONCEPT_INVALID",
          message: `template ${templateId}: concepts 원소가 문자열이 아닙니다: ${JSON.stringify(conceptId)}`,
        });
        continue;
      }
      if (!conceptIdSet.has(conceptId)) {
        issues.push({
          level: "error",
          code: "REF_INTEGRITY",
          message: `template ${templateId}: concepts에 concepts.json에 없는 conceptId가 있습니다: ${conceptId}`,
        });
      }
    }

    const statesArr = safeArray(t.states);
    for (const stateConceptId of statesArr) {
      if (!isNonEmptyString(stateConceptId)) {
        issues.push({
          level: "error",
          code: "TEMPLATE_STATE_INVALID",
          message: `template ${templateId}: states 원소가 문자열이 아닙니다: ${JSON.stringify(stateConceptId)}`,
        });
        continue;
      }
      if (!conceptIdSet.has(stateConceptId)) {
        issues.push({
          level: "error",
          code: "REF_INTEGRITY",
          message: `template ${templateId}: states에 concepts.json에 없는 conceptId가 있습니다: ${stateConceptId}`,
        });
      }
    }

    const missions = safeArray(t.missions);
    if (missionsMin !== undefined && missions.length < missionsMin) {
      issues.push({
        level: "error",
        code: "TEMPLATE_MISSIONS_COUNT_MIN",
        message: `template ${templateId}: missions 개수는 최소 ${missionsMin}개 이상이어야 합니다 (현재 ${missions.length}).`,
      });
    }
    if (
      missionsMax !== undefined &&
      missionsMax !== null &&
      missions.length > missionsMax
    ) {
      issues.push({
        level: "error",
        code: "TEMPLATE_MISSIONS_COUNT_MAX",
        message: `template ${templateId}: missions 개수는 최대 ${missionsMax}개 이하여야 합니다 (현재 ${missions.length}).`,
      });
    }

    let missionSum = 0;
    for (let i = 0; i < missions.length; i++) {
      const m = missions[i];
      if (!isRecord(m)) {
        issues.push({
          level: "error",
          code: "MISSION_INVALID",
          message: `template ${templateId}: missions[${i}]가 객체가 아닙니다.`,
        });
        continue;
      }

      if (!isNonEmptyString(m.action)) {
        issues.push({
          level: "error",
          code: "MISSION_ACTION_INVALID",
          message: `template ${templateId}: missions[${i}].action이 유효하지 않습니다.`,
        });
      }

      if (!isPositiveInteger(m.estMin)) {
        issues.push({
          level: "error",
          code: "MISSION_ESTMIN_INVALID",
          message: `template ${templateId}: missions[${i}].estMin은 양의 정수여야 합니다.`,
        });
      } else {
        missionSum += m.estMin;
        if (m.estMin > 30) {
          issues.push({
            level: "warn",
            code: "MISSION_ESTMIN_LARGE",
            message: `template ${templateId}: missions[${i}].estMin이 30을 초과합니다 (${m.estMin}).`,
          });
        }
      }
    }

    const timeObj = isRecord(t.time) ? t.time : undefined;
    const min = timeObj?.min;
    const max = timeObj?.max;
    const def = timeObj?.default;
    if (!timeObj) {
      issues.push({
        level: "error",
        code: "TIME_INVALID",
        message: `template ${templateId}: time이 객체가 아닙니다.`,
      });
    } else {
      if (!isPositiveInteger(min) || !isPositiveInteger(max) || !isPositiveInteger(def)) {
        issues.push({
          level: "error",
          code: "TIME_NOT_POSITIVE_INT",
          message: `template ${templateId}: time.min/max/default는 모두 양의 정수여야 합니다.`,
        });
      } else {
        if (mustSatisfyTimeOrder && !(min <= def && def <= max)) {
          issues.push({
            level: "error",
            code: "TIME_ORDER",
            message: `template ${templateId}: time.min <= time.default <= time.max 를 만족해야 합니다 (min=${min}, default=${def}, max=${max}).`,
          });
        }
        if (mustMatchTimeDefaultExactly && missionSum !== def) {
          issues.push({
            level: "error",
            code: "TIME_DEFAULT_MISMATCH",
            message: `template ${templateId}: sum(missions.estMin) == time.default 여야 합니다 (sum=${missionSum}, default=${def}).`,
          });
        }
      }
    }

    const templateType = isNonEmptyString(t.type) ? t.type : "";
    if (templateType === "friction" && statesArr.length === 0) {
      issues.push({
        level: "warn",
        code: "FRICTION_WITHOUT_STATE",
        message: `template ${templateId}: friction 타입인데 states가 비어 있습니다.`,
      });
    }
    if (templateType !== "friction" && statesArr.length > 0) {
      issues.push({
        level: "warn",
        code: "NON_FRICTION_WITH_STATE",
        message: `template ${templateId}: friction 타입이 아닌데 states가 존재합니다.`,
      });
    }
  }

  // 1) 참조 무결성: concept_to_cluster.map
  for (let i = 0; i < mapEntries.length; i++) {
    const entry = mapEntries[i];
    if (!isRecord(entry)) {
      issues.push({
        level: "error",
        code: "CONCEPT_TO_CLUSTER_ENTRY_INVALID",
        message: `concept_to_cluster.map[${i}]가 객체가 아닙니다.`,
      });
      continue;
    }

    const conceptId = entry.conceptId;
    if (!isNonEmptyString(conceptId)) {
      issues.push({
        level: "error",
        code: "CONCEPT_TO_CLUSTER_CONCEPTID_INVALID",
        message: `concept_to_cluster.map[${i}].conceptId가 유효하지 않습니다.`,
      });
    } else if (!conceptIdSet.has(conceptId)) {
      issues.push({
        level: "error",
        code: "REF_INTEGRITY",
        message: `concept_to_cluster.map[${i}]: concepts.json에 없는 conceptId: ${conceptId}`,
      });
    }

    const clustersArr = safeArray(entry.clusters);
    for (const ck of clustersArr) {
      if (!isNonEmptyString(ck)) {
        issues.push({
          level: "error",
          code: "CONCEPT_TO_CLUSTER_CLUSTERKEY_INVALID",
          message: `concept_to_cluster.map[${i}].clusters 원소가 문자열이 아닙니다: ${JSON.stringify(ck)}`,
        });
        continue;
      }
      if (!clusterKeySet.has(ck)) {
        issues.push({
          level: "error",
          code: "REF_INTEGRITY",
          message: `concept_to_cluster.map[${i}]: clusters.json에 없는 clusterKey: ${ck}`,
        });
      }
    }
  }

  // 1) 참조 무결성: lexicon.conceptLexemes
  for (let i = 0; i < conceptLexemes.length; i++) {
    const entry = conceptLexemes[i];
    if (!isRecord(entry)) {
      issues.push({
        level: "error",
        code: "LEXEME_INVALID",
        message: `lexicon.conceptLexemes[${i}]가 객체가 아닙니다.`,
      });
      continue;
    }

    const conceptId = entry.conceptId;
    if (!isNonEmptyString(conceptId)) {
      issues.push({
        level: "error",
        code: "LEXEME_CONCEPTID_INVALID",
        message: `lexicon.conceptLexemes[${i}].conceptId가 유효하지 않습니다.`,
      });
      continue;
    }
    if (!conceptIdSet.has(conceptId)) {
      issues.push({
        level: "error",
        code: "REF_INTEGRITY",
        message: `lexicon.conceptLexemes[${i}]: concepts.json에 없는 conceptId: ${conceptId}`,
      });
    }
  }

  // 출력
  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warn");

  const maxIssueLines = 200;
  let printed = 0;
  for (const issue of issues) {
    if (printed >= maxIssueLines) break;
    const line = formatIssue(issue);
    if (issue.level === "error") console.error(line);
    else console.warn(line);
    printed++;
  }
  if (issues.length > maxIssueLines) {
    console.error(
      `[ERROR] ISSUE_TRUNCATED: 이슈가 너무 많아 ${maxIssueLines}개만 출력했습니다 (총 ${issues.length}개).`,
    );
  }

  console.log("dataset:validate summary");
  console.log(`- templates: ${templates.length}`);
  console.log(`- concepts: ${concepts.length}`);
  console.log(`- clusters: ${clusters.length}`);
  console.log(`- concept_to_cluster.map: ${mapEntries.length}`);
  console.log(`- lexicon.conceptLexemes: ${conceptLexemes.length}`);
  console.log(`- errors: ${errors.length}, warnings: ${warns.length}`);

  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  const msg = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[ERROR] UNHANDLED: ${msg}`);
  process.exitCode = 1;
});
