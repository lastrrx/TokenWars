// Enhanced Competition.js - LIVE DATA ONLY VERSION
// Integrates competitions page with main app and Supabase database

// Global state for competitions
const CompetitionState = {
    activeCompetitions: [],
    supabaseClient: null,
    walletService: null,
    tokenService: null,
    lastUpdate: null,
    loading: false,
    selectedCompetition: null,
    userBets: new Map(),
    realTimeSubscription: null
};

/**
 * Initialize Competition System with Real Database Integration
 */
async function initializeCompetitionSystem() {
    console.log('🏁 Initializing enhanced competition system with real database...');
    
    try {
        // Get service references
        CompetitionState.supabaseClient = window.supabaseClient;
        CompetitionState.walletService = window.getWalletService?.();
        CompetitionState.tokenService = window.getTokenService?.();
        
        if (!CompetitionState.supabaseClient) {
            console.error('❌ Supabase client not available - cannot load competitions');
            showEmptyState('No database connection available');
            return;
        }
        
        // Load real competitions from database
        await loadRealCompetitions();
        
        // Set up real-time subscriptions
        setupRealTimeSubscriptions();
        
        // Start periodic updates
        startPeriodicUpdates();
        
        console.log('✅ Enhanced competition system initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize competition system:', error);
        showEmptyState('Failed to initialize competition system');
    }
}

/**
 * Load Real Competitions from Database - LIVE DATA ONLY
 */
async function loadRealCompetitions() {
    try {
        CompetitionState.loading = true;
        updateCompetitionsDisplay();
        
        console.log('📊 Loading real competitions from database...');
        
        if (!CompetitionState.supabaseClient) {
            console.error('❌ No Supabase client available');
            CompetitionState.activeCompetitions = [];
            updateCompetitionsDisplay();
            return;
        }
        
        // FIXED: Use correct Supabase syntax instead of getActiveCompetitions()
        const { data: competitions, error } = await CompetitionState.supabaseClient
            .from('competitions')
            .select('*')
            .in('status', ['SETUP', 'VOTING', 'ACTIVE', 'RUNNING']);
        
        if (error) {
            console.error('❌ Database error loading competitions:', error);
            CompetitionState.activeCompetitions = [];
            updateCompetitionsDisplay();
            return;
        }
        
        if (competitions && competitions.length > 0) {
            // Enhance with real-time data
            CompetitionState.activeCompetitions = await enhanceCompetitionsWithRealData(competitions);
            console.log(`✅ Loaded ${competitions.length} real competitions`);
        } else {
            console.log('ℹ️ No competitions found in database');
            CompetitionState.activeCompetitions = [];
        }
        
        // Load user bets if wallet connected
        await loadUserBetsIfConnected();
        
        CompetitionState.lastUpdate = new Date();
        updateCompetitionsDisplay();
        updateStatsDisplay();
        
    } catch (error) {
        console.error('❌ Failed to load real competitions:', error);
        CompetitionState.activeCompetitions = [];
        updateCompetitionsDisplay();
    } finally {
        CompetitionState.loading = false;
    }
}

/**
 * Load User Bets if Wallet Connected
 */
async function loadUserBetsIfConnected() {
    let isWalletConnected = false;
    try {
        // Try multiple wallet detection methods
        if (window.connectedUser) {
            isWalletConnected = true;
        } else if (CompetitionState.walletService) {
            if (typeof CompetitionState.walletService.isConnected === 'function') {
                isWalletConnected = CompetitionState.walletService.isConnected();
            } else if (typeof CompetitionState.walletService.getConnectionStatus === 'function') {
                const status = CompetitionState.walletService.getConnectionStatus();
                isWalletConnected = status && status.isConnected;
            }
        } else {
            // Check UI indicators
            const traderInfo = document.getElementById('traderInfo');
            const connectBtn = document.getElementById('connectWalletBtn');
            isWalletConnected = (traderInfo?.style.display !== 'none') || 
                              (connectBtn?.style.display === 'none');
        }
    } catch (error) {
        console.warn('Could not check wallet connection:', error);
        isWalletConnected = false;
    }

    if (isWalletConnected) {
        await loadUserBets();
    }
}

/**
 * Enhance Competitions with Real Token Data
 */
async function enhanceCompetitionsWithRealData(competitions) {
    const enhanced = [];
    
    for (const competition of competitions) {
        try {
            // Get token data from token service if available
            let tokenAData = null;
            let tokenBData = null;
            
            if (CompetitionState.tokenService) {
                try {
                    tokenAData = await CompetitionState.tokenService.getTokenByAddress(competition.token_a_address);
                    tokenBData = await CompetitionState.tokenService.getTokenByAddress(competition.token_b_address);
                } catch (tokenError) {
                    console.warn('Could not fetch token data:', tokenError);
                }
            }
            
            // Create enhanced competition object
            const enhancedCompetition = {
                id: competition.competition_id,
                competitionId: competition.competition_id,
                status: determineCompetitionStatus(competition),
                
                // Token A data
                tokenA: {
                    address: competition.token_a_address,
                    symbol: tokenAData?.symbol || competition.token_a_symbol,
                    name: tokenAData?.name || competition.token_a_name,
                    logo: tokenAData?.logoURI || competition.token_a_logo || generateFallbackLogo(competition.token_a_symbol),
                    currentPrice: tokenAData?.price || 0,
                    priceChange24h: tokenAData?.price_change_24h || 0,
                    marketCap: tokenAData?.market_cap || 0
                },
                
                // Token B data
                tokenB: {
                    address: competition.token_b_address,
                    symbol: tokenBData?.symbol || competition.token_b_symbol,
                    name: tokenBData?.name || competition.token_b_name,
                    logo: tokenBData?.logoURI || competition.token_b_logo || generateFallbackLogo(competition.token_b_symbol),
                    currentPrice: tokenBData?.price || 0,
                    priceChange24h: tokenBData?.price_change_24h || 0,
                    marketCap: tokenBData?.market_cap || 0
                },
                
                // Competition timing
                startTime: new Date(competition.start_time),
                votingEndTime: new Date(competition.voting_end_time),
                endTime: new Date(competition.end_time),
                timeRemaining: calculateTimeRemaining(competition),
                
                // Betting data
                participants: competition.total_bets || 0,
                prizePool: parseFloat(competition.total_pool || 0),
                tokenAVotes: competition.token_a_bets || 0,
                tokenBVotes: competition.token_b_bets || 0,
                totalBettingVolume: competition.total_betting_volume || 0,
                
                // Performance data (for running competitions)
                tokenAPerformance: competition.token_a_performance || null,
                tokenBPerformance: competition.token_b_performance || null,
                
                // Metadata
                createdAt: new Date(competition.created_at),
                isRealData: true,
                betAmount: parseFloat(competition.bet_amount || 0.1), // SOL
                platformFee: competition.platform_fee_percentage || 15 // Percentage
            };
            
            enhanced.push(enhancedCompetition);
            
        } catch (error) {
            console.error('Failed to enhance competition:', competition.competition_id, error);
        }
    }
    
    return enhanced;
}

/**
 * Determine Competition Status Based on Current Time
 */
function determineCompetitionStatus(competition) {
    const now = new Date();
    const startTime = new Date(competition.start_time);
    const votingEndTime = new Date(competition.voting_end_time);
    const endTime = new Date(competition.end_time);
    
    if (competition.status === 'RESOLVED' || competition.status === 'CANCELLED') {
        return 'completed';
    }
    
    if (now < startTime) {
        return 'upcoming';
    } else if (now >= startTime && now < votingEndTime) {
        return 'voting';
    } else if (now >= votingEndTime && now < endTime) {
        return 'running';
    } else {
        return 'completed';
    }
}

/**
 * Calculate Time Remaining for Competition
 */
function calculateTimeRemaining(competition) {
    const now = new Date();
    const status = determineCompetitionStatus(competition);
    
    switch (status) {
        case 'upcoming':
            return new Date(competition.start_time) - now;
        case 'voting':
            return new Date(competition.voting_end_time) - now;
        case 'running':
            return new Date(competition.end_time) - now;
        default:
            return 0;
    }
}

/**
 * Load User Bets for Connected Wallet
 */
async function loadUserBets() {
    try {
        let isWalletConnected = false;
        let walletAddress = null;
        
        try {
            // Method 1: Check global user object
            if (window.connectedUser && window.connectedUser.walletAddress) {
                isWalletConnected = true;
                walletAddress = window.connectedUser.walletAddress;
            }
            // Method 2: Check wallet service
            else if (CompetitionState.walletService) {
                if (typeof CompetitionState.walletService.isConnected === 'function') {
                    isWalletConnected = CompetitionState.walletService.isConnected();
                    if (isWalletConnected && typeof CompetitionState.walletService.getWalletAddress === 'function') {
                        walletAddress = CompetitionState.walletService.getWalletAddress();
                    }
                } else if (typeof CompetitionState.walletService.getConnectionStatus === 'function') {
                    const status = CompetitionState.walletService.getConnectionStatus();
                    isWalletConnected = status && status.isConnected;
                    walletAddress = status?.publicKey;
                }
            }
        } catch (error) {
            console.warn('Could not check wallet connection in loadUserBets:', error);
            isWalletConnected = false;
        }
        
        if (!isWalletConnected || !walletAddress) {
            return;
        }
        
        // Get user bets from database
        if (CompetitionState.supabaseClient) {
            const { data: bets, error } = await CompetitionState.supabaseClient
                .from('bets')
                .select('*')
                .eq('user_wallet', walletAddress)
                .in('status', ['PLACED', 'WON', 'LOST']);
            
            if (!error && bets) {
                // Map bets by competition ID
                CompetitionState.userBets.clear();
                bets.forEach(bet => {
                    CompetitionState.userBets.set(bet.competition_id, bet);
                });
                
                console.log(`✅ Loaded ${bets.length} user bets`);
            } else if (error) {
                console.error('Error loading user bets:', error);
            }
        }
        
    } catch (error) {
        console.error('Failed to load user bets:', error);
    }
}

/**
 * Update Competition Display - LIVE DATA ONLY
 */
function updateCompetitionsDisplay() {
    console.log('🎨 Updating competitions display (LIVE DATA ONLY)...');
    
    // Show loading state
    if (CompetitionState.loading) {
        showLoadingState();
        return;
    }
    
    // Always show competitions, regardless of wallet status
    const connectedView = document.getElementById('competitionsConnected');
    const disconnectedView = document.getElementById('competitionsDisconnected');
    
    if (!connectedView || !disconnectedView) {
        console.warn('⚠️ Competition view elements not found');
        return;
    }
    
    // Always show connected view with competitions
    console.log('✅ Always showing competitions (wallet-independent)');
    connectedView.style.display = 'block';
    disconnectedView.style.display = 'none';
    
    // Show competitions in the activeGrid
    const activeGrid = document.getElementById('activeGrid');
    if (activeGrid) {
        if (CompetitionState.activeCompetitions.length > 0) {
            // Check wallet status for bet button states
            let isWalletConnected = false;
            try {
                if (window.connectedUser) {
                    isWalletConnected = true;
                } else {
                    const traderInfo = document.getElementById('traderInfo');
                    const connectBtn = document.getElementById('connectWalletBtn');
                    isWalletConnected = (traderInfo?.style.display !== 'none') || 
                                      (connectBtn?.style.display === 'none');
                }
            } catch (error) {
                console.warn('Error checking wallet connection:', error);
            }
            
            console.log(`💳 Wallet connected: ${isWalletConnected}`);
            
            // Generate competition cards with wallet-aware buttons
            const competitionsHTML = CompetitionState.activeCompetitions
                .map(competition => createEnhancedCompetitionCard(competition, isWalletConnected))
                .join('');
            activeGrid.innerHTML = competitionsHTML;
            
            console.log(`🏆 Displayed ${CompetitionState.activeCompetitions.length} competitions`);
        } else {
            // Show empty state for no competitions
            activeGrid.innerHTML = createEmptyState('active');
        }
    }
    
    // Update competition count
    const activeCount = document.getElementById('activeCount');
    if (activeCount) {
        activeCount.textContent = CompetitionState.activeCompetitions.length;
    }
    
    // Set up card interactions
    setupCardInteractions();
    
    // Start or update timers
    startCompetitionTimers();
    
    console.log('✅ Competition display updated successfully (LIVE DATA ONLY)');
}

/**
 * Create Enhanced Competition Card with Wallet-Aware Buttons
 */
function createEnhancedCompetitionCard(competition, isWalletConnected = false) {
    const userBet = CompetitionState.userBets.get(competition.competitionId);
    const hasUserBet = !!userBet;
    const userPrediction = userBet?.chosen_token;
    
    const totalVotes = competition.tokenAVotes + competition.tokenBVotes;
    const tokenAPercentage = totalVotes > 0 ? (competition.tokenAVotes / totalVotes * 100) : 50;
    
    const statusLabels = {
        voting: 'Voting Open',
        running: 'Running',
        upcoming: 'Upcoming',
        completed: 'Completed'
    };
    
    const statusIcons = {
        voting: '🗳️',
        running: '⚡',
        upcoming: '⏰',
        completed: '🏁'
    };
    
    // Determine button text based on wallet and competition status
    let actionButtonText = 'View Details';
    let buttonDisabled = false;
    let buttonClass = 'action-button enhanced-action';
    
    if (competition.status === 'voting') {
        if (!isWalletConnected) {
            actionButtonText = 'Connect Wallet to Predict';
            buttonClass += ' wallet-required';
        } else if (hasUserBet) {
            actionButtonText = 'View Your Prediction';
        } else {
            actionButtonText = 'Place Prediction';
        }
    } else if (competition.status === 'running') {
        actionButtonText = 'View Live Competition';
    } else if (competition.status === 'upcoming') {
        actionButtonText = 'Voting Not Started';
        buttonDisabled = true;
    } else {
        actionButtonText = 'View Results';
    }
    
    return `
        <div class="competition-card enhanced-card" 
             data-competition-id="${competition.competitionId}"
             data-status="${competition.status}"
             onclick="openEnhancedCompetitionModal('${competition.competitionId}')">
            
            <!-- Card Status Badge -->
            <div class="card-status ${competition.status}">
                ${statusIcons[competition.status]} ${statusLabels[competition.status]}
            </div>
            
            <!-- Wallet Connection Notice for Disconnected Users -->
            ${!isWalletConnected && competition.status === 'voting' ? `
                <div class="wallet-notice">
                    <span class="wallet-icon">🔗</span>
                    <span class="wallet-text">Connect wallet to place predictions</span>
                </div>
            ` : ''}
            
            <!-- User Bet Indicator -->
            ${hasUserBet ? `
                <div class="user-bet-indicator">
                    <span class="bet-icon">🎯</span>
                    <span class="bet-text">Your Prediction: ${userPrediction === 'token_a' ? competition.tokenA.symbol : competition.tokenB.symbol}</span>
                </div>
            ` : ''}
            
            <!-- Token Battle Display -->
            <div class="token-battle enhanced-battle">
                <!-- Token A -->
                <div class="token-info ${userPrediction === 'token_a' ? 'user-selected' : ''}">
                    <img src="${competition.tokenA.logo}" 
                         alt="${competition.tokenA.symbol}" 
                         class="token-logo"
                         onerror="this.src='${generateFallbackLogo(competition.tokenA.symbol)}'" />
                    <div class="token-details">
                        <h4>${competition.tokenA.symbol}</h4>
                        <p>${truncateText(competition.tokenA.name, 15)}</p>
                        ${competition.status === 'running' && competition.tokenAPerformance !== null ? `
                            <div class="performance ${competition.tokenAPerformance >= 0 ? 'positive' : 'negative'}">
                                ${competition.tokenAPerformance >= 0 ? '+' : ''}${competition.tokenAPerformance.toFixed(2)}%
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- VS Divider -->
                <div class="vs-divider">
                    <span class="vs-text">VS</span>
                    ${competition.status !== 'upcoming' ? `
                        <div class="vote-ratio">
                            ${Math.round(tokenAPercentage)}% - ${Math.round(100 - tokenAPercentage)}%
                        </div>
                    ` : ''}
                </div>
                
                <!-- Token B -->
                <div class="token-info ${userPrediction === 'token_b' ? 'user-selected' : ''}">
                    <img src="${competition.tokenB.logo}" 
                         alt="${competition.tokenB.symbol}" 
                         class="token-logo"
                         onerror="this.src='${generateFallbackLogo(competition.tokenB.symbol)}'" />
                    <div class="token-details">
                        <h4>${competition.tokenB.symbol}</h4>
                        <p>${truncateText(competition.tokenB.name, 15)}</p>
                        ${competition.status === 'running' && competition.tokenBPerformance !== null ? `
                            <div class="performance ${competition.tokenBPerformance >= 0 ? 'positive' : 'negative'}">
                                ${competition.tokenBPerformance >= 0 ? '+' : ''}${competition.tokenBPerformance.toFixed(2)}%
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Betting Progress Bar -->
            ${competition.status !== 'upcoming' && totalVotes > 0 ? `
                <div class="betting-progress">
                    <div class="progress-fill" style="width: ${tokenAPercentage}%"></div>
                </div>
                <div class="vote-breakdown">
                    <span>${competition.tokenAVotes} votes (${Math.round(tokenAPercentage)}%)</span>
                    <span>${competition.tokenBVotes} votes (${Math.round(100 - tokenAPercentage)}%)</span>
                </div>
            ` : ''}
            
            <!-- Timer Display -->
            <div class="timer enhanced-timer">
                <span class="timer-icon">⏱️</span>
                <span class="time-remaining" 
                      data-time="${competition.timeRemaining}" 
                      data-status="${competition.status}">
                    ${formatTimeRemaining(competition.timeRemaining, competition.status)}
                </span>
            </div>
            
            <!-- Competition Stats -->
            <div class="card-stats enhanced-stats">
                <div class="stat-item">
                    <div class="stat-value">${competition.participants}</div>
                    <div class="stat-label">Participants</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${competition.prizePool.toFixed(1)} SOL</div>
                    <div class="stat-label">Prize Pool</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${competition.betAmount} SOL</div>
                    <div class="stat-label">Entry Fee</div>
                </div>
            </div>
            
            <!-- Action Button (Wallet-Aware) -->
            <button class="${buttonClass}" 
                    onclick="handleCompetitionAction('${competition.competitionId}', '${competition.status}', ${isWalletConnected}, event)"
                    ${buttonDisabled ? 'disabled' : ''}>
                ${actionButtonText}
            </button>
            
            <!-- Live Data Indicator -->
            <div class="data-indicator">
                <span class="data-dot live"></span>
                <span class="data-text">Live Data</span>
            </div>
        </div>
    `;
}

/**
 * Enhanced Competition Modal
 */
function openEnhancedCompetitionModal(competitionId) {
    const competition = CompetitionState.activeCompetitions.find(c => c.competitionId === competitionId);
    if (!competition) return;
    
    CompetitionState.selectedCompetition = competition;
    const userBet = CompetitionState.userBets.get(competitionId);
    
    const modal = document.getElementById('competitionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    if (!modal || !modalTitle || !modalContent) {
        console.warn('Modal elements not found');
        return;
    }
    
    modalTitle.textContent = `${competition.tokenA.symbol} vs ${competition.tokenB.symbol}`;
    modalContent.innerHTML = createEnhancedModalContent(competition, userBet);
    modal.classList.add('active');
    
    setupModalInteractions(competition, userBet);
}

/**
 * Create Enhanced Modal Content
 */
function createEnhancedModalContent(competition, userBet) {
    const hasUserBet = !!userBet;
    const totalVotes = competition.tokenAVotes + competition.tokenBVotes;
    const tokenAPercentage = totalVotes > 0 ? (competition.tokenAVotes / totalVotes * 100) : 50;
    
    return `
        <div class="modal-competition-details">
            <!-- Competition Header -->
            <div class="modal-header-info">
                <div class="competition-status-badge ${competition.status}">
                    ${getStatusDisplay(competition.status)}
                </div>
                <div class="competition-timing">
                    <strong>Timeline:</strong><br>
                    Voting: ${formatDate(competition.startTime)} - ${formatDate(competition.votingEndTime)}<br>
                    Competition: ${formatDate(competition.votingEndTime)} - ${formatDate(competition.endTime)}
                </div>
            </div>
            
            <!-- Token Details -->
            <div class="modal-token-comparison">
                <div class="token-card">
                    <img src="${competition.tokenA.logo}" alt="${competition.tokenA.symbol}" class="modal-token-logo" />
                    <h3>${competition.tokenA.symbol}</h3>
                    <p>${competition.tokenA.name}</p>
                    <div class="token-stats">
                        <div>Price: $${competition.tokenA.currentPrice.toFixed(6)}</div>
                        <div class="${competition.tokenA.priceChange24h >= 0 ? 'positive' : 'negative'}">
                            24h: ${competition.tokenA.priceChange24h >= 0 ? '+' : ''}${competition.tokenA.priceChange24h.toFixed(2)}%
                        </div>
                        <div>Market Cap: ${formatMarketCap(competition.tokenA.marketCap)}</div>
                    </div>
                    <div class="vote-count">
                        ${competition.tokenAVotes} votes (${Math.round(tokenAPercentage)}%)
                    </div>
                </div>
                
                <div class="vs-large">VS</div>
                
                <div class="token-card">
                    <img src="${competition.tokenB.logo}" alt="${competition.tokenB.symbol}" class="modal-token-logo" />
                    <h3>${competition.tokenB.symbol}</h3>
                    <p>${competition.tokenB.name}</p>
                    <div class="token-stats">
                        <div>Price: $${competition.tokenB.currentPrice.toFixed(6)}</div>
                        <div class="${competition.tokenB.priceChange24h >= 0 ? 'positive' : 'negative'}">
                            24h: ${competition.tokenB.priceChange24h >= 0 ? '+' : ''}${competition.tokenB.priceChange24h.toFixed(2)}%
                        </div>
                        <div>Market Cap: ${formatMarketCap(competition.tokenB.marketCap)}</div>
                    </div>
                    <div class="vote-count">
                        ${competition.tokenBVotes} votes (${Math.round(100 - tokenAPercentage)}%)
                    </div>
                </div>
            </div>
            
            <!-- User Bet Status -->
            ${hasUserBet ? `
                <div class="user-bet-status">
                    <h3>Your Prediction</h3>
                    <p>You predicted <strong>${userBet.chosen_token === 'token_a' ? competition.tokenA.symbol : competition.tokenB.symbol}</strong> will outperform</p>
                    <p>Bet Amount: ${userBet.amount} SOL</p>
                    <p>Status: ${userBet.status}</p>
                    ${userBet.payout_amount > 0 ? `<p>Potential Payout: ${userBet.payout_amount} SOL</p>` : ''}
                </div>
            ` : ''}
            
            <!-- Betting Interface -->
            ${competition.status === 'voting' && !hasUserBet ? `
                <div class="betting-interface">
                    <h3>Place Your Prediction</h3>
                    <p>Entry Fee: ${competition.betAmount} SOL</p>
                    <div class="betting-buttons">
                        <button class="bet-button token-a" onclick="placeBet('${competition.competitionId}', 'token_a')">
                            Predict ${competition.tokenA.symbol} Wins
                        </button>
                        <button class="bet-button token-b" onclick="placeBet('${competition.competitionId}', 'token_b')">
                            Predict ${competition.tokenB.symbol} Wins
                        </button>
                    </div>
                </div>
            ` : ''}
            
            <!-- Competition Rules -->
            <div class="competition-rules">
                <h3>How It Works</h3>
                <ul>
                    <li>Voting period: Place predictions during the voting window</li>
                    <li>Competition period: Token performance tracking period</li>
                    <li>Winner determined by token performance using TWAP</li>
                    <li>Winners split the prize pool (minus ${competition.platformFee}% platform fee)</li>
                    <li>Automatic payouts via smart contracts</li>
                </ul>
            </div>
        </div>
    `;
}

/**
 * Handle Competition Action with Wallet Awareness
 */
async function handleCompetitionAction(competitionId, status, isWalletConnected, event) {
    event.stopPropagation();
    
    console.log(`🎯 Competition action: ${competitionId}, status: ${status}, wallet: ${isWalletConnected}`);
    
    if (status === 'voting' && !isWalletConnected) {
        showNotification('Connect your wallet to place predictions', 'info');
        if (window.openWalletModal) {
            window.openWalletModal();
        }
        return;
    }
    
    if (status === 'voting' && isWalletConnected) {
        const userBet = CompetitionState.userBets.get(competitionId);
        if (userBet) {
            showNotification('You have already placed a prediction for this competition', 'info');
        }
    }
    
    openEnhancedCompetitionModal(competitionId);
}

/**
 * Place Bet Function
 */
async function placeBet(competitionId, chosenToken) {
    try {
        console.log(`💰 Placing bet: ${competitionId}, token: ${chosenToken}`);
        
        // Validate wallet connection
        let isWalletConnected = false;
        try {
            if (window.connectedUser) {
                isWalletConnected = true;
            } else if (CompetitionState.walletService?.isConnected) {
                isWalletConnected = CompetitionState.walletService.isConnected();
            }
        } catch (error) {
            console.warn('Error checking wallet for bet:', error);
        }
        
        if (!isWalletConnected) {
            showNotification('Wallet not connected', 'error');
            return;
        }
        
        const competition = CompetitionState.activeCompetitions.find(c => c.competitionId === competitionId);
        if (!competition) {
            showNotification('Competition not found', 'error');
            return;
        }
        
        if (competition.status !== 'voting') {
            showNotification('Voting period has ended', 'warning');
            return;
        }
        
        // Check wallet balance
        let walletBalance = 10.0; // Default
        try {
            if (CompetitionState.walletService?.getBalance) {
                walletBalance = CompetitionState.walletService.getBalance();
            } else if (window.connectedUser?.balance) {
                walletBalance = window.connectedUser.balance;
            }
        } catch (error) {
            console.warn('Could not get wallet balance:', error);
        }
        
        if (walletBalance < competition.betAmount) {
            showNotification(`Insufficient balance. Need ${competition.betAmount} SOL`, 'error');
            return;
        }
        
        const tokenName = chosenToken === 'token_a' ? competition.tokenA.symbol : competition.tokenB.symbol;
        const confirmed = confirm(`Place ${competition.betAmount} SOL bet on ${tokenName}?`);
        
        if (!confirmed) return;
        
        // Disable betting buttons
        const bettingButtons = document.querySelectorAll('.bet-button');
        bettingButtons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Processing...';
        });
        
        showNotification('Processing bet...', 'info');
        
        // Create bet record in database
        if (CompetitionState.supabaseClient) {
            let walletAddress = null;
            try {
                if (window.connectedUser?.walletAddress) {
                    walletAddress = window.connectedUser.walletAddress;
                } else if (CompetitionState.walletService?.getWalletAddress) {
                    walletAddress = CompetitionState.walletService.getWalletAddress();
                }
            } catch (error) {
                console.warn('Could not get wallet address:', error);
                throw new Error('Could not get wallet address');
            }
            
            const betData = {
                user_wallet: walletAddress,
                competition_id: competitionId,
                chosen_token: chosenToken,
                amount: competition.betAmount,
                status: 'PLACED',
                timestamp: new Date().toISOString()
            };
            
            const { data: bet, error } = await CompetitionState.supabaseClient
                .from('bets')
                .insert([betData])
                .select()
                .single();
            
            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }
            
            // Store user bet locally
            CompetitionState.userBets.set(competitionId, bet);
            
            // Update competition data
            if (chosenToken === 'token_a') {
                competition.tokenAVotes += 1;
            } else {
                competition.tokenBVotes += 1;
            }
            competition.participants += 1;
            competition.prizePool += competition.betAmount;
            
            showNotification(`Bet placed successfully on ${tokenName}!`, 'success');
            
            updateCompetitionsDisplay();
            closeCompetitionModal();
            setTimeout(() => openEnhancedCompetitionModal(competitionId), 300);
        } else {
            throw new Error('Database connection not available');
        }
        
    } catch (error) {
        console.error('Failed to place bet:', error);
        showNotification(`Failed to place bet: ${error.message}`, 'error');
        
        // Re-enable buttons
        const bettingButtons = document.querySelectorAll('.bet-button');
        bettingButtons.forEach(btn => {
            btn.disabled = false;
            btn.textContent = btn.classList.contains('token-a') ? 
                `Predict ${CompetitionState.selectedCompetition?.tokenA.symbol} Wins` :
                `Predict ${CompetitionState.selectedCompetition?.tokenB.symbol} Wins`;
        });
    }
}

/**
 * Setup Real-Time Subscriptions
 */
function setupRealTimeSubscriptions() {
    try {
        if (!CompetitionState.supabaseClient) {
            console.log('Real-time subscriptions not available - no database connection');
            return;
        }
        
        // Subscribe to competition changes
        CompetitionState.realTimeSubscription = CompetitionState.supabaseClient
            .channel('competitions_changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'competitions' },
                handleCompetitionChange
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'bets' },
                handleBetChange
            )
            .subscribe();
        
        console.log('✅ Real-time subscriptions established');
        
    } catch (error) {
        console.error('Failed to setup real-time subscriptions:', error);
    }
}

/**
 * Handle Real-Time Competition Changes
 */
function handleCompetitionChange(payload) {
    console.log('🔄 Competition changed:', payload);
    setTimeout(() => {
        loadRealCompetitions();
    }, 1000);
}

/**
 * Handle Real-Time Bet Changes
 */
function handleBetChange(payload) {
    console.log('🎯 Bet changed:', payload);
    const bet = payload.new;
    if (bet) {
        const competition = CompetitionState.activeCompetitions.find(c => c.competitionId === bet.competition_id);
        if (competition) {
            updateCompetitionsDisplay();
        }
    }
}

/**
 * Start Periodic Updates
 */
function startPeriodicUpdates() {
    setInterval(async () => {
        try {
            await loadRealCompetitions();
        } catch (error) {
            console.error('Periodic update failed:', error);
        }
    }, 5 * 60 * 1000);
    
    console.log('✅ Periodic updates started (5-minute intervals)');
}

/**
 * Start Competition Timers
 */
function startCompetitionTimers() {
    setInterval(() => {
        document.querySelectorAll('.time-remaining').forEach(timer => {
            const timeLeft = parseInt(timer.dataset.time);
            const status = timer.dataset.status;
            const newTime = Math.max(0, timeLeft - 1000);
            
            timer.dataset.time = newTime;
            timer.textContent = formatTimeRemaining(newTime, status);
            
            const card = timer.closest('.competition-card');
            if (card) {
                const compId = card.dataset.competitionId;
                const comp = CompetitionState.activeCompetitions.find(c => c.competitionId === compId);
                if (comp) {
                    comp.timeRemaining = newTime;
                    
                    const newStatus = determineCompetitionStatus({
                        start_time: comp.startTime.toISOString(),
                        voting_end_time: comp.votingEndTime.toISOString(),
                        end_time: comp.endTime.toISOString(),
                        status: comp.status
                    });
                    
                    if (newStatus !== comp.status) {
                        comp.status = newStatus;
                        setTimeout(() => updateCompetitionsDisplay(), 1000);
                    }
                }
            }
        });
    }, 1000);
}

/**
 * Update Stats Display
 */
function updateStatsDisplay() {
    const stats = calculateCompetitionStats();
    
    const updateStat = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };
    
    updateStat('totalCompetitions', stats.total);
    updateStat('totalParticipants', stats.participants.toLocaleString());
    updateStat('totalPrizePool', `${stats.prizePool.toFixed(1)} SOL`);
    updateStat('avgParticipants', Math.round(stats.avgParticipants));
}

/**
 * Calculate Competition Statistics
 */
function calculateCompetitionStats() {
    const competitions = CompetitionState.activeCompetitions;
    
    const total = competitions.length;
    const participants = competitions.reduce((sum, comp) => sum + comp.participants, 0);
    const prizePool = competitions.reduce((sum, comp) => sum + comp.prizePool, 0);
    const avgParticipants = total > 0 ? participants / total : 0;
    
    return {
        total,
        participants,
        prizePool,
        avgParticipants
    };
}

/**
 * Setup Card Interactions
 */
function setupCardInteractions() {
    document.querySelectorAll('.competition-card').forEach(card => {
        const competitionId = card.dataset.competitionId;
        if (competitionId) {
            card.style.cursor = 'pointer';
        }
    });
}

/**
 * Setup Modal Interactions
 */
function setupModalInteractions(competition, userBet) {
    console.log('Setting up modal interactions for:', competition.competitionId);
}

/**
 * Close Competition Modal
 */
function closeCompetitionModal() {
    const modal = document.getElementById('competitionModal');
    if (modal) {
        modal.classList.remove('active');
    }
    CompetitionState.selectedCompetition = null;
}

/**
 * Show Loading State
 */
function showLoadingState() {
    const activeGrid = document.getElementById('activeGrid');
    if (activeGrid) {
        activeGrid.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading live competitions...</p>
            </div>
        `;
    }
}

/**
 * Show Empty State
 */
function showEmptyState(message) {
    const activeGrid = document.getElementById('activeGrid');
    if (activeGrid) {
        activeGrid.innerHTML = createEmptyState('active', message);
    }
}

/**
 * Utility Functions
 */

function formatTimeRemaining(milliseconds, status) {
    if (milliseconds <= 0) return 'Ended';

    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    const statusPrefixes = {
        upcoming: 'Voting starts in',
        voting: 'Voting ends in',
        running: 'Ends in',
        completed: 'Ended'
    };

    const prefix = statusPrefixes[status] || '';
    
    if (days > 0) {
        return `${prefix} ${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${prefix} ${hours}h ${minutes}m`;
    } else {
        return `${prefix} ${minutes}m`;
    }
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatMarketCap(marketCap) {
    if (marketCap >= 1e9) {
        return `${(marketCap / 1e9).toFixed(1)}B`;
    } else if (marketCap >= 1e6) {
        return `${(marketCap / 1e6).toFixed(1)}M`;
    } else {
        return `${(marketCap / 1e3).toFixed(0)}K`;
    }
}

function getStatusDisplay(status) {
    const displays = {
        voting: '🗳️ Voting Open',
        running: '⚡ Running',
        upcoming: '⏰ Upcoming',
        completed: '🏁 Completed'
    };
    return displays[status] || status;
}

function generateFallbackLogo(symbol) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(symbol)}&background=8b5cf6&color=fff&size=48&bold=true`;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function createEmptyState(sectionName, customMessage) {
    const messages = {
        voting: 'No voting competitions available',
        running: 'No competitions currently running',
        upcoming: 'No upcoming competitions scheduled',
        completed: 'No recently completed competitions',
        active: 'No active competitions available'
    };
    
    const message = customMessage || messages[sectionName] || 'No competitions available';
    
    return `
        <div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>${message}</h3>
            <p>Live competitions from database will appear here when available.</p>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 400px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

/**
 * Integration Functions for Main App
 */

function initializeCompetitionsPage() {
    console.log('🏁 Initializing competitions page...');
    
    if (CompetitionState.activeCompetitions.length === 0) {
        initializeCompetitionSystem();
    } else {
        updateCompetitionsDisplay();
        updateStatsDisplay();
    }
}

function handleWalletConnectionChange(isConnected, walletAddress) {
    console.log('👛 Wallet connection changed:', isConnected, walletAddress);
    
    if (isConnected) {
        loadUserBets();
    } else {
        CompetitionState.userBets.clear();
    }
    
    updateCompetitionsDisplay();
}

function cleanupCompetitionsPage() {
    console.log('🧹 Cleaning up competitions page...');
    
    if (CompetitionState.realTimeSubscription) {
        CompetitionState.realTimeSubscription.unsubscribe();
        CompetitionState.realTimeSubscription = null;
    }
}

/**
 * Global Exports
 */
window.initializeCompetitionSystem = initializeCompetitionSystem;
window.loadRealCompetitions = loadRealCompetitions;
window.updateCompetitionsDisplay = updateCompetitionsDisplay;
window.openEnhancedCompetitionModal = openEnhancedCompetitionModal;
window.closeCompetitionModal = closeCompetitionModal;
window.handleCompetitionAction = handleCompetitionAction;
window.placeBet = placeBet;
window.initializeCompetitionsPage = initializeCompetitionsPage;
window.handleWalletConnectionChange = handleWalletConnectionChange;
window.cleanupCompetitionsPage = cleanupCompetitionsPage;

// For debugging
window.CompetitionState = CompetitionState;

console.log('✅ FIXED Competition.js loaded - LIVE DATA ONLY');
console.log('🚀 Features:');
console.log('   ✅ Real Supabase database integration with correct syntax');
console.log('   ✅ Live competition data - no demo fallbacks');
console.log('   ✅ Real-time betting and updates');
console.log('   ✅ User bet tracking from database');
console.log('   ✅ Wallet integration for predictions');
console.log('   ✅ Enhanced UI with live data indicators');
console.log('   ✅ Competition timers and status management');
console.log('   ❌ REMOVED: All demo data fallbacks');
console.log('   ❌ REMOVED: getActiveCompetitions() invalid method');
console.log('   🎯 NEW: Pure database-driven experience');

// Add CSS for live data indicators
const additionalCSS = `
.wallet-notice {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #3b82f6;
}

.wallet-icon {
    font-size: 1rem;
}

.wallet-text {
    font-weight: 500;
}

.wallet-required {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(59, 130, 246, 0.6)) !important;
}

.wallet-required:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(59, 130, 246, 0.7)) !important;
}

.data-dot.live {
    background: #22c55e;
    animation: pulse-live 2s infinite;
}

@keyframes pulse-live {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}
`;

if (!document.getElementById('competition-live-styles')) {
    const style = document.createElement('style');
    style.id = 'competition-live-styles';
    style.textContent = additionalCSS;
    document.head.appendChild(style);
}
