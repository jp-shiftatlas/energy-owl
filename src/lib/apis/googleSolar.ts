// TODO(v2): Move this call behind a serverless function so the API key
// isn't exposed in the browser bundle. v1 tradeoff accepted per spec.

export type LatLng = { latitude: number; longitude: number };
export type BoundingBox = { sw: LatLng; ne: LatLng };

export type RoofSegmentStats = {
  pitchDegrees: number;
  azimuthDegrees: number;
  // Absolute meters above sea level. Convert to a relative roof Y by
  // subtracting the per-building minimum before rendering.
  planeHeightAtCenterMeters: number;
  stats: {
    areaMeters2: number;
    // 11 elements: 0%, 10%, 20%, ..., 100% percentiles of estimated
    // annual sunshine hours over the segment.
    sunshineQuantiles: number[];
    groundAreaMeters2: number;
  };
  center: LatLng;
  boundingBox: BoundingBox;
};

export type BuildingInsights = {
  name: string;
  center: LatLng;
  imageryDate: { year: number; month: number; day: number };
  imageryQuality: "HIGH" | "MEDIUM" | "LOW";
  boundingBox: BoundingBox;
  solarPotential: {
    maxArrayPanelsCount: number;
    maxArrayAreaMeters2: number;
    maxSunshineHoursPerYear: number;
    panelCapacityWatts: number;
    panelHeightMeters: number;
    panelWidthMeters: number;
    roofSegmentStats: RoofSegmentStats[];
  };
};

export type GoogleSolarErrorKind =
  | "missing_key"
  | "not_found"
  | "request_failed"
  | "bad_response";

export class GoogleSolarError extends Error {
  name = "GoogleSolarError";
  constructor(
    public readonly kind: GoogleSolarErrorKind,
    message: string,
  ) {
    super(message);
  }
}

const ENDPOINT =
  "https://solar.googleapis.com/v1/buildingInsights:findClosest";

async function requestQuality(
  apiKey: string,
  lat: number,
  lng: number,
  quality: "HIGH" | "MEDIUM",
): Promise<Response> {
  const params = new URLSearchParams({
    "location.latitude": String(lat),
    "location.longitude": String(lng),
    requiredQuality: quality,
    key: apiKey,
  });
  return fetch(`${ENDPOINT}?${params.toString()}`);
}

export async function fetchBuildingInsights(args: {
  lat: number;
  lng: number;
}): Promise<BuildingInsights> {
  const apiKey = import.meta.env.VITE_GOOGLE_SOLAR_KEY;
  if (!apiKey) {
    throw new GoogleSolarError("missing_key", "Missing VITE_GOOGLE_SOLAR_KEY");
  }

  let res: Response;
  try {
    res = await requestQuality(apiKey, args.lat, args.lng, "HIGH");
    if (res.status === 404) {
      res = await requestQuality(apiKey, args.lat, args.lng, "MEDIUM");
    }
  } catch {
    throw new GoogleSolarError("request_failed", "Solar API request failed");
  }

  if (res.status === 404) {
    throw new GoogleSolarError(
      "not_found",
      "No solar data available for this location",
    );
  }
  if (!res.ok) {
    throw new GoogleSolarError(
      "request_failed",
      `Solar API returned ${res.status}`,
    );
  }

  const json = (await res.json()) as Partial<BuildingInsights>;
  if (
    !json.solarPotential ||
    !Array.isArray(json.solarPotential.roofSegmentStats) ||
    json.solarPotential.roofSegmentStats.length === 0
  ) {
    throw new GoogleSolarError(
      "bad_response",
      "Solar API response missing roofSegmentStats",
    );
  }
  return json as BuildingInsights;
}
