#!/usr/bin/env node
/**
 * Smart Metadata Sync Script
 * 
 * Syncs competition metadata with minimal API calls:
 * - Daily: Only active competitions (~15 calls)
 * - Monthly: Full refresh of all competitions (~109 calls)
 * 
 * Usage:
 *   node src/scripts/sync_metadata.js           # Smart sync (active only)
 *   node src/scripts/sync_metadata.js --full    # Full refresh all
 *   node src/scripts/sync_metadata.js --daemon  # Run with 24h timer
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const footballApi = require('../api/footballApi');

// Output file
const METADATA_FILE = path.join(__dirname, '../data/competition_metadata_live.json');
const STATIC_METADATA = require('../data/competition_metadata');

// All tracked competition IDs
const TRACKED_COMPETITIONS = Object.keys(STATIC_METADATA.COMPETITION_METADATA).map(Number);

// Sync configuration
const CONFIG = {
    delayBetweenCalls: 350,  // ms between API calls (avoid rate limits)
    activeCheckDays: 30,     // Consider "active" if fixtures within X days
    timerInterval: 24 * 60 * 60 * 1000  // 24 hours
};

/**
 * Load existing live metadata or create empty structure
 */
function loadLiveMetadata() {
    try {
        if (fs.existsSync(METADATA_FILE)) {
            const data = fs.readFileSync(METADATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.warn('⚠️  Could not load existing metadata, starting fresh');
    }
    return {
        lastFullSync: null,
        lastQuickSync: null,
        competitions: {}
    };
}

/**
 * Save live metadata to file
 */
function saveLiveMetadata(data) {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2));
    console.log(`💾 Saved to ${METADATA_FILE}`);
}

/**
 * Determine current season year
 */
function getCurrentSeason() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    // Academic year: Aug-Dec = current year, Jan-Jul = previous year
    return month >= 8 ? year : year - 1;
}

/**
 * Check if competition is currently active or worth syncing
 * Returns: { active: boolean, reason: string }
 */
async function isCompetitionActive(leagueId, season) {
    try {
        // Check for next fixture
        const nextFixtures = await footballApi.getFixturesByLeague(leagueId, season, 1, null, null);
        
        if (nextFixtures?.length > 0) {
            const fixtureDate = new Date(nextFixtures[0].fixture.date);
            const daysUntil = (fixtureDate - new Date()) / (1000 * 60 * 60 * 24);
            
            // Has upcoming fixtures
            if (daysUntil <= CONFIG.activeCheckDays) {
                return { active: true, reason: 'upcoming' };
            }
            // Future fixtures exist but > 30 days away
            return { active: false, reason: 'future' };
        }
        
        // No upcoming fixtures - check last fixture
        const lastFixtures = await footballApi.getFixturesByLeague(leagueId, season, null, 1, null);
        
        if (lastFixtures?.length > 0) {
            const fixtureDate = new Date(lastFixtures[0].fixture.date);
            const daysSince = (new Date() - fixtureDate) / (1000 * 60 * 60 * 24);
            
            // Recently finished - sync to capture winner
            if (daysSince <= 30) {
                return { active: true, reason: 'recent_finish' };
            }
            // Season finished long ago
            return { active: false, reason: 'finished' };
        }
        
        // No fixtures at all for this season
        return { active: false, reason: 'no_data' };
    } catch (err) {
        return { active: false, reason: 'error' };
    }
}

/**
 * Get competition status (active, finished, not_started)
 */
async function getCompetitionStatus(leagueId, season) {
    try {
        const status = await footballApi.getLeagueStatus(leagueId, season);
        return status;
    } catch (err) {
        console.error(`  ❌ Error getting status for ${leagueId}:`, err.message);
        return null;
    }
}

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Smart sync - only active competitions
 */
async function smartSync() {
    console.log('\n🔄 Starting SMART sync (active competitions only)...\n');
    const startTime = Date.now();
    let apiCalls = 0;
    
    const liveData = loadLiveMetadata();
    const season = getCurrentSeason();
    
    const results = {
        active: [],
        finished: [],
        notStarted: [],
        skipped: [],
        errors: []
    };
    
    for (const leagueId of TRACKED_COMPETITIONS) {
        const staticMeta = STATIC_METADATA.getMetadata(leagueId);
        const name = staticMeta?.name || `League ${leagueId}`;
        
        process.stdout.write(`  Checking ${name} (${leagueId})...`);
        
        // Quick check: is this competition active?
        const { active, reason } = await isCompetitionActive(leagueId, season);
        apiCalls += 2; // next + last fixture calls
        
        if (!active) {
            // Skip detailed sync for inactive competitions
            console.log(` ⏭️  Skipped (${reason})`);
            results.skipped.push({ id: leagueId, name, reason });
            await sleep(CONFIG.delayBetweenCalls);
            continue;
        }
        
        // Get full status for active competitions
        const status = await getCompetitionStatus(leagueId, season);
        apiCalls++;
        
        if (status) {
            liveData.competitions[leagueId] = {
                ...staticMeta,
                ...status,
                lastUpdated: new Date().toISOString()
            };
            
            if (status.status === 'finished') {
                results.finished.push({ id: leagueId, name, winner: status.winner?.name });
                console.log(` ✅ Finished - ${status.winner?.name || 'No winner'}`);
            } else if (status.status === 'active') {
                results.active.push({ id: leagueId, name, stage: status.currentStage });
                console.log(` 🟢 Active - ${status.currentStage || 'In progress'}`);
            } else {
                results.notStarted.push({ id: leagueId, name });
                console.log(` ⏳ Not started`);
            }
        } else {
            results.errors.push({ id: leagueId, name });
            console.log(' ❌ Error');
        }
        
        await sleep(CONFIG.delayBetweenCalls);
    }
    
    // Save results
    liveData.lastQuickSync = new Date().toISOString();
    saveLiveMetadata(liveData);
    
    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(50));
    console.log('📊 SMART SYNC SUMMARY');
    console.log('='.repeat(50));
    console.log(`⏱️  Time: ${elapsed}s`);
    console.log(`📡 API calls: ${apiCalls}`);
    console.log(`🟢 Active: ${results.active.length}`);
    console.log(`🏆 Finished: ${results.finished.length}`);
    console.log(`⏳ Not started: ${results.notStarted.length}`);
    console.log(`⏭️  Skipped (inactive): ${results.skipped.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    
    return results;
}

/**
 * Full sync - all competitions
 */
async function fullSync() {
    console.log('\n🔄 Starting FULL sync (all competitions)...\n');
    const startTime = Date.now();
    let apiCalls = 0;
    
    const liveData = loadLiveMetadata();
    const season = getCurrentSeason();
    
    const results = {
        active: [],
        finished: [],
        notStarted: [],
        errors: []
    };
    
    for (const leagueId of TRACKED_COMPETITIONS) {
        const staticMeta = STATIC_METADATA.getMetadata(leagueId);
        const name = staticMeta?.name || `League ${leagueId}`;
        
        process.stdout.write(`  Syncing ${name} (${leagueId})...`);
        
        const status = await getCompetitionStatus(leagueId, season);
        apiCalls += 3; // Estimated calls per status check
        
        if (status) {
            liveData.competitions[leagueId] = {
                ...staticMeta,
                ...status,
                lastUpdated: new Date().toISOString()
            };
            
            if (status.status === 'finished') {
                results.finished.push({ id: leagueId, name, winner: status.winner?.name });
                console.log(` ✅ Finished - ${status.winner?.name || 'No winner'}`);
            } else if (status.status === 'active') {
                results.active.push({ id: leagueId, name, stage: status.currentStage });
                console.log(` 🟢 Active - ${status.currentStage || 'In progress'}`);
            } else {
                results.notStarted.push({ id: leagueId, name });
                console.log(` ⏳ Not started`);
            }
        } else {
            results.errors.push({ id: leagueId, name });
            console.log(' ❌ Error');
        }
        
        await sleep(CONFIG.delayBetweenCalls);
    }
    
    // Save results
    liveData.lastFullSync = new Date().toISOString();
    liveData.lastQuickSync = new Date().toISOString();
    saveLiveMetadata(liveData);
    
    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(50));
    console.log('📊 FULL SYNC SUMMARY');
    console.log('='.repeat(50));
    console.log(`⏱️  Time: ${elapsed}s`);
    console.log(`📡 API calls: ~${apiCalls}`);
    console.log(`🟢 Active: ${results.active.length}`);
    console.log(`🏆 Finished: ${results.finished.length}`);
    console.log(`⏳ Not started: ${results.notStarted.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    
    return results;
}

/**
 * Run as daemon with timer
 */
function runDaemon() {
    console.log('🚀 Starting metadata sync daemon...');
    console.log(`⏰ Will sync every ${CONFIG.timerInterval / (1000 * 60 * 60)} hours\n`);
    
    // Initial sync
    smartSync().then(() => {
        console.log(`\n⏰ Next sync at: ${new Date(Date.now() + CONFIG.timerInterval).toLocaleString()}\n`);
    });
    
    // Schedule recurring syncs
    setInterval(() => {
        console.log('\n' + '='.repeat(50));
        console.log(`⏰ Scheduled sync triggered at ${new Date().toLocaleString()}`);
        smartSync().then(() => {
            console.log(`\n⏰ Next sync at: ${new Date(Date.now() + CONFIG.timerInterval).toLocaleString()}\n`);
        });
    }, CONFIG.timerInterval);
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--full')) {
    fullSync().then(() => process.exit(0)).catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
} else if (args.includes('--daemon')) {
    runDaemon();
} else if (args.includes('--help')) {
    console.log(`
Smart Metadata Sync

Usage:
  node sync_metadata.js           Smart sync (active competitions only)
  node sync_metadata.js --full    Full sync (all competitions)
  node sync_metadata.js --daemon  Run as daemon (24h timer)
  node sync_metadata.js --help    Show this help

API Usage:
  Smart sync: ~15-30 calls (only active competitions)
  Full sync:  ~100-120 calls (all 37 competitions)
`);
} else {
    // Default: smart sync
    smartSync().then(() => process.exit(0)).catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

// Export for use in other modules
module.exports = {
    smartSync,
    fullSync,
    loadLiveMetadata,
    METADATA_FILE
};
