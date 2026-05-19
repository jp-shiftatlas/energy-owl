import { describe, it, expect } from "vitest";
import {
  projectLatLng,
  projectSegment,
  minPlaneHeight,
} from "./projection";
import applePark from "../lib/apis/__fixtures__/buildingInsights.applePark.json";
import type { BuildingInsights } from "../lib/apis/googleSolar";

const fixture = applePark as unknown as BuildingInsights;

describe("projectLatLng", () => {
  const origin = { latitude: 37.3348587, longitude: -122.0090003 };

  it("maps origin to (0, 0, 0)", () => {
    const p = projectLatLng(origin, origin);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBe(0);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it("maps 1° north of origin to z ≈ -110540 (north = -Z)", () => {
    const p = projectLatLng(
      { latitude: origin.latitude + 1, longitude: origin.longitude },
      origin,
    );
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(-110540, 0);
  });

  it("maps 1° east at 37° latitude with cos(lat) scaling", () => {
    const p = projectLatLng(
      { latitude: origin.latitude, longitude: origin.longitude + 1 },
      origin,
    );
    // cos(37.3348587°) * 111320 ≈ 88,539
    const expectedX =
      Math.cos((origin.latitude * Math.PI) / 180) * 111320;
    expect(p.x).toBeCloseTo(expectedX, 0);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it("1° of longitude is shorter than 1° of latitude away from the equator", () => {
    const pLat = projectLatLng(
      { latitude: origin.latitude + 1, longitude: origin.longitude },
      origin,
    );
    const pLng = projectLatLng(
      { latitude: origin.latitude, longitude: origin.longitude + 1 },
      origin,
    );
    expect(Math.abs(pLng.x)).toBeLessThan(Math.abs(pLat.z));
  });
});

describe("minPlaneHeight", () => {
  it("returns 0 for empty input", () => {
    expect(minPlaneHeight([])).toBe(0);
  });

  it("returns the minimum planeHeightAtCenterMeters across segments", () => {
    const min = minPlaneHeight(fixture.solarPotential.roofSegmentStats);
    const expected = Math.min(
      ...fixture.solarPotential.roofSegmentStats.map(
        (s) => s.planeHeightAtCenterMeters,
      ),
    );
    expect(min).toBe(expected);
  });
});

describe("projectSegment (Y anchoring)", () => {
  const segments = fixture.solarPotential.roofSegmentStats;
  const origin = fixture.center;
  const minH = minPlaneHeight(segments);

  it("anchors the lowest segment at y = 0", () => {
    const lowest = segments.reduce((a, b) =>
      a.planeHeightAtCenterMeters < b.planeHeightAtCenterMeters ? a : b,
    );
    const p = projectSegment(lowest, origin, minH);
    expect(p.center.y).toBeCloseTo(0, 6);
  });

  it("anchors the highest segment at y = (max - min) plane-height range", () => {
    const highest = segments.reduce((a, b) =>
      a.planeHeightAtCenterMeters > b.planeHeightAtCenterMeters ? a : b,
    );
    const expectedRange =
      highest.planeHeightAtCenterMeters - minH;
    const p = projectSegment(highest, origin, minH);
    expect(p.center.y).toBeCloseTo(expectedRange, 6);
    // Apple Park's documented spread is ~6.74 m — sanity bound.
    expect(p.center.y).toBeGreaterThan(5);
    expect(p.center.y).toBeLessThan(10);
  });

  it("carries pitch and azimuth through unchanged", () => {
    const seg = segments[0];
    const p = projectSegment(seg, origin, minH);
    expect(p.pitchDegrees).toBe(seg.pitchDegrees);
    expect(p.azimuthDegrees).toBe(seg.azimuthDegrees);
  });

  it("returns positive width and depth from the bounding box", () => {
    const seg = segments[0];
    const p = projectSegment(seg, origin, minH);
    expect(p.widthMeters).toBeGreaterThan(0);
    expect(p.depthMeters).toBeGreaterThan(0);
  });
});
