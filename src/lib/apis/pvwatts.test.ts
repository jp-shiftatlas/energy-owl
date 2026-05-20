import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchPvwatts, FALLBACK_SYSTEM_CAPACITY_KW } from "./pvwatts";

const okResponse = {
  errors: [],
  warnings: [],
  station_info: { city: "Las Vegas", state: "Nevada" },
  outputs: {
    ac_annual: 175251.0,
    capacity_factor: 20.0,
    solrad_annual: 6.41,
  },
};

const errorsResponse = {
  errors: ["lat must be a number"],
  warnings: [],
  outputs: null,
};

describe("fetchPvwatts", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("VITE_NREL_API_KEY", "test-key-abc");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses developer.nlr.gov (not nrel.gov) and includes all defaults", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => okResponse,
    });
    await fetchPvwatts({ lat: 36.1699, lng: -115.1398 });
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain("developer.nlr.gov/api/pvwatts/v8.json");
    expect(url).not.toContain("nrel.gov");
    expect(url).toContain("api_key=test-key-abc");
    expect(url).toContain("lat=36.1699");
    expect(url).toContain("lon=-115.1398");
    expect(url).toContain("system_capacity=100");
    expect(url).toContain("module_type=0");
    expect(url).toContain("losses=14");
    expect(url).toContain("array_type=1");
    expect(url).toContain("tilt=20");
    expect(url).toContain("azimuth=180");
    expect(url).toContain("dataset=nsrdb");
    expect(url).toContain("radius=0");
    expect(url).toContain("timeframe=monthly");
  });

  it("exports the fallback system capacity constant as 100", () => {
    expect(FALLBACK_SYSTEM_CAPACITY_KW).toBe(100);
  });

  it("forwards an explicit systemCapacityKw into the query", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => okResponse,
    });
    await fetchPvwatts({ lat: 36.1699, lng: -115.1398, systemCapacityKw: 9977 });
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain("system_capacity=9977");
    expect(url).not.toContain("system_capacity=100");
  });

  it("parses outputs on success", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => okResponse,
    });
    const r = await fetchPvwatts({ lat: 36.1699, lng: -115.1398 });
    expect(r.acAnnualKwh).toBe(175251);
    expect(r.capacityFactorPercent).toBe(20);
    expect(r.solradAnnualKwhPerM2Day).toBe(6.41);
    expect(r.stationCity).toBe("Las Vegas");
    expect(r.stationState).toBe("Nevada");
  });

  it("throws PvwattsError when errors[] non-empty", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => errorsResponse,
    });
    await expect(fetchPvwatts({ lat: 999, lng: 999 })).rejects.toMatchObject({
      name: "PvwattsError",
      message: expect.stringContaining("lat must be a number"),
    });
  });

  it("throws PvwattsError on non-OK response", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await expect(fetchPvwatts({ lat: 0, lng: 0 })).rejects.toMatchObject({
      name: "PvwattsError",
    });
  });
});
