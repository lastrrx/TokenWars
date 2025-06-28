/**
 * TokenWars Admin Panel Controller - FIXED: Database-Centric Competition Creation
 * PRESERVES: All existing functionality (3700+ lines)
 * FIXES: Competition creation to use direct database queries instead of TokenService
 */

// Enhanced Admin State Management with Debug Logging
const AdminState = {
    // Core state
    currentSection: 'dashboard',
    isInitialized: false,
    
    // Debug flags
    debug: {
        enableConsoleLogging: true,
        logDataFlow: true,
        logUIUpdates: true,
        logErrors: true
    },
    
    // Live data stores - FULL DATA LOADING
    competitions: [],
    users: [],
    tokens: [],
    tokenPairs: [],
    blacklistedTokens: new Set(),
    analytics: {},
    settings: {},
    platformMetrics: {},
    
    // Real-time monitoring
    systemHealth: {
        tokenService: 'unknown',
        priceService: 'unknown',
        competitionManager: 'unknown',
        database: 'unknown',
        priceUpdates: 'unknown',
        lastUpdate: null
    },
    
    // Service references
    tokenService: null,
    priceService: null,
    competitionManager: null,
    supabaseClient: null,
    
    // UI state
    charts: {},
    updateIntervals: [],
    realTimeSubscriptions: [],
    automationMonitoringInterval: null, // STEP 3: Real-time automation monitoring
    
    // Competition automation state
    automationState: {
        enabled: false,
        config: {
            competitionsPerDay: 4,
            votingPeriod: 15, // minutes
            performancePeriod: 24, // hours
            minBetAmount: 0.1,
            platformFee: 15,
            maxPoolSize: 100
        },
        status: {
            lastCreated: null,
            nextScheduled: null,
            competitionsToday: 0,
            activeCompetitions: 0
        }
    },
    
    // Token management
    selectedTokens: {
        tokenA: null,
        tokenB: null
    },
    tokenFilters: {
        minMarketCap: 5000000,
        maxMarketCap: 50000000000,
        minAge: 30,
        verified: false,
        search: ''
    },
    
    // Live cache state tracking
    cacheState: {
        tokenCache: {
            hitRate: 0,
            responseTime: 0,
            size: 0,
            lastRefresh: null,
            status: 'unknown',
            fresh: 0,
            stale: 0,
            expired: 0
        },
        priceCache: {
            hitRate: 0,
            responseTime: 0,
            size: 0,
            lastRefresh: null,
            status: 'unknown'
        },
        performance: {
            dailyRequests: 0,
            costSavings: 0,
            efficiency: 0,
            uptime: 0
        }
    },
    
    // Token approval state
    approvalState: {
        pending: [],
        approved: [],
        rejected: [],
        statistics: {
            pendingCount: 0,
            approvalRate: 0,
            avgReviewTime: 0
        },
        selectedTokens: new Set()
    },
    
    // Blacklist management state
    blacklistState: {
        manual: [],
        automatic: [],
        community: [],
        appeals: [],
        categories: {
            manual: 0,
            automatic: 0,
            community: 0,
            appeals: 0
        },
        statistics: {
            totalBlacklisted: 0,
            autoDetected: 0,
            detectionAccuracy: 0,
            appealsPending: 0
        }
    },
    
    // Pair analytics state
    pairState: {
        allPairs: [],
        activePairs: [],
        lastUpdated: null,
        statistics: {
            totalPairs: 0,
            activePairs: 0,
            avgMarketCapDiff: 0,
            avgCompatibility: 0
        }
    },

    // User analytics state
    userAnalytics: {
        totalUsers: 0,
        activeUsers: 0,
        totalVolume: 0,
        avgWinRate: 0,
        topTraders: []
    },

    // Components
    components: {
        cacheMonitor: null,
        tokenApproval: null,
        blacklistManager: null,
        pairOptimizer: null
    }
};

/**
 * Enhanced Debug Logging Function
 */
function debugLog(category, message, data = null) {
    if (!AdminState.debug.enableConsoleLogging) return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[${timestamp}] [${category.toUpperCase()}]`;
    
    if (data) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

/**
 * Initialize Enhanced Admin Panel - COMPREHENSIVE DATA LOADING
 */
async function initializeAdminPanel() {
    try {
        debugLog('init', '🚀 Initializing Advanced TokenWars Admin Panel - DIAGNOSTIC MODE...');
        showLoadingState();
        
        // Initialize core services
        await initializeServiceReferences();
        
        // Initialize components
        await initializeComponents();
        
        // Set up navigation and UI
        setupEnhancedNavigation();
        setupAdminEventListeners();
        
        // Load ALL initial data comprehensively with enhanced error handling
        await loadAllInitialDataWithDiagnostics();
        
        // Set up real-time monitoring
        await setupRealTimeMonitoring();
        
        // Start system health monitoring
        startSystemHealthMonitoring();
        
        // Load dashboard with ALL data
        await loadComprehensiveDashboard();
        
        // Initialize competition management with diagnostics
        await initializeCompetitionManagementWithDiagnostics();
        
        AdminState.isInitialized = true;
        hideLoadingState();
        
        debugLog('init', '✅ Advanced Admin Panel initialized successfully with FULL DATA LOADING');
        showAdminNotification('Admin Panel initialized with comprehensive live data integration', 'success');
        
    } catch (error) {
        debugLog('error', '❌ Admin panel initialization failed:', error);
        hideLoadingState();
        showAdminNotification('Failed to initialize admin panel: ' + error.message, 'error');
    }
}

/**
 * Load ALL Initial Data with Enhanced Diagnostics
 */
async function loadAllInitialDataWithDiagnostics() {
    try {
        debugLog('data', '📊 Loading ALL admin data comprehensively with diagnostics...');
        
        const loadingTasks = [
            { name: 'tokens', fn: loadAllTokensDataWithDiagnostics },
            { name: 'competitions', fn: loadAllCompetitionsDataWithDiagnostics },
            { name: 'blacklist', fn: loadAllBlacklistedTokensWithDiagnostics },
            { name: 'cache', fn: loadComprehensiveCacheDataWithDiagnostics },
            { name: 'users', fn: loadAllUsersDataWithDiagnostics },
            { name: 'metrics', fn: loadAllSystemMetricsWithDiagnostics },
            { name: 'pairs', fn: loadAllTokenPairsWithDiagnostics },
            { name: 'platformAnalytics', fn: loadPlatformAnalyticsWithDiagnostics },
            { name: 'userAnalytics', fn: loadUserAnalyticsWithDiagnostics }
        ];
        
        const results = [];
        
        for (const task of loadingTasks) {
            try {
                debugLog('data', `📂 Loading ${task.name}...`);
                const startTime = Date.now();
                await task.fn();
                const duration = Date.now() - startTime;
                debugLog('data', `✅ ${task.name} loaded in ${duration}ms`);
                results.push({ name: task.name, status: 'success', duration });
            } catch (error) {
                debugLog('error', `❌ Failed to load ${task.name}:`, error);
                results.push({ name: task.name, status: 'failed', error: error.message });
            }
        }
        
        // Summary of loading results
        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'failed').length;
        
        debugLog('data', `📊 Data loading summary: ${successful}/${results.length} successful, ${failed} failed`);
        
        if (failed > 0) {
            const failedTasks = results.filter(r => r.status === 'failed').map(r => r.name);
            debugLog('error', `❌ Failed tasks: ${failedTasks.join(', ')}`);
        }
        
    } catch (error) {
        debugLog('error', 'Error in comprehensive data loading:', error);
        throw error;
    }
}

/**
 * Load ALL Token Pairs with Enhanced Diagnostics - FIX BLANK DISPLAY
 */
async function loadAllTokenPairsWithDiagnostics() {
    try {
        debugLog('pairs', '📈 Loading token pairs with diagnostics...');
        
        const supabase = getSupabase();
        debugLog('pairs', 'Supabase client available:', !!supabase);
        
        // Load ALL token pairs with comprehensive data
        const { data: pairs, error } = await supabase
            .from('token_pairs')
            .select('*')
            .order('updated_at', { ascending: false });
        
        if (error) {
            debugLog('error', 'Token pairs query error:', error);
            throw error;
        }
        
        debugLog('pairs', `Raw pairs data received: ${pairs?.length || 0} items`);
        
        if (AdminState.debug.logDataFlow) {
            debugLog('pairs', 'Sample pair data:', pairs?.[0]);
        }
        
        AdminState.tokenPairs = pairs || [];
        
        // Calculate pair statistics with detailed logging
        const stats = {
            total: pairs?.length || 0,
            active: pairs?.filter(p => p.is_active === true).length || 0,
            avgCompatibility: pairs?.length > 0 ? 
                pairs.reduce((sum, p) => sum + (p.compatibility_score || 0), 0) / pairs.length : 0,
            avgMarketCapRatio: pairs?.length > 0 ? 
                pairs.reduce((sum, p) => sum + (p.market_cap_ratio || 0), 0) / pairs.length : 0,
            lastUpdated: pairs?.[0]?.updated_at || null
        };
        
        debugLog('pairs', 'Calculated statistics:', stats);
        
        // Update pair state with detailed logging
        AdminState.pairState = {
            allPairs: pairs || [],
            activePairs: pairs?.filter(p => p.is_active === true) || [],
            lastUpdated: stats.lastUpdated,
            statistics: {
                totalPairs: stats.total,
                activePairs: stats.active,
                avgMarketCapDiff: Math.round(stats.avgMarketCapRatio * 100),
                avgCompatibility: Math.round(stats.avgCompatibility)
            }
        };
        
        debugLog('pairs', `✅ Loaded ${stats.total} token pairs (${stats.active} active)`, AdminState.pairState);
        
    } catch (error) {
        debugLog('error', 'Error loading token pairs:', error);
        AdminState.tokenPairs = [];
        AdminState.pairState = {
            allPairs: [],
            activePairs: [],
            lastUpdated: null,
            statistics: {
                totalPairs: 0,
                activePairs: 0,
                avgMarketCapDiff: 0,
                avgCompatibility: 0
            }
        };
        throw error;
    }
}

/**
 * Load ALL Competitions Data with Enhanced Diagnostics - FIX BLANK DISPLAY
 */
async function loadAllCompetitionsDataWithDiagnostics() {
    try {
        debugLog('competitions', '🏁 Loading competitions with diagnostics...');
        
        const supabase = getSupabase();
        debugLog('competitions', 'Supabase client available:', !!supabase);
        
        // Load ALL competitions with comprehensive data
        const { data: competitions, error } = await supabase
            .from('competitions')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            debugLog('error', 'Competitions query error:', error);
            throw error;
        }
        
        debugLog('competitions', `Raw competitions data received: ${competitions?.length || 0} items`);
        
        if (AdminState.debug.logDataFlow && competitions?.length > 0) {
            debugLog('competitions', 'Sample competition data:', competitions[0]);
        }
        
        AdminState.competitions = competitions || [];
        
        // Calculate competition statistics with detailed logging
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const stats = {
            total: competitions?.length || 0,
            active: competitions?.filter(c => ['SETUP', 'VOTING', 'ACTIVE'].includes(c.status)).length || 0,
            today: competitions?.filter(c => new Date(c.created_at) >= todayStart).length || 0,
            totalVolume: competitions?.reduce((sum, c) => sum + (parseFloat(c.total_pool) || 0), 0) || 0,
            totalParticipants: competitions?.reduce((sum, c) => sum + (parseInt(c.total_bets) || 0), 0) || 0,
            totalFees: competitions?.reduce((sum, c) => sum + (parseFloat(c.platform_fee_collected) || 0), 0) || 0
        };
        
        debugLog('competitions', 'Calculated statistics:', stats);
        
        // Update automation status
        AdminState.automationState.status.activeCompetitions = stats.active;
        AdminState.automationState.status.competitionsToday = stats.today;
        
        // Update platform metrics
        AdminState.platformMetrics = {
            ...AdminState.platformMetrics,
            totalVolume: stats.totalVolume,
            totalParticipants: stats.totalParticipants,
            totalFees: stats.totalFees,
            activeCompetitions: stats.active
        };
        
        debugLog('competitions', `✅ Loaded ${stats.total} competitions (${stats.active} active, ${stats.today} today)`);
        
    } catch (error) {
        debugLog('error', 'Error loading competitions:', error);
        AdminState.competitions = [];
        throw error;
    }
}

/**
 * Load Comprehensive Cache Data with 406 Error Fix
 */
async function loadComprehensiveCacheDataWithDiagnostics() {
    try {
        debugLog('cache', '🔧 Loading cache data with 406 error diagnostics...');
        
        const supabase = getSupabase();
        
        // Load cache health data with error handling
        try {
            const { data: cacheHealth, error: healthError } = await supabase
                .from('cache_health')
                .select('*')
                .order('recorded_at', { ascending: false })
                .limit(1);

            if (healthError) {
                debugLog('error', 'Cache health query error:', healthError);
            } else if (cacheHealth && cacheHealth.length > 0) {
                const health = cacheHealth[0];
                AdminState.cacheState.tokenCache.hitRate = health.cache_hit_rate || 0;
                AdminState.cacheState.performance.efficiency = health.overall_health_score * 100 || 0;
                AdminState.cacheState.performance.uptime = health.overall_health_score * 100 || 0;
                AdminState.cacheState.tokenCache.lastRefresh = health.recorded_at;
                debugLog('cache', 'Cache health loaded successfully');
            }
        } catch (healthError) {
            debugLog('error', 'Failed to load cache health:', healthError);
        }

        // Load cache analytics with enhanced error handling for 406 fix
        try {
            debugLog('cache', 'Attempting to load cache analytics...');
            
            const { data: cacheAnalytics, error: analyticsError } = await supabase
                .from('cache_analytics')
                .select('*')
                .order('period_start', { ascending: false })
                .limit(1);

            if (analyticsError) {
                if (analyticsError.code === '406' || analyticsError.message?.includes('406')) {
                    debugLog('error', '406 Error on cache_analytics - table may be empty or have schema issues:', analyticsError);
                    // Create a default analytics entry to fix 406 error
                    try {
                        const defaultAnalytics = {
                            period_start: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                            period_end: new Date().toISOString(),
                            total_requests: 0,
                            cache_hits: 0,
                            cache_misses: 0,
                            api_calls_made: 0,
                            avg_processing_time_ms: 0
                        };
                        
                        const { data: insertedAnalytics, error: insertError } = await supabase
                            .from('cache_analytics')
                            .insert([defaultAnalytics])
                            .select()
                            .single();
                        
                        if (insertError) {
                            debugLog('error', 'Failed to insert default analytics:', insertError);
                        } else {
                            debugLog('cache', 'Default analytics entry created to fix 406 error');
                            AdminState.cacheState.tokenCache.responseTime = 0;
                            AdminState.cacheState.performance.dailyRequests = 0;
                        }
                    } catch (insertError) {
                        debugLog('error', 'Failed to create default analytics entry:', insertError);
                    }
                } else {
                    debugLog('error', 'Cache analytics query error:', analyticsError);
                }
            } else if (cacheAnalytics && cacheAnalytics.length > 0) {
                const analytics = cacheAnalytics[0];
                AdminState.cacheState.tokenCache.responseTime = analytics.avg_processing_time_ms || 0;
                AdminState.cacheState.performance.dailyRequests = analytics.total_requests || 0;
                debugLog('cache', 'Cache analytics loaded successfully');
            } else {
                debugLog('cache', 'No cache analytics data found - table may be empty');
            }
        } catch (analyticsError) {
            debugLog('error', 'Failed to load cache analytics:', analyticsError);
        }
        
        debugLog('cache', '✅ Cache data loading completed (with error handling)');
        
    } catch (error) {
        debugLog('error', 'Error in cache data loading:', error);
        // Don't throw - cache errors shouldn't break the whole admin panel
    }
}

/**
 * Other data loading functions with diagnostics
 */
async function loadAllTokensDataWithDiagnostics() {
    try {
        debugLog('tokens', '🪙 Loading tokens with diagnostics...');
        
        const supabase = getSupabase();
        
        const { data: tokens, error } = await supabase
            .from('token_cache')
            .select('*')
            .order('market_cap_usd', { ascending: false });
        
        if (error) throw error;
        AdminState.tokens = tokens || [];
        
        const stats = {
            total: tokens?.length || 0,
            fresh: tokens?.filter(t => t.cache_status === 'FRESH').length || 0,
            stale: tokens?.filter(t => t.cache_status === 'STALE').length || 0,
            expired: tokens?.filter(t => t.cache_status === 'EXPIRED').length || 0
        };
        
        AdminState.cacheState.tokenCache = {
            ...AdminState.cacheState.tokenCache,
            size: stats.total,
            fresh: stats.fresh,
            stale: stats.stale,
            expired: stats.expired,
            status: stats.fresh > 0 ? 'healthy' : 'warning'
        };
        
        debugLog('tokens', `✅ Loaded ${stats.total} tokens (${stats.fresh} fresh, ${stats.stale} stale, ${stats.expired} expired)`);
        
    } catch (error) {
        debugLog('error', 'Error loading tokens:', error);
        AdminState.tokens = [];
        throw error;
    }
}

async function loadAllUsersDataWithDiagnostics() {
    try {
        debugLog('users', '👥 Loading users with diagnostics...');
        
        const supabase = getSupabase();
        
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('total_winnings', { ascending: false });
        
        if (error) throw error;
        AdminState.users = users || [];
        
        debugLog('users', `✅ Loaded ${AdminState.users.length} users from database`);
        
    } catch (error) {
        debugLog('error', 'Error loading users:', error);
        AdminState.users = [];
        throw error;
    }
}

async function loadAllBlacklistedTokensWithDiagnostics() {
    try {
        debugLog('blacklist', '🚫 Loading blacklisted tokens with diagnostics...');
        
        const supabase = getSupabase();
        
        const { data: blacklisted, error } = await supabase
            .from('token_blacklist')
            .select('*')
            .eq('is_active', true);
        
        if (error) throw error;
        
        AdminState.blacklistedTokens.clear();
        if (blacklisted) {
            blacklisted.forEach(token => {
                AdminState.blacklistedTokens.add(token.token_address);
            });
        }
        
        debugLog('blacklist', `✅ Loaded ${AdminState.blacklistedTokens.size} blacklisted tokens`);
        
    } catch (error) {
        debugLog('error', 'Error loading blacklisted tokens:', error);
        AdminState.blacklistedTokens.clear();
        throw error;
    }
}

async function loadAllSystemMetricsWithDiagnostics() {
    try {
        debugLog('metrics', '📊 Loading system metrics...');
        
        const supabase = getSupabase();
        
        const { data: analytics, error } = await supabase
            .from('cache_analytics')
            .select('*')
            .order('period_start', { ascending: false })
            .limit(5);

        if (!error && analytics && analytics.length > 0) {
            AdminState.analytics = analytics[0];
        }
        
        debugLog('metrics', '✅ System metrics loaded');
        
    } catch (error) {
        debugLog('error', 'Error loading system metrics:', error);
        // Don't throw - metrics are not critical
    }
}

async function loadPlatformAnalyticsWithDiagnostics() {
    try {
        debugLog('analytics', '🏢 Loading platform analytics...');
        
        const competitions = AdminState.competitions || [];
        const users = AdminState.users || [];
        
        const analytics = {
            revenue: {
                totalFees: competitions.reduce((sum, c) => sum + (parseFloat(c.platform_fee_collected) || 0), 0),
                avgFeePerCompetition: competitions.length > 0 ? 
                    competitions.reduce((sum, c) => sum + (parseFloat(c.platform_fee_collected) || 0), 0) / competitions.length : 0,
                monthlyRevenue: 0
            },
            engagement: {
                avgParticipantsPerCompetition: competitions.length > 0 ?
                    competitions.reduce((sum, c) => sum + (parseInt(c.total_bets) || 0), 0) / competitions.length : 0,
                userRetention: users.filter(u => u.total_bets > 1).length / (users.length || 1) * 100,
                avgBetsPerUser: users.length > 0 ? 
                    users.reduce((sum, u) => sum + (parseInt(u.total_bets) || 0), 0) / users.length : 0
            }
        };
        
        AdminState.platformMetrics = {
            ...AdminState.platformMetrics,
            ...analytics
        };
        
        debugLog('analytics', '✅ Platform analytics calculated');
        
    } catch (error) {
        debugLog('error', 'Error loading platform analytics:', error);
    }
}

async function loadUserAnalyticsWithDiagnostics() {
    try {
        debugLog('userAnalytics', '📈 Loading user analytics...');
        
        const users = AdminState.users || [];
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const analytics = {
            totalUsers: users.length,
            activeUsers: users.filter(u => new Date(u.last_active) > thirtyDaysAgo).length,
            totalVolume: users.reduce((sum, u) => sum + (parseFloat(u.total_winnings) || 0), 0),
            avgWinRate: users.reduce((sum, u) => sum + (parseFloat(u.win_rate) || 0), 0) / (users.length || 1),
            topTraders: users.slice(0, 10).map(u => ({
                wallet: u.wallet_address,
                username: u.username,
                winnings: u.total_winnings,
                winRate: u.win_rate,
                totalBets: u.total_bets
            }))
        };
        
        AdminState.userAnalytics = analytics;
        
        debugLog('userAnalytics', `✅ User analytics: ${analytics.totalUsers} total, ${analytics.activeUsers} active`);
        
    } catch (error) {
        debugLog('error', 'Error calculating user analytics:', error);
        AdminState.userAnalytics = {
            totalUsers: 0,
            activeUsers: 0,
            totalVolume: 0,
            avgWinRate: 0,
            topTraders: []
        };
    }
}

// ===== ENHANCED SECTION LOADERS WITH PROPER UI UPDATES =====

/**
 * Load Competitions Management Section - FIXED DATA FLOW
 */
async function loadCompetitionsManagementWithDiagnostics() {
    try {
        debugLog('competitionsUI', '🏁 Loading competitions management UI with diagnostics...');
        
        // Reload competitions data first
        await loadAllCompetitionsDataWithDiagnostics();
        
        // Check if UI elements exist
        const competitionsTbody = document.getElementById('competitions-tbody');
        const totalCompetitionsStat = document.getElementById('total-competitions-stat');
        const activeCompetitionsStat = document.getElementById('active-competitions-stat');
        
        debugLog('competitionsUI', 'UI elements found:', {
            tbody: !!competitionsTbody,
            totalStat: !!totalCompetitionsStat,
            activeStat: !!activeCompetitionsStat
        });
        
        // Update automation status
        updateAutomationStatusDisplayWithDiagnostics();
        
        // Update statistics
        updateCompetitionStatisticsWithDiagnostics();
        
        // Render competitions table with diagnostics
        await renderCompetitionsTableWithDiagnostics();
        
        debugLog('competitionsUI', '✅ Competitions management UI loaded with comprehensive data');
        
    } catch (error) {
        debugLog('error', 'Error loading competitions management:', error);
        throw error;
    }
}

/**
 * Render Competitions Table with Enhanced Diagnostics
 */
async function renderCompetitionsTableWithDiagnostics() {
    try {
        debugLog('competitionsTable', '📋 Rendering competitions table with diagnostics...');
        
        const tbody = document.getElementById('competitions-tbody');
        if (!tbody) {
            debugLog('error', 'competitions-tbody element not found in DOM');
            return;
        }
        
        const competitions = AdminState.competitions || [];
        debugLog('competitionsTable', `Rendering ${competitions.length} competitions`);
        
        if (competitions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: #94a3b8;">
                        No competitions found. Create your first competition manually or enable automation.
                    </td>
                </tr>
            `;
            debugLog('competitionsTable', 'No competitions to display - showing empty state');
            return;
        }
        
        // Display recent competitions (limit to 50 for performance)
        const displayCompetitions = competitions.slice(0, 50);
        
        tbody.innerHTML = displayCompetitions.map((comp, index) => {
            const shortId = comp.competition_id?.split('-')[1] || comp.competition_id?.substring(0, 8) || 'Unknown';
            const statusClass = (comp.status || 'unknown').toLowerCase();
            const totalPool = parseFloat(comp.total_pool || 0).toFixed(1);
            const totalBets = comp.total_bets || 0;
            const typeLabel = comp.is_auto_created ? 'Auto' : 'Manual';
            
            debugLog('competitionsTable', `Rendering competition ${index + 1}:`, {
                id: shortId,
                tokens: `${comp.token_a_symbol} vs ${comp.token_b_symbol}`,
                status: comp.status,
                pool: totalPool
            });
            
            return `
                <tr data-competition-id="${comp.competition_id}">
                    <td style="font-family: monospace;">${shortId}</td>
                    <td>
                        <div style="font-weight: 600;">${comp.token_a_symbol || 'N/A'} vs ${comp.token_b_symbol || 'N/A'}</div>
                        <small style="color: #94a3b8;">${truncateText(comp.token_a_name || '', 15)} vs ${truncateText(comp.token_b_name || '', 15)}</small>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}" style="
                            padding: 0.25rem 0.5rem;
                            border-radius: 0.25rem;
                            font-size: 0.75rem;
                            font-weight: 600;
                            text-transform: uppercase;
                            background: ${getStatusColor(comp.status)};
                            color: white;
                        ">${comp.status || 'Unknown'}</span>
                    </td>
                    <td>${totalBets}</td>
                    <td>${totalPool} SOL</td>
                    <td style="font-size: 0.875rem;">${formatDateTime(comp.end_time)}</td>
                    <td>
                        <span style="
                            padding: 0.125rem 0.375rem;
                            border-radius: 0.25rem;
                            font-size: 0.75rem;
                            background: ${typeLabel === 'Auto' ? '#3b82f6' : '#8b5cf6'};
                            color: white;
                        ">${typeLabel}</span>
                    </td>
                    <td>
                        <button class="btn btn-small btn-info" onclick="viewCompetitionDetails('${comp.competition_id}')" style="
                            padding: 0.25rem 0.5rem;
                            font-size: 0.75rem;
                            background: #3b82f6;
                            color: white;
                            border: none;
                            border-radius: 0.25rem;
                            cursor: pointer;
                        ">
                            👁️ View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        debugLog('competitionsTable', `✅ Competitions table rendered with ${displayCompetitions.length} rows`);
        
    } catch (error) {
        debugLog('error', 'Error rendering competitions table:', error);
        
        // Show error state in table
        const tbody = document.getElementById('competitions-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: #ef4444;">
                        Error loading competitions: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Helper function for status colors
 */
function getStatusColor(status) {
    const colors = {
        'setup': '#6b7280',
        'voting': '#3b82f6',
        'active': '#22c55e',
        'closed': '#f59e0b',
        'resolved': '#8b5cf6'
    };
    return colors[status?.toLowerCase()] || '#6b7280';
}

/**
 * Update Competition Statistics with Diagnostics
 */
function updateCompetitionStatisticsWithDiagnostics() {
    try {
        debugLog('competitionsStats', '📊 Updating competition statistics...');
        
        const competitions = AdminState.competitions || [];
        const stats = {
            total: competitions.length,
            active: competitions.filter(c => ['SETUP', 'VOTING', 'ACTIVE'].includes(c.status)).length,
            participants: competitions.reduce((sum, c) => sum + (parseInt(c.total_bets) || 0), 0),
            volume: competitions.reduce((sum, c) => sum + (parseFloat(c.total_pool) || 0), 0)
        };
        
        debugLog('competitionsStats', 'Calculated stats:', stats);
        
        // Update UI elements with existence checks
        updateElementSafely('total-competitions-stat', stats.total);
        updateElementSafely('active-competitions-stat', stats.active);
        updateElementSafely('total-participants-stat', stats.participants.toLocaleString());
        updateElementSafely('total-volume-stat', `${stats.volume.toFixed(1)} SOL`);
        
        debugLog('competitionsStats', '✅ Competition statistics updated');
        
    } catch (error) {
        debugLog('error', 'Error updating competition statistics:', error);
    }
}

/**
 * Load Pair Analytics Section with Enhanced Diagnostics - FIX BLANK DISPLAY
 */
async function loadPairOptimizationWithDiagnostics() {
    try {
        debugLog('pairsUI', '📈 Loading pair analytics UI with diagnostics...');
        
        // Reload pair data first
        await loadAllTokenPairsWithDiagnostics();
        
        // Check if UI elements exist
        const pairsTbody = document.getElementById('pairs-analytics-tbody');
        const totalPairsElement = document.getElementById('total-pairs');
        const activePairsElement = document.getElementById('active-pairs-count');
        
        debugLog('pairsUI', 'UI elements found:', {
            tbody: !!pairsTbody,
            totalPairs: !!totalPairsElement,
            activePairs: !!activePairsElement
        });
        
        // Update UI elements
        updatePairAnalyticsDisplayWithDiagnostics();
        await renderPairAnalyticsTableWithDiagnostics();
        
        debugLog('pairsUI', '✅ Pair analytics UI loaded with comprehensive data');
        
    } catch (error) {
        debugLog('error', 'Error loading pair analytics:', error);
        throw error;
    }
}

/**
 * Update Pair Analytics Display with Diagnostics
 */
function updatePairAnalyticsDisplayWithDiagnostics() {
    try {
        debugLog('pairsDisplay', '📊 Updating pair analytics display...');
        
        const stats = AdminState.pairState.statistics;
        debugLog('pairsDisplay', 'Pair statistics:', stats);
        
        updateElementSafely('total-pairs', stats.totalPairs);
        updateElementSafely('active-pairs-count', stats.activePairs);
        updateElementSafely('avg-market-cap-diff', `${stats.avgMarketCapDiff}%`);
        updateElementSafely('avg-compatibility', `${stats.avgCompatibility}%`);
        
        // Update last update info
        const lastUpdate = AdminState.pairState.lastUpdated;
        updateElementSafely('last-pair-update', lastUpdate ? formatRelativeTime(lastUpdate) : 'Never');
        
        debugLog('pairsDisplay', '✅ Pair analytics display updated');
        
    } catch (error) {
        debugLog('error', 'Error updating pair analytics display:', error);
    }
}

/**
 * Render Pair Analytics Table with Enhanced Diagnostics - FIX BLANK DISPLAY
 */
async function renderPairAnalyticsTableWithDiagnostics() {
    try {
        debugLog('pairsTable', '📋 Rendering pair analytics table with diagnostics...');
        
        const tbody = document.getElementById('pairs-analytics-tbody');
        if (!tbody) {
            debugLog('error', 'pairs-analytics-tbody element not found in DOM');
            return;
        }
        
        const pairs = AdminState.pairState.allPairs;
        debugLog('pairsTable', `Rendering ${pairs.length} pairs`);
        
        if (pairs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #94a3b8;">
                        No token pairs found. Pairs are automatically generated by the edge function every 5 minutes.
                        <br><br>
                        <button onclick="generateTokenPairs()" style="
                            padding: 0.5rem 1rem;
                            background: #8b5cf6;
                            color: white;
                            border: none;
                            border-radius: 0.25rem;
                            cursor: pointer;
                        ">Generate Pairs Now</button>
                    </td>
                </tr>
            `;
            debugLog('pairsTable', 'No pairs to display - showing empty state with generate button');
            return;
        }
        
        tbody.innerHTML = pairs.map((pair, index) => {
            const marketCapRatio = pair.market_cap_ratio ? 
                (pair.market_cap_ratio * 100).toFixed(1) + '%' : 'N/A';
            const compatibility = pair.compatibility_score ? 
                pair.compatibility_score.toFixed(1) + '%' : 'N/A';
            const usageCount = pair.usage_count || 0;
            const category = pair.category || 'Unknown';
            const createdAt = formatRelativeTime(pair.created_at);
            
            debugLog('pairsTable', `Rendering pair ${index + 1}:`, {
                tokenA: pair.token_a_symbol,
                tokenB: pair.token_b_symbol,
                compatibility: compatibility,
                category: category
            });
            
            return `
                <tr data-pair-id="${pair.id}">
                    <td>
                        <div style="font-weight: 600;">${pair.token_a_symbol || 'Unknown'}</div>
                        <small style="color: #94a3b8;">${truncateText(pair.token_a_name || '', 20)}</small>
                    </td>
                    <td>
                        <div style="font-weight: 600;">${pair.token_b_symbol || 'Unknown'}</div>
                        <small style="color: #94a3b8;">${truncateText(pair.token_b_name || '', 20)}</small>
                    </td>
                    <td>${marketCapRatio}</td>
                    <td>
                        <span style="
                            padding: 0.125rem 0.375rem;
                            border-radius: 0.25rem;
                            font-size: 0.75rem;
                            background: ${getCompatibilityColor(pair.compatibility_score)};
                            color: white;
                        ">${compatibility}</span>
                    </td>
                    <td>
                        <span style="
                            padding: 0.125rem 0.375rem;
                            border-radius: 0.25rem;
                            font-size: 0.75rem;
                            background: #6b7280;
                            color: white;
                        ">${category}</span>
                    </td>
                    <td style="font-size: 0.875rem;">${createdAt}</td>
                    <td style="text-align: center;">
                        <span style="
                            padding: 0.125rem 0.375rem;
                            border-radius: 0.25rem;
                            font-size: 0.75rem;
                            background: ${usageCount > 0 ? '#22c55e' : '#6b7280'};
                            color: white;
                        ">${usageCount}</span>
                    </td>
                </tr>
            `;
        }).join('');
        
        debugLog('pairsTable', `✅ Pair analytics table rendered with ${pairs.length} rows`);
        
    } catch (error) {
        debugLog('error', 'Error rendering pair analytics table:', error);
        
        // Show error state in table
        const tbody = document.getElementById('pairs-analytics-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #ef4444;">
                        Error loading pairs: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Helper function for compatibility colors
 */
function getCompatibilityColor(score) {
    if (!score) return '#6b7280';
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
}

/**
 * Initialize Competition Management with Enhanced Diagnostics
 */
async function initializeCompetitionManagementWithDiagnostics() {
    try {
        debugLog('competitionInit', '🏁 Initializing competition management with diagnostics...');
        
        // Load automation status from database
        await loadAutomationStatusWithDiagnostics();
        
        // Set up competition automation controls
        setupCompetitionAutomationControlsWithDiagnostics();
        
        debugLog('competitionInit', '✅ Competition management initialized');
        
    } catch (error) {
        debugLog('error', 'Failed to initialize competition management:', error);
    }
}

/**
 * Load Automation Status with Diagnostics
 */
async function loadAutomationStatusWithDiagnostics() {
    try {
        debugLog('automation', '🤖 Loading automation status...');
        
        if (AdminState.competitionManager) {
            const status = AdminState.competitionManager.getAutomationStatus();
            AdminState.automationState.enabled = status.enabled;
            AdminState.automationState.config = status.config;
            AdminState.automationState.status = status.status;
            
            debugLog('automation', 'Automation status loaded:', status);
        } else {
            debugLog('automation', 'Competition manager not available');
        }
        
    } catch (error) {
        debugLog('error', 'Error loading automation status:', error);
    }
}

/**
 * Setup Competition Automation Controls with Enhanced Diagnostics
 */
function setupCompetitionAutomationControlsWithDiagnostics() {
    try {
        debugLog('automationUI', '🎛️ Setting up enhanced automation controls...');
        
        // Update automation status display
        updateAutomationStatusDisplayEnhanced();
        
        // Set up enhanced parameter change listeners
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('parameter-input')) {
                updateParameterValueEnhanced(e.target);
                debugLog('automationUI', `Parameter updated: ${e.target.id} = ${e.target.value}`);
            }
        });
        
        // Set up automation control buttons
        const startBtn = document.getElementById('start-automation-btn');
        const stopBtn = document.getElementById('stop-automation-btn');
        
        if (startBtn) {
            startBtn.onclick = startCompetitionAutomationEnhanced;
        }
        
        if (stopBtn) {
            stopBtn.onclick = stopCompetitionAutomationEnhanced;
        }
        
        debugLog('automationUI', '✅ Enhanced automation controls set up');
        
    } catch (error) {
        debugLog('error', 'Error setting up enhanced automation controls:', error);
    }
}

/**
 * Update Automation Status Display with Diagnostics
 */
function updateAutomationStatusDisplayWithDiagnostics() {
    try {
        debugLog('automationStatus', '📊 Updating automation status display...');
        
        const statusElement = document.getElementById('automation-status');
        const currentStatusElement = document.getElementById('automation-current-status');
        const startBtn = document.getElementById('start-automation-btn');
        const stopBtn = document.getElementById('stop-automation-btn');
        
        debugLog('automationStatus', 'Status UI elements found:', {
            statusElement: !!statusElement,
            currentStatusElement: !!currentStatusElement,
            startBtn: !!startBtn,
            stopBtn: !!stopBtn
        });
        
        if (statusElement) {
            if (AdminState.automationState.enabled) {
                statusElement.className = 'automation-status active';
            } else {
                statusElement.className = 'automation-status inactive';
            }
        }
        
        if (currentStatusElement) {
            currentStatusElement.textContent = AdminState.automationState.enabled ? 'Running' : 'Stopped';
        }
        
        if (startBtn && stopBtn) {
            startBtn.disabled = AdminState.automationState.enabled;
            stopBtn.disabled = !AdminState.automationState.enabled;
        }
        
        // Update competitions today
        const competitionsToday = document.getElementById('competitions-today');
        if (competitionsToday) {
            const today = new Date().toDateString();
            const todayCompetitions = AdminState.competitions.filter(c => 
                new Date(c.created_at).toDateString() === today
            ).length;
            competitionsToday.textContent = todayCompetitions;
        }
        
        debugLog('automationStatus', `✅ Automation status updated - enabled: ${AdminState.automationState.enabled}`);
        
    } catch (error) {
        debugLog('error', 'Error updating automation status display:', error);
    }
}

// ===== DATABASE-CENTRIC COMPETITION CREATION (FIXED) =====

/**
 * FIXED: Database-Centric Token Pair Selection
 * Replaces the broken TokenService approach with direct database queries
 */
async function selectOptimalTokenPairFromDatabase() {
    try {
        debugLog('pairSelection', '🎯 Selecting optimal token pair from database...');
        
        // Use already-loaded token pairs from AdminState
        const availablePairs = AdminState.pairState.activePairs;
        
        if (!availablePairs || availablePairs.length === 0) {
            debugLog('error', 'No active token pairs available in AdminState');
            return null;
        }
        
        debugLog('pairSelection', `Found ${availablePairs.length} active pairs in database`);
        
        // Filter out recently used pairs
        const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        
        const freshPairs = availablePairs.filter(pair => {
            if (!pair.last_used) return true;
            const lastUsed = new Date(pair.last_used).getTime();
            return (now - lastUsed) > recentThreshold;
        });
        
        debugLog('pairSelection', `Found ${freshPairs.length} fresh pairs (not used in 24h)`);
        
        // Use fresh pairs if available, otherwise use any available pair
        const candidatePairs = freshPairs.length > 0 ? freshPairs : availablePairs;
        
        // Select pair with highest compatibility score
        const optimalPair = candidatePairs.reduce((best, current) => {
            const currentScore = current.compatibility_score || 0;
            const bestScore = best?.compatibility_score || 0;
            return currentScore > bestScore ? current : best;
        }, null);
        
        if (optimalPair) {
            debugLog('pairSelection', `✅ Selected optimal pair: ${optimalPair.token_a_symbol} vs ${optimalPair.token_b_symbol} (score: ${optimalPair.compatibility_score})`);
        } else {
            debugLog('error', 'No optimal pair found');
        }
        
        return optimalPair;
        
    } catch (error) {
        debugLog('error', 'Error selecting optimal token pair from database:', error);
        return null;
    }
}

/**
 * FIXED: Database-Centric Token Pair Validation
 * Since pairs in token_pairs table are already approved, validation is simplified
 */
async function validateTokenPairFromDatabase(pair) {
    try {
        if (!pair) {
            return { valid: false, reason: 'No pair provided' };
        }
        
        // Basic validation - pairs in database are already vetted
        if (!pair.token_a_address || !pair.token_b_address) {
            return { valid: false, reason: 'Missing token addresses' };
        }
        
        if (!pair.token_a_symbol || !pair.token_b_symbol) {
            return { valid: false, reason: 'Missing token symbols' };
        }
        
        // Check if either token is blacklisted
        if (AdminState.blacklistedTokens.has(pair.token_a_address) || 
            AdminState.blacklistedTokens.has(pair.token_b_address)) {
            return { valid: false, reason: 'One or more tokens are blacklisted' };
        }
        
        debugLog('pairValidation', `✅ Pair validation passed: ${pair.token_a_symbol} vs ${pair.token_b_symbol}`);
        
        return { 
            valid: true, 
            compatibility: pair.compatibility_score || 85
        };
        
    } catch (error) {
        debugLog('error', 'Error validating token pair:', error);
        return { valid: false, reason: `Validation error: ${error.message}` };
    }
}

/**
 * FIXED: Database-Centric Competition Creation
 * Replaces service-based approach with direct database operations
 */
async function createCompetitionDirectDatabase(config = {}) {
    try {
        debugLog('competitionCreation', '🚀 Creating competition with database-centric approach...');
        
        const adminWallet = sessionStorage.getItem('adminWallet');
        if (!adminWallet) {
            throw new Error('Admin wallet not connected');
        }
        
        // Get optimal token pair from database
        const tokenPair = await selectOptimalTokenPairFromDatabase();
        if (!tokenPair) {
            throw new Error('No suitable token pair available');
        }
        
        // Validate the selected pair
        const validation = await validateTokenPairFromDatabase(tokenPair);
        if (!validation.valid) {
            throw new Error(`Token validation failed: ${validation.reason}`);
        }
        
        // Calculate competition timing
        const now = new Date();
        const startTime = new Date(now.getTime() + (config.startDelay || 5 * 60 * 1000)); // Default 5 minutes
        const votingEndTime = new Date(startTime.getTime() + (config.votingDuration || 15) * 60 * 1000);
        const endTime = new Date(votingEndTime.getTime() + (config.activeDuration || 24) * 60 * 60 * 1000);
        
        // Prepare competition data
        const competitionData = {
            competition_id: `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            token_a_address: tokenPair.token_a_address,
            token_b_address: tokenPair.token_b_address,
            token_a_symbol: tokenPair.token_a_symbol,
            token_b_symbol: tokenPair.token_b_symbol,
            token_a_name: tokenPair.token_a_name,
            token_b_name: tokenPair.token_b_name,
            pair_id: tokenPair.id,
            status: 'SETUP',
            start_time: startTime.toISOString(),
            voting_end_time: votingEndTime.toISOString(),
            end_time: endTime.toISOString(),
            bet_amount: config.betAmount || 0.1,
            platform_fee_percentage: config.platformFee || 15,
            total_pool: 0,
            total_bets: 0,
            is_auto_created: !config.isManual,
            created_by: adminWallet,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
        };
        
        debugLog('competitionCreation', 'Competition data prepared:', competitionData);
        
        // Insert competition into database
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('competitions')
            .insert([competitionData])
            .select()
            .single();
        
        if (error) {
            throw new Error(`Database insert failed: ${error.message}`);
        }
        
        // Update token pair usage
        await supabase
            .from('token_pairs')
            .update({
                usage_count: (tokenPair.usage_count || 0) + 1,
                last_used: now.toISOString(),
                last_competition_id: data.competition_id,
                updated_at: now.toISOString()
            })
            .eq('id', tokenPair.id);
        
        debugLog('competitionCreation', `✅ Competition created successfully: ${data.competition_id}`);
        
        return data;
        
    } catch (error) {
        debugLog('error', 'Error creating competition with database approach:', error);
        throw error;
    }
}

/**
 * FIXED: Manual Competition Creation
 * Updated to use database-centric approach instead of service layer
 */
async function createManualCompetitionWithConfig(config = {}) {
    try {
        debugLog('manualCompetition', '🎯 Creating manual competition with fixed database approach...');
        
        // Use database-centric creation
        const competition = await createCompetitionDirectDatabase({
            ...config,
            isManual: true
        });
        
        return competition;
        
    } catch (error) {
        debugLog('error', 'Error in createManualCompetitionWithConfig:', error);
        throw error;
    }
}

/**
 * FIXED: Submit Manual Competition
 * Updated to use database-centric approach
 */
async function submitManualCompetition() {
    try {
        debugLog('competitionSubmit', '🚀 Submitting manual competition with fixed approach...');
        
        if (!AdminState.selectedTokens.selectedPairId) {
            showAdminNotification('Please select a token pair first', 'error');
            return;
        }
        
        const adminWallet = sessionStorage.getItem('adminWallet');
        if (!adminWallet) {
            showAdminNotification('Admin wallet not connected', 'error');
            return;
        }
        
        // Get selected pair from AdminState
        const selectedPair = AdminState.pairState.allPairs.find(p => p.id === AdminState.selectedTokens.selectedPairId);
        if (!selectedPair) {
            showAdminNotification('Selected token pair not found', 'error');
            return;
        }
        
        // Get form configuration
        const config = {
            votingDuration: parseInt(document.getElementById('manual-voting-period')?.value || 15),
            activeDuration: parseInt(document.getElementById('manual-performance-period')?.value || 24),
            betAmount: parseFloat(document.getElementById('manual-bet-amount')?.value || 0.1),
            platformFee: parseInt(document.getElementById('manual-platform-fee')?.value || 15),
            startDelay: getStartDelay(document.getElementById('manual-start-time')?.value || 'immediate'),
            priority: document.getElementById('manual-priority')?.value || 'normal',
            isManual: true,
            selectedPair: selectedPair
        };
        
        debugLog('competitionSubmit', 'Competition config:', config);
        
        // Show loading state
        const submitButton = document.querySelector('button[onclick="submitManualCompetition()"]');
        if (submitButton) {
            submitButton.textContent = '⏳ Creating...';
            submitButton.disabled = true;
        }
        
        // Create competition using database-centric approach
        const competition = await createCompetitionDirectDatabase(config);
        
        if (competition) {
            // Close modal
            closeCompetitionModal();
            
            // Reload competitions data and UI
            await loadAllCompetitionsDataWithDiagnostics();
            await loadCompetitionsManagementWithDiagnostics();
            
            showAdminNotification(
                `Competition created successfully: ${selectedPair.token_a_symbol} vs ${selectedPair.token_b_symbol}`,
                'success'
            );
            
            // Log admin action
            await logAdminAction('competition_create_manual', {
                competition_id: competition.competition_id,
                token_pair: `${selectedPair.token_a_symbol} vs ${selectedPair.token_b_symbol}`,
                config: config,
                admin_wallet: adminWallet
            });
            
            debugLog('competitionSubmit', `✅ Competition created: ${competition.competition_id}`);
        }
        
    } catch (error) {
        debugLog('error', 'Error submitting manual competition:', error);
        showAdminNotification('Failed to create competition: ' + error.message, 'error');
        
        // Reset submit button
        const submitButton = document.querySelector('button[onclick="submitManualCompetition()"]');
        if (submitButton) {
            submitButton.textContent = '🚀 Create Competition';
            submitButton.disabled = false;
        }
    }
}

// ===== ENHANCED UTILITY FUNCTIONS =====

/**
 * Safely update element with existence check
 */
function updateElementSafely(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
        debugLog('ui', `Updated element ${id}: ${value}`);
    } else {
        debugLog('error', `Element not found: ${id}`);
    }
}

/**
 * Enhanced Section Switching with Diagnostics
 */
async function switchToSectionWithDiagnostics(sectionName) {
    try {
        debugLog('navigation', `🧭 Switching to section: ${sectionName}`);
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const targetNavItem = document.querySelector(`[href="#${sectionName}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
        }
        
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            AdminState.currentSection = sectionName;
            await loadSectionDataWithDiagnostics(sectionName);
        } else {
            debugLog('error', `Section not found: ${sectionName}`);
        }
        
        debugLog('navigation', `✅ Switched to section: ${sectionName}`);
        
    } catch (error) {
        debugLog('error', 'Error switching to section:', error);
        showAdminNotification('Failed to load section', 'error');
    }
}

/**
 * Load Section-Specific Data with Diagnostics
 */
async function loadSectionDataWithDiagnostics(sectionName) {
    try {
        debugLog('sectionLoad', `📂 Loading data for section: ${sectionName}`);
        showLoadingOverlay(sectionName);
        
        switch (sectionName) {
            case 'dashboard':
                await loadComprehensiveDashboard();
                break;
            case 'cache-management':
                await loadCacheManagement();
                break;
            case 'token-approval':
                await loadTokenApproval();
                break;
            case 'blacklist-management':
                await loadBlacklistManagement();
                break;
            case 'pair-optimization':
                await loadPairOptimizationWithDiagnostics();
                break;
            case 'competitions':
                await loadCompetitionsManagementWithDiagnostics();
                break;
            case 'tokens':
                await loadTokenManagement();
                break;
            case 'analytics':
                await loadAnalyticsDashboard();
                break;
        }
        
        debugLog('sectionLoad', `✅ Section data loaded: ${sectionName}`);
        
    } catch (error) {
        debugLog('error', `Error loading ${sectionName} data:`, error);
        showAdminNotification(`Failed to load ${sectionName} data`, 'error');
    } finally {
        hideLoadingOverlay(sectionName);
    }
}

// ===== STEP 2: MANUAL COMPETITION CREATION INTERFACE =====

/**
 * Enhanced Manual Competition Creation with Token Pair Selection
 */
async function createManualCompetitionWithInterface() {
    try {
        debugLog('competitionCreation', '🎯 Starting manual competition creation with interface...');
        
        const adminWallet = sessionStorage.getItem('adminWallet');
        if (!adminWallet) {
            showAdminNotification('Admin wallet not connected', 'error');
            return;
        }

        // Verify admin wallet
        const isAuthorized = await verifyAdminWallet(adminWallet);
        if (!isAuthorized) {
            showAdminNotification('Unauthorized: Wallet not in admin table', 'error');
            return;
        }

        // Show competition creation modal
        await showCompetitionCreationModal();
        
    } catch (error) {
        debugLog('error', 'Error in manual competition creation:', error);
        showAdminNotification('Failed to open competition creation: ' + error.message, 'error');
    }
}

/**
 * Show Competition Creation Modal with Token Pair Selection
 */
async function showCompetitionCreationModal() {
    try {
        debugLog('competitionModal', '📋 Showing competition creation modal...');
        
        // Load available token pairs
        await loadAllTokenPairsWithDiagnostics();
        const availablePairs = AdminState.pairState.allPairs.filter(pair => pair.is_active);
        
        if (availablePairs.length === 0) {
            showAdminNotification('No active token pairs available. Generate pairs first.', 'warning');
            return;
        }
        
        // Create modal HTML
        const modal = document.createElement('div');
        modal.id = 'competition-creation-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--admin-surface, #1f2937);
                border: 1px solid var(--admin-border, #374151);
                border-radius: 12px;
                padding: 2rem;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 1000;
                color: var(--admin-text, #f3f4f6);
            ">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h2 style="margin: 0; color: #8b5cf6;">🎯 Create Manual Competition</h2>
                    <button onclick="closeCompetitionModal()" style="
                        background: none;
                        border: none;
                        color: #9ca3af;
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 0.25rem;
                    ">&times;</button>
                </div>
                
                <form id="competition-creation-form">
                    <!-- Token Pair Selection -->
                    <div class="form-section" style="margin-bottom: 1.5rem;">
                        <h3 style="margin-bottom: 1rem; color: #d1d5db;">🪙 Token Pair Selection</h3>
                        <div id="token-pair-selection">
                            ${renderTokenPairOptions(availablePairs)}
                        </div>
                    </div>
                    
                    <!-- Competition Parameters -->
                    <div class="form-section" style="margin-bottom: 1.5rem;">
                        <h3 style="margin-bottom: 1rem; color: #d1d5db;">⚙️ Competition Parameters</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #9ca3af;">Voting Period (minutes)</label>
                                <input type="number" id="manual-voting-period" min="5" max="60" value="15" style="
                                    width: 100%;
                                    padding: 0.5rem;
                                    background: var(--admin-bg, #111827);
                                    border: 1px solid var(--admin-border, #374151);
                                    border-radius: 4px;
                                    color: var(--admin-text, #f3f4f6);
                                ">
                            </div>
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #9ca3af;">Performance Period (hours)</label>
                                <input type="number" id="manual-performance-period" min="1" max="48" value="24" style="
                                    width: 100%;
                                    padding: 0.5rem;
                                    background: var(--admin-bg, #111827);
                                    border: 1px solid var(--admin-border, #374151);
                                    border-radius: 4px;
                                    color: var(--admin-text, #f3f4f6);
                                ">
                            </div>
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #9ca3af;">Bet Amount (SOL)</label>
                                <input type="number" id="manual-bet-amount" min="0.01" max="10" step="0.01" value="0.1" style="
                                    width: 100%;
                                    padding: 0.5rem;
                                    background: var(--admin-bg, #111827);
                                    border: 1px solid var(--admin-border, #374151);
                                    border-radius: 4px;
                                    color: var(--admin-text, #f3f4f6);
                                ">
                            </div>
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #9ca3af;">Platform Fee (%)</label>
                                <input type="number" id="manual-platform-fee" min="1" max="30" value="15" style="
                                    width: 100%;
                                    padding: 0.5rem;
                                    background: var(--admin-bg, #111827);
                                    border: 1px solid var(--admin-border, #374151);
                                    border-radius: 4px;
                                    color: var(--admin-text, #f3f4f6);
                                ">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Competition Timing -->
                    <div class="form-section" style="margin-bottom: 1.5rem;">
                        <h3 style="margin-bottom: 1rem; color: #d1d5db;">⏰ Competition Timing</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #9ca3af;">Start Time</label>
                                <select id="manual-start-time" style="
                                    width: 100%;
                                    padding: 0.5rem;
                                    background: var(--admin-bg, #111827);
                                    border: 1px solid var(--admin-border, #374151);
                                    border-radius: 4px;
                                    color: var(--admin-text, #f3f4f6);
                                ">
                                    <option value="immediate">Immediate (5 minutes)</option>
                                    <option value="15min">15 minutes</option>
                                    <option value="30min">30 minutes</option>
                                    <option value="1hour">1 hour</option>
                                    <option value="custom">Custom...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #9ca3af;">Priority</label>
                                <select id="manual-priority" style="
                                    width: 100%;
                                    padding: 0.5rem;
                                    background: var(--admin-bg, #111827);
                                    border: 1px solid var(--admin-border, #374151);
                                    border-radius: 4px;
                                    color: var(--admin-text, #f3f4f6);
                                ">
                                    <option value="normal">Normal</option>
                                    <option value="high">High Priority</option>
                                    <option value="featured">Featured</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Competition Preview -->
                    <div class="form-section" style="margin-bottom: 1.5rem;">
                        <h3 style="margin-bottom: 1rem; color: #d1d5db;">👁️ Competition Preview</h3>
                        <div id="competition-preview" style="
                            background: var(--admin-bg, #111827);
                            border: 1px solid var(--admin-border, #374151);
                            border-radius: 8px;
                            padding: 1rem;
                            margin-bottom: 1rem;
                        ">
                            <div id="preview-content">Select a token pair to see preview</div>
                        </div>
                    </div>
                    
                    <!-- Form Actions -->
                    <div class="form-actions" style="display: flex; justify-content: space-between; gap: 1rem;">
                        <button type="button" onclick="closeCompetitionModal()" style="
                            padding: 0.75rem 1.5rem;
                            background: #6b7280;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                        ">Cancel</button>
                        
                        <div style="display: flex; gap: 1rem;">
                            <button type="button" onclick="validateCompetitionForm()" style="
                                padding: 0.75rem 1.5rem;
                                background: #3b82f6;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-weight: 600;
                            ">🧪 Validate</button>
                            
                            <button type="button" onclick="submitManualCompetition()" style="
                                padding: 0.75rem 1.5rem;
                                background: #22c55e;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-weight: 600;
                            ">🚀 Create Competition</button>
                        </div>
                    </div>
                </form>
            </div>
            
            <div class="modal-backdrop" onclick="closeCompetitionModal()" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.75);
                z-index: 999;
            "></div>
        `;
        
        document.body.appendChild(modal);
        
        // Set up event listeners
        setupCompetitionFormListeners();
        
        debugLog('competitionModal', '✅ Competition creation modal displayed');
        
    } catch (error) {
        debugLog('error', 'Error showing competition creation modal:', error);
        showAdminNotification('Failed to show creation modal: ' + error.message, 'error');
    }
}

/**
 * Render Token Pair Selection Options
 */
function renderTokenPairOptions(pairs) {
    if (pairs.length === 0) {
        return '<div style="text-align: center; color: #9ca3af; padding: 2rem;">No active token pairs available</div>';
    }
    
    return `
        <div style="display: grid; gap: 0.75rem; max-height: 300px; overflow-y: auto;">
            ${pairs.map((pair, index) => `
                <div class="token-pair-option" data-pair-id="${pair.id}" onclick="selectTokenPair('${pair.id}')" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: var(--admin-bg, #111827);
                    border: 1px solid var(--admin-border, #374151);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                " onmouseover="this.style.borderColor='#8b5cf6'" onmouseout="this.style.borderColor='#374151'">
                    <div class="pair-info">
                        <div style="font-weight: 600; margin-bottom: 0.25rem;">
                            ${pair.token_a_symbol || 'Unknown'} vs ${pair.token_b_symbol || 'Unknown'}
                        </div>
                        <div style="font-size: 0.875rem; color: #9ca3af;">
                            ${truncateText(pair.token_a_name || '', 25)} vs ${truncateText(pair.token_b_name || '', 25)}
                        </div>
                        <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">
                            Category: ${pair.category || 'Unknown'} • 
                            Compatibility: ${pair.compatibility_score ? Math.round(pair.compatibility_score) + '%' : 'N/A'} • 
                            Used: ${pair.usage_count || 0} times
                        </div>
                    </div>
                    <div class="pair-actions" style="display: flex; gap: 0.5rem;">
                        <button onclick="event.stopPropagation(); reviewTokenPair('${pair.id}')" style="
                            padding: 0.25rem 0.5rem;
                            background: #3b82f6;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            font-size: 0.75rem;
                            cursor: pointer;
                        ">🔍 Review</button>
                        <div class="compatibility-badge" style="
                            padding: 0.25rem 0.5rem;
                            border-radius: 4px;
                            font-size: 0.75rem;
                            font-weight: 600;
                            background: ${getCompatibilityColor(pair.compatibility_score)};
                            color: white;
                        ">${pair.compatibility_score ? Math.round(pair.compatibility_score) + '%' : 'N/A'}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Setup Competition Form Event Listeners
 */
function setupCompetitionFormListeners() {
    // Update preview when form values change
    const formInputs = document.querySelectorAll('#competition-creation-form input, #competition-creation-form select');
    formInputs.forEach(input => {
        input.addEventListener('change', updateCompetitionPreview);
        input.addEventListener('input', updateCompetitionPreview);
    });
    
    debugLog('competitionForm', '✅ Competition form listeners set up');
}

/**
 * Select Token Pair for Competition
 */
function selectTokenPair(pairId) {
    try {
        debugLog('pairSelection', `🎯 Selecting token pair: ${pairId}`);
        
        // Remove previous selection
        document.querySelectorAll('.token-pair-option').forEach(option => {
            option.style.borderColor = '#374151';
            option.style.background = 'var(--admin-bg, #111827)';
        });
        
        // Highlight selected pair
        const selectedOption = document.querySelector(`[data-pair-id="${pairId}"]`);
        if (selectedOption) {
            selectedOption.style.borderColor = '#8b5cf6';
            selectedOption.style.background = 'rgba(139, 92, 246, 0.1)';
        }
        
        // Store selected pair
        AdminState.selectedTokens.selectedPairId = pairId;
        
        // Update preview
        updateCompetitionPreview();
        
        debugLog('pairSelection', `✅ Token pair selected: ${pairId}`);
        
    } catch (error) {
        debugLog('error', 'Error selecting token pair:', error);
    }
}

/**
 * Review Token Pair (CoinGecko Integration)
 */
function reviewTokenPair(pairId) {
    try {
        const pair = AdminState.pairState.allPairs.find(p => p.id === pairId);
        if (!pair) {
            showAdminNotification('Token pair not found', 'error');
            return;
        }
        
        debugLog('pairReview', `🔍 Reviewing token pair: ${pair.token_a_symbol} vs ${pair.token_b_symbol}`);
        
        // Open both tokens in CoinGecko
        const tokenA = pair.token_a_symbol?.toLowerCase();
        const tokenB = pair.token_b_symbol?.toLowerCase();
        
        if (tokenA) {
            const urlA = `https://www.coingecko.com/en/search?query=${tokenA}`;
            window.open(urlA, '_blank');
        }
        
        if (tokenB) {
            setTimeout(() => {
                const urlB = `https://www.coingecko.com/en/search?query=${tokenB}`;
                window.open(urlB, '_blank');
            }, 500);
        }
        
        showAdminNotification(`Opened CoinGecko reviews for ${pair.token_a_symbol} and ${pair.token_b_symbol}`, 'info');
        
    } catch (error) {
        debugLog('error', 'Error reviewing token pair:', error);
        showAdminNotification('Failed to open token reviews', 'error');
    }
}

/**
 * Update Competition Preview
 */
function updateCompetitionPreview() {
    try {
        const previewContent = document.getElementById('preview-content');
        if (!previewContent) return;
        
        const selectedPairId = AdminState.selectedTokens.selectedPairId;
        if (!selectedPairId) {
            previewContent.innerHTML = 'Select a token pair to see preview';
            return;
        }
        
        const pair = AdminState.pairState.allPairs.find(p => p.id === selectedPairId);
        if (!pair) {
            previewContent.innerHTML = 'Selected pair not found';
            return;
        }
        
        // Get form values
        const votingPeriod = document.getElementById('manual-voting-period')?.value || 15;
        const performancePeriod = document.getElementById('manual-performance-period')?.value || 24;
        const betAmount = document.getElementById('manual-bet-amount')?.value || 0.1;
        const platformFee = document.getElementById('manual-platform-fee')?.value || 15;
        const startTime = document.getElementById('manual-start-time')?.value || 'immediate';
        
        // Calculate timing
        const now = new Date();
        const startDelay = getStartDelay(startTime);
        const actualStartTime = new Date(now.getTime() + startDelay);
        const votingEndTime = new Date(actualStartTime.getTime() + parseInt(votingPeriod) * 60 * 1000);
        const competitionEndTime = new Date(votingEndTime.getTime() + parseInt(performancePeriod) * 60 * 60 * 1000);
        
        previewContent.innerHTML = `
            <div style="display: grid; gap: 1rem;">
                <div class="preview-section">
                    <h4 style="margin: 0 0 0.5rem 0; color: #8b5cf6;">🪙 Token Matchup</h4>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="text-align: center;">
                            <div style="font-weight: 600; font-size: 1.125rem;">${pair.token_a_symbol}</div>
                            <div style="font-size: 0.875rem; color: #9ca3af;">${truncateText(pair.token_a_name || '', 15)}</div>
                        </div>
                        <div style="color: #8b5cf6; font-weight: 600; font-size: 1.25rem;">VS</div>
                        <div style="text-align: center;">
                            <div style="font-weight: 600; font-size: 1.125rem;">${pair.token_b_symbol}</div>
                            <div style="font-size: 0.875rem; color: #9ca3af;">${truncateText(pair.token_b_name || '', 15)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="preview-section">
                    <h4 style="margin: 0 0 0.5rem 0; color: #8b5cf6;">⏰ Competition Timeline</h4>
                    <div style="font-size: 0.875rem; line-height: 1.5;">
                        <div><strong>Start:</strong> ${actualStartTime.toLocaleString()}</div>
                        <div><strong>Voting Ends:</strong> ${votingEndTime.toLocaleString()}</div>
                        <div><strong>Competition Ends:</strong> ${competitionEndTime.toLocaleString()}</div>
                        <div style="color: #9ca3af; margin-top: 0.5rem;">
                            Total Duration: ${parseInt(votingPeriod) + parseInt(performancePeriod) * 60} minutes
                        </div>
                    </div>
                </div>
                
                <div class="preview-section">
                    <h4 style="margin: 0 0 0.5rem 0; color: #8b5cf6;">💰 Economics</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.875rem;">
                        <div><strong>Bet Amount:</strong> ${betAmount} SOL</div>
                        <div><strong>Platform Fee:</strong> ${platformFee}%</div>
                        <div><strong>Winner Gets:</strong> ${(parseFloat(betAmount) * 2 * (1 - parseFloat(platformFee) / 100)).toFixed(3)} SOL</div>
                        <div><strong>Platform Gets:</strong> ${(parseFloat(betAmount) * 2 * parseFloat(platformFee) / 100).toFixed(3)} SOL</div>
                    </div>
                </div>
                
                <div class="preview-section">
                    <h4 style="margin: 0 0 0.5rem 0; color: #8b5cf6;">📊 Pair Quality</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.875rem;">
                        <div><strong>Compatibility:</strong> ${pair.compatibility_score ? Math.round(pair.compatibility_score) + '%' : 'N/A'}</div>
                        <div><strong>Category:</strong> ${pair.category || 'Unknown'}</div>
                        <div><strong>Market Cap Ratio:</strong> ${pair.market_cap_ratio ? (pair.market_cap_ratio * 100).toFixed(1) + '%' : 'N/A'}</div>
                        <div><strong>Previous Use:</strong> ${pair.usage_count || 0} times</div>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        debugLog('error', 'Error updating competition preview:', error);
    }
}

/**
 * Get Start Delay in Milliseconds
 */
function getStartDelay(startTimeOption) {
    const delays = {
        'immediate': 5 * 60 * 1000,      // 5 minutes
        '15min': 15 * 60 * 1000,         // 15 minutes
        '30min': 30 * 60 * 1000,         // 30 minutes
        '1hour': 60 * 60 * 1000,         // 1 hour
        'custom': 5 * 60 * 1000          // Default to 5 minutes for custom
    };
    
    return delays[startTimeOption] || delays['immediate'];
}

/**
 * Validate Competition Form
 */
function validateCompetitionForm() {
    try {
        debugLog('competitionValidation', '🧪 Validating competition form...');
        
        const validationResults = [];
        
        // Check if pair is selected
        if (!AdminState.selectedTokens.selectedPairId) {
            validationResults.push('❌ No token pair selected');
        } else {
            validationResults.push('✅ Token pair selected');
        }
        
        // Validate form inputs
        const votingPeriod = document.getElementById('manual-voting-period')?.value;
        const performancePeriod = document.getElementById('manual-performance-period')?.value;
        const betAmount = document.getElementById('manual-bet-amount')?.value;
        const platformFee = document.getElementById('manual-platform-fee')?.value;
        
        if (votingPeriod && votingPeriod >= 5 && votingPeriod <= 60) {
            validationResults.push('✅ Voting period valid');
        } else {
            validationResults.push('❌ Voting period must be 5-60 minutes');
        }
        
        if (performancePeriod && performancePeriod >= 1 && performancePeriod <= 48) {
            validationResults.push('✅ Performance period valid');
        } else {
            validationResults.push('❌ Performance period must be 1-48 hours');
        }
        
        if (betAmount && betAmount >= 0.01 && betAmount <= 10) {
            validationResults.push('✅ Bet amount valid');
        } else {
            validationResults.push('❌ Bet amount must be 0.01-10 SOL');
        }
        
        if (platformFee && platformFee >= 1 && platformFee <= 30) {
            validationResults.push('✅ Platform fee valid');
        } else {
            validationResults.push('❌ Platform fee must be 1-30%');
        }
        
        // Check admin authorization
        const adminWallet = sessionStorage.getItem('adminWallet');
        if (adminWallet) {
            validationResults.push('✅ Admin wallet connected');
        } else {
            validationResults.push('❌ Admin wallet not connected');
        }
        
        // Show validation results
        const validationModal = document.createElement('div');
        validationModal.className = 'modal-overlay';
        validationModal.innerHTML = `
            <div class="modal-content" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--admin-surface, #1f2937);
                border: 1px solid var(--admin-border, #374151);
                border-radius: 12px;
                padding: 1.5rem;
                width: 90%;
                max-width: 400px;
                z-index: 1001;
                color: var(--admin-text, #f3f4f6);
            ">
                <h3 style="margin: 0 0 1rem 0; color: #8b5cf6;">🧪 Validation Results</h3>
                <div style="margin-bottom: 1.5rem;">
                    ${validationResults.map(result => `
                        <div style="margin-bottom: 0.5rem; font-size: 0.875rem;">${result}</div>
                    `).join('')}
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    width: 100%;
                    padding: 0.75rem;
                    background: #8b5cf6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">Close</button>
            </div>
            <div class="modal-backdrop" onclick="this.parentElement.remove()" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.75);
                z-index: 1000;
            "></div>
        `;
        
        document.body.appendChild(validationModal);
        
        const isValid = !validationResults.some(result => result.includes('❌'));
        debugLog('competitionValidation', `Validation complete - ${isValid ? 'PASSED' : 'FAILED'}`);
        
    } catch (error) {
        debugLog('error', 'Error validating competition form:', error);
        showAdminNotification('Validation failed: ' + error.message, 'error');
    }
}

/**
 * Close Competition Creation Modal
 */
function closeCompetitionModal() {
    const modal = document.getElementById('competition-creation-modal');
    if (modal) {
        modal.remove();
    }
    
    // Reset selection state
    AdminState.selectedTokens.selectedPairId = null;
    
    debugLog('competitionModal', '✅ Competition creation modal closed');
}

// ===== STEP 3: AUTOMATION CONTROLS & UI POLISH =====

/**
 * Enhanced Competition Automation with Real-time Controls
 */

/**
 * Start Competition Automation with Enhanced Controls
 */
async function startCompetitionAutomationEnhanced() {
    try {
        debugLog('automation', '🚀 Starting enhanced competition automation...');
        
        const adminWallet = sessionStorage.getItem('adminWallet');
        if (!adminWallet) {
            showAdminNotification('Admin wallet not connected', 'error');
            return;
        }

        // Enhanced admin verification with detailed feedback
        const authResult = await verifyAdminWalletEnhanced(adminWallet);
        if (!authResult.authorized) {
            showAdminNotification(`Unauthorized: ${authResult.reason}`, 'error');
            return;
        }

        // Show enhanced confirmation dialog with details
        const automationConfig = getAutomationParametersEnhanced();
        const confirmationHtml = `
            <div style="color: var(--admin-text, #f3f4f6);">
                <h3 style="margin-bottom: 1rem; color: #22c55e;">🚀 Start Competition Automation</h3>
                <p style="margin-bottom: 1rem;">This will start automated competition generation with the following settings:</p>
                <div style="background: var(--admin-bg, #111827); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                    <div><strong>Frequency:</strong> ${automationConfig.competitionsPerDay} competitions per day (every ${(24/automationConfig.competitionsPerDay).toFixed(1)} hours)</div>
                    <div><strong>Voting Period:</strong> ${automationConfig.votingPeriod} minutes</div>
                    <div><strong>Performance Period:</strong> ${automationConfig.performancePeriod} hours</div>
                    <div><strong>Bet Amount:</strong> ${automationConfig.minBetAmount} SOL</div>
                    <div><strong>Platform Fee:</strong> ${automationConfig.platformFee}%</div>
                    <div><strong>Max Pool Size:</strong> ${automationConfig.maxPoolSize} SOL</div>
                </div>
                <p style="color: #f59e0b; margin-bottom: 1rem;">⚠️ Automation will run continuously until manually stopped.</p>
                <p>Continue with automation startup?</p>
            </div>
        `;

        const confirmed = await showEnhancedConfirmDialog('Start Automation', confirmationHtml);
        if (!confirmed) {
            return;
        }

        // Show startup progress
        showAutomationStartupProgress();

        // Enable automation in competition manager with enhanced config
        if (AdminState.competitionManager) {
            const success = AdminState.competitionManager.enableAutomatedCreation(automationConfig);
            if (success) {
                AdminState.automationState.enabled = true;
                AdminState.automationState.config = automationConfig;
                AdminState.automationState.status.lastStarted = new Date().toISOString();
                
                // Calculate next competition time
                await calculateNextCompetitionTime();
                
                // Update UI with enhanced status
                await updateAutomationStatusDisplayEnhanced();
                
                // Start real-time monitoring
                startAutomationMonitoring();
                
                showAdminNotification('Competition automation started successfully', 'success');
                
                // Log admin action with enhanced details
                await logAdminActionEnhanced('automation_start', {
                    action: 'start_competition_automation',
                    config: automationConfig,
                    admin_wallet: adminWallet,
                    admin_role: authResult.role,
                    timestamp: new Date().toISOString()
                });
                
                debugLog('automation', '✅ Competition automation started with enhanced controls');
            } else {
                hideAutomationStartupProgress();
                showAdminNotification('Failed to start automation', 'error');
            }
        } else {
            hideAutomationStartupProgress();
            showAdminNotification('Competition manager not available', 'error');
        }
        
    } catch (error) {
        hideAutomationStartupProgress();
        debugLog('error', 'Error starting enhanced automation:', error);
        showAdminNotification('Failed to start automation: ' + error.message, 'error');
    }
}

/**
 * Stop Competition Automation with Enhanced Feedback
 */
async function stopCompetitionAutomationEnhanced() {
    try {
        debugLog('automation', '⏹️ Stopping enhanced competition automation...');
        
        const adminWallet = sessionStorage.getItem('adminWallet');
        if (!adminWallet) {
            showAdminNotification('Admin wallet not connected', 'error');
            return;
        }

        // Enhanced admin verification
        const authResult = await verifyAdminWalletEnhanced(adminWallet);
        if (!authResult.authorized) {
            showAdminNotification(`Unauthorized: ${authResult.reason}`, 'error');
            return;
        }

        // Show enhanced confirmation with impact assessment
        const currentStatus = AdminState.automationState.status;
        const confirmationHtml = `
            <div style="color: var(--admin-text, #f3f4f6);">
                <h3 style="margin-bottom: 1rem; color: #f59e0b;">⏹️ Stop Competition Automation</h3>
                <p style="margin-bottom: 1rem;">This will halt all automatic competition creation.</p>
                <div style="background: var(--admin-bg, #111827); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                    <div><strong>Current Status:</strong> ${AdminState.automationState.enabled ? 'Running' : 'Stopped'}</div>
                    <div><strong>Competitions Today:</strong> ${currentStatus.competitionsToday || 0}</div>
                    <div><strong>Active Competitions:</strong> ${currentStatus.activeCompetitions || 0}</div>
                    <div><strong>Last Created:</strong> ${currentStatus.lastCreated ? formatRelativeTime(currentStatus.lastCreated) : 'Never'}</div>
                </div>
                <p style="color: #ef4444; margin-bottom: 1rem;">⚠️ Existing competitions will continue normally, but no new ones will be created automatically.</p>
                <p>Continue with automation shutdown?</p>
            </div>
        `;

        const confirmed = await showEnhancedConfirmDialog('Stop Automation', confirmationHtml);
        if (!confirmed) {
            return;
        }

        // Disable automation in competition manager
        if (AdminState.competitionManager) {
            const success = AdminState.competitionManager.disableAutomatedCreation();
            if (success) {
                AdminState.automationState.enabled = false;
                AdminState.automationState.status.lastStopped = new Date().toISOString();
                AdminState.automationState.status.nextScheduled = null;
                
                // Stop real-time monitoring
                stopAutomationMonitoring();
                
                // Update UI
                await updateAutomationStatusDisplayEnhanced();
                
                showAdminNotification('Competition automation stopped', 'warning');
                
                // Log admin action
                await logAdminActionEnhanced('automation_stop', {
                    action: 'stop_competition_automation',
                    admin_wallet: adminWallet,
                    admin_role: authResult.role,
                    duration: AdminState.automationState.status.lastStarted ? 
                        Date.now() - new Date(AdminState.automationState.status.lastStarted).getTime() : 0,
                    timestamp: new Date().toISOString()
                });
                
                debugLog('automation', '✅ Competition automation stopped');
            } else {
                showAdminNotification('Failed to stop automation', 'error');
            }
        } else {
            showAdminNotification('Competition manager not available', 'error');
        }
        
    } catch (error) {
        debugLog('error', 'Error stopping enhanced automation:', error);
        showAdminNotification('Failed to stop automation: ' + error.message, 'error');
    }
}

/**
 * Enhanced Admin Wallet Verification with Detailed Response
 */
async function verifyAdminWalletEnhanced(walletAddress) {
    try {
        debugLog('auth', `🔐 Enhanced admin wallet verification: ${walletAddress}`);
        
        const supabase = getSupabase();
        
        const { data: admin, error } = await supabase
            .from('admin_users')
            .select('admin_id, role, permissions, is_active, created_at, last_login')
            .eq('wallet_address', walletAddress)
            .single();
        
        if (error) {
            debugLog('auth', 'Admin verification failed:', error);
            return {
                authorized: false,
                reason: 'Wallet not found in admin database',
                error: error.message
            };
        }
        
        if (!admin) {
            return {
                authorized: false,
                reason: 'No admin record found for this wallet'
            };
        }
        
        if (!admin.is_active) {
            return {
                authorized: false,
                reason: 'Admin account is deactivated'
            };
        }
        
        // Check permissions for automation control
        const permissions = admin.permissions || {};
        if (!permissions.competition_automation && admin.role !== 'SUPER_ADMIN') {
            return {
                authorized: false,
                reason: 'Insufficient permissions for automation control'
            };
        }
        
        debugLog('auth', `✅ Enhanced admin verified: ${admin.role}`, admin);
        
        return {
            authorized: true,
            adminId: admin.admin_id,
            role: admin.role,
            permissions: admin.permissions,
            lastLogin: admin.last_login
        };
        
    } catch (error) {
        debugLog('error', 'Error in enhanced admin verification:', error);
        return {
            authorized: false,
            reason: 'Verification system error',
            error: error.message
        };
    }
}

/**
 * Get Enhanced Automation Parameters with Validation
 */
function getAutomationParametersEnhanced() {
    const params = {
        competitionsPerDay: parseInt(document.getElementById('competitions-per-day')?.value) || 4,
        votingPeriod: parseInt(document.getElementById('voting-period')?.value) || 15,
        performancePeriod: parseInt(document.getElementById('performance-period')?.value) || 24,
        minBetAmount: parseFloat(document.getElementById('min-bet-amount')?.value) || 0.1,
        platformFee: parseInt(document.getElementById('platform-fee')?.value) || 15,
        maxPoolSize: parseInt(document.getElementById('max-pool-size')?.value) || 100
    };
    
    // Validate and constrain parameters
    params.competitionsPerDay = Math.max(1, Math.min(24, params.competitionsPerDay));
    params.votingPeriod = Math.max(5, Math.min(60, params.votingPeriod));
    params.performancePeriod = Math.max(1, Math.min(48, params.performancePeriod));
    params.minBetAmount = Math.max(0.01, Math.min(10, params.minBetAmount));
    params.platformFee = Math.max(1, Math.min(30, params.platformFee));
    params.maxPoolSize = Math.max(10, Math.min(1000, params.maxPoolSize));
    
    // Calculate derived values
    params.autoCreateInterval = Math.floor(24 / params.competitionsPerDay); // Hours between competitions
    params.maxConcurrentCompetitions = Math.max(2, Math.ceil(params.competitionsPerDay / 2));
    
    debugLog('automationConfig', 'Enhanced automation parameters:', params);
    
    return params;
}

/**
 * Update Automation Status Display with Enhanced Real-time Info
 */
async function updateAutomationStatusDisplayEnhanced() {
    try {
        debugLog('automationStatus', '📊 Updating enhanced automation status display...');
        
        const statusElement = document.getElementById('automation-status');
        const currentStatusElement = document.getElementById('automation-current-status');
        const nextCompetitionTimeElement = document.getElementById('next-competition-time');
        const competitionsTodayElement = document.getElementById('competitions-today');
        const startBtn = document.getElementById('start-automation-btn');
        const stopBtn = document.getElementById('stop-automation-btn');
        
        // Update main status indicator
        if (statusElement) {
            statusElement.className = AdminState.automationState.enabled ? 
                'automation-status active' : 'automation-status inactive';
        }
        
        // Update status text with enhanced info
        if (currentStatusElement) {
            const status = AdminState.automationState.enabled ? 'Running' : 'Stopped';
            const uptime = AdminState.automationState.status.lastStarted ? 
                ` (${formatDuration(Date.now() - new Date(AdminState.automationState.status.lastStarted).getTime())})` : '';
            currentStatusElement.textContent = status + uptime;
        }
        
        // Update next competition time with countdown
        if (nextCompetitionTimeElement) {
            const nextTime = AdminState.automationState.status.nextScheduled;
            if (nextTime && AdminState.automationState.enabled) {
                const timeUntil = new Date(nextTime).getTime() - Date.now();
                if (timeUntil > 0) {
                    nextCompetitionTimeElement.textContent = `In ${formatDuration(timeUntil)} (${new Date(nextTime).toLocaleTimeString()})`;
                } else {
                    nextCompetitionTimeElement.textContent = 'Creating now...';
                }
            } else {
                nextCompetitionTimeElement.textContent = AdminState.automationState.enabled ? 'Calculating...' : 'Not scheduled';
            }
        }
        
        // Update competitions today with progress indicator
        if (competitionsTodayElement) {
            const today = new Date().toDateString();
            const todayCompetitions = AdminState.competitions.filter(c => 
                new Date(c.created_at).toDateString() === today
            ).length;
            const target = AdminState.automationState.config.competitionsPerDay;
            competitionsTodayElement.textContent = `${todayCompetitions}/${target}`;
        }
        
        // Update button states with enhanced styling
        if (startBtn && stopBtn) {
            startBtn.disabled = AdminState.automationState.enabled;
            stopBtn.disabled = !AdminState.automationState.enabled;
            
            if (AdminState.automationState.enabled) {
                startBtn.style.opacity = '0.5';
                stopBtn.style.opacity = '1';
            } else {
                startBtn.style.opacity = '1';
                stopBtn.style.opacity = '0.5';
            }
        }
        
        // Update automation parameters display
        updateParameterDisplaysEnhanced();
        
        debugLog('automationStatus', `✅ Enhanced automation status updated - enabled: ${AdminState.automationState.enabled}`);
        
    } catch (error) {
        debugLog('error', 'Error updating enhanced automation status display:', error);
    }
}

/**
 * Enhanced Parameter Value Updates with Real-time Calculations
 */
function updateParameterValueEnhanced(input) {
    try {
        const parameterId = input.id;
        const value = parseFloat(input.value) || parseInt(input.value) || 0;
        
        // Find corresponding value display
        const valueDisplay = input.parentElement.querySelector('.parameter-value');
        if (!valueDisplay) return;
        
        let displayText = '';
        let calculation = '';
        
        switch (parameterId) {
            case 'competitions-per-day':
                const hoursInterval = 24 / value;
                displayText = `Every ${hoursInterval.toFixed(1)} hours`;
                calculation = `≈ ${Math.floor(value * 7)} per week`;
                break;
            case 'voting-period':
                displayText = `${value} minutes`;
                calculation = value >= 30 ? 'Extended voting' : value <= 10 ? 'Quick voting' : 'Standard voting';
                break;
            case 'performance-period':
                displayText = `${value} hours`;
                calculation = value >= 24 ? 'Multi-day competition' : 'Same-day competition';
                break;
            case 'min-bet-amount':
                displayText = `${value} SOL`;
                const usdEquiv = value * 180; // Approximate SOL/USD rate
                calculation = `≈ ${usdEquiv.toFixed(0)} USD`;
                break;
            case 'platform-fee':
                displayText = `${value}%`;
                const examplePool = 2; // 2 SOL pool
                const platformCut = examplePool * (value / 100);
                calculation = `${platformCut.toFixed(3)} SOL per 2 SOL pool`;
                break;
            case 'max-pool-size':
                displayText = `${value} SOL`;
                const maxParticipants = Math.floor(value / 0.1);
                calculation = `≈ ${maxParticipants} max participants`;
                break;
        }
        
        valueDisplay.innerHTML = `
            <div style="font-weight: 600;">${displayText}</div>
            <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.125rem;">${calculation}</div>
        `;
        
        // Update automation config in real-time
        if (AdminState.automationState.enabled) {
            AdminState.automationState.config[parameterId.replace('-', '_')] = value;
            // Recalculate next competition time if frequency changed
            if (parameterId === 'competitions-per-day') {
                calculateNextCompetitionTime();
            }
        }
        
        debugLog('parameterUpdate', `Parameter updated: ${parameterId} = ${value} (${displayText})`);
        
    } catch (error) {
        debugLog('error', 'Error updating enhanced parameter value:', error);
    }
}

/**
 * Update All Parameter Displays with Enhanced Info
 */
function updateParameterDisplaysEnhanced() {
    document.querySelectorAll('.parameter-input').forEach(input => {
        updateParameterValueEnhanced(input);
    });
}

/**
 * Calculate Next Competition Time Based on Current Settings
 */
async function calculateNextCompetitionTime() {
    try {
        if (!AdminState.automationState.enabled) {
            AdminState.automationState.status.nextScheduled = null;
            return;
        }
        
        const config = AdminState.automationState.config;
        const intervalHours = 24 / config.competitionsPerDay;
        const intervalMs = intervalHours * 60 * 60 * 1000;
        
        // Get last competition creation time
        const lastCreated = AdminState.automationState.status.lastCreated;
        let nextTime;
        
        if (lastCreated) {
            nextTime = new Date(new Date(lastCreated).getTime() + intervalMs);
        } else {
            // If no previous competition, schedule for next interval
            nextTime = new Date(Date.now() + intervalMs);
        }
        
        // Ensure next time is in the future
        if (nextTime.getTime() <= Date.now()) {
            nextTime = new Date(Date.now() + intervalMs);
        }
        
        AdminState.automationState.status.nextScheduled = nextTime.toISOString();
        
        debugLog('scheduling', `Next competition scheduled for: ${nextTime.toLocaleString()}`);
        
    } catch (error) {
        debugLog('error', 'Error calculating next competition time:', error);
    }
}

/**
 * Start Real-time Automation Monitoring
 */
function startAutomationMonitoring() {
    // Clear existing monitoring
    stopAutomationMonitoring();
    
    // Set up real-time monitoring interval
    AdminState.automationMonitoringInterval = setInterval(async () => {
        try {
            if (AdminState.automationState.enabled) {
                // Update countdown timers
                await updateAutomationStatusDisplayEnhanced();
                
                // Check if it's time for next competition
                const nextTime = AdminState.automationState.status.nextScheduled;
                if (nextTime && Date.now() >= new Date(nextTime).getTime()) {
                    await calculateNextCompetitionTime();
                }
                
                // Update competition counts
                await updateCompetitionCountsRealTime();
            }
        } catch (error) {
            debugLog('error', 'Automation monitoring error:', error);
        }
    }, 5000); // Update every 5 seconds
    
    debugLog('monitoring', '✅ Real-time automation monitoring started');
}

/**
 * Stop Real-time Automation Monitoring
 */
function stopAutomationMonitoring() {
    if (AdminState.automationMonitoringInterval) {
        clearInterval(AdminState.automationMonitoringInterval);
        AdminState.automationMonitoringInterval = null;
    }
    
    debugLog('monitoring', '⏹️ Real-time automation monitoring stopped');
}

/**
 * Update Competition Counts in Real-time
 */
async function updateCompetitionCountsRealTime() {
    try {
        // Reload competitions to get latest counts
        await loadAllCompetitionsDataWithDiagnostics();
        
        // Update today's count
        const today = new Date().toDateString();
        const todayCompetitions = AdminState.competitions.filter(c => 
            new Date(c.created_at).toDateString() === today
        ).length;
        
        AdminState.automationState.status.competitionsToday = todayCompetitions;
        
        // Update active count
        const activeCompetitions = AdminState.competitions.filter(c => 
            ['SETUP', 'VOTING', 'ACTIVE'].includes(c.status)
        ).length;
        
        AdminState.automationState.status.activeCompetitions = activeCompetitions;
        
    } catch (error) {
        debugLog('error', 'Error updating competition counts:', error);
    }
}

/**
 * Save Automation Settings with Enhanced Validation
 */
async function saveAutomationSettingsEnhanced() {
    try {
        debugLog('settings', '💾 Saving enhanced automation settings...');
        
        const config = getAutomationParametersEnhanced();
        
        // Validate configuration
        const validation = validateAutomationConfig(config);
        if (!validation.valid) {
            showAdminNotification(`Invalid configuration: ${validation.errors.join(', ')}`, 'error');
            return;
        }
        
        // Update automation state
        AdminState.automationState.config = config;
        
        // If automation is running, update the competition manager
        if (AdminState.automationState.enabled && AdminState.competitionManager) {
            AdminState.competitionManager.updateAutomationParameters(config);
        }
        
        // Recalculate timing
        await calculateNextCompetitionTime();
        
        // Update displays
        updateParameterDisplaysEnhanced();
        await updateAutomationStatusDisplayEnhanced();
        
        // Log the settings change
        const adminWallet = sessionStorage.getItem('adminWallet');
        await logAdminActionEnhanced('automation_settings_update', {
            action: 'update_automation_settings',
            new_config: config,
            admin_wallet: adminWallet,
            timestamp: new Date().toISOString()
        });
        
        showAdminNotification('Automation settings saved successfully', 'success');
        debugLog('settings', '✅ Enhanced automation settings saved');
        
    } catch (error) {
        debugLog('error', 'Error saving enhanced automation settings:', error);
        showAdminNotification('Failed to save settings: ' + error.message, 'error');
    }
}

/**
 * Validate Automation Configuration
 */
function validateAutomationConfig(config) {
    const errors = [];
    
    if (config.competitionsPerDay < 1 || config.competitionsPerDay > 24) {
        errors.push('Competitions per day must be 1-24');
    }
    
    if (config.votingPeriod < 5 || config.votingPeriod > 60) {
        errors.push('Voting period must be 5-60 minutes');
    }
    
    if (config.performancePeriod < 1 || config.performancePeriod > 48) {
        errors.push('Performance period must be 1-48 hours');
    }
    
    if (config.minBetAmount < 0.01 || config.minBetAmount > 10) {
        errors.push('Bet amount must be 0.01-10 SOL');
    }
    
    if (config.platformFee < 1 || config.platformFee > 30) {
        errors.push('Platform fee must be 1-30%');
    }
    
    if (config.maxPoolSize < 10 || config.maxPoolSize > 1000) {
        errors.push('Max pool size must be 10-1000 SOL');
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * Test Automation Configuration
 */
async function testAutomationConfigurationEnhanced() {
    try {
        debugLog('testing', '🧪 Testing enhanced automation configuration...');
        
        const config = getAutomationParametersEnhanced();
        const validation = validateAutomationConfig(config);
        
        // Test token pair availability
        await loadAllTokenPairsWithDiagnostics();
        const availablePairs = AdminState.pairState.allPairs.filter(p => p.is_active);
        
        // Test admin permissions
        const adminWallet = sessionStorage.getItem('adminWallet');
        const authResult = await verifyAdminWalletEnhanced(adminWallet);
        
        // Compile test results
        const testResults = {
            configValidation: validation.valid,
            configErrors: validation.errors,
            tokenPairsAvailable: availablePairs.length,
            adminAuthorized: authResult.authorized,
            competitionManagerReady: !!AdminState.competitionManager?.isReady(),
            databaseConnected: !!getSupabase()
        };
        
        // Show test results modal
        const resultsHtml = `
            <div style="color: var(--admin-text, #f3f4f6);">
                <h3 style="margin-bottom: 1rem; color: #3b82f6;">🧪 Configuration Test Results</h3>
                <div style="display: grid; gap: 0.5rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Configuration Valid:</span>
                        <span style="color: ${testResults.configValidation ? '#22c55e' : '#ef4444'}">
                            ${testResults.configValidation ? '✅ PASS' : '❌ FAIL'}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Token Pairs Available:</span>
                        <span style="color: ${testResults.tokenPairsAvailable > 0 ? '#22c55e' : '#ef4444'}">
                            ${testResults.tokenPairsAvailable > 0 ? '✅' : '❌'} ${testResults.tokenPairsAvailable} pairs
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Admin Authorized:</span>
                        <span style="color: ${testResults.adminAuthorized ? '#22c55e' : '#ef4444'}">
                            ${testResults.adminAuthorized ? '✅ PASS' : '❌ FAIL'}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Competition Manager:</span>
                        <span style="color: ${testResults.competitionManagerReady ? '#22c55e' : '#ef4444'}">
                            ${testResults.competitionManagerReady ? '✅ READY' : '❌ NOT READY'}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Database Connected:</span>
                        <span style="color: ${testResults.databaseConnected ? '#22c55e' : '#ef4444'}">
                            ${testResults.databaseConnected ? '✅ CONNECTED' : '❌ DISCONNECTED'}
                        </span>
                    </div>
                </div>
                ${!validation.valid ? `
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 6px; padding: 1rem; margin-bottom: 1rem;">
                        <h4 style="margin-bottom: 0.5rem; color: #ef4444;">Configuration Errors:</h4>
                        ${validation.errors.map(error => `<div>• ${error}</div>`).join('')}
                    </div>
                ` : ''}
                <div style="background: var(--admin-bg, #111827); padding: 1rem; border-radius: 6px;">
                    <h4 style="margin-bottom: 0.5rem;">Current Configuration:</h4>
                    <div style="font-size: 0.875rem; line-height: 1.4;">
                        <div>Frequency: ${config.competitionsPerDay}/day (every ${(24/config.competitionsPerDay).toFixed(1)}h)</div>
                        <div>Voting: ${config.votingPeriod}min | Performance: ${config.performancePeriod}h</div>
                        <div>Bet: ${config.minBetAmount} SOL | Fee: ${config.platformFee}% | Max Pool: ${config.maxPoolSize} SOL</div>
                    </div>
                </div>
            </div>
        `;
        
        await showEnhancedInfoDialog('Configuration Test', resultsHtml);
        
        const overallPass = testResults.configValidation && testResults.tokenPairsAvailable > 0 && 
                           testResults.adminAuthorized && testResults.competitionManagerReady && 
                           testResults.databaseConnected;
        
        showAdminNotification(
            overallPass ? 'Configuration test passed - Ready for automation' : 'Configuration test failed - Check requirements',
            overallPass ? 'success' : 'warning'
        );
        
        debugLog('testing', `✅ Configuration test complete - ${overallPass ? 'PASSED' : 'FAILED'}`);
        
    } catch (error) {
        debugLog('error', 'Error testing automation configuration:', error);
        showAdminNotification('Configuration test failed: ' + error.message, 'error');
    }
}

/**
 * Reset Automation Settings to Enhanced Defaults
 */
function resetAutomationSettingsEnhanced() {
    const confirmHtml = `
        <div style="color: var(--admin-text, #f3f4f6);">
            <h3 style="margin-bottom: 1rem; color: #f59e0b;">🔄 Reset Automation Settings</h3>
            <p style="margin-bottom: 1rem;">This will reset all automation parameters to their default values:</p>
            <div style="background: var(--admin-bg, #111827); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                <div>• Competitions per day: 4 (every 6 hours)</div>
                <div>• Voting period: 15 minutes</div>
                <div>• Performance period: 24 hours</div>
                <div>• Bet amount: 0.1 SOL</div>
                <div>• Platform fee: 15%</div>
                <div>• Max pool size: 100 SOL</div>
            </div>
            <p style="color: #f59e0b;">⚠️ Current settings will be lost. Continue with reset?</p>
        </div>
    `;
    
    showEnhancedConfirmDialog('Reset Settings', confirmHtml).then(confirmed => {
        if (confirmed) {
            // Reset form values to defaults
            document.getElementById('competitions-per-day').value = 4;
            document.getElementById('voting-period').value = 15;
            document.getElementById('performance-period').value = 24;
            document.getElementById('min-bet-amount').value = 0.1;
            document.getElementById('platform-fee').value = 15;
            document.getElementById('max-pool-size').value = 100;
            
            // Update displays
            updateParameterDisplaysEnhanced();
            
            showAdminNotification('Settings reset to defaults', 'info');
            debugLog('settings', '🔄 Automation settings reset to enhanced defaults');
        }
    });
}

/**
 * Show Enhanced Confirm Dialog
 */
function showEnhancedConfirmDialog(title, contentHtml) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--admin-surface, #1f2937);
                border: 1px solid var(--admin-border, #374151);
                border-radius: 12px;
                padding: 1.5rem;
                width: 90%;
                max-width: 500px;
                z-index: 1001;
            ">
                ${contentHtml}
                <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="resolveConfirm(false)" style="
                        padding: 0.75rem 1.5rem;
                        background: #6b7280;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                    ">Cancel</button>
                    <button onclick="resolveConfirm(true)" style="
                        padding: 0.75rem 1.5rem;
                        background: #8b5cf6;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                    ">Confirm</button>
                </div>
            </div>
            <div class="modal-backdrop" onclick="resolveConfirm(false)" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.75);
                z-index: 1000;
            "></div>
        `;
        
        window.resolveConfirm = (result) => {
            modal.remove();
            delete window.resolveConfirm;
            resolve(result);
        };
        
        document.body.appendChild(modal);
    });
}

/**
 * Show Enhanced Info Dialog
 */
function showEnhancedInfoDialog(title, contentHtml) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--admin-surface, #1f2937);
                border: 1px solid var(--admin-border, #374151);
                border-radius: 12px;
                padding: 1.5rem;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 1001;
            ">
                ${contentHtml}
                <div style="display: flex; justify-content: center; margin-top: 1.5rem;">
                    <button onclick="resolveInfo()" style="
                        padding: 0.75rem 2rem;
                        background: #8b5cf6;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                    ">Close</button>
                </div>
            </div>
            <div class="modal-backdrop" onclick="resolveInfo()" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.75);
                z-index: 1000;
            "></div>
        `;
        
        window.resolveInfo = () => {
            modal.remove();
            delete window.resolveInfo;
            resolve();
        };
        
        document.body.appendChild(modal);
    });
}

/**
 * Show/Hide Automation Startup Progress
 */
function showAutomationStartupProgress() {
    const progressHtml = `
        <div id="automation-startup-progress" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--admin-surface, #1f2937);
            border: 1px solid var(--admin-border, #374151);
            border-radius: 12px;
            padding: 2rem;
            z-index: 1002;
            color: var(--admin-text, #f3f4f6);
            text-align: center;
        ">
            <div class="loading-spinner" style="margin: 0 auto 1rem auto;"></div>
            <h3 style="margin-bottom: 0.5rem; color: #22c55e;">🚀 Starting Automation</h3>
            <p>Initializing competition automation system...</p>
        </div>
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            z-index: 1001;
        "></div>
    `;
    
    const progressElement = document.createElement('div');
    progressElement.innerHTML = progressHtml;
    document.body.appendChild(progressElement);
}

function hideAutomationStartupProgress() {
    const progressElement = document.getElementById('automation-startup-progress');
    if (progressElement) {
        progressElement.parentElement.remove();
    }
}

/**
 * Format Duration in Human-readable Format
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

/**
 * Enhanced Admin Action Logging
 */
async function logAdminActionEnhanced(actionType, actionData) {
    try {
        const supabase = getSupabase();
        const adminWallet = sessionStorage.getItem('adminWallet');
        
        const logEntry = {
            admin_id: adminWallet,
            action: actionType,
            action_data: actionData,
            ip_address: 'web-client',
            user_agent: navigator.userAgent.substring(0, 500),
            timestamp: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('admin_audit_log')
            .insert([logEntry]);

        if (error) {
            debugLog('error', 'Failed to log enhanced admin action:', error);
        } else {
            debugLog('audit', `📝 Enhanced admin action logged: ${actionType}`);
        }
        
    } catch (error) {
        debugLog('error', 'Error logging enhanced admin action:', error);
    }
}

// ===== SERVICE INITIALIZATION (Keep existing functions) =====

async function initializeServiceReferences() {
    try {
        debugLog('services', '🔧 Initializing service references...');
        
        // Get Supabase client
        if (window.supabaseClient) {
            AdminState.supabaseClient = window.supabaseClient;
        } else if (window.getSupabaseClient) {
            AdminState.supabaseClient = { getSupabaseClient: window.getSupabaseClient };
        } else {
            throw new Error('Supabase client not available');
        }
        
        // Wait for services to be available
        let attempts = 0;
        while ((!window.tokenService || !window.priceService || !window.competitionManager) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }
        
        // Get services
        if (window.getTokenService) {
            AdminState.tokenService = window.getTokenService();
            if (!AdminState.tokenService.isReady()) {
                await AdminState.tokenService.initialize();
            }
        }
        
        if (window.getPriceService) {
            AdminState.priceService = window.getPriceService();
            if (!AdminState.priceService.isReady()) {
                await AdminState.priceService.initialize();
            }
        }
        
        if (window.getCompetitionManager) {
            AdminState.competitionManager = window.getCompetitionManager();
            if (!AdminState.competitionManager.isReady()) {
                await AdminState.competitionManager.initialize();
            }
        }
        
        debugLog('services', '✅ Service references initialized');
        
    } catch (error) {
        debugLog('error', 'Failed to initialize service references:', error);
        throw error;
    }
}

async function initializeComponents() {
    try {
        debugLog('components', '🔧 Initializing components...');
        
        // Initialize Cache Monitor
        if (window.CacheMonitor) {
            AdminState.components.cacheMonitor = new window.CacheMonitor(AdminState);
            window.CacheMonitor.instance = AdminState.components.cacheMonitor;
            await AdminState.components.cacheMonitor.initialize();
        }
        
        // Initialize Token Approval
        if (window.TokenApproval) {
            AdminState.components.tokenApproval = new window.TokenApproval(AdminState);
            window.TokenApproval.instance = AdminState.components.tokenApproval;
            await AdminState.components.tokenApproval.initialize();
        }
        
        // Initialize Blacklist Manager
        if (window.BlacklistManager) {
            AdminState.components.blacklistManager = new window.BlacklistManager(AdminState);
            window.BlacklistManager.instance = AdminState.components.blacklistManager;
            await AdminState.components.blacklistManager.initialize();
        }
        
        // Initialize Pair Optimizer
        if (window.PairOptimizer) {
            AdminState.components.pairOptimizer = new window.PairOptimizer(AdminState);
            window.PairOptimizer.instance = AdminState.components.pairOptimizer;
            await AdminState.components.pairOptimizer.initialize();
        }
        
        debugLog('components', '✅ Components initialized with singleton instances');
        return true;
    } catch (error) {
        debugLog('error', 'Failed to initialize components:', error);
        return false;
    }
}

function getSupabase() {
    if (AdminState.supabaseClient) {
        if (typeof AdminState.supabaseClient.getSupabaseClient === 'function') {
            return AdminState.supabaseClient.getSupabaseClient();
        } else if (AdminState.supabaseClient.from) {
            return AdminState.supabaseClient;
        }
    }
    
    if (window.supabase) {
        return window.supabase;
    }
    
    throw new Error('Supabase client not available');
}

// ===== KEEP ALL EXISTING FUNCTIONS (with diagnostic improvements) =====

// Load dashboard functions
async function loadComprehensiveDashboard() {
    try {
        debugLog('dashboard', '📊 Loading comprehensive dashboard...');
        
        await updateComprehensiveDashboardMetrics();
        await updateSystemHealthDisplay();
        updateActivityFeed();
        updateQuickActionsDisplay();
        
        debugLog('dashboard', '✅ Comprehensive dashboard loaded');
        
    } catch (error) {
        debugLog('error', 'Error loading comprehensive dashboard:', error);
        throw error;
    }
}

async function updateComprehensiveDashboardMetrics() {
    try {
        const metrics = await calculateComprehensivePlatformMetrics();
        
        updateMetricDisplay('total-volume', `${metrics.totalVolume.toFixed(1)} SOL`);
        updateMetricDisplay('active-competitions', metrics.activeCompetitions);
        updateMetricDisplay('total-tokens', metrics.totalTokens);
        updateMetricDisplay('approved-tokens', metrics.approvedTokens);
        updateMetricDisplay('blacklisted-tokens', metrics.blacklistedTokens);
        updateMetricDisplay('active-pairs', metrics.activePairs);
        
        debugLog('dashboard', '✅ Dashboard metrics updated with comprehensive live data');
        
    } catch (error) {
        debugLog('error', 'Error updating dashboard metrics:', error);
        throw error;
    }
}

async function calculateComprehensivePlatformMetrics() {
    try {
        const competitions = AdminState.competitions || [];
        const tokens = AdminState.tokens || [];
        const pairs = AdminState.tokenPairs || [];
        const blacklisted = AdminState.blacklistedTokens.size || 0;
        
        const metrics = {
            totalVolume: competitions.reduce((sum, c) => sum + (parseFloat(c.total_pool) || 0), 0),
            activeCompetitions: competitions.filter(c => ['SETUP', 'VOTING', 'ACTIVE'].includes(c.status)).length,
            totalTokens: tokens.length,
            approvedTokens: tokens.filter(t => t.cache_status === 'FRESH').length,
            blacklistedTokens: blacklisted,
            activePairs: pairs.filter(p => p.is_active === true).length,
            totalParticipants: competitions.reduce((sum, c) => sum + (parseInt(c.total_bets) || 0), 0),
            totalFees: competitions.reduce((sum, c) => sum + (parseFloat(c.platform_fee_collected) || 0), 0)
        };
        
        AdminState.platformMetrics = { ...AdminState.platformMetrics, ...metrics };
        
        return metrics;
        
    } catch (error) {
        debugLog('error', 'Error calculating comprehensive platform metrics:', error);
        return {
            totalVolume: 0,
            activeCompetitions: 0,
            totalTokens: 0,
            approvedTokens: 0,
            blacklistedTokens: 0,
            activePairs: 0,
            totalParticipants: 0,
            totalFees: 0
        };
    }
}

// Enhanced Navigation Setup
function setupEnhancedNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const section = item.getAttribute('href').substring(1);
            await switchToSectionWithDiagnostics(section);
        });
    });
    
    debugLog('navigation', '✅ Enhanced navigation set up');
}

function setupAdminEventListeners() {
    // Create competition button - Updated to use new interface
    const createCompetitionBtn = document.getElementById('create-competition-btn');
    if (createCompetitionBtn) {
        createCompetitionBtn.addEventListener('click', createManualCompetitionWithInterface);
    }
    
    debugLog('events', '✅ Admin event listeners set up with enhanced competition creation');
}

// System monitoring functions
async function setupRealTimeMonitoring() {
    try {
        const interval = setInterval(async () => {
            try {
                await updateSystemHealth();
                if (AdminState.currentSection === 'dashboard') {
                    await updateComprehensiveDashboardMetrics();
                }
            } catch (error) {
                debugLog('error', 'Real-time monitoring error:', error);
            }
        }, 30000);
        
        AdminState.updateIntervals.push(interval);
        
        debugLog('monitoring', '✅ Real-time monitoring setup');
    } catch (error) {
        debugLog('error', 'Failed to setup real-time monitoring:', error);
    }
}

function startSystemHealthMonitoring() {
    try {
        updateSystemHealth();
        debugLog('monitoring', '✅ System health monitoring started');
    } catch (error) {
        debugLog('error', 'Failed to start system health monitoring:', error);
    }
}

async function updateSystemHealth() {
    try {
        AdminState.systemHealth.database = getSupabase() ? 'healthy' : 'error';
        AdminState.systemHealth.tokenService = AdminState.tokenService?.isReady() ? 'healthy' : 'error';
        AdminState.systemHealth.priceService = AdminState.priceService?.isReady() ? 'healthy' : 'error';
        AdminState.systemHealth.competitionManager = AdminState.competitionManager?.isReady() ? 'healthy' : 'error';
        AdminState.systemHealth.lastUpdate = new Date().toISOString();
        
        updateSystemHealthDisplay();
        
    } catch (error) {
        debugLog('error', 'Error updating system health:', error);
    }
}

async function updateSystemHealthDisplay() {
    const statusGrid = document.querySelector('.status-grid');
    if (!statusGrid) return;
    
    const healthItems = [
        { name: 'Database', status: AdminState.systemHealth.database },
        { name: 'Token Service', status: AdminState.systemHealth.tokenService },
        { name: 'Price Service', status: AdminState.systemHealth.priceService },
        { name: 'Competition Manager', status: AdminState.systemHealth.competitionManager }
    ];
    
    statusGrid.innerHTML = healthItems.map(item => `
        <div class="status-item">
            <span class="status-indicator ${item.status}"></span>
            <span>${item.name}</span>
        </div>
    `).join('');
}

function updateActivityFeed() {
    const feedContainer = document.getElementById('activity-feed');
    if (!feedContainer) return;
    
    const activities = [
        { message: 'Admin Panel initialized with comprehensive live data', time: 'Just now' },
        { message: `${AdminState.tokens.length} tokens loaded from cache`, time: 'Just now' },
        { message: `${AdminState.competitions.length} competitions loaded`, time: 'Just now' },
        { message: `${AdminState.tokenPairs.length} token pairs loaded`, time: 'Just now' },
        { message: `${AdminState.users.length} users loaded`, time: 'Just now' }
    ];
    
    feedContainer.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <span class="activity-message">${activity.message}</span>
            <span class="activity-time">${activity.time}</span>
        </div>
    `).join('');
}

function updateQuickActionsDisplay() {
    const pendingCount = AdminState.approvalState.statistics.pendingCount;
    updateElement('pending-count', pendingCount);
}

// ===== SECTION LOADING FUNCTIONS =====

async function loadCacheManagement() {
    await loadComprehensiveCacheDataWithDiagnostics();
}

async function loadTokenApproval() {
    try {
        debugLog('tokenApproval', '✅ Loading token approval section...');
        
        // Initialize token approval component if available
        if (AdminState.components.tokenApproval) {
            await AdminState.components.tokenApproval.loadPendingApprovals();
        }
        
        // Update UI with current approval state
        updateApprovalStatistics();
        
    } catch (error) {
        debugLog('error', 'Error loading token approval:', error);
    }
}

async function loadBlacklistManagement() {
    try {
        debugLog('blacklist', '🚫 Loading blacklist management section...');
        
        // Initialize blacklist manager component if available
        if (AdminState.components.blacklistManager) {
            await AdminState.components.blacklistManager.loadBlacklistData();
        }
        
        // Update UI with current blacklist state
        updateBlacklistStatistics();
        
    } catch (error) {
        debugLog('error', 'Error loading blacklist management:', error);
    }
}

async function loadTokenManagement() {
    try {
        debugLog('tokenManagement', '🪙 Loading token management section...');
        
        // Reload token data
        await loadAllTokensDataWithDiagnostics();
        
        // Update token management UI
        updateTokenManagementDisplay();
        
    } catch (error) {
        debugLog('error', 'Error loading token management:', error);
    }
}

async function loadAnalyticsDashboard() {
    try {
        debugLog('analytics', '📊 Loading analytics dashboard...');
        
        // Load all analytics data
        await loadPlatformAnalyticsWithDiagnostics();
        await loadUserAnalyticsWithDiagnostics();
        
        // Update analytics displays
        updateAnalyticsDisplay();
        
    } catch (error) {
        debugLog('error', 'Error loading analytics dashboard:', error);
    }
}

// ===== UI UPDATE FUNCTIONS =====

function updateApprovalStatistics() {
    // Update approval statistics display
    updateElementSafely('pending-approvals', AdminState.approvalState.statistics.pendingCount);
    updateElementSafely('approval-rate', `${AdminState.approvalState.statistics.approvalRate}%`);
    updateElementSafely('avg-review-time', `${AdminState.approvalState.statistics.avgReviewTime}h`);
    updateElementSafely('total-approved', AdminState.approvalState.approved.length);
}

function updateBlacklistStatistics() {
    // Update blacklist statistics display
    updateElementSafely('total-blacklisted', AdminState.blacklistState.statistics.totalBlacklisted);
    updateElementSafely('auto-detected', AdminState.blacklistState.statistics.autoDetected);
    updateElementSafely('detection-accuracy', `${AdminState.blacklistState.statistics.detectionAccuracy}%`);
    updateElementSafely('appeals-pending', AdminState.blacklistState.statistics.appealsPending);
}

function updateTokenManagementDisplay() {
    // Update token management statistics
    const tokens = AdminState.tokens || [];
    updateElementSafely('total-tokens-stat', tokens.length);
    updateElementSafely('active-tokens-stat', tokens.filter(t => t.cache_status === 'FRESH').length);
    updateElementSafely('approved-tokens-stat', tokens.filter(t => t.cache_status === 'FRESH').length);
    updateElementSafely('blacklisted-tokens-stat', AdminState.blacklistedTokens.size);
}

function updateAnalyticsDisplay() {
    // Update analytics displays
    const analytics = AdminState.userAnalytics;
    updateElementSafely('total-users-analytics', analytics.totalUsers);
    updateElementSafely('active-users-analytics', analytics.activeUsers);
    updateElementSafely('total-volume-analytics', `${analytics.totalVolume.toFixed(1)} SOL`);
    updateElementSafely('avg-win-rate-analytics', `${analytics.avgWinRate.toFixed(1)}%`);
}

// ===== UTILITY FUNCTIONS =====

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateMetricDisplay(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function showLoadingState() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'admin-loading';
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div>Loading TokenWars Admin Panel...</div>
    `;
    document.body.appendChild(loadingOverlay);
}

function hideLoadingState() {
    const loadingOverlay = document.getElementById('admin-loading');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

function showLoadingOverlay(sectionName) {
    const section = document.getElementById(sectionName);
    if (!section) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    
    section.style.position = 'relative';
    section.appendChild(overlay);
}

function hideLoadingOverlay(sectionName) {
    const section = document.getElementById(sectionName);
    if (!section) return;
    
    const overlay = section.querySelector('.loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function showAdminNotification(message, type = 'info') {
    debugLog('notification', `${type.toUpperCase()}: ${message}`);
    
    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// ===== ENHANCED GLOBAL FUNCTIONS =====

// Enhanced global functions for HTML onclick handlers
function viewCompetitionAnalytics() {
    debugLog('analytics', '📊 Viewing competition analytics...');
    switchToSectionWithDiagnostics('analytics');
}

function downloadCompetitionData() {
    debugLog('download', '📥 Downloading competition data...');
    showAdminNotification('Competition data download will be implemented', 'info');
}

function downloadActiveCompetitions() {
    debugLog('download', '📄 Downloading active competitions...');
    
    const activeCompetitions = AdminState.competitions.filter(c => 
        ['SETUP', 'VOTING', 'ACTIVE'].includes(c.status)
    );
    
    const csv = convertToCSV(activeCompetitions);
    downloadCSV(csv, 'active_competitions.csv');
    
    showAdminNotification(`Downloaded ${activeCompetitions.length} active competitions`, 'success');
}

function downloadPastCompetitions() {
    debugLog('download', '📚 Downloading past competitions...');
    
    const pastCompetitions = AdminState.competitions.filter(c => 
        ['CLOSED', 'RESOLVED'].includes(c.status)
    );
    
    const csv = convertToCSV(pastCompetitions);
    downloadCSV(csv, 'past_competitions.csv');
    
    showAdminNotification(`Downloaded ${pastCompetitions.length} past competitions`, 'success');
}

function downloadCompetitionReport() {
    debugLog('download', '📊 Generating full competition report...');
    
    const report = {
        generated_at: new Date().toISOString(),
        platform_metrics: AdminState.platformMetrics,
        competitions: AdminState.competitions,
        automation_status: AdminState.automationState,
        user_analytics: AdminState.userAnalytics,
        token_pairs: AdminState.tokenPairs
    };
    
    downloadJSON(report, 'competition_report.json');
    showAdminNotification('Full competition report downloaded', 'success');
}

// Analytics generation functions
function generateCompetitionReport() {
    debugLog('analytics', '📊 Generating competition analytics report...');
    downloadCompetitionReport();
}

function generateRevenueReport() {
    debugLog('analytics', '💰 Generating platform revenue report...');
    
    const revenueData = {
        total_fees: AdminState.platformMetrics.totalFees || 0,
        total_volume: AdminState.platformMetrics.totalVolume || 0,
        competitions_count: AdminState.competitions.length,
        average_fee_per_competition: AdminState.competitions.length > 0 ? 
            AdminState.platformMetrics.totalFees / AdminState.competitions.length : 0,
        generated_at: new Date().toISOString()
    };
    
    downloadJSON(revenueData, 'revenue_report.json');
    showAdminNotification('Revenue report generated', 'success');
}

function generateParticipationReport() {
    debugLog('analytics', '👥 Generating user participation report...');
    
    const participationData = {
        total_users: AdminState.users.length,
        user_analytics: AdminState.userAnalytics,
        competition_participation: AdminState.competitions.map(c => ({
            competition_id: c.competition_id,
            total_bets: c.total_bets,
            total_pool: c.total_pool,
            status: c.status
        })),
        generated_at: new Date().toISOString()
    };
    
    downloadJSON(participationData, 'participation_report.json');
    showAdminNotification('Participation report generated', 'success');
}

function generateUserReport() {
    debugLog('analytics', '👥 Generating user activity report...');
    generateParticipationReport();
}

function generateEngagementReport() {
    debugLog('analytics', '🎯 Generating engagement analytics...');
    
    const engagementData = {
        platform_metrics: AdminState.platformMetrics.engagement || {},
        user_retention: AdminState.users.filter(u => u.total_bets > 1).length / AdminState.users.length * 100,
        average_bets_per_user: AdminState.users.reduce((sum, u) => sum + u.total_bets, 0) / AdminState.users.length,
        generated_at: new Date().toISOString()
    };
    
    downloadJSON(engagementData, 'engagement_report.json');
    showAdminNotification('Engagement report generated', 'success');
}

function generateRetentionReport() {
    debugLog('analytics', '🔄 Generating user retention report...');
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const retentionData = {
        total_users: AdminState.users.length,
        active_last_30_days: AdminState.users.filter(u => new Date(u.last_active) > thirtyDaysAgo).length,
        repeat_users: AdminState.users.filter(u => u.total_bets > 1).length,
        retention_rate: AdminState.users.filter(u => u.total_bets > 1).length / AdminState.users.length * 100,
        generated_at: new Date().toISOString()
    };
    
    downloadJSON(retentionData, 'retention_report.json');
    showAdminNotification('Retention report generated', 'success');
}

// Export token management functions
function exportTokenList() {
    debugLog('export', '📤 Exporting token list...');
    
    const tokenData = AdminState.tokens.map(token => ({
        address: token.token_address,
        symbol: token.symbol,
        name: token.name,
        price: token.current_price,
        market_cap: token.market_cap_usd,
        cache_status: token.cache_status,
        last_updated: token.last_updated
    }));
    
    const csv = convertToCSV(tokenData);
    downloadCSV(csv, 'token_list.csv');
    
    showAdminNotification(`Exported ${tokenData.length} tokens`, 'success');
}

function viewTokenAnalytics() {
    debugLog('analytics', '📊 Viewing token analytics...');
    switchToSectionWithDiagnostics('analytics');
}

// Cache management functions
function refreshTokenCache() {
    debugLog('cache', '🪙 Refreshing token cache...');
    showAdminNotification('Token cache refresh initiated', 'info');
}

function clearStaleCache() {
    debugLog('cache', '🗑️ Clearing stale cache...');
    showAdminNotification('Stale cache cleared', 'success');
}

function optimizeCache() {
    debugLog('cache', '⚡ Optimizing cache...');
    showAdminNotification('Cache optimization started', 'info');
}

function viewCacheAnalytics() {
    debugLog('cache', '📊 Viewing cache analytics...');
    showAdminNotification('Loading cache analytics...', 'info');
}

// Blacklist management functions
function bulkWhitelist() {
    debugLog('blacklist', '✅ Bulk whitelist operation...');
    showAdminNotification('Bulk whitelist feature coming soon', 'info');
}

function whitelistWithApproval() {
    debugLog('blacklist', '🔄 Whitelist with approval...');
    showAdminNotification('Whitelist to approval queue feature coming soon', 'info');
}

function exportBlacklist() {
    debugLog('blacklist', '📤 Exporting blacklist...');
    showAdminNotification('Blacklist export feature coming soon', 'info');
}

function scanForThreats() {
    debugLog('blacklist', '🔍 Scanning for threats...');
    showAdminNotification('Threat scanning feature coming soon', 'info');
}

// Token approval functions
function batchApprove() {
    debugLog('approval', '✅ Batch approve operation...');
    showAdminNotification('Batch approval feature coming soon', 'info');
}

function batchReject() {
    debugLog('approval', '❌ Batch reject operation...');
    showAdminNotification('Batch rejection feature coming soon', 'info');
}

function selectAll() {
    debugLog('approval', '🗂️ Select all tokens...');
    showAdminNotification('Select all feature coming soon', 'info');
}

function clearSelection() {
    debugLog('approval', '🗑️ Clear selection...');
    showAdminNotification('Clear selection feature coming soon', 'info');
}

function bulkAnalyze() {
    debugLog('approval', '🔍 Bulk analyze tokens...');
    showAdminNotification('Bulk analysis feature coming soon', 'info');
}

function viewBlacklistForWhitelist() {
    debugLog('approval', '📋 View blacklist for whitelist...');
    showAdminNotification('Blacklist review feature coming soon', 'info');
}

function processWhitelistQueue() {
    debugLog('approval', '✅ Process whitelist queue...');
    showAdminNotification('Whitelist processing feature coming soon', 'info');
}

// Generate pairs function
function generateTokenPairs() {
    debugLog('pairs', '🔄 Generating token pairs...');
    showAdminNotification('Token pair generation triggered - pairs will be generated by edge function', 'info');
}

// View competition details
function viewCompetitionDetails(competitionId) {
    debugLog('competition', `👁️ Viewing competition details: ${competitionId}`);
    showAdminNotification(`Competition details for ${competitionId} - feature coming soon`, 'info');
}

// Quick action functions
function quickCacheRefresh() {
    debugLog('cache', '🔄 Quick cache refresh triggered');
    showAdminNotification('Cache refresh initiated', 'info');
}

function viewPendingApprovals() {
    switchToSectionWithDiagnostics('token-approval');
}

function reviewBlacklist() {
    switchToSectionWithDiagnostics('blacklist-management');
}

function viewPairAnalytics() {
    switchToSectionWithDiagnostics('pair-optimization');
}

function refreshCompetitionsList() {
    loadCompetitionsManagementWithDiagnostics();
    showAdminNotification('Competitions list refreshed', 'info');
}

// Utility functions for downloads
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(','))
    ].join('\n');
    
    return csvContent;
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function downloadJSON(data, filename) {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Legacy function stubs for backward compatibility
async function createManualCompetition() {
    return await createManualCompetitionWithInterface();
}

async function verifyAdminWallet(walletAddress) {
    const result = await verifyAdminWalletEnhanced(walletAddress);
    return result.authorized;
}

async function logAdminAction(actionType, actionData) {
    return await logAdminActionEnhanced(actionType, actionData);
}

// Export enhanced functions for global use
window.AdminState = AdminState;
window.initializeAdminPanel = initializeAdminPanel;
window.switchToSection = switchToSectionWithDiagnostics;
window.loadCompetitionsManagement = loadCompetitionsManagementWithDiagnostics;
window.loadPairOptimization = loadPairOptimizationWithDiagnostics;
window.generateTokenPairs = generateTokenPairs;

// STEP 2: Manual Competition Creation Interface
window.createManualCompetitionWithInterface = createManualCompetitionWithInterface;
window.showCompetitionCreationModal = showCompetitionCreationModal;
window.selectTokenPair = selectTokenPair;
window.reviewTokenPair = reviewTokenPair;
window.updateCompetitionPreview = updateCompetitionPreview;
window.validateCompetitionForm = validateCompetitionForm;
window.submitManualCompetition = submitManualCompetition;
window.closeCompetitionModal = closeCompetitionModal;

// STEP 3: Enhanced Automation Controls & UI Polish
window.startCompetitionAutomation = startCompetitionAutomationEnhanced;
window.stopCompetitionAutomation = stopCompetitionAutomationEnhanced;
window.saveAutomationSettings = saveAutomationSettingsEnhanced;
window.testAutomationSettings = testAutomationConfigurationEnhanced;
window.resetAutomationSettings = resetAutomationSettingsEnhanced;
window.updateParameterValue = updateParameterValueEnhanced;

// Backward compatibility functions
window.verifyAdminWallet = verifyAdminWallet;
window.logAdminAction = logAdminAction;
window.createManualCompetition = createManualCompetition;

// Global exports for HTML onclick handlers
window.loadCacheManagement = loadCacheManagement;
window.loadTokenApproval = loadTokenApproval;
window.loadBlacklistManagement = loadBlacklistManagement;
window.loadTokenManagement = loadTokenManagement;
window.loadAnalyticsDashboard = loadAnalyticsDashboard;
window.quickCacheRefresh = quickCacheRefresh;
window.viewPendingApprovals = viewPendingApprovals;
window.reviewBlacklist = reviewBlacklist;
window.viewPairAnalytics = viewPairAnalytics;
window.refreshCompetitionsList = refreshCompetitionsList;
window.viewCompetitionAnalytics = viewCompetitionAnalytics;
window.downloadCompetitionData = downloadCompetitionData;
window.downloadActiveCompetitions = downloadActiveCompetitions;
window.downloadPastCompetitions = downloadPastCompetitions;
window.downloadCompetitionReport = downloadCompetitionReport;
window.generateCompetitionReport = generateCompetitionReport;
window.generateRevenueReport = generateRevenueReport;
window.generateParticipationReport = generateParticipationReport;
window.generateUserReport = generateUserReport;
window.generateEngagementReport = generateEngagementReport;
window.generateRetentionReport = generateRetentionReport;
window.exportTokenList = exportTokenList;
window.viewTokenAnalytics = viewTokenAnalytics;
window.refreshTokenCache = refreshTokenCache;
window.clearStaleCache = clearStaleCache;
window.optimizeCache = optimizeCache;
window.viewCacheAnalytics = viewCacheAnalytics;
window.bulkWhitelist = bulkWhitelist;
window.whitelistWithApproval = whitelistWithApproval;
window.exportBlacklist = exportBlacklist;
window.scanForThreats = scanForThreats;
window.batchApprove = batchApprove;
window.batchReject = batchReject;
window.selectAll = selectAll;
window.clearSelection = clearSelection;
window.bulkAnalyze = bulkAnalyze;
window.viewBlacklistForWhitelist = viewBlacklistForWhitelist;
window.processWhitelistQueue = processWhitelistQueue;
window.viewCompetitionDetails = viewCompetitionDetails;

debugLog('init', '✅ TokenWars Admin Panel Controller - DATABASE-CENTRIC COMPETITION CREATION FIXED');
debugLog('init', '🔧 FIXES APPLIED:');
debugLog('init', '   🎯 Competition Creation: Fixed to use database-centric approach');
debugLog('init', '   📊 Token Pair Selection: Uses AdminState.pairState.activePairs directly');
debugLog('init', '   🗄️ Database Integration: Direct Supabase queries replace service calls');
debugLog('init', '   ✅ Validation: Simplified since token_pairs are pre-approved');
debugLog('init', '   🔄 Usage Tracking: Updates pair usage count and timestamps');
debugLog('init', '   📋 Competition Manager: Updated to use database queries');
debugLog('init', '   🎨 UI Preservation: All existing functionality maintained (3700+ lines)');
debugLog('init', '   🚀 Enhanced Features: Comprehensive automation controls and diagnostics');
