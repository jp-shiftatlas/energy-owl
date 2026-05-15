import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { geocode } from "./geocoder";

const okResponse = {
  result: {
    addressMatches: [
      {
        matchedAddress: "1 APPLE PARK WAY, CUPERTINO, CA, 95014",
        coordinates: { x: -122.009, y: 37.3346 },
      },
    ],
  },
};

const emptyResponse = { result: { addressMatches: [] } };

describe("geocode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the Census onelineaddress URL with the right params", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => okResponse,
    });
    await geocode("1 Apple Park Way, Cupertino, CA");
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain(
      "geocoding.geo.census.gov/geocoder/locations/onelineaddress",
    );
    expect(url).toContain("benchmark=Public_AR_Current");
    expect(url).toContain("format=json");
    expect(url).toContain(encodeURIComponent("1 Apple Park Way, Cupertino, CA"));
  });

  it("returns lat/lng/matchedAddress on success", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => okResponse,
    });
    const result = await geocode("1 Apple Park Way, Cupertino, CA");
    expect(result.lat).toBeCloseTo(37.3346, 4);
    expect(result.lng).toBeCloseTo(-122.009, 4);
    expect(result.matchedAddress).toBe(
      "1 APPLE PARK WAY, CUPERTINO, CA, 95014",
    );
  });

  it("throws GeocoderError with kind=no_match on zero results", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => emptyResponse,
    });
    await expect(geocode("nonsense")).rejects.toMatchObject({
      name: "GeocoderError",
      kind: "no_match",
    });
  });

  it("throws GeocoderError with kind=network on non-OK response", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    await expect(geocode("anything")).rejects.toMatchObject({
      name: "GeocoderError",
      kind: "network",
    });
  });
});
