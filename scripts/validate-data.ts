import { readFile } from "node:fs/promises";
import path from "node:path";

type IssueLevel = "error" | "warn";

type Issue = {
  level: IssueLevel;
  code: string;
  message: string;
};

const START_ACTION_TOKENS = [
  "시작",
  "준비",
  "세팅",
  "열기",
  "켜기",
  "모으기",
  "꺼내기",
  "범위 정하기",
  "타이머 시작",
  "착수",
] as const;

const END_ACTION_TOKENS = [
  "완료",
  "마무리",
  "저장",
  "제출",
  "전송",
  "정리",
  "닫기",
  "끄기",
  "기록",
  "앱에서 완료",
  "종료",
] as const;

const BANNED_ACTION_SUBSTRINGS = [
  "종료:",
  "리마인더",
  "다음 액션 기록",
  "정리(최소한)",
  "대충",
  "개기/정리",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function includesAnyToken(text: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => text.includes(token));
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

  const [templatesJson, conceptsJson, clustersJson, mappingJson, lexiconJson] =
    await Promise.all([
      loadJsonFile("data/templates.json", issues),
      loadJsonFile("data/concepts.json", issues),
      loadJsonFile("data/clusters.json", issues),
      loadJsonFile("data/concept_to_cluster.json", issues),
      loadJsonFile("data/lexicon.json", issues),
    ]);

  const templatesRoot = isRecord(templatesJson) ? templatesJson : undefined;
  const conceptsRoot = isRecord(conceptsJson) ? conceptsJson : undefined;
  const clustersRoot = isRecord(clustersJson) ? clustersJson : undefined;
  const mappingRoot = isRecord(mappingJson) ? mappingJson : undefined;
  const lexiconRoot = isRecord(lexiconJson) ? lexiconJson : undefined;

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

    const pattern = /^[A-Z][A-Z0-9_]+$/;
    if (!pattern.test(cl.clusterKey)) {
      issues.push({
        level: "warn",
        code: "CLUSTER_KEY_PATTERN",
        message: `clusterKey 패턴 경고: ${cl.clusterKey} (권장: ^[A-Z][A-Z0-9_]+$)`,
      });
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
    if (missions.length < 3 || missions.length > 6) {
      issues.push({
        level: "error",
        code: "TEMPLATE_MISSIONS_COUNT",
        message: `template ${templateId}: missions 개수는 3~6이어야 합니다 (현재 ${missions.length}).`,
      });
    }

    let missionSum = 0;
    const missionActionsByIndex: (string | undefined)[] = new Array(
      missions.length,
    );
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
      } else {
        const action = m.action;
        missionActionsByIndex[i] = action;
        for (const banned of BANNED_ACTION_SUBSTRINGS) {
          if (action.includes(banned)) {
            issues.push({
              level: "error",
              code: "BANNED_ACTION_SUBSTRING",
              message: `template ${templateId}: missions[${i}].action에 금지 substring 포함: ${JSON.stringify(banned)}`,
            });
          }
        }
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
        if (!(min <= def && def <= max)) {
          issues.push({
            level: "error",
            code: "TIME_ORDER",
            message: `template ${templateId}: time.min <= time.default <= time.max 를 만족해야 합니다 (min=${min}, default=${def}, max=${max}).`,
          });
        }
        if (missionSum !== def) {
          issues.push({
            level: "error",
            code: "TIME_DEFAULT_MISMATCH",
            message: `template ${templateId}: sum(missions.estMin) == time.default 여야 합니다 (sum=${missionSum}, default=${def}).`,
          });
        }
      }
    }

    // 시작/종료 휴리스틱
    if (missions.length >= 2) {
      const firstAction = (missionActionsByIndex[0] ?? "").trim();
      const lastAction = (
        missionActionsByIndex[missionActionsByIndex.length - 1] ?? ""
      ).trim();

      const firstHasStart = includesAnyToken(firstAction, START_ACTION_TOKENS);
      const firstHasEnd = includesAnyToken(firstAction, END_ACTION_TOKENS);
      const lastHasStart = includesAnyToken(lastAction, START_ACTION_TOKENS);
      const lastHasEnd = includesAnyToken(lastAction, END_ACTION_TOKENS);

      if (!firstHasStart) {
        issues.push({
          level: "error",
          code: "START_HEURISTIC",
          message: `template ${templateId}: missions[0].action은 시작 토큰을 1개 이상 포함해야 합니다.`,
        });
      }
      if (!lastHasEnd) {
        issues.push({
          level: "error",
          code: "END_HEURISTIC",
          message: `template ${templateId}: missions[last].action은 종료 토큰을 1개 이상 포함해야 합니다.`,
        });
      }
      if (firstHasEnd && !firstHasStart) {
        issues.push({
          level: "error",
          code: "START_END_INVERSION",
          message: `template ${templateId}: 시작 미션이 종료 토큰만 포함합니다.`,
        });
      }
      if (lastHasStart && !lastHasEnd) {
        issues.push({
          level: "error",
          code: "START_END_INVERSION",
          message: `template ${templateId}: 종료 미션이 시작 토큰만 포함합니다.`,
        });
      }
      if (firstAction.length > 0 && firstAction === lastAction) {
        issues.push({
          level: "error",
          code: "START_END_DUPLICATE",
          message: `template ${templateId}: 첫 미션/마지막 미션 문장이 동일합니다.`,
        });
      }
    } else if (missions.length > 0) {
      issues.push({
        level: "error",
        code: "START_END_HEURISTIC_SKIPPED",
        message: `template ${templateId}: missions가 2개 미만이라 시작/종료 휴리스틱을 적용할 수 없습니다.`,
      });
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
