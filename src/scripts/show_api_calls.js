#!/usr/bin/env node

/**
 * Show the exact API calls being made to get tournament winner data
 */

const { API_BASE_URL, FOOTBALL_API_KEY } = require('../utils/config');

async function showActualAPICall() {
    console.log('🔍 ACTUAL API CALLS FOR TOURNAMENT WINNERS');
    console.log('=' .repeat(60));
    
    // API-Sports configuration
    console.log('📡 API Configuration:');
    console.log(`   Base URL: ${API_BASE_URL}`);
    console.log(`   API Key: ${FOOTBALL_API_KEY ? '***' + FOOTBALL_API_KEY.slice(-4) : 'NOT SET'}`);
    
    // Show exact API calls for the Israeli tournaments
    const testCases = [
        { id: 385, name: 'Toto Cup Ligat Al', season: 2025 },
        { id: 659, name: 'Israeli Super Cup', season: 2025 },
        { id: 533, name: 'CAF Super Cup', season: 2025 }
    ];
    
    console.log('\n🎯 Exact API Calls Made:');
    
    testCases.forEach(({ id, name, season }) => {
        console.log(`\n📞 ${name}:`);
        console.log(`   Method: GET`);
        console.log(`   URL: ${API_BASE_URL}/fixtures`);
        console.log(`   Parameters:`);
        console.log(`     league: ${id}`);
        console.log(`     season: ${season}`);
        console.log(`     round: "Final"`);
        console.log(`   Headers:`);
        console.log(`     x-apisports-key: ${FOOTBALL_API_KEY ? '***' + FOOTBALL_API_KEY.slice(-4) : 'NOT SET'}`);
        console.log(`     x-apisports-host: v3.football.api-sports.io`);
        
        // Show complete curl command
        console.log(`   Full cURL:`);
        console.log(`     curl -X GET \\`);
        console.log(`       "${API_BASE_URL}/fixtures?league=${id}&season=${season}&round=Final" \\`);
        console.log(`       -H "x-apisports-key: ${FOOTBALL_API_KEY || 'YOUR_API_KEY'}" \\`);
        console.log(`       -H "x-apisports-host: v3.football.api-sports.io"`);
    });
    
    console.log('\n🔄 Process:');
    console.log('   1. API call gets all fixtures for the Final round');
    console.log('   2. Filter for finished matches (status: FT, AET, or PEN)');
    console.log('   3. Look for teams.home.winner or teams.away.winner = true');
    console.log('   4. Extract winner name, ID, and logo');
    
    console.log('\n📊 Response Structure (example):');
    const exampleResponse = {
        "response": [
            {
                "fixture": {
                    "id": 123456,
                    "status": { "short": "FT" },
                    "date": "2025-08-15T20:00:00+00:00"
                },
                "league": {
                    "id": 385,
                    "name": "Toto Cup Ligat Al",
                    "round": "Final"
                },
                "teams": {
                    "home": {
                        "id": 657,
                        "name": "Beitar Jerusalem",
                        "logo": "https://media.api-sports.io/football/teams/657.png",
                        "winner": true
                    },
                    "away": {
                        "id": 999,
                        "name": "Other Team",
                        "logo": "https://media.api-sports.io/football/teams/999.png", 
                        "winner": false
                    }
                },
                "goals": { "home": 2, "away": 1 }
            }
        ]
    };
    
    console.log(JSON.stringify(exampleResponse, null, 2));
}

// Run the demonstration
if (require.main === module) {
    showActualAPICall();
}

module.exports = showActualAPICall;