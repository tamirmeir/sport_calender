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
        // Europe
        'England': 'GB', 'Spain': 'ES', 'Italy': 'IT', 'Germany': 'DE', 'France': 'FR',
        'Portugal': 'PT', 'Netherlands': 'NL', 'Belgium': 'BE', 'Switzerland': 'CH',
        'Austria': 'AT', 'Scotland': 'GB', 'Wales': 'GB', 'Northern-Ireland': 'GB',
        'Republic-of-Ireland': 'IE', 'Denmark': 'DK', 'Sweden': 'SE', 'Norway': 'NO',
        'Finland': 'FI', 'Iceland': 'IS', 'Poland': 'PL', 'Czech-Republic': 'CZ',
        'Slovakia': 'SK', 'Hungary': 'HU', 'Romania': 'RO', 'Bulgaria': 'BG',
        'Greece': 'GR', 'Turkey': 'TR', 'Russia': 'RU', 'Ukraine': 'UA',
        'Croatia': 'HR', 'Serbia': 'RS', 'Slovenia': 'SI', 'Bosnia-and-Herzegovina': 'BA',
        'Albania': 'AL', 'Macedonia': 'MK', 'Montenegro': 'ME', 'Kosovo': 'XK',
        'Cyprus': 'CY', 'Estonia': 'EE', 'Latvia': 'LV', 'Lithuania': 'LT',
        'Georgia': 'GE', 'Armenia': 'AM', 'Azerbaijan': 'AZ', 'Belarus': 'BY',
        'Moldova': 'MD', 'Luxembourg': 'LU', 'Malta': 'MT', 'Liechtenstein': 'LI',
        
        // Africa
        'Morocco': 'MA', 'Algeria': 'DZ', 'Tunisia': 'TN', 'Libya': 'LY', 'Egypt': 'EG',
        'Nigeria': 'NG', 'Ghana': 'GH', 'Ivory-Coast': 'CI', 'Senegal': 'SN',
        'Cameroon': 'CM', 'South-Africa': 'ZA', 'Kenya': 'KE', 'Ethiopia': 'ET',
        'Mali': 'ML', 'Burkina-Faso': 'BF', 'Guinea': 'GN', 'Tanzania': 'TZ',
        'Uganda': 'UG', 'Angola': 'AO', 'Mozambique': 'MZ', 'Zimbabwe': 'ZW',
        'Zambia': 'ZM', 'DR-Congo': 'CD', 'Congo': 'CG', 'Gabon': 'GA',
        'Benin': 'BJ', 'Togo': 'TG', 'Rwanda': 'RW', 'Sudan': 'SD',
        'Namibia': 'NA', 'Botswana': 'BW', 'Madagascar': 'MG',
        
        // Middle East
        'Israel': 'IL', 'Saudi-Arabia': 'SA', 'UAE': 'AE', 'Qatar': 'QA',
        'Kuwait': 'KW', 'Bahrain': 'BH', 'Oman': 'OM', 'Jordan': 'JO',
        'Lebanon': 'LB', 'Syria': 'SY', 'Iraq': 'IQ', 'Palestine': 'PS',
        'Yemen': 'YE', 'Iran': 'IR',
        
        // Asia
        'Japan': 'JP', 'South-Korea': 'KR', 'China': 'CN', 'Australia': 'AU',
        'India': 'IN', 'Thailand': 'TH', 'Vietnam': 'VN', 'Malaysia': 'MY',
        'Singapore': 'SG', 'Indonesia': 'ID', 'Philippines': 'PH',
        'Hong-Kong': 'HK', 'Pakistan': 'PK', 'Bangladesh': 'BD',
        'Kazakhstan': 'KZ', 'Uzbekistan': 'UZ',
        
        // Americas
        'Brazil': 'BR', 'Argentina': 'AR', 'Uruguay': 'UY', 'Chile': 'CL',
        'Colombia': 'CO', 'Peru': 'PE', 'Ecuador': 'EC', 'Venezuela': 'VE',
        'Paraguay': 'PY', 'Bolivia': 'BO', 'USA': 'US', 'Mexico': 'MX',
        'Canada': 'CA', 'Costa-Rica': 'CR', 'Panama': 'PA', 'Honduras': 'HN',
        'Jamaica': 'JM', 'Trinidad-and-Tobago': 'TT',
        
        // Oceania
        'New-Zealand': 'NZ', 'Fiji': 'FJ'
    };
    return codes[country] || 'XX';
}

function getRegion(country) {
    // Europe
    const europeanCountries = [
        'England', 'Spain', 'Italy', 'Germany', 'France', 'Portugal', 'Netherlands', 'Belgium',
        'Switzerland', 'Austria', 'Scotland', 'Wales', 'Northern-Ireland', 'Republic-of-Ireland',
        'Denmark', 'Sweden', 'Norway', 'Finland', 'Iceland', 'Poland', 'Czech-Republic',
        'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Turkey', 'Russia', 'Ukraine',
        'Croatia', 'Serbia', 'Slovenia', 'Bosnia-and-Herzegovina', 'Albania', 'Macedonia',
        'Montenegro', 'Kosovo', 'Cyprus', 'Estonia', 'Latvia', 'Lithuania', 'Georgia',
        'Armenia', 'Azerbaijan', 'Belarus', 'Moldova', 'Luxembourg', 'Malta', 'Liechtenstein'
    ];
    
    // Africa
    const africanCountries = [
        'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Egypt', 'Nigeria', 'Ghana', 'Ivory-Coast',
        'Senegal', 'Cameroon', 'South-Africa', 'Kenya', 'Ethiopia', 'Mali', 'Burkina-Faso',
        'Guinea', 'Tanzania', 'Uganda', 'Angola', 'Mozambique', 'Zimbabwe', 'Zambia',
        'DR-Congo', 'Congo', 'Gabon', 'Benin', 'Togo', 'Rwanda', 'Sudan', 'Namibia',
        'Botswana', 'Madagascar', 'Malawi', 'Central-African-Republic', 'Chad',
        'Equatorial-Guinea', 'Eritrea', 'Somalia', 'Djibouti', 'Comoros', 'Mauritius',
        'Seychelles', 'Cape-Verde', 'Sao-Tome-And-Principe', 'South-Sudan'
    ];
    
    // Middle East
    const middleEastCountries = [
        'Israel', 'Saudi-Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
        'Jordan', 'Lebanon', 'Syria', 'Iraq', 'Palestine', 'Yemen', 'Iran'
    ];
    
    // Asia
    const asianCountries = [
        'Japan', 'South-Korea', 'China', 'India', 'Thailand', 'Vietnam', 'Malaysia',
        'Singapore', 'Indonesia', 'Philippines', 'Hong-Kong', 'Pakistan', 'Bangladesh',
        'Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan',
        'North-Korea', 'Taiwan', 'Mongolia', 'Myanmar', 'Cambodia', 'Laos',
        'Sri-Lanka', 'Nepal', 'Afghanistan'
    ];
    
    // South America
    const southAmericanCountries = [
        'Brazil', 'Argentina', 'Uruguay', 'Chile', 'Colombia', 'Peru',
        'Ecuador', 'Venezuela', 'Paraguay', 'Bolivia', 'Guyana', 'Suriname'
    ];
    
    // North America (including Central America & Caribbean)
    const northAmericanCountries = [
        'USA', 'Mexico', 'Canada', 'Costa-Rica', 'Panama', 'Honduras',
        'Nicaragua', 'El-Salvador', 'Guatemala', 'Belize', 'Jamaica',
        'Trinidad-and-Tobago', 'Haiti', 'Cuba', 'Dominican-Republic',
        'Puerto-Rico', 'Curacao', 'Aruba'
    ];
    
    // Oceania
    const oceaniaCountries = [
        'Australia', 'New-Zealand', 'Fiji', 'Papua-New-Guinea', 'New-Caledonia',
        'Tahiti', 'Solomon-Islands', 'Vanuatu', 'Samoa', 'Tonga'
    ];
    
    if (europeanCountries.includes(country)) return 'europe';
    if (africanCountries.includes(country)) return 'africa';
    if (middleEastCountries.includes(country)) return 'middle_east';
    if (asianCountries.includes(country)) return 'asia';
    if (southAmericanCountries.includes(country)) return 'south_america';
    if (northAmericanCountries.includes(country)) return 'north_america';
    if (oceaniaCountries.includes(country)) return 'oceania';
    return 'other';
}
