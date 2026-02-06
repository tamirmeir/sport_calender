#!/usr/bin/env node
/**
 * Missing Winners Detection Script
 * 
 * Scans ALL tournaments from API-Sports and identifies:
 * - Finished tournaments (Cups/Super Cups) missing from our data
 * - Tournaments with winners that aren't recorded
 * - Status mismatches between API and our records
 * 
 * Runs as part of crontab to keep data up-to-date
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.FOOTBALL_API_KEY;
const CURRENT_SEASON = 2025;

if (!API_KEY) {
    console.error('❌ FOOTBALL_API_KEY not set in environment');
    process.exit(1);
}

// Load existing data
const finishedTournamentsPath = path.join(__dirname, '../data/finished_tournaments.json');
let finishedTournaments = {};
try {
    const data = JSON.parse(fs.readFileSync(finishedTournamentsPath, 'utf8'));
    finishedTournaments = data.finished_tournaments || {};
} catch (e) {
    console.error('❌ Could not load finished_tournaments.json:', e.message);
}

console.log('\n🔍 MISSING WINNERS DETECTION');
console.log('='.repeat(80));
console.log(`Scanning all tournaments for season ${CURRENT_SEASON}...`);
console.log('='.repeat(80));

const missingTournaments = [];
const statusMismatches = [];
let totalScanned = 0;
let cupsScanned = 0;

// Countries to scan (expand as needed)
const COUNTRIES = [
    'World',
    // Europe
    'England', 'Spain', 'Italy', 'Germany', 'France', 'Portugal', 'Netherlands', 'Belgium',
    'Turkey', 'Greece', 'Ukraine', 'Russia', 'Poland', 'Austria', 'Switzerland', 'Croatia',
    // Africa
    'Tunisia', 'Algeria', 'Morocco', 'Egypt', 'South-Africa', 'Nigeria', 'Ghana', 'Kenya',
    'Senegal', 'Cameroon', 'Ivory-Coast',
    // Middle East
    'Israel', 'Saudi-Arabia', 'UAE', 'Qatar', 'Jordan', 'Iraq',
    // Asia
    'Japan', 'South-Korea', 'China', 'Australia', 'India', 'Thailand', 'Malaysia',
    // South America
    'Brazil', 'Argentina', 'Uruguay', 'Chile', 'Colombia', 'Peru', 'Ecuador',
    // North America
    'USA', 'Mexico', 'Canada', 'Costa-Rica'
];

function apiRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'v3.football.api-sports.io',
            path: path,
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            }
        };
        
        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.response || []);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function checkFixtures(leagueId, leagueName, country, season = CURRENT_SEASON) {
    try {
        const fixtures = await apiRequest(`/fixtures?league=${leagueId}&season=${season}&last=10`);
        
        if (!fixtures || fixtures.length === 0) {
            return null;
        }
        
        // Look for finished matches (finals)
        const finishedMatches = fixtures.filter(f => 
            f.fixture.status.short === 'FT' && 
            f.goals.home !== null && 
            f.goals.away !== null
        );
        
        if (finishedMatches.length === 0) {
            return null;
        }
        
        // Find the winner (most recent final or highest score)
        const sortedMatches = finishedMatches.sort((a, b) => 
            new Date(b.fixture.date) - new Date(a.fixture.date)
        );
        
        const finalMatch = sortedMatches[0];
        const homeGoals = finalMatch.goals.home;
        const awayGoals = finalMatch.goals.away;
        
        let winner = null;
        if (homeGoals > awayGoals) {
            winner = {
                name: finalMatch.teams.home.name,
                id: finalMatch.teams.home.id,
                logo: finalMatch.teams.home.logo
            };
        } else if (awayGoals > homeGoals) {
            winner = {
                name: finalMatch.teams.away.name,
                id: finalMatch.teams.away.id,
                logo: finalMatch.teams.away.logo
            };
        }
        
        return {
            leagueId,
            leagueName,
            country,
            winner,
            matchDate: finalMatch.fixture.date,
            score: `${homeGoals}-${awayGoals}`,
            teams: `${finalMatch.teams.home.name} vs ${finalMatch.teams.away.name}`
        };
    } catch (e) {
        return null;
    }
}

async function scanCountry(country) {
    try {
        console.log(`\n📍 Scanning ${country}...`);
        const leagues = await apiRequest(`/leagues?country=${country}&season=${CURRENT_SEASON}`);
        
        for (const item of leagues) {
            const league = item.league;
            totalScanned++;
            
            // Focus on Cups and Super Cups
            const isCup = league.type === 'Cup' || 
                         league.name.toLowerCase().includes('cup') ||
                         league.name.toLowerCase().includes('copa') ||
                         league.name.toLowerCase().includes('coupe') ||
                         league.name.toLowerCase().includes('pokal');
            
            if (!isCup) continue;
            
            cupsScanned++;
            
            // Check if already in our records
            const existingRecord = finishedTournaments[league.id];
            
            // Check fixtures to see if tournament is finished
            const result = await checkFixtures(league.id, league.name, country);
            
            if (result && result.winner) {
                if (!existingRecord) {
                    // NEW: Tournament finished but not in our records
                    missingTournaments.push({
                        ...result,
                        reason: 'NOT_IN_DATABASE'
                    });
                    console.log(`   ⚠️  Missing: ${league.name} (${league.id}) - Winner: ${result.winner.name}`);
                } else if (existingRecord.status !== 'finished') {
                    // STATUS MISMATCH: In our DB but not marked as finished
                    statusMismatches.push({
                        ...result,
                        currentStatus: existingRecord.status,
                        reason: 'STATUS_MISMATCH'
                    });
                    console.log(`   ⚠️  Status Mismatch: ${league.name} (${league.id}) - DB: ${existingRecord.status}, Should be: finished`);
                } else {
                    console.log(`   ✅ ${league.name} (${league.id}) - ${existingRecord.winner.name}`);
                }
            } else {
                // Tournament not finished yet or no clear winner
                if (existingRecord && existingRecord.status === 'finished') {
                    console.log(`   ℹ️  ${league.name} (${league.id}) - Already recorded`);
                }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    } catch (e) {
        console.error(`   ❌ Error scanning ${country}:`, e.message);
    }
}

async function main() {
    const startTime = Date.now();
    
    // Scan all countries
    for (const country of COUNTRIES) {
        await scanCountry(country);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Generate report
    console.log('\n' + '='.repeat(80));
    console.log('📊 DETECTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total tournaments scanned: ${totalScanned}`);
    console.log(`Cups/Super Cups scanned: ${cupsScanned}`);
    console.log(`Missing tournaments found: ${missingTournaments.length}`);
    console.log(`Status mismatches found: ${statusMismatches.length}`);
    console.log(`Scan duration: ${duration}s`);
    
    if (missingTournaments.length > 0) {
        console.log('\n🚨 MISSING TOURNAMENTS (Need to Add):');
        console.log('-'.repeat(80));
        missingTournaments.forEach((t, idx) => {
            console.log(`${idx + 1}. ${t.leagueName} (${t.country})`);
            console.log(`   ID: ${t.leagueId}`);
            console.log(`   Winner: ${t.winner.name} (ID: ${t.winner.id})`);
            console.log(`   Score: ${t.score} - ${t.teams}`);
            console.log(`   Date: ${t.matchDate}`);
            console.log(`   Logo: ${t.winner.logo}`);
            console.log('');
        });
        
        console.log('\n📝 To add these, run:');
        console.log('   node src/scripts/add_missing_tournament.js <tournament_id>');
    }
    
    if (statusMismatches.length > 0) {
        console.log('\n⚠️  STATUS MISMATCHES (Need to Update):');
        console.log('-'.repeat(80));
        statusMismatches.forEach((t, idx) => {
            console.log(`${idx + 1}. ${t.leagueName} (${t.country})`);
            console.log(`   ID: ${t.leagueId}`);
            console.log(`   Current status in DB: ${t.currentStatus}`);
            console.log(`   Should be: finished`);
            console.log(`   Winner: ${t.winner.name}`);
            console.log('');
        });
    }
    
    // Save report to file
    const report = {
        timestamp: new Date().toISOString(),
        scanDuration: duration,
        statistics: {
            totalScanned,
            cupsScanned,
            missingCount: missingTournaments.length,
            mismatchCount: statusMismatches.length
        },
        missingTournaments,
        statusMismatches
    };
    
    const reportPath = path.join(__dirname, '../../missing_winners_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
    
    console.log('\n' + '='.repeat(80));
    if (missingTournaments.length === 0 && statusMismatches.length === 0) {
        console.log('✅ ALL FINISHED TOURNAMENTS ARE UP TO DATE!');
    } else {
        console.log('⚠️  ACTION REQUIRED - Review and add missing tournaments');
    }
    console.log('='.repeat(80) + '\n');
    
    // Exit with appropriate code
    process.exit(missingTournaments.length > 0 || statusMismatches.length > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
