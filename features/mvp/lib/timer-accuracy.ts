export interface TimerElapsedAccumulator {
  lastAppliedAtMs: number | null;
  carryMs: number;
}

export interface ApplyElapsedWindowParams {
  nowMs: number;
  accumulator: TimerElapsedAccumulator;
}

export interface ApplyElapsedWindowResult {
  elapsedSeconds: number;
  deltaMs: number;
  nextAccumulator: TimerElapsedAccumulator;
}

function toSafeInt(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.floor(value);
}

export function createTimerElapsedAccumulator(initialMs: number | null = null): TimerElapsedAccumulator {
  const safeInitialMs = initialMs === null ? null : toSafeInt(initialMs, 0);
  return {
    lastAppliedAtMs: safeInitialMs,
    carryMs: 0
  };
}

export function applyElapsedWindow(params: ApplyElapsedWindowParams): ApplyElapsedWindowResult {
  const nowMs = toSafeInt(params.nowMs, 0);
  const carryMs = Math.max(0, toSafeInt(params.accumulator.carryMs, 0));
  const previousMs = params.accumulator.lastAppliedAtMs;

  if (previousMs === null) {
    return {
      elapsedSeconds: 0,
      deltaMs: 0,
      nextAccumulator: {
        lastAppliedAtMs: nowMs,
        carryMs: carryMs % 1000
      }
    };
  }

  const safePreviousMs = toSafeInt(previousMs, nowMs);
  const deltaMs = nowMs - safePreviousMs;

  if (deltaMs <= 0) {
    return {
      elapsedSeconds: 0,
      deltaMs: 0,
      nextAccumulator: {
        lastAppliedAtMs: safePreviousMs,
        carryMs
      }
    };
  }

  const totalMs = carryMs + deltaMs;
  const elapsedSeconds = Math.floor(totalMs / 1000);

  return {
    elapsedSeconds,
    deltaMs,
    nextAccumulator: {
      lastAppliedAtMs: nowMs,
      carryMs: totalMs - elapsedSeconds * 1000
    }
  };
}

export function reduceRemainingSeconds(remainingSeconds: number, elapsedSeconds: number): number {
  const safeRemainingSeconds = Math.max(0, toSafeInt(remainingSeconds, 0));
  const safeElapsedSeconds = Math.max(0, toSafeInt(elapsedSeconds, 0));
  return Math.max(0, safeRemainingSeconds - safeElapsedSeconds);
}

export function applyElapsedToChunkRemaining(params: {
  remainingSecondsByChunk: Record<string, number>;
  chunkId: string;
  chunkTotalSeconds: number;
  elapsedSeconds: number;
}): Record<string, number> {
  const safeElapsedSeconds = Math.max(0, toSafeInt(params.elapsedSeconds, 0));
  if (safeElapsedSeconds <= 0) {
    return params.remainingSecondsByChunk;
  }

  const currentSeconds =
    params.remainingSecondsByChunk[params.chunkId] ?? Math.max(0, toSafeInt(params.chunkTotalSeconds, 0));
  const nextSeconds = reduceRemainingSeconds(currentSeconds, safeElapsedSeconds);

  if (nextSeconds === currentSeconds) {
    return params.remainingSecondsByChunk;
  }

  return {
    ...params.remainingSecondsByChunk,
    [params.chunkId]: nextSeconds
  };
}
