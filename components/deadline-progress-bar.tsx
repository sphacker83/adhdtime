import React from "react";
import { getProgressPalette } from "@/lib/progress-color";
import type { TaskRunState } from "@/types/task";

interface DeadlineProgressBarProps {
  progress: number;
  runState: TaskRunState;
}

export function DeadlineProgressBar({ progress, runState }: DeadlineProgressBarProps) {
  const percent = Math.max(0, Math.min(100, Math.round(progress)));
  const palette = getProgressPalette(percent);

  return (
    <div className="progress-wrap" aria-label="남은시간 진행률">
      <div className={`progress-track ${runState.toLowerCase()}`}>
        <div
          className={`progress-fill ${runState.toLowerCase()}`}
          style={{
            width: `${percent}%`,
            background: palette.fill
          }}
        />
      </div>
    </div>
  );
}
