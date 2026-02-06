// Global Tournament Winner Priority System
const TOURNAMENT_PRIORITY = {
    // Tier 1: Global Tournaments (Highest Priority)
    tier1_global: [
        { id: 1, name: "FIFA World Cup", region: "Global", priority: 10 },
        { id: 4, name: "UEFA European Championship", region: "Europe", priority: 10 },
        { id: 9, name: "Copa America", region: "South America", priority: 10 },
        { id: 531, name: "UEFA Super Cup", region: "Europe", priority: 9 },
        { id: 533, name: "CAF Super Cup", region: "Africa", priority: 9 },
        { id: 541, name: "Recopa Sudamericana", region: "South America", priority: 9 }
    ],
    
    // Tier 2: Major Continental Club Competitions
    tier2_continental: [
        // UEFA Champions League, Europa League, Conference League
        // Copa Libertadores, Copa Sudamericana
        // AFC Champions League, CAF Champions League
    ],
    
    // Tier 3: Major Domestic Cups (Top 20 Football Countries)
    tier3_major_domestic: [
        { country: "England", cups: ["FA Cup", "League Cup"] },
        { country: "Spain", cups: ["Copa del Rey", "Supercopa"] },
        { country: "Germany", cups: ["DFB-Pokal", "DFL Supercup"] },
        { country: "France", cups: ["Coupe de France", "Trophée des Champions"] },
        { country: "Italy", cups: ["Coppa Italia", "Supercoppa"] },
        { country: "Brazil", cups: ["Copa do Brasil", "Supercopa"] },
        { country: "Argentina", cups: ["Copa Argentina", "Supercopa"] }
        // ... continue for top 20 countries
    ],
    
    // Tier 4: Smaller Domestic Tournaments (All Other Countries)
    tier4_domestic: [
        { country: "Israel", cups: ["Toto Cup Ligat Al", "Super Cup"] },
        { country: "Finland", cups: ["Finnish Cup", "League Cup"] },
        { country: "Belgium", cups: ["Belgian Cup", "Super Cup"] },
        { country: "Croatia", cups: ["Croatian Cup", "Super Cup"] },
        // ... 150+ countries
    ]
};

// Data Source Strategy by Tier
const DATA_STRATEGY = {
    tier1_global: {
        sources: ["api-sports", "fifa", "uefa", "espn"],
        updateFrequency: "real-time",
        manualVerification: true,
        fallbackSources: 3
    },
    
    tier2_continental: {
        sources: ["api-sports", "espn", "official-websites"],
        updateFrequency: "daily",
        manualVerification: true,
        fallbackSources: 2
    },
    
    tier3_major_domestic: {
        sources: ["api-sports", "espn"],
        updateFrequency: "weekly",
        manualVerification: false,
        fallbackSources: 1
    },
    
    tier4_domestic: {
        sources: ["api-sports", "wikipedia"],
        updateFrequency: "end-of-tournament",
        manualVerification: false,
        fallbackSources: 0,
        acceptIncomplete: true  // OK if some smaller tournaments lack winner data
    }
};