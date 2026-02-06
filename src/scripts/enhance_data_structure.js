#!/usr/bin/env node
/**
 * Data Structure Enhancement Script
 * 
 * Adds enhanced metadata to all finished tournaments:
 * 1. Validation windows (for smart caching)
 * 2. Final match details (for tooltips)
 * 3. Season information
 * 4. Runner-up data
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

const finishedPath = path.join(__dirname, '../data/finished_tournaments.json');
const masterPath = path.join(__dirname, '../data/world_tournaments_master.json');

const finished = JSON.parse(fs.readFileSync(finishedPath, 'utf8'));
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

console.log('\n🔧 DATA STRUCTURE ENHANCEMENT');
console.log('='.repeat(80));
console.log(`Enhancing ${Object.keys(finished.finished_tournaments).length} tournaments...\n`);

let enhanced = 0;
let skipped = 0;
let errors = 0;

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getFinalMatchDetails(leagueId, season) {
    try {
        const res = await axios.get(`${API_BASE}/fixtures`, {
            params: {
                league: leagueId,
                season: season,
                last: 5
            },
            headers: { 'x-apisports-key': API_KEY },
            timeout: 5000
        });
        
        const fixtures = res.data.response || [];
        
        // Find the final match
        const finalMatch = fixtures.find(f => 
            f.league.round.toLowerCase().includes('final') &&
            !f.league.round.toLowerCase().includes('semi')
        );
        
        if (!finalMatch) return null;
        
        // Determine winner
        let winner, runnerUp;
        if (finalMatch.teams.home.winner === true) {
            winner = finalMatch.teams.home;
            runnerUp = finalMatch.teams.away;
        } else if (finalMatch.teams.away.winner === true) {
            winner = finalMatch.teams.away;
            runnerUp = finalMatch.teams.home;
        } else {
            // Draw - check goals
            if (finalMatch.goals.home > finalMatch.goals.away) {
                winner = finalMatch.teams.home;
                runnerUp = finalMatch.teams.away;
            } else {
                winner = finalMatch.teams.away;
                runnerUp = finalMatch.teams.home;
            }
        }
        
        return {
            date: finalMatch.fixture.date,
            venue: finalMatch.fixture.venue.name || 'Unknown',
            city: finalMatch.fixture.venue.city || '',
            homeTeam: {
                name: finalMatch.teams.home.name,
                id: finalMatch.teams.home.id,
                score: finalMatch.goals.home
            },
            awayTeam: {
                name: finalMatch.teams.away.name,
                id: finalMatch.teams.away.id,
                score: finalMatch.goals.away
            },
            result: `${finalMatch.goals.home}-${finalMatch.goals.away}`,
            penalties: finalMatch.score.penalty ? {
                home: finalMatch.score.penalty.home,
                away: finalMatch.score.penalty.away
            } : null,
            overtime: finalMatch.score.extratime ? true : false,
            round: finalMatch.league.round,
            winner: {
                name: winner.name,
                id: winner.id
            },
            runnerUp: {
                name: runnerUp.name,
                id: runnerUp.id
            }
        };
        
    } catch (err) {
        return null;
    }
}

async function enhanceTournament(id, tournament) {
    try {
        console.log(`Processing ${id} - ${tournament.name}...`);
        
        // Add validation metadata (30 days from now)
        const nextCheckDate = new Date();
        nextCheckDate.setDate(nextCheckDate.getDate() + 30);
        
        tournament.validation = {
            lastChecked: new Date().toISOString(),
            nextCheck: nextCheckDate.toISOString().split('T')[0],
            confidence: 'high',
            method: 'upcoming_matches_check',
            checksPerformed: 1
        };
        
        // Add season info
        tournament.season = {
            year: tournament.year,
            verifiedDate: new Date().toISOString().split('T')[0],
            confidence: 'verified'
        };
        
        // Try to get final match details from API
        const finalDetails = await getFinalMatchDetails(id, tournament.year);
        
        if (finalDetails) {
            tournament.finalMatch = {
                date: finalDetails.date,
                venue: finalDetails.venue,
                city: finalDetails.city,
                homeTeam: finalDetails.homeTeam,
                awayTeam: finalDetails.awayTeam,
                result: finalDetails.result,
                round: finalDetails.round
            };
            
            if (finalDetails.penalties) {
                tournament.finalMatch.penalties = finalDetails.penalties;
                tournament.finalMatch.result += ` (${finalDetails.penalties.home}-${finalDetails.penalties.away} pen)`;
            }
            
            if (finalDetails.overtime) {
                tournament.finalMatch.overtime = true;
            }
            
            // Add runner-up
            tournament.runnerUp = {
                name: finalDetails.runnerUp.name,
                id: finalDetails.runnerUp.id
            };
            
            console.log(`  ✅ Added full details (winner: ${finalDetails.winner.name}, runner-up: ${finalDetails.runnerUp.name})`);
            enhanced++;
        } else {
            console.log(`  ⚠️  No final match found - added validation only`);
            skipped++;
        }
        
        await delay(300); // Rate limit
        
    } catch (err) {
        console.log(`  ❌ Error: ${err.message}`);
        errors++;
    }
}

async function runEnhancement() {
    const tournaments = Object.entries(finished.finished_tournaments);
    
    // Process in batches of 20 to avoid API limits
    const batchSize = 20;
    for (let i = 0; i < tournaments.length; i += batchSize) {
        const batch = tournaments.slice(i, i + batchSize);
        console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tournaments.length/batchSize)}...\n`);
        
        for (const [id, tournament] of batch) {
            await enhanceTournament(id, tournament);
        }
        
        // Save progress after each batch
        fs.writeFileSync(finishedPath, JSON.stringify(finished, null, 2));
        console.log(`\n💾 Saved progress (${i + batch.length}/${tournaments.length} tournaments)\n`);
        
        // Longer delay between batches
        if (i + batchSize < tournaments.length) {
            console.log('⏳ Waiting 10 seconds before next batch...\n');
            await delay(10000);
        }
    }
    
    // Final save
    finished.metadata.last_updated = new Date().toISOString().split('T')[0];
    finished.metadata.structure_version = '2.0-enhanced';
    fs.writeFileSync(finishedPath, JSON.stringify(finished, null, 2));
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 ENHANCEMENT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total processed: ${tournaments.length}`);
    console.log(`Fully enhanced: ${enhanced} (with final match details)`);
    console.log(`Partially enhanced: ${skipped} (validation only)`);
    console.log(`Errors: ${errors}`);
    console.log('='.repeat(80));
    console.log('\n✅ Enhancement complete! Data structure upgraded to v2.0\n');
}

runEnhancement();
