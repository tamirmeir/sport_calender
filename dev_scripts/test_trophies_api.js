/**
 * Test Trophies API Endpoint
 * Check if API-Sports provides trophy data
 */

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const headers = { 'x-apisports-key': API_KEY };

async function checkTrophies(teamId, teamName) {
    try {
        const response = await axios.get('https://v3.football.api-sports.io/trophies', {
            headers,
            params: { team: teamId }
        });
        
        const trophies = response.data.response;
        console.log(`\n${teamName} (ID: ${teamId}):`);
        console.log(`  Total trophies: ${trophies.length}`);
        
        if (trophies.length > 0) {
            // Group by league
            const byLeague = {};
            trophies.forEach(t => {
                if (!byLeague[t.league]) byLeague[t.league] = [];
                byLeague[t.league].push(t);
            });
            
            Object.entries(byLeague).forEach(([league, items]) => {
                console.log(`  ${league}: ${items.length} trophies`);
                // Show most recent
                const recent = items.sort((a,b) => b.season.localeCompare(a.season))[0];
                console.log(`    Most recent: ${recent.season} - ${recent.place}`);
            });
        }
        
        return trophies;
    } catch (err) {
        console.log(`  Error: ${err.message}`);
        return [];
    }
}

async function main() {
    console.log('🏆 Trophy API Test\n');
    console.log('='.repeat(50));
    
    // Israeli teams
    await checkTrophies(4195, 'Maccabi Tel Aviv');
    await checkTrophies(632, 'Beitar Jerusalem');
    await checkTrophies(4196, 'Hapoel Beer Sheva');
    await checkTrophies(4197, 'Maccabi Haifa');
    
    // English teams  
    await checkTrophies(50, 'Manchester City');
    await checkTrophies(40, 'Liverpool');
    await checkTrophies(33, 'Manchester United');
    
    console.log('\n' + '='.repeat(50));
}

main();
