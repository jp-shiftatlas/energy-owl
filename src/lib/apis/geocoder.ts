// TODO(scope): freeform input pending scope decision. S2 verification showed
// the US Census Geocoder does not return Access-Control-Allow-Origin, so this
// client can't be called from the browser. Two coherent paths:
//   (a) accept v1 ships chips-only; type-any-address moves to v2
//   (b) update v1 spec to allow Vercel edge rewrites as frontend-only deploy
//       infrastructure, then route this through /api/geocode
// Until that decision is made, the freeform-input path degrades to the
// "Address lookup is briefly unavailable" branded message via the existing
// GeocoderError("network") path — that's the safety net. Demo chips bypass
// this client entirely.

export type GeocodeResult = {
  lat: number;
  lng: number;
  matchedAddress: string;
};

export type GeocoderErrorKind = "no_match" | "network";

export class GeocoderError extends Error {
  name = "GeocoderError";
  constructor(
    public kind: GeocoderErrorKind,
    message: string,
  ) {
    super(message);
  }
}

const ENDPOINT =
  "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

export async function geocode(address: string): Promise<GeocodeResult> {
  const url = `${ENDPOINT}?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new GeocoderError("network", "Address lookup failed");
  }

  if (!res.ok) {
    throw new GeocoderError("network", `Address lookup returned ${res.status}`);
  }

  const json = (await res.json()) as {
    result?: {
      addressMatches?: Array<{
        matchedAddress: string;
        coordinates: { x: number; y: number };
      }>;
    };
  };

  const match = json.result?.addressMatches?.[0];
  if (!match) {
    throw new GeocoderError("no_match", "No address match found");
  }

  return {
    lat: match.coordinates.y,
    lng: match.coordinates.x,
    matchedAddress: match.matchedAddress,
  };
}
