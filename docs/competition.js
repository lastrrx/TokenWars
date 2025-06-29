// FIXED Competition.js - Immediate Display & Progressive Enhancement
// Critical fixes: Immediate UI, graceful degradation, proper show/hide logic
// NEW FIX: Proper Supabase ready promise waiting

// ==============================================
// IMMEDIATE GLOBAL FUNCTION EXPOSURE
// ==============================================

// Expose critical functions immediately to prevent "function not defined" errors
window.initializeCompetitionSystem = function() {
    return initializeCompetitionSystemFixed();
};

window.loadActiveCompetitions = function() {
    return loadActiveCompetitionsFixed();
};

window.updateCompetitionsDisplay = function() {
    return updateCompetitionsDisplayFixed();
};

window.initializeCompetitionsPage = function() {
    return initializeCompetitionsPageFixed();
};

window.handleCompetitionAction = function(competitionId, status, isWalletConnected) {
    return handleCompetitionActionFixed(competitionId, status, isWalletConnected);
};

window.closeCompetitionModal = function() {
    return closeCompetitionModalFixed();
};

window.selectToken = function(token) {
    return selectTokenFixed(token);
};

window.placeBet = function() {
    return placeBetFixed();
};

// ==============================================
// SIMPLIFIED GLOBAL STATE
// ==============================================

const CompetitionState = {
    // Basic state
    initialized: false,
    loading: false,
    error: null,
    
    // Competition data
    competitions: [],
    votingCompetitions: [],
    activeCompetitions: [],
    
    // Modal state
    selectedCompetition: null,
    selectedToken: null,
    betAmount: 0.1,
    
    // Services
    supabaseClient: null,
    walletService: null,
    
    // UI state
    currentFilters: {
        phase: 'all',
        sortBy: 'time_remaining'
    }
};

// ==============================================
// DATABASE-FIRST COMPETITION LOADING
// ==============================================

// ==============================================
// FIXED INITIALIZATION (Immediate + Progressive)
// ==============================================

async function initializeCompetitionSystemFixed() {
    try {
        console.log('🏁 Initializing competition system (database-first)...');
        
        if (CompetitionState.initialized) {
            console.log('✅ Competition system already initialized');
            return true;
        }
        
        CompetitionState.initialized = true;
        CompetitionState.loading = true;
        
        // FIXED: Wait for Supabase to be ready before getting client
        if (window.SupabaseReady) {
            console.log('⏳ Waiting for Supabase client to be ready...');
            try {
                await window.SupabaseReady;
                console.log('✅ Supabase ready promise resolved');
            } catch (error) {
                console.warn('⚠️ Supabase ready promise failed:', error);
            }
        }
        
        // Get services after Supabase is ready
        CompetitionState.supabaseClient = window.supabase;
        CompetitionState.walletService = window.getWalletService?.();
        
        // Verify we have a proper Supabase client
        if (!CompetitionState.supabaseClient || typeof CompetitionState.supabaseClient.from !== 'function') {
            console.warn('⚠️ Supabase client not properly initialized, retrying...');
            
            // Short retry with explicit check
            await new Promise(resolve => setTimeout(resolve, 1000));
            CompetitionState.supabaseClient = window.supabase;
            
            if (!CompetitionState.supabaseClient || typeof CompetitionState.supabaseClient.from !== 'function') {
                throw new Error('Supabase client not available after retry');
            }
        }
        
        console.log('✅ Supabase client verified and ready for competitions');
        
        // Show loading state immediately
        showCompetitionsLoadingState();
        
        // Load real competitions from database
        await loadRealCompetitionsFromDatabase();
        
        // Show competitions display
        updateCompetitionsDisplayFixed();
        
        // Load user bets if wallet connected
        await loadUserBetsIfConnected();
        
        console.log('✅ Competition system initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Competition system initialization failed:', error);
        CompetitionState.error = error.message;
        showCompetitionsErrorState(error.message);
        return false;
    } finally {
        CompetitionState.loading = false;
    }
}

async function loadRealCompetitionsFromDatabase() {
    try {
        console.log('📊 Loading competitions from Supabase...');
        
        if (!CompetitionState.supabaseClient) {
            throw new Error('Supabase client not available');
        }
        
        // Verify client has required methods
        if (typeof CompetitionState.supabaseClient.from !== 'function') {
            throw new Error('Supabase client missing .from() method');
        }
        
        const { data: competitions, error } = await CompetitionState.supabaseClient
            .from('competitions')
            .select('*')
            .in('status', ['VOTING', 'ACTIVE'])
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Database query error:', error);
            throw new Error(`Database error: ${error.message}`);
        }
        
        console.log(`📊 Found ${competitions?.length || 0} competitions in database`);
        
        if (!competitions || competitions.length === 0) {
            // No competitions found
            CompetitionState.competitions = [];
            CompetitionState.votingCompetitions = [];
            CompetitionState.activeCompetitions = [];
            console.log('ℹ️ No active competitions found in database');
            return;
        }
        
        // Enhance competitions with token cache data
        const enhancedCompetitions = await enhanceCompetitionsWithTokenCache(competitions);
        
        // Store competitions
        CompetitionState.competitions = enhancedCompetitions;
        CompetitionState.votingCompetitions = enhancedCompetitions.filter(c => c.status === 'voting');
        CompetitionState.activeCompetitions = enhancedCompetitions.filter(c => c.status === 'active');
        
        console.log(`✅ Loaded ${enhancedCompetitions.length} competitions (${CompetitionState.votingCompetitions.length} voting, ${CompetitionState.activeCompetitions.length} active)`);
        
    } catch (error) {
        console.error('❌ Error loading competitions from database:', error);
        throw error;
    }
}

async function enhanceCompetitionsWithTokenCache(competitions) {
    console.log('🔗 Enhancing competitions with token cache data...');
    
    try {
        if (!CompetitionState.supabaseClient) {
            return transformBasicCompetitions(competitions);
        }
        
        // Get all unique token addresses
        const tokenAddresses = new Set();
        competitions.forEach(comp => {
            tokenAddresses.add(comp.token_a_address);
            tokenAddresses.add(comp.token_b_address);
        });
        
        // Fetch token cache data
        const { data: tokenCacheData, error: tokenError } = await CompetitionState.supabaseClient
            .from('token_cache')
            .select('*')
            .in('token_address', Array.from(tokenAddresses));
        
        if (tokenError) {
            console.warn('❌ Error fetching token cache data:', tokenError);
            return transformBasicCompetitions(competitions);
        }
        
        // Create lookup map for token data
        const tokenDataMap = new Map();
        if (tokenCacheData) {
            tokenCacheData.forEach(token => {
                tokenDataMap.set(token.token_address, token);
            });
        }
        
        // Transform competitions with token data
        const enhancedCompetitions = competitions.map(comp => {
            const tokenAData = tokenDataMap.get(comp.token_a_address);
            const tokenBData = tokenDataMap.get(comp.token_b_address);
            
            return {
                id: comp.competition_id,
                competitionId: comp.competition_id,
                status: determineCompetitionStatus(comp),
                
                tokenA: {
                    address: comp.token_a_address,
                    symbol: tokenAData?.symbol || comp.token_a_symbol || 'TOKEN',
                    name: tokenAData?.name || comp.token_a_name || 'Token A',
                    logo: tokenAData?.logo_uri || comp.token_a_logo || generateFallbackLogo(comp.token_a_symbol),
                    currentPrice: tokenAData?.current_price || 0,
                    priceChange1h: tokenAData?.price_change_1h || 0,
                    priceChange24h: tokenAData?.price_change_24h || 0,
                    marketCap: tokenAData?.market_cap_usd || 0,
                    volume24h: tokenAData?.volume_24h || 0,
                    dataQuality: tokenAData?.data_quality_score || 0
                },
                
                tokenB: {
                    address: comp.token_b_address,
                    symbol: tokenBData?.symbol || comp.token_b_symbol || 'TOKEN',
                    name: tokenBData?.name || comp.token_b_name || 'Token B',
                    logo: tokenBData?.logo_uri || comp.token_b_logo || generateFallbackLogo(comp.token_b_symbol),
                    currentPrice: tokenBData?.current_price || 0,
                    priceChange1h: tokenBData?.price_change_1h || 0,
                    priceChange24h: tokenBData?.price_change_24h || 0,
                    marketCap: tokenBData?.market_cap_usd || 0,
                    volume24h: tokenBData?.volume_24h || 0,
                    dataQuality: tokenBData?.data_quality_score || 0
                },
                
                timeRemaining: calculateTimeRemainingForComp(comp),
                timeRemainingType: determineCompetitionStatus(comp) === 'voting' ? 'voting' : 'performance',
                participants: comp.total_bets || 0,
                prizePool: parseFloat(comp.total_pool || 0),
                betAmount: parseFloat(comp.bet_amount || 0.1),
                
                startTime: new Date(comp.start_time),
                votingEndTime: new Date(comp.voting_end_time),
                endTime: new Date(comp.end_time),
                createdAt: new Date(comp.created_at),
                
                tokenAVotes: 0,
                tokenBVotes: 0,
                tokenAPerformance: comp.token_a_performance || null,
                tokenBPerformance: comp.token_b_performance || null,
                
                isRealData: true,
                platformFee: comp.platform_fee_percentage || 15
            };
        });
        
        console.log(`✅ Enhanced ${enhancedCompetitions.length} competitions with token cache data`);
        return enhancedCompetitions;
        
    } catch (error) {
        console.error('❌ Error enhancing competitions:', error);
        return transformBasicCompetitions(competitions);
    }
}

function transformBasicCompetitions(competitions) {
    return competitions.map(comp => ({
        id: comp.competition_id,
        competitionId: comp.competition_id,
        status: determineCompetitionStatus(comp),
        
        tokenA: {
            address: comp.token_a_address,
            symbol: comp.token_a_symbol || 'TOKEN',
            name: comp.token_a_name || 'Token A',
            logo: comp.token_a_logo || generateFallbackLogo(comp.token_a_symbol),
            currentPrice: 0,
            priceChange24h: 0,
            marketCap: 0,
            volume24h: 0
        },
        
        tokenB: {
            address: comp.token_b_address,
            symbol: comp.token_b_symbol || 'TOKEN',
            name: comp.token_b_name || 'Token B',
            logo: comp.token_b_logo || generateFallbackLogo(comp.token_b_symbol),
            currentPrice: 0,
            priceChange24h: 0,
            marketCap: 0,
            volume24h: 0
        },
        
        timeRemaining: calculateTimeRemainingForComp(comp),
        timeRemainingType: determineCompetitionStatus(comp) === 'voting' ? 'voting' : 'performance',
        participants: comp.total_bets || 0,
        prizePool: parseFloat(comp.total_pool || 0),
        betAmount: parseFloat(comp.bet_amount || 0.1),
        
        startTime: new Date(comp.start_time),
        endTime: new Date(comp.end_time),
        createdAt: new Date(comp.created_at),
        
        tokenAVotes: 0,
        tokenBVotes: 0,
        tokenAPerformance: comp.token_a_performance || null,
        tokenBPerformance: comp.token_b_performance || null,
        
        isRealData: true
    }));
}

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

function calculateTimeRemainingForComp(competition) {
    const now = new Date();
    const status = determineCompetitionStatus(competition);
    
    switch (status) {
        case 'voting':
            return new Date(competition.voting_end_time) - now;
        case 'active':
            return new Date(competition.end_time) - now;
        default:
            return 0;
    }
}

function calculateTimeRemaining(competition) {
    return calculateTimeRemainingForComp(competition);
}

// ==============================================
// FIXED DISPLAY SYSTEM (Immediate & Reliable)
// ==============================================

function updateCompetitionsDisplayFixed() {
    try {
        console.log('🎨 Updating competitions display (fixed)...');
        
        // Determine wallet connection status
        const isWalletConnected = checkWalletConnectionStatus();
        
        // Show appropriate view immediately
        showCompetitionsViewFixed(isWalletConnected);
        
        // Update content based on data availability
        if (CompetitionState.competitions.length > 0) {
            displayCompetitionsContent(isWalletConnected);
        } else {
            showNoCompetitionsMessage();
        }
        
        // Update stats
        updateCompetitionStatsDisplay();
        
        console.log('✅ Competitions display updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating competitions display:', error);
        showBasicCompetitionsMessage();
    }
}

function showCompetitionsViewFixed(isWalletConnected) {
    try {
        const disconnectedView = document.getElementById('competitionsDisconnected');
        const connectedView = document.getElementById('competitionsConnected');
        
        if (!disconnectedView || !connectedView) {
            console.error('❌ Competition view elements not found');
            return;
        }
        
        if (isWalletConnected) {
            // Show connected view
            disconnectedView.style.display = 'none';
            disconnectedView.classList.add('hidden');
            
            connectedView.style.display = 'block';
            connectedView.classList.remove('hidden');
            
            console.log('📊 Showing connected competitions view');
        } else {
            // Show disconnected view
            connectedView.style.display = 'none';
            connectedView.classList.add('hidden');
            
            disconnectedView.style.display = 'block';
            disconnectedView.classList.remove('hidden');
            
            console.log('🔗 Showing disconnected competitions view');
        }
        
    } catch (error) {
        console.error('❌ Error showing competitions view:', error);
    }
}

function displayCompetitionsContent(isWalletConnected) {
    try {
        const activeGrid = document.getElementById('activeGrid');
        if (!activeGrid) {
            console.error('❌ Active grid element not found');
            return;
        }
        
        // Filter and sort competitions
        const filteredCompetitions = getFilteredCompetitions();
        
        if (filteredCompetitions.length > 0) {
            // Generate competition cards
            const competitionsHTML = filteredCompetitions
                .map(competition => createCompetitionCardFixed(competition, isWalletConnected))
                .join('');
            
            activeGrid.innerHTML = competitionsHTML;
            
            console.log(`✅ Displayed ${filteredCompetitions.length} competitions`);
        } else {
            activeGrid.innerHTML = createEmptyCompetitionsState();
        }
        
    } catch (error) {
        console.error('❌ Error displaying competitions content:', error);
        showBasicCompetitionsMessage();
    }
}

function createCompetitionCardFixed(competition, isWalletConnected) {
    try {
        const statusLabels = {
            voting: 'Voting Open',
            active: 'Running'
        };
        
        const statusIcons = {
            voting: '🗳️',
            active: '⚡'
        };
        
        // Determine action button
        let actionButtonText = 'View Details';
        let buttonClass = 'action-button enhanced-action';
        
        if (competition.status === 'voting') {
            if (!isWalletConnected) {
                actionButtonText = 'Connect Wallet to Predict';
                buttonClass += ' wallet-required';
            } else {
                actionButtonText = 'Place Prediction';
            }
        } else if (competition.status === 'active') {
            actionButtonText = 'View Live Competition';
        }
        
        return `
            <div class="competition-card enhanced-card" 
                 data-competition-id="${competition.competitionId}"
                 data-status="${competition.status}"
                 onclick="handleCompetitionActionFixed('${competition.competitionId}', '${competition.status}', ${isWalletConnected})">
                
                <!-- Status Badge -->
                <div class="card-status ${competition.status}">
                    ${statusIcons[competition.status]} ${statusLabels[competition.status]}
                </div>
                
                <!-- Token Battle -->
                <div class="token-battle enhanced-battle">
                    <!-- Token A -->
                    <div class="token-info">
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
                        ${competition.tokenAVotes + competition.tokenBVotes > 0 ? `
                            <div class="vote-ratio">
                                ${Math.round((competition.tokenAVotes / (competition.tokenAVotes + competition.tokenBVotes)) * 100)}% - ${Math.round((competition.tokenBVotes / (competition.tokenAVotes + competition.tokenBVotes)) * 100)}%
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Token B -->
                    <div class="token-info">
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
                            ${competition.status === 'active' && competition.tokenBPerformance !== null ? `
                                <div class="performance ${competition.tokenBPerformance >= 0 ? 'positive' : 'negative'}">
                                    Perf: ${competition.tokenBPerformance >= 0 ? '+' : ''}${competition.tokenBPerformance.toFixed(2)}%
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Timer -->
                <div class="timer enhanced-timer">
                    <span class="timer-icon">⏱️</span>
                    <div class="timer-content">
                        <div class="timer-label">${competition.timeRemainingType === 'voting' ? 'Voting ends in' : 'Competition ends in'}</div>
                        <div class="time-remaining">
                            ${formatTimeRemaining(competition.timeRemaining)}
                        </div>
                    </div>
                </div>
                
                <!-- Stats -->
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
                        onclick="event.stopPropagation(); handleCompetitionActionFixed('${competition.competitionId}', '${competition.status}', ${isWalletConnected})">
                    ${actionButtonText}
                </button>
                
                <!-- Live Data Indicator -->
                <div class="data-indicator">
                    <span class="data-dot live"></span>
                    <span class="data-text">Live Data</span>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Error creating competition card:', error);
        return '<div class="competition-card-error">Error loading competition</div>';
    }
}

// Updated Competition Card Template with Vote Buttons
// This should be integrated into competition.js where competition cards are created

function createCompetitionCard(competition) {
    const isVoting = competition.phase === 'voting';
    const isActive = competition.phase === 'active';
    
    // Determine action button text and function
    let actionButton = '';
    if (isVoting) {
        // For voting phase, we don't show the main action button
        // Vote buttons are shown for each token instead
        actionButton = '';
    } else if (isActive) {
        actionButton = `
            <button class="action-button" onclick="openCompetitionModal('${competition.id}')">
                View Live Competition
            </button>
        `;
    } else {
        actionButton = `
            <button class="action-button" disabled>
                Competition Ended
            </button>
        `;
    }

    // Vote buttons for each token (only shown during voting phase)
    const voteButtonsHTML = isVoting ? `
        <div class="vote-buttons-container">
            <button class="vote-button" onclick="voteForToken('${competition.id}', 'A')" data-token="A">
                <span class="vote-icon">🗳️</span>
                Vote for ${competition.token_a_symbol}
            </button>
            <button class="vote-button" onclick="voteForToken('${competition.id}', 'B')" data-token="B">
                <span class="vote-icon">🗳️</span>
                Vote for ${competition.token_b_symbol}
            </button>
        </div>
    ` : '';

    return `
        <div class="competition-card" onclick="openCompetitionModal('${competition.id}')">
            <div class="card-status ${competition.phase}">${competition.phase.toUpperCase()}</div>
            
            <!-- Timer Section -->
            <div class="timer enhanced-timer ${getTimerUrgencyClass(competition)}">
                <div class="timer-content">
                    <div class="timer-label">${getTimerLabel(competition.phase)}</div>
                    <div class="time-remaining" data-end-time="${competition.end_time}">
                        ${formatTimeRemaining(competition.end_time)}
                    </div>
                </div>
            </div>

            <!-- Token Battle Display -->
            <div class="token-battle">
                <div class="token-info">
                    <img src="${competition.token_a_logo || '/api/placeholder/48/48'}" 
                         alt="${competition.token_a_symbol}" 
                         class="token-logo"
                         onerror="this.src='/api/placeholder/48/48'">
                    <div class="token-details">
                        <h4>${competition.token_a_symbol}</h4>
                        <div class="token-name">${competition.token_a_name}</div>
                        <div class="token-price">$${parseFloat(competition.token_a_price || 0).toFixed(4)}</div>
                        <div class="price-change ${parseFloat(competition.token_a_change || 0) >= 0 ? 'positive' : 'negative'}">
                            ${parseFloat(competition.token_a_change || 0) >= 0 ? '+' : ''}${parseFloat(competition.token_a_change || 0).toFixed(2)}%
                        </div>
                    </div>
                    ${isVoting ? `
                        <button class="vote-button" onclick="event.stopPropagation(); voteForToken('${competition.id}', 'A')" data-token="A">
                            <span class="vote-icon">🗳️</span>
                            Vote ${competition.token_a_symbol}
                        </button>
                    ` : ''}
                </div>
                
                <div class="vs-divider">
                    <div class="vs-text">VS</div>
                </div>
                
                <div class="token-info">
                    <img src="${competition.token_b_logo || '/api/placeholder/48/48'}" 
                         alt="${competition.token_b_symbol}" 
                         class="token-logo"
                         onerror="this.src='/api/placeholder/48/48'">
                    <div class="token-details">
                        <h4>${competition.token_b_symbol}</h4>
                        <div class="token-name">${competition.token_b_name}</div>
                        <div class="token-price">$${parseFloat(competition.token_b_price || 0).toFixed(4)}</div>
                        <div class="price-change ${parseFloat(competition.token_b_change || 0) >= 0 ? 'positive' : 'negative'}">
                            ${parseFloat(competition.token_b_change || 0) >= 0 ? '+' : ''}${parseFloat(competition.token_b_change || 0).toFixed(2)}%
                        </div>
                    </div>
                    ${isVoting ? `
                        <button class="vote-button" onclick="event.stopPropagation(); voteForToken('${competition.id}', 'B')" data-token="B">
                            <span class="vote-icon">🗳️</span>
                            Vote ${competition.token_b_symbol}
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Competition Stats -->
            <div class="card-stats">
                <div class="stat-item">
                    <div class="stat-value">${competition.total_bets || 0}</div>
                    <div class="stat-label">Participants</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${parseFloat(competition.total_pool || 0).toFixed(1)} SOL</div>
                    <div class="stat-label">Prize Pool</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${parseFloat(competition.entry_fee || 0.1).toFixed(1)} SOL</div>
                    <div class="stat-label">Entry Fee</div>
                </div>
            </div>

            <!-- Action Button (not shown during voting) -->
            ${actionButton}

            <!-- Data Source Indicator -->
            <div class="data-indicator">
                <div class="data-dot live"></div>
                <span>Live Data</span>
            </div>
        </div>
    `;
}

// Vote function that needs to be implemented
async function voteForToken(competitionId, tokenChoice) {
    try {
        console.log(`Voting for token ${tokenChoice} in competition ${competitionId}`);
        
        // Prevent event bubbling
        event.stopPropagation();
        
        // Check if user is connected
        if (!WalletState.isConnected) {
            openWalletModal();
            return;
        }

        // Disable the vote button to prevent double voting
        const voteButtons = document.querySelectorAll(`[data-token="${tokenChoice}"]`);
        voteButtons.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<span class="vote-icon">⏳</span> Voting...';
        });

        // Place the vote (integrate with existing betting system)
        const result = await placeBetOnToken(competitionId, tokenChoice, 0.1); // Default 0.1 SOL
        
        if (result.success) {
            // Show success feedback
            showNotification('Vote placed successfully!', 'success');
            
            // Refresh the competition display
            await loadActiveCompetitions();
        } else {
            throw new Error(result.error || 'Failed to place vote');
        }
        
    } catch (error) {
        console.error('Error voting for token:', error);
        showNotification('Failed to place vote: ' + error.message, 'error');
        
        // Re-enable vote buttons
        const voteButtons = document.querySelectorAll(`[data-token="${tokenChoice}"]`);
        voteButtons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = `<span class="vote-icon">🗳️</span> Vote ${tokenChoice}`;
        });
    }
}

// Helper function to get timer urgency class
function getTimerUrgencyClass(competition) {
    const timeRemaining = new Date(competition.end_time) - new Date();
    const hours = timeRemaining / (1000 * 60 * 60);
    
    if (timeRemaining <= 30 * 1000) { // 30 seconds
        return 'timer-final-countdown';
    } else if (hours <= 1) {
        return 'timer-critical';
    } else if (hours <= 6) {
        return 'timer-warning';
    } else if (hours <= 24) {
        return 'timer-caution';
    } else {
        return 'timer-normal';
    }
}

// Helper function to get timer label based on phase
function getTimerLabel(phase) {
    switch (phase) {
        case 'voting':
            return 'VOTING ENDS IN';
        case 'active':
            return 'COMPETITION ENDS IN';
        default:
            return 'ENDED';
    }
}

// Helper function for notifications (implement as needed)
function showNotification(message, type) {
    // Implement notification system
    console.log(`${type.toUpperCase()}: ${message}`);
}

// ==============================================
// MODAL SYSTEM (Simplified)
// ==============================================

function handleCompetitionActionFixed(competitionId, status, isWalletConnected) {
    console.log(`🎯 Competition action: ${competitionId}, status: ${status}, wallet: ${isWalletConnected}`);
    
    if (status === 'voting' && !isWalletConnected) {
        showNotificationFixed('Connect your wallet to place predictions', 'info');
        if (window.openWalletModal) {
            window.openWalletModal();
        }
        return;
    }
    
    openCompetitionModalFixed(competitionId);
}

function openCompetitionModalFixed(competitionId) {
    console.log(`🔍 Opening competition modal: ${competitionId}`);
    
    try {
        const competition = CompetitionState.competitions.find(c => c.competitionId === competitionId);
        
        if (!competition) {
            console.error('❌ Competition not found:', competitionId);
            showNotificationFixed('Competition not found', 'error');
            return;
        }
        
        CompetitionState.selectedCompetition = competition;
        CompetitionState.selectedToken = null;
        CompetitionState.betAmount = 0.1;
        
        const modal = document.getElementById('competitionModal');
        if (!modal) {
            console.error('❌ Competition modal not found');
            return;
        }
        
        // Update modal content
        updateCompetitionModalContent(competition);
        
        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        console.log('✅ Competition modal opened');
        
    } catch (error) {
        console.error('❌ Error opening competition modal:', error);
        showNotificationFixed('Failed to open competition details', 'error');
    }
}

function updateCompetitionModalContent(competition) {
    try {
        // Update modal title
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.textContent = competition.status === 'voting' ? 'Place Your Prediction' : 'Competition Details';
        }
        
        // Update token displays
        updateModalTokenDisplay('A', competition.tokenA);
        updateModalTokenDisplay('B', competition.tokenB);
        
        // Update stats
        const updateStat = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateStat('modalParticipants', competition.participants);
        updateStat('modalPrizePool', `${competition.prizePool.toFixed(1)} SOL`);
        updateStat('modalTimeRemaining', formatTimeRemaining(competition.timeRemaining));
        
        // Show/hide betting interface
        const bettingInterface = document.getElementById('bettingInterface');
        if (bettingInterface) {
            if (competition.status === 'voting') {
                bettingInterface.style.display = 'block';
                setupBettingInterface(competition);
            } else {
                bettingInterface.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('❌ Error updating modal content:', error);
    }
}

function updateModalTokenDisplay(token, tokenData) {
    try {
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        const updateAttribute = (id, attr, value) => {
            const element = document.getElementById(id);
            if (element) element.setAttribute(attr, value);
        };
        
        updateAttribute(`modalToken${token}Logo`, 'src', tokenData.logo);
        updateElement(`modalToken${token}Symbol`, tokenData.symbol);
        updateElement(`modalToken${token}Name`, tokenData.name);
        updateElement(`modalToken${token}Price`, `$${formatPrice(tokenData.currentPrice)}`);
        
        const changeElement = document.getElementById(`modalToken${token}Change`);
        if (changeElement) {
            changeElement.textContent = `${tokenData.priceChange24h >= 0 ? '+' : ''}${tokenData.priceChange24h.toFixed(2)}%`;
            changeElement.className = `price-change ${tokenData.priceChange24h >= 0 ? 'positive' : 'negative'}`;
        }
        
    } catch (error) {
        console.error('❌ Error updating modal token display:', error);
    }
}

function setupBettingInterface(competition) {
    try {
        // Update token choice buttons
        const updateChoiceButton = (id, symbol) => {
            const element = document.getElementById(id);
            if (element) element.textContent = symbol;
        };
        
        updateChoiceButton('choiceTokenASymbol', competition.tokenA.symbol);
        updateChoiceButton('choiceTokenBSymbol', competition.tokenB.symbol);
        
        // Reset bet amount
        const betAmountInput = document.getElementById('betAmount');
        if (betAmountInput) {
            betAmountInput.value = '0.1';
        }
        
        // Reset button state
        const placeBetButton = document.getElementById('placeBetButton');
        if (placeBetButton) {
            placeBetButton.disabled = true;
            placeBetButton.textContent = 'Select a token to continue';
        }
        
        // Clear selections
        document.querySelectorAll('.token-choice-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
    } catch (error) {
        console.error('❌ Error setting up betting interface:', error);
    }
}

function selectTokenFixed(token) {
    console.log('🎯 Token selected:', token);
    
    try {
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
        
    } catch (error) {
        console.error('❌ Error selecting token:', error);
    }
}

async function placeBetFixed() {
    console.log('📊 Placing bet (fixed)...');
    
    try {
        if (!CompetitionState.selectedToken || !CompetitionState.selectedCompetition) {
            showNotificationFixed('Please select a token first', 'error');
            return;
        }
        
        const betAmountInput = document.getElementById('betAmount');
        const betAmount = parseFloat(betAmountInput?.value || 0.1);
        
        if (betAmount < 0.1) {
            showNotificationFixed('Minimum bet amount is 0.1 SOL', 'error');
            return;
        }
        
        // Check wallet connection
        const walletAddress = getWalletAddress();
        if (!walletAddress) {
            showNotificationFixed('Wallet not connected', 'error');
            return;
        }
        
        const placeBetButton = document.getElementById('placeBetButton');
        if (placeBetButton) {
            placeBetButton.disabled = true;
            placeBetButton.textContent = 'Placing bet...';
        }
        
        // Place bet in database
        await placeBetInDatabase(betAmount, walletAddress);
        
        showNotificationFixed('Bet placed successfully!', 'success');
        closeCompetitionModalFixed();
        
        // Refresh competitions display
        setTimeout(() => {
            loadActiveCompetitionsFixed();  // ✅ reload + display updated competiion card data
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error placing bet:', error);
        showNotificationFixed(`Failed to place bet: ${error.message}`, 'error');
        
        const placeBetButton = document.getElementById('placeBetButton');
        if (placeBetButton) {
            placeBetButton.disabled = false;
            placeBetButton.textContent = 'Place Bet';
        }
    }
}

async function placeBetInDatabase(betAmount, walletAddress) {
    try {
        if (!CompetitionState.supabaseClient) {
            throw new Error('Database not available');
        }
        
        const betData = {
            user_wallet: walletAddress,
            competition_id: CompetitionState.selectedCompetition.competitionId,
            chosen_token: `token_${CompetitionState.selectedToken.toLowerCase()}`,
            amount: betAmount,
            status: 'PLACED',
            timestamp: new Date().toISOString()
        };
        
        console.log('💾 Inserting bet:', betData);
        
        const { data, error } = await CompetitionState.supabaseClient
            .from('bets')
            .insert([betData])
            .select();
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Bet saved to database:', data);
        
        // Update competition stats
        await updateCompetitionStats(CompetitionState.selectedCompetition.competitionId, betAmount);
        
    } catch (error) {
        console.error('❌ Database bet placement failed:', error);
        throw error;
    }
}

async function updateCompetitionStats(competitionId, betAmount) {
    try {
        console.log('🔍 updateCompetitionStats called - client exists:', !!CompetitionState.supabaseClient);
        
        if (!CompetitionState.supabaseClient) {
            console.error('❌ No Supabase client available');
            return;
        }
        
        console.log('🔍 About to fetch competition:', competitionId);
        console.log('🔍 About to query competitions table...');
        
        // Create query promise with timeout to catch hanging queries
        const queryPromise = CompetitionState.supabaseClient
            .from('competitions')
            .select('total_pool, total_bets')
            .eq('competition_id', competitionId)
            .single();
        
        // Timeout promise to catch hanging queries
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
        );
        
        // Race the query against timeout
        const { data: competition, error: fetchError } = await Promise.race([
            queryPromise,
            timeoutPromise
        ]);
        
        console.log('🔍 Query completed - data:', competition, 'error:', fetchError);
        
        if (fetchError) {
            console.error('❌ Error fetching competition for update:', fetchError);
            return;
        }
        
        if (!competition) {
            console.error('❌ Competition not found:', competitionId);
            return;
        }
        
        console.log('🔍 Current competition data:', competition);
        
        // Calculate new values
        const newTotalPool = (parseFloat(competition.total_pool || 0) + betAmount).toFixed(2);
        const newTotalBets = (competition.total_bets || 0) + 1;
        
        console.log('🔍 Updating to:', { 
            total_pool: newTotalPool, 
            total_bets: newTotalBets 
        });
        
        // Create update promise with timeout
        const updatePromise = CompetitionState.supabaseClient
            .from('competitions')
            .update({
                total_pool: newTotalPool,
                total_bets: newTotalBets
            })
            .eq('competition_id', competitionId);
        
        // Race update against timeout
        const { error: updateError } = await Promise.race([
            updatePromise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Update timeout after 5 seconds')), 5000)
            )
        ]);
        
        if (updateError) {
            console.error('❌ Error updating competition stats:', updateError);
            throw updateError;
        } else {
            console.log('✅ Competition stats updated successfully');
            console.log(`✅ Pool: ${competition.total_pool} → ${newTotalPool}`);
            console.log(`✅ Bets: ${competition.total_bets} → ${newTotalBets}`);
        }
        
    } catch (error) {
        if (error.message.includes('timeout')) {
            console.error('⏰ Database query timed out:', error);
        } else {
            console.error('❌ Error updating competition stats:', error);
        }
        throw error;
    }
}

function closeCompetitionModalFixed() {
    try {
        const modal = document.getElementById('competitionModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
        
        CompetitionState.selectedCompetition = null;
        CompetitionState.selectedToken = null;
        
        console.log('✅ Competition modal closed');
        
    } catch (error) {
        console.error('❌ Error closing competition modal:', error);
    }
}

// ==============================================
// SUPPORT FUNCTIONS
// ==============================================

async function loadActiveCompetitionsFixed() {
    console.log('🔄 Loading active competitions from database...');
    
    try {
        CompetitionState.loading = true;
        showCompetitionsLoadingState();
        
        // Load competitions from database
        await loadRealCompetitionsFromDatabase();
        
        // Update display
        updateCompetitionsDisplayFixed();
        
        // Load user bets if wallet connected
        await loadUserBetsIfConnected();
        
        console.log('✅ Active competitions loaded');
        
    } catch (error) {
        console.error('❌ Error loading active competitions:', error);
        CompetitionState.error = error.message;
        showCompetitionsErrorState(error.message);
    } finally {
        CompetitionState.loading = false;
    }
}

function initializeCompetitionsPageFixed() {
    console.log('🏁 Initializing competitions page (fixed)...');
    
    try {
        // Initialize if not already done
        if (!CompetitionState.initialized) {
            initializeCompetitionSystemFixed();
        } else {
            // Just update display
            updateCompetitionsDisplayFixed();
        }
        
        console.log('✅ Competitions page initialized');
        
    } catch (error) {
        console.error('❌ Error initializing competitions page:', error);
        showBasicCompetitionsMessage();
    }
}

async function loadUserBetsIfConnected() {
    try {
        const walletAddress = getWalletAddress();
        if (!walletAddress || !CompetitionState.supabaseClient) {
            return;
        }
        
        console.log('🎯 Loading user bets...');
        
        const { data: bets, error } = await CompetitionState.supabaseClient
            .from('bets')
            .select('*')
            .eq('user_wallet', walletAddress);
        
        if (!error && bets) {
            // Process user bets for display
            console.log(`✅ Loaded ${bets.length} user bets`);
        }
        
    } catch (error) {
        console.error('❌ Error loading user bets:', error);
    }
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

function checkWalletConnectionStatus() {
    try {
        // Check via app.js
        if (window.app && window.app.isWalletConnected) {
            return window.app.isWalletConnected();
        }
        
        // Check via wallet service
        if (CompetitionState.walletService && CompetitionState.walletService.isConnected) {
            return CompetitionState.walletService.isConnected();
        }
        
        // Check via global connected user
        if (window.connectedUser) {
            return true;
        }
        
        // Check UI state
        const traderInfo = document.getElementById('traderInfo');
        return traderInfo && traderInfo.style.display !== 'none';
        
    } catch (error) {
        console.warn('Error checking wallet connection:', error);
        return false;
    }
}

function getWalletAddress() {
    try {
        if (window.connectedUser?.walletAddress) {
            return window.connectedUser.walletAddress;
        }
        
        if (CompetitionState.walletService && CompetitionState.walletService.getWalletAddress) {
            return CompetitionState.walletService.getWalletAddress();
        }
        
        return null;
    } catch (error) {
        console.warn('Error getting wallet address:', error);
        return null;
    }
}

function getFilteredCompetitions() {
    let competitions = [...CompetitionState.competitions];
    
    // Apply phase filter
    if (CompetitionState.currentFilters.phase !== 'all') {
        competitions = competitions.filter(comp => comp.status === CompetitionState.currentFilters.phase);
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

function updateCompetitionStatsDisplay() {
    try {
        const totalCompetitions = CompetitionState.competitions.length;
        const votingCount = CompetitionState.votingCompetitions.length;
        const activeCount = CompetitionState.activeCompetitions.length;
        const totalParticipants = CompetitionState.competitions.reduce((sum, comp) => sum + comp.participants, 0);
        const totalPrizePool = CompetitionState.competitions.reduce((sum, comp) => sum + comp.prizePool, 0);
        
        const updateStat = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateStat('votingCompetitionsCount', votingCount);
        updateStat('activeCompetitionsCount', activeCount);
        updateStat('totalCompetitionsCount', totalCompetitions);
        updateStat('totalParticipants', totalParticipants.toLocaleString());
        updateStat('totalPrizePool', `${totalPrizePool.toFixed(1)} SOL`);
        updateStat('activeCompetitions', activeCount);

    } catch (error) {
        console.error('❌ Error updating competition stats:', error);
    }
}

function formatTimeRemaining(milliseconds) {
    if (milliseconds <= 0) return 'Ended';

    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
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

function generateFallbackLogo(symbol) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(symbol)}&background=8b5cf6&color=fff&size=48&bold=true`;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function showCompetitionsLoadingState() {
    try {
        const activeGrid = document.getElementById('activeGrid');
        if (activeGrid) {
            activeGrid.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading competitions from database...</p>
                </div>
            `;
        }
        
        // Ensure connected view is shown
        const isWalletConnected = checkWalletConnectionStatus();
        showCompetitionsViewFixed(isWalletConnected);
        
    } catch (error) {
        console.error('❌ Error showing loading state:', error);
    }
}

function showCompetitionsErrorState(errorMessage) {
    try {
        const activeGrid = document.getElementById('activeGrid');
        if (activeGrid) {
            activeGrid.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Error Loading Competitions</h3>
                    <p>${errorMessage}</p>
                    <button class="btn-primary" onclick="window.loadActiveCompetitions()">
                        🔄 Try Again
                    </button>
                </div>
            `;
        }
        
        // Ensure connected view is shown
        const isWalletConnected = checkWalletConnectionStatus();
        showCompetitionsViewFixed(isWalletConnected);
        
    } catch (error) {
        console.error('❌ Error showing error state:', error);
    }
}

function createEmptyCompetitionsState() {
    return `
        <div class="empty-state">
            <div class="empty-icon">🏆</div>
            <h3>No Competitions Available</h3>
            <p>New token prediction competitions will appear here when created.</p>
            <button class="btn-primary" onclick="window.loadActiveCompetitions()">
                🔄 Refresh
            </button>
        </div>
    `;
}

function showNoCompetitionsMessage() {
    const activeGrid = document.getElementById('activeGrid');
    if (activeGrid) {
        activeGrid.innerHTML = createEmptyCompetitionsState();
    }
}

function showBasicCompetitionsMessage() {
    const activeGrid = document.getElementById('activeGrid');
    if (activeGrid) {
        activeGrid.innerHTML = `
            <div class="basic-competitions-view">
                <div class="basic-icon">🏆</div>
                <h3>Competitions System</h3>
                <p>Token prediction competitions will load here.</p>
                <button class="btn-primary" onclick="window.initializeCompetitionSystem()">
                    🔄 Try Again
                </button>
            </div>
        `;
    }
}

function showNotificationFixed(message, type = 'info') {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    
    if (window.app && window.app.showNotification) {
        window.app.showNotification(message, type);
    } else {
        // Fallback notification
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// ==============================================
// GLOBAL EXPOSURE & INTEGRATION
// ==============================================

// Export for debugging
window.CompetitionState = CompetitionState;

console.log('✅ FIXED Competition.js loaded - Database-First with Supabase Ready Promise!');
console.log('🔧 CRITICAL FIXES:');
console.log('   ✅ DATABASE-FIRST loading - competitions from Supabase competitions table');
console.log('   ✅ SUPABASE READY PROMISE - waits for window.SupabaseReady before using client');
console.log('   ✅ CLIENT VERIFICATION - checks .from() method exists before using');
console.log('   ✅ RETRY LOGIC - handles client timing issues gracefully');
console.log('   ✅ PROPER show/hide logic - connected/disconnected views work correctly');
console.log('   ✅ TOKEN CACHE integration - enhanced with real token data');
console.log('   ✅ RELIABLE modal system - betting interface works with database');
console.log('   ✅ GRACEFUL error handling - proper loading and error states');
console.log('   ✅ WALLET integration - proper connection status checking');
console.log('   ✅ REAL BET PLACEMENT - saves to Supabase bets table');
console.log('🚀 Competitions loaded directly from database with proper timing!');
