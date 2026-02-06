#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Sport Calendar
 * Tests data consistency, API endpoints, and generates UI testing checklist
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/fixtures`;
const isHttps = BASE_URL.startsWith('https');

console.log('\n🔬 COMPREHENSIVE TEST SUITE');
console.log('='.repeat(80));
console.log(`Testing: ${BASE_URL}`);
console.log('='.repeat(80));

// Test counters
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function pass(testName) {
    totalTests++;
    passedTests++;
    console.log(`✅ ${testName}`);
}

function fail(testName, reason) {
    totalTests++;
    failedTests++;
    failures.push({ test: testName, reason });
    console.log(`❌ ${testName}`);
    console.log(`   Reason: ${reason}`);
}

// ============================================================================
// SECTION 1: DATA VALIDATION
// ============================================================================
console.log('\n📦 SECTION 1: DATA VALIDATION');
console.log('-'.repeat(80));

// Load data files
const finishedTournamentsPath = path.join(__dirname, '../data/finished_tournaments.json');
const worldTournamentsMasterPath = path.join(__dirname, '../data/world_tournaments_master.json');
const countryMappingsPath = path.join(__dirname, '../data/country_mappings.json');

let finishedTournaments = {};
let worldTournamentsMaster = {};
let countryMappings = {};

// Test 1: File existence
try {
    if (fs.existsSync(finishedTournamentsPath)) {
        finishedTournaments = JSON.parse(fs.readFileSync(finishedTournamentsPath, 'utf8'));
        pass('finished_tournaments.json exists and is valid JSON');
    } else {
        fail('finished_tournaments.json exists', 'File not found');
    }
} catch (e) {
    fail('finished_tournaments.json is valid JSON', e.message);
}

try {
    if (fs.existsSync(worldTournamentsMasterPath)) {
        worldTournamentsMaster = JSON.parse(fs.readFileSync(worldTournamentsMasterPath, 'utf8'));
        pass('world_tournaments_master.json exists and is valid JSON');
    } else {
        fail('world_tournaments_master.json exists', 'File not found');
    }
} catch (e) {
    fail('world_tournaments_master.json is valid JSON', e.message);
}

try {
    if (fs.existsSync(countryMappingsPath)) {
        countryMappings = JSON.parse(fs.readFileSync(countryMappingsPath, 'utf8'));
        pass('country_mappings.json exists and is valid JSON');
    } else {
        fail('country_mappings.json exists', 'File not found');
    }
} catch (e) {
    fail('country_mappings.json is valid JSON', e.message);
}

// Test 2: Data structure validation
const finishedTournsData = finishedTournaments.finished_tournaments || {};
const worldTournsData = worldTournamentsMaster.tournaments || {};

if (Object.keys(finishedTournsData).length > 0) {
    pass(`finished_tournaments has ${Object.keys(finishedTournsData).length} entries`);
} else {
    fail('finished_tournaments has entries', 'No tournaments found');
}

if (Object.keys(worldTournsData).length > 0) {
    pass(`world_tournaments_master has ${Object.keys(worldTournsData).length} entries`);
} else {
    fail('world_tournaments_master has entries', 'No tournaments found');
}

// Test 3: Critical tournaments exist and have required fields
const criticalTournaments = {
    '1': 'World Cup',
    '4': 'Euro',
    '9': 'Copa America',
    '143': 'Copa del Rey',
    '385': 'Toto Cup Ligat Al',
    '533': 'CAF Super Cup',
    '659': 'Super Cup (Israel)',
    '1164': "CAF Women's Champions League"
};

Object.entries(criticalTournaments).forEach(([id, name]) => {
    const inFinished = finishedTournsData[id];
    const inMaster = worldTournsData[id];
    
    if (inFinished && inFinished.status === 'finished' && inFinished.winner) {
        pass(`${name} (${id}) in finished_tournaments with status and winner`);
    } else {
        fail(`${name} (${id}) in finished_tournaments`, 'Missing or incomplete');
    }
    
    // Handle both formats: status as string OR status.current as string
    const masterStatus = inMaster && (inMaster.status?.current || inMaster.status);
    if (inMaster && masterStatus === 'finished' && inMaster.winner) {
        pass(`${name} (${id}) in world_tournaments_master with status and winner`);
    } else {
        fail(`${name} (${id}) in world_tournaments_master`, 'Missing or incomplete');
    }
});

// Test 4: Data consistency between files
Object.keys(finishedTournsData).forEach(id => {
    const finEntry = finishedTournsData[id];
    const masterEntry = worldTournsData[id];
    
    if (finEntry.status === 'finished') {
        if (!masterEntry) {
            fail(`Data consistency: Tournament ${id} (${finEntry.name})`, 'In finished_tournaments but not in world_tournaments_master');
        } else {
            // Handle both formats: status as string OR status.current as string
            const masterStatus = masterEntry.status?.current || masterEntry.status;
            
            if (masterStatus !== 'finished') {
                fail(`Data consistency: Tournament ${id} (${finEntry.name})`, `Status mismatch: finished vs ${masterStatus}`);
            } else if (finEntry.winner && masterEntry.winner) {
                // Handle both formats: winner.name (finished_tournaments) vs winner.team (world_tournaments_master)
                const finWinner = finEntry.winner.name;
                const masterWinner = masterEntry.winner.name || masterEntry.winner.team;
                
                if (finWinner !== masterWinner) {
                    fail(`Data consistency: Tournament ${id} (${finEntry.name})`, `Winner mismatch: ${finWinner} vs ${masterWinner}`);
                } else {
                    pass(`Data consistency: Tournament ${id} (${finEntry.name})`);
                }
            } else {
                pass(`Data consistency: Tournament ${id} (${finEntry.name})`);
            }
        }
    }
});

// ============================================================================
// SECTION 2: API ENDPOINTS TESTING
// ============================================================================
console.log('\n🌐 SECTION 2: API ENDPOINTS TESTING');
console.log('-'.repeat(80));

async function testEndpoint(name, path, validator) {
    return new Promise((resolve) => {
        const url = `${API_BASE}${path}`;
        const client = isHttps ? https : http;
        client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const json = JSON.parse(data);
                        if (validator) {
                            const result = validator(json);
                            if (result === true) {
                                pass(`API: ${name}`);
                            } else {
                                fail(`API: ${name}`, result || 'Validation failed');
                            }
                        } else {
                            pass(`API: ${name}`);
                        }
                    } else {
                        fail(`API: ${name}`, `HTTP ${res.statusCode}`);
                    }
                } catch (e) {
                    fail(`API: ${name}`, e.message);
                }
                resolve();
            });
        }).on('error', (e) => {
            fail(`API: ${name}`, e.message);
            resolve();
        });
    });
}

async function runApiTests() {
    // Test 1: Tournament status endpoint
    await testEndpoint(
        'GET /tournaments/status/all',
        '/tournaments/status/all',
        (data) => {
            if (!data.tournaments) return 'Missing tournaments object';
            const count = Object.keys(data.tournaments).length;
            if (count === 0) return 'No tournaments returned';
            console.log(`   Found ${count} tournaments`);
            
            // Check critical tournaments
            const critical = ['1', '4', '9', '143', '385', '533', '659', '1164'];
            for (const id of critical) {
                if (!data.tournaments[id]) {
                    return `Missing critical tournament ${id}`;
                }
                if (!data.tournaments[id].status) {
                    return `Tournament ${id} missing status`;
                }
            }
            return true;
        }
    );
    
    // Test 2: Countries endpoint
    await testEndpoint(
        'GET /countries',
        '/countries',
        (data) => {
            const countries = Array.isArray(data) ? data : (data.response || []);
            if (countries.length === 0) return 'No countries returned';
            console.log(`   Found ${countries.length} countries`);
            
            // Check critical countries
            const critical = ['Israel', 'Spain', 'Italy', 'England', 'Germany'];
            const names = countries.map(c => c.name);
            for (const name of critical) {
                if (!names.includes(name)) {
                    return `Missing critical country: ${name}`;
                }
            }
            return true;
        }
    );
    
    // Test 3: Leagues endpoint (Israel)
    await testEndpoint(
        'GET /leagues?country=Israel',
        '/leagues?country=Israel',
        (data) => {
            const leagues = Array.isArray(data) ? data : (data.response || []);
            if (leagues.length === 0) return 'No leagues returned for Israel';
            console.log(`   Found ${leagues.length} Israeli leagues`);
            
            // Check for Toto Cup and Super Cup
            const leagueIds = leagues.map(l => l.id);
            if (!leagueIds.includes(385)) return 'Missing Toto Cup (385)';
            if (!leagueIds.includes(659)) return 'Missing Super Cup (659)';
            
            // Check their status
            const totoCup = leagues.find(l => l.id === 385);
            const superCup = leagues.find(l => l.id === 659);
            
            if (totoCup && totoCup.status !== 'finished') {
                return `Toto Cup status should be 'finished', got '${totoCup.status}'`;
            }
            if (superCup && superCup.status !== 'finished') {
                return `Super Cup status should be 'finished', got '${superCup.status}'`;
            }
            
            return true;
        }
    );
    
    // Test 4: Leagues endpoint (Spain)
    await testEndpoint(
        'GET /leagues?country=Spain',
        '/leagues?country=Spain',
        (data) => {
            const leagues = Array.isArray(data) ? data : (data.response || []);
            if (leagues.length === 0) return 'No leagues returned for Spain';
            console.log(`   Found ${leagues.length} Spanish leagues`);
            return true;
        }
    );
}

// ============================================================================
// SECTION 3: UI TESTING CHECKLIST
// ============================================================================
function generateUIChecklist() {
    console.log('\n🖥️  SECTION 3: UI TESTING CHECKLIST');
    console.log('-'.repeat(80));
    console.log('Manual testing required. Follow this checklist:\n');
    
    const checklist = [
        {
            section: 'Global Navigation',
            tests: [
                'Open homepage and verify all regions appear (World, Europe, Africa, Asia, etc.)',
                'Click each region and verify it loads without errors',
                'Use browser back button and verify navigation history works',
                'Check that loading states appear during data fetching'
            ]
        },
        {
            section: 'Continental View - Europe',
            tests: [
                'Open Europe hub',
                'Check "Countries" tab shows European countries',
                'Check "Club Competitions" tab shows: Champions League, Europa League, Conference League',
                'Check "National Tournaments" tab shows: Euro, Nations League',
                'Verify Euro Championship shows 🏖️ vacation badge OR 🏆 Golden Card with Spain winner',
                'Verify UEFA Super Cup shows Golden Card with Real Madrid'
            ]
        },
        {
            section: 'Continental View - Africa',
            tests: [
                'Open Africa hub',
                'Check "Club Competitions" tab',
                'Verify CAF Super Cup shows Golden Card with Pyramids FC 🏆',
                'Verify CAF Women\'s Champions League shows Golden Card with AS FAR 🏆',
                'Check that logo images load correctly',
                'Verify clicking on active tournament opens team selection'
            ]
        },
        {
            section: 'Continental View - South America',
            tests: [
                'Open South America hub',
                'Check Copa America shows Golden Card with Argentina',
                'Check Libertadores shows active state or vacation',
                'Verify all logos load correctly'
            ]
        },
        {
            section: 'Country View - Israel',
            tests: [
                'Select Israel from countries list',
                'Switch to "Domestic Competitions" tab',
                'Verify Toto Cup shows Golden Card with Beitar Jerusalem 🏆',
                'Verify Super Cup shows Golden Card with Hapoel Beer Sheva 🏆',
                'Check that winner names and logos display correctly',
                'Verify clicking finished tournament does NOT open team selection'
            ]
        },
        {
            section: 'Country View - Spain',
            tests: [
                'Select Spain from countries list',
                'Check La Liga is visible and clickable',
                'Check Copa del Rey shows Golden Card with Barcelona 🏆',
                'Check Supercopa shows Golden Card with Barcelona 🏆',
                'Verify all tournament statuses are correct'
            ]
        },
        {
            section: 'Country View - Italy',
            tests: [
                'Select Italy from countries list',
                'Check Serie A is visible',
                'Check Supercoppa Italiana shows Golden Card with Inter 🏆',
                'Verify correct winner name and logo'
            ]
        },
        {
            section: 'Golden Card Design',
            tests: [
                'Check Golden Card has gold border (#d4af37)',
                'Check trophy emoji 🏆 appears in top-right corner',
                'Check "TOURNAMENT Completed" badge is visible',
                'Check winner name and logo are displayed',
                'Check card is non-clickable (cursor: default)',
                'Check card has proper opacity and grayscale filter'
            ]
        },
        {
            section: 'Vacation State',
            tests: [
                'Find a tournament with vacation status',
                'Verify 🏖️ emoji appears in top-left',
                'Verify card is grayscaled and has opacity: 0.6',
                'Verify card is non-clickable'
            ]
        },
        {
            section: 'Active Tournaments',
            tests: [
                'Find an active league (e.g., Premier League)',
                'Click on it and verify team selection opens',
                'Verify teams load correctly',
                'Select a team and verify fixtures load',
                'Check fixture table displays properly'
            ]
        },
        {
            section: 'Error Handling',
            tests: [
                'Disconnect internet and try to load a page',
                'Verify error message is displayed',
                'Reconnect and verify data loads',
                'Test with invalid tournament ID in URL'
            ]
        },
        {
            section: 'Mobile Responsiveness',
            tests: [
                'Resize browser to mobile width (375px)',
                'Verify cards stack vertically',
                'Verify navigation is usable',
                'Check that all text is readable',
                'Verify Golden Cards render correctly on mobile'
            ]
        },
        {
            section: 'Browser Compatibility',
            tests: [
                'Test in Chrome',
                'Test in Firefox',
                'Test in Safari',
                'Verify all features work in each browser'
            ]
        }
    ];
    
    checklist.forEach((section, idx) => {
        console.log(`\n${idx + 1}. ${section.section}`);
        console.log('   ' + '-'.repeat(70));
        section.tests.forEach((test, testIdx) => {
            console.log(`   [ ] ${testIdx + 1}. ${test}`);
        });
    });
    
    console.log('\n');
    console.log('='.repeat(80));
    console.log('Save this checklist and tick items as you test!');
    console.log('='.repeat(80));
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
    // Run API tests
    await runApiTests();
    
    // Generate UI checklist
    generateUIChecklist();
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
    
    if (failures.length > 0) {
        console.log('\n🚨 FAILURES:');
        failures.forEach((f, idx) => {
            console.log(`${idx + 1}. ${f.test}`);
            console.log(`   ${f.reason}`);
        });
    }
    
    console.log('\n' + '='.repeat(80));
    if (failedTests === 0) {
        console.log('✅ ALL AUTOMATED TESTS PASSED!');
        console.log('👉 Now perform manual UI testing using the checklist above');
    } else {
        console.log('⚠️  SOME TESTS FAILED - Review and fix before proceeding');
    }
    console.log('='.repeat(80) + '\n');
    
    process.exit(failedTests > 0 ? 1 : 0);
}

main();
