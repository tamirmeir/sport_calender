/**
 * Verify Champions & Cup Winners Across Countries
 * 
 * This script validates league champions from API-Sports
 * and helps identify correct team IDs for cup winners
 * 
 * Usage: node dev_scripts/verify_global_winners.js
 */

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';
const headers = { 'x-apisports-key': API_KEY };

// Countries to verify (diverse selection)
const LEAGUES_TO_CHECK = [
    // Europe
    { country: 'England', leagueId: 39, name: 'Premier League' },
    { country: 'Spain', leagueId: 140, name: 'La Liga' },
    { country: 'Germany', leagueId: 78, name: 'Bundesliga' },
    { country: 'Italy', leagueId: 135, name: 'Serie A' },
    { country: 'France', leagueId: 61, name: 'Ligue 1' },
    { country: 'Netherlands', leagueId: 88, name: 'Eredivisie' },
    { country: 'Portugal', leagueId: 94, name: 'Primeira Liga' },
    
    // Middle East
    { country: 'Israel', leagueId: 383, name: 'Ligat Ha\'al' },
    
    // South America
    { country: 'Brazil', leagueId: 71, name: 'Serie A' },
    { country: 'Argentina', leagueId: 128, name: 'Liga Profesional' },
    
    // Other
    { country: 'Turkey', leagueId: 203, name: 'Super Lig' },
    { country: 'Scotland', leagueId: 179, name: 'Premiership' },
];

// Known Cup Winners (from public sources - to verify IDs)
const KNOWN_CUP_WINNERS_2024 = {
    'England': 'Manchester United',      // FA Cup 2023-24
    'Spain': 'Athletic Bilbao',          // Copa del Rey 2023-24
    'Germany': 'Bayer Leverkusen',       // DFB-Pokal 2023-24
    'Italy': 'Juventus',                 // Coppa Italia 2023-24
    'France': 'Paris Saint Germain',     // Coupe de France 2023-24
    'Netherlands': 'Feyenoord',          // KNVB Cup 2023-24
    'Portugal': 'Porto',                 // Taça de Portugal 2023-24
    'Israel': 'Beitar Jerusalem',        // State Cup 2023-24
    'Brazil': 'Sao Paulo',               // Copa do Brasil 2023
    'Argentina': 'Estudiantes',          // Copa Argentina 2023
    'Turkey': 'Besiktas',                // Turkish Cup 2023-24
    'Scotland': 'Celtic',                // Scottish Cup 2023-24
};

async function getLeagueChampion(leagueId, season) {
    try {
        const response = await axios.get(`${API_BASE}/standings`, {
            headers,
            params: { league: leagueId, season }
        });
        
        const standings = response.data.response;
        if (standings && standings.length > 0 && standings[0].league?.standings) {
            const groups = standings[0].league.standings;
            // Find championship group or use first group
            const championshipGroup = groups.find(g => 
                g[0]?.group?.toLowerCase().includes('championship') || 
                g[0]?.group?.toLowerCase().includes('title')
            ) || groups[0];
            
            if (championshipGroup && championshipGroup[0]) {
                return {
                    name: championshipGroup[0].team.name,
                    id: championshipGroup[0].team.id,
                    group: championshipGroup[0].group
                };
            }
        }
        return null;
    } catch (err) {
        return { error: err.message };
    }
}

async function findTeamId(teamName, leagueId, season) {
    try {
        // Search in league teams
        const response = await axios.get(`${API_BASE}/teams`, {
            headers,
            params: { league: leagueId, season }
        });
        
        const teams = response.data.response || [];
        const normalizedSearch = teamName.toLowerCase();
        
        // Try exact match first
        let match = teams.find(t => 
            t.team.name.toLowerCase() === normalizedSearch
        );
        
        // Try partial match
        if (!match) {
            match = teams.find(t => 
                t.team.name.toLowerCase().includes(normalizedSearch) ||
                normalizedSearch.includes(t.team.name.toLowerCase())
            );
        }
        
        return match ? { id: match.team.id, name: match.team.name } : null;
    } catch (err) {
        return null;
    }
}

async function verifyAllCountries() {
    console.log('🌍 GLOBAL WINNERS VERIFICATION\n');
    console.log('='.repeat(80));
    console.log('Checking league champions (2024 season) and identifying cup winner IDs\n');
    
    const results = {
        champions: [],
        cupWinners: []
    };
    
    for (const league of LEAGUES_TO_CHECK) {
        console.log(`\n📊 ${league.country} - ${league.name} (ID: ${league.leagueId})`);
        console.log('-'.repeat(50));
        
        // Get league champion
        const champion = await getLeagueChampion(league.leagueId, 2024);
        
        if (champion && !champion.error) {
            console.log(`   👑 League Champion: ${champion.name} (ID: ${champion.id})`);
            if (champion.group) console.log(`      Group: ${champion.group}`);
            results.champions.push({
                country: league.country,
                teamName: champion.name,
                teamId: champion.id
            });
        } else {
            console.log(`   ❌ Could not fetch champion: ${champion?.error || 'Unknown error'}`);
        }
        
        // Find cup winner ID
        const knownCupWinner = KNOWN_CUP_WINNERS_2024[league.country];
        if (knownCupWinner) {
            const cupWinnerInfo = await findTeamId(knownCupWinner, league.leagueId, 2024);
            if (cupWinnerInfo) {
                console.log(`   🏆 Cup Winner: ${cupWinnerInfo.name} (ID: ${cupWinnerInfo.id})`);
                results.cupWinners.push({
                    country: league.country,
                    teamName: cupWinnerInfo.name,
                    teamId: cupWinnerInfo.id
                });
            } else {
                console.log(`   ⚠️ Cup Winner "${knownCupWinner}" - ID not found in league teams`);
            }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
    }
    
    // Summary for cup_winners.js
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 DATA FOR cup_winners.js:\n');
    
    console.log('// League Champions 2024 (for reference):');
    results.champions.forEach(c => {
        console.log(`//   ${c.country}: ${c.teamName} (ID: ${c.teamId})`);
    });
    
    console.log('\n// Cup Winners 2024 (season key = 2024):');
    console.log('module.exports = {');
    results.cupWinners.forEach(c => {
        const countryKey = c.country.toLowerCase();
        console.log(`    ${countryKey}: { 2024: ${c.teamId} },  // ${c.teamName}`);
    });
    console.log('};');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Verification complete!\n');
}

verifyAllCountries().catch(console.error);
