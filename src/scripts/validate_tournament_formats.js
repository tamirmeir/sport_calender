#!/usr/bin/env node
/**
 * Tournament Format Validator
 * 
 * This script validates that tournament formats haven't changed from what we expect.
 * Run periodically (e.g., weekly) or at start of each season.
 * 
 * Checks:
 * 1. Number of teams in standings matches expected format
 * 2. Knockout cutoffs are still valid
 * 3. Group structure hasn't changed
 */

// Load environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load tournament master data
const TOURNAMENTS_FILE = path.resolve(__dirname, '../data/world_tournaments_master.json');

// Expected formats for major tournaments (based on current rules)
const EXPECTED_FORMATS = {
    // UEFA Competitions (League Phase format since 2024/25)
    2: {  // Champions League
        name: 'UEFA Champions League',
        expectedTeamsInStandings: 36,
        qualificationCutoff: 24,
        format: 'league_phase',
        description: '36 teams in single table, top 24 advance'
    },
    3: {  // Europa League
        name: 'UEFA Europa League',
        expectedTeamsInStandings: 36,
        qualificationCutoff: 24,
        format: 'league_phase',
        description: '36 teams in single table, top 24 advance'
    },
    848: {  // Conference League
        name: 'UEFA Europa Conference League',
        expectedTeamsInStandings: 36,
        qualificationCutoff: 24,
        format: 'league_phase',
        description: '36 teams in single table, top 24 advance'
    },
    
    // CONMEBOL Competitions (Group Stage format)
    13: {  // Copa Libertadores
        name: 'CONMEBOL Libertadores',
        expectedTeamsInStandings: 32,
        qualificationCutoff: 2,  // Top 2 per group
        format: 'groups',
        groups: 8,
        teamsPerGroup: 4,
        description: '8 groups of 4 teams, top 2 from each group advance (16 total)'
    },
    11: {  // Copa Sudamericana
        name: 'CONMEBOL Sudamericana',
        expectedTeamsInStandings: 32,
        qualificationCutoff: 2,  // Top 2 per group
        format: 'groups',
        groups: 8,
        teamsPerGroup: 4,
        description: '8 groups of 4 teams, top 2 from each group advance (16 total)'
    }
};

// API configuration
const API_BASE = process.env.API_BASE_URL || 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY;

async function fetchStandings(leagueId, season) {
    if (!API_KEY) {
        console.log('⚠️  No API key, skipping live validation');
        return null;
    }
    
    try {
        const response = await axios.get(`${API_BASE}/standings`, {
            headers: { 'x-apisports-key': API_KEY },
            params: { league: leagueId, season }
        });
        
        return response.data?.response?.[0]?.league?.standings || null;
    } catch (error) {
        console.error(`❌ Failed to fetch standings for league ${leagueId}:`, error.message);
        return null;
    }
}

function countTeamsInStandings(standings) {
    if (!standings) return 0;
    
    // API returns [[...teams...]] for both league phase and groups
    // Flatten and count all teams
    if (Array.isArray(standings[0])) {
        return standings.reduce((sum, group) => sum + group.length, 0);
    }
    
    return standings.length;
}

function countGroups(standings) {
    if (!standings) return 0;
    if (!Array.isArray(standings[0])) return 1;
    return standings.length;
}

function detectFormat(standings) {
    if (!standings) return 'unknown';
    
    // Check if it's grouped (array of arrays) or flat (single array)
    if (Array.isArray(standings[0])) {
        // If there's only 1 "group" with many teams, it's actually league phase
        if (standings.length === 1 && standings[0].length > 10) {
            return 'league_phase';
        }
        // Multiple groups with 4-6 teams each = traditional group format
        return 'groups';
    }
    
    return 'league_phase';
}

async function validateTournament(leagueId, expected, season) {
    console.log(`\n📊 Validating ${expected.name} (ID: ${leagueId})...`);
    
    const standings = await fetchStandings(leagueId, season);
    
    if (!standings) {
        console.log(`   ⚠️  Could not fetch standings (may be off-season)`);
        return { status: 'skipped', league: leagueId, reason: 'no_data' };
    }
    
    const actualTeamCount = countTeamsInStandings(standings);
    const actualFormat = detectFormat(standings);
    
    const warnings = [];
    
    // Check team count
    if (actualTeamCount !== expected.expectedTeamsInStandings) {
        warnings.push({
            type: 'TEAM_COUNT_MISMATCH',
            message: `Expected ${expected.expectedTeamsInStandings} teams, found ${actualTeamCount}`,
            severity: 'high'
        });
    }
    
    // Check format type
    if (actualFormat !== expected.format) {
        warnings.push({
            type: 'FORMAT_CHANGED',
            message: `Expected '${expected.format}' format, detected '${actualFormat}'`,
            severity: 'critical'
        });
    }
    
    // For group format, check number of groups
    if (expected.format === 'groups' && actualFormat === 'groups') {
        const groupCount = countGroups(standings);
        if (groupCount !== expected.groups) {
            warnings.push({
                type: 'GROUP_COUNT_MISMATCH',
                message: `Expected ${expected.groups} groups, found ${groupCount}`,
                severity: 'high'
            });
        }
        
        // Check teams per group (use first group as reference)
        const teamsInFirstGroup = Array.isArray(standings[0]) ? standings[0].length : 0;
        if (teamsInFirstGroup !== expected.teamsPerGroup) {
            warnings.push({
                type: 'TEAMS_PER_GROUP_MISMATCH',
                message: `Expected ${expected.teamsPerGroup} teams per group, found ${teamsInFirstGroup}`,
                severity: 'high'
            });
        }
    }
    
    // Report results
    if (warnings.length === 0) {
        console.log(`   ✅ Format validated: ${expected.description}`);
        console.log(`   ✅ Team count: ${actualTeamCount}`);
        return { status: 'valid', league: leagueId, teamCount: actualTeamCount };
    } else {
        console.log(`   ⚠️  WARNINGS DETECTED:`);
        warnings.forEach(w => {
            const emoji = w.severity === 'critical' ? '🚨' : '⚠️';
            console.log(`   ${emoji} [${w.type}] ${w.message}`);
        });
        return { status: 'warning', league: leagueId, warnings };
    }
}

async function validateAllTournaments(season) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   🏆 TOURNAMENT FORMAT VALIDATOR');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Season: ${season}`);
    console.log(`   Date: ${new Date().toISOString()}`);
    
    const results = [];
    
    for (const [leagueId, expected] of Object.entries(EXPECTED_FORMATS)) {
        const result = await validateTournament(parseInt(leagueId), expected, season);
        results.push(result);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   📋 SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    
    const valid = results.filter(r => r.status === 'valid').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    console.log(`   ✅ Valid: ${valid}`);
    console.log(`   ⚠️  Warnings: ${warnings}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    
    if (warnings > 0) {
        console.log('\n   🚨 ACTION REQUIRED:');
        console.log('   Tournament formats may have changed!');
        console.log('   Please update world_tournaments_master.json with new knockout rules.');
    }
    
    return results;
}

// Check if our stored configuration matches expected
function validateStoredConfiguration() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   📁 STORED CONFIGURATION CHECK');
    console.log('═══════════════════════════════════════════════════════');
    
    let tournaments;
    try {
        tournaments = JSON.parse(fs.readFileSync(TOURNAMENTS_FILE, 'utf-8'));
    } catch (err) {
        console.log(`   ❌ Could not read tournaments file: ${err.message}`);
        return;
    }
    
    for (const [leagueId, expected] of Object.entries(EXPECTED_FORMATS)) {
        const stored = tournaments.tournaments?.[leagueId]?.knockout;
        
        if (!stored) {
            console.log(`   ⚠️  ${expected.name}: No knockout rules configured!`);
            continue;
        }
        
        if (stored.qualificationCutoff !== expected.qualificationCutoff) {
            console.log(`   ⚠️  ${expected.name}: Cutoff mismatch (stored: ${stored.qualificationCutoff}, expected: ${expected.qualificationCutoff})`);
        } else {
            console.log(`   ✅ ${expected.name}: Configuration OK (cutoff: ${stored.qualificationCutoff})`);
        }
    }
}

// Main execution
async function main() {
    const season = process.argv[2] || new Date().getFullYear();
    
    // First, validate stored configuration
    validateStoredConfiguration();
    
    // Then, validate against live API data
    if (API_KEY) {
        await validateAllTournaments(season);
    } else {
        console.log('\n⚠️  Set FOOTBALL_API_KEY to enable live validation');
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   ✅ Validation complete');
    console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
