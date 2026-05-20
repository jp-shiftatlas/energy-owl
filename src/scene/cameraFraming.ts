import type { BuildingInsights } from "../lib/apis/googleSolar";
import { projectLatLng } from "./projection";

export type CameraFraming = {
  position: [number, number, number];
  target: [number, number, number];
  minDistance: number;
  maxDistance: number;
};

// Default used when no building data is loaded (empty stage) — comfortable
// for the "Submit an address" placeholder before any roof renders.
const DEFAULT_FRAMING: CameraFraming = {
  position: [40, 30, 50],
  target: [0, 0, 0],
  minDistance: 10,
  maxDistance: 200,
};

// Compute a building-relative camera framing: position the camera at a
// ~30° elevation along the diagonal so the building reads as 3/4-isometric,
// scale the standoff distance so the building diagonal fits the default
// 35° FOV with some margin, and clamp orbit-controls zoom limits to that
// scale so the user can dolly in without flying through walls or out to
// where the building becomes a dot.
//
// Derivation: at FOV 35°, visible width at distance r ≈ 2·r·tan(17.5°) ≈ 0.63·r.
// To fit a building of diagonal D we need r ≥ D/0.63 ≈ 1.59·D in a head-on
// view. With the camera offset onto a (1,0,1) diagonal AND elevated ~30°,
// the foreshortening lets us shrink r substantially. Empirically (eyeballed
// across Apple Park, Mall of America, and a small commercial roof), r ≈ 1.0·D
// gives Apple Park ~65% of viewport and Mall of America ~75% — small enough
// to fit confidently in frame, large enough to read, and leaves orbit
// headroom before clipping. Height = r·tan(30°) gives the ~30° elevation.
export function computeCameraFraming(
  insights: BuildingInsights | null,
): CameraFraming {
  if (!insights) return DEFAULT_FRAMING;

  const origin = insights.center;
  const sw = projectLatLng(insights.boundingBox.sw, origin);
  const ne = projectLatLng(insights.boundingBox.ne, origin);
  const widthEW = Math.abs(ne.x - sw.x);
  const depthNS = Math.abs(sw.z - ne.z);
  const diagonal = Math.sqrt(widthEW * widthEW + depthNS * depthNS);

  // Horizontal standoff distance from the building centroid.
  const r = diagonal * 1.0;
  // Split across x and z so the camera is on the (1,0,1) diagonal.
  const xz = r / Math.SQRT2;
  // Elevation: ~30° above the horizontal plane.
  const y = r * Math.tan((30 * Math.PI) / 180);

  return {
    position: [xz, y, xz],
    target: [0, 0, 0],
    // Floor of 10 m so a small building doesn't lock the user inches away;
    // ceiling at ~5× diagonal so users can zoom out and still see context.
    minDistance: Math.max(10, diagonal * 0.25),
    maxDistance: diagonal * 5,
  };
}
