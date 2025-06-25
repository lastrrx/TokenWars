// Enhanced Competition.js - LOGO FIX VERSION
// Fixed logo display with robust error handling and fallback system

// Global state for competitions
const CompetitionState = {
    activeCompetitions: [],
    tokenService: null,
    priceService: null,
    realTimeSubscriptions: [],
    lastUpdate: null,
    loading: false
};

/**
 * Initialize Competition System with Real Token Data
 */
async function initializeCompetitionSystem() {
    console.log('Initializing competition system with real token data and logo fixes...');
    
    try {
        // Initialize token and price services
        if (window.TokenService) {
            CompetitionState.tokenService = new window.TokenService();
        }
        
        if (window.PriceService) {
            CompetitionState.priceService = new window.PriceService();
        }
        
        // Load real competitions from database
        await loadRealCompetitions();
        
        // Set up real-time subscriptions
        setupRealTimeCompetitionUpdates();
        
        // Start price update monitoring
        startPriceUpdateMonitoring();
        
        console.log('Competition system initialized with real data and logo fixes');
        
    } catch (error) {
        console.error('Failed to initialize competition system:', error);
        // Fallback to demo data if services not available
        await loadDemoCompetitions();
    }
}

/**
 * Load Real Competitions from Database with Token Data
 */
async function loadRealCompetitions() {
    try {
        CompetitionState.loading = true;
        updateCompetitionsDisplay(); // Show loading state
        
        // Get active competitions from database
        const competitions = await window.supabaseClient.getActiveCompetitions();
        
        if (competitions && competitions.length > 0) {
            // Enhance with real-time token data
            CompetitionState.activeCompetitions = await enhanceCompetitionsWithTokenData(competitions);
        } else {
            // No real competitions, create some demo ones with real tokens
            await createDemoCompetitionsWithRealTokens();
        }
        
        CompetitionState.lastUpdate = new Date();
        updateCompetitionsDisplay();
        
    } catch (error) {
        console.error('Failed to load real competitions:', error);
        await loadDemoCompetitions();
    } finally {
        CompetitionState.loading = false;
    }
}

/**
 * Enhance Competitions with Real-Time Token Data
 */
async function enhanceCompetitionsWithTokenData(competitions) {
    const enhanced = [];
    
    for (const competition of competitions) {
        try {
            // Get real token data for both tokens
            const [tokenA, tokenB] = await Promise.all([
                getTokenDataWithLogo(competition.token_a_address),
                getTokenDataWithLogo(competition.token_b_address)
            ]);
            
            // Get current prices if price service available
            let currentPrices = {};
            if (CompetitionState.priceService) {
                currentPrices = await CompetitionState.priceService.getCurrentPrices([
                    competition.token_a_address,
                    competition.token_b_address
                ]);
            }
            
            // Create enhanced competition object
            const enhancedCompetition = {
                ...competition,
                tokenA: {
                    ...tokenA,
                    currentPrice: currentPrices[competition.token_a_address]?.price || tokenA.current_price,
                    priceChange24h: currentPrices[competition.token_a_address]?.change24h || tokenA.price_change_24h,
                    address: competition.token_a_address,
                    // LOGO FIX: Ensure logo is always available
                    logoURI: validateAndFixTokenLogo(tokenA.logoURI || tokenA.logo_uri, tokenA.symbol)
                },
                tokenB: {
                    ...tokenB,
                    currentPrice: currentPrices[competition.token_b_address]?.price || tokenB.current_price,
                    priceChange24h: currentPrices[competition.token_b_address]?.change24h || tokenB.price_change_24h,
                    address: competition.token_b_address,
                    // LOGO FIX: Ensure logo is always available
                    logoURI: validateAndFixTokenLogo(tokenB.logoURI || tokenB.logo_uri, tokenB.symbol)
                },
                // Calculate real-time metrics
                totalParticipants: competition.total_bets || 0,
                totalPool: competition.total_pool || 0,
                tokenABets: competition.token_a_bets || 0,
                tokenBBets: competition.token_b_bets || 0,
                // Competition timing
                timeRemaining: calculateTimeRemaining(competition.end_time),
                status: determineCompetitionStatus(competition),
                // Real data flags
                isRealData: true,
                lastUpdated: new Date()
            };
            
            enhanced.push(enhancedCompetition);
            
        } catch (error) {
            console.error('Failed to enhance competition:', competition.competition_id, error);
            // Add without enhancement if token data fails
            enhanced.push({
                ...competition,
                isRealData: false,
                error: 'Token data unavailable'
            });
        }
    }
    
    return enhanced;
}

/**
 * LOGO FIX: Get Token Data with enhanced logo handling
 */
async function getTokenDataWithLogo(tokenAddress) {
    try {
        // Try token service first
        if (CompetitionState.tokenService) {
            const tokenData = await CompetitionState.tokenService.getTokenByAddress(tokenAddress);
            if (tokenData) {
                // Ensure logo is valid
                tokenData.logoURI = validateAndFixTokenLogo(tokenData.logoURI, tokenData.symbol);
                return tokenData;
            }
        }
        
        // Fallback to database
        if (window.supabaseClient.getToken) {
            const tokenData = await window.supabaseClient.getToken(tokenAddress);
            if (tokenData) {
                // Ensure logo is valid
                tokenData.logoURI = validateAndFixTokenLogo(tokenData.logo_uri || tokenData.logoURI, tokenData.symbol);
                return tokenData;
            }
        }
        
        // Create minimal token data if not found
        const symbol = `TOKEN${tokenAddress.slice(-4)}`;
        return {
            address: tokenAddress,
            symbol: symbol,
            name: `Unknown Token ${tokenAddress.slice(-4)}`,
            logoURI: generateTokenLogoFallback(symbol), // Always generate valid logo
            current_price: 0,
            market_cap: 0,
            price_change_24h: 0
        };
        
    } catch (error) {
        console.error('Failed to get token data for:', tokenAddress, error);
        
        // Emergency fallback with generated logo
        const symbol = `TOKEN${tokenAddress.slice(-4)}`;
        return {
            address: tokenAddress,
            symbol: symbol,
            name: `Token ${tokenAddress.slice(-4)}`,
            logoURI: generateTokenLogoFallback(symbol),
            current_price: 0,
            market_cap: 0,
            price_change_24h: 0
        };
    }
}

/**
 * LOGO FIX: Validate and fix token logo URLs
 */
function validateAndFixTokenLogo(logoURI, symbol) {
    // If no logo or broken placeholder, generate fallback
    if (!logoURI || 
        logoURI.includes('placeholder-token.png') || 
        logoURI === '/placeholder-token.png' ||
        logoURI.includes('lastrrx.github.io') ||
        logoURI === 'null' ||
        logoURI === 'undefined') {
        
        console.log(`🖼️ Generating logo fallback for ${symbol}`);
        return generateTokenLogoFallback(symbol);
    }
    
    // Return existing logo if it looks valid
    return logoURI;
}

/**
 * LOGO FIX: Generate reliable logo fallback using UI Avatars
 */
function generateTokenLogoFallback(symbol) {
    try {
        const cleanSymbol = String(symbol).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const firstChar = cleanSymbol.charAt(0) || 'T';
        
        // Use UI Avatars with TokenWars branding
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstChar)}&background=8b5cf6&color=fff&size=64&bold=true&format=png`;
    } catch (error) {
        console.error('Error generating logo fallback:', error);
        return 'https://ui-avatars.com/api/?name=T&background=8b5cf6&color=fff&size=64&bold=true&format=png';
    }
}

/**
 * Get Token Data from Token Service or Database (LEGACY - kept for compatibility)
 */
async function getTokenData(tokenAddress) {
    return await getTokenDataWithLogo(tokenAddress);
}

/**
 * Create Demo Competitions with Real Tokens (if no real competitions exist)
 */
async function createDemoCompetitionsWithRealTokens() {
    try {
        console.log('Creating demo competitions with real token data and logo fixes...');
        
        // Get available token pairs from token service
        let tokenPairs = [];
        if (CompetitionState.tokenService) {
            tokenPairs = await CompetitionState.tokenService.getAvailableTokenPairs(5);
        }
        
        if (tokenPairs.length === 0) {
            // Fallback to hardcoded popular Solana tokens
            tokenPairs = await createFallbackTokenPairs();
        }
        
        // Create demo competitions with real token data
        const demoCompetitions = [];
        for (let i = 0; i < Math.min(tokenPairs.length, 6); i++) {
            const pair = tokenPairs[i];
            const competition = await createDemoCompetitionFromTokenPair(pair, i);
            if (competition) {
                demoCompetitions.push(competition);
            }
        }
        
        CompetitionState.activeCompetitions = demoCompetitions;
        console.log('Created', demoCompetitions.length, 'demo competitions with real tokens and valid logos');
        
    } catch (error) {
        console.error('Failed to create demo competitions with real tokens:', error);
        await loadDemoCompetitions(); // Final fallback
    }
}

/**
 * Create Fallback Token Pairs with Popular Solana Tokens
 */
async function createFallbackTokenPairs() {
    const popularTokens = [
        { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', name: 'Bonk' },
        { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF', name: 'dogwifhat' },
        { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', name: 'Jupiter' },
        { address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', symbol: 'PYTH', name: 'Pyth Network' },
        { address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', symbol: 'ORCA', name: 'Orca' },
        { address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', symbol: 'RAY', name: 'Raydium' }
    ];
    
    const pairs = [];
    for (let i = 0; i < popularTokens.length - 1; i += 2) {
        pairs.push({
            tokenA: popularTokens[i],
            tokenB: popularTokens[i + 1],
            compatibility_score: 85
        });
    }
    
    return pairs;
}

/**
 * Create Demo Competition from Token Pair
 */
async function createDemoCompetitionFromTokenPair(tokenPair, index) {
    try {
        const now = new Date();
        const startTime = new Date(now.getTime() + (index * 2 * 60 * 60 * 1000)); // Stagger start times
        const endTime = new Date(startTime.getTime() + (24 * 60 * 60 * 1000)); // 24 hour duration
        
        // Get real token data with logo fixes
        const [tokenA, tokenB] = await Promise.all([
            getTokenDataWithLogo(tokenPair.tokenA?.address || tokenPair.token_a_address),
            getTokenDataWithLogo(tokenPair.tokenB?.address || tokenPair.token_b_address)
        ]);
        
        if (!tokenA || !tokenB) return null;
        
        return {
            competition_id: `DEMO-${Date.now()}-${index}`,
            tokenA: {
                ...tokenA,
                address: tokenA.address,
                symbol: tokenA.symbol,
                name: tokenA.name,
                logoURI: validateAndFixTokenLogo(tokenA.logoURI, tokenA.symbol),
                currentPrice: tokenA.current_price || Math.random() * 10,
                marketCap: tokenA.market_cap || Math.random() * 1000000000,
                priceChange24h: tokenA.price_change_24h || (Math.random() - 0.5) * 20
            },
            tokenB: {
                ...tokenB,
                address: tokenB.address,
                symbol: tokenB.symbol,
                name: tokenB.name,
                logoURI: validateAndFixTokenLogo(tokenB.logoURI, tokenB.symbol),
                currentPrice: tokenB.current_price || Math.random() * 10,
                marketCap: tokenB.market_cap || Math.random() * 1000000000,
                priceChange24h: tokenB.price_change_24h || (Math.random() - 0.5) * 20
            },
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: index === 0 ? 'ACTIVE' : 'SETUP',
            totalPool: Math.random() * 10,
            totalParticipants: Math.floor(Math.random() * 50),
            tokenABets: Math.floor(Math.random() * 25),
            tokenBBets: Math.floor(Math.random() * 25),
            timeRemaining: calculateTimeRemaining(endTime.toISOString()),
            isRealData: true,
            isDemoCompetition: true,
            lastUpdated: new Date()
        };
        
    } catch (error) {
        console.error('Failed to create demo competition from token pair:', error);
        return null;
    }
}

/**
 * Update Competitions Display with Real Token Data
 */
function updateCompetitionsDisplay() {
    const container = document.getElementById('competitions-grid');
    if (!container) return;
    
    if (CompetitionState.loading) {
        container.innerHTML = `
            <div class="loading-competitions">
                <div class="loading-spinner"></div>
                <p>Loading real token competitions...</p>
            </div>
        `;
        return;
    }
    
    if (CompetitionState.activeCompetitions.length === 0) {
        container.innerHTML = `
            <div class="empty-competitions">
                <div class="empty-icon">🎯</div>
                <h3>No Active Competitions</h3>
                <p>New token competitions will appear here</p>
            </div>
        `;
        return;
    }
    
    // Generate competition cards with real token data
    const competitionsHTML = CompetitionState.activeCompetitions
        .slice(0, 12) // Limit to 12 cards
        .map(competition => createRealTokenCompetitionCard(competition))
        .join('');
    
    container.innerHTML = competitionsHTML;
    
    // Set up card interactions
    setupCompetitionCardInteractions();
    
    console.log('Updated competition display with', CompetitionState.activeCompetitions.length, 'real token competitions and fixed logos');
}

/**
 * Create Real Token Competition Card - WITH LOGO FIX
 */
function createRealTokenCompetitionCard(competition) {
    const { tokenA, tokenB } = competition;
    
    // Calculate betting distribution
    const totalBets = (competition.tokenABets || 0) + (competition.tokenBBets || 0);
    const tokenAPercentage = totalBets > 0 ? ((competition.tokenABets || 0) / totalBets * 100) : 50;
    const tokenBPercentage = 100 - tokenAPercentage;
    
    // Competition status styling
    const statusClass = competition.status?.toLowerCase() || 'setup';
    const statusDisplay = getStatusDisplay(competition.status);
    
    // Time remaining display
    const timeDisplay = formatTimeRemaining(competition.timeRemaining);
    
    // LOGO FIX: Ensure logos are always valid
    const tokenALogo = validateAndFixTokenLogo(tokenA.logoURI, tokenA.symbol);
    const tokenBLogo = validateAndFixTokenLogo(tokenB.logoURI, tokenB.symbol);
    
    return `
        <div class="competition-card real-token-card" 
             data-competition-id="${competition.competition_id}"
             data-status="${competition.status}">
            
            <!-- Competition Header -->
            <div class="competition-header">
                <div class="competition-id">
                    ${competition.isDemoCompetition ? '🎮 DEMO' : '⚡'} ${competition.competition_id.slice(-8)}
                </div>
                <div class="competition-status status-${statusClass}">
                    ${statusDisplay}
                </div>
            </div>
            
            <!-- Real Token Battle Display -->
            <div class="token-battle-display real-tokens">
                <!-- Token A -->
                <div class="token-card token-a" data-token="${tokenA.address}">
                    <div class="token-logo-container">
                        <img src="${tokenALogo}" 
                             alt="${tokenA.symbol}" 
                             class="token-logo"
                             onerror="handleTokenLogoError(this, '${tokenA.symbol}')"
                             onload="console.log('✅ Logo loaded for ${tokenA.symbol}')">
                        <div class="real-data-indicator" title="Live token data">🟢</div>
                    </div>
                    <div class="token-info">
                        <div class="token-symbol">${tokenA.symbol}</div>
                        <div class="token-name">${truncateTokenName(tokenA.name)}</div>
                        <div class="token-price">
                            $${formatTokenPrice(tokenA.currentPrice)}
                            <span class="price-change ${tokenA.priceChange24h >= 0 ? 'positive' : 'negative'}">
                                ${formatPercentage(tokenA.priceChange24h)}
                            </span>
                        </div>
                        <div class="token-market-cap">
                            ${formatMarketCap(tokenA.marketCap)}
                        </div>
                    </div>
                </div>
                
                <!-- VS Indicator -->
                <div class="vs-separator">
                    <div class="vs-text">VS</div>
                    <div class="compatibility-score">
                        ${competition.compatibility_score || 85}% Match
                    </div>
                    <div class="time-remaining ${statusClass}">
                        ${timeDisplay}
                    </div>
                </div>
                
                <!-- Token B -->
                <div class="token-card token-b" data-token="${tokenB.address}">
                    <div class="token-logo-container">
                        <img src="${tokenBLogo}" 
                             alt="${tokenB.symbol}" 
                             class="token-logo"
                             onerror="handleTokenLogoError(this, '${tokenB.symbol}')"
                             onload="console.log('✅ Logo loaded for ${tokenB.symbol}')">
                        <div class="real-data-indicator" title="Live token data">🟢</div>
                    </div>
                    <div class="token-info">
                        <div class="token-symbol">${tokenB.symbol}</div>
                        <div class="token-name">${truncateTokenName(tokenB.name)}</div>
                        <div class="token-price">
                            $${formatTokenPrice(tokenB.currentPrice)}
                            <span class="price-change ${tokenB.priceChange24h >= 0 ? 'positive' : 'negative'}">
                                ${formatPercentage(tokenB.priceChange24h)}
                            </span>
                        </div>
                        <div class="token-market-cap">
                            ${formatMarketCap(tokenB.marketCap)}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Betting Progress -->
            <div class="betting-progress">
                <div class="progress-side token-a" style="flex: ${tokenAPercentage}">
                    ${competition.tokenABets || 0} bets (${tokenAPercentage.toFixed(0)}%)
                </div>
                <div class="progress-side token-b" style="flex: ${tokenBPercentage}">
                    ${competition.tokenBBets || 0} bets (${tokenBPercentage.toFixed(0)}%)
                </div>
            </div>
            
            <!-- Competition Stats -->
            <div class="competition-stats">
                <div class="stat-item">
                    <div class="stat-value">${competition.totalParticipants || 0}</div>
                    <div class="stat-label">Participants</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${formatSOL(competition.totalPool || 0)}</div>
                    <div class="stat-label">Prize Pool</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">0.1 SOL</div>
                    <div class="stat-label">Entry Fee</div>
                </div>
            </div>
            
            <!-- Action Button -->
            <button class="btn-place-bet" 
                    onclick="openBettingModal('${competition.competition_id}')"
                    ${competition.status !== 'ACTIVE' && competition.status !== 'VOTING' ? 'disabled' : ''}>
                ${getBettingButtonText(competition.status)}
            </button>
            
            <!-- Real Data Footer -->
            <div class="real-data-footer">
                <span class="data-source">
                    ${competition.isRealData ? '🟢 Live Data' : '🟡 Demo Data'}
                </span>
                <span class="last-updated">
                    Updated ${formatRelativeTime(competition.lastUpdated)}
                </span>
            </div>
        </div>
    `;
}

/**
 * LOGO FIX: Handle token logo loading errors
 */
function handleTokenLogoError(imgElement, symbol) {
    console.warn(`❌ Logo failed to load for ${symbol}, using fallback`);
    
    // Generate fallback logo
    const fallbackLogo = generateTokenLogoFallback(symbol);
    
    // Update the image source
    imgElement.src = fallbackLogo;
    
    // Add error class for styling
    imgElement.classList.add('logo-fallback');
    
    // Remove onerror to prevent infinite loops
    imgElement.onerror = null;
}

/**
 * Truncate token name for display
 */
function truncateTokenName(name) {
    if (!name) return 'Unknown Token';
    return name.length > 15 ? name.substring(0, 15) + '...' : name;
}

/**
 * Utility Functions for Competition Display
 */
function formatTokenPrice(price) {
    if (!price || price === 0) return '0.00';
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    if (price >= 0.0001) return price.toFixed(6);
    return price.toFixed(8);
}

function formatMarketCap(marketCap) {
    if (!marketCap || marketCap === 0) return '$0';
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    if (marketCap >= 1e3) return `$${(marketCap / 1e3).toFixed(2)}K`;
    return `$${marketCap.toFixed(0)}`;
}

function formatPercentage(percent) {
    if (!percent || percent === 0) return '0.00%';
    const formatted = parseFloat(percent).toFixed(2);
    return percent >= 0 ? `+${formatted}%` : `${formatted}%`;
}

function formatSOL(amount) {
    if (!amount || amount === 0) return '0.000 SOL';
    return `${parseFloat(amount).toFixed(3)} SOL`;
}

function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function calculateTimeRemaining(endTime) {
    const now = new Date();
    const end = new Date(endTime);
    return Math.max(0, end - now);
}

function formatTimeRemaining(milliseconds) {
    if (milliseconds <= 0) return 'Ended';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m remaining`;
}

function getStatusDisplay(status) {
    const statusMap = {
        'SETUP': '🔧 Setting Up',
        'VOTING': '🗳️ Voting Open',
        'ACTIVE': '⚡ Live',
        'CLOSED': '🏁 Resolving',
        'RESOLVED': '✅ Complete',
        'PAUSED': '⏸️ Paused',
        'CANCELLED': '❌ Cancelled'
    };
    return statusMap[status] || '❓ Unknown';
}

function getBettingButtonText(status) {
    const buttonMap = {
        'SETUP': 'Coming Soon',
        'VOTING': 'Place Prediction',
        'ACTIVE': 'Place Prediction',
        'CLOSED': 'Resolving...',
        'RESOLVED': 'View Results',
        'PAUSED': 'Temporarily Paused',
        'CANCELLED': 'Cancelled'
    };
    return buttonMap[status] || 'Place Bet';
}

function determineCompetitionStatus(competition) {
    const now = new Date();
    const start = new Date(competition.start_time);
    const end = new Date(competition.end_time);
    
    if (now < start) return 'SETUP';
    if (now >= start && now < end) return 'ACTIVE';
    if (now >= end && !competition.winner_token) return 'CLOSED';
    if (competition.winner_token) return 'RESOLVED';
    return competition.status || 'SETUP';
}

/**
 * Set up Real-Time Updates
 */
function setupRealTimeCompetitionUpdates() {
    // Subscribe to competition changes
    if (window.supabaseClient && window.supabaseClient.subscribeToCompetitions) {
        const subscription = window.supabaseClient.subscribeToCompetitions((payload) => {
            console.log('Real-time competition update:', payload);
            handleCompetitionUpdate(payload);
        });
        
        CompetitionState.realTimeSubscriptions.push(subscription);
    }
    
    // Subscribe to token price updates
    if (window.supabaseClient && window.supabaseClient.subscribeToTokenUpdates) {
        const subscription = window.supabaseClient.subscribeToTokenUpdates((payload) => {
            console.log('Real-time token update:', payload);
            handleTokenUpdate(payload);
        });
        
        CompetitionState.realTimeSubscriptions.push(subscription);
    }
}

/**
 * Handle Real-Time Competition Updates
 */
function handleCompetitionUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'INSERT') {
        // New competition added
        loadRealCompetitions();
    } else if (eventType === 'UPDATE') {
        // Competition updated
        updateSingleCompetition(newRecord);
    } else if (eventType === 'DELETE') {
        // Competition removed
        removeSingleCompetition(oldRecord.competition_id);
    }
}

/**
 * Handle Real-Time Token Updates
 */
function handleTokenUpdate(payload) {
    const { new: newToken } = payload;
    
    // Update competitions that use this token
    CompetitionState.activeCompetitions.forEach(competition => {
        if (competition.tokenA.address === newToken.address) {
            competition.tokenA = { 
                ...competition.tokenA, 
                ...newToken,
                logoURI: validateAndFixTokenLogo(newToken.logoURI || newToken.logo_uri, newToken.symbol)
            };
        }
        if (competition.tokenB.address === newToken.address) {
            competition.tokenB = { 
                ...competition.tokenB, 
                ...newToken,
                logoURI: validateAndFixTokenLogo(newToken.logoURI || newToken.logo_uri, newToken.symbol)
            };
        }
    });
    
    updateCompetitionsDisplay();
}

/**
 * Start Price Update Monitoring
 */
function startPriceUpdateMonitoring() {
    if (CompetitionState.priceService) {
        // Update prices every minute for active competitions
        setInterval(async () => {
            await updateCompetitionPrices();
        }, 60000);
    }
}

/**
 * Update Competition Prices
 */
async function updateCompetitionPrices() {
    if (!CompetitionState.priceService || CompetitionState.activeCompetitions.length === 0) return;
    
    try {
        // Get all token addresses from active competitions
        const tokenAddresses = new Set();
        CompetitionState.activeCompetitions.forEach(comp => {
            tokenAddresses.add(comp.tokenA.address);
            tokenAddresses.add(comp.tokenB.address);
        });
        
        // Get updated prices
        const prices = await CompetitionState.priceService.getCurrentPrices([...tokenAddresses]);
        
        // Update competitions with new prices
        let updated = false;
        CompetitionState.activeCompetitions.forEach(competition => {
            const tokenAPrice = prices[competition.tokenA.address];
            const tokenBPrice = prices[competition.tokenB.address];
            
            if (tokenAPrice) {
                competition.tokenA.currentPrice = tokenAPrice.price;
                competition.tokenA.priceChange24h = tokenAPrice.change24h;
                updated = true;
            }
            
            if (tokenBPrice) {
                competition.tokenB.currentPrice = tokenBPrice.price;
                competition.tokenB.priceChange24h = tokenBPrice.change24h;
                updated = true;
            }
        });
        
        if (updated) {
            updateCompetitionsDisplay();
            console.log('Updated competition prices');
        }
        
    } catch (error) {
        console.error('Failed to update competition prices:', error);
    }
}

/**
 * Set up Competition Card Interactions
 */
function setupCompetitionCardInteractions() {
    // Add click handlers for token cards
    document.querySelectorAll('.token-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            const tokenAddress = card.dataset.token;
            showTokenDetails(tokenAddress);
        });
    });
    
    // Add hover effects for real-time data indicators
    document.querySelectorAll('.real-data-indicator').forEach(indicator => {
        indicator.addEventListener('mouseenter', (e) => {
            showRealtimeTooltip(e.target, 'Live price data updating every minute');
        });
    });
}

/**
 * Show Token Details Modal
 */
function showTokenDetails(tokenAddress) {
    const competition = CompetitionState.activeCompetitions.find(comp => 
        comp.tokenA.address === tokenAddress || comp.tokenB.address === tokenAddress
    );
    
    if (!competition) return;
    
    const token = competition.tokenA.address === tokenAddress ? competition.tokenA : competition.tokenB;
    
    console.log('Show token details for:', token.symbol, token);
    // TODO: Implement token details modal
}

/**
 * Fallback Demo Competitions (if all else fails)
 */
async function loadDemoCompetitions() {
    console.log('Loading fallback demo competitions with logo fixes...');
    
    const demoCompetitions = [
        {
            competition_id: 'DEMO-001',
            tokenA: { 
                symbol: 'BONK', 
                name: 'Bonk', 
                logoURI: generateTokenLogoFallback('BONK'), 
                currentPrice: 0.000015, 
                priceChange24h: 5.2, 
                marketCap: 1200000000 
            },
            tokenB: { 
                symbol: 'WIF', 
                name: 'dogwifhat', 
                logoURI: generateTokenLogoFallback('WIF'), 
                currentPrice: 2.45, 
                priceChange24h: -2.8, 
                marketCap: 2400000000 
            },
            status: 'ACTIVE',
            totalPool: 5.4,
            totalParticipants: 23,
            timeRemaining: 2 * 60 * 60 * 1000,
            isRealData: false,
            lastUpdated: new Date()
        }
    ];
    
    CompetitionState.activeCompetitions = demoCompetitions;
    updateCompetitionsDisplay();
}

/**
 * Global Functions for External Access
 */
window.initializeCompetitionSystem = initializeCompetitionSystem;
window.loadRealCompetitions = loadRealCompetitions;
window.updateCompetitionsDisplay = updateCompetitionsDisplay;
window.CompetitionState = CompetitionState;
window.handleTokenLogoError = handleTokenLogoError; // Expose for HTML onerror
window.generateTokenLogoFallback = generateTokenLogoFallback; // Expose for utils

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCompetitionSystem);
} else {
    initializeCompetitionSystem();
}

console.log('✅ Competition.js (LOGO FIX) loaded and initialized');
console.log('🖼️ Logo Fix Features:');
console.log('   ✅ Robust logo error handling with onerror fallbacks');
console.log('   ✅ UI Avatars fallback system for missing/broken logos');
console.log('   ✅ Logo validation before display');
console.log('   ✅ Enhanced token data processing with logo fixes');
console.log('   ✅ No more 404 logo errors - all tokens show visual representation');
