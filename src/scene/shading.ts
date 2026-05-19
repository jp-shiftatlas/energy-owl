import type { RoofSegmentStats } from "../lib/apis/googleSolar";

// Floor on the normalization denominator. If the observed spread of
// sunshine values across a building's segments is smaller than this,
// we use this value instead — keeps near-uniform roofs rendering
// near-uniform rather than amplifying trivial differences into a
// full sage→gold gradient.
// TODO(s4): tune after visual verification on 3+ real buildings.
export const MIN_SHADING_RANGE = 100; // sunshine hours per year

// Brand palette anchors for the ramp.
const RAMP_LOW = "#4F6B53"; // muted sage (least sun)
const RAMP_HIGH = "#B8943E"; // gold (most sun)

// 11-element sunshineQuantiles → median (50th percentile).
export function medianSunshine(segment: RoofSegmentStats): number {
  return segment.stats.sunshineQuantiles[5];
}

export function normalizeSunshine(
  values: number[],
  minRange: number = MIN_SHADING_RANGE,
): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const observedRange = max - min;
  const range = Math.max(observedRange, minRange);
  if (range === 0) return values.map(() => 0.5);
  return values.map((v) => (v - min) / range);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function shadeFromNormalized(t: number): string {
  const tc = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = hexToRgb(RAMP_LOW);
  const [r2, g2, b2] = hexToRgb(RAMP_HIGH);
  return rgbToHex(
    r1 + (r2 - r1) * tc,
    g1 + (g2 - g1) * tc,
    b1 + (b2 - b1) * tc,
  );
}
