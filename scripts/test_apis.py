"""
Energy Owl - API connection test
Hits Open-Meteo and NREL PVWatts v8 with a real US commercial address.
If both succeed, we have a green light to build.
"""

import urllib.request
import urllib.parse
import json

# Test target: a real commercial property in Las Vegas, NV
# (high solar potential, NSRDB-covered, easy to sanity-check the numbers)
LAT = 36.1699
LON = -115.1398
ADDRESS_LABEL = "Las Vegas, NV (commercial test point)"

# NREL: get a free key at https://developer.nlr.gov/signup
# DEMO_KEY works for ~5 requests/hour across all NREL APIs — enough to test
NREL_API_KEY = "DEMO_KEY"


def test_open_meteo():
    print("\n=== Open-Meteo (irradiance) ===")
    params = {
        "latitude": LAT,
        "longitude": LON,
        "daily": "shortwave_radiation_sum,sunshine_duration",
        "timezone": "America/Los_Angeles",
        "forecast_days": 7,
    }
    url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(params)
    print(f"GET {url}")
    with urllib.request.urlopen(url, timeout=10) as r:
        data = json.loads(r.read())
    daily = data["daily"]
    print(f"Status: OK  |  Days returned: {len(daily['time'])}")
    print(f"Day 1: {daily['time'][0]} | "
          f"shortwave_radiation_sum: {daily['shortwave_radiation_sum'][0]} MJ/m² | "
          f"sunshine_duration: {daily['sunshine_duration'][0]} s")
    return True


def test_nrel_pvwatts():
    print("\n=== NREL PVWatts v8 (energy production) ===")
    params = {
        "api_key": NREL_API_KEY,
        "lat": LAT,
        "lon": LON,
        "system_capacity": 100,   # 100 kW = small commercial
        "module_type": 0,         # standard
        "losses": 14,             # default system losses %
        "array_type": 1,          # fixed roof-mount
        "tilt": 20,               # typical commercial roof tilt
        "azimuth": 180,           # south-facing
        "dataset": "nsrdb",
        "radius": 0,
        "timeframe": "monthly",
    }
    url = "https://developer.nlr.gov/api/pvwatts/v8.json?" + urllib.parse.urlencode(params)
    print(f"GET {url}")
    with urllib.request.urlopen(url, timeout=15) as r:
        data = json.loads(r.read())
    if data.get("errors"):
        print(f"Status: ERROR  |  {data['errors']}")
        return False
    out = data["outputs"]
    print(f"Status: OK")
    print(f"Annual AC output:     {out['ac_annual']:,.0f} kWh")
    print(f"Capacity factor:      {out['capacity_factor']:.1f}%")
    print(f"Solar radiation avg:  {out['solrad_annual']:.2f} kWh/m²/day")
    print(f"Station: {data['station_info']['city']}, {data['station_info']['state']}")
    return True


if __name__ == "__main__":
    print(f"Energy Owl API harness")
    print(f"Test point: {ADDRESS_LABEL}  ({LAT}, {LON})")
    results = {
        "Open-Meteo": test_open_meteo(),
        "NREL PVWatts v8": test_nrel_pvwatts(),
    }
    print("\n=== Summary ===")
    for name, ok in results.items():
        print(f"  {'✓' if ok else '✗'} {name}")
    if all(results.values()):
        print("\nGreen light. We can build.")
    else:
        print("\nOne or more APIs failed. Fix before scaffolding.")