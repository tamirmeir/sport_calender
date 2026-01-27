let allFixtures = [];
let currentFilter = 'all';

console.log('Sport Calendar App initializing...');
const API_BASE = 'http://127.0.0.1:8000/api/fixtures';

// DOM Elements
const teamIdInput = document.getElementById('teamId');
const nextFixturesInput = document.getElementById('nextFixtures');
const searchBtn = document.getElementById('searchBtn');
const fixturesContainer = document.getElementById('fixturesContainer');
const searchStatus = document.getElementById('searchStatus');
const filterButtons = document.querySelectorAll('.filter-btn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const removeAllBtn = document.getElementById('removeAllBtn');

// New DOM Elements for Advanced Search
const countrySelect = document.getElementById('countrySelect');
const leagueSelect = document.getElementById('leagueSelect');
const teamSelect = document.getElementById('teamSelect');
const seasonSelect = document.getElementById('seasonSelect');

// Event Listeners
searchBtn.addEventListener('click', searchFixtures);
downloadAllBtn.addEventListener('click', downloadAllFixtures);
removeAllBtn.addEventListener('click', removeAllFixtures);

// Advanced Search Listeners
countrySelect.addEventListener('change', loadLeagues);
leagueSelect.addEventListener('change', loadTeams);
teamSelect.addEventListener('change', () => {
    if (teamSelect.value) {
        teamIdInput.value = teamSelect.value;
        // Optional: Auto-search when team is selected
        // searchFixtures(); 
    }
});
seasonSelect.addEventListener('change', () => {
    // Reload teams if league is already selected
    if (leagueSelect.value) {
        loadTeams();
    }
});

function selectTeam(id) {
    teamIdInput.value = id;
    searchFixtures();
}

teamIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchFixtures();
});

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderFixtures();
    });
});

// Advanced Search Functions
async function loadCountries() {
    try {
        const response = await fetch(`${API_BASE}/countries`);
        const data = await response.json();
        
        countrySelect.innerHTML = '<option value="">Select Country</option>';
        data.response.forEach(item => {
            const option = document.createElement('option');
            option.value = item.name;
            option.textContent = item.name;
            countrySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading countries:', error);
    }
}

async function loadLeagues() {
    const country = countrySelect.value;
    if (!country) {
        leagueSelect.disabled = true;
        leagueSelect.innerHTML = '<option value="">Select League</option>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/leagues?country=${country}`);
        const data = await response.json();
        
        leagueSelect.innerHTML = '<option value="">Select League</option>';
        data.response.forEach(item => {
            const option = document.createElement('option');
            option.value = item.league.id;
            // Show league name and type
            option.textContent = `${item.league.name} (${item.league.type})`;
            leagueSelect.appendChild(option);
        });
        leagueSelect.disabled = false;
        
        // Reset team select
        teamSelect.innerHTML = '<option value="">Select Team</option>';
        teamSelect.disabled = true;
    } catch (error) {
        console.error('Error loading leagues:', error);
    }
}

async function loadTeams() {
    const leagueId = leagueSelect.value;
    const season = seasonSelect.value;
    
    if (!leagueId) {
        teamSelect.disabled = true;
        teamSelect.innerHTML = '<option value="">Select Team</option>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/teams?league=${leagueId}&season=${season}`);
        const data = await response.json();
        
        teamSelect.innerHTML = '<option value="">Select Team</option>';
        data.response.forEach(item => {
            const option = document.createElement('option');
            option.value = item.team.id;
            option.textContent = item.team.name;
            teamSelect.appendChild(option);
        });
        teamSelect.disabled = false;
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

// Search Fixtures
async function searchFixtures() {
    const teamId = teamIdInput.value.trim();
    const next = nextFixturesInput.value || 10;

    if (!teamId) {
        showStatus('Please enter a Team ID', 'error');
        return;
    }

    showStatus('🔄 Loading fixtures...', 'loading');
    fixturesContainer.innerHTML = '<div class="loading"><p>🔄 Fetching data from API...</p></div>';

    try {
        const response = await fetch(`${API_BASE}/team/${teamId}?next=${next}`);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.response && Array.isArray(data.response)) {
            allFixtures = data.response;
            showStatus(`✅ Found ${allFixtures.length} fixtures!`, 'success');
            renderFixtures();
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Connection Failed: ' + error.message + '\nPlease ensure the Python backend is running at http://127.0.0.1:8000');
        showStatus(`❌ Error: ${error.message}`, 'error');
        fixturesContainer.innerHTML = '<div class="empty-state"><p>Connection Failed. Check backend server.</p></div>';
    }
}

// Filter and Render Fixtures
function renderFixtures() {
    if (allFixtures.length === 0) {
        fixturesContainer.innerHTML = '<div class="empty-state"><p>No fixtures found. Search for a team to get started!</p></div>';
        return;
    }

    const filtered = filterFixtures(allFixtures);
    
    // Show download button if there are fixtures
    if (filtered.length > 0) {
        downloadAllBtn.style.display = 'block';
        removeAllBtn.style.display = 'block';
    } else {
        downloadAllBtn.style.display = 'none';
        removeAllBtn.style.display = 'none';
    }

    if (filtered.length === 0) {
        fixturesContainer.innerHTML = `<div class="empty-state"><p>No ${currentFilter} fixtures found.</p></div>`;
        return;
    }

    fixturesContainer.innerHTML = filtered.map(fixture => createFixtureCard(fixture)).join('');
}

// Download All Fixtures
function downloadAllFixtures() {
    confirmDownload(false);
}

// Remove All Fixtures (Cancellation)
function removeAllFixtures() {
    confirmDownload(true);
}

function confirmDownload(isCancellation) {
    if (allFixtures.length === 0) return;
    
    const calendarContent = isCancellation ? generateBulkCancellationICS(allFixtures) : generateBulkICS(allFixtures);
    const blob = new Blob([calendarContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = isCancellation ? 'REMOVE_sports_calendar.ics' : 'sports_calendar_fixtures.ics';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

function generateBulkCancellationICS(fixtures) {
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sport Calendar App//EN
CALSCALE:GREGORIAN
METHOD:CANCEL
`;

    fixtures.forEach(fixture => {
        const home = fixture.teams.home.name;
        const away = fixture.teams.away.name;
        const date = new Date(fixture.fixture.date);
        
        // Essential times are still needed for some clients to find the event
        const startDate = date.toISOString().replace(/-|:|\.\d{3}/g, '');
        const endDate = new Date(date.getTime() + 2*60*60*1000).toISOString().replace(/-|:|\.\d{3}/g, '');
        const stamp = new Date().toISOString().replace(/-|:|\.\d{3}/g, '');

        icsContent += `BEGIN:VEVENT
UID:${fixture.fixture.id}@sportcalendar.app
DTSTAMP:${stamp}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${home} vs ${away}
STATUS:CANCELLED
SEQUENCE:1
END:VEVENT
`;
    });

    icsContent += 'END:VCALENDAR';
    return icsContent
}

function generateBulkICS(fixtures) {
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sport Calendar App//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

    fixtures.forEach(fixture => {
        const home = fixture.teams.home.name;
        const away = fixture.teams.away.name;
        const date = new Date(fixture.fixture.date);
        const venue = fixture.fixture.venue?.name || 'TBA';
        const league = fixture.league.name;
        
        const startDate = date.toISOString().replace(/-|:|\.\d{3}/g, '');
        const endDate = new Date(date.getTime() + 2*60*60*1000).toISOString().replace(/-|:|\.\d{3}/g, '');
        
        icsContent += `BEGIN:VEVENT
UID:${fixture.fixture.id}@sportcalendar.app
DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d{3}/g, '')}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${home} vs ${away}
DESCRIPTION:${league}\\nVenue: ${venue}
LOCATION:${venue}
STATUS:CONFIRMED
END:VEVENT
`;
    });

    icsContent += 'END:VCALENDAR';
    return icsContent
}

// Filter Logic
function filterFixtures(fixtures) {
    if (currentFilter === 'all') return fixtures;
    
    return fixtures.filter(fixture => {
        const status = getFixtureStatus(fixture);
        return status === currentFilter;
    });
}

// Get Fixture Status
function getFixtureStatus(fixture) {
    const status = fixture.fixture.status.short;
    
    if (status === 'NS' || status === 'TBD') return 'upcoming';
    if (status === 'LIVE' || status === '1H' || status === '2H' || status === 'ET' || status === 'P') return 'live';
    if (status === 'FT' || status === 'AET' || status === 'PEN') return 'finished';
    
    return 'upcoming';
}

// Generate iCalendar format (.ics file)
function generateICS(fixture) {
    const home = fixture.teams.home.name;
    const away = fixture.teams.away.name;
    const date = new Date(fixture.fixture.date);
    const venue = fixture.fixture.venue?.name || 'TBA';
    const league = fixture.league.name;
    
    // Format dates for iCalendar
    const startDate = date.toISOString().replace(/-|:|\.\d{3}/g, '');
    const endDate = new Date(date.getTime() + 2*60*60*1000).toISOString().replace(/-|:|\.\d{3}/g, '');
    
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sport Calendar App//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${fixture.fixture.id}@sportcalendar.app
DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d{3}/g, '')}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${home} vs ${away}
DESCRIPTION:${league}\\nVenue: ${venue}
LOCATION:${venue}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
    
    return ics;
}

// Download iCalendar file
function downloadCalendarFile(fixture) {
    const home = fixture.teams.home.name;
    const away = fixture.teams.away.name;
    const ics = generateICS(fixture);
    
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${home}_vs_${away}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// Create Fixture Card
let fixtureData = {};

function createFixtureCard(fixture) {
    const home = fixture.teams.home;
    const away = fixture.teams.away;
    const goals = fixture.goals;
    const fixtureDate = new Date(fixture.fixture.date);
    const status = getFixtureStatus(fixture);
    const statusText = getStatusText(fixture.fixture.status.short);

    const score = status === 'finished' || status === 'live' 
        ? `${goals.home !== null ? goals.home : '-'} - ${goals.away !== null ? goals.away : '-'}`
        : fixture.fixture.status.short;

    const fixtureId = `fixture_${fixture.fixture.id}`;
    fixtureData[fixtureId] = fixture;

    return `
        <div class="fixture-card ${status}">
            <div class="fixture-header">
                <span class="fixture-date">${formatDate(fixtureDate)}</span>
                <span class="fixture-status ${status}">${statusText}</span>
            </div>

            <div class="fixture-teams">
                <div class="team">
                    <div class="team-logo">
                        <img src="${home.logo}" alt="${home.name}" style="width: 40px; height: 40px; object-fit: contain;">
                    </div>
                    <div class="team-name">
                        ${home.name}
                        <button class="fav-btn" onclick="toggleFavorite(${home.id}, '${home.name.replace(/'/g, "\\'")}', '${home.logo}')">☆</button>
                    </div>
                </div>
                <div class="vs">
                    <div class="score">${score}</div>
                </div>
                <div class="team">
                    <div class="team-logo">
                        <img src="${away.logo}" alt="${away.name}" style="width: 40px; height: 40px; object-fit: contain;">
                    </div>
                    <div class="team-name">
                        ${away.name}
                        <button class="fav-btn" onclick="toggleFavorite(${away.id}, '${away.name.replace(/'/g, "\\'")}', '${away.logo}')">☆</button>
                    </div>
                </div>
            </div>

            <div class="fixture-details">
                <div class="detail-item">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${formatTime(fixtureDate)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Competition:</span>
                    <span class="detail-value">${fixture.league.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Season:</span>
                    <span class="detail-value">${fixture.league.season}</span>
                </div>
                ${fixture.fixture.venue ? `
                <div class="detail-item">
                    <span class="detail-label">Venue:</span>
                    <span class="detail-value">${fixture.fixture.venue.name}</span>
                </div>
                ` : ''}
                <div class="calendar-buttons" style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn btn-calendar btn-google" onclick="addToGoogleCalendar('${fixtureId}')">
                        📅 Google
                    </button>
                    <button class="btn btn-calendar btn-apple" onclick="addToMobileCalendar('${fixtureId}')">
                        📱 Apple/Outlook
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Add to Google Calendar
function addToGoogleCalendar(fixtureId) {
    const fixture = fixtureData[fixtureId];
    if (!fixture) return;
    
    const date = new Date(fixture.fixture.date);
    const endDate = new Date(date.getTime() + 2*60*60*1000);
    const title = `${fixture.teams.home.name} vs ${fixture.teams.away.name}`;
    
    const startStr = date.toISOString().replace(/-|:|\.\d{3}/g, '');
    const endStr = endDate.toISOString().replace(/-|:|\.\d{3}/g, '');
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(fixture.league.name)}`;
    window.open(url, '_blank');
}

// Add to Mobile Calendar
function addToMobileCalendar(fixtureId) {
    const fixture = fixtureData[fixtureId];
    loadCountries(); // Load countries on startup
    if (!fixture) return;
    downloadCalendarFile(fixture);
}

// Utility Functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function getStatusText(status) {
    const statusMap = {
        'NS': 'Not Started',
        'TBD': 'TBD',
        '1H': '1st Half',
        '2H': '2nd Half',
        'ET': 'Extra Time',
        'P': 'Penalty',
        'LIVE': 'LIVE',
        'FT': 'Finished',
        'AET': 'Finished (AET)',
        'PEN': 'Finished (PEN)'
    };
    return statusMap[status] || status;
}

function getTeamEmoji(teamName) {
    const emojiMap = {
        'manchester': '🔴',
        'liverpool': '🔴',
        'arsenal': '❤️',
        'chelsea': '💙',
        'tottenham': '⚪',
        'manchester city': '🔵',
        'real madrid': '⚪',
        'barcelona': '🔴',
        'bayern': '🔴',
        'psg': '🔵',
        'juventus': '⚪'
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (teamName.toLowerCase().includes(key)) {
            return emoji;
        }
    }
    return '⚽';
}

function showStatus(message, type) {
    searchStatus.textContent = message;
    searchStatus.className = `status-message ${type}`;
    
    if (type !== 'loading') {
        setTimeout(() => {
            searchStatus.className = 'status-message';
        }, 3000);
    }
}

// Load initial data
window.addEventListener('load', () => {
    console.log('Sport Calendar App Loaded');
    if (typeof loadCountries === 'function') {
        loadCountries();
    }
});


/* --- Auth & Favorites Logic --- */

const AUTH_API = 'http://127.0.0.1:8000/api/auth';
const FAV_API = 'http://127.0.0.1:8000/api/favorites';

// Check auth on load
document.addEventListener('DOMContentLoaded', () => {
    // Only check auth if we are not already processing another load event
    // (Note: The existing window.addEventListener('load') is fine)
    checkAuth();
});

function checkAuth() {
    const userJson = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (userJson && token) {
        try {
            const user = JSON.parse(userJson);
            updateAuthUI(user);
            loadFavorites(true);
        } catch (e) {
            console.error('Auth check error', e);
            logout();
        }
    } else {
        updateAuthUI(null);
    }
}

function updateAuthUI(user) {
    const container = document.getElementById('authControls');
    if (!container) return; 

    if (user) {
        container.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center;">
                <span style="color: white; font-weight: bold;">Hello, ${user.username}</span>
                <button class="auth-btn" onclick="openAuthModal('favorites')">⭐ My Favorites</button>
                <button class="auth-btn" style="background: rgba(239, 68, 68, 0.2); border-color: #ef4444;" onclick="logout()">Logout</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button class="auth-btn" onclick="openAuthModal('login')">Login / Register</button>
        `;
    }
}

function openAuthModal(view) {
    if (!view) view = 'login';
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('active');
    
    if (view === 'favorites') {
        toggleAuthMode('favorites');
        loadFavorites();
    } else {
        toggleAuthMode(view);
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
}

window.onclick = function(event) {
    const modal = document.getElementById('authModal');
    if (event.target == modal) {
        closeAuthModal();
    }
}

function toggleAuthMode(mode) {
    const loginForm = document.getElementById('loginFormContainer');
    const registerForm = document.getElementById('registerFormContainer');
    const favContainer = document.getElementById('favoritesContainer');
    
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (favContainer) favContainer.style.display = 'none';
    
    if (mode === 'login' && loginForm) loginForm.style.display = 'block';
    else if (mode === 'register' && registerForm) registerForm.style.display = 'block';
    else if (mode === 'favorites' && favContainer) favContainer.style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${AUTH_API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error);
        
        localStorage.setItem('token', result.access_token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        updateAuthUI(result.user);
        closeAuthModal();
        alert('Login successful!');
        loadFavorites(true);
        
    } catch (error) {
        alert(error.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${AUTH_API}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error);
        
        localStorage.setItem('token', result.access_token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        updateAuthUI(result.user);
        closeAuthModal();
        alert('Registration successful! You are now logged in.');
        
    } catch (error) {
        alert(error.message);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof userFavorites !== 'undefined') userFavorites.clear();
    updateAuthUI(null);
    updateFavoriteIcons();
}

let userFavorites = new Set();

async function loadFavorites(background) {
    if (background === undefined) background = false;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(FAV_API, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            userFavorites = new Set(data.favorites.map(f => f.team_id));
            
            if (!background) {
                renderFavoritesList(data.favorites);
            }
            updateFavoriteIcons();
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

function renderFavoritesList(favorites) {
    const container = document.getElementById('favoritesList');
    if (!container) return;

    if (favorites.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">No favorite teams yet.</p>';
        return;
    }
    
    container.innerHTML = favorites.map(fav => `
        <div class="favorite-item" onclick="selectTeam(${fav.team_id}); closeAuthModal();">
            <img src="${fav.team_logo}" alt="logo">
            <span>${fav.team_name}</span>
            <button class="delete-fav-btn" onclick="event.stopPropagation(); deleteFavorite(${fav.team_id})">🗑️</button>
        </div>
    `).join('');
}

async function toggleFavorite(teamId, teamName, teamLogo) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to save favorites!');
        openAuthModal('login');
        return;
    }
    
    const isFav = userFavorites.has(Number(teamId));
    
    if (isFav) {
        await deleteFavorite(teamId);
    } else {
        await addFavorite(teamId, teamName, teamLogo);
    }
}

async function addFavorite(teamId, teamName, teamLogo) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(FAV_API, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                team_id: teamId,
                team_name: teamName,
                team_logo: teamLogo
            })
        });
        
        if (response.ok) {
            userFavorites.add(Number(teamId));
            updateFavoriteIcons();
        }
    } catch (error) {
        console.error('Add fav error:', error);
    }
}

async function deleteFavorite(teamId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${FAV_API}/${teamId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            userFavorites.delete(Number(teamId));
            updateFavoriteIcons();
            const modal = document.getElementById('authModal');
            const favContainer = document.getElementById('favoritesContainer');
            if (modal && modal.classList.contains('active') && favContainer && favContainer.style.display === 'block') {
                loadFavorites(); 
            }
        }
    } catch (error) {
        console.error('Delete fav error:', error);
    }
}

function updateFavoriteIcons() {
    document.querySelectorAll('.fav-btn').forEach(btn => {
        // Parse the onclick attribute to find the teamID. 
        // Format: toggleFavorite(123, 'Name', 'Logo')
        const onClickText = btn.getAttribute('onclick');
        if (onClickText) {
            const match = onClickText.match(/toggleFavorite\((\d+)/);
            if (match && match[1]) {
                const teamId = Number(match[1]);
                if (userFavorites.has(teamId)) {
                    btn.classList.add('active');
                    btn.textContent = '⭐'; // Filled star
                } else {
                    btn.classList.remove('active');
                    btn.textContent = '☆'; // Empty star
                }
            }
        }
    });
}
