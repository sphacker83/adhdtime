import React from "react";
import { getProgressPalette } from "@/lib/progress-color";

interface DeadlineRingProps {
  progress: number;
  centerLabel?: string;
}

export function DeadlineRing({ progress, centerLabel }: DeadlineRingProps) {
  const radius = 128;
  const stroke = 14;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const remainingPercent = Math.max(0, Math.min(100, 100 - clampedProgress));
  const palette = getProgressPalette(remainingPercent);
  const ringColor = palette.fill;
  const ringTrackColor = palette.track;
  const ringBackground = `radial-gradient(circle at 25% 20%, ${palette.bgSoftA}, transparent 52%), radial-gradient(circle at 80% 78%, ${palette.bgSoftB}, transparent 56%), linear-gradient(150deg, ${palette.bgBase}, #ffffff)`;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="deadline-ring-wrap" aria-label="일정 마감 링 도넛" style={{ background: ringBackground }}>
      <svg width={radius * 2} height={radius * 2} className="deadline-ring-svg">
        <circle
          stroke={ringTrackColor}
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={ringColor}
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
      <div className="deadline-ring-content">
        <p className="deadline-ring-progress center">{centerLabel ?? `${Math.round(clampedProgress)}%`}</p>
      </div>
    </div>
  );
}
