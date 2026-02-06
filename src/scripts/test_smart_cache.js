/**
 * Test Smart Cache Functionality
 * 
 * This script tests the Smart Cache system by:
 * 1. Showing current cache stats
 * 2. Temporarily marking a tournament as needing revalidation
 * 3. Running revalidation
 * 4. Showing updated stats
 */

const smartCache = require('../utils/smartCache');
const footballApi = require('../api/footballApi');
const fs = require('fs');
const path = require('path');

async function testSmartCache() {
    console.log('\n========================================');
    console.log('🧪 Testing Smart Cache System');
    console.log('========================================\n');

    try {
        // Step 1: Show current stats
        console.log('📊 Step 1: Current Cache Stats\n');
        const stats = smartCache.getCacheStats();
        console.log(`Total tournaments: ${stats.total}`);
        console.log(`Cached: ${stats.cached}`);
        console.log(`Need revalidation: ${stats.needRevalidation}`);
        console.log(`Cache hit rate: ${stats.cacheHitRate}`);
        console.log(`API calls saved: ~${stats.estimatedApiCallsSaved}/day\n`);
        console.log('Confidence distribution:');
        Object.entries(stats.byConfidence).forEach(([conf, count]) => {
            console.log(`  ${conf}: ${count}`);
        });

        // Step 2: Temporarily change a tournament's nextCheck to force revalidation
        console.log('\n📝 Step 2: Simulating expired validation window\n');
        
        const finishedPath = path.join(__dirname, '../data/finished_tournaments.json');
        const data = JSON.parse(fs.readFileSync(finishedPath, 'utf8'));
        
        // Find Emperor Cup (tournament 102)
        const testTournamentId = '102';
        const originalData = JSON.parse(JSON.stringify(data.finished_tournaments[testTournamentId]));
        
        if (!data.finished_tournaments[testTournamentId]) {
            console.log('❌ Test tournament not found!');
            return;
        }

        console.log(`Test tournament: ${data.finished_tournaments[testTournamentId].name}`);
        console.log(`Original nextCheck: ${data.finished_tournaments[testTournamentId].validation.nextCheck}`);
        
        // Set nextCheck to yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        data.finished_tournaments[testTournamentId].validation.nextCheck = yesterday.toISOString().split('T')[0];
        
        // Save temporarily
        fs.writeFileSync(finishedPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`New nextCheck: ${data.finished_tournaments[testTournamentId].validation.nextCheck} (expired)\n`);

        // Step 3: Check if it needs revalidation
        console.log('🔍 Step 3: Checking if revalidation needed\n');
        const needsRevalidation = smartCache.needsRevalidation(testTournamentId);
        console.log(`Needs revalidation: ${needsRevalidation ? '✅ YES' : '❌ NO'}\n`);

        const tournamentsNeedingCheck = smartCache.getTournamentsNeedingRevalidation();
        console.log(`Total tournaments needing revalidation: ${tournamentsNeedingCheck.length}`);
        
        if (tournamentsNeedingCheck.length > 0) {
            console.log('\nTournaments needing revalidation:');
            tournamentsNeedingCheck.slice(0, 5).forEach(t => {
                console.log(`  - [${t.id}] ${t.name} (${t.country}) - Next check: ${t.nextCheck}`);
            });
        }

        // Step 4: Run revalidation
        console.log('\n\n🔄 Step 4: Running revalidation\n');
        const result = await smartCache.revalidateTournament(testTournamentId, footballApi);
        
        console.log('Revalidation result:');
        console.log(`  Needs update: ${result.needsUpdate ? '⚠️  YES' : '✅ NO'}`);
        if (result.newData) {
            console.log(`  New data:`, result.newData);
        }

        // Step 5: Show updated stats
        console.log('\n\n📊 Step 5: Updated Cache Stats\n');
        const statsAfter = smartCache.getCacheStats();
        console.log(`Total tournaments: ${statsAfter.total}`);
        console.log(`Cached: ${statsAfter.cached}`);
        console.log(`Need revalidation: ${statsAfter.needRevalidation}`);
        console.log(`Cache hit rate: ${statsAfter.cacheHitRate}`);

        // Verify the tournament was updated
        const updatedData = JSON.parse(fs.readFileSync(finishedPath, 'utf8'));
        const updatedTournament = updatedData.finished_tournaments[testTournamentId];
        
        console.log(`\n\nTest tournament validation metadata:`);
        console.log(`  Last checked: ${updatedTournament.validation.lastChecked}`);
        console.log(`  Next check: ${updatedTournament.validation.nextCheck}`);
        console.log(`  Confidence: ${updatedTournament.validation.confidence}`);
        console.log(`  Checks performed: ${updatedTournament.validation.checksPerformed}`);

        console.log('\n\n✅ Smart Cache test completed successfully!');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n❌ ERROR during Smart Cache test:', error);
        console.error(error.stack);
        console.log('========================================\n');
    }
}

// Run if called directly
if (require.main === module) {
    testSmartCache()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = testSmartCache;
