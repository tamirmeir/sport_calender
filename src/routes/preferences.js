const express = require('express');
const db = require('../utils/database');

const router = express.Router();

// Get all favorites
router.get('/favorites', (req, res) => {
  try {
    const favorites = db.getFavorites();
    res.json({ success: true, data: favorites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add to favorites
router.post('/favorites', (req, res) => {
  try {
    const { fixtureId, fixtureData } = req.body;
    
    if (!fixtureId) {
      return res.status(400).json({ success: false, error: 'fixtureId required' });
    }

    db.addFavorite(fixtureId, fixtureData);
    res.json({ success: true, message: 'Added to favorites' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove from favorites
router.delete('/favorites/:fixtureId', (req, res) => {
  try {
    const { fixtureId } = req.params;
    db.removeFavorite(fixtureId);
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get tracked teams
router.get('/teams', (req, res) => {
  try {
    const teams = db.getTeams();
    res.json({ success: true, data: teams });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add tracked team
router.post('/teams', (req, res) => {
  try {
    const { teamId, teamData } = req.body;
    
    if (!teamId) {
      return res.status(400).json({ success: false, error: 'teamId required' });
    }

    db.addTeam(teamId, teamData);
    res.json({ success: true, message: 'Team added to tracking' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove tracked team
router.delete('/teams/:teamId', (req, res) => {
  try {
    const { teamId } = req.params;
    db.removeTeam(teamId);
    res.json({ success: true, message: 'Team removed from tracking' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
