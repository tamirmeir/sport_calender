/**
 * Find International Competitions
 */
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.FOOTBALL_API_KEY;
const headers = { 'x-apisports-key': API_KEY };

async function main() {
    // Get international competitions
    const response = await axios.get('https://v3.football.api-sports.io/leagues', {
        headers,
        params: { type: 'cup', current: true }
    });
    
    const leagues = response.data.response || [];
    const international = leagues.filter(l => 
        l.country?.name === 'World' || 
        l.league?.name?.includes('Euro') ||
        l.league?.name?.includes('Copa America') ||
        l.league?.name?.includes('World Cup') ||
        l.league?.name?.includes('Nations League') ||
        l.league?.name?.includes('Africa Cup') ||
        l.league?.name?.includes('Asian Cup')
    );
    
    console.log('International Competitions:');
    international.forEach(l => {
        console.log(`  ID: ${l.league.id} | ${l.league.name} | ${l.country?.name || 'International'}`);
    });
    
    // Get recent World Cup winner
    console.log('\n\nChecking World Cup 2022 standings...');
    const wcResponse = await axios.get('https://v3.football.api-sports.io/standings', {
        headers,
        params: { league: 1, season: 2022 }  // World Cup
    });
    
    const wcStandings = wcResponse.data.response;
    if (wcStandings && wcStandings.length > 0) {
        console.log('World Cup 2022 Groups:');
        const groups = wcStandings[0].league?.standings || [];
        groups.forEach(group => {
            if (group[0]) {
                console.log(`  ${group[0].group}: #1 = ${group[0].team.name}`);
            }
        });
    }
    
    // Euro 2024
    console.log('\n\nChecking Euro 2024...');
    const euroResponse = await axios.get('https://v3.football.api-sports.io/standings', {
        headers,
        params: { league: 4, season: 2024 }  // Euro
    });
    
    const euroStandings = euroResponse.data.response;
    if (euroStandings && euroStandings.length > 0) {
        console.log('Euro 2024 Groups:');
        const groups = euroStandings[0].league?.standings || [];
        groups.slice(0, 3).forEach(group => {
            if (group[0]) {
                console.log(`  ${group[0].group}: #1 = ${group[0].team.name} (ID: ${group[0].team.id})`);
            }
        });
    }
}

main().catch(console.error);
