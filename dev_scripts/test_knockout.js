const footballApi = require("../src/api/footballApi");

async function test() {
    // Get all fixtures for Champions League
    const fixtures = await footballApi.getFixturesByLeague(2, 2025, null, null, null);
    
    // Group by round
    const byRound = {};
    fixtures.forEach(f => {
        const round = f.league.round;
        if (!byRound[round]) byRound[round] = [];
        byRound[round].push({
            home: f.teams.home.name,
            away: f.teams.away.name,
            homeWinner: f.teams.home.winner,
            awayWinner: f.teams.away.winner,
            status: f.fixture.status.short,
            score: `${f.goals.home ?? '-'} - ${f.goals.away ?? '-'}`
        });
    });
    
    // Show knockout rounds only
    Object.keys(byRound)
        .filter(r => !r.includes("League Phase"))
        .forEach(round => {
            console.log("\n" + round + " (" + byRound[round].length + " matches):");
            byRound[round].forEach(m => {
                const winner = m.homeWinner ? "✓" : m.awayWinner ? "" : "";
                const loser = m.awayWinner ? "✓" : m.homeWinner ? "" : "";
                console.log(`  ${winner}${m.home} vs ${m.away}${loser} [${m.score}] ${m.status}`);
            });
        });
}

test().catch(console.error);
