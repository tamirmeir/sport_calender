// Global Constants
const API_BASE = 'http://127.0.0.1:8000/api/fixtures';
const AUTH_API = 'http://127.0.0.1:8000/api/auth';
const FAV_API = 'http://127.0.0.1:8000/api/favorites';

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

window.addEventListener('load', () => {
    console.log('Sport Calendar App V2 Loaded');
    checkAuth();
    loadCountries();
});

// --- Explorer Logic ---

async function loadCountries() {
    try {
        const response = await fetch(`${API_BASE}/countries`);
        const data = await response.json();
        
        if (data.response) {
            // Sort countries by name
            const allCountries = data.response.sort((a, b) => a.name.localeCompare(b.name));
            
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
        card.onclick = () => selectCountry(c.name);
        
        card.innerHTML = `
            <img src="${c.flag || 'https://media.api-sports.io/flags/' + c.code.toLowerCase() + '.svg'}" 
                 alt="${c.name}" 
                 onerror="this.style.display='none'">
            <span style="font-size: 1.1rem; font-weight: 600;">${c.name}</span>
        `;
        countriesGrid.appendChild(card);
    });
}

function selectCountry(country) {
    currentState.country = country;
    loadLeagues();
}

async function loadLeagues() {
    const country = currentState.country;
    if (!country) return;

    // UI Transition
    stepCountry.classList.add('hidden');
    stepLeague.classList.remove('hidden');
    
    leaguesGrid.innerHTML = '<div class="loading">Loading leagues...</div>';

    try {
        const response = await fetch(`${API_BASE}/leagues?country=${encodeURIComponent(country)}`);
        const data = await response.json();
        
        leaguesGrid.innerHTML = '';
        
        if (data.response && data.response.length > 0) {
            // Filter: Type 'League' only, remove Women/U21, take top 2
            let leagues = data.response
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
                 leagues = data.response.map(i => i.league).slice(0, 2);
            }

            leagues.forEach(league => {
                const card = document.createElement('div');
                card.className = 'grid-card';
                card.onclick = () => selectLeague(league.id);
                
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

async function selectLeague(leagueId) {
    currentState.league = leagueId;
    
    stepLeague.classList.add('hidden');
    stepTeam.classList.remove('hidden');
    
    teamsGrid.innerHTML = '<div class="loading">Loading teams...</div>';
    
    try {
        // Calculate current season
        // If before July (Month < 6), use previous year. Otherwise current year.
        const date = new Date();
        const season = date.getMonth() < 6 ? date.getFullYear() - 1 : date.getFullYear();
        
        console.log(`Fetching teams for league ${leagueId}, season ${season}`);
        const response = await fetch(`${API_BASE}/teams?league=${leagueId}&season=${season}`);
        const data = await response.json();
        
        teamsGrid.innerHTML = '';
        
        if (data.response && data.response.length > 0) {
            // Sort teams
            const teams = data.response.sort((a, b) => a.team.name.localeCompare(b.team.name));
            
            teams.forEach(item => {
                const team = item.team;
                const card = document.createElement('div');
                card.className = 'grid-card';
                card.onclick = () => selectTeam(team.id);
                
                card.innerHTML = `
                    <img src="${team.logo}" alt="${team.name}" onerror="this.src='/favicon.svg'">
                    <span>${team.name}</span>
                `;
                teamsGrid.appendChild(card);
            });
            
            // Setup Quick Filter for teams
            const filterInput = document.getElementById('teamQuickFilter');
            if (filterInput) {
                filterInput.oninput = (e) => {
                    const val = e.target.value.toLowerCase();
                    const cards = teamsGrid.getElementsByClassName('grid-card');
                    Array.from(cards).forEach(c => {
                        const name = c.querySelector('span').textContent.toLowerCase();
                        c.style.display = name.includes(val) ? 'flex' : 'none';
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
    loadCountries(); // Refresh options just in case
};

window.resetToLeagues = function() {
    stepTeam.classList.add('hidden');
    stepLeague.classList.remove('hidden');
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
        
        if (data.response && Array.isArray(data.response)) {
            allFixtures = data.response;
            showStatus(`✅ Found ${allFixtures.length} upcoming fixtures!`, 'success');
            renderFixtures();
            
            // Scroll to results
            fixturesContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error('Invalid response format');
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
            <button id="addSelectedBtn" class="btn-primary-lg" onclick="addSelectedToCalendar()" disabled>
                Add to Calendar (0)
            </button>
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
    const count = selectedFixtures.size;
    btn.textContent = `Add to Calendar (${count})`;
    btn.disabled = count === 0;
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
    return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:${f.fixture.id}@sportcal\nDTSTAMP:${now}\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:⚽ ${f.teams.home.name} vs ${f.teams.away.name}\nDESCRIPTION:${f.league.name}\nEND:VEVENT\nEND:VCALENDAR`;
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
    if (!container) return;
    
    if (favs.length === 0) {
        container.innerHTML = '<p class="placeholder-text">No favorites yet</p>';
        return;
    }
    
    container.innerHTML = favs.map(f => `
        <div class="team-circle" onclick="selectTeam(${f.team_id})" title="${f.team_name}">
            <img src="${f.team_logo || '/favicon.svg'}" alt="${f.team_name}">
        </div>
    `).join('');
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
    
    const isFav = userFavorites.has(teamId);
    const method = isFav ? 'DELETE' : 'POST';
    const url = isFav ? `${FAV_API}/${teamId}` : FAV_API;
    
    // For remove, body should be empty? check API
    const body = isFav ? undefined : JSON.stringify({ team_id: teamId, team_name: teamName, team_logo: teamLogo });
    
    try {
        const res = await fetch(url, {
            method: method,
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: body
        });
        
        if (res.ok) {
            if (isFav) userFavorites.delete(teamId);
            else userFavorites.add(teamId);
            loadFavorites(); 
        }
    } catch (e) { alert('Error updating favorite'); }
};

function updateAuthUI(user) {
    const c = document.getElementById('authControls');
    if (!c) return;
    if (user) {
        c.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">
                       <span style="color:white; font-weight:bold">Hi, ${user.username}</span> 
                       <button class="auth-btn" onclick="openAuthModal('favorites')">⭐ Favorites</button>
                       <button class="auth-btn" onclick="logout()" style="background:rgba(239, 68, 68, 0.4)">Logout</button>
                       </div>`;
    } else {
        c.innerHTML = `<button class="auth-btn" onclick="openAuthModal('login')">Login</button>`;
    }
}

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
        if(!res.ok) throw new Error(data.error);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        closeAuthModal();
        checkAuth();
    } catch(err) { alert(err.message); }
};

window.handleRegister = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = JSON.stringify(Object.fromEntries(fd));
    try {
        const res = await fetch(`${AUTH_API}/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        closeAuthModal();
        checkAuth();
    } catch(err) { alert(err.message); }
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
