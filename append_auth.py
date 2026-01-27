
with open('public/js/app.js', 'a') as f:
    f.write(r'''

/* --- Auth & Favorites Logic --- */

const AUTH_API = 'http://127.0.0.1:8000/api/auth';
const FAV_API = 'http://127.0.0.1:8000/api/favorites';

// Check auth on load
document.addEventListener('DOMContentLoaded', () => {
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
        // Assuming backend handles DELETE with team_id in query or body
        // Standard REST suggests /api/favorites?team_id=X or /api/favorites/X
        // Since backend route is generic, let's use query param first.
        const response = await fetch(`${FAV_API}?team_id=${teamId}`, {
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
    ''')
print("Successfully appended auth logic.")
