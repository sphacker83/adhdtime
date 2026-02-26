interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface ColorStop {
  at: number;
  color: RgbColor;
}

const COLOR_STOPS: ColorStop[] = [
  { at: 0, color: { r: 184, g: 66, b: 60 } },
  { at: 50, color: { r: 196, g: 154, b: 62 } },
  { at: 100, color: { r: 47, g: 126, b: 85 } } // 체크박스 완료색과 동일
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mix(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mixColor(from: RgbColor, to: RgbColor, t: number): RgbColor {
  return {
    r: mix(from.r, to.r, t),
    g: mix(from.g, to.g, t),
    b: mix(from.b, to.b, t)
  };
}

function tint(color: RgbColor, ratio: number): RgbColor {
  return {
    r: mix(color.r, 255, ratio),
    g: mix(color.g, 255, ratio),
    b: mix(color.b, 255, ratio)
  };
}

function toCss(color: RgbColor): string {
  return `rgb(${color.r} ${color.g} ${color.b})`;
}

function pickProgressColor(percent: number): RgbColor {
  const p = clamp(percent, 0, 100);
  if (p <= 50) {
    return mixColor(COLOR_STOPS[0].color, COLOR_STOPS[1].color, p / 50);
  }
  return mixColor(COLOR_STOPS[1].color, COLOR_STOPS[2].color, (p - 50) / 50);
}

export interface ProgressPalette {
  fill: string;
  track: string;
  bgSoftA: string;
  bgSoftB: string;
  bgBase: string;
}

export function getProgressPalette(percent: number): ProgressPalette {
  const main = pickProgressColor(percent);
  return {
    fill: toCss(main),
    track: toCss(tint(main, 0.66)),
    bgSoftA: toCss(tint(main, 0.74)),
    bgSoftB: toCss(tint(main, 0.8)),
    bgBase: toCss(tint(main, 0.9))
  };
}
