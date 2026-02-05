#!/usr/bin/env python3
"""
Verify that each league's qualification zones match their continental federation.
"""

import subprocess
import json

REGIONS = {
    "UEFA (Europe)": [39, 140, 78, 135, 61, 88, 94, 144, 203, 179, 218, 197, 106, 332, 333, 286, 345, 271, 283, 210, 103, 113, 119, 207, 383],
    "CONMEBOL (S. America)": [71, 128],
    "AFC (Asia)": [98, 292, 307, 188],
    "CONCACAF (N. America)": [253, 262],
    "CAF (Africa)": [288, 233, 200]
}

EXPECTED = {
    "UEFA (Europe)": ["Champions League", "CL", "Europa", "Conference"],
    "CONMEBOL (S. America)": ["Libertadores", "Sudamericana"],
    "AFC (Asia)": ["AFC", "ACL"],
    "CONCACAF (N. America)": ["CONCACAF", "Playoffs"],
    "CAF (Africa)": ["CAF"]
}

def main():
    print("🌍 Continental Zone Verification")
    print("=" * 60)

    issues = []

    for region, leagues in REGIONS.items():
        print(f"\n{region}:")
        expected_keywords = EXPECTED[region]
        
        for lid in leagues:
            try:
                result = subprocess.run(
                    ["curl", "-s", f"http://127.0.0.1:3000/api/fixtures/competition-structure/{lid}"],
                    capture_output=True, text=True, timeout=5
                )
                data = json.loads(result.stdout)
                country = data.get("country", "?")
                zones = data.get("qualificationZones", [])
                
                if zones:
                    labels = [z["label"] for z in zones]
                    matches = any(
                        any(kw.lower() in label.lower() for kw in expected_keywords)
                        for label in labels
                    )
                    
                    if matches:
                        print(f"  ✅ {lid:3} | {country:15} | {', '.join(labels[:2])}")
                    else:
                        print(f"  ⚠️  {lid:3} | {country:15} | {', '.join(labels[:2])} <- WRONG?")
                        issues.append((lid, country, labels[0], region))
                else:
                    print(f"  ❌ {lid:3} | {country:15} | NO ZONES")
            except Exception as e:
                print(f"  ❌ {lid:3} | ERROR: {e}")

    print("\n" + "=" * 60)
    if issues:
        print(f"⚠️  Found {len(issues)} potential issues:")
        for lid, country, zone, region in issues:
            print(f"   - {country} ({lid}): '{zone}' in {region}")
    else:
        print("✅ All zones match their continental federation!")

if __name__ == "__main__":
    main()
