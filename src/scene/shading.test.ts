import { describe, it, expect } from "vitest";
import {
  MIN_SHADING_RANGE,
  medianSunshine,
  normalizeSunshine,
  shadeFromNormalized,
} from "./shading";
import type { RoofSegmentStats } from "../lib/apis/googleSolar";

function fakeSegment(quantiles: number[]): RoofSegmentStats {
  return {
    pitchDegrees: 0,
    azimuthDegrees: 0,
    planeHeightAtCenterMeters: 0,
    stats: {
      areaMeters2: 100,
      sunshineQuantiles: quantiles,
      groundAreaMeters2: 100,
    },
    center: { latitude: 0, longitude: 0 },
    boundingBox: {
      sw: { latitude: 0, longitude: 0 },
      ne: { latitude: 0, longitude: 0 },
    },
  };
}

describe("medianSunshine", () => {
  it("returns the 50th-percentile entry (index 5) of sunshineQuantiles", () => {
    const seg = fakeSegment([0, 10, 20, 30, 40, 500, 60, 70, 80, 90, 100]);
    expect(medianSunshine(seg)).toBe(500);
  });
});

describe("normalizeSunshine", () => {
  it("maps the max value to 1 and min to 0 when range exceeds MIN_SHADING_RANGE", () => {
    // Spread of 1000 >> MIN_SHADING_RANGE
    const out = normalizeSunshine([500, 1000, 1500]);
    expect(out[0]).toBeCloseTo(0, 6);
    expect(out[2]).toBeCloseTo(1, 6);
    expect(out[1]).toBeCloseTo(0.5, 6);
  });

  it("clamps the denominator at MIN_SHADING_RANGE for near-uniform inputs", () => {
    // Spread of 20 << MIN_SHADING_RANGE (100) — should NOT span full ramp.
    const out = normalizeSunshine([1700, 1710, 1720]);
    expect(out[0]).toBe(0);
    // 20 / 100 = 0.2, not 1.0
    expect(out[2]).toBeCloseTo(0.2, 6);
  });

  it("returns 0.5 for a single-segment input (range = 0)", () => {
    // Single value, range = 0; clamp doesn't help (still 0/100 == 0 for
    // that value), but the early-return for range=0 case kicks in only
    // when both min==max AND minRange is also 0. So with the default
    // floor, a single-segment building maps to 0 (lowest). That's
    // technically correct (no contrast available) — assert that
    // explicitly so future tweaks notice.
    const out = normalizeSunshine([1800]);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(0);
  });

  it("returns 0.5 for truly-zero range when minRange is also 0", () => {
    const out = normalizeSunshine([1800, 1800, 1800], 0);
    expect(out).toEqual([0.5, 0.5, 0.5]);
  });

  it("returns empty array for empty input", () => {
    expect(normalizeSunshine([])).toEqual([]);
  });

  it("MIN_SHADING_RANGE is the documented default", () => {
    expect(MIN_SHADING_RANGE).toBe(100);
  });
});

describe("shadeFromNormalized", () => {
  it("returns the sage ramp anchor at t = 0", () => {
    expect(shadeFromNormalized(0).toLowerCase()).toBe("#4f6b53");
  });

  it("returns the gold ramp anchor at t = 1", () => {
    expect(shadeFromNormalized(1).toLowerCase()).toBe("#b8943e");
  });

  it("interpolates somewhere between the anchors at t = 0.5", () => {
    const c = shadeFromNormalized(0.5);
    expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    expect(c.toLowerCase()).not.toBe("#4f6b53");
    expect(c.toLowerCase()).not.toBe("#b8943e");
  });

  it("clamps out-of-range t to the ramp endpoints", () => {
    expect(shadeFromNormalized(-1).toLowerCase()).toBe("#4f6b53");
    expect(shadeFromNormalized(2).toLowerCase()).toBe("#b8943e");
  });
});
