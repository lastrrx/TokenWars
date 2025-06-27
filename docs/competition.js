// Enhanced Competition.js - Real Database Integration
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
            console.warn('⚠️ Supabase client not available, using demo data');
            await loadDemoCompetitions();
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
        // Fallback to demo data
        await loadDemoCompetitions();
    }
}

/**
 * Load Real Competitions from Database
 */
async function loadRealCompetitions() {
    try {
        CompetitionState.loading = true;
        updateCompetitionsDisplay();
        
        console.log('📊 Loading real competitions from database...');
        
        // Get competitions using supabase client
        const competitions = await CompetitionState.supabaseClient.getActiveCompetitions();
        
        if (competitions && competitions.length > 0) {
            // Enhance with real-time data
            CompetitionState.activeCompetitions = await enhanceCompetitionsWithRealData(competitions);
            console.log(`✅ Loaded ${competitions.length} real competitions`);
        } else {
            console.log('ℹ️ No real competitions found, loading demo data');
            await loadDemoCompetitions();
            return;
        }
        
        // Load user bets if wallet connected (FIXED)
let isWalletConnected = false;
try {
    if (CompetitionState.walletService) {
        if (typeof CompetitionState.walletService.isConnected === 'function') {
            isWalletConnected = CompetitionState.walletService.isConnected();
        } else if (typeof CompetitionState.walletService.getConnectionStatus === 'function') {
            const status = CompetitionState.walletService.getConnectionStatus();
            isWalletConnected = status && status.isConnected;
        }
    }
} catch (error) {
    console.warn('Could not check wallet connection:', error);
    isWalletConnected = false;
}

if (isWalletConnected) {
            await loadUserBets();
        }
        
        CompetitionState.lastUpdate = new Date();
        updateCompetitionsDisplay();
        updateStatsDisplay();
        
    } catch (error) {
        console.error('❌ Failed to load real competitions:', error);
        await loadDemoCompetitions();
    } finally {
        CompetitionState.loading = false;
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
                    logo: tokenAData?.logoURI || generateFallbackLogo(competition.token_a_symbol),
                    currentPrice: tokenAData?.price || 0,
                    priceChange24h: tokenAData?.price_change_24h || 0,
                    marketCap: tokenAData?.market_cap || 0
                },
                
                // Token B data
                tokenB: {
                    address: competition.token_b_address,
                    symbol: tokenBData?.symbol || competition.token_b_symbol,
                    name: tokenBData?.name || competition.token_b_name,
                    logo: tokenBData?.logoURI || generateFallbackLogo(competition.token_b_symbol),
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
                tokenAPerformance: competition.token_a_current_performance || null,
                tokenBPerformance: competition.token_b_current_performance || null,
                
                // Metadata
                createdAt: new Date(competition.created_at),
                isRealData: true,
                betAmount: 0.1, // SOL
                platformFee: 15 // Percentage
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
        // Check wallet connection properly (FIXED)
        let isWalletConnected = false;
        try {
            if (CompetitionState.walletService) {
                if (typeof CompetitionState.walletService.isConnected === 'function') {
                    isWalletConnected = CompetitionState.walletService.isConnected();
                } else if (typeof CompetitionState.walletService.getConnectionStatus === 'function') {
                    const status = CompetitionState.walletService.getConnectionStatus();
                    isWalletConnected = status && status.isConnected;
                }
            }
        } catch (error) {
            console.warn('Could not check wallet connection in loadUserBets:', error);
            isWalletConnected = false;
        }
        
        if (!isWalletConnected) {
            return;
        }
        
        const walletAddress = CompetitionState.walletService.getWalletAddress();
        
        // Try to get user bets from database
        if (CompetitionState.supabaseClient?.getSupabaseClient) {
            const supabase = CompetitionState.supabaseClient.getSupabaseClient();
            
            const { data: bets, error } = await supabase
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
            }
        }
        
    } catch (error) {
        console.error('Failed to load user bets:', error);
    }
}

/**
 * Update Competition Display with Enhanced UI
 */
function updateCompetitionsDisplay() {
    console.log('🎨 Updating competitions display...');
    
    // Show loading state
    if (CompetitionState.loading) {
        showLoadingState();
        return;
    }
    
    // Group competitions by status
    const competitionsByStatus = groupCompetitionsByStatus();
    
    // Update each section
    updateSection('voting', competitionsByStatus.voting);
    updateSection('running', competitionsByStatus.running);
    updateSection('upcoming', competitionsByStatus.upcoming);
    updateSection('completed', competitionsByStatus.completed);
    
    // Update counts
    updateSectionCounts(competitionsByStatus);
    
    // Set up card interactions
    setupCardInteractions();
    
    // Start or update timers
    startCompetitionTimers();
    
    console.log('✅ Competition display updated successfully');
}

/**
 * Group Competitions by Status
 */
function groupCompetitionsByStatus() {
    const groups = {
        voting: [],
        running: [],
        upcoming: [],
        completed: []
    };
    
    CompetitionState.activeCompetitions.forEach(competition => {
        const status = competition.status;
        if (groups[status]) {
            groups[status].push(competition);
        }
    });
    
    // Sort each group
    Object.keys(groups).forEach(status => {
        groups[status].sort((a, b) => {
            if (status === 'completed') {
                return b.endTime - a.endTime; // Most recent first
            } else {
                return a.timeRemaining - b.timeRemaining; // Ending soonest first
            }
        });
    });
    
    return groups;
}

/**
 * Update Individual Section
 */
function updateSection(sectionName, competitions) {
    const grid = document.getElementById(`${sectionName}Grid`);
    if (!grid) return;
    
    if (competitions.length === 0) {
        grid.innerHTML = createEmptyState(sectionName);
        return;
    }
    
    const cardsHTML = competitions.map(competition => 
        createEnhancedCompetitionCard(competition)
    ).join('');
    
    grid.innerHTML = cardsHTML;
}

/**
 * Create Enhanced Competition Card with Real Data
 */
function createEnhancedCompetitionCard(competition) {
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
    
    return `
        <div class="competition-card enhanced-card" 
             data-competition-id="${competition.competitionId}"
             data-status="${competition.status}"
             onclick="openEnhancedCompetitionModal('${competition.competitionId}')">
            
            <!-- Card Status Badge -->
            <div class="card-status ${competition.status}">
                ${statusIcons[competition.status]} ${statusLabels[competition.status]}
            </div>
            
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
            
            <!-- Action Button -->
            <button class="action-button enhanced-action" 
                    onclick="handleCompetitionAction('${competition.competitionId}', '${competition.status}', event)"
                    ${competition.status === 'upcoming' ? 'disabled' : ''}>
                ${getActionButtonText(competition.status, hasUserBet)}
            </button>
            
            <!-- Real Data Indicator -->
            <div class="data-indicator">
                <span class="data-dot ${competition.isRealData ? 'live' : 'demo'}"></span>
                <span class="data-text">${competition.isRealData ? 'Live Data' : 'Demo Data'}</span>
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
    
    // Set up modal interactions
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
                    <li>Voting period: 3 days to place predictions</li>
                    <li>Competition period: 7 days of price tracking</li>
                    <li>Winner determined by token performance using TWAP</li>
                    <li>Winners split the prize pool (minus ${competition.platformFee}% platform fee)</li>
                    <li>Automatic payouts via smart contracts</li>
                </ul>
            </div>
        </div>
    `;
}

/**
 * Handle Competition Action (Betting)
 */
async function handleCompetitionAction(competitionId, status, event) {
    event.stopPropagation();
    
    console.log(`🎯 Competition action: ${competitionId}, status: ${status}`);
    
    if (status === 'voting') {
        // Check wallet connection
        if (!CompetitionState.walletService?.isConnected()) {
            showNotification('Please connect your wallet to place predictions', 'warning');
            // Trigger wallet connection modal
            if (window.openWalletModal) {
                window.openWalletModal();
            }
            return;
        }
        
        // Check if user already has a bet
        const userBet = CompetitionState.userBets.get(competitionId);
        if (userBet) {
            showNotification('You have already placed a prediction for this competition', 'info');
            openEnhancedCompetitionModal(competitionId);
            return;
        }
        
        // Open detailed modal for betting
        openEnhancedCompetitionModal(competitionId);
    } else {
        // Open modal for viewing details
        openEnhancedCompetitionModal(competitionId);
    }
}

/**
 * Place Bet Function
 */
async function placeBet(competitionId, chosenToken) {
    try {
        console.log(`💰 Placing bet: ${competitionId}, token: ${chosenToken}`);
        
        // Validate wallet connection
        if (!CompetitionState.walletService?.isConnected()) {
            showNotification('Wallet not connected', 'error');
            return;
        }
        
        const competition = CompetitionState.activeCompetitions.find(c => c.competitionId === competitionId);
        if (!competition) {
            showNotification('Competition not found', 'error');
            return;
        }
        
        // Check if betting is still open
        if (competition.status !== 'voting') {
            showNotification('Voting period has ended', 'warning');
            return;
        }
        
        // Check wallet balance
        const walletBalance = CompetitionState.walletService.getBalance();
        if (walletBalance < competition.betAmount) {
            showNotification(`Insufficient balance. Need ${competition.betAmount} SOL`, 'error');
            return;
        }
        
        // Show confirmation
        const tokenName = chosenToken === 'token_a' ? competition.tokenA.symbol : competition.tokenB.symbol;
        const confirmed = confirm(`Place ${competition.betAmount} SOL bet on ${tokenName}?`);
        
        if (!confirmed) return;
        
        // Disable betting buttons during transaction
        const bettingButtons = document.querySelectorAll('.bet-button');
        bettingButtons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Processing...';
        });
        
        showNotification('Processing bet...', 'info');
        
        // Create bet record in database
        if (CompetitionState.supabaseClient?.getSupabaseClient) {
            const supabase = CompetitionState.supabaseClient.getSupabaseClient();
            const walletAddress = CompetitionState.walletService.getWalletAddress();
            
            const betData = {
                user_wallet: walletAddress,
                competition_id: competitionId,
                chosen_token: chosenToken,
                amount: competition.betAmount,
                status: 'PLACED',
                timestamp: new Date().toISOString()
            };
            
            const { data: bet, error } = await supabase
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
            
            // Refresh display
            updateCompetitionsDisplay();
            
            // Close modal and reopen with updated data
            closeCompetitionModal();
            setTimeout(() => openEnhancedCompetitionModal(competitionId), 300);
            
        } else {
            // Demo mode - simulate bet placement
            showNotification(`Demo bet placed on ${tokenName}!`, 'success');
            
            // Update local data
            const demoBet = {
                competition_id: competitionId,
                chosen_token: chosenToken,
                amount: competition.betAmount,
                status: 'PLACED'
            };
            
            CompetitionState.userBets.set(competitionId, demoBet);
            
            if (chosenToken === 'token_a') {
                competition.tokenAVotes += 1;
            } else {
                competition.tokenBVotes += 1;
            }
            competition.participants += 1;
            competition.prizePool += competition.betAmount;
            
            updateCompetitionsDisplay();
            closeCompetitionModal();
            setTimeout(() => openEnhancedCompetitionModal(competitionId), 300);
        }
        
    } catch (error) {
        console.error('Failed to place bet:', error);
        showNotification(`Failed to place bet: ${error.message}`, 'error');
        
        // Re-enable buttons
        const bettingButtons = document.querySelectorAll('.bet-button');
        bettingButtons.forEach(btn => {
            btn.disabled = false;
        });
    }
}

/**
 * Setup Real-Time Subscriptions
 */
function setupRealTimeSubscriptions() {
    try {
        if (!CompetitionState.supabaseClient?.getSupabaseClient) {
            console.log('Real-time subscriptions not available');
            return;
        }
        
        const supabase = CompetitionState.supabaseClient.getSupabaseClient();
        
        // Subscribe to competition changes
        CompetitionState.realTimeSubscription = supabase
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
    
    // Refresh competitions data
    setTimeout(() => {
        loadRealCompetitions();
    }, 1000);
}

/**
 * Handle Real-Time Bet Changes
 */
function handleBetChange(payload) {
    console.log('🎯 Bet changed:', payload);
    
    // Update local competition data
    const bet = payload.new;
    if (bet) {
        const competition = CompetitionState.activeCompetitions.find(c => c.competitionId === bet.competition_id);
        if (competition) {
            // Recalculate vote counts and prize pool
            // This is a simplified update - in production you'd want to refetch the data
            updateCompetitionsDisplay();
        }
    }
}

/**
 * Start Periodic Updates
 */
function startPeriodicUpdates() {
    // Update every 5 minutes
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
    // Update timers every second
    setInterval(() => {
        document.querySelectorAll('.time-remaining').forEach(timer => {
            const timeLeft = parseInt(timer.dataset.time);
            const status = timer.dataset.status;
            const newTime = Math.max(0, timeLeft - 1000);
            
            timer.dataset.time = newTime;
            timer.textContent = formatTimeRemaining(newTime, status);
            
            // Update competition object
            const card = timer.closest('.competition-card');
            if (card) {
                const compId = card.dataset.competitionId;
                const comp = CompetitionState.activeCompetitions.find(c => c.competitionId === compId);
                if (comp) {
                    comp.timeRemaining = newTime;
                    
                    // Check if status needs to change
                    const newStatus = determineCompetitionStatus({
                        start_time: comp.startTime.toISOString(),
                        voting_end_time: comp.votingEndTime.toISOString(),
                        end_time: comp.endTime.toISOString(),
                        status: comp.status
                    });
                    
                    if (newStatus !== comp.status) {
                        comp.status = newStatus;
                        // Trigger a display refresh
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
    
    // Update stats elements if they exist
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
 * Update Section Counts
 */
function updateSectionCounts(competitionsByStatus) {
    Object.keys(competitionsByStatus).forEach(status => {
        const countElement = document.getElementById(`${status}Count`);
        if (countElement) {
            countElement.textContent = competitionsByStatus[status].length;
        }
    });
}

/**
 * Setup Card Interactions
 */
function setupCardInteractions() {
    // Re-enable click handlers on cards
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
    // Add any additional modal-specific interactions here
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
 * Load Demo Competitions (Fallback)
 */
async function loadDemoCompetitions() {
    console.log('📝 Loading demo competitions...');
    
    const demoCompetitions = [
        {
            competitionId: 'demo-1',
            status: 'voting',
            tokenA: {
                address: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL',
                name: 'Solana',
                logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
                currentPrice: 180.50,
                priceChange24h: 2.5,
                marketCap: 85000000000
            },
            tokenB: {
                address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                symbol: 'USDC',
                name: 'USD Coin',
                logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
                currentPrice: 1.00,
                priceChange24h: 0.1,
                marketCap: 25000000000
            },
            startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
            votingEndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            endTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
            timeRemaining: 2 * 24 * 60 * 60 * 1000,
            participants: 156,
            prizePool: 15.6,
            tokenAVotes: 89,
            tokenBVotes: 67,
            betAmount: 0.1,
            platformFee: 15,
            isRealData: false
        },
        {
            competitionId: 'demo-2',
            status: 'running',
            tokenA: {
                address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
                symbol: 'mSOL',
                name: 'Marinade SOL',
                logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
                currentPrice: 195.30,
                priceChange24h: 3.2,
                marketCap: 1200000000
            },
            tokenB: {
                address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                symbol: 'BONK',
                name: 'Bonk',
                logo: generateFallbackLogo('BONK'),
                currentPrice: 0.000023,
                priceChange24h: -1.8,
                marketCap: 1500000000
            },
            startTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            votingEndTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
            endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            timeRemaining: 3 * 24 * 60 * 60 * 1000,
            participants: 203,
            prizePool: 20.3,
            tokenAVotes: 101,
            tokenBVotes: 102,
            tokenAPerformance: 1.5,
            tokenBPerformance: -0.8,
            betAmount: 0.1,
            platformFee: 15,
            isRealData: false
        }
    ];
    
    CompetitionState.activeCompetitions = demoCompetitions;
    updateCompetitionsDisplay();
    updateStatsDisplay();
    
    console.log('✅ Demo competitions loaded');
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

function getActionButtonText(status, hasUserBet) {
    if (hasUserBet) return 'View Details';
    
    switch (status) {
        case 'voting': return 'Place Prediction';
        case 'running': return 'View Competition';
        case 'upcoming': return 'Voting Not Started';
        case 'completed': return 'View Results';
        default: return 'View Details';
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

function createEmptyState(sectionName) {
    const messages = {
        voting: 'No voting competitions available',
        running: 'No competitions currently running',
        upcoming: 'No upcoming competitions scheduled',
        completed: 'No recently completed competitions'
    };
    
    return `
        <div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>${messages[sectionName]}</h3>
            <p>Check back soon for new competitions!</p>
        </div>
    `;
}

function showLoadingState() {
    const grids = ['votingGrid', 'runningGrid', 'upcomingGrid', 'completedGrid'];
    
    grids.forEach(gridId => {
        const grid = document.getElementById(gridId);
        if (grid) {
            grid.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Loading competitions...</p>
                </div>
            `;
        }
    });
}

function showNotification(message, type = 'info') {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    
    // Create notification element
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
    
    // Auto-remove after 5 seconds
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

// Function to be called from main app when competitions page is shown
function initializeCompetitionsPage() {
    console.log('🏁 Initializing competitions page...');
    
    // Initialize if not already done
    if (CompetitionState.activeCompetitions.length === 0) {
        initializeCompetitionSystem();
    } else {
        // Refresh data
        updateCompetitionsDisplay();
        updateStatsDisplay();
    }
}

// Function to handle wallet connection changes
function handleWalletConnectionChange(isConnected, walletAddress) {
    console.log('👛 Wallet connection changed:', isConnected, walletAddress);
    
    if (isConnected) {
        // Load user bets
        loadUserBets();
    } else {
        // Clear user bets
        CompetitionState.userBets.clear();
    }
    
    // Refresh display to show/hide betting options
    updateCompetitionsDisplay();
}

// Function to cleanup when leaving competitions page
function cleanupCompetitionsPage() {
    console.log('🧹 Cleaning up competitions page...');
    
    // Cancel real-time subscription
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

console.log('✅ Enhanced Competition.js loaded with real database integration');
console.log('🚀 Features:');
console.log('   ✅ Real Supabase database integration');
console.log('   ✅ Live competition data with token information');
console.log('   ✅ Real-time betting and updates');
console.log('   ✅ User bet tracking and history');
console.log('   ✅ Wallet integration for predictions');
console.log('   ✅ Enhanced UI with status-based sections');
console.log('   ✅ Competition timers and status management');
console.log('   ✅ Demo mode fallback for development');
