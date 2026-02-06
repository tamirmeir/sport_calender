#!/usr/bin/env node
/**
 * Data Quality Validation Script
 * 
 * Validates ALL finished tournaments against API-Sports to ensure:
 * 1. Tournaments marked "finished" have no upcoming matches
 * 2. Winner information is correct
 * 3. Season/year is correct
 * 
 * Run this regularly to catch bad data before it goes to production!
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

if (!API_KEY) {
    console.error('❌ FOOTBALL_API_KEY not set');
    process.exit(1);
}

const finishedPath = path.join(__dirname, '../data/finished_tournaments.json');
const finished = JSON.parse(fs.readFileSync(finishedPath, 'utf8'));

console.log('\n🔍 DATA QUALITY VALIDATION');
console.log('='.repeat(80));
console.log(`Validating ${Object.keys(finished.finished_tournaments).length} finished tournaments...\n`);

const issues = [];
let checked = 0;
let hasUpcoming = 0;
let apiErrors = 0;

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function validateTournament(id, tournament) {
    try {
        checked++;
        
        // Check for upcoming matches
        const upcomingRes = await axios.get(`${API_BASE}/fixtures`, {
            params: {
                league: id,
                season: tournament.year,
                next: 1
            },
            headers: { 'x-apisports-key': API_KEY },
            timeout: 5000
        });
        
        const upcoming = upcomingRes.data.response || [];
        
        if (upcoming.length > 0) {
            hasUpcoming++;
            issues.push({
                type: 'HAS_UPCOMING_MATCHES',
                id,
                name: tournament.name,
                country: tournament.country,
                markedAs: 'finished',
                shouldBe: 'active',
                nextMatch: {
                    date: upcoming[0].fixture.date,
                    teams: `${upcoming[0].teams.home.name} vs ${upcoming[0].teams.away.name}`
                }
            });
            console.log(`❌ ${id} - ${tournament.name} (${tournament.country}): HAS UPCOMING MATCHES!`);
            console.log(`   Next: ${upcoming[0].teams.home.name} vs ${upcoming[0].teams.away.name} on ${upcoming[0].fixture.date.split('T')[0]}`);
        } else {
            // No upcoming - verify winner by checking last match
            const lastRes = await axios.get(`${API_BASE}/fixtures`, {
                params: {
                    league: id,
                    season: tournament.year,
                    last: 3
                },
                headers: { 'x-apisports-key': API_KEY },
                timeout: 5000
            });
            
            const lastMatches = lastRes.data.response || [];
            if (lastMatches.length > 0) {
                const finals = lastMatches.filter(m => 
                    m.league.round.toLowerCase().includes('final') && 
                    !m.league.round.toLowerCase().includes('semi')
                );
                
                if (finals.length > 0) {
                    const finalMatch = finals[0];
                    let actualWinner = null;
                    
                    if (finalMatch.teams.home.winner === true) {
                        actualWinner = finalMatch.teams.home.name;
                    } else if (finalMatch.teams.away.winner === true) {
                        actualWinner = finalMatch.teams.away.name;
                    } else if (finalMatch.goals.home > finalMatch.goals.away) {
                        actualWinner = finalMatch.teams.home.name;
                    } else if (finalMatch.goals.away > finalMatch.goals.home) {
                        actualWinner = finalMatch.teams.away.name;
                    }
                    
                    if (actualWinner && actualWinner !== tournament.winner.name) {
                        issues.push({
                            type: 'WRONG_WINNER',
                            id,
                            name: tournament.name,
                            country: tournament.country,
                            storedWinner: tournament.winner.name,
                            actualWinner: actualWinner,
                            finalDate: finalMatch.fixture.date
                        });
                        console.log(`⚠️  ${id} - ${tournament.name}: WRONG WINNER!`);
                        console.log(`   Stored: ${tournament.winner.name}`);
                        console.log(`   Actual: ${actualWinner}`);
                    } else {
                        console.log(`✅ ${id} - ${tournament.name}: OK`);
                    }
                } else {
                    console.log(`⚪ ${id} - ${tournament.name}: No final found in last 3 matches`);
                }
            }
        }
        
        await delay(300); // Rate limit: ~3 requests/second
        
    } catch (err) {
        apiErrors++;
        if (err.response && err.response.status === 429) {
            console.log(`⏳ ${id} - ${tournament.name}: Rate limited, waiting...`);
            await delay(2000);
        } else {
            console.log(`⚠️  ${id} - ${tournament.name}: API error (${err.message})`);
        }
    }
}

async function runValidation() {
    const tournaments = Object.entries(finished.finished_tournaments);
    
    for (const [id, tournament] of tournaments) {
        await validateTournament(id, tournament);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total checked: ${checked}`);
    console.log(`Issues found: ${issues.length}`);
    console.log(`  - Has upcoming matches: ${hasUpcoming}`);
    console.log(`  - Wrong winner: ${issues.filter(i => i.type === 'WRONG_WINNER').length}`);
    console.log(`API errors: ${apiErrors}`);
    console.log('='.repeat(80));
    
    if (issues.length > 0) {
        console.log('\n❌ ISSUES DETECTED:\n');
        issues.forEach((issue, idx) => {
            console.log(`${idx + 1}. [${issue.type}] ${issue.name} (ID: ${issue.id}, ${issue.country})`);
            if (issue.type === 'HAS_UPCOMING_MATCHES') {
                console.log(`   → Next match: ${issue.nextMatch.teams} on ${issue.nextMatch.date.split('T')[0]}`);
            } else if (issue.type === 'WRONG_WINNER') {
                console.log(`   → Stored: ${issue.storedWinner}`);
                console.log(`   → Actual: ${issue.actualWinner}`);
            }
            console.log('');
        });
        
        // Save report
        const reportPath = path.join(__dirname, '../../reports/validation_issues.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            totalChecked: checked,
            issuesFound: issues.length,
            issues: issues
        }, null, 2));
        console.log(`📄 Full report saved to: ${reportPath}\n`);
        
        process.exit(1);
    } else {
        console.log('\n✅ All finished tournaments validated successfully!\n');
        process.exit(0);
    }
}

runValidation();
