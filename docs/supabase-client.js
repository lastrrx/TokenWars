// Supabase Client Initialization and Database Interface
// Enhanced with cache management and improved error handling

// Global variables
let supabase = null;
let currentUser = null;

// Immediately expose functions to prevent "function not defined" errors
window.initializeSupabase = initializeSupabase;
window.testConnection = testConnection;

// Initialize Supabase connection
async function initializeSupabase() {
    try {
        console.log('Starting Supabase initialization...');
        
        // Get configuration with better error handling
        const config = window.SUPABASE_CONFIG;
        
        if (!config) {
            throw new Error('SUPABASE_CONFIG not found. Please check if config.js loaded properly.');
        }
        
        if (!config.url || !config.anonKey) {
            throw new Error('Supabase configuration missing URL or anon key. Please check config.js');
        }

        // Check if Supabase library is loaded
        if (!window.supabase) {
            throw new Error('Supabase library not loaded. Please check if the CDN script is working.');
        }

        // Initialize Supabase client
        supabase = window.supabase.createClient(config.url, config.anonKey);
        
        // Store globally for immediate access
        window.supabase = supabase;
        
        console.log('Supabase client initialized successfully');
        updateDbStatus('connected', 'Database: Connected');
        
        // Test connection with improved error handling
        await testConnection();
        
        return supabase;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        updateDbStatus('disconnected', `Database: ${error.message}`);
        throw error;
    }
}

// Test database connection with graceful degradation
async function testConnection() {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        // Test with a simple query that doesn't depend on specific tables
        const { data, error } = await supabase
            .from('competitions')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            // Check if it's a table not found error
            if (error.code === 'PGRST106' || error.message.includes('relation') || error.message.includes('does not exist')) {
                console.warn('Some database tables may not exist yet, but connection is working:', error.message);
                return true; // Connection works, just missing tables
            } else {
                console.warn('Database test query failed, but connection might still work:', error);
                return false;
            }
        }
        
        console.log('Database connection test successful');
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error);
        return false;
    }
}

// Update database status indicator
function updateDbStatus(status, message) {
    const statusElement = document.getElementById('dbStatus');
    if (statusElement) {
        statusElement.className = `db-status ${status}`;
        statusElement.textContent = message;
    }
}

// ==============================================
// CACHE MANAGEMENT FUNCTIONS
// ==============================================

// Get cached token data with fallback
async function getCachedTokenData(limit = 50, category = null) {
    try {
        if (!supabase) {
            throw new Error('Database not available');
        }
        
        // Try to get from token_cache first
        let query = supabase
            .from('token_cache')
            .select('*')
            .gte('cache_expires_at', new Date().toISOString()) // Only fresh cache
            .eq('cache_status', 'FRESH')
            .order('market_cap_usd', { ascending: false })
            .limit(limit);

        const { data: cachedTokens, error: cacheError } = await query;

        if (!cacheError && cachedTokens && cachedTokens.length > 0) {
            console.log(`✅ Found ${cachedTokens.length} fresh tokens in cache`);
            return {
                success: true,
                tokens: cachedTokens.map(token => ({
                    address: token.token_address,
                    symbol: token.symbol,
                    name: token.name,
                    logoURI: token.logo_uri,
                    decimals: 9,
                    market_cap: token.market_cap_usd,
                    price: token.current_price,
                    volume_24h: token.volume_24h,
                    price_change_24h: token.price_change_24h,
                    cache_timestamp: token.cache_created_at,
                    data_source: token.data_source
                })),
                source: 'cache'
            };
        }

        // Fallback to main tokens table
        console.log('Cache miss, falling back to main tokens table...');
        const { data: dbTokens, error: dbError } = await supabase
            .from('tokens')
            .select('*')
            .eq('is_active', true)
            .order('market_cap', { ascending: false })
            .limit(limit);

        if (!dbError && dbTokens && dbTokens.length > 0) {
            console.log(`✅ Found ${dbTokens.length} tokens in main table`);
            return {
                success: true,
                tokens: dbTokens.map(token => ({
                    address: token.address,
                    symbol: token.symbol,
                    name: token.name,
                    logoURI: token.logo_uri,
                    decimals: token.decimals || 9,
                    market_cap: token.market_cap,
                    price: token.current_price,
                    volume_24h: token.total_volume,
                    price_change_24h: token.price_change_24h,
                    age_days: token.age_days,
                    last_updated: token.last_updated
                })),
                source: 'database'
            };
        }

        // No data found anywhere
        return { success: false, tokens: [], source: 'none' };

    } catch (error) {
        console.error('Error getting cached token data:', error);
        return { success: false, tokens: [], source: 'error' };
    }
}

// Get cached price data
async function getCachedPriceData(tokenAddresses) {
    try {
        if (!supabase || !tokenAddresses || tokenAddresses.length === 0) {
            return { success: false, prices: [] };
        }
        
        // Try price_cache first
        const { data: cachedPrices, error: cacheError } = await supabase
            .from('price_cache')
            .select('*')
            .in('token_address', tokenAddresses)
            .gte('cache_expires_at', new Date().toISOString())
            .order('timestamp', { ascending: false });

        if (!cacheError && cachedPrices && cachedPrices.length > 0) {
            // Get most recent price for each token
            const latestPrices = new Map();
            cachedPrices.forEach(price => {
                const existing = latestPrices.get(price.token_address);
                if (!existing || new Date(price.timestamp) > new Date(existing.timestamp)) {
                    latestPrices.set(price.token_address, price);
                }
            });

            const prices = Array.from(latestPrices.values()).map(price => ({
                address: price.token_address,
                price: parseFloat(price.price),
                volume: price.volume || 0,
                market_cap: price.market_cap || 0,
                timestamp: price.timestamp,
                source: price.source,
                confidence: price.confidence_score || 1.0
            }));

            console.log(`✅ Found ${prices.length} fresh prices in cache`);
            return { success: true, prices, source: 'cache' };
        }

        // Fallback to price_history
        const { data: historyPrices, error: historyError } = await supabase
            .from('price_history')
            .select('*')
            .in('token_address', tokenAddresses)
            .gte('timestamp', new Date(Date.now() - 3600000).toISOString()) // Last hour
            .order('timestamp', { ascending: false });

        if (!historyError && historyPrices && historyPrices.length > 0) {
            const latestPrices = new Map();
            historyPrices.forEach(price => {
                const existing = latestPrices.get(price.token_address);
                if (!existing || new Date(price.timestamp) > new Date(existing.timestamp)) {
                    latestPrices.set(price.token_address, price);
                }
            });

            const prices = Array.from(latestPrices.values()).map(price => ({
                address: price.token_address,
                price: parseFloat(price.price),
                volume: price.volume || 0,
                market_cap: price.market_cap || 0,
                timestamp: price.timestamp,
                source: price.source || 'history',
                confidence: 0.8
            }));

            console.log(`✅ Found ${prices.length} prices in history`);
            return { success: true, prices, source: 'history' };
        }

        return { success: false, prices: [], source: 'none' };

    } catch (error) {
        console.error('Error getting cached price data:', error);
        return { success: false, prices: [], source: 'error' };
    }
}

// Get cache health status
async function getCacheHealthStatus() {
    try {
        if (!supabase) {
            return { available: false, error: 'Database not available' };
        }

        // Check token cache health
        const { data: tokenCacheHealth, error: tokenError } = await supabase
            .from('token_cache')
            .select('cache_status, cache_created_at, cache_expires_at')
            .order('cache_created_at', { ascending: false })
            .limit(100);

        // Check price cache health
        const { data: priceCacheHealth, error: priceError } = await supabase
            .from('price_cache')
            .select('timestamp, cache_expires_at')
            .order('timestamp', { ascending: false })
            .limit(100);

        const now = new Date();
        const health = {
            available: true,
            tokenCache: {
                total: tokenCacheHealth?.length || 0,
                fresh: tokenCacheHealth?.filter(t => 
                    t.cache_status === 'FRESH' && new Date(t.cache_expires_at) > now
                ).length || 0,
                stale: 0,
                lastUpdate: tokenCacheHealth?.[0]?.cache_created_at || null
            },
            priceCache: {
                total: priceCacheHealth?.length || 0,
                fresh: priceCacheHealth?.filter(p => 
                    new Date(p.cache_expires_at) > now
                ).length || 0,
                stale: 0,
                lastUpdate: priceCacheHealth?.[0]?.timestamp || null
            }
        };

        health.tokenCache.stale = health.tokenCache.total - health.tokenCache.fresh;
        health.priceCache.stale = health.priceCache.total - health.priceCache.fresh;

        return health;

    } catch (error) {
        console.error('Error getting cache health:', error);
        return { available: false, error: error.message };
    }
}

// ==============================================
// USER MANAGEMENT FUNCTIONS (IMPROVED)
// ==============================================

// Set user context for RLS policies
async function setUserContext(walletAddress, role = 'user') {
    try {
        if (!supabase) {
            console.warn('Supabase not initialized for user context');
            return;
        }
        
        // Try to set user context, but don't fail if function doesn't exist
        try {
            await supabase.rpc('set_user_context', {
                wallet_addr: walletAddress,
                user_role: role
            });
            console.log('User context set for:', walletAddress);
        } catch (rpcError) {
            if (rpcError.code === 'PGRST202') {
                console.warn('set_user_context function not available, continuing without RLS context');
            } else {
                throw rpcError;
            }
        }
    } catch (error) {
        console.error('Failed to set user context:', error);
        // Don't throw - let app continue without RLS context
    }
}

// Get or create user by wallet address (with graceful degradation)
async function getOrCreateUser(walletAddress) {
    try {
        if (!supabase) {
            throw new Error('Database not available');
        }
        
        // Set user context for RLS
        await setUserContext(walletAddress);
        
        // First, try to get existing user
        const { data: existingUser, error: selectError } = await supabase
            .from('users')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();

        if (selectError && selectError.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is expected for new users
            if (selectError.code === 'PGRST106') {
                // Table doesn't exist
                console.warn('Users table does not exist, continuing with wallet-only authentication');
                return null;
            }
            throw selectError;
        }

        if (existingUser) {
            // Update last active time if possible
            try {
                await supabase
                    .from('users')
                    .update({ last_active: new Date().toISOString() })
                    .eq('wallet_address', walletAddress);
            } catch (updateError) {
                console.warn('Could not update last active time:', updateError);
            }
            
            currentUser = existingUser;
            return existingUser;
        }

        // User doesn't exist, return null to prompt profile creation
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        
        // If it's a table not found error, continue with basic wallet auth
        if (error.code === 'PGRST106' || error.message.includes('relation') || error.message.includes('does not exist')) {
            console.warn('User management tables not available, using wallet-only mode');
            return null;
        }
        
        throw error;
    }
}

// Create new user profile (with graceful degradation)
async function createUserProfile(walletAddress, username, avatar = '🎯') {
    try {
        if (!supabase) {
            throw new Error('Database not available');
        }
        
        await setUserContext(walletAddress);
        
        // Generate unique referral code
        const referralCode = generateReferralCode();
        
        const userData = {
            wallet_address: walletAddress,
            username: username,
            total_winnings: 0,
            total_bets: 0,
            win_rate: 0,
            current_streak: 0,
            is_banned: false,
            referral_code: referralCode,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST106') {
                console.warn('Users table does not exist, skipping profile creation');
                return { wallet_address: walletAddress, username };
            }
            throw error;
        }

        // Try to create initial leaderboard entry (don't fail if table doesn't exist)
        try {
            await supabase
                .from('leaderboards')
                .insert([{
                    user_wallet: walletAddress,
                    username: username,
                    ranking: 0,
                    total_score: 0,
                    competitions_won: 0,
                    competitions_participated: 0,
                    total_winnings: 0,
                    win_percentage: 0,
                    current_streak: 0,
                    best_streak: 0
                }]);
        } catch (leaderboardError) {
            console.warn('Could not create leaderboard entry:', leaderboardError);
        }

        currentUser = data;
        console.log('User profile created:', data);
        return data;
    } catch (error) {
        console.error('Error creating user profile:', error);
        
        // Return basic user object even if database creation fails
        if (error.code === 'PGRST106' || error.message.includes('relation') || error.message.includes('does not exist')) {
            console.warn('User tables not available, using basic wallet auth');
            return { wallet_address: walletAddress, username };
        }
        
        throw error;
    }
}

// Generate unique referral code
function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Check username availability (with graceful degradation)
async function checkUsernameAvailability(username) {
    try {
        if (!supabase) {
            console.warn('Database not available for username check');
            return true; // Allow any username if DB not available
        }
        
        const { data, error } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

        if (error && error.code === 'PGRST116') {
            // No rows returned = username available
            return true;
        }

        if (error && error.code === 'PGRST106') {
            // Table doesn't exist = allow any username
            return true;
        }

        return false; // Username exists
    } catch (error) {
        console.error('Error checking username:', error);
        return true; // Default to allowing username if check fails
    }
}

// ==============================================
// COMPETITION FUNCTIONS (IMPROVED)
// ==============================================

// Get active competitions with graceful degradation
async function getActiveCompetitions() {
    try {
        if (!supabase) {
            console.warn('Database not available for competitions');
            return [];
        }
        
        // Try the enhanced view first
        try {
            const { data, error } = await supabase
                .from('active_competitions')
                .select('*')
                .order('start_time', { ascending: true });

            if (!error && data) {
                return data;
            }
        } catch (viewError) {
            console.warn('Active competitions view not available, trying basic query...');
        }

        // Fallback to basic competitions table
        const { data, error } = await supabase
            .from('competitions')
            .select('*')
            .in('status', ['SETUP', 'VOTING', 'ACTIVE'])
            .order('start_time', { ascending: true });

        if (error) {
            if (error.code === 'PGRST106') {
                console.warn('Competitions table does not exist');
                return [];
            }
            throw error;
        }
        
        return data || [];
    } catch (error) {
        console.error('Error fetching competitions:', error);
        return [];
    }
}

// ==============================================
// ERROR HANDLING AND UTILITIES
// ==============================================

// Handle Supabase errors with improved messaging
function handleSupabaseError(error) {
    console.error('Supabase error:', error);
    
    // Map common error codes to user-friendly messages
    const errorMessages = {
        'PGRST116': 'No data found',
        'PGRST106': 'Database table not found - some features may be limited',
        'PGRST200': 'Database relationship error - using fallback data',
        '23505': 'This username is already taken',
        '23503': 'Invalid reference - please try again',
        'row_security_violation': 'Access denied - please check your permissions'
    };
    
    const userMessage = errorMessages[error.code] || error.message || 'An unexpected error occurred';
    
    return userMessage;
}

// Clear user context (for logout)
async function clearUserContext() {
    try {
        if (supabase) {
            try {
                await supabase.rpc('clear_user_context');
            } catch (rpcError) {
                console.warn('clear_user_context function not available');
            }
        }
        currentUser = null;
        console.log('User context cleared');
    } catch (error) {
        console.error('Failed to clear user context:', error);
    }
}

// ==============================================
// GLOBAL EXPORTS
// ==============================================

// Export essential functions for global use immediately
window.supabaseClient = {
    // Initialization
    initializeSupabase,
    testConnection,
    
    // Cache management
    getCachedTokenData,
    getCachedPriceData,
    getCacheHealthStatus,
    
    // User management
    getOrCreateUser,
    createUserProfile,
    checkUsernameAvailability,
    setUserContext,
    clearUserContext,
    
    // Competition functions
    getActiveCompetitions,
    
    // Utilities
    handleSupabaseError,
    getCurrentUser: () => currentUser,
    getSupabaseClient: () => supabase
};

console.log('Supabase client module loaded and exposed globally');

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSupabase);
} else {
    // DOM already loaded
    initializeSupabase();
}
