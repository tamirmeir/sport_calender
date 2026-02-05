/**
 * Global Tournament Format Test
 * Tests tournament info across all major competitions worldwide
 */

const footballApi = require('../src/api/footballApi');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// All competitions to test
const ALL_COMPETITIONS = [
    // === INTERNATIONAL TOURNAMENTS ===
    { id: 1, name: 'World Cup', season: 2026, category: 'International' },
    { id: 4, name: 'Euro', season: 2024, category: 'International' },
    { id: 9, name: 'Copa America', season: 2024, category: 'International' },
    { id: 6, name: 'AFCON', season: 2025, category: 'International' },
    { id: 7, name: 'Asian Cup', season: 2023, category: 'International' },
    { id: 22, name: 'Gold Cup', season: 2023, category: 'International' },
    { id: 5, name: 'Nations League', season: 2024, category: 'International' },
    
    // === UEFA CLUB ===
    { id: 2, name: 'Champions League', season: 2025, category: 'UEFA Club' },
    { id: 3, name: 'Europa League', season: 2025, category: 'UEFA Club' },
    { id: 848, name: 'Conference League', season: 2025, category: 'UEFA Club' },
    
    // === SOUTH AMERICA ===
    { id: 13, name: 'Libertadores', season: 2025, category: 'CONMEBOL' },
    { id: 11, name: 'Sudamericana', season: 2025, category: 'CONMEBOL' },
    
    // === ENGLAND ===
    { id: 39, name: 'Premier League', season: 2025, category: 'England' },
    { id: 45, name: 'FA Cup', season: 2025, category: 'England' },
    { id: 48, name: 'EFL Cup', season: 2025, category: 'England' },
    
    // === SPAIN ===
    { id: 140, name: 'La Liga', season: 2025, category: 'Spain' },
    { id: 143, name: 'Copa del Rey', season: 2025, category: 'Spain' },
    
    // === GERMANY ===
    { id: 78, name: 'Bundesliga', season: 2025, category: 'Germany' },
    { id: 81, name: 'DFB Pokal', season: 2025, category: 'Germany' },
    
    // === ITALY ===
    { id: 135, name: 'Serie A', season: 2025, category: 'Italy' },
    { id: 137, name: 'Coppa Italia', season: 2025, category: 'Italy' },
    
    // === FRANCE ===
    { id: 61, name: 'Ligue 1', season: 2025, category: 'France' },
    { id: 66, name: 'Coupe de France', season: 2025, category: 'France' },
    
    // === NETHERLANDS ===
    { id: 88, name: 'Eredivisie', season: 2025, category: 'Netherlands' },
    { id: 90, name: 'KNVB Beker', season: 2025, category: 'Netherlands' },
    
    // === PORTUGAL ===
    { id: 94, name: 'Primeira Liga', season: 2025, category: 'Portugal' },
    { id: 96, name: 'Taça de Portugal', season: 2025, category: 'Portugal' },
    
    // === SCOTLAND (has split playoffs) ===
    { id: 179, name: 'Premiership', season: 2025, category: 'Scotland' },
    { id: 181, name: 'Scottish Cup', season: 2025, category: 'Scotland' },
    
    // === TURKEY ===
    { id: 203, name: 'Süper Lig', season: 2025, category: 'Turkey' },
    { id: 206, name: 'Turkish Cup', season: 2025, category: 'Turkey' },
    
    // === ISRAEL (has split playoffs) ===
    { id: 383, name: 'Ligat Ha\'al', season: 2025, category: 'Israel' },
    { id: 384, name: 'State Cup', season: 2025, category: 'Israel' },
    { id: 385, name: 'Toto Cup', season: 2025, category: 'Israel' },
    
    // === BELGIUM (has split playoffs) ===
    { id: 144, name: 'Pro League', season: 2025, category: 'Belgium' },
    
    // === BRAZIL ===
    { id: 71, name: 'Série A', season: 2025, category: 'Brazil' },
    { id: 73, name: 'Copa do Brasil', season: 2025, category: 'Brazil' },
    
    // === ARGENTINA ===
    { id: 128, name: 'Liga Profesional', season: 2025, category: 'Argentina' },
    { id: 130, name: 'Copa Argentina', season: 2025, category: 'Argentina' },
];

async function testCompetition(comp) {
    try {
        const info = await footballApi.getTournamentInfo(comp.id, comp.season);
        
        if (!info) {
            return { ...comp, status: '❌', error: 'No data', details: null };
        }
        
        // Determine format type
        let format = 'unknown';
        const groupNames = info.groups?.map(g => g.name) || [];
        
        if (groupNames.some(n => n?.includes('Championship') || n?.includes('Relegation'))) {
            format = 'league_with_playoffs';
        } else if (info.groups?.length > 4) {
            format = 'groups_knockout';
        } else if (info.groups?.length > 1 && info.groups?.length <= 4) {
            format = 'swiss_or_split';
        } else if (info.isKnockout && info.groups?.length <= 1) {
            format = 'knockout';
        } else if (info.groups?.length === 1) {
            format = 'league';
        }
        
        return {
            ...comp,
            status: '✅',
            stage: info.currentStage,
            stageLabel: info.currentStageLabel,
            round: info.currentRoundLabel || info.currentRound,
            groupCount: info.groups?.length || 0,
            groupNames: groupNames.slice(0, 3),
            knockoutTeams: info.knockoutTeams?.length || 0,
            isFinished: info.isFinished,
            winner: info.winner?.name || null,
            format,
            error: null
        };
    } catch (err) {
        return { ...comp, status: '❌', error: err.message, details: null };
    }
}

async function runGlobalTest() {
    console.log('='.repeat(100));
    console.log('🌍 GLOBAL TOURNAMENT FORMAT TEST');
    console.log('='.repeat(100));
    console.log(`Testing ${ALL_COMPETITIONS.length} competitions...\n`);
    
    const results = [];
    const byCategory = {};
    
    for (const comp of ALL_COMPETITIONS) {
        process.stdout.write(`  ${comp.category.padEnd(15)} | ${comp.name.padEnd(20)}...`);
        const result = await testCompetition(comp);
        results.push(result);
        
        if (!byCategory[comp.category]) byCategory[comp.category] = [];
        byCategory[comp.category].push(result);
        
        const status = result.status === '✅' ? 
            `${result.stageLabel} | Groups: ${result.groupCount} | Format: ${result.format}` :
            `Error: ${result.error}`;
        console.log(` ${result.status} ${status}`);
        
        await sleep(350);
    }
    
    // Summary by category
    console.log('\n' + '='.repeat(100));
    console.log('📊 RESULTS BY CATEGORY');
    console.log('='.repeat(100));
    
    Object.entries(byCategory).forEach(([category, items]) => {
        console.log(`\n📁 ${category.toUpperCase()}:`);
        items.forEach(r => {
            if (r.status === '✅') {
                let info = `${r.stageLabel}`;
                if (r.groupCount > 1) info += ` | ${r.groupCount} groups`;
                if (r.format === 'league_with_playoffs') info += ' | 🔀 Split Playoffs';
                if (r.winner) info += ` | 🏆 ${r.winner}`;
                if (r.groupNames?.length > 1) {
                    info += `\n      Groups: ${r.groupNames.join(', ')}`;
                }
                console.log(`   ✅ ${r.name}: ${info}`);
            } else {
                console.log(`   ❌ ${r.name}: ${r.error}`);
            }
        });
    });
    
    // Format detection summary
    console.log('\n' + '='.repeat(100));
    console.log('📋 FORMAT DETECTION SUMMARY');
    console.log('='.repeat(100));
    
    const formats = {};
    results.forEach(r => {
        if (r.format) {
            if (!formats[r.format]) formats[r.format] = [];
            formats[r.format].push(r.name);
        }
    });
    
    Object.entries(formats).forEach(([format, comps]) => {
        console.log(`\n${format}:`);
        console.log(`   ${comps.join(', ')}`);
    });
    
    // Overall stats
    const passed = results.filter(r => r.status === '✅').length;
    const failed = results.filter(r => r.status === '❌').length;
    const withPlayoffs = results.filter(r => r.format === 'league_with_playoffs').length;
    
    console.log('\n' + '='.repeat(100));
    console.log('📈 OVERALL STATS');
    console.log('='.repeat(100));
    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    console.log(`🔀 Leagues with Playoffs: ${withPlayoffs}`);
    
    if (failed > 0) {
        console.log('\n⚠️  FAILED COMPETITIONS:');
        results.filter(r => r.status === '❌').forEach(r => {
            console.log(`   - ${r.name}: ${r.error}`);
        });
    }
    
    return results;
}

// Run
runGlobalTest().catch(console.error);
