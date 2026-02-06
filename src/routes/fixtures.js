const express = require('express');
const footballApi = require('../api/footballApi');
const fs = require('fs');
const path = require('path');
const internationalWinners = require('../data/international_winners');
const { getSeasonYear } = require('../utils/config');

const router = express.Router();

// Load unified tournament data system
const loadWorldTournamentsMaster = () => {
    try {
        const masterPath = path.join(__dirname, '../../src/data/world_tournaments_master.json');
        return JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    } catch (error) {
        console.error('Error loading world tournaments master:', error);
        return { metadata: {}, tournaments: {} };
    }
};

const loadRegionsConfig = () => {
    try {
        const regionsPath = path.join(__dirname, '../../src/data/regions_config.json');
        return JSON.parse(fs.readFileSync(regionsPath, 'utf8'));
    } catch (error) {
        console.error('Error loading regions config:', error);
        return { regions: {}, seasonPatterns: {} };
    }
};

const loadStatusRules = () => {
    try {
        const statusPath = path.join(__dirname, '../../src/data/status_rules.json');
        return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    } catch (error) {
        console.error('Error loading status rules:', error);
        return { statusRules: {} };
    }
};

const loadCountryMappings = () => {
    try {
        const mappingsPath = path.join(__dirname, '../../src/data/country_mappings.json');
        return JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    } catch (error) {
        console.error('Error loading country mappings:', error);
        return { countryOverrides: {}, leagueCountryMapping: {} };
    }
};

const loadDisplayConfig = () => {
    try {
        const displayPath = path.join(__dirname, '../../src/data/display_config.json');
        return JSON.parse(fs.readFileSync(displayPath, 'utf8'));
    } catch (error) {
        console.error('Error loading display config:', error);
        return { cardTypes: {}, badges: {}, statusMessages: {} };
    }
};

// ================================
// NEW UNIFIED TOURNAMENT DATA API
// ================================

// 🌍 Get master tournament database
router.get('/tournaments/master', async (req, res) => {
    try {
        const masterData = loadWorldTournamentsMaster();
        const regionsConfig = loadRegionsConfig();
        const displayConfig = loadDisplayConfig();
        
        // Enrich data with current status calculations
        const currentMonth = new Date().getMonth() + 1;
        const enrichedTournaments = {};
        
        Object.entries(masterData.tournaments).forEach(([id, tournament]) => {
            const region = regionsConfig.regions[tournament.region];
            const statusRules = loadStatusRules();
            
            // Calculate current status based on region and month
            let currentStatus = tournament.status.current;
            if (region && statusRules.statusRules.leagues[region.defaultPattern]) {
                const monthStatus = statusRules.statusRules.leagues[region.defaultPattern].months[currentMonth];
                if (monthStatus) {
                    currentStatus = monthStatus.status;
                }
            }
            
            enrichedTournaments[id] = {
                ...tournament,
                calculatedStatus: {
                    current: currentStatus,
                    month: currentMonth,
                    lastCalculated: new Date().toISOString()
                }
            };
        });
        
        res.json({
            ...masterData,
            tournaments: enrichedTournaments,
            regions: regionsConfig.regions,
            displayConfig: displayConfig.cardTypes
        });
    } catch (error) {
        console.error('Error serving master tournament data:', error);
        res.status(500).json({ error: error.message });
    }
});

// 📅 Get all tournaments with current status (EARLY PLACEMENT TO AVOID CONFLICTS)
router.get('/tournaments/status/all', async (req, res) => {
    try {
        const masterData = loadWorldTournamentsMaster();
        const statusRules = loadStatusRules();
        const currentMonth = new Date().getMonth() + 1;
        
        const allTournamentsWithStatus = {};
        Object.entries(masterData.tournaments).forEach(([id, tournament]) => {
            // Calculate current status based on rules
            let calculatedStatus = tournament.status.current;
            
            // If it's finished, keep as finished
            if (tournament.status.current === 'finished' && tournament.winner.hasWinner) {
                calculatedStatus = 'finished';
            }
            // If it's vacation status, use vacation
            else if (tournament.status.current === 'vacation' || tournament.status.current === 'off_season') {
                calculatedStatus = 'vacation';
            }
            // Otherwise, use live calculation based on schedule pattern
            else if (statusRules.statusRules.leagues[tournament.schedule.pattern]) {
                const monthStatus = statusRules.statusRules.leagues[tournament.schedule.pattern].months[currentMonth];
                if (monthStatus) {
                    calculatedStatus = monthStatus.status;
                }
            }
            
            allTournamentsWithStatus[id] = {
                status: calculatedStatus,
                winner: tournament.winner.hasWinner ? {
                    name: tournament.winner.team,
                    logo: tournament.winner.teamLogo
                } : null
            };
        });
        
        res.json({
            tournaments: allTournamentsWithStatus,
            month: currentMonth,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error serving all tournaments status:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Get tournaments by country
router.get('/tournaments/country/:countryName', async (req, res) => {
    try {
        const countryName = req.params.countryName;
        const masterData = loadWorldTournamentsMaster();
        const displayConfig = loadDisplayConfig();
        
        const countryTournaments = Object.entries(masterData.tournaments)
            .filter(([id, tournament]) => 
                tournament.country.toLowerCase() === countryName.toLowerCase() &&
                tournament.display.showInCountryHub
            )
            .sort(([,a], [,b]) => a.display.priority - b.display.priority)
            .reduce((acc, [id, tournament]) => {
                acc[id] = tournament;
                return acc;
            }, {});
        
        res.json({
            country: countryName,
            count: Object.keys(countryTournaments).length,
            tournaments: countryTournaments,
            displayConfig: displayConfig.badges
        });
    } catch (error) {
        console.error('Error serving country tournaments:', error);
        res.status(500).json({ error: error.message });
    }
});

// ⚽ Get tournament status with live calculation
router.get('/tournaments/:tournamentId/status', async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId;
        const masterData = loadWorldTournamentsMaster();
        const statusRules = loadStatusRules();
        const tournament = masterData.tournaments[tournamentId];
        
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        
        const currentMonth = new Date().getMonth() + 1;
        const region = tournament.region;
        const pattern = tournament.schedule.pattern;
        
        // Calculate live status
        let liveStatus = tournament.status.current;
        let statusMessage = "Status unknown";
        
        if (statusRules.statusRules.leagues[pattern]) {
            const monthStatus = statusRules.statusRules.leagues[pattern].months[currentMonth];
            if (monthStatus) {
                liveStatus = monthStatus.status;
                statusMessage = monthStatus.message;
            }
        }
        
        res.json({
            tournamentId,
            name: tournament.name,
            country: tournament.country,
            currentStatus: liveStatus,
            statusMessage: statusMessage,
            winner: tournament.winner,
            lastUpdated: new Date().toISOString(),
            schedule: tournament.schedule,
            api: tournament.api
        });
    } catch (error) {
        console.error('Error serving tournament status:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🏆 Get all tournaments with winners
router.get('/tournaments/winners/current', async (req, res) => {
    try {
        const masterData = loadWorldTournamentsMaster();
        
        const winnersOnly = Object.entries(masterData.tournaments)
            .filter(([id, tournament]) => tournament.winner.hasWinner)
            .reduce((acc, [id, tournament]) => {
                acc[id] = {
                    name: tournament.name,
                    country: tournament.country,
                    type: tournament.type,
                    winner: tournament.winner,
                    status: tournament.status,
                    display: tournament.display
                };
                return acc;
            }, {});
        
        res.json({
            count: Object.keys(winnersOnly).length,
            tournaments: winnersOnly,
            lastUpdated: masterData.metadata.lastUpdated
        });
    } catch (error) {
        console.error('Error serving winners data:', error);
        res.status(500).json({ error: error.message });
    }
});

// � Get all tournaments with current status
router.get('/tournaments/status/all', async (req, res) => {
    try {
        const masterData = loadWorldTournamentsMaster();
        const statusRules = loadStatusRules();
        const currentMonth = new Date().getMonth() + 1;
        
        const allTournamentsWithStatus = {};
        Object.entries(masterData.tournaments).forEach(([id, tournament]) => {
            // Calculate current status based on rules
            let calculatedStatus = tournament.status.current;
            
            // If it's finished, keep as finished
            if (tournament.status.current === 'finished' && tournament.winner.hasWinner) {
                calculatedStatus = 'finished';
            }
            // If it's vacation status, use vacation
            else if (tournament.status.current === 'vacation' || tournament.status.current === 'off_season') {
                calculatedStatus = 'vacation';
            }
            // Otherwise, use live calculation based on schedule pattern
            else if (statusRules.statusRules.leagues[tournament.schedule.pattern]) {
                const monthStatus = statusRules.statusRules.leagues[tournament.schedule.pattern].months[currentMonth];
                if (monthStatus) {
                    calculatedStatus = monthStatus.status;
                }
            }
            
            allTournamentsWithStatus[id] = {
                status: calculatedStatus,
                winner: tournament.winner.hasWinner ? {
                    name: tournament.winner.team,
                    logo: tournament.winner.teamLogo
                } : null
            };
        });
        
        res.json({
            tournaments: allTournamentsWithStatus,
            month: currentMonth,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error serving all tournaments status:', error);
        res.status(500).json({ error: error.message });
    }
});

// �📊 Get coverage statistics
router.get('/tournaments/coverage', async (req, res) => {
    try {
        const masterData = loadWorldTournamentsMaster();
        const regionsConfig = loadRegionsConfig();
        
        const stats = {
            total_tournaments: Object.keys(masterData.tournaments).length,
            by_region: {},
            by_type: {},
            by_status: {},
            with_winners: 0,
            coverage: masterData.metadata.coverage
        };
        
        Object.values(masterData.tournaments).forEach(tournament => {
            // By region
            stats.by_region[tournament.region] = (stats.by_region[tournament.region] || 0) + 1;
            
            // By type
            stats.by_type[tournament.type] = (stats.by_type[tournament.type] || 0) + 1;
            
            // By status
            stats.by_status[tournament.status.current] = (stats.by_status[tournament.status.current] || 0) + 1;
            
            // With winners
            if (tournament.winner.hasWinner) {
                stats.with_winners++;
            }
        });
        
        res.json({
            statistics: stats,
            regions_available: Object.keys(regionsConfig.regions),
            last_updated: masterData.metadata.lastUpdated
        });
    } catch (error) {
        console.error('Error serving coverage statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================================
// BACKWARD COMPATIBILITY ENDPOINTS
// ================================

// Load tournament metadata (OLD FORMAT - for backward compatibility)
const loadTournamentMetadata = () => {
    try {
        // Try new format first
        const masterData = loadWorldTournamentsMaster();
        
        // Convert to old format
        const oldFormat = {
            tournament_status: {
                finished: {
                    tournaments: {}
                },
                ongoing: {
                    tournaments: {}
                }
            }
        };
        
        Object.entries(masterData.tournaments).forEach(([id, tournament]) => {
            if (tournament.status.current === 'finished') {
                oldFormat.tournament_status.finished.tournaments[id] = {
                    name: tournament.name,
                    type: tournament.type,
                    country: tournament.country,
                    season: tournament.status.season,
                    status: tournament.status.current,
                    winner: tournament.winner.hasWinner ? {
                        name: tournament.winner.team,
                        id: tournament.winner.teamId,
                        logo: tournament.winner.teamLogo
                    } : null,
                    final_date: tournament.winner.confirmedDate
                };
            } else {
                oldFormat.tournament_status.ongoing.tournaments[id] = {
                    name: tournament.name,
                    type: tournament.type,
                    country: tournament.country,
                    season: tournament.status.season,
                    status: tournament.status.current
                };
            }
        });
        
        return oldFormat;
    } catch (error) {
        console.error('Error loading tournament metadata:', error);
        return { tournament_status: { finished: { tournaments: {} }, ongoing: { tournaments: {} } } };
    }
};

// Get comprehensive tournament status data (OLD FORMAT)
router.get('/tournament-status', async (req, res) => {
    try {
        const metadata = loadTournamentMetadata();
        res.json(metadata.tournament_status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get only finished tournaments (OLD FORMAT - backward compatibility)
router.get('/finished-tournaments', async (req, res) => {
    try {
        const masterData = loadWorldTournamentsMaster();
        
        // Convert to old frontend format
        const finishedTournaments = {};
        Object.entries(masterData.tournaments).forEach(([id, tournament]) => {
            if (tournament.status.current === 'finished') {
                finishedTournaments[id] = {
                    winner: tournament.winner.hasWinner ? {
                        name: tournament.winner.team,
                        logo: tournament.winner.teamLogo
                    } : null
                };
            }
        });
        
        res.json(finishedTournaments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get tournament winners only
router.get('/tournament-winners', async (req, res) => {
    try {
        const metadata = loadTournamentMetadata();
        const winners = {};
        
        Object.entries(metadata.tournament_status.finished.tournaments).forEach(([id, tournament]) => {
            if (tournament.winner) {
                winners[id] = tournament.winner;
            }
        });
        
        res.json(winners);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Load tournament data (old method - keeping for backward compatibility)
const loadFinishedTournaments = () => {
    const metadata = loadTournamentMetadata();
    const finished = {};
    Object.entries(metadata.tournament_status.finished.tournaments).forEach(([id, tournament]) => {
        finished[id] = { winner: tournament.winner };
    });
    return finished;
};

// --- V2 Explorer Routes ---

// Get all countries
router.get('/countries', async (req, res) => {
    try {
        const countries = await footballApi.getCountries();
        
        // Filter out countries without active leagues
        // These are territories/disputed regions that appear in API but have no leagues
        const countriesWithoutLeagues = new Set(['Crimea']);
        
        const validCountries = countries.filter(country => 
            !countriesWithoutLeagues.has(country.name)
        );
        
        res.json(validCountries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get leagues by country
router.get('/leagues', async (req, res) => {
    try {
        const { country } = req.query;
        if (!country) return res.status(400).json({ error: 'Country parameter required' });
        
        // ADDED: Correct country mapping for leagues that API returns incorrectly
        const leagueCountryOverride = {
            556: 'Italy',     // Supercoppa Italiana (wrongly returned for Spain)
            514: 'Spain',     // Supercopa de España  
            529: 'Germany',   // DFL Supercup (correct ID)
            526: 'France',    // Trophée des Champions
            528: 'England',   // Community Shield
            659: 'Israel',    // Super Cup Israel
            385: 'Israel'     // Toto Cup Ligat Al
        };
        
        const allLeagues = await footballApi.getLeagues(country);
        
        // ADDED: Manually inject leagues that should appear in this country but API doesn't return
        const additionalLeagues = [];
        if (country === 'Spain' && !allLeagues.find(l => l.id === 514)) {
            additionalLeagues.push({ id: 514, name: 'Supercopa de España', type: 'Cup', logo: 'https://media.api-sports.io/football/leagues/514.png' });
        }
        if (country === 'Italy' && !allLeagues.find(l => l.id === 556)) {
            additionalLeagues.push({ id: 556, name: 'Supercoppa Italiana', type: 'Cup', logo: 'https://media.api-sports.io/football/leagues/556.png' });
        }
        if (country === 'Germany' && !allLeagues.find(l => l.id === 529)) {
            additionalLeagues.push({ id: 529, name: 'DFL Supercup', type: 'Cup', logo: 'https://media.api-sports.io/football/leagues/529.png' });
        }
        if (country === 'England' && !allLeagues.find(l => l.id === 528)) {
            additionalLeagues.push({ id: 528, name: 'Community Shield', type: 'Cup', logo: 'https://media.api-sports.io/football/leagues/528.png' });
        }
        if (country === 'France' && !allLeagues.find(l => l.id === 526)) {
            additionalLeagues.push({ id: 526, name: 'Trophée des Champions', type: 'Cup', logo: 'https://media.api-sports.io/football/leagues/526.png' });
        }

        const combinedLeagues = [...allLeagues, ...additionalLeagues];

        // Filter out unwanted leagues (youth, lower tiers, regional, etc.)
        const filteredLeagues = combinedLeagues.filter(league => {
            // FIXED: Exclude leagues that wrongly appear in wrong countries
            if (leagueCountryOverride[league.id]) {
                return leagueCountryOverride[league.id] === country;
            }
            
            const n = (league.name || '').toLowerCase();
            
            // === EXCLUDE: Youth/Women/Reserve teams ===
            if (n.includes('women') || n.includes('frauen') || n.includes('femenina') || n.includes('féminin') ||
                n.includes('feminine') || n.includes('feminin') ||
                n.includes('u17') || n.includes('u18') || n.includes('u19') || 
                n.includes('u20') || n.includes('u21') || n.includes('u23') || 
                n.includes('reserves') || n.includes('reserve league') || n.includes('youth') || n.includes('junior') ||
                n.includes('aspirantes') || n.includes('wsl') || n.includes('primavera')) return false;
            
            // === EXCLUDE: Lower-tier English leagues (Tier 6+) ===
            if (n.includes('non league') || n.includes('isthmian') || n.includes('southern league') || 
                n.includes('northern league') || n.includes('national league -') || n.includes('fa trophy') ||
                n.includes('national league cup') || n.includes('premier league 2') || 
                n.includes('efl trophy') || n.includes('premier league cup')) return false;
            
            // === EXCLUDE: Development/Academy leagues ===
            if (n.includes('development') || n.includes('academy') || n.includes('professional development')) return false;
            
            // === EXCLUDE: Brazilian state leagues (all 27 states) ===
            if (n.match(/(paulista|carioca|mineiro|gaúcho|baiano|cearense|paranaense|catarinense|goiano|pernambucano|sergipano|amazonense|alagoano|matogrossense|brasiliense|paraense|capixaba|potiguar|paraibano|piauiense|maranhense|acreano|rondoniense|roraimense|amapaense|tocantinense|sul-matogrossense)/)) return false;
            if (n.includes('copa do nordeste') || n.match(/copa (rio|verde|grão|espírito|paulista|santa|gaúcha|fares|alagoas)/)) return false;
            
            // === EXCLUDE: Lower divisions ===
            if (n.includes('serie c') || n.includes('serie d') || n.includes('3. liga') || n.includes('3. lig')) return false;
            if (n.includes('recopa') || n.includes('kings cup') || n.includes('summer series')) return false;
            
            // === EXCLUDE: Regional leagues (state/province level) ===
            // Portuguese regional groups
            if (n.match(/campeonato de portugal.*group/i) || n.match(/- group [a-z]/i)) return false;
            // Australian state leagues (NPL = National Premier League is tier 2, but state leagues are lower)
            if (n.match(/(victoria|queensland|northern|south australia|tasmania|capital territory|western australia).*npl 2/i)) return false;
            if (n.match(/(brisbane|queensland) premier league/i) || n.match(/state league|southern championship/i)) return false;
            if (n.match(/nnsw league/i)) return false;
            // Swedish regional divisions
            if (n.match(/division 2 -|ettan -/i) || n.includes('damallsvenskan') || n.includes('elitettan')) return false;
            // Argentine lower tiers
            if (n.includes('primera b metropolitana') || n.includes('promocional amateur')) return false;
            
            // === EXCLUDE: Lower Spanish leagues ===
            if (n.includes('rfef') || n.includes('tercera') || n.includes('segunda división rfef') || 
                n.includes('copa federacion')) return false;
            
            // === EXCLUDE: Lower German leagues ===
            if (n.includes('oberliga') || n.includes('regionalliga')) return false;
            
            // === EXCLUDE: Lower French leagues ===
            if (n.includes('national 2') || n.includes('national 3') || n.includes('coupe de la ligue')) return false;
            
            // === EXCLUDE: Lower Dutch leagues ===
            if (n.includes('tweede divisie') || n.includes('derde divisie') || n.includes('vierde divisie')) return false;
            
            // === EXCLUDE: Lower Argentine leagues ===
            if (n.includes('primera d') || n.includes('federal a') || n.includes('super copa international')) return false;
            
            // === EXCLUDE: Lower US leagues ===
            if (n.includes('nisa') || n.includes('npsl') || n.includes('usl league two') || n.includes('usl w league') || 
                n.includes('mls all-star') || n.includes('usl league one cup')) return false;
            
            // === EXCLUDE: Lower Japanese/Turkish leagues ===
            if (n.includes('j3 league') || n.includes('japan football league') || n.includes('we league')) return false;
            if (n.match(/3\. lig - group/)) return false;
            
            // === EXCLUDE: Israeli lower leagues ===
            if (n.includes('liga alef') || n.includes('liga bet')) return false;
            
            // === EXCLUDE: Lower divisions (general patterns) ===
            if (n.match(/\s-\s[2-9]$/) || n.match(/[- ][3-9]$/) || n.match(/a[2-3]$/) || n.match(/b[1-2]$/) || 
                n.endsWith(' c') || n.endsWith(' d')) return false;
            
            return true;
        });
        
        // ADDED: Load finished tournaments data to mark cups as finished
        const finishedTournamentsPath = path.join(__dirname, '../data/finished_tournaments.json');
        let finishedTournaments = {};
        try {
            const finishedData = JSON.parse(fs.readFileSync(finishedTournamentsPath, 'utf8'));
            finishedTournaments = finishedData.finished_tournaments || {};
        } catch (err) {
            console.warn('[leagues] Could not load finished_tournaments.json:', err.message);
        }
        
        // Update league status if tournament is finished
        const leaguesWithStatus = filteredLeagues.map(league => {
            const tournamentInfo = finishedTournaments[league.id];
            if (tournamentInfo && tournamentInfo.status === 'finished') {
                return {
                    ...league,
                    status: 'finished',
                    ui_label: '🏆 Finished'
                };
            }
            return league;
        });
        
        // Limit to top 15 leagues per country
        res.json(leaguesWithStatus.slice(0, 15));
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
             // Add defending champion info for major tournaments
             const teamsWithBadges = teams.map(t => {
                 // Check if this national team is a defending champion of any major tournament
                 const badges = [];
                 
                 // World Cup 2026 Participant - check first!
                 const isWC2026 = internationalWinners.isWorldCup2026Participant(t.team.id);
                 if (isWC2026) {
                     badges.push({ type: 'world_cup_2026', emoji: '🌍', title: 'World Cup 2026' });
                 }
                 
                 // World Cup Champion (ID: 1)
                 const wcChamp = internationalWinners.getDefendingChampion(1);
                 if (wcChamp && wcChamp.id === t.team.id) {
                     badges.push({ type: 'world_cup', emoji: '🏆', title: 'World Cup Champion' });
                 }
                 
                 // Euro (ID: 4) - for European teams
                 const euroChamp = internationalWinners.getDefendingChampion(4);
                 if (euroChamp && euroChamp.id === t.team.id) {
                     badges.push({ type: 'euro', emoji: '🏆', title: 'Euro Champion' });
                 }
                 
                 // Copa America (ID: 9) - for South American teams
                 const copaChamp = internationalWinners.getDefendingChampion(9);
                 if (copaChamp && copaChamp.id === t.team.id) {
                     badges.push({ type: 'copa_america', emoji: '🏆', title: 'Copa America Champion' });
                 }
                 
                 // Africa Cup (ID: 6)
                 const afconChamp = internationalWinners.getDefendingChampion(6);
                 if (afconChamp && afconChamp.id === t.team.id) {
                     badges.push({ type: 'afcon', emoji: '🏆', title: 'Africa Cup Champion' });
                 }
                 
                 // Asian Cup (ID: 7)
                 const asianChamp = internationalWinners.getDefendingChampion(7);
                 if (asianChamp && asianChamp.id === t.team.id) {
                     badges.push({ type: 'asian_cup', emoji: '🏆', title: 'Asian Cup Champion' });
                 }
                 
                 // Gold Cup (ID: 22)
                 const goldChamp = internationalWinners.getDefendingChampion(22);
                 if (goldChamp && goldChamp.id === t.team.id) {
                     badges.push({ type: 'gold_cup', emoji: '🏆', title: 'Gold Cup Champion' });
                 }
                 
                 return {
                     ...t,
                     badges: badges.length > 0 ? badges : null,
                     isDefendingChampion: badges.some(b => b.type !== 'world_cup_2026'),
                     isWorldCup2026: isWC2026
                 };
             });
             return res.json(teamsWithBadges);
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

// Get teams with standings (includes rank, points, form)
// IMPORTANT: Must be BEFORE /:fixtureId to avoid route collision!
router.get('/teams-with-standings', async (req, res) => {
  try {
    const { league, season, country } = req.query;
    if (!league) return res.status(400).json({ error: 'League parameter required' });
    
    const seasonYear = season || new Date().getFullYear();
    const teamsWithStandings = await footballApi.getTeamsWithStandings(league, seasonYear, country);
    res.json(teamsWithStandings);
  } catch (error) {
    console.error('[API] Error fetching teams with standings:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get tournament info (stage, groups, knockout teams) - for World Cup, Euro, Copa America, etc.
router.get('/tournament-info', async (req, res) => {
  try {
    const { league, season } = req.query;
    if (!league) return res.status(400).json({ error: 'League parameter required' });
    
    const seasonYear = season || new Date().getFullYear();
    const tournamentInfo = await footballApi.getTournamentInfo(league, seasonYear);
    
    if (!tournamentInfo) {
      return res.status(404).json({ error: 'Tournament not found or no data available' });
    }
    
    res.json(tournamentInfo);
  } catch (error) {
    console.error('[API] Error fetching tournament info:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get league details (type, frequency, seasons) - works for any league or tournament
router.get('/league-details', async (req, res) => {
  try {
    const { league } = req.query;
    if (!league) return res.status(400).json({ error: 'League parameter required' });
    
    const details = await footballApi.getLeagueDetails(league);
    
    if (!details) {
      return res.status(404).json({ error: 'League not found' });
    }
    
    res.json(details);
  } catch (error) {
    console.error('[API] Error fetching league details:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CONFEDERATION INFO ENDPOINT ====================
// Get information about continental federations and their competitions
// MUST be before /:fixtureId to avoid route collision
router.get('/confederation-info', (req, res) => {
  const { country, leagueId } = req.query;
  
  const confederations = {
    UEFA: {
      name: 'UEFA', fullName: 'Union of European Football Associations', region: 'Europe', emoji: '🇪🇺',
      competitions: [
        { name: 'UEFA Champions League', shortName: 'UCL', emoji: '🏆', description: 'Elite European club competition featuring top teams from each country', format: 'League phase (36 teams) → Knockout rounds → Final', teams: 36, prize: '€2.7B total prize pool', color: '#1e3a8a' },
        { name: 'UEFA Europa League', shortName: 'UEL', emoji: '🥈', description: 'Second-tier European competition for qualifying teams and UCL dropouts', format: 'League phase (36 teams) → Knockout rounds → Final', teams: 36, color: '#f97316' },
        { name: 'UEFA Conference League', shortName: 'UECL', emoji: '🥉', description: 'Third-tier European competition giving more countries access to European football', format: 'League phase (36 teams) → Knockout rounds → Final', teams: 36, color: '#22c55e' }
      ],
      countries: ['England', 'Spain', 'Germany', 'Italy', 'France', 'Netherlands', 'Portugal', 'Belgium', 'Turkey', 'Scotland', 'Austria', 'Greece', 'Poland', 'Ukraine', 'Serbia', 'Croatia', 'Czech Republic', 'Hungary', 'Bosnia', 'Cyprus', 'Norway', 'Sweden', 'Denmark', 'Switzerland', 'Israel'],
      leagueIds: [39, 140, 78, 135, 61, 88, 94, 144, 203, 179, 218, 197, 106, 332, 333, 286, 345, 271, 283, 210, 103, 113, 119, 207, 383],
      qualificationInfo: { topLeagues: 'Top 5 leagues get 4 direct UCL spots', midLeagues: 'Leagues 6-15 get 1-2 UCL spots (some via qualifiers)', lowerLeagues: 'Lower-ranked leagues qualify through 4 qualifying rounds', cupWinners: 'Domestic cup winners often qualify for Europa or Conference League' }
    },
    CONMEBOL: {
      name: 'CONMEBOL', fullName: 'South American Football Confederation', region: 'South America', emoji: '🌎',
      competitions: [
        { name: 'Copa Libertadores', shortName: 'Libertadores', emoji: '🏆', description: 'Premier South American club competition, equivalent to UEFA Champions League', format: 'Group stage (32 teams) → Knockout → Final', teams: 47, color: '#3b82f6' },
        { name: 'Copa Sudamericana', shortName: 'Sudamericana', emoji: '🥈', description: 'Second-tier South American competition, equivalent to Europa League', format: 'Group stage → Knockout rounds → Final', teams: 44, color: '#f97316' }
      ],
      countries: ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Uruguay', 'Paraguay', 'Ecuador', 'Peru', 'Bolivia', 'Venezuela'],
      leagueIds: [71, 128],
      qualificationInfo: { libertadores: 'Top 4-6 teams qualify directly, next 2-4 go to qualifiers', sudamericana: 'Teams finishing 7th-12th typically qualify', crossover: 'Libertadores group stage losers drop to Sudamericana' }
    },
    AFC: {
      name: 'AFC', fullName: 'Asian Football Confederation', region: 'Asia & Oceania', emoji: '🌏',
      competitions: [
        { name: 'AFC Champions League Elite', shortName: 'ACL Elite', emoji: '🏆', description: 'Top-tier Asian club competition', format: 'League phase (24 teams) → Knockout → Final', teams: 24, color: '#3b82f6' },
        { name: 'AFC Champions League 2', shortName: 'ACL 2', emoji: '🥈', description: 'Second-tier Asian competition introduced in 2024', format: 'League phase (24 teams) → Knockout → Final', teams: 24, color: '#f97316' }
      ],
      countries: ['Japan', 'South Korea', 'Saudi Arabia', 'Australia', 'China', 'Thailand', 'UAE', 'Qatar', 'Iran'],
      leagueIds: [98, 292, 307, 188],
      qualificationInfo: { topCountries: 'Japan, Korea, Saudi get 3-4 ACL Elite spots', midCountries: 'Australia, China get 2 ACL Elite spots', aclTwo: 'Additional teams qualify for ACL 2 based on country ranking' }
    },
    CONCACAF: {
      name: 'CONCACAF', fullName: 'Confederation of North, Central America and Caribbean Association Football', region: 'North & Central America', emoji: '🌎',
      competitions: [
        { name: 'CONCACAF Champions Cup', shortName: 'CCL', emoji: '🏆', description: 'Premier club competition for North and Central American teams', format: 'Single-elimination knockout', teams: 27, color: '#3b82f6' },
        { name: 'Leagues Cup', shortName: 'Leagues Cup', emoji: '⚽', description: 'Annual tournament between MLS and Liga MX clubs', format: 'Group stage → Knockout', teams: 47, color: '#22c55e' }
      ],
      countries: ['USA', 'Mexico', 'Canada', 'Costa Rica', 'Honduras', 'El Salvador', 'Guatemala', 'Panama', 'Jamaica'],
      leagueIds: [253, 262],
      qualificationInfo: { mls: 'MLS Cup champion + conference winners qualify for CCL', ligaMX: 'Liga MX Apertura/Clausura champions qualify for CCL', leaguesCup: 'All MLS and Liga MX teams participate' }
    },
    CAF: {
      name: 'CAF', fullName: 'Confederation of African Football', region: 'Africa', emoji: '🌍',
      competitions: [
        { name: 'CAF Champions League', shortName: 'CAF CL', emoji: '🏆', description: 'Premier African club competition', format: 'Group stage (16 teams) → Knockout → Final', teams: 16, color: '#3b82f6' },
        { name: 'CAF Confederation Cup', shortName: 'CAF CC', emoji: '🥈', description: 'Second-tier African club competition', format: 'Group stage (16 teams) → Knockout → Final', teams: 16, color: '#f97316' }
      ],
      countries: ['Egypt', 'Morocco', 'South Africa', 'Nigeria', 'Algeria', 'Tunisia', 'Senegal', 'Cameroon', 'Ghana', 'DR Congo'],
      leagueIds: [288, 233, 200],
      qualificationInfo: { cafCL: 'League champions qualify directly for CAF Champions League', cafCC: 'League runners-up and cup winners qualify for Confederation Cup' }
    }
  };
  
  const countryToConf = { 'England': 'UEFA', 'Spain': 'UEFA', 'Germany': 'UEFA', 'Italy': 'UEFA', 'France': 'UEFA', 'Netherlands': 'UEFA', 'Portugal': 'UEFA', 'Belgium': 'UEFA', 'Turkey': 'UEFA', 'Scotland': 'UEFA', 'Austria': 'UEFA', 'Greece': 'UEFA', 'Poland': 'UEFA', 'Ukraine': 'UEFA', 'Serbia': 'UEFA', 'Croatia': 'UEFA', 'Czech Republic': 'UEFA', 'Hungary': 'UEFA', 'Bosnia': 'UEFA', 'Cyprus': 'UEFA', 'Norway': 'UEFA', 'Sweden': 'UEFA', 'Denmark': 'UEFA', 'Switzerland': 'UEFA', 'Israel': 'UEFA', 'Brazil': 'CONMEBOL', 'Argentina': 'CONMEBOL', 'Japan': 'AFC', 'South Korea': 'AFC', 'Saudi Arabia': 'AFC', 'Australia': 'AFC', 'USA': 'CONCACAF', 'Mexico': 'CONCACAF', 'Egypt': 'CAF', 'Morocco': 'CAF', 'South Africa': 'CAF' };
  const leagueToConf = { 39: 'UEFA', 140: 'UEFA', 78: 'UEFA', 135: 'UEFA', 61: 'UEFA', 88: 'UEFA', 94: 'UEFA', 144: 'UEFA', 203: 'UEFA', 179: 'UEFA', 218: 'UEFA', 197: 'UEFA', 106: 'UEFA', 332: 'UEFA', 333: 'UEFA', 286: 'UEFA', 345: 'UEFA', 271: 'UEFA', 283: 'UEFA', 210: 'UEFA', 103: 'UEFA', 113: 'UEFA', 119: 'UEFA', 207: 'UEFA', 383: 'UEFA', 71: 'CONMEBOL', 128: 'CONMEBOL', 98: 'AFC', 292: 'AFC', 307: 'AFC', 188: 'AFC', 253: 'CONCACAF', 262: 'CONCACAF', 288: 'CAF', 233: 'CAF', 200: 'CAF' };

  let confKey = leagueId ? leagueToConf[parseInt(leagueId)] : (country ? countryToConf[country] : null);

  if (confKey && confederations[confKey]) {
    res.json({ confederation: confederations[confKey], allConfederations: Object.keys(confederations) });
  } else if (!country && !leagueId) {
    res.json({ confederations, countryMapping: countryToConf, leagueMapping: leagueToConf });
  } else {
    res.json({ error: 'Unknown country or league', availableConfederations: Object.keys(confederations) });
  }
});

// ==================== ZONE LEGEND ENDPOINT ====================
// Get legend/explanation for qualification zone colors
// MUST be before /:fixtureId to avoid route collision
router.get('/zone-legend', (req, res) => {
  const { confederation } = req.query;
  
  const legends = {
    UEFA: [
      { label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', description: 'Direct qualification to UEFA Champions League', icon: '🏆' },
      { label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)', description: 'Must play qualifying rounds for Champions League', icon: '⚔️' },
      { label: 'Europa League', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)', description: 'Qualification to UEFA Europa League', icon: '🥈' },
      { label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)', description: 'Qualification to UEFA Conference League', icon: '🥉' },
      { label: 'Relegation Playoff', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', description: 'Must play playoff to avoid relegation', icon: '⚠️' },
      { label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', description: 'Direct relegation to lower division', icon: '⬇️' }
    ],
    CONMEBOL: [
      { label: 'Libertadores Group', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', description: 'Direct to Copa Libertadores group stage', icon: '🏆' },
      { label: 'Libertadores Q', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)', description: 'Must play Libertadores qualifying rounds', icon: '⚔️' },
      { label: 'Sudamericana', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)', description: 'Qualification to Copa Sudamericana', icon: '🥈' },
      { label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', description: 'Relegation zone', icon: '⬇️' }
    ],
    AFC: [
      { label: 'AFC CL Elite', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', description: 'Qualification to AFC Champions League Elite', icon: '🏆' },
      { label: 'AFC CL 2', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)', description: 'Qualification to AFC Champions League 2', icon: '🥈' },
      { label: 'Playoffs', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)', description: 'Qualifies for end-of-season playoffs', icon: '🎯' },
      { label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', description: 'Relegation to lower division', icon: '⬇️' }
    ],
    CONCACAF: [
      { label: 'CONCACAF CL', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', description: 'Qualification to CONCACAF Champions Cup', icon: '🏆' },
      { label: 'Playoffs', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)', description: 'Qualifies for championship playoffs', icon: '🎯' },
      { label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', description: 'Relegation zone', icon: '⬇️' }
    ],
    CAF: [
      { label: 'CAF CL', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', description: 'Qualification to CAF Champions League', icon: '🏆' },
      { label: 'CAF Confed Cup', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)', description: 'Qualification to CAF Confederation Cup', icon: '🥈' },
      { label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', description: 'Relegation to lower division', icon: '⬇️' }
    ]
  };

  if (confederation && legends[confederation]) {
    res.json({ legend: legends[confederation], confederation });
  } else {
    res.json({ legends, availableConfederations: Object.keys(legends) });
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

// Get next fixture for a league (for countdown display)
router.get('/league-next/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const nextFixture = await footballApi.getNextLeagueFixture(leagueId);
    res.json(nextFixture);
  } catch (error) {
    console.error('[API] Error fetching league next fixture:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get tournament info (groups, knockout bracket, stage)
router.get('/tournament/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { season } = req.query;
    
    // Determine season - use academic year for European leagues (Jul-Jun)
    const targetSeason = season || getSeasonYear('academic');
    
    const tournamentInfo = await footballApi.getTournamentInfo(parseInt(leagueId), parseInt(targetSeason));
    res.json(tournamentInfo);
  } catch (error) {
    console.error('[API] Error fetching tournament info:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get knockout bracket with all rounds
router.get('/tournament-bracket/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { season } = req.query;
    
    // Use academic year for European leagues (Jul-Jun)
    const targetSeason = season || getSeasonYear('academic');
    
    // Get all fixtures for this tournament
    const fixtures = await footballApi.getFixturesByLeague(parseInt(leagueId), parseInt(targetSeason), null, null, null);
    
    // Group fixtures by round
    const bracket = {};
    const knockoutRounds = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final', 
                           'Knockout Round Play-offs', '3rd Place Final'];
    
    fixtures.forEach(f => {
      const round = f.league.round;
      
      // Only include knockout rounds (not group/league phase)
      const isKnockout = knockoutRounds.some(kr => round.includes(kr)) || 
                         round.includes('Round of') ||
                         round.includes('-finals') ||
                         round === 'Final';
      
      if (!isKnockout) return;
      
      if (!bracket[round]) bracket[round] = [];
      
      bracket[round].push({
        id: f.fixture.id,
        date: f.fixture.date,
        status: f.fixture.status.short,
        statusLong: f.fixture.status.long,
        home: {
          id: f.teams.home.id,
          name: f.teams.home.name,
          logo: f.teams.home.logo,
          winner: f.teams.home.winner,
          score: f.goals.home
        },
        away: {
          id: f.teams.away.id,
          name: f.teams.away.name,
          logo: f.teams.away.logo,
          winner: f.teams.away.winner,
          score: f.goals.away
        },
        venue: f.fixture.venue?.name
      });
    });
    
    // Sort rounds in tournament order
    const roundOrder = ['Round of 32', 'Knockout Round Play-offs', 'Round of 16', 'Quarter-finals', 'Semi-finals', '3rd Place Final', 'Final'];
    const sortedBracket = {};
    
    roundOrder.forEach(round => {
      // Find matching round (handles variations like "Round of 32" vs "Round of 32 - 1st Leg")
      Object.keys(bracket).forEach(key => {
        if (key.includes(round) || round.includes(key.split(' - ')[0])) {
          if (!sortedBracket[round]) sortedBracket[round] = [];
          sortedBracket[round].push(...bracket[key]);
        }
      });
    });
    
    res.json({
      leagueId: parseInt(leagueId),
      season: parseInt(targetSeason),
      bracket: sortedBracket,
      totalMatches: fixtures.length
    });
  } catch (error) {
    console.error('[API] Error fetching tournament bracket:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get competition structure/format explanation
router.get('/competition-structure/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { season } = req.query;
    
    const targetSeason = season || new Date().getFullYear();
    const id = parseInt(leagueId);
    
    // Get tournament info for current state
    const tournamentInfo = await footballApi.getTournamentInfo(id, parseInt(targetSeason));
    
    // Competition format definitions
    const competitionFormats = {
      // ==================== LEAGUES WITH PLAYOFFS ====================
      383: { // Israel Ligat Ha'al
        name: 'Ligat Ha\'al',
        country: 'Israel',
        format: 'league_with_playoffs',
        stages: [
          { name: 'Regular Season', description: '26 rounds', teams: 14 },
          { name: 'Championship Round', description: 'Top 6 compete for title', teams: 6, rounds: 10 },
          { name: 'Relegation Round', description: 'Bottom 8 fight to stay up', teams: 8, rounds: 10 }
        ],
        qualificationZones: [
          { start: 1, end: 1, label: 'CL Qualifiers', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'Europa League Q', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 3, end: 4, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 13, end: 14, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ],
        promotion: 'Champion to Champions League qualifiers',
        relegation: '2 teams relegated to Liga Leumit'
      },
      179: { // Scotland
        name: 'Scottish Premiership',
        country: 'Scotland',
        format: 'league_with_playoffs',
        stages: [
          { name: 'First Phase', description: '33 rounds', teams: 12 },
          { name: 'Championship Round', description: 'Top 6 for title', teams: 6, rounds: 5 },
          { name: 'Relegation Round', description: 'Bottom 6', teams: 6, rounds: 5 }
        ],
        qualificationZones: [
          { start: 1, end: 1, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 3, end: 3, label: 'Europa League Q', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 4, end: 4, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 11, end: 11, label: 'Relegation Playoff', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
          { start: 12, end: 12, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ],
        promotion: 'Champion to Champions League',
        relegation: 'Bottom team relegated'
      },
      144: { // Belgium
        name: 'Pro League',
        country: 'Belgium',
        format: 'league_with_playoffs',
        stages: [
          { name: 'Regular Season', description: '30 rounds', teams: 16 },
          { name: 'Championship Playoffs', description: 'Top 6 (points halved)', teams: 6, rounds: 10 },
          { name: 'Europa Playoffs', description: 'Places 7-8', teams: 2 }
        ],
        qualificationZones: [
          { start: 1, end: 1, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 3, end: 3, label: 'Europa League', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 4, end: 5, label: 'Conference League Q', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 15, end: 16, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ],
        promotion: 'Champion to Champions League',
        relegation: '1-2 relegated'
      },
      203: { // Turkey
        name: 'Süper Lig',
        country: 'Turkey',
        format: 'league',
        stages: [{ name: 'League', description: '34 rounds', teams: 19 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 3, end: 3, label: 'Europa League', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 4, end: 4, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 17, end: 19, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ],
        promotion: 'Top 2 to Champions League',
        relegation: '3 relegated'
      },
      88: { // Netherlands
        name: 'Eredivisie',
        country: 'Netherlands',
        format: 'league_with_playoffs',
        stages: [
          { name: 'Regular Season', description: '34 rounds', teams: 18 },
          { name: 'Europa Playoffs', description: 'Places 5-8 compete', teams: 4 }
        ],
        promotion: 'Top 2 to Champions League',
        relegation: 'Bottom relegated, 16-17 playoffs'
      },
      94: { // Portugal
        name: 'Primeira Liga',
        country: 'Portugal',
        format: 'league',
        stages: [{ name: 'League', description: '34 rounds', teams: 18 }],
        promotion: 'Top 2 to Champions League',
        relegation: '2 relegated'
      },
      218: { // Austria
        name: 'Bundesliga',
        country: 'Austria',
        format: 'league_with_playoffs',
        stages: [
          { name: 'Regular Season', description: '22 rounds', teams: 12 },
          { name: 'Championship Round', description: 'Top 6', teams: 6, rounds: 10 },
          { name: 'Relegation Round', description: 'Bottom 6', teams: 6, rounds: 10 }
        ],
        qualificationZones: [
          { start: 1, end: 1, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 3, end: 3, label: 'Europa League Q', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 4, end: 4, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 11, end: 11, label: 'Relegation Playoff', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
          { start: 12, end: 12, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ],
        promotion: 'Champion to Champions League',
        relegation: 'Bottom relegated'
      },
      119: { // Denmark
        name: 'Superliga',
        country: 'Denmark',
        format: 'league_with_playoffs',
        stages: [
          { name: 'Regular Season', description: '22 rounds', teams: 12 },
          { name: 'Championship Round', description: 'Top 6', teams: 6 },
          { name: 'Relegation Round', description: 'Bottom 6', teams: 6 }
        ],
        qualificationZones: [
          { start: 1, end: 1, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 3, end: 3, label: 'Europa League Q', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 4, end: 4, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 11, end: 12, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ],
        promotion: 'Champion to Champions League',
        relegation: 'Bottom relegated'
      },
      // ==================== TOP 5 LEAGUES (4 CL spots) ====================
      39: { name: 'Premier League', country: 'England', format: 'league', stages: [{ name: 'League', description: '38 rounds', teams: 20 }], 
        qualificationZones: [
          { start: 1, end: 4, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 5, end: 5, label: 'Europa League', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 6, end: 7, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 18, end: 20, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top 4 to Champions League', relegation: '3 relegated' },
      140: { name: 'La Liga', country: 'Spain', format: 'league', stages: [{ name: 'League', description: '38 rounds', teams: 20 }],
        qualificationZones: [
          { start: 1, end: 4, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 5, end: 5, label: 'Europa League', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 6, end: 6, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 18, end: 20, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top 4 to Champions League', relegation: '3 relegated' },
      135: { name: 'Serie A', country: 'Italy', format: 'league', stages: [{ name: 'League', description: '38 rounds', teams: 20 }],
        qualificationZones: [
          { start: 1, end: 4, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 5, end: 5, label: 'Europa League', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 6, end: 6, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 18, end: 20, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top 4 to Champions League', relegation: '3 relegated' },
      78: { name: 'Bundesliga', country: 'Germany', format: 'league', stages: [{ name: 'League', description: '34 rounds', teams: 18 }],
        qualificationZones: [
          { start: 1, end: 4, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 5, end: 5, label: 'Europa League', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 6, end: 6, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 16, end: 16, label: 'Relegation Playoff', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
          { start: 17, end: 18, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top 4 to Champions League', relegation: '2 + playoff' },
      61: { name: 'Ligue 1', country: 'France', format: 'league', stages: [{ name: 'League', description: '34 rounds', teams: 18 }],
        qualificationZones: [
          { start: 1, end: 3, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 4, end: 4, label: 'Europa League', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 5, end: 5, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 16, end: 16, label: 'Relegation Playoff', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
          { start: 17, end: 18, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top 3 to Champions League', relegation: '2 + playoff' },
      // ==================== OTHER EUROPEAN LEAGUES ====================
      88: { name: 'Eredivisie', country: 'Netherlands', format: 'league', stages: [{ name: 'League', description: '34 rounds', teams: 18 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 3, label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 4, end: 4, label: 'Europa League', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 5, end: 5, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 16, end: 16, label: 'Relegation Playoff', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
          { start: 17, end: 18, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL, 2-3 to qualifiers', relegation: '2 + playoff' },
      94: { name: 'Primeira Liga', country: 'Portugal', format: 'league', stages: [{ name: 'League', description: '34 rounds', teams: 18 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 3, label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 4, end: 4, label: 'Europa League', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 5, end: 5, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 17, end: 18, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL, 2-3 to qualifiers', relegation: '2 relegated' },
      103: { name: 'Eliteserien', country: 'Norway', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'CL Qualifiers', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'Europa League Q', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 3, end: 3, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 14, end: 14, label: 'Relegation Playoff', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
          { start: 15, end: 16, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL qualifiers', relegation: '2 relegated' },
      113: { name: 'Allsvenskan', country: 'Sweden', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'CL Qualifiers', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'Europa League Q', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 3, end: 3, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 14, end: 14, label: 'Relegation Playoff', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
          { start: 15, end: 16, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL qualifiers', relegation: '2 relegated' },
      235: { name: 'Premier League', country: 'Russia', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }], promotion: 'Champion to CL', relegation: '2 relegated' },
      207: { name: 'Super League', country: 'Switzerland', format: 'league', stages: [{ name: 'League', description: '36 rounds', teams: 12 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'CL Qualifiers', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'Europa League Q', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 3, end: 3, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 11, end: 11, label: 'Relegation Playoff', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
          { start: 12, end: 12, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL', relegation: 'Bottom relegated' },
      106: { name: 'Ekstraklasa', country: 'Poland', format: 'league', stages: [{ name: 'League', description: '34 rounds', teams: 18 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'CL Qualifiers', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'Europa League Q', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
          { start: 3, end: 3, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 16, end: 18, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL qualifiers', relegation: '2-3 relegated' },
      197: { name: 'Super League', country: 'Greece', format: 'league_with_playoffs', stages: [{ name: 'Regular Season', description: '26 rounds', teams: 14 }, { name: 'Playoffs', description: 'Top 6', teams: 6 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 3, end: 3, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 13, end: 14, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL', relegation: '2 relegated' },
      283: { name: 'Premijer Liga', country: 'Bosnia', format: 'league', stages: [{ name: 'League', description: '22 rounds', teams: 12 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'CL Qualifiers', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 11, end: 12, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL qualifiers', relegation: '2 relegated' },
      286: { name: 'Prva HNL', country: 'Croatia', format: 'league', stages: [{ name: 'League', description: '36 rounds', teams: 10 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 3, end: 3, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 10, end: 10, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL', relegation: 'Bottom relegated' },
      345: { name: 'Fortuna Liga', country: 'Czech Republic', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'CL Qualifiers', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'Conference League Q', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 15, end: 16, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL qualifiers', relegation: '2 relegated' },
      271: { name: 'NB I', country: 'Hungary', format: 'league', stages: [{ name: 'League', description: '33 rounds', teams: 12 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'CL Qualifiers', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 11, end: 12, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL qualifiers', relegation: '2 relegated' },
      210: { name: 'First Division', country: 'Cyprus', format: 'league_with_playoffs', stages: [{ name: 'Regular Season', description: '22 rounds', teams: 12 }, { name: 'Playoffs', teams: 6 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'CL Qualifiers', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 11, end: 12, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL qualifiers', relegation: '2 relegated' },
      333: { name: 'Super Liga', country: 'Serbia', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 3, end: 3, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 15, end: 16, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL', relegation: '2 relegated' },
      332: { name: 'Premier Liga', country: 'Ukraine', format: 'league', stages: [{ name: 'League', description: '26 rounds', teams: 16 }],
        qualificationZones: [
          { start: 1, end: 1, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 2, end: 2, label: 'CL Qualifiers', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 3, end: 3, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 15, end: 16, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Champion to CL', relegation: '2 relegated' },
      // ==================== SOUTH AMERICA ====================
      71: { name: 'Serie A', country: 'Brazil', format: 'league', stages: [{ name: 'League', description: '38 rounds', teams: 20 }],
        qualificationZones: [
          { start: 1, end: 4, label: 'Libertadores Group', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 5, end: 6, label: 'Libertadores Q', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 7, end: 12, label: 'Sudamericana', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 17, end: 20, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top 6 to Libertadores', relegation: '4 relegated' },
      128: { name: 'Liga Profesional', country: 'Argentina', format: 'league', stages: [{ name: 'League', description: '27 rounds', teams: 28 }],
        qualificationZones: [
          { start: 1, end: 4, label: 'Libertadores Group', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 5, end: 6, label: 'Libertadores Q', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 7, end: 10, label: 'Sudamericana', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 26, end: 28, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top teams to Libertadores', relegation: '2 relegated' },
      239: { name: 'Primera División', country: 'Colombia', format: 'league', stages: [{ name: 'Apertura', teams: 20 }, { name: 'Clausura', teams: 20 }, { name: 'Finals', teams: 4 }], promotion: 'Top teams to Libertadores' },
      265: { name: 'Primera División', country: 'Chile', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }], promotion: 'Top 3 to Libertadores', relegation: '2 relegated' },
      281: { name: 'Liga 1', country: 'Peru', format: 'league', stages: [{ name: 'Apertura', teams: 19 }, { name: 'Clausura', teams: 19 }, { name: 'Finals', teams: 2 }], promotion: 'Top teams to Libertadores' },
      242: { name: 'LigaPro', country: 'Ecuador', format: 'league', stages: [{ name: 'First Stage', teams: 16 }, { name: 'Second Stage', teams: 16 }, { name: 'Finals', teams: 2 }], promotion: 'Top teams to Libertadores' },
      249: { name: 'Primera División', country: 'Paraguay', format: 'league', stages: [{ name: 'Apertura', teams: 12 }, { name: 'Clausura', teams: 12 }], promotion: 'Champion to Libertadores' },
      252: { name: 'Primera División', country: 'Uruguay', format: 'league', stages: [{ name: 'Apertura', teams: 16 }, { name: 'Clausura', teams: 16 }, { name: 'Finals' }], promotion: 'Champion to Libertadores' },
      255: { name: 'Primera División', country: 'Venezuela', format: 'league', stages: [{ name: 'Apertura', teams: 18 }, { name: 'Clausura', teams: 18 }], promotion: 'Champion to Libertadores' },
      245: { name: 'División Profesional', country: 'Bolivia', format: 'league', stages: [{ name: 'Apertura', teams: 16 }, { name: 'Clausura', teams: 16 }], promotion: 'Champion to Libertadores' },
      // ==================== SOUTH AMERICA CONTINENTAL ====================
      13: { name: 'CONMEBOL Libertadores', country: 'South America', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '8 groups × 4 teams', teams: 32, groups: 8 }, { name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      11: { name: 'CONMEBOL Sudamericana', country: 'South America', format: 'groups_knockout', stages: [{ name: 'Group Stage', teams: 32, groups: 8 }, { name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Final', teams: 2 }] },
      541: { name: 'Recopa Sudamericana', country: 'South America', format: 'knockout', stages: [{ name: 'Final', description: 'Libertadores vs Sudamericana winners', teams: 2 }] },
      // ==================== ASIA - LEAGUES ====================
      98: { name: 'J1 League', country: 'Japan', format: 'league', stages: [{ name: 'League', description: '34 rounds', teams: 18 }],
        qualificationZones: [
          { start: 1, end: 3, label: 'AFC CL Elite', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 4, end: 4, label: 'AFC CL Playoff', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 16, end: 16, label: 'Playoff', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
          { start: 17, end: 18, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top 3 to AFC Champions League', relegation: '2 relegated' },
      292: { name: 'K League 1', country: 'South Korea', format: 'league_with_playoffs', stages: [{ name: 'Regular Season', description: '33 rounds', teams: 12 }, { name: 'Finals', description: 'Top 6 playoffs', teams: 6 }],
        qualificationZones: [
          { start: 1, end: 3, label: 'AFC CL Elite', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 4, end: 6, label: 'Finals Playoffs', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 11, end: 12, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top teams to AFC CL', relegation: 'Bottom relegated' },
      169: { name: 'Chinese Super League', country: 'China', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }], promotion: 'Top 3 to AFC CL', relegation: '2 relegated' },
      307: { name: 'Saudi Pro League', country: 'Saudi Arabia', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 18 }],
        qualificationZones: [
          { start: 1, end: 2, label: 'AFC CL Elite', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 3, end: 4, label: 'AFC CL 2', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
          { start: 16, end: 18, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top 4 to AFC CL', relegation: '3 relegated' },
      323: { name: 'UAE Pro League', country: 'UAE', format: 'league', stages: [{ name: 'League', description: '26 rounds', teams: 14 }], promotion: 'Top teams to AFC CL', relegation: '2 relegated' },
      354: { name: 'Qatar Stars League', country: 'Qatar', format: 'league', stages: [{ name: 'League', description: '22 rounds', teams: 12 }], promotion: 'Top teams to AFC CL', relegation: '1 relegated' },
      327: { name: 'Persian Gulf Pro League', country: 'Iran', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }], promotion: 'Top teams to AFC CL', relegation: '2 relegated' },
      369: { name: 'Super League', country: 'Uzbekistan', format: 'league', stages: [{ name: 'League', description: '26 rounds', teams: 14 }], promotion: 'Champion to AFC CL' },
      477: { name: 'Indian Super League', country: 'India', format: 'league_with_playoffs', stages: [{ name: 'League', description: '22 rounds', teams: 12 }, { name: 'Playoffs', description: 'Top 6', teams: 6 }], promotion: 'Champion to AFC CL' },
      296: { name: 'Thai League 1', country: 'Thailand', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }], promotion: 'Top teams to AFC CL', relegation: '3 relegated' },
      299: { name: 'V.League 1', country: 'Vietnam', format: 'league', stages: [{ name: 'League', description: '26 rounds', teams: 14 }], promotion: 'Champion to AFC' },
      274: { name: 'Liga 1', country: 'Indonesia', format: 'league', stages: [{ name: 'League', description: '34 rounds', teams: 18 }], promotion: 'Top teams to AFC' },
      302: { name: 'Malaysia Super League', country: 'Malaysia', format: 'league', stages: [{ name: 'League', description: '22 rounds', teams: 12 }], promotion: 'Champion to AFC' },
      // ==================== ASIA - CONTINENTAL ====================
      17: { name: 'AFC Champions League Elite', country: 'Asia', format: 'swiss_knockout', stages: [{ name: 'League Phase', description: '24 teams × 8 matches', teams: 24, rounds: 8 }, { name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      18: { name: 'AFC Champions League 2', country: 'Asia', format: 'groups_knockout', stages: [{ name: 'Group Stage', teams: 32, groups: 8 }, { name: 'Knockout Stage' }] },
      1140: { name: 'AFC Women Champions League', country: 'Asia', format: 'groups_knockout', stages: [{ name: 'Group Stage', teams: 12, groups: 3 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      7: { name: 'AFC Asian Cup', country: 'Asia', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '6 groups × 4 teams', teams: 24, groups: 6 }, { name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      // ==================== AFRICA - LEAGUES ====================
      288: { name: 'Premier Soccer League', country: 'South Africa', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }],
        qualificationZones: [
          { start: 1, end: 2, label: 'CAF CL', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 3, end: 3, label: 'CAF Confed Cup', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 14, end: 16, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top teams to CAF CL', relegation: '3 relegated' },
      233: { name: 'Egyptian Premier League', country: 'Egypt', format: 'league', stages: [{ name: 'League', description: '34 rounds', teams: 18 }],
        qualificationZones: [
          { start: 1, end: 2, label: 'CAF CL', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 3, end: 4, label: 'CAF Confed Cup', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 16, end: 18, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top teams to CAF CL', relegation: '3 relegated' },
      200: { name: 'Botola Pro', country: 'Morocco', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }],
        qualificationZones: [
          { start: 1, end: 2, label: 'CAF CL', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 3, end: 3, label: 'CAF Confed Cup', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 14, end: 16, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top teams to CAF CL', relegation: '3 relegated' },
      202: { name: 'Ligue 1', country: 'Tunisia', format: 'league', stages: [{ name: 'League', description: '26 rounds', teams: 14 }], promotion: 'Top teams to CAF CL' },
      189: { name: 'Ligue 1', country: 'Algeria', format: 'league', stages: [{ name: 'League', description: '34 rounds', teams: 18 }], promotion: 'Top teams to CAF CL' },
      367: { name: 'Premier League', country: 'Ghana', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 18 }], promotion: 'Champion to CAF CL' },
      357: { name: 'Premier League', country: 'Nigeria', format: 'league', stages: [{ name: 'League', description: '38 rounds', teams: 20 }], promotion: 'Champion to CAF CL' },
      551: { name: 'Kenyan Premier League', country: 'Kenya', format: 'league', stages: [{ name: 'League', description: '34 rounds', teams: 18 }], promotion: 'Champion to CAF' },
      377: { name: 'Premier League', country: 'Senegal', format: 'league', stages: [{ name: 'League', teams: 14 }], promotion: 'Champion to CAF' },
      554: { name: 'Premier League', country: 'Cameroon', format: 'league', stages: [{ name: 'League', teams: 18 }], promotion: 'Champion to CAF' },
      421: { name: 'Ligue 1', country: 'Ivory Coast', format: 'league', stages: [{ name: 'League', teams: 14 }], promotion: 'Champion to CAF' },
      // ==================== AFRICA - CONTINENTAL ====================
      12: { name: 'CAF Champions League', country: 'Africa', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '4 groups × 4 teams', teams: 16, groups: 4 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      20: { name: 'CAF Confederation Cup', country: 'Africa', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '4 groups × 4 teams', teams: 16, groups: 4 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      533: { name: 'CAF Super Cup', country: 'Africa', format: 'knockout', stages: [{ name: 'Final', description: 'CL vs CC winners', teams: 2 }] },
      6: { name: 'Africa Cup of Nations', country: 'Africa', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '6 groups × 4 teams', teams: 24, groups: 6 }, { name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      1164: { name: 'CAF Women Champions League', country: 'Africa', format: 'groups_knockout', stages: [{ name: 'Group Stage', teams: 8, groups: 2 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      // ==================== NORTH/CENTRAL AMERICA - LEAGUES ====================
      253: { name: 'MLS', country: 'USA', format: 'league_with_playoffs', stages: [{ name: 'Regular Season', description: 'Conference format', teams: 29 }, { name: 'MLS Cup Playoffs', description: 'Top 9 per conference', teams: 18 }, { name: 'MLS Cup Final', teams: 2 }],
        qualificationZones: [
          { start: 1, end: 9, label: 'Playoffs (per conf)', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 1, end: 4, label: 'CONCACAF CL', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' }
        ], promotion: 'Top teams to CCL' },
      262: { name: 'Liga MX', country: 'Mexico', format: 'league_with_playoffs', stages: [{ name: 'Apertura', description: '17 rounds', teams: 18 }, { name: 'Clausura', description: '17 rounds', teams: 18 }, { name: 'Liguilla', description: 'Top 12 playoffs', teams: 12 }],
        qualificationZones: [
          { start: 1, end: 12, label: 'Liguilla Playoffs', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
          { start: 1, end: 4, label: 'CONCACAF CL', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 17, end: 18, label: 'Relegation Zone', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ], promotion: 'Top teams to CCL', relegation: '1 relegated' },
      721: { name: 'Canadian Premier League', country: 'Canada', format: 'league', stages: [{ name: 'Regular Season', description: '28 rounds', teams: 8 }, { name: 'Finals' }], promotion: 'Champion to CCL' },
      // ==================== NORTH AMERICA - CONTINENTAL ====================
      16: { name: 'CONCACAF Champions Cup', country: 'North America', format: 'knockout', stages: [{ name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2, description: 'Single match' }] },
      767: { name: 'CONCACAF Leagues Cup', country: 'North America', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: 'MLS + Liga MX teams', teams: 47, groups: 15 }, { name: 'Knockout Stage' }] },
      15: { name: 'CONCACAF Gold Cup', country: 'North America', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '4 groups × 4 teams', teams: 16, groups: 4 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      1136: { name: 'CONCACAF W Champions Cup', country: 'North America', format: 'groups_knockout', stages: [{ name: 'Group Stage', teams: 8, groups: 2 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      // ==================== CENTRAL AMERICA & CARIBBEAN ====================
      268: { name: 'Liga Nacional', country: 'Guatemala', format: 'league', stages: [{ name: 'Apertura', teams: 12 }, { name: 'Clausura', teams: 12 }, { name: 'Finals' }] },
      261: { name: 'Liga Nacional', country: 'Honduras', format: 'league', stages: [{ name: 'Apertura', teams: 10 }, { name: 'Clausura', teams: 10 }, { name: 'Finals' }] },
      259: { name: 'Primera División', country: 'El Salvador', format: 'league', stages: [{ name: 'Apertura', teams: 12 }, { name: 'Clausura', teams: 12 }] },
      256: { name: 'Liga Primera', country: 'Nicaragua', format: 'league', stages: [{ name: 'Apertura', teams: 10 }, { name: 'Clausura', teams: 10 }] },
      162: { name: 'Primera División', country: 'Costa Rica', format: 'league', stages: [{ name: 'Apertura', teams: 12 }, { name: 'Clausura', teams: 12 }, { name: 'Finals' }] },
      304: { name: 'Liga Panameña', country: 'Panama', format: 'league', stages: [{ name: 'Apertura', teams: 10 }, { name: 'Clausura', teams: 10 }] },
      342: { name: 'Jamaica Premier League', country: 'Jamaica', format: 'league', stages: [{ name: 'League', teams: 12 }, { name: 'Playoffs' }] },
      // ==================== ISRAEL (fixing IDs to match API-Sports) ====================
      382: { name: 'Liga Leumit', country: 'Israel', format: 'league', stages: [{ name: 'League', description: '30 rounds', teams: 16 }], relegation: '2 relegated to Liga Alef' },
      384: { name: 'State Cup', country: 'Israel', format: 'knockout', stages: [{ name: 'Knockout', description: 'Single match elimination' }] },
      385: { name: 'Toto Cup Ligat Al', country: 'Israel', format: 'knockout', stages: [{ name: 'Group Stage', teams: 14, groups: 2 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      496: { name: 'Liga Alef', country: 'Israel', format: 'league', stages: [{ name: 'League', description: 'Multiple divisions', teams: 16 }] },
      659: { name: 'Super Cup', country: 'Israel', format: 'knockout', stages: [{ name: 'Final', description: 'League vs Cup winners', teams: 2 }] },
      // ==================== OCEANIA ====================
      188: { name: 'A-League', country: 'Australia', format: 'league_with_playoffs', stages: [{ name: 'Regular Season', description: '26 rounds', teams: 12 }, { name: 'Finals Series', description: 'Top 6 playoffs', teams: 6 }],
        qualificationZones: [
          { start: 1, end: 2, label: 'AFC CL Elite', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
          { start: 3, end: 6, label: 'Finals Series', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' }
        ], promotion: 'Top teams to AFC CL' },
      553: { name: 'New Zealand Football Championship', country: 'New Zealand', format: 'league_with_playoffs', stages: [{ name: 'Regular Season', teams: 10 }, { name: 'Finals' }] },
      641: { name: 'OFC Champions League', country: 'Oceania', format: 'groups_knockout', stages: [{ name: 'Group Stage', teams: 8, groups: 2 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      // ==================== UEFA COMPETITIONS ====================
      2: { name: 'Champions League', country: 'Europe', format: 'swiss_knockout', stages: [{ name: 'League Phase', description: '36 teams × 8 matches', teams: 36, rounds: 8 }, { name: 'Playoffs', description: 'Places 9-24', teams: 16 }, { name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      3: { name: 'Europa League', country: 'Europe', format: 'swiss_knockout', stages: [{ name: 'League Phase', teams: 36, rounds: 8 }, { name: 'Playoffs', teams: 16 }, { name: 'Round of 16', teams: 16 }, { name: 'Final', teams: 2 }] },
      848: { name: 'Conference League', country: 'Europe', format: 'swiss_knockout', stages: [{ name: 'League Phase', teams: 36, rounds: 6 }, { name: 'Playoffs', teams: 16 }, { name: 'Round of 16', teams: 16 }, { name: 'Final', teams: 2 }] },
      5: { name: 'Nations League', country: 'Europe', format: 'groups_knockout', stages: [{ name: 'League Phase', description: '4 leagues (A/B/C/D)', groups: 4 }, { name: 'Finals', description: 'League A top 4', teams: 4 }] },
      531: { name: 'UEFA Super Cup', country: 'Europe', format: 'knockout', stages: [{ name: 'Final', description: 'CL vs EL winners', teams: 2 }] },
      // ==================== NATIONAL TEAM TOURNAMENTS ====================
      1: { name: 'World Cup', country: 'World', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '12 groups × 4 teams', teams: 48, groups: 12 }, { name: 'Round of 32', teams: 32 }, { name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      4: { name: 'Euro', country: 'Europe', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '6 groups × 4 teams', teams: 24, groups: 6 }, { name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      9: { name: 'Copa America', country: 'South America', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '4 groups × 4 teams', teams: 16, groups: 4 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      8: { name: "Women's World Cup", country: 'World', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '8 groups × 4 teams', teams: 32, groups: 8 }, { name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      525: { name: "Women's Champions League", country: 'Europe', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '4 groups × 4 teams', teams: 16, groups: 4 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      // ==================== WORLD CUP QUALIFIERS ====================
      32: { name: 'WC Qualifiers Europe', country: 'Europe', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '12 groups', groups: 12 }, { name: 'Playoffs', teams: 16 }] },
      34: { name: 'WC Qualifiers South America', country: 'South America', format: 'league', stages: [{ name: 'Round Robin', description: '10 teams, home & away', teams: 10, rounds: 18 }] },
      29: { name: 'WC Qualifiers Africa', country: 'Africa', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: '9 groups', groups: 9 }, { name: 'Playoffs', teams: 18 }] },
      30: { name: 'WC Qualifiers Asia', country: 'Asia', format: 'groups_knockout', stages: [{ name: 'Round 1 & 2' }, { name: 'Round 3 Groups', groups: 3 }, { name: 'Round 4 Playoff' }] },
      31: { name: 'WC Qualifiers North America', country: 'North America', format: 'groups_knockout', stages: [{ name: 'Group Stage' }, { name: 'Octagonal', description: '8 teams', teams: 8 }] },
      33: { name: 'WC Qualifiers Oceania', country: 'Oceania', format: 'groups_knockout', stages: [{ name: 'Group Stage' }, { name: 'Finals' }] },
      // ==================== DOMESTIC CUPS ====================
      45: { name: 'FA Cup', country: 'England', format: 'knockout', stages: [{ name: 'Knockout', description: 'Replays in early rounds' }] },
      48: { name: 'League Cup', country: 'England', format: 'knockout', stages: [{ name: 'Knockout', description: 'Two-leg semis' }] },
      143: { name: 'Copa del Rey', country: 'Spain', format: 'knockout', stages: [{ name: 'Knockout', description: 'Two-leg ties' }] },
      137: { name: 'Coppa Italia', country: 'Italy', format: 'knockout', stages: [{ name: 'Knockout' }] },
      81: { name: 'DFB Pokal', country: 'Germany', format: 'knockout', stages: [{ name: 'Knockout' }] },
      66: { name: 'Coupe de France', country: 'France', format: 'knockout', stages: [{ name: 'Knockout' }] },
      73: { name: 'Copa de la Liga', country: 'Spain', format: 'knockout', stages: [{ name: 'Knockout' }] },
      514: { name: 'Supercopa', country: 'Spain', format: 'knockout', stages: [{ name: 'Semi-finals', teams: 4 }, { name: 'Final', teams: 2 }] },
      528: { name: 'Community Shield', country: 'England', format: 'knockout', stages: [{ name: 'Final', description: 'PL champion vs FA Cup winner', teams: 2 }] },
      547: { name: 'DFL Supercup', country: 'Germany', format: 'knockout', stages: [{ name: 'Final', teams: 2 }] },
      556: { name: 'Supercoppa Italiana', country: 'Italy', format: 'knockout', stages: [{ name: 'Final', teams: 2 }] },
      526: { name: 'Trophée des Champions', country: 'France', format: 'knockout', stages: [{ name: 'Final', teams: 2 }] },
      102: { name: 'Norwegian Cup', country: 'Norway', format: 'knockout', stages: [{ name: 'Knockout' }] },
      118: { name: 'Danish Cup', country: 'Denmark', format: 'knockout', stages: [{ name: 'Knockout' }] },
      112: { name: 'Swedish Cup', country: 'Sweden', format: 'knockout', stages: [{ name: 'Knockout' }] },
      90: { name: 'KNVB Beker', country: 'Netherlands', format: 'knockout', stages: [{ name: 'Knockout' }] },
      96: { name: 'Taça de Portugal', country: 'Portugal', format: 'knockout', stages: [{ name: 'Knockout' }] },
      // ==================== YOUTH COMPETITIONS ====================
      14: { name: 'UEFA Youth League', country: 'Europe', format: 'groups_knockout', stages: [{ name: 'Group Stage', description: 'Mirrors CL groups', groups: 36 }, { name: 'Knockout Stage' }] },
      480: { name: 'FIFA U-20 World Cup', country: 'World', format: 'groups_knockout', stages: [{ name: 'Group Stage', teams: 24, groups: 6 }, { name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Final', teams: 2 }] },
      515: { name: 'FIFA U-17 World Cup', country: 'World', format: 'groups_knockout', stages: [{ name: 'Group Stage', teams: 24, groups: 6 }, { name: 'Round of 16', teams: 16 }, { name: 'Quarter-finals', teams: 8 }, { name: 'Final', teams: 2 }] }
    };
    
    // Get stored format or build generic one
    let structure = competitionFormats[id];
    
    if (!structure) {
      // Build generic structure based on tournament info
      const format = tournamentInfo.format || 'league';
      structure = {
        name: tournamentInfo.name || `League ${id}`,
        country: tournamentInfo.country || 'Unknown',
        format: format,
        stages: []
      };
      
      // Infer stages from current data
      if (tournamentInfo.groups && tournamentInfo.groups.length > 0) {
        if (format === 'groups_knockout') {
          structure.stages.push({ name: 'Group Stage', description: `${tournamentInfo.groups.length} groups`, teams: tournamentInfo.totalTeams });
          structure.stages.push({ name: 'Knockout Stage', description: 'Elimination rounds' });
        } else if (format === 'league_with_playoffs') {
          tournamentInfo.groups.forEach(g => {
            structure.stages.push({ name: g.name, teams: g.teams.length });
          });
        } else {
          structure.stages.push({ name: 'League', teams: tournamentInfo.totalTeams });
        }
      }
    }
    
    // Build dynamic qualification config based on format and stages
    let qualificationConfig = null;
    const totalTeams = tournamentInfo.totalTeams || structure.stages[0]?.teams || 0;
    
    if (structure.format === 'swiss_knockout') {
      // Swiss system: Calculate from stages
      // Find playoff stage to determine cutoff
      const playoffStage = structure.stages.find(s => s.name.toLowerCase().includes('playoff'));
      const r16Stage = structure.stages.find(s => s.name.toLowerCase().includes('16'));
      
      const playoffTeams = playoffStage?.teams || 16;
      const directQualify = r16Stage?.teams ? r16Stage.teams / 2 : 8;
      const playoffEnd = directQualify + playoffTeams;
      
      qualificationConfig = {
        type: 'swiss',
        zones: [
          { start: 1, end: directQualify, label: 'Direct to R16', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
          { start: directQualify + 1, end: playoffEnd, label: 'Playoffs', color: '#f59e0b', bgColor: 'rgba(251, 191, 36, 0.15)' },
          { start: playoffEnd + 1, end: totalTeams, label: 'Eliminated', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', eliminated: true }
        ],
        showOnly: playoffEnd // Only show teams 1-24 (not eliminated)
      };
    } else if (structure.format === 'groups_knockout') {
      // Groups: Top 2 qualify, 3rd might go to playoffs
      const groupCount = structure.stages[0]?.groups || tournamentInfo.groups?.length || 8;
      qualificationConfig = {
        type: 'groups',
        zones: [
          { start: 1, end: 2, label: 'Qualify', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
          { start: 3, end: 3, label: 'Possible Playoff', color: '#f59e0b', bgColor: 'rgba(251, 191, 36, 0.15)' },
          { start: 4, end: 4, label: 'Eliminated', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
        ],
        groupCount: groupCount
      };
    } else if (structure.format === 'league_with_playoffs') {
      // League with playoffs: Use specific zones if defined, otherwise use playoff split
      if (structure.qualificationZones) {
        qualificationConfig = {
          type: 'league',
          zones: structure.qualificationZones,
          promotion: structure.promotion,
          relegation: structure.relegation
        };
      } else {
        const champTeams = structure.stages.find(s => s.name.toLowerCase().includes('championship'))?.teams || 6;
        qualificationConfig = {
          type: 'playoff_split',
          zones: [
            { start: 1, end: champTeams, label: 'Championship Round', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
            { start: champTeams + 1, end: totalTeams, label: 'Relegation Round', color: '#f59e0b', bgColor: 'rgba(251, 191, 36, 0.1)' }
          ],
          promotion: structure.promotion,
          relegation: structure.relegation
        };
      }
    } else if (structure.format === 'league') {
      // Regular league: Use league-specific zones if defined, otherwise show simple promotion/relegation
      if (structure.qualificationZones) {
        // Use league-specific qualification zones (for top division leagues)
        qualificationConfig = {
          type: 'league',
          zones: structure.qualificationZones,
          promotion: structure.promotion,
          relegation: structure.relegation
        };
      } else {
        // Default for lower divisions or undefined leagues - just promotion/relegation
        // Only show if we have at least 10 teams
        if (totalTeams >= 10) {
          qualificationConfig = {
            type: 'league',
            zones: [
              { start: 1, end: 2, label: 'Promotion', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
              { start: totalTeams - 1, end: totalTeams, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
            ],
            promotion: structure.promotion,
            relegation: structure.relegation
          };
        }
      }
    }
    
    // Add current status
    const response = {
      ...structure,
      leagueId: id,
      season: parseInt(targetSeason),
      totalTeams: totalTeams,
      qualificationConfig: qualificationConfig,
      currentStatus: {
        stage: tournamentInfo.currentStage,
        stageLabel: tournamentInfo.currentStageLabel,
        currentRound: tournamentInfo.currentRound,
        isFinished: tournamentInfo.currentStage === 'finished',
        isInProgress: tournamentInfo.currentStage === 'in_progress' || tournamentInfo.currentStage === 'league_playoffs',
        winner: tournamentInfo.winner
      },
      formatLabel: {
        'league': '🏆 League',
        'league_with_playoffs': '🎯 League + Playoffs',
        'groups_knockout': '⚽ Groups + Knockout',
        'swiss_knockout': '🔄 Swiss System + Knockout',
        'knockout': '🥊 Cup (Knockout)'
      }[structure.format] || '🏆 Competition'
    };
    
    res.json(response);
  } catch (error) {
    console.error('[API] Error fetching competition structure:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
