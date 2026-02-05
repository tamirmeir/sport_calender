const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { getSeasonWindow } = require('../src/utils/config');

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

const headers = {
    'x-apisports-key': API_KEY,
    'x-apisports-host': 'v3.football.api-sports.io'
};

async function fetchFromApi(endpoint, params = {}) {
    const url = `${API_BASE}${endpoint}`;
    const res = await axios.get(url, { headers, params });
    return res.data.response;
}

// Simulate exactly what verify_leagues does
async function simulateSync() {
    const seasonWindow = getSeasonWindow();
    console.log('Season window:', seasonWindow);
    const minSeasonYear = seasonWindow.min;

    const leagues = await fetchFromApi('/leagues', { country: 'Israel', current: 'true' });
    console.log(`Got ${leagues.length} Israeli leagues from API`);

    for (const item of leagues) {
        const leagueId = item.league.id;
        const currentSeason = item.seasons.find(s => s.current) || item.seasons[item.seasons.length - 1];
        const year = currentSeason.year;

        // Year filter
        if (year < minSeasonYear) {
            console.log(`[SKIP] ${leagueId} ${item.league.name} - Season ${year} < ${minSeasonYear}`);
            continue;
        }

        console.log(`\n[CHECK] ${leagueId} ${item.league.name} (Season ${year})`);

        // Check next fixtures
        try {
            const fixtures = await fetchFromApi('/fixtures', { league: leagueId, season: year, next: 1 });
            if (fixtures && fixtures.length > 0) {
                console.log('  ✅ Has next fixtures -> ACTIVE');
                continue;
            }
            console.log('  - No next fixtures');
        } catch(e) {
            console.log('  - Error checking next fixtures:', e.message);
        }

        // Check last fixtures
        try {
            const fixtures = await fetchFromApi('/fixtures', { league: leagueId, season: year, last: 1 });
            if (fixtures && fixtures.length > 0) {
                console.log('  ✅ Has last fixtures -> VACATION');
                continue;
            }
            console.log('  - No last fixtures');
        } catch(e) {
            console.log('  - Error checking last fixtures:', e.message);
        }

        // Check standings
        try {
            const standings = await fetchFromApi('/standings', { league: leagueId, season: year });
            if (standings && standings.length > 0) {
                console.log('  ✅ Has standings -> VACATION');
                continue;
            }
            console.log('  - No standings');
        } catch(e) {
            console.log('  - Error checking standings:', e.message);
        }

        console.log('  ❌ No data found -> ARCHIVED');
    }
}

simulateSync();
