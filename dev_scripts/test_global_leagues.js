/**
 * Test League Status for competitions worldwide
 * Tests the new getLeagueStatus function across all continents
 */

const api = require('../src/api/footballApi');

const competitions = [
    // === Major International Tournaments ===
    { id: 1, name: 'World Cup' },
    { id: 4, name: 'Euro' },
    { id: 9, name: 'Copa America' },
    { id: 6, name: 'Africa Cup of Nations' },
    { id: 7, name: 'Asian Cup' },
    { id: 5, name: 'UEFA Nations League' },
    
    // === Club Continental ===
    { id: 2, name: 'UEFA Champions League' },
    { id: 3, name: 'UEFA Europa League' },
    { id: 848, name: 'UEFA Conference League' },
    { id: 13, name: 'Copa Libertadores' },
    { id: 11, name: 'Copa Sudamericana' },
    
    // === England ===
    { id: 39, name: 'Premier League' },
    { id: 45, name: 'FA Cup' },
    { id: 48, name: 'EFL Cup' },
    
    // === Spain ===
    { id: 140, name: 'La Liga' },
    { id: 143, name: 'Copa del Rey' },
    
    // === Germany ===
    { id: 78, name: 'Bundesliga' },
    { id: 81, name: 'DFB Pokal' },
    
    // === Italy ===
    { id: 135, name: 'Serie A' },
    { id: 137, name: 'Coppa Italia' },
    
    // === France ===
    { id: 61, name: 'Ligue 1' },
    { id: 66, name: 'Coupe de France' },
    
    // === Netherlands ===
    { id: 88, name: 'Eredivisie' },
    { id: 90, name: 'KNVB Beker' },
    
    // === Portugal ===
    { id: 94, name: 'Primeira Liga' },
    { id: 96, name: 'Taca de Portugal' },
    
    // === Israel ===
    { id: 383, name: 'Ligat HaAl' },
    { id: 384, name: 'State Cup' },
    { id: 385, name: 'Toto Cup' },
    
    // === Brazil ===
    { id: 71, name: 'Serie A Brazil' },
    { id: 73, name: 'Copa do Brasil' },
    
    // === Argentina ===
    { id: 128, name: 'Liga Profesional' },
    { id: 130, name: 'Copa Argentina' },
    
    // === Turkey ===
    { id: 203, name: 'Super Lig' },
    { id: 206, name: 'Turkish Cup' },
    
    // === Scotland ===
    { id: 179, name: 'Premiership' },
    { id: 181, name: 'Scottish Cup' },
];

async function testAllLeagues() {
    console.log('🌍 Global League Status Test');
    console.log('='.repeat(70));
    console.log(`Testing ${competitions.length} competitions...\n`);
    
    const results = {
        finished: [],
        active: [],
        notStarted: [],
        errors: []
    };
    
    for (const comp of competitions) {
        try {
            const status = await api.getLeagueStatus(comp.id);
            if (status) {
                const entry = {
                    name: status.name,
                    country: status.country,
                    type: status.isLeague ? 'League' : (status.isTournament ? 'Tournament' : 'Cup'),
                    status: status.statusLabel,
                    season: status.season,
                    frequency: status.frequencyLabel,
                    winner: status.winner ? status.winner.name : null,
                    winnerLogo: status.winner ? status.winner.logo : null,
                    currentRound: status.currentRoundLabel
                };
                
                if (status.isFinished) {
                    results.finished.push(entry);
                } else if (status.isActive) {
                    results.active.push(entry);
                } else {
                    results.notStarted.push(entry);
                }
            }
        } catch (e) {
            results.errors.push({ name: comp.name, error: e.message });
        }
    }
    
    // Print Results
    console.log('\n✅ FINISHED COMPETITIONS (with winners):');
    console.log('-'.repeat(70));
    results.finished.forEach(r => {
        console.log(`🏆 ${r.name} (${r.country})`);
        console.log(`   Winner: ${r.winner || 'Unknown'}`);
        console.log(`   Season: ${r.season} | Type: ${r.type}`);
    });
    
    console.log('\n⚽ ACTIVE COMPETITIONS:');
    console.log('-'.repeat(70));
    results.active.forEach(r => {
        console.log(`🔴 ${r.name} (${r.country})`);
        console.log(`   Status: ${r.status}`);
        console.log(`   Current Round: ${r.currentRound || 'N/A'}`);
        console.log(`   Season: ${r.season}`);
    });
    
    console.log('\n⏳ NOT STARTED:');
    console.log('-'.repeat(70));
    results.notStarted.forEach(r => {
        console.log(`⏸️  ${r.name} (${r.country}) - ${r.frequency}`);
    });
    
    if (results.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        console.log('-'.repeat(70));
        results.errors.forEach(r => {
            console.log(`   ${r.name}: ${r.error}`);
        });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`Summary: ${results.finished.length} finished, ${results.active.length} active, ${results.notStarted.length} not started, ${results.errors.length} errors`);
}

testAllLeagues().catch(console.error);
