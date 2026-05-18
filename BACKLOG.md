# Energy Owl backlog

Items deferred from a session, not blocking the current session's done criteria.

## Polish

- PVWatts station: trim leading comma when `station_info.city` is empty.

## Scope decisions pending

- Freeform address input (typed-any-address path) — currently degrades to "Address lookup is briefly unavailable" because the US Census Geocoder doesn't return Access-Control-Allow-Origin. Two coherent paths to revisit between sessions: (a) accept v1 ships chips-only, type-any-address moves to v2; (b) update v1 spec to allow Vercel edge rewrites as frontend-only deploy infrastructure, then route geocoding through `/api/geocode`. See `// TODO(scope):` in `src/lib/apis/geocoder.ts`.
