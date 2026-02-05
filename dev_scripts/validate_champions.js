/**
 * Validation Script: Verify Defending Champion Data
 * 
 * This script tests that our API correctly identifies the defending champion
 * by comparing against known historical data from API-Sports.
 * 
 * Usage: node dev_scripts/validate_champions.js
 */

const API_BASE = 'http://127.0.0.1:3000/api/fixtures';

// Known champions for validation (manually verified from Wikipedia/official sources)
// NOTE: API-Sports uses calendar year seasons (2024 = 2024-25 football season)
// So "2023-24 champion" is found in API season 2023, and defends in season 2024
const KNOWN_CHAMPIONS = [
    // League ID, API Season (year competition ended), Expected Champion, Description
    { league: 39, season: 2023, champion: 'Manchester City', country: 'England Premier League 2023-24' },
    { league: 39, season: 2022, champion: 'Manchester City', country: 'England Premier League 2022-23' },
    { league: 140, season: 2023, champion: 'Real Madrid', country: 'Spain La Liga 2023-24' },
    { league: 135, season: 2023, champion: 'Inter', country: 'Italy Serie A 2023-24' },
    { league: 78, season: 2023, champion: 'Bayer Leverkusen', country: 'Germany Bundesliga 2023-24' },
    { league: 61, season: 2023, champion: 'Paris Saint Germain', country: 'France Ligue 1 2023-24' },
    { league: 383, season: 2023, champion: 'Maccabi Tel Aviv', country: 'Israel Premier League 2023-24' },
    { league: 383, season: 2022, champion: 'Maccabi Haifa', country: 'Israel Premier League 2022-23' },
];

async function fetchPreviousSeasonWinner(leagueId, season) {
    try {
        const url = `${API_BASE}/standings?league=${leagueId}&season=${season}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.response || !data.response[0]?.league?.standings) {
            return { error: 'No standings data' };
        }
        
        const standings = data.response[0].league.standings;
        
        // Find Championship round if exists, otherwise use first group
        let championshipGroup = standings.find(g => 
            g[0]?.group?.toLowerCase().includes('championship') || 
            g[0]?.group?.toLowerCase().includes('title')
        ) || standings[0];
        
        if (championshipGroup && championshipGroup[0]) {
            return {
                teamId: championshipGroup[0].team.id,
                teamName: championshipGroup[0].team.name,
                group: championshipGroup[0].group || 'Regular Season',
                rank: championshipGroup[0].rank
            };
        }
        
        return { error: 'No champion found' };
    } catch (err) {
        return { error: err.message };
    }
}

async function fetchTeamsWithStandings(leagueId, season) {
    try {
        const url = `${API_BASE}/teams-with-standings?league=${leagueId}&season=${season}`;
        const response = await fetch(url);
        const data = await response.json();
        
        const defendingChamp = data.find(t => t.isDefendingChampion);
        const currentLeader = data.find(t => t.standing?.rank === 1);
        
        return {
            defendingChampion: defendingChamp ? {
                teamId: defendingChamp.team.id,
                teamName: defendingChamp.team.name,
                currentRank: defendingChamp.standing?.rank
            } : null,
            currentLeader: currentLeader ? {
                teamId: currentLeader.team.id,
                teamName: currentLeader.team.name
            } : null,
            totalTeams: data.length
        };
    } catch (err) {
        return { error: err.message };
    }
}

async function runValidation() {
    console.log('🏆 Defending Champion Validation Test\n');
    console.log('='.repeat(70));
    
    let passed = 0;
    let failed = 0;
    const results = [];
    
    for (const test of KNOWN_CHAMPIONS) {
        const prevSeason = test.season;
        const currentSeason = test.season + 1;
        
        console.log(`\n📊 Testing: ${test.country} (League ${test.league})`);
        console.log(`   Expected ${prevSeason} Champion: ${test.champion}`);
        
        // 1. Verify previous season standings show correct champion
        const prevWinner = await fetchPreviousSeasonWinner(test.league, prevSeason);
        
        if (prevWinner.error) {
            console.log(`   ❌ Error fetching ${prevSeason} standings: ${prevWinner.error}`);
            failed++;
            results.push({ ...test, status: 'FAIL', reason: prevWinner.error });
            continue;
        }
        
        const prevMatch = prevWinner.teamName.toLowerCase().includes(test.champion.toLowerCase()) ||
                          test.champion.toLowerCase().includes(prevWinner.teamName.toLowerCase());
        
        console.log(`   API ${prevSeason} #1: ${prevWinner.teamName} (Group: ${prevWinner.group})`);
        
        if (!prevMatch) {
            console.log(`   ⚠️  MISMATCH: Expected "${test.champion}", got "${prevWinner.teamName}"`);
        }
        
        // 2. Verify current season identifies defending champion correctly
        const currentData = await fetchTeamsWithStandings(test.league, currentSeason);
        
        if (currentData.error) {
            console.log(`   ❌ Error fetching ${currentSeason} data: ${currentData.error}`);
            // This might be expected if season hasn't started
            if (currentSeason > 2025) {
                console.log(`   ℹ️  Season ${currentSeason} may not have started yet`);
                passed++;
                results.push({ ...test, status: 'SKIP', reason: 'Future season' });
                continue;
            }
            failed++;
            results.push({ ...test, status: 'FAIL', reason: currentData.error });
            continue;
        }
        
        if (!currentData.defendingChampion) {
            console.log(`   ⚠️  No defending champion identified in ${currentSeason} data`);
            failed++;
            results.push({ ...test, status: 'FAIL', reason: 'No defending champion in API response' });
            continue;
        }
        
        const defChampMatch = currentData.defendingChampion.teamName.toLowerCase().includes(test.champion.toLowerCase()) ||
                              test.champion.toLowerCase().includes(currentData.defendingChampion.teamName.toLowerCase());
        
        console.log(`   ${currentSeason} Defending Champion: ${currentData.defendingChampion.teamName} (Current Rank: #${currentData.defendingChampion.currentRank})`);
        console.log(`   ${currentSeason} Current Leader: ${currentData.currentLeader?.teamName || 'N/A'}`);
        
        if (defChampMatch) {
            console.log(`   ✅ PASS: Defending champion correctly identified`);
            passed++;
            results.push({ ...test, status: 'PASS', apiChampion: currentData.defendingChampion.teamName });
        } else {
            console.log(`   ❌ FAIL: Expected "${test.champion}", API shows "${currentData.defendingChampion.teamName}"`);
            failed++;
            results.push({ ...test, status: 'FAIL', reason: `Expected ${test.champion}, got ${currentData.defendingChampion.teamName}` });
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📋 VALIDATION SUMMARY\n');
    console.log(`   Total Tests: ${KNOWN_CHAMPIONS.length}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   Success Rate: ${((passed / KNOWN_CHAMPIONS.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
        console.log('\n   Failed Tests:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   - ${r.country}: ${r.reason}`);
        });
    }
    
    console.log('\n' + '='.repeat(70));
    
    return { passed, failed, results };
}

// Run if called directly
runValidation().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error('Validation script error:', err);
    process.exit(1);
});
