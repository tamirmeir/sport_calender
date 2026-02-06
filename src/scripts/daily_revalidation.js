/**
 * Daily Revalidation Task
 * 
 * Automatically checks all finished tournaments that need revalidation
 * and updates their status/validation metadata.
 * 
 * Run this script daily via cron or PM2 cron:
 * - Cron: 0 3 * * * (3 AM daily)
 * - PM2: Add to ecosystem.config.js with cron_restart
 */

const smartCache = require('../utils/smartCache');
const footballApi = require('../api/footballApi');
const fs = require('fs');
const path = require('path');

async function runDailyRevalidation() {
    console.log('\n========================================');
    console.log('🔄 Starting Daily Revalidation');
    console.log('========================================');
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    try {
        // Get stats before
        const statsBefore = smartCache.getCacheStats();
        console.log('📊 Cache Stats (Before):');
        console.log(`  Total tournaments: ${statsBefore.total}`);
        console.log(`  Cached: ${statsBefore.cached}`);
        console.log(`  Need revalidation: ${statsBefore.needRevalidation}`);
        console.log(`  Cache hit rate: ${statsBefore.cacheHitRate}\n`);

        // Get tournaments that need revalidation
        const needingRevalidation = smartCache.getTournamentsNeedingRevalidation();
        
        if (needingRevalidation.length === 0) {
            console.log('✅ No tournaments need revalidation today!');
            console.log('========================================\n');
            return;
        }

        console.log(`🔍 Found ${needingRevalidation.length} tournaments needing revalidation:\n`);
        needingRevalidation.forEach((t, i) => {
            console.log(`  ${i + 1}. [${t.id}] ${t.name} (${t.country}) - Next check: ${t.nextCheck}`);
        });
        console.log('');

        // Batch revalidate
        const tournamentIds = needingRevalidation.map(t => t.id);
        console.log('🚀 Starting batch revalidation...\n');
        
        const results = await smartCache.batchRevalidate(tournamentIds, footballApi, 3);
        
        // Process results
        const needsUpdate = results.filter(r => r.needsUpdate);
        const errors = results.filter(r => r.newData?.lastError);
        
        console.log('\n📋 Revalidation Results:');
        console.log(`  ✅ Successfully validated: ${results.length - needsUpdate.length - errors.length}`);
        console.log(`  ⚠️  Needs status update: ${needsUpdate.length}`);
        console.log(`  ❌ Errors: ${errors.length}`);

        // Handle tournaments that need status changes
        if (needsUpdate.length > 0) {
            console.log('\n⚠️  Tournaments with status changes:');
            needsUpdate.forEach((result, i) => {
                const tournamentId = tournamentIds[results.indexOf(result)];
                const tournament = needingRevalidation.find(t => t.id === tournamentId);
                
                console.log(`  - [${tournamentId}] ${tournament.name}: ${result.newData.shouldRemoveFromFinished ? 'Should be REMOVED (has upcoming matches!)' : 'Needs update'}`);
            });
            
            console.log('\n💡 ACTION REQUIRED: Review these tournaments manually!');
            
            // Write report
            const reportPath = path.join(__dirname, '../../reports/revalidation_issues.json');
            fs.mkdirSync(path.dirname(reportPath), { recursive: true });
            fs.writeFileSync(reportPath, JSON.stringify({
                timestamp: new Date().toISOString(),
                issues: needsUpdate.map((result, i) => {
                    const tournamentId = tournamentIds[results.indexOf(result)];
                    const tournament = needingRevalidation.find(t => t.id === tournamentId);
                    return {
                        id: tournamentId,
                        name: tournament.name,
                        country: tournament.country,
                        issue: result.newData
                    };
                })
            }, null, 2), 'utf8');
            
            console.log(`\n📄 Issue report saved: ${reportPath}`);
        }

        // Get stats after
        const statsAfter = smartCache.getCacheStats();
        console.log('\n📊 Cache Stats (After):');
        console.log(`  Total tournaments: ${statsAfter.total}`);
        console.log(`  Cached: ${statsAfter.cached}`);
        console.log(`  Need revalidation: ${statsAfter.needRevalidation}`);
        console.log(`  Cache hit rate: ${statsAfter.cacheHitRate}`);
        console.log(`  API calls saved: ~${statsAfter.estimatedApiCallsSaved}/day`);

        console.log('\n✅ Daily revalidation complete!');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n❌ ERROR during daily revalidation:', error);
        console.error(error.stack);
        console.log('========================================\n');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runDailyRevalidation()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = runDailyRevalidation;
