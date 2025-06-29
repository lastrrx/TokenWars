// Enhanced Competition.js - VOTING/ACTIVE ONLY VERSION
// Complete overhaul with filter persistence, auto-refresh, and betting integration

// Global state for competitions
const CompetitionState = {
    activeCompetitions: [],
    votingCompetitions: [],
    walletService: null,
    tokenService: null,
    lastUpdate: null,
    loading: false,
    selectedCompetition: null,
    userBets: new Map(),
    realTimeSubscription: null,
    timerInterval: null,
    currentFilters: {
        phase: 'all',
        sortBy: 'time_remaining',
        tokenSearch: ''
    },
    loadingTimeout: null,
    selectedToken: null,
    betAmount: 0.1
};

// Filter persistence in localStorage
const FILTER_STORAGE_KEY = 'tokenWars_competitionFilters';

/**
 * Get Supabase client when needed (after it's ready)
 */
function getSupabaseClient() {
    return window.supabase;
}

/**
 * Initialize Competition System with Real Database Integration
 */
async function initializeCompetitionSystem() {
    console.log('🏁 Initializing competition system for VOTING/ACTIVE competitions...');
    
    try {
        // Wait for Supabase to be ready before proceeding
        console.log('⏳ Waiting for Supabase client to be ready...');
        await window.SupabaseReady;
        console.log('✅ Supabase client is ready');
        
        // Get wallet and token services
        CompetitionState.walletService = window.getWalletService?.();
        CompetitionState.tokenService = window.getTokenService?.();
        
        // Load saved filters
        loadSavedFilters();
        
        // Set up filter event listeners
        setupFilterEventListeners();
        
        // Verify Supabase client is available
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
            console.error('❌ Supabase client not available after waiting');
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
 * Load saved filters from localStorage
 */
function loadSavedFilters() {
    try {
        const savedFilters = localStorage.getItem(FILTER_STORAGE_KEY);
        if (savedFilters) {
            CompetitionState.currentFilters = JSON.parse(savedFilters);
            console.log('📂 Loaded saved filters:', CompetitionState.currentFilters);
            
            // Apply saved filters to UI
            const phaseSelect = document.getElementById('competition-phase');
            const sortSelect = document.getElementById('sort-by');
            
            if (phaseSelect && CompetitionState.currentFilters.phase) {
                phaseSelect.value = CompetitionState.currentFilters.phase;
            }
            
            if (sortSelect && CompetitionState.currentFilters.sortBy) {
                sortSelect.value = CompetitionState.currentFilters.sortBy;
            }
        }
    } catch (error) {
        console.error('Error loading saved filters:', error);
    }
}

/**
 * Save filters to localStorage
 */
function saveFilters() {
    try {
        localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(CompetitionState.currentFilters));
        console.log('💾 Saved filters:', CompetitionState.currentFilters);
    } catch (error) {
        console.error('Error saving filters:', error);
    }
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    console.log('🧹 Clearing all filters');
    
    // Reset filter state
    CompetitionState.currentFilters = {
        phase: 'all',
        sortBy: 'time_remaining',
        tokenSearch: ''
    };
    
    // Reset UI
    const phaseSelect = document.getElementById('competition-phase');
    const sortSelect = document.getElementById('sort-by');
    
    if (phaseSelect) phaseSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'time_remaining';
    
    // Clear localStorage
    localStorage.removeItem(FILTER_STORAGE_KEY);
    
    // Update display
    updateCompetitionsDisplay();
    
    // Hide clear button if showing all
    updateClearFiltersButton();
}

/**
 * Update clear filters button visibility
 */
function updateClearFiltersButton() {
    const hasActiveFilters = 
        CompetitionState.currentFilters.phase !== 'all' ||
        CompetitionState.currentFilters.sortBy !== 'time_remaining' ||
        CompetitionState.currentFilters.tokenSearch !== '';
    
    const clearButton = document.querySelector('.clear-filters');
    
    if (!clearButton) {
        // Create clear button if it doesn't exist and we have active filters
        if (hasActiveFilters) {
            const filtersContainer = document.querySelector('.section-filters');
            if (filtersContainer) {
                const clearBtn = document.createElement('button');
                clearBtn.className = 'clear-filters';
                clearBtn.innerHTML = '<span class="clear-icon">✕</span> Clear Filters';
                clearBtn.onclick = clearAllFilters;
                filtersContainer.appendChild(clearBtn);
            }
        }
    } else {
        // Show/hide existing button
        clearButton.style.display = hasActiveFilters ? 'flex' : 'none';
    }
}

/**
 * Set up filter event listeners
 */
function setupFilterEventListeners() {
    console.log('🎛️ Setting up filter event listeners...');
    
    const phaseSelect = document.getElementById('competition-phase');
    const sortSelect = document.getElementById('sort-by');
    
    if (phaseSelect) {
        phaseSelect.addEventListener('change', (e) => {
            CompetitionState.currentFilters.phase = e.target.value;
            saveFilters();
            updateCompetitionsDisplay();
            updateClearFiltersButton();
        });
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            CompetitionState.currentFilters.sortBy = e.target.value;
            saveFilters();
            updateCompetitionsDisplay();
            updateClearFiltersButton();
        });
    }
}

/**
 * Load VOTING and ACTIVE Competitions with Token Cache Data
 */
async function loadActiveCompetitions() {
    try {
        CompetitionState.loading = true;
        
        // Set loading timeout
        CompetitionState.loadingTimeout = setTimeout(() => {
            console.warn('⚠️ Loading taking too long, showing timeout message');
            showTimeoutMessage();
        }, 10000); // 10 second timeout
        
        updateCompetitionsDisplay();
        
        console.log('📊 Loading VOTING and ACTIVE competitions from database...');
        
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
            console.error('❌ No Supabase client available');
            clearTimeout(CompetitionState.loadingTimeout);
            CompetitionState.activeCompetitions = [];
            CompetitionState.votingCompetitions = [];
            updateCompetitionsDisplay();
            return;
        }
        
        const { data: competitions, error } = await supabaseClient
            .from('competitions')
            .select('*')
            .in('status', ['VOTING', 'ACTIVE'])
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Database error loading competitions:', error);
            clearTimeout(CompetitionState.loadingTimeout);
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
        clearTimeout(CompetitionState.loadingTimeout);
        updateCompetitionsDisplay();
        updateStatsDisplay();
        
    } catch (error) {
        console.error('❌ Failed to load competitions:', error);
        clearTimeout(CompetitionState.loadingTimeout);
        CompetitionState.activeCompetitions = [];
        CompetitionState.votingCompetitions = [];
        updateCompetitionsDisplay();
    } finally {
        CompetitionState.loading = false;
    }
}

/**
 * Show timeout message
 */
function showTimeoutMessage() {
    const activeGrid = document.getElementById('activeGrid');
    if (activeGrid && CompetitionState.loading) {
        activeGrid.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading is taking longer than expected...</p>
                <p style="font-size: 0.9rem; color: var(--text-muted);">Please check your connection</p>
                <button class="btn-primary" onclick="retryLoadCompetitions()" style="margin-top: 1rem;">
                    Try Again
                </button>
            </div>
        `;
    }
}

/**
 * Retry loading competitions
 */
window.retryLoadCompetitions = async function() {
    console.log('🔄 Retrying competition load...');
    await loadActiveCompetitions();
};

/**
 * Enhance Competitions with Token Cache Data
 */
async function enhanceCompetitionsWithTokenCache(competitions) {
    console.log('🔗 Enhancing competitions with token cache data...');
    const enhanced = [];
    
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
        console.error('❌ No Supabase client available for token enhancement');
        return competitions;
    }
    
    // Get all unique token addresses
    const tokenAddresses = new Set();
    competitions.forEach(comp => {
        tokenAddresses.add(comp.token_a_address);
        tokenAddresses.add(comp.token_b_address);
    });
    
    // Fetch token cache data for all tokens at once
    const { data: tokenCacheData, error: tokenError } = await supabaseClient
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
                tokenAVotes: 0,
                tokenBVotes: 0,
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
    
    if (competition.status === 'VOTING') {
        if (now >= votingEndTime) {
            return 'active';
        }
        return 'voting';
    }
    
    if (competition.status === 'ACTIVE') {
        if (now >= endTime) {
            return 'completed';
        }
        return 'active';
    }
    
    return competition.status.toLowerCase();
}

/**
 * Calculate Time Remaining Based on Competition Status
 */
function calculateTimeRemaining(competition, status) {
    const now = new Date();
    
    switch (status) {
        case 'voting':
            return new Date(competition.voting_end_time) - now;
        case 'active':
            return new Date(competition.end_time) - now;
        default:
            return 0;
    }
}

/**
 * Update Competition Display with Filtering and Sorting
 */
function updateCompetitionsDisplay() {
    console.log('🎨 Updating competitions display with filters...');
    
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
    
    // Get filtered and sorted competitions
    const filteredCompetitions = getFilteredAndSortedCompetitions();
    
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
            
            console.log(`🏆 Displayed ${filteredCompetitions.length} competitions`);
        } else {
            activeGrid.innerHTML = createEmptyState(CompetitionState.currentFilters.phase);
        }
    }
    
    // Update filter counts
    updateFilterCounts();
    
    console.log('✅ Competition display updated successfully');
}

/**
 * Get Filtered and Sorted Competitions
 */
function getFilteredAndSortedCompetitions() {
    // Start with all competitions
    let competitions = [...CompetitionState.votingCompetitions, ...CompetitionState.activeCompetitions];
    
    // Apply phase filter
    if (CompetitionState.currentFilters.phase !== 'all') {
        competitions = competitions.filter(comp => comp.status === CompetitionState.currentFilters.phase);
    }
    
    // Apply token search filter (if implemented)
    if (CompetitionState.currentFilters.tokenSearch) {
        const searchTerm = CompetitionState.currentFilters.tokenSearch.toLowerCase();
        competitions = competitions.filter(comp => 
            comp.tokenA.symbol.toLowerCase().includes(searchTerm) ||
            comp.tokenA.name.toLowerCase().includes(searchTerm) ||
            comp.tokenB.symbol.toLowerCase().includes(searchTerm) ||
            comp.tokenB.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply sorting
    competitions.sort((a, b) => {
        switch (CompetitionState.currentFilters.sortBy) {
            case 'time_remaining':
                return a.timeRemaining - b.timeRemaining;
            case 'total_pool':
                return b.prizePool - a.prizePool;
            case 'total_bets':
                return b.participants - a.participants;
            case 'created_at':
                return b.createdAt - a.createdAt;
            default:
                return 0;
        }
    });
    
    return competitions;
}

/**
 * Enhanced Timer Classes with 30-Second Final Countdown
 */
function getTimerUrgencyClass(timeRemaining) {
    const secondsRemaining = timeRemaining / 1000;
    const hoursRemaining = timeRemaining / (1000 * 60 * 60);
    
    if (secondsRemaining <= 30) {
        return 'timer-final-countdown'; // NEW: Final 30 seconds
    } else if (hoursRemaining <= 1) {
        return 'timer-critical';
    } else if (hoursRemaining <= 6) {
        return 'timer-warning';
    } else if (hoursRemaining <= 24) {
        return 'timer-caution';
    }
    
    return 'timer-normal';
}

/**
 * Create Enhanced Competition Card
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
             data-status="${competition.status}">
            
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
                    onclick="handleCompetitionAction('${competition.competitionId}', '${competition.status}', ${isWalletConnected})"
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
                timerElement.classList.remove('timer-normal', 'timer-caution', 'timer-warning', 'timer-critical', 'timer-final-countdown');
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
async function handleCompetitionAction(competitionId, status, isWalletConnected) {
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
 * Enhanced Competition Modal with Betting
 */
function openEnhancedCompetitionModal(competitionId) {
    console.log(`🔍 Opening modal for competition: ${competitionId}`);
    
    const competition = [...CompetitionState.votingCompetitions, ...CompetitionState.activeCompetitions]
        .find(comp => comp.competitionId === competitionId);
    
    if (!competition) {
        console.error('Competition not found:', competitionId);
        return;
    }
    
    CompetitionState.selectedCompetition = competition;
    CompetitionState.selectedToken = null;
    CompetitionState.betAmount = 0.1;
    
    // Update modal content
    const modal = document.getElementById('competitionModal');
    if (!modal) return;
    
    // Update modal title
    document.getElementById('modalTitle').textContent = 
        competition.status === 'voting' ? 'Place Your Prediction' : 'Competition Details';
    
    // Update token displays
    updateModalTokenDisplay('A', competition.tokenA);
    updateModalTokenDisplay('B', competition.tokenB);
    
    // Update stats
    document.getElementById('modalParticipants').textContent = competition.participants;
    document.getElementById('modalPrizePool').textContent = `${competition.prizePool.toFixed(1)} SOL`;
    document.getElementById('modalTimeRemaining').textContent = formatTimeRemaining(competition.timeRemaining);
    
    // Show/hide betting interface
    const bettingInterface = document.getElementById('bettingInterface');
    if (bettingInterface) {
        bettingInterface.style.display = competition.status === 'voting' ? 'block' : 'none';
        
        if (competition.status === 'voting') {
            // Reset betting UI
            document.getElementById('choiceTokenASymbol').textContent = competition.tokenA.symbol;
            document.getElementById('choiceTokenBSymbol').textContent = competition.tokenB.symbol;
            document.getElementById('betAmount').value = '0.1';
            document.getElementById('placeBetButton').disabled = true;
            document.getElementById('placeBetButton').textContent = 'Select a token to continue';
            
            // Clear previous selections
            document.querySelectorAll('.token-choice-button').forEach(btn => {
                btn.classList.remove('selected');
            });
        }
    }
    
    // Show modal
    modal.classList.remove('hidden');
}

/**
 * Update modal token display
 */
function updateModalTokenDisplay(token, tokenData) {
    document.getElementById(`modalToken${token}Logo`).src = tokenData.logo;
    document.getElementById(`modalToken${token}Symbol`).textContent = tokenData.symbol;
    document.getElementById(`modalToken${token}Name`).textContent = tokenData.name;
    document.getElementById(`modalToken${token}Price`).textContent = `$${formatPrice(tokenData.currentPrice)}`;
    
    const changeElement = document.getElementById(`modalToken${token}Change`);
    changeElement.textContent = `${tokenData.priceChange24h >= 0 ? '+' : ''}${tokenData.priceChange24h.toFixed(2)}%`;
    changeElement.className = `price-change ${tokenData.priceChange24h >= 0 ? 'positive' : 'negative'}`;
}

/**
 * Select token for betting
 */
window.selectToken = function(token) {
    console.log('Selected token:', token);
    
    CompetitionState.selectedToken = token;
    
    // Update UI
    document.querySelectorAll('.token-choice-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const selectedButton = document.getElementById(`choiceToken${token}`);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
    
    // Enable place bet button
    const placeBetButton = document.getElementById('placeBetButton');
    if (placeBetButton) {
        placeBetButton.disabled = false;
        placeBetButton.textContent = 'Place Bet';
    }
};

/**
 * Place bet in database
 */
window.placeBet = async function() {
    console.log('📊 Placing bet...');
    
    if (!CompetitionState.selectedToken || !CompetitionState.selectedCompetition) {
        showNotification('Please select a token first', 'error');
        return;
    }
    
    const betAmount = parseFloat(document.getElementById('betAmount').value);
    if (isNaN(betAmount) || betAmount < 0.1) {
        showNotification('Minimum bet amount is 0.1 SOL', 'error');
        return;
    }
    
    // Get wallet address
    let walletAddress = null;
    if (window.connectedUser?.walletAddress) {
        walletAddress = window.connectedUser.walletAddress;
    } else if (CompetitionState.walletService) {
        walletAddress = CompetitionState.walletService.getWalletAddress?.();
    }
    
    if (!walletAddress) {
        showNotification('Wallet not connected', 'error');
        return;
    }
    
    const placeBetButton = document.getElementById('placeBetButton');
    placeBetButton.disabled = true;
    placeBetButton.textContent = 'Placing bet...';
    
    try {
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
            throw new Error('Database connection not available');
        }
        
        // Create bet record
        const betData = {
            user_wallet: walletAddress,
            competition_id: CompetitionState.selectedCompetition.competitionId,
            chosen_token: `token_${CompetitionState.selectedToken.toLowerCase()}`,
            amount: betAmount,
            status: 'PLACED',
            timestamp: new Date().toISOString()
        };
        
        console.log('💾 Inserting bet:', betData);
        
        const { data, error } = await supabaseClient
            .from('bets')
            .insert([betData])
            .select();
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Bet placed successfully:', data);
        showNotification('Bet placed successfully!', 'success');
        
        // Update competition participants and pool
        await updateCompetitionStats(CompetitionState.selectedCompetition.competitionId, betAmount);
        
        // Close modal
        closeCompetitionModal();
        
        // Reload competitions to show updated data
        await loadActiveCompetitions();
        
    } catch (error) {
        console.error('❌ Error placing bet:', error);
        showNotification(`Failed to place bet: ${error.message}`, 'error');
        
        placeBetButton.disabled = false;
        placeBetButton.textContent = 'Place Bet';
    }
};

/**
 * Update competition stats after bet
 */
async function updateCompetitionStats(competitionId, betAmount) {
    try {
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) return;
        
        // Get current competition data
        const { data: competition, error: fetchError } = await supabaseClient
            .from('competitions')
            .select('total_pool, total_bets')
            .eq('competition_id', competitionId)
            .single();
        
        if (fetchError) {
            console.error('Error fetching competition:', fetchError);
            return;
        }
        
        // Update competition stats
        const { error: updateError } = await supabaseClient
            .from('competitions')
            .update({
                total_pool: (parseFloat(competition.total_pool) + betAmount).toFixed(2),
                total_bets: (competition.total_bets || 0) + 1
            })
            .eq('competition_id', competitionId);
        
        if (updateError) {
            console.error('Error updating competition stats:', updateError);
        }
    } catch (error) {
        console.error('Error updating competition stats:', error);
    }
}

/**
 * Close competition modal
 */
window.closeCompetitionModal = function() {
    const modal = document.getElementById('competitionModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    CompetitionState.selectedCompetition = null;
    CompetitionState.selectedToken = null;
};

/**
 * Setup Real-Time Subscriptions
 */
function setupRealTimeSubscriptions() {
    try {
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
            console.log('Real-time subscriptions not available - no database connection');
            return;
        }
        
        CompetitionState.realTimeSubscription = supabaseClient
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
 * Load User Bets if Wallet Connected
 */
async function loadUserBetsIfConnected() {
    let isWalletConnected = false;
    try {
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
        
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
            console.error('❌ No Supabase client available for loading user bets');
            return;
        }
        
        // Get user bets from database
        const { data: bets, error } = await supabaseClient
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
 * Update Filter Counts
 */
function updateFilterCounts() {
    const totalCount = CompetitionState.votingCompetitions.length + CompetitionState.activeCompetitions.length;
    const votingCount = CompetitionState.votingCompetitions.length;
    const activeCount = CompetitionState.activeCompetitions.length;
    
    // Update status cards
    const updateCount = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };
    
    updateCount('votingCompetitionsCount', votingCount);
    updateCount('activeCompetitionsCount', activeCount);
    updateCount('totalCompetitionsCount', totalCount);
    
    // Update section description
    const sectionDescription = document.querySelector('.section-description');
    if (sectionDescription) {
        const filteredCount = getFilteredAndSortedCompetitions().length;
        sectionDescription.textContent = `${filteredCount} competitions shown (${votingCount} voting, ${activeCount} active)`;
    }
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
    
    // Special formatting for last 30 seconds
    if (milliseconds <= 30000) {
        return `${seconds}s ⏰`;
    }
    
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
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading live competitions...</p>
            </div>
        `;
    }
}

function showNotification(message, type = 'info') {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 400px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
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
    
    if (CompetitionState.loadingTimeout) {
        clearTimeout(CompetitionState.loadingTimeout);
        CompetitionState.loadingTimeout = null;
    }
}

/**
 * Global Exports
 */
window.initializeCompetitionSystem = initializeCompetitionSystem;
window.loadActiveCompetitions = loadActiveCompetitions;
window.updateCompetitionsDisplay = updateCompetitionsDisplay;
window.handleCompetitionAction = handleCompetitionAction;
window.openEnhancedCompetitionModal = openEnhancedCompetitionModal;
window.initializeCompetitionsPage = initializeCompetitionsPage;
window.cleanupCompetitionsPage = cleanupCompetitionsPage;
window.clearAllFilters = clearAllFilters;

// For debugging
window.CompetitionState = CompetitionState;

console.log('✅ Enhanced Competition.js loaded');
console.log('🚀 Features:');
console.log('   ✅ 30-second final countdown with dramatic animations');
console.log('   ✅ Filter persistence in localStorage');
console.log('   ✅ Auto-refresh on filter change');
console.log('   ✅ Clear filters button');
console.log('   ✅ Betting interface for VOTING competitions');
console.log('   ✅ Loading timeout handling');
console.log('   ✅ Enhanced timer urgency states');
console.log('   ✅ Supabase bet insertion');
console.log('   🎯 Pure VOTING/ACTIVE database experience');
