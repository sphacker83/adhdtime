export type TimerPhase = "focus" | "break";
export type TimerStatus = "idle" | "running" | "paused";

export interface TimerState {
  phase: TimerPhase;
  status: TimerStatus;
  focusSeconds: number;
  breakSeconds: number;
  remainingSeconds: number;
}

export type TimerAction =
  | { type: "setDurations"; focusMinutes: number; breakMinutes: number }
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "nextPhase" }
  | { type: "tick" };

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
    status: "running"
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
    remainingSeconds: focusSeconds
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
        remainingSeconds: state.status === "idle" ? remainingSeconds : state.remainingSeconds
      };
    }

    case "start": {
      const duration = phaseDuration(state, state.phase);
      return {
        ...state,
        status: "running",
        remainingSeconds: state.remainingSeconds > 0 ? state.remainingSeconds : duration
      };
    }

    case "pause": {
      if (state.status !== "running") {
        return state;
      }
      return { ...state, status: "paused" };
    }

    case "resume": {
      if (state.status !== "paused") {
        return state;
      }
      return { ...state, status: "running" };
    }

    case "stop": {
      const resetDuration = phaseDuration(state, state.phase);
      return {
        ...state,
        status: "idle",
        remainingSeconds: resetDuration
      };
    }

    case "nextPhase": {
      return switchPhase(state);
    }

    case "tick": {
      if (state.status !== "running") {
        return state;
      }

      if (state.remainingSeconds <= 1) {
        return switchPhase(state);
      }

      return {
        ...state,
        remainingSeconds: state.remainingSeconds - 1
      };
    }

    default:
      return state;
  }
}
