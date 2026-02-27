import { describe, expect, it } from "vitest";
import {
  applyElapsedToChunkRemaining,
  applyElapsedWindow,
  createTimerElapsedAccumulator,
  reduceRemainingSeconds
} from "./timer-accuracy";

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe("timer-accuracy", () => {
  it("keeps drift within ±2s during a 10-minute jittered simulation", () => {
    const simulationSeconds = 10 * 60;
    const simulationMs = simulationSeconds * 1000;
    const random = createSeededRandom(20260227);

    let nowMs = 0;
    let remainingSeconds = simulationSeconds;
    let consumedSeconds = 0;
    let accumulator = createTimerElapsedAccumulator(0);
    const sampleLogs: string[] = [];

    while (nowMs < simulationMs) {
      const rawIntervalMs = 850 + Math.floor(random() * 401);
      const intervalMs = Math.min(rawIntervalMs, simulationMs - nowMs);
      nowMs += intervalMs;

      const tickResult = applyElapsedWindow({ nowMs, accumulator });
      accumulator = tickResult.nextAccumulator;
      consumedSeconds += tickResult.elapsedSeconds;
      remainingSeconds = reduceRemainingSeconds(remainingSeconds, tickResult.elapsedSeconds);

      if (sampleLogs.length < 5 || simulationMs - nowMs < 5000) {
        sampleLogs.push(
          `t=${nowMs}ms interval=${intervalMs}ms elapsed=${tickResult.elapsedSeconds}s carry=${accumulator.carryMs}ms remaining=${remainingSeconds}s`
        );
      }
    }

    const expectedConsumedSeconds = simulationSeconds;
    const driftSeconds = consumedSeconds - expectedConsumedSeconds;
    const absoluteDriftSeconds = Math.abs(driftSeconds);

    if (absoluteDriftSeconds > 2) {
      throw new Error(
        [
          "10-minute drift exceeded tolerance.",
          `expectedConsumedSeconds=${expectedConsumedSeconds}`,
          `actualConsumedSeconds=${consumedSeconds}`,
          `driftSeconds=${driftSeconds}`,
          `finalRemainingSeconds=${remainingSeconds}`,
          `finalCarryMs=${accumulator.carryMs}`,
          "sampleLogs:",
          ...sampleLogs
        ].join("\n")
      );
    }

    expect(absoluteDriftSeconds).toBeLessThanOrEqual(2);
    expect(remainingSeconds).toBe(0);
  });

  it("applies large elapsed gaps accurately after background restore", () => {
    let accumulator = createTimerElapsedAccumulator();
    let remainingSeconds = 12 * 60;
    const anchorMs = 10_000;

    accumulator = applyElapsedWindow({ nowMs: anchorMs, accumulator }).nextAccumulator;

    const gapMs = 5 * 60 * 1000 + 47_891;
    const resumeTick = applyElapsedWindow({
      nowMs: anchorMs + gapMs,
      accumulator
    });
    remainingSeconds = reduceRemainingSeconds(remainingSeconds, resumeTick.elapsedSeconds);

    const expectedElapsedSeconds = Math.floor(gapMs / 1000);
    const expectedRemainingSeconds = 12 * 60 - expectedElapsedSeconds;

    if (
      resumeTick.elapsedSeconds !== expectedElapsedSeconds
      || remainingSeconds !== expectedRemainingSeconds
      || resumeTick.nextAccumulator.carryMs !== gapMs % 1000
    ) {
      throw new Error(
        [
          "Background restore elapsed mismatch.",
          `gapMs=${gapMs}`,
          `expectedElapsedSeconds=${expectedElapsedSeconds}`,
          `actualElapsedSeconds=${resumeTick.elapsedSeconds}`,
          `expectedRemainingSeconds=${expectedRemainingSeconds}`,
          `actualRemainingSeconds=${remainingSeconds}`,
          `expectedCarryMs=${gapMs % 1000}`,
          `actualCarryMs=${resumeTick.nextAccumulator.carryMs}`
        ].join("\n")
      );
    }

    expect(resumeTick.elapsedSeconds).toBe(expectedElapsedSeconds);
    expect(remainingSeconds).toBe(expectedRemainingSeconds);
    expect(resumeTick.nextAccumulator.carryMs).toBe(gapMs % 1000);
  });

  it("clamps remaining time to zero for very large elapsed values", () => {
    const nextMap = applyElapsedToChunkRemaining({
      remainingSecondsByChunk: {},
      chunkId: "chunk-1",
      chunkTotalSeconds: 45,
      elapsedSeconds: 120
    });

    if (nextMap["chunk-1"] !== 0) {
      throw new Error(`Expected chunk remaining to be 0, got ${String(nextMap["chunk-1"])}`);
    }

    expect(nextMap["chunk-1"]).toBe(0);
  });
});
