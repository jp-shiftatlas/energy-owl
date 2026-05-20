import { describe, it, expect } from "vitest";
import { computeCameraFraming } from "./cameraFraming";
import applePark from "../lib/apis/__fixtures__/buildingInsights.applePark.json";
import type { BuildingInsights } from "../lib/apis/googleSolar";

const fixture = applePark as unknown as BuildingInsights;

describe("computeCameraFraming", () => {
  it("returns a sensible default framing when no building data is loaded", () => {
    const f = computeCameraFraming(null);
    expect(f.target).toEqual([0, 0, 0]);
    expect(f.position[1]).toBeGreaterThan(0); // elevated
    expect(f.minDistance).toBeGreaterThanOrEqual(10);
    expect(f.maxDistance).toBeGreaterThan(f.minDistance);
  });

  it("targets the building centroid (origin in our ENU frame)", () => {
    expect(computeCameraFraming(fixture).target).toEqual([0, 0, 0]);
  });

  it("places camera at ~30° elevation along the (1,0,1) diagonal", () => {
    const f = computeCameraFraming(fixture);
    expect(f.position[0]).toBeCloseTo(f.position[2], 6); // symmetric on diagonal
    // Elevation angle = atan(y / horizontal). horizontal = sqrt(x² + z²) = x * sqrt(2).
    const horizontal = f.position[0] * Math.SQRT2;
    const elevationDeg = (Math.atan(f.position[1] / horizontal) * 180) / Math.PI;
    expect(elevationDeg).toBeGreaterThan(25);
    expect(elevationDeg).toBeLessThan(35);
  });

  it("scales standoff distance to the building diagonal", () => {
    // Apple Park's projected bounding-box diagonal is on the order of
    // hundreds of meters; the resulting camera distance from origin
    // should be roughly proportional.
    const f = computeCameraFraming(fixture);
    const distance = Math.sqrt(
      f.position[0] ** 2 + f.position[1] ** 2 + f.position[2] ** 2,
    );
    // Bounded sanity check rather than a fragile point estimate.
    expect(distance).toBeGreaterThan(500);
    expect(distance).toBeLessThan(2000);
  });

  it("sets orbit-zoom limits proportional to building scale", () => {
    const f = computeCameraFraming(fixture);
    expect(f.maxDistance).toBeGreaterThan(f.minDistance * 5);
  });
});
