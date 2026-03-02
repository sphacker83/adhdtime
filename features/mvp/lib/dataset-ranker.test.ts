import { describe, expect, it } from "vitest";
import { rankDatasetTemplates } from "./dataset-ranker";
import { getDatasetRuntimeSource } from "./dataset-runtime-source";

describe("dataset-ranker", () => {
  it("exact title match는 deterministic top1으로 유지한다", () => {
    const source = getDatasetRuntimeSource();
    const targetTemplate = source.templates.find((template) => template.clusterKey === "HOME_KITCHEN_RESET") ?? source.templates[0];

    expect(targetTemplate).toBeDefined();
    if (!targetTemplate) {
      return;
    }

    const ranked = rankDatasetTemplates(targetTemplate.title, 5);
    expect(ranked[0]).toBeDefined();
    expect(ranked[0]?.id).toBe(targetTemplate.id);
    expect(ranked[0]?.rerankConfidence).toBe(1);
    expect(ranked[0]?.routeConfidence).toBe(1);
  });

  it("Top-N 결과는 cluster 당 최대 2개를 넘기지 않는다", () => {
    const ranked = rankDatasetTemplates("집 정리 메일 정리 스트레칭 지금 10분", 5);
    const clusterCounts = new Map<string, number>();

    ranked.forEach((candidate) => {
      const clusterKey = candidate.template.clusterKey;
      clusterCounts.set(clusterKey, (clusterCounts.get(clusterKey) ?? 0) + 1);
    });

    clusterCounts.forEach((count) => {
      expect(count).toBeLessThanOrEqual(2);
    });
  });

  it("가능한 경우 Top-N은 최소 3개 cluster를 포함한다", () => {
    const query = "집 정리 메일 정리 스트레칭 지금 10분";
    const top5 = rankDatasetTemplates(query, 5);
    const top12 = rankDatasetTemplates(query, 12);

    const distinctClustersInTop5 = new Set(top5.map((candidate) => candidate.template.clusterKey)).size;
    const distinctClustersInTop12 = new Set(top12.map((candidate) => candidate.template.clusterKey)).size;

    if (top5.length >= 3 && distinctClustersInTop12 >= 3) {
      expect(distinctClustersInTop5).toBeGreaterThanOrEqual(3);
    }
  });

  it("routeConfidence는 텍스트 매칭 강도를 반영한다", () => {
    const ranked = rankDatasetTemplates("소파에 쌓인 빨래", 12);
    const exactPhraseCandidates = ranked.filter((candidate) => candidate.title.includes("소파에 쌓인 빨래"));
    const laundryWithoutPhrase = ranked.filter((candidate) => {
      return candidate.title.includes("빨래") && !candidate.title.includes("소파에 쌓인 빨래");
    });

    if (exactPhraseCandidates.length > 0 && laundryWithoutPhrase.length > 0) {
      const bestExactPhraseRouteConfidence = Math.max(...exactPhraseCandidates.map((candidate) => candidate.routeConfidence));
      const bestLaundryWithoutPhraseRouteConfidence = Math.max(...laundryWithoutPhrase.map((candidate) => candidate.routeConfidence));

      expect(bestExactPhraseRouteConfidence).toBeGreaterThan(bestLaundryWithoutPhraseRouteConfidence);
    }
  });

  it("강한 매칭 쿼리는 재정규화 후 routeConfidence가 충분히 높다", () => {
    const topCandidate = rankDatasetTemplates("소파에 쌓인 빨래", 5)[0];
    expect(topCandidate).toBeDefined();
    expect(topCandidate?.routeConfidence ?? 0).toBeGreaterThanOrEqual(0.5);
  });
});
