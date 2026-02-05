/**
 * Competition Metadata - Static reference data
 * 
 * This file stores metadata about competitions that doesn't change often:
 * - Tournament frequency (every X years)
 * - Competition type (League, Cup, Tournament)
 * - Format (groups + knockout, league only, etc.)
 * 
 * Data source: API-Sports seasons analysis + manual verification
 * Last updated: February 2026
 */

const COMPETITION_METADATA = {
    // ========================================
    // MAJOR INTERNATIONAL TOURNAMENTS
    // ========================================
    
    // World Cup - FIFA
    1: {
        name: 'World Cup',
        type: 'Tournament',
        frequency: 4,
        frequencyLabel: 'Every 4 years',
        format: 'groups_knockout',  // Group stage + knockout
        groupCount: 12,             // 12 groups in 2026 (48 teams)
        teamsPerGroup: 4,
        confederation: 'FIFA',
        notes: '2026 expanded to 48 teams (was 32)'
    },
    
    // Euro Championship - UEFA
    4: {
        name: 'Euro Championship',
        type: 'Tournament',
        frequency: 4,
        frequencyLabel: 'Every 4 years',
        format: 'groups_knockout',
        groupCount: 6,
        teamsPerGroup: 4,
        confederation: 'UEFA',
        notes: '24 teams, best 3rd place teams advance'
    },
    
    // Copa America - CONMEBOL
    9: {
        name: 'Copa America',
        type: 'Tournament',
        frequency: 2,
        frequencyLabel: 'Every 2 years',
        format: 'groups_knockout',
        groupCount: 4,
        teamsPerGroup: 4,
        confederation: 'CONMEBOL',
        notes: 'Sometimes includes guest nations'
    },
    
    // Africa Cup of Nations - CAF
    6: {
        name: 'Africa Cup of Nations',
        type: 'Tournament',
        frequency: 2,
        frequencyLabel: 'Every 2 years',
        format: 'groups_knockout',
        groupCount: 6,
        teamsPerGroup: 4,
        confederation: 'CAF'
    },
    
    // Asian Cup - AFC
    7: {
        name: 'Asian Cup',
        type: 'Tournament',
        frequency: 4,
        frequencyLabel: 'Every 4 years',
        format: 'groups_knockout',
        groupCount: 6,
        teamsPerGroup: 4,
        confederation: 'AFC'
    },
    
    // CONCACAF Gold Cup
    22: {
        name: 'CONCACAF Gold Cup',
        type: 'Tournament',
        frequency: 2,
        frequencyLabel: 'Every 2 years',
        format: 'groups_knockout',
        confederation: 'CONCACAF'
    },
    
    // ========================================
    // UEFA NATIONS LEAGUE
    // ========================================
    
    5: {
        name: 'UEFA Nations League',
        type: 'Tournament',
        frequency: 2,
        frequencyLabel: 'Every 2 years',
        format: 'leagues_knockout',  // 4 leagues (A,B,C,D) + Final Four
        confederation: 'UEFA',
        notes: 'League A-D with promotion/relegation, League A Final Four'
    },
    
    // ========================================
    // CLUB CONTINENTAL COMPETITIONS
    // ========================================
    
    // UEFA Champions League
    2: {
        name: 'UEFA Champions League',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'swiss_knockout',  // 2024+: Swiss system league stage
        confederation: 'UEFA',
        notes: '2024+ format: 36 teams in single league, top 8 to R16, 9-24 playoffs'
    },
    
    // UEFA Europa League
    3: {
        name: 'UEFA Europa League',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'swiss_knockout',
        confederation: 'UEFA',
        notes: 'Same format as Champions League from 2024'
    },
    
    // UEFA Conference League
    848: {
        name: 'UEFA Europa Conference League',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'swiss_knockout',
        confederation: 'UEFA',
        notes: 'Started 2021, Swiss system from 2024'
    },
    
    // Copa Libertadores
    13: {
        name: 'Copa Libertadores',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'groups_knockout',
        confederation: 'CONMEBOL'
    },
    
    // Copa Sudamericana
    11: {
        name: 'Copa Sudamericana',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'groups_knockout',
        confederation: 'CONMEBOL'
    },
    
    // CAF Champions League
    12: {
        name: 'CAF Champions League',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'groups_knockout',
        confederation: 'CAF'
    },
    
    // AFC Champions League
    17: {
        name: 'AFC Champions League',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'groups_knockout',
        confederation: 'AFC'
    },
    
    // ========================================
    // ENGLAND
    // ========================================
    
    39: {
        name: 'Premier League',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league',
        country: 'England',
        teams: 20
    },
    
    45: {
        name: 'FA Cup',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'England'
    },
    
    48: {
        name: 'EFL Cup (League Cup)',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'England'
    },
    
    // ========================================
    // SPAIN
    // ========================================
    
    140: {
        name: 'La Liga',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league',
        country: 'Spain',
        teams: 20
    },
    
    143: {
        name: 'Copa del Rey',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'Spain'
    },
    
    // ========================================
    // GERMANY
    // ========================================
    
    78: {
        name: 'Bundesliga',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league',
        country: 'Germany',
        teams: 18
    },
    
    81: {
        name: 'DFB Pokal',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'Germany'
    },
    
    // ========================================
    // ITALY
    // ========================================
    
    135: {
        name: 'Serie A',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league',
        country: 'Italy',
        teams: 20
    },
    
    137: {
        name: 'Coppa Italia',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'Italy'
    },
    
    // ========================================
    // FRANCE
    // ========================================
    
    61: {
        name: 'Ligue 1',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league',
        country: 'France',
        teams: 18
    },
    
    66: {
        name: 'Coupe de France',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'France'
    },
    
    // ========================================
    // NETHERLANDS
    // ========================================
    
    88: {
        name: 'Eredivisie',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league',
        country: 'Netherlands',
        teams: 18
    },
    
    90: {
        name: 'KNVB Beker',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'Netherlands'
    },
    
    // ========================================
    // PORTUGAL
    // ========================================
    
    94: {
        name: 'Primeira Liga',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league',
        country: 'Portugal',
        teams: 18
    },
    
    96: {
        name: 'Taça de Portugal',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'Portugal'
    },
    
    // ========================================
    // ISRAEL
    // ========================================
    
    383: {
        name: 'Ligat Ha\'al',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league_playoffs',  // Regular season + Championship/Relegation rounds
        country: 'Israel',
        teams: 14,
        notes: 'Split into Championship and Relegation groups after regular season'
    },
    
    384: {
        name: 'State Cup (Gvia HaMedina)',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'Israel'
    },
    
    385: {
        name: 'Toto Cup Ligat Al',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'groups_knockout',
        country: 'Israel',
        notes: 'League cup for top division teams'
    },
    
    659: {
        name: 'Super Cup',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'single_match',
        country: 'Israel',
        notes: 'League champion vs Cup winner'
    },
    
    // ========================================
    // BRAZIL
    // ========================================
    
    71: {
        name: 'Série A',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league',
        country: 'Brazil',
        teams: 20
    },
    
    73: {
        name: 'Copa do Brasil',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'Brazil'
    },
    
    // ========================================
    // ARGENTINA
    // ========================================
    
    128: {
        name: 'Liga Profesional',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league',
        country: 'Argentina',
        teams: 28
    },
    
    130: {
        name: 'Copa Argentina',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'Argentina'
    },
    
    // ========================================
    // TURKEY
    // ========================================
    
    203: {
        name: 'Süper Lig',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league',
        country: 'Turkey',
        teams: 19
    },
    
    206: {
        name: 'Turkish Cup',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'Turkey'
    },
    
    // ========================================
    // SCOTLAND
    // ========================================
    
    179: {
        name: 'Premiership',
        type: 'League',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'league_split',  // Split into top 6 and bottom 6
        country: 'Scotland',
        teams: 12
    },
    
    181: {
        name: 'Scottish Cup',
        type: 'Cup',
        frequency: 1,
        frequencyLabel: 'Annual',
        format: 'knockout',
        country: 'Scotland'
    }
};

// Competition formats explanation
const FORMATS = {
    'league': 'Standard league - all teams play each other home and away',
    'league_playoffs': 'League with playoff rounds (e.g., Israeli Championship/Relegation split)',
    'league_split': 'League splits into groups mid-season (e.g., Scottish Premiership)',
    'knockout': 'Single elimination knockout tournament',
    'groups_knockout': 'Group stage followed by knockout rounds',
    'swiss_knockout': 'Swiss system league stage + knockout (UEFA 2024+ format)',
    'leagues_knockout': 'Multiple leagues with promotion/relegation + finals (Nations League)',
    'single_match': 'Single match (Super Cups)'
};

// Helper function to get metadata
function getMetadata(leagueId) {
    return COMPETITION_METADATA[leagueId] || null;
}

// Helper to check if competition is multi-year tournament
function isMultiYearTournament(leagueId) {
    const meta = COMPETITION_METADATA[leagueId];
    return meta && meta.frequency > 1;
}

// Helper to get competitions by country
function getByCountry(country) {
    return Object.entries(COMPETITION_METADATA)
        .filter(([id, meta]) => meta.country === country)
        .map(([id, meta]) => ({ id: parseInt(id), ...meta }));
}

// Helper to get competitions by confederation
function getByConfederation(confederation) {
    return Object.entries(COMPETITION_METADATA)
        .filter(([id, meta]) => meta.confederation === confederation)
        .map(([id, meta]) => ({ id: parseInt(id), ...meta }));
}

module.exports = {
    COMPETITION_METADATA,
    FORMATS,
    getMetadata,
    isMultiYearTournament,
    getByCountry,
    getByConfederation
};
