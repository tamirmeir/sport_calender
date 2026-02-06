#!/usr/bin/env node
/**
 * Quick Add Missing Tournament
 * 
 * Usage: node add_missing_tournament.js <tournament_id>
 * 
 * Reads from missing_winners_report.json and adds the tournament
 * to both finished_tournaments.json and world_tournaments_master.json
 */

const fs = require('fs');
const path = require('path');

const tournamentId = process.argv[2];

if (!tournamentId) {
    console.error('❌ Usage: node add_missing_tournament.js <tournament_id>');
    console.error('Example: node add_missing_tournament.js 1194');
    process.exit(1);
}

// Load report
const reportPath = path.join(__dirname, '../../missing_winners_report.json');
if (!fs.existsSync(reportPath)) {
    console.error('❌ No report found. Run detect_missing_winners.js first!');
    process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const tournament = report.missingTournaments.find(t => t.leagueId.toString() === tournamentId);

if (!tournament) {
    console.error(`❌ Tournament ${tournamentId} not found in missing tournaments report`);
    process.exit(1);
}

console.log('\n📋 Tournament to add:');
console.log(`   Name: ${tournament.leagueName}`);
console.log(`   Country: ${tournament.country}`);
console.log(`   Winner: ${tournament.winner.name}`);
console.log(`   ID: ${tournament.leagueId}`);
console.log('');

// Load existing data
const finishedPath = path.join(__dirname, '../data/finished_tournaments.json');
const masterPath = path.join(__dirname, '../data/world_tournaments_master.json');

let finishedData = JSON.parse(fs.readFileSync(finishedPath, 'utf8'));
let masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

// Add to finished_tournaments.json
finishedData.finished_tournaments[tournamentId] = {
    name: tournament.leagueName,
    country: tournament.country,
    year: 2025,
    status: 'finished',
    winner: {
        name: tournament.winner.name,
        logo: tournament.winner.logo,
        id: tournament.winner.id,
        detected_by: 'automated-detection-script',
        detected_at: new Date().toISOString(),
        confidence: 'high',
        note: `${tournament.teams}, ${tournament.score}, ${tournament.matchDate.split('T')[0]}`
    }
};

// Add to world_tournaments_master.json
const countryCode = getCountryCode(tournament.country);
const region = getRegion(tournament.country);

masterData.tournaments[tournamentId] = {
    name: tournament.leagueName,
    country: tournament.country,
    countryCode: countryCode,
    region: region,
    type: 'super_cup',
    tier: 'national',
    logo: `https://media.api-sports.io/football/leagues/${tournamentId}.png`,
    status: {
        current: 'finished',
        season: '2025',
        startDate: tournament.matchDate.split('T')[0],
        endDate: tournament.matchDate.split('T')[0],
        currentMatchday: 1,
        totalMatchdays: 1
    },
    schedule: {
        pattern: 'single_match',
        frequency: 'annual',
        month: new Date(tournament.matchDate).getMonth() + 1
    },
    winner: {
        hasWinner: true,
        season: '2025',
        team: tournament.winner.name,
        teamId: tournament.winner.id,
        teamLogo: tournament.winner.logo,
        confirmedDate: new Date().toISOString(),
        detectedBy: 'automated-detection-script',
        confidence: 'high'
    },
    api: {
        leagueId: tournament.leagueId,
        season: 2025,
        providedByApi: true,
        lastFetch: new Date().toISOString()
    },
    display: {
        showInCountryHub: true,
        priority: 8,
        cardType: 'golden',
        badges: ['super_cup', 'finished', tournament.country.toLowerCase()],
        description: tournament.leagueName
    }
};

// Save files
fs.writeFileSync(finishedPath, JSON.stringify(finishedData, null, 2));
fs.writeFileSync(masterPath, JSON.stringify(masterData, null, 2));

console.log('✅ Tournament added successfully!');
console.log('');
console.log('📁 Updated files:');
console.log(`   - ${finishedPath}`);
console.log(`   - ${masterPath}`);
console.log('');
console.log('🔄 Next steps:');
console.log('   1. Review the changes: git diff');
console.log('   2. Test: node src/scripts/comprehensive_test.js');
console.log('   3. Commit: git add . && git commit -m "feat: add ..."');
console.log('   4. Deploy: git push origin main');
console.log('');

function getCountryCode(country) {
    const codes = {
        'Tunisia': 'TN', 'Algeria': 'DZ', 'Morocco': 'MA', 'Egypt': 'EG',
        'South-Africa': 'ZA', 'Nigeria': 'NG', 'Ghana': 'GH', 'Kenya': 'KE',
        'Senegal': 'SN', 'Cameroon': 'CM', 'Ivory-Coast': 'CI',
        'Israel': 'IL', 'Saudi-Arabia': 'SA', 'UAE': 'AE', 'Qatar': 'QA',
        'England': 'GB', 'Spain': 'ES', 'Italy': 'IT', 'Germany': 'DE',
        'France': 'FR', 'Portugal': 'PT', 'Netherlands': 'NL', 'Belgium': 'BE',
        'Brazil': 'BR', 'Argentina': 'AR', 'Uruguay': 'UY', 'Chile': 'CL'
    };
    return codes[country] || 'XX';
}

function getRegion(country) {
    const africanCountries = ['Tunisia', 'Algeria', 'Morocco', 'Egypt', 'South-Africa', 
                              'Nigeria', 'Ghana', 'Kenya', 'Senegal', 'Cameroon', 'Ivory-Coast'];
    const europeanCountries = ['England', 'Spain', 'Italy', 'Germany', 'France', 'Portugal', 
                               'Netherlands', 'Belgium', 'Turkey', 'Greece'];
    const middleEastCountries = ['Israel', 'Saudi-Arabia', 'UAE', 'Qatar', 'Jordan', 'Iraq'];
    const southAmericanCountries = ['Brazil', 'Argentina', 'Uruguay', 'Chile', 'Colombia', 'Peru'];
    
    if (africanCountries.includes(country)) return 'africa';
    if (europeanCountries.includes(country)) return 'europe';
    if (middleEastCountries.includes(country)) return 'middle_east';
    if (southAmericanCountries.includes(country)) return 'south_america';
    return 'other';
}
