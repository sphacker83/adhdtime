import React from "react";
import { formatRemainingTime } from "@/lib/timer";

interface TimerCircleProps {
  totalSeconds: number;
  remainingSeconds: number;
  phase: "focus" | "break";
}

export function TimerCircle({ totalSeconds, remainingSeconds, phase }: TimerCircleProps) {
  const progress = totalSeconds <= 0 ? 0 : remainingSeconds / totalSeconds;
  const radius = 88;
  const stroke = 12;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="timer-circle-wrap" aria-label="원형 타이머">
      <svg width={radius * 2} height={radius * 2} className="timer-circle-svg">
        <circle
          stroke="var(--line-subtle)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={phase === "focus" ? "var(--brand-focus)" : "var(--brand-break)"}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <div className="timer-circle-content">
        <p className="timer-phase">{phase === "focus" ? "집중" : "휴식"}</p>
        <p className="timer-value">{formatRemainingTime(remainingSeconds)}</p>
      </div>
    </div>
  );
}
