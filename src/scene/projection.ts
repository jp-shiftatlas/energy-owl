import type { LatLng, RoofSegmentStats } from "../lib/apis/googleSolar";

// Equirectangular small-area approximation. At building scale (≤200 m),
// error vs. a proper geodetic projection is sub-millimeter — exact enough
// for R3F rendering, no library required.
//
// Meters per degree of latitude is roughly constant (Earth's a slightly
// flattened sphere; this value is the mean). Meters per degree of
// longitude shrinks with latitude by a factor of cos(lat), which is why
// we apply it per-building rather than using a global constant.
const METERS_PER_DEG_LAT = 110_540;
const METERS_PER_DEG_LNG_EQUATOR = 111_320;

export type Vec3 = { x: number; y: number; z: number };

export type ProjectedSegment = {
  center: Vec3;
  widthMeters: number;
  depthMeters: number;
  pitchDegrees: number;
  azimuthDegrees: number;
};

// +X east, +Y up, -Z north — matches R3F's default camera convention.
export function projectLatLng(point: LatLng, origin: LatLng): Vec3 {
  const cosLat = Math.cos((origin.latitude * Math.PI) / 180);
  const x =
    (point.longitude - origin.longitude) * cosLat * METERS_PER_DEG_LNG_EQUATOR;
  const z = -(point.latitude - origin.latitude) * METERS_PER_DEG_LAT;
  return { x, y: 0, z };
}

export function minPlaneHeight(segments: RoofSegmentStats[]): number {
  if (segments.length === 0) return 0;
  return Math.min(...segments.map((s) => s.planeHeightAtCenterMeters));
}

// Project a single roof segment from lat/lng/elevation into local meters.
// y is anchored so the lowest segment in the building sits at Y=0; pass
// the same minHeight value (from minPlaneHeight) for every segment in a
// given building.
export function projectSegment(
  segment: RoofSegmentStats,
  origin: LatLng,
  minHeight: number,
): ProjectedSegment {
  const c = projectLatLng(segment.center, origin);
  const sw = projectLatLng(segment.boundingBox.sw, origin);
  const ne = projectLatLng(segment.boundingBox.ne, origin);
  return {
    center: {
      x: c.x,
      y: segment.planeHeightAtCenterMeters - minHeight,
      z: c.z,
    },
    widthMeters: Math.abs(ne.x - sw.x),
    depthMeters: Math.abs(sw.z - ne.z),
    pitchDegrees: segment.pitchDegrees,
    azimuthDegrees: segment.azimuthDegrees,
  };
}
