export type DailyIrradiance = {
  date: string;
  shortwaveMjPerM2: number;
  sunshineSeconds: number;
};

export class OpenMeteoError extends Error {
  name = "OpenMeteoError";
}

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export async function fetchDailyIrradiance(args: {
  lat: number;
  lng: number;
}): Promise<DailyIrradiance> {
  const params = new URLSearchParams({
    latitude: String(args.lat),
    longitude: String(args.lng),
    daily: "shortwave_radiation_sum,sunshine_duration",
    timezone: "auto",
    forecast_days: "1",
  });
  const url = `${ENDPOINT}?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new OpenMeteoError("Open-Meteo request failed");
  }

  if (!res.ok) {
    throw new OpenMeteoError(`Open-Meteo returned ${res.status}`);
  }

  const json = (await res.json()) as {
    daily?: {
      time?: string[];
      shortwave_radiation_sum?: number[];
      sunshine_duration?: number[];
    };
  };

  const date = json.daily?.time?.[0];
  const mj = json.daily?.shortwave_radiation_sum?.[0];
  const sec = json.daily?.sunshine_duration?.[0];

  if (date === undefined || mj === undefined || sec === undefined) {
    throw new OpenMeteoError("Open-Meteo response missing daily fields");
  }

  return { date, shortwaveMjPerM2: mj, sunshineSeconds: sec };
}
