// Used when Google Solar buildingInsights is unavailable for the location
// (404 outside US metro coverage, or API errors). When Solar data is
// present, useSolarAnalysis derives capacity from
// maxArrayPanelsCount × panelCapacityWatts ÷ 1000 instead.
export const FALLBACK_SYSTEM_CAPACITY_KW = 100;

export type PvwattsResult = {
  acAnnualKwh: number;
  capacityFactorPercent: number;
  solradAnnualKwhPerM2Day: number;
  stationCity: string;
  stationState: string;
};

export class PvwattsError extends Error {
  name = "PvwattsError";
}

const ENDPOINT = "https://developer.nlr.gov/api/pvwatts/v8.json";

export async function fetchPvwatts(args: {
  lat: number;
  lng: number;
  systemCapacityKw?: number;
}): Promise<PvwattsResult> {
  const apiKey = import.meta.env.VITE_NREL_API_KEY;
  if (!apiKey) {
    throw new PvwattsError("Missing VITE_NREL_API_KEY");
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    lat: String(args.lat),
    lon: String(args.lng),
    system_capacity: String(
      args.systemCapacityKw ?? FALLBACK_SYSTEM_CAPACITY_KW,
    ),
    module_type: "0",
    losses: "14",
    array_type: "1",
    tilt: "20",
    azimuth: "180",
    dataset: "nsrdb",
    radius: "0",
    timeframe: "monthly",
  });
  const url = `${ENDPOINT}?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new PvwattsError("PVWatts request failed");
  }

  if (!res.ok) {
    throw new PvwattsError(`PVWatts returned ${res.status}`);
  }

  const json = (await res.json()) as {
    errors?: string[];
    outputs?: {
      ac_annual?: number;
      capacity_factor?: number;
      solrad_annual?: number;
    } | null;
    station_info?: { city?: string; state?: string };
  };

  if (json.errors && json.errors.length > 0) {
    throw new PvwattsError(json.errors.join("; "));
  }

  const o = json.outputs;
  if (!o || o.ac_annual === undefined || o.capacity_factor === undefined) {
    throw new PvwattsError("PVWatts response missing outputs");
  }

  return {
    acAnnualKwh: o.ac_annual,
    capacityFactorPercent: o.capacity_factor,
    solradAnnualKwhPerM2Day: o.solrad_annual ?? 0,
    stationCity: json.station_info?.city ?? "",
    stationState: json.station_info?.state ?? "",
  };
}
