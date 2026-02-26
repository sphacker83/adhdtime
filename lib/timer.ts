export type TimerPhase = "focus" | "break";
export type TimerStatus = "idle" | "running" | "paused";

export interface TimerState {
  phase: TimerPhase;
  status: TimerStatus;
  focusSeconds: number;
  breakSeconds: number;
  remainingSeconds: number;
  lastTickAtMs: number | null;
  lastCompletedPhases: number;
}

export type TimerAction =
  | { type: "setDurations"; focusMinutes: number; breakMinutes: number }
  | { type: "start"; nowMs?: number }
  | { type: "pause" }
  | { type: "resume"; nowMs?: number }
  | { type: "stop" }
  | { type: "nextPhase" }
  | { type: "tick"; nowMs?: number }
  | { type: "compensateElapsed"; elapsedSeconds: number; nowMs?: number };

const MIN_MINUTES = 1;
const MAX_MINUTES = 120;

export function formatRemainingTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function clampMinutes(value: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, value));
}

function phaseDuration(state: TimerState, phase: TimerPhase): number {
  return phase === "focus" ? state.focusSeconds : state.breakSeconds;
}

function switchPhase(state: TimerState): TimerState {
  const nextPhase: TimerPhase = state.phase === "focus" ? "break" : "focus";
  const nextDuration = phaseDuration(state, nextPhase);

  return {
    ...state,
    phase: nextPhase,
    remainingSeconds: nextDuration,
    status: "running",
    lastCompletedPhases: 0
  };
}

interface ElapsedResult {
  phase: TimerPhase;
  remainingSeconds: number;
  completedPhases: number;
}

function consumeElapsed(state: TimerState, elapsedSeconds: number): ElapsedResult {
  let phase = state.phase;
  let remainingSeconds = state.remainingSeconds;
  let completedPhases = 0;
  let leftSeconds = Math.max(0, Math.floor(elapsedSeconds));

  while (leftSeconds > 0) {
    if (leftSeconds < remainingSeconds) {
      remainingSeconds -= leftSeconds;
      leftSeconds = 0;
      continue;
    }

    leftSeconds -= remainingSeconds;
    completedPhases += 1;
    phase = phase === "focus" ? "break" : "focus";
    remainingSeconds = phaseDuration(state, phase);
  }

  return {
    phase,
    remainingSeconds,
    completedPhases
  };
}

export function createInitialTimerState(): TimerState {
  const focusSeconds = 25 * 60;
  const breakSeconds = 5 * 60;

  return {
    phase: "focus",
    status: "idle",
    focusSeconds,
    breakSeconds,
    remainingSeconds: focusSeconds,
    lastTickAtMs: null,
    lastCompletedPhases: 0
  };
}

export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case "setDurations": {
      const focusSeconds = clampMinutes(action.focusMinutes) * 60;
      const breakSeconds = clampMinutes(action.breakMinutes) * 60;
      const remainingSeconds = state.phase === "focus" ? focusSeconds : breakSeconds;

      return {
        ...state,
        focusSeconds,
        breakSeconds,
        remainingSeconds: state.status === "idle" ? remainingSeconds : state.remainingSeconds,
        lastCompletedPhases: 0
      };
    }

    case "start": {
      const duration = phaseDuration(state, state.phase);
      return {
        ...state,
        status: "running",
        remainingSeconds: state.remainingSeconds > 0 ? state.remainingSeconds : duration,
        lastTickAtMs: action.nowMs ?? state.lastTickAtMs,
        lastCompletedPhases: 0
      };
    }

    case "pause": {
      if (state.status !== "running") {
        return state;
      }
      return { ...state, status: "paused", lastTickAtMs: null, lastCompletedPhases: 0 };
    }

    case "resume": {
      if (state.status !== "paused") {
        return state;
      }
      return {
        ...state,
        status: "running",
        lastTickAtMs: action.nowMs ?? state.lastTickAtMs,
        lastCompletedPhases: 0
      };
    }

    case "stop": {
      const resetDuration = phaseDuration(state, state.phase);
      return {
        ...state,
        status: "idle",
        remainingSeconds: resetDuration,
        lastTickAtMs: null,
        lastCompletedPhases: 0
      };
    }

    case "nextPhase": {
      return {
        ...switchPhase(state),
        lastTickAtMs: state.lastTickAtMs,
        lastCompletedPhases: 0
      };
    }

    case "tick": {
      if (state.status !== "running") {
        return state;
      }

      const result = consumeElapsed(state, 1);

      return {
        ...state,
        phase: result.phase,
        remainingSeconds: result.remainingSeconds,
        status: "running",
        lastTickAtMs: action.nowMs ?? state.lastTickAtMs,
        lastCompletedPhases: result.completedPhases
      };
    }

    case "compensateElapsed": {
      if (state.status !== "running") {
        return state;
      }

      const safeElapsedSeconds = Math.max(0, Math.floor(action.elapsedSeconds));
      if (safeElapsedSeconds === 0) {
        return {
          ...state,
          lastTickAtMs: action.nowMs ?? state.lastTickAtMs,
          lastCompletedPhases: 0
        };
      }

      const result = consumeElapsed(state, safeElapsedSeconds);

      return {
        ...state,
        phase: result.phase,
        remainingSeconds: result.remainingSeconds,
        status: "running",
        lastTickAtMs: action.nowMs ?? state.lastTickAtMs,
        lastCompletedPhases: result.completedPhases
      };
    }

    default:
      return state;
  }
}
