#!/usr/bin/env node

/**
 * Batch League Status Validator with Parallel Processing
 * Checks leagues in batches to avoid overwhelming the API
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://127.0.0.1:3000/api/fixtures';
const LEAGUES_FILE = path.join(__dirname, '../data/active_leagues.json');
const BATCH_SIZE = 10;
const PARALLEL_BATCHES = 3; // Run 3 batches in parallel

// Known team IDs for testing (major teams from each league)
const TEST_TEAMS = {
    39: 33,    // Premier League -> Manchester United
    140: 532,  // La Liga -> Real Madrid
    61: 157,   // Ligue 1 -> PSG
    78: 33,    // Bundesliga -> Bayern Munich
    135: 489,  // Serie A -> AC Milan
    143: 532,  // Copa del Rey -> Real Madrid
    2: 33,     // Champions League -> Manchester United
    383: 605,  // Israel Ligat Ha'al -> Maccabi Haifa
    382: 605,  // Israel Liga Leumit -> Maccabi Haifa
    385: 605   // Israel Toto Cup -> Maccabi Haifa
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
    const hasFixtures = fixtureCount !== null && fixtureCount > 0;
    
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

async function processBatch(batch, batchNumber, totalBatches) {
    const results = [];
    for (let i = 0; i < batch.length; i++) {
        const leagueData = batch[i];
        const league = leagueData.league;
        
        process.stdout.write(`\r⏳ Batch ${batchNumber}/${totalBatches}: ${i + 1}/${batch.length} - ${league.name}...`.padEnd(100));
        
        const result = await validateLeague(leagueData);
        results.push(result);
        
        // Small delay to avoid hammering API
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return results;
}

async function main() {
    const args = process.argv.slice(2);
    const batchNumber = args[0] ? parseInt(args[0]) : null;
    const totalBatchCount = args[1] ? parseInt(args[1]) : null;
    
    console.log('🔍 Batch League Status Validator\n');
    console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}\n`);
    
    // Load all leagues
    const allLeagues = JSON.parse(fs.readFileSync(LEAGUES_FILE, 'utf8'));
    console.log(`📊 Total leagues: ${allLeagues.length}`);
    
    // Divide into batches
    const batches = [];
    for (let i = 0; i < allLeagues.length; i += BATCH_SIZE) {
        batches.push(allLeagues.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Total batches: ${batches.length} (${BATCH_SIZE} leagues per batch)\n`);
    
    let batchesToProcess = batches;
    let startBatch = 0;
    let endBatch = batches.length;
    
    // If batch number specified, process only that batch
    if (batchNumber !== null && totalBatchCount !== null) {
        const batchesPerRun = Math.ceil(batches.length / totalBatchCount);
        startBatch = (batchNumber - 1) * batchesPerRun;
        endBatch = Math.min(startBatch + batchesPerRun, batches.length);
        batchesToProcess = batches.slice(startBatch, endBatch);
        console.log(`🎯 Processing batches ${startBatch + 1}-${endBatch} (Run ${batchNumber}/${totalBatchCount})\n`);
    }
    
    const allResults = [];
    
    // Process batches in parallel groups
    for (let i = 0; i < batchesToProcess.length; i += PARALLEL_BATCHES) {
        const parallelBatches = batchesToProcess.slice(i, i + PARALLEL_BATCHES);
        
        const batchPromises = parallelBatches.map((batch, idx) => 
            processBatch(batch, startBatch + i + idx + 1, batches.length)
        );
        
        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults.flat());
        
        console.log(''); // New line after each parallel group
    }
    
    // Categorize results
    const results = {
        errors: [],
        warnings: [],
        finished: [],
        active: []
    };
    
    allResults.forEach(result => {
        if (result.status === 'ERROR') {
            results.errors.push(result);
        } else if (result.status === 'WARNING') {
            results.warnings.push(result);
        } else if (result.status === 'FINISHED') {
            results.finished.push(result);
        } else {
            results.active.push(result);
        }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESULTS');
    console.log('='.repeat(80) + '\n');
    
    // ERRORS
    if (results.errors.length > 0) {
        console.log('❌ ERRORS (Must Fix):');
        results.errors.forEach(r => {
            console.log(`   ${r.name} (${r.id}) - ${r.country}`);
            console.log(`      → ${r.recommendation}`);
        });
        console.log('');
    }
    
    // WARNINGS - Show only top 20
    if (results.warnings.length > 0) {
        console.log(`⚠️  WARNINGS (${results.warnings.length} total) - Showing first 20:`);
        results.warnings.slice(0, 20).forEach(r => {
            console.log(`   ${r.name} (${r.id}) - ${r.country}`);
            console.log(`      → ${r.recommendation}`);
        });
        if (results.warnings.length > 20) {
            console.log(`   ... and ${results.warnings.length - 20} more`);
        }
        console.log('');
    }
    
    // FINISHED
    if (results.finished.length > 0) {
        console.log(`✅ FINISHED (${results.finished.length}): Correctly marked`);
        results.finished.forEach(r => {
            console.log(`   ${r.name} (${r.id}) - ${r.country}`);
        });
        console.log('');
    }
    
    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`   Checked: ${allResults.length}`);
    console.log(`   Active: ${results.active.length}`);
    console.log(`   Finished: ${results.finished.length}`);
    console.log(`   Warnings: ${results.warnings.length}`);
    console.log(`   Errors: ${results.errors.length}`);
    console.log('='.repeat(80) + '\n');
    
    // Save report
    const reportFile = batchNumber 
        ? `league_validation_batch_${batchNumber}.json`
        : 'league_validation_report.json';
    const reportPath = path.join(__dirname, '../../', reportFile);
    
    fs.writeFileSync(reportPath, JSON.stringify({
        date: new Date().toISOString(),
        batchInfo: batchNumber ? {
            batchNumber,
            totalBatchCount,
            batchesProcessed: `${startBatch + 1}-${endBatch}`
        } : null,
        results,
        summary: {
            checked: allResults.length,
            active: results.active.length,
            finished: results.finished.length,
            warnings: results.warnings.length,
            errors: results.errors.length
        }
    }, null, 2));
    
    console.log(`💾 Report saved to: ${reportPath}\n`);
    
    if (results.errors.length > 0) {
        process.exit(1);
    }
}

main().catch(console.error);
