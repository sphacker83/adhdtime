import React from "react";
import type { ProgressTone } from "@/lib/deadline";

interface DeadlineProgressBarProps {
  progress: number;
  tone: ProgressTone;
}

const toneClassName: Record<ProgressTone, string> = {
  safe: "progress-safe",
  warning: "progress-warning",
  danger: "progress-danger",
  overdue: "progress-overdue"
};

export function DeadlineProgressBar({ progress, tone }: DeadlineProgressBarProps) {
  const percent = Math.round(progress);

  return (
    <div className="progress-wrap" aria-label="마감 진행률">
      <div className="progress-track">
        <div className={`progress-fill ${toneClassName[tone]}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-label">{percent}%</span>
    </div>
  );
}
