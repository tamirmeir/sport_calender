#!/usr/bin/env node
/**
 * Bulk Add Missing Tournaments
 * 
 * Reads from missing_winners_report.json and adds ALL relevant tournaments
 * Filters out: Youth, Women, Qualification, Friendlies
 * Adds to both finished_tournaments.json and world_tournaments_master.json
 */

const fs = require('fs');
const path = require('path');

console.log('\n🚀 BULK ADD MISSING TOURNAMENTS');
console.log('='.repeat(80));

// Load report
const reportPath = path.join(__dirname, '../../missing_winners_report.json');
if (!fs.existsSync(reportPath)) {
    console.error('❌ No report found. Run detect_missing_winners.js first!');
    process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Filter relevant tournaments (exclude youth, women, qualification, lower tiers)
const relevantTournaments = report.missingTournaments.filter(t => {
    const name = t.leagueName.toLowerCase();
    const winnerName = (t.winner && t.winner.name ? t.winner.name.toLowerCase() : '');
    
    // Exclude youth (check both league name and winner name)
    if (name.match(/\bu\d{2}\b/) || name.includes('youth') || name.includes('junior') || 
        name.includes('sub-') || name.includes('u-')) return false;
    if (winnerName.match(/\bu\d{2}\b/) || winnerName.includes('youth') || winnerName.includes('junior')) return false;
    
    // Exclude women (check both league name and winner name)
    if (name.includes('women') || name.includes('frauen') || name.includes('femenina') ||
        name.includes('féminin') || name.includes('feminine') || name.includes('feminin') ||
        name.includes('wsl') || name.includes('nwsl') || name.includes(' w ') || name.includes('swpl')) return false;
    if (winnerName.includes(' w') || winnerName.includes('women')) return false;
    
    // Exclude qualification/friendlies
    if (name.includes('qualification') || name.includes('qualifying') || 
        name.includes('friendlies') || name.includes('friendly')) return false;
    
    // Exclude lower tiers
    if (name.includes('serie c') || name.includes('serie d') || name.includes('3. liga') ||
        name.includes('division 2') || name.includes('division 3') || name.includes('tercera') ||
        name.includes('oberliga') || name.includes('regionalliga') || 
        name.includes('national 2') || name.includes('national 3')) return false;
    
    // Exclude development/academy/reserves
    if (name.includes('development') || name.includes('academy') || name.includes('reserves') ||
        name.includes('reserve') || name.includes('primavera') || name.includes('revelação') ||
        name.includes('aspirantes')) return false;
    
    // Exclude specific unwanted tournaments
    if (name.includes('trophy') && name.includes('efl')) return false; // EFL Trophy
    if (name.includes('international cup') && name.includes('premier league')) return false; // PL International Cup
    if (name.includes('premier league cup')) return false; // Premier League Cup (U21 tournament)
    if (name.includes('toulon') || name.includes('revello') || name.includes('cotif')) return false; // Youth tournaments with misleading names
    if (name.includes('shebelieves') || name.includes('algarve cup')) return false; // Women's tournaments
    if (name.includes('asian games') || name.includes('sea games') || name.includes('southeast asian games')) return false; // Multi-sport events
    
    return true;
});

console.log(`Total missing: ${report.missingTournaments.length}`);
console.log(`Relevant to add: ${relevantTournaments.length}`);
console.log('='.repeat(80));

if (relevantTournaments.length === 0) {
    console.log('✅ No tournaments to add!');
    process.exit(0);
}

// Load existing data
const finishedPath = path.join(__dirname, '../data/finished_tournaments.json');
const masterPath = path.join(__dirname, '../data/world_tournaments_master.json');

let finishedData = JSON.parse(fs.readFileSync(finishedPath, 'utf8'));
let masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

let added = 0;

// Add each tournament
relevantTournaments.forEach((t, idx) => {
    const id = t.leagueId.toString();
    
    console.log(`${idx + 1}/${relevantTournaments.length} Adding: ${t.leagueName} (${t.country}) - ${t.winner.name}`);
    
    // Add to finished_tournaments.json
    finishedData.finished_tournaments[id] = {
        name: t.leagueName,
        country: t.country,
        year: 2025,
        status: 'finished',
        winner: {
            name: t.winner.name,
            logo: t.winner.logo,
            id: t.winner.id,
            detected_by: 'automated-bulk-detection',
            detected_at: new Date().toISOString(),
            confidence: 'high',
            note: `${t.teams}, ${t.score}, ${t.matchDate.split('T')[0]}`
        }
    };
    
    // Add to world_tournaments_master.json
    const countryCode = getCountryCode(t.country);
    const region = getRegion(t.country);
    
    masterData.tournaments[id] = {
        name: t.leagueName,
        country: t.country,
        countryCode: countryCode,
        region: region,
        type: determineTournamentType(t.leagueName),
        tier: determineTier(t.country),
        logo: `https://media.api-sports.io/football/leagues/${id}.png`,
        status: {
            current: 'finished',
            season: '2025',
            startDate: t.matchDate.split('T')[0],
            endDate: t.matchDate.split('T')[0],
            currentMatchday: 1,
            totalMatchdays: 1
        },
        schedule: {
            pattern: 'annual_tournament',
            frequency: 'annual',
            month: new Date(t.matchDate).getMonth() + 1
        },
        winner: {
            hasWinner: true,
            season: '2025',
            team: t.winner.name,
            teamId: t.winner.id,
            teamLogo: t.winner.logo,
            confirmedDate: new Date().toISOString(),
            detectedBy: 'automated-bulk-detection',
            confidence: 'high'
        },
        api: {
            leagueId: t.leagueId,
            season: 2025,
            providedByApi: true,
            lastFetch: new Date().toISOString()
        },
        display: {
            showInCountryHub: true,
            priority: determinePriority(t.leagueName),
            cardType: 'golden',
            badges: [determineTournamentType(t.leagueName), 'finished', t.country.toLowerCase().replace(/\s+/g, '_')],
            description: t.leagueName
        }
    };
    
    added++;
});

// Update metadata
finishedData.metadata.last_updated = new Date().toISOString().split('T')[0];
masterData.metadata.lastUpdated = new Date().toISOString();
masterData.metadata.coverage.tournaments = Object.keys(masterData.tournaments).length;

// Save files
fs.writeFileSync(finishedPath, JSON.stringify(finishedData, null, 2));
fs.writeFileSync(masterPath, JSON.stringify(masterData, null, 2));

console.log('='.repeat(80));
console.log(`✅ Successfully added ${added} tournaments!`);
console.log('');
console.log('📁 Updated files:');
console.log(`   - ${finishedPath}`);
console.log(`   - ${masterPath}`);
console.log('');
console.log('📊 New totals:');
console.log(`   - finished_tournaments: ${Object.keys(finishedData.finished_tournaments).length} entries`);
console.log(`   - world_tournaments_master: ${Object.keys(masterData.tournaments).length} entries`);
console.log('');
console.log('🔄 Next steps:');
console.log('   1. Review changes: git diff');
console.log('   2. Test: node src/scripts/comprehensive_test.js');
console.log('   3. Test all: node src/scripts/test_all_tournaments.js');
console.log('   4. Commit: git add . && git commit -m "feat: bulk add X tournaments"');
console.log('   5. Deploy: git push origin main');
console.log('');

// Helper functions
function determineTournamentType(name) {
    const lower = name.toLowerCase();
    if (lower.includes('super cup') || lower.includes('supercup') || lower.includes('super-cup')) return 'super_cup';
    if (lower.includes('champions league')) return 'continental_cup';
    if (lower.includes('europa league') || lower.includes('conference')) return 'continental_cup';
    if (lower.includes('libertadores') || lower.includes('sudamericana')) return 'continental_cup';
    if (lower.includes('copa') || lower.includes('cup') || lower.includes('coupe') || lower.includes('pokal') || lower.includes('taça')) return 'domestic_cup';
    return 'tournament';
}

function determineTier(country) {
    const majorCountries = ['England', 'Spain', 'Italy', 'Germany', 'France', 'Brazil', 'Argentina'];
    if (majorCountries.includes(country)) return 'tier_1';
    if (country === 'World') return 'global';
    return 'national';
}

function determinePriority(name) {
    const lower = name.toLowerCase();
    if (lower.includes('champions league')) return 10;
    if (lower.includes('super cup') || lower.includes('supercup')) return 8;
    if (lower.includes('fa cup') || lower.includes('copa del rey') || lower.includes('coppa italia')) return 9;
    if (lower.includes('league cup') || lower.includes('coupe de')) return 7;
    return 6;
}

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
        'Moldova': 'MD', 'Luxembourg': 'LU', 'Malta': 'MT', 'Gibraltar': 'GI',
        'San-Marino': 'SM', 'Andorra': 'AD', 'Liechtenstein': 'LI',
        
        // Africa
        'Morocco': 'MA', 'Algeria': 'DZ', 'Tunisia': 'TN', 'Libya': 'LY', 'Egypt': 'EG',
        'Nigeria': 'NG', 'Ghana': 'GH', 'Ivory-Coast': 'CI', 'Senegal': 'SN',
        'Cameroon': 'CM', 'South-Africa': 'ZA', 'Kenya': 'KE', 'Ethiopia': 'ET',
        'Mali': 'ML', 'Burkina-Faso': 'BF', 'Guinea': 'GN', 'Tanzania': 'TZ',
        'Uganda': 'UG', 'Angola': 'AO', 'Mozambique': 'MZ', 'Zimbabwe': 'ZW',
        'Zambia': 'ZM', 'DR-Congo': 'CD', 'Congo': 'CG', 'Gabon': 'GA',
        
        // Middle East
        'Israel': 'IL', 'Saudi-Arabia': 'SA', 'UAE': 'AE', 'Qatar': 'QA',
        'Kuwait': 'KW', 'Bahrain': 'BH', 'Oman': 'OM', 'Jordan': 'JO',
        'Lebanon': 'LB', 'Syria': 'SY', 'Iraq': 'IQ', 'Palestine': 'PS', 'Yemen': 'YE', 'Iran': 'IR',
        
        // Asia
        'Japan': 'JP', 'South-Korea': 'KR', 'China': 'CN', 'Australia': 'AU',
        'India': 'IN', 'Thailand': 'TH', 'Vietnam': 'VN', 'Malaysia': 'MY',
        'Singapore': 'SG', 'Indonesia': 'ID', 'Philippines': 'PH', 'Hong-Kong': 'HK',
        
        // Americas
        'Brazil': 'BR', 'Argentina': 'AR', 'Uruguay': 'UY', 'Chile': 'CL',
        'Colombia': 'CO', 'Peru': 'PE', 'Ecuador': 'EC', 'Venezuela': 'VE',
        'Paraguay': 'PY', 'Bolivia': 'BO', 'USA': 'US', 'Mexico': 'MX',
        'Canada': 'CA', 'Costa-Rica': 'CR', 'Panama': 'PA', 'Honduras': 'HN',
        'Jamaica': 'JM', 'Trinidad-and-Tobago': 'TT', 'Nicaragua': 'NI',
        'Guatemala': 'GT', 'El-Salvador': 'SV', 'Dominican-Republic': 'DO',
        
        // Oceania
        'New-Zealand': 'NZ', 'Fiji': 'FJ', 'World': 'FIFA'
    };
    return codes[country] || 'XX';
}

function getRegion(country) {
    const europeanCountries = [
        'England', 'Spain', 'Italy', 'Germany', 'France', 'Portugal', 'Netherlands', 'Belgium',
        'Switzerland', 'Austria', 'Scotland', 'Wales', 'Northern-Ireland', 'Republic-of-Ireland',
        'Denmark', 'Sweden', 'Norway', 'Finland', 'Iceland', 'Poland', 'Czech-Republic',
        'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Turkey', 'Russia', 'Ukraine',
        'Croatia', 'Serbia', 'Slovenia', 'Bosnia-and-Herzegovina', 'Albania', 'Macedonia',
        'Montenegro', 'Kosovo', 'Cyprus', 'Estonia', 'Latvia', 'Lithuania', 'Georgia',
        'Armenia', 'Azerbaijan', 'Belarus', 'Moldova', 'Luxembourg', 'Malta', 'Gibraltar',
        'San-Marino', 'Andorra', 'Liechtenstein'
    ];
    
    const africanCountries = [
        'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Egypt', 'Nigeria', 'Ghana', 'Ivory-Coast',
        'Senegal', 'Cameroon', 'South-Africa', 'Kenya', 'Ethiopia', 'Mali', 'Burkina-Faso',
        'Guinea', 'Tanzania', 'Uganda', 'Angola', 'Mozambique', 'Zimbabwe', 'Zambia',
        'DR-Congo', 'Congo', 'Gabon'
    ];
    
    const middleEastCountries = [
        'Israel', 'Saudi-Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
        'Jordan', 'Lebanon', 'Syria', 'Iraq', 'Palestine', 'Yemen', 'Iran'
    ];
    
    const asianCountries = [
        'Japan', 'South-Korea', 'China', 'India', 'Thailand', 'Vietnam', 'Malaysia',
        'Singapore', 'Indonesia', 'Philippines', 'Hong-Kong', 'Australia'
    ];
    
    const southAmericanCountries = [
        'Brazil', 'Argentina', 'Uruguay', 'Chile', 'Colombia', 'Peru',
        'Ecuador', 'Venezuela', 'Paraguay', 'Bolivia'
    ];
    
    const northAmericanCountries = [
        'USA', 'Mexico', 'Canada', 'Costa-Rica', 'Panama', 'Honduras',
        'Nicaragua', 'El-Salvador', 'Guatemala', 'Jamaica', 'Trinidad-and-Tobago',
        'Dominican-Republic'
    ];
    
    if (country === 'World') return 'global';
    if (europeanCountries.includes(country)) return 'europe';
    if (africanCountries.includes(country)) return 'africa';
    if (middleEastCountries.includes(country)) return 'middle_east';
    if (asianCountries.includes(country)) return 'asia';
    if (southAmericanCountries.includes(country)) return 'south_america';
    if (northAmericanCountries.includes(country)) return 'north_america';
    return 'other';
}

// Save
fs.writeFileSync(finishedPath, JSON.stringify(finishedData, null, 2));
fs.writeFileSync(masterPath, JSON.stringify(masterData, null, 2));

console.log('='.repeat(80));
console.log(`✅ Successfully added ${relevantTournaments.length} tournaments!`);
console.log('');
console.log('📊 New totals:');
console.log(`   - finished_tournaments: ${Object.keys(finishedData.finished_tournaments).length} entries`);
console.log(`   - world_tournaments_master: ${Object.keys(masterData.tournaments).length} entries`);
console.log('');
console.log('🔍 Sample additions:');
relevantTournaments.slice(0, 10).forEach(t => {
    console.log(`   ✅ ${t.leagueId}: ${t.leagueName} (${t.country}) - ${t.winner.name}`);
});
if (relevantTournaments.length > 10) {
    console.log(`   ... and ${relevantTournaments.length - 10} more`);
}
console.log('');
console.log('🔄 Next steps:');
console.log('   1. Test: node src/scripts/comprehensive_test.js');
console.log('   2. Review: git diff src/data/');
console.log('   3. Commit & deploy');
console.log('='.repeat(80) + '\n');
