#!/usr/bin/env node

/**
 * Automatic League Status Validator
 * Checks all leagues in active_leagues.json for:
 * 1. Upcoming fixtures (active vs finished)
 * 2. Current status accuracy
 * 3. Recommendations for updates
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://127.0.0.1:3000/api/fixtures';
const LEAGUES_FILE = path.join(__dirname, '../data/active_leagues.json');

// Known team IDs for testing (major teams from each league)
const TEST_TEAMS = {
    39: 33,    // Premier League -> Manchester United
    140: 532,  // La Liga -> Real Madrid
    61: 157,   // Ligue 1 -> PSG
    78: 33,    // Bundesliga -> Bayern Munich
    135: 489,  // Serie A -> AC Milan
    143: 532,  // Copa del Rey -> Real Madrid
    2: 33,     // Champions League -> Manchester United
    3: 157,    // Europa League -> PSG
    848: 157,  // Conference League -> PSG
    529: 33    // FA Cup -> Manchester United
};

// Currently marked as finished in code
const FINISHED_IN_CODE = [385, 528, 531, 533, 541, 514, 547, 556, 526, 659, 143];

async function fetchFixtures(teamId, leagueId) {
    try {
        const url = `${API_BASE}/team/${teamId}?next=50`;
        const response = await fetch(url);
        if (!response.ok) return null;
        
        const data = await response.json();
        const fixtures = Array.isArray(data) ? data : (data.response || []);
        
        // Count fixtures for this league
        const leagueFixtures = fixtures.filter(f => f.league.id === leagueId);
        return leagueFixtures.length;
    } catch (e) {
        return null;
    }
}

async function validateLeague(leagueData) {
    const league = leagueData.league;
    const country = leagueData.country;
    
    const teamId = TEST_TEAMS[league.id] || TEST_TEAMS[39]; // Default to Man Utd
    const fixtureCount = await fetchFixtures(teamId, league.id);
    
    const isMarkedFinished = FINISHED_IN_CODE.includes(league.id);
    const hasFixtures = fixtureCount > 0;
    
    let status = 'OK';
    let recommendation = null;
    
    if (isMarkedFinished && hasFixtures) {
        status = 'ERROR';
        recommendation = `Remove from finished list - has ${fixtureCount} upcoming fixtures`;
    } else if (!isMarkedFinished && fixtureCount === 0) {
        status = 'WARNING';
        recommendation = `Consider adding to finished list - no upcoming fixtures`;
    } else if (isMarkedFinished) {
        status = 'FINISHED';
    }
    
    return {
        id: league.id,
        name: league.name,
        country: country.name,
        type: league.type,
        fixtureCount,
        status,
        recommendation
    };
}

async function main() {
    console.log('🔍 Starting League Status Validation...\n');
    console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}\n`);
    
    // Load leagues - it's an array, not an object!
    const allLeagues = JSON.parse(fs.readFileSync(LEAGUES_FILE, 'utf8'));
    
    console.log(`📊 Total leagues to check: ${allLeagues.length}\n`);
    
    const results = {
        errors: [],
        warnings: [],
        finished: [],
        active: []
    };
    
    let checked = 0;
    for (const leagueData of allLeagues) {
        checked++;
        const leagueName = leagueData.league?.name || 'Unknown';
        process.stdout.write(`\r⏳ Checking ${checked}/${allLeagues.length}: ${leagueName}...`.padEnd(100));
        
        const result = await validateLeague(leagueData);
        
        if (result.status === 'ERROR') {
            results.errors.push(result);
        } else if (result.status === 'WARNING') {
            results.warnings.push(result);
        } else if (result.status === 'FINISHED') {
            results.finished.push(result);
        } else {
            results.active.push(result);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 VALIDATION RESULTS');
    console.log('='.repeat(80) + '\n');
    
    // ERRORS
    if (results.errors.length > 0) {
        console.log('❌ ERRORS (Must Fix):');
        results.errors.forEach(r => {
            console.log(`   ${r.name} (${r.id})`);
            console.log(`      → ${r.recommendation}`);
        });
        console.log('');
    }
    
    // WARNINGS
    if (results.warnings.length > 0) {
        console.log('⚠️  WARNINGS (Review):');
        results.warnings.forEach(r => {
            console.log(`   ${r.name} (${r.id}) - ${r.country}`);
            console.log(`      → ${r.recommendation}`);
        });
        console.log('');
    }
    
    // FINISHED
    if (results.finished.length > 0) {
        console.log(`✅ FINISHED (${results.finished.length}): Correctly marked`);
        results.finished.forEach(r => {
            console.log(`   ${r.name} (${r.id})`);
        });
        console.log('');
    }
    
    // ACTIVE
    console.log(`🟢 ACTIVE (${results.active.length}): Have upcoming fixtures`);
    console.log('');
    
    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`   Total Checked: ${allLeagues.length}`);
    console.log(`   Active: ${results.active.length}`);
    console.log(`   Finished: ${results.finished.length}`);
    console.log(`   Warnings: ${results.warnings.length}`);
    console.log(`   Errors: ${results.errors.length}`);
    console.log('='.repeat(80) + '\n');
    
    // Save report
    const reportPath = path.join(__dirname, '../../league_validation_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        date: new Date().toISOString(),
        results,
        summary: {
            total: allLeagues.length,
            active: results.active.length,
            finished: results.finished.length,
            warnings: results.warnings.length,
            errors: results.errors.length
        }
    }, null, 2));
    
    console.log(`💾 Full report saved to: ${reportPath}\n`);
    
    if (results.errors.length > 0) {
        process.exit(1);
    }
}

main().catch(console.error);
