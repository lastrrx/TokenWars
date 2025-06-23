/**
 * User Profile and Betting History Management - Merged Version
 * Combines rich features from our version with API integration from co-dev
 */

// User profile structure - enhanced from our version
class UserProfile {
    constructor(walletAddress) {
        this.walletAddress = walletAddress;
        this.username = null;
        this.avatar = '🎯';
        this.stats = {
            totalBets: 0,
            wonBets: 0,
            winRate: 0,
            totalEarnings: 0,
            totalSpent: 0,
            netProfit: 0,
            currentStreak: 0,
            bestStreak: 0,
            favoriteToken: null,
            lastActive: new Date()
        };
        this.bettingHistory = [];
        this.activeBets = [];
        this.achievements = [];
    }
    
    calculateWinRate() {
        if (this.stats.totalBets === 0) return 0;
        return ((this.stats.wonBets / this.stats.totalBets) * 100).toFixed(1);
    }
    
    updateStats() {
        this.stats.winRate = this.calculateWinRate();
        this.stats.netProfit = this.stats.totalEarnings - this.stats.totalSpent;
        this.stats.lastActive = new Date();
    }
    
    addBetToHistory(bet) {
        this.bettingHistory.unshift(bet);
        this.stats.totalBets++;
        this.stats.totalSpent += bet.amount;
        
        if (bet.status === 'won') {
            this.stats.wonBets++;
            this.stats.totalEarnings += bet.payout;
            this.stats.currentStreak++;
            if (this.stats.currentStreak > this.stats.bestStreak) {
                this.stats.bestStreak = this.stats.currentStreak;
            }
        } else if (bet.status === 'lost') {
            this.stats.currentStreak = 0;
        }
        
        this.updateStats();
    }
    
    getFavoriteTokens() {
        const tokenCounts = {};
        
        this.bettingHistory.forEach(bet => {
            if (!tokenCounts[bet.chosenToken]) {
                tokenCounts[bet.chosenToken] = 0;
            }
            tokenCounts[bet.chosenToken]++;
        });
        
        return Object.entries(tokenCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([token, count]) => ({ token, count }));
    }
    
    getTokenPerformance() {
        const performance = {};
        
        this.bettingHistory.forEach(bet => {
            if (!performance[bet.chosenToken]) {
                performance[bet.chosenToken] = {
                    total: 0,
                    won: 0,
                    earnings: 0,
                    spent: 0
                };
            }
            
            performance[bet.chosenToken].total++;
            performance[bet.chosenToken].spent += bet.amount;
            
            if (bet.status === 'won') {
                performance[bet.chosenToken].won++;
                performance[bet.chosenToken].earnings += bet.payout;
            }
        });
        
        Object.keys(performance).forEach(token => {
            const data = performance[token];
            data.winRate = ((data.won / data.total) * 100).toFixed(1);
            data.profit = data.earnings - data.spent;
        });
        
        return performance;
    }
}

// User module state
const UserState = {
    profile: null,
    bettingHistory: [],
    leaderboard: [],
    currentLeaderboardPeriod: 'daily'
};

/**
 * Initialize user profile
 */
async function initializeUserProfile() {
    if (!AppState.wallet) return;
    
    await loadUserProfile();
    await loadBettingHistory();
    checkAchievements();
}

/**
 * Load user profile data
 */
async function loadUserProfile() {
    if (!AppState.wallet) return;
    
    try {
        // Try to load from API
        if (AppState.user) {
            UserState.profile = new UserProfile(AppState.wallet);
            Object.assign(UserState.profile, AppState.user);
        } else {
            // Create or load from localStorage for demo
            const savedProfile = localStorage.getItem(`profile_${AppState.wallet}`);
            
            if (savedProfile) {
                const profileData = JSON.parse(savedProfile);
                UserState.profile = new UserProfile(AppState.wallet);
                Object.assign(UserState.profile, profileData);
            } else {
                UserState.profile = new UserProfile(AppState.wallet);
                UserState.profile.username = AppState.username;
            }
        }
        
        updateProfileDisplay();
        
    } catch (error) {
        console.error('Failed to load user profile:', error);
        UserState.profile = new UserProfile(AppState.wallet);
    }
}

/**
 * Save user profile
 */
function saveUserProfile() {
    if (!UserState.profile) return;
    
    try {
        localStorage.setItem(`profile_${UserState.profile.walletAddress}`, JSON.stringify(UserState.profile));
    } catch (error) {
        console.error('Failed to save user profile:', error);
    }
}

/**
 * Update profile display
 */
function updateProfileDisplay() {
    if (!UserState.profile) return;
    
    const stats = UserState.profile.stats;
    
    // Update stats
    document.getElementById('user-win-rate').textContent = `${stats.winRate}%`;
    document.getElementById('net-profit').textContent = `${stats.netProfit.toFixed(2)} SOL`;
    document.getElementById('current-streak').textContent = stats.currentStreak;
    document.getElementById('total-wins').textContent = `${stats.wonBets}/${stats.totalBets}`;
    
    // Update username display
    if (UserState.profile.username) {
        document.getElementById('current-username').textContent = UserState.profile.username;
        document.getElementById('username-display').classList.remove('hidden');
        document.getElementById('username-form').classList.add('hidden');
    } else {
        document.getElementById('username-display').classList.add('hidden');
        document.getElementById('username-form').classList.remove('hidden');
    }
    
    // Update token performance
    renderTokenPerformance();
}

/**
 * Save username
 */
async function saveUsername() {
    const input = document.getElementById('username-input');
    const username = input.value.trim();
    
    // Validate username
    if (!validateUsername(username)) {
        showNotification('Invalid username. Use 3-20 characters, letters, numbers, and underscores only.', 'error');
        return;
    }
    
    try {
        // Try API first
        const response = await fetch(`${AppState.apiBaseUrl}/users/${AppState.wallet}/username`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            UserState.profile.username = updatedUser.username;
            AppState.user = updatedUser;
            AppState.username = updatedUser.username;
        } else {
            // Use local storage for demo
            UserState.profile.username = username;
            AppState.username = username;
        }
        
        saveUserProfile();
        updateProfileDisplay();
        showNotification('Username saved successfully', 'success');
        
    } catch (error) {
        // Fallback to local storage
        UserState.profile.username = username;
        AppState.username = username;
        saveUserProfile();
        updateProfileDisplay();
        showNotification('Username saved successfully', 'success');
    }
}

/**
 * Change username
 */
function changeUsername() {
    document.getElementById('username-display').classList.add('hidden');
    document.getElementById('username-form').classList.remove('hidden');
    document.getElementById('username-input').value = UserState.profile.username || '';
}

/**
 * Validate username
 */
function validateUsername(username) {
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    return regex.test(username);
}

/**
 * Load betting history
 */
async function loadBettingHistory() {
    if (!AppState.wallet) return;
    
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/users/${AppState.wallet}/bets`);
        
        if (response.ok) {
            UserState.bettingHistory = await response.json();
        } else {
            // Load from local storage for demo
            const savedHistory = localStorage.getItem(`betting_history_${AppState.wallet}`);
            if (savedHistory) {
                UserState.bettingHistory = JSON.parse(savedHistory);
            } else {
                // Generate mock history
                UserState.bettingHistory = generateMockBettingHistory();
            }
        }
        
        renderBettingHistory();
        
    } catch (error) {
        // Use mock data for demo
        UserState.bettingHistory = generateMockBettingHistory();
        renderBettingHistory();
    }
}

/**
 * Generate mock betting history
 */
function generateMockBettingHistory() {
    const tokens = ['BONK', 'WIF', 'JUP', 'PYTH', 'ORCA', 'RAY'];
    const history = [];
    
    for (let i = 0; i < 10; i++) {
        const won = Math.random() > 0.4;
        const tokenA = tokens[Math.floor(Math.random() * tokens.length)];
        let tokenB = tokens[Math.floor(Math.random() * tokens.length)];
        while (tokenB === tokenA) {
            tokenB = tokens[Math.floor(Math.random() * tokens.length)];
        }
        
        history.push({
            id: `BET-${Date.now()}-${i}`,
            competitionId: `COMP-${1000 + i}`,
            timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            chosenToken: tokenA,
            opposingToken: tokenB,
            amount: 0.1,
            status: won ? 'won' : 'lost',
            payout: won ? 0.18 : 0,
            tokenAPerformance: (Math.random() * 20 - 10).toFixed(2),
            tokenBPerformance: (Math.random() * 20 - 10).toFixed(2)
        });
    }
    
    return history;
}

/**
 * Render betting history
 */
function renderBettingHistory() {
    const container = document.getElementById('betting-history-container');
    if (!container) return;
    
    if (UserState.bettingHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <div class="empty-message">No betting history yet</div>
                <div class="empty-submessage">Place your first prediction to get started!</div>
            </div>
        `;
        return;
    }
    
    const historyHTML = UserState.bettingHistory.slice(0, 10).map(bet => 
        createBettingHistoryItem(bet)
    ).join('');
    
    container.innerHTML = historyHTML;
}

/**
 * Create betting history item element
 */
function createBettingHistoryItem(bet) {
    const statusIcon = bet.status === 'won' ? '✅' : bet.status === 'lost' ? '❌' : '⏳';
    const statusColor = bet.status === 'won' ? 'var(--accent-green)' : bet.status === 'lost' ? 'var(--accent-red)' : 'var(--gold)';
    
    return `
        <div class="bet-history-item ${bet.status}">
            <div class="bet-history-header">
                <div class="bet-date">${formatRelativeTime(bet.timestamp)}</div>
                <div class="bet-status" style="color: ${statusColor}">${statusIcon} ${bet.status.toUpperCase()}</div>
            </div>
            
            <div class="bet-tokens">
                <div class="bet-token chosen ${bet.status === 'won' ? 'winner' : ''}">
                    <span class="token-name">${bet.chosenToken}</span>
                    ${bet.tokenAPerformance ? `<span class="token-performance">${bet.tokenAPerformance}%</span>` : ''}
                </div>
                <div class="vs-text">VS</div>
                <div class="bet-token ${bet.status === 'lost' ? 'winner' : ''}">
                    <span class="token-name">${bet.opposingToken}</span>
                    ${bet.tokenBPerformance ? `<span class="token-performance">${bet.tokenBPerformance}%</span>` : ''}
                </div>
            </div>
            
            <div class="bet-footer">
                <div class="bet-amount">
                    <span class="label">Bet:</span>
                    <span class="value">${bet.amount} SOL</span>
                </div>
                ${bet.status !== 'pending' ? `
                    <div class="bet-payout">
                        <span class="label">Result:</span>
                        <span class="value" style="color: ${bet.status === 'won' ? 'var(--accent-green)' : 'var(--accent-red)'}">
                            ${bet.status === 'won' ? '+' : '-'}${bet.status === 'won' ? bet.payout : bet.amount} SOL
                        </span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Render token performance
 */
function renderTokenPerformance() {
    if (!UserState.profile) return;
    
    const container = document.getElementById('token-performance-grid');
    if (!container) return;
    
    const tokenPerformance = UserState.profile.getTokenPerformance();
    const performanceHTML = Object.entries(tokenPerformance)
        .sort((a, b) => b[1].profit - a[1].profit)
        .slice(0, 5)
        .map(([token, data]) => `
            <div class="token-stat-card">
                <div class="token-name">${token}</div>
                <div class="token-stats">
                    <span class="win-rate">${data.winRate}% Win</span>
                    <span class="profit ${data.profit >= 0 ? 'positive' : 'negative'}">
                        ${data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)} SOL
                    </span>
                </div>
            </div>
        `).join('');
    
    container.innerHTML = performanceHTML || '<p class="no-data">No performance data yet</p>';
}

/**
 * Load leaderboard
 */
async function loadLeaderboard(period = 'daily') {
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/leaderboard?period=${period}`);
        
        if (response.ok) {
            UserState.leaderboard = await response.json();
        } else {
            // Generate mock leaderboard
            UserState.leaderboard = generateMockLeaderboard();
        }
        
        UserState.currentLeaderboardPeriod = period;
        renderLeaderboard();
        
    } catch (error) {
        // Use mock data
        UserState.leaderboard = generateMockLeaderboard();
        renderLeaderboard();
    }
}

/**
 * Generate mock leaderboard
 */
function generateMockLeaderboard() {
    const leaderboard = [];
    
    for (let i = 0; i < 20; i++) {
        leaderboard.push({
            rank: i + 1,
            wallet_address: `${Math.random().toString(36).substr(2, 4)}...${Math.random().toString(36).substr(2, 4)}`,
            username: Math.random() > 0.5 ? `Trader${Math.floor(Math.random() * 9999)}` : null,
            win_rate: (Math.random() * 40 + 50).toFixed(1),
            total_winnings: (Math.random() * 100).toFixed(2),
            competitions_won: Math.floor(Math.random() * 50),
            current_streak: Math.floor(Math.random() * 10)
        });
    }
    
    return leaderboard;
}

/**
 * Render leaderboard
 */
function renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;
    
    if (UserState.leaderboard.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No leaderboard data available</td></tr>';
        return;
    }
    
    const leaderboardHTML = UserState.leaderboard.map((user, index) => {
        const isCurrentUser = AppState.wallet && 
            (user.wallet_address === AppState.wallet || user.wallet_address === truncateAddress(AppState.wallet));
        
        return `
            <tr class="${isCurrentUser ? 'current-user' : ''}">
                <td class="rank">
                    ${index + 1}
                    ${index < 3 ? `<span class="medal medal-${index + 1}">🏆</span>` : ''}
                </td>
                <td class="username">
                    ${user.username || truncateAddress(user.wallet_address)}
                    ${isCurrentUser ? ' (You)' : ''}
                </td>
                <td class="win-rate">${user.win_rate}%</td>
                <td class="winnings">${user.total_winnings} SOL</td>
                <td class="streak">${user.current_streak} 🔥</td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = leaderboardHTML;
}

/**
 * Achievement system
 */
const achievements = [
    { id: 'first_bet', name: 'First Steps', description: 'Place your first prediction', icon: '🎯', points: 10 },
    { id: 'first_win', name: 'Winner Winner', description: 'Win your first prediction', icon: '🏆', points: 25 },
    { id: 'streak_5', name: 'On Fire', description: 'Win 5 predictions in a row', icon: '🔥', points: 50 },
    { id: 'profit_10', name: 'Profit Master', description: 'Earn 10 SOL in total profit', icon: '💰', points: 100 },
    { id: 'predictions_50', name: 'Dedicated Predictor', description: 'Place 50 predictions', icon: '📊', points: 75 },
    { id: 'winrate_75', name: 'Oracle', description: 'Maintain 75% win rate (min 20 bets)', icon: '🔮', points: 150 }
];

/**
 * Check achievements
 */
function checkAchievements() {
    if (!UserState.profile) return;
    
    const newAchievements = [];
    
    achievements.forEach(achievement => {
        if (UserState.profile.achievements.includes(achievement.id)) return;
        
        let earned = false;
        
        switch (achievement.id) {
            case 'first_bet':
                earned = UserState.profile.stats.totalBets >= 1;
                break;
            case 'first_win':
                earned = UserState.profile.stats.wonBets >= 1;
                break;
            case 'streak_5':
                earned = UserState.profile.stats.bestStreak >= 5;
                break;
            case 'profit_10':
                earned = UserState.profile.stats.netProfit >= 10;
                break;
            case 'predictions_50':
                earned = UserState.profile.stats.totalBets >= 50;
                break;
            case 'winrate_75':
                earned = UserState.profile.stats.totalBets >= 20 && UserState.profile.stats.winRate >= 75;
                break;
        }
        
        if (earned) {
            UserState.profile.achievements.push(achievement.id);
            newAchievements.push(achievement);
        }
    });
    
    // Show notifications for new achievements
    newAchievements.forEach(achievement => {
        showAchievementNotification(achievement);
    });
    
    // Render achievements
    renderAchievements();
    
    // Save profile
    if (newAchievements.length > 0) {
        saveUserProfile();
    }
}

/**
 * Render achievements
 */
function renderAchievements() {
    const container = document.getElementById('achievements-grid');
    if (!container) return;
    
    const achievementsHTML = achievements.map(achievement => {
        const unlocked = UserState.profile && UserState.profile.achievements.includes(achievement.id);
        
        return `
            <div class="achievement-card ${unlocked ? 'unlocked' : ''}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
                <div class="achievement-points">+${achievement.points} points</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = achievementsHTML;
}

/**
 * Show achievement notification
 */
function showAchievementNotification(achievement) {
    const container = document.getElementById('achievement-notifications');
    
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-content">
            <div class="achievement-title">Achievement Unlocked!</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
            <div class="achievement-points">+${achievement.points} points</div>
        </div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Truncate address
 */
function truncateAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Set up leaderboard period filters
 */
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Load leaderboard for selected period
        const period = e.target.dataset.period;
        loadLeaderboard(period);
    });
});

/**
 * Set up username form
 */
document.getElementById('save-username')?.addEventListener('click', saveUsername);
document.getElementById('change-username')?.addEventListener('click', changeUsername);

// Handle enter key in username input
document.getElementById('username-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        saveUsername();
    }
});

// Export functions
window.initializeUserProfile = initializeUserProfile;
window.loadLeaderboard = loadLeaderboard;
window.checkAchievements = checkAchievements;

// Auto-refresh user data when wallet connects
window.addEventListener('walletConnected', initializeUserProfile);