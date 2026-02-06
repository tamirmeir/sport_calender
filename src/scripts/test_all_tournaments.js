/**
 * Test All Tournaments Worldwide
 * Comprehensive manual test of all tournament data
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('🌍 TESTING ALL TOURNAMENTS WORLDWIDE');
console.log('='.repeat(70));
console.log(`Started: ${new Date().toISOString()}\n`);

// Load data files
const finishedPath = path.join(__dirname, '../..', 'src/data/finished_tournaments.json');
const masterPath = path.join(__dirname, '../..', 'src/data/world_tournaments_master.json');
const mappingsPath = path.join(__dirname, '../..', 'src/data/country_mappings.json');

let finishedData, masterData, mappingsData;

try {
    finishedData = JSON.parse(fs.readFileSync(finishedPath, 'utf8'));
    masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    mappingsData = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    console.log('✅ All data files loaded successfully\n');
} catch (error) {
    console.error('❌ Failed to load data files:', error.message);
    process.exit(1);
}

// Statistics
const stats = {
    total: 0,
    finished: 0,
    active: 0,
    vacation: 0,
    withWinner: 0,
    withoutWinner: 0,
    errors: []
};

// Test finished tournaments
console.log('📋 FINISHED TOURNAMENTS (finished_tournaments.json)');
console.log('-'.repeat(70));

const finished = finishedData.finished_tournaments || {};
Object.entries(finished).forEach(([id, tournament]) => {
    stats.total++;
    
    const hasStatus = tournament.status === 'finished';
    const hasWinner = tournament.winner && tournament.winner.name;
    const hasLogo = tournament.winner && tournament.winner.logo;
    
    if (hasStatus && hasWinner) {
        stats.finished++;
        stats.withWinner++;
        console.log(`✅ ${id}: ${tournament.name}`);
        console.log(`   Winner: ${tournament.winner.name}`);
        console.log(`   Country: ${tournament.country || 'Unknown'}`);
        console.log(`   Year: ${tournament.year || 'Unknown'}`);
        console.log(`   Logo: ${hasLogo ? '✅' : '❌'}`);
    } else {
        stats.errors.push({
            id,
            name: tournament.name,
            issue: !hasStatus ? 'Missing status' : 'Missing winner'
        });
        console.log(`❌ ${id}: ${tournament.name}`);
        console.log(`   Status: ${hasStatus ? '✅' : '❌'}`);
        console.log(`   Winner: ${hasWinner ? '✅' : '❌'}`);
    }
    console.log('');
});

// Test master tournaments
console.log('\n📊 MASTER TOURNAMENT DATABASE (world_tournaments_master.json)');
console.log('-'.repeat(70));

const masterTournaments = masterData.tournaments || {};
Object.entries(masterTournaments).forEach(([id, tournament]) => {
    const status = tournament.status?.current || 'unknown';
    const hasWinner = tournament.winner?.hasWinner || false;
    const winnerName = tournament.winner?.team || 'Unknown';
    
    const statusEmoji = status === 'finished' ? '🏆' : 
                       status === 'active' ? '⚽' : 
                       status === 'vacation' ? '🏖️' : '❓';
    
    console.log(`${statusEmoji} ${id}: ${tournament.name}`);
    console.log(`   Status: ${status}`);
    console.log(`   Country: ${tournament.country}`);
    console.log(`   Region: ${tournament.region}`);
    console.log(`   Has Winner: ${hasWinner ? `✅ ${winnerName}` : '❌'}`);
    
    if (status === 'finished' && !hasWinner) {
        stats.errors.push({
            id,
            name: tournament.name,
            issue: 'Marked finished but no winner'
        });
        console.log(`   ⚠️  WARNING: Marked as finished but no winner!`);
    }
    
    console.log('');
});

// Country mappings test
console.log('\n🌍 COUNTRY MAPPINGS TEST');
console.log('-'.repeat(70));

const superCups = mappingsData.leagueCountryMapping?.super_cups || {};
const corrections = mappingsData.countryOverrides?.api_corrections || {};

console.log(`Super Cups mapped: ${Object.keys(superCups).length}`);
Object.entries(superCups).forEach(([id, country]) => {
    console.log(`  ${id} → ${country}`);
});

console.log(`\nAPI Corrections: ${Object.keys(corrections).length}`);
Object.entries(corrections).forEach(([id, correction]) => {
    console.log(`  ${id}: ${correction.tournament}`);
    console.log(`     Wrong: ${correction.api_returns} → Correct: ${correction.correct_country}`);
});

// Cross-reference check
console.log('\n\n🔍 CROSS-REFERENCE CHECK');
console.log('-'.repeat(70));

const finishedIds = new Set(Object.keys(finished));
const masterIds = new Set(Object.keys(masterTournaments));

// Finished tournaments not in master
const notInMaster = [...finishedIds].filter(id => !masterIds.has(id));
if (notInMaster.length > 0) {
    console.log('⚠️  Tournaments in finished_tournaments.json but NOT in master:');
    notInMaster.forEach(id => {
        console.log(`   - ${id}: ${finished[id].name}`);
    });
} else {
    console.log('✅ All finished tournaments are in master database');
}

// Master finished tournaments not in finished list
const finishedInMaster = Object.entries(masterTournaments)
    .filter(([id, t]) => t.status?.current === 'finished' && t.winner?.hasWinner)
    .map(([id]) => id);

const notInFinished = finishedInMaster.filter(id => !finishedIds.has(id));
if (notInFinished.length > 0) {
    console.log('\n⚠️  Tournaments marked finished in master but NOT in finished_tournaments.json:');
    notInFinished.forEach(id => {
        console.log(`   - ${id}: ${masterTournaments[id].name}`);
        stats.errors.push({
            id,
            name: masterTournaments[id].name,
            issue: 'In master as finished but not in finished_tournaments.json'
        });
    });
} else {
    console.log('✅ All finished tournaments in master are in finished list');
}

// Regional breakdown
console.log('\n\n🌎 REGIONAL BREAKDOWN');
console.log('-'.repeat(70));

const byRegion = {};
Object.values(masterTournaments).forEach(t => {
    const region = t.region || 'unknown';
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(t);
});

Object.entries(byRegion).forEach(([region, tournaments]) => {
    console.log(`\n${region.toUpperCase()}: ${tournaments.length} tournaments`);
    tournaments.forEach(t => {
        const statusEmoji = t.status?.current === 'finished' ? '🏆' : 
                           t.status?.current === 'active' ? '⚽' : '🏖️';
        console.log(`  ${statusEmoji} ${t.name} (${t.country})`);
    });
});

// Final statistics
console.log('\n\n📊 FINAL STATISTICS');
console.log('='.repeat(70));
console.log(`Total finished tournaments: ${Object.keys(finished).length}`);
console.log(`Total master tournaments: ${Object.keys(masterTournaments).length}`);
console.log(`With winners: ${stats.withWinner}`);
console.log(`Tournaments by region:`);
Object.entries(byRegion).forEach(([region, tournaments]) => {
    console.log(`  - ${region}: ${tournaments.length}`);
});

// Errors summary
if (stats.errors.length > 0) {
    console.log('\n\n⚠️  ISSUES FOUND');
    console.log('='.repeat(70));
    stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.name} (ID: ${error.id})`);
        console.log(`   Issue: ${error.issue}\n`);
    });
    console.log(`\nTotal issues: ${stats.errors.length}`);
} else {
    console.log('\n✅ NO ISSUES FOUND - All data is consistent!');
}

// Recommendations
console.log('\n\n💡 RECOMMENDATIONS');
console.log('='.repeat(70));
if (notInFinished.length > 0) {
    console.log('1. Add these finished tournaments to finished_tournaments.json:');
    notInFinished.forEach(id => {
        const t = masterTournaments[id];
        console.log(`   - ${id}: ${t.name} (Winner: ${t.winner?.team || 'Unknown'})`);
    });
}
if (stats.errors.some(e => e.issue === 'Missing status')) {
    console.log('2. Add "status": "finished" to tournaments missing it');
}
if (stats.errors.some(e => e.issue === 'Missing winner')) {
    console.log('3. Add winner information to tournaments missing it');
}

console.log('\n' + '='.repeat(70));
console.log(`Completed: ${new Date().toISOString()}`);
console.log('='.repeat(70));

process.exit(stats.errors.length > 0 ? 1 : 0);
