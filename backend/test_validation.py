#!/usr/bin/env python3

import sys
import os
sys.path.append('.')

from app import create_app
from extensions import db
from admin import check_name_similarity, check_geographic_impossibility

def test_validation_functions():
    print("🧪 Testing comprehensive validation functions...")
    
    # Test name similarity function
    print("\n📝 Testing name similarity:")
    test_cases = [
        ("Copa del Rey", "Copa del Rey", 1.0),  # Exact match
        ("Super Cup", "Supercopa", 0.5),       # Partial match
        ("Barcelona Cup", "Algeria National", 0.0), # No match
        ("Champions League", "Champions", 0.8)  # Partial match
    ]
    
    for name1, name2, expected in test_cases:
        result = check_name_similarity(name1, name2)
        status = "✅" if abs(result - expected) < 0.3 else "⚠️"
        print(f"   {status} '{name1}' vs '{name2}': {result:.2f} (expected ~{expected})")
    
    # Test geographic impossibility detection
    print("\n🌍 Testing geographic impossibility detection:")
    geo_tests = [
        ("Barcelona", "Spain", None),      # Valid - Spanish team in Spain
        ("Barcelona", "Algeria", "issue"), # Invalid - Spanish team in Algeria
        ("Real Madrid", "France", "issue"), # Invalid - Spanish team in France
        ("Unknown Team", "Brazil", None),   # Unknown team - no issue detected
        ("Manchester City", "England", None) # Valid - English team in England
    ]
    
    for team, country, expected in geo_tests:
        result = check_geographic_impossibility(team, country)
        has_issue = result is not None
        expected_issue = expected == "issue"
        status = "✅" if has_issue == expected_issue else "❌"
        print(f"   {status} {team} in {country}: {'Issue detected' if has_issue else 'No issue'}")
        if result:
            print(f"      Detail: {result}")
    
    print("\n🎯 Function tests completed!")
    
    # Test data file access
    print("\n📁 Testing data file access:")
    finished_path = os.path.join('..', 'src', 'data', 'finished_tournaments.json')
    active_path = os.path.join('..', 'src', 'data', 'active_leagues.json')
    
    if os.path.exists(finished_path):
        print(f"   ✅ Finished tournaments file found")
    else:
        print(f"   ❌ Finished tournaments file missing: {finished_path}")
    
    if os.path.exists(active_path):
        print(f"   ✅ Active leagues file found")
    else:
        print(f"   ❌ Active leagues file missing: {active_path}")
    
    print("\n✅ All validation tests completed!")

if __name__ == "__main__":
    test_validation_functions()