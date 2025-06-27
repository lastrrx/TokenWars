// Enhanced Competition.js - Complete Database Integration Fix
// Fully functional competition system with real Supabase integration

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
    realTimeSubscription: null,
    initialized: false
};

/**
 * Initialize Competition System with Real Database Integration
 */
async function initializeCompetitionSystem() {
    console.log('🏁 Initializing enhanced competition system with real database...');
    
    try {
        // Prevent multiple initializations
        if (CompetitionState.initialized) {
            console.log('Competition system already initialized');
            return;
        }
        
        // Get service references with fallbacks
        CompetitionState.supabaseClient = window.supabaseClient || window.supabase;
        CompetitionState.walletService = window.walletService || window.getWalletService?.();
        CompetitionState.tokenService = window.tokenService || window.getTokenService?.();
        
        console.log('Service availability check:');
        console.log('- Supabase:', !!CompetitionState.supabaseClient);
        console.log('- Wallet Service:', !!CompetitionState.walletService);
        console.log('- Token Service:', !!CompetitionState.tokenService);
        
        // Initialize the page structure first
        await ensureCompetitionStructure();
        
        // Load competitions based on database availability
        if (CompetitionState.supabaseClient) {
            console.log('✅ Database available, loading real competitions...');
            await loadRealCompetitions();
        } else {
            console.log('📝 Database not available, loading demo competitions...');
            await loadDemoCompetitions();
        }
        
        // Set up real-time subscriptions if database available
        if (CompetitionState.supabaseClient) {
            setupRealTimeSubscriptions();
        }
        
        // Start periodic updates
        startPeriodicUpdates();
        
        CompetitionState.initialized = true;
        console.log('✅ Enhanced competition system initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize competition system:', error);
        // Always ensure demo data is available
        await loadDemoCompetitions();
        CompetitionState.initialized = true;
    }
}

/**
 * Ensure Competition Page Structure Exists
 */
async function ensureCompetitionStructure() {
    console.log('🏗️ Ensuring competition page structure...');
    
    const connectedView = document.getElementById('competitionsConnected');
    const disconnectedView = document.getElementById('competitionsDisconnected');
    
    if (!connectedView || !disconnectedView) {
        console.warn('⚠️ Competition view elements not found');
        return;
    }
    
    // Check if we need to create the competition structure
    const existingGrid = connectedView.querySelector('.competitions-grid');
    if (!existingGrid) {
        console.log('📝 Creating missing competition structure...');
        createCompetitionStructure();
    }
    
    // Update visibility based on wallet connection
    updateCompetitionPageVisibility();
}

/**
 * Create Competition Structure in Connected View
 */
function createCompetitionStructure() {
    const connectedView = document.getElementById('competitionsConnected');
    if (!connectedView) return;
    
    const competitionsHTML = `
        <section class="section">
            <div class="container">
                <div class="section-header">
                    <h2 class="section-title">COMPETITIONS</h2>
                    <p class="section-description">Predict token performance and earn SOL rewards</p>
                </div>
                
                <div class="competitions-container">
                    <!-- Voting Open Section -->
                    <div class="competition-section" id="votingSection">
                        <div class="section-header-mini">
                            <h3 class="section-title-mini">
                                🗳️ Voting Open 
                                <span class="count-badge" id="votingCount">0</span>
                            </h3>
                            <p class="section-description-mini">Join these competitions now - voting ends soon!</p>
                        </div>
                        <div class="competitions-grid" id="votingGrid">
                            <div class="loading">Loading voting competitions...</div>
                        </div>
                    </div>

                    <!-- Running Section -->
                    <div class="competition-section" id="runningSection">
                        <div class="section-header-mini">
                            <h3 class="section-title-mini">
                                ⚡ Currently Running 
                                <span class="count-badge" id="runningCount">0</span>
                            </h3>
                            <p class="section-description-mini">Watch these competitions in progress</p>
                        </div>
                        <div class="competitions-grid" id="runningGrid">
                            <div class="loading">Loading active competitions...</div>
                        </div>
                    </div>

                    <!-- Starting Soon Section -->
                    <div class="competition-section" id="upcomingSection">
                        <div class="section-header-mini">
                            <h3 class="section-title-mini">
                                ⏰ Starting Soon 
                                <span class="count-badge" id="upcomingCount">0</span>
                            </h3>
                            <p class="section-description-mini">Get ready for these upcoming competitions</p>
                        </div>
                        <div class="competitions-grid" id="upcomingGrid">
                            <div class="loading">Loading upcoming competitions...</div>
                        </div>
                    </div>

                    <!-- Completed Section -->
                    <div class="competition-section" id="completedSection">
                        <div class="section-header-mini">
                            <h3 class="section-title-mini">
                                🏁 Recently Completed 
                                <span class="count-badge" id="completedCount">0</span>
                            </h3>
                            <p class="section-description-mini">View results from recent competitions</p>
                        </div>
                        <div class="competitions-grid" id="completedGrid">
                            <div class="loading">Loading completed competitions...</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
    
    connectedView.innerHTML = competitionsHTML;
    console.log('✅ Competition structure created');
}

/**
 * Update Competition Page Visibility Based on Wallet Connection
 */
function updateCompetitionPageVisibility() {
    console.log('👀 Updating competition page visibility...');
    
    const connectedView = document.getElementById('competitionsConnected');
    const disconnectedView = document.getElementById('competitionsDisconnected');
    
    if (!connectedView || !disconnectedView) {
        console.warn('⚠️ Competition view elements not found');
        return;
    }
    
    const isConnected = checkWalletConnection();
    console.log(`💼 Wallet connection status: ${isConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
    
    if (isConnected) {
        connectedView.style.display = 'block';
        disconnectedView.style.display = 'none';
        console.log('✅ Showing connected competitions view');
    } else {
        connectedView.style.display = 'none';
        disconnectedView.style.display = 'block';
        console.log('❌ Showing disconnected view - wallet not connected');
    }
}

/**
 * Enhanced Wallet Connection Check
 */
function checkWalletConnection() {
    try {
        // Check multiple possible indicators
        const checks = [
            () => window.connectedUser && window.connectedUser !== null,
            () => window.currentUser && window.currentUser !== null,
            () => document.getElementById('traderInfo')?.style.display !== 'none',
            () => document.getElementById('navTraderName')?.textContent !== 'Trader',
            () => CompetitionState.walletService?.isConnected?.(),
            () => {
                const status = CompetitionState.walletService?.getConnectionStatus?.();
                return status?.isConnected;
            },
            () => document.getElementById('connectWalletBtn')?.style.display === 'none'
        ];
        
        return checks.some(check => {
            try {
                return check();
            } catch (error) {
                return false;
            }
        });
    } catch (error) {
        console.warn('Error checking wallet connection:', error);
        return false;
    }
}

/**
 * Load Real Competitions from Database
 */
async function loadRealCompetitions() {
    try {
        CompetitionState.loading = true;
        showLoadingState();
        
        console.log('📊 Loading real competitions from database...');
        
        let supabase = null;
        
        // Try multiple ways to get Supabase client
        if (CompetitionState.supabaseClient?.getSupabaseClient) {
            supabase = CompetitionState.supabaseClient.getSupabaseClient();
            console.log('✅ Got Supabase client from service');
        } else if (window.supabaseClient?.getSupabaseClient) {
            supabase = window.supabaseClient.getSupabaseClient();
            console.log('✅ Got Supabase client from window.supabaseClient');
        } else if (window.supabase) {
            supabase = window.supabase;
            console.log('✅ Got Supabase client from window.supabase');
        } else {
            console.warn('❌ No Supabase client available');
            throw new Error('Supabase client not available');
        }
        
        // Test the connection
        console.log('🧪 Testing Supabase connection...');
        const { data: testData, error: testError } = await supabase
            .from('competitions')
            .select('count')
            .limit(1);
            
        if (testError) {
            console.warn('Supabase connection test failed:', testError);
            throw new Error('Database connection failed');
        }
        
        console.log('✅ Supabase connection successful');
        
        // Get competitions from database
        const { data: competitions, error } = await supabase
            .from('competitions')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading competitions:', error);
            throw new Error(`Database query failed: ${error.message}`);
        }
        
        if (competitions && competitions.length > 0) {
            // Process and enhance competition data
            CompetitionState.activeCompetitions = await enhanceCompetitionsWithRealData(competitions);
            console.log(`✅ Loaded ${competitions.length} real competitions`);
            
            // Load user bets if wallet connected
            if (checkWalletConnection()) {
                await loadUserBets();
            }
            
        } else {
            console.log('ℹ️ No competitions found in database');
            CompetitionState.activeCompetitions = [];
        }
        
        CompetitionState.lastUpdate = new Date();
        updateCompetitionsDisplay();
        
    } catch (error) {
        console.error('❌ Failed to load real competitions:', error);
        console.log('📝 Falling back to demo competitions...');
        await loadDemoCompetitions();
    } finally {
        CompetitionState.loading = false;
    }
}

/**
 * Enhanced Competition Data Processing
 */
async function enhanceCompetitionsWithRealData(competitions) {
    console.log(`🔄 Processing ${competitions.length} competitions...`);
    
    const enhanced = [];
    
    for (const competition of competitions) {
        try {
            // Determine current status
            const status = determineCompetitionStatus(competition);
            
            // Calculate time remaining
            const timeRemaining = calculateTimeRemaining(competition, status);
            
            // Get token data if token service is available
            let tokenAData = null;
            let tokenBData = null;
            
            if (CompetitionState.tokenService) {
                try {
                    if (competition.token_a_address) {
                        tokenAData = await CompetitionState.tokenService.getTokenByAddress(competition.token_a_address);
                    }
                    if (competition.token_b_address) {
                        tokenBData = await CompetitionState.tokenService.getTokenByAddress(competition.token_b_address);
                    }
                } catch (tokenError) {
                    console.warn('Could not fetch token data:', tokenError);
                }
            }
            
            // Create enhanced competition object
            const enhancedCompetition = {
                id: competition.id || competition.competition_id,
                competitionId: competition.id || competition.competition_id,
                status: status,
                
                // Token A data
                tokenA: {
                    address: competition.token_a_address || '',
                    symbol: tokenAData?.symbol || competition.token_a_symbol || 'TOKEN_A',
                    name: tokenAData?.name || competition.token_a_name || 'Token A',
                    logo: tokenAData?.logoURI || generateFallbackLogo(competition.token_a_symbol || 'TOKEN_A'),
                    currentPrice: tokenAData?.price || parseFloat(competition.token_a_price || 0),
                    priceChange24h: tokenAData?.price_change_24h || 0,
                    marketCap: tokenAData?.market_cap || 0
                },
                
                // Token B data
                tokenB: {
                    address: competition.token_b_address || '',
                    symbol: tokenBData?.symbol || competition.token_b_symbol || 'TOKEN_B',
                    name: tokenBData?.name || competition.token_b_name || 'Token B',
                    logo: tokenBData?.logoURI || generateFallbackLogo(competition.token_b_symbol || 'TOKEN_B'),
                    currentPrice: tokenBData?.price || parseFloat(competition.token_b_price || 0),
                    priceChange24h: tokenBData?.price_change_24h || 0,
                    marketCap: tokenBData?.market_cap || 0
                },
                
                // Competition timing
                startTime: new Date(competition.start_time || Date.now()),
                votingEndTime: new Date(competition.voting_end_time || Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(competition.end_time || Date.now() + 7 * 24 * 60 * 60 * 1000),
                timeRemaining: timeRemaining,
                
                // Betting data
                participants: parseInt(competition.participant_count || 0),
                prizePool: parseFloat(competition.prize_pool || 0),
                tokenAVotes: parseInt(competition.token_a_votes || 0),
                tokenBVotes: parseInt(competition.token_b_votes || 0),
                totalBettingVolume: parseFloat(competition.total_betting_volume || 0),
                
                // Performance data (for running competitions)
                tokenAPerformance: parseFloat(competition.token_a_current_performance || 0),
                tokenBPerformance: parseFloat(competition.token_b_current_performance || 0),
                
                // Metadata
                createdAt: new Date(competition.created_at || Date.now()),
                isRealData: true,
                betAmount: parseFloat(competition.entry_fee || 0.1),
                platformFee: parseInt(competition.platform_fee || 15)
            };
            
            enhanced.push(enhancedCompetition);
            console.log(`✅ Enhanced competition: ${enhancedCompetition.tokenA.symbol} vs ${enhancedCompetition.tokenB.symbol}`);
            
        } catch (error) {
            console.error('Failed to enhance competition:', competition.id || competition.competition_id, error);
            // Skip this competition but continue with others
        }
    }
    
    console.log(`🎯 Successfully enhanced ${enhanced.length} competitions`);
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
    
    // Check explicit status first
    if (competition.status === 'RESOLVED' || competition.status === 'CANCELLED' || competition.status === 'completed') {
        return 'completed';
    }
    
    // Determine status based on timing
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
function calculateTimeRemaining(competition, status) {
    const now = new Date();
    
    switch (status) {
        case 'upcoming':
            return Math.max(0, new Date(competition.start_time) - now);
        case 'voting':
            return Math.max(0, new Date(competition.voting_end_time) - now);
        case 'running':
            return Math.max(0, new Date(competition.end_time) - now);
        default:
            return 0;
    }
}

/**
 * Load User Bets for Connected Wallet
 */
async function loadUserBets() {
    try {
        console.log('👤 Loading user bets...');
        
        if (!checkWalletConnection()) {
            console.log('No wallet connected, skipping user bets');
            return;
        }
        
        // Get wallet address
        let walletAddress = null;
        try {
            if (CompetitionState.walletService?.getWalletAddress) {
                walletAddress = CompetitionState.walletService.getWalletAddress();
            } else if (window.connectedUser?.walletAddress) {
                walletAddress = window.connectedUser.walletAddress;
            } else if (window.currentUser?.walletAddress) {
                walletAddress = window.currentUser.walletAddress;
            }
        } catch (error) {
            console.warn('Could not get wallet address:', error);
        }
        
        if (!walletAddress) {
            console.log('No wallet address available');
            return;
        }
        
        // Get Supabase client
        let supabase = null;
        if (CompetitionState.supabaseClient?.getSupabaseClient) {
            supabase = CompetitionState.supabaseClient.getSupabaseClient();
        } else if (window.supabaseClient?.getSupabaseClient) {
            supabase = window.supabaseClient.getSupabaseClient();
        } else if (window.supabase) {
            supabase = window.supabase;
        }
        
        if (!supabase) {
            console.log('No Supabase client available for user bets');
            return;
        }
        
        // Query user bets
        const { data: bets, error } = await supabase
            .from('bets')
            .select('*')
            .eq('user_wallet', walletAddress)
            .in('status', ['PLACED', 'WON', 'LOST']);
        
        if (error) {
            console.warn('Error loading user bets:', error);
            return;
        }
        
        if (bets && bets.length > 0) {
            // Store bets by competition ID
            CompetitionState.userBets.clear();
            bets.forEach(bet => {
                CompetitionState.userBets.set(bet.competition_id, bet);
            });
            
            console.log(`✅ Loaded ${bets.length} user bets`);
        } else {
            console.log('No user bets found');
        }
        
    } catch (error) {
        console.error('Failed to load user bets:', error);
    }
}

/**
 * Update Competition Display
 */
function updateCompetitionsDisplay() {
    console.log('🎨 Updating competitions display...');
    
    // Show loading state if still loading
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
    
    // Start timers
    startCompetitionTimers();
    
    console.log('✅ Competition display updated');
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
    
    // Sort each group appropriately
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
    if (!grid) {
        console.warn(`Grid element ${sectionName}Grid not found`);
        return;
    }
    
    if (competitions.length === 0) {
        grid.innerHTML = createEmptyState(sectionName);
        return;
    }
    
    const cardsHTML = competitions.map(competition => 
        createCompetitionCard(competition)
    ).join('');
    
    grid.innerHTML = cardsHTML;
}

/**
 * Create Competition Card
 */
function createCompetitionCard(competition) {
    const userBet = CompetitionState.userBets.get(competition.competitionId);
    const hasUserBet = !!userBet;
    const userPrediction = userBet?.chosen_token;
    
    const statusIcons = {
        voting: '🗳️',
        running: '⚡',
        upcoming: '⏰',
        completed: '🏁'
    };
    
    const statusLabels = {
        voting: 'Voting Open',
        running: 'Running',
        upcoming: 'Starting Soon',
        completed: 'Completed'
    };
    
    return `
        <div class="competition-card" 
             data-competition-id="${competition.competitionId}"
             data-status="${competition.status}"
             onclick="openCompetitionModal('${competition.competitionId}')">
            
            <div class="competition-header">
                <div class="competition-id">#${competition.competitionId}</div>
                <div class="competition-status status-${competition.status}">
                    ${statusIcons[competition.status]} ${statusLabels[competition.status]}
                </div>
            </div>
            
            ${hasUserBet ? `
                <div class="user-bet-indicator">
                    🎯 Your Prediction: ${userPrediction === 'token_a' ? competition.tokenA.symbol : competition.tokenB.symbol}
                </div>
            ` : ''}
            
            <div class="tokens-battle">
                <div class="token-info ${userPrediction === 'token_a' ? 'user-selected' : ''}">
                    <img src="${competition.tokenA.logo}" 
                         alt="${competition.tokenA.symbol}" 
                         class="token-logo"
                         onerror="this.src='${generateFallbackLogo(competition.tokenA.symbol)}'" />
                    <div class="token-symbol">${competition.tokenA.symbol}</div>
                    <div class="token-name">${truncateText(competition.tokenA.name, 20)}</div>
                    ${competition.tokenA.currentPrice > 0 ? `
                        <div class="token-price">$${competition.tokenA.currentPrice.toFixed(6)}</div>
                    ` : ''}
                </div>
                
                <div class="vs-separator">
                    <div class="vs-text">VS</div>
                    <div class="competition-timer">
                        <div class="timer-label">${getTimerLabel(competition.status)}</div>
                        <div class="timer-value" data-time="${competition.timeRemaining}" data-status="${competition.status}">
                            ${formatTimeRemaining(competition.timeRemaining, competition.status)}
                        </div>
                    </div>
                </div>
                
                <div class="token-info ${userPrediction === 'token_b' ? 'user-selected' : ''}">
                    <img src="${competition.tokenB.logo}" 
                         alt="${competition.tokenB.symbol}" 
                         class="token-logo"
                         onerror="this.src='${generateFallbackLogo(competition.tokenB.symbol)}'" />
                    <div class="token-symbol">${competition.tokenB.symbol}</div>
                    <div class="token-name">${truncateText(competition.tokenB.name, 20)}</div>
                    ${competition.tokenB.currentPrice > 0 ? `
                        <div class="token-price">$${competition.tokenB.currentPrice.toFixed(6)}</div>
                    ` : ''}
                </div>
            </div>
            
            <div class="competition-stats">
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
            
            <div class="betting-section">
                ${getBettingButtons(competition, hasUserBet)}
            </div>
            
            <div class="data-indicator">
                <span class="data-dot ${competition.isRealData ? 'live' : 'demo'}"></span>
                <span class="data-text">${competition.isRealData ? 'Live Data' : 'Demo Data'}</span>
            </div>
        </div>
    `;
}

/**
 * Get Betting Buttons Based on Competition Status
 */
function getBettingButtons(competition, hasUserBet) {
    if (hasUserBet) {
        return `<button class="bet-button" disabled>✅ Prediction Placed</button>`;
    }
    
    switch (competition.status) {
        case 'voting':
            return `
                <button class="bet-button" onclick="event.stopPropagation(); placeBet('${competition.competitionId}', 'token_a')">
                    <div class="bet-button-label">Predict</div>
                    <div class="bet-button-token">${competition.tokenA.symbol}</div>
                </button>
                <button class="bet-button" onclick="event.stopPropagation(); placeBet('${competition.competitionId}', 'token_b')">
                    <div class="bet-button-label">Predict</div>
                    <div class="bet-button-token">${competition.tokenB.symbol}</div>
                </button>
            `;
        case 'running':
            return `<button class="bet-button" disabled>⚡ Running</button>`;
        case 'upcoming':
            return `<button class="bet-button" disabled>⏰ Coming Soon</button>`;
        case 'completed':
            return `<button class="bet-button" disabled>🏁 Completed</button>`;
        default:
            return `<button class="bet-button" disabled>View Details</button>`;
    }
}

/**
 * Place Bet Function
 */
async function placeBet(competitionId, chosenToken) {
    try {
        console.log(`💰 Placing bet: ${competitionId}, token: ${chosenToken}`);
        
        // Check wallet connection
        if (!checkWalletConnection()) {
            showNotification('Please connect your wallet to place predictions', 'warning');
            if (window.openWalletModal) {
                window.openWalletModal();
            }
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
        
        // Check if user already has a bet
        const existingBet = CompetitionState.userBets.get(competitionId);
        if (existingBet) {
            showNotification('You have already placed a prediction for this competition', 'info');
            return;
        }
        
        // Get token name for confirmation
        const tokenName = chosenToken === 'token_a' ? competition.tokenA.symbol : competition.tokenB.symbol;
        
        // Show confirmation
        const confirmed = confirm(`Place ${competition.betAmount} SOL bet on ${tokenName}?\n\nThis prediction cannot be changed once placed.`);
        if (!confirmed) return;
        
        showNotification('Processing bet...', 'info');
        
        // Get Supabase client for real bet placement
        let supabase = null;
        if (CompetitionState.supabaseClient?.getSupabaseClient) {
            supabase = CompetitionState.supabaseClient.getSupabaseClient();
        } else if (window.supabaseClient?.getSupabaseClient) {
            supabase = window.supabaseClient.getSupabaseClient();
        } else if (window.supabase) {
            supabase = window.supabase;
        }
        
        if (supabase) {
            // Real database bet placement
            await placeBetInDatabase(supabase, competitionId, chosenToken, competition, tokenName);
        } else {
            // Demo mode bet placement
            await placeDemoBet(competitionId, chosenToken, competition, tokenName);
        }
        
    } catch (error) {
        console.error('Failed to place bet:', error);
        showNotification(`Failed to place bet: ${error.message}`, 'error');
    }
}

/**
 * Place Bet in Database
 */
async function placeBetInDatabase(supabase, competitionId, chosenToken, competition, tokenName) {
    try {
        // Get wallet address
        let walletAddress = null;
        if (CompetitionState.walletService?.getWalletAddress) {
            walletAddress = CompetitionState.walletService.getWalletAddress();
        } else if (window.connectedUser?.walletAddress) {
            walletAddress = window.connectedUser.walletAddress;
        } else if (window.currentUser?.walletAddress) {
            walletAddress = window.currentUser.walletAddress;
        }
        
        if (!walletAddress) {
            throw new Error('Could not get wallet address');
        }
        
        // Create bet record
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
        
        // Store bet locally
        CompetitionState.userBets.set(competitionId, bet);
        
        // Update competition stats locally
        updateCompetitionStats(competition, chosenToken);
        
        showNotification(`Bet placed successfully on ${tokenName}!`, 'success');
        
        // Refresh display
        updateCompetitionsDisplay();
        
    } catch (error) {
        throw new Error(`Database bet failed: ${error.message}`);
    }
}

/**
 * Place Demo Bet
 */
async function placeDemoBet(competitionId, chosenToken, competition, tokenName) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create demo bet
    const demoBet = {
        competition_id: competitionId,
        chosen_token: chosenToken,
        amount: competition.betAmount,
        status: 'PLACED',
        timestamp: new Date().toISOString()
    };
    
    // Store bet locally
    CompetitionState.userBets.set(competitionId, demoBet);
    
    // Update competition stats locally
    updateCompetitionStats(competition, chosenToken);
    
    showNotification(`Demo bet placed on ${tokenName}!`, 'success');
    
    // Refresh display
    updateCompetitionsDisplay();
}

/**
 * Update Competition Stats After Bet
 */
function updateCompetitionStats(competition, chosenToken) {
    if (chosenToken === 'token_a') {
        competition.tokenAVotes += 1;
    } else {
        competition.tokenBVotes += 1;
    }
    competition.participants += 1;
    competition.prizePool += competition.betAmount;
}

/**
 * Open Competition Modal
 */
function openCompetitionModal(competitionId) {
    const competition = CompetitionState.activeCompetitions.find(c => c.competitionId === competitionId);
    if (!competition) {
        console.warn('Competition not found:', competitionId);
        return;
    }
    
    const userBet = CompetitionState.userBets.get(competitionId);
    
    // Simple alert for now - can be enhanced with a proper modal later
    let message = `Competition: ${competition.tokenA.symbol} vs ${competition.tokenB.symbol}\n`;
    message += `Status: ${competition.status}\n`;
    message += `Participants: ${competition.participants}\n`;
    message += `Prize Pool: ${competition.prizePool.toFixed(1)} SOL\n`;
    message += `Entry Fee: ${competition.betAmount} SOL\n`;
    
    if (userBet) {
        const predictedToken = userBet.chosen_token === 'token_a' ? competition.tokenA.symbol : competition.tokenB.symbol;
        message += `\nYour Prediction: ${predictedToken}\n`;
        message += `Bet Amount: ${userBet.amount} SOL`;
    }
    
    alert(message);
}

/**
 * Load Demo Competitions (Fallback)
 */
async function loadDemoCompetitions() {
    console.log('📝 Loading demo competitions...');
    
    const now = Date.now();
    
    const demoCompetitions = [
        {
            competitionId: 'demo-1',
            status: 'voting',
            tokenA: {
                address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB263',
                symbol: 'BONK',
                name: 'Bonk',
                logo: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
                currentPrice: 0.000023,
                priceChange24h: 2.5,
                marketCap: 1500000000
            },
            tokenB: {
                address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
                symbol: 'POPCAT',
                name: 'Popcat',
                logo: generateFallbackLogo('POPCAT'),
                currentPrice: 1.45,
                priceChange24h: -1.2,
                marketCap: 1400000000
            },
            startTime: new Date(now - 24 * 60 * 60 * 1000),
            votingEndTime: new Date(now + 2 * 24 * 60 * 60 * 1000),
            endTime: new Date(now + 9 * 24 * 60 * 60 * 1000),
            timeRemaining: 2 * 24 * 60 * 60 * 1000,
            participants: 42,
            prizePool: 4.2,
            tokenAVotes: 25,
            tokenBVotes: 17,
            betAmount: 0.1,
            platformFee: 15,
            isRealData: false
        },
        {
            competitionId: 'demo-2',
            status: 'running',
            tokenA: {
                address: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL',
                name: 'Solana',
                logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
                currentPrice: 180.50,
                priceChange24h: 3.2,
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
            startTime: new Date(now - 4 * 24 * 60 * 60 * 1000),
            votingEndTime: new Date(now - 24 * 60 * 60 * 1000),
            endTime: new Date(now + 3 * 24 * 60 * 60 * 1000),
            timeRemaining: 3 * 24 * 60 * 60 * 1000,
            participants: 78,
            prizePool: 7.8,
            tokenAVotes: 45,
            tokenBVotes: 33,
            tokenAPerformance: 1.5,
            tokenBPerformance: 0.05,
            betAmount: 0.1,
            platformFee: 15,
            isRealData: false
        },
        {
            competitionId: 'demo-3',
            status: 'upcoming',
            tokenA: {
                address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
                symbol: 'mSOL',
                name: 'Marinade SOL',
                logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
                currentPrice: 195.30,
                priceChange24h: 2.8,
                marketCap: 1200000000
            },
            tokenB: {
                address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                symbol: 'JUP',
                name: 'Jupiter',
                logo: 'https://static.jup.ag/jup/icon.png',
                currentPrice: 1.15,
                priceChange24h: -0.5,
                marketCap: 1500000000
            },
            startTime: new Date(now + 6 * 60 * 60 * 1000),
            votingEndTime: new Date(now + 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
            endTime: new Date(now + 10 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
            timeRemaining: 6 * 60 * 60 * 1000,
            participants: 0,
            prizePool: 0,
            tokenAVotes: 0,
            tokenBVotes: 0,
            betAmount: 0.1,
            platformFee: 15,
            isRealData: false
        }
    ];
    
    CompetitionState.activeCompetitions = demoCompetitions;
    updateCompetitionsDisplay();
    
    console.log('✅ Demo competitions loaded');
}

/**
 * Setup Real-Time Subscriptions
 */
function setupRealTimeSubscriptions() {
    try {
        if (!CompetitionState.supabaseClient?.getSupabaseClient) {
            console.log('📡 Real-time subscriptions not available - no Supabase client');
            return;
        }
        
        const supabase = CompetitionState.supabaseClient.getSupabaseClient();
        if (!supabase.channel) {
            console.log('📡 Real-time subscriptions not available - no channel method');
            return;
        }
        
        // Subscribe to competition and bet changes
        CompetitionState.realTimeSubscription = supabase
            .channel('competitions_changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'competitions' },
                (payload) => {
                    console.log('🔄 Competition changed:', payload);
                    setTimeout(() => loadRealCompetitions(), 1000);
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'bets' },
                (payload) => {
                    console.log('🎯 Bet changed:', payload);
                    setTimeout(() => loadRealCompetitions(), 1000);
                }
            )
            .subscribe();
        
        console.log('✅ Real-time subscriptions established');
        
    } catch (error) {
        console.error('Failed to setup real-time subscriptions:', error);
    }
}

/**
 * Start Periodic Updates
 */
function startPeriodicUpdates() {
    // Update every 5 minutes
    if (!window.competitionUpdateInterval) {
        window.competitionUpdateInterval = setInterval(async () => {
            try {
                if (document.getElementById('competitionsPage')?.classList.contains('active')) {
                    console.log('🔄 Periodic competition update...');
                    if (CompetitionState.supabaseClient) {
                        await loadRealCompetitions();
                    }
                }
            } catch (error) {
                console.error('Periodic update failed:', error);
            }
        }, 5 * 60 * 1000);
    }
    
    console.log('✅ Periodic updates started (5-minute intervals)');
}

/**
 * Start Competition Timers
 */
function startCompetitionTimers() {
    if (!window.competitionTimerInterval) {
        window.competitionTimerInterval = setInterval(() => {
            document.querySelectorAll('.timer-value').forEach(timer => {
                const timeLeft = parseInt(timer.dataset.time) || 0;
                const status = timer.dataset.status;
                const newTime = Math.max(0, timeLeft - 1000);
                
                timer.dataset.time = newTime;
                timer.textContent = formatTimeRemaining(newTime, status);
                
                // Update competition state
                const card = timer.closest('.competition-card');
                if (card) {
                    const compId = card.dataset.competitionId;
                    const comp = CompetitionState.activeCompetitions.find(c => c.competitionId === compId);
                    if (comp) {
                        comp.timeRemaining = newTime;
                        
                        // Check if status needs to change
                        if (newTime <= 0) {
                            setTimeout(() => {
                                if (CompetitionState.supabaseClient) {
                                    loadRealCompetitions();
                                } else {
                                    updateCompetitionsDisplay();
                                }
                            }, 1000);
                        }
                    }
                }
            });
        }, 1000);
    }
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
 * Show Loading State
 */
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

/**
 * Create Empty State
 */
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

/**
 * Show Notification
 */
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
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

/**
 * Utility Functions
 */

function formatTimeRemaining(milliseconds, status) {
    if (milliseconds <= 0) {
        const endLabels = {
            upcoming: 'Voting Open',
            voting: 'Competition Started',
            running: 'Competition Ended',
            completed: 'Ended'
        };
        return endLabels[status] || 'Ended';
    }

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

function getTimerLabel(status) {
    const labels = {
        upcoming: 'VOTING STARTS',
        voting: 'VOTING ENDS',
        running: 'ENDS IN',
        completed: 'ENDED'
    };
    return labels[status] || 'TIME';
}

function generateFallbackLogo(symbol) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(symbol)}&background=8b5cf6&color=fff&size=48&bold=true`;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Integration Functions for Main App
 */

// Function to be called when competitions page is shown
function initializeCompetitionsPage() {
    console.log('🏁 Initializing competitions page from main app...');
    
    // Update page visibility first
    updateCompetitionPageVisibility();
    
    // Initialize or refresh competitions
    if (!CompetitionState.initialized) {
        initializeCompetitionSystem();
    } else {
        // Just refresh display
        updateCompetitionsDisplay();
    }
}

// Function to handle wallet connection changes
function handleWalletConnectionChange(isConnected, walletAddress) {
    console.log('👛 Wallet connection changed:', isConnected, walletAddress);
    
    // Update page visibility
    updateCompetitionPageVisibility();
    
    if (isConnected) {
        // Load user bets for connected wallet
        loadUserBets().then(() => {
            updateCompetitionsDisplay();
        });
    } else {
        // Clear user bets
        CompetitionState.userBets.clear();
        updateCompetitionsDisplay();
    }
}

// Function to cleanup when leaving page
function cleanupCompetitionsPage() {
    console.log('🧹 Cleaning up competitions page...');
    
    // Cancel real-time subscription
    if (CompetitionState.realTimeSubscription) {
        try {
            CompetitionState.realTimeSubscription.unsubscribe();
        } catch (error) {
            console.warn('Error unsubscribing from real-time updates:', error);
        }
        CompetitionState.realTimeSubscription = null;
    }
    
    // Clear intervals
    if (window.competitionUpdateInterval) {
        clearInterval(window.competitionUpdateInterval);
        window.competitionUpdateInterval = null;
    }
    
    if (window.competitionTimerInterval) {
        clearInterval(window.competitionTimerInterval);
        window.competitionTimerInterval = null;
    }
}

/**
 * Global Exports
 */
window.initializeCompetitionSystem = initializeCompetitionSystem;
window.loadRealCompetitions = loadRealCompetitions;
window.loadDemoCompetitions = loadDemoCompetitions;
window.updateCompetitionsDisplay = updateCompetitionsDisplay;
window.updateCompetitionPageVisibility = updateCompetitionPageVisibility;
window.openCompetitionModal = openCompetitionModal;
window.placeBet = placeBet;
window.initializeCompetitionsPage = initializeCompetitionsPage;
window.handleWalletConnectionChange = handleWalletConnectionChange;
window.cleanupCompetitionsPage = cleanupCompetitionsPage;

// For debugging and development
window.CompetitionState = CompetitionState;
window.checkWalletConnection = checkWalletConnection;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Competition.js DOM ready, setting up...');
    
    // Wait a bit for other services to initialize
    setTimeout(() => {
        // Only initialize if we're on the competitions page
        const competitionsPage = document.getElementById('competitionsPage');
        if (competitionsPage && competitionsPage.classList.contains('active')) {
            initializeCompetitionSystem();
        }
    }, 1000);
});

console.log('✅ Enhanced Competition.js loaded successfully');
console.log('🚀 Available Features:');
console.log('   ✅ Real Supabase database integration');
console.log('   ✅ Automatic page structure creation');
console.log('   ✅ Enhanced wallet connection detection');
console.log('   ✅ Real-time competition data');
console.log('   ✅ User bet tracking and placement');
console.log('   ✅ Live timers and status updates');
console.log('   ✅ Demo mode fallback');
console.log('   ✅ Responsive competition cards');
console.log('   ✅ Notification system');
console.log('   ✅ Error handling and recovery');
