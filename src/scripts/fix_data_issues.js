#!/usr/bin/env node
/**
 * Auto-Fix Data Issues
 * 
 * Reads validation_issues.json and automatically fixes:
 * 1. Tournaments with upcoming matches → mark as active
 * 2. Tournaments with wrong winners → update winner data
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

const reportPath = path.join(__dirname, '../../reports/validation_issues.json');
const finishedPath = path.join(__dirname, '../data/finished_tournaments.json');
const masterPath = path.join(__dirname, '../data/world_tournaments_master.json');

if (!fs.existsSync(reportPath)) {
    console.error('❌ No validation report found. Run validate_all_finished.js first!');
    process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const finished = JSON.parse(fs.readFileSync(finishedPath, 'utf8'));
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

console.log('\n🔧 AUTO-FIX DATA ISSUES');
console.log('='.repeat(80));
console.log(`Found ${report.issuesFound} issues to fix\n`);

let fixed = {
    removedUpcoming: 0,
    fixedWinners: 0
};

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixWrongWinner(issue) {
    try {
        const id = issue.id;
        
        // Get winner details from API
        const res = await axios.get(`${API_BASE}/fixtures`, {
            params: {
                league: id,
                season: finished.finished_tournaments[id].year,
                last: 3
            },
            headers: { 'x-apisports-key': API_KEY },
            timeout: 5000
        });
        
        const matches = res.data.response || [];
        const finalMatch = matches.find(m => m.league.round.toLowerCase().includes('final'));
        
        if (!finalMatch) {
            console.log(`⚠️  Could not find final for ${issue.name}`);
            return false;
        }
        
        let winnerId, winnerLogo;
        if (finalMatch.teams.home.winner === true) {
            winnerId = finalMatch.teams.home.id;
            winnerLogo = finalMatch.teams.home.logo;
        } else if (finalMatch.teams.away.winner === true) {
            winnerId = finalMatch.teams.away.id;
            winnerLogo = finalMatch.teams.away.logo;
        } else if (finalMatch.goals.home > finalMatch.goals.away) {
            winnerId = finalMatch.teams.home.id;
            winnerLogo = finalMatch.teams.home.logo;
        } else if (finalMatch.goals.away > finalMatch.goals.home) {
            winnerId = finalMatch.teams.away.id;
            winnerLogo = finalMatch.teams.away.logo;
        }
        
        // Update finished_tournaments.json
        finished.finished_tournaments[id].winner = {
            name: issue.actualWinner,
            logo: winnerLogo,
            id: winnerId,
            detected_by: 'auto-fix-validation',
            detected_at: new Date().toISOString(),
            confidence: 'high',
            note: `Fixed from ${issue.storedWinner} to ${issue.actualWinner}`
        };
        
        // Update master
        if (master.tournaments[id]) {
            master.tournaments[id].winner = {
                hasWinner: true,
                season: finished.finished_tournaments[id].year.toString(),
                team: issue.actualWinner,
                teamId: winnerId,
                teamLogo: winnerLogo,
                confirmedDate: new Date().toISOString(),
                detectedBy: 'auto-fix-validation',
                confidence: 'high'
            };
        }
        
        console.log(`✅ Fixed winner for ${issue.name}: ${issue.storedWinner} → ${issue.actualWinner}`);
        fixed.fixedWinners++;
        
        await delay(300);
        return true;
        
    } catch (err) {
        console.log(`⚠️  Error fixing ${issue.name}: ${err.message}`);
        return false;
    }
}

async function fixAll() {
    // Fix tournaments with upcoming matches (remove from finished)
    const hasUpcoming = report.issues.filter(i => i.type === 'HAS_UPCOMING_MATCHES');
    console.log(`🔄 Removing ${hasUpcoming.length} tournaments with upcoming matches...\n`);
    
    for (const issue of hasUpcoming) {
        const id = issue.id;
        
        if (finished.finished_tournaments[id]) {
            console.log(`❌ Removing ${issue.name} (${issue.country}) - has upcoming matches`);
            delete finished.finished_tournaments[id];
        }
        
        if (master.tournaments[id]) {
            master.tournaments[id].status.current = 'active';
            master.tournaments[id].winner.hasWinner = false;
            delete master.tournaments[id].winner.team;
            delete master.tournaments[id].winner.teamId;
            delete master.tournaments[id].winner.teamLogo;
            delete master.tournaments[id].winner.season;
        }
        
        fixed.removedUpcoming++;
    }
    
    console.log(`\n🔄 Fixing ${report.issues.filter(i => i.type === 'WRONG_WINNER').length} wrong winners...\n`);
    
    // Fix wrong winners
    const wrongWinners = report.issues.filter(i => i.type === 'WRONG_WINNER');
    for (const issue of wrongWinners) {
        await fixWrongWinner(issue);
    }
    
    // Save files
    finished.metadata.last_updated = new Date().toISOString().split('T')[0];
    master.metadata.last_updated = new Date().toISOString().split('T')[0];
    
    fs.writeFileSync(finishedPath, JSON.stringify(finished, null, 2));
    fs.writeFileSync(masterPath, JSON.stringify(master, null, 2));
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 FIX SUMMARY');
    console.log('='.repeat(80));
    console.log(`Removed (has upcoming): ${fixed.removedUpcoming}`);
    console.log(`Fixed winners: ${fixed.fixedWinners}`);
    console.log(`Total fixed: ${fixed.removedUpcoming + fixed.fixedWinners}`);
    console.log('='.repeat(80));
    console.log('\n✅ Data files updated successfully!\n');
}

fixAll();
