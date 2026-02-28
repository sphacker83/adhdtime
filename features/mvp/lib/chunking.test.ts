import { describe, expect, it } from "vitest";
import {
  generateLocalChunking,
  generateTemplateChunking,
  mapChunkingResultToChunks,
  validateChunkingResult
} from "./chunking";

describe("generateLocalChunking", () => {
  it("sleep/wake 입력은 sleep_wake_routine 계열 프리셋을 우선 추천한다", () => {
    const result = generateLocalChunking("task-sleep", "내일 일어나서 준비해야 하는데");

    expect(result).not.toBeNull();
    if (!result) {
      return;
    }

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0]?.action).toMatch(/알람|침대|조명|창문|타이머/);
    expect(result.chunks[0]?.estMinutes).toBe(2);
    expect(result.chunks[0]?.difficulty).toBe(1);
    expect(result.chunks[0]?.notes).toMatch(/커튼|충전|창문|자연광/);
    expect(result.chunks[0]?.iconKey).toBeTruthy();
    expect(validateChunkingResult(result).ok).toBe(true);
  });

  it("범용 청소 입력은 시작 장벽이 낮은 프리셋을 우선한다", () => {
    const result = generateLocalChunking("task-clean", "청소해야돼");

    expect(result).not.toBeNull();
    if (!result) {
      return;
    }

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0]?.estMinutes).toBe(2);
    expect(result.chunks[0]?.difficulty).toBeLessThanOrEqual(2);
    expect(result.chunks[0]?.action).not.toContain("청소기 플러그");
    expect(result.chunks[0]?.iconKey).toBeTruthy();
    expect(validateChunkingResult(result).ok).toBe(true);
  });

  it("JSON/LOCAL 모두 매칭 실패하면 null을 반환한다", () => {
    const result = generateLocalChunking("task-none", "zxqv pqow");
    expect(result).toBeNull();
  });

  it("template 경로에서도 iconKey를 생성한다", () => {
    const result = generateTemplateChunking("task-template", "집중해서 보고서 마무리");
    const missingIconCount = result.chunks.filter((chunk) => !chunk.iconKey).length;
    expect(missingIconCount).toBe(0);
  });

  it("ChunkingResult -> Chunk 매핑에서 iconKey를 보존한다", () => {
    const result = generateTemplateChunking("task-map", "자료 정리");
    result.chunks[0] = {
      ...result.chunks[0],
      iconKey: "custom-icon"
    };

    const mapped = mapChunkingResultToChunks(result, { taskId: "task-map", status: "todo" });
    expect(mapped[0]?.iconKey).toBe("custom-icon");
  });
});
