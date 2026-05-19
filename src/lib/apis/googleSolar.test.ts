import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBuildingInsights, GoogleSolarError } from "./googleSolar";
import applePark from "./__fixtures__/buildingInsights.applePark.json";

type FetchMock = ReturnType<typeof vi.fn>;

function mockFetchOnce(res: { ok: boolean; status: number; body: unknown }) {
  (fetch as unknown as FetchMock).mockResolvedValueOnce({
    ok: res.ok,
    status: res.status,
    json: async () => res.body,
  });
}

describe("fetchBuildingInsights", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("VITE_GOOGLE_SOLAR_KEY", "test-key-xyz");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("requests HIGH quality with location.latitude/longitude and key", async () => {
    mockFetchOnce({ ok: true, status: 200, body: applePark });
    await fetchBuildingInsights({ lat: 37.3346, lng: -122.009 });
    const url = (fetch as unknown as FetchMock).mock.calls[0][0] as string;
    expect(url).toContain(
      "solar.googleapis.com/v1/buildingInsights:findClosest",
    );
    expect(url).toContain("location.latitude=37.3346");
    expect(url).toContain("location.longitude=-122.009");
    expect(url).toContain("requiredQuality=HIGH");
    expect(url).toContain("key=test-key-xyz");
  });

  it("parses the Apple Park fixture into the typed shape", async () => {
    mockFetchOnce({ ok: true, status: 200, body: applePark });
    const r = await fetchBuildingInsights({ lat: 37.3346, lng: -122.009 });
    expect(r.solarPotential.maxArrayPanelsCount).toBeGreaterThan(0);
    expect(r.solarPotential.panelCapacityWatts).toBeGreaterThan(0);
    expect(r.solarPotential.roofSegmentStats.length).toBeGreaterThan(0);
    const seg = r.solarPotential.roofSegmentStats[0];
    expect(seg.pitchDegrees).toBeGreaterThanOrEqual(0);
    expect(seg.planeHeightAtCenterMeters).toBeGreaterThan(0);
    // sunshineQuantiles is documented as 11 percentile buckets.
    expect(seg.stats.sunshineQuantiles).toHaveLength(11);
    expect(seg.center.latitude).toBeCloseTo(37.336, 1);
    expect(seg.center.longitude).toBeCloseTo(-122.008, 1);
  });

  it("falls back to MEDIUM when HIGH returns 404", async () => {
    mockFetchOnce({ ok: false, status: 404, body: {} });
    mockFetchOnce({ ok: true, status: 200, body: applePark });
    await fetchBuildingInsights({ lat: 37.3346, lng: -122.009 });
    const calls = (fetch as unknown as FetchMock).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0] as string).toContain("requiredQuality=HIGH");
    expect(calls[1][0] as string).toContain("requiredQuality=MEDIUM");
  });

  it("throws not_found when both HIGH and MEDIUM return 404", async () => {
    mockFetchOnce({ ok: false, status: 404, body: {} });
    mockFetchOnce({ ok: false, status: 404, body: {} });
    await expect(
      fetchBuildingInsights({ lat: 0, lng: 0 }),
    ).rejects.toMatchObject({ name: "GoogleSolarError", kind: "not_found" });
  });

  it("throws missing_key when env var is unset", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_GOOGLE_SOLAR_KEY", "");
    await expect(
      fetchBuildingInsights({ lat: 37.3346, lng: -122.009 }),
    ).rejects.toMatchObject({
      name: "GoogleSolarError",
      kind: "missing_key",
    });
  });

  it("throws request_failed on non-OK non-404 status", async () => {
    mockFetchOnce({ ok: false, status: 500, body: {} });
    await expect(
      fetchBuildingInsights({ lat: 37.3346, lng: -122.009 }),
    ).rejects.toMatchObject({
      name: "GoogleSolarError",
      kind: "request_failed",
    });
  });

  it("throws bad_response when solarPotential is missing", async () => {
    mockFetchOnce({ ok: true, status: 200, body: { name: "buildings/X" } });
    await expect(
      fetchBuildingInsights({ lat: 37.3346, lng: -122.009 }),
    ).rejects.toMatchObject({
      name: "GoogleSolarError",
      kind: "bad_response",
    });
  });

  it("wraps thrown fetch errors as request_failed", async () => {
    (fetch as unknown as FetchMock).mockRejectedValueOnce(new Error("net"));
    await expect(
      fetchBuildingInsights({ lat: 37.3346, lng: -122.009 }),
    ).rejects.toMatchObject({
      name: "GoogleSolarError",
      kind: "request_failed",
    });
  });

  it("GoogleSolarError carries the kind discriminant", () => {
    const e = new GoogleSolarError("not_found", "x");
    expect(e.kind).toBe("not_found");
    expect(e.name).toBe("GoogleSolarError");
  });
});
