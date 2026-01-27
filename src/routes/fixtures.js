const express = require('express');
const { getFixturesByTeam, getFixtureById, getFixturesByDate, getPastFixtures } = require('../api/footballApi');

const router = express.Router();

// Get fixtures for a team
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { next = 10 } = req.query;
    
    const fixtures = await getFixturesByTeam(teamId, next);
    res.json(fixtures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get fixture by ID
router.get('/:fixtureId', async (req, res) => {
  try {
    const { fixtureId } = req.params;
    
    const fixture = await getFixtureById(fixtureId);
    res.json(fixture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get fixtures by date
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const fixtures = await getFixturesByDate(date);
    res.json(fixtures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get history for a team
router.get('/history/:teamId', async (req, res) => {
  const { teamId } = req.params;
  const { last = 10 } = req.query;
  
  const history = await getPastFixtures(teamId, last);
  res.json(history);
});

module.exports = router;
