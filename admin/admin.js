/**
 * Admin Panel Main Controller - Enhanced with Token Management
 * Handles admin panel functionality with integrated token selection and management
 */

// Admin state management
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
    }
};

/**
 * Initialize admin panel with token management
 */
async function initializeAdminPanel() {
    console.log('Initializing admin panel with token management...');
    
    try {
        // Set up navigation
        setupAdminNavigation();
        
        // Set up event listeners
        setupAdminEventListeners();
        
        // Initialize token management
        await initializeTokenManagement();
        
        // Load initial data
        await loadDashboardData();
        
        // Start real-time updates
        startRealTimeUpdates();
        
        console.log('Admin panel initialized successfully');
        
    } catch (error) {
        console.error('Admin panel initialization failed:', error);
        showAdminNotification('Failed to initialize admin panel', 'error');
    }
}

/**
 * Initialize token management system
 */
async function initializeTokenManagement() {
    try {
        console.log('Initializing token management...');
        
        // Load available tokens
        await loadTokensData();
        
        // Set up token update scheduling
        setupTokenUpdateScheduling();
        
        // Set up token pair generation
        setupTokenPairGeneration();
        
        console.log('Token management initialized');
        
    } catch (error) {
        console.error('Token management initialization failed:', error);
        throw error;
    }
}

/**
 * Set up navigation with token management sections
 */
function setupAdminNavigation() {
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('href').substring(1);
            navigateToAdminSection(section);
        });
    });
}

/**
 * Navigate to admin section with token-aware loading
 */
async function navigateToAdminSection(section) {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`a[href="#${section}"]`).classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => {
        s.classList.add('hidden');
    });
    
    // Show selected section
    document.getElementById(section).classList.remove('hidden');
    
    AdminState.currentSection = section;
    
    // Load section-specific data
    switch(section) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'competitions':
            await loadCompetitionsData();
            break;
        case 'tokens':
            await loadTokensManagementData();
            break;
        case 'users':
            await loadUsersData();
            break;
        case 'analytics':
            await loadAnalyticsData();
            break;
        case 'settings':
            await loadSettingsData();
            break;
    }
}

/**
 * Set up admin event listeners with token management
 */
function setupAdminEventListeners() {
    // Logout
    document.getElementById('logout').addEventListener('click', logout);
    
    // Competition form with token selection
    document.getElementById('create-competition-form').addEventListener('submit', createCompetitionWithTokens);
    document.getElementById('selection-method').addEventListener('change', toggleTokenSelection);
    
    // Token management events
    document.getElementById('refresh-tokens-btn')?.addEventListener('click', refreshTokensData);
    document.getElementById('generate-pairs-btn')?.addEventListener('click', generateTokenPairs);
    document.getElementById('token-search')?.addEventListener('input', filterTokens);
    
    // Token selection events
    document.getElementById('select-token-a-btn')?.addEventListener('click', () => openTokenSelector('A'));
    document.getElementById('select-token-b-btn')?.addEventListener('click', () => openTokenSelector('B'));
    
    // Settings form
    document.getElementById('platform-settings-form').addEventListener('submit', savePlatformSettings);
    
    // Analytics period
    document.getElementById('analytics-period')?.addEventListener('change', () => {
        loadAnalyticsData();
    });
    
    // Modal close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.add('hidden');
        });
    });
}

/**
 * Load dashboard data with token statistics
 */
async function loadDashboardData() {
    try {
        showLoadingState('dashboard-metrics');
        
        // Fetch dashboard metrics including token data
        const [competitionsData, tokensData, priceData] = await Promise.all([
            fetchCompetitionMetrics(),
            fetchTokenMetrics(),
            fetchPriceMetrics()
        ]);
        
        // Update metrics
        updateDashboardMetrics(competitionsData, tokensData, priceData);
        
        // Update activity feed
        await updateActivityFeed();
        
        // Update token status
        await updateTokenStatus();
        
        hideLoadingState('dashboard-metrics');
        
    } catch (error) {
        console.error('Dashboard data error:', error);
        showAdminNotification('Failed to load dashboard data', 'error');
        hideLoadingState('dashboard-metrics');
    }
}

/**
 * Fetch competition metrics
 */
async function fetchCompetitionMetrics() {
    const { data, error } = await supabase
        .from('competitions')
        .select('status, total_pool, created_at')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const activeCompetitions = data.filter(c => ['voting', 'active'].includes(c.status)).length;
    const totalVolume = data.reduce((sum, c) => sum + (c.total_pool || 0), 0);
    
    return {
        activeCompetitions,
        totalCompetitions: data.length,
        totalVolume
    };
}

/**
 * Fetch token metrics
 */
async function fetchTokenMetrics() {
    const { data, error } = await supabase
        .from('tokens')
        .select('market_cap_usd, price_usd, is_active, updated_at');
    
    if (error) throw error;
    
    const totalTokens = data.length;
    const activeTokens = data.filter(t => t.is_active).length;
    const totalMarketCap = data.reduce((sum, t) => sum + (t.market_cap_usd || 0), 0);
    const avgPrice = data.length > 0 ? data.reduce((sum, t) => sum + (t.price_usd || 0), 0) / data.length : 0;
    
    return {
        totalTokens,
        activeTokens,
        totalMarketCap,
        avgPrice
    };
}

/**
 * Fetch price update metrics
 */
async function fetchPriceMetrics() {
    const { data, error } = await supabase
        .from('price_history')
        .select('timestamp, data_source')
        .order('timestamp', { ascending: false })
        .limit(100);
    
    if (error) throw error;
    
    const recentUpdates = data.filter(p => 
        Date.now() - new Date(p.timestamp).getTime() < 24 * 60 * 60 * 1000
    ).length;
    
    return {
        recentPriceUpdates: recentUpdates,
        lastPriceUpdate: data.length > 0 ? data[0].timestamp : null
    };
}

/**
 * Update dashboard metrics display
 */
function updateDashboardMetrics(competitions, tokens, prices) {
    document.getElementById('total-volume').textContent = `${(competitions.totalVolume || 0).toFixed(2)} SOL`;
    document.getElementById('active-competitions').textContent = competitions.activeCompetitions || 0;
    document.getElementById('total-tokens').textContent = tokens.totalTokens || 0;
    document.getElementById('active-tokens').textContent = tokens.activeTokens || 0;
    document.getElementById('total-market-cap').textContent = formatMarketCap(tokens.totalMarketCap || 0);
    document.getElementById('recent-price-updates').textContent = prices.recentPriceUpdates || 0;
}

/**
 * Load tokens management data
 */
async function loadTokensManagementData() {
    try {
        showLoadingState('tokens-table');
        
        // Load tokens with filtering
        await loadTokensData();
        
        // Load token pairs
        await loadTokenPairsData();
        
        // Render tokens table
        renderTokensTable();
        
        // Update token statistics
        updateTokenStatistics();
        
        hideLoadingState('tokens-table');
        
    } catch (error) {
        console.error('Tokens management data error:', error);
        showAdminNotification('Failed to load tokens data', 'error');
        hideLoadingState('tokens-table');
    }
}

/**
 * Load tokens data with filtering
 */
async function loadTokensData() {
    try {
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
        console.log(`Loaded ${AdminState.tokens.length} tokens`);
        
    } catch (error) {
        console.error('Error loading tokens:', error);
        throw error;
    }
}

/**
 * Load token pairs data
 */
async function loadTokenPairsData() {
    try {
        const { data: pairs, error } = await supabase
            .from('token_pairs')
            .select(`
                *,
                competition:competitions(*)
            `)
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        AdminState.tokenPairs = pairs || [];
        
    } catch (error) {
        console.error('Error loading token pairs:', error);
        throw error;
    }
}

/**
 * Render tokens table
 */
function renderTokensTable() {
    const tbody = document.getElementById('tokens-tbody');
    
    if (!tbody) return;
    
    if (AdminState.tokens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">No tokens found</td></tr>';
        return;
    }
    
    const html = AdminState.tokens.map(token => `
        <tr class="token-row" data-address="${token.address}">
            <td class="token-info">
                <div class="token-display-mini">
                    <img src="${token.logo_uri || ''}" alt="${token.symbol}" class="token-logo-mini" 
                         onerror="this.style.display='none'">
                    <div>
                        <div class="token-symbol-mini">${token.symbol}</div>
                        <div class="token-name-mini">${token.name}</div>
                    </div>
                </div>
            </td>
            <td class="price-cell">$${(token.price_usd || 0).toFixed(6)}</td>
            <td class="market-cap-cell">${formatMarketCap(token.market_cap_usd || 0)}</td>
            <td class="age-cell">${token.age_days || 0} days</td>
            <td class="liquidity-cell">
                <div class="liquidity-bar">
                    <div class="liquidity-fill" style="width: ${(token.liquidity_score || 0) * 100}%"></div>
                </div>
                <span class="liquidity-score">${((token.liquidity_score || 0) * 100).toFixed(0)}%</span>
            </td>
            <td class="status-cell">
                <span class="status-badge ${token.is_active ? 'active' : 'inactive'}">
                    ${token.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="verification-cell">
                <span class="verification-badge ${token.is_verified ? 'verified' : 'unverified'}">
                    ${token.is_verified ? '✓ Verified' : '⚠ Unverified'}
                </span>
            </td>
            <td class="updated-cell">${formatRelativeTime(token.updated_at)}</td>
            <td class="actions-cell">
                <button class="btn btn-small btn-secondary" onclick="viewTokenDetails('${token.address}')">
                    View
                </button>
                <button class="btn btn-small ${token.is_active ? 'btn-warning' : 'btn-primary'}" 
                        onclick="toggleTokenStatus('${token.address}', ${!token.is_active})">
                    ${token.is_active ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = html;
}

/**
 * Update token statistics
 */
function updateTokenStatistics() {
    const stats = {
        total: AdminState.tokens.length,
        active: AdminState.tokens.filter(t => t.is_active).length,
        verified: AdminState.tokens.filter(t => t.is_verified).length,
        totalMarketCap: AdminState.tokens.reduce((sum, t) => sum + (t.market_cap_usd || 0), 0),
        avgLiquidity: AdminState.tokens.length > 0 ? 
            AdminState.tokens.reduce((sum, t) => sum + (t.liquidity_score || 0), 0) / AdminState.tokens.length : 0
    };
    
    // Update statistics display
    document.getElementById('total-tokens-stat').textContent = stats.total;
    document.getElementById('active-tokens-stat').textContent = stats.active;
    document.getElementById('verified-tokens-stat').textContent = stats.verified;
    document.getElementById('total-market-cap-stat').textContent = formatMarketCap(stats.totalMarketCap);
    document.getElementById('avg-liquidity-stat').textContent = `${(stats.avgLiquidity * 100).toFixed(1)}%`;
}

/**
 * Filter tokens based on search and criteria
 */
function filterTokens() {
    const searchTerm = document.getElementById('token-search')?.value || '';
    AdminState.tokenFilters.search = searchTerm;
    
    // Reload tokens with new filter
    loadTokensData().then(() => {
        renderTokensTable();
        updateTokenStatistics();
    });
}

/**
 * Refresh tokens data from APIs
 */
async function refreshTokensData() {
    try {
        showAdminNotification('Refreshing tokens data...', 'info');
        
        // Call the fetch-tokens edge function
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
        
    } catch (error) {
        console.error('Error refreshing tokens:', error);
        showAdminNotification('Failed to refresh tokens data', 'error');
    }
}

/**
 * Generate token pairs for competitions
 */
async function generateTokenPairs() {
    try {
        showAdminNotification('Generating token pairs...', 'info');
        
        // Use the token service to generate pairs
        if (window.tokenService) {
            const pairs = await window.tokenService.generateTokenPairs(10);
            
            if (pairs && pairs.length > 0) {
                showAdminNotification(`Generated ${pairs.length} token pairs`, 'success');
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
 * Render token pairs table
 */
function renderTokenPairsTable() {
    const container = document.getElementById('token-pairs-container');
    
    if (!container) return;
    
    if (AdminState.tokenPairs.length === 0) {
        container.innerHTML = '<p class="no-data">No token pairs generated</p>';
        return;
    }
    
    const html = AdminState.tokenPairs.map(pair => `
        <div class="token-pair-card">
            <div class="pair-header">
                <span class="pair-category">${pair.category || 'General'}</span>
                <span class="compatibility-score">${(pair.compatibility_score || 0).toFixed(2)}</span>
            </div>
            <div class="pair-tokens">
                <div class="pair-token">
                    <div class="token-symbol">${pair.token_a_symbol || 'TOKEN A'}</div>
                    <div class="token-market-cap">${formatMarketCap(pair.token_a_market_cap || 0)}</div>
                </div>
                <div class="pair-vs">VS</div>
                <div class="pair-token">
                    <div class="token-symbol">${pair.token_b_symbol || 'TOKEN B'}</div>
                    <div class="token-market-cap">${formatMarketCap(pair.token_b_market_cap || 0)}</div>
                </div>
            </div>
            <div class="pair-stats">
                <div class="stat">
                    <span class="stat-label">Market Cap Diff:</span>
                    <span class="stat-value">${formatMarketCap(pair.market_cap_difference || 0)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Created:</span>
                    <span class="stat-value">${formatRelativeTime(pair.created_at)}</span>
                </div>
            </div>
            <div class="pair-actions">
                <button class="btn btn-small btn-primary" onclick="createCompetitionFromPair('${pair.id}')">
                    Create Competition
                </button>
                <button class="btn btn-small btn-secondary" onclick="viewPairDetails('${pair.id}')">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

/**
 * Create competition with enhanced token selection
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
        
        if (selectionMethod === 'manual') {
            // Manual token selection
            if (!AdminState.selectedTokens.tokenA || !AdminState.selectedTokens.tokenB) {
                throw new Error('Please select both tokens for manual selection');
            }
            
            competitionData.tokenA = AdminState.selectedTokens.tokenA;
            competitionData.tokenB = AdminState.selectedTokens.tokenB;
            
        } else {
            // Automatic token selection
            if (window.tokenService) {
                const pairs = await window.tokenService.generateTokenPairs(1);
                if (!pairs || pairs.length === 0) {
                    throw new Error('No suitable token pairs available');
                }
                
                const pair = pairs[0];
                competitionData.tokenA = pair.token_a;
                competitionData.tokenB = pair.token_b;
            } else {
                throw new Error('Token service not available');
            }
        }
        
        // Create the competition
        const competition = await createCompetition(competitionData);
        
        if (competition) {
            showAdminNotification('Competition created successfully', 'success');
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
 * Create competition from existing token pair
 */
async function createCompetitionFromPair(pairId) {
    try {
        const pair = AdminState.tokenPairs.find(p => p.id === pairId);
        if (!pair) {
            throw new Error('Token pair not found');
        }
        
        // Get token details
        const [tokenA, tokenB] = await Promise.all([
            getTokenByAddress(pair.token_a_address),
            getTokenByAddress(pair.token_b_address)
        ]);
        
        if (!tokenA || !tokenB) {
            throw new Error('Token details not found');
        }
        
        const competitionData = {
            tokenA,
            tokenB,
            duration: 60, // Default 1 hour
            startTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Start in 5 minutes
            betAmount: 0.1,
            platformFee: 0.15
        };
        
        const competition = await createCompetition(competitionData);
        
        if (competition) {
            showAdminNotification('Competition created from token pair', 'success');
            await loadCompetitionsData();
        }
        
    } catch (error) {
        console.error('Error creating competition from pair:', error);
        showAdminNotification(`Failed to create competition: ${error.message}`, 'error');
    }
}

/**
 * Get token by address
 */
async function getTokenByAddress(address) {
    try {
        const { data: token, error } = await supabase
            .from('tokens')
            .select('*')
            .eq('address', address)
            .single();
        
        if (error) throw error;
        return token;
        
    } catch (error) {
        console.error('Error getting token by address:', error);
        return null;
    }
}

/**
 * Toggle token selection interface
 */
function toggleTokenSelection(e) {
    const manualSection = document.getElementById('manual-token-selection');
    const automaticSection = document.getElementById('automatic-selection-info');
    
    if (e.target.value === 'manual') {
        manualSection?.classList.remove('hidden');
        automaticSection?.classList.add('hidden');
    } else {
        manualSection?.classList.add('hidden');
        automaticSection?.classList.remove('hidden');
        resetTokenSelection();
    }
}

/**
 * Open token selector modal
 */
function openTokenSelector(position) {
    const modal = document.getElementById('token-selector-modal');
    const title = document.getElementById('token-selector-title');
    
    if (modal && title) {
        title.textContent = `Select Token ${position}`;
        modal.setAttribute('data-position', position);
        modal.classList.remove('hidden');
        
        // Load tokens for selection
        renderTokenSelectorList();
    }
}

/**
 * Render token selector list
 */
function renderTokenSelectorList() {
    const container = document.getElementById('token-selector-list');
    
    if (!container) return;
    
    const filteredTokens = AdminState.tokens.filter(token => 
        token.is_active && 
        token.market_cap_usd >= 5000000 && // Min 5M market cap
        token.age_days >= 30 // Min 30 days old
    );
    
    const html = filteredTokens.map(token => `
        <div class="token-selector-item" onclick="selectTokenForCompetition('${token.address}')">
            <div class="token-display">
                <img src="${token.logo_uri || ''}" alt="${token.symbol}" class="token-logo" 
                     onerror="this.style.display='none'">
                <div class="token-info">
                    <div class="token-symbol">${token.symbol}</div>
                    <div class="token-name">${token.name}</div>
                    <div class="token-stats">
                        <span class="token-price">$${(token.price_usd || 0).toFixed(6)}</span>
                        <span class="token-market-cap">${formatMarketCap(token.market_cap_usd || 0)}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

/**
 * Select token for competition
 */
function selectTokenForCompetition(address) {
    const modal = document.getElementById('token-selector-modal');
    const position = modal?.getAttribute('data-position');
    
    if (!position) return;
    
    const token = AdminState.tokens.find(t => t.address === address);
    if (!token) return;
    
    // Store selection
    AdminState.selectedTokens[`token${position}`] = token;
    
    // Update display
    updateTokenSelectionDisplay(position, token);
    
    // Close modal
    modal.classList.add('hidden');
}

/**
 * Update token selection display
 */
function updateTokenSelectionDisplay(position, token) {
    const display = document.getElementById(`selected-token-${position.toLowerCase()}`);
    
    if (display) {
        display.innerHTML = `
            <div class="selected-token-display">
                <img src="${token.logo_uri || ''}" alt="${token.symbol}" class="token-logo" 
                     onerror="this.style.display='none'">
                <div class="token-info">
                    <div class="token-symbol">${token.symbol}</div>
                    <div class="token-name">${token.name}</div>
                    <div class="token-stats">
                        <span class="token-price">$${(token.price_usd || 0).toFixed(6)}</span>
                        <span class="token-market-cap">${formatMarketCap(token.market_cap_usd || 0)}</span>
                    </div>
                </div>
                <button class="btn btn-small btn-secondary" onclick="clearTokenSelection('${position}')">
                    Clear
                </button>
            </div>
        `;
    }
}

/**
 * Clear token selection
 */
function clearTokenSelection(position) {
    AdminState.selectedTokens[`token${position}`] = null;
    
    const display = document.getElementById(`selected-token-${position.toLowerCase()}`);
    if (display) {
        display.innerHTML = `
            <button class="btn btn-primary" onclick="openTokenSelector('${position}')">
                Select Token ${position}
            </button>
        `;
    }
}

/**
 * Reset token selection
 */
function resetTokenSelection() {
    AdminState.selectedTokens.tokenA = null;
    AdminState.selectedTokens.tokenB = null;
    
    clearTokenSelection('A');
    clearTokenSelection('B');
}

/**
 * Set up token update scheduling
 */
function setupTokenUpdateScheduling() {
    // Check for token updates every hour
    setInterval(async () => {
        try {
            await checkTokenUpdates();
        } catch (error) {
            console.error('Error checking token updates:', error);
        }
    }, 60 * 60 * 1000); // 1 hour
}

/**
 * Check if token updates are needed
 */
async function checkTokenUpdates() {
    try {
        const { data: lastUpdate, error } = await supabase
            .from('token_updates')
            .select('updated_at, success')
            .eq('success', true)
            .order('updated_at', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        if (!lastUpdate || lastUpdate.length === 0) {
            // No updates yet, trigger one
            await refreshTokensData();
            return;
        }
        
        const lastUpdateTime = new Date(lastUpdate[0].updated_at);
        const hoursSinceUpdate = (Date.now() - lastUpdateTime.getTime()) / (1000 * 60 * 60);
        
        // Update if more than 4 hours since last update
        if (hoursSinceUpdate > 4) {
            await refreshTokensData();
        }
        
    } catch (error) {
        console.error('Error checking token updates:', error);
    }
}

/**
 * Set up token pair generation scheduling
 */
function setupTokenPairGeneration() {
    // Generate new token pairs every 2 hours
    setInterval(async () => {
        try {
            await generateTokenPairs();
        } catch (error) {
            console.error('Error in scheduled token pair generation:', error);
        }
    }, 2 * 60 * 60 * 1000); // 2 hours
}

/**
 * Update token status
 */
async function updateTokenStatus() {
    try {
        const { data: tokenUpdates, error } = await supabase
            .from('token_updates')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        const statusElement = document.getElementById('token-update-status');
        if (statusElement && tokenUpdates && tokenUpdates.length > 0) {
            const lastUpdate = tokenUpdates[0];
            const timeSince = formatRelativeTime(lastUpdate.updated_at);
            
            statusElement.innerHTML = `
                <span class="status-indicator ${lastUpdate.success ? 'success' : 'error'}"></span>
                Last Update: ${timeSince}
                ${lastUpdate.success ? `(${lastUpdate.tokens_processed} tokens)` : '(Failed)'}
            `;
        }
        
    } catch (error) {
        console.error('Error updating token status:', error);
    }
}

/**
 * Load competitions data with token information
 */
async function loadCompetitionsData() {
    try {
        const { data: competitions, error } = await supabase
            .from('competitions')
            .select(`
                *,
                token_a_data:tokens!competitions_token_a_address_fkey(*),
                token_b_data:tokens!competitions_token_b_address_fkey(*)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        AdminState.competitions = competitions || [];
        renderCompetitionsTable();
        
    } catch (error) {
        console.error('Competitions error:', error);
        showAdminNotification('Failed to load competitions', 'error');
    }
}

/**
 * Render competitions table with token data
 */
function renderCompetitionsTable() {
    const tbody = document.getElementById('competitions-tbody');
    
    if (!tbody) return;
    
    if (AdminState.competitions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No competitions found</td></tr>';
        return;
    }
    
    const html = AdminState.competitions.map(comp => `
        <tr>
            <td>${comp.competition_id}</td>
            <td>
                <div class="competition-tokens">
                    <div class="token-display-mini">
                        <img src="${comp.token_a_logo || ''}" alt="${comp.token_a_symbol}" class="token-logo-mini">
                        <span>${comp.token_a_symbol}</span>
                    </div>
                    <span class="vs-text">vs</span>
                    <div class="token-display-mini">
                        <img src="${comp.token_b_logo || ''}" alt="${comp.token_b_symbol}" class="token-logo-mini">
                        <span>${comp.token_b_symbol}</span>
                    </div>
                </div>
            </td>
            <td><span class="status-badge ${comp.status}">${comp.status}</span></td>
            <td>${comp.participant_count || 0}</td>
            <td>${(comp.total_pool || 0).toFixed(2)} SOL</td>
            <td>${formatRelativeTime(comp.competition_end_time)}</td>
            <td>
                ${comp.is_automated ? '<span class="automated-badge">Auto</span>' : '<span class="manual-badge">Manual</span>'}
            </td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="viewCompetitionDetails('${comp.competition_id}')">
                    View
                </button>
                ${comp.status === 'active' ? `
                <button class="btn btn-small btn-danger" onclick="pauseCompetition('${comp.competition_id}')">
                    Pause
                </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = html;
}

// Utility functions
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

function showLoadingState(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('loading');
    }
}

function hideLoadingState(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('loading');
    }
}

function showAdminNotification(message, type = 'info') {
    console.log(`[${type}] ${message}`);
    // TODO: Implement proper notification system
    alert(message);
}

// Export functions for global access
window.initializeAdminPanel = initializeAdminPanel;
window.viewTokenDetails = (address) => console.log('View token details:', address);
window.toggleTokenStatus = (address, status) => console.log('Toggle token status:', address, status);
window.viewCompetitionDetails = (id) => console.log('View competition:', id);
window.pauseCompetition = (id) => console.log('Pause competition:', id);
window.viewPairDetails = (id) => console.log('View pair details:', id);

// Initialize when dependencies are available
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Auto-initialize if on admin page
        if (window.location.pathname.includes('admin')) {
            initializeAdminPanel().catch(console.error);
        }
    });
}
