const API_URL = '/api';

// State
let teams = [];
let players = [];
let filteredPlayers = [];
let currentLeaderboardView = 'season';

// Initialize based on page
document.addEventListener('DOMContentLoaded', () => {
    initMenu();
    const path = window.location.pathname;
    
    if (path.includes('index.html') || path === '/') {
        initHomePage();
    } else if (path.includes('stats.html')) {
        initStatsPage();
    } else if (path.includes('players.html')) {
        initPlayersPage();
    }
});

// --- Menu Toggle Logic ---
function initMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when a link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
}

// --- Page Initializers ---

async function initHomePage() {
    await fetchTeams();
    await fetchTopPlayers();
    renderCaptains();
    renderTopPlayers();
}

async function initStatsPage() {
    await fetchTeams();
    await fetchStats();
    renderTeams();
    renderLeaderboards();
    
    document.getElementById('view-season').addEventListener('click', () => {
        currentLeaderboardView = 'season';
        updateLeaderboardButtons();
        renderLeaderboards();
    });
    
    document.getElementById('view-overall').addEventListener('click', () => {
        currentLeaderboardView = 'overall';
        updateLeaderboardButtons();
        renderLeaderboards();
    });
}

async function initPlayersPage() {
    await fetchPlayers();
    renderPlayers();
    
    const playerSearch = document.getElementById('player-search');
    if (playerSearch) {
        playerSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filteredPlayers = players.filter(p => 
                p.name.toLowerCase().includes(term)
            );
            renderPlayers();
        });
    }

    // Close modal when clicking outside or on close button
    const modal = document.getElementById('player-modal');
    const closeBtn = document.querySelector('.close-modal');
    
    if (closeBtn && modal) {
        closeBtn.onclick = () => { modal.style.display = 'none'; };
        window.onclick = (event) => {
            if (event.target == modal) { modal.style.display = 'none'; }
        }
    }
}

// --- Data Fetching ---

async function fetchTeams() {
    try {
        const res = await fetch(`${API_URL}/teams`);
        teams = await res.json();
    } catch (error) {
        console.error('Error fetching teams:', error);
    }
}

async function fetchPlayers() {
    try {
        const res = await fetch(`${API_URL}/players`);
        players = await res.json();
        filteredPlayers = [...players];
    } catch (error) {
        console.error('Error fetching players:', error);
    }
}

let statsData = null;
let topPlayers = [];

async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        statsData = await res.json();
        renderCapHolders();
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

async function fetchTopPlayers() {
    try {
        const res = await fetch(`${API_URL}/stats/top-5-alltime`);
        topPlayers = await res.json();
    } catch (error) {
        console.error('Error fetching top players:', error);
    }
}

// --- Rendering Logic ---

function renderCaptains() {
    const captainsList = document.getElementById('captains-list');
    if (!captainsList) return;

    captainsList.innerHTML = teams.map(team => `
        <div class="captain-card">
            <div class="captain-img-container">
                <img src="${team.captain?.image || 'assets/default-captain.webp'}" alt="${team.captain?.name}" class="captain-img">
            </div>
            <div class="captain-info">
                <span class="captain-team">${team.name}</span>
                <span class="captain-name">${team.captain?.name}</span>
            </div>
        </div>
    `).join('');
}

function renderTopPlayers() {
    const topPlayersList = document.getElementById('top-players-list');
    if (!topPlayersList) return;

    topPlayersList.innerHTML = topPlayers.map((player, index) => {
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
        
        return `
            <div class="top-player-card ${rankClass}">
                <div class="rank-badge-large">${rankEmoji}</div>
                <div class="player-img-container">
                    ${player.image ? `<img src="${player.image}" alt="${player.name}" class="player-img">` : `<div class="no-image">👤</div>`}
                </div>
                <div class="player-info">
                    <h3>${player.name}</h3>
                    <div class="stats-compact">
                        <div class="stat-item">
                            <span class="label">Runs</span>
                            <span class="val">${player.overallRecords.runs}</span>
                        </div>
                        <div class="stat-item">
                            <span class="label">Wkts</span>
                            <span class="val">${player.overallRecords.wickets}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTeams() {
    const teamsTbody = document.getElementById('teams-tbody');
    if (!teamsTbody) return;

    teamsTbody.innerHTML = teams.map(team => `
        <tr>
            <td>
                <div class="team-info">
                    <img src="${team.logo}" alt="${team.name}" class="team-logo">
                    <span>${team.name}</span>
                </div>
            </td>
            <td>${team.played}</td>
            <td>${team.won}</td>
            <td>${team.lost}</td>
            <td>${team.nrr.toFixed(3)}</td>
            <td class="points-val">${team.points}</td>
        </tr>
    `).join('');
}

function renderPlayers() {
    const playersList = document.getElementById('players-list');
    if (!playersList) return;

    if (filteredPlayers.length === 0) {
        playersList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 4rem;">No players found matching your search.</p>';
        return;
    }

    playersList.innerHTML = filteredPlayers.map(player => `
        <div class="player-card">
            <div class="player-img-container">
                ${player.image ? `<img src="${player.image}" alt="${player.name}" class="player-img">` : `<div class="no-image">👤</div>`}
            </div>
            <div class="player-info">
                <h3 class="player-name-clickable" onclick="openPlayerModal('${player._id}')">${player.name}</h3>
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-val">${player.seasonRecords.runs}</span>
                        <span class="stat-label">Season Runs</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-val">${player.seasonRecords.wickets}</span>
                        <span class="stat-label">Season Wkts</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCapHolders() {
    const capList = document.getElementById('cap-holders-list');
    if (!capList || !statsData) return;

    const orange = statsData.caps.orange;
    const purple = statsData.caps.purple;

    capList.innerHTML = `
        <div class="cap-card orange">
            <img src="${orange?.image || 'assets/default-player.webp'}" class="cap-player-img">
            <div>
                <span class="captain-team" style="color: #ff8c00">Orange Cap</span>
                <span class="captain-name">${orange?.name || 'N/A'}</span>
                <p style="font-size: 1.2rem; font-weight: 800; margin-top: 0.5rem">${orange?.seasonRecords.runs || 0} Runs</p>
            </div>
            <span class="cap-icon">🏏</span>
        </div>
        <div class="cap-card purple">
            <img src="${purple?.image || 'assets/default-player.webp'}" class="cap-player-img">
            <div>
                <span class="captain-team" style="color: #8a2be2">Purple Cap</span>
                <span class="captain-name">${purple?.name || 'N/A'}</span>
                <p style="font-size: 1.2rem; font-weight: 800; margin-top: 0.5rem">${purple?.seasonRecords.wickets || 0} Wickets</p>
            </div>
            <span class="cap-icon">🥎</span>
        </div>
    `;
}

function renderLeaderboards() {
    const battingBody = document.getElementById('batting-leaderboard');
    const bowlingBody = document.getElementById('bowling-leaderboard');
    if (!battingBody || !bowlingBody || !statsData) return;

    const battingList = statsData.leaderboards.batting[currentLeaderboardView];
    const bowlingList = statsData.leaderboards.bowling[currentLeaderboardView];

    battingBody.innerHTML = battingList.map((p, i) => `
        <tr>
            <td style="padding: 1rem 0;"><span class="rank-badge">${i+1}</span></td>
            <td>${p.name}</td>
            <td style="text-align: right; font-weight: 800; color: var(--primary);">${currentLeaderboardView === 'season' ? p.seasonRecords.runs : p.overallRecords.runs}</td>
        </tr>
    `).join('');

    bowlingBody.innerHTML = bowlingList.map((p, i) => `
        <tr>
            <td style="padding: 1rem 0;"><span class="rank-badge">${i+1}</span></td>
            <td>${p.name}</td>
            <td style="text-align: right; font-weight: 800; color: var(--primary);">${currentLeaderboardView === 'season' ? p.seasonRecords.wickets : p.overallRecords.wickets}</td>
        </tr>
    `).join('');
}

function updateLeaderboardButtons() {
    const seasonBtn = document.getElementById('view-season');
    const overallBtn = document.getElementById('view-overall');
    
    if (currentLeaderboardView === 'season') {
        seasonBtn.style.background = 'var(--primary)';
        overallBtn.style.background = 'var(--text-muted)';
    } else {
        seasonBtn.style.background = 'var(--text-muted)';
        overallBtn.style.background = 'var(--primary)';
    }
}

function openPlayerModal(playerId) {
    const player = players.find(p => p._id === playerId);
    if (!player) return;

    const modal = document.getElementById('player-modal');
    const detailsContainer = document.getElementById('modal-player-details');
    if (!modal || !detailsContainer) return;

    const achievementsHtml = player.achievements && player.achievements.length > 0
        ? `
            <div class="achievements-section">
                <h3>🏆 Achievements</h3>
                <ul class="achievement-list">
                    ${player.achievements.map(a => `<li class="achievement-item">${a}</li>`).join('')}
                </ul>
            </div>
        `
        : '';

    detailsContainer.innerHTML = `
        <div class="modal-player-header">
            <img src="${player.image || 'assets/default-player.webp'}" alt="${player.name}" class="modal-player-img">
            <div class="modal-player-info">
                <h2>${player.name}</h2>
            </div>
        </div>

        <div class="section-header" style="margin-bottom: 1rem;">
            <h3 style="font-size: 1.1rem; color: #fff;">Overall Career Records</h3>
        </div>

        <div class="modal-stats-grid">
            <div class="modal-stat-card">
                <span class="modal-stat-value">${player.overallRecords?.runs || 0}</span>
                <span class="modal-stat-label">Runs</span>
            </div>
            <div class="modal-stat-card">
                <span class="modal-stat-value">${player.overallRecords?.wickets || 0}</span>
                <span class="modal-stat-label">Wickets</span>
            </div>
            <div class="modal-stat-card">
                <span class="modal-stat-value">${player.overallRecords?.matches || 0}</span>
                <span class="modal-stat-label">Matches</span>
            </div>
        </div>

        ${achievementsHtml}
    `;

    modal.style.display = 'block';
}
