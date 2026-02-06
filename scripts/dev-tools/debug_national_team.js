require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.FOOTBALL_API_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';
const HEADERS = { 'x-apisports-key': API_KEY };

async function debugAPI() {
    console.log("--- Debugging API-Sports Teams Endpoint ---");
    
    // Test 1: By ID (Israel)
    try {
        console.log("\n1. Fetching Team ID 767 (Israel):");
        const res1 = await axios.get(`${BASE_URL}/teams`, {
            params: { id: 767 },
            headers: HEADERS
        });
        if (res1.data.response.length > 0) {
            const team = res1.data.response[0].team;
            console.log(`   Found: ${team.name} (National: ${team.national}, Country: ${team.country})`);
        } else {
            console.log("   Not found.");
        }
    } catch (e) { console.error("   Error:", e.message); }

    // Test 2: Search "Israel" in Country "Israel"
    try {
        console.log("\n2. Search 'Israel' in Country 'Israel':");
        const res2 = await axios.get(`${BASE_URL}/teams`, {
            params: { country: 'Israel', search: 'Israel' },
            headers: HEADERS
        });
        console.log(`   Results count: ${res2.data.results}`);
    } catch (e) { console.error("   Error:", e.message); }

    // Test 3: Search "Israel" global
    try {
        console.log("\n3. Search 'Israel' (Global):");
        const res3 = await axios.get(`${BASE_URL}/teams`, {
            params: { search: 'Israel' },
            headers: HEADERS
        });
        console.log(`   Results count: ${res3.data.results}`);
        res3.data.response.forEach(t => {
            if (t.team.national) console.log(`   - National Team Found: ${t.team.name} (${t.team.country})`);
        });
    } catch (e) { console.error("   Error:", e.message); }
}

debugAPI();
