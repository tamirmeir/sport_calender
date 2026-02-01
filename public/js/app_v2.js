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
    console.log('Sport Calendar App V2 Loaded');
    checkAuth();
    loadCountries();
});

// --- Explorer Logic ---

async function loadCountries() {
    // Update Navigation for Step 1
    updateNavigation(1, "Step 1: Select Country", null);
    
    try {
        const response = await fetch(`${API_BASE}/countries`);
        const data = await response.json();
        
        // Handle unwrapped array or API-Sports wrapped response
        const countryList = Array.isArray(data) ? data : (data.response || []);

        if (countryList.length > 0) {
            // Sort countries by name
            const allCountries = countryList.sort((a, b) => a.name.localeCompare(b.name));
            
            // Priority countries first
            const priorityNames = ['England', 'Spain', 'Italy', 'Germany', 'France', 'Israel', 'Portugal', 'Netherlands', 'Brazil', 'Argentina'];
            const priorityList = [];
            const otherList = [];

            allCountries.forEach(c => {
                if (priorityNames.includes(c.name)) priorityList.push(c);
                else otherList.push(c);
            });

            // Sort priority list to match the defined order
            priorityList.sort((a, b) => priorityNames.indexOf(a.name) - priorityNames.indexOf(b.name));

            const combinedList = [...priorityList, ...otherList];
            
            renderCountries(combinedList);

            // Search functionality
            const searchInput = document.getElementById('countrySearch');
            if (searchInput) {
                searchInput.oninput = (e) => {
                    const term = e.target.value.toLowerCase();
                    const filtered = combinedList.filter(c => c.name.toLowerCase().includes(term));
                    renderCountries(filtered);
                };
            }
        }
    } catch (e) {
        console.error('Error loading countries:', e);
        showStatus('Failed to load countries. Is backend running?', 'error');
    }
}

function renderCountries(list) {
    countriesGrid.innerHTML = '';
    
    // Limit to priority + first 50 others to avoid DOM overload if empty search
    const displayList = list.slice(0, 60);

    displayList.forEach(c => {
        const card = document.createElement('div');
        card.className = 'grid-card';
        card.onclick = () => selectCountry(c.name, c.flag);
        
        card.innerHTML = `
            <img src="${c.flag || 'https://media.api-sports.io/flags/' + c.code.toLowerCase() + '.svg'}" 
                 alt="${c.name}" 
                 onerror="this.style.display='none'">
            <span style="font-size: 1.1rem; font-weight: 600;">${c.name}</span>
        `;
        countriesGrid.appendChild(card);
    });
}

function selectCountry(country, flag) {
    currentState.country = country;
    currentState.flag = flag; // Store flag for the next screen
    
    // Clear fixtures (e.g. from previous Favorites selection)
    if (fixturesContainer) {
        fixturesContainer.innerHTML = '<div class="empty-state"><p>Select a league and team to view fixtures.</p></div>';
    }
    allFixtures = [];
    toggleDownloadButtons(false);

    loadLeagues();
}

async function loadLeagues() {
    const country = currentState.country;
    if (!country) return;

    // UI Transition
    stepCountry.classList.add('hidden');
    stepLeague.classList.remove('hidden');
    
    // Update Navigation for Step 2
    updateNavigation(2, `Step 2: Select ${country} League / National Team`, resetToCountry);
    
    leaguesGrid.innerHTML = '<div class="loading">Loading leagues...</div>';

    try {
        const response = await fetch(`${API_BASE}/leagues?country=${encodeURIComponent(country)}`);
        const data = await response.json();
        
        leaguesGrid.innerHTML = '';
        
        const leagueList = Array.isArray(data) ? data : (data.response || []);

        if (leagueList.length > 0) {
            // Filter: Type 'League' only, remove Women/U21, take top 2
            let leagues = leagueList
                .map(item => item.league)
                .filter(l => l.type === 'League')
                .filter(l => !l.name.includes('Women') && !l.name.includes('U21') && !l.name.includes('Reserves'));

            // If "first two" is requested, we try to be smart.
            // Usually the most important ones have the lowest IDs or are just first. 
            // In API-Sports, it's mixed. 
            // We will slice the first 2 results of the filtered list.
            leagues = leagues.slice(0, 2);

            if (leagues.length === 0) {
                 // Fallback if filtering removed everything (e.g. only cups returned?)
                 leagues = leagueList.map(i => i.league).slice(0, 2);
            }

            // --- NEW: National Team Option ---
            const nationalCard = document.createElement('div');
            nationalCard.className = 'grid-card national-card'; 
            // nationalCard.style.border = '2px solid #2563eb'; // Moved to CSS class
            nationalCard.onclick = () => selectLeague('NATIONAL', 'National Team'); 
            
            // Use the stored flag from previous step
            const flagUrl = currentState.flag || 'https://media.api-sports.io/flags/xw.svg'; // Default World flag

            nationalCard.innerHTML = `
                <img src="${flagUrl}" alt="${country} National Team" style="border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <span style="font-weight: bold;">National Team</span>
            `;
            leaguesGrid.appendChild(nationalCard);
            // ---------------------------------


            leagues.forEach(league => {
                const card = document.createElement('div');
                card.className = 'grid-card';
                card.onclick = () => selectLeague(league.id, league.name);
                
                card.innerHTML = `
                    <img src="${league.logo}" alt="${league.name}" onerror="this.src='https://media.api-sports.io/football/leagues/1.png'">
                    <span>${league.name}</span>
                `;
                leaguesGrid.appendChild(card);
            });
        } else {
            leaguesGrid.innerHTML = '<p>No leagues found for this country.</p>';
        }
    } catch (e) {

        console.error(e);
        leaguesGrid.innerHTML = '<p class="error">Error loading leagues.</p>';
    }
}

async function selectLeague(leagueId, leagueName) {
    currentState.league = leagueId; // Can be 'NATIONAL' or an Integer ID
    
    stepLeague.classList.add('hidden');
    stepTeam.classList.remove('hidden');
    
    // Update Navigation for Step 3
    const stepTitle = leagueId === 'NATIONAL' 
        ? `Step 3: Select ${currentState.country} National Team` 
        : `Step 3: Select ${leagueName} Team`;
        
    updateNavigation(3, stepTitle, resetToLeagues);
    
    teamsGrid.innerHTML = '<div class="loading">Loading teams...</div>';
    
    try {
        let url = '';
        if (leagueId === 'NATIONAL') {
            const countryName = currentState.country; // This is actually the country object from loadCountries selection logic? 
            // WAIT - selectCountry(c) saves the whole object or just ID/Name?
            // Checking selectCountry implementation might be needed. 
            // Assuming currentState.country holds the country name string as seen in loadLeagues(country).
            console.log(`Fetching National Team for ${countryName}`);
            url = `${API_BASE}/teams?country=${countryName}&national=true`;
        } else {
            // Calculate current season
            const date = new Date();
            const season = date.getMonth() < 6 ? date.getFullYear() - 1 : date.getFullYear();
            console.log(`Fetching teams for league ${leagueId}, season ${season}`);
            url = `${API_BASE}/teams?league=${leagueId}&season=${season}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        teamsGrid.innerHTML = '';
        
        const teamList = Array.isArray(data) ? data : (data.response || []);

        if (teamList.length > 0) {
            // Remove grid mode, enable list mode
            teamsGrid.classList.remove('cards-grid');
            teamsGrid.classList.add('teams-list-view');

            // Sort teams
            const teams = teamList.sort((a, b) => a.team.name.localeCompare(b.team.name));
            
            // Generate Table Header
            const isNationalContext = currentState.league === 'NATIONAL';
            const tableHeader = `
                <thead>
                    <tr>
                        <th style="width: 50px;">Logo</th>
                        <th>Team Name</th>
                        ${isNationalContext ? '<th>Type</th>' : ''}
                        <th>Founded</th>
                        <th>Venue</th>
                    </tr>
                </thead>
            `;

            const rows = teams.map(item => {
                const team = item.team;
                const venue = item.venue;
                
                // Detect Team Type
                let badgeHtml = '<span class="badge badge-senior" style="background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0;">Standard</span>'; 
                // Default tag
                
                const name = team.name.toLowerCase();
                let isNational = team.national;

                if (name.includes('women') || displayNameIsWomen(team.name)) {
                    badgeHtml = '<span class="badge badge-women">Women</span>';
                } else if (name.match(/u\d/)) { // matches u19, u20, u21 etc
                    badgeHtml = '<span class="badge badge-youth">Youth</span>';
                } else if (isNational) {
                    badgeHtml = '<span class="badge badge-senior">Men\'s Senior</span>';
                }

                return `
                    <tr onclick="selectTeam(${team.id})">
                        <td>
                            <img src="${team.logo}" alt="${team.name}" onerror="this.src='/favicon.svg'">
                        </td>
                        <td class="team-info">${team.name}</td>
                        ${isNationalContext ? `<td>${badgeHtml}</td>` : ''}
                        <td>${team.founded || '-'}</td>
                        <td>
                            ${venue.name ? `${venue.name}, ${venue.city}` : '-'}
                        </td>
                    </tr>
                `;
            }).join('');

            teamsGrid.innerHTML = `
                <table class="teams-table">
                    ${tableHeader}
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;

            // Helper for ambiguous "W" suffix (e.g. "Chelsea W" vs just "W")
            function displayNameIsWomen(str) {
                return str.endsWith(' W') || str.endsWith(' Ladies');
            }
            
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
             teamsGrid.innerHTML = '<p>No teams found for this league/season.</p>';
        }
    } catch (e) {
        console.error(e);
        teamsGrid.innerHTML = '<p class="error">Error loading teams.</p>';
    }
}

function selectTeam(teamId) {
    currentState.team = teamId;
    if (teamIdInput) teamIdInput.value = teamId;
    searchFixtures();
}

// Navigation Back Buttons (Exposed globally for onclick in HTML)
window.resetToCountry = function() {
    stepLeague.classList.add('hidden');
    stepCountry.classList.remove('hidden');
    currentState.country = null;
    
    // Clear downstream data
    fixturesContainer.innerHTML = '<div class="empty-state"><p>Select a league and team to view fixtures.</p></div>';
    
    loadCountries(); // Refresh options just in case
};

window.resetToLeagues = function() {
    stepTeam.classList.add('hidden');
    stepLeague.classList.remove('hidden');

    // Update Navigation for Step 2
    updateNavigation(2, `Step 2: Select ${currentState.country} League / National Team`, resetToCountry);
    
    // Clear downstream data
    fixturesContainer.innerHTML = '<div class="empty-state"><p>Select a league and team to view fixtures.</p></div>';
    teamsGrid.innerHTML = '';
};


// --- Fixtures Search & Render ---

async function searchFixtures() {
    const teamId = teamIdInput.value.trim();
    if (!teamId) return;

    showStatus('🔄 Loading fixtures...', 'loading');
    fixturesContainer.innerHTML = '<div class="loading"><p>🔄 Fetching data from API...</p></div>';

    try {
        const url = `${API_BASE}/team/${teamId}?next=10`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        
        // Handle unwrapped array (from Node helper) or wrapped object (direct API-Sports)
        const fixtureList = Array.isArray(data) ? data : (data.response || []);

        if (fixtureList.length > 0) {
            allFixtures = fixtureList;
            showStatus(`✅ Found ${allFixtures.length} upcoming fixtures!`, 'success');
            renderFixtures();
            
            // Scroll to results
            fixturesContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Check if it was an empty array (valid) or error
            if (Array.isArray(fixtureList)) {
                 showStatus('No upcoming fixtures found.', 'warning');
                 fixturesContainer.innerHTML = '<div class="empty-state"><p>No upcoming matches scheduled.</p></div>';
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

function renderFixtures() {
    selectedFixtures.clear(); // Reset selection
    
    if (allFixtures.length === 0) {
        fixturesContainer.innerHTML = '<div class="empty-state"><p>No upcoming fixtures found.</p></div>';
        toggleDownloadButtons(false);
        return;
    }

    toggleDownloadButtons(false); // Hide old buttons, we use new inline controls

    // Switch to list view layout
    fixturesContainer.className = 'fixtures-list-view'; // Remove grid class, add specific class specific if needed
    
    // Controls Bar
    const controlsHtml = `
        <div class="controls-bar">
            <div class="selection-controls">
                <button class="control-btn" onclick="handleSelectAll()">Select All</button>
                <button class="control-btn" onclick="handleClearAll()">Clear All</button>
            </div>
            <div style="display:flex; gap:10px">
                <button id="syncBtn" class="control-btn" onclick="getSyncLink()" disabled title="Login required for Sync">🔗 Get Sync Link</button>
                <button id="addSelectedBtn" class="btn-primary-lg" onclick="addSelectedToCalendar()" disabled>
                    Add to Calendar (0)
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
                <th>Time</th>
                <th style="text-align:right">Home</th>
                <th style="width: 20px;"></th>
                <th style="text-align:left">Away</th>
                <th>League</th>
                <th>Venue</th>
            </tr>
        </thead>
    `;

    // Table Body
    const tableRows = allFixtures.map(fixture => createFixtureRow(fixture)).join('');

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
    // Legacy buttons - hide them as we use the new table controls
    if (downloadAllBtn) downloadAllBtn.style.display = 'none';
    if (removeAllBtn) removeAllBtn.style.display = 'none';
}

// --- Helper Functions ---

function createFixtureRow(fixture) {
    const home = fixture.teams.home;
    const away = fixture.teams.away;
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

    return `
        <tr>
            <td class="checkbox-col">
                <input type="checkbox" value="${fixture.fixture.id}" onchange="handleSelectionChange(this)">
            </td>
            <td>${dateStr}</td>
            <td class="time-col">${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}</td>
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
            <div class="modal-content" style="max-width: 500px; text-align:center;">
                <span class="modal-close" onclick="document.getElementById('syncModal').remove()">&times;</span>
                <h2 style="margin-bottom:10px">📅 Sync to Your Calendar</h2>
                <p style="color:#64748b; margin-bottom:20px; font-size:0.95rem;">
                    Choose your calendar app to subscribe instantly. <br>
                    Future updates will appear automatically.
                </p>

                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
                    <!-- Apple / Outlook / Mobile -->
                    <a href="${webcalLink}" class="btn-sync apple">
                         🍏 Apple Calendar / Outlook (Mobile)
                    </a>

                    <!-- Google Calendar -->
                    <a href="${googleLink}" target="_blank" class="btn-sync google">
                         G Google Calendar
                    </a>

                    <!-- Copy Link Fallback -->
                    <div style="position:relative;">
                        <input type="text" value="${link}" readonly 
                            style="width:100%; padding:12px; padding-right:90px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; color:#64748b;">
                        <button onclick="navigator.clipboard.writeText('${link}'); this.textContent='Copied!';" 
                            style="position:absolute; right:5px; top:5px; bottom:5px; px; padding:0 15px; background:white; border:1px solid #e2e8f0; border-radius:6px; cursor:pointer;">
                            Copy
                        </button>
                    </div>
                </div>

                <div style="background:#fffbeb; color:#92400e; padding:10px; border-radius:6px; font-size:0.8rem; text-align:left;">
                    <strong>⚠️ Note for Localhost:</strong> The Google button will only work when the site is live. For now, use the Apple/Outlook button or download the file.
                </div>
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
                h3.textContent = 'Your Favorites';
                wrapper.insertBefore(h3, container);
            }

            // Render Elegant Chips
            container.innerHTML = favs.map(f => `
                <div class="fav-chip" onclick="selectTeam(${f.team_id});" title="Show fixtures for ${f.team_name}">
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
    list.innerHTML = favs.map(f => `
        <div class="fav-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span onclick="selectTeam(${f.team_id}); closeAuthModal();" style="cursor:pointer">${f.team_name}</span>
            <button onclick="toggleFavorite(${f.team_id})" style="color:red; background:none; border:none; cursor:pointer">Remove</button>
        </div>
    `).join('');
}

window.toggleFavorite = async function(teamId, teamName, teamLogo) {
    const token = localStorage.getItem('token');
    if (!token) {
        openAuthModal('login');
        return;
    }
    
    // If already favorite, remove it
    if (userFavorites.has(teamId)) {
        await submitFavoriteRemove(teamId);
    } else {
        // If adding, open preferences
        openSubscriptionPreferences(teamId, teamName, teamLogo);
    }
};

window.openSubscriptionPreferences = function(teamId, teamName, teamLogo) {
    const html = `
        <div id="subPrefModal" class="modal active" style="z-index: 2500;">
            <div class="modal-content" style="max-width: 450px;">
                <span class="modal-close" onclick="document.getElementById('subPrefModal').remove()">&times;</span>
                <div style="text-align:center; margin-bottom:20px;">
                    <img src="${teamLogo}" style="height:50px; margin-bottom:10px;">
                    <h2 style="margin:0;">Track ${teamName}</h2>
                </div>
                
                <p style="color:#64748b; margin-bottom:15px; font-size:0.95rem;">
                    Select which matches you want to sync to your calendar automatically:
                </p>

                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:25px;">
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
                </div>

                <button class="btn-primary-lg" style="width:100%" onclick="collectAndSubmitFavorite(${teamId}, '${teamName.replace(/'/g, "\\'")}', '${teamLogo}')">
                    Add to Favorites
                </button>
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
        
        // Favorites Button (Center, under sub-header)
        if(fAction) {
            fAction.innerHTML = `
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="auth-btn" style="background: rgba(255, 255, 255, 0.25); border: 2px solid rgba(255,255,255,0.6); padding: 8px 20px; font-size: 0.95rem;" 
                            onclick="openAuthModal('favorites')">
                        ⭐ Favorites
                    </button>
                    <button class="auth-btn" style="background: rgba(255, 255, 255, 0.9); color: var(--primary-color); border: none; padding: 8px 20px; font-size: 0.95rem; font-weight:bold;" 
                            onclick="openManageCalendar()">
                        📅 My Calendar
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
                <h3 style="margin-bottom: 15px;">${title}</h3>
                <p style="margin-bottom: 25px; color: #64748b;">${msg}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="control-btn" onclick="document.getElementById('confirmModal').remove()">Cancel</button>
                    <button class="btn-primary-lg" style="background: #ef4444;" id="confirmBtnAction">Confirm</button>
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
                <h3 style="margin-bottom: 10px; color: #dc2626;">${title || 'Error'}</h3>
                <p style="margin-bottom: 20px; color: #64748b;">${msg}</p>
                <button class="btn-primary-lg" onclick="document.getElementById('errorModal').remove()">OK</button>
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
                <h2 style="margin-bottom:15px">Reset Password</h2>
                <p style="margin-bottom:20px; color:#64748b; font-size:0.9rem;">
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
    if (!token) { openAuthModal('login'); return; }

    const popupHtml = `
        <div id="manageModal" class="modal active" style="z-index: 2000;">
            <div class="modal-content" style="max-width: 500px; text-align:center;">
                <span class="modal-close" onclick="document.getElementById('manageModal').remove()">&times;</span>
                <h2 style="margin-bottom:10px">📅 Manage Your Calendar</h2>
                <div id="manageList" class="manage-list">
                    <div class="loading">Loading saved matches...</div>
                </div>
                <button class="btn-clear-all" onclick="clearCalendar()">🗑️ Clear Entire Calendar</button>
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
        }
    } catch (e) {
        document.getElementById('manageList').innerHTML = '<p class="error">Failed to load events.</p>';
    }
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


