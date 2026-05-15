# Energy Owl

A polished single-page demo: drop a US commercial address, get back a 3D roof
visualization, production estimates, payback math, and an AI-generated
narrative report. Portfolio piece for shiftatlas.tech demonstrating the
"address in → multi-API pipeline → AI-synthesized output" signature pattern.

## What this project IS

- **A portfolio piece** for shiftatlas.tech. Built to be shown, screenshotted,
  and linked from LinkedIn posts.
- **A frontend-first demo.** Single-page React app, hosted on Vercel.
- **A learning vehicle** for React-Three-Fiber, Vite, and "pure Claude Code"
  driving discipline.

## What this project is NOT

- ❌ NOT a competitor to Aurora Solar, OpenSolar, HelioScope, or any solar SaaS.
- ❌ NOT a headless rendering pipeline. No Puppeteer, no server-side rendering,
  no GeoTIFF parsing, no bulk processing.
- ❌ NOT a permit/SLD/wire-sizing/CRM tool.
- ❌ NOT international (US only for v1).
- ❌ NOT residential (commercial properties only — flat or low-pitch roofs).
- ❌ NOT a backend service in v1. Browser-side API calls accepted with the
  tradeoff documented.

If a feature being proposed falls into any "NOT" category, stop and ask
before adding it.

## Tech stack (locked — do not deviate)

- **Build:** Vite
- **Framework:** React 18 + TypeScript (strict)
- **3D:** @react-three/fiber + @react-three/drei
- **Styling:** Tailwind CSS
- **State:** React state + Tanstack Query for API calls. No Redux, no Zustand.
- **Routing:** None for v1 (single page)
- **Hosting:** Vercel (free tier)

Do not introduce additional dependencies without explicit confirmation.
Justify every package added beyond the above.

## External APIs (all confirmed working)

### 1. Open-Meteo

- Endpoint: `https://api.open-meteo.com/v1/forecast`
- No API key required.
- Used for: daily shortwave radiation, sunshine duration.
- Called directly from browser.
- Test point used during validation: Las Vegas (36.1699, -115.1398) returned
  29.28 MJ/m² and 46,800 sec sunshine — sanity-checked correct.

### 2. NREL PVWatts v8

- Endpoint: `https://developer.nlr.gov/api/pvwatts/v8.json`
- **Domain note: nrel.gov → nlr.gov transition completed April 30, 2026.**
  Always use `developer.nlr.gov`. Do not let any agent revert to `nrel.gov`.
- API key required. Stored as `VITE_NREL_API_KEY`.
- Used for: annual AC output (kWh), capacity factor, station info.
- Called directly from browser. NREL allows browser-side calls.
- Test result: 100kW system in Las Vegas returns ~175,251 kWh/year,
  20% capacity factor. Use this to validate that wiring works.

### 3. Google Solar API

- Endpoint: `https://solar.googleapis.com/v1/buildingInsights:findClosest`
- API key required. Stored as `VITE_GOOGLE_SOLAR_KEY`.
- Key is restricted to Solar API only, 500/day quota cap.
- Used for: roof segments (geometry, pitch, azimuth, area), max panels,
  max array area.
- Called directly from browser for v1.
- **buildingInsights only.** Do NOT use `dataLayers` for v1 — that endpoint
  returns GeoTIFFs and requires server-side raster processing. Parked for v2.
- Test result: Apple Park returns 24,942 max panels, 130 roof segments,
  HIGH imagery quality. Use this to validate that wiring works.

### 4. Anthropic Claude API

- Endpoint: `https://api.anthropic.com/v1/messages`
- API key required. Stored as `VITE_ANTHROPIC_KEY`.
- Model: `claude-sonnet-4-5` for v1.
- Used for: synthesizing the narrative report from structured numeric data.
- **For v1 only:** called directly from browser. Tradeoff accepted for
  portfolio demo. Mark with `// TODO(v2):` comments where exposed.
  v2 will route through Vercel serverless function.

All API keys live in `.env.local` (which `.gitignore` MUST exclude).
A `.env.example` file lists required variable names with empty values.

## Brand system (do not deviate)

- **Colors:**
  - Deep Forest: `#0F1A12` (background)
  - Sage: `#6B8F71` (primary accent)
  - Gold: `#B8943E` (secondary accent / CTAs)
  - Off-white: `#F5F2EB` (text on dark)
- **Fonts:**
  - Headings: Instrument Serif (Google Fonts)
  - Body: DM Sans (Google Fonts)
  - Mono: JetBrains Mono (Google Fonts)
- **Voice:** Understated, practitioner-grounded. No emojis in UI copy.
  No exclamation points. No "🚀 Get started!" energy.
- **Reference:** matches the shiftatlas.tech aesthetic. When in doubt,
  err toward restraint, not flair.

## Architecture preferences

- **Component structure:** Each major UI surface is its own folder under
  `src/components/` with `index.tsx` and co-located styles/types.
- **API clients:** One module per API in `src/lib/apis/` (e.g., `solar.ts`,
  `pvwatts.ts`, `openMeteo.ts`, `anthropic.ts`). Each exports typed
  request/response interfaces.
- **3D scene:** All R3F components live under `src/scene/`. Keep `<Canvas>`
  setup separate from scene contents. Lighting setup is its own file.
- **No premature abstraction.** v1 has one address, one report.
  Don't build a multi-property comparison layer "just in case."

## How to work with me (Claude Code instructions)

JP is using "pure Claude Code" mode — he drives from the terminal, with
minimal back-and-forth to Claude.ai chat. Optimize for his time.

### Plan before edit
For any task touching more than one file, propose the plan first.
Wait for confirmation. Don't generate 400 lines of code I'll have to
revert because the approach was wrong.

### Show diffs, not novels
When proposing changes, show the diff or relevant snippet. Don't restate
the whole file.

### Run, don't speculate
When unsure if something works, run `npm run dev` or write a small test.
Don't guess based on what the code "should" do.

### Ask when scope is ambiguous
Especially around: adding dependencies, adding new API calls, changing
brand colors, adding routes/pages, anything touching the NOT list above.
When in doubt, ask.

### Respect the NOT list
If a feature creeps toward Aurora Solar territory, stop and flag it.

### One fix at a time
If something breaks, propose ONE fix and run it. Don't try three things
in parallel — I lose the ability to diagnose.

## Session goals

JP works in numbered sessions. Each has explicit done criteria.

- **S1:** Scaffold + visual shell. Running Vite app at localhost:5173,
  brand colors, address input, placeholder R3F canvas with rotating
  low-poly building. No real APIs.
- **S2:** Wire NREL + Open-Meteo. Real numbers display when address
  submitted. Placeholder geometry still.
- **S3:** Google Solar real roof geometry replaces placeholder.
- **S4:** Claude API generates narrative report. Branded report styling.
- **S5:** Deploy to Vercel, configure custom subdomain, link from
  shiftatlas.tech.

Don't race ahead between sessions. Finish the current goal cleanly.

## Token discipline

- `/clear` between unrelated tasks within a session.
- `/compact` when a session is long but going well.
- Commit at every natural seam. Exit `claude` between sessions.
- This CLAUDE.md is the standing context — don't restate it back to me.
