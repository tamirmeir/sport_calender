require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    FOOTBALL_API_KEY: process.env.FOOTBALL_API_KEY,
    API_BASE_URL: process.env.API_BASE_URL || 'https://v3.football.api-sports.io',
    IS_DEMO_MODE: process.env.FOOTBALL_API_KEY === 'demo_key_12345'
};
