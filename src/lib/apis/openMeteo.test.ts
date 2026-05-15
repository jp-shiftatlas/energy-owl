import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchDailyIrradiance } from "./openMeteo";

const okResponse = {
  daily: {
    time: ["2026-05-16", "2026-05-17"],
    shortwave_radiation_sum: [29.28, 30.1],
    sunshine_duration: [46800, 47100],
  },
};

describe("fetchDailyIrradiance", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the Open-Meteo URL with the right params", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => okResponse,
    });
    await fetchDailyIrradiance({ lat: 36.1699, lng: -115.1398 });
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain("api.open-meteo.com/v1/forecast");
    expect(url).toContain("latitude=36.1699");
    expect(url).toContain("longitude=-115.1398");
    expect(url).toContain("shortwave_radiation_sum");
    expect(url).toContain("sunshine_duration");
    expect(url).toContain("timezone=auto");
    expect(url).toContain("forecast_days=1");
  });

  it("returns today's irradiance and sunshine on success", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => okResponse,
    });
    const result = await fetchDailyIrradiance({ lat: 36.1699, lng: -115.1398 });
    expect(result.shortwaveMjPerM2).toBe(29.28);
    expect(result.sunshineSeconds).toBe(46800);
    expect(result.date).toBe("2026-05-16");
  });

  it("throws OpenMeteoError on non-OK response", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await expect(
      fetchDailyIrradiance({ lat: 0, lng: 0 }),
    ).rejects.toMatchObject({ name: "OpenMeteoError" });
  });
});
