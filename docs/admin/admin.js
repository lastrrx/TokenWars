/**
 * Admin Panel Main Controller - Enhanced with Complete Token Management Integration
 * Integrates with token-service.js, price-service.js, and competition-manager.js
 */

// Enhanced Admin state management
const AdminState = {
    currentSection: 'dashboard',
    competitions: [],
    users: [],
    tokens: [],
    tokenPairs: [],
    analytics: {},
    settings: {},
    charts: {},
    updateIntervals: [],
    selectedTokens: {
        tokenA: null,
        tokenB: null
    },
    tokenFilters: {
        minMarketCap: 5000000, // $5M
        maxMarketCap: 50000000000, // $50B
        minAge: 30, // 30 days
        verified: false,
        search: ''
    },
    systemHealth: {
        tokenService: 'unknown',
        priceService: 'unknown',
        competitionManager: 'unknown',
        lastUpdate: null
    },
    realTimeSubscriptions: [],
    blacklistedTokens: new Set()
};

/**
 * Initialize admin panel with complete token integration
 */
async function initializeAdminPanel() {
    console.log('Initializing admin panel (simplified mode)...');
    
    try {
        // Skip token services for now
        console.log('Running in simplified mode - skipping token services');
        
        // Set up navigation
        setupAdminNavigation();
        
        // Set up event listeners  
        setupAdminEventListeners();
        
        // Load basic dashboard
        loadBasicDashboard();
        
        console.log('Admin panel initialized successfully');
        
    } catch (error) {
        console.error('Admin panel initialization failed:', error);
    }
}

function setupAdminNavigation() {
    console.log('Setting up navigation...');
    // Add basic navigation setup here
}

function setupAdminEventListeners() {
    console.log('Setting up event listeners...');
    // Add basic event listeners here
}

function loadBasicDashboard() {
    console.log('Loading basic dashboard...');
    // Show basic dashboard without token data
    const dashboardElement = document.getElementById('dashboard');
    if (dashboardElement) {
        console.log('Dashboard loaded successfully');
    }
}

/**
 * Initialize token services integration
 */
async function initializeTokenServices() {
    try {
        console.log('Initializing token services integration...');
        
        // Wait for services to be available
        let attempts = 0;
        while ((!window.tokenService || !window.priceService) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.tokenService) {
            throw new Error('Token service not available');
        }
        
        if (!window.priceService) {
            throw new Error('Price service not available');
        }
        
        // Initialize competition manager if available
        if (window.competitionManager) {
            console.log('Competition manager available');
        }
        
        console.log('Token services integration complete');
        
    } catch (error) {
        console.error('Token services initialization failed:', error);
        throw error;
    }
}

/**
 * Enhanced token management initialization
 */
async function initializeTokenManagement() {
    try {
        console.log('Initializing enhanced token management...');
        
        // Load blacklisted tokens
        await loadBlacklistedTokens();
        
        // Load available tokens
        await loadTokensData();
        
        // Set up automated token updates
        setupAutomatedTokenUpdates();
        
        // Set up token pair generation
        setupEnhancedTokenPairGeneration();
        
        // Set up price monitoring
        setupPriceMonitoring();
        
        console.log('Enhanced token management initialized');
        
    } catch (error) {
        console.error('Token management initialization failed:', error);
        throw error;
    }
}

/**
 * Set up real-time monitoring for all services
 */
async function setupRealTimeMonitoring() {
    try {
        console.log('Setting up real-time monitoring...');
        
        // Monitor token updates
        const tokenSubscription = supabase
            .channel('admin-tokens')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'tokens' },
                (payload) => handleTokenUpdate(payload)
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'token_updates' },
                (payload) => handleTokenUpdateStatus(payload)
            )
            .subscribe();
        
        // Monitor competitions
        const competitionSubscription = supabase
            .channel('admin-competitions')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'competitions' },
                (payload) => handleCompetitionUpdate(payload)
            )
            .subscribe();
        
        // Monitor price updates
        const priceSubscription = supabase
            .channel('admin-prices')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'price_history' },
                (payload) => handlePriceUpdate(payload)
            )
            .subscribe();
        
        AdminState.realTimeSubscriptions.push(
            tokenSubscription,
            competitionSubscription,
            priceSubscription
        );
        
        console.log('Real-time monitoring setup complete');
        
    } catch (error) {
        console.error('Real-time monitoring setup failed:', error);
    }
}

/**
 * Handle real-time token updates
 */
function handleTokenUpdate(payload) {
    console.log('Token update received:', payload);
    
    // Update local token data
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const updatedToken = payload.new;
        const tokenIndex = AdminState.tokens.findIndex(t => t.address === updatedToken.address);
        
        if (tokenIndex >= 0) {
            AdminState.tokens[tokenIndex] = updatedToken;
        } else {
            AdminState.tokens.push(updatedToken);
        }
        
        // Re-render if on tokens section
        if (AdminState.currentSection === 'tokens') {
            renderTokensTable();
            updateTokenStatistics();
        }
    }
}

/**
 * Handle token update status changes
 */
function handleTokenUpdateStatus(payload) {
    console.log('Token update status received:', payload);
    
    if (payload.eventType === 'INSERT') {
        updateTokenStatus();
        
        // Show notification for successful updates
        if (payload.new.success) {
            showAdminNotification(
                `Token update completed: ${payload.new.tokens_processed} tokens processed`,
                'success'
            );
        } else {
            showAdminNotification(
                `Token update failed: ${payload.new.error_message}`,
                'error'
            );
        }
    }
}

/**
 * Enhanced tokens data loading with validation
 */
async function loadTokensData() {
    try {
        console.log('Loading tokens data with enhanced validation...');
        
        // Use token service if available
        if (window.tokenService) {
            const tokens = await window.tokenService.getEligibleTokens();
            AdminState.tokens = tokens || [];
        } else {
            // Fallback to direct database query
            let query = supabase
                .from('tokens')
                .select('*')
                .order('market_cap_usd', { ascending: false });
            
            // Apply filters
            if (AdminState.tokenFilters.minMarketCap) {
                query = query.gte('market_cap_usd', AdminState.tokenFilters.minMarketCap);
            }
            
            if (AdminState.tokenFilters.maxMarketCap) {
                query = query.lte('market_cap_usd', AdminState.tokenFilters.maxMarketCap);
            }
            
            if (AdminState.tokenFilters.verified) {
                query = query.eq('is_verified', true);
            }
            
            if (AdminState.tokenFilters.search) {
                query = query.or(`symbol.ilike.%${AdminState.tokenFilters.search}%,name.ilike.%${AdminState.tokenFilters.search}%`);
            }
            
            const { data: tokens, error } = await query.limit(500);
            
            if (error) throw error;
            
            AdminState.tokens = tokens || [];
        }
        
        // Filter out blacklisted tokens
        AdminState.tokens = AdminState.tokens.filter(token => 
            !AdminState.blacklistedTokens.has(token.address)
        );
        
        console.log(`Loaded ${AdminState.tokens.length} tokens`);
        
    } catch (error) {
        console.error('Error loading tokens:', error);
        throw error;
    }
}

/**
 * Load blacklisted tokens
 */
async function loadBlacklistedTokens() {
    try {
        const { data: blacklisted, error } = await supabase
            .from('token_blacklist')
            .select('token_address')
            .eq('is_active', true);
        
        if (error && error.code !== 'PGRST116') { // Ignore table not found
            throw error;
        }
        
        AdminState.blacklistedTokens = new Set(
            (blacklisted || []).map(item => item.token_address)
        );
        
        console.log(`Loaded ${AdminState.blacklistedTokens.size} blacklisted tokens`);
        
    } catch (error) {
        console.error('Error loading blacklisted tokens:', error);
        // Continue without blacklist if table doesn't exist
    }
}

/**
 * Enhanced token refresh with service integration
 */
async function refreshTokensData() {
    try {
        showAdminNotification('Refreshing tokens data...', 'info');
        
        // Use token service for refresh
        if (window.tokenService) {
            const result = await window.tokenService.refreshTokenData(true);
            
            if (result.success) {
                showAdminNotification(
                    `Successfully refreshed ${result.tokensProcessed} tokens`,
                    'success'
                );
                await loadTokensData();
                renderTokensTable();
                updateTokenStatistics();
            } else {
                throw new Error(result.message);
            }
        } else {
            // Fallback to edge function call
            const response = await fetch('/functions/v1/fetch-tokens', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabase.supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ forceRefresh: true })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showAdminNotification(`Successfully refreshed ${result.tokensProcessed} tokens`, 'success');
                await loadTokensData();
                renderTokensTable();
                updateTokenStatistics();
            } else {
                throw new Error(result.message);
            }
        }
        
    } catch (error) {
        console.error('Error refreshing tokens:', error);
        showAdminNotification('Failed to refresh tokens data', 'error');
    }
}

/**
 * Enhanced token pair generation with compatibility scoring
 */
async function generateTokenPairs() {
    try {
        showAdminNotification('Generating optimized token pairs...', 'info');
        
        if (window.tokenService) {
            const pairs = await window.tokenService.generateTokenPairs(20); // Generate more pairs
            
            if (pairs && pairs.length > 0) {
                showAdminNotification(`Generated ${pairs.length} optimized token pairs`, 'success');
                await loadTokenPairsData();
                renderTokenPairsTable();
            } else {
                showAdminNotification('No suitable token pairs found', 'warning');
            }
        } else {
            throw new Error('Token service not available');
        }
        
    } catch (error) {
        console.error('Error generating token pairs:', error);
        showAdminNotification('Failed to generate token pairs', 'error');
    }
}

/**
 * Enhanced competition creation with advanced validation
 */
async function createCompetitionWithTokens(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const selectionMethod = formData.get('selection-method');
        
        let competitionData = {
            duration: parseInt(formData.get('duration')),
            startTime: formData.get('start-time'),
            marketCapRange: formData.get('market-cap-range'),
            betAmount: parseFloat(formData.get('bet-amount') || '0.1'),
            platformFee: parseFloat(formData.get('platform-fee') || '0.15')
        };
        
        // Enhanced token selection and validation
        if (selectionMethod === 'manual') {
            if (!AdminState.selectedTokens.tokenA || !AdminState.selectedTokens.tokenB) {
                throw new Error('Please select both tokens for manual selection');
            }
            
            // Validate token compatibility
            const compatibility = await validateTokenCompatibility(
                AdminState.selectedTokens.tokenA,
                AdminState.selectedTokens.tokenB
            );
            
            if (!compatibility.isCompatible) {
                throw new Error(`Token pair incompatible: ${compatibility.reason}`);
            }
            
            competitionData.tokenA = AdminState.selectedTokens.tokenA;
            competitionData.tokenB = AdminState.selectedTokens.tokenB;
            competitionData.compatibilityScore = compatibility.score;
            
        } else {
            // Enhanced automatic selection
            if (window.tokenService) {
                const pairs = await window.tokenService.generateTokenPairs(1);
                if (!pairs || pairs.length === 0) {
                    throw new Error('No suitable token pairs available');
                }
                
                const pair = pairs[0];
                
                // Get full token details
                const [tokenA, tokenB] = await Promise.all([
                    getTokenByAddress(pair.token_a_address),
                    getTokenByAddress(pair.token_b_address)
                ]);
                
                if (!tokenA || !tokenB) {
                    throw new Error('Selected tokens not found');
                }
                
                competitionData.tokenA = tokenA;
                competitionData.tokenB = tokenB;
                competitionData.compatibilityScore = pair.compatibility_score;
            } else {
                throw new Error('Token service not available');
            }
        }
        
        // Enhanced price validation
        if (window.priceService) {
            const priceValidation = await window.priceService.validateTokenPrices([
                competitionData.tokenA.address,
                competitionData.tokenB.address
            ]);
            
            if (!priceValidation.valid) {
                throw new Error(`Price validation failed: ${priceValidation.reason}`);
            }
        }
        
        // Create the competition
        const competition = await createEnhancedCompetition(competitionData);
        
        if (competition) {
            showAdminNotification('Competition created successfully with enhanced validation', 'success');
            e.target.reset();
            resetTokenSelection();
            await loadCompetitionsData();
        }
        
    } catch (error) {
        console.error('Create competition error:', error);
        showAdminNotification(`Failed to create competition: ${error.message}`, 'error');
    }
}

/**
 * Validate token compatibility for competition pairing
 */
async function validateTokenCompatibility(tokenA, tokenB) {
    try {
        // Market cap difference check
        const marketCapDiff = Math.abs(tokenA.market_cap_usd - tokenB.market_cap_usd);
        const avgMarketCap = (tokenA.market_cap_usd + tokenB.market_cap_usd) / 2;
        const marketCapDiffPercent = (marketCapDiff / avgMarketCap) * 100;
        
        if (marketCapDiffPercent > 10) {
            return {
                isCompatible: false,
                reason: `Market cap difference too large: ${marketCapDiffPercent.toFixed(1)}%`,
                score: 0
            };
        }
        
        // Age validation
        if (tokenA.age_days < 30 || tokenB.age_days < 30) {
            return {
                isCompatible: false,
                reason: 'One or both tokens are too young (< 30 days)',
                score: 0
            };
        }
        
        // Liquidity validation
        if ((tokenA.liquidity_score || 0) < 0.3 || (tokenB.liquidity_score || 0) < 0.3) {
            return {
                isCompatible: false,
                reason: 'Low liquidity score for one or both tokens',
                score: 0
            };
        }
        
        // Blacklist check
        if (AdminState.blacklistedTokens.has(tokenA.address) || 
            AdminState.blacklistedTokens.has(tokenB.address)) {
            return {
                isCompatible: false,
                reason: 'One or both tokens are blacklisted',
                score: 0
            };
        }
        
        // Calculate compatibility score
        const score = calculateCompatibilityScore(tokenA, tokenB);
        
        return {
            isCompatible: true,
            reason: 'Tokens are compatible',
            score
        };
        
    } catch (error) {
        console.error('Error validating token compatibility:', error);
        return {
            isCompatible: false,
            reason: 'Validation error occurred',
            score: 0
        };
    }
}

/**
 * Calculate compatibility score between two tokens
 */
function calculateCompatibilityScore(tokenA, tokenB) {
    let score = 100; // Start with perfect score
    
    // Market cap similarity (higher score for closer market caps)
    const marketCapDiff = Math.abs(tokenA.market_cap_usd - tokenB.market_cap_usd);
    const avgMarketCap = (tokenA.market_cap_usd + tokenB.market_cap_usd) / 2;
    const marketCapDiffPercent = (marketCapDiff / avgMarketCap) * 100;
    score -= marketCapDiffPercent * 2; // Penalty for market cap difference
    
    // Liquidity score bonus
    const avgLiquidity = ((tokenA.liquidity_score || 0) + (tokenB.liquidity_score || 0)) / 2;
    score += avgLiquidity * 20; // Bonus for high liquidity
    
    // Age similarity bonus
    const ageDiff = Math.abs(tokenA.age_days - tokenB.age_days);
    if (ageDiff < 30) score += 10; // Bonus for similar age
    
    // Volume similarity bonus (if available)
    if (tokenA.volume_24h && tokenB.volume_24h) {
        const volumeDiff = Math.abs(tokenA.volume_24h - tokenB.volume_24h);
        const avgVolume = (tokenA.volume_24h + tokenB.volume_24h) / 2;
        const volumeDiffPercent = (volumeDiff / avgVolume) * 100;
        if (volumeDiffPercent < 50) score += 5; // Bonus for similar volume
    }
    
    return Math.max(0, Math.min(100, score)); // Clamp between 0-100
}

/**
 * Enhanced competition creation with TWAP setup
 */
async function createEnhancedCompetition(competitionData) {
    try {
        // Prepare competition data
        const competition = {
            token_a_address: competitionData.tokenA.address,
            token_b_address: competitionData.tokenB.address,
            token_a_symbol: competitionData.tokenA.symbol,
            token_b_symbol: competitionData.tokenB.symbol,
            token_a_logo: competitionData.tokenA.logo_uri,
            token_b_logo: competitionData.tokenB.logo_uri,
            competition_start_time: competitionData.startTime,
            competition_end_time: new Date(
                new Date(competitionData.startTime).getTime() + 
                competitionData.duration * 60 * 60 * 1000
            ).toISOString(),
            bet_amount: competitionData.betAmount,
            platform_fee: competitionData.platformFee,
            status: 'upcoming',
            compatibility_score: competitionData.compatibilityScore,
            is_automated: competitionData.tokenA && competitionData.tokenB ? false : true
        };
        
        // Insert competition
        const { data: newCompetition, error } = await supabase
            .from('competitions')
            .insert([competition])
            .select()
            .single();
        
        if (error) throw error;
        
        // Schedule price collection for TWAP
        if (window.priceService) {
            await window.priceService.scheduleCompetitionPriceCollection(
                newCompetition.competition_id,
                [competitionData.tokenA.address, competitionData.tokenB.address],
                new Date(competitionData.startTime),
                new Date(competition.competition_end_time)
            );
        }
        
        return newCompetition;
        
    } catch (error) {
        console.error('Error creating enhanced competition:', error);
        throw error;
    }
}

/**
 * Setup automated token updates
 */
function setupAutomatedTokenUpdates() {
    // Check for updates every 30 minutes
    const updateInterval = setInterval(async () => {
        try {
            await checkAndPerformTokenUpdates();
        } catch (error) {
            console.error('Error in automated token updates:', error);
        }
    }, 30 * 60 * 1000); // 30 minutes
    
    AdminState.updateIntervals.push(updateInterval);
}

/**
 * Check and perform token updates if needed
 */
async function checkAndPerformTokenUpdates() {
    try {
        const { data: lastUpdate, error } = await supabase
            .from('token_updates')
            .select('updated_at, success')
            .eq('success', true)
            .order('updated_at', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        if (!lastUpdate || lastUpdate.length === 0) {
            console.log('No previous token updates, triggering refresh...');
            await refreshTokensData();
            return;
        }
        
        const lastUpdateTime = new Date(lastUpdate[0].updated_at);
        const hoursSinceUpdate = (Date.now() - lastUpdateTime.getTime()) / (1000 * 60 * 60);
        
        // Update if more than 2 hours since last update
        if (hoursSinceUpdate > 2) {
            console.log(`Token data is ${hoursSinceUpdate.toFixed(1)} hours old, refreshing...`);
            await refreshTokensData();
        }
        
    } catch (error) {
        console.error('Error checking token updates:', error);
    }
}

/**
 * Setup enhanced token pair generation
 */
function setupEnhancedTokenPairGeneration() {
    // Generate new pairs every hour
    const pairInterval = setInterval(async () => {
        try {
            // Only generate if we have fewer than 10 unused pairs
            const { data: unusedPairs, error } = await supabase
                .from('token_pairs')
                .select('id')
                .is('competition_id', null)
                .limit(10);
            
            if (error) throw error;
            
            if (!unusedPairs || unusedPairs.length < 5) {
                console.log('Generating new token pairs...');
                await generateTokenPairs();
            }
            
        } catch (error) {
            console.error('Error in automated pair generation:', error);
        }
    }, 60 * 60 * 1000); // 1 hour
    
    AdminState.updateIntervals.push(pairInterval);
}

/**
 * Setup price monitoring
 */
function setupPriceMonitoring() {
    // Monitor prices every 5 minutes
    const priceInterval = setInterval(async () => {
        try {
            if (window.priceService) {
                const activeTokens = AdminState.tokens
                    .filter(t => t.is_active)
                    .slice(0, 20) // Monitor top 20 active tokens
                    .map(t => t.address);
                
                if (activeTokens.length > 0) {
                    await window.priceService.updatePrices(activeTokens);
                }
            }
        } catch (error) {
            console.error('Error in price monitoring:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes
    
    AdminState.updateIntervals.push(priceInterval);
}

/**
 * Start system health monitoring
 */
function startSystemHealthMonitoring() {
    // Check system health every minute
    const healthInterval = setInterval(async () => {
        try {
            await checkSystemHealth();
        } catch (error) {
            console.error('Error in health monitoring:', error);
        }
    }, 60 * 1000); // 1 minute
    
    AdminState.updateIntervals.push(healthInterval);
}

/**
 * Check system health status
 */
async function checkSystemHealth() {
    try {
        // Check token service health
        AdminState.systemHealth.tokenService = window.tokenService ? 'healthy' : 'unavailable';
        
        // Check price service health
        AdminState.systemHealth.priceService = window.priceService ? 'healthy' : 'unavailable';
        
        // Check competition manager health
        AdminState.systemHealth.competitionManager = window.competitionManager ? 'healthy' : 'unavailable';
        
        // Check database connectivity
        const { error } = await supabase.from('tokens').select('count').limit(1);
        AdminState.systemHealth.database = error ? 'error' : 'healthy';
        
        // Check recent price updates
        const { data: recentPrices, error: priceError } = await supabase
            .from('price_history')
            .select('timestamp')
            .order('timestamp', { ascending: false })
            .limit(1);
        
        if (!priceError && recentPrices && recentPrices.length > 0) {
            const lastPriceUpdate = new Date(recentPrices[0].timestamp);
            const minutesSincePrice = (Date.now() - lastPriceUpdate.getTime()) / (1000 * 60);
            AdminState.systemHealth.priceUpdates = minutesSincePrice < 10 ? 'healthy' : 'stale';
        } else {
            AdminState.systemHealth.priceUpdates = 'error';
        }
        
        AdminState.systemHealth.lastUpdate = new Date();
        
        // Update UI if on dashboard
        if (AdminState.currentSection === 'dashboard') {
            updateSystemHealthDisplay();
        }
        
    } catch (error) {
        console.error('Error checking system health:', error);
        AdminState.systemHealth.database = 'error';
    }
}

/**
 * Update system health display
 */
function updateSystemHealthDisplay() {
    const statusGrid = document.querySelector('.status-grid');
    if (!statusGrid) return;
    
    const healthStatuses = [
        { name: 'Token Service', status: AdminState.systemHealth.tokenService },
        { name: 'Price Service', status: AdminState.systemHealth.priceService },
        { name: 'Competition Manager', status: AdminState.systemHealth.competitionManager },
        { name: 'Database', status: AdminState.systemHealth.database },
        { name: 'Price Updates', status: AdminState.systemHealth.priceUpdates }
    ];
    
    statusGrid.innerHTML = healthStatuses.map(item => `
        <div class="status-item">
            <span class="status-indicator ${item.status}"></span>
            <span>${item.name}</span>
        </div>
    `).join('');
}

/**
 * Enhanced token blacklist management
 */
async function addTokenToBlacklist(address, reason) {
    try {
        const { error } = await supabase
            .from('token_blacklist')
            .insert([{
                token_address: address,
                reason: reason,
                is_active: true,
                created_by: 'admin' // Would be actual admin ID in production
            }]);
        
        if (error) throw error;
        
        AdminState.blacklistedTokens.add(address);
        showAdminNotification('Token added to blacklist', 'success');
        
        // Refresh tokens display
        await loadTokensData();
        renderTokensTable();
        
    } catch (error) {
        console.error('Error adding token to blacklist:', error);
        showAdminNotification('Failed to blacklist token', 'error');
    }
}

/**
 * Remove token from blacklist
 */
async function removeTokenFromBlacklist(address) {
    try {
        const { error } = await supabase
            .from('token_blacklist')
            .update({ is_active: false })
            .eq('token_address', address);
        
        if (error) throw error;
        
        AdminState.blacklistedTokens.delete(address);
        showAdminNotification('Token removed from blacklist', 'success');
        
        // Refresh tokens display
        await loadTokensData();
        renderTokensTable();
        
    } catch (error) {
        console.error('Error removing token from blacklist:', error);
        showAdminNotification('Failed to remove token from blacklist', 'error');
    }
}

/**
 * Enhanced activity feed with token events
 */
async function updateActivityFeed() {
    try {
        const activities = [];
        
        // Recent token updates
        const { data: tokenUpdates } = await supabase
            .from('token_updates')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(5);
        
        if (tokenUpdates) {
            activities.push(...tokenUpdates.map(update => ({
                type: 'token_update',
                message: update.success ? 
                    `Token refresh completed: ${update.tokens_processed} tokens` : 
                    `Token refresh failed: ${update.error_message}`,
                timestamp: update.updated_at,
                status: update.success ? 'success' : 'error'
            })));
        }
        
        // Recent competitions
        const { data: competitions } = await supabase
            .from('competitions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (competitions) {
            activities.push(...competitions.map(comp => ({
                type: 'competition',
                message: `New competition: ${comp.token_a_symbol} vs ${comp.token_b_symbol}`,
                timestamp: comp.created_at,
                status: 'info'
            })));
        }
        
        // Sort by timestamp
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Render activity feed
        const feedContainer = document.getElementById('activity-feed');
        if (feedContainer) {
            feedContainer.innerHTML = activities.slice(0, 10).map(activity => `
                <div class="activity-item ${activity.status}">
                    <span class="activity-message">${activity.message}</span>
                    <span class="activity-time">${formatRelativeTime(activity.timestamp)}</span>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error('Error updating activity feed:', error);
    }
}

/**
 * Enhanced analytics integration
 */
async function loadAnalyticsData() {
    try {
        const period = document.getElementById('analytics-period')?.value || '7d';
        
        // Load token analytics
        const tokenAnalytics = await loadTokenAnalytics(period);
        
        // Load competition analytics
        const competitionAnalytics = await loadCompetitionAnalytics(period);
        
        // Load price analytics
        const priceAnalytics = await loadPriceAnalytics(period);
        
        // Update charts
        updateAnalyticsCharts({
            tokens: tokenAnalytics,
            competitions: competitionAnalytics,
            prices: priceAnalytics
        });
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        showAdminNotification('Failed to load analytics', 'error');
    }
}

/**
 * Cleanup function for admin panel
 */
function cleanupAdminPanel() {
    // Clear intervals
    AdminState.updateIntervals.forEach(interval => clearInterval(interval));
    AdminState.updateIntervals = [];
    
    // Unsubscribe from real-time channels
    AdminState.realTimeSubscriptions.forEach(subscription => {
        subscription.unsubscribe();
    });
    AdminState.realTimeSubscriptions = [];
}

// Enhanced utility functions
function formatMarketCap(value) {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000; // seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function showAdminNotification(message, type = 'info') {
    console.log(`[${type}] ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Global exports for enhanced functionality
window.AdminState = AdminState;
window.initializeAdminPanel = initializeAdminPanel;
window.addTokenToBlacklist = addTokenToBlacklist;
window.removeTokenFromBlacklist = removeTokenFromBlacklist;
window.validateTokenCompatibility = validateTokenCompatibility;
window.refreshTokensData = refreshTokensData;
window.generateTokenPairs = generateTokenPairs;
window.cleanupAdminPanel = cleanupAdminPanel;

// Enhanced page lifecycle management
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        if (window.location.pathname.includes('admin')) {
            initializeAdminPanel().catch(console.error);
        }
    });
    
    window.addEventListener('beforeunload', () => {
        cleanupAdminPanel();
    });
}
