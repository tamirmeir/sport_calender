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


// --- Standard Fixture Routes ---

// Get fixtures for a team
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { next = 10 } = req.query;
    
    const fixtures = await footballApi.getFixturesByTeam(teamId, next);
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

module.exports = router;
