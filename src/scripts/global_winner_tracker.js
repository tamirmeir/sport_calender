// Global Winner Detection System
class GlobalWinnerTracker {
    constructor() {
        this.dataSources = {
            primary: 'api-sports',
            fallbacks: ['espn', 'soccerway', 'wikipedia']
        };
    }

    async detectFinishedTournaments() {
        // Scan all active tournaments for status changes
        const tournaments = await this.getAllActiveTournaments();
        
        for (const tournament of tournaments) {
            if (tournament.status === 'finished' && !tournament.winner) {
                await this.researchwWinner(tournament);
            }
        }
    }

    async researchWinner(tournament) {
        const region = this.getRegion(tournament.country);
        const priority = this.getPriority(tournament.id);
        
        switch(priority) {
            case 'tier1': return await this.tier1Research(tournament);
            case 'tier2': return await this.tier2Research(tournament);
            case 'tier3': return await this.tier3Research(tournament);
            case 'tier4': return await this.tier4Research(tournament);
        }
    }

    async tier1Research(tournament) {
        // High priority: Use multiple sources, require verification
        const sources = await Promise.all([
            this.queryApiSports(tournament),
            this.queryESPN(tournament),
            this.queryOfficialSource(tournament)
        ]);
        
        return this.verifyMultipleSources(sources, { minSources: 2 });
    }

    async tier4Research(tournament) {
        // Lower priority: Best effort, accept single source
        const result = await this.queryApiSports(tournament);
        if (!result) {
            // For smaller tournaments, it's OK to leave as "Winner TBD"
            return { winner: null, status: 'research_needed', priority: 'low' };
        }
        return result;
    }

    getRegion(country) {
        const REGIONS = {
            europe: ['England', 'Spain', 'Germany', 'France', 'Italy', 'Netherlands', 'Portugal'],
            southAmerica: ['Brazil', 'Argentina', 'Uruguay', 'Chile', 'Colombia'],
            africa: ['Egypt', 'Morocco', 'Nigeria', 'South Africa', 'Ghana'],
            asia: ['Japan', 'South Korea', 'China', 'Saudi Arabia', 'Australia'],
            northAmerica: ['USA', 'Mexico', 'Canada'],
            other: ['Israel', 'Finland', 'Belgium', 'Croatia'] // Smaller markets
        };

        for (const [region, countries] of Object.entries(REGIONS)) {
            if (countries.includes(country)) return region;
        }
        return 'other';
    }
}