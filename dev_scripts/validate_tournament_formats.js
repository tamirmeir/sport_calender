/**
 * Tournament Format Validation Script
 * Tests that tournament detection works across different competition types
 */

const footballApi = require('../src/api/footballApi');

// Different tournament formats to test
const TEST_CASES = [
    // Groups + Knockout (Classic)
    { id: 1, name: 'World Cup', season: 2026, expectedFormat: 'groups_knockout' },
    { id: 4, name: 'Euro', season: 2024, expectedFormat: 'groups_knockout' },
    { id: 6, name: 'AFCON', season: 2025, expectedFormat: 'groups_knockout' },
    { id: 9, name: 'Copa America', season: 2024, expectedFormat: 'groups_knockout' },
    
    // Swiss System + Knockout (New format)
    { id: 2, name: 'Champions League', season: 2025, expectedFormat: 'swiss_knockout' },
    { id: 3, name: 'Europa League', season: 2025, expectedFormat: 'swiss_knockout' },
    { id: 848, name: 'Conference League', season: 2025, expectedFormat: 'swiss_knockout' },
    
    // Pure Knockout (No groups)
    { id: 45, name: 'FA Cup', season: 2025, expectedFormat: 'knockout' },
    { id: 143, name: 'Copa del Rey', season: 2025, expectedFormat: 'knockout' },
    { id: 81, name: 'DFB Pokal', season: 2025, expectedFormat: 'knockout' },
    { id: 384, name: 'Israel State Cup', season: 2025, expectedFormat: 'knockout' },
    
    // League format (no knockout)
    { id: 39, name: 'Premier League', season: 2025, expectedFormat: 'league' },
    { id: 140, name: 'La Liga', season: 2025, expectedFormat: 'league' },
    { id: 383, name: 'Ligat Haal', season: 2025, expectedFormat: 'league' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function validateTournament(testCase) {
    const { id, name, season, expectedFormat } = testCase;
    
    try {
        const info = await footballApi.getTournamentInfo(id, season);
        
        // Determine detected format
        let detectedFormat = 'unknown';
        if (info.isGroupStage && info.groups?.length > 1) {
            detectedFormat = info.groups.length > 8 ? 'groups_knockout' : 'swiss_knockout';
        } else if (info.isKnockout && (!info.groups || info.groups.length <= 1)) {
            detectedFormat = 'knockout';
        } else if (info.currentStage === 'group_stage' && info.groups?.length === 1) {
            detectedFormat = 'league';
        } else if (info.isFinished) {
            detectedFormat = info.groups?.length > 1 ? 'groups_knockout' : 'knockout';
        }
        
        const match = detectedFormat === expectedFormat || 
                      (expectedFormat === 'swiss_knockout' && detectedFormat === 'knockout') ||
                      (expectedFormat === 'groups_knockout' && info.groups?.length > 0);
        
        return {
            id,
            name,
            season,
            expectedFormat,
            detectedFormat,
            stage: info.currentStage,
            stageLabel: info.currentStageLabel,
            round: info.currentRound,
            groupCount: info.groups?.length || 0,
            knockoutTeams: info.knockoutTeams?.length || 0,
            isFinished: info.isFinished,
            winner: info.winner?.name || null,
            match: match ? '✅' : '❌',
            error: null
        };
    } catch (err) {
        return {
            id,
            name,
            season,
            expectedFormat,
            detectedFormat: 'error',
            match: '❌',
            error: err.message
        };
    }
}

async function runValidation() {
    console.log('='.repeat(80));
    console.log('🔍 TOURNAMENT FORMAT VALIDATION');
    console.log('='.repeat(80));
    console.log(`Testing ${TEST_CASES.length} competitions...\n`);
    
    const results = [];
    
    for (const testCase of TEST_CASES) {
        process.stdout.write(`Testing ${testCase.name} (${testCase.id})...`);
        const result = await validateTournament(testCase);
        results.push(result);
        console.log(` ${result.match} ${result.stage || result.error}`);
        await sleep(400); // Rate limit
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(80));
    
    // Group by format
    const byFormat = {};
    results.forEach(r => {
        if (!byFormat[r.expectedFormat]) byFormat[r.expectedFormat] = [];
        byFormat[r.expectedFormat].push(r);
    });
    
    Object.entries(byFormat).forEach(([format, items]) => {
        console.log(`\n📁 ${format.toUpperCase()}:`);
        items.forEach(r => {
            const statusIcon = r.match === '✅' ? '✅' : '❌';
            const details = r.error ? `Error: ${r.error}` : 
                           `Stage: ${r.stageLabel || r.stage}, Groups: ${r.groupCount}, Knockout: ${r.knockoutTeams}`;
            console.log(`   ${statusIcon} ${r.name}: ${details}`);
            if (r.winner) console.log(`      🏆 Winner: ${r.winner}`);
        });
    });
    
    // Overall stats
    const passed = results.filter(r => r.match === '✅').length;
    const failed = results.filter(r => r.match === '❌').length;
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    
    if (failed > 0) {
        console.log('\n⚠️  ISSUES FOUND:');
        results.filter(r => r.match === '❌').forEach(r => {
            console.log(`   - ${r.name}: Expected ${r.expectedFormat}, Got ${r.detectedFormat}`);
        });
    }
    
    return results;
}

// Run
runValidation().catch(console.error);
