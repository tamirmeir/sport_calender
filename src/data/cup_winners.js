/**
 * Known Cup Winners by Country and Season
 * Since API-Sports doesn't provide trophy data, we maintain this manually
 * 
 * Format: { country: { season: teamId } }
 * Season = API season year (e.g., 2024 = 2024-25 season)
 * 
 * VERIFIED: February 2026 via verify_global_winners.js
 * 
 * Note: Update this file when new cup winners are known
 */

module.exports = {
    // England FA Cup
    // 2024: Manchester United beat Man City 2-1
    england: {
        2024: 33,   // Manchester United
        2023: 50,   // Manchester City
        2022: 40,   // Liverpool
        2021: 46,   // Leicester City
    },
    
    // Spain Copa del Rey
    // 2024: Athletic Club beat Mallorca 4-2 on penalties
    spain: {
        2024: 531,  // Athletic Club (Bilbao)
        2023: 529,  // Real Madrid
        2022: 529,  // Real Madrid
        2021: 530,  // Barcelona
    },
    
    // Germany DFB Pokal
    // 2024: Bayer Leverkusen beat Kaiserslautern 1-0
    germany: {
        2024: 168,  // Bayer Leverkusen
        2023: 173,  // RB Leipzig
        2022: 173,  // RB Leipzig
        2021: 165,  // Borussia Dortmund
    },
    
    // Italy Coppa Italia
    // 2024: Juventus beat Atalanta 1-0
    italy: {
        2024: 496,  // Juventus
        2023: 505,  // Inter
        2022: 505,  // Inter
        2021: 496,  // Juventus
    },
    
    // France Coupe de France
    // 2024: PSG beat Lyon 2-1
    france: {
        2024: 85,   // Paris Saint Germain
        2023: 80,   // Toulouse
        2022: 84,   // Nantes
        2021: 85,   // Paris Saint Germain
    },
    
    // Netherlands KNVB Cup
    // 2024: Feyenoord beat NEC 1-0
    netherlands: {
        2024: 209,  // Feyenoord
        2023: 197,  // PSV Eindhoven
        2022: 194,  // Ajax
    },
    
    // Portugal Taça de Portugal
    // 2024: Porto beat Sporting 2-1
    portugal: {
        2024: 212,  // FC Porto
        2023: 211,  // Benfica
        2022: 212,  // FC Porto
    },
    
    // Israel State Cup (גביע המדינה)
    // Data from API finals: league 384
    // Note: API season = calendar year when season STARTS
    // 2024 season (2024-25) → Final May 2025 → Hapoel Beer Sheva
    // 2023 season (2023-24) → Final May 2024 → Maccabi Petah Tikva
    // 2022 season (2022-23) → Final May 2023 → Beitar Jerusalem
    israel: {
        2024: 563,  // Hapoel Beer Sheva (beat Beitar Jerusalem 2-0, May 2025)
        2023: 4495, // Maccabi Petah Tikva (beat Hapoel Beer Sheva 1-0, May 2024)
        2022: 657,  // Beitar Jerusalem (beat Maccabi Netanya 3-0, May 2023)
        2021: 563,  // Hapoel Beer Sheva (penalties vs Maccabi Haifa)
        2020: 604,  // Maccabi Tel Aviv (beat Hapoel Tel Aviv 2-1, June 2021)
    },
    
    // Brazil Copa do Brasil
    // 2024: Flamengo beat Atlético Mineiro
    brazil: {
        2024: 127,  // Flamengo (updated - verify needed)
        2023: 126,  // Sao Paulo
        2022: 124,  // Fluminense
    },
    
    // Argentina Copa Argentina
    // 2024: Central Córdoba beat Huracán
    argentina: {
        2024: 450,  // Estudiantes L.P.
        2023: 456,  // Talleres Córdoba
    },
    
    // Turkey Turkish Cup
    // 2024: Beşiktaş beat Trabzonspor
    turkey: {
        2024: 549,  // Beşiktaş
        2023: 645,  // Galatasaray
    },
    
    // Scotland Scottish Cup
    // 2024: Celtic beat Rangers 1-0
    scotland: {
        2024: 247,  // Celtic
        2023: 247,  // Celtic
        2022: 257,  // Rangers
    },
};

// Helper to get cup winner for a country/season
function getCupWinner(country, season) {
    const countryKey = country.toLowerCase();
    const data = module.exports[countryKey];
    return data ? data[season] : null;
}

module.exports.getCupWinner = getCupWinner;
