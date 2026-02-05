/**
 * Comprehensive Data Validation Suite
 * 
 * Tests all aspects of our data before deployment:
 * 1. Team data completeness
 * 2. Standings accuracy
 * 3. Fixture data integrity
 * 4. Season consistency
 * 5. Historical data (teams that dropped/promoted)
 * 6. API response structure
 * 
 * Usage: node dev_scripts/validate_data.js [--league=ID] [--verbose]
 */

const API_BASE = 'http://127.0.0.1:3000/api/fixtures';

// Test configuration
const TEST_LEAGUES = [
    { id: 39, name: 'Premier League', country: 'England', expectedTeams: 20, type: 'League' },
    { id: 140, name: 'La Liga', country: 'Spain', expectedTeams: 20, type: 'League' },
    { id: 135, name: 'Serie A', country: 'Italy', expectedTeams: 20, type: 'League' },
    { id: 78, name: 'Bundesliga', country: 'Germany', expectedTeams: 18, type: 'League' },
    { id: 61, name: 'Ligue 1', country: 'France', expectedTeams: 18, type: 'League' },
    { id: 383, name: 'Israeli Premier', country: 'Israel', expectedTeams: 14, type: 'League' },
    { id: 2, name: 'Champions League', country: 'World', expectedTeams: null, type: 'Cup' }, // Variable due to qualifiers
    { id: 3, name: 'Europa League', country: 'World', expectedTeams: null, type: 'Cup' },
];

// Known relegated/promoted teams for validation
const KNOWN_CHANGES = {
    39: { // Premier League
        2024: {
            relegated: ['Burnley', 'Sheffield Utd', 'Luton'],
            promoted: ['Leicester', 'Ipswich', 'Southampton']
        },
        2023: {
            relegated: ['Southampton', 'Leeds', 'Leicester'],
            promoted: ['Burnley', 'Sheffield Utd', 'Luton']
        }
    },
    383: { // Israeli Premier League
        2024: {
            relegated: ['Hapoel Hadera'],
            promoted: ['Hapoel Petah Tikva']
        }
    }
};

// Validation results collector
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

function log(type, message, details = null) {
    const icons = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' };
    console.log(`   ${icons[type] || '•'} ${message}`);
    if (details && process.argv.includes('--verbose')) {
        console.log(`      ${JSON.stringify(details)}`);
    }
}

function addResult(category, test, status, message, details = null) {
    results.tests.push({ category, test, status, message, details });
    if (status === 'pass') results.passed++;
    else if (status === 'fail') results.failed++;
    else if (status === 'warn') results.warnings++;
}

// ============== TEST FUNCTIONS ==============

async function testTeamDataCompleteness(leagueId, season) {
    const category = 'Team Data Completeness';
    try {
        const response = await fetch(`${API_BASE}/teams-with-standings?league=${leagueId}&season=${season}`);
        const teams = await response.json();
        
        if (!Array.isArray(teams) || teams.length === 0) {
            addResult(category, `League ${leagueId}`, 'fail', 'No teams returned');
            return { success: false };
        }

        let issues = [];
        teams.forEach(item => {
            const team = item.team || {};
            const venue = item.venue || {};
            
            // Required fields
            if (!team.id) issues.push(`Missing team.id for ${team.name || 'unknown'}`);
            if (!team.name) issues.push(`Missing team.name for ID ${team.id}`);
            if (!team.logo) issues.push(`Missing logo for ${team.name}`);
            
            // Recommended fields
            if (!venue.name && !team.national) {
                // Only warn for club teams, not national teams
                issues.push(`Missing venue for ${team.name}`);
            }
        });

        if (issues.length === 0) {
            addResult(category, `League ${leagueId}`, 'pass', `All ${teams.length} teams have complete data`);
            log('pass', `All ${teams.length} teams have complete required fields`);
        } else if (issues.length <= 3) {
            addResult(category, `League ${leagueId}`, 'warn', `${issues.length} minor issues`, issues);
            log('warn', `${issues.length} minor data issues`);
        } else {
            addResult(category, `League ${leagueId}`, 'fail', `${issues.length} data issues`, issues);
            log('fail', `${issues.length} data completeness issues`);
        }

        return { success: issues.length < 5, teams, issues };
    } catch (err) {
        addResult(category, `League ${leagueId}`, 'fail', `API Error: ${err.message}`);
        return { success: false, error: err.message };
    }
}

async function testStandingsConsistency(leagueId, season, leagueConfig) {
    const category = 'Standings Consistency';
    try {
        const response = await fetch(`${API_BASE}/teams-with-standings?league=${leagueId}&season=${season}`);
        const teams = await response.json();
        
        // For Leagues (not Cups), all teams should have standings
        if (leagueConfig.type === 'League') {
            const teamsWithStandings = teams.filter(t => t.standing);
            const teamsWithoutStandings = teams.filter(t => !t.standing);
            
            if (teamsWithoutStandings.length > 0) {
                addResult(category, `League ${leagueId}`, 'warn', 
                    `${teamsWithoutStandings.length} teams without standings`, 
                    teamsWithoutStandings.map(t => t.team.name));
                log('warn', `${teamsWithoutStandings.length} teams without standings data`);
            } else {
                addResult(category, `League ${leagueId}`, 'pass', 'All teams have standings');
                log('pass', 'All teams have standings data');
            }

            // Check for duplicate ranks
            const ranks = teamsWithStandings.map(t => t.standing.rank);
            const duplicateRanks = ranks.filter((r, i) => ranks.indexOf(r) !== i);
            if (duplicateRanks.length > 0) {
                addResult(category, `League ${leagueId} Ranks`, 'warn', 
                    `Duplicate ranks found: ${[...new Set(duplicateRanks)].join(', ')}`);
                log('warn', `Duplicate ranks: ${[...new Set(duplicateRanks)].join(', ')}`);
            }

            // Verify points are reasonable
            const maxPoints = teamsWithStandings.reduce((max, t) => 
                Math.max(max, t.standing.points || 0), 0);
            const minPoints = teamsWithStandings.reduce((min, t) => 
                Math.min(min, t.standing.points || 999), 999);
            
            if (maxPoints > 0 && minPoints >= 0) {
                log('info', `Points range: ${minPoints} - ${maxPoints}`);
            }
        }

        // Check team count matches expected
        if (leagueConfig.expectedTeams) {
            const diff = Math.abs(teams.length - leagueConfig.expectedTeams);
            if (diff === 0) {
                addResult(category, `League ${leagueId} Count`, 'pass', 
                    `Correct team count: ${teams.length}`);
                log('pass', `Team count matches expected: ${teams.length}`);
            } else if (diff <= 2) {
                addResult(category, `League ${leagueId} Count`, 'warn', 
                    `Expected ${leagueConfig.expectedTeams}, got ${teams.length}`);
                log('warn', `Team count: expected ${leagueConfig.expectedTeams}, got ${teams.length}`);
            } else {
                addResult(category, `League ${leagueId} Count`, 'fail', 
                    `Expected ${leagueConfig.expectedTeams}, got ${teams.length}`);
                log('fail', `Team count mismatch: expected ${leagueConfig.expectedTeams}, got ${teams.length}`);
            }
        }

        return { success: true };
    } catch (err) {
        addResult(category, `League ${leagueId}`, 'fail', `Error: ${err.message}`);
        return { success: false };
    }
}

async function testRelegationPromotion(leagueId, season) {
    const category = 'Relegation/Promotion';
    const changes = KNOWN_CHANGES[leagueId]?.[season];
    
    if (!changes) {
        log('info', 'No known relegation/promotion data for validation');
        return { success: true, skipped: true };
    }

    try {
        // Get current season teams
        const currentResponse = await fetch(`${API_BASE}/teams-with-standings?league=${leagueId}&season=${season}`);
        const currentTeams = await currentResponse.json();
        const currentNames = currentTeams.map(t => t.team.name.toLowerCase());

        // Get previous season teams
        const prevResponse = await fetch(`${API_BASE}/teams-with-standings?league=${leagueId}&season=${season - 1}`);
        const prevTeams = await prevResponse.json();
        const prevNames = prevTeams.map(t => t.team.name.toLowerCase());

        let issues = [];

        // Check relegated teams are NOT in current season
        if (changes.relegated) {
            changes.relegated.forEach(team => {
                const teamLower = team.toLowerCase();
                if (currentNames.some(n => n.includes(teamLower) || teamLower.includes(n))) {
                    issues.push(`Relegated team "${team}" still appears in current season`);
                }
            });
        }

        // Check promoted teams ARE in current season
        if (changes.promoted) {
            changes.promoted.forEach(team => {
                const teamLower = team.toLowerCase();
                if (!currentNames.some(n => n.includes(teamLower) || teamLower.includes(n))) {
                    issues.push(`Promoted team "${team}" not found in current season`);
                }
            });
        }

        if (issues.length === 0) {
            addResult(category, `League ${leagueId}`, 'pass', 'Relegation/Promotion data is correct');
            log('pass', 'Relegated teams removed, promoted teams added correctly');
        } else {
            addResult(category, `League ${leagueId}`, 'fail', `${issues.length} issues`, issues);
            issues.forEach(i => log('fail', i));
        }

        return { success: issues.length === 0 };
    } catch (err) {
        addResult(category, `League ${leagueId}`, 'fail', `Error: ${err.message}`);
        return { success: false };
    }
}

async function testDefendingChampion(leagueId, season) {
    const category = 'Defending Champion';
    try {
        const response = await fetch(`${API_BASE}/teams-with-standings?league=${leagueId}&season=${season}`);
        const teams = await response.json();
        
        const defendingChamp = teams.find(t => t.isDefendingChampion);
        const currentLeader = teams.find(t => t.standing?.rank === 1);

        if (!defendingChamp) {
            addResult(category, `League ${leagueId}`, 'warn', 'No defending champion identified');
            log('warn', 'No defending champion flag set');
            return { success: false };
        }

        // Verify it's not the same as current leader (unless they're actually leading)
        if (currentLeader && defendingChamp.team.id === currentLeader.team.id) {
            log('info', `Defending champion ${defendingChamp.team.name} is also current leader`);
        } else {
            log('info', `Defending champion: ${defendingChamp.team.name} (Rank #${defendingChamp.standing?.rank || 'N/A'})`);
            log('info', `Current leader: ${currentLeader?.team.name || 'N/A'}`);
        }

        addResult(category, `League ${leagueId}`, 'pass', 
            `Defending champion: ${defendingChamp.team.name}`);
        
        return { success: true, champion: defendingChamp.team.name };
    } catch (err) {
        addResult(category, `League ${leagueId}`, 'fail', `Error: ${err.message}`);
        return { success: false };
    }
}

async function testFixturesData(leagueId, season) {
    const category = 'Fixtures Data';
    try {
        // Test upcoming fixtures for Arsenal (team 42) - usually has games
        const upcomingResponse = await fetch(`${API_BASE}/upcoming?team=42&next=5`);
        const upcomingData = await upcomingResponse.json();
        
        const fixtures = Array.isArray(upcomingData) ? upcomingData : (upcomingData.response || []);
        
        if (fixtures.length > 0) {
            const fixture = fixtures[0];
            
            // Check fixture structure
            const requiredFields = ['fixture', 'teams', 'league'];
            const missingFields = requiredFields.filter(f => !fixture[f]);
            
            if (missingFields.length === 0) {
                addResult(category, 'Fixture Structure', 'pass', 'All required fields present');
                log('pass', 'Fixture structure is valid');
            } else {
                addResult(category, 'Fixture Structure', 'fail', 
                    `Missing fields: ${missingFields.join(', ')}`);
                log('fail', `Missing fixture fields: ${missingFields.join(', ')}`);
            }

            // Check dates are in future
            const fixtureDate = new Date(fixture.fixture?.date);
            const now = new Date();
            if (fixtureDate > now) {
                addResult(category, 'Future Fixtures', 'pass', `Next: ${fixtureDate.toLocaleDateString()}`);
                log('pass', `Next fixture: ${fixtureDate.toLocaleDateString()}`);
            } else {
                addResult(category, 'Future Fixtures', 'warn', 'Fixture date in past');
                log('warn', `Fixture date in past: ${fixtureDate.toLocaleDateString()}`);
            }
        } else {
            addResult(category, 'Upcoming Fixtures', 'warn', 'No upcoming fixtures found for test team');
            log('warn', 'No upcoming fixtures returned');
        }

        return { success: true };
    } catch (err) {
        addResult(category, 'Fixtures', 'fail', `Error: ${err.message}`);
        return { success: false };
    }
}

async function testAPIResponseTime(leagueId) {
    const category = 'API Performance';
    try {
        const start = Date.now();
        await fetch(`${API_BASE}/teams-with-standings?league=${leagueId}&season=2024`);
        const duration = Date.now() - start;

        if (duration < 500) {
            addResult(category, `League ${leagueId}`, 'pass', `Response time: ${duration}ms (cached)`);
            log('pass', `Response time: ${duration}ms`);
        } else if (duration < 3000) {
            addResult(category, `League ${leagueId}`, 'pass', `Response time: ${duration}ms`);
            log('info', `Response time: ${duration}ms`);
        } else {
            addResult(category, `League ${leagueId}`, 'warn', `Slow response: ${duration}ms`);
            log('warn', `Slow response: ${duration}ms`);
        }

        return { success: true, duration };
    } catch (err) {
        addResult(category, `League ${leagueId}`, 'fail', `Timeout/Error`);
        return { success: false };
    }
}

async function testChampionsLeagueParticipants(season) {
    const category = 'Champions League Participants';
    try {
        // Get CL teams
        const clResponse = await fetch(`${API_BASE}/teams-with-standings?league=2&season=${season}`);
        const clTeams = await clResponse.json();
        
        if (!Array.isArray(clTeams) || clTeams.length === 0) {
            addResult(category, 'CL Teams', 'warn', 'No Champions League teams found');
            return { success: false };
        }

        // Get Premier League top teams (should be in CL)
        const plResponse = await fetch(`${API_BASE}/teams-with-standings?league=39&season=${season}`);
        const plTeams = await plResponse.json();
        
        // Top 4 PL teams should be in CL (or were last season)
        const plTop4 = plTeams.slice(0, 4).map(t => t.team.name.toLowerCase());
        const clTeamNames = clTeams.map(t => t.team.name.toLowerCase());
        
        const plInCL = plTop4.filter(name => 
            clTeamNames.some(clName => clName.includes(name) || name.includes(clName))
        );

        log('info', `Champions League has ${clTeams.length} teams`);
        log('info', `PL Top 4 in CL: ${plInCL.length}/4`);

        if (plInCL.length >= 3) {
            addResult(category, 'PL Teams in CL', 'pass', `${plInCL.length}/4 top PL teams in CL`);
        } else {
            addResult(category, 'PL Teams in CL', 'warn', 
                `Only ${plInCL.length}/4 top PL teams found in CL`);
        }

        return { success: true, clTeamCount: clTeams.length };
    } catch (err) {
        addResult(category, 'CL Check', 'fail', `Error: ${err.message}`);
        return { success: false };
    }
}

// ============== MAIN RUNNER ==============

async function runAllTests() {
    console.log('🔍 COMPREHENSIVE DATA VALIDATION SUITE\n');
    console.log('='.repeat(70));
    
    const currentSeason = 2025; // Current API season
    const leagueArg = process.argv.find(a => a.startsWith('--league='));
    const testLeagues = leagueArg 
        ? TEST_LEAGUES.filter(l => l.id === parseInt(leagueArg.split('=')[1]))
        : TEST_LEAGUES;

    for (const league of testLeagues) {
        console.log(`\n📊 ${league.name} (${league.country}) - League ${league.id}`);
        console.log('-'.repeat(50));

        // Run all tests for this league
        await testTeamDataCompleteness(league.id, currentSeason);
        await testStandingsConsistency(league.id, currentSeason, league);
        await testDefendingChampion(league.id, currentSeason);
        await testRelegationPromotion(league.id, currentSeason);
        await testAPIResponseTime(league.id);
    }

    // Cross-league tests
    console.log(`\n📊 Cross-League Validation`);
    console.log('-'.repeat(50));
    await testChampionsLeagueParticipants(currentSeason);
    await testFixturesData(39, currentSeason);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📋 VALIDATION SUMMARY\n');
    console.log(`   Total Tests: ${results.passed + results.failed + results.warnings}`);
    console.log(`   ✅ Passed:   ${results.passed}`);
    console.log(`   ❌ Failed:   ${results.failed}`);
    console.log(`   ⚠️  Warnings: ${results.warnings}`);
    
    const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
    console.log(`\n   Success Rate: ${successRate}%`);
    
    if (results.failed > 0) {
        console.log('\n   ❌ Failed Tests:');
        results.tests.filter(t => t.status === 'fail').forEach(t => {
            console.log(`      - [${t.category}] ${t.test}: ${t.message}`);
        });
    }

    if (results.warnings > 0) {
        console.log('\n   ⚠️  Warnings:');
        results.tests.filter(t => t.status === 'warn').forEach(t => {
            console.log(`      - [${t.category}] ${t.test}: ${t.message}`);
        });
    }

    console.log('\n' + '='.repeat(70));
    
    // Exit code based on failures
    process.exit(results.failed > 0 ? 1 : 0);
}

// Run
runAllTests().catch(err => {
    console.error('Validation suite error:', err);
    process.exit(1);
});
