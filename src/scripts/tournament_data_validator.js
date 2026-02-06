/**
 * Tournament Winner Data Validation System
 * Validates winner data from API responses and cross-checks reliability
 */

const footballApi = require('../api/footballApi');
const fs = require('fs');
const path = require('path');

class TournamentDataValidator {
    constructor() {
        this.validationRules = {
            // Required fields in API response
            requiredFields: ['fixture', 'teams', 'league'],
            requiredTeamFields: ['id', 'name', 'logo', 'winner'],
            requiredFixtureFields: ['id', 'status', 'date'],
            
            // Valid match statuses that indicate a finished match
            validFinishedStatuses: ['FT', 'AET', 'PEN'],
            
            // Validation thresholds
            minTeamNameLength: 2,
            maxTeamNameLength: 50,
            validTeamIdRange: { min: 1, max: 999999 },
            
            // Date validation
            maxFutureDays: 1, // Match can't be more than 1 day in the future
            minPastYears: 10,  // Match can't be older than 10 years
        };
        
        this.validationResults = {
            passed: [],
            failed: [],
            warnings: []
        };
    }

    async validateTournamentWinner(tournamentId, season, tournamentName) {
        console.log(`\n🔍 Validating ${tournamentName} (ID: ${tournamentId}, Season: ${season})`);
        
        const validation = {
            tournamentId,
            season,
            tournamentName,
            timestamp: new Date().toISOString(),
            checks: {},
            overall: 'unknown',
            confidence: 0,
            warnings: [],
            errors: []
        };

        try {
            // 1. Validate API Response Structure
            const apiData = await this.validateAPIResponse(tournamentId, season);
            validation.checks.apiResponse = apiData;

            if (!apiData.valid) {
                validation.overall = 'failed';
                validation.errors.push('Invalid API response structure');
                return validation;
            }

            // 2. Validate Final Match Data
            const finalMatch = apiData.data.response[0];
            const matchValidation = this.validateMatchData(finalMatch);
            validation.checks.matchData = matchValidation;

            // 3. Validate Winner Logic
            const winnerValidation = this.validateWinnerLogic(finalMatch);
            validation.checks.winnerLogic = winnerValidation;

            // 4. Cross-validate with multiple API calls
            const crossValidation = await this.crossValidateWinner(tournamentId, season);
            validation.checks.crossValidation = crossValidation;

            // 5. Validate Team Data
            const winner = this.extractWinner(finalMatch);
            if (winner) {
                const teamValidation = this.validateTeamData(winner);
                validation.checks.teamData = teamValidation;
            }

            // Calculate overall confidence and status
            const confidence = this.calculateConfidence(validation.checks);
            validation.confidence = confidence;
            validation.overall = confidence >= 0.8 ? 'passed' : 
                                confidence >= 0.6 ? 'warning' : 'failed';

            console.log(`   Result: ${validation.overall.toUpperCase()} (${Math.round(confidence * 100)}% confidence)`);
            
            return validation;

        } catch (error) {
            validation.overall = 'error';
            validation.errors.push(`Validation error: ${error.message}`);
            console.log(`   Result: ERROR - ${error.message}`);
            return validation;
        }
    }

    async validateAPIResponse(leagueId, season) {
        try {
            // Make direct API call to get raw response
            const response = await footballApi.getFixturesByLeague(leagueId, season, null, 5, 'FT');
            
            const validation = {
                valid: false,
                data: response,
                errors: [],
                warnings: []
            };

            // Check if response exists
            if (!response) {
                validation.errors.push('No API response received');
                return validation;
            }

            // Handle both array and object responses from our API wrapper
            const fixtures = Array.isArray(response) ? response : response.response || [];

            // Check if we have fixtures
            if (fixtures.length === 0) {
                validation.warnings.push('No fixtures found for this tournament');
                validation.valid = true; // Empty is valid, just means no data
                return validation;
            }

            // Find final match
            const finalMatches = fixtures.filter(fixture => 
                fixture.league?.round?.toLowerCase().includes('final')
            );

            if (finalMatches.length === 0) {
                validation.warnings.push('No final match found');
                // Return success with the fixtures we have
                validation.valid = true;
                validation.data = { response: fixtures };
                return validation;
            }

            validation.valid = true;
            validation.finalMatches = finalMatches;
            validation.data = { response: finalMatches };
            return validation;

        } catch (error) {
            return {
                valid: false,
                errors: [`API call failed: ${error.message}`],
                data: null
            };
        }
    }

    validateMatchData(match) {
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            score: 0
        };

        if (!match) {
            validation.valid = false;
            validation.errors.push('No match data provided');
            return validation;
        }

        // Check required fields
        this.validationRules.requiredFields.forEach(field => {
            if (!match[field]) {
                validation.errors.push(`Missing required field: ${field}`);
                validation.valid = false;
            }
        });

        // Validate match status
        const status = match.fixture?.status?.short;
        if (!this.validationRules.validFinishedStatuses.includes(status)) {
            validation.warnings.push(`Unusual match status: ${status}`);
            validation.score -= 0.2;
        } else {
            validation.score += 0.3;
        }

        // Validate date
        const matchDate = new Date(match.fixture?.date);
        const now = new Date();
        const daysDiff = (now - matchDate) / (1000 * 60 * 60 * 24);

        if (daysDiff < -this.validationRules.maxFutureDays) {
            validation.warnings.push('Match is in the future');
            validation.score -= 0.1;
        } else if (daysDiff > this.validationRules.minPastYears * 365) {
            validation.warnings.push('Match is very old');
            validation.score -= 0.1;
        } else {
            validation.score += 0.2;
        }

        // Validate round
        const round = match.league?.round;
        if (round && round.toLowerCase().includes('final')) {
            validation.score += 0.3;
        } else {
            validation.warnings.push(`Not a final round: ${round}`);
        }

        validation.score = Math.max(0, Math.min(1, validation.score));
        return validation;
    }

    validateWinnerLogic(match) {
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            score: 0,
            winnerFound: false
        };

        if (!match?.teams) {
            validation.valid = false;
            validation.errors.push('No team data in match');
            return validation;
        }

        const homeTeam = match.teams.home;
        const awayTeam = match.teams.away;

        // Check if exactly one team is marked as winner
        const homeWinner = homeTeam?.winner === true;
        const awayWinner = awayTeam?.winner === true;

        if (homeWinner && awayWinner) {
            validation.errors.push('Both teams marked as winner');
            validation.valid = false;
        } else if (!homeWinner && !awayWinner) {
            validation.warnings.push('No team marked as winner');
            validation.score -= 0.3;
        } else {
            validation.winnerFound = true;
            validation.score += 0.5;
        }

        // Validate against goals if available
        const homeGoals = match.goals?.home;
        const awayGoals = match.goals?.away;

        if (typeof homeGoals === 'number' && typeof awayGoals === 'number') {
            const goalWinner = homeGoals > awayGoals ? 'home' : 
                             awayGoals > homeGoals ? 'away' : null;
            const markedWinner = homeWinner ? 'home' : awayWinner ? 'away' : null;

            if (goalWinner && markedWinner === goalWinner) {
                validation.score += 0.3;
            } else if (homeGoals === awayGoals) {
                validation.warnings.push('Match ended in a draw - check for penalties/extra time');
                validation.score += 0.1; // Still valid for cup finals with penalties
            } else {
                validation.warnings.push('Winner marking does not match goal score');
                validation.score -= 0.2;
            }
        }

        validation.score = Math.max(0, Math.min(1, validation.score));
        return validation;
    }

    async crossValidateWinner(leagueId, season) {
        const validation = {
            methods: {},
            consensus: false,
            conflictingResults: [],
            score: 0
        };

        try {
            // Method 1: getCupWinner (our primary method)
            const cupWinner = await footballApi.getCupWinner(leagueId, season);
            validation.methods.cupWinner = {
                success: !!cupWinner,
                winner: cupWinner?.name || null
            };

            // Method 2: Get standings (fallback method)
            const standings = await footballApi.getStandings(leagueId, season);
            const standingsWinner = standings?.[0]?.[0]?.team?.name;
            validation.methods.standings = {
                success: !!standingsWinner,
                winner: standingsWinner || null
            };

            // Method 3: Recent fixtures analysis
            const recentFixtures = await footballApi.getFixturesByLeague(leagueId, season, null, 10, 'FT');
            const fixtures = Array.isArray(recentFixtures) ? recentFixtures : recentFixtures?.response || [];
            const lastMatch = fixtures[fixtures.length - 1];
            let recentWinner = null;
            
            if (lastMatch?.teams) {
                recentWinner = lastMatch.teams.home.winner ? lastMatch.teams.home.name :
                              lastMatch.teams.away.winner ? lastMatch.teams.away.name : null;
            }
            
            validation.methods.recentFixtures = {
                success: !!recentWinner,
                winner: recentWinner
            };

            // Check for consensus
            const winners = Object.values(validation.methods)
                .filter(method => method.success && method.winner)
                .map(method => method.winner);

            if (winners.length >= 2) {
                const uniqueWinners = [...new Set(winners)];
                if (uniqueWinners.length === 1) {
                    validation.consensus = true;
                    validation.score = 0.8;
                } else {
                    validation.conflictingResults = uniqueWinners;
                    validation.score = 0.3;
                }
            } else if (winners.length === 1) {
                validation.score = 0.5; // Single source
            }

        } catch (error) {
            validation.error = error.message;
            validation.score = 0;
        }

        return validation;
    }

    validateTeamData(team) {
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            score: 0
        };

        if (!team) {
            validation.valid = false;
            validation.errors.push('No team data provided');
            return validation;
        }

        // Validate team ID
        if (!team.id || typeof team.id !== 'number') {
            validation.errors.push('Invalid team ID');
            validation.valid = false;
        } else if (team.id < this.validationRules.validTeamIdRange.min || 
                  team.id > this.validationRules.validTeamIdRange.max) {
            validation.warnings.push('Team ID outside expected range');
        } else {
            validation.score += 0.3;
        }

        // Validate team name
        if (!team.name || typeof team.name !== 'string') {
            validation.errors.push('Invalid team name');
            validation.valid = false;
        } else if (team.name.length < this.validationRules.minTeamNameLength) {
            validation.warnings.push('Team name too short');
        } else if (team.name.length > this.validationRules.maxTeamNameLength) {
            validation.warnings.push('Team name too long');
        } else {
            validation.score += 0.4;
        }

        // Validate logo URL
        if (!team.logo || typeof team.logo !== 'string') {
            validation.warnings.push('No team logo provided');
        } else if (!team.logo.startsWith('http')) {
            validation.warnings.push('Invalid logo URL format');
        } else {
            validation.score += 0.3;
        }

        validation.score = Math.max(0, Math.min(1, validation.score));
        return validation;
    }

    extractWinner(match) {
        if (!match?.teams) return null;
        
        if (match.teams.home?.winner === true) {
            return match.teams.home;
        } else if (match.teams.away?.winner === true) {
            return match.teams.away;
        }
        
        return null;
    }

    calculateConfidence(checks) {
        let totalScore = 0;
        let weightedSum = 0;
        const weights = {
            apiResponse: 0.2,
            matchData: 0.3,
            winnerLogic: 0.3,
            crossValidation: 0.15,
            teamData: 0.05
        };

        Object.entries(weights).forEach(([check, weight]) => {
            if (checks[check] && typeof checks[check].score === 'number') {
                weightedSum += checks[check].score * weight;
                totalScore += weight;
            }
        });

        return totalScore > 0 ? weightedSum / totalScore : 0;
    }

    async validateMultipleTournaments(tournaments) {
        console.log(`🔍 TOURNAMENT WINNER DATA VALIDATION`);
        console.log('=' .repeat(50));
        
        const results = {
            total: tournaments.length,
            passed: 0,
            warnings: 0,
            failed: 0,
            details: []
        };

        for (const tournament of tournaments) {
            const validation = await this.validateTournamentWinner(
                tournament.id, 
                tournament.season, 
                tournament.name
            );
            
            results.details.push(validation);
            
            if (validation.overall === 'passed') {
                results.passed++;
            } else if (validation.overall === 'warning') {
                results.warnings++;
            } else {
                results.failed++;
            }
        }

        this.generateValidationReport(results);
        return results;
    }

    generateValidationReport(results) {
        console.log(`\n📊 VALIDATION SUMMARY:`);
        console.log(`   Total: ${results.total}`);
        console.log(`   ✅ Passed: ${results.passed}`);
        console.log(`   ⚠️  Warnings: ${results.warnings}`);
        console.log(`   ❌ Failed: ${results.failed}`);
        
        console.log(`\n📋 DETAILED RESULTS:`);
        results.details.forEach(detail => {
            const status = detail.overall === 'passed' ? '✅' :
                          detail.overall === 'warning' ? '⚠️' : '❌';
            const confidence = Math.round(detail.confidence * 100);
            console.log(`   ${status} ${detail.tournamentName}: ${confidence}% confidence`);
            
            if (detail.errors.length > 0) {
                detail.errors.forEach(error => console.log(`      ❌ ${error}`));
            }
            if (detail.warnings.length > 0) {
                detail.warnings.forEach(warning => console.log(`      ⚠️  ${warning}`));
            }
        });
    }
}

// CLI interface for testing
if (require.main === module) {
    const validator = new TournamentDataValidator();
    
    const testTournaments = [
        { id: 385, name: 'Toto Cup Ligat Al', season: 2025 },
        { id: 659, name: 'Israeli Super Cup', season: 2025 },
        { id: 533, name: 'CAF Super Cup', season: 2025 },
        { id: 1, name: 'World Cup', season: 2022 },
        { id: 4, name: 'Euro Championship', season: 2024 }
    ];
    
    validator.validateMultipleTournaments(testTournaments)
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('💥 Validation failed:', error);
            process.exit(1);
        });
}

module.exports = TournamentDataValidator;