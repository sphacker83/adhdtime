import { describe, expect, it } from "vitest";
import { generateLocalChunking } from "./chunking";

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
  });

  it("JSON/LOCAL 모두 매칭 실패하면 null을 반환한다", () => {
    const result = generateLocalChunking("task-none", "zxqv pqow");
    expect(result).toBeNull();
  });
});
