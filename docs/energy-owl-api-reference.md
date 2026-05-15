# Energy Owl — API Reference

Consolidated reference for the four external APIs Energy Owl integrates.
Every API listed has been tested live from JP's machine and confirmed
working. Real request/response shapes documented here so Claude Code
doesn't have to guess.

---

## 1. Open-Meteo

**Purpose:** Daily solar irradiance and sunshine duration for "today's
potential" headline metric.

**Authentication:** None. No API key, no signup.

**Endpoint:**
```
GET https://api.open-meteo.com/v1/forecast
```

**Required params:**
- `latitude` (float)
- `longitude` (float)
- `daily` (comma-separated string, e.g. `shortwave_radiation_sum,sunshine_duration`)
- `timezone` (e.g. `America/Los_Angeles` or `auto`)
- `forecast_days` (1–16)

**Sample call (Las Vegas, 7-day forecast):**
```
https://api.open-meteo.com/v1/forecast?latitude=36.1699&longitude=-115.1398&daily=shortwave_radiation_sum,sunshine_duration&timezone=America/Los_Angeles&forecast_days=7
```

**Response shape (relevant fields):**
```json
{
  "latitude": 36.17,
  "longitude": -115.14,
  "daily_units": {
    "shortwave_radiation_sum": "MJ/m²",
    "sunshine_duration": "s"
  },
  "daily": {
    "time": ["2026-04-29", "2026-04-30", ...],
    "shortwave_radiation_sum": [29.28, 30.1, ...],
    "sunshine_duration": [46800.0, 47100.0, ...]
  }
}
```

**Gotchas:**
- Units: shortwave is **MJ/m²/day**, not kWh/m²/day. Conversion:
  `kWh/m²/day = MJ/m²/day ÷ 3.6`. So 29.28 MJ/m² = ~8.13 kWh/m².
- Sunshine is in **seconds**. Divide by 3600 for hours.
- Free tier is generous but not unlimited. Cache responses per address+day
  in Tanstack Query.

---

## 2. NREL PVWatts v8

**Purpose:** Annual solar production estimates, capacity factor, financial
overlay.

**Authentication:** Free API key from `https://developer.nlr.gov/signup`.
Store as `VITE_NREL_API_KEY` in `.env.local`.

**Endpoint:**
```
GET https://developer.nlr.gov/api/pvwatts/v8.json
```

**CRITICAL:** Use `developer.nlr.gov`, NOT `developer.nrel.gov`. The
domain transition completed April 30, 2026. Old URLs will redirect or
break.

**Required params:**
- `api_key`
- `lat`, `lon`
- `system_capacity` (kW)
- `module_type` (0=standard, 1=premium, 2=thin-film)
- `losses` (% — default 14)
- `array_type` (1=fixed roof, 2=fixed open rack, 3=1-axis, 4=1-axis backtrack, 5=2-axis)
- `tilt` (degrees)
- `azimuth` (degrees, 180 = south-facing)
- `dataset` (`nsrdb` or `intl`)
- `radius` (0 = use nearest station)
- `timeframe` (`hourly` or `monthly`)

**Sample call (100 kW commercial system in Las Vegas):**
```
https://developer.nlr.gov/api/pvwatts/v8.json?api_key=YOUR_KEY&lat=36.1699&lon=-115.1398&system_capacity=100&module_type=0&losses=14&array_type=1&tilt=20&azimuth=180&dataset=nsrdb&radius=0&timeframe=monthly
```

**Response shape (relevant fields):**
```json
{
  "inputs": { ... },
  "errors": [],
  "warnings": [],
  "version": "8.x.x",
  "ssc_info": { ... },
  "station_info": {
    "lat": 36.17,
    "lon": -115.14,
    "elev": 663.0,
    "tz": -8.0,
    "location": "...",
    "city": "Las Vegas",
    "state": "Nevada",
    ...
  },
  "outputs": {
    "ac_monthly": [12534.6, ...],
    "poa_monthly": [...],
    "solrad_monthly": [...],
    "dc_monthly": [...],
    "ac_annual": 175251.0,
    "solrad_annual": 6.41,
    "capacity_factor": 20.0
  }
}
```

**Gotchas:**
- Always check `errors` and `warnings` arrays before using `outputs`.
- `DEMO_KEY` works for testing but is shared globally — rate-limited to
  ~5 req/hr across all users. Get your own key before wiring into the app.
- `array_type=1` (fixed roof mount) is the right choice for commercial
  flat-roof installations.
- For commercial flat roofs, use `tilt=20` and `azimuth=180` as defaults
  unless we have a reason to do otherwise.
- `system_capacity` should be derived from Google Solar's `maxArrayPanelsCount`
  × `panelCapacityWatts` (watts) ÷ 1000 (kW). Cap at a reasonable upper
  bound for the demo (e.g. 1000 kW) so we don't return unrealistic numbers.

---

## 3. Google Solar API — buildingInsights

**Purpose:** Real building roof geometry for the 3D visualization.

**Authentication:** API key from Google Cloud Console. Store as
`VITE_GOOGLE_SOLAR_KEY`. Key MUST be restricted to "Solar API" only.

**Endpoint:**
```
GET https://solar.googleapis.com/v1/buildingInsights:findClosest
```

**Required params:**
- `location.latitude` (float)
- `location.longitude` (float)
- `requiredQuality` (`LOW`, `MEDIUM`, or `HIGH`)
- `key`

**Sample call (Apple Park, Cupertino):**
```
https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=37.3346&location.longitude=-122.0090&requiredQuality=HIGH&key=YOUR_KEY
```

**Response shape (relevant fields):**
```json
{
  "name": "buildings/ChIJN8p-JpG1j4AR6cZxVhdYEUQ",
  "center": { "latitude": 37.3346, "longitude": -122.0090 },
  "imageryDate": { "year": 2022, "month": 4, "day": 23 },
  "imageryQuality": "HIGH",
  "regionCode": "US",
  "administrativeArea": "CA",
  "solarPotential": {
    "maxArrayPanelsCount": 24942,
    "maxArrayAreaMeters2": 48975,
    "maxSunshineHoursPerYear": 1892,
    "panelCapacityWatts": 400,
    "panelHeightMeters": 1.879,
    "panelWidthMeters": 1.045,
    "roofSegmentStats": [
      {
        "pitchDegrees": 0.0,
        "azimuthDegrees": 0.0,
        "stats": { "areaMeters2": 1867, "groundAreaMeters2": 1867 },
        "center": { "latitude": 37.334192, "longitude": -122.006971 },
        "boundingBox": {
          "sw": { ... },
          "ne": { ... }
        }
      },
      ... 130 segments for Apple Park
    ],
    "solarPanels": [ ... ],
    "solarPanelConfigs": [ ... ]
  }
}
```

**Gotchas:**
- Use `requiredQuality=HIGH` for the demo — fall back to MEDIUM if
  HIGH returns 404 NOT_FOUND for the address.
- Coverage is concentrated in US metros. Outside metro coverage,
  expect 404s. Have a graceful error state ready.
- Geometry is in lat/lng degrees. For R3F rendering, convert to a
  local ENU (East/North/Up) frame using a reference point
  (the building center). Don't try to render lat/lng directly.
- `roofSegmentStats` is what you render. `solarPanels` is detailed
  individual panel placement — not needed for v1 if we draw aggregate
  roof segments with shading.
- `panelHeightMeters` / `panelWidthMeters` are physical panel dimensions
  (~1.88m × 1.05m for the default panel) — useful for scale reference
  if you ever draw individual panels.
- Pitch 0° = flat roof. Most commercial buildings will be flat.
- Imagery date can be 2–4 years old. That's fine.

**Daily quota:** Capped at 500/day in JP's Google Cloud project to
prevent runaway costs. $300 free credit covers thousands of calls
before any charge.

---

## 4. Anthropic Claude API

**Purpose:** Synthesize the 1-page narrative report from the structured
numeric data returned by the three data APIs.

**Authentication:** API key from `https://console.anthropic.com/`.
Store as `VITE_ANTHROPIC_KEY`.

**Endpoint:**
```
POST https://api.anthropic.com/v1/messages
```

**Sample request body:**
```json
{
  "model": "claude-sonnet-4-5",
  "max_tokens": 1024,
  "system": "You are an energy systems analyst writing a 1-page report on a commercial building's solar potential. Practitioner voice. No marketing language. State assumptions clearly. ~400 words.",
  "messages": [
    {
      "role": "user",
      "content": "Address: 1 Apple Park Way, Cupertino, CA. Building data: ..."
    }
  ]
}
```

**Required headers:**
```
x-api-key: VITE_ANTHROPIC_KEY
anthropic-version: 2023-06-01
content-type: application/json
```

**For v1 browser-side calls, also include:**
```
anthropic-dangerous-direct-browser-access: true
```

This is required by the API to allow browser calls and is part of why
exposing the key is acceptable for v1 portfolio demo only. Mark this
with `// TODO(v2):` and remove when serverless function is added.

**Response shape:**
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "model": "claude-sonnet-4-5",
  "content": [
    { "type": "text", "text": "The narrative report text..." }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 450,
    "output_tokens": 380
  }
}
```

**Gotchas:**
- Cost: ~$0.01–0.03 per generation at Sonnet pricing. Stay under $0.10
  total per address-submission across all calls.
- Confirm the latest model string before locking it in code. Models get
  superseded. `claude-sonnet-4-5` is current as of April 2026.
- Always check `stop_reason`. If it's `max_tokens`, your output is
  truncated.

---

## Validation harness

Two Python scripts in project knowledge (`test_apis.py` and `test_solar.py`)
hit these endpoints with real coordinates and confirm green status. Run
them again any time something feels broken before debugging the React
app — they isolate "is the API up?" from "is my React code right?"
