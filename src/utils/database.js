const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/database.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const defaultDB = {
      favorites: [],
      teams: [],
      notifications: [],
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
  }
}

// Read database
const readDB = () => {
  const data = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(data);
};

// Write database
const writeDB = (data) => {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// Add favorite
function addFavorite(fixtureId, fixtureData) {
  const db = readDB();
  if (!db.favorites.find(f => f.id === fixtureId)) {
    db.favorites.push({
      id: fixtureId,
      ...fixtureData,
      addedAt: new Date().toISOString()
    });
    writeDB(db);
  }
  return true;
}

// Remove favorite
function removeFavorite(fixtureId) {
  const db = readDB();
  db.favorites = db.favorites.filter(f => f.id !== fixtureId);
  writeDB(db);
  return true;
}

// Get favorites
function getFavorites() {
  const db = readDB();
  return db.favorites;
}

// Add team
function addTeam(teamId, teamData) {
  const db = readDB();
  if (!db.teams.find(t => t.id === teamId)) {
    db.teams.push({
      id: teamId,
      ...teamData,
      addedAt: new Date().toISOString()
    });
    writeDB(db);
  }
  return true;
}

// Remove team
function removeTeam(teamId) {
  const db = readDB();
  db.teams = db.teams.filter(t => t.id !== teamId);
  writeDB(db);
  return true;
}

// Get teams
function getTeams() {
  const db = readDB();
  return db.teams;
}

// Initialize on load
initDB();

module.exports = {
  addFavorite,
  removeFavorite,
  getFavorites,
  addTeam,
  removeTeam,
  getTeams,
  readDB,
  writeDB
};
