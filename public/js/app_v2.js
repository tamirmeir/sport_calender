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
let userFavorites = new Set();
let selectedFixtures = new Set(); // New state for checked items
let fixtureData = {}; // For calendar events

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


function showContinentSelection() {
    currentState.mode = 'continent'; // Set Mode
    updateNavigation(1, "Select Continent", null); // Root level
    updateTabState('continent');
    
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
        card.className = 'grid-card region-card';
        card.style.border = '2px solid #2563eb';
        card.style.background = '#eff6ff';
        // Go to Continent Hub (Step 2)
        card.onclick = () => selectCountry(c.name, c.flag, c.regionFilter);
        
        card.innerHTML = `
            <img src="${c.flag}" alt="${c.name}" style="width:40px; height:40px;">
            <span style="font-weight: 700; color:#1e40af;">${c.name}</span>
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
    updateNavigation(1, "Global Competitions", null);
    updateTabState('global');
    currentState.country = 'Global'; // Set context for "Step 2" consistency if needed
    
    if (countrySearchInput) countrySearchInput.style.display = 'none';

    countriesGrid.style.display = 'grid';
    countriesGrid.classList.add('cards-grid');
    countriesGrid.innerHTML = '';

    // Render Global Competitions directly
    const globals = [
        {id: 1, name: 'World Cup'}, 
        {id: 10, name: 'Friendlies'},
        {id: 15, name: 'FIFA Club World Cup', status: 'vacation'},
        {id: 8, name: "Women's World Cup", status: 'vacation'}
    ];

    globals.forEach(c => {
        const card = document.createElement('div');
        card.className = 'grid-card';
        
        const isVacation = c.status === 'vacation';
        if (isVacation) {
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
            // Mark as competition context and use World region for filtering
            card.onclick = () => {
                 currentState.regionFilter = 'World'; 
                 selectLeague(c.id, c.name, true);
            };
            card.innerHTML = `
                    <img src="${getLeagueLogo(c.id)}" alt="${c.name}" onerror="this.src='/favicon.svg'">
                    <span>${c.name}</span>
            `;
        }
        countriesGrid.appendChild(card);
    });
}

async function showCountrySelection() {
    currentState.mode = 'country'; // Set Mode
    updateNavigation(1, "Select Country", null); // Root level
    updateTabState('country');
    
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
        card.onclick = () => selectCountry(c.name, c.flag); // Normal country select (No region filter)
        card.innerHTML = `
            <img src="${c.flag || 'https://media.api-sports.io/flags/' + c.code.toLowerCase() + '.svg'}" 
                 alt="${c.name}" onerror="this.style.display='none'">
            <span style="font-size: 1.1rem; font-weight: 600;">${c.name}</span>
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
    
    // Clear fixtures (e.g. from previous Favorites selection)
    if (fixturesContainer) {
        fixturesContainer.innerHTML = '<div class="empty-state"><p>Select a league and team to view fixtures.</p></div>';
    }
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
                <div class="grid-card national-card" onclick="selectLeague('NATIONAL', 'National Team')" style="border-left: 4px solid #3b82f6;">
                    <img src="${currentState.flag || 'https://media.api-sports.io/flags/xw.svg'}" alt="National Team" 
                        style="width:40px; height:40px; border-radius:50%; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                    <div>
                        <span style="font-weight: 700; font-size:1.1rem; display:block; color:#1e3a8a;">${country} National Team</span>
                        <span style="font-size:0.85rem; color:#64748b;">Subscribe to Qualifiers, Friendlies & Cups</span>
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
            // Map to include status, Filter: Type 'League' only, remove Women/U21
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
                            status: item.verify_status || 'active',
                            ui_label: 'active'
                        };
                    }
                    return null;
                })
                .filter(l => l && l.name && !l.name.includes('Women') && !l.name.includes('U21') && !l.name.includes('Reserves'));

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
                     // Tier 1: Premier, Liga 1, Bundesliga (1), Serie A, Ligat Ha'Al etc.
                     if (n.includes('premier') || n === 'serie a' || (n.includes('bundesliga') && !n.includes('2.')) || n === 'ligue 1' || n.includes('primeira liga') || n.includes('eredivisie') || n === 'la liga' || n.includes('super lig') || n.includes('jupiter pro') || n.includes('ligat haal') || n.includes("ligat ha'al")) return 1;
                     // Tier 2: Championship, Serie B, Ligue 2, 2. Bundesliga, Liga Leumit
                     if (n.includes('championship') || n === 'serie b' || n.includes('segunda') || n.includes('ligue 2') || n.includes('2. bundesliga') || n.includes('eerste divisie') || n.includes('liga leumit')) return 2;
                     // Tier 3: League One, Serie C, 3. Liga
                     if (n.includes('league one') || n === 'serie c' || n.includes('3. liga')) return 3;
                     // Tier 4: League Two
                     if (n.includes('league two')) return 4;
                     
                     return 10; // Default / Unknown
                 };

                 const tierA = getTier(a.name);
                 const tierB = getTier(b.name);

                 if (tierA !== tierB) return tierA - tierB;

                 // 3. Fallback: ID (Reliable for most Top 5 leagues)
                 return a.id - b.id; 
            });
            
            // Take Top 12 - NO, now show all available valid ones to let user see status
            // leagues = leagues.slice(0, 12); 
            
            leagues.forEach(league => {
                const card = document.createElement('div');
                card.className = 'grid-card';
                // Use the new API fields: status, ui_label
                const isVacation = league.status === 'vacation';
                if (isVacation) {
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
                    card.onclick = () => selectLeague(league.id, league.name, true, league.type);
                    // Map status to English Label
                    const statusLabels = {
                        'active': 'Active',
                        'vacation': 'On Break',
                        'offline': 'Offline'
                    };
                    // Use translated label if available, otherwise backend label
                    const displayLabel = statusLabels[league.status] || league.ui_label;
                    // Render Label Badge
                    let badgeHTML = '';
                    if (league.ui_label) {
                        // badgeHTML = `<span class="status-badge active">${displayLabel}</span>`;
                    }
                    card.innerHTML = `
                        <div class="card-content">
                            <img src="${league.logo}" alt="${league.name}" onerror="this.src='https://media.api-sports.io/football/leagues/1.png'">
                            <div class="league-info">
                                <span class="league-name">${league.name}</span>
                                ${badgeHTML}
                            </div>
                        </div>
                    `;
                }
                domesticGrid.appendChild(card);
            });
        } else {
            domesticGrid.innerHTML = '<p class="empty-msg">No leagues found.</p>';
            domesticGrid.classList.remove('cards-grid');
        }

    } catch(e) { 
        leaguesGrid.innerHTML = '<p class="error">Error loading hub.</p>'; 
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
                {id: 533, name: 'CAF Super Cup', status: 'vacation'},
                {id: 1164, name: "CAF Women's Champions League", status: 'vacation'}
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
         renderStructuredContinent(definitions, region);
    } else {
        // Fallback to Search API "World" with filter
        fallbackContinentSearch(region);
    }
}

function renderStructuredContinent(defs, region) {
    leaguesGrid.innerHTML = '';
    leaguesGrid.classList.remove('cards-grid');

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
            const isVacation = c.status === 'vacation' || c.matchCount === 0 || (Array.isArray(c.matches) && c.matches.length === 0);
            if (isVacation) {
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
                card.onclick = () => selectLeague(c.id, c.name, true, 'Cup');
                card.innerHTML = `
                    <img src="${getLeagueLogo(c.id)}" alt="${c.name}" onerror="this.src='/favicon.svg'">
                    <span>${c.name}</span>
                `;
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
             
             const isVacation = c.status === 'vacation';
             if (isVacation) {
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
                     <img src="${getLeagueLogo(c.id)}" alt="${c.name}" onerror="this.src='/favicon.svg'">
                     <span>${c.name}</span>
                 `;
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
    
    stepLeague.classList.add('hidden');
    stepTeam.classList.remove('hidden');
    
    // Update Navigation for Step 3
    const stepTitle = leagueId === 'NATIONAL' 
        ? `Step 3: Select ${currentState.country} National Team` 
        : `Step 3: Select ${leagueName} Team`;
        
    updateNavigation(3, stepTitle, resetToLeagues);
    
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
            
            const isCalendarYearLeague = 
                (currentState.regionFilter === 'SouthAmerica' && !leagueName.includes('Qualifiers')) || 
                (currentState.regionFilter === 'Asia' && !leagueName.includes('Qualifiers')) || 
                currentState.regionFilter === 'NorthAmerica' ||
                (currentState.regionFilter === 'World' && !leagueName.includes('UEFA') && !leagueName.includes('Qualifiers')) ||
                (['Libertadores', 'Sudamericana', 'MLS', 'Brasileirão', 'CONMEBOL'].some(k => leagueName.includes(k)));

            // Super cups (Recopa, UEFA Super Cup) happen early in the year with previous season's winners
            const isSuperCup = leagueName.includes('Recopa') || leagueName.includes('Super Cup');

            activeSeason = year;
            if (!isCalendarYearLeague) {
                 activeSeason = month < 6 ? year - 1 : year; // Academic
            } else if (isSuperCup && month < 4) {
                 // Super cups in Jan-Apr use previous year's season data
                 activeSeason = year - 1;
            }

            console.log(`Fetching teams for league ${leagueId}, season ${activeSeason} (Context: ${isCalendarYearLeague ? 'Calendar' : 'Academic'}${isSuperCup ? ', SuperCup' : ''})`);
            
            // SMART FILTER: Universal "Active Teams" Strategy
            // We now use the robust backend funnel for ALL leagues (Competitions & Regular Leagues).
            // This ensures we find teams via Fixtures/Standings/History even if the main team list is out of sync.
            url = `${API_BASE}/active-teams?league=${leagueId}&season=${activeSeason}`;
            console.log("Universal Active-Teams Endpoint Selected");

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

            // Quick check: Does first team have any upcoming matches IN THIS LEAGUE?
            let vacationBanner = '';
            try {
                const firstTeamId = teamList[0].team.id;
                const checkRes = await fetch(`${API_BASE}/team/${firstTeamId}?next=10`);
                const checkData = await checkRes.json();
                const allFixtures = Array.isArray(checkData) ? checkData : (checkData.response || []);
                
                // Filter to only matches in the current league
                const leagueFixtures = allFixtures.filter(f => {
                    const fixLeagueId = f.league?.id;
                    return fixLeagueId === leagueId;
                });
                
                if (leagueFixtures.length === 0) {
                    vacationBanner = `
                        <div style="background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius:12px; padding:16px 20px; margin-bottom:16px; display:flex; align-items:center; gap:14px; box-shadow:0 2px 8px rgba(251,191,36,0.2);">
                            <div style="font-size:2rem;">🏖️</div>
                            <div>
                                <h3 style="margin:0 0 2px 0; color:#92400e; font-size:1rem;">League on Break</h3>
                                <p style="margin:0; color:#a16207; font-size:0.85rem;">No matches scheduled for <strong>${currentState.leagueName || 'this competition'}</strong> right now.</p>
                            </div>
                        </div>
                    `;
                }
            } catch(e) {
                console.log('Vacation check skipped:', e);
            }

            // Sort teams
            const teams = teamList.sort((a, b) => (a.team.name || "").localeCompare(b.team.name || ""));
            
            // Helper for ambiguous "W" suffix (e.g. "Chelsea W" vs just "W")
            const displayNameIsWomen = (str) => str.endsWith(' W') || str.endsWith(' Ladies');
            
            // Generate Table Header
            const isNationalContext = currentState.league === 'NATIONAL';
            const tableHeader = `
                <thead>
                    <tr>
                        <th style="width: 50px; text-align: center;">Subscribe</th>
                        <th style="width: 50px;">Logo</th>
                        <th>Team Name</th>
                        <th style="width: 60px; text-align: center;">Code</th>
                        ${isNationalContext ? '<th>Type</th>' : ''}
                        <th>Founded</th>
                        <th>Venue</th>
                        <th>City</th>
                        <th style="text-align: right;">Capacity</th>
                    </tr>
                </thead>
            `;

            const rows = teams.map(item => {
                const team = item.team || {};
                const venue = item.venue || {};
                
                if (!team.name) return ''; // Skip invalid entries

                // Detect Team Type
                let badgeHtml = '<span class="badge badge-senior" style="background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0;">Standard</span>'; 
                // Default tag
                
                const name = (team.name || '').toLowerCase();
                let isNational = team.national;

                if (name.includes('women') || displayNameIsWomen(team.name)) {
                    badgeHtml = '<span class="badge badge-women">Women</span>';
                } else if (name.match(/u\d/)) { // matches u19, u20, u21 etc
                    badgeHtml = '<span class="badge badge-youth">Youth</span>';
                } else if (isNational) {
                    badgeHtml = '<span class="badge badge-senior">Matches</span>'; // Changed text to be generally applicable
                }

                // Favorite star button - data attributes for the handler
                const teamData = JSON.stringify({id: team.id, name: team.name, logo: team.logo}).replace(/"/g, '&quot;');
                const isFavorited = userFavorites.has(team.id);
                const starClass = isFavorited ? 'fav-star-btn favorited' : 'fav-star-btn';
                const starSymbol = isFavorited ? '★' : '☆';

                return `
                    <tr style="cursor:pointer;" onclick="selectTeam(${team.id}, ${isNational})">
                        <td style="text-align: center;" onclick="event.stopPropagation();">
                            <button class="${starClass}" data-team='${teamData}' onclick="event.stopPropagation(); toggleFavoriteFromTable(this)" title="${isFavorited ? 'Edit subscription' : 'Subscribe'}">
                                ${starSymbol}
                            </button>
                        </td>
                        <td>
                            <img src="${team.logo}" alt="${team.name}" onerror="this.src='/favicon.svg'">
                        </td>
                        <td class="team-info" style="font-weight: 600;">${team.name}</td>
                        <td style="text-align: center; color: #64748b; font-family: monospace;">${team.code || '-'}</td>
                        ${isNationalContext ? `<td>${badgeHtml}</td>` : ''}
                        <td>${team.founded || '-'}</td>
                        <td>${venue.name || '-'}</td>
                        <td>${venue.city || '-'}</td>
                        <td style="text-align: right;">${venue.capacity ? venue.capacity.toLocaleString() : '-'}</td>
                    </tr>
                `;
            }).join('');

            teamsGrid.innerHTML = `
                ${vacationBanner}
                <table class="teams-table">
                    ${tableHeader}
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
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
    
    // Clear downstream data
    fixturesContainer.innerHTML = '<div class="empty-state"><p>Select a league and team to view fixtures.</p></div>';
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
    
    // Clear downstream data
    fixturesContainer.innerHTML = '<div class="empty-state"><p>Select a league and team to view fixtures.</p></div>';
    teamsGrid.innerHTML = '';
};


// --- Fixtures Search & Render ---

async function searchFixtures(useLeagueFilter = false) {
    const teamId = teamIdInput.value.trim();
    if (!teamId) return;

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
            renderFixtures(false); 
            fixturesContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            if (Array.isArray(fixtureList)) {
                 // ** STRICT EMPTY STATE: No History **
                 
                 const msg = 'No matches scheduled—enjoy the break!';
                 showStatus('No upcoming fixtures found.', 'warning');
                 fixturesContainer.innerHTML = `
                    <div class="empty-state vacation-card" style="padding: 40px; text-align: center; border-radius: 12px; border: 1px dashed #e2e8f0; margin-top: 20px; background: #f3f4f6; color: #bdbdbd;">
                        <div style="font-size: 3rem; margin-bottom: 10px;">🏖️</div>
                        <h3 style="color: #bdbdbd; margin-bottom: 10px;">No Upcoming Matches</h3>
                        <p style="color: #bdbdbd;">${msg}</p>
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
    
    // Filter Toggle Button Calculation
    const showFilterToggle = currentState.league && currentState.league !== 'NATIONAL';
    const filterBtnClass = currentState.isFiltered ? 'control-btn' : 'btn-primary-lg';
    const filterBtnText = currentState.isFiltered 
        ? `Show All Competitions` 
        : `Show only ${currentState.leagueName || 'League'}`;
    
    // Always allow toggle between filtered and all
    const filterAction = currentState.isFiltered ? 'searchFixtures(false)' : 'searchFixtures(true)';
        
    const filterButtonStyle = 'font-size:0.9rem; padding:8px 16px;';

    // Controls Bar
    // If in Results Mode, disable "Select All" actions as we can't add past games to calendar usually
    // Or maybe user wants to save them? Let's assume Calendar = Future.
    const disableControls = isResultsMode ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';

    const controlsHtml = `
        <div class="controls-bar" style="flex-wrap:wrap; gap:10px; ${isResultsMode ? 'background:#fff7ed; border-color:#fdba74;' : ''}">
            ${isResultsMode ? '<div style="width:100%; text-align:center; font-weight:bold; color:#c2410c; margin-bottom:5px;">Recent Results</div>' : ''}
            
            <div class="selection-controls">
                <button class="control-btn" onclick="handleSelectAll()" ${disableControls}>Select All</button>
                <button class="control-btn" onclick="handleClearAll()" ${disableControls}>Clear All</button>
            </div>
            
            ${showFilterToggle ? `
            <div style="flex-grow:1; text-align:center;">
                <button class="${filterBtnClass}" onclick="${filterAction}" style="${filterButtonStyle}">
                    ${filterBtnText}
                </button>
            </div>
            ` : ''}

            <div style="display:flex; gap:10px">
                <button id="syncBtn" class="control-btn" onclick="getSyncLink()" disabled title="Login required" ${disableControls}>🔗 Sync</button>
                <button id="addSelectedBtn" class="btn-primary-lg" onclick="addSelectedToCalendar()" disabled ${disableControls}>
                    Add (0)
                </button>
            </div>
        </div>
    `;

    // Table Header
    const tableHeader = `
        <thead>
            <tr>
                <th class="checkbox-col">✅</th>
                <th>Date</th>
                ${isResultsMode ? '<th>Score</th>' : '<th>Time</th>'}
                <th style="text-align:right">Home</th>
                <th style="width: 20px;"></th>
                <th style="text-align:left">Away</th>
                <th>League</th>
                <th>Venue</th>
            </tr>
        </thead>
    `;

    // Table Body
    const tableRows = allFixtures.map(fixture => createFixtureRow(fixture, isResultsMode)).join('');

    fixturesContainer.innerHTML = `
        ${controlsHtml}
        <table class="fixtures-table">
            ${tableHeader}
            <tbody>
                ${tableRows}
            </tbody>
        </table>
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

    // Check favorite status
    const isHomeFav = userFavorites.has(home.id) ? 'active' : '';
    const isAwayFav = userFavorites.has(away.id) ? 'active' : '';
    const homeStar = isHomeFav ? '★' : '☆';
    const awayStar = isAwayFav ? '★' : '☆';

    // Format date as dd/mm/yyyy
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    
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
        <tr>
            <td class="checkbox-col">
                ${checkboxHtml}
            </td>
            <td>${dateStr}</td>
            ${centerCol}
            <td style="text-align:right">
                <div class="team-col" style="justify-content: flex-end;">
                    <button class="fav-star ${isHomeFav}" 
                            onclick="event.stopPropagation(); toggleFavorite(${home.id}, '${home.name.replace(/'/g, "\\'")}', '${home.logo}')"
                            title="Favorite ${home.name}">
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
                            onclick="event.stopPropagation(); toggleFavorite(${away.id}, '${away.name.replace(/'/g, "\\'")}', '${away.logo}')"
                            title="Favorite ${away.name}">
                        ${awayStar}
                    </button>
                </div>
            </td>
            <td>${fixture.league.name}</td>
            <td>${fixture.fixture.venue?.name || 'TBA'}</td>
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
            userFavorites = new Set(data.favorites.map(f => f.team_id));
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

    // If already favorite, remove it
    if (userFavorites.has(teamId)) {
        await submitFavoriteRemove(teamId);
    } else {
        // If adding, open preferences
        openSubscriptionPreferences(teamId, teamName, teamLogo, effectiveIsNational);
    }
};

// Wrapper for table star button clicks
window.toggleFavoriteFromTable = function(btn) {
    try {
        const teamData = JSON.parse(btn.dataset.team);
        const isNational = currentState.isNationalView || false;
        toggleFavorite(teamData.id, teamData.name, teamData.logo, isNational);
    } catch (e) {
        console.error('Error parsing team data:', e);
    }
};

window.openSubscriptionPreferences = function(teamId, teamName, teamLogo, isNationalParam = null) {
    const isNational = isNationalParam !== null ? isNationalParam : (currentState.league === 'NATIONAL');

    let optionsHtml = '';

    if (isNational) {
        // --- NATIONAL TEAM OPTIONS ---
        optionsHtml = `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="All" checked onchange="toggleFilterAll(this)">
                <div>
                    <strong>All Matches</strong>
                    <div style="font-size:0.8rem; color:#64748b;">Sync everything</div>
                </div>
            </label>

            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Major" class="sub-filter">
                <div>
                    <strong>Major Tournaments</strong>
                    <div style="font-size:0.8rem; color:#64748b;">World Cup, Euros, Copa America</div>
                </div>
            </label>

            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Qualifiers" class="sub-filter">
                <div>
                    <strong>Qualifiers</strong>
                    <div style="font-size:0.8rem; color:#64748b;">World Cup Qualifiers, Euro Qualifiers</div>
                </div>
            </label>

            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Friendlies" class="sub-filter">
                <div>
                    <strong>Friendlies</strong>
                    <div style="font-size:0.8rem; color:#64748b;">International Friendlies</div>
                </div>
            </label>
            
             <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="NationsLeague" class="sub-filter">
                <div>
                    <strong>Nations League</strong>
                    <div style="font-size:0.8rem; color:#64748b;">UEFA Nations League</div>
                </div>
            </label>
        `;
    } else {
        // --- CLUB OPTIONS ---
        optionsHtml = `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="All" checked onchange="toggleFilterAll(this)">
                <div>
                    <strong>All Matches</strong>
                    <div style="font-size:0.8rem; color:#64748b;">Sync everything including friendlies</div>
                </div>
            </label>

            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="League" class="sub-filter">
                <div>
                    <strong>Domestic League</strong>
                    <div style="font-size:0.8rem; color:#64748b;">Premier League, La Liga, etc.</div>
                </div>
            </label>

            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Cup" class="sub-filter">
                <div>
                    <strong>Cups</strong>
                    <div style="font-size:0.8rem; color:#64748b;">FA Cup, Carabao Cup, etc.</div>
                </div>
            </label>

            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="UEFA" class="sub-filter">
                <div>
                    <strong>International / European</strong>
                    <div style="font-size:0.8rem; color:#64748b;">Champions League, Europa, etc.</div>
                </div>
            </label>
        `;
    }

    const html = `
        <div id="subPrefModal" class="modal active" style="z-index: 2500;">
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
                    <button class="btn-primary-lg" style="flex:1" onclick="collectAndSubmitFavorite(${teamId}, '${teamName.replace(/'/g, "\\'")}', '${teamLogo}')">
                        Subscribe
                    </button>
                    <button class="control-btn" style="flex:1" onclick="document.getElementById('subPrefModal').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Auto-uncheck specific filters if All is checked logic handled in toggleFilterAll
};

window.toggleFilterAll = function(cb) {
    const others = document.querySelectorAll('.sub-filter');
    if (cb.checked) {
        others.forEach(c => { c.checked = false; c.disabled = true; });
    } else {
        others.forEach(c => c.disabled = false);
    }
}

// Open edit modal for existing subscription
window.openEditSubscription = function(teamId) {
    // Find the favorite data
    const fav = window.userFavoritesData?.find(f => f.team_id === teamId);
    if (!fav) {
        console.error('Favorite not found:', teamId);
        return;
    }
    
    const teamName = fav.team_name;
    const teamLogo = fav.team_logo || '/favicon.svg';
    const currentFilters = fav.filters || ['All'];
    const isNational = fav.is_national || false;
    
    // Determine which filters are checked
    const hasAll = currentFilters.includes('All');
    
    let optionsHtml = '';
    
    if (isNational) {
        // --- NATIONAL TEAM OPTIONS ---
        optionsHtml = `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="All" ${hasAll ? 'checked' : ''} onchange="toggleFilterAll(this)">
                <div>
                    <strong>All Matches</strong>
                    <div style="font-size:0.8rem; color:#64748b;">Sync everything</div>
                </div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Major" class="sub-filter" ${currentFilters.includes('Major') ? 'checked' : ''} ${hasAll ? 'disabled' : ''}>
                <div>
                    <strong>Major Tournaments</strong>
                    <div style="font-size:0.8rem; color:#64748b;">World Cup, Euros, Copa America</div>
                </div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Qualifiers" class="sub-filter" ${currentFilters.includes('Qualifiers') ? 'checked' : ''} ${hasAll ? 'disabled' : ''}>
                <div>
                    <strong>Qualifiers</strong>
                    <div style="font-size:0.8rem; color:#64748b;">World Cup Qualifiers, Euro Qualifiers</div>
                </div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Friendlies" class="sub-filter" ${currentFilters.includes('Friendlies') ? 'checked' : ''} ${hasAll ? 'disabled' : ''}>
                <div>
                    <strong>Friendlies</strong>
                    <div style="font-size:0.8rem; color:#64748b;">International Friendlies</div>
                </div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="NationsLeague" class="sub-filter" ${currentFilters.includes('NationsLeague') ? 'checked' : ''} ${hasAll ? 'disabled' : ''}>
                <div>
                    <strong>Nations League</strong>
                    <div style="font-size:0.8rem; color:#64748b;">UEFA Nations League</div>
                </div>
            </label>
        `;
    } else {
        // --- CLUB OPTIONS ---
        optionsHtml = `
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="All" ${hasAll ? 'checked' : ''} onchange="toggleFilterAll(this)">
                <div>
                    <strong>All Matches</strong>
                    <div style="font-size:0.8rem; color:#64748b;">Sync everything including friendlies</div>
                </div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="League" class="sub-filter" ${currentFilters.includes('League') ? 'checked' : ''} ${hasAll ? 'disabled' : ''}>
                <div>
                    <strong>Domestic League</strong>
                    <div style="font-size:0.8rem; color:#64748b;">Premier League, La Liga, etc.</div>
                </div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="Cup" class="sub-filter" ${currentFilters.includes('Cup') ? 'checked' : ''} ${hasAll ? 'disabled' : ''}>
                <div>
                    <strong>Cups</strong>
                    <div style="font-size:0.8rem; color:#64748b;">FA Cup, Carabao Cup, etc.</div>
                </div>
            </label>
            <label class="pref-option" style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;">
                <input type="checkbox" name="compFilter" value="UEFA" class="sub-filter" ${currentFilters.includes('UEFA') ? 'checked' : ''} ${hasAll ? 'disabled' : ''}>
                <div>
                    <strong>International / European</strong>
                    <div style="font-size:0.8rem; color:#64748b;">Champions League, Europa, etc.</div>
                </div>
            </label>
        `;
    }

    const html = `
        <div id="subPrefModal" class="modal active" style="z-index: 2500;">
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
                    <button class="btn-primary-lg" style="flex:1" onclick="collectAndUpdateSubscription(${teamId}, '${teamName.replace(/'/g, "\\'")}', '${teamLogo}')">
                        Update
                    </button>
                    <button class="control-btn" style="flex:1; color:#dc2626;" onclick="confirmUnsubscribe(${teamId}, '${teamName.replace(/'/g, "\\'")}')">
                        Unsubscribe
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
};

// Update an existing subscription
window.collectAndUpdateSubscription = function(teamId, teamName, teamLogo) {
    const all = document.querySelector('input[value="All"]').checked;
    let filters = [];
    
    if (all) {
        filters = ['All'];
    } else {
        const checked = document.querySelectorAll('.sub-filter:checked');
        checked.forEach(c => filters.push(c.value));
        if (filters.length === 0) {
            filters = ['All'];
        }
    }
    
    document.getElementById('subPrefModal').remove();
    submitFavoriteAdd(teamId, teamName, teamLogo, filters); // Uses same endpoint (upsert)
}

// Confirm unsubscribe
window.confirmUnsubscribe = function(teamId, teamName) {
    document.getElementById('subPrefModal').remove();
    
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

window.collectAndSubmitFavorite = function(teamId, teamName, teamLogo) {
    // Collect filters
    const all = document.querySelector('input[value="All"]').checked;
    let filters = [];
    
    if (all) {
        filters = ['All'];
    } else {
        const checked = document.querySelectorAll('.sub-filter:checked');
        checked.forEach(c => filters.push(c.value));
        if (filters.length === 0) {
            // Default to All if nothing selected? Or prevent?
            // Let's default to All to be safe
            filters = ['All'];
        }
    }
    
    document.getElementById('subPrefModal').remove();
    submitFavoriteAdd(teamId, teamName, teamLogo, filters);
}

async function submitFavoriteAdd(teamId, teamName, teamLogo, filters) {
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
                filters: filters
            })
        });
        
        if (res.ok) {
            userFavorites.add(teamId);
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
            loadFavorites(); 
        } else {
             showErrorModal('Error', 'Failed to remove favorite');
        }
    } catch (e) { showErrorModal('Error', 'Network error'); }
}


function updateAuthUI(user) {
    const c = document.getElementById('authControls');
    const fAction = document.getElementById('favoritesHeaderAction'); // Center button container

    if (user) {
        // Main Auth Controls (Top Right) -> Only Logout now (name removed)
        if(c) {
            c.innerHTML = `
                <div style="display:flex; flex-direction: column; align-items: center; gap:5px;">
                    <button class="auth-btn" onclick="logout()" style="background:rgba(239, 68, 68, 0.4)">Logout</button>
                </div>`;
        }
        
        // Subscriptions Button (Center, under sub-header)
        if(fAction) {
            fAction.innerHTML = `
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="auth-btn" style="background: rgba(255, 255, 255, 0.25); border: 2px solid rgba(255,255,255,0.6); padding: 8px 20px; font-size: 0.95rem;" 
                            onclick="openAuthModal('favorites')">
                        ⭐ Subscriptions
                    </button>
                    <button class="auth-btn" style="background: rgba(255, 255, 255, 0.25); border: 2px solid rgba(255,255,255,0.6); padding: 8px 20px; font-size: 0.95rem;" 
                            onclick="openManageCalendar()">
                        🗓 My Calendar
                    </button>
                </div>
            `;
        }

    } else {
        // Logged Out State
        if(c) {
            c.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="auth-btn" onclick="openAuthModal('login')" title="Login to see your favorite teams">Login</button>
                </div>`;
        }
        // If not logged in, maybe show a "Login to Favorites" CTA or nothing? 
        if(fAction) fAction.innerHTML = ''; 
    }
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


