# S2 — Wire NREL PVWatts + Open-Meteo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user submits a US commercial address, the app geocodes it, calls NREL PVWatts v8 and Open-Meteo in parallel, and renders real numeric results (annual production kWh, capacity factor, today's irradiance, today's sunshine hours, station name) in a branded results panel. Placeholder 3D building stays in place; Google Solar comes in S3.

**Architecture:** A composite `useSolarAnalysis(address)` hook orchestrates three Tanstack Query queries: first a US Census Geocoder call (`enabled: !!address`), then NREL and Open-Meteo in parallel gated on `enabled: !!coords`. Each query exposes its own loading/error state so `ResultsPanel` can render per-tile partial success — one upstream failing does not blank the others.

**Tech Stack:** React 18 + TS strict, Vite, Tailwind v4, Tanstack Query v5, Vitest (new for unit tests on pure helpers + API clients), pure `fetch` (no axios/no client SDKs).

**Locked design decisions:**
- Address → lat/lng via US Census Geocoder (`geocoding.geo.census.gov/geocoder/locations/onelineaddress`). Treated as infrastructure for accepting addresses, not a 5th data API.
- `system_capacity` hardcoded to `100` kW for all PVWatts calls in S2, with `// TODO(s3):` markers everywhere it appears.
- Demo address chips backstop the geocoder for screenshots/demos.
- Error UI: branded restraint — off-white text, no red, no icons, sentence-case messages, treated as a normal state.

---

## File Structure

**New files**
- `src/lib/apis/geocoder.ts` — US Census Geocoder client
- `src/lib/apis/openMeteo.ts` — Open-Meteo client
- `src/lib/apis/pvwatts.ts` — NREL PVWatts v8 client (locks 100 kW + flat-roof defaults)
- `src/lib/units.ts` — Pure unit conversions and formatters
- `src/lib/demoAddresses.ts` — 3 pre-resolved demo addresses
- `src/lib/queryClient.ts` — Tanstack Query client with sensible defaults
- `src/hooks/useSolarAnalysis.ts` — Composite hook chaining the three queries
- `src/components/ResultsPanel/index.tsx` — Branded results panel with per-tile error states
- `src/components/ResultsPanel/StatTile.tsx` — One label/value/unit/error tile
- `src/components/DemoAddressChips/index.tsx` — Preset chip row
- `vitest.config.ts` — Vitest config (jsdom not needed; pure-fn tests use default node env)
- `src/lib/units.test.ts` — Unit-conversion tests
- `src/lib/apis/geocoder.test.ts` — Geocoder URL + parsing tests
- `src/lib/apis/openMeteo.test.ts` — Open-Meteo URL + parsing tests
- `src/lib/apis/pvwatts.test.ts` — PVWatts URL + parsing tests

**Modified files**
- `package.json` — add `@tanstack/react-query`, `vitest`; add `test` script
- `src/main.tsx` — wrap `<App>` in `<QueryClientProvider>`
- `src/App.tsx` — lift `submittedAddress` to state, render `<ResultsPanel>` and `<DemoAddressChips>`
- `src/components/AddressInput/index.tsx` — accept controlled `value`/`onChange` so chips can fill it

---

## Error UI specification (applies to Task 10)

All error/empty messages render as **off-white text at 70% opacity, sentence-case, no icons, no red, no borders that imply alarm.** Identical typography to a normal value display, just textual rather than numeric. Specific copy:

| Failure | Tile-level message | Panel-level (if no coords) |
|---|---|---|
| Census 0 matches | n/a (panel-level only) | "Couldn't find that address. Try including the city and state." |
| Census network/4xx/5xx | n/a (panel-level only) | "Address lookup is briefly unavailable." |
| PVWatts errors[] non-empty | "Production estimate unavailable for this location." | n/a |
| PVWatts network/4xx/5xx | "Production estimate unavailable." | n/a |
| Open-Meteo network/4xx/5xx | "Today's irradiance is unavailable." | n/a |

Partial success is always rendered: if PVWatts fails but Open-Meteo succeeds, the irradiance tile shows real values and the production tile shows its message. The panel never renders an empty state when at least one downstream succeeded.

---

## Task 1: Add Tanstack Query + Vitest, wire QueryClientProvider

**Files:**
- Modify: `package.json`
- Create: `src/lib/queryClient.ts`
- Modify: `src/main.tsx`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install @tanstack/react-query
npm install -D vitest
```

- [ ] **Step 2: Add `test` script to package.json**

In `package.json`, add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create Vitest config**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create QueryClient module**

`src/lib/queryClient.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 5: Wrap App in provider**

Update `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { queryClient } from "./lib/queryClient";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 6: Verify dev server boots and typecheck passes**

```bash
npm run typecheck
npm run dev
```

Expected: typecheck exits 0; dev server starts on :5173 with no console errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/main.tsx src/lib/queryClient.ts vitest.config.ts
git commit -m "S2: add Tanstack Query + Vitest, wire QueryClientProvider"
```

---

## Task 2: Pure units helpers (TDD)

**Files:**
- Create: `src/lib/units.ts`
- Create: `src/lib/units.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/units.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  mjPerM2ToKwhPerM2,
  secondsToHours,
  formatKwh,
  formatPercent,
  formatHours,
  formatKwhPerM2,
} from "./units";

describe("mjPerM2ToKwhPerM2", () => {
  it("converts 29.28 MJ/m² to ~8.13 kWh/m²", () => {
    expect(mjPerM2ToKwhPerM2(29.28)).toBeCloseTo(8.133, 3);
  });
  it("handles 0", () => {
    expect(mjPerM2ToKwhPerM2(0)).toBe(0);
  });
});

describe("secondsToHours", () => {
  it("converts 46800s to 13h", () => {
    expect(secondsToHours(46800)).toBe(13);
  });
  it("rounds to one decimal", () => {
    expect(secondsToHours(45000)).toBeCloseTo(12.5, 1);
  });
});

describe("formatters", () => {
  it("formatKwh groups thousands and drops decimals", () => {
    expect(formatKwh(175251)).toBe("175,251");
  });
  it("formatPercent renders with one decimal and % suffix", () => {
    expect(formatPercent(20)).toBe("20.0%");
  });
  it("formatHours renders one decimal with h suffix", () => {
    expect(formatHours(13)).toBe("13.0 h");
  });
  it("formatKwhPerM2 renders two decimals", () => {
    expect(formatKwhPerM2(8.133)).toBe("8.13 kWh/m²");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement units module**

`src/lib/units.ts`:

```ts
export function mjPerM2ToKwhPerM2(mj: number): number {
  return mj / 3.6;
}

export function secondsToHours(s: number): number {
  return Math.round((s / 3600) * 10) / 10;
}

export function formatKwh(kwh: number): string {
  return Math.round(kwh).toLocaleString("en-US");
}

export function formatPercent(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function formatHours(h: number): string {
  return `${h.toFixed(1)} h`;
}

export function formatKwhPerM2(kwh: number): string {
  return `${kwh.toFixed(2)} kWh/m²`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all unit tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/units.ts src/lib/units.test.ts
git commit -m "S2: add units helpers for MJ→kWh, seconds→hours, formatters"
```

---

## Task 3: Demo addresses module

**Files:**
- Create: `src/lib/demoAddresses.ts`

- [ ] **Step 1: Create module**

`src/lib/demoAddresses.ts`:

```ts
export type DemoAddress = {
  label: string;
  address: string;
  lat: number;
  lng: number;
};

export const DEMO_ADDRESSES: DemoAddress[] = [
  {
    label: "Apple Park",
    address: "1 Apple Park Way, Cupertino, CA",
    lat: 37.3346,
    lng: -122.0090,
  },
  {
    label: "Las Vegas Convention Center",
    address: "3150 Paradise Rd, Las Vegas, NV",
    lat: 36.1311,
    lng: -115.1518,
  },
  {
    label: "Mall of America",
    address: "60 E Broadway, Bloomington, MN",
    lat: 44.8548,
    lng: -93.2422,
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/demoAddresses.ts
git commit -m "S2: add demo address presets with pre-resolved coords"
```

---

## Task 4: Geocoder client (US Census)

**Files:**
- Create: `src/lib/apis/geocoder.ts`
- Create: `src/lib/apis/geocoder.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/apis/geocoder.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { geocode, GeocoderError } from "./geocoder";

const okResponse = {
  result: {
    addressMatches: [
      {
        matchedAddress: "1 APPLE PARK WAY, CUPERTINO, CA, 95014",
        coordinates: { x: -122.0090, y: 37.3346 },
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
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("geocoding.geo.census.gov/geocoder/locations/onelineaddress");
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
    expect(result.lng).toBeCloseTo(-122.0090, 4);
    expect(result.matchedAddress).toBe("1 APPLE PARK WAY, CUPERTINO, CA, 95014");
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement geocoder**

`src/lib/apis/geocoder.ts`:

```ts
export type GeocodeResult = {
  lat: number;
  lng: number;
  matchedAddress: string;
};

export type GeocoderErrorKind = "no_match" | "network";

export class GeocoderError extends Error {
  name = "GeocoderError";
  constructor(public kind: GeocoderErrorKind, message: string) {
    super(message);
  }
}

const ENDPOINT = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all 4 geocoder tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/apis/geocoder.ts src/lib/apis/geocoder.test.ts
git commit -m "S2: add US Census geocoder client with typed errors"
```

---

## Task 5: Open-Meteo client

**Files:**
- Create: `src/lib/apis/openMeteo.ts`
- Create: `src/lib/apis/openMeteo.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/apis/openMeteo.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchDailyIrradiance, OpenMeteoError } from "./openMeteo";

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
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement client**

`src/lib/apis/openMeteo.ts`:

```ts
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
```

Note: `URLSearchParams` keeps the test substring matches stable because the params are added in insertion order.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all 3 Open-Meteo tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/apis/openMeteo.ts src/lib/apis/openMeteo.test.ts
git commit -m "S2: add Open-Meteo client for daily irradiance + sunshine"
```

---

## Task 6: NREL PVWatts v8 client

**Files:**
- Create: `src/lib/apis/pvwatts.ts`
- Create: `src/lib/apis/pvwatts.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/apis/pvwatts.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchPvwatts, PvwattsError, S2_DEFAULT_SYSTEM_CAPACITY_KW } from "./pvwatts";

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

  it("uses developer.nlr.gov (not nrel.gov) and includes all S2 defaults", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => okResponse,
    });
    await fetchPvwatts({ lat: 36.1699, lng: -115.1398 });
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
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

  it("exports the S2 default system capacity constant as 100", () => {
    expect(S2_DEFAULT_SYSTEM_CAPACITY_KW).toBe(100);
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
    await expect(
      fetchPvwatts({ lat: 999, lng: 999 }),
    ).rejects.toMatchObject({
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
    await expect(
      fetchPvwatts({ lat: 0, lng: 0 }),
    ).rejects.toMatchObject({ name: "PvwattsError" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement client**

`src/lib/apis/pvwatts.ts`:

```ts
// TODO(s3): system_capacity is hardcoded to 100 kW for S2. In S3, derive it
// from Google Solar's maxArrayPanelsCount × panelCapacityWatts ÷ 1000.
export const S2_DEFAULT_SYSTEM_CAPACITY_KW = 100;

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
    // TODO(s3): replace with Google Solar–derived capacity
    system_capacity: String(args.systemCapacityKw ?? S2_DEFAULT_SYSTEM_CAPACITY_KW),
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all 5 PVWatts tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/apis/pvwatts.ts src/lib/apis/pvwatts.test.ts
git commit -m "S2: add NREL PVWatts v8 client with 100kW S2 default + TODO(s3)"
```

---

## Task 7: Composite `useSolarAnalysis` hook

**Files:**
- Create: `src/hooks/useSolarAnalysis.ts`

No unit tests for this task (per JP: browser verification is the gate).

- [ ] **Step 1: Implement hook**

`src/hooks/useSolarAnalysis.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { geocode, type GeocodeResult } from "../lib/apis/geocoder";
import { fetchPvwatts, type PvwattsResult } from "../lib/apis/pvwatts";
import {
  fetchDailyIrradiance,
  type DailyIrradiance,
} from "../lib/apis/openMeteo";

export type AnalysisInput =
  | { kind: "address"; address: string }
  | { kind: "coords"; address: string; lat: number; lng: number };

type QueryState<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export type SolarAnalysis = {
  coords: QueryState<GeocodeResult>;
  pvwatts: QueryState<PvwattsResult>;
  openMeteo: QueryState<DailyIrradiance>;
  isIdle: boolean;
};

export function useSolarAnalysis(input: AnalysisInput | null): SolarAnalysis {
  const geocodeQuery = useQuery({
    queryKey: ["geocode", input?.kind === "address" ? input.address : null],
    queryFn: () => {
      if (!input || input.kind !== "address") {
        throw new Error("unreachable");
      }
      return geocode(input.address);
    },
    enabled: input?.kind === "address",
  });

  const coords: GeocodeResult | undefined =
    input?.kind === "coords"
      ? { lat: input.lat, lng: input.lng, matchedAddress: input.address }
      : geocodeQuery.data;

  const pvwattsQuery = useQuery({
    queryKey: ["pvwatts", coords?.lat, coords?.lng],
    queryFn: () => fetchPvwatts({ lat: coords!.lat, lng: coords!.lng }),
    enabled: !!coords,
  });

  const openMeteoQuery = useQuery({
    queryKey: ["openMeteo", coords?.lat, coords?.lng],
    queryFn: () => fetchDailyIrradiance({ lat: coords!.lat, lng: coords!.lng }),
    enabled: !!coords,
  });

  return {
    coords: {
      data: coords,
      isLoading: input?.kind === "address" ? geocodeQuery.isLoading : false,
      isError: input?.kind === "address" ? geocodeQuery.isError : false,
      error: input?.kind === "address" ? geocodeQuery.error : null,
    },
    pvwatts: {
      data: pvwattsQuery.data,
      isLoading: pvwattsQuery.isLoading && pvwattsQuery.fetchStatus !== "idle",
      isError: pvwattsQuery.isError,
      error: pvwattsQuery.error,
    },
    openMeteo: {
      data: openMeteoQuery.data,
      isLoading: openMeteoQuery.isLoading && openMeteoQuery.fetchStatus !== "idle",
      isError: openMeteoQuery.isError,
      error: openMeteoQuery.error,
    },
    isIdle: input === null,
  };
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSolarAnalysis.ts
git commit -m "S2: add useSolarAnalysis composite hook (geocode → pvwatts + open-meteo)"
```

---

## Task 8: `StatTile` component

**Files:**
- Create: `src/components/ResultsPanel/StatTile.tsx`

- [ ] **Step 1: Implement component**

`src/components/ResultsPanel/StatTile.tsx`:

```tsx
type Props = {
  label: string;
  value: string;
  unit?: string;
  state: "idle" | "loading" | "ok" | "unavailable";
  message?: string;
};

export default function StatTile({ label, value, unit, state, message }: Props) {
  return (
    <div className="flex flex-col gap-1 py-2">
      <span className="text-xs uppercase tracking-wider text-offwhite/50">
        {label}
      </span>
      {state === "ok" ? (
        <span className="font-mono text-2xl text-offwhite">
          {value}
          {unit ? <span className="text-base text-offwhite/60 ml-1">{unit}</span> : null}
        </span>
      ) : state === "loading" ? (
        <span className="font-mono text-2xl text-offwhite/40">—</span>
      ) : (
        <span className="text-sm text-offwhite/70">
          {message ?? "Unavailable."}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ResultsPanel/StatTile.tsx
git commit -m "S2: add StatTile component with branded loading/unavailable states"
```

---

## Task 9: `ResultsPanel` component with error states

**Files:**
- Create: `src/components/ResultsPanel/index.tsx`

- [ ] **Step 1: Implement component**

`src/components/ResultsPanel/index.tsx`:

```tsx
import type { SolarAnalysis } from "../../hooks/useSolarAnalysis";
import { GeocoderError } from "../../lib/apis/geocoder";
import {
  formatHours,
  formatKwh,
  formatKwhPerM2,
  formatPercent,
  mjPerM2ToKwhPerM2,
  secondsToHours,
} from "../../lib/units";
import StatTile from "./StatTile";

type Props = {
  analysis: SolarAnalysis;
};

function coordsMessage(error: unknown): string {
  if (error instanceof GeocoderError && error.kind === "no_match") {
    return "Couldn't find that address. Try including the city and state.";
  }
  return "Address lookup is briefly unavailable.";
}

export default function ResultsPanel({ analysis }: Props) {
  if (analysis.isIdle) {
    return (
      <p className="text-sm text-offwhite/60">
        Submit an address to see production estimates.
      </p>
    );
  }

  if (analysis.coords.isLoading) {
    return <p className="text-sm text-offwhite/60">Locating address…</p>;
  }

  if (analysis.coords.isError || !analysis.coords.data) {
    return (
      <p className="text-sm text-offwhite/70">
        {coordsMessage(analysis.coords.error)}
      </p>
    );
  }

  const pv = analysis.pvwatts;
  const om = analysis.openMeteo;

  const pvState: "loading" | "ok" | "unavailable" = pv.isLoading
    ? "loading"
    : pv.isError || !pv.data
    ? "unavailable"
    : "ok";
  const omState: "loading" | "ok" | "unavailable" = om.isLoading
    ? "loading"
    : om.isError || !om.data
    ? "unavailable"
    : "ok";

  const todayKwhPerM2 = om.data
    ? mjPerM2ToKwhPerM2(om.data.shortwaveMjPerM2)
    : 0;
  const todayHours = om.data ? secondsToHours(om.data.sunshineSeconds) : 0;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-offwhite/50 mb-2 font-mono">
        {analysis.coords.data.matchedAddress}
      </p>

      <StatTile
        label="Annual production (100 kW system)"
        value={pv.data ? formatKwh(pv.data.acAnnualKwh) : ""}
        unit="kWh / year"
        state={pvState}
        message="Production estimate unavailable."
      />

      <StatTile
        label="Capacity factor"
        value={pv.data ? formatPercent(pv.data.capacityFactorPercent) : ""}
        state={pvState}
        message="Production estimate unavailable."
      />

      <StatTile
        label="Today's irradiance"
        value={om.data ? formatKwhPerM2(todayKwhPerM2) : ""}
        state={omState}
        message="Today's irradiance is unavailable."
      />

      <StatTile
        label="Today's sunshine"
        value={om.data ? formatHours(todayHours) : ""}
        state={omState}
        message="Today's sunshine is unavailable."
      />

      {pv.data ? (
        <p className="text-xs text-offwhite/40 mt-3 font-mono">
          NREL station: {pv.data.stationCity}, {pv.data.stationState}
        </p>
      ) : null}

      <p className="text-xs text-offwhite/30 mt-2 italic">
        100 kW assumption; replaced with roof-derived capacity in S3.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ResultsPanel/index.tsx
git commit -m "S2: add ResultsPanel with per-tile partial-success error states"
```

---

## Task 10: `DemoAddressChips` component

**Files:**
- Create: `src/components/DemoAddressChips/index.tsx`

- [ ] **Step 1: Implement component**

`src/components/DemoAddressChips/index.tsx`:

```tsx
import { DEMO_ADDRESSES, type DemoAddress } from "../../lib/demoAddresses";

type Props = {
  onSelect: (a: DemoAddress) => void;
};

export default function DemoAddressChips({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-offwhite/50">
        Demo addresses
      </span>
      <div className="flex flex-wrap gap-2">
        {DEMO_ADDRESSES.map((a) => (
          <button
            key={a.address}
            type="button"
            onClick={() => onSelect(a)}
            className="rounded-full border border-sage/40 bg-forest px-3 py-1 text-xs text-offwhite/80 hover:border-sage hover:text-offwhite transition"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DemoAddressChips/index.tsx
git commit -m "S2: add demo address chips for fast preview"
```

---

## Task 11: Make `AddressInput` controlled

**Files:**
- Modify: `src/components/AddressInput/index.tsx`

- [ ] **Step 1: Update to accept controlled value/onChange**

Replace the entire file with:

```tsx
import { type FormEvent } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (address: string) => void;
};

export default function AddressInput({ value, onChange, onSubmit }: Props) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="address" className="text-sm text-offwhite/70">
        Commercial address
      </label>
      <input
        id="address"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1 Apple Park Way, Cupertino, CA"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-md bg-forest border border-sage/40 px-3 py-2 text-base text-offwhite placeholder:text-offwhite/30 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/40 transition"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="self-start rounded-md bg-gold text-forest font-medium px-4 py-2 text-sm hover:bg-gold/90 active:bg-gold/80 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        Analyze
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit (after wire-up in next task, since App.tsx won't compile until then)**

Defer commit until Task 12 — both files commit together.

---

## Task 12: Wire `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace App with wired version**

```tsx
import { useState } from "react";
import AddressInput from "./components/AddressInput";
import DemoAddressChips from "./components/DemoAddressChips";
import ResultsPanel from "./components/ResultsPanel";
import { useSolarAnalysis, type AnalysisInput } from "./hooks/useSolarAnalysis";
import Scene from "./scene/Canvas";

export default function App() {
  const [inputValue, setInputValue] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisInput | null>(null);

  function handleAddressSubmit(address: string) {
    setAnalysis({ kind: "address", address });
  }

  function handleDemoSelect(a: { label: string; address: string; lat: number; lng: number }) {
    setInputValue(a.address);
    setAnalysis({ kind: "coords", address: a.address, lat: a.lat, lng: a.lng });
  }

  const result = useSolarAnalysis(analysis);

  return (
    <div className="min-h-screen flex flex-col bg-forest text-offwhite">
      <header className="px-6 md:px-10 pt-8 pb-4 border-b border-sage/20">
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
          Energy Owl
        </h1>
        <p className="mt-2 text-sm md:text-base text-offwhite/70 max-w-xl">
          Drop a US commercial address. Get a 3D roof, production estimates,
          and an AI-generated narrative report.
        </p>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(320px,420px)_1fr] gap-6 px-6 md:px-10 py-8">
        <section className="flex flex-col gap-6">
          <div className="rounded-lg border border-sage/20 bg-forest p-5 flex flex-col gap-5">
            <AddressInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleAddressSubmit}
            />
            <DemoAddressChips onSelect={handleDemoSelect} />
          </div>
          <div className="rounded-lg border border-sage/20 bg-forest p-5">
            <ResultsPanel analysis={result} />
          </div>
        </section>

        <section className="rounded-lg border border-sage/20 bg-forest min-h-[420px] overflow-hidden">
          <Scene />
        </section>
      </div>

      <footer className="px-6 md:px-10 py-4 border-t border-sage/20 text-xs text-offwhite/40 font-mono">
        shiftatlas.tech · portfolio demo
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit AddressInput + App together**

```bash
git add src/components/AddressInput/index.tsx src/App.tsx
git commit -m "S2: wire address submit + demo chips → useSolarAnalysis → ResultsPanel"
```

---

## Task 13: Browser verification

- [ ] **Step 1: Make sure `.env.local` has `VITE_NREL_API_KEY`**

If missing, instruct JP to populate from his existing NREL key (don't generate).

- [ ] **Step 2: Start dev server**

Use `preview_start` (or `npm run dev` if working outside preview tools).

- [ ] **Step 3: Click "Las Vegas Convention Center" chip**

Expected:
- Address field fills with "3150 Paradise Rd, Las Vegas, NV"
- Within ~2s, results panel shows:
  - Annual production: a number in the ~150,000–200,000 kWh range
  - Capacity factor: roughly 18–22%
  - Today's irradiance: a number in kWh/m²
  - Today's sunshine: a number in hours
  - Station info line at the bottom

- [ ] **Step 4: Type a real address and submit**

E.g., "1 Apple Park Way, Cupertino, CA". Expected: same shape of result, station info reflects a CA station.

- [ ] **Step 5: Submit a deliberately bad address**

E.g., "xyzxyz12345". Expected: panel-level message "Couldn't find that address. Try including the city and state." in off-white, no red.

- [ ] **Step 6: Verify partial-failure rendering (visual inspection only)**

Examine the network panel: while one query is in flight, the other tiles show "—" placeholders. After both succeed, all four tiles populate.

- [ ] **Step 7: Screenshot the working state for the commit**

- [ ] **Step 8: Run final typecheck**

```bash
npm run typecheck && npm test
```

Expected: both exit 0.

- [ ] **Step 9: Commit any final tidy-ups (likely none)**

Skip if no diff.

---

## Self-review notes

- All API URLs use `developer.nlr.gov`, never `nrel.gov` (PVWatts test enforces this).
- `// TODO(s3):` markers appear in `src/lib/apis/pvwatts.ts` on the capacity constant and the param itself.
- Error UI: off-white, sentence-case, no icons, no red — enforced by `StatTile`'s muted-text fallback and `ResultsPanel`'s coords-failure path.
- Vitest tests cover: pure unit conversions, all three API clients' URL construction + response parsing + error paths.
- Browser verification is the gate for the hook + UI integration per JP's explicit call.
- All new dependencies (`@tanstack/react-query`, `vitest`) are part of the locked stack or test infrastructure.
