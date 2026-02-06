/**
 * Global Tournament Winner Detection System
 * 
 * This system automatically detects winners for finished tournaments worldwide
 * using multiple data sources and verification methods.
 */

const footballApi = require('../api/footballApi');
const fs = require('fs');
const path = require('path');

class GlobalWinnerDetector {
    constructor() {
        this.finishedTournamentsPath = path.join(__dirname, '../data/finished_tournaments.json');
        this.dataSources = {
            primary: 'api-sports',
            fallbacks: ['standings', 'recent-fixtures', 'external-apis']
        };
        
        // Priority levels for different tournament types
        this.tournamentPriority = {
            global: ['1', '4', '9', '15'],  // World Cup, Euro, Copa America, Club World Cup
            continental: ['531', '533', '12', '13', '11', '17'], // UEFA Super Cup, CAF Super Cup, etc.
            major_domestic: ['143', '514', '529', '528', '526', '556'], // Major cups from top countries
            other_domestic: ['385', '659']  // Smaller domestic tournaments
        };
    }

    async detectAllMissingWinners() {
        console.log('🔍 Starting global winner detection...');
        
        const finishedTournaments = this.loadFinishedTournaments();
        const results = {
            detected: 0,
            failed: 0,
            skipped: 0,
            updated: []
        };

        for (const [tournamentId, tournament] of Object.entries(finishedTournaments.finished_tournaments)) {
            if (this.needsWinnerDetection(tournament)) {
                console.log(`\n🏆 Detecting winner for ${tournament.name} (${tournament.country})`);
                
                const winner = await this.detectWinnerForTournament(tournamentId, tournament);
                
                if (winner) {
                    tournament.winner = winner;
                    results.detected++;
                    results.updated.push({
                        id: tournamentId,
                        name: tournament.name,
                        winner: winner.name
                    });
                    console.log(`✅ Found winner: ${winner.name}`);
                } else {
                    results.failed++;
                    console.log(`❌ Could not detect winner`);
                }
            } else {
                results.skipped++;
            }
        }

        // Save updated data
        if (results.detected > 0) {
            this.saveFinishedTournaments(finishedTournaments);
            console.log(`\n🎉 Updated ${results.detected} tournament winners!`);
        }

        return results;
    }

    async detectWinnerForTournament(tournamentId, tournament) {
        const priority = this.getTournamentPriority(tournamentId);
        const methods = this.getDetectionMethods(priority);
        
        // Try multiple detection methods in order
        for (const method of methods) {
            try {
                const winner = await this.tryDetectionMethod(method, tournamentId, tournament);
                if (winner) {
                    return this.formatWinner(winner, method);
                }
            } catch (error) {
                console.log(`⚠️  Method ${method} failed: ${error.message}`);
            }
        }
        
        return null;
    }

    async tryDetectionMethod(method, tournamentId, tournament) {
        switch (method) {
            case 'api-sports-cup-winner':
                return await this.detectFromCupWinner(tournamentId, tournament.year);
            
            case 'api-sports-final-fixture':
                return await this.detectFromFinalFixture(tournamentId, tournament.year);
            
            case 'api-sports-standings':
                return await this.detectFromStandings(tournamentId, tournament.year);
            
            case 'api-sports-recent':
                return await this.detectFromRecentFixtures(tournamentId, tournament.year);
            
            default:
                throw new Error(`Unknown detection method: ${method}`);
        }
    }

    async detectFromCupWinner(leagueId, season) {
        // Use the existing getCupWinner method
        const winner = await footballApi.getCupWinner(leagueId, season);
        return winner;
    }

    async detectFromFinalFixture(leagueId, season) {
        // Get last few fixtures and look for finals
        const fixtures = await footballApi.getFixturesByLeague(leagueId, season, null, 5, 'FT');
        
        if (!fixtures || fixtures.length === 0) return null;
        
        // Look for final, semifinal, or last match
        const finalKeywords = ['final', 'finale', 'final', '決勝'];
        const finalMatch = fixtures.find(fixture => {
            const round = fixture.league?.round?.toLowerCase() || '';
            return finalKeywords.some(keyword => round.includes(keyword));
        });
        
        if (finalMatch) {
            const teams = finalMatch.teams;
            if (teams.home.winner) return teams.home;
            if (teams.away.winner) return teams.away;
        }
        
        return null;
    }

    async detectFromStandings(leagueId, season) {
        const standings = await footballApi.getStandings(leagueId, season);
        if (!standings || standings.length === 0) return null;
        
        // For cup tournaments, standings might show the winner at the top
        const topTeam = standings[0]?.[0];
        if (topTeam && topTeam.rank === 1) {
            return {
                id: topTeam.team.id,
                name: topTeam.team.name,
                logo: topTeam.team.logo
            };
        }
        
        return null;
    }

    async detectFromRecentFixtures(leagueId, season) {
        const fixtures = await footballApi.getFixturesByLeague(leagueId, season, null, 10, 'FT');
        if (!fixtures || fixtures.length === 0) return null;
        
        // Get the last finished fixture (likely the final)
        const lastFixture = fixtures[fixtures.length - 1];
        const teams = lastFixture.teams;
        
        if (teams.home.winner) return teams.home;
        if (teams.away.winner) return teams.away;
        
        return null;
    }

    getTournamentPriority(tournamentId) {
        for (const [priority, ids] of Object.entries(this.tournamentPriority)) {
            if (ids.includes(tournamentId)) return priority;
        }
        return 'other_domestic';
    }

    getDetectionMethods(priority) {
        switch (priority) {
            case 'global':
                return ['api-sports-cup-winner', 'api-sports-final-fixture', 'api-sports-standings'];
            case 'continental':
                return ['api-sports-cup-winner', 'api-sports-final-fixture', 'api-sports-recent'];
            case 'major_domestic':
                return ['api-sports-cup-winner', 'api-sports-recent'];
            default:
                return ['api-sports-cup-winner']; // Best effort for smaller tournaments
        }
    }

    needsWinnerDetection(tournament) {
        return !tournament.winner || 
               tournament.winner === null || 
               tournament.winner?.status === 'research_needed';
    }

    formatWinner(winner, detectionMethod) {
        return {
            name: winner.name,
            logo: winner.logo,
            id: winner.id,
            detected_by: detectionMethod,
            detected_at: new Date().toISOString(),
            confidence: this.calculateConfidence(detectionMethod)
        };
    }

    calculateConfidence(method) {
        const confidenceMap = {
            'api-sports-cup-winner': 'high',
            'api-sports-final-fixture': 'high',
            'api-sports-standings': 'medium',
            'api-sports-recent': 'medium'
        };
        return confidenceMap[method] || 'low';
    }

    loadFinishedTournaments() {
        try {
            return JSON.parse(fs.readFileSync(this.finishedTournamentsPath, 'utf8'));
        } catch (error) {
            console.error('Error loading finished tournaments:', error);
            return { finished_tournaments: {} };
        }
    }

    saveFinishedTournaments(data) {
        try {
            fs.writeFileSync(this.finishedTournamentsPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving finished tournaments:', error);
        }
    }
}

// CLI Interface
if (require.main === module) {
    const detector = new GlobalWinnerDetector();
    
    detector.detectAllMissingWinners()
        .then(results => {
            console.log('\n📊 Final Results:');
            console.log(`✅ Winners detected: ${results.detected}`);
            console.log(`❌ Failed detections: ${results.failed}`);
            console.log(`⏭️  Skipped (already have winners): ${results.skipped}`);
            
            if (results.updated.length > 0) {
                console.log('\n🏆 New Winners Found:');
                results.updated.forEach(update => {
                    console.log(`   ${update.name}: ${update.winner}`);
                });
            }
        })
        .catch(error => {
            console.error('💥 Detection failed:', error);
        });
}

module.exports = GlobalWinnerDetector;