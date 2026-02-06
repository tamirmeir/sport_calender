require('dotenv').config();

/**
 * Dynamic Season Calculator
 * Returns the appropriate season year based on current date
 * @param {string} type - 'academic' (Jul-Jun like European leagues), 'calendar' (Jan-Dec like MLS), or 'asian' (Aug-Jun like Vietnam, Thailand)
 * @returns {number} The season year
 */
function getSeasonYear(type = 'academic') {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    if (type === 'calendar') {
        return year;
    }
    
    if (type === 'asian') {
        // Asian leagues: Aug-Jun, season named after END year
        // Before August = current year's season, August onwards = next year's season
        return month >= 7 ? year + 1 : year;
    }
    
    // Academic: Before July = previous year's season, July onwards = current year
    return month < 6 ? year - 1 : year;
}

/**
 * Get rolling season window for league validation
 * @returns {Object} { min: number, max: number }
 */
function getSeasonWindow() {
    const year = new Date().getFullYear();
    return {
        min: year - 1,
        max: year + 1
    };
}

module.exports = {
    PORT: process.env.PORT || 3000,
    FOOTBALL_API_KEY: process.env.FOOTBALL_API_KEY,
    API_BASE_URL: process.env.API_BASE_URL || 'https://v3.football.api-sports.io',
    IS_DEMO_MODE: process.env.FOOTBALL_API_KEY === 'demo_key_12345',
    BACKEND_URL: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
    
    // Dynamic Season Utilities
    getSeasonYear,
    getSeasonWindow
};
