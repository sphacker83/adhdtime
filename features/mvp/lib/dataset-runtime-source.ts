import clustersJson from "@/data/clusters.json";
import conceptToClusterJson from "@/data/concept_to_cluster.json";
import conceptsJson from "@/data/concepts.json";
import lexiconJson from "@/data/lexicon.json";
import templatesJson from "@/data/templates.json";

export interface DatasetCluster {
  clusterKey: string;
  domain: string;
  primaryType: string;
  label: string;
  description?: string;
  concepts: string[];
  defaultTimeBands?: number[];
  variantAxes?: {
    intensity?: string[];
    context?: string[];
    goalFocus?: string[];
    stateMode?: string[];
  };
}

export interface DatasetConcept {
  conceptId: string;
  type: string;
  domain: string;
  priority: number;
  label: string;
  description?: string;
  parentConceptId?: string;
  tags: string[];
}

export interface DatasetConceptClusterMapEntry {
  conceptId: string;
  clusters: string[];
}

export interface DatasetTemplateMission {
  action: string;
  estMin: number;
}

export interface DatasetTemplate {
  id: string;
  clusterKey: string;
  type: string;
  title: string;
  concepts: string[];
  contexts: string[];
  states: string[];
  time: {
    min: number;
    max: number;
    default: number;
  };
  missions: DatasetTemplateMission[];
  meta?: {
    intensity?: string;
    goalFocus?: string;
    contextVariant?: string;
    stateMode?: string;
  };
}

export interface DatasetLexiconConceptLexeme {
  conceptId: string;
  keywords: string[];
  variants: string[];
  patterns: string[];
  negativePatterns?: string[];
}

export interface DatasetLexicon {
  version: number;
  language: string;
  normalization: {
    lowercase: boolean;
    collapseSpaces: boolean;
    removeFillers: boolean;
  };
  fillers: string[];
  typos: Record<string, string>;
  timeHints: {
    minsPatterns: string[];
    rangePatterns: string[];
    quickTokens: string[];
    deepTokens: string[];
    nowTokens: string[];
  };
  contextHints: Record<string, string[]>;
  stateHints: Record<string, string[]>;
  conceptLexemes: DatasetLexiconConceptLexeme[];
  aliases: {
    conceptAlias: Record<string, string[]>;
  };
}

interface DatasetTitleExactMatchIndex {
  byNormalized: Map<string, readonly string[]>;
  byCompact: Map<string, readonly string[]>;
}

export interface DatasetRuntimeSource {
  clusters: readonly DatasetCluster[];
  concepts: readonly DatasetConcept[];
  mappings: readonly DatasetConceptClusterMapEntry[];
  templates: readonly DatasetTemplate[];
  lexicon: DatasetLexicon;
  clusterByKey: ReadonlyMap<string, DatasetCluster>;
  conceptById: ReadonlyMap<string, DatasetConcept>;
  conceptToClusters: ReadonlyMap<string, readonly string[]>;
  templateById: ReadonlyMap<string, DatasetTemplate>;
  templatesByCluster: ReadonlyMap<string, readonly DatasetTemplate[]>;
  lexemeByConcept: ReadonlyMap<string, DatasetLexiconConceptLexeme>;
  templateTitleIndex: DatasetTitleExactMatchIndex;
}

function normalizeLookupText(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, " ");
}

function buildTemplateTitleIndex(templates: readonly DatasetTemplate[]): DatasetTitleExactMatchIndex {
  const mutableByNormalized = new Map<string, string[]>();
  const mutableByCompact = new Map<string, string[]>();

  templates.forEach((template) => {
    const normalizedTitle = normalizeLookupText(template.title);
    if (!normalizedTitle) {
      return;
    }

    const compactTitle = normalizedTitle.replace(/\s+/g, "");
    const normalizedBucket = mutableByNormalized.get(normalizedTitle) ?? [];
    normalizedBucket.push(template.id);
    mutableByNormalized.set(normalizedTitle, normalizedBucket);

    if (compactTitle) {
      const compactBucket = mutableByCompact.get(compactTitle) ?? [];
      compactBucket.push(template.id);
      mutableByCompact.set(compactTitle, compactBucket);
    }
  });

  return {
    byNormalized: new Map(
      Array.from(mutableByNormalized.entries()).map(([key, templateIds]) => [key, Object.freeze([...templateIds])])
    ),
    byCompact: new Map(
      Array.from(mutableByCompact.entries()).map(([key, templateIds]) => [key, Object.freeze([...templateIds])])
    )
  };
}

let cachedSource: DatasetRuntimeSource | null = null;

export function getDatasetRuntimeSource(): DatasetRuntimeSource {
  if (cachedSource) {
    return cachedSource;
  }

  const clusters = Object.freeze((clustersJson.clusters ?? []) as DatasetCluster[]);
  const concepts = Object.freeze((conceptsJson.concepts ?? []) as DatasetConcept[]);
  const mappings = Object.freeze((conceptToClusterJson.map ?? []) as DatasetConceptClusterMapEntry[]);
  const templates = Object.freeze((templatesJson.templates ?? []) as DatasetTemplate[]);
  const lexicon = lexiconJson as DatasetLexicon;

  const clusterByKey = new Map(clusters.map((cluster) => [cluster.clusterKey, cluster]));
  const conceptById = new Map(concepts.map((concept) => [concept.conceptId, concept]));
  const conceptToClusters = new Map<string, readonly string[]>(
    mappings.map((entry) => [entry.conceptId, Object.freeze([...(entry.clusters ?? [])])])
  );
  const templateById = new Map(templates.map((template) => [template.id, template]));
  const lexemeByConcept = new Map(lexicon.conceptLexemes.map((entry) => [entry.conceptId, entry]));

  const mutableTemplatesByCluster = new Map<string, DatasetTemplate[]>();
  templates.forEach((template) => {
    const bucket = mutableTemplatesByCluster.get(template.clusterKey) ?? [];
    bucket.push(template);
    mutableTemplatesByCluster.set(template.clusterKey, bucket);
  });

  const templatesByCluster = new Map<string, readonly DatasetTemplate[]>(
    Array.from(mutableTemplatesByCluster.entries()).map(([clusterKey, clusterTemplates]) => [
      clusterKey,
      Object.freeze([...clusterTemplates])
    ])
  );

  cachedSource = {
    clusters,
    concepts,
    mappings,
    templates,
    lexicon,
    clusterByKey,
    conceptById,
    conceptToClusters,
    templateById,
    templatesByCluster,
    lexemeByConcept,
    templateTitleIndex: buildTemplateTitleIndex(templates)
  };

  return cachedSource;
}

export function findDatasetTemplateById(templateId: string): DatasetTemplate | null {
  const normalizedTemplateId = templateId.trim();
  if (!normalizedTemplateId) {
    return null;
  }

  return getDatasetRuntimeSource().templateById.get(normalizedTemplateId) ?? null;
}

export function findExactTitleTemplateIds(title: string): Set<string> {
  const normalizedTitle = normalizeLookupText(title);
  const matchedTemplateIds = new Set<string>();

  if (!normalizedTitle) {
    return matchedTemplateIds;
  }

  const source = getDatasetRuntimeSource();
  source.templateTitleIndex.byNormalized.get(normalizedTitle)?.forEach((templateId) => matchedTemplateIds.add(templateId));

  const compactTitle = normalizedTitle.replace(/\s+/g, "");
  if (!compactTitle) {
    return matchedTemplateIds;
  }

  source.templateTitleIndex.byCompact.get(compactTitle)?.forEach((templateId) => matchedTemplateIds.add(templateId));
  return matchedTemplateIds;
}
