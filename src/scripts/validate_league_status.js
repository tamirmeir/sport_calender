#!/usr/bin/env node

/**
 * League Status Validator
 * 
 * This script validates the status of all leagues in active_leagues.json
 * by checking if they have upcoming fixtures. It identifies:
 * - Active leagues (has upcoming matches)
 * - Finished tournaments (no upcoming matches, tournament-style)
 * - Potentially inactive leagues
 * 
 * Usage: node src/scripts/validate_league_status.js [--detailed]
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://127.0.0.1:3000/api/fixtures';
const ACTIVE_LEAGUES_FILE = path.join(__dirname, '../data/active_leagues.json');
const OUTPUT_FILE = path.join(__dirname, '../../league_status_report.json');

// Known cup competitions that typically finish mid-season
const CUP_COMPETITIONS = new Set([
    48, 45, 143, 137, // England: FA Cup, Carabao, Copa del Rey, Coupe de France
    81, 135, // Germany: DFB Pokal, Coppa Italia
    529, 528, 531, 514, 547, 556, 526, 659, 385, // Super Cups
    541, 533, // Continental Super Cups
]);

async function checkLeagueStatus(leagueId, leagueName, sampleTeamId = null) {
    try {
        // Try to get fixtures for this league
        const url = sampleTeamId 
            ? `${API_BASE}/team/${sampleTeamId}?next=50`
            : `${API_BASE}/league/${leagueId}?next=50`;
        
        const response = await axios.get(url, { timeout: 5000 });
        const fixtures = Array.isArray(response.data) ? response.data : (response.data.response || []);
        
        // Filter fixtures for this specific league
        const leagueFixtures = fixtures.filter(f => f.league.id === leagueId);
        
        return {
            leagueId,
            leagueName,
            hasFixtures: leagueFixtures.length > 0,
            fixtureCount: leagueFixtures.length,
            status: leagueFixtures.length > 0 ? 'active' : 'no_fixtures',
            isCup: CUP_COMPETITIONS.has(leagueId)
        };
    } catch (error) {
        return {
            leagueId,
            leagueName,
            hasFixtures: null,
            fixtureCount: 0,
            status: 'error',
            error: error.message,
            isCup: CUP_COMPETITIONS.has(leagueId)
        };
    }
}

async function validateAllLeagues(detailed = false) {
    console.log('🔍 Starting league status validation...\n');
    
    // Read active leagues
    const leagues = JSON.parse(fs.readFileSync(ACTIVE_LEAGUES_FILE, 'utf8'));
    console.log(`📊 Found ${leagues.length} leagues to validate\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        totalLeagues: leagues.length,
        active: [],
        noFixtures: [],
        errors: [],
        potentiallyFinished: [],
        summary: {}
    };
    
    // Process leagues in batches to avoid overwhelming the API
    const BATCH_SIZE = 5;
    const DELAY = 1000; // 1 second between batches
    
    for (let i = 0; i < leagues.length; i += BATCH_SIZE) {
        const batch = leagues.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(leagues.length / BATCH_SIZE);
        
        console.log(`⏳ Processing batch ${batchNumber}/${totalBatches}...`);
        
        const batchPromises = batch.map(league => 
            checkLeagueStatus(league.id, league.name, league.sampleTeamId)
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
            if (detailed) {
                console.log(`  ${result.status === 'active' ? '✅' : result.status === 'error' ? '❌' : '⚠️ '} ${result.leagueName} (${result.leagueId}): ${result.fixtureCount} fixtures`);
            }
            
            if (result.status === 'active') {
                results.active.push(result);
            } else if (result.status === 'no_fixtures') {
                results.noFixtures.push(result);
                if (result.isCup) {
                    results.potentiallyFinished.push(result);
                }
            } else if (result.status === 'error') {
                results.errors.push(result);
            }
        });
        
        // Delay between batches
        if (i + BATCH_SIZE < leagues.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY));
        }
    }
    
    // Generate summary
    results.summary = {
        active: results.active.length,
        noFixtures: results.noFixtures.length,
        errors: results.errors.length,
        potentiallyFinished: results.potentiallyFinished.length
    };
    
    // Save results
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    
    console.log('\n📋 Validation Complete!\n');
    console.log('Summary:');
    console.log(`  ✅ Active leagues: ${results.summary.active}`);
    console.log(`  ⚠️  No fixtures: ${results.summary.noFixtures}`);
    console.log(`  🏆 Potentially finished cups: ${results.summary.potentiallyFinished}`);
    console.log(`  ❌ Errors: ${results.summary.errors}`);
    console.log(`\n📄 Full report saved to: ${OUTPUT_FILE}\n`);
    
    // Print potentially finished tournaments
    if (results.potentiallyFinished.length > 0) {
        console.log('🏆 Potentially Finished Tournaments (should be added to finishedTournaments):');
        results.potentiallyFinished.forEach(league => {
            console.log(`  ${league.leagueId}: true, // ${league.leagueName}`);
        });
        console.log('');
    }
    
    // Print leagues with no fixtures (non-cups - might be in off-season)
    const nonCupsNoFixtures = results.noFixtures.filter(l => !l.isCup);
    if (nonCupsNoFixtures.length > 0) {
        console.log(`⚠️  ${nonCupsNoFixtures.length} Non-cup leagues with no fixtures (might be in off-season):`);
        nonCupsNoFixtures.slice(0, 10).forEach(league => {
            console.log(`  - ${league.leagueName} (${league.leagueId})`);
        });
        if (nonCupsNoFixtures.length > 10) {
            console.log(`  ... and ${nonCupsNoFixtures.length - 10} more`);
        }
        console.log('');
    }
    
    return results;
}

// Run the validator
const detailed = process.argv.includes('--detailed');
validateAllLeagues(detailed).catch(console.error);
