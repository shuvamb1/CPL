const API_URL = 'http://localhost:5000/api';

// State
let teams = [];
let players = [];
let adminKey = '';

// DOM Elements
const loginSection = document.getElementById('admin-login');
const dashboardSection = document.getElementById('admin-dashboard');
const adminKeyInput = document.getElementById('admin-key-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

const teamSelect = document.getElementById('team-select');
const playerSelect = document.getElementById('player-select');
const registrationForm = document.getElementById('registration-form');
const regMessage = document.getElementById('reg-message');

// Session Data
async function checkSession() {
    const storedKey = localStorage.getItem('adminKey');
    if (storedKey) {
        const isValid = await verifyKey(storedKey);
        if (isValid) {
            adminKey = storedKey;
            showDashboard();
        } else {
            localStorage.removeItem('adminKey');
        }
    }
}

async function verifyKey(key) {
    try {
        const res = await fetch(`${API_URL}/admin/verify`, {
            headers: { 'x-admin-key': key }
        });
        return res.ok;
    } catch (e) {
        return false;
    }
}

// Login
loginBtn.addEventListener('click', async () => {
    const tempKey = adminKeyInput.value.trim();
    if (!tempKey) return alert('Enter Access Key');

    const isValid = await verifyKey(tempKey);
    if (isValid) {
        adminKey = tempKey;
        localStorage.setItem('adminKey', adminKey);
        showDashboard();
    } else {
        alert('Authentication Failed: Invalid Key');
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminKey');
    location.reload();
});

function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    logoutBtn.style.display = 'block';
    fetchData();
}

async function fetchData() {
    try {
        const [tRes, pRes] = await Promise.all([
            fetch(`${API_URL}/teams`),
            fetch(`${API_URL}/players`)
        ]);
        teams = await tRes.json();
        players = await pRes.json();
        
        populateSelects();
    } catch (error) {
        console.error('Data sync error:', error);
    }
}

function populateSelects() {
    teamSelect.innerHTML = '<option value="">Select Team</option>' + 
        teams.map(t => `<option value="${t._id}">${t.name}</option>`).join('');

    playerSelect.innerHTML = '<option value="">Select Player</option>' + 
        players.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
}

// Auto-fill player data when selected
playerSelect.addEventListener('change', () => {
    const player = players.find(p => p._id === playerSelect.value);
    if (player) {
        document.getElementById('player-image').value = player.image || '';
        document.getElementById('player-season-runs').value = player.seasonRecords.runs;
        document.getElementById('player-season-wickets').value = player.seasonRecords.wickets;
        document.getElementById('player-season-matches').value = player.seasonRecords.matches;
        document.getElementById('player-overall-runs').value = player.overallRecords.runs;
        document.getElementById('player-overall-wickets').value = player.overallRecords.wickets;
        document.getElementById('player-overall-matches').value = player.overallRecords.matches;
    }
});

// Auto-fill team data when selected
teamSelect.addEventListener('change', () => {
    const team = teams.find(t => t._id === teamSelect.value);
    if (team) {
        document.getElementById('team-played').value = team.played;
        document.getElementById('team-won').value = team.won;
        document.getElementById('team-lost').value = team.lost;
        document.getElementById('team-nrr').value = team.nrr;
        document.getElementById('team-points').value = team.points;
        document.getElementById('captain-name').value = team.captain?.name || '';
        document.getElementById('captain-image').value = team.captain?.image || '';
    }
});

// Registration
registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        image: document.getElementById('reg-image').value
    };

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': adminKey
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        regMessage.textContent = data.message;
        regMessage.style.color = res.ok ? '#10b981' : '#ef4444';
        
        if (res.ok) {
            registrationForm.reset();
            fetchData();
        }
    } catch (error) {
        regMessage.textContent = 'Connection Error';
    }
});

// Update Team
document.getElementById('update-team-btn').addEventListener('click', async () => {
    const id = teamSelect.value;
    if (!id) return alert('Select a team');

    const updateData = {
        id,
        played: parseInt(document.getElementById('team-played').value) || 0,
        won: parseInt(document.getElementById('team-won').value) || 0,
        lost: parseInt(document.getElementById('team-lost').value) || 0,
        nrr: parseFloat(document.getElementById('team-nrr').value) || 0,
        points: parseInt(document.getElementById('team-points').value) || 0
    };

    const captainData = {
        id,
        captainName: document.getElementById('captain-name').value,
        captainImage: document.getElementById('captain-image').value
    };

    try {
        // Update stats
        const resStats = await fetch(`${API_URL}/admin/update-team`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': adminKey
            },
            body: JSON.stringify(updateData)
        });

        // Update captain details
        const resCap = await fetch(`${API_URL}/admin/update-captain`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': adminKey
            },
            body: JSON.stringify(captainData)
        });

        const dataStats = await resStats.json();
        const dataCap = await resCap.json();
        
        alert(dataStats.message + " & " + dataCap.message);
        if (resStats.ok && resCap.ok) fetchData();
    } catch (e) {
        alert('Update error: ' + e.message);
    }
});

// Update Player
document.getElementById('update-player-btn').addEventListener('click', async () => {
    const id = playerSelect.value;
    if (!id) return alert('Select a player');

    const updateData = {
        id,
        image: document.getElementById('player-image').value,
        seasonRecords: {
            runs: parseInt(document.getElementById('player-season-runs').value) || 0,
            wickets: parseInt(document.getElementById('player-season-wickets').value) || 0,
            matches: parseInt(document.getElementById('player-season-matches').value) || 0
        },
        overallRecords: {
            runs: parseInt(document.getElementById('player-overall-runs').value) || 0,
            wickets: parseInt(document.getElementById('player-overall-wickets').value) || 0,
            matches: parseInt(document.getElementById('player-overall-matches').value) || 0
        }
    };

    const res = await fetch(`${API_URL}/admin/update-player`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-admin-key': adminKey
        },
        body: JSON.stringify(updateData)
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) fetchData();
});

// Notify All
document.getElementById('notify-all-btn').addEventListener('click', async () => {
    const res = await fetch(`${API_URL}/admin/notify`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey }
    });
    const data = await res.json();
    alert(data.message);
});

initMenu();
checkSession();

function initMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when a link is clicked
        navLinks.querySelectorAll('a, button').forEach(item => {
            item.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
}
