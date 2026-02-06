#!/usr/bin/env python3

import sys
import os
import json
sys.path.append('.')

from admin import check_name_similarity, check_geographic_impossibility

def run_mini_comprehensive_validation():
    print("🔍 MINI COMPREHENSIVE TOURNAMENT VALIDATION")
    print("=" * 50)
    
    # Load data files
    finished_path = os.path.join('..', 'src', 'data', 'finished_tournaments.json')
    active_path = os.path.join('..', 'src', 'data', 'active_leagues.json')
    
    try:
        with open(finished_path, 'r') as f:
            finished_data = json.load(f)
        with open(active_path, 'r') as f:
            active_leagues = json.load(f)
        
        finished_tournaments = finished_data.get('finished_tournaments', {})
        league_lookup = {str(league['league']['id']): league for league in active_leagues}
        
        print(f"📊 Loaded {len(finished_tournaments)} finished tournaments")
        print(f"📊 Loaded {len(active_leagues)} active leagues")
        
        issues_found = []
        tournaments_checked = 0
        
        for tournament_id, tournament_data in finished_tournaments.items():
            tournaments_checked += 1
            
            # Get corresponding league data
            league_data = league_lookup.get(tournament_id)
            if not league_data:
                issues_found.append({
                    'id': tournament_id,
                    'type': 'MISSING_LEAGUE_DATA', 
                    'severity': 'HIGH',
                    'description': f"Tournament {tournament_data.get('name')} has no corresponding league data"
                })
                continue
            
            # Country consistency check
            tournament_country = tournament_data.get('country')
            league_country = league_data['country']['name']
            
            if tournament_country != league_country:
                issues_found.append({
                    'id': tournament_id,
                    'type': 'COUNTRY_MISMATCH',
                    'severity': 'CRITICAL',
                    'description': f"{tournament_data.get('name')}: Tournament country '{tournament_country}' != League country '{league_country}'"
                })
            
            # Geographic impossibility check
            winner = tournament_data.get('winner')
            if winner and isinstance(winner, dict):
                winner_name = winner.get('name')
                if winner_name:
                    geographic_issue = check_geographic_impossibility(winner_name, league_country)
                    if geographic_issue:
                        issues_found.append({
                            'id': tournament_id,
                            'type': 'GEOGRAPHIC_IMPOSSIBILITY',
                            'severity': 'CRITICAL',
                            'description': geographic_issue
                        })
        
        print(f"\n📊 VALIDATION RESULTS:")
        print(f"   Tournaments Checked: {tournaments_checked}")
        print(f"   Issues Found: {len(issues_found)}")
        
        if issues_found:
            print(f"\n🚨 ISSUES DETECTED:")
            
            critical_issues = [i for i in issues_found if i['severity'] == 'CRITICAL']
            high_issues = [i for i in issues_found if i['severity'] == 'HIGH']
            
            if critical_issues:
                print(f"\n🔴 CRITICAL ISSUES ({len(critical_issues)}):")
                for issue in critical_issues:
                    print(f"   • ID {issue['id']}: {issue['description']}")
            
            if high_issues:
                print(f"\n🟠 HIGH PRIORITY ISSUES ({len(high_issues)}):")
                for issue in high_issues:
                    print(f"   • ID {issue['id']}: {issue['description']}")
        else:
            print(f"\n✅ NO ISSUES FOUND! All tournaments passed validation.")
        
        return len(issues_found) == 0
        
    except Exception as e:
        print(f"❌ Validation error: {e}")
        return False

if __name__ == "__main__":
    success = run_mini_comprehensive_validation()
    print(f"\n🎯 Validation {'PASSED' if success else 'FOUND ISSUES'}")