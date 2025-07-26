// Enhanced Portfolio Management with Complete Supabase Integration
// This replaces the content in user.js
// FIXED: Proper Supabase client reference and null statistics handling

// ==============================================
// PORTFOLIO STATE MANAGEMENT
// ==============================================

const PortfolioState = {
    currentView: 'overview',
    userData: null,
    bettingHistory: [],
    leaderboardPosition: null,
    achievements: [],
    statistics: null,
    loading: false,
    lastUpdate: null,
    supabaseClient: null,
    walletService: null
};

// ==============================================
// MAIN PORTFOLIO FUNCTIONS
// ==============================================

/**
 * Initialize Portfolio System
 */
async function initializePortfolio() {
    console.log('💼 Initializing portfolio system...');
    
    try {
        // FIXED: Get direct Supabase client instead of wrapper
        PortfolioState.supabaseClient = window.supabase;
        PortfolioState.walletService = window.getWalletService?.();
        
        // Check if user is connected
        if (!PortfolioState.walletService?.isConnected()) {
            showPortfolioDisconnectedState();
            return;
        }
        
        // Load portfolio data
        await loadPortfolioData();
        
        console.log('✅ Portfolio system initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize portfolio:', error);
        showPortfolioError(error.message);
    }
}

/**
 * FIXED: Load Complete Portfolio Data from Supabase
 */
async function loadPortfolioData() {
    try {
        PortfolioState.loading = true;
        showPortfolioLoading();
        
        const walletAddress = PortfolioState.walletService.getWalletAddress();
        
        // Load all portfolio data in parallel
        const [userData, bettingHistory, leaderboardData] = await Promise.all([
            loadUserData(walletAddress),
            loadBettingHistory(walletAddress),
            loadLeaderboardPosition(walletAddress)
        ]);
        
        // Store in state
        PortfolioState.userData = userData;
        PortfolioState.bettingHistory = bettingHistory;
        PortfolioState.leaderboardPosition = leaderboardData;
        
        // FIXED: Calculate statistics FIRST, then achievements
        PortfolioState.statistics = calculatePortfolioStatistics();
        
        // FIXED: Calculate achievements AFTER statistics are ready
        PortfolioState.achievements = calculateAchievements();
        
        PortfolioState.lastUpdate = new Date();
        
        // Display portfolio based on current view
        displayPortfolioView(PortfolioState.currentView);
        
        // REMOVED: Don't create charts here - they'll be created when switching to statistics view
        
    } catch (error) {
        console.error('Failed to load portfolio data:', error);
        showPortfolioError('Failed to load portfolio data');
    } finally {
        PortfolioState.loading = false;
    }
}

/**
 * Load User Data from Supabase
 */
async function loadUserData(walletAddress) {
    try {
        if (!PortfolioState.supabaseClient) {
            throw new Error('Supabase client not available');
        }
        
        const { data: user, error } = await PortfolioState.supabaseClient
            .from('users')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();
        
        if (error) throw error;
        
        return user;
        
    } catch (error) {
        console.error('Failed to load user data:', error);
        // Return mock data for demo
        return {
            wallet_address: walletAddress,
            username: 'Demo Trader',
            total_winnings: 0,
            total_bets: 0,
            win_rate: 0,
            current_streak: 0,
            created_at: new Date().toISOString()
        };
    }
}

/**
 * Load Betting History from Supabase
 */
async function loadBettingHistory(walletAddress) {
    try {
        if (!PortfolioState.supabaseClient) {
            throw new Error('Supabase client not available');
        }
        
        const { data: bets, error } = await PortfolioState.supabaseClient
            .from('bets')
            .select(`
                *,
                competitions (
                    competition_id,
                    token_a_symbol,
                    token_a_name,
                    token_b_symbol,
                    token_b_name,
                    start_time,
                    end_time,
                    status,
                    winner_token,
                    token_a_performance,
                    token_b_performance
                )
            `)
            .eq('user_wallet', walletAddress)
            .order('timestamp', { ascending: false });
        
        if (error) throw error;
        
        return bets || [];
        
    } catch (error) {
        console.error('Failed to load betting history:', error);
        return [];
    }
}

/**
 * Load Leaderboard Position from Supabase
 */
async function loadLeaderboardPosition(walletAddress) {
    try {
        if (!PortfolioState.supabaseClient) {
            throw new Error('Supabase client not available');
        }
        
        // Get user's leaderboard entry
        const { data: userEntry, error: userError } = await PortfolioState.supabaseClient
            .from('leaderboards')
            .select('*')
            .eq('user_wallet', walletAddress)
            .single();
        
        if (userError && userError.code !== 'PGRST116') throw userError;
        
        // Get user's rank
        if (userEntry) {
            const { count, error: countError } = await PortfolioState.supabaseClient
                .from('leaderboards')
                .select('*', { count: 'exact', head: true })
                .gte('total_score', userEntry.total_score);
            
            if (!countError) {
                userEntry.ranking = count || 0;
            }
        }
        
        return userEntry;
        
    } catch (error) {
        console.error('Failed to load leaderboard position:', error);
        return null;
    }
}

/**
 * Calculate Portfolio Statistics
 */
function calculatePortfolioStatistics() {
    const bets = PortfolioState.bettingHistory;
    const user = PortfolioState.userData;
    
    if (!bets || bets.length === 0) {
        return {
            totalBets: 0,
            wonBets: 0,
            lostBets: 0,
            pendingBets: 0,
            winRate: 0,
            totalAmountBet: 0,
            totalWinnings: 0,
            profitLoss: 0,
            roi: 0,
            avgBetSize: 0,
            bestStreak: 0,
            currentStreak: user?.current_streak || 0,
            favoriteTokens: [],
            weeklyActivity: [],
            performanceByToken: new Map()
        };
    }
    
    // Basic statistics
    const totalBets = bets.length;
    const wonBets = bets.filter(bet => bet.status === 'WON').length;
    const lostBets = bets.filter(bet => bet.status === 'LOST').length;
    const pendingBets = bets.filter(bet => bet.status === 'PLACED').length;
    const completedBets = wonBets + lostBets;
    
    const winRate = completedBets > 0 ? (wonBets / completedBets) * 100 : 0;
    
    // Financial statistics
    const totalAmountBet = bets.reduce((sum, bet) => sum + parseFloat(bet.amount || 0), 0);
    const totalWinnings = bets.reduce((sum, bet) => sum + parseFloat(bet.payout_amount || 0), 0);
    const profitLoss = totalWinnings - totalAmountBet;
    const roi = totalAmountBet > 0 ? (profitLoss / totalAmountBet) * 100 : 0;
    const avgBetSize = totalBets > 0 ? totalAmountBet / totalBets : 0;
    
    // Calculate best streak
    let currentStreak = 0;
    let bestStreak = 0;
    
    const sortedBets = [...bets].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    for (const bet of sortedBets) {
        if (bet.status === 'WON') {
            currentStreak++;
            bestStreak = Math.max(bestStreak, currentStreak);
        } else if (bet.status === 'LOST') {
            currentStreak = 0;
        }
    }
    
    // Token preferences
    const tokenStats = new Map();
    bets.forEach(bet => {
        const competition = bet.competitions;
        if (!competition) return;
        
        const chosenToken = bet.chosen_token === 'token_a' ? 
            competition.token_a_symbol : competition.token_b_symbol;
        
        if (!tokenStats.has(chosenToken)) {
            tokenStats.set(chosenToken, { 
                total: 0, 
                won: 0, 
                lost: 0,
                pending: 0,
                totalBet: 0,
                totalWon: 0
            });
        }
        
        const stats = tokenStats.get(chosenToken);
        stats.total++;
        stats.totalBet += parseFloat(bet.amount || 0);
        
        if (bet.status === 'WON') {
            stats.won++;
            stats.totalWon += parseFloat(bet.payout_amount || 0);
        } else if (bet.status === 'LOST') {
            stats.lost++;
        } else if (bet.status === 'PLACED') {
            stats.pending++;
        }
    });
    
    // Sort tokens by frequency
    const favoriteTokens = Array.from(tokenStats.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([token, stats]) => ({
            token,
            ...stats,
            winRate: stats.total > 0 ? (stats.won / (stats.won + stats.lost)) * 100 : 0,
            profitLoss: stats.totalWon - stats.totalBet
        }));
    
    // Weekly activity
    const weeklyActivity = calculateWeeklyActivity(bets);
    
    return {
        totalBets,
        wonBets,
        lostBets,
        pendingBets,
        winRate,
        totalAmountBet,
        totalWinnings,
        profitLoss,
        roi,
        avgBetSize,
        bestStreak,
        currentStreak: user?.current_streak || 0,
        favoriteTokens,
        weeklyActivity,
        performanceByToken: tokenStats
    };
}

/**
 * Calculate Weekly Activity
 */
function calculateWeeklyActivity(bets) {
    const activity = new Map();
    const now = new Date();
    
    // Initialize last 12 weeks
    for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
        
        const weekKey = weekStart.toISOString().split('T')[0];
        activity.set(weekKey, {
            week: weekKey,
            bets: 0,
            won: 0,
            lost: 0,
            amount: 0,
            winnings: 0
        });
    }
    
    // Count bets per week
    bets.forEach(bet => {
        const betDate = new Date(bet.timestamp);
        betDate.setHours(0, 0, 0, 0);
        betDate.setDate(betDate.getDate() - betDate.getDay()); // Start of week
        
        const weekKey = betDate.toISOString().split('T')[0];
        
        if (activity.has(weekKey)) {
            const weekData = activity.get(weekKey);
            weekData.bets++;
            weekData.amount += parseFloat(bet.amount || 0);
            
            if (bet.status === 'WON') {
                weekData.won++;
                weekData.winnings += parseFloat(bet.payout_amount || 0);
            } else if (bet.status === 'LOST') {
                weekData.lost++;
            }
        }
    });
    
    return Array.from(activity.values());
}

/**
 * FIXED: Calculate Achievements with proper data checking
 */
function calculateAchievements() {
    const user = PortfolioState.userData;
    const stats = PortfolioState.statistics;
    let bets = PortfolioState.bettingHistory;  // ← CHANGED from const to let
    
    console.log('🏆 Calculating achievements with:', { user, stats, bets });
    
    // FIXED: Add safety checks
    if (!stats) {
        console.warn('🏆 Statistics not available yet, returning empty achievements');
        return [];
    }
    
    if (!user) {
        console.warn('🏆 User data not available, returning empty achievements');
        return [];
    }
    
    if (!Array.isArray(bets)) {
        console.warn('🏆 Betting history not available, using empty array');
        bets = [];  // ← Now this works because bets is let, not const
    }
    
    const achievements = [
        {
            id: 'first_bet',
            name: 'First Steps',
            description: 'Place your first bet',
            icon: '🎯',
            requirement: 1,
            current: stats.totalBets || 0,
            unlocked: (stats.totalBets || 0) >= 1,
            unlockedAt: bets.length > 0 ? bets[bets.length - 1].timestamp : null
        },
        {
            id: 'ten_bets',
            name: 'Getting Started',
            description: 'Place 10 bets',
            icon: '📈',
            requirement: 10,
            current: stats.totalBets || 0,
            unlocked: (stats.totalBets || 0) >= 10
        },
        {
            id: 'first_win',
            name: 'First Victory',
            description: 'Win your first bet',
            icon: '🏆',
            requirement: 1,
            current: stats.wonBets || 0,
            unlocked: (stats.wonBets || 0) >= 1
        },
        {
            id: 'profit_1_sol',
            name: 'Profitable Trader',
            description: 'Earn 1 SOL in total winnings',
            icon: '💰',
            requirement: 1,
            current: stats.totalWinnings || 0,
            unlocked: (stats.totalWinnings || 0) >= 1
        },
        {
            id: 'win_streak_5',
            name: 'Hot Streak',
            description: 'Win 5 bets in a row',
            icon: '🔥',
            requirement: 5,
            current: stats.bestStreak || 0,
            unlocked: (stats.bestStreak || 0) >= 5
        },
        {
            id: 'high_roller',
            name: 'High Roller',
            description: 'Place 50 bets',
            icon: '🎰',
            requirement: 50,
            current: stats.totalBets || 0,
            unlocked: (stats.totalBets || 0) >= 50
        },
        {
            id: 'token_master',
            name: 'Token Master',
            description: 'Bet on 10 different tokens',
            icon: '🪙',
            requirement: 10,
            current: stats.performanceByToken ? stats.performanceByToken.size : 0,
            unlocked: stats.performanceByToken ? stats.performanceByToken.size >= 10 : false
        },
        {
            id: 'win_rate_60',
            name: 'Skilled Predictor',
            description: 'Maintain 60% win rate (min 20 bets)',
            icon: '🎖️',
            requirement: 60,
            current: stats.winRate || 0,
            unlocked: (stats.winRate || 0) >= 60 && (stats.totalBets || 0) >= 20
        },
        {
            id: 'profit_10_sol',
            name: 'Big Winner',
            description: 'Earn 10 SOL in total profit',
            icon: '💎',
            requirement: 10,
            current: Math.max(0, stats.profitLoss || 0),
            unlocked: (stats.profitLoss || 0) >= 10
        },
        {
            id: 'weekly_warrior',
            name: 'Weekly Warrior',
            description: 'Place bets for 4 consecutive weeks',
            icon: '📅',
            requirement: 4,
            current: stats.weeklyActivity ? countConsecutiveWeeks(stats.weeklyActivity) : 0,
            unlocked: stats.weeklyActivity ? countConsecutiveWeeks(stats.weeklyActivity) >= 4 : false
        }
    ];
    
    // Calculate progress percentage for each achievement
    achievements.forEach(achievement => {
        achievement.progress = Math.min(
            (achievement.current / achievement.requirement) * 100,
            100
        );
        achievement.progressText = `${Math.min(achievement.current, achievement.requirement).toFixed(
            achievement.requirement >= 1 ? 0 : 2
        )}/${achievement.requirement}`;
    });
    
    console.log('🏆 Calculated achievements:', achievements);
    return achievements;
}

/**
 * Count Consecutive Weeks with Activity
 */
function countConsecutiveWeeks(weeklyActivity) {
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    for (const week of weeklyActivity) {
        if (week.bets > 0) {
            currentConsecutive++;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
            currentConsecutive = 0;
        }
    }
    
    return maxConsecutive;
}

/**
 * FIXED: Display Portfolio View Based on Current Selection - WITH CHART TRIGGERS
 */
function displayPortfolioView(view) {
    const portfolioContent = document.getElementById('portfolio-content');
    if (!portfolioContent) return;
    
    PortfolioState.currentView = view;
    
    let content = '';
    
    switch (view) {
        case 'overview':
            content = createPortfolioOverview();
            break;
        case 'history':
            content = createBettingHistory();
            break;
        case 'statistics':
            content = createStatisticsView();
            break;
        case 'achievements':
            content = createAchievementsView();
            break;
        default:
            content = createPortfolioOverview();
    }
    
    portfolioContent.innerHTML = content;
    
    // Update active tab
    updateActiveTab(view);
    
    // FIXED: Create charts AFTER the HTML is rendered and view is switched
    if (view === 'statistics') {
        console.log('📊 Statistics view loaded, creating charts...');
        
        // Wait for DOM to update, then create charts
        setTimeout(async () => {
            try {
                await createStatisticsCharts();
                console.log('✅ Statistics charts created successfully');
            } catch (error) {
                console.error('❌ Error creating statistics charts:', error);
            }
        }, 100); // Small delay to ensure DOM is ready
    }
}

/**
 * Create Portfolio Overview
 */
function createPortfolioOverview() {
    const user = PortfolioState.userData;
    const stats = PortfolioState.statistics;
    const ranking = PortfolioState.leaderboardPosition?.ranking || 'Unranked';
    
    return `
        <div class="portfolio-overview">
            <div class="portfolio-stats">
                <div class="user-info">
                    <div class="user-avatar">${user?.avatar || '🎯'}</div>
                    <div class="user-details">
                        <h2 class="user-name">${user?.username || 'Trader'}</h2>
                        <div class="user-wallet">${formatWalletAddress(user?.wallet_address)}</div>
                        <div class="user-ranking">Rank: #${ranking}</div>
                    </div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-label">Total Winnings</div>
                        <div class="stat-value">${formatSOL(stats.totalWinnings)} SOL</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-label">Win Rate</div>
                        <div class="stat-value">${stats.winRate.toFixed(1)}%</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-label">Total Bets</div>
                        <div class="stat-value">${stats.totalBets}</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🔥</div>
                        <div class="stat-label">Current Streak</div>
                        <div class="stat-value">${stats.currentStreak}</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">💎</div>
                        <div class="stat-label">Profit/Loss</div>
                        <div class="stat-value ${stats.profitLoss >= 0 ? 'positive' : 'negative'}">
                            ${stats.profitLoss >= 0 ? '+' : ''}${formatSOL(stats.profitLoss)} SOL
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-label">ROI</div>
                        <div class="stat-value ${stats.roi >= 0 ? 'positive' : 'negative'}">
                            ${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="portfolio-sections">
                <div class="section-tabs">
                    <button class="tab-button" onclick="displayPortfolioView('history')">
                        View Betting History
                    </button>
                    <button class="tab-button" onclick="displayPortfolioView('statistics')">
                        Detailed Statistics
                    </button>
                    <button class="tab-button" onclick="displayPortfolioView('achievements')">
                        Achievements
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create Betting History View
 */
function createBettingHistory() {
    const bets = PortfolioState.bettingHistory;
    
    if (!bets || bets.length === 0) {
        return `
            <div class="betting-history-empty">
                <div class="empty-icon">📈</div>
                <h3>No Betting History</h3>
                <p>Your betting history will appear here after you place your first bet.</p>
                <button class="btn-primary" onclick="window.app.showPage('competitions')">
                    View Competitions
                </button>
            </div>
        `;
    }
    
    return `
        <div class="betting-history">
            <div class="history-header">
                <h3>Betting History</h3>
                <div class="history-filters">
                    <select id="historyFilter" class="filter-select" onchange="filterBettingHistory()">
                        <option value="all">All Bets</option>
                        <option value="WON">Won</option>
                        <option value="LOST">Lost</option>
                        <option value="PLACED">Pending</option>
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
                
                <div class="table-body" id="bettingHistoryTable">
                    ${bets.map(bet => createBettingHistoryRow(bet)).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Create Single Betting History Row
 */
function createBettingHistoryRow(bet) {
    const competition = bet.competitions;
    if (!competition) return '';
    
    const chosenTokenSymbol = bet.chosen_token === 'token_a' ? 
        competition.token_a_symbol : competition.token_b_symbol;
    
    const statusInfo = getBetStatusInfo(bet, competition);
    const date = new Date(bet.timestamp).toLocaleDateString();
    const payout = parseFloat(bet.payout_amount || 0);
    
    return `
        <div class="table-row ${statusInfo.class}" data-bet-status="${bet.status}">
            <div class="col-competition" data-label="Competition">
                <div class="competition-info">
                    <div class="tokens">${competition.token_a_symbol} vs ${competition.token_b_symbol}</div>
                    <div class="competition-date">
                        ${new Date(competition.start_time).toLocaleDateString()}
                    </div>
                </div>
            </div>
            
            <div class="col-bet" data-label="Your Bet">
                <div class="bet-choice">
                    <div class="chosen-token">${chosenTokenSymbol}</div>
                    <div class="bet-type">Winner prediction</div>
                </div>
            </div>
            
            <div class="col-amount" data-label="Amount">
                ${formatSOL(bet.amount)} SOL
            </div>
            
            <div class="col-status" data-label="Status">
                <div class="status-badge ${statusInfo.class}">
                    ${statusInfo.icon} ${statusInfo.text}
                </div>
            </div>
            
            <div class="col-payout" data-label="Payout">
                <div class="payout-amount ${payout > 0 ? 'positive' : ''}">
                    ${payout > 0 ? '+' : ''}${formatSOL(payout)} SOL
                </div>
            </div>
            
            <div class="col-date" data-label="Date">
                ${date}
            </div>
        </div>
    `;
}

/**
 * Get Bet Status Information
 */
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

/**
 * FIXED: Create Statistics View with proper chart containers
 */
function createStatisticsView() {
    const stats = PortfolioState.statistics;
    
    // FIXED: Add null check for statistics
    if (!stats) {
        return `
            <div class="statistics-loading">
                <div class="loading-spinner"></div>
                <h3>Loading Statistics...</h3>
                <p>Please wait while we calculate your portfolio statistics.</p>
            </div>
        `;
    }
    
    return `
        <div class="statistics-view">
            <div class="stat-section">
                <h4>Performance Metrics</h4>
                <div class="metric-cards">
                    <div class="metric-card">
                        <div class="metric-label">Win Rate</div>
                        <div class="metric-value">${stats.winRate.toFixed(1)}%</div>
                        <div class="metric-change">
                            ${stats.wonBets} won / ${stats.lostBets} lost
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
                        <div class="metric-change">Current: ${stats.currentStreak}</div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-label">Avg Bet Size</div>
                        <div class="metric-value">${formatSOL(stats.avgBetSize)} SOL</div>
                        <div class="metric-change">Total: ${stats.totalBets} bets</div>
                    </div>
                </div>
            </div>
            
            <!-- NEW: Charts Section with proper container IDs -->
            <div class="stat-section">
                <h4>Performance Charts</h4>
                <div class="portfolio-charts-grid">
                    <!-- Win Rate Chart -->
                    <div class="portfolio-chart-card">
                        <div class="chart-card-header">
                            <div class="chart-card-icon">📈</div>
                            <div>
                                <h3 class="chart-card-title">Win Rate Trend</h3>
                                <p class="chart-card-subtitle">Your prediction accuracy over time</p>
                            </div>
                        </div>
                        <div class="chart-container" id="user-win-rate-chart">
                            <div class="chart-loading">
                                <div class="chart-loading-spinner"></div>
                                <div class="chart-loading-text">Loading chart...</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Profit/Loss Chart -->
                    <div class="portfolio-chart-card">
                        <div class="chart-card-header">
                            <div class="chart-card-icon">💰</div>
                            <div>
                                <h3 class="chart-card-title">Profit/Loss Over Time</h3>
                                <p class="chart-card-subtitle">Your earnings and losses by period</p>
                            </div>
                        </div>
                        <div class="chart-container" id="user-profit-loss-chart">
                            <div class="chart-loading">
                                <div class="chart-loading-spinner"></div>
                                <div class="chart-loading-text">Loading chart...</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Token Performance Chart -->
                    <div class="portfolio-chart-card">
                        <div class="chart-card-header">
                            <div class="chart-card-icon">🪙</div>
                            <div>
                                <h3 class="chart-card-title">Token Performance</h3>
                                <p class="chart-card-subtitle">Your success rate by token</p>
                            </div>
                        </div>
                        <div class="chart-container" id="user-token-performance-chart">
                            <div class="chart-loading">
                                <div class="chart-loading-spinner"></div>
                                <div class="chart-loading-text">Loading chart...</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Betting Distribution Chart -->
                    <div class="portfolio-chart-card">
                        <div class="chart-card-header">
                            <div class="chart-card-icon">📊</div>
                            <div>
                                <h3 class="chart-card-title">Betting Distribution</h3>
                                <p class="chart-card-subtitle">Your token choice preferences</p>
                            </div>
                        </div>
                        <div class="chart-container" id="user-betting-distribution-chart">
                            <div class="chart-loading">
                                <div class="chart-loading-spinner"></div>
                                <div class="chart-loading-text">Loading chart...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="stat-section">
                <h4>Token Preferences</h4>
                <div class="token-preferences">
                    ${createTokenPreferencesChart(stats.favoriteTokens)}
                </div>
            </div>
            
            <div class="stat-section">
                <h4>Weekly Activity</h4>
                <div class="activity-chart">
                    ${createActivityChart(stats.weeklyActivity)}
                </div>
            </div>
        </div>
    `;
}

/**
 * Create Token Preferences Chart
 */
function createTokenPreferencesChart(favoriteTokens) {
    if (favoriteTokens.length === 0) {
        return '<div class="no-data">No token preferences yet</div>';
    }
    
    return favoriteTokens.map(tokenData => {
        const winRate = tokenData.winRate || 0;
        const profitClass = tokenData.profitLoss >= 0 ? 'positive' : 'negative';
        
        return `
            <div class="token-preference">
                <div class="token-symbol">${tokenData.token}</div>
                <div class="token-stats">
                    <div class="bet-count">${tokenData.total} bets</div>
                    <div class="win-rate">${winRate.toFixed(0)}% win rate</div>
                    <div class="profit ${profitClass}">
                        ${tokenData.profitLoss >= 0 ? '+' : ''}${formatSOL(tokenData.profitLoss)} SOL
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Create Activity Chart
 */
function createActivityChart(weeklyActivity) {
    if (!weeklyActivity || weeklyActivity.length === 0) {
        return '<div class="no-data">No activity data yet</div>';
    }
    
    const maxBets = Math.max(...weeklyActivity.map(w => w.bets), 1);
    
    // Show last 8 weeks
    const recentWeeks = weeklyActivity.slice(-8);
    
    return recentWeeks.map(week => {
        const height = week.bets > 0 ? (week.bets / maxBets) * 100 : 0;
        const weekDate = new Date(week.week);
        const label = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return `
            <div class="activity-bar">
                <div class="bar" style="height: ${height}%"></div>
                <div class="bar-label">${label}</div>
                <div class="bar-value">${week.bets}</div>
            </div>
        `;
    }).join('');
}

/**
 * Create Achievements View
 */
function createAchievementsView() {
    const achievements = PortfolioState.achievements;
    
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalCount = achievements.length;
    
    return `
        <div class="achievements-view">
            <div class="achievements-header">
                <h3>Achievements</h3>
                <p>${unlockedCount} / ${totalCount} Unlocked</p>
            </div>
            
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

/**
 * FIXED: Create charts for statistics view - SIMPLIFIED VERSION
 */
async function createStatisticsCharts() {
    try {
        console.log('📊 Creating statistics charts...');
        
        const walletAddress = PortfolioState.walletService?.getWalletAddress();
        if (!walletAddress) {
            console.warn('📊 No wallet address available for charts');
            return;
        }
        
        // Check if chart service is available
        if (typeof window.chartService === 'undefined') {
            console.warn('📊 Chart service not available');
            return;
        }
        
        // Create each chart individually with error handling
        const chartConfigs = [
            {
                containerId: 'user-win-rate-chart',
                createFunction: window.createUserWinRateChart,
                name: 'Win Rate Chart'
            },
            {
                containerId: 'user-profit-loss-chart', 
                createFunction: window.createUserProfitLossChart,
                name: 'Profit/Loss Chart'
            },
            {
                containerId: 'user-token-performance-chart',
                createFunction: (containerId, wallet) => {
                    // Token performance chart - use sample data for now
                    const sampleData = window.chartService.generateSampleData().tokenPerformance;
                    return window.chartService.createTokenPerformanceChart(containerId, sampleData);
                },
                name: 'Token Performance Chart'
            },
            {
                containerId: 'user-betting-distribution-chart',
                createFunction: window.createUserBettingDistribution,
                name: 'Betting Distribution Chart'
            }
        ];
        
        // Create charts one by one
        for (const config of chartConfigs) {
            try {
                console.log(`📊 Creating ${config.name}...`);
                
                // Check if container exists
                const container = document.getElementById(config.containerId);
                if (!container) {
                    console.warn(`📊 Container ${config.containerId} not found`);
                    continue;
                }
                
                // Clear loading state
                container.innerHTML = '';
                
                // Create chart
                if (typeof config.createFunction === 'function') {
                    await config.createFunction(config.containerId, walletAddress);
                    console.log(`✅ ${config.name} created successfully`);
                } else {
                    console.warn(`📊 Function for ${config.name} not available`);
                    // Show placeholder
                    container.innerHTML = `
                        <div class="chart-placeholder">
                            <div class="placeholder-icon">📊</div>
                            <div class="placeholder-text">Chart coming soon</div>
                        </div>
                    `;
                }
                
            } catch (error) {
                console.error(`❌ Error creating ${config.name}:`, error);
                
                // Show error placeholder
                const container = document.getElementById(config.containerId);
                if (container) {
                    container.innerHTML = `
                        <div class="chart-placeholder">
                            <div class="placeholder-icon">⚠️</div>
                            <div class="placeholder-text">Chart unavailable</div>
                        </div>
                    `;
                }
            }
        }
        
        console.log('📊 All statistics charts processing completed');
        
    } catch (error) {
        console.error('❌ Error in createStatisticsCharts:', error);
    }
}

/**
 * Update Active Tab
 */
function updateActiveTab(view) {
    const portfolioViewSelect = document.getElementById('portfolio-view');
    if (portfolioViewSelect) {
        portfolioViewSelect.value = view;
    }
}

/**
 * Show Portfolio Loading State
 */
function showPortfolioLoading() {
    const portfolioContent = document.getElementById('portfolio-content');
    if (portfolioContent) {
        portfolioContent.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading your portfolio...</p>
            </div>
        `;
    }
}

/**
 * Show Portfolio Disconnected State
 */
function showPortfolioDisconnectedState() {
    const portfolioContent = document.getElementById('portfolio-content');
    if (portfolioContent) {
        portfolioContent.innerHTML = `
            <div class="portfolio-empty">
                <div class="empty-icon">🔗</div>
                <h3>Connect Wallet to View Portfolio</h3>
                <p>Connect your wallet to see your betting history, statistics, and achievements.</p>
                <button class="btn-primary" onclick="window.openWalletModal()">
                    Connect Wallet
                </button>
            </div>
        `;
    }
}

/**
 * Show Portfolio Error State
 */
function showPortfolioError(message) {
    const portfolioContent = document.getElementById('portfolio-content');
    if (portfolioContent) {
        portfolioContent.innerHTML = `
            <div class="portfolio-empty">
                <div class="empty-icon">⚠️</div>
                <h3>Error Loading Portfolio</h3>
                <p>${message}</p>
                <button class="btn-primary" onclick="refreshPortfolioData()">
                    Try Again
                </button>
            </div>
        `;
    }
}

/**
 * Handle Portfolio View Change
 */
function handlePortfolioViewChange() {
    const select = document.getElementById('portfolio-view');
    if (select) {
        displayPortfolioView(select.value);
    }
}

/**
 * Filter Betting History
 */
function filterBettingHistory() {
    const filter = document.getElementById('historyFilter')?.value || 'all';
    const rows = document.querySelectorAll('.table-row[data-bet-status]');
    
    rows.forEach(row => {
        const status = row.getAttribute('data-bet-status');
        const shouldShow = filter === 'all' || status === filter;
        row.style.display = shouldShow ? '' : 'none';
    });
}

/**
 * Refresh Portfolio Data
 */
async function refreshPortfolioData() {
    console.log('🔄 Refreshing portfolio data...');
    await loadPortfolioData();
}

/**
 * Utility Functions
 */
function formatWalletAddress(address) {
    if (!address) return '';
    if (address.startsWith('DEMO')) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatSOL(amount) {
    return parseFloat(amount || 0).toFixed(3);
}

/**
 * Export Functions for Global Use
 */
window.portfolio = {
    initializePortfolio,
    loadPortfolioData,
    displayPortfolioView,
    handlePortfolioViewChange,
    filterBettingHistory,
    refreshPortfolioData,
    PortfolioState
};

// Also export individual functions for backward compatibility
window.initializePortfolio = initializePortfolio;
window.displayPortfolioView = displayPortfolioView;
window.handlePortfolioViewChange = handlePortfolioViewChange;
window.filterBettingHistory = filterBettingHistory;
window.refreshPortfolioData = refreshPortfolioData;

console.log('✅ Enhanced Portfolio System loaded with Supabase integration');
console.log('🔧 FIXED: Proper Supabase client reference (window.supabase)');
console.log('🔧 FIXED: Added null check for statistics in createStatisticsView()');
console.log('🔧 FIXED: Chart triggers added to displayPortfolioView()');
console.log('🔧 FIXED: Graceful loading state when statistics are null');

// Add click event listener to Statistics tab
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('portfolio-tab') && e.target.dataset.tab === 'statistics') {
        setTimeout(() => {
            window.displayPortfolioView('statistics');
        }, 100);
    }
});
