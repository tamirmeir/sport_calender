/**
 * Smart Caching Logic for Finished Tournaments
 * 
 * Reduces API calls by checking validation windows before querying API-Sports.
 * Only revalidates when necessary based on nextCheck dates.
 */

const fs = require('fs');
const path = require('path');

class SmartCache {
    constructor() {
        this.finishedPath = path.join(__dirname, '../data/finished_tournaments.json');
        this.masterPath = path.join(__dirname, '../data/world_tournaments_master.json');
    }

    /**
     * Check if a tournament needs revalidation
     */
    needsRevalidation(tournamentId) {
        try {
            const data = JSON.parse(fs.readFileSync(this.finishedPath, 'utf8'));
            const tournament = data.finished_tournaments[tournamentId];
            
            if (!tournament || !tournament.validation) {
                return true; // No validation data = needs check
            }

            const today = new Date().toISOString().split('T')[0];
            const nextCheck = tournament.validation.nextCheck;

            // If today >= nextCheck, we need revalidation
            return today >= nextCheck;
        } catch (error) {
            console.error(`[SmartCache] Error checking validation for ${tournamentId}:`, error.message);
            return true; // On error, assume needs validation
        }
    }

    /**
     * Get cached tournament data
     */
    getCachedTournament(tournamentId) {
        try {
            const data = JSON.parse(fs.readFileSync(this.finishedPath, 'utf8'));
            return data.finished_tournaments[tournamentId] || null;
        } catch (error) {
            console.error(`[SmartCache] Error reading cache:`, error.message);
            return null;
        }
    }

    /**
     * Update tournament validation metadata
     */
    updateValidation(tournamentId, validationData) {
        try {
            const data = JSON.parse(fs.readFileSync(this.finishedPath, 'utf8'));
            
            if (!data.finished_tournaments[tournamentId]) {
                console.warn(`[SmartCache] Tournament ${tournamentId} not found`);
                return false;
            }

            // Update validation metadata
            data.finished_tournaments[tournamentId].validation = {
                ...data.finished_tournaments[tournamentId].validation,
                ...validationData,
                lastChecked: new Date().toISOString()
            };

            // Write back to file
            fs.writeFileSync(this.finishedPath, JSON.stringify(data, null, 2), 'utf8');
            
            console.log(`[SmartCache] Updated validation for tournament ${tournamentId}`);
            return true;
        } catch (error) {
            console.error(`[SmartCache] Error updating validation:`, error.message);
            return false;
        }
    }

    /**
     * Calculate next check date based on confidence level
     */
    calculateNextCheck(confidence = 'high') {
        const today = new Date();
        let daysUntilCheck;

        switch (confidence) {
            case 'verified':
                daysUntilCheck = 90; // 3 months for verified tournaments
                break;
            case 'high':
                daysUntilCheck = 30; // 1 month for high confidence
                break;
            case 'medium':
                daysUntilCheck = 14; // 2 weeks for medium confidence
                break;
            case 'low':
                daysUntilCheck = 7; // 1 week for low confidence
                break;
            default:
                daysUntilCheck = 30;
        }

        const nextCheck = new Date(today);
        nextCheck.setDate(nextCheck.getDate() + daysUntilCheck);
        return nextCheck.toISOString().split('T')[0];
    }

    /**
     * Revalidate a tournament (check if still finished, winner still correct)
     * Returns: { needsUpdate: boolean, newData: object | null }
     */
    async revalidateTournament(tournamentId, footballApi) {
        try {
            const cached = this.getCachedTournament(tournamentId);
            if (!cached) {
                return { needsUpdate: false, newData: null };
            }

            console.log(`[SmartCache] Revalidating tournament ${tournamentId} (${cached.name})`);

            // Check for upcoming matches
            const season = cached.year || new Date().getFullYear();
            const upcomingFixtures = await footballApi.getFixturesByLeague(
                tournamentId, 
                season, 
                1  // next=1
            );

            // If there are upcoming matches, tournament is no longer finished!
            if (upcomingFixtures && upcomingFixtures.length > 0) {
                console.warn(`[SmartCache] ⚠️ Tournament ${tournamentId} has upcoming matches! Needs status change.`);
                return {
                    needsUpdate: true,
                    newData: {
                        status: 'active',
                        shouldRemoveFromFinished: true
                    }
                };
            }

            // Tournament is still finished, update validation
            const nextCheck = this.calculateNextCheck(cached.validation?.confidence || 'high');
            this.updateValidation(tournamentId, {
                nextCheck,
                confidence: 'high',
                method: 'scheduled_revalidation',
                checksPerformed: (cached.validation?.checksPerformed || 0) + 1
            });

            return { needsUpdate: false, newData: null };
        } catch (error) {
            console.error(`[SmartCache] Error revalidating ${tournamentId}:`, error.message);
            
            // On error, reduce confidence and check again sooner
            const nextCheck = this.calculateNextCheck('low');
            this.updateValidation(tournamentId, {
                nextCheck,
                confidence: 'low',
                method: 'error_recovery',
                lastError: error.message
            });

            return { needsUpdate: false, newData: null };
        }
    }

    /**
     * Batch revalidation for multiple tournaments
     */
    async batchRevalidate(tournamentIds, footballApi, maxConcurrent = 3) {
        const results = [];
        const batches = [];

        // Split into batches
        for (let i = 0; i < tournamentIds.length; i += maxConcurrent) {
            batches.push(tournamentIds.slice(i, i + maxConcurrent));
        }

        console.log(`[SmartCache] Batch revalidating ${tournamentIds.length} tournaments in ${batches.length} batches`);

        for (const batch of batches) {
            const batchResults = await Promise.all(
                batch.map(id => this.revalidateTournament(id, footballApi))
            );
            results.push(...batchResults);
            
            // Small delay between batches to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return results;
    }

    /**
     * Get all tournaments that need revalidation today
     */
    getTournamentsNeedingRevalidation() {
        try {
            const data = JSON.parse(fs.readFileSync(this.finishedPath, 'utf8'));
            const tournaments = data.finished_tournaments;
            const needingRevalidation = [];

            for (const [id, tournament] of Object.entries(tournaments)) {
                if (this.needsRevalidation(id)) {
                    needingRevalidation.push({
                        id,
                        name: tournament.name,
                        country: tournament.country,
                        nextCheck: tournament.validation?.nextCheck || 'unknown'
                    });
                }
            }

            return needingRevalidation;
        } catch (error) {
            console.error('[SmartCache] Error getting tournaments needing revalidation:', error.message);
            return [];
        }
    }

    /**
     * Stats about cache efficiency
     */
    getCacheStats() {
        try {
            const data = JSON.parse(fs.readFileSync(this.finishedPath, 'utf8'));
            const tournaments = Object.values(data.finished_tournaments);
            
            const today = new Date().toISOString().split('T')[0];
            const needRevalidation = tournaments.filter(t => 
                !t.validation || !t.validation.nextCheck || today >= t.validation.nextCheck
            ).length;

            const byConfidence = tournaments.reduce((acc, t) => {
                const conf = t.validation?.confidence || 'unknown';
                acc[conf] = (acc[conf] || 0) + 1;
                return acc;
            }, {});

            return {
                total: tournaments.length,
                needRevalidation,
                cached: tournaments.length - needRevalidation,
                cacheHitRate: ((tournaments.length - needRevalidation) / tournaments.length * 100).toFixed(1) + '%',
                byConfidence,
                estimatedApiCallsSaved: tournaments.length - needRevalidation
            };
        } catch (error) {
            console.error('[SmartCache] Error getting stats:', error.message);
            return null;
        }
    }
}

module.exports = new SmartCache();
