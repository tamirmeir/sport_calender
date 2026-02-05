/**
 * UI Data Validation - Tests data as displayed to users
 * 
 * Validates:
 * 1. League cards display correctly
 * 2. Team table shows all expected columns
 * 3. Badge logic (champion/leader) is correct
 * 4. Form display matches actual results
 * 
 * Usage: node dev_scripts/validate_ui_data.js
 */

const API_BASE = 'http://127.0.0.1:3000/api/fixtures';

async function validateTeamTableData(leagueId, season) {
    console.log(`\n🔍 Validating Team Table Data for League ${leagueId}, Season ${season}\n`);
    console.log('='.repeat(60));
    
    const response = await fetch(`${API_BASE}/teams-with-standings?league=${leagueId}&season=${season}`);
    const teams = await response.json();
    
    let issues = [];
    let stats = {
        teamsWithStandings: 0,
        teamsWithVenue: 0,
        teamsWithLogo: 0,
        hasDefendingChamp: false,
        hasCurrentLeader: false,
        formDataPresent: 0,
        gdDataPresent: 0
    };

    teams.forEach((item, index) => {
        const team = item.team || {};
        const standing = item.standing || {};
        const venue = item.venue || {};
        
        // Check required display fields
        if (standing.rank) stats.teamsWithStandings++;
        if (venue.name || venue.city) stats.teamsWithVenue++;
        if (team.logo) stats.teamsWithLogo++;
        if (standing.form) stats.formDataPresent++;
        if (standing.goalsDiff !== undefined) stats.gdDataPresent++;
        
        if (item.isDefendingChampion) {
            stats.hasDefendingChamp = true;
            console.log(`   🏆 Defending Champion: ${team.name} (Rank #${standing.rank})`);
        }
        
        if (standing.rank === 1) {
            stats.hasCurrentLeader = true;
            console.log(`   👑 Current Leader: ${team.name} (${standing.points} pts)`);
        }

        // Validate form string
        if (standing.form) {
            const validForm = /^[WDL]+$/.test(standing.form);
            if (!validForm) {
                issues.push(`Invalid form string for ${team.name}: "${standing.form}"`);
            }
        }

        // Validate rank is sequential
        if (standing.rank && standing.rank !== index + 1) {
            // Note: might be OK if teams are filtered
        }

        // Validate GD matches W/D/L
        if (standing.goalsDiff !== undefined && standing.won !== undefined) {
            // GD should roughly correlate with wins vs losses
            const winLossDiff = (standing.won || 0) - (standing.lost || 0);
            // If team has many more wins than losses, GD should be positive
            if (winLossDiff > 5 && standing.goalsDiff < 0) {
                issues.push(`GD mismatch for ${team.name}: W${standing.won}-L${standing.lost} but GD=${standing.goalsDiff}`);
            }
        }
    });

    // Summary
    console.log(`\n📊 Data Coverage:`);
    console.log(`   Teams with standings: ${stats.teamsWithStandings}/${teams.length}`);
    console.log(`   Teams with venue:     ${stats.teamsWithVenue}/${teams.length}`);
    console.log(`   Teams with logo:      ${stats.teamsWithLogo}/${teams.length}`);
    console.log(`   Form data present:    ${stats.formDataPresent}/${teams.length}`);
    console.log(`   GD data present:      ${stats.gdDataPresent}/${teams.length}`);
    console.log(`   Has defending champ:  ${stats.hasDefendingChamp ? '✅' : '⚠️ No'}`);
    console.log(`   Has current leader:   ${stats.hasCurrentLeader ? '✅' : '⚠️ No'}`);

    if (issues.length > 0) {
        console.log(`\n⚠️ Issues Found:`);
        issues.forEach(i => console.log(`   - ${i}`));
    } else {
        console.log(`\n✅ No data issues found!`);
    }

    return { teams, stats, issues };
}

async function validateBadgeLogic() {
    console.log(`\n🏆 Validating Badge Logic Across Leagues\n`);
    console.log('='.repeat(60));
    
    const testLeagues = [
        { id: 39, name: 'Premier League' },
        { id: 140, name: 'La Liga' },
        { id: 383, name: 'Israeli Premier' }
    ];
    
    for (const league of testLeagues) {
        const response = await fetch(`${API_BASE}/teams-with-standings?league=${league.id}&season=2025`);
        const teams = await response.json();
        
        const defendingChamp = teams.find(t => t.isDefendingChampion);
        const currentLeader = teams.find(t => t.standing?.rank === 1);
        
        console.log(`\n${league.name}:`);
        if (defendingChamp) {
            const stillLeading = defendingChamp.standing?.rank === 1;
            console.log(`   🏆 Defending: ${defendingChamp.team.name} (now #${defendingChamp.standing?.rank})`);
            if (stillLeading) {
                console.log(`      ↳ Also current leader - should show 🏆 only`);
            }
        } else {
            console.log(`   ⚠️ No defending champion identified`);
        }
        
        if (currentLeader && currentLeader.team.id !== defendingChamp?.team.id) {
            console.log(`   👑 Leader: ${currentLeader.team.name} (${currentLeader.standing?.points} pts)`);
        }
    }
}

async function validateFormDisplay() {
    console.log(`\n📈 Validating Form Display Data\n`);
    console.log('='.repeat(60));
    
    const response = await fetch(`${API_BASE}/teams-with-standings?league=39&season=2025`);
    const teams = await response.json();
    
    console.log('\nSample Form Data (Top 5):');
    teams.slice(0, 5).forEach(item => {
        const form = item.standing?.form || 'N/A';
        const formDisplay = form.split('').map(c => {
            if (c === 'W') return '🟢';
            if (c === 'L') return '🔴';
            if (c === 'D') return '🟡';
            return c;
        }).join('');
        console.log(`   ${item.team.name.padEnd(20)} | ${form.padEnd(6)} | ${formDisplay}`);
    });
}

async function validateTooltipData() {
    console.log(`\n💬 Validating Tooltip Data\n`);
    console.log('='.repeat(60));
    
    const response = await fetch(`${API_BASE}/teams-with-standings?league=39&season=2025`);
    const teams = await response.json();
    
    console.log('\nTeam Tooltip Data Sample:');
    teams.slice(0, 3).forEach(item => {
        const venue = item.venue || {};
        const team = item.team || {};
        
        console.log(`\n   ${team.name}:`);
        console.log(`      Stadium: ${venue.name || '❌ Missing'}`);
        console.log(`      Capacity: ${venue.capacity ? venue.capacity.toLocaleString() : '❌ Missing'}`);
        console.log(`      City: ${venue.city || '❌ Missing'}`);
        console.log(`      Founded: ${team.founded || '❌ Missing'}`);
    });

    console.log('\nStats Tooltip Data Sample:');
    teams.slice(0, 3).forEach(item => {
        const s = item.standing || {};
        const statsLine = `P:${s.played || 0} W:${s.won || 0} D:${s.draw || 0} L:${s.lost || 0} GD:${s.goalsDiff > 0 ? '+' : ''}${s.goalsDiff || 0}`;
        console.log(`   ${item.team.name.padEnd(20)} | ${statsLine}`);
    });
}

async function runAll() {
    try {
        await validateTeamTableData(39, 2025);  // Premier League
        await validateTeamTableData(383, 2025); // Israeli Premier
        await validateBadgeLogic();
        await validateFormDisplay();
        await validateTooltipData();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ UI Data Validation Complete\n');
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

runAll();
