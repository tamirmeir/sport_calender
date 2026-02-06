#!/usr/bin/env python3
"""
Automatic Test Script for Qualification Zones
Run with: python3 test_zones.py
"""

import subprocess
import json
import sys

LEAGUES = [
    # Top 5 European
    (39, "England", "Premier League"),
    (140, "Spain", "La Liga"),
    (78, "Germany", "Bundesliga"),
    (135, "Italy", "Serie A"),
    (61, "France", "Ligue 1"),
    # Other European
    (88, "Netherlands", "Eredivisie"),
    (94, "Portugal", "Primeira Liga"),
    (144, "Belgium", "Pro League"),
    (203, "Turkey", "Super Lig"),
    (179, "Scotland", "Premiership"),
    (218, "Austria", "Bundesliga"),
    (197, "Greece", "Super League"),
    (106, "Poland", "Ekstraklasa"),
    (332, "Ukraine", "Premier Liga"),
    (333, "Serbia", "Super Liga"),
    (286, "Croatia", "HNL"),
    (345, "Czech", "Fortuna Liga"),
    (271, "Hungary", "NB I"),
    (283, "Bosnia", "Premijer Liga"),
    (210, "Cyprus", "First Division"),
    # Scandinavia
    (103, "Norway", "Eliteserien"),
    (113, "Sweden", "Allsvenskan"),
    (119, "Denmark", "Superliga"),
    (207, "Switzerland", "Super League"),
    # Israel (383 is Ligat Ha'al, 382 is Liga Leumit 2nd div)
    (383, "Israel", "Ligat Ha'al"),
    # South America
    (71, "Brazil", "Serie A"),
    (128, "Argentina", "Liga Profesional"),
    # Asia
    (98, "Japan", "J1 League"),
    (292, "S. Korea", "K League 1"),
    (307, "Saudi Arabia", "Saudi Pro League"),
    (188, "Australia", "A-League"),
    # Americas
    (253, "USA", "MLS"),
    (262, "Mexico", "Liga MX"),
    # Africa
    (288, "South Africa", "PSL"),
    (233, "Egypt", "Premier League"),
    (200, "Morocco", "Botola Pro"),
]

def test_league(league_id, country, name):
    """Test a single league for qualification zones."""
    try:
        result = subprocess.run(
            ["curl", "-s", f"http://127.0.0.1:3000/api/fixtures/competition-structure/{league_id}"],
            capture_output=True, 
            text=True, 
            timeout=10
        )
        data = json.loads(result.stdout)
        zones = data.get("qualificationZones", [])
        
        if zones:
            labels = [z["label"] for z in zones[:3]]
            return True, len(zones), labels
        else:
            return False, 0, []
    except json.JSONDecodeError:
        return None, 0, ["JSON Error"]
    except subprocess.TimeoutExpired:
        return None, 0, ["Timeout"]
    except Exception as e:
        return None, 0, [str(e)]

def main():
    print("=" * 70)
    print("         🧪 AUTOMATIC QUALIFICATION ZONES TEST")
    print("=" * 70)
    print()
    
    success = 0
    failed = 0
    errors = 0
    
    for league_id, country, name in LEAGUES:
        result, zone_count, labels = test_league(league_id, country, name)
        
        if result is True:
            labels_str = ", ".join(labels)
            print(f"  ✅ {country:14} ({league_id:3}) | {zone_count} zones | {labels_str}")
            success += 1
        elif result is False:
            print(f"  ⚠️  {country:14} ({league_id:3}) | NO ZONES")
            failed += 1
        else:
            print(f"  ❌ {country:14} ({league_id:3}) | ERROR: {labels[0]}")
            errors += 1
    
    total = success + failed + errors
    coverage = (success * 100 // total) if total > 0 else 0
    
    print()
    print("=" * 70)
    print(f"                    📊 RESULTS")
    print("=" * 70)
    print(f"  ✅ With zones:    {success}")
    print(f"  ⚠️  Without zones: {failed}")
    print(f"  ❌ Errors:        {errors}")
    print(f"  📈 Coverage:      {coverage}%")
    print("=" * 70)
    
    return 0 if failed == 0 and errors == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
