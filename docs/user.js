// User Portfolio and Leaderboard Management with Supabase Integration

// ==============================================
// PORTFOLIO DISPLAY FUNCTIONS
// ==============================================

// Display user portfolio
function displayUserPortfolio(bets, leaderboardPosition) {
    const portfolioContent = document.getElementById('portfolio-content');
    
    if (!portfolioContent) return;
    
    const currentUser = window.app?.getCurrentUser();
    
    if (!currentUser) {
        portfolioContent.innerHTML = `
            <div class="portfolio-empty">
                <div class="empty-icon">🎯</div>
                <h3>Connect Wallet to View Portfolio</h3>
                <p>Connect your wallet to see your betting history and statistics.</p>
            </div>
        `;
        return;
    }
    
    // Create portfolio sections
    const portfolioHTML = `
        <div class="portfolio-overview">
            ${createPortfolioStats(currentUser, leaderboardPosition)}
        </div>
        
        <div class="portfolio-sections">
            <div class="section-tabs">
                <button class="tab-button active" onclick="showPortfolioTab('betting-history')">
                    Betting History
                </button>
                <button class="tab-button" onclick="showPortfolioTab('statistics')">
                    Statistics
                </button>
                <button class="tab-button" onclick="showPortfolioTab('achievements')">
                    Achievements
                </button>
            </div>
            
            <div class="tab-content active" id="betting-history">
                ${createBettingHistoryTable(bets)}
            </div>
            
            <div class="tab-content" id="statistics">
                ${createStatisticsView(currentUser, bets)}
            </div>
            
            <div class="tab-content" id="achievements">
                ${createAchievementsView(currentUser, bets)}
            </div>
        </div>
    `;
    
    portfolioContent.innerHTML = portfolioHTML;
}

// Create portfolio statistics overview
function createPortfolioStats(user, leaderboardPosition) {
    const winRate = user.win_rate || 0;
    const totalWinnings = user.total_winnings || 0;
    const totalBets = user.total_bets || 0;
    const currentStreak = user.current_streak || 0;
    const ranking = leaderboardPosition?.ranking || 'Unranked';
    
    return `
        <div class="portfolio-stats">
            <div class="user-info">
                <div class="user-avatar">🎯</div>
                <div class="user-details">
                    <h2 class="user-name">${user.username}</h2>
                    <div class="user-wallet">${formatWalletAddress(user.wallet_address)}</div>
                    <div class="user-ranking">Rank: ${ranking}</div>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-label">Total Winnings</div>
                    <div class="stat-value">${formatSOL(totalWinnings)} SOL</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">🎯</div>
                    <div class="stat-label">Win Rate</div>
                    <div class="stat-value">${winRate.toFixed(1)}%</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-label">Total Bets</div>
                    <div class="stat-value">${totalBets}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">🔥</div>
                    <div class="stat-label">Current Streak</div>
                    <div class="stat-value">${currentStreak}</div>
                </div>
            </div>
        </div>
    `;
}

// Create betting history table
function createBettingHistoryTable(bets) {
    if (!bets || bets.length === 0) {
        return `
            <div class="betting-history-empty">
                <div class="empty-icon">📈</div>
                <h3>No Betting History</h3>
                <p>Your betting history will appear here after you place your first bet.</p>
                <button class="btn-primary" onclick="window.app.showMarkets()">
                    View Available Markets
                </button>
            </div>
        `;
    }
    
    const tableRows = bets.map(bet => createBettingHistoryRow(bet)).join('');
    
    return `
        <div class="betting-history">
            <div class="history-header">
                <h3>Recent Bets</h3>
                <div class="history-filters">
                    <select id="historyFilter" onchange="filterBettingHistory()">
                        <option value="all">All Bets</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                        <option value="placed">Pending</option>
                    </select>
                </div>
            </div>
            
            <div class="history-table">
                <div class="table-header">
                    <div class="col-competition">Competition</div>
                    <div class="col-bet">Your Bet</div>
                    <div class="col-amount">Amount</div>
                    <div class="col-status">Status</div>
                    <div class="col-payout">Payout</div>
                    <div class="col-date">Date</div>
                </div>
                
                <div class="table-body">
                    ${tableRows}
                </div>
            </div>
        </div>
    `;
}

// Create a single betting history row
function createBettingHistoryRow(bet) {
    const competition = bet.competitions;
    const chosenTokenSymbol = bet.chosen_token === 'token_a' ? 
        competition.token_a_symbol : competition.token_b_symbol;
    
    const statusInfo = getBetStatusInfo(bet, competition);
    const date = new Date(bet.timestamp).toLocaleDateString();
    const payout = bet.payout_amount || 0;
    
    return `
        <div class="table-row ${statusInfo.class}" data-bet-status="${bet.status}">
            <div class="col-competition">
                <div class="competition-info">
                    <div class="tokens">${competition.token_a_symbol} vs ${competition.token_b_symbol}</div>
                    <div class="competition-date">
                        ${new Date(competition.start_time).toLocaleDateString()}
                    </div>
                </div>
            </div>
            
            <div class="col-bet">
                <div class="bet-choice">
                    <div class="chosen-token">${chosenTokenSymbol}</div>
                    <div class="bet-type">Winner prediction</div>
                </div>
            </div>
            
            <div class="col-amount">
                ${formatSOL(bet.amount)} SOL
            </div>
            
            <div class="col-status">
                <div class="status-badge ${statusInfo.class}">
                    ${statusInfo.icon} ${statusInfo.text}
                </div>
            </div>
            
            <div class="col-payout">
                <div class="payout-amount ${payout > 0 ? 'positive' : ''}">
                    ${payout > 0 ? '+' : ''}${formatSOL(payout)} SOL
                </div>
            </div>
            
            <div class="col-date">
                ${date}
            </div>
        </div>
    `;
}

// Get bet status information
function getBetStatusInfo(bet, competition) {
    switch (bet.status) {
        case 'PLACED':
            if (competition.status === 'VOTING' || competition.status === 'ACTIVE') {
                return { text: 'Active', class: 'status-active', icon: '⏳' };
            } else if (competition.status === 'CLOSED') {
                return { text: 'Calculating', class: 'status-calculating', icon: '⚡' };
            }
            return { text: 'Placed', class: 'status-placed', icon: '🎯' };
            
        case 'WON':
            return { text: 'Won', class: 'status-won', icon: '🏆' };
            
        case 'LOST':
            return { text: 'Lost', class: 'status-lost', icon: '❌' };
            
        case 'CLAIMED':
            return { text: 'Claimed', class: 'status-claimed', icon: '✅' };
            
        case 'REFUNDED':
            return { text: 'Refunded', class: 'status-refunded', icon: '🔄' };
            
        default:
            return { text: 'Unknown', class: 'status-unknown', icon: '?' };
    }
}

// Create statistics view
function createStatisticsView(user, bets) {
    const stats = calculateDetailedStats(user, bets);
    
    return `
        <div class="statistics-view">
            <div class="stats-grid">
                <div class="stat-section">
                    <h4>Performance Metrics</h4>
                    <div class="metric-cards">
                        <div class="metric-card">
                            <div class="metric-label">Win Rate</div>
                            <div class="metric-value">${stats.winRate.toFixed(1)}%</div>
                            <div class="metric-change ${stats.winRateChange >= 0 ? 'positive' : 'negative'}">
                                ${stats.winRateChange >= 0 ? '+' : ''}${stats.winRateChange.toFixed(1)}%
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-label">Profit/Loss</div>
                            <div class="metric-value ${stats.profitLoss >= 0 ? 'positive' : 'negative'}">
                                ${stats.profitLoss >= 0 ? '+' : ''}${formatSOL(stats.profitLoss)} SOL
                            </div>
                            <div class="metric-change">
                                ROI: ${stats.roi.toFixed(1)}%
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-label">Best Streak</div>
                            <div class="metric-value">${stats.bestStreak}</div>
                            <div class="metric-change">Current: ${user.current_streak || 0}</div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-label">Avg Bet Size</div>
                            <div class="metric-value">${formatSOL(stats.avgBetSize)} SOL</div>
                            <div class="metric-change">Total: ${stats.totalBets} bets</div>
                        </div>
                    </div>
                </div>
                
                <div class="stat-section">
                    <h4>Token Preferences</h4>
                    <div class="token-preferences">
                        ${createTokenPreferencesChart(bets)}
                    </div>
                </div>
                
                <div class="stat-section">
                    <h4>Weekly Activity</h4>
                    <div class="activity-chart">
                        ${createActivityChart(bets)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Calculate detailed statistics
function calculateDetailedStats(user, bets) {
    const totalBets = bets.length;
    const wonBets = bets.filter(bet => bet.status === 'WON').length;
    const lostBets = bets.filter(bet => bet.status === 'LOST').length;
    const completedBets = wonBets + lostBets;
    
    const winRate = completedBets > 0 ? (wonBets / completedBets) * 100 : 0;
    
    const totalAmountBet = bets.reduce((sum, bet) => sum + parseFloat(bet.amount || 0), 0);
    const totalWinnings = bets.reduce((sum, bet) => sum + parseFloat(bet.payout_amount || 0), 0);
    const profitLoss = totalWinnings - totalAmountBet;
    const roi = totalAmountBet > 0 ? (profitLoss / totalAmountBet) * 100 : 0;
    
    const avgBetSize = totalBets > 0 ? totalAmountBet / totalBets : 0;
    
    // Calculate best streak
    let currentStreak = 0;
    let bestStreak = 0;
    
    for (const bet of bets.reverse()) {
        if (bet.status === 'WON') {
            currentStreak++;
            bestStreak = Math.max(bestStreak, currentStreak);
        } else if (bet.status === 'LOST') {
            currentStreak = 0;
        }
    }
    
    return {
        winRate,
        winRateChange: 0, // Would calculate from historical data
        profitLoss,
        roi,
        avgBetSize,
        totalBets,
        bestStreak
    };
}

// Create token preferences chart (simplified)
function createTokenPreferencesChart(bets) {
    const tokenStats = {};
    
    bets.forEach(bet => {
        const competition = bet.competitions;
        const chosenTokenSymbol = bet.chosen_token === 'token_a' ? 
            competition.token_a_symbol : competition.token_b_symbol;
        
        if (!tokenStats[chosenTokenSymbol]) {
            tokenStats[chosenTokenSymbol] = { total: 0, won: 0 };
        }
        
        tokenStats[chosenTokenSymbol].total++;
        if (bet.status === 'WON') {
            tokenStats[chosenTokenSymbol].won++;
        }
    });
    
    const sortedTokens = Object.entries(tokenStats)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);
    
    if (sortedTokens.length === 0) {
        return '<div class="no-data">No token preferences yet</div>';
    }
    
    return sortedTokens.map(([token, stats]) => {
        const winRate = stats.total > 0 ? (stats.won / stats.total) * 100 : 0;
        return `
            <div class="token-preference">
                <div class="token-symbol">${token}</div>
                <div class="token-stats">
                    <div class="bet-count">${stats.total} bets</div>
                    <div class="win-rate">${winRate.toFixed(0)}% win rate</div>
                </div>
            </div>
        `;
    }).join('');
}

// Create activity chart (simplified)
function createActivityChart(bets) {
    // Group bets by week
    const weeklyData = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekKey = getWeekKey(date);
        weeklyData[weekKey] = 0;
    }
    
    bets.forEach(bet => {
        const betDate = new Date(bet.timestamp);
        const weekKey = getWeekKey(betDate);
        if (weeklyData.hasOwnProperty(weekKey)) {
            weeklyData[weekKey]++;
        }
    });
    
    const maxBets = Math.max(...Object.values(weeklyData));
    
    return Object.entries(weeklyData).map(([week, count]) => {
        const height = maxBets > 0 ? (count / maxBets) * 100 : 0;
        return `
            <div class="activity-bar">
                <div class="bar" style="height: ${height}%"></div>
                <div class="bar-label">${week}</div>
                <div class="bar-value">${count}</div>
            </div>
        `;
    }).join('');
}

// Get week key for grouping
function getWeekKey(date) {
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Create achievements view
function createAchievementsView(user, bets) {
    const achievements = calculateAchievements(user, bets);
    
    return `
        <div class="achievements-view">
            <div class="achievements-grid">
                ${achievements.map(achievement => `
                    <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-info">
                            <div class="achievement-name">${achievement.name}</div>
                            <div class="achievement-description">${achievement.description}</div>
                            <div class="achievement-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${achievement.progress}%"></div>
                                </div>
                                <div class="progress-text">${achievement.progressText}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Calculate achievements
function calculateAchievements(user, bets) {
    const totalBets = bets.length;
    const wonBets = bets.filter(bet => bet.status === 'WON').length;
    const totalWinnings = parseFloat(user.total_winnings || 0);
    
    return [
        {
            name: 'First Steps',
            description: 'Place your first bet',
            icon: '🎯',
            unlocked: totalBets >= 1,
            progress: Math.min(totalBets, 1) * 100,
            progressText: `${Math.min(totalBets, 1)}/1`
        },
        {
            name: 'Getting Started',
            description: 'Place 10 bets',
            icon: '📈',
            unlocked: totalBets >= 10,
            progress: Math.min(totalBets / 10, 1) * 100,
            progressText: `${Math.min(totalBets, 10)}/10`
        },
        {
            name: 'First Victory',
            description: 'Win your first bet',
            icon: '🏆',
            unlocked: wonBets >= 1,
            progress: Math.min(wonBets, 1) * 100,
            progressText: `${Math.min(wonBets, 1)}/1`
        },
        {
            name: 'Profitable Trader',
            description: 'Earn 1 SOL in total winnings',
            icon: '💰',
            unlocked: totalWinnings >= 1,
            progress: Math.min(totalWinnings, 1) * 100,
            progressText: `${Math.min(totalWinnings, 1).toFixed(2)}/1.00 SOL`
        },
        {
            name: 'Hot Streak',
            description: 'Win 5 bets in a row',
            icon: '🔥',
            unlocked: (user.current_streak || 0) >= 5,
            progress: Math.min((user.current_streak || 0) / 5, 1) * 100,
            progressText: `${Math.min(user.current_streak || 0, 5)}/5`
        }
    ];
}

// ==============================================
// LEADERBOARD DISPLAY FUNCTIONS
// ==============================================

// Display leaderboard
function displayLeaderboard(leaderboardData) {
    const leaderboardContent = document.getElementById('leaderboard-content');
    
    if (!leaderboardContent) return;
    
    if (!leaderboardData || leaderboardData.length === 0) {
        leaderboardContent.innerHTML = `
            <div class="leaderboard-empty">
                <div class="empty-icon">🏆</div>
                <h3>Leaderboard Coming Soon</h3>
                <p>Start placing bets to appear on the leaderboard!</p>
            </div>
        `;
        return;
    }
    
    const currentUser = window.app?.getCurrentUser();
    const currentUserEntry = leaderboardData.find(entry => 
        entry.user_wallet === currentUser?.wallet_address);
    
    const leaderboardHTML = `
        <div class="leaderboard-header">
            <h3>Top Traders</h3>
            <div class="leaderboard-filters">
                <select id="leaderboardPeriod" onchange="filterLeaderboard()">
                    <option value="all-time">All Time</option>
                    <option value="monthly">This Month</option>
                    <option value="weekly">This Week</option>
                </select>
            </div>
        </div>
        
        ${currentUserEntry ? createUserRankCard(currentUserEntry) : ''}
        
        <div class="leaderboard-table">
            <div class="table-header">
                <div class="col-rank">Rank</div>
                <div class="col-user">Trader</div>
                <div class="col-score">Score</div>
                <div class="col-wins">Wins</div>
                <div class="col-winnings">Winnings</div>
                <div class="col-winrate">Win Rate</div>
            </div>
            
            <div class="table-body">
                ${leaderboardData.slice(0, 50).map((entry, index) => 
                    createLeaderboardRow(entry, index + 1, currentUser?.wallet_address)
                ).join('')}
            </div>
        </div>
    `;
    
    leaderboardContent.innerHTML = leaderboardHTML;
}

// Create user rank card
function createUserRankCard(userEntry) {
    return `
        <div class="user-rank-card">
            <div class="rank-info">
                <div class="rank-number">#${userEntry.ranking || 'Unranked'}</div>
                <div class="rank-label">Your Rank</div>
            </div>
            <div class="user-stats">
                <div class="stat">
                    <div class="stat-value">${userEntry.total_score?.toFixed(0) || 0}</div>
                    <div class="stat-label">Score</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${userEntry.competitions_won || 0}</div>
                    <div class="stat-label">Wins</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${formatSOL(userEntry.total_winnings || 0)}</div>
                    <div class="stat-label">Winnings</div>
                </div>
            </div>
        </div>
    `;
}

// Create leaderboard row
function createLeaderboardRow(entry, rank, currentUserWallet) {
    const isCurrentUser = entry.user_wallet === currentUserWallet;
    const rankIcon = getRankIcon(rank);
    
    return `
        <div class="leaderboard-row ${isCurrentUser ? 'current-user' : ''}">
            <div class="col-rank">
                <div class="rank-display">
                    ${rankIcon ? `<span class="rank-icon">${rankIcon}</span>` : ''}
                    <span class="rank-number">${rank}</span>
                </div>
            </div>
            
            <div class="col-user">
                <div class="user-info">
                    <div class="user-avatar">🎯</div>
                    <div class="user-details">
                        <div class="username">${entry.username || 'Anonymous'}</div>
                        <div class="wallet-address">${formatWalletAddress(entry.user_wallet)}</div>
                    </div>
                </div>
            </div>
            
            <div class="col-score">
                ${entry.total_score?.toFixed(0) || 0}
            </div>
            
            <div class="col-wins">
                ${entry.competitions_won || 0}
            </div>
            
            <div class="col-winnings">
                ${formatSOL(entry.total_winnings || 0)} SOL
            </div>
            
            <div class="col-winrate">
                ${(entry.win_percentage || 0).toFixed(1)}%
            </div>
        </div>
    `;
}

// Get rank icon for top positions
function getRankIcon(rank) {
    switch (rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return null;
    }
}

// ==============================================
// TAB MANAGEMENT
// ==============================================

// Show portfolio tab
function showPortfolioTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
}

// Filter betting history
function filterBettingHistory() {
    const filter = document.getElementById('historyFilter').value;
    const rows = document.querySelectorAll('.table-row[data-bet-status]');
    
    rows.forEach(row => {
        const status = row.getAttribute('data-bet-status');
        const shouldShow = filter === 'all' || 
            (filter === 'won' && status === 'WON') ||
            (filter === 'lost' && status === 'LOST') ||
            (filter === 'placed' && status === 'PLACED');
        
        row.style.display = shouldShow ? 'flex' : 'none';
    });
}

// Filter leaderboard
function filterLeaderboard() {
    // This would implement time-based filtering
    console.log('Filtering leaderboard by:', document.getElementById('leaderboardPeriod').value);
    // Would need to fetch filtered data from the backend
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

// Format wallet address
function formatWalletAddress(address) {
    if (!address) return '';
    if (address.startsWith('DEMO')) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format SOL amount
function formatSOL(amount) {
    return parseFloat(amount || 0).toFixed(3);
}

// Export functions for global use
window.user = {
    displayUserPortfolio,
    displayLeaderboard,
    showPortfolioTab,
    filterBettingHistory,
    filterLeaderboard
};
