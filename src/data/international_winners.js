/**
 * International Competition Winners
 * Winners of major international tournaments for national teams
 * 
 * Format: { competitionId: { season: { id, name } } }
 * 
 * VERIFIED via API-Sports Final fixtures
 * Note: For international competitions, teams are national teams not clubs
 */

const INTERNATIONAL_WINNERS = {
    // World Cup (ID: 1) - Every 4 years
    1: {
        2022: { id: 26, name: 'Argentina' },      // Qatar 2022
        2018: { id: 2, name: 'France' },          // Russia 2018
        2014: { id: 25, name: 'Germany' },        // Brazil 2014
        2010: { id: 9, name: 'Spain' },           // South Africa 2010
    },
    
    // Euro Championship (ID: 4) - Every 4 years
    4: {
        2024: { id: 9, name: 'Spain' },           // Germany 2024
        2020: { id: 768, name: 'Italy' },         // Euro 2020 (played 2021)
        2016: { id: 27, name: 'Portugal' },       // France 2016
    },
    
    // Copa America (ID: 9) - Every 4 years (usually)
    9: {
        2024: { id: 26, name: 'Argentina' },      // USA 2024
        2021: { id: 26, name: 'Argentina' },      // Brazil 2021
        2019: { id: 6, name: 'Brazil' },          // Brazil 2019
    },
    
    // Africa Cup of Nations (ID: 6) - Every 2 years
    6: {
        2023: { id: 29, name: 'Ivory Coast' },    // Ivory Coast 2023 (played 2024)
        2021: { id: 16, name: 'Senegal' },        // Cameroon 2021 (played 2022)
        2019: { id: 3, name: 'Algeria' },         // Egypt 2019
    },
    
    // Asian Cup (ID: 7) - Every 4 years
    7: {
        2023: { id: 22, name: 'Qatar' },          // Qatar 2023 (played 2024)
        2019: { id: 22, name: 'Qatar' },          // UAE 2019
    },
    
    // CONCACAF Gold Cup (ID: 22) - Every 2 years
    22: {
        2023: { id: 17, name: 'Mexico' },         // USA/Canada 2023
        2021: { id: 5, name: 'USA' },             // USA 2021
        2019: { id: 17, name: 'Mexico' },         // USA/Caribbean 2019
    },
    
    // UEFA Nations League (ID: 5)
    5: {
        2024: { id: 9, name: 'Spain' },           // 2024-25 edition
        2022: { id: 9, name: 'Spain' },           // 2022-23 edition
        2020: { id: 2, name: 'France' },          // 2020-21 edition
        2018: { id: 27, name: 'Portugal' },       // 2018-19 edition
    },
    
    // Olympic Games Men (ID: 480)
    480: {
        2024: { id: 9, name: 'Spain' },           // Paris 2024
        2020: { id: 6, name: 'Brazil' },          // Tokyo 2020 (played 2021)
    },
};

// World Cup 2026 Participants (48 teams)
// USA, Canada, Mexico hosting - June/July 2026
const WORLD_CUP_2026_TEAMS = {
    // Host nations (automatic qualification)
    5: 'USA',
    7: 'Canada', 
    17: 'Mexico',
    
    // UEFA (16 teams)
    9: 'Spain',
    2: 'France',
    25: 'Germany',
    10: 'England',
    27: 'Portugal',
    1: 'Belgium',
    768: 'Italy',
    1118: 'Netherlands',
    1099: 'Croatia',
    21: 'Denmark',
    1091: 'Albania',
    777: 'Slovenia',
    1095: 'Austria',
    1104: 'Scotland',
    14: 'Serbia',
    1097: 'Switzerland',
    1100: 'Poland',
    773: 'Ukraine',
    
    // CONMEBOL (6 teams)
    26: 'Argentina',
    6: 'Brazil',
    1279: 'Uruguay',
    1573: 'Colombia',
    1595: 'Ecuador',
    1596: 'Paraguay',
    
    // CONCACAF (besides hosts, 3 more)
    1609: 'Panama',
    1600: 'Jamaica',
    1601: 'Costa Rica',
    
    // AFC (8 teams)
    23: 'Japan',
    1530: 'South Korea',
    1569: 'Australia',
    22: 'Qatar',
    1575: 'Saudi Arabia',
    1599: 'Iran',
    1587: 'Iraq',
    1561: 'Uzbekistan',
    
    // CAF (9 teams)
    17: 'Morocco',
    16: 'Senegal',
    1517: 'Nigeria',
    31: 'Egypt',
    1512: 'Algeria',
    29: 'Ivory Coast',
    1504: 'Cameroon',
    1514: 'DR Congo',
    1521: 'Tunisia',
    1108: 'Cape Verde Islands',
    1500: 'Mali',
    
    // OFC (1 team)
    1113: 'New Zealand'
};

// Helper to get international winner
function getInternationalWinner(competitionId, season) {
    const competition = INTERNATIONAL_WINNERS[competitionId];
    return competition ? competition[season] : null;
}

// Get the most recent winner for a competition
function getDefendingChampion(competitionId) {
    const competition = INTERNATIONAL_WINNERS[competitionId];
    if (!competition) return null;
    
    // Get the most recent season
    const seasons = Object.keys(competition).map(Number).sort((a, b) => b - a);
    return seasons.length > 0 ? competition[seasons[0]] : null;
}

// Check if a team is participating in World Cup 2026
function isWorldCup2026Participant(teamId) {
    return WORLD_CUP_2026_TEAMS.hasOwnProperty(teamId);
}

// Get World Cup 2026 team info
function getWorldCup2026Info(teamId) {
    if (WORLD_CUP_2026_TEAMS[teamId]) {
        return { 
            participating: true, 
            name: WORLD_CUP_2026_TEAMS[teamId],
            tournament: 'FIFA World Cup 2026',
            hosts: ['USA', 'Canada', 'Mexico']
        };
    }
    return { participating: false };
}

module.exports = {
    ...INTERNATIONAL_WINNERS,
    WORLD_CUP_2026_TEAMS,
    getInternationalWinner,
    getDefendingChampion,
    isWorldCup2026Participant,
    getWorldCup2026Info
};
