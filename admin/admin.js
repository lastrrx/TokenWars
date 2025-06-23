/**
 * Admin Panel Main Controller
 * Handles admin panel functionality after authentication
 */

// Admin state management
const AdminState = {
    currentSection: 'dashboard',
    competitions: [],
    users: [],
    analytics: {},
    settings: {},
    charts: {},
    updateIntervals: []
};

/**
 * Initialize admin panel
 */
async function initializeAdminPanel() {
    console.log('Initializing admin panel...');
    
    // Set up navigation
    setupAdminNavigation();
    
    // Set up event listeners
    setupAdminEventListeners();
    
    // Load initial data
    await loadDashboardData();
    
    // Start real-time updates
    startRealTimeUpdates();
}

/**
 * Set up admin navigation
 */
function setupAdminNavigation() {
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('href').substring(1);
            navigateToAdminSection(section);
        });
    });
}

/**
 * Navigate to admin section
 */
async function navigateToAdminSection(section) {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`a[href="#${section}"]`).classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => {
        s.classList.add('hidden');
    });
    
    // Show selected section
    document.getElementById(section).classList.remove('hidden');
    
    AdminState.currentSection = section;
    
    // Load section-specific data
    switch(section) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'competitions':
            await loadCompetitionsData();
            break;
        case 'users':
            await loadUsersData();
            break;
        case 'analytics':
            await loadAnalyticsData();
            break;
        case 'settings':
            await loadSettingsData();
            break;
    }
}

/**
 * Set up admin event listeners
 */
function setupAdminEventListeners() {
    // Logout
    document.getElementById('logout').addEventListener('click', logout);
    
    // Competition form
    document.getElementById('create-competition-form').addEventListener('submit', createCompetition);
    document.getElementById('selection-method').addEventListener('change', toggleTokenSelection);
    
    // Settings form
    document.getElementById('platform-settings-form').addEventListener('submit', savePlatformSettings);
    
    // Analytics period
    document.getElementById('analytics-period').addEventListener('change', () => {
        loadAnalyticsData();
    });
    
    // Modal close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.add('hidden');
        });
    });
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        // Fetch dashboard metrics
        const response = await fetch('/api/admin/dashboard', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load dashboard data');
        
        const data = await response.json();
        
        // Update metrics
        document.getElementById('total-volume').textContent = `${data.totalVolume} SOL`;
        document.getElementById('active-users').textContent = data.activeUsers;
        document.getElementById('platform-revenue').textContent = `${data.platformRevenue} SOL`;
        document.getElementById('active-competitions').textContent = data.activeCompetitions;
        
        // Update activity feed
        updateActivityFeed(data.recentActivity);
        
    } catch (error) {
        console.error('Dashboard data error:', error);
        showAdminNotification('Failed to load dashboard data', 'error');
    }
}

/**
 * Update activity feed
 */
function updateActivityFeed(activities) {
    const feed = document.getElementById('activity-feed');
    
    if (!activities || activities.length === 0) {
        feed.innerHTML = '<p class="no-data">No recent activity</p>';
        return;
    }
    
    const html = activities.map(activity => `
        <div class="activity-item">
            <div>${activity.description}</div>
            <div class="activity-time">${formatRelativeTime(activity.timestamp)}</div>
        </div>
    `).join('');
    
    feed.innerHTML = html;
}

/**
 * Load competitions data
 */
async function loadCompetitionsData() {
    try {
        const response = await fetch('/api/admin/competitions', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load competitions');
        
        AdminState.competitions = await response.json();
        renderCompetitionsTable();
        
    } catch (error) {
        console.error('Competitions error:', error);
        showAdminNotification('Failed to load competitions', 'error');
    }
}

/**
 * Render competitions table
 */
function renderCompetitionsTable() {
    const tbody = document.getElementById('competitions-tbody');
    
    if (AdminState.competitions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No competitions found</td></tr>';
        return;
    }
    
    const html = AdminState.competitions.map(comp => `
        <tr>
            <td>${comp.id}</td>
            <td>${comp.tokenA.symbol} vs ${comp.tokenB.symbol}</td>
            <td><span class="status-badge ${comp.status}">${comp.status}</span></td>
            <td>${comp.participantCount}</td>
            <td>${comp.poolSize} SOL</td>
            <td>${formatDate(comp.endTime)}</td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="viewCompetitionDetails('${comp.id}')">
                    View
                </button>
                ${comp.status === 'active' ? `
                <button class="btn btn-small btn-danger" onclick="pauseCompetition('${comp.id}')">
                    Pause
                </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = html;
}

/**
 * Create competition
 */
async function createCompetition(e) {
    e.preventDefault();
    
    const formData = {
        selectionMethod: document.getElementById('selection-method').value,
        startTime: document.getElementById('start-time').value,
        duration: parseInt(document.getElementById('duration').value),
        marketCapRange: document.getElementById('market-cap-range').value
    };
    
    // Add manual tokens if selected
    if (formData.selectionMethod === 'manual') {
        formData.tokenA = document.getElementById('token-a').value;
        formData.tokenB = document.getElementById('token-b').value;
    }
    
    try {
        const response = await fetch('/api/admin/competitions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Failed to create competition');
        
        showAdminNotification('Competition created successfully', 'success');
        
        // Reset form and reload competitions
        e.target.reset();
        await loadCompetitionsData();
        
    } catch (error) {
        console.error('Create competition error:', error);
        showAdminNotification('Failed to create competition', 'error');
    }
}

/**
 * Toggle token selection method
 */
function toggleTokenSelection(e) {
    const manualSection = document.getElementById('manual-selection');
    if (e.target.value === 'manual') {
        manualSection.classList.remove('hidden');
    } else {
        manualSection.classList.add('hidden');
    }
}

/**
 * Load users data
 */
async function loadUsersData() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load users');
        
        AdminState.users = await response.json();
        renderUsersTable();
        
    } catch (error) {
        console.error('Users error:', error);
        showAdminNotification('Failed to load users', 'error');
    }
}

/**
 * Render users table
 */
function renderUsersTable() {
    const tbody = document.getElementById('users-tbody');
    
    if (AdminState.users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No users found</td></tr>';
        return;
    }
    
    const html = AdminState.users.map(user => `
        <tr>
            <td class="wallet-cell">${truncateAddress(user.walletAddress)}</td>
            <td>${user.username || '-'}</td>
            <td>${user.totalBets}</td>
            <td>${user.winRate.toFixed(1)}%</td>
            <td>${user.totalVolume} SOL</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="viewUserDetails('${user.walletAddress}')">
                    View
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = html;
}

/**
 * View user details
 */
async function viewUserDetails(walletAddress) {
    try {
        const response = await fetch(`/api/admin/users/${walletAddress}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load user details');
        
        const user = await response.json();
        
        // Show user details in modal
        const modal = document.getElementById('user-details-modal');
        const content = document.getElementById('user-details-content');
        
        content.innerHTML = `
            <h3>User Details</h3>
            <div class="user-details">
                <div class="detail-row">
                    <span class="label">Wallet:</span>
                    <span class="value">${user.walletAddress}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Username:</span>
                    <span class="value">${user.username || 'Not set'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Joined:</span>
                    <span class="value">${formatDate(user.createdAt)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Total Bets:</span>
                    <span class="value">${user.totalBets}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Win Rate:</span>
                    <span class="value">${user.winRate.toFixed(1)}%</span>
                </div>
                <div class="detail-row">
                    <span class="label">Total Volume:</span>
                    <span class="value">${user.totalVolume} SOL</span>
                </div>
                <div class="detail-row">
                    <span class="label">Current Streak:</span>
                    <span class="value">${user.currentStreak}</span>
                </div>
            </div>
            
            <h4>Recent Bets</h4>
            <div class="user-bets">
                ${renderUserBets(user.recentBets)}
            </div>
        `;
        
        modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('User details error:', error);
        showAdminNotification('Failed to load user details', 'error');
    }
}

/**
 * Load analytics data
 */
async function loadAnalyticsData() {
    const period = document.getElementById('analytics-period').value;
    
    try {
        const response = await fetch(`/api/admin/analytics?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load analytics');
        
        AdminState.analytics = await response.json();
        
        // Update charts
        updateAnalyticsCharts();
        
        // Update insights
        updateAnalyticsInsights();
        
    } catch (error) {
        console.error('Analytics error:', error);
        showAdminNotification('Failed to load analytics', 'error');
    }
}

/**
 * Update analytics charts
 */
function updateAnalyticsCharts() {
    // TODO: Implement Chart.js charts
    // Volume chart
    // User growth chart
    // Participation chart
    // Revenue breakdown chart
    
    console.log('TODO: Implement analytics charts');
}

/**
 * Load settings data
 */
async function loadSettingsData() {
    try {
        const response = await fetch('/api/admin/settings', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load settings');
        
        AdminState.settings = await response.json();
        
        // Populate settings form
        document.getElementById('platform-fee').value = AdminState.settings.platformFee;
        document.getElementById('bet-amount').value = AdminState.settings.betAmount;
        document.getElementById('default-duration').value = AdminState.settings.defaultDuration;
        document.getElementById('platform-wallet').value = AdminState.settings.platformWallet;
        
        // Load admin list
        await loadAdminList();
        
    } catch (error) {
        console.error('Settings error:', error);
        showAdminNotification('Failed to load settings', 'error');
    }
}

/**
 * Save platform settings
 */
async function savePlatformSettings(e) {
    e.preventDefault();
    
    const settings = {
        platformFee: parseFloat(document.getElementById('platform-fee').value),
        betAmount: parseFloat(document.getElementById('bet-amount').value),
        defaultDuration: parseInt(document.getElementById('default-duration').value),
        platformWallet: document.getElementById('platform-wallet').value
    };
    
    try {
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) throw new Error('Failed to save settings');
        
        showAdminNotification('Settings saved successfully', 'success');
        
    } catch (error) {
        console.error('Save settings error:', error);
        showAdminNotification('Failed to save settings', 'error');
    }
}

/**
 * Emergency controls
 */
async function pausePlatform() {
    if (!confirm('Are you sure you want to pause all competitions? This is an emergency action.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/emergency/pause', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to pause platform');
        
        showAdminNotification('Platform paused. All active competitions suspended.', 'warning');
        
    } catch (error) {
        console.error('Pause platform error:', error);
        showAdminNotification('Failed to pause platform', 'error');
    }
}

/**
 * Start real-time updates
 */
function startRealTimeUpdates() {
    // Update dashboard every 30 seconds
    const dashboardInterval = setInterval(() => {
        if (AdminState.currentSection === 'dashboard') {
            loadDashboardData();
        }
    }, 30000);
    
    AdminState.updateIntervals.push(dashboardInterval);
}

/**
 * Show admin notification
 */
function showAdminNotification(message, type = 'info') {
    // TODO: Implement notification system
    console.log(`[${type}] ${message}`);
    alert(message); // Temporary
}

/**
 * Utility functions
 */
function truncateAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000; // seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Logout
 */
function logout() {
    sessionStorage.clear();
    location.reload();
}

// Export functions for global access
window.viewCompetitionDetails = (id) => console.log('View competition:', id);
window.pauseCompetition = (id) => console.log('Pause competition:', id);
window.viewUserDetails = viewUserDetails;
window.searchUsers = () => console.log('Search users');
window.exportAnalytics = () => console.log('Export analytics');
window.pausePlatform = pausePlatform;
window.emergencyWithdraw = () => console.log('Emergency withdraw');
window.showAddAdmin = () => console.log('Show add admin');

// TODO: Implement remaining functions:
// - Competition details view
// - User search functionality
// - Analytics export
// - Admin management
// - WebSocket for real-time updates
// - Chart.js integration
