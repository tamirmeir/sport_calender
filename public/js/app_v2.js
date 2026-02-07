// Global Constants
// Use relative paths so it works on Localhost (via Proxy) AND Production (via Nginx)
const API_BASE = '/api/fixtures';
const AUTH_API = '/api/auth';
const FAV_API = '/api/favorites';

// State
let currentState = {
    step: 1,
    country: null,
    league: null,
    team: null
};

let allFixtures = [];
let userFavorites = new Map(); // Map of teamId -> {filters: [], isNational: bool}
let selectedFixtures = new Set(); // New state for checked items
let fixtureData = {}; // For calendar events
let teamCompetitionsCache = new Map(); // Cache for team competitions data
let tournamentDataCache = null; // Cache for tournament masters data

// Function to refresh tournament data cache
function refreshTournamentData() {
    tournamentDataCache = null;
    console.log('[TOURNAMENT] Cache cleared. Next load will fetch fresh data.');
}

// Leagues with verified competition structure data
// TOP tier leagues and major cups from around the world
const leaguesWithInfo = new Set([
    // England
    39, 45, 48, 528,
    // Germany
    78, 81, 547,
    // Italy
    135, 137, 556,
    // Spain
    140, 143, 514,
    // France
    61, 66, 526,
    // Portugal
    94, 96,
    // Netherlands
    88,
    // Belgium
    144,
    // Turkey
    203,
    // Russia
    235,
    // Greece
    197,
    // Scotland
    179,
    // Switzerland
    207,
    // Austria
    218,
    // Poland
    106,
    // Czech Republic
    345,
    // Denmark
    119,
    // Norway
    103,
    // Sweden
    113,
    // Israel
    383, 385,
    // South America
    71, 73, 128, 130, 250, 253, 265, 268, 283, 384, 541,
    // North America
    262, 480,
    // Asia
    188, 323, 307, 169,
    // Africa
    20, 29, 32, 96,
    // International
    1, 2, 3, 4, 5, 6, 9, 10, 15, 16, 17, 18, 19, 21, 960, 531, 533
]);

// Elements
const stepCountry = document.getElementById('stepCountry');
const stepLeague = document.getElementById('stepLeague');
const stepTeam = document.getElementById('stepTeam');

const countriesGrid = document.getElementById('countriesGrid');
const countrySearchInput = document.getElementById('countrySearch');
const leaguesGrid = document.getElementById('leaguesGrid');
const teamsGrid = document.getElementById('teamsGrid');

const fixturesContainer = document.getElementById('fixturesContainer');
const searchStatus = document.getElementById('searchStatus');

const teamIdInput = document.getElementById('teamId');

const downloadAllBtn = document.getElementById('downloadAllBtn');
const removeAllBtn = document.getElementById('removeAllBtn');

// --- Initialization ---

// Navigation Helper
const navBackBtn = document.getElementById('mainBackBtn');
const navStepLabel = document.getElementById('stepIndicator');

// --- Manual Continent Mapping ---
// Since API doesn't provide this, we map major football nations to confederations manually.
// This is stable data (confederations rarely change).
const CONTINENT_MAP = {
    'Europe': ['England','Spain','Italy','Germany','France','Portugal','Netherlands','Belgium','Austria','Scotland','Turkey','Russia','Ukraine','Greece','Switzerland','Denmark','Norway','Sweden','Poland','Croatia','Serbia','Israel','Czech Republic','Romania','Hungary','Ireland','Wales','Finland','Slovakia','Iceland','Bosnia','Slovenia','Bulgaria','Cyprus'],
    'SouthAmerica': ['Brazil','Argentina','Uruguay','Colombia','Chile','Peru','Ecuador','Paraguay','Venezuela','Bolivia'],
    'NorthAmerica': ['USA','Mexico','Canada','Costa Rica','Panama','Jamaica','Honduras','El Salvador','Guatemala'],
    'Africa': ['Egypt','Morocco','Nigeria','Senegal','Cameroon','Ghana','Ivory Coast','Algeria','Tunisia','South Africa','Mali'],
    'Asia': ['Saudi Arabia','Japan','South Korea','China','Iran','Australia','Qatar','UAE','United Arab Emirates','Uzbekistan','Iraq','Thailand','Vietnam']
};

function updateNavigation(step, label, backAction) {
    if (navStepLabel) navStepLabel.textContent = label;
    
    if (navBackBtn) {
        if (backAction) {
            navBackBtn.style.visibility = 'visible';
            navBackBtn.onclick = backAction;
        } else {
            navBackBtn.style.visibility = 'hidden';
            navBackBtn.onclick = null;
        }
    }
}

window.addEventListener('load', () => {
    console.log('Match Calendar App Loaded');
    checkAuth();
    loadCountries();
});

// --- Helper: Update empty state message based on current step ---
function updateEmptyStateMessage() {
    if (!fixturesContainer) return;
    
    let message = '';
    const mode = currentState.mode;
    
    if (!currentState.country) {
        // Step 1
        if (mode === 'country') {
            message = '👆 Select a country above to get started';
        } else if (mode === 'continent') {
            message = '👆 Select a continent above to explore';
        } else if (mode === 'global') {
            message = '👆 Select a competition above to view teams';
        } else {
            message = '👆 Select a country or continent to get started';
        }
    } else if (!currentState.league) {
        // Step 2 - Country/Region selected
        if (mode === 'continent') {
            // In continent hub - could be viewing countries, clubs, or national tabs
            message = `👆 Select a country or competition from ${currentState.country} to continue`;
        } else {
            message = `👆 Select a competition from ${currentState.country} to continue`;
        }
    } else if (!currentState.team) {
        // Step 3 - League selected
        const leagueName = currentState.leagueName || 'this competition';
        message = `👆 Select a team from ${leagueName} to view match schedule`;
    } else {
        message = 'Loading match schedule...';
    }
    
    fixturesContainer.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
}

// --- Explorer Logic ---

let cachedCountries = []; // Store countries to avoid re-fetching on mode switch

async function loadCountries() {
    // STARTUP: Default to Country Mode
    showCountrySelection();
}

function updateTabState(activeMode) {
    const tabContinent = document.getElementById('tabContinent');
    const tabGlobal = document.getElementById('tabGlobal');
    const tabCountry = document.getElementById('tabCountry');
    
    // Clear all
    if(tabContinent) tabContinent.classList.remove('active');
    if(tabGlobal) tabGlobal.classList.remove('active');
    if(tabCountry) tabCountry.classList.remove('active');

    // Set active
    if (activeMode === 'continent' && tabContinent) {
        tabContinent.classList.add('active');
    } else if (activeMode === 'global' && tabGlobal) {
        tabGlobal.classList.add('active');
    } else if (activeMode === 'country' && tabCountry) {
        tabCountry.classList.add('active');
    }
}

// --- Countdown Helper: Calculate days until next match ---
function formatCountdown(dateString) {
    const matchDate = new Date(dateString);
    const now = new Date();
    const diffTime = matchDate - now;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffTime < 0) return null; // Match already started
    
    if (diffDays === 0) {
        if (diffHours <= 1) return 'Starting soon!';
        return `In ${diffHours} hours`;
    } else if (diffDays === 1) {
        return 'Tomorrow';
    } else if (diffDays <= 7) {
        return `In ${diffDays} days`;
    } else {
        // Format date
        return matchDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
}

// Fetch and display countdown for a league card
async function fetchLeagueCountdown(leagueId) {
    try {
        const response = await fetch(`${API_BASE}/league-next/${leagueId}`);
        const data = await response.json();
        
        const countdownEl = document.getElementById(`countdown-${leagueId}`);
        if (!countdownEl) return;
        
        if (data.hasNext && data.fixture) {
            const countdown = formatCountdown(data.fixture.date);
            if (countdown) {
                // Determine if match is soon (today/tomorrow)
                const isSoon = countdown.includes('hour') || countdown === 'Today' || countdown === 'Tomorrow';
                const badgeClass = isSoon ? 'countdown-badge soon' : 'countdown-badge';
                const icon = isSoon ? '⚽' : '🗓️';
                countdownEl.innerHTML = `<span class="${badgeClass}"><span class="countdown-icon">${icon}</span>${countdown}</span>`;
            }
        }
    } catch (e) {
        console.log(`[UI] Countdown fetch failed for league ${leagueId}:`, e.message);
    }
}

// Fetch and display countdown for national team competitions (use nat- prefix for IDs)
async function fetchNationalCountdown(leagueId) {
    try {
        const response = await fetch(`${API_BASE}/league-next/${leagueId}`);
        const data = await response.json();
        
        const countdownEl = document.getElementById(`countdown-nat-${leagueId}`);
        if (!countdownEl) return;
        
        if (data.hasNext && data.fixture) {
            const countdown = formatCountdown(data.fixture.date);
            if (countdown) {
                const isSoon = countdown.includes('hour') || countdown === 'Today' || countdown === 'Tomorrow';
                const badgeClass = isSoon ? 'countdown-badge soon' : 'countdown-badge';
                const icon = isSoon ? '⚽' : '🗓️';
                countdownEl.innerHTML = `<span class="${badgeClass}"><span class="countdown-icon">${icon}</span>${countdown}</span>`;
            }
        }
    } catch (e) {
        console.log(`[UI] Countdown fetch failed for national league ${leagueId}:`, e.message);
    }
}

// Load tournament data from backend API
async function loadTournamentData() {
    try {
        if (tournamentDataCache) {
            return tournamentDataCache; // Return cached data
        }
        
        const response = await fetch(`${API_BASE}/tournaments/status/all`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Convert backend format to frontend format
        const convertedData = {};
        if (data.tournaments) {
            Object.entries(data.tournaments).forEach(([id, tournament]) => {
                convertedData[id] = {
                    status: tournament.status,  // 'finished', 'vacation', 'active', etc.
                    winner: tournament.winner   // null or { name, logo }
                };
            });
        }
        
        tournamentDataCache = convertedData;
        console.log('[TOURNAMENT] Loaded tournament data from backend:', Object.keys(convertedData).length, 'tournaments');
        console.log('[TOURNAMENT] Sample data:', Object.entries(convertedData).slice(0, 3));
        return convertedData;
    } catch (error) {
        console.error('[TOURNAMENT] Failed to load tournament data from backend:', error);
        
        // Fallback to hardcoded data if backend fails
        return {
            // Major International Tournaments (finished)
            1: { status: 'finished', winner: { name: 'Argentina', logo: 'https://media.api-sports.io/football/teams/26.png' } }, // World Cup 2022
            4: { status: 'finished', winner: { name: 'Spain', logo: 'https://media.api-sports.io/football/teams/9.png' } }, // Euro 2024
            9: { status: 'finished', winner: { name: 'Argentina', logo: 'https://media.api-sports.io/football/teams/26.png' } }, // Copa America 2024
            
            // Super Cups (finished)
            528: { status: 'finished', winner: { name: 'Manchester City', logo: 'https://media.api-sports.io/football/teams/50.png' } }, // Community Shield 2025
            531: { status: 'finished', winner: { name: 'Real Madrid', logo: 'https://media.api-sports.io/football/teams/541.png' } }, // UEFA Super Cup 2025
            514: { status: 'finished', winner: { name: 'Barcelona', logo: 'https://media.api-sports.io/football/teams/529.png' } }, // Supercopa de España 2025
            529: { status: 'finished', winner: { name: 'Bayer Leverkusen', logo: 'https://media.api-sports.io/football/teams/168.png' } }, // DFL Supercup 2025 (Germany)
            556: { status: 'finished', winner: { name: 'Inter', logo: 'https://media.api-sports.io/football/teams/505.png' } }, // Supercoppa Italiana 2025
            526: { status: 'finished', winner: { name: 'PSG', logo: 'https://media.api-sports.io/football/teams/85.png' } }, // Trophée des Champions 2025
            
            // Domestic Cups (finished)
            143: { status: 'finished', winner: { name: 'Athletic Bilbao', logo: 'https://media.api-sports.io/football/teams/531.png' } }, // Copa del Rey 2025
            66: { status: 'finished', winner: { name: 'PSG', logo: 'https://media.api-sports.io/football/teams/85.png' } },  // Coupe de France 2025
            
            // Tournaments on vacation
            385: { status: 'vacation', winner: { status: 'research_needed', priority: 'low' } }, // Toto Cup Ligat Al (Israel)
            533: { status: 'vacation', winner: { status: 'research_needed', priority: 'medium' } }, // CAF Super Cup (Africa)
            541: { status: 'vacation', winner: { status: 'research_needed', priority: 'medium' } }, // Recopa Sudamericana (South America)
            659: { status: 'vacation', winner: { status: 'research_needed', priority: 'low' } }  // Super Cup (Israel)
        };
    }
}


function showContinentSelection() {
    currentState.mode = 'continent'; // Set Mode
    currentState.country = null;
    currentState.league = null;
    currentState.team = null;
    
    updateNavigation(1, "Select Continent", null); // Root level
    updateTabState('continent');
    
    // Reset step visibility - show Step 1, hide Steps 2 & 3
    stepCountry.classList.remove('hidden');
    stepLeague.classList.add('hidden');
    stepTeam.classList.add('hidden');
    
    // Show mode tabs
    const tabs = document.getElementById('modeTabs');
    if (tabs) tabs.classList.remove('hidden');
    
    // Update empty state message
    updateEmptyStateMessage();
    
    if (countrySearchInput) countrySearchInput.style.display = 'none';

    countriesGrid.style.display = 'grid'; // Restore grid
    countriesGrid.classList.add('cards-grid');
    countriesGrid.innerHTML = '';

    const continents = [
        { name: 'Europe (UEFA)', code: 'EU', flag: 'https://media.api-sports.io/football/leagues/2.png', regionFilter: 'Europe' },
        { name: 'South America', code: 'SA', flag: 'https://media.api-sports.io/football/leagues/13.png', regionFilter: 'SouthAmerica' },
        { name: 'Africa (CAF)', code: 'AF', flag: 'https://media.api-sports.io/football/leagues/16.png', regionFilter: 'Africa' },
        { name: 'Asia (AFC)', code: 'AS', flag: 'https://media.api-sports.io/football/leagues/17.png', regionFilter: 'Asia' },
        { name: 'North America', code: 'NA', flag: 'https://media.api-sports.io/football/leagues/35.png', regionFilter: 'NorthAmerica' },
        // Global moved to its own tab
    ];

    continents.forEach(c => {
        const card = document.createElement('div');
        card.className = 'grid-card';
        card.style.cursor = 'pointer';
        // Go to Continent Hub (Step 2)
        card.onclick = () => selectCountry(c.name, c.flag, c.regionFilter);
        
        card.innerHTML = `
            <img src="${c.flag}" alt="${c.name}" style="width:40px; height:40px; pointer-events: none;">
            <span style="pointer-events: none;">${c.name}</span>
        `;
        countriesGrid.appendChild(card);
    });
}
/*
function filterCountriesByRegion(regionKey, regionName, activeFlag) {
   // Deprecated in favor of Tabbed Hub
}
*/

function showGlobalSelection() {
    currentState.mode = 'global';
    currentState.country = null;
    currentState.league = null;
    currentState.team = null;
    
    updateNavigation(1, "Global Competitions", null);
    updateTabState('global');
    
    // Reset step visibility - show Step 1, hide Steps 2 & 3
    stepCountry.classList.remove('hidden');
    stepLeague.classList.add('hidden');
    stepTeam.classList.add('hidden');
    
    // Show mode tabs
    const tabs = document.getElementById('modeTabs');
    if (tabs) tabs.classList.remove('hidden');
    
    // Update empty state message
    updateEmptyStateMessage();
    
    if (countrySearchInput) countrySearchInput.style.display = 'none';

    countriesGrid.style.display = 'grid';
    countriesGrid.classList.add('cards-grid');
    countriesGrid.innerHTML = '';

    // Render Global Competitions directly
    const globals = [
        {id: 1, name: 'World Cup', logo: 'https://media.api-sports.io/football/leagues/1.png'}, 
        {id: 10, name: 'Friendlies', logo: 'https://media.api-sports.io/football/leagues/10.png'},
        {id: 15, name: 'FIFA Club World Cup', logo: 'https://media.api-sports.io/football/leagues/15.png', status: 'vacation'},
        {id: 8, name: "Women's World Cup", logo: 'https://media.api-sports.io/football/leagues/8.png', status: 'vacation'}
    ];

    globals.forEach(c => {
        const card = document.createElement('div');
        card.className = 'grid-card';
        
        const isVacation = c.status === 'vacation';
        if (isVacation) {
            card.classList.add('vacation-card');
            card.style.position = 'relative';
            card.style.cursor = 'default';
            card.innerHTML = `
                <span class="vacation-badge" style="position:absolute;top:8px;left:8px;font-size:1.5rem;z-index:10;">🏖️</span>
                <div class="card-content" style="filter:grayscale(1);opacity:0.6;">
                    <img src="${c.logo}" alt="${c.name}" onerror="this.src='/favicon.svg'" style="width:40px; height:40px;">
                    <span>${c.name}</span>
                </div>
            `;
        } else {
            // Mark as competition context and use World region for filtering
            card.onclick = () => {
                 currentState.regionFilter = 'World'; 
                 selectLeague(c.id, c.name, true);
            };
            card.innerHTML = `
                    <img src="${c.logo}" alt="${c.name}" onerror="this.src='/favicon.svg'" style="width:40px; height:40px;">
                    <span>${c.name}</span>
            `;
        }
        countriesGrid.appendChild(card);
    });
}

// Show Subscriptions Tab - display user's subscribed teams inline
window.showSubscriptionsTab = function() {
    const token = localStorage.getItem('token');
    const countriesGrid = document.getElementById('countriesGrid');
    
    // Update tab states
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tabSubscriptions').classList.add('active');
    
    // Update step indicator
    const stepIndicator = document.getElementById('stepIndicator');
    if (stepIndicator) stepIndicator.textContent = 'Your Subscribed Teams';
    
    // Hide search input
    const searchInput = document.getElementById('countrySearch');
    if (searchInput) searchInput.style.display = 'none';
    
    if (!token) {
        // User not logged in - show login invite
        countriesGrid.innerHTML = `
            <div class="login-invite-card">
                <div class="login-invite-icon">⭐</div>
                <h3>Track Your Favorite Teams</h3>
                <p>Login to subscribe to teams and get their matches synced to your calendar automatically!</p>
                <button class="login-invite-btn" onclick="openAuthModal('login')">Login / Sign Up</button>
            </div>
        `;
        return;
    }
    
    // User is logged in - show their subscribed teams
    const favs = window.userFavoritesData || [];
    
    if (favs.length === 0) {
        countriesGrid.innerHTML = `
            <div class="login-invite-card">
                <div class="login-invite-icon">📭</div>
                <h3>No Subscriptions Yet</h3>
                <p>Browse teams and click the ⭐ star to subscribe to your favorite teams!</p>
                <button class="login-invite-btn" onclick="showCountrySelection()">Browse Teams</button>
            </div>
        `;
        return;
    }
    
    // Render subscribed teams as clickable cards
    countriesGrid.innerHTML = `
        <div class="subscriptions-grid">
            ${favs.map(f => `
                <div class="subscription-card" onclick="loadTeamMatches(${f.team_id}, '${f.team_name.replace(/'/g, "\\'")}', '${f.team_logo || '/favicon.svg'}', ${f.is_national || false})">
                    <img src="${f.team_logo || '/favicon.svg'}" alt="${f.team_name}" onerror="this.src='/favicon.svg'">
                    <span class="sub-team-name">${f.team_name}</span>
                    <button class="sub-edit-btn" onclick="event.stopPropagation(); openEditSubscription(${f.team_id})" title="Edit subscription">⚙️</button>
                </div>
            `).join('')}
        </div>
    `;
};

// Load matches for a subscribed team
window.loadTeamMatches = async function(teamId, teamName, teamLogo, isNational) {
    currentState.team = teamId;
    currentState.isNationalView = isNational;
    
    // Show back button
    const backBtn = document.getElementById('mainBackBtn');
    if (backBtn) {
        backBtn.style.visibility = 'visible';
        backBtn.onclick = () => showSubscriptionsTab();
    }
    
    // Update step indicator
    const stepIndicator = document.getElementById('stepIndicator');
    if (stepIndicator) stepIndicator.textContent = teamName;
    
    // Show loading
    const countriesGrid = document.getElementById('countriesGrid');
    countriesGrid.innerHTML = `
        <div class="loading-state">
            <img src="${teamLogo}" alt="${teamName}" style="width: 60px; height: 60px; margin-bottom: 12px;">
            <p>Loading matches for ${teamName}...</p>
        </div>
    `;
    
    try {
        // Fetch team fixtures
        const res = await fetch(`/api/fixtures/team/${teamId}?next=20`);
        const data = await res.json();
        
        if (data.fixtures && data.fixtures.length > 0) {
            allFixtures = data.fixtures;
            displayFixtures(data.fixtures);
            
            // Show fixtures section, hide countries grid
            document.getElementById('stepCountry').classList.add('hidden');
            document.querySelector('.fixtures-section').scrollIntoView({ behavior: 'smooth' });
        } else {
            countriesGrid.innerHTML = `
                <div class="login-invite-card">
                    <div class="login-invite-icon">📅</div>
                    <h3>No Upcoming Matches</h3>
                    <p>No scheduled matches found for ${teamName}</p>
                    <button class="login-invite-btn" onclick="showSubscriptionsTab()">Back to Subscriptions</button>
                </div>
            `;
        }
    } catch (e) {
        console.error('Error loading team matches:', e);
        countriesGrid.innerHTML = `
            <div class="login-invite-card">
                <div class="login-invite-icon">❌</div>
                <h3>Error Loading Matches</h3>
                <p>${e.message}</p>
                <button class="login-invite-btn" onclick="showSubscriptionsTab()">Back</button>
            </div>
        `;
    }
};

// Update subscriptions tab on auth change
function updateSubscriptionsTabState() {
    const token = localStorage.getItem('token');
    const subTab = document.getElementById('tabSubscriptions');
    if (subTab) {
        if (token) {
            subTab.querySelector('.tab-text').textContent = 'Your Subscriptions';
        } else {
            subTab.querySelector('.tab-text').textContent = 'Login to Subscribe';
        }
    }
}

async function showCountrySelection() {
    currentState.mode = 'country'; // Set Mode
    currentState.country = null;
    currentState.league = null;
    currentState.team = null;
    
    updateNavigation(1, "Select Country", null); // Root level
    updateTabState('country');
    
    // Reset step visibility - show Step 1, hide Steps 2 & 3
    stepCountry.classList.remove('hidden');
    stepLeague.classList.add('hidden');
    stepTeam.classList.add('hidden');
    
    // Show mode tabs
    const tabs = document.getElementById('modeTabs');
    if (tabs) tabs.classList.remove('hidden');
    
    // Update empty state message
    updateEmptyStateMessage();
    
    if (countrySearchInput) countrySearchInput.style.display = 'block';

    countriesGrid.style.display = 'grid';
    countriesGrid.classList.add('cards-grid');
    countriesGrid.innerHTML = '<div class="loading">Loading countries...</div>';

    try {
        if (cachedCountries.length === 0) {
            const response = await fetch(`${API_BASE}/countries`);
            const data = await response.json();
            cachedCountries = Array.isArray(data) ? data : (data.response || []);
        }

        if (cachedCountries.length > 0) {
             // Sort and Render Logic (Reused)
            countriesGrid.innerHTML = '';
            
            const allCountries = cachedCountries.sort((a, b) => a.name.localeCompare(b.name));
            const priorityNames = ['England', 'Spain', 'Italy', 'Germany', 'France', 'Israel', 'Portugal', 'Netherlands', 'Brazil', 'Argentina', 'USA'];
            const priorityList = [];
            const otherList = [];

            allCountries.forEach(c => {
                if (priorityNames.includes(c.name)) priorityList.push(c);
                else otherList.push(c);
            });
            priorityList.sort((a, b) => priorityNames.indexOf(a.name) - priorityNames.indexOf(b.name));
            
            const combinedList = [...priorityList, ...otherList];
            renderCountriesList(combinedList);

            // Setup Search
            const searchInput = document.getElementById('countrySearch');
            if (searchInput) {
                // Ensure we unbind old listeners or just overwrite
                searchInput.oninput = (e) => {
                    const term = e.target.value.toLowerCase();
                    const filtered = combinedList.filter(c => c.name.toLowerCase().includes(term));
                    renderCountriesList(filtered);
                };
            }
        }
    } catch (e) {
        countriesGrid.innerHTML = '<p class="error">Failed to load countries.</p>';
    }
}

function renderCountriesList(list) {
    countriesGrid.innerHTML = '';
    const displayList = list.slice(0, 60);
    displayList.forEach(c => {
        const card = document.createElement('div');
        card.className = 'grid-card';
        card.style.cursor = 'pointer';
        card.onclick = () => selectCountry(c.name, c.flag); // Normal country select (No region filter)
        card.innerHTML = `
            <img src="${c.flag || 'https://media.api-sports.io/flags/' + c.code.toLowerCase() + '.svg'}" 
                 alt="${c.name}" onerror="this.style.display='none'" style="pointer-events: none;">
            <span style="font-size: 1.1rem; font-weight: 600; pointer-events: none;">${c.name}</span>
        `;
        countriesGrid.appendChild(card);
    });
}
// --- End New Explorer Logic ---

// Old loadCountries removed/replaced by above

function renderCountries(list, regions = []) {
    // Deprecated by new split flow, keeping for safety if called elsewhere but logic moved
}

function selectCountry(country, flag, regionFilter = null) {
    currentState.country = country;
    currentState.flag = flag; 
    currentState.regionFilter = regionFilter; // Store special filter
    currentState.league = null; // Reset
    currentState.team = null; // Reset
    
    // Clear fixtures (e.g. from previous Favorites selection)
    updateEmptyStateMessage();
    allFixtures = [];
    toggleDownloadButtons(false);

    if (regionFilter) {
        loadContinentHub();
    } else {
        loadCountryHub();
    }
}

// --- Path A: Country Hub ---
async function loadCountryHub() {
    const country = currentState.country;
    if (!country) return;

    // UI Transition
    stepCountry.classList.add('hidden');
    stepLeague.classList.remove('hidden');
    
    // Hide Tabs in Step 2 (Hub)
    const tabs = document.getElementById('modeTabs');
    if (tabs) tabs.classList.add('hidden');

    updateNavigation(2, `Step 2: ${country} Hub`, resetToCountry);
    
    // Switch to Block layout for sections (disable parent Grid)
    leaguesGrid.classList.remove('cards-grid');
    leaguesGrid.innerHTML = '<div class="loading">Loading country hub...</div>';

    try {
        leaguesGrid.innerHTML = '';

        // 1. Create Tabs
        const tabsDiv = document.createElement('div');
        tabsDiv.className = 'tabs-nav';
        tabsDiv.style.justifyContent = 'flex-start';
        tabsDiv.style.marginBottom = '20px';
        tabsDiv.innerHTML = `
            <button class="tab-btn active" onclick="switchCountryTab(this, 'tab-domestic')">Domestic Competitions</button>
            <button class="tab-btn" onclick="switchCountryTab(this, 'tab-national')">National Team</button>
        `;
        leaguesGrid.appendChild(tabsDiv);

        // 2. Create Containers
        
        // --- Domestic Tab (Default Visible) ---
        const domesticDiv = document.createElement('div');
        domesticDiv.id = 'tab-domestic';
        // Grid for leagues
        domesticDiv.innerHTML = '<div id="domestic-grid" class="cards-grid"></div>';
        leaguesGrid.appendChild(domesticDiv);

        // --- National Tab (Hidden) ---
        const nationalDiv = document.createElement('div');
        nationalDiv.id = 'tab-national';
        nationalDiv.className = 'hidden';
        nationalDiv.innerHTML = `
            <div class="cards-grid">
                <div class="grid-card league-active" onclick="selectLeague('NATIONAL', 'National Team')">
                    <div class="card-content">
                        <img src="${currentState.flag || 'https://media.api-sports.io/flags/xw.svg'}" alt="National Team" onerror="this.src='https://media.api-sports.io/flags/xw.svg'">
                        <div class="league-info">
                            <span class="league-name">${country} National Team</span>
                            <span class="league-subtitle">Qualifiers, Friendlies & Cups</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        leaguesGrid.appendChild(nationalDiv);


        // Fetch Leagues
        const response = await fetch(`${API_BASE}/leagues?country=${encodeURIComponent(country)}`);
        const data = await response.json();
        const leagueList = Array.isArray(data) ? data : (data.response || []);
        
        const domesticGrid = domesticDiv.querySelector('#domestic-grid');

        if (leagueList.length > 0) {
            // Map to include status - filtering is done on backend
            let leagues = leagueList
                .map(item => {
                    // Handle New Lightweight API Format (Flat object)
                    if (item.id && item.name) {
                        return item; 
                    }
                    // Legacy/Live API Format ({ league: {...}, ... })
                    if (item.league) {
                        return {
                            ...item.league,
                            status: item.status || 'active',
                            ui_label: 'active'
                        };
                    }
                    return null;
                })
                .filter(l => l && l.name);

            // Sort: Priority Logic for Domestic Competitions
            leagues.sort((a, b) => {
                 // 0. Active Status Priority
                 // Active (top) > Vacation (bottom)
                 const statusA = (a.status === 'vacation') ? 1 : 0;
                 const statusB = (b.status === 'vacation') ? 1 : 0;
                 if (statusA !== statusB) return statusA - statusB;

                 // 1. Leagues before Cups
                 const typeA = a.type || '';
                 const typeB = b.type || '';
                 if (typeA === 'League' && typeB !== 'League') return -1;
                 if (typeB === 'League' && typeA !== 'League') return 1;

                 // 2. Name-based Tier Heuristic (Overrides ID for common patterns)
                 const getTier = (name) => {
                     const n = (name || '').toLowerCase();
                     // Tier 1: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, etc.
                     if (n.includes('premier league') || n === 'serie a' || (n.includes('bundesliga') && !n.includes('2.')) || n === 'ligue 1' || n.includes('primeira liga') || n.includes('eredivisie') || n === 'la liga' || n.includes('super lig') || n.includes('jupiter pro') || n.includes('ligat haal') || n.includes("ligat ha'al")) return 1;
                     // Tier 2: Championship, Serie B, Ligue 2, 2. Bundesliga, Liga Leumit
                     if (n.includes('championship') || n === 'serie b' || n.includes('segunda') || n.includes('ligue 2') || n.includes('2. bundesliga') || n.includes('eerste divisie') || n.includes('liga leumit')) return 2;
                     // Tier 3: League One, Serie C, 3. Liga
                     if (n.includes('league one') || n === 'serie c' || n.includes('3. liga')) return 3;
                     // Tier 4: League Two
                     if (n.includes('league two')) return 4;
                     // Tier 5: National League (England Tier 5)
                     if (n === 'national league') return 5;
                     // Cups - after leagues
                     if (n.includes('cup') || n.includes('copa') || n.includes('pokal') || n.includes('coupe')) return 6;
                     
                     return 10; // Default / Unknown
                 };

                 const tierA = getTier(a.name);
                 const tierB = getTier(b.name);

                 if (tierA !== tierB) return tierA - tierB;

                 // 3. Fallback: ID (Reliable for most Top 5 leagues)
                 return a.id - b.id; 
            });
            
            // Backend already filters and limits to 15
            
            // Load tournament data from backend (replaces hardcoded finishedTournaments)
            const finishedTournaments = await loadTournamentData();
            console.log('[TOURNAMENT] Processing leagues with tournament data:', Object.keys(finishedTournaments).length, 'tournaments');
            
            leagues.forEach(league => {
                const card = document.createElement('div');
                card.className = 'grid-card';
                card.id = `league-card-${league.id}`;
                
                // Get tournament info from backend data (combines status + winner data)
                const tournamentInfo = finishedTournaments[league.id]; 
                const isVacation = (league.status === 'vacation') || (tournamentInfo && tournamentInfo.status === 'vacation');
                const isFinished = tournamentInfo && tournamentInfo.status === 'finished' && tournamentInfo.winner;
                
                if (isFinished) {
                    console.log('[TOURNAMENT] Found finished tournament:', league.id, league.name, 'Winner:', tournamentInfo.winner.name);
                    // Finished tournament - show elegant finished state with winner
                    card.classList.add('finished-card');
                    card.style.position = 'relative';
                    card.style.cursor = 'default';
                    
                    const winnerDisplay = tournamentInfo.winner ? 
                        `<div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px;background:rgba(255,255,255,0.6);border-radius:6px;">
                            <img src="${tournamentInfo.winner.logo}" alt="${tournamentInfo.winner.name}" style="width:24px;height:24px;object-fit:contain;" onerror="this.style.display='none'">
                            <div style="flex:1;">
                                <div style="font-size:0.7rem;color:#8b6914;font-weight:600;">WINNER</div>
                                <div style="font-size:0.85rem;color:#6b5416;font-weight:700;">${tournamentInfo.winner.name}</div>
                            </div>
                        </div>` : '';
                    
                    card.innerHTML = `
                        <div class="card-content" style="filter:grayscale(0.2);opacity:0.8;border:2px solid #d4af37;background:linear-gradient(135deg, #fffdf7 0%, #f9f6e8 100%);">
                            <div style="position:absolute;top:8px;right:8px;font-size:1.5rem;">🏆</div>
                            <img src="${league.logo}" alt="${league.name}" style="opacity:0.75;" onerror="this.src='/favicon.svg'">
                            <span class="league-name" style="color:#6b5416;font-weight:600;">${league.name}</span>
                            <div style="margin-top:12px;padding:10px 14px;background:rgba(212,175,55,0.15);border-radius:8px;border:1px dashed #d4af37;">
                                <div style="font-size:0.9rem;color:#8b6914;font-weight:700;letter-spacing:0.5px;">TOURNAMENT</div>
                                <div style="font-size:0.85rem;color:#6b5416;margin-top:2px;">Completed</div>
                            </div>
                            ${winnerDisplay}
                        </div>
                    `;
                } else if (isVacation) {
                    card.classList.add('vacation-card');
                    card.style.position = 'relative';
                    card.innerHTML = `
                        <span class="vacation-badge" style="position:absolute;top:8px;left:8px;font-size:1.5rem;z-index:10;">🏖️</span>
                        <div class="card-content" style="filter:grayscale(1);opacity:0.6;">
                            <img src="${league.logo}" alt="${league.name}" onerror="this.src='/favicon.svg'">
                            <span class="league-name">${league.name}</span>
                        </div>
                    `;
                } else {
                    card.classList.add('league-active');
                    // Pass league type to selection
                    // ALL domestic competitions (League or Cup) default to filtered view
                    card.onclick = (e) => {
                        if (e.target.closest('.info-btn')) return; // Don't select if clicking info
                        selectLeague(league.id, league.name, true, league.type);
                    };
                    
                    // Only show info button if league has verified structure data
                    const infoButton = leaguesWithInfo.has(league.id) ? 
                        `<button class="info-btn" onclick="showCompetitionInfo(${league.id}, '${league.name.replace(/'/g, "\\'")}'); event.stopPropagation();" title="Competition info">
                            <span class="info-circle">i</span>
                        </button>` : '';
                    
                    card.innerHTML = `
                        <div class="card-content">
                            <img src="${league.logo}" alt="${league.name}" onerror="this.src='https://media.api-sports.io/football/leagues/1.png'">
                            <div class="league-info">
                                <span class="league-name">${league.name}</span>
                                <div class="league-status-row">
                                    <span class="league-status-badge" id="status-${league.id}" style="font-size:0.75rem;padding:3px 8px;border-radius:12px;font-weight:600;display:none;margin-top:6px;"></span>
                                    <span class="next-match-countdown" id="countdown-${league.id}"></span>
                                </div>
                            </div>
                            ${infoButton}
                        </div>
                    `;
                    // Fetch status and countdown asynchronously
                    fetchLeagueStatus(league.id, league.country);
                    fetchLeagueCountdown(league.id);
                }
                domesticGrid.appendChild(card);
            });
        } else {
            domesticGrid.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">🏟️</div>
                    <h3 style="color: #64748b; margin-bottom: 12px;">No Leagues Available</h3>
                    <p style="color: #94a3b8;">This country doesn't have any active leagues in our database.</p>
                    <p style="color: #94a3b8; margin-top: 8px;">Try selecting a different country.</p>
                </div>
            `;
            domesticGrid.classList.remove('cards-grid');
        }

    } catch(e) { 
        leaguesGrid.innerHTML = '<p class="error">Error loading hub.</p>'; 
    }
}

// Check league status by fetching fixtures
async function getLeagueStatus(leagueId) {
    try {
        // Try to get a major team for this league from our test teams map
        const testTeams = {
            39: 33,    // Premier League -> Man United
            140: 532,  // La Liga -> Real Madrid
            135: 50,   // Serie A -> Milan
            78: 157,   // Bundesliga -> Bayern
            61: 157,   // Ligue 1 -> PSG
            2: 33,     // Champions League -> Man United
            3: 33,     // Europa League -> Man United
            4: 33      // Conference League -> Man United
        };
        
        const teamId = testTeams[leagueId] || 33; // Default to Man United
        const response = await fetch(`${API_BASE}/fixtures/team/${teamId}?next=20`);
        const data = await response.json();
        const fixtures = Array.isArray(data) ? data : (data.response || []);
        
        // Count fixtures in this league
        const leagueFixtures = fixtures.filter(f => f.league?.id == leagueId);
        
        if (leagueFixtures.length > 0) {
            return { status: 'active', count: leagueFixtures.length };
        } else {
            return { status: 'break', count: 0 };
        }
    } catch (e) {
        return { status: 'unknown', count: 0 };
    }
}

// Fetch and display league status
async function fetchLeagueStatus(leagueId, leagueCountry, idPrefix = 'status') {
    const badge = document.getElementById(`${idPrefix}-${leagueId}`);
    if (!badge) return;
    
    const statusData = await getLeagueStatus(leagueId);
    
    if (statusData.status === 'active') {
        badge.innerHTML = `🟢 Active (${statusData.count} matches)`;
        badge.style.background = '#dcfce7';
        badge.style.color = '#166534';
        badge.style.border = '1px solid #86efac';
        badge.style.display = 'inline-block';
    } else if (statusData.status === 'break') {
        // Smart detection based on region and current month
        const now = new Date();
        const month = now.getMonth(); // 0=Jan, 11=Dec
        
        // Detect region from country
        const europeanCountries = ['England', 'Spain', 'Germany', 'France', 'Italy', 'Portugal', 'Netherlands', 'Belgium', 'Scotland', 'Turkey', 'Greece', 'Switzerland', 'Austria', 'Denmark', 'Sweden', 'Norway', 'Poland', 'Czech-Republic', 'Ukraine', 'Russia', 'Croatia', 'Serbia', 'Romania', 'Bulgaria', 'Israel'];
        const southAmericanCountries = ['Brazil', 'Argentina', 'Uruguay', 'Paraguay', 'Chile', 'Colombia', 'Ecuador', 'Peru', 'Bolivia', 'Venezuela'];
        const asianCountries = ['Japan', 'South-Korea', 'China', 'Saudi-Arabia', 'Qatar', 'United-Arab-Emirates', 'Iran', 'Iraq', 'India', 'Thailand', 'Malaysia', 'Singapore', 'Indonesia', 'Vietnam'];
        const northernCountries = ['Sweden', 'Norway', 'Finland', 'Denmark', 'Iceland']; // Late start leagues
        
        let statusText;
        const country = leagueCountry || '';
        
        if (europeanCountries.includes(country) && !northernCountries.includes(country)) {
            // European leagues: August-May season
            if (month >= 5 && month <= 7) {
                statusText = '☀️ Off Season';
            } else if (month >= 11 || month === 0) {
                statusText = '❄️ Winter Break';
            } else {
                statusText = '⏸️ No Matches';
            }
        } else if (southAmericanCountries.includes(country)) {
            // South American leagues: Calendar year (no winter break)
            if (month >= 11 || month <= 1) {
                statusText = '☀️ Off Season';
            } else {
                statusText = '⏸️ No Matches';
            }
        } else if (northernCountries.includes(country)) {
            // Northern leagues: April-November season
            if (month >= 11 || month <= 2) {
                statusText = '❄️ Off Season';
            } else {
                statusText = '⏸️ No Matches';
            }
        } else if (asianCountries.includes(country)) {
            // Asian leagues: Varies, mostly August-May or Feb-Dec
            if (month >= 11 || month === 0) {
                statusText = '⏸️ No Matches';
            } else if (month >= 5 && month <= 7) {
                statusText = '☀️ Off Season';
            } else {
                statusText = '⏸️ No Matches';
            }
        } else {
            // Default: Generic message
            statusText = '⏸️ No Matches';
        }
        
        badge.innerHTML = statusText;
        badge.style.background = '#fef3c7';
        badge.style.color = '#92400e';
        badge.style.border = '1px solid #fcd34d';
        badge.style.display = 'inline-block';
    } else {
        badge.innerHTML = '⚪️ Status Unknown';
        badge.style.background = '#f3f4f6';
        badge.style.color = '#6b7280';
        badge.style.border = '1px solid #d1d5db';
        badge.style.display = 'inline-block';
    }
}

// Helper for Country Tab Switching
window.switchCountryTab = function(btn, tabId) {
    // Update Tabs
    const allTabs = btn.parentElement.querySelectorAll('.tab-btn');
    allTabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update Content
    const dom = document.getElementById('tab-domestic');
    const nat = document.getElementById('tab-national');
    
    if(!dom || !nat) return;

    if (tabId === 'tab-domestic') {
        dom.classList.remove('hidden');
        nat.classList.add('hidden');
    } else {
        dom.classList.add('hidden');
        nat.classList.remove('hidden');
    }
};

// --- Path B: Continent Hub ---
async function loadContinentHub() {
    const region = currentState.regionFilter;
    const regionName = currentState.country; // "Europe (UEFA)" etc passes as country name in my simpler logic
    
    // Ensure we have country data for the "Countries" tab
    if (cachedCountries.length === 0) {
        try {
            const response = await fetch(`${API_BASE}/countries`);
            const data = await response.json();
            cachedCountries = Array.isArray(data) ? data : (data.response || []);
        } catch (e) {
            console.error("Failed to load countries for continent hub", e);
        }
    }

    stepCountry.classList.add('hidden');
    stepLeague.classList.remove('hidden');

    // Hide Tabs in Step 2 (Hub)
    const tabs = document.getElementById('modeTabs');
    if (tabs) tabs.classList.add('hidden');

    updateNavigation(2, `Step 2: ${regionName} Hub`, resetToCountry);
    
    leaguesGrid.innerHTML = '<div class="loading">Loading regional competitions...</div>';

    // Defined Hierarchy Mapping (User provided)
    const HIERARCHY = {
        'World': {
            clubs: [
                {id: 15, name: 'FIFA Club World Cup'}
            ], 
            national: [ {id: 1, name: 'World Cup'}, {id: 10, name: 'Friendlies'} ]
        },
        'Europe': {
            clubs: [ 
                {id: 2, name: 'UEFA Champions League'}, 
                {id: 3, name: 'UEFA Europa League'}, 
                {id: 848, name: 'UEFA Europa Conference League'},
                {id: 531, name: 'UEFA Super Cup', status: 'vacation'},
                {id: 525, name: "UEFA Champions League Women"},
                {id: 14, name: "UEFA Youth League"}
            ],
            national: [ 
                {id: 4, name: 'Euro Championship', status: 'vacation'}, 
                {id: 5, name: 'UEFA Nations League'},
                {id: 32, name: 'World Cup - Qualification Europe'},
                {id: 1, name: 'World Cup'}, // Included for convenience
                {id: 8, name: "Women's World Cup", status: 'vacation'}
            ]
        },
        'SouthAmerica': {
            clubs: [
                {id: 13, name: 'CONMEBOL Libertadores'},
                {id: 11, name: 'CONMEBOL Sudamericana'},
                {id: 541, name: 'CONMEBOL Recopa', status: 'vacation'}
            ],
            national: [
                {id: 9, name: 'Copa America', status: 'vacation'},
                {id: 34, name: 'World Cup - Qualification South America', status: 'vacation'},
                {id: 1, name: 'World Cup'}
            ]
        },
        'Asia': {
            clubs: [
                {id: 17, name: 'AFC Champions League'},
                {id: 18, name: 'AFC Cup'},
                {id: 1140, name: "AFC Women's Champions League", status: 'vacation'}
            ],
            national: [
                {id: 7, name: 'Asian Cup', status: 'vacation'},
                {id: 30, name: 'World Cup - Qualification Asia', status: 'vacation'},
                {id: 1, name: 'World Cup'}
            ]
        },
        'Africa': {
            clubs: [
                {id: 12, name: 'CAF Champions League'},
                {id: 20, name: 'CAF Confederation Cup'},
                {id: 533, name: 'CAF Super Cup'},
                {id: 1164, name: "CAF Women's Champions League"}
            ],
            national: [
                {id: 6, name: 'Africa Cup of Nations', status: 'vacation'},
                {id: 29, name: 'World Cup - Qualification Africa', status: 'vacation'},
                {id: 1, name: 'World Cup'}
            ]
        },
        'NorthAmerica': {
            clubs: [
                {id: 16, name: 'CONCACAF Champions League', status: 'vacation'},
                {id: 767, name: 'CONCACAF League', status: 'vacation'},
                {id: 1136, name: 'CONCACAF W Champions Cup', status: 'vacation'}
            ],
            national: [
                {id: 22, name: 'CONCACAF Gold Cup', status: 'vacation'},
                {id: 536, name: 'CONCACAF Nations League', status: 'vacation'},
                {id: 31, name: 'World Cup - Qualification CONCACAF', status: 'vacation'},
                {id: 1, name: 'World Cup'}
            ]
        }
    };

    const definitions = HIERARCHY[region];

    if (definitions) {
         // Render predefined lists logic
         await renderStructuredContinent(definitions, region);
    } else {
        // Fallback to Search API "World" with filter
        await fallbackContinentSearch(region);
    }
}

async function renderStructuredContinent(defs, region) {
    leaguesGrid.innerHTML = '';
    leaguesGrid.classList.remove('cards-grid');

    // Load tournament data from backend FIRST
    const tournamentData = await loadTournamentData();
    console.log('[CONTINENT HUB] Loaded tournament data:', Object.keys(tournamentData).length, 'tournaments');

    // 1. Create Tabs
    const tabsDiv = document.createElement('div');
    tabsDiv.className = 'tabs-nav';
    tabsDiv.style.justifyContent = 'flex-start';
    tabsDiv.style.marginBottom = '20px';
    tabsDiv.innerHTML = `
        <button class="tab-btn active" onclick="switchContinentTab(this, 'tab-countries')">Countries</button>
        <button class="tab-btn" onclick="switchContinentTab(this, 'tab-clubs')">Club Competitions</button>
        <button class="tab-btn" onclick="switchContinentTab(this, 'tab-national')">National Tournaments</button>
    `;
    leaguesGrid.appendChild(tabsDiv);

    // 2. Tab Content Containers
    
    // -- TAB 1: COUNTRIES --
    const countriesDiv = document.createElement('div');
    countriesDiv.id = 'tab-countries';
    countriesDiv.innerHTML = '<div id="cont-country-grid" class="cards-grid"></div>';
    leaguesGrid.appendChild(countriesDiv);

    // Populate Countries
    const countryGrid = countriesDiv.querySelector('#cont-country-grid');
    const allowed = new Set(CONTINENT_MAP[region] || []);
    // Use cachedCountries if available
    if (typeof cachedCountries !== 'undefined' && cachedCountries.length > 0) {
        const filtered = cachedCountries.filter(c => allowed.has(c.name));
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        
        filtered.forEach(c => {
             const card = document.createElement('div');
             card.className = 'grid-card';
             card.onclick = () => selectCountry(c.name, c.flag); // Goes to Country Hub (Step 2)
             card.innerHTML = `
                <img src="${c.flag || '/favicon.svg'}" onerror="this.src='/favicon.svg'" style="width:30px; height:20px; object-fit:cover;">
                <span>${c.name}</span>
             `;
             countryGrid.appendChild(card);
        });
        
        if (filtered.length === 0) {
             countryGrid.innerHTML = '<p class="empty-msg">No countries mapped for this region.</p>';
             countryGrid.classList.remove('cards-grid');
        }
    } else {
        countryGrid.innerHTML = '<p class="empty-msg">No countries data available.</p>';
        countryGrid.classList.remove('cards-grid');
    }


    // -- TAB 2: CLUBS --
    const clubsDiv = document.createElement('div');
    clubsDiv.id = 'tab-clubs';
    clubsDiv.className = 'hidden';
    clubsDiv.innerHTML = '<div id="cont-club-grid" class="cards-grid"></div>';
    leaguesGrid.appendChild(clubsDiv);

    const clubGrid = clubsDiv.querySelector('#cont-club-grid');
    if (defs.clubs && defs.clubs.length > 0) {
        defs.clubs.forEach(c => {
            const card = document.createElement('div');
            card.className = 'grid-card';
            
            // Check tournament data from backend
            const tournamentInfo = tournamentData[c.id];
            const isFinished = tournamentInfo && tournamentInfo.status === 'finished' && tournamentInfo.winner;
            const isVacation = !isFinished && (c.status === 'vacation' || c.matchCount === 0 || (Array.isArray(c.matches) && c.matches.length === 0));
            
            if (isFinished) {
                // Finished tournament - show Golden Card with winner
                console.log('[CONTINENT HUB] Rendering finished tournament:', c.id, c.name, 'Winner:', tournamentInfo.winner.name);
                card.classList.add('finished-card');
                card.style.position = 'relative';
                card.style.cursor = 'default';
                
                const winnerDisplay = tournamentInfo.winner ? 
                    `<div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px;background:rgba(255,255,255,0.6);border-radius:6px;">
                        <img src="${tournamentInfo.winner.logo}" alt="${tournamentInfo.winner.name}" style="width:24px;height:24px;object-fit:contain;" onerror="this.style.display='none'">
                        <div style="flex:1;">
                            <div style="font-size:0.7rem;color:#8b6914;font-weight:600;">WINNER</div>
                            <div style="font-size:0.85rem;color:#6b5416;font-weight:700;">${tournamentInfo.winner.name}</div>
                        </div>
                    </div>` : '';
                
                card.innerHTML = `
                    <div class="card-content" style="filter:grayscale(0.2);opacity:0.8;border:2px solid #d4af37;background:linear-gradient(135deg, #fffdf7 0%, #f9f6e8 100%);">
                        <div style="position:absolute;top:8px;right:8px;font-size:1.5rem;">🏆</div>
                        <img src="${getLeagueLogo(c.id)}" alt="${c.name}" style="opacity:0.75;" onerror="this.src='/favicon.svg'">
                        <span class="league-name" style="color:#6b5416;font-weight:600;">${c.name}</span>
                        <div style="margin-top:12px;padding:10px 14px;background:rgba(212,175,55,0.15);border-radius:8px;border:1px dashed #d4af37;">
                            <div style="font-size:0.9rem;color:#8b6914;font-weight:700;letter-spacing:0.5px;">TOURNAMENT</div>
                            <div style="font-size:0.85rem;color:#6b5416;margin-top:2px;">Completed</div>
                        </div>
                        ${winnerDisplay}
                    </div>
                `;
            } else if (isVacation) {
                card.classList.add('vacation-card');
                card.style.position = 'relative';
                card.innerHTML = `
                    <span class="vacation-badge" style="position:absolute;top:8px;left:8px;font-size:1.5rem;z-index:10;">🏖️</span>
                    <div class="card-content" style="filter:grayscale(1);opacity:0.6;">
                        <img src="${getLeagueLogo(c.id)}" alt="${c.name}" onerror="this.src='/favicon.svg'">
                        <span>${c.name}</span>
                    </div>
                `;
            } else {
                // Mark as competition context with isCompetition=true and type='Cup' (heuristic for cups/tournaments)
                card.onclick = (e) => {
                    if (e.target.closest('.info-btn')) return;
                    selectLeague(c.id, c.name, true, 'Cup');
                };
                
                // Only show info button if competition has verified structure data
                const infoButton = leaguesWithInfo.has(c.id) ? 
                    `<button class="info-btn" onclick="showCompetitionInfo(${c.id}, '${c.name.replace(/'/g, "\\'")}'); event.stopPropagation();" title="Competition info">
                        <span class="info-circle">i</span>
                    </button>` : '';
                
                card.innerHTML = `
                    <div class="card-content">
                        <img src="${getLeagueLogo(c.id)}" alt="${c.name}" onerror="this.src='/favicon.svg'">
                        <div class="league-info">
                            <span class="league-name">${c.name}</span>
                            <div class="league-status-row">
                                <span class="league-status-badge" id="status-${c.id}" style="font-size:0.75rem;padding:3px 8px;border-radius:12px;font-weight:600;display:none;margin-top:6px;"></span>
                                <span class="next-match-countdown" id="countdown-${c.id}"></span>
                            </div>
                        </div>
                        ${infoButton}
                    </div>
                `;
                
                // Fetch status and countdown asynchronously
                fetchLeagueStatus(c.id, c.country);
                fetchLeagueCountdown(c.id);
            }
            clubGrid.appendChild(card);
        });
    } else {
        clubGrid.innerHTML = '<p class="empty-msg">No club competitions listed.</p>';
        clubGrid.classList.remove('cards-grid');
    }

    // -- TAB 3: NATIONAL --
    const natDiv = document.createElement('div');
    natDiv.id = 'tab-national';
    natDiv.className = 'hidden';
    natDiv.innerHTML = '<div id="cont-nat-grid" class="cards-grid"></div>';
    leaguesGrid.appendChild(natDiv);

    const natGrid = natDiv.querySelector('#cont-nat-grid');
    if (defs.national && defs.national.length > 0) {
         defs.national.forEach(c => {
             const card = document.createElement('div');
             card.className = 'grid-card';
             
             // Check tournament data from backend
             const tournamentInfo = tournamentData[c.id];
             const isFinished = tournamentInfo && tournamentInfo.status === 'finished' && tournamentInfo.winner;
             const isVacation = !isFinished && c.status === 'vacation';
             
             if (isFinished) {
                 // Finished tournament - show Golden Card with winner
                 console.log('[CONTINENT HUB] Rendering finished national tournament:', c.id, c.name, 'Winner:', tournamentInfo.winner.name);
                 card.classList.add('finished-card');
                 card.style.position = 'relative';
                 card.style.cursor = 'default';
                 
                 const winnerDisplay = tournamentInfo.winner ? 
                     `<div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px;background:rgba(255,255,255,0.6);border-radius:6px;">
                         <img src="${tournamentInfo.winner.logo}" alt="${tournamentInfo.winner.name}" style="width:24px;height:24px;object-fit:contain;" onerror="this.style.display='none'">
                         <div style="flex:1;">
                             <div style="font-size:0.7rem;color:#8b6914;font-weight:600;">WINNER</div>
                             <div style="font-size:0.85rem;color:#6b5416;font-weight:700;">${tournamentInfo.winner.name}</div>
                         </div>
                     </div>` : '';
                 
                 card.innerHTML = `
                     <div class="card-content" style="filter:grayscale(0.2);opacity:0.8;border:2px solid #d4af37;background:linear-gradient(135deg, #fffdf7 0%, #f9f6e8 100%);">
                         <div style="position:absolute;top:8px;right:8px;font-size:1.5rem;">🏆</div>
                         <img src="${getLeagueLogo(c.id)}" alt="${c.name}" style="opacity:0.75;" onerror="this.src='/favicon.svg'">
                         <span class="league-name" style="color:#6b5416;font-weight:600;">${c.name}</span>
                         <div style="margin-top:12px;padding:10px 14px;background:rgba(212,175,55,0.15);border-radius:8px;border:1px dashed #d4af37;">
                             <div style="font-size:0.9rem;color:#8b6914;font-weight:700;letter-spacing:0.5px;">TOURNAMENT</div>
                             <div style="font-size:0.85rem;color:#6b5416;margin-top:2px;">Completed</div>
                         </div>
                         ${winnerDisplay}
                     </div>
                 `;
             } else if (isVacation) {
                 card.classList.add('vacation-card');
                 card.style.position = 'relative';
                 card.innerHTML = `
                     <span class="vacation-badge" style="position:absolute;top:8px;left:8px;font-size:1.5rem;z-index:10;">🏖️</span>
                     <div class="card-content" style="filter:grayscale(1);opacity:0.6;">
                         <img src="${getLeagueLogo(c.id)}" alt="${c.name}" onerror="this.src='/favicon.svg'">
                         <span>${c.name}</span>
                     </div>
                 `;
             } else {
                 // Mark as competition context
                 card.onclick = () => selectLeague(c.id, c.name, true, 'Cup');
                 card.innerHTML = `
                     <div class="card-content">
                         <img src="${getLeagueLogo(c.id)}" alt="${c.name}" onerror="this.src='/favicon.svg'">
                         <div class="league-info">
                             <span class="league-name">${c.name}</span>
                             <div class="league-status-row">
                                 <span class="league-status-badge" id="status-nat-${c.id}" style="font-size:0.75rem;padding:3px 8px;border-radius:12px;font-weight:600;display:none;margin-top:6px;"></span>
                                 <span class="next-match-countdown" id="countdown-nat-${c.id}"></span>
                             </div>
                         </div>
                     </div>
                 `;
                 
                 // Fetch status and countdown asynchronously
                 fetchLeagueStatus(c.id, 'World', 'status-nat');
                 fetchNationalCountdown(c.id);
             }
             natGrid.appendChild(card);
        });
    } else {
        natGrid.innerHTML = '<p class="empty-msg">No national tournaments listed.</p>';
        natGrid.classList.remove('cards-grid');
    }
}

// Global switcher for Continent Hub
window.switchContinentTab = function(btn, tabId) {
    // 1. Toggle Button State
    const allTabs = btn.parentElement.querySelectorAll('.tab-btn');
    allTabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 2. Toggle Content Visibility
    ['tab-countries', 'tab-clubs', 'tab-national'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === tabId) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    });
};

function getLeagueLogo(id) {
    return `https://media.api-sports.io/football/leagues/${id}.png`;
}

// Fallback (for Asia, Africa etc where I haven't hardcoded IDs yet)
async function fallbackContinentSearch(region) {
    try {
        const response = await fetch(`${API_BASE}/leagues?country=World`);
        const data = await response.json();
        const leagueList = Array.isArray(data) ? data : (data.response || []);
        
        // Simple text filter based on Region Name
        // Asia, Africa usually have "AFC", "CAF" in names
        const keywords = {
            'Asia': ['AFC', 'Asian Cup'],
            'Africa': ['CAF', 'Africa Cup'],
            'NorthAmerica': ['CONCACAF', 'Gold Cup', 'MLS'] // MLS is country specific but often desired
        }[region] || [];

        const filtered = leagueList.map(i => i.league).filter(l => {
             return keywords.some(k => l.name.includes(k));
        }).slice(0, 10);

        renderStructuredContinent({ clubs: filtered, national: [] }, region);
    } catch(e) { leaguesGrid.innerHTML = '<p>Failed to load competitions.</p>'; }
}


// Legacy / Renamed function to keep old calls valid if any exist
async function loadLeagues() {
    // This is now just a router to the hubs
    const country = currentState.country;
    if (!country) return;
    
    // Logic moved to selectCountry triggers
    if (currentState.regionFilter) {
        loadContinentHub();
    } else {
        loadCountryHub();
    }
}

async function selectLeague(leagueId, leagueName, isCompetitionContext = false, leagueType = 'League') {
    currentState.league = leagueId; // Can be 'NATIONAL' or an Integer ID
    currentState.leagueName = leagueName;
    currentState.leagueType = leagueType;
    currentState.isCompetitionContext = isCompetitionContext; // New Flag
    currentState.team = null; // Reset team
    
    stepLeague.classList.add('hidden');
    stepTeam.classList.remove('hidden');
    
    // Update Navigation for Step 3
    const stepTitle = leagueId === 'NATIONAL' 
        ? `Step 3: Select ${currentState.country} National Team` 
        : `Step 3: Select ${leagueName} Team`;
    
    // Store league name for later use (cup holder detection)
    currentState.leagueNameForTitle = leagueName;
        
    updateNavigation(3, stepTitle, resetToLeagues);
    
    // Update empty state message
    updateEmptyStateMessage();
    
    teamsGrid.innerHTML = '<div class="loading">Loading teams...</div>';
    
    loadTeams(leagueId);
}
// Helper to separate UI logic from Data Fetching
async function loadTeams(leagueId) {
    try {
        let url = '';
        let useStandings = false;
        let activeSeason = null; // Lifted scope

        if (leagueId === 'NATIONAL') {
            const countryName = currentState.country; 
            console.log(`Fetching National Team for ${countryName}`);
            url = `${API_BASE}/teams?country=${countryName}&national=true`;
        } else {
            // Calculate current season
            const date = new Date();
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11
            
            const leagueName = currentState.leagueName || '';
            const country = currentState.country || '';
            
            // Asian leagues (Vietnam, Thailand, Indonesia, Malaysia, Singapore, Philippines)
            // Run Aug-Jun, season named after END year (e.g. Aug 2025-Jun 2026 = Season 2026)
            const asianCountries = ['Vietnam', 'Thailand', 'Indonesia', 'Malaysia', 'Singapore', 'Philippines'];
            const isAsianLeague = asianCountries.includes(country);
            
            const isCalendarYearLeague = 
                (currentState.regionFilter === 'SouthAmerica' && !leagueName.includes('Qualifiers')) || 
                currentState.regionFilter === 'NorthAmerica' ||
                (currentState.regionFilter === 'World' && !leagueName.includes('UEFA') && !leagueName.includes('Qualifiers')) ||
                (['Libertadores', 'Sudamericana', 'MLS', 'Brasileirão', 'CONMEBOL'].some(k => leagueName.includes(k)));

            // Super cups (Recopa, UEFA Super Cup) happen early in the year with previous season's winners
            const isSuperCup = leagueName.includes('Recopa') || leagueName.includes('Super Cup');

            if (isAsianLeague) {
                // Asian: Aug-Jun, season = end year
                // Before August = current year, August onwards = next year
                activeSeason = month >= 7 ? year + 1 : year;
            } else if (isCalendarYearLeague) {
                activeSeason = year;
                if (isSuperCup && month < 4) {
                    // Super cups in Jan-Apr use previous year's season data
                    activeSeason = year - 1;
                }
            } else {
                // Academic (European leagues): Jul-Jun, season = start year
                activeSeason = month < 6 ? year - 1 : year;
            }

            console.log(`Fetching teams for league ${leagueId}, season ${activeSeason} (Context: ${isCalendarYearLeague ? 'Calendar' : 'Academic'}${isSuperCup ? ', SuperCup' : ''})`);
            
            // SMART FILTER: Use teams-with-standings for league tables
            // This gives us both teams and their current standing (rank, points, form)
            // Pass country for cup winner detection
            const countryParam = currentState.country ? `&country=${encodeURIComponent(currentState.country)}` : '';
            url = `${API_BASE}/teams-with-standings?league=${leagueId}&season=${activeSeason}${countryParam}`;
            useStandings = true;
            console.log("Teams with Standings Endpoint Selected");

        }

        console.log(`[DATA] Loading teams via ${url}`);
        const response = await fetch(url);
        const rawData = await response.json();
        
        // Parse & Normalize Data
        let teamList = [];

        // Get raw list from response
        const flatList = Array.isArray(rawData) ? rawData : (rawData.response || []);
        
        // Normalize: Handle both formats
        // 1. National Teams / Standard API: { team: {...}, venue: {...} }
        // 2. Active-Teams Funnel: { id, name, logo, venue: {...} } (flat)
        teamList = flatList
            .map(item => {
                // Already in { team, venue } format (National Teams API)
                if (item.team && item.team.id) {
                    return item;
                }
                // Flat format from active-teams funnel
                if (item.id && item.name) {
                    return {
                        team: item,
                        venue: item.venue || {}
                    };
                }
                return null;
            })
            .filter(item => item && item.team && item.team.name);

        if (teamList.length > 0) {
            // Remove grid mode, enable list mode
            teamsGrid.classList.remove('cards-grid');
            teamsGrid.classList.add('teams-list-view');

            // Quick check: Does any team have upcoming matches IN THIS LEAGUE?
            // Skip this for national teams - they participate in multiple competitions
            let vacationBanner = '';
            const isNationalTeamsList = (currentState.league === 'NATIONAL');
            
            if (!isNationalTeamsList) {
                try {
                    // For tournaments, use tournament API to check next fixture
                    const tournamentRes = await fetch(`${API_BASE}/tournament/${leagueId}`);
                    const tournamentData = await tournamentRes.json();
                    
                    const hasNextFixture = tournamentData.nextFixture !== null;
                    const currentStage = tournamentData.currentStageLabel || '';
                    
                    if (!hasNextFixture && !tournamentData.isFinished) {
                        vacationBanner = `
                            <div style="background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius:12px; padding:16px 20px; margin-bottom:16px; display:flex; align-items:center; gap:14px; box-shadow:0 2px 8px rgba(251,191,36,0.2);">
                                <div style="font-size:2rem;">🏖️</div>
                                <div>
                                    <h3 style="margin:0 0 2px 0; color:#92400e; font-size:1rem;">Competition on Break</h3>
                                    <p style="margin:0; color:#a16207; font-size:0.85rem;">No matches scheduled for <strong>${currentState.leagueName || 'this competition'}</strong> right now.</p>
                                </div>
                            </div>
                        `;
                    } else if (hasNextFixture && currentStage) {
                        // Show current stage info
                        const nextDate = new Date(tournamentData.nextFixture.date);
                        const dateStr = nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                        vacationBanner = `
                            <div style="background:linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius:12px; padding:16px 20px; margin-bottom:16px; display:flex; align-items:center; gap:14px; box-shadow:0 2px 8px rgba(34,197,94,0.15);">
                                <div style="font-size:2rem;">⚽</div>
                                <div>
                                    <h3 style="margin:0 0 2px 0; color:#166534; font-size:1rem;">${currentStage}</h3>
                                    <p style="margin:0; color:#15803d; font-size:0.85rem;">Next match: <strong>${dateStr}</strong> • ${tournamentData.nextFixture.home.name} vs ${tournamentData.nextFixture.away.name}</p>
                                </div>
                            </div>
                        `;
                    }
                } catch(e) {
                    console.log('Tournament check skipped:', e);
                }
            }

            // Check if we have standings data
            // For Leagues: always show standings
            // For Cups with Swiss/Groups format (UCL, UEL, Conference League): also show standings
            const leagueType = (currentState.leagueType || '').toLowerCase();
            const isLeagueType = leagueType === 'league';
            
            // Check if data actually has standings (regardless of type)
            const dataHasStandings = teamList.some(t => t.standing && t.standing.rank);
            const hasStandings = dataHasStandings;
            
            // Fetch competition structure with dynamic qualification zones
            let competitionFormat = null;
            let qualificationConfig = null;  // Dynamic from API - works for ALL formats!
            if (hasStandings) {
                try {
                    const formatRes = await fetch(`${API_BASE}/competition-structure/${currentState.leagueId}`);
                    const formatData = await formatRes.json();
                    competitionFormat = formatData.format;
                    qualificationConfig = formatData.qualificationConfig;  // Dynamic zones!
                    console.log('[Smart] Loaded qualification config:', qualificationConfig?.type);
                } catch (e) {
                    console.log('Could not fetch competition format');
                }
            }

            // Sort teams: By rank if we have standings (League), otherwise by name
            let teams = hasStandings 
                ? teamList.sort((a, b) => (a.standing?.rank ?? 999) - (b.standing?.rank ?? 999))
                : teamList.sort((a, b) => (a.team.name || "").localeCompare(b.team.name || ""));
            
            // For Swiss system (UCL), filter out eliminated teams
            // Show only teams still in competition (based on dynamic showOnly config)
            if (qualificationConfig?.showOnly && hasStandings) {
                teams = teams.filter(t => {
                    const rank = t.standing?.rank;
                    return rank && rank <= qualificationConfig.showOnly;
                });
            }
            
            // For knockout tournaments without standings (cups after group stage),
            // show only teams still in the current knockout stage (not eliminated)
            const isCupFormat = leagueType === 'cup' || competitionFormat === 'knockout';
            if (isCupFormat && !hasStandings && teams.length > 0) {
                console.log('🏆 [Knockout Filter] Detected cup format without standings');
                console.log(`🏆 [Knockout Filter] League: ${currentState.leagueName || 'Unknown'}, Season: ${activeSeason}, Total teams registered: ${teams.length}`);
                // Use tournament endpoint to get exact list of teams still in knockout stage
                // This is more accurate than checking fixtures - shows ALL teams in current round
                try {
                    const tournamentRes = await fetch(`${API_BASE}/tournament/${leagueId}`);
                    const tournamentData = await tournamentRes.json();
                    
                    // If tournament has knockoutTeams list, use it (most accurate!)
                    if (tournamentData.knockoutTeams && tournamentData.knockoutTeams.length > 0) {
                        const knockoutIds = new Set(tournamentData.knockoutTeams.map(t => t.id));
                        console.log(`🏆 [Knockout Filter] Tournament API reports ${knockoutIds.size} teams in ${tournamentData.currentRound || 'current stage'}`);
                        
                        // ENHANCEMENT: Also check finished matches to identify eliminated teams
                        // This handles cases where API hasn't updated knockoutTeams yet after recent matches
                        const eliminatedIds = new Set();
                        if (tournamentData.currentRound) {
                            console.log(`🏆 [Knockout Filter] Checking finished matches in ${tournamentData.currentRound} for eliminations...`);
                            const roundFixturesRes = await fetch(`${API_BASE}/fixtures?league=${leagueId}&season=${activeSeason}&round=${encodeURIComponent(tournamentData.currentRound)}`);
                            const roundFixtures = await roundFixturesRes.json();
                            const fixtures = Array.isArray(roundFixtures) ? roundFixtures : (roundFixtures.response || []);
                            
                            fixtures.forEach(fixture => {
                                if (fixture.fixture?.status?.short === 'FT') {
                                    // Match finished - identify loser
                                    const homeId = fixture.teams?.home?.id;
                                    const awayId = fixture.teams?.away?.id;
                                    const homeWinner = fixture.teams?.home?.winner;
                                    const awayWinner = fixture.teams?.away?.winner;
                                    
                                    if (homeWinner === false && homeId) {
                                        eliminatedIds.add(homeId);
                                        console.log(`🏆 [Knockout Filter] ❌ ${fixture.teams.home.name} eliminated (lost match)`);
                                    }
                                    if (awayWinner === false && awayId) {
                                        eliminatedIds.add(awayId);
                                        console.log(`🏆 [Knockout Filter] ❌ ${fixture.teams.away.name} eliminated (lost match)`);
                                    }
                                }
                            });
                        }
                        
                        const teamsBeforeFilter = teams.length;
                        // Filter: must be in knockoutTeams AND not eliminated by match results
                        teams = teams.filter(t => {
                            const teamId = t.team?.id;
                            const inKnockout = knockoutIds.has(teamId);
                            const isEliminated = eliminatedIds.has(teamId);
                            return inKnockout && !isEliminated;
                        });
                        console.log(`🏆 [Knockout Filter] ✅ Filtered from ${teamsBeforeFilter} to ${teams.length} active teams`);
                        console.log(`🏆 [Knockout Filter] Eliminated teams hidden: ${teamsBeforeFilter - teams.length}`);
                    } else {
                        // Fallback: Use active-teams (teams with upcoming fixtures)
                        console.log('🏆 [Knockout Filter] Tournament API has no knockoutTeams, falling back to active-teams');
                        const activeTeamsRes = await fetch(`${API_BASE}/active-teams?league=${leagueId}&season=${activeSeason}`);
                        const activeTeams = await activeTeamsRes.json();
                        const activeIds = new Set(activeTeams.map(t => t.id));
                        console.log(`🏆 [Knockout Filter] Active teams with upcoming fixtures: ${activeIds.size}`);
                        const teamsBeforeFilter = teams.length;
                        teams = teams.filter(t => activeIds.has(t.team?.id));
                        console.log(`🏆 [Knockout Filter] ✅ Filtered from ${teamsBeforeFilter} to ${teams.length} active teams`);
                    }
                } catch(e) {
                    console.warn('🏆 [Knockout Filter] ❌ Could not fetch tournament data:', e);
                }
            }
            
            // Helper for ambiguous "W" suffix (e.g. "Chelsea W" vs just "W")
            const displayNameIsWomen = (str) => str.endsWith(' W') || str.endsWith(' Ladies');
            
            // Generate Table Header - Mobile-optimized with info button
            const isNationalContext = currentState.league === 'NATIONAL';
            const tableHeader = hasStandings ? `
                <thead>
                    <tr>
                        <th class="col-rank" style="width: 35px;">#</th>
                        <th class="col-subscribe" style="width: 40px;">⭐</th>
                        <th class="col-team">Team</th>
                        <th class="col-gp" style="width: 35px;">GP</th>
                        <th class="col-gd" style="width: 35px;">GD</th>
                        <th class="col-pts" style="width: 40px;">Pts</th>
                        <th class="col-form" style="width: 100px;">Form</th>
                        <th class="col-info" style="width: 40px;">ℹ️</th>
                    </tr>
                </thead>
            ` : `
                <thead>
                    <tr>
                        <th class="col-subscribe" style="width: 40px;">⭐</th>
                        <th class="col-team">Team</th>
                        ${isNationalContext ? '<th>Type</th>' : ''}
                        <th class="desktop-only">Founded</th>
                        <th class="desktop-only">Venue</th>
                        <th class="desktop-only">City</th>
                        <th class="desktop-only">Capacity</th>
                    </tr>
                </thead>
            `;
            
            // Helper: Check if team is cup winner (for non-standings view)
            const getCupHolderBadge = (teamId) => {
                // Only show in cup competitions
                if (leagueType !== 'cup') return '';
                // Check if this team is marked as cup winner
                const teamData = teamList.find(t => t.team?.id === teamId);
                if (teamData && teamData.isCupWinner) {
                    return '<span class="team-badge" title="Cup Holder">🏆</span>';
                }
                return '';
            };
            
            // Initialize tooltip system once
            if (!window.tooltipInitialized) {
                const tooltipEl = document.createElement('div');
                tooltipEl.className = 'custom-tooltip';
                tooltipEl.id = 'custom-tooltip';
                document.body.appendChild(tooltipEl);
                
                let tooltipTimeout;
                
                document.addEventListener('mouseover', (e) => {
                    const target = e.target.closest('[data-tooltip]');
                    if (target) {
                        const text = target.getAttribute('data-tooltip');
                        if (text) {
                            // Clear previous timeout
                            clearTimeout(tooltipTimeout);
                            // Show after brief delay
                            tooltipTimeout = setTimeout(() => {
                                tooltipEl.textContent = text;
                                tooltipEl.style.display = 'block';
                            }, 500);
                        }
                    }
                });
                
                document.addEventListener('mousemove', (e) => {
                    if (tooltipEl.style.display === 'block') {
                        const tooltip = tooltipEl;
                        const offset = 12;
                        
                        // Get tooltip dimensions
                        const rect = tooltip.getBoundingClientRect();
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;
                        
                        // Calculate position
                        let left = e.clientX + offset;
                        let top = e.clientY + offset;
                        
                        // Adjust if tooltip would go off right edge
                        if (left + rect.width > viewportWidth) {
                            left = e.clientX - rect.width - offset;
                        }
                        
                        // Adjust if tooltip would go off bottom edge
                        if (top + rect.height > viewportHeight) {
                            top = e.clientY - rect.height - offset;
                        }
                        
                        tooltip.style.left = left + 'px';
                        tooltip.style.top = top + 'px';
                    }
                });
                
                document.addEventListener('mouseout', (e) => {
                    const target = e.target.closest('[data-tooltip]');
                    if (target) {
                        clearTimeout(tooltipTimeout);
                        tooltipEl.style.display = 'none';
                    }
                });
                
                window.tooltipInitialized = true;
            }

            // Helper: Build tooltip for TEAM INFO (venue, founded, capacity)
            const buildTeamTooltip = (team, venue) => {
                const parts = [];
                if (venue.name) {
                    let venueText = `${venue.name}`;
                    if (venue.capacity) venueText += ` (${venue.capacity.toLocaleString()})`;
                    parts.push(venueText);
                }
                if (team.founded) parts.push(`Est. ${team.founded}`);
                return parts.join(' • ');
            };
            
            // Helper: Build tooltip for STANDINGS STATS (P/W/D/L/GD)
            const buildStatsTooltip = (standing) => {
                if (!standing) return '';
                const gd = standing.goalsDiff || 0;
                const gdText = gd > 0 ? `+${gd}` : gd;
                // More readable format with full labels and spacing
                return `Played: ${standing.played || 0} | Won: ${standing.won || 0} | Draw: ${standing.draw || 0} | Lost: ${standing.lost || 0} | GD: ${gdText}`;
            };

            // Helper: Format form string with nice colored circles
            const formatForm = (form) => {
                if (!form) return '<span style="color:#94a3b8;">—</span>';
                return form.split('').map(c => {
                    if (c === 'W') return '<span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#22c55e;color:white;font-size:11px;font-weight:bold;margin:0 1px;">W</span>';
                    if (c === 'L') return '<span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#ef4444;color:white;font-size:11px;font-weight:bold;margin:0 1px;">L</span>';
                    if (c === 'D') return '<span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#f59e0b;color:white;font-size:11px;font-weight:bold;margin:0 1px;">D</span>';
                    return c;
                }).join('');
            };

            // Helper: Rank styling (top positions green, relegation red)
            const getRankStyle = (rank, total) => {
                if (!rank) return '';
                if (rank <= 4) return 'color:#22c55e;font-weight:bold;'; // Champions League / Top 4
                if (total && rank > total - 3) return 'color:#ef4444;'; // Relegation zone
                return 'color:#64748b;';
            };
            
            const totalTeams = teams.length;
            
            const rows = teams.map(item => {
                const team = item.team || {};
                const venue = item.venue || {};
                const standing = item.standing || null;
                
                if (!team.name) return ''; // Skip invalid entries

                // Detect Team Type
                let badgeHtml = '<span class="badge badge-senior" style="background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0;">Standard</span>'; 
                // Default tag
                
                const name = (team.name || '').toLowerCase();
                let isNational = team.national;
                const isWorldCup2026 = item.isWorldCup2026;

                if (name.includes('women') || displayNameIsWomen(team.name)) {
                    badgeHtml = '<span class="badge badge-women">Women</span>';
                } else if (name.match(/u\d/)) { // matches u19, u20, u21 etc
                    badgeHtml = '<span class="badge badge-youth">Youth</span>';
                } else if (isNational && isWorldCup2026) {
                    // World Cup 2026 participant - show special badge!
                    badgeHtml = '<span class="badge badge-worldcup" title="FIFA World Cup 2026">🌍 World Cup</span>';
                } else if (isNational) {
                    badgeHtml = '<span class="badge badge-senior">Matches</span>';
                }

                // Favorite star button - data attributes for the handler
                const teamData = JSON.stringify({id: team.id, name: team.name, logo: team.logo, isNational: isNational || false})
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
                const isFavorited = isSubscriptionRelevant(team.id);
                const isSubscribed = userFavorites.has(team.id);
                const starClass = isFavorited ? 'fav-star-btn favorited' : (isSubscribed ? 'fav-star-btn subscribed-other' : 'fav-star-btn');
                const starSymbol = isSubscribed ? '★' : '☆';

                // Render different table rows based on standings availability
                // For LEAGUES: Show rank + points + form, with tooltips
                if (hasStandings && standing) {
                    const teamTooltipText = buildTeamTooltip(team, venue);
                    const statsTooltipText = buildStatsTooltip(standing);
                    // Escape for HTML attribute - encode as base64 to avoid quote issues
                    const infoDataObj = {
                        name: team.name,
                        logo: team.logo,
                        rank: standing.rank,
                        points: standing.points,
                        played: standing.played,
                        won: standing.won,
                        draw: standing.draw,
                        lost: standing.lost,
                        gd: standing.goalsDiff,
                        form: standing.form,
                        venue: venue.name,
                        city: venue.city,
                        capacity: venue.capacity,
                        founded: team.founded
                    };
                    const infoData = btoa(encodeURIComponent(JSON.stringify(infoDataObj)));
                    
                    // Badges: 👑 = League Champion (shown in league), 🏆 = Cup Winner (shown in cup)
                    // Important: Show each badge only in its relevant competition!
                    const isLeagueChamp = item.isDefendingChampion;
                    const isCupWinner = item.isCupWinner;
                    const isViewingCup = leagueType === 'cup';
                    const isViewingLeague = leagueType === 'league';
                    
                    let badge = '';
                    // Show league champion badge only in league competitions
                    if (isLeagueChamp && isViewingLeague) {
                        badge = '<span class="team-badge" title="Defending Champion">👑</span>';
                    }
                    // Show cup winner badge only in cup competitions
                    if (isCupWinner && isViewingCup) {
                        badge = '<span class="team-badge" title="Cup Holder">🏆</span>';
                    }
                    
                    // GD formatting (positive = green, negative = red)
                    const gd = standing.goalsDiff || 0;
                    const gdColor = gd > 0 ? '#22c55e' : gd < 0 ? '#ef4444' : '#64748b';
                    const gdText = gd > 0 ? `+${gd}` : gd;
                    
                    // Dynamic zone styling based on qualificationConfig from API
                    let rowClass = '';
                    let separator = '';
                    let rowStyle = '';
                    
                    if (qualificationConfig?.zones && standing.rank) {
                        const rank = standing.rank;
                        // Find which zone this rank belongs to
                        const zone = qualificationConfig.zones.find(z => rank >= z.start && rank <= z.end);
                        
                        if (zone) {
                            // Apply background color
                            if (zone.bgColor) {
                                rowStyle = `background: ${zone.bgColor};`;
                            }
                            // Check if we're at the last position of a zone (add separator)
                            if (rank === zone.end) {
                                const nextZone = qualificationConfig.zones.find(z => z.start === zone.end + 1);
                                if (nextZone && !zone.eliminated) {
                                    const separatorColor = zone.color || '#64748b';
                                    separator = `<tr class="zone-separator" style="--zone-color:${separatorColor}">
                                        <td colspan="9">
                                            <span>⬆️ ${zone.label}${nextZone ? ` • ⬇️ ${nextZone.label}` : ''}</span>
                                        </td>
                                    </tr>`;
                                }
                            }
                        }
                    }
                    
                    return `
                        <tr class="${rowClass}" style="cursor:pointer; ${rowStyle}" onclick="selectTeam(${team.id}, ${isNational})">
                            <td class="col-rank" style="${getRankStyle(standing.rank, totalTeams)}">${standing.rank}</td>
                            <td class="col-subscribe" onclick="event.stopPropagation();">
                                <button class="${starClass}" data-team='${teamData}' onclick="event.stopPropagation(); toggleFavoriteFromTable(this)" title="${isFavorited ? 'Edit subscription' : 'Subscribe'}">
                                    ${starSymbol}
                                </button>
                            </td>
                            <td class="col-team team-info">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <img src="${team.logo}" alt="" style="width:24px;height:24px;object-fit:contain;" onerror="this.src='/favicon.svg'">
                                    <span class="team-name-text" data-tooltip="${teamTooltipText}">${team.name}${badge}</span>
                                </div>
                            </td>
                            <td class="col-gp">${standing.played || 0}</td>
                            <td class="col-gd" style="color: ${gdColor}; font-weight: 500;">${gdText}</td>
                            <td class="col-pts" data-tooltip="${statsTooltipText}">
                                <span style="font-weight: bold; font-size:1.1em;">${standing.points || 0}</span>
                            </td>
                            <td class="col-form" style="white-space: nowrap;">${formatForm(standing.form)}</td>
                            <td class="col-info" onclick="event.stopPropagation();">
                                <button class="info-btn-mobile" onclick="event.stopPropagation(); showTeamInfoPopup('${infoData}')" title="More info">ℹ️</button>
                            </td>
                        </tr>
                        ${separator}
                    `;
                }

                // Default row (no standings) - for Cups, National teams, etc.
                // Get cup holder badge (🏆 for defending champion in cup competitions)
                const cupBadge = getCupHolderBadge(team.id);
                
                return `
                    <tr style="cursor:pointer;" onclick="selectTeam(${team.id}, ${isNational})">
                        <td class="col-subscribe" onclick="event.stopPropagation();">
                            <button class="${starClass}" data-team='${teamData}' onclick="event.stopPropagation(); toggleFavoriteFromTable(this)" title="${isFavorited ? 'Edit subscription' : 'Subscribe'}">
                                ${starSymbol}
                            </button>
                        </td>
                        <td class="col-team team-info">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <img src="${team.logo}" alt="" style="width:24px;height:24px;object-fit:contain;" onerror="this.src='/favicon.svg'">
                                <span style="font-weight: 600;">${team.name}${cupBadge}</span>
                            </div>
                        </td>
                        ${isNationalContext ? `<td>${badgeHtml}</td>` : ''}
                        <td class="desktop-only">${team.founded || '-'}</td>
                        <td class="desktop-only">${venue.name || '-'}</td>
                        <td class="desktop-only">${venue.city || '-'}</td>
                        <td class="desktop-only">${venue.capacity ? venue.capacity.toLocaleString() : '-'}</td>
                    </tr>
                `;
            }).join('');

            // Dynamic legend banner based on qualificationConfig
            let zoneBanner = '';
            if (qualificationConfig?.zones) {
                const zoneItems = qualificationConfig.zones
                    .filter(z => !z.eliminated) // Don't show eliminated in banner
                    .map(z => `
                        <span style="display:flex; align-items:center; gap:6px; font-size:0.85rem;">
                            <span style="width:12px; height:12px; background:${z.color}; border-radius:3px;"></span>
                            <strong>${z.start}${z.end !== z.start ? '-' + z.end : ''}</strong> ${z.label}
                        </span>
                    `).join('');
                
                zoneBanner = `
                    <div style="background:#f8fafc; border-radius:10px; padding:12px 16px; margin-bottom:16px; display:flex; flex-wrap:wrap; gap:16px; align-items:center; justify-content:center; border:1px solid #e2e8f0;">
                        ${zoneItems}
                        <span style="color:#94a3b8; font-size:0.8rem;">• ${teams.length} teams${qualificationConfig.showOnly ? ' remaining' : ''}</span>
                    </div>
                `;
            }

            teamsGrid.innerHTML = `
                ${vacationBanner}
                ${zoneBanner}
                <div class="table-container">
                    <table class="teams-table">
                        ${tableHeader}
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `;
            
            // Setup Quick Filter for teams (UPDATED for Table)
            const filterInput = document.getElementById('teamQuickFilter');
            if (filterInput) {
                filterInput.oninput = (e) => {
                    const val = e.target.value.toLowerCase();
                    const rows = teamsGrid.querySelectorAll('tbody tr');
                    rows.forEach(row => {
                        const name = row.querySelector('.team-info').textContent.toLowerCase();
                        row.style.display = name.includes(val) ? '' : 'none';
                    });
                };
            }
            
        } else {
             // Show vacation banner at the top of the page
             teamsGrid.innerHTML = `
                <div style="background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius:12px; padding:20px 24px; margin-bottom:20px; display:flex; align-items:center; gap:16px; box-shadow:0 2px 8px rgba(251,191,36,0.2);">
                    <div style="font-size:2.5rem;">🏖️</div>
                    <div>
                        <h3 style="margin:0 0 4px 0; color:#92400e; font-size:1.1rem;">League on Break</h3>
                        <p style="margin:0; color:#a16207; font-size:0.9rem;">No matches scheduled for <strong>${currentState.leagueName || 'this competition'}</strong>. Check back when the season resumes!</p>
                    </div>
                </div>
             `;
             teamsGrid.classList.remove('cards-grid', 'teams-list-view'); // Reset layout
        }
    } catch (e) {
        console.error(e);
        teamsGrid.innerHTML = '<p class="error">Error loading teams.</p>';
    }
}

function selectTeam(teamId, isNational = false) {
    currentState.team = teamId;
    currentState.isNationalView = isNational;
    if (teamIdInput) teamIdInput.value = teamId;
    
    // Find team name and check if cup holder
    const teamData = Array.from(document.querySelectorAll('[data-team]'))
        .map(btn => {
            try {
                const dataStr = btn.getAttribute('data-team')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");
                return JSON.parse(dataStr);
            } catch (e) {
                console.error('Failed to parse team data:', e);
                return null;
            }
        })
        .filter(t => t !== null)
        .find(t => t.id == teamId);
    
    if (teamData) {
        const teamName = teamData.name;
        let titleSuffix = '';
        
        // Check if this is a cup competition and if team is cup holder
        if (currentState.leagueType === 'cup') {
            const cupHolder = teamData.isCupWinner;
            if (cupHolder) {
                titleSuffix = ' 🏆';
            }
        }
        
        // Update title with team name
        const stepTitleText = isNational 
            ? `Step 3: ${teamName}${titleSuffix}`
            : `Step 3: ${currentState.leagueNameForTitle || 'League'} - ${teamName}${titleSuffix}`;
        
        updateNavigation(3, stepTitleText, resetToLeagues);
    }
    
    // Pre-fetch team competitions for the smart filter button
    fetchTeamCompetitions(teamId, isNational);
    
    // If entered via Competition Context, Force strict filtering
    const useStrictFilter = currentState.isCompetitionContext === true;
    searchFixtures(useStrictFilter);
}

// Navigation Back Buttons (Exposed globally for onclick in HTML)
window.resetToCountry = function() {
    stepLeague.classList.add('hidden');
    stepCountry.classList.remove('hidden');
    
    // Show Tabs again
    const tabs = document.getElementById('modeTabs');
    if (tabs) tabs.classList.remove('hidden');
    
    // Logic: If coming from a Hub (Step 2), go back to the List (Step 1)
    // If we were at Step 2, we rely on the specific Back button in showCountrySelection() which calls loadCountries()
    // But since this function `resetToCountry` is mostly used for the "Back" button in Step 3 (Hubs)...
    
    if (currentState.mode === 'continent') {
        showContinentSelection();
    } else if (currentState.mode === 'country') {
        showCountrySelection();
    } else {
        // Fallback or full reset
        loadCountries();
    }
    
    currentState.country = null;
    currentState.league = null;
    currentState.team = null;
    
    // Clear downstream data
    updateEmptyStateMessage();
};

window.resetToLeagues = function() {
    stepTeam.classList.add('hidden');
    stepLeague.classList.remove('hidden');

    // Update Navigation for Step 3
    // We need to restore the correct Hub title
    const title = currentState.mode === 'continent' 
        ? `Step 3: ${currentState.country} Hub` 
        : `Step 3: ${currentState.country} Hub`;

    updateNavigation(3, title, resetToCountry);
    
    currentState.team = null;
    
    // Clear downstream data
    updateEmptyStateMessage();
    teamsGrid.innerHTML = '';
};


// --- Fixtures Search & Render ---

async function searchFixtures(useLeagueFilter = false) {
    const teamId = teamIdInput.value.trim();
    if (!teamId) return;

    const previousFilterState = currentState.isFiltered; // Track if this is a filter toggle
    currentState.isFiltered = useLeagueFilter; // Store state for UI toggle

    showStatus('🔄 Loading fixtures...', 'loading');
    fixturesContainer.innerHTML = '<div class="loading"><p>🔄 Fetching data from API...</p></div>';

    try {
        let url = `${API_BASE}/team/${teamId}?next=10`;
        // Apply filter if requested and we have a specific league context (not National)
        if (useLeagueFilter && currentState.league && currentState.league !== 'NATIONAL') {
            url += `&league=${currentState.league}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        
        // Handle unwrapped array (from Node helper) or wrapped object (direct API-Sports)
        const fixtureList = Array.isArray(data) ? data : (data.response || []);

        if (fixtureList.length > 0) {
            allFixtures = fixtureList;
            showStatus(`✅ Found ${allFixtures.length} upcoming fixtures!`, 'success');
            
            // Only save scroll position if toggling filter (not initial search)
            // previousFilterState will be undefined on first load
            const isToggling = (previousFilterState !== undefined) && (previousFilterState !== useLeagueFilter);
            const scrollY = window.scrollY;
            
            renderFixtures(false);
            
            if (isToggling) {
                // Restore scroll position on toggle to prevent jump
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollY);
                });
            } else {
                // Initial search - scroll to fixtures table
                requestAnimationFrame(() => {
                    fixturesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }
        } else {
            if (Array.isArray(fixtureList)) {
                 // ** EMPTY STATE: Check if this is a knockout tournament in progress **
                 let customMessage = null;
                 let customIcon = '🎲';
                 let customTitle = 'Waiting for Next Draw';
                 
                 // If viewing a specific cup/tournament, check tournament status
                 if (useLeagueFilter && currentState.league && currentState.leagueType === 'cup') {
                     customIcon = '🎲';
                     customTitle = 'Waiting for Next Draw';
                     customMessage = `Team is waiting for the next draw in ${currentState.leagueName || 'this tournament'}`;
                     
                     try {
                         const tournamentRes = await fetch(`${API_BASE}/tournament/${currentState.league}`);
                         const tournamentData = await tournamentRes.json();
                         
                         // If tournament is in knockout stage and NOT finished
                         if (tournamentData.isKnockout && !tournamentData.isFinished) {
                             const currentRound = tournamentData.currentRoundLabel || tournamentData.currentRound || 'current stage';
                             // Check if team is still in knockout teams list
                             const teamStillIn = tournamentData.knockoutTeams?.some(t => t.id == teamId);
                             
                             if (teamStillIn) {
                                 customIcon = '⏰';
                                 customTitle = `Waiting for Next Match`;
                                 customMessage = `${currentRound} completed—awaiting draw for next round`;
                             } else {
                                 customIcon = '❌';
                                 customTitle = `Eliminated from Tournament`;
                                 customMessage = `Team was eliminated from ${currentState.leagueName || 'this tournament'}`;
                             }
                         }
                     } catch(e) {
                         console.log('Could not check tournament status:', e);
                     }
                 }
                 
                 const finalMessage = customMessage || 'No matches scheduled for now';
                 
                 // Add "Show All Matches" button for knockout tournaments 
                 const showAllButton = useLeagueFilter && currentState.leagueType === 'cup' ? 
                     `<button onclick="loadTeamFixtures(${teamId}, false)" style="margin-top:15px;padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;">
                         Show All Team Matches
                      </button>` : '';
                 
                 showStatus('No upcoming fixtures found.', 'warning');
                 fixturesContainer.innerHTML = `
                    <div class="empty-state vacation-card" style="padding: 40px; text-align: center; border-radius: 12px; border: 1px dashed #e2e8f0; margin-top: 20px; background: #f3f4f6; color: #bdbdbd;">
                        <div style="font-size: 3rem; margin-bottom: 10px;">${customIcon}</div>
                        <h3 style="color: #bdbdbd; margin-bottom: 10px;">${customTitle}</h3>
                        <p style="color: #bdbdbd;">${finalMessage}</p>
                        ${showAllButton}
                    </div>`;
                 fixturesContainer.scrollIntoView({ behavior: 'smooth' }); // Ensure user sees the result
            } else {
                 throw new Error('Invalid response format');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus(`❌ Error: ${error.message}`, 'error');
        fixturesContainer.innerHTML = '<div class="empty-state"><p>Connection Failed or No Data.</p></div>';
    }
}

function renderFixtures(isResultsMode = false) {
    selectedFixtures.clear(); // Reset selection
    
    if (allFixtures.length === 0) {
        fixturesContainer.innerHTML = '<div class="empty-state"><p>No fixtures found.</p></div>';
        toggleDownloadButtons(false);
        return;
    }

    toggleDownloadButtons(false); 

    // Switch to list view layout
    fixturesContainer.className = 'fixtures-list-view'; 
    
    // Filter Toggle Button - Smart Logic
    // Check if team has other competitions to show
    const teamId = teamIdInput.value.trim();
    const isNational = currentState.isNationalView || false;
    const cachedComps = teamCompetitionsCache.get(`${teamId}_${isNational}`);
    
    // Determine what other competitions exist
    let otherCompsExist = false;
    let otherCompsNames = [];
    
    if (cachedComps && currentState.league && currentState.league !== 'NATIONAL') {
        const currentLeagueType = (currentState.leagueType || '').toLowerCase();
        
        // If viewing league matches, check for cups/continental
        if (currentLeagueType === 'league') {
            if (cachedComps.cups?.length > 0) {
                otherCompsExist = true;
                otherCompsNames.push(...cachedComps.cups.map(c => c.name));
            }
            if (cachedComps.continental?.length > 0) {
                otherCompsExist = true;
                otherCompsNames.push(...cachedComps.continental.map(c => c.name));
            }
        }
        // If viewing cup matches, check for league/continental
        else if (currentLeagueType === 'cup') {
            if (cachedComps.leagues?.length > 0) {
                otherCompsExist = true;
                otherCompsNames.push(...cachedComps.leagues.map(c => c.name));
            }
            if (cachedComps.continental?.length > 0) {
                otherCompsExist = true;
                otherCompsNames.push(...cachedComps.continental.map(c => c.name));
            }
        }
    }
    
    const showFilterToggle = currentState.league && currentState.league !== 'NATIONAL';
    const canShowOtherComps = otherCompsExist || !cachedComps; // Show if other comps exist OR if we don't have cache yet
    
    // Button styling - make it more prominent when other competitions exist
    let filterBtnClass, filterBtnText, filterBtnStyle;
    
    if (currentState.isFiltered) {
        // Currently showing filtered view - button to expand
        if (otherCompsExist) {
            filterBtnClass = 'btn-primary-lg';
            filterBtnText = `➕ Also show: ${otherCompsNames.slice(0, 2).join(', ')}${otherCompsNames.length > 2 ? '...' : ''}`;
            filterBtnStyle = '';
        } else if (!cachedComps) {
            filterBtnClass = 'control-btn';
            filterBtnText = '🔄 Show All Competitions';
            filterBtnStyle = '';
        } else {
            // No other competitions - disable button
            filterBtnClass = 'control-btn';
            filterBtnText = `Only in ${currentState.leagueName || 'this competition'}`;
            filterBtnStyle = 'opacity:0.5; cursor:not-allowed;';
        }
    } else {
        // Currently showing all - button to filter
        filterBtnClass = 'control-btn';
        filterBtnText = `📋 Show only ${currentState.leagueName || 'League'}`;
        filterBtnStyle = '';
    }
    
    // Only enable toggle if there's something to toggle to
    const filterAction = currentState.isFiltered 
        ? (canShowOtherComps ? 'searchFixtures(false)' : '') 
        : 'searchFixtures(true)';

    // Controls Bar
    // If in Results Mode, disable "Select All" actions as we can't add past games to calendar usually
    // Or maybe user wants to save them? Let's assume Calendar = Future.
    const disableControls = isResultsMode ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';

    const controlsHtml = `
        <div class="controls-bar" style="display:grid; grid-template-columns: auto auto 1fr auto; gap:16px; align-items:center; ${isResultsMode ? 'background:#fff7ed; border-color:#fdba74;' : ''}">
            ${isResultsMode ? '<div style="grid-column:1/-1; text-align:center; font-weight:bold; color:#c2410c; padding-bottom:8px; border-bottom:1px solid #fdba74;">📊 Recent Results</div>' : ''}
            
            ${!isResultsMode ? '<span style="color:#2563eb; font-size:0.8rem; font-weight:600; background:#eff6ff; padding:6px 10px; border-radius:6px; border:1px solid #bfdbfe; white-space:nowrap;">👇 Select or ⭐ Subscribe</span>' : '<div></div>'}
            
            <div class="selection-controls">
                <button class="control-btn" onclick="handleSelectAll()" ${disableControls}>✅ Select All</button>
                <button class="control-btn" onclick="handleClearAll()" ${disableControls}>❌ Clear All</button>
            </div>
            
            ${showFilterToggle ? `
            <div style="text-align:center;">
                <button class="${filterBtnClass}" onclick="${filterAction}" style="${filterBtnStyle}" ${!filterAction ? 'disabled' : ''}>
                    ${filterBtnText}
                </button>
            </div>
            ` : '<div></div>'}

            <div style="display:flex; gap:12px; align-items:center; justify-content:flex-end;">
                <button id="syncBtn" class="control-btn" onclick="getSyncLink()" disabled title="Login required" ${disableControls}>🔗 Sync</button>
                <button id="addSelectedBtn" class="btn-primary-lg" onclick="addSelectedToCalendar()" disabled ${disableControls}>
                    ➕ Add (0)
                </button>
            </div>
        </div>
    `;

    // Table Header - Mobile simplified (no League/Venue)
    const tableHeader = `
        <thead>
            <tr>
                <th class="checkbox-col">✅</th>
                <th class="col-date">Date</th>
                ${isResultsMode ? '<th class="col-score">Score</th>' : '<th class="col-time">Time</th>'}
                <th class="col-home" style="text-align:right">Home</th>
                <th style="width: 20px;"></th>
                <th class="col-away" style="text-align:left">Away</th>
                <th class="col-league desktop-only">League</th>
                <th class="col-venue desktop-only">Venue</th>
            </tr>
        </thead>
    `;

    // Table Body
    const tableRows = allFixtures.map(fixture => createFixtureRow(fixture, isResultsMode)).join('');

    fixturesContainer.innerHTML = `
        ${controlsHtml}
        <div class="table-container">
            <table class="fixtures-table">
                ${tableHeader}
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

function toggleDownloadButtons(show) {
    if (downloadAllBtn) downloadAllBtn.style.display = 'none';
    if (removeAllBtn) removeAllBtn.style.display = 'none';
}

// --- Helper Functions ---

function createFixtureRow(fixture, isResultsMode = false) {
    const home = fixture.teams.home;
    const away = fixture.teams.away;
    const score = fixture.goals; // { home: 2, away: 1 }
    const date = new Date(fixture.fixture.date);
    const fixtureId = `fixture_${fixture.fixture.id}`;
    fixtureData[fixtureId] = fixture;

    // Check favorite status (context-aware)
    const isHomeSubscribed = userFavorites.has(home.id);
    const isAwaySubscribed = userFavorites.has(away.id);
    const isHomeRelevant = isSubscriptionRelevant(home.id);
    const isAwayRelevant = isSubscriptionRelevant(away.id);
    const isHomeFav = isHomeRelevant ? 'active' : (isHomeSubscribed ? 'subscribed-other' : '');
    const isAwayFav = isAwayRelevant ? 'active' : (isAwaySubscribed ? 'subscribed-other' : '');
    const homeStar = isHomeSubscribed ? '★' : '☆';
    const awayStar = isAwaySubscribed ? '★' : '☆';

    // Format date as dd/mm/yyyy
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    
    // Build compact tooltip for fixture row (venue only, short)
    const fixtureTooltip = fixture.fixture.venue?.name || 'TBA';
    
    // Time or Score Column
    let centerCol;
    if (isResultsMode) {
        centerCol = `<td class="score-col" style="font-weight:bold; font-size:1.1em;">${score.home} - ${score.away}</td>`;
    } else {
        centerCol = `
            <td class="time-col">
                ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                <div style="font-size: 0.7em; color: #9ca3af; font-weight: normal;">
                    ${date.toLocaleString(undefined, {timeZoneName: 'short'}).split(' ').pop()}
                </div>
            </td>
        `;
    }

    // Disable checkbox for past games?
    const checkboxHtml = isResultsMode 
        ? `<input type="checkbox" disabled style="opacity:0.3">`
        : `<input type="checkbox" value="${fixture.fixture.id}" onchange="handleSelectionChange(this)">`;

    return `
        <tr data-tooltip="${fixtureTooltip}">
            <td class="checkbox-col">
                ${checkboxHtml}
            </td>
            <td>${dateStr}</td>
            ${centerCol}
            <td style="text-align:right">
                <div class="team-col" style="justify-content: flex-end;">
                    <button class="fav-star ${isHomeFav}" 
                            onclick="handleStarClick(${home.id}, '${home.name.replace(/'/g, "\\'")}', '${home.logo}', ${fixture.fixture.id}, event)"
                            title="">
                        ${homeStar}
                    </button>
                    <span>${home.name}</span>
                    <img src="${home.logo}" alt="${home.name}">
                </div>
            </td>
            <td class="vs-col">VS</td>
            <td style="text-align:left">
                <div class="team-col">
                    <img src="${away.logo}" alt="${away.name}">
                    <span>${away.name}</span>
                    <button class="fav-star ${isAwayFav}" 
                            onclick="handleStarClick(${away.id}, '${away.name.replace(/'/g, "\\'")}', '${away.logo}', ${fixture.fixture.id}, event)"
                            title="">
                        ${awayStar}
                    </button>
                </div>
            </td>
            <td class="desktop-only">${fixture.league.name}</td>
            <td class="desktop-only">${fixture.fixture.venue?.name || 'TBA'}</td>
        </tr>
    `;
}

// Global Handlers for Selection
window.handleSelectAll = function() {
    const checkboxes = document.querySelectorAll('.fixtures-table input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = true;
        selectedFixtures.add(parseInt(cb.value));
    });
    updateAddButton();
};

// New handler for star click - check login first, then show context menu
window.handleStarClick = function(teamId, teamName, teamLogo, fixtureId, event) {
    event = event || window.event;
    const token = localStorage.getItem('token');
    
    // Hide any tooltip
    const tooltip = document.getElementById('custom-tooltip');
    if (tooltip) tooltip.style.display = 'none';
    
    // If not logged in, prompt to login
    if (!token) {
        if (confirm(`Please login to add matches to your calendar or subscribe to ${teamName}.\n\nGo to login page?`)) {
            window.location.href = '/auth.html';
        }
        return;
    }
    
    // User is logged in - show context menu
    const isSubscribed = userFavorites.has(teamId);
    showStarContextMenu(event, teamId, teamName, teamLogo, fixtureId, isSubscribed);
};

// Show context menu near click position
function showStarContextMenu(event, teamId, teamName, teamLogo, fixtureId, isSubscribed) {
    // Remove existing menu
    const existing = document.querySelector('.star-context-menu');
    if (existing) existing.remove();
    
    const menu = document.createElement('div');
    menu.className = 'star-context-menu';
    
    const items = isSubscribed ? [
        { icon: '📅', text: 'Add this match only', action: () => addSingleMatchToCalendar(fixtureId) },
        { icon: '✖️', text: 'Unsubscribe', action: () => toggleFavorite(teamId, teamName, teamLogo), danger: true }
    ] : [
        { icon: '⭐', text: 'Subscribe to all matches', action: () => toggleFavorite(teamId, teamName, teamLogo) },
        { icon: '📅', text: 'Add this match only', action: () => addSingleMatchToCalendar(fixtureId) }
    ];
    
    menu.innerHTML = `
        <div class="menu-header">${teamName}</div>
        ${items.map(item => `
            <div class="menu-item ${item.danger ? 'danger' : ''}" data-action="${items.indexOf(item)}">
                <span>${item.icon}</span>
                <span>${item.text}</span>
            </div>
        `).join('')}
    `;
    
    document.body.appendChild(menu);
    
    // Position near click
    const x = event.clientX || event.pageX;
    const y = event.clientY || event.pageY;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    // Adjust if off-screen
    setTimeout(() => {
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = (y - rect.height) + 'px';
        }
        menu.classList.add('show');
    }, 0);
    
    // Handle clicks
    menu.addEventListener('click', (e) => {
        const item = e.target.closest('.menu-item');
        if (item) {
            const idx = parseInt(item.dataset.action);
            items[idx].action();
            menu.remove();
        }
    });
    
    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

// Helper: Add single match to calendar
async function addSingleMatchToCalendar(fixtureId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const res = await fetch('/api/calendar/add-fixtures', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fixtureIds: [fixtureId] })
        });
        
        if (res.ok) {
            showSuccessModal('Match added to calendar!');
        } else {
            const data = await res.json();
            showErrorModal('Error', data.error || 'Failed to add match');
        }
    } catch (e) {
        showErrorModal('Error', 'Network error');
    }
}

window.handleClearAll = function() {
    const checkboxes = document.querySelectorAll('.fixtures-table input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
    });
    selectedFixtures.clear();
    updateAddButton();
};

window.handleSelectionChange = function(checkbox) {
    const id = parseInt(checkbox.value);
    if (checkbox.checked) {
        selectedFixtures.add(id);
    } else {
        selectedFixtures.delete(id);
    }
    updateAddButton();
};

function updateAddButton() {
    const btn = document.getElementById('addSelectedBtn');
    const syncBtn = document.getElementById('syncBtn');
    const count = selectedFixtures.size;
    
    if(btn) {
        btn.textContent = `Add to Calendar (${count})`;
        btn.disabled = count === 0;
    }
    
    if(syncBtn) {
        const token = localStorage.getItem('token');
        // Allow sync even if selection is 0 (for Favorites sync)
        syncBtn.disabled = !token;
        syncBtn.title = !token ? "Login required" : "Get Subscription URL";
    }
}

window.addSelectedToCalendar = function() {
    if (selectedFixtures.size === 0) return;
    
    let content = `BEGIN:VCALENDAR\nVERSION:2.0\ncalscale:GREGORIAN\n`;
    
    selectedFixtures.forEach(fid => {
        // Find fixture data
        // note: fixtureData keys are 'fixture_ID', set stores ID
        const data = fixtureData[`fixture_${fid}`];
        if (data) {
            const ics = generateICS(data);
            const body = ics.match(/BEGIN:VEVENT[\s\S]*END:VEVENT/)[0];
            content += body + '\n';
        }
    });
    
    content += 'END:VCALENDAR';
    downloadBlob(content, 'my_fixtures.ics');
};

// Deprecated: createFixtureCard (Removed in favor of Table View)
// function createFixtureCard(fixture) { ... }

function getStatusClass(status) {
    if (['NS', 'TBD', 'PST'].includes(status)) return 'upcoming';
    if (['FT', 'AET', 'PEN'].includes(status)) return 'finished';
    return 'live';
}

function showStatus(msg, type) {
    if (!searchStatus) return;
    searchStatus.textContent = msg;
    searchStatus.className = `status-message ${type}`;
    searchStatus.style.display = 'block';
    if (type !== 'loading') setTimeout(() => searchStatus.style.display = 'none', 5000);
}

// --- Calendar Logic ---

window.addToGoogleCalendar = function(fid) {
    const f = fixtureData[fid];
    if(!f) return;
    const start = new Date(f.fixture.date).toISOString().replace(/-|:|\.\d{3}/g, '');
    const end = new Date(new Date(f.fixture.date).getTime() + 7200000).toISOString().replace(/-|:|\.\d{3}/g, '');
    const title = `⚽ ${f.teams.home.name} vs ${f.teams.away.name}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(f.league.name + ' - ' + (f.fixture.venue?.name || ''))}`;
    window.open(url, '_blank');
};

window.addToMobileCalendar = function(fid) {
    const f = fixtureData[fid];
    if(!f) return;
    const content = generateICS(f);
    downloadBlob(content, `${f.teams.home.name}_vs_${f.teams.away.name}.ics`);
};

function generateICS(f) {
    const now = new Date().toISOString().replace(/-|:|\.\d{3}/g, '');
    const start = new Date(f.fixture.date).toISOString().replace(/-|:|\.\d{3}/g, '');
    const end = new Date(new Date(f.fixture.date).getTime() + 7200000).toISOString().replace(/-|:|\.\d{3}/g, '');
    return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:${f.fixture.id}@matchdaybytm\nDTSTAMP:${now}\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:⚽ ${f.teams.home.name} vs ${f.teams.away.name}\nDESCRIPTION:${f.league.name}\nEND:VEVENT\nEND:VCALENDAR`;
}

function downloadBlob(content, filename) {
    const blob = new Blob([content], {type: 'text/calendar'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
}

if(downloadAllBtn) downloadAllBtn.onclick = () => {
    let content = `BEGIN:VCALENDAR\nVERSION:2.0\ncalscale:GREGORIAN\n`;
    allFixtures.forEach(f => {
        const ics = generateICS(f); 
        const body = ics.match(/BEGIN:VEVENT[\s\S]*END:VEVENT/)[0];
        content += body + '\n';
    });
    content += 'END:VCALENDAR';
    downloadBlob(content, 'my_fixtures.ics');
};

// --- Calendar Sync ---
window.getSyncLink = async function() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
         openAuthModal('login');
         return;
    }
    
    const user = JSON.parse(userStr);
    
    // 1. If we have selected items, save them first
    if (selectedFixtures.size > 0) {
        const fixtures = [];
        selectedFixtures.forEach(fid => {
            if (fixtureData[`fixture_${fid}`]) fixtures.push(fixtureData[`fixture_${fid}`]);
        });

        try {
            const btn = document.getElementById('syncBtn');
            if(btn) btn.textContent = 'Saving...';
            
            const res = await fetch('/calendar/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fixtures: fixtures })
            });
            
            if (!res.ok) throw new Error('Failed to save fixtures');
        } catch (e) {
            alert(e.message);
            if(btn) btn.textContent = '🔗 Get Sync Link';
            return; 
        } finally {
            const btn = document.getElementById('syncBtn');
            if(btn) btn.textContent = '🔗 Get Sync Link';
        }
    }
    
    // 2. Generate Link (Client-side construction based on username)
    // The backend serves at /sync/MatchDayByTM/<username>.ics which is proxied by Node
    const link = `${window.location.origin}/sync/MatchDayByTM/${user.username}.ics`;
    showSyncModal(link);
};

function showSyncModal(link) {
    // Determine specialized links
    // 1. WebCal Protocol for Apple/Outlook (replace https:// or http:// with webcal://)
    const webcalLink = link.replace(/^https?:\/\//, 'webcal://');
    
    // 2. Google Calendar CID format (Must be HTTPS)
    // Note: Google requires the link to be accessible over the internet (won't work on localhost)
    const googleLink = `https://www.google.com/calendar/render?cid=${encodeURIComponent(link)}`;

    const html = `
        <div id="syncModal" class="modal active" style="z-index: 2000;">
            <div class="modal-content" style="max-width: 420px;">
                <span class="modal-close" onclick="document.getElementById('syncModal').remove()">&times;</span>
                
                <div style="text-align:center; margin-bottom:20px;">
                    <h2 style="margin:0 0 8px 0; color:#1e293b;">Add to Calendar</h2>
                    <p style="color:#64748b; margin:0; font-size:0.9rem;">
                        Subscribe to get automatic updates
                    </p>
                </div>

                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
                    <!-- Apple / Outlook / Mobile -->
                    <a href="${webcalLink}" 
                       style="display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; text-decoration:none; color:#1e293b; font-weight:600; transition:all 0.2s;"
                       onmouseover="this.style.background='#f1f5f9'; this.style.borderColor='#cbd5e1';"
                       onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0';">
                        <span style="font-size:1.3rem;">🍎</span>
                        Apple / Outlook
                    </a>

                    <!-- Google Calendar -->
                    <a href="${googleLink}" target="_blank" 
                       style="display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; background:#4285f4; border:none; border-radius:10px; text-decoration:none; color:white; font-weight:600; transition:all 0.2s;"
                       onmouseover="this.style.background='#3b78e7';"
                       onmouseout="this.style.background='#4285f4';">
                        <span style="font-size:1.1rem;">G</span>
                        Google Calendar
                    </a>
                </div>

                <!-- Copy Link -->
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
                    <div style="font-size:0.8rem; color:#64748b; margin-bottom:8px; text-align:center;">Or copy the subscription link:</div>
                    <div style="display:flex; gap:8px;">
                        <input type="text" value="${link}" readonly 
                            style="flex:1; padding:10px; background:white; border:1px solid #e2e8f0; border-radius:6px; color:#64748b; font-size:0.85rem;">
                        <button onclick="navigator.clipboard.writeText('${link}').then(()=>{this.textContent='✓'; setTimeout(()=>this.textContent='Copy',1500)})" 
                            style="padding:10px 16px; background:#2563eb; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.85rem;">
                            Copy
                        </button>
                    </div>
                </div>

                <!-- Note -->
                <p style="margin:15px 0 0 0; font-size:0.75rem; color:#94a3b8; text-align:center;">
                    ℹ️ Google Calendar requires a public URL (won't work on localhost)
                </p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}
// --- Auth & Favorites ---

window.checkAuth = function() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        try {
            updateAuthUI(JSON.parse(user));
            loadFavorites(); // This triggers the 401 check inside
        } catch(e) { logout(); }
    } else {
        updateAuthUI(null);
    }
};

async function loadFavorites() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(FAV_API, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) {
            console.warn('Token expired');
            logout();
            return;
        }
        
        const data = await res.json();
        if (data.favorites) {
            // Store as Map with team_id -> subscription details
            userFavorites = new Map();
            data.favorites.forEach(f => {
                userFavorites.set(f.team_id, {
                    filters: f.filters || ['All'],
                    isNational: f.is_national || false
                });
            });
            renderQuickFavorites(data.favorites);
            renderFavoritesList(data.favorites);
            // Re-render fixtures if present to update stars
            if(allFixtures.length > 0) renderFixtures();
        }
    } catch (e) { console.error(e); }
}

function renderQuickFavorites(favs) {
    const container = document.getElementById('quickFavoritesContainer');
    const wrapper = container ? container.closest('.quick-select') : null;

    if (container && wrapper) {
        if (favs.length === 0) {
            wrapper.style.display = 'none';
            wrapper.classList.remove('active');
            container.innerHTML = '';
        } else {
            wrapper.style.display = 'block';
            wrapper.classList.add('active');

            // Add Header if missing
            if (!wrapper.querySelector('h3')) {
                const h3 = document.createElement('h3');
                h3.textContent = 'Your Subscriptions';
                wrapper.insertBefore(h3, container);
            }

            // Store full favorites data globally for edit modal
            window.userFavoritesData = favs;
            
            // Render Elegant Chips - click to edit subscription
            container.innerHTML = favs.map(f => `
                <div class="fav-chip" onclick="openEditSubscription(${f.team_id})" title="Click to edit subscription for ${f.team_name}">
                    <img src="${f.team_logo || '/favicon.svg'}" alt="${f.team_name}">
                    <span>${f.team_name}</span>
                </div>
            `).join('');
        }
    }
}

function renderFavoritesList(favs) {
    const list = document.getElementById('favoritesList');
    if(!list) return;
    
    if (favs.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:30px; color:#94a3b8;">
                <p style="font-size:1.1rem;">No subscriptions yet</p>
                <p style="font-size:0.9rem;">Browse teams and click the star to subscribe</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = favs.map(f => {
        // Parse filters for display
        let filters = [];
        try {
            filters = f.filters ? (typeof f.filters === 'string' ? JSON.parse(f.filters) : f.filters) : ['All'];
        } catch(e) { filters = ['All']; }
        
        const filterText = filters.includes('All') ? 'All matches' : filters.join(', ');
        
        return `
            <div class="subscription-item" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:8px; background:#f8fafc;">
                <img src="${f.team_logo || '/favicon.svg'}" alt="${f.team_name}" style="width:36px; height:36px; object-fit:contain;">
                <div style="flex:1;">
                    <div style="font-weight:600; color:#1e293b;">${f.team_name}</div>
                    <div style="font-size:0.8rem; color:#64748b;">🗓 ${filterText}</div>
                </div>
                <button onclick="openEditSubscription(${f.team_id}); closeAuthModal();" 
                        style="padding:6px 12px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:6px; cursor:pointer; font-size:0.85rem;">
                    Edit
                </button>
                <button onclick="confirmUnsubscribe(${f.team_id}, '${f.team_name.replace(/'/g, "\\'")}')"
                        style="padding:6px 12px; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:6px; cursor:pointer; font-size:0.85rem;">
                    ✕
                </button>
            </div>
        `;
    }).join('');
}

window.toggleFavorite = async function(teamId, teamName, teamLogo, isNational = false) {
    const token = localStorage.getItem('token');
    if (!token) {
        openAuthModal('login');
        return;
    }
    
    // Check global state if argument not provided (e.g. from fixture star click)
    const effectiveIsNational = isNational || currentState.isNationalView;

    // If already favorite, open edit modal (not immediately remove)
    if (userFavorites.has(teamId)) {
        openEditSubscription(teamId);
    } else {
        // If adding, open preferences
        openSubscriptionPreferences(teamId, teamName, teamLogo, effectiveIsNational);
    }
};

// Wrapper for table star button clicks
window.toggleFavoriteFromTable = function(btn) {
    try {
        const teamData = JSON.parse(btn.dataset.team);
        const isNational = teamData.isNational || currentState.isNationalView || false;
        toggleFavorite(teamData.id, teamData.name, teamData.logo, isNational);
    } catch (e) {
        console.error('Error parsing team data:', e);
    }
};

// Show team info modal (for mobile view)
window.showTeamInfo = function(dataStr) {
    try {
        const data = JSON.parse(dataStr.replace(/&#39;/g, "'"));
        
        // Create modal HTML
        const modalHtml = `
            <div class="team-info-modal" onclick="closeTeamInfoModal(event)">
                <div class="team-info-content" onclick="event.stopPropagation()">
                    <button class="modal-close-btn" onclick="closeTeamInfoModal()">&times;</button>
                    <div style="text-align:center; margin-bottom:15px;">
                        <img src="${data.logo}" alt="${data.name}" style="width:64px;height:64px;object-fit:contain;">
                        <h3 style="margin:10px 0 5px;">${data.name}</h3>
                    </div>
                    <div class="team-info-grid">
                        <div class="info-row">
                            <span class="info-label">📊 Rank</span>
                            <span class="info-value">#${data.rank}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">⭐ Points</span>
                            <span class="info-value" style="font-weight:bold;font-size:1.2em;">${data.points}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">📈 Form</span>
                            <span class="info-value">${data.form || '—'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">🏟️ Stadium</span>
                            <span class="info-value">${data.venue || '—'}${data.capacity ? ` (${data.capacity.toLocaleString()})` : ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">📍 City</span>
                            <span class="info-value">${data.city || '—'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">📅 Founded</span>
                            <span class="info-value">${data.founded || '—'}</span>
                        </div>
                        <div class="info-row full-width">
                            <span class="info-label">⚽ Stats</span>
                            <span class="info-value">P:${data.played} W:${data.won} D:${data.draw} L:${data.lost} GD:${data.gd > 0 ? '+' : ''}${data.gd}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existing = document.querySelector('.team-info-modal');
        if (existing) existing.remove();
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden'; // Prevent scroll
    } catch (e) {
        console.error('Error showing team info:', e);
    }
};

// Close team info modal
window.closeTeamInfoModal = function(event) {
    const modal = document.querySelector('.team-info-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
};

// Show team info popup (mobile bottom sheet)
window.showTeamInfoPopup = function(dataStr) {
    try {
        // Decode from base64
        const data = JSON.parse(decodeURIComponent(atob(dataStr)));
        
        // Format form as colored dots
        const formDots = (data.form || '').split('').map(char => {
            const colorClass = char.toUpperCase();
            return `<span class="form-dot ${colorClass}">${colorClass}</span>`;
        }).join('');
        
        // GD formatting
        const gd = data.gd || 0;
        const gdText = gd > 0 ? `+${gd}` : gd;
        const gdColor = gd > 0 ? '#22c55e' : gd < 0 ? '#ef4444' : '#64748b';
        
        // Create popup HTML
        const popupHtml = `
            <div class="team-info-popup-overlay show" onclick="closeTeamInfoPopup()"></div>
            <div class="team-info-popup show">
                <button class="team-info-popup-close" onclick="closeTeamInfoPopup()">×</button>
                <div class="team-info-popup-header">
                    <img src="${data.logo}" alt="" onerror="this.style.display='none'">
                    <h3>${data.name}</h3>
                </div>
                <div class="team-info-popup-stats">
                    <div class="team-info-popup-stat">
                        <div class="label">מקום</div>
                        <div class="value">#${data.rank}</div>
                    </div>
                    <div class="team-info-popup-stat">
                        <div class="label">נקודות</div>
                        <div class="value">${data.points}</div>
                    </div>
                    <div class="team-info-popup-stat">
                        <div class="label">משחקים</div>
                        <div class="value">${data.played}</div>
                    </div>
                    <div class="team-info-popup-stat">
                        <div class="label">ניצ׳</div>
                        <div class="value">${data.won}</div>
                    </div>
                    <div class="team-info-popup-stat">
                        <div class="label">תיקו</div>
                        <div class="value">${data.draw}</div>
                    </div>
                    <div class="team-info-popup-stat">
                        <div class="label">הפסד</div>
                        <div class="value">${data.lost}</div>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-around; padding:12px 0; border-top:1px solid #e2e8f0;">
                    <div style="text-align:center;">
                        <div style="font-size:0.75rem; color:#64748b;">יחס שערים</div>
                        <div style="font-size:1.2rem; font-weight:700; color:${gdColor};">${gdText}</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:0.75rem; color:#64748b; margin-bottom:6px;">פורמה</div>
                        <div class="team-info-popup-form">${formDots || '—'}</div>
                    </div>
                </div>
                ${data.venue ? `
                <div style="padding:12px 0; border-top:1px solid #e2e8f0; font-size:0.85rem; color:#64748b;">
                    🏟️ ${data.venue}${data.city ? ` • ${data.city}` : ''}${data.capacity ? ` • ${data.capacity.toLocaleString()} מושבים` : ''}
                </div>
                ` : ''}
                <button onclick="closeTeamInfoPopup()" style="
                    width:100%; 
                    padding:14px; 
                    margin-top:12px;
                    background:#f1f5f9; 
                    border:none; 
                    border-radius:12px; 
                    font-size:1rem; 
                    font-weight:600;
                    color:#64748b;
                    cursor:pointer;
                ">סגור</button>
            </div>
        `;
        
        // Remove existing popup if any
        closeTeamInfoPopup();
        
        // Add popup to page
        document.body.insertAdjacentHTML('beforeend', popupHtml);
        document.body.style.overflow = 'hidden';
    } catch (e) {
        console.error('Error showing team info popup:', e);
    }
};

// Close team info popup
window.closeTeamInfoPopup = function() {
    const overlay = document.querySelector('.team-info-popup-overlay');
    const popup = document.querySelector('.team-info-popup');
    if (overlay) overlay.remove();
    if (popup) popup.remove();
    document.body.style.overflow = '';
};

// Fetch team competitions with caching
async function fetchTeamCompetitions(teamId, isNational = false) {
    const cacheKey = `${teamId}_${isNational}`;
    if (teamCompetitionsCache.has(cacheKey)) {
        return teamCompetitionsCache.get(cacheKey);
    }
    
    try {
        const res = await fetch(`${API_BASE}/team-leagues/${teamId}?national=${isNational}`);
        const data = await res.json();
        teamCompetitionsCache.set(cacheKey, data);
        return data;
    } catch (e) {
        console.error('Error fetching team competitions:', e);
        return null;
    }
}

// Generate smart option HTML based on available competitions
function generateSmartOptions(comps, isNational = false) {
    if (!comps) {
        // Fallback to generic options if API failed
        return isNational ? generateNationalOptions(null) : generateClubOptions(null);
    }
    
    if (isNational) {
        return generateNationalOptions(comps.national);
    } else {
        return generateClubOptions(comps);
    }
}

function generateNationalOptions(national) {
    let html = `
        <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
            <input type="checkbox" name="compFilter" value="All" checked onchange="toggleFilterAll(this)">
            <div>
                <strong>All Matches</strong>
                <div style="font-size:0.8rem; color:#64748b;">Sync everything</div>
            </div>
        </label>
    `;
    
    // If we have competition data, show only available options
    if (national) {
        const hasMajor = national.major && national.major.length > 0;
        const hasQualifiers = national.qualifiers && national.qualifiers.length > 0;
        const hasFriendlies = national.friendlies && national.friendlies.length > 0;
        const hasNationsLeague = national.nationsLeague && national.nationsLeague.length > 0;
        
        // Major Tournaments
        const majorNames = hasMajor ? national.major.map(l => l.name).join(', ') : '';
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasMajor ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasMajor ? 'pointer' : 'not-allowed'}; ${!hasMajor ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="Major" class="sub-filter" onchange="toggleSubFilter(this)" ${!hasMajor ? 'disabled' : ''}>
                <div>
                    <strong>Major Tournaments</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasMajor ? majorNames : '🏖️ Not in any major tournament this season'}</div>
                </div>
            </label>
        `;
        
        // Qualifiers
        const qualNames = hasQualifiers ? national.qualifiers.map(l => l.name).join(', ') : '';
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasQualifiers ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasQualifiers ? 'pointer' : 'not-allowed'}; ${!hasQualifiers ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="Qualifiers" class="sub-filter" onchange="toggleSubFilter(this)" ${!hasQualifiers ? 'disabled' : ''}>
                <div>
                    <strong>Qualifiers</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasQualifiers ? qualNames : '✅ Already qualified or no active qualifiers'}</div>
                </div>
            </label>
        `;
        
        // Friendlies
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasFriendlies ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasFriendlies ? 'pointer' : 'not-allowed'}; ${!hasFriendlies ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="Friendlies" class="sub-filter" onchange="toggleSubFilter(this)" ${!hasFriendlies ? 'disabled' : ''}>
                <div>
                    <strong>Friendlies</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasFriendlies ? 'International Friendlies' : '📅 No friendlies scheduled'}</div>
                </div>
            </label>
        `;
        
        // Nations League
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasNationsLeague ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasNationsLeague ? 'pointer' : 'not-allowed'}; ${!hasNationsLeague ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="NationsLeague" class="sub-filter" onchange="toggleSubFilter(this)" ${!hasNationsLeague ? 'disabled' : ''}>
                <div>
                    <strong>Nations League</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasNationsLeague ? 'UEFA Nations League' : '🗓️ Not in Nations League this cycle'}</div>
                </div>
            </label>
        `;
    } else {
        // Fallback - show all options enabled
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Major" class="sub-filter" onchange="toggleSubFilter(this)">
                <div><strong>Major Tournaments</strong><div style="font-size:0.8rem; color:#64748b;">World Cup, Euros, Copa America</div></div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Qualifiers" class="sub-filter" onchange="toggleSubFilter(this)">
                <div><strong>Qualifiers</strong><div style="font-size:0.8rem; color:#64748b;">World Cup & Euro Qualifiers</div></div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Friendlies" class="sub-filter" onchange="toggleSubFilter(this)">
                <div><strong>Friendlies</strong><div style="font-size:0.8rem; color:#64748b;">International Friendlies</div></div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="NationsLeague" class="sub-filter" onchange="toggleSubFilter(this)">
                <div><strong>Nations League</strong><div style="font-size:0.8rem; color:#64748b;">UEFA Nations League</div></div>
            </label>
        `;
    }
    
    return html;
}

function generateClubOptions(comps) {
    let html = `
        <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
            <input type="checkbox" name="compFilter" value="All" checked onchange="toggleFilterAll(this)">
            <div>
                <strong>All Matches</strong>
                <div style="font-size:0.8rem; color:#64748b;">Sync all matches including friendlies</div>
            </div>
        </label>
    `;
    
    if (comps) {
        const hasLeague = comps.leagues && comps.leagues.length > 0;
        const hasCup = comps.cups && comps.cups.length > 0;
        const hasContinental = comps.continental && comps.continental.length > 0;
        
        // League
        const leagueNames = hasLeague ? comps.leagues.map(l => l.name).join(', ') : '';
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasLeague ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasLeague ? 'pointer' : 'not-allowed'}; ${!hasLeague ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="League" class="sub-filter" onchange="toggleSubFilter(this)" ${!hasLeague ? 'disabled' : ''}>
                <div>
                    <strong>Domestic League</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasLeague ? leagueNames : '🏖️ Not in a league this season - maybe next year!'}</div>
                </div>
            </label>
        `;
        
        // Cup
        const cupNames = hasCup ? comps.cups.map(l => l.name).join(', ') : '';
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasCup ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasCup ? 'pointer' : 'not-allowed'}; ${!hasCup ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="Cup" class="sub-filter" onchange="toggleSubFilter(this)" ${!hasCup ? 'disabled' : ''}>
                <div>
                    <strong>Cups</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasCup ? cupNames : '😢 Eliminated or not participating'}</div>
                </div>
            </label>
        `;
        
        // Continental
        const contNames = hasContinental ? comps.continental.map(l => l.name).join(', ') : '';
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasContinental ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasContinental ? 'pointer' : 'not-allowed'}; ${!hasContinental ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="UEFA" class="sub-filter" onchange="toggleSubFilter(this)" ${!hasContinental ? 'disabled' : ''}>
                <div>
                    <strong>Continental / International</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasContinental ? contNames : '🌟 Maybe next year!'}</div>
                </div>
            </label>
        `;
    } else {
        // Fallback - show all options enabled
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="League" class="sub-filter" onchange="toggleSubFilter(this)">
                <div><strong>Domestic League</strong><div style="font-size:0.8rem; color:#64748b;">Regular league matches</div></div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Cup" class="sub-filter" onchange="toggleSubFilter(this)">
                <div><strong>Cups</strong><div style="font-size:0.8rem; color:#64748b;">National cup competitions</div></div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="UEFA" class="sub-filter" onchange="toggleSubFilter(this)">
                <div><strong>Continental / International</strong><div style="font-size:0.8rem; color:#64748b;">Champions League, Libertadores, etc.</div></div>
            </label>
        `;
    }
    
    return html;
}

window.openSubscriptionPreferences = async function(teamId, teamName, teamLogo, isNationalParam = null) {
    const isNational = isNationalParam !== null ? isNationalParam : (currentState.league === 'NATIONAL');

    // Show loading modal first
    const loadingHtml = `
        <div id="subPrefModal" class="modal active" style="z-index: 2500;">
            <div class="modal-content" style="max-width: 450px; text-align:center;">
                <div style="margin-bottom:20px;">
                    <img src="${teamLogo}" style="height:50px; margin-bottom:10px;">
                    <h2 style="margin:0;">Track ${teamName}</h2>
                </div>
                <div style="padding:30px; color:#64748b;">
                    <div style="font-size:1.5rem; margin-bottom:10px;">⏳</div>
                    Loading available competitions...
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHtml);
    
    // Fetch team competitions
    const comps = await fetchTeamCompetitions(teamId, isNational);
    
    // Store in userFavorites cache for context-aware stars
    if (comps) {
        teamCompetitionsCache.set(`${teamId}_${isNational}`, comps);
    }
    
    // Generate smart options
    const optionsHtml = generateSmartOptions(comps, isNational);

    // Replace modal content
    const modal = document.getElementById('subPrefModal');
    if (modal) {
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <span class="modal-close" onclick="document.getElementById('subPrefModal').remove()">&times;</span>
                <div style="text-align:center; margin-bottom:20px;">
                    <img src="${teamLogo}" style="height:50px; margin-bottom:10px;">
                    <h2 style="margin:0;">Track ${teamName}</h2>
                    ${isNational ? '<span class="badge" style="background:#dbeafe; color:#1e40af; padding:4px 8px; border-radius:4px; font-size:0.8rem;">National Team</span>' : ''}
                </div>
                
                <p style="color:#64748b; margin-bottom:15px; font-size:0.95rem;">
                    Select which matches you want to sync to your calendar automatically:
                </p>

                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:25px;">
                    ${optionsHtml}
                </div>

                <div style="display:flex; gap:10px;">
                    <button class="btn-primary-lg" style="flex:1" onclick="collectAndSubmitFavorite(${teamId}, '${teamName.replace(/'/g, "\\'")}', '${teamLogo}', ${isNational})">
                        Subscribe
                    </button>
                    <button class="control-btn" style="flex:1" onclick="document.getElementById('subPrefModal').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
    }
};

// Show inline error message in subscription modal
function showModalError(message) {
    // Remove any existing error
    const existing = document.getElementById('modalErrorMsg');
    if (existing) existing.remove();
    
    // Find the modal content and insert error before buttons
    const modal = document.getElementById('subPrefModal');
    if (!modal) return;
    
    const buttonContainer = modal.querySelector('div[style*="display:flex; gap:10px"]');
    if (buttonContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'modalErrorMsg';
        errorDiv.style.cssText = 'background:#fef2f2; border:1px solid #fecaca; color:#dc2626; padding:10px 15px; border-radius:8px; margin-bottom:15px; font-size:0.9rem; text-align:center;';
        errorDiv.innerHTML = `⚠️ ${message}`;
        buttonContainer.parentNode.insertBefore(errorDiv, buttonContainer);
        
        // Auto-remove after 3 seconds
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

window.toggleFilterAll = function(cb) {
    const others = document.querySelectorAll('.sub-filter');
    if (cb.checked) {
        // When All is checked, uncheck others but keep them enabled
        others.forEach(c => { c.checked = false; });
    }
}

// When a sub-filter is clicked, uncheck "All Matches"
window.toggleSubFilter = function(cb) {
    if (cb.checked) {
        const allCheckbox = document.querySelector('input[value="All"]');
        if (allCheckbox) allCheckbox.checked = false;
    }
}

// Check if subscription is relevant to current context (for context-aware stars)
// This syncs the star color with what league/cup/continental table the user is viewing
function isSubscriptionRelevant(teamId) {
    const sub = userFavorites.get(teamId);
    if (!sub) return false;
    
    const filters = sub.filters || ['All'];
    
    // "All" matches everything
    if (filters.includes('All')) return true;
    
    // For national teams context
    if (currentState.league === 'NATIONAL') {
        // In national team view, check if user subscribed to this national team
        return sub.isNational;
    }
    
    // For club teams - check current competition context
    const leagueType = (currentState.leagueType || '').toLowerCase();
    const leagueName = (currentState.leagueName || '').toLowerCase();
    
    // Determine what type of competition we're currently viewing
    const isViewingLeague = leagueType === 'league';
    const isViewingCup = leagueType === 'cup';
    const isViewingContinental = isContinentalCompetition(leagueName);
    
    // Match filters to current view
    if (isViewingLeague && filters.includes('League')) return true;
    if (isViewingCup && filters.includes('Cup')) return true;
    if (isViewingContinental && filters.includes('UEFA')) return true;
    
    return false;
}

// Helper: Detect if competition name indicates continental/international
function isContinentalCompetition(name) {
    const keywords = [
        'champions', 'europa', 'conference', 'libertadores', 'sudamericana',
        'afc', 'caf', 'concacaf', 'club world', 'super cup', 'recopa'
    ];
    return keywords.some(kw => name.includes(kw));
}

// Open edit modal for existing subscription
window.openEditSubscription = async function(teamId) {
    // Find the favorite data
    const fav = window.userFavoritesData?.find(f => f.team_id === teamId);
    if (!fav) {
        console.error('Favorite not found:', teamId);
        return;
    }
    
    const teamName = fav.team_name;
    const teamLogo = fav.team_logo || '/favicon.svg';
    const currentFilters = (fav.filters && fav.filters.length > 0) ? fav.filters : ['All'];
    const isNational = fav.is_national || false;
    const hasAll = currentFilters.includes('All');

    // Show loading modal first
    const loadingHtml = `
        <div id="subPrefModal" class="modal active" style="z-index: 2500;">
            <div class="modal-content" style="max-width: 450px; text-align:center;">
                <div style="margin-bottom:20px;">
                    <img src="${teamLogo}" style="height:50px; margin-bottom:10px;">
                    <h2 style="margin:0;">Edit ${teamName}</h2>
                </div>
                <div style="padding:30px; color:#64748b;">
                    <div style="font-size:1.5rem; margin-bottom:10px;">⏳</div>
                    Loading competitions...
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHtml);
    
    // Fetch team competitions
    const comps = await fetchTeamCompetitions(teamId, isNational);
    
    // Generate smart options with current selections
    const optionsHtml = generateSmartOptionsWithSelections(comps, isNational, currentFilters);

    // Replace modal content
    const modal = document.getElementById('subPrefModal');
    if (modal) {
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <span class="modal-close" onclick="document.getElementById('subPrefModal').remove()">&times;</span>
                <div style="text-align:center; margin-bottom:20px;">
                    <img src="${teamLogo}" style="height:50px; margin-bottom:10px;">
                    <h2 style="margin:0;">Edit ${teamName}</h2>
                    ${isNational ? '<span class="badge" style="background:#dbeafe; color:#1e40af; padding:4px 8px; border-radius:4px; font-size:0.8rem;">National Team</span>' : ''}
                </div>
                
                <p style="color:#64748b; margin-bottom:15px; font-size:0.95rem;">
                    Update which matches you want to sync to your calendar:
                </p>

                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
                    ${optionsHtml}
                </div>

                <!-- Preview Matches Button -->
                <button onclick="previewTeamMatches(${teamId}, '${teamName.replace(/'/g, "\\'")}')" 
                        style="width:100%; padding:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; color:#2563eb; font-size:0.9rem; margin-bottom:20px;">
                    👁️ Preview Upcoming Matches
                </button>

                <div style="display:flex; gap:10px;">
                    <button class="btn-primary-lg" style="flex:1" onclick="collectAndUpdateSubscription(${teamId}, '${teamName.replace(/'/g, "\\'")}', '${teamLogo}', ${isNational})">
                        Update
                    </button>
                    <button class="control-btn" style="flex:1; color:#dc2626;" onclick="confirmUnsubscribe(${teamId}, '${teamName.replace(/'/g, "\\'")}')">
                        Unsubscribe
                    </button>
                </div>
            </div>
        `;
    }
};

// Generate smart options with pre-selected values (for edit modal)
function generateSmartOptionsWithSelections(comps, isNational, currentFilters) {
    if (!comps) {
        // Fallback if API failed
        return isNational ? generateNationalOptionsWithSelections(null, currentFilters) : generateClubOptionsWithSelections(null, currentFilters);
    }
    
    if (isNational) {
        return generateNationalOptionsWithSelections(comps.national, currentFilters);
    } else {
        return generateClubOptionsWithSelections(comps, currentFilters);
    }
}

function generateNationalOptionsWithSelections(national, currentFilters) {
    const hasAll = currentFilters.includes('All');
    
    let html = `
        <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
            <input type="checkbox" name="compFilter" value="All" ${hasAll ? 'checked' : ''} onchange="toggleFilterAll(this)">
            <div>
                <strong>All Matches</strong>
                <div style="font-size:0.8rem; color:#64748b;">Sync everything</div>
            </div>
        </label>
    `;
    
    if (national) {
        const hasMajor = national.major && national.major.length > 0;
        const hasQualifiers = national.qualifiers && national.qualifiers.length > 0;
        const hasFriendlies = national.friendlies && national.friendlies.length > 0;
        const hasNationsLeague = national.nationsLeague && national.nationsLeague.length > 0;
        
        const majorNames = hasMajor ? national.major.map(l => l.name).join(', ') : '';
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasMajor ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasMajor ? 'pointer' : 'not-allowed'}; ${!hasMajor ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="Major" class="sub-filter" ${currentFilters.includes('Major') ? 'checked' : ''} onchange="toggleSubFilter(this)" ${!hasMajor ? 'disabled' : ''}>
                <div>
                    <strong>Major Tournaments</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasMajor ? majorNames : '🏖️ Not in any major tournament this season'}</div>
                </div>
            </label>
        `;
        
        const qualNames = hasQualifiers ? national.qualifiers.map(l => l.name).join(', ') : '';
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasQualifiers ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasQualifiers ? 'pointer' : 'not-allowed'}; ${!hasQualifiers ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="Qualifiers" class="sub-filter" ${currentFilters.includes('Qualifiers') ? 'checked' : ''} onchange="toggleSubFilter(this)" ${!hasQualifiers ? 'disabled' : ''}>
                <div>
                    <strong>Qualifiers</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasQualifiers ? qualNames : '✅ Already qualified or no active qualifiers'}</div>
                </div>
            </label>
        `;
        
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasFriendlies ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasFriendlies ? 'pointer' : 'not-allowed'}; ${!hasFriendlies ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="Friendlies" class="sub-filter" ${currentFilters.includes('Friendlies') ? 'checked' : ''} onchange="toggleSubFilter(this)" ${!hasFriendlies ? 'disabled' : ''}>
                <div>
                    <strong>Friendlies</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasFriendlies ? 'International Friendlies' : '📅 No friendlies scheduled'}</div>
                </div>
            </label>
        `;
        
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasNationsLeague ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasNationsLeague ? 'pointer' : 'not-allowed'}; ${!hasNationsLeague ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="NationsLeague" class="sub-filter" ${currentFilters.includes('NationsLeague') ? 'checked' : ''} onchange="toggleSubFilter(this)" ${!hasNationsLeague ? 'disabled' : ''}>
                <div>
                    <strong>Nations League</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasNationsLeague ? 'UEFA Nations League' : '🗓️ Not in Nations League this cycle'}</div>
                </div>
            </label>
        `;
    } else {
        // Fallback - show all options
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Major" class="sub-filter" ${currentFilters.includes('Major') ? 'checked' : ''} onchange="toggleSubFilter(this)">
                <div><strong>Major Tournaments</strong><div style="font-size:0.8rem; color:#64748b;">World Cup, Euros, Copa America</div></div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Qualifiers" class="sub-filter" ${currentFilters.includes('Qualifiers') ? 'checked' : ''} onchange="toggleSubFilter(this)">
                <div><strong>Qualifiers</strong><div style="font-size:0.8rem; color:#64748b;">World Cup & Euro Qualifiers</div></div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Friendlies" class="sub-filter" ${currentFilters.includes('Friendlies') ? 'checked' : ''} onchange="toggleSubFilter(this)">
                <div><strong>Friendlies</strong><div style="font-size:0.8rem; color:#64748b;">International Friendlies</div></div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="NationsLeague" class="sub-filter" ${currentFilters.includes('NationsLeague') ? 'checked' : ''} onchange="toggleSubFilter(this)">
                <div><strong>Nations League</strong><div style="font-size:0.8rem; color:#64748b;">UEFA Nations League</div></div>
            </label>
        `;
    }
    
    return html;
}

function generateClubOptionsWithSelections(comps, currentFilters) {
    const hasAll = currentFilters.includes('All');
    
    let html = `
        <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
            <input type="checkbox" name="compFilter" value="All" ${hasAll ? 'checked' : ''} onchange="toggleFilterAll(this)">
            <div>
                <strong>All Matches</strong>
                <div style="font-size:0.8rem; color:#64748b;">Sync all matches including friendlies</div>
            </div>
        </label>
    `;
    
    if (comps) {
        const hasLeague = comps.leagues && comps.leagues.length > 0;
        const hasCup = comps.cups && comps.cups.length > 0;
        const hasContinental = comps.continental && comps.continental.length > 0;
        
        const leagueNames = hasLeague ? comps.leagues.map(l => l.name).join(', ') : '';
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasLeague ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasLeague ? 'pointer' : 'not-allowed'}; ${!hasLeague ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="League" class="sub-filter" ${currentFilters.includes('League') ? 'checked' : ''} onchange="toggleSubFilter(this)" ${!hasLeague ? 'disabled' : ''}>
                <div>
                    <strong>Domestic League</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasLeague ? leagueNames : '🏖️ Not in a league this season - maybe next year!'}</div>
                </div>
            </label>
        `;
        
        const cupNames = hasCup ? comps.cups.map(l => l.name).join(', ') : '';
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasCup ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasCup ? 'pointer' : 'not-allowed'}; ${!hasCup ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="Cup" class="sub-filter" ${currentFilters.includes('Cup') ? 'checked' : ''} onchange="toggleSubFilter(this)" ${!hasCup ? 'disabled' : ''}>
                <div>
                    <strong>Cups</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasCup ? cupNames : '😢 Eliminated or not participating'}</div>
                </div>
            </label>
        `;
        
        const contNames = hasContinental ? comps.continental.map(l => l.name).join(', ') : '';
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid ${hasContinental ? '#e2e8f0' : '#f1f5f9'}; border-radius:8px; cursor:${hasContinental ? 'pointer' : 'not-allowed'}; ${!hasContinental ? 'opacity:0.5;' : ''}">
                <input type="checkbox" name="compFilter" value="UEFA" class="sub-filter" ${currentFilters.includes('UEFA') ? 'checked' : ''} onchange="toggleSubFilter(this)" ${!hasContinental ? 'disabled' : ''}>
                <div>
                    <strong>Continental / International</strong>
                    <div style="font-size:0.8rem; color:#64748b;">${hasContinental ? contNames : '🌟 Maybe next year!'}</div>
                </div>
            </label>
        `;
    } else {
        // Fallback
        html += `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="League" class="sub-filter" ${currentFilters.includes('League') ? 'checked' : ''} onchange="toggleSubFilter(this)">
                <div><strong>Domestic League</strong><div style="font-size:0.8rem; color:#64748b;">Regular league matches</div></div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Cup" class="sub-filter" ${currentFilters.includes('Cup') ? 'checked' : ''} onchange="toggleSubFilter(this)">
                <div><strong>Cups</strong><div style="font-size:0.8rem; color:#64748b;">National cup competitions</div></div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="UEFA" class="sub-filter" ${currentFilters.includes('UEFA') ? 'checked' : ''} onchange="toggleSubFilter(this)">
                <div><strong>Continental / International</strong><div style="font-size:0.8rem; color:#64748b;">Champions League, Libertadores, etc.</div></div>
            </label>
        `;
    }
    
    return html;
}

// Update an existing subscription
window.collectAndUpdateSubscription = function(teamId, teamName, teamLogo, isNational = false) {
    const all = document.querySelector('input[value="All"]').checked;
    let filters = [];
    
    if (all) {
        filters = ['All'];
    } else {
        const checked = document.querySelectorAll('.sub-filter:checked');
        checked.forEach(c => filters.push(c.value));
    }
    
    // Require at least one selection
    if (filters.length === 0) {
        showModalError('Please select at least one match type');
        return;
    }
    
    document.getElementById('subPrefModal').remove();
    submitFavoriteAdd(teamId, teamName, teamLogo, filters, isNational); // Uses same endpoint (upsert)
}

// Confirm unsubscribe
window.confirmUnsubscribe = function(teamId, teamName) {
    // Remove edit modal if it exists (may not exist if called from subscription list X button)
    const editModal = document.getElementById('subPrefModal');
    if (editModal) editModal.remove();
    
    const html = `
        <div id="confirmModal" class="modal active" style="z-index: 2600;">
            <div class="modal-content" style="max-width: 350px; text-align:center;">
                <h3 style="margin-bottom:15px;">Unsubscribe from ${teamName}?</h3>
                <p style="color:#64748b; margin-bottom:20px;">This will remove all calendar sync for this team.</p>
                <div style="display:flex; gap:10px;">
                    <button class="control-btn" style="flex:1" onclick="document.getElementById('confirmModal').remove()">Cancel</button>
                    <button class="btn-primary-lg" style="flex:1; background:#dc2626;" onclick="document.getElementById('confirmModal').remove(); submitFavoriteRemove(${teamId});">Unsubscribe</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

// Preview upcoming matches for a team
window.previewTeamMatches = async function(teamId, teamName) {
    // Show loading in a new modal
    const previewHtml = `
        <div id="previewModal" class="modal active" style="z-index: 2600;">
            <div class="modal-content" style="max-width: 500px;">
                <span class="modal-close" onclick="document.getElementById('previewModal').remove()">&times;</span>
                <h2 style="margin:0 0 5px 0; text-align:center;">Upcoming Matches</h2>
                <p style="color:#64748b; text-align:center; margin:0 0 15px 0;">${teamName}</p>
                <div id="previewList" style="max-height:400px; overflow-y:auto;">
                    <div style="text-align:center; padding:30px; color:#94a3b8;">⏳ Loading matches...</div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', previewHtml);
    
    try {
        const res = await fetch(`${API_BASE}/team/${teamId}?next=15`);
        const data = await res.json();
        const fixtures = Array.isArray(data) ? data : (data.response || []);
        
        const previewList = document.getElementById('previewList');
        
        if (fixtures.length === 0) {
            previewList.innerHTML = `
                <div style="text-align:center; padding:30px;">
                    <div style="font-size:2rem; margin-bottom:10px;">📭</div>
                    <div style="color:#64748b; margin-bottom:15px;">No upcoming matches scheduled yet</div>
                    <button onclick="document.getElementById('previewModal').remove()" 
                            style="background:#3b82f6; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:600;">
                        Continue with Subscription
                    </button>
                </div>
            `;
            return;
        }
        
        previewList.innerHTML = fixtures.map(f => {
            const fixture = f.fixture || {};
            const teams = f.teams || {};
            const league = f.league || {};
            
            let dateStr = 'TBD';
            try {
                const d = new Date(fixture.date);
                dateStr = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + 
                          ' • ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch(e) {}
            
            const leagueType = league.type || '';
            const badgeColor = leagueType === 'League' ? '#dcfce7' : leagueType === 'Cup' ? '#fef3c7' : '#e0e7ff';
            const badgeText = leagueType === 'League' ? '#166534' : leagueType === 'Cup' ? '#92400e' : '#3730a3';
            
            return `
                <div style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid #f1f5f9;">
                    <div style="flex:1;">
                        <div style="font-weight:600; color:#1e293b; margin-bottom:4px;">
                            ${teams.home?.name || '?'} vs ${teams.away?.name || '?'}
                        </div>
                        <div style="font-size:0.8rem; color:#64748b;">${dateStr}</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="background:${badgeColor}; color:${badgeText}; padding:3px 8px; border-radius:4px; font-size:0.7rem; font-weight:600;">
                            ${leagueType}
                        </span>
                        <div style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">${league.name || ''}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (e) {
        console.error('Preview error:', e);
        document.getElementById('previewList').innerHTML = '<div style="text-align:center; padding:30px; color:#dc2626;">Error loading matches</div>';
    }
};

window.collectAndSubmitFavorite = function(teamId, teamName, teamLogo, isNational = false) {
    // Collect filters
    const all = document.querySelector('input[value="All"]').checked;
    let filters = [];
    
    if (all) {
        filters = ['All'];
    } else {
        const checked = document.querySelectorAll('.sub-filter:checked');
        checked.forEach(c => filters.push(c.value));
    }
    
    // Require at least one selection
    if (filters.length === 0) {
        showModalError('Please select at least one match type');
        return;
    }
    
    document.getElementById('subPrefModal').remove();
    submitFavoriteAdd(teamId, teamName, teamLogo, filters, isNational);
}

async function submitFavoriteAdd(teamId, teamName, teamLogo, filters, isNational = false) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(FAV_API, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                team_id: teamId, 
                team_name: teamName, 
                team_logo: teamLogo,
                filters: filters,
                is_national: isNational
            })
        });
        
        if (res.ok) {
            userFavorites.set(teamId, { filters: filters, isNational: isNational });
            updateStarButton(teamId, true); // Update the star in the table
            loadFavorites();
            checkSubscriptionPrompt(); // Still show prompt to upsell the Sync feature itself
        } else {
            const d = await res.json();
            showErrorModal('Error', d.error || 'Failed to add favorite');
        }
    } catch (e) { showErrorModal('Error', 'Network error'); }
}

async function submitFavoriteRemove(teamId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${FAV_API}/${teamId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            userFavorites.delete(teamId);
            updateStarButton(teamId, false); // Update the star in the table
            loadFavorites(); 
        } else {
             showErrorModal('Error', 'Failed to remove favorite');
        }
    } catch (e) { showErrorModal('Error', 'Network error'); }
}

// Helper to update star button state in the teams table
function updateStarButton(teamId, isFavorited) {
    const buttons = document.querySelectorAll('.fav-star-btn');
    buttons.forEach(btn => {
        try {
            const teamData = JSON.parse(btn.dataset.team);
            if (teamData.id === teamId) {
                btn.innerHTML = isFavorited ? '★' : '☆';
                if (isFavorited) {
                    const isRelevant = isSubscriptionRelevant(teamId);
                    btn.className = isRelevant ? 'fav-star-btn favorited' : 'fav-star-btn subscribed-other';
                } else {
                    btn.className = 'fav-star-btn';
                }
                btn.title = isFavorited ? 'Edit subscription' : 'Subscribe';
            }
        } catch (e) {}
    });
}


function updateAuthUI(user) {
    const c = document.getElementById('authControls');

    if (user) {
        // Main Auth Controls - Only Logout button
        if(c) {
            c.innerHTML = `
                <div style="display:flex; flex-direction: column; align-items: center; gap:5px;">
                    <button class="auth-btn" onclick="logout()" style="background:rgba(239, 68, 68, 0.4)">Logout</button>
                </div>`;
        }
    } else {
        // Logged Out State
        if(c) {
            c.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="auth-btn" onclick="openAuthModal('login')" title="Login to see your favorite teams">Login</button>
                </div>`;
        }
    }
    
    // Update subscriptions tab state
    updateSubscriptionsTabState();
}

// Help Modal Functions
window.openHelpModal = () => document.getElementById('helpModal').classList.add('active');
window.closeHelpModal = () => document.getElementById('helpModal').classList.remove('active');

// Diagnostic Panel (Ctrl+Shift+D to open)
window.openDiagnostics = async function() {
    const modal = document.createElement('div');
    modal.id = 'diagModal';
    modal.className = 'modal active';
    modal.style.zIndex = '3000';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px;">
            <span class="modal-close" onclick="document.getElementById('diagModal').remove()">&times;</span>
            <h2 style="margin:0 0 15px 0;">🔧 Diagnostics</h2>
            <div id="diagResults" style="font-family:monospace; font-size:0.85rem; max-height:400px; overflow-y:auto; background:#1e293b; color:#e2e8f0; padding:15px; border-radius:8px;">
                Running checks...
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const results = document.getElementById('diagResults');
    let output = '';
    
    const log = (msg, type='info') => {
        const color = type === 'ok' ? '#4ade80' : type === 'warn' ? '#fbbf24' : type === 'err' ? '#f87171' : '#94a3b8';
        output += `<div style="color:${color}; margin:4px 0;">${msg}</div>`;
        results.innerHTML = output;
    };
    
    log('🔍 Match Calendar Diagnostics', 'info');
    log('─'.repeat(40));
    
    // 1. Check servers
    try {
        await fetch('/api/fixtures/countries');
        log('✓ Frontend API reachable', 'ok');
    } catch(e) { log('✗ Frontend API error', 'err'); }
    
    try {
        const res = await fetch('/api/health');
        if (res.ok) {
            const data = await res.json();
            log(`✓ Backend API: ${data.message || 'OK'}`, 'ok');
        } else {
            log('⚠ Backend API responded with error', 'warn');
        }
    } catch(e) { log('✗ Backend API error: ' + e.message, 'err'); }
    
    // 2. Check storage
    const token = localStorage.getItem('token');
    log(token ? '✓ Auth token present' : '○ No auth token (guest mode)', token ? 'ok' : 'info');
    log(`○ Favorites in memory: ${userFavorites.size}`, 'info');
    
    // 3. Current state
    log('─'.repeat(40));
    log('📊 Current State:');
    log(`  Mode: ${currentState.mode || 'none'}`);
    log(`  Country: ${currentState.country || 'none'}`);
    log(`  League: ${currentState.leagueName || 'none'} (ID: ${currentState.league || 'none'})`);
    log(`  Team: ${currentState.team || 'none'}`);
    
    // 4. Quick API check
    log('─'.repeat(40));
    log('🌐 API Checks:');
    try {
        const res = await fetch('/api/fixtures/team/33?next=3');
        const data = await res.json();
        const count = (Array.isArray(data) ? data : data.response || []).length;
        log(`✓ Man City fixtures: ${count}`, count > 0 ? 'ok' : 'warn');
    } catch(e) { log('✗ Fixtures API error', 'err'); }
    
    log('─'.repeat(40));
    log('✅ Diagnostics complete');
};

// Keyboard shortcut: Cmd+Shift+D (Mac) or Ctrl+Shift+D (Windows/Linux)
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        openDiagnostics();
    }
});

// Also expose globally so can be called from console
console.log('💡 Tip: Type openDiagnostics() in console or press Cmd+Shift+D');

window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    userFavorites.clear();
    window.location.reload();
};

window.handleLogin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = JSON.stringify(Object.fromEntries(fd));
    try {
        const res = await fetch(`${AUTH_API}/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error || 'Login failed');
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        closeAuthModal();
        checkAuth();
    } catch(err) { showErrorModal('Login Failed', getFriendlyErrorMessage(err.message)); }
};

window.handleRegister = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = JSON.stringify(Object.fromEntries(fd));
    try {
        const res = await fetch(`${AUTH_API}/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error || 'Registration failed');
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        closeAuthModal();
        checkAuth();
    } catch(err) { showErrorModal('Registration Failed', getFriendlyErrorMessage(err.message)); }
};

window.openAuthModal = (mode) => {
    document.getElementById('authModal').classList.add('active');
    toggleAuthMode(mode);
};
window.closeAuthModal = () => document.getElementById('authModal').classList.remove('active');
window.toggleAuthMode = (mode) => {
    const l = document.getElementById('loginFormContainer');
    const r = document.getElementById('registerFormContainer');
    const f = document.getElementById('favoritesContainer');
    if(l) l.style.display = 'none';
    if(r) r.style.display = 'none';
    if(f) f.style.display = 'none';
    
    if(mode === 'login' && l) l.style.display = 'block';
    if(mode === 'register' && r) r.style.display = 'block';
    if(mode === 'favorites' && f) f.style.display = 'block';
};

// --- PWA Install Logic ---
let deferredPrompt;
const installBtn = document.getElementById('pwaInstallBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67+ automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can add to home screen
    if (installBtn) {
        installBtn.style.display = 'block';
        
        installBtn.addEventListener('click', () => {
            // Hide our user interface that shows our A2HS button
            installBtn.style.display = 'none';
            // Show the prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2HS prompt');
                } else {
                    console.log('User dismissed the A2HS prompt');
                }
                deferredPrompt = null;
            });
        });
    }
});

// --- Modal Helpers ---

function showConfirmModal(title, msg, onConfirm) {
    const html = `
        <div id="confirmModal" class="modal active" style="z-index: 3000;">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <h3 style="margin-bottom: 15px; color: #1e293b;">${title}</h3>
                <p style="margin-bottom: 25px; color: #334155; font-size: 1.05rem;">${msg}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="control-btn" onclick="document.getElementById('confirmModal').remove()" style="flex:1">Cancel</button>
                    <button class="btn-primary-lg" style="background: #ef4444; flex:1" id="confirmBtnAction">Confirm</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('confirmBtnAction').onclick = () => {
        document.getElementById('confirmModal').remove();
        onConfirm();
    };
}

function showErrorModal(title, msg) {
    const html = `
        <div id="errorModal" class="modal active" style="z-index: 4000;">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <h3 style="margin-bottom: 10px; color: #dc2626; font-size: 1.5rem;">${title || 'Error'}</h3>
                <p style="margin-bottom: 20px; color: #1e293b; font-size: 1.1rem; line-height: 1.5;">${msg}</p>
                <button class="btn-primary-lg" onclick="document.getElementById('errorModal').remove()" style="width: 100%;">OK</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function getFriendlyErrorMessage(msg) {
    const m = msg.toLowerCase();
    if (m.includes('internal server error')) {
        return "Our servers are experiencing a temporary issue. Please try again in a few minutes.";
    }
    if (m.includes('network error') || m.includes('failed to fetch')) {
        return "Unable to connect to the server. Please check your internet connection and try again.";
    }
    return msg;
}

window.openForgotModal = function() {
    closeAuthModal();
    const html = `
        <div id="forgotModal" class="modal active" style="z-index: 3000;">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <span class="modal-close" onclick="document.getElementById('forgotModal').remove()">&times;</span>
                <h2 style="margin-bottom:15px; color: #1e293b;">Reset Password</h2>
                <p style="margin-bottom:20px; color:#334155; font-size:1rem;">
                    Enter your username and email to verify your account.
                </p>
                <form onsubmit="handleForgotSubmit(event)">
                    <input type="text" id="forgotUsername" class="form-input" placeholder="Username" required style="margin-bottom:10px; width:100%; box-sizing:border-box;">
                    <input type="email" id="forgotEmail" class="form-input" placeholder="Email Address" required style="margin-bottom:15px; width:100%; box-sizing:border-box;">
                    <button type="submit" class="btn-primary-lg" style="width:100%">Verify & Send Link</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.handleForgotSubmit = async function(e) {
    e.preventDefault();
    const username = document.getElementById('forgotUsername').value;
    const email = document.getElementById('forgotEmail').value;
    
    if(!username || !email) return;

    // Show loading state
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    try {
        const res = await fetch(`${AUTH_API}/reset-request`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, email })
        });
        
        const data = await res.json();
        
        document.getElementById('forgotModal').remove();
        
        if (res.ok) {
            showErrorModal('Check your Email', `✅ ${data.message}`);
        } else {
             showErrorModal('Verification Failed', data.error || 'Details do not match our records.');
        }
    } catch (err) {
        document.getElementById('forgotModal').remove();
        showErrorModal('Error', getFriendlyErrorMessage(err.message));
    }
};

// --- Manage Calendar Features ---

window.openManageCalendar = async function() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) { openAuthModal('login'); return; }
    
    const user = JSON.parse(userStr);
    const syncUrl = `${window.location.origin}/sync/MatchDayByTM/${user.username}.ics`;

    const popupHtml = `
        <div id="manageModal" class="modal active" style="z-index: 2000;">
            <div class="modal-content" style="max-width: 480px;">
                <span class="modal-close" onclick="document.getElementById('manageModal').remove()">&times;</span>
                
                <div style="text-align:center; margin-bottom:20px;">
                    <h2 style="margin:0 0 5px 0; color:#1e293b;">My Calendar</h2>
                    <p style="color:#64748b; font-size:0.9rem; margin:0;">Your subscribed teams' matches sync here automatically</p>
                </div>
                
                <!-- Sync Options -->
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <div style="flex:1; background:#f0fdf4; padding:15px; border-radius:10px; border:1px solid #bbf7d0; text-align:center;">
                        <div style="font-size:1.5rem; margin-bottom:5px;">📡</div>
                        <strong style="color:#166534; font-size:0.9rem;">Auto-Sync</strong>
                        <p style="font-size:0.75rem; color:#15803d; margin:5px 0 10px 0;">Subscribe in your calendar app</p>
                        <button onclick="navigator.clipboard.writeText('${syncUrl}').then(()=>{this.textContent='Copied!'; setTimeout(()=>this.textContent='Copy Link',2000)})" 
                                style="background:#16a34a; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-size:0.85rem; width:100%;">
                            Copy Link
                        </button>
                    </div>
                    <div style="flex:1; background:#f8fafc; padding:15px; border-radius:10px; border:1px solid #e2e8f0; text-align:center;">
                        <div style="font-size:1.5rem; margin-bottom:5px;">📥</div>
                        <strong style="color:#475569; font-size:0.9rem;">Download</strong>
                        <p style="font-size:0.75rem; color:#64748b; margin:5px 0 10px 0;">One-time import (.ics file)</p>
                        <button id="btnManualDownload" 
                                style="background:#e2e8f0; color:#475569; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-size:0.85rem; width:100%;" disabled>
                            Loading...
                        </button>
                    </div>
                </div>

                <!-- Events List -->
                <div style="border-top:1px solid #e2e8f0; padding-top:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h3 style="margin:0; font-size:0.95rem; color:#64748b;">Upcoming Synced Matches</h3>
                        <button id="btnSyncNow" onclick="syncAllSubscriptions()" 
                                style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:5px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;">
                            🔄 Sync Now
                        </button>
                    </div>
                    <div id="manageList" style="max-height:250px; overflow-y:auto;">
                        <div style="text-align:center; padding:20px; color:#94a3b8;">Loading...</div>
                    </div>
                </div>
                
                <!-- Clear Button -->
                <div style="margin-top:15px; padding-top:15px; border-top:1px solid #e2e8f0; text-align:center;">
                    <button onclick="clearCalendar()" style="background:none; border:1px solid #fecaca; color:#dc2626; padding:8px 20px; border-radius:6px; cursor:pointer; font-size:0.85rem;">
                        🗑️ Clear All Matches
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);
    
    // Fetch Data
    try {
        const res = await fetch('/calendar/events', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.events) {
            renderManageList(data.events);
            
            // Enable download button
            const dlBtn = document.getElementById('btnManualDownload');
            if (dlBtn && data.events.length > 0) {
                dlBtn.textContent = 'Download .ics';
                dlBtn.disabled = false;
                dlBtn.style.background = '#2563eb';
                dlBtn.style.color = 'white';
                dlBtn.onclick = () => window.downloadUserCalendarICS(data.events);
            } else if (dlBtn) {
                dlBtn.textContent = 'No events to download';
            }
        }
    } catch (e) {
        document.getElementById('manageList').innerHTML = '<p class="error">Failed to load events.</p>';
    }
};

window.downloadUserCalendarICS = function(events) {
    if (!events || events.length === 0) return;

    let content = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MatchDayByTM//My Calendar//EN\ncalscale:GREGORIAN\nMETHOD:PUBLISH\n`;
    
    events.forEach(e => {
        try {
            // e.date is ISO string: 2026-02-12T20:00:00+00:00
            const startDate = new Date(e.date);
            const endDate = new Date(startDate.getTime() + 7200000); // +2 hours

            const nowStr = new Date().toISOString().replace(/-|:|\.\d{3}/g, '');
            const startStr = startDate.toISOString().replace(/-|:|\.\d{3}/g, '');
            const endStr = endDate.toISOString().replace(/-|:|\.\d{3}/g, '');

            // Use internal DB ID + standard host for UID to avoid collisions but keep it consistent
            const uid = `saved_event_${e.id}@matchdaybytm.com`;

            content += `BEGIN:VEVENT\nuid:${uid}\ndtstamp:${nowStr}\ndtstart:${startStr}\ndtend:${endStr}\nsummary:⚽ ${e.teams.home.name} vs ${e.teams.away.name}\ndescription:${e.league}\nEND:VEVENT\n`;
        } catch(err) {
            console.error('Error parsing event for ICS', err, e);
        }
    });

    content += 'END:VCALENDAR';
    downloadBlob(content, 'my_matchday_calendar.ics');
};

function renderManageList(events) {
    const container = document.getElementById('manageList');
    if (!container) return;
    
    if (events.length === 0) {
        container.innerHTML = '<div style="padding:20px; color:#94a3b8;">No saved matches found.</div>';
        return;
    }
    
    // Group by Date for better readability, or just list
    container.innerHTML = events.map(e => {
        // Date formatting safety
        let dateStr = "Date Unknown";
        try {
            const d = new Date(e.date);
            dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        } catch(err) {}

        return `
        <div class="manage-item" id="cal-event-${e.id}">
            <div class="manage-info">
                <div class="manage-date">${dateStr}</div>
                <div class="manage-match">${e.teams.home.name} vs ${e.teams.away.name}</div>
                <div style="font-size:0.8rem; color:#64748b;">${e.league}</div>
            </div>
            <button class="btn-delete" onclick="deleteCalendarEvent(${e.id}, '${e.teams.home.name} vs ${e.teams.away.name}')">Remove</button>
        </div>
    `}).join('');
}

window.deleteCalendarEvent = async function(dbId, matchTitle) {
    showConfirmModal(
        'Remove Match', 
        `Are you sure you want to remove <strong>${matchTitle}</strong> from your calendar?`, 
        async () => {
            const token = localStorage.getItem('token');
            try {
                await fetch(`/calendar/events/${dbId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const el = document.getElementById(`cal-event-${dbId}`);
                if(el) el.remove();
                
                if (document.querySelectorAll('.manage-item').length === 0) {
                     document.getElementById('manageList').innerHTML = '<div style="padding:20px; color:#94a3b8;">No saved matches found.</div>';
                }
            } catch(e) { alert('Error deleting event'); }
        }
    );
};

window.clearCalendar = async function() {
    showConfirmModal(
        'Clear Calendar',
        '⚠️ Are you sure? This will remove <strong>ALL</strong> games from your synced calendar.',
        async () => {
            const token = localStorage.getItem('token');
            try {
                await fetch(`/calendar/clear`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                document.getElementById('manageModal').remove();
                // alert('Calendar cleared successfully.'); // Optional, or generic status
                showStatus('Calendar cleared successfully', 'success');
            } catch(e) { alert('Error clearing calendar'); }
        }
    );
};

// Sync all subscriptions - fetch fresh fixtures from API
window.syncAllSubscriptions = async function() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const btn = document.getElementById('btnSyncNow');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Syncing...';
    btn.disabled = true;
    
    try {
        const res = await fetch('/api/favorites/sync', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (res.ok) {
            btn.textContent = `✅ +${data.total_added || 0}`;
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
            
            // Refresh the events list
            const eventsRes = await fetch('/calendar/events', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const eventsData = await eventsRes.json();
            if (eventsData.events) {
                renderManageList(eventsData.events);
                
                // Update download button
                const dlBtn = document.getElementById('btnManualDownload');
                if (dlBtn && eventsData.events.length > 0) {
                    dlBtn.textContent = 'Download .ics';
                    dlBtn.disabled = false;
                    dlBtn.style.background = '#2563eb';
                    dlBtn.style.color = 'white';
                    dlBtn.onclick = () => window.downloadUserCalendarICS(eventsData.events);
                }
            }
        } else {
            btn.textContent = '❌ Error';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        }
    } catch (e) {
        console.error('Sync error:', e);
        btn.textContent = '❌ Error';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
    }
};

// --- Subscription Promo Logic ---

window.checkSubscriptionPrompt = function() {
    // Don't show if user already clicked "Maybe Later" or synced previously
    if (localStorage.getItem('subscriptionPromoted') === 'true') return;
    
    // Don't show if user has no favorites (sanity check)
    if (userFavorites.size === 0) return;

    const html = `
        <div id="subPromoModal" class="modal active" style="z-index: 2100;">
            <div class="modal-content sub-promo-modal">
                 <div class="sub-promo-header">
                    <h2>🎉 Team Added to Favorites!</h2>
                 </div>
                 <div class="sub-promo-content">
                    <p>
                        Do you want your favorite teams matches to appear <br>
                        <strong>automatically</strong> in your phone's calendar?
                    </p>
                    
                    <div class="sub-features">
                        <div class="sub-feature">
                            <i>🔄</i>
                            <span>Auto Sync</span>
                        </div>
                        <div class="sub-feature">
                            <i>📱</i>
                            <span>Live Updates</span>
                        </div>
                        <div class="sub-feature">
                            <i>⚡</i>
                            <span>No Spam</span>
                        </div>
                    </div>

                    <div class="sub-actions">
                        <button class="btn-sub-primary" onclick="window.acceptSubscription()">
                            Yes, Sync Calendar
                        </button>
                        <button class="btn-sub-secondary" onclick="window.dismissSubscription()">
                            Maybe Later
                        </button>
                    </div>
                 </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.dismissSubscription = function() {
    const el = document.getElementById('subPromoModal');
    if (el) el.remove();
    localStorage.setItem('subscriptionPromoted', 'true');
};

window.acceptSubscription = function() {
    window.dismissSubscription();
    window.getSyncLink(); // Trigger the sync flow
};

// =============================================
// COMPETITION STRUCTURE INFO
// =============================================
window.showCompetitionInfo = async function(leagueId, leagueName) {
    // Remove any existing modal first
    document.getElementById('competitionInfoModal')?.remove();
    
    const modal = document.createElement('div');
    modal.id = 'competitionInfoModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);animation:fadeIn 0.2s ease;';
    modal.innerHTML = `
        <div class="comp-info-modal" style="background:white;border-radius:20px;max-width:420px;width:90%;max-height:75vh;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.2);animation:slideUp 0.3s ease;position:relative;">
            <div id="compInfoContent" style="padding:28px;">
                <div style="text-align:center;">
                    <div class="loader-ring"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close on click outside
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    // Close on ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Add animation styles
    if (!document.getElementById('compInfoStyles')) {
        const style = document.createElement('style');
        style.id = 'compInfoStyles';
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .loader-ring { width: 40px; height: 40px; border: 3px solid #f1f5f9; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto; }
            @keyframes spin { to { transform: rotate(360deg); } }
            .stage-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #f8fafc; border-radius: 12px; margin: 8px 0; transition: all 0.2s; }
            .stage-item:hover { background: #f1f5f9; transform: translateX(-4px); }
            .stage-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
            .stage-info { flex: 1; }
            .stage-name { font-weight: 600; color: #1e293b; font-size: 0.95rem; }
            .stage-desc { color: #64748b; font-size: 0.8rem; margin-top: 2px; }
            .stage-meta { display: flex; gap: 12px; margin-top: 4px; }
            .stage-meta span { font-size: 0.75rem; color: #94a3b8; }
            .promo-badge { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 20px; font-size: 0.8rem; margin: 4px; }
        `;
        document.head.appendChild(style);
    }

    try {
        const season = new Date().getFullYear();
        const res = await fetch(`/api/fixtures/competition-structure/${leagueId}?season=${season}`);
        const data = await res.json();
        
        const content = document.getElementById('compInfoContent');
        
        // Check if we have real data (not generic/unknown)
        const hasRealData = data && !data.error && data.stages && data.stages.length > 0 && 
                           !data.name.match(/^League \d+$/) && data.country !== 'Unknown';
        
        if (!hasRealData) {
            content.innerHTML = `
                <button class="modal-close-btn" onclick="document.getElementById('competitionInfoModal').remove()" 
                        style="position:absolute;top:12px;right:12px;background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:1.2rem;cursor:pointer;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all 0.2s;">×</button>
                
                <div style="text-align:center;padding:30px;">
                    <div style="font-size:2.5rem;margin-bottom:12px;">📋</div>
                    <p style="color:#64748b;font-weight:500;margin-bottom:4px;">${leagueName}</p>
                    <p style="color:#94a3b8;font-size:0.85rem;">No detailed info available yet</p>
                </div>`;
            return;
        }

        // Build stages HTML - clean and minimal
        let stagesHtml = '';
        const stageColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
        
        if (data.stages && data.stages.length > 0) {
            stagesHtml = data.stages.map((stage, i) => `
                <div class="stage-item">
                    <div class="stage-dot" style="background:${stageColors[i % stageColors.length]};"></div>
                    <div class="stage-info">
                        <div class="stage-name">${stage.name}</div>
                        ${stage.description ? `<div class="stage-desc">${stage.description}</div>` : ''}
                        <div class="stage-meta">
                            ${stage.teams ? `<span>👥 ${stage.teams}</span>` : ''}
                            ${stage.groups ? `<span>📊 ${stage.groups} groups</span>` : ''}
                            ${stage.rounds ? `<span>🔄 ${stage.rounds} rounds</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Status badge
        let statusBadge = '';
        if (data.currentStatus) {
            const cs = data.currentStatus;
            if (cs.isFinished) {
                statusBadge = `<div style="text-align:center;margin-top:16px;">
                    <span class="promo-badge" style="background:#dcfce7;color:#166534;">✓ Finished ${cs.winner ? `• ${cs.winner} 🏆` : ''}</span>
                </div>`;
            } else if (cs.isInProgress && cs.currentRound) {
                statusBadge = `<div style="text-align:center;margin-top:16px;">
                    <span class="promo-badge" style="background:#fef3c7;color:#92400e;">⚽ ${cs.currentRound}</span>
                </div>`;
            }
        }

        // Promo/Relegation - subtle
        let promoHtml = '';
        if (data.promotion || data.relegation) {
            promoHtml = `<div style="display:flex;flex-wrap:wrap;justify-content:center;margin-top:16px;gap:4px;">`;
            if (data.promotion) promoHtml += `<span class="promo-badge" style="background:#ecfdf5;color:#059669;">⬆️ ${data.promotion}</span>`;
            if (data.relegation) promoHtml += `<span class="promo-badge" style="background:#fef2f2;color:#dc2626;">⬇️ ${data.relegation}</span>`;
            promoHtml += `</div>`;
        }

        // View Live Data button based on format AND current stage
        let viewDataBtn = '';
        const currentStatus = data.currentStatus || {};
        
        if (data.format === 'groups_knockout' || data.format === 'swiss_knockout') {
            viewDataBtn = `<button onclick="showTournamentGroups(${leagueId}, '${(data.name || leagueName).replace(/'/g, "\\'")}', '${data.format}')" class="view-data-btn">📊 View Standings</button>`;
        } else if (data.format === 'league_with_playoffs') {
            // Only show playoff button if actually in playoff stage
            if (currentStatus.currentRound && (currentStatus.currentRound.toLowerCase().includes('championship') || currentStatus.currentRound.toLowerCase().includes('relegation'))) {
                viewDataBtn = `<button onclick="showPlayoffTables(${leagueId}, '${(data.name || leagueName).replace(/'/g, "\\'")}')" class="view-data-btn">📊 View Playoff Tables</button>`;
            } else {
                // Still in regular season - show regular standings
                viewDataBtn = `<button onclick="showPlayoffTables(${leagueId}, '${(data.name || leagueName).replace(/'/g, "\\'")}')" class="view-data-btn">📊 View Standings</button>`;
            }
        } else if (data.format === 'knockout') {
            viewDataBtn = `<button onclick="showKnockoutBracket(${leagueId}, '${(data.name || leagueName).replace(/'/g, "\\'")}')" class="view-data-btn">🏆 View Bracket</button>`;
        }

        content.innerHTML = `
            <button class="modal-close-btn" onclick="document.getElementById('competitionInfoModal').remove()" 
                    style="position:absolute;top:12px;right:12px;background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:1.2rem;cursor:pointer;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all 0.2s;">×</button>
            
            <div style="text-align:center;margin-bottom:20px;">
                <div style="font-size:2.5rem;margin-bottom:4px;">${getFormatEmoji(data.format)}</div>
                <div style="font-size:1.2rem;font-weight:700;color:#1e293b;">${data.name || leagueName}</div>
                <div style="color:#94a3b8;font-size:0.85rem;">${data.country || ''}</div>
            </div>
            
            <div style="max-height:240px;overflow-y:auto;padding-right:4px;">
                ${stagesHtml}
            </div>
            
            ${statusBadge}
            ${promoHtml}
            ${viewDataBtn ? `<div style="text-align:center;margin-top:20px;">${viewDataBtn}</div>` : ''}
        `;
        
        // Add hover effect to close button
        const closeBtn = content.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.onmouseenter = () => { closeBtn.style.background = '#e2e8f0'; closeBtn.style.color = '#1e293b'; };
            closeBtn.onmouseleave = () => { closeBtn.style.background = '#f1f5f9'; closeBtn.style.color = '#64748b'; };
        }
    } catch (err) {
        console.error('Error loading competition info:', err);
        document.getElementById('compInfoContent').innerHTML = `
            <div style="text-align:center;padding:20px;">
                <div style="font-size:2rem;margin-bottom:8px;">😕</div>
                <p style="color:#94a3b8;">Could not load data</p>
            </div>`;
    }
};

function getFormatEmoji(format) {
    const emojis = {
        'league': '🏆',
        'league_with_playoffs': '🎯',
        'groups_knockout': '⚽',
        'swiss_knockout': '🔄',
        'knockout': '🥊'
    };
    return emojis[format] || '🏆';
}

// =============================================
// TOURNAMENT GROUPS VIEW (World Cup, UCL, etc.)
// =============================================
window.showTournamentGroups = async function(leagueId, leagueName, format) {
    document.getElementById('competitionInfoModal')?.remove();
    
    const modal = document.createElement('div');
    modal.id = 'tournamentModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';
    modal.innerHTML = `
        <div class="tournament-modal" style="background:white;border-radius:20px;width:95%;max-width:900px;max-height:85vh;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <div class="modal-header" style="padding:20px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h2 style="margin:0;font-size:1.3rem;color:#1e293b;">⚽ ${leagueName}</h2>
                    <p style="margin:4px 0 0;font-size:0.85rem;color:#64748b;">${format === 'swiss_knockout' ? 'League Phase Standings' : 'Group Standings'}</p>
                </div>
                <button onclick="document.getElementById('tournamentModal').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#94a3b8;">×</button>
            </div>
            <div id="tournamentContent" style="padding:20px;overflow-y:auto;max-height:calc(85vh - 80px);">
                <div style="text-align:center;padding:40px;"><div class="loader-ring"></div></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    try {
        const res = await fetch(`/api/fixtures/tournament/${leagueId}`);
        const data = await res.json();
        
        const content = document.getElementById('tournamentContent');
        
        if (!data.groups || data.groups.length === 0) {
            content.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">No standings data available yet</div>`;
            return;
        }

        // Build groups grid
        let groupsHtml = '<div class="groups-grid">';
        
        data.groups.forEach(group => {
            groupsHtml += `
                <div class="group-card">
                    <div class="group-header">${group.name}</div>
                    <div class="table-container" style="margin:0;">
                        <table class="group-table">
                            <thead>
                                <tr>
                                    <th style="width:30px;">#</th>
                                    <th>Team</th>
                                    <th>P</th>
                                    <th>W</th>
                                    <th>D</th>
                                    <th>L</th>
                                    <th>GD</th>
                                    <th>Pts</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${group.teams.map((team, idx) => `
                                    <tr class="${idx < 2 ? 'qualify' : idx >= group.teams.length - 1 ? 'eliminate' : ''}">
                                        <td>${idx + 1}</td>
                                        <td class="team-cell">
                                            <img src="${team.logo}" alt="" onerror="this.style.display='none'">
                                            <span>${team.name}</span>
                                        </td>
                                        <td>${team.played || 0}</td>
                                        <td>${team.win || 0}</td>
                                        <td>${team.draw || 0}</td>
                                        <td>${team.lose || 0}</td>
                                        <td>${team.goalsDiff || 0}</td>
                                        <td class="pts">${team.points || 0}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
        
        groupsHtml += '</div>';
        
        // Add legend
        groupsHtml += `
            <div class="groups-legend">
                <span class="legend-item"><span class="dot qualify"></span> Qualify to next round</span>
                <span class="legend-item"><span class="dot eliminate"></span> Eliminated</span>
            </div>
        `;
        
        content.innerHTML = groupsHtml;
    } catch (err) {
        console.error('Error loading tournament:', err);
        document.getElementById('tournamentContent').innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">Error loading data</div>`;
    }
};

// =============================================
// KNOCKOUT BRACKET VIEW
// =============================================
window.showKnockoutBracket = async function(leagueId, leagueName) {
    document.getElementById('competitionInfoModal')?.remove();
    
    const modal = document.createElement('div');
    modal.id = 'bracketModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';
    modal.innerHTML = `
        <div class="bracket-modal" style="background:white;border-radius:20px;width:95%;max-width:1000px;max-height:85vh;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <div class="modal-header" style="padding:20px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h2 style="margin:0;font-size:1.3rem;color:#1e293b;">🏆 ${leagueName}</h2>
                    <p style="margin:4px 0 0;font-size:0.85rem;color:#64748b;">Knockout Bracket</p>
                </div>
                <button onclick="document.getElementById('bracketModal').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#94a3b8;">×</button>
            </div>
            <div id="bracketContent" style="padding:20px;overflow:auto;max-height:calc(85vh - 80px);">
                <div style="text-align:center;padding:40px;"><div class="loader-ring"></div></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    try {
        const res = await fetch(`/api/fixtures/tournament-bracket/${leagueId}`);
        const data = await res.json();
        
        const content = document.getElementById('bracketContent');
        
        if (!data.bracket || Object.keys(data.bracket).length === 0) {
            content.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">No bracket data available yet</div>`;
            return;
        }

        // Build bracket display
        const rounds = Object.keys(data.bracket);
        let bracketHtml = '<div class="bracket-container">';
        
        rounds.forEach(round => {
            const matches = data.bracket[round];
            bracketHtml += `
                <div class="bracket-round">
                    <div class="round-header">${round}</div>
                    <div class="round-matches">
                        ${matches.map(match => `
                            <div class="bracket-match ${match.status === 'FT' ? 'finished' : ''}">
                                <div class="match-team ${match.home.winner ? 'winner' : ''}">
                                    <img src="${match.home.logo}" alt="" onerror="this.style.display='none'">
                                    <span class="team-name">${match.home.name}</span>
                                    <span class="score">${match.home.score ?? '-'}</span>
                                </div>
                                <div class="match-team ${match.away.winner ? 'winner' : ''}">
                                    <img src="${match.away.logo}" alt="" onerror="this.style.display='none'">
                                    <span class="team-name">${match.away.name}</span>
                                    <span class="score">${match.away.score ?? '-'}</span>
                                </div>
                                <div class="match-date">${new Date(match.date).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        bracketHtml += '</div>';
        content.innerHTML = bracketHtml;
    } catch (err) {
        console.error('Error loading bracket:', err);
        document.getElementById('bracketContent').innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">Error loading data</div>`;
    }
};

// =============================================
// PLAYOFF TABLES VIEW (Israel, Scotland, Belgium)
// =============================================
window.showPlayoffTables = async function(leagueId, leagueName) {
    document.getElementById('competitionInfoModal')?.remove();
    
    const modal = document.createElement('div');
    modal.id = 'playoffModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';
    modal.innerHTML = `
        <div class="playoff-modal" style="background:white;border-radius:20px;width:95%;max-width:1000px;max-height:85vh;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <div class="modal-header" style="padding:20px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h2 style="margin:0;font-size:1.3rem;color:#1e293b;">🎯 ${leagueName}</h2>
                    <p style="margin:4px 0 0;font-size:0.85rem;color:#64748b;">Playoff Standings</p>
                </div>
                <button onclick="document.getElementById('playoffModal').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#94a3b8;">×</button>
            </div>
            <div id="playoffContent" style="padding:20px;overflow-y:auto;max-height:calc(85vh - 80px);">
                <div style="text-align:center;padding:40px;"><div class="loader-ring"></div></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    try {
        const res = await fetch(`/api/fixtures/tournament/${leagueId}`);
        const data = await res.json();
        
        const content = document.getElementById('playoffContent');
        
        if (!data.groups || data.groups.length === 0) {
            content.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">No playoff data available yet</div>`;
            return;
        }

        // Separate Championship and Relegation tables
        const championship = data.groups.find(g => g.name.toLowerCase().includes('championship'));
        const relegation = data.groups.find(g => g.name.toLowerCase().includes('relegation'));
        const regularSeason = data.groups.find(g => g.name.toLowerCase().includes('regular') || g.name.toLowerCase().includes('season'));

        let tablesHtml = '<div class="playoff-tables">';
        
        // Tab buttons if we have both playoff tables
        if (championship || relegation) {
            tablesHtml += `
                <div class="playoff-tabs">
                    ${championship ? `<button class="playoff-tab active" onclick="switchPlayoffTab('championship')">🏆 Championship</button>` : ''}
                    ${relegation ? `<button class="playoff-tab" onclick="switchPlayoffTab('relegation')">⚔️ Relegation</button>` : ''}
                    ${regularSeason ? `<button class="playoff-tab" onclick="switchPlayoffTab('regular')">📋 Regular Season</button>` : ''}
                </div>
            `;
        }

        // Championship table
        if (championship) {
            tablesHtml += `
                <div id="tab-championship" class="playoff-table-container">
                    <div class="table-title" style="color:#059669;">🏆 ${championship.name}</div>
                    ${buildPlayoffTable(championship.teams, 'championship')}
                </div>
            `;
        }

        // Relegation table
        if (relegation) {
            tablesHtml += `
                <div id="tab-relegation" class="playoff-table-container hidden">
                    <div class="table-title" style="color:#dc2626;">⚔️ ${relegation.name}</div>
                    ${buildPlayoffTable(relegation.teams, 'relegation')}
                </div>
            `;
        }

        // Regular Season table
        if (regularSeason) {
            tablesHtml += `
                <div id="tab-regular" class="playoff-table-container hidden">
                    <div class="table-title" style="color:#64748b;">📋 ${regularSeason.name}</div>
                    ${buildPlayoffTable(regularSeason.teams, 'regular')}
                </div>
            `;
        }

        // If no playoff tables found, show all groups
        if (!championship && !relegation) {
            data.groups.forEach(group => {
                tablesHtml += `
                    <div class="playoff-table-container">
                        <div class="table-title">${group.name}</div>
                        ${buildPlayoffTable(group.teams, 'regular')}
                    </div>
                `;
            });
        }

        tablesHtml += '</div>';
        content.innerHTML = tablesHtml;
    } catch (err) {
        console.error('Error loading playoff tables:', err);
        document.getElementById('playoffContent').innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">Error loading data</div>`;
    }
};

function buildPlayoffTable(teams, type) {
    return `
        <div class="table-container" style="margin:0;">
            <table class="playoff-standings-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Team</th>
                        <th>P</th>
                        <th>W</th>
                        <th>D</th>
                        <th>L</th>
                        <th>GF</th>
                        <th>GA</th>
                        <th>GD</th>
                        <th>Pts</th>
                    </tr>
                </thead>
                <tbody>
                    ${teams.map((team, idx) => {
                        let rowClass = '';
                        if (type === 'championship' && idx === 0) rowClass = 'champion';
                        else if (type === 'championship' && idx < 3) rowClass = 'europe';
                        else if (type === 'relegation' && idx >= teams.length - 2) rowClass = 'relegated';
                        
                        return `
                            <tr class="${rowClass}">
                                <td>${idx + 1}</td>
                                <td class="team-cell">
                                    <img src="${team.logo}" alt="" onerror="this.style.display='none'">
                                    <span>${team.name}</span>
                                </td>
                                <td>${team.played || 0}</td>
                                <td>${team.win || 0}</td>
                                <td>${team.draw || 0}</td>
                                <td>${team.lose || 0}</td>
                                <td>${team.goalsFor || 0}</td>
                                <td>${team.goalsAgainst || 0}</td>
                                <td>${team.goalsDiff || 0}</td>
                                <td class="pts">${team.points || 0}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.switchPlayoffTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('.playoff-table-container').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.playoff-tab').forEach(el => el.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(`tab-${tabName}`)?.classList.remove('hidden');
    event.target.classList.add('active');
};

