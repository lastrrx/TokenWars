// Enhanced Competition.js - VOTING/ACTIVE ONLY VERSION
// Integrates competitions page with main app and Supabase database

// Global state for competitions
const CompetitionState = {
    activeCompetitions: [],
    votingCompetitions: [],
    supabaseClient: null,
    walletService: null,
    tokenService: null,
    lastUpdate: null,
    loading: false,
    selectedCompetition: null,
    userBets: new Map(),
    realTimeSubscription: null,
    timerInterval: null,
    currentFilter: 'all' // 'all', 'voting', 'active'
};

/**
 * Initialize Competition System with Real Database Integration
 */
async function initializeCompetitionSystem() {
    console.log('🏁 Initializing competition system for VOTING/ACTIVE competitions...');
    
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
        
        // Load VOTING and ACTIVE competitions from database
        await loadActiveCompetitions();
        
        // Set up real-time subscriptions
        setupRealTimeSubscriptions();
        
        // Start periodic updates
        startPeriodicUpdates();
        
        // Start competition timers
        startCompetitionTimers();
        
        console.log('✅ Competition system initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize competition system:', error);
        showEmptyState('Failed to initialize competition system');
    }
}

/**
 * Load VOTING and ACTIVE Competitions with Token Cache Data
 */
async function loadActiveCompetitions() {
    try {
        CompetitionState.loading = true;
        updateCompetitionsDisplay();
        
        console.log('📊 Loading VOTING and ACTIVE competitions from database...');
        
        if (!CompetitionState.supabaseClient) {
            console.error('❌ No Supabase client available');
            CompetitionState.activeCompetitions = [];
            CompetitionState.votingCompetitions = [];
            updateCompetitionsDisplay();
            return;
        }
        
        // FIXED: Only load VOTING and ACTIVE competitions
        const { data: competitions, error } = await CompetitionState.supabaseClient
            .from('competitions')
            .select('*')
            .in('status', ['VOTING', 'ACTIVE'])
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Database error loading competitions:', error);
            CompetitionState.activeCompetitions = [];
            CompetitionState.votingCompetitions = [];
            updateCompetitionsDisplay();
            return;
        }
        
        if (competitions && competitions.length > 0) {
            // Enhance with token cache data
            const enhancedCompetitions = await enhanceCompetitionsWithTokenCache(competitions);
            
            // Split into voting and active
            CompetitionState.votingCompetitions = enhancedCompetitions.filter(comp => comp.status === 'voting');
            CompetitionState.activeCompetitions = enhancedCompetitions.filter(comp => comp.status === 'active');
            
            console.log(`✅ Loaded ${competitions.length} competitions (${CompetitionState.votingCompetitions.length} voting, ${CompetitionState.activeCompetitions.length} active)`);
        } else {
            console.log('ℹ️ No VOTING or ACTIVE competitions found in database');
            CompetitionState.activeCompetitions = [];
            CompetitionState.votingCompetitions = [];
        }
        
        // Load user bets if wallet connected
        await loadUserBetsIfConnected();
        
        CompetitionState.lastUpdate = new Date();
        updateCompetitionsDisplay();
        updateStatsDisplay();
        
    } catch (error) {
        console.error('❌ Failed to load competitions:', error);
        CompetitionState.activeCompetitions = [];
        CompetitionState.votingCompetitions = [];
        updateCompetitionsDisplay();
    } finally {
        CompetitionState.loading = false;
    }
}

/**
 * Enhance Competitions with Token Cache Data
 */
async function enhanceCompetitionsWithTokenCache(competitions) {
    console.log('🔗 Enhancing competitions with token cache data...');
    const enhanced = [];
    
    // Get all unique token addresses
    const tokenAddresses = new Set();
    competitions.forEach(comp => {
        tokenAddresses.add(comp.token_a_address);
        tokenAddresses.add(comp.token_b_address);
    });
    
    // Fetch token cache data for all tokens at once
    const { data: tokenCacheData, error: tokenError } = await CompetitionState.supabaseClient
        .from('token_cache')
        .select('*')
        .in('token_address', Array.from(tokenAddresses));
    
    if (tokenError) {
        console.error('❌ Error fetching token cache data:', tokenError);
    }
    
    // Create lookup map for token data
    const tokenDataMap = new Map();
    if (tokenCacheData) {
        tokenCacheData.forEach(token => {
            tokenDataMap.set(token.token_address, token);
        });
    }
    
    for (const competition of competitions) {
        try {
            const tokenAData = tokenDataMap.get(competition.token_a_address);
            const tokenBData = tokenDataMap.get(competition.token_b_address);
            
            // Determine actual status based on timestamps
            const actualStatus = determineCompetitionStatus(competition);
            
            // Create enhanced competition object
            const enhancedCompetition = {
                id: competition.competition_id,
                competitionId: competition.competition_id,
                status: actualStatus,
                
                // Token A data with cache information
                tokenA: {
                    address: competition.token_a_address,
                    symbol: tokenAData?.symbol || competition.token_a_symbol,
                    name: tokenAData?.name || competition.token_a_name,
                    logo: tokenAData?.logo_uri || competition.token_a_logo || generateFallbackLogo(competition.token_a_symbol),
                    currentPrice: tokenAData?.current_price || 0,
                    priceChange1h: tokenAData?.price_change_1h || 0,
                    priceChange24h: tokenAData?.price_change_24h || 0,
                    marketCap: tokenAData?.market_cap_usd || 0,
                    volume24h: tokenAData?.volume_24h || 0,
                    dataQuality: tokenAData?.data_quality_score || 0
                },
                
                // Token B data with cache information
                tokenB: {
                    address: competition.token_b_address,
                    symbol: tokenBData?.symbol || competition.token_b_symbol,
                    name: tokenBData?.name || competition.token_b_name,
                    logo: tokenBData?.logo_uri || competition.token_b_logo || generateFallbackLogo(competition.token_b_symbol),
                    currentPrice: tokenBData?.current_price || 0,
                    priceChange1h: tokenBData?.price_change_1h || 0,
                    priceChange24h: tokenBData?.price_change_24h || 0,
                    marketCap: tokenBData?.market_cap_usd || 0,
                    volume24h: tokenBData?.volume_24h || 0,
                    dataQuality: tokenBData?.data_quality_score || 0
                },
                
                // Competition timing
                startTime: new Date(competition.start_time),
                votingEndTime: new Date(competition.voting_end_time),
                endTime: new Date(competition.end_time),
                
                // Calculate time remaining based on status
                timeRemaining: calculateTimeRemaining(competition, actualStatus),
                timeRemainingType: actualStatus === 'voting' ? 'voting' : 'performance',
                
                // Betting data
                participants: competition.total_bets || 0,
                prizePool: parseFloat(competition.total_pool || 0),
                tokenAVotes: 0, // Will be calculated from bets
                tokenBVotes: 0, // Will be calculated from bets
                totalBettingVolume: competition.total_betting_volume || 0,
                
                // Performance data (for ACTIVE competitions)
                tokenAPerformance: competition.token_a_performance || null,
                tokenBPerformance: competition.token_b_performance || null,
                
                // Metadata
                createdAt: new Date(competition.created_at),
                isRealData: true,
                betAmount: parseFloat(competition.bet_amount || 0.1),
                platformFee: competition.platform_fee_percentage || 15,
                
                // Database status
                dbStatus: competition.status
            };
            
            enhanced.push(enhancedCompetition);
            
        } catch (error) {
            console.error('Failed to enhance competition:', competition.competition_id, error);
        }
    }
    
    console.log(`✅ Enhanced ${enhanced.length} competitions with token cache data`);
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
    
    // Only process VOTING and ACTIVE from database
    if (competition.status === 'VOTING') {
        if (now >= votingEndTime) {
            return 'active'; // Voting period ended, now active
        }
        return 'voting';
    }
    
    if (competition.status === 'ACTIVE') {
        if (now >= endTime) {
            return 'completed'; // Performance period ended
        }
        return 'active';
    }
    
    // Default fallback
    return competition.status.toLowerCase();
}

/**
 * Calculate Time Remaining Based on Competition Status
 */
function calculateTimeRemaining(competition, status) {
    const now = new Date();
    
    switch (status) {
        case 'voting':
            // Time until voting ends
            return new Date(competition.voting_end_time) - now;
        case 'active':
            // Time until performance period ends
            return new Date(competition.end_time) - now;
        default:
            return 0;
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
 * Load User Bets for Connected Wallet
 */
async function loadUserBets() {
    try {
        let walletAddress = null;
        
        try {
            if (window.connectedUser?.walletAddress) {
                walletAddress = window.connectedUser.walletAddress;
            } else if (CompetitionState.walletService) {
                if (typeof CompetitionState.walletService.getWalletAddress === 'function') {
                    walletAddress = CompetitionState.walletService.getWalletAddress();
                } else if (typeof CompetitionState.walletService.getConnectionStatus === 'function') {
                    const status = CompetitionState.walletService.getConnectionStatus();
                    walletAddress = status?.publicKey;
                }
            }
        } catch (error) {
            console.warn('Could not get wallet address:', error);
        }
        
        if (!walletAddress) {
            return;
        }
        
        // Get user bets from database
        const { data: bets, error } = await CompetitionState.supabaseClient
            .from('bets')
            .select('*')
            .eq('user_wallet', walletAddress)
            .in('status', ['PLACED', 'WON', 'LOST']);
        
        if (!error && bets) {
            // Map bets by competition ID and calculate vote counts
            CompetitionState.userBets.clear();
            const voteCounts = new Map();
            
            bets.forEach(bet => {
                CompetitionState.userBets.set(bet.competition_id, bet);
                
                // Count votes for each competition
                if (!voteCounts.has(bet.competition_id)) {
                    voteCounts.set(bet.competition_id, { tokenA: 0, tokenB: 0 });
                }
                
                if (bet.chosen_token === 'token_a') {
                    voteCounts.get(bet.competition_id).tokenA++;
                } else if (bet.chosen_token === 'token_b') {
                    voteCounts.get(bet.competition_id).tokenB++;
                }
            });
            
            // Update competition vote counts
            [...CompetitionState.votingCompetitions, ...CompetitionState.activeCompetitions].forEach(comp => {
                const votes = voteCounts.get(comp.competitionId);
                if (votes) {
                    comp.tokenAVotes = votes.tokenA;
                    comp.tokenBVotes = votes.tokenB;
                }
            });
            
            console.log(`✅ Loaded ${bets.length} user bets`);
        } else if (error) {
            console.error('Error loading user bets:', error);
        }
        
    } catch (error) {
        console.error('Failed to load user bets:', error);
    }
}

/**
 * Update Competition Display with Filtering
 */
function updateCompetitionsDisplay() {
    console.log('🎨 Updating competitions display (VOTING/ACTIVE ONLY)...');
    
    // Show loading state
    if (CompetitionState.loading) {
        showLoadingState();
        return;
    }
    
    // Always show competitions section
    const connectedView = document.getElementById('competitionsConnected');
    const disconnectedView = document.getElementById('competitionsDisconnected');
    
    if (!connectedView || !disconnectedView) {
        console.warn('⚠️ Competition view elements not found');
        return;
    }
    
    connectedView.style.display = 'block';
    disconnectedView.style.display = 'none';
    
    // Get filtered competitions based on current filter
    const filteredCompetitions = getFilteredCompetitions();
    
    // Show competitions in the activeGrid
    const activeGrid = document.getElementById('activeGrid');
    if (activeGrid) {
        if (filteredCompetitions.length > 0) {
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
            
            // Generate competition cards
            const competitionsHTML = filteredCompetitions
                .map(competition => createEnhancedCompetitionCard(competition, isWalletConnected))
                .join('');
            activeGrid.innerHTML = competitionsHTML;
            
            console.log(`🏆 Displayed ${filteredCompetitions.length} competitions (${CompetitionState.currentFilter} filter)`);
        } else {
            // Show empty state
            activeGrid.innerHTML = createEmptyState(CompetitionState.currentFilter);
        }
    }
    
    // Update filter counts
    updateFilterCounts();
    
    console.log('✅ Competition display updated successfully');
}

/**
 * Get Filtered Competitions Based on Current Filter
 */
function getFilteredCompetitions() {
    const allCompetitions = [...CompetitionState.votingCompetitions, ...CompetitionState.activeCompetitions];
    
    switch (CompetitionState.currentFilter) {
        case 'voting':
            return CompetitionState.votingCompetitions;
        case 'active':
            return CompetitionState.activeCompetitions;
        case 'all':
        default:
            return allCompetitions;
    }
}

/**
 * Handle Competition Filter Change
 */
function handleCompetitionFilterChange() {
    const filterSelect = document.getElementById('competition-phase');
    if (filterSelect) {
        CompetitionState.currentFilter = filterSelect.value;
        console.log(`🔍 Filter changed to: ${CompetitionState.currentFilter}`);
        updateCompetitionsDisplay();
    }
}

/**
 * Update Filter Counts in UI
 */
function updateFilterCounts() {
    const totalCount = CompetitionState.votingCompetitions.length + CompetitionState.activeCompetitions.length;
    const votingCount = CompetitionState.votingCompetitions.length;
    const activeCount = CompetitionState.activeCompetitions.length;
    
    // Update section description
    const sectionDescription = document.querySelector('.section-description');
    if (sectionDescription) {
        sectionDescription.textContent = `${totalCount} live competitions (${votingCount} voting, ${activeCount} active)`;
    }
    
    // Update filter options with counts
    const filterSelect = document.getElementById('competition-phase');
    if (filterSelect) {
        const options = filterSelect.options;
        for (let option of options) {
            switch (option.value) {
                case 'all':
                    option.textContent = `All Competitions (${totalCount})`;
                    break;
                case 'voting':
                    option.textContent = `Voting Open (${votingCount})`;
                    break;
                case 'active':
                    option.textContent = `Running (${activeCount})`;
                    break;
            }
        }
    }
}

/**
 * Create Enhanced Competition Card with Token Cache Data
 */
function createEnhancedCompetitionCard(competition, isWalletConnected = false) {
    const userBet = CompetitionState.userBets.get(competition.competitionId);
    const hasUserBet = !!userBet;
    const userPrediction = userBet?.chosen_token;
    
    const totalVotes = competition.tokenAVotes + competition.tokenBVotes;
    const tokenAPercentage = totalVotes > 0 ? (competition.tokenAVotes / totalVotes * 100) : 50;
    
    const statusLabels = {
        voting: 'Voting Open',
        active: 'Running',
        completed: 'Completed'
    };
    
    const statusIcons = {
        voting: '🗳️',
        active: '⚡',
        completed: '🏁'
    };
    
    // Determine button text based on status and wallet
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
    } else if (competition.status === 'active') {
        actionButtonText = 'View Live Competition';
    }
    
    // Calculate urgency for timer styling
    const urgencyClass = getTimerUrgencyClass(competition.timeRemaining);
    const timerLabel = competition.timeRemainingType === 'voting' ? 'Voting ends in' : 'Competition ends in';
    
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
            
            <!-- Token Battle Display with Market Data -->
            <div class="token-battle enhanced-battle">
                <!-- Token A -->
                <div class="token-info ${userPrediction === 'token_a' ? 'user-selected' : ''}">
                    <img src="${competition.tokenA.logo}" 
                         alt="${competition.tokenA.symbol}" 
                         class="token-logo"
                         onerror="this.src='${generateFallbackLogo(competition.tokenA.symbol)}'" />
                    <div class="token-details">
                        <h4>${competition.tokenA.symbol}</h4>
                        <p class="token-name">${truncateText(competition.tokenA.name, 15)}</p>
                        <div class="token-price">$${formatPrice(competition.tokenA.currentPrice)}</div>
                        <div class="price-change ${competition.tokenA.priceChange24h >= 0 ? 'positive' : 'negative'}">
                            24h: ${competition.tokenA.priceChange24h >= 0 ? '+' : ''}${competition.tokenA.priceChange24h.toFixed(2)}%
                        </div>
                        <div class="market-data">
                            <div class="market-cap">MC: ${formatMarketCap(competition.tokenA.marketCap)}</div>
                            <div class="volume">Vol: ${formatVolume(competition.tokenA.volume24h)}</div>
                        </div>
                        ${competition.status === 'active' && competition.tokenAPerformance !== null ? `
                            <div class="performance ${competition.tokenAPerformance >= 0 ? 'positive' : 'negative'}">
                                Perf: ${competition.tokenAPerformance >= 0 ? '+' : ''}${competition.tokenAPerformance.toFixed(2)}%
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- VS Divider -->
                <div class="vs-divider">
                    <span class="vs-text">VS</span>
                    ${totalVotes > 0 ? `
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
                        <p class="token-name">${truncateText(competition.tokenB.name, 15)}</p>
                        <div class="token-price">$${formatPrice(competition.tokenB.currentPrice)}</div>
                        <div class="price-change ${competition.tokenB.priceChange24h >= 0 ? 'positive' : 'negative'}">
                            24h: ${competition.tokenB.priceChange24h >= 0 ? '+' : ''}${competition.tokenB.priceChange24h.toFixed(2)}%
                        </div>
                        <div class="market-data">
                            <div class="market-cap">MC: ${formatMarketCap(competition.tokenB.marketCap)}</div>
                            <div class="volume">Vol: ${formatVolume(competition.tokenB.volume24h)}</div>
                        </div>
                        ${competition.status === 'active' && competition.tokenBPerformance !== null ? `
                            <div class="performance ${competition.tokenBPerformance >= 0 ? 'positive' : 'negative'}">
                                Perf: ${competition.tokenBPerformance >= 0 ? '+' : ''}${competition.tokenBPerformance.toFixed(2)}%
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Betting Progress Bar -->
            ${totalVotes > 0 ? `
                <div class="betting-progress">
                    <div class="progress-fill" style="width: ${tokenAPercentage}%"></div>
                </div>
                <div class="vote-breakdown">
                    <span>${competition.tokenAVotes} votes (${Math.round(tokenAPercentage)}%)</span>
                    <span>${competition.tokenBVotes} votes (${Math.round(100 - tokenAPercentage)}%)</span>
                </div>
            ` : ''}
            
            <!-- Enhanced Timer Display with Urgency -->
            <div class="timer enhanced-timer ${urgencyClass}">
                <span class="timer-icon">⏱️</span>
                <div class="timer-content">
                    <div class="timer-label">${timerLabel}</div>
                    <div class="time-remaining" 
                          data-time="${competition.timeRemaining}" 
                          data-type="${competition.timeRemainingType}">
                        ${formatTimeRemaining(competition.timeRemaining)}
                    </div>
                </div>
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
 * Get Timer Urgency Class Based on Time Remaining
 */
function getTimerUrgencyClass(timeRemaining) {
    const hoursRemaining = timeRemaining / (1000 * 60 * 60);
    
    if (hoursRemaining <= 1) {
        return 'timer-critical'; // Less than 1 hour
    } else if (hoursRemaining <= 6) {
        return 'timer-warning'; // Less than 6 hours
    } else if (hoursRemaining <= 24) {
        return 'timer-caution'; // Less than 24 hours
    }
    
    return 'timer-normal';
}

/**
 * Start Competition Timers with Visual Effects
 */
function startCompetitionTimers() {
    // Clear existing timer
    if (CompetitionState.timerInterval) {
        clearInterval(CompetitionState.timerInterval);
    }
    
    CompetitionState.timerInterval = setInterval(() => {
        document.querySelectorAll('.time-remaining').forEach(timer => {
            const timeLeft = parseInt(timer.dataset.time);
            const timerType = timer.dataset.type;
            const newTime = Math.max(0, timeLeft - 1000);
            
            timer.dataset.time = newTime;
            timer.textContent = formatTimeRemaining(newTime);
            
            // Update urgency class on parent timer element
            const timerElement = timer.closest('.timer');
            if (timerElement) {
                // Remove existing urgency classes
                timerElement.classList.remove('timer-normal', 'timer-caution', 'timer-warning', 'timer-critical');
                // Add new urgency class
                timerElement.classList.add(getTimerUrgencyClass(newTime));
            }
            
            // Check if timer expired
            if (newTime <= 0) {
                timer.textContent = 'Ended';
                timer.parentElement.classList.add('timer-expired');
                
                // Refresh competitions to update status
                setTimeout(() => loadActiveCompetitions(), 5000);
            }
        });
    }, 1000);
}

/**
 * Competition Action Handler
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
    
    openEnhancedCompetitionModal(competitionId);
}

/**
 * Enhanced Competition Modal (placeholder - implement as needed)
 */
function openEnhancedCompetitionModal(competitionId) {
    console.log(`🔍 Opening modal for competition: ${competitionId}`);
    // Modal implementation would go here
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
 * Handle Real-Time Changes
 */
function handleCompetitionChange(payload) {
    console.log('🔄 Competition changed:', payload);
    setTimeout(() => loadActiveCompetitions(), 1000);
}

function handleBetChange(payload) {
    console.log('🎯 Bet changed:', payload);
    setTimeout(() => loadUserBetsIfConnected(), 500);
}

/**
 * Start Periodic Updates
 */
function startPeriodicUpdates() {
    setInterval(async () => {
        try {
            await loadActiveCompetitions();
        } catch (error) {
            console.error('Periodic update failed:', error);
        }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    console.log('✅ Periodic updates started (5-minute intervals)');
}

/**
 * Update Stats Display
 */
function updateStatsDisplay() {
    const totalCompetitions = CompetitionState.votingCompetitions.length + CompetitionState.activeCompetitions.length;
    const totalParticipants = [...CompetitionState.votingCompetitions, ...CompetitionState.activeCompetitions]
        .reduce((sum, comp) => sum + comp.participants, 0);
    const totalPrizePool = [...CompetitionState.votingCompetitions, ...CompetitionState.activeCompetitions]
        .reduce((sum, comp) => sum + comp.prizePool, 0);
    
    const updateStat = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };
    
    updateStat('totalCompetitions', totalCompetitions);
    updateStat('totalParticipants', totalParticipants.toLocaleString());
    updateStat('totalPrizePool', `${totalPrizePool.toFixed(1)} SOL`);
    updateStat('activeCompetitions', CompetitionState.activeCompetitions.length);
}

/**
 * Utility Functions
 */
function formatTimeRemaining(milliseconds) {
    if (milliseconds <= 0) return 'Ended';

    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

function formatPrice(price) {
    if (price >= 1) {
        return price.toFixed(4);
    } else if (price >= 0.01) {
        return price.toFixed(6);
    } else {
        return price.toFixed(8);
    }
}

function formatMarketCap(marketCap) {
    if (marketCap >= 1e9) {
        return `$${(marketCap / 1e9).toFixed(1)}B`;
    } else if (marketCap >= 1e6) {
        return `$${(marketCap / 1e6).toFixed(1)}M`;
    } else if (marketCap >= 1e3) {
        return `$${(marketCap / 1e3).toFixed(0)}K`;
    } else {
        return `$${marketCap.toFixed(0)}`;
    }
}

function formatVolume(volume) {
    if (volume >= 1e9) {
        return `$${(volume / 1e9).toFixed(1)}B`;
    } else if (volume >= 1e6) {
        return `$${(volume / 1e6).toFixed(1)}M`;
    } else if (volume >= 1e3) {
        return `$${(volume / 1e3).toFixed(0)}K`;
    } else {
        return `$${volume.toFixed(0)}`;
    }
}

function generateFallbackLogo(symbol) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(symbol)}&background=8b5cf6&color=fff&size=48&bold=true`;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function createEmptyState(filter) {
    const messages = {
        voting: 'No voting competitions available',
        active: 'No active competitions running',
        all: 'No competitions available'
    };
    
    const message = messages[filter] || 'No competitions available';
    
    return `
        <div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>${message}</h3>
            <p>Live competitions from database will appear here when available.</p>
        </div>
    `;
}

function showEmptyState(message) {
    const activeGrid = document.getElementById('activeGrid');
    if (activeGrid) {
        activeGrid.innerHTML = createEmptyState('all');
    }
}

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

function showNotification(message, type = 'info') {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    // Notification implementation
}

/**
 * Integration Functions
 */
function initializeCompetitionsPage() {
    console.log('🏁 Initializing competitions page...');
    
    if (CompetitionState.activeCompetitions.length === 0 && CompetitionState.votingCompetitions.length === 0) {
        initializeCompetitionSystem();
    } else {
        updateCompetitionsDisplay();
        updateStatsDisplay();
    }
}

function cleanupCompetitionsPage() {
    console.log('🧹 Cleaning up competitions page...');
    
    if (CompetitionState.realTimeSubscription) {
        CompetitionState.realTimeSubscription.unsubscribe();
        CompetitionState.realTimeSubscription = null;
    }
    
    if (CompetitionState.timerInterval) {
        clearInterval(CompetitionState.timerInterval);
        CompetitionState.timerInterval = null;
    }
}

/**
 * Global Exports
 */
window.initializeCompetitionSystem = initializeCompetitionSystem;
window.loadActiveCompetitions = loadActiveCompetitions;
window.updateCompetitionsDisplay = updateCompetitionsDisplay;
window.handleCompetitionFilterChange = handleCompetitionFilterChange;
window.handleCompetitionAction = handleCompetitionAction;
window.openEnhancedCompetitionModal = openEnhancedCompetitionModal;
window.initializeCompetitionsPage = initializeCompetitionsPage;
window.cleanupCompetitionsPage = cleanupCompetitionsPage;

// For debugging
window.CompetitionState = CompetitionState;

console.log('✅ FIXED Competition.js loaded - VOTING/ACTIVE ONLY');
console.log('🚀 Features:');
console.log('   ✅ Only loads VOTING and ACTIVE competitions');
console.log('   ✅ Token cache data integration (price, volume, market cap)');
console.log('   ✅ Enhanced countdown timers with visual urgency effects');
console.log('   ✅ Competition filtering (All/Voting/Active)');
console.log('   ✅ Real-time updates and subscriptions');
console.log('   ❌ REMOVED: All fallback/demo data');
console.log('   ❌ REMOVED: SETUP/CANCELLED/CLOSED status handling');
console.log('   🎯 NEW: Pure VOTING/ACTIVE database experience');
