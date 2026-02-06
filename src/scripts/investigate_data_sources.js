#!/usr/bin/env node

/**
 * Data Source Investigation Script
 * Tests what global tournament data we can actually get from API-Sports
 */

const footballApi = require('../api/footballApi');

async function investigateDataSources() {
    console.log('🔬 INVESTIGATING GLOBAL DATA SOURCES\n');
    
    const api = footballApi;
    
    // Test different tournaments to see data availability
    const testTournaments = [
        { id: 1, name: 'World Cup', season: 2022, priority: 'global' },
        { id: 4, name: 'Euro Championship', season: 2024, priority: 'global' },
        { id: 9, name: 'Copa America', season: 2024, priority: 'global' },
        { id: 385, name: 'Toto Cup Ligat Al', season: 2024, priority: 'domestic' },
        { id: 533, name: 'CAF Super Cup', season: 2024, priority: 'continental' },
        { id: 659, name: 'Israeli Super Cup', season: 2024, priority: 'domestic' }
    ];

    const results = {
        successful: [],
        failed: [],
        methods: {
            cupWinner: 0,
            finalFixture: 0,
            standings: 0,
            recentFixtures: 0
        }
    };

    for (const tournament of testTournaments) {
        console.log(`\n🏆 Testing: ${tournament.name} (${tournament.season})`);
        console.log(`   Priority: ${tournament.priority}`);
        
        const testResults = {
            tournamentId: tournament.id,
            name: tournament.name,
            methods: {}
        };

        // Test Method 1: getCupWinner
        try {
            console.log('   📡 Testing getCupWinner...');
            const cupWinner = await api.getCupWinner(tournament.id, tournament.season);
            testResults.methods.cupWinner = cupWinner ? 
                { success: true, winner: cupWinner.name } : 
                { success: false, reason: 'No winner found' };
            if (cupWinner) results.methods.cupWinner++;
        } catch (error) {
            testResults.methods.cupWinner = { success: false, reason: error.message };
        }

        // Test Method 2: Final fixtures
        try {
            console.log('   📡 Testing final fixtures...');
            const fixtures = await api.getFixturesByLeague(tournament.id, tournament.season, null, 5, 'FT');
            
            if (fixtures && fixtures.length > 0) {
                const finalMatch = fixtures.find(f => 
                    f.league?.round?.toLowerCase().includes('final') ||
                    f.league?.round?.toLowerCase().includes('finale')
                );
                
                if (finalMatch) {
                    const winner = finalMatch.teams.home.winner ? 
                        finalMatch.teams.home.name : 
                        finalMatch.teams.away.name;
                    testResults.methods.finalFixture = { success: true, winner };
                    results.methods.finalFixture++;
                } else {
                    testResults.methods.finalFixture = { success: false, reason: 'No final match found' };
                }
            } else {
                testResults.methods.finalFixture = { success: false, reason: 'No fixtures returned' };
            }
        } catch (error) {
            testResults.methods.finalFixture = { success: false, reason: error.message };
        }

        // Test Method 3: Standings
        try {
            console.log('   📡 Testing standings...');
            const standings = await api.getStandings(tournament.id, tournament.season);
            
            if (standings && standings.length > 0) {
                const winner = standings[0]?.[0]?.team?.name;
                testResults.methods.standings = winner ? 
                    { success: true, winner } : 
                    { success: false, reason: 'No clear winner in standings' };
                if (winner) results.methods.standings++;
            } else {
                testResults.methods.standings = { success: false, reason: 'No standings data' };
            }
        } catch (error) {
            testResults.methods.standings = { success: false, reason: error.message };
        }

        // Analyze results for this tournament
        const successfulMethods = Object.values(testResults.methods).filter(m => m.success);
        
        if (successfulMethods.length > 0) {
            results.successful.push(testResults);
            console.log(`   ✅ Success! ${successfulMethods.length} method(s) worked`);
        } else {
            results.failed.push(testResults);
            console.log(`   ❌ Failed - no methods returned data`);
        }
    }

    // Generate report
    console.log('\n\n📊 INVESTIGATION RESULTS');
    console.log('=' .repeat(50));
    
    console.log(`\n🎯 Success Rate: ${results.successful.length}/${testTournaments.length} tournaments`);
    console.log(`   Global tournaments: ${results.successful.filter(r => 
        testTournaments.find(t => t.id === r.tournamentId)?.priority === 'global'
    ).length}/3`);
    console.log(`   Domestic tournaments: ${results.successful.filter(r => 
        testTournaments.find(t => t.id === r.tournamentId)?.priority === 'domestic'
    ).length}/2`);
    
    console.log('\n🔧 Method Effectiveness:');
    console.log(`   getCupWinner: ${results.methods.cupWinner}/${testTournaments.length}`);
    console.log(`   Final fixtures: ${results.methods.finalFixture}/${testTournaments.length}`);
    console.log(`   Standings: ${results.methods.standings}/${testTournaments.length}`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (results.methods.cupWinner > results.methods.finalFixture) {
        console.log('   ✅ getCupWinner is the most reliable method');
    } else {
        console.log('   ✅ Final fixture analysis is most reliable');
    }
    
    if (results.successful.length >= testTournaments.length * 0.7) {
        console.log('   ✅ API-Sports can handle most tournaments automatically');
    } else {
        console.log('   ⚠️  Need additional data sources for comprehensive coverage');
    }
    
    console.log('\n📋 DETAILED RESULTS:');
    results.successful.forEach(r => {
        console.log(`\n   ✅ ${r.name}:`);
        Object.entries(r.methods).forEach(([method, result]) => {
            if (result.success) {
                console.log(`      ${method}: ${result.winner}`);
            }
        });
    });
    
    results.failed.forEach(r => {
        console.log(`\n   ❌ ${r.name}:`);
        Object.entries(r.methods).forEach(([method, result]) => {
            if (!result.success) {
                console.log(`      ${method}: ${result.reason}`);
            }
        });
    });

    return results;
}

// Run investigation
if (require.main === module) {
    investigateDataSources()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('💥 Investigation failed:', error);
            process.exit(1);
        });
}

module.exports = investigateDataSources;