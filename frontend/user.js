/**
 * User Profile and Leaderboard Module
 * Handles user profile management, betting history, and leaderboard display
 */

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
}

/**
 * Load user profile data
 */
async function loadUserProfile() {
    if (!AppState.user) return;
    
    UserState.profile = AppState.user;
    updateProfileDisplay();
}

/**
 * Update profile display
 */
function updateProfileDisplay() {
    if (!UserState.profile) return;
    
    // Update stats
    document.getElementById('total-bets').textContent = UserState.profile.total_bets || 0;
    document.getElementById('win-rate').textContent = `${(UserState.profile.win_rate || 0).toFixed(1)}%`;
    document.getElementById('total-winnings').textContent = `${(UserState.profile.total_winnings || 0).toFixed(2)} SOL`;
    document.getElementById('current-streak').textContent = UserState.profile.current_streak || 0;
    
    // Update username display
    if (UserState.profile.username) {
        document.getElementById('current-username').textContent = UserState.profile.username;
        document.getElementById('username-display').classList.remove('hidden');
        document.getElementById('username-form').classList.add('hidden');
    } else {
        document.getElementById('username-display').classList.add('hidden');
        document.getElementById('username-form').classList.remove('hidden');
    }
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
        const response = await fetch(`${AppState.apiBaseUrl}/users/${AppState.wallet}/username`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            UserState.profile = updatedUser;
            AppState.user = updatedUser;
            
            updateProfileDisplay();
            showNotification('Username saved successfully', 'success');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to save username', 'error');
        }
        
    } catch (error) {
        console.error('Error saving username:', error);
        showNotification('Failed to save username', 'error');
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
            renderBettingHistory();
        }
        
    } catch (error) {
        console.error('Error loading betting history:', error);
    }
}

/**
 * Render betting history
 */
function renderBettingHistory() {
    const container = document.getElementById('betting-history-container');
    
    if (UserState.bettingHistory.length === 0) {
        container.innerHTML = '<p class="no-data">No betting history yet</p>';
        return;
    }
    
    const historyHTML = UserState.bettingHistory.map(bet => `
        <div class="bet-history-item">
            <div class="bet-header">
                <span class="competition-id">Competition #${bet.competition_id}</span>
                <span class="bet-date">${formatDate(bet.timestamp)}</span>
            </div>
            <div class="bet-details">
                <div class="bet-info">
                    <span class="label">Token:</span>
                    <span class="value">${bet.chosen_token}</span>
                </div>
                <div class="bet-info">
                    <span class="label">Amount:</span>
                    <span class="value">${bet.amount} SOL</span>
                </div>
                <div class="bet-info">
                    <span class="label">Result:</span>
                    <span class="value ${bet.won ? 'won' : 'lost'}">${bet.won ? 'Won' : 'Lost'}</span>
                </div>
                ${bet.won ? `
                <div class="bet-info">
                    <span class="label">Payout:</span>
                    <span class="value">${bet.payout_amount} SOL</span>
                </div>
                ` : ''}
            </div>
            ${bet.status === 'pending' ? `
            <button class="btn btn-primary claim-btn" onclick="claimWinnings('${bet.bet_id}')">
                Claim Winnings
            </button>
            ` : ''}
        </div>
    `).join('');
    
    container.innerHTML = historyHTML;
}

/**
 * Claim winnings
 */
async function claimWinnings(betId) {
    if (!AppState.wallet) {
        showNotification('Please connect your wallet', 'error');
        return;
    }
    
    try {
        // TODO: Implement claim transaction
        // 1. Call backend to prepare claim transaction
        // 2. Sign transaction with wallet
        // 3. Send transaction to blockchain
        // 4. Update UI after confirmation
        
        showNotification('Claiming winnings...', 'info');
        
        // Mock claim for now
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showNotification('Winnings claimed successfully!', 'success');
        
        // Reload betting history
        await loadBettingHistory();
        
    } catch (error) {
        console.error('Error claiming winnings:', error);
        showNotification('Failed to claim winnings', 'error');
    }
}

/**
 * Load leaderboard
 */
async function loadLeaderboard(period = 'daily') {
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/leaderboard?period=${period}`);
        
        if (response.ok) {
            UserState.leaderboard = await response.json();
            UserState.currentLeaderboardPeriod = period;
            renderLeaderboard();
        }
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

/**
 * Render leaderboard
 */
function renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    
    if (UserState.leaderboard.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No leaderboard data available</td></tr>';
        return;
    }
    
    const leaderboardHTML = UserState.leaderboard.map((user, index) => {
        const isCurrentUser = AppState.wallet && user.wallet_address === AppState.wallet;
        
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
                <td class="win-rate">${(user.win_rate || 0).toFixed(1)}%</td>
                <td class="winnings">${(user.total_winnings || 0).toFixed(2)} SOL</td>
                <td class="competitions">${user.competitions_won || 0}</td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = leaderboardHTML;
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
window.claimWinnings = claimWinnings;

// Auto-refresh user data when wallet connects
window.addEventListener('walletConnected', initializeUserProfile);

// TODO: Implement real-time leaderboard updates
// TODO: Add pagination for betting history
// TODO: Implement advanced stats and charts
// TODO: Add social features (follow users, view profiles)
// TODO: Implement achievement system
