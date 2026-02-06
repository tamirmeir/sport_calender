// User-facing solution for global tournament winners
const GLOBAL_WINNER_DISPLAY = {
    // High-confidence winners (multiple sources verified)
    verified: {
        display: "🏆 Real Madrid (verified)",
        confidence: "high",
        sources: ["api-sports", "uefa", "espn"]
    },
    
    // Single-source winners (good confidence)
    singleSource: {
        display: "🏆 Barcelona (API-Sports)",
        confidence: "medium",
        sources: ["api-sports"]
    },
    
    // Research needed (transparent about limitations)
    researchNeeded: {
        display: "🔍 Winner TBD - Researching...",
        confidence: "pending",
        note: "This tournament has finished but winner data is being verified"
    },
    
    // Low priority tournaments (honest about scope)
    lowPriority: {
        display: "ℹ️ Winner info not tracked",
        confidence: "n/a",
        note: "Winner tracking focuses on major tournaments. Contribute data via GitHub!"
    }
};

// Regional prioritization for users
const USER_REGIONAL_PRIORITY = {
    // Users from Israel will see Israeli tournaments prioritized
    israel: { prioritize: ["Israel"], secondaryRegions: ["Europe", "Global"] },
    
    // Users from Brazil prioritize South American + Global
    brazil: { prioritize: ["Brazil", "South America"], secondaryRegions: ["Global", "Europe"] },
    
    // Default: Global focus
    default: { prioritize: ["Global", "Europe"], secondaryRegions: ["All"] }
};