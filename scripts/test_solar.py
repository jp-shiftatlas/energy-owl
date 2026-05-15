"""
Energy Owl - Google Solar API connection test
Hits buildingInsights with a real US commercial address.
"""

import urllib.request
import urllib.parse
import json
import sys

# Paste your Solar API key here (from Step 4 above)
GOOGLE_SOLAR_KEY = "AIzaSyAL5MVT6GCJoPk2snltypFCH2jDXkVie9U"

# Test target: Apple's HQ at 1 Apple Park Way, Cupertino, CA
# (well-mapped, HIGH-quality imagery, large building — easy to verify visually)
LAT = 37.3346
LON = -122.0090
ADDRESS_LABEL = "Apple Park, Cupertino, CA"


def test_solar_api():
    print(f"\n=== Google Solar API (buildingInsights.findClosest) ===")
    print(f"Test point: {ADDRESS_LABEL}  ({LAT}, {LON})")

    if GOOGLE_SOLAR_KEY == "PASTE_YOUR_KEY_HERE":
        print("ERROR: Replace GOOGLE_SOLAR_KEY at the top of this file with your key.")
        sys.exit(1)

    params = {
        "location.latitude": LAT,
        "location.longitude": LON,
        "requiredQuality": "HIGH",
        "key": GOOGLE_SOLAR_KEY,
    }
    url = "https://solar.googleapis.com/v1/buildingInsights:findClosest?" + urllib.parse.urlencode(params)
    # Print URL but redact the key
    print(f"GET {url.replace(GOOGLE_SOLAR_KEY, '***REDACTED***')}")

    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"\nHTTP {e.code} — {e.reason}")
        print(f"Body: {body[:500]}")
        return False

    print(f"\nStatus: OK")
    print(f"Building name:        {data.get('name')}")
    print(f"Region:               {data.get('regionCode')} / {data.get('administrativeArea')}")
    print(f"Imagery date:         {data.get('imageryDate')}")
    print(f"Imagery quality:      {data.get('imageryQuality')}")

    sp = data.get("solarPotential", {})
    print(f"\n--- Solar Potential ---")
    print(f"Max panels:           {sp.get('maxArrayPanelsCount')}")
    print(f"Max array area:       {sp.get('maxArrayAreaMeters2'):.0f} m²")
    print(f"Max sunshine hrs/yr:  {sp.get('maxSunshineHoursPerYear'):.0f}")
    print(f"Panel capacity (W):   {sp.get('panelCapacityWatts')}")
    print(f"Roof segments:        {len(sp.get('roofSegmentStats', []))}")

    # Show first roof segment details — this is what we'll render in 3D
    segments = sp.get("roofSegmentStats", [])
    if segments:
        s = segments[0]
        print(f"\n--- Roof segment 1 (sample) ---")
        print(f"  Pitch:              {s.get('pitchDegrees'):.1f}°")
        print(f"  Azimuth:            {s.get('azimuthDegrees'):.1f}°")
        print(f"  Area:               {s.get('stats', {}).get('areaMeters2'):.0f} m²")
        print(f"  Center: lat={s['center']['latitude']:.6f}, lng={s['center']['longitude']:.6f}")
    return True


if __name__ == "__main__":
    ok = test_solar_api()
    print(f"\n{'✓ Green light on Solar API.' if ok else '✗ Solar API failed. Fix before scaffolding.'}")