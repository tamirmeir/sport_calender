const express = require('express');

const footballApi = require('../api/footballApi');

const router = express.Router();

// --- V2 Explorer Routes ---

// Get all countries
router.get('/countries', async (req, res) => {
    try {
        const countries = await footballApi.getCountries();
        res.json(countries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get leagues by country
router.get('/leagues', async (req, res) => {
    try {
        const { country } = req.query;
        if (!country) return res.status(400).json({ error: 'Country parameter required' });
        
        const leagues = await footballApi.getLeagues(country);
        res.json(leagues);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get teams by league and season
router.get('/teams', async (req, res) => {
    try {
        const { league, season, country, national } = req.query;
        
        // --- NEW: National Team Fetch Logic ---
        if (country && national === 'true') {
             const teams = await footballApi.getNationalTeam(country);
             return res.json(teams);
        }

        if (!league) return res.status(400).json({ error: 'League parameter required' });
        
        const seasonYear = season || new Date().getFullYear();
        const teams = await footballApi.getTeams(league, seasonYear);
        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get standings (for strict filtering of participants)
router.get('/standings', async (req, res) => {
    try {
        const { league, season } = req.query;
        if (!league) return res.status(400).json({ error: 'League parameter required' });
        
        const seasonYear = season || new Date().getFullYear();
        const standings = await footballApi.getStandings(league, seasonYear);
        res.json({ response: standings }); // Wrap in response object to match API-Sports format
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get fixtures by league (Heuristic for active teams)
router.get('/fixtures', async (req, res) => {
    console.log('[API] Hit /fixtures endpoint with query:', req.query);
    try {
        const { league, season, next, last, status } = req.query;
        if (!league) return res.status(400).json({ error: 'League parameter required' });

        const seasonYear = season || new Date().getFullYear();
        // nextCount logic moved inside API helper which handles priority
        
        const fixtures = await footballApi.getFixturesByLeague(league, seasonYear, next, last, status);
        res.json(fixtures);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- NEW: Universal Active Teams Logic (The Funnel) ---
router.get('/active-teams', async (req, res) => {
    try {
        const { league, season } = req.query;
        if (!league) return res.status(400).json({ error: 'League ID required' });
        
        let seasonYear = season || new Date().getFullYear();
        
        // First attempt with provided/default season
        let activeTeams = await footballApi.getActiveTournamentTeams(league, seasonYear);
        
        // If no teams found, try to get the league's actual current season
        if (activeTeams.length === 0 && seasonYear) {
            console.log(`[Route] No teams found for season ${seasonYear}, checking league's current season...`);
            const currentSeason = await footballApi.getCurrentSeasonForLeague(league);
            
            if (currentSeason && currentSeason != seasonYear) {
                console.log(`[Route] Retrying with league's current season: ${currentSeason}`);
                activeTeams = await footballApi.getActiveTournamentTeams(league, currentSeason);
            }
        }
        
        res.json(activeTeams);
        
    } catch (error) {
        console.error("Active Teams Error:", error);
        res.status(500).json({ error: error.message });
    }
});



// --- Standard Fixture Routes ---

// Get fixtures for a team
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { next = 10, league } = req.query;
    
    // Pass league filter if provided (e.g. for Continent -> Competition view)
    const fixtures = await footballApi.getFixturesByTeam(teamId, next, league);
    res.json(fixtures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get fixture by ID
router.get('/:fixtureId', async (req, res) => {
  try {
    const { fixtureId } = req.params;
    
    // Check if it's a number to avoid collision with other routes if placed incorrectly
    if (isNaN(fixtureId)) return res.status(400).json({ error: "Invalid ID" });

    const fixture = await footballApi.getFixtureById(fixtureId);
    res.json(fixture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get fixtures by date
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const fixtures = await footballApi.getFixturesByDate(date);
    res.json(fixtures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get history for a team
router.get('/history/:teamId', async (req, res) => {
  const { teamId } = req.params;
  const { last = 10 } = req.query;
  
  const history = await footballApi.getPastFixtures(teamId, last);
  res.json(history);
});

// Get all leagues/competitions a team is currently participating in
router.get('/team-leagues/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { national } = req.query;
    const isNational = national === 'true';
    
    const leagues = await footballApi.getLeaguesByTeam(teamId, isNational);
    res.json(leagues);
  } catch (error) {
    console.error('[API] Error fetching team leagues:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
