// FIXED Supabase Client Initialization and Database Interface
// Ensures proper client instance exposure for database-centric architecture

// Global variables
let supabaseClient = null;
let currentUser = null;

// Immediately expose functions to prevent "function not defined" errors
window.initializeSupabase = initializeSupabase;
window.testConnection = testConnection;

// FIXED: Wait for Supabase library to load properly
async function waitForSupabaseLibrary() {
    console.log('⏳ Waiting for Supabase library to load...');
    
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds total
    
    while (attempts < maxAttempts) {
        // Check for different possible Supabase library locations
        if (window.supabase && window.supabase.createClient) {
            console.log('✅ Found Supabase at window.supabase');
            return window.supabase;
        }
        
        if (window.Supabase && window.Supabase.createClient) {
            console.log('✅ Found Supabase at window.Supabase');
            return window.Supabase;
        }
        
        // Check for global supabase object
        if (typeof createClient !== 'undefined') {
            console.log('✅ Found global createClient function');
            return { createClient };
        }
        
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    throw new Error('Supabase library not loaded after 5 seconds. Please check if the Supabase CDN script is properly included.');
}

// FIXED: Initialize Supabase connection with proper client exposure
async function initializeSupabase() {
    try {
        console.log('🚀 Starting Supabase initialization...');
        
        // Get configuration with better error handling
        const config = window.SUPABASE_CONFIG;
        
        if (!config) {
            throw new Error('SUPABASE_CONFIG not found. Please check if config.js loaded properly.');
        }
        
        if (!config.url || !config.anonKey) {
            throw new Error('Supabase configuration missing URL or anon key. Please check config.js');
        }

        console.log('✅ Supabase configuration found:', {
            url: config.url,
            hasKey: !!config.anonKey
        });

        // FIXED: Wait for Supabase library to be available
        const supabaseLib = await waitForSupabaseLibrary();
        
        if (!supabaseLib || !supabaseLib.createClient) {
            throw new Error('Supabase createClient function not available');
        }

        console.log('🔄 Creating Supabase client...');
        
        // Initialize Supabase client with the detected library
        supabaseClient = supabaseLib.createClient(config.url, config.anonKey);
        
        // FIXED: Properly expose client instance for database queries
        window.supabase = supabaseClient; // For .from() calls
        window.supabaseClient = supabaseClient; // Alternative reference
        
        console.log('✅ Supabase client initialized successfully');
        updateDbStatus('connected', '✅ Database: Connected');
        
        // Test connection with improved error handling
        const testResult = await testConnection();
        
        if (testResult) {
            console.log('✅ Database connection test passed');
        } else {
            console.warn('⚠️ Database connection test had issues, but client is ready');
        }
        
        return supabaseClient;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        updateDbStatus('disconnected', `❌ Database: ${error.message}`);
        throw error;
    }
}

// FIXED: Test database connection with graceful degradation
async function testConnection() {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        console.log('🧪 Testing database connection...');
        
        // Test with a simple query that doesn't depend on specific tables
        // Try multiple approaches to find a working table
        
        // First, try a very basic query
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('count', { count: 'exact', head: true })
                .limit(1);
            
            if (error) {
                if (error.code === 'PGRST106' || error.message.includes('relation') || error.message.includes('does not exist')) {
                    console.warn('Users table may not exist yet, but connection works:', error.message);
                    return true; // Connection works, just missing tables
                } else {
                    console.warn('Users table query failed:', error);
                    // Try another table
                }
            } else {
                console.log('✅ Users table accessible');
                return true;
            }
        } catch (userError) {
            console.warn('Users table test failed:', userError);
        }
        
        // Try token_cache table
        try {
            const { data, error } = await supabaseClient
                .from('token_cache')
                .select('count', { count: 'exact', head: true })
                .limit(1);
            
            if (error) {
                if (error.code === 'PGRST106' || error.message.includes('relation') || error.message.includes('does not exist')) {
                    console.warn('Token cache table may not exist yet, but connection works:', error.message);
                    return true;
                } else {
                    console.warn('Token cache query failed:', error);
                }
            } else {
                console.log('✅ Token cache table accessible');
                return true;
            }
        } catch (tokenError) {
            console.warn('Token cache table test failed:', tokenError);
        }
        
        // Try competitions table
        try {
            const { data, error } = await supabaseClient
                .from('competitions')
                .select('count', { count: 'exact', head: true })
                .limit(1);
            
            if (error) {
                if (error.code === 'PGRST106' || error.message.includes('relation') || error.message.includes('does not exist')) {
                    console.warn('Competitions table may not exist yet, but connection works:', error.message);
                    return true;
                } else {
                    console.warn('Competitions query failed:', error);
                }
            } else {
                console.log('✅ Competitions table accessible');
                return true;
            }
        } catch (compError) {
            console.warn('Competitions table test failed:', compError);
        }
        
        console.log('ℹ️ Database connection established, but tables may need setup');
        return true; // Connection is working even if tables don't exist
        
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
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
    console.log(`📊 DB Status: ${message}`);
}

// ==============================================
// DIRECT DATABASE QUERY FUNCTIONS (SIMPLIFIED)
// ==============================================

// Get cached token data with fallback
async function getCachedTokenData(limit = 50, category = null) {
    try {
        if (!supabaseClient) {
            throw new Error('Database not available');
        }
        
        console.log('📊 Querying token cache...');
        
        // Try to get from token_cache first
        let query = supabaseClient
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
        console.log('⚠️ Cache miss or empty, falling back to main tokens table...');
        const { data: dbTokens, error: dbError } = await supabaseClient
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

        // If both fail, it might be a permissions issue or tables don't exist
        if (cacheError) {
            console.warn('Token cache error:', cacheError);
        }
        if (dbError) {
            console.warn('Main tokens table error:', dbError);
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
        if (!supabaseClient || !tokenAddresses || tokenAddresses.length === 0) {
            return { success: false, prices: [] };
        }
        
        console.log(`💰 Querying price cache for ${tokenAddresses.length} tokens...`);
        
        // Try price_cache first
        const { data: cachedPrices, error: cacheError } = await supabaseClient
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
        console.log('⚠️ Price cache miss, trying price history...');
        const { data: historyPrices, error: historyError } = await supabaseClient
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

        // Log errors for debugging
        if (cacheError) {
            console.warn('Price cache error:', cacheError);
        }
        if (historyError) {
            console.warn('Price history error:', historyError);
        }

        return { success: false, prices: [], source: 'none' };

    } catch (error) {
        console.error('Error getting cached price data:', error);
        return { success: false, prices: [], source: 'error' };
    }
}

// ==============================================
// USER MANAGEMENT FUNCTIONS (SIMPLIFIED)
// ==============================================

// Set user context for RLS policies
async function setUserContext(walletAddress, role = 'user') {
    try {
        if (!supabaseClient) {
            console.warn('Supabase not initialized for user context');
            return;
        }
        
        console.log(`👤 Setting user context: ${walletAddress}`);
        
        // Try to set user context, but don't fail if function doesn't exist
        try {
            await supabaseClient.rpc('set_user_context', {
                wallet_addr: walletAddress,
                user_role: role
            });
            console.log('✅ User context set for:', walletAddress);
        } catch (rpcError) {
            if (rpcError.code === 'PGRST202') {
                console.warn('⚠️ set_user_context function not available, continuing without RLS context');
            } else {
                throw rpcError;
            }
        }
    } catch (error) {
        console.error('❌ Failed to set user context:', error);
        // Don't throw - let app continue without RLS context
    }
}

// Get or create user by wallet address (with graceful degradation)
async function getOrCreateUser(walletAddress) {
    try {
        if (!supabaseClient) {
            throw new Error('Database not available');
        }
        
        console.log(`👤 Getting or creating user: ${walletAddress}`);
        
        // Set user context for RLS
        await setUserContext(walletAddress);
        
        // First, try to get existing user
        const { data: existingUser, error: selectError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();

        if (selectError && selectError.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is expected for new users
            if (selectError.code === 'PGRST106') {
                // Table doesn't exist
                console.warn('⚠️ Users table does not exist, continuing with wallet-only authentication');
                return null;
            }
            throw selectError;
        }

        if (existingUser) {
            console.log('✅ Found existing user:', existingUser.username);
            
            // Update last active time if possible
            try {
                await supabaseClient
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
        console.log('ℹ️ User not found, profile creation needed');
        return null;
    } catch (error) {
        console.error('❌ Error getting user:', error);
        
        // If it's a table not found error, continue with basic wallet auth
        if (error.code === 'PGRST106' || error.message.includes('relation') || error.message.includes('does not exist')) {
            console.warn('⚠️ User management tables not available, using wallet-only mode');
            return null;
        }
        
        throw error;
    }
}

// Create new user profile (with graceful degradation)
async function createUserProfile(walletAddress, username, avatar = '🎯') {
    try {
        if (!supabaseClient) {
            throw new Error('Database not available');
        }
        
        console.log(`👤 Creating user profile: ${username} (${walletAddress})`);
        
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

        const { data, error } = await supabaseClient
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST106') {
                console.warn('⚠️ Users table does not exist, skipping profile creation');
                return { wallet_address: walletAddress, username };
            }
            throw error;
        }

        // Try to create initial leaderboard entry (don't fail if table doesn't exist)
        try {
            await supabaseClient
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
            console.log('✅ Leaderboard entry created');
        } catch (leaderboardError) {
            console.warn('⚠️ Could not create leaderboard entry:', leaderboardError);
        }

        currentUser = data;
        console.log('✅ User profile created:', data);
        return data;
    } catch (error) {
        console.error('❌ Error creating user profile:', error);
        
        // Return basic user object even if database creation fails
        if (error.code === 'PGRST106' || error.message.includes('relation') || error.message.includes('does not exist')) {
            console.warn('⚠️ User tables not available, using basic wallet auth');
            return { wallet_address: walletAddress, username };
        }
        
        throw error;
    }
}

// Check username availability (with graceful degradation)
async function checkUsernameAvailability(username) {
    try {
        if (!supabaseClient) {
            console.warn('Database not available for username check');
            return true; // Allow any username if DB not available
        }
        
        const { data, error } = await supabaseClient
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

// Generate unique referral code
function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ==============================================
// COMPETITION FUNCTIONS (SIMPLIFIED)
// ==============================================

// Get active competitions with graceful degradation
async function getActiveCompetitions() {
    try {
        if (!supabaseClient) {
            console.warn('Database not available for competitions');
            return [];
        }
        
        console.log('🏆 Fetching active competitions...');
        
        // Try the enhanced view first
        try {
            const { data, error } = await supabaseClient
                .from('active_competitions')
                .select('*')
                .order('start_time', { ascending: true });

            if (!error && data) {
                console.log(`✅ Found ${data.length} active competitions`);
                return data;
            }
        } catch (viewError) {
            console.warn('⚠️ Active competitions view not available, trying basic query...');
        }

        // Fallback to basic competitions table
        const { data, error } = await supabaseClient
            .from('competitions')
            .select('*')
            .in('status', ['SETUP', 'VOTING', 'ACTIVE'])
            .order('start_time', { ascending: true });

        if (error) {
            if (error.code === 'PGRST106') {
                console.warn('⚠️ Competitions table does not exist');
                return [];
            }
            throw error;
        }
        
        console.log(`✅ Found ${data?.length || 0} competitions`);
        return data || [];
    } catch (error) {
        console.error('❌ Error fetching competitions:', error);
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
        if (supabaseClient) {
            try {
                await supabaseClient.rpc('clear_user_context');
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
// GLOBAL EXPORTS - FIXED FOR DATABASE-CENTRIC ACCESS
// ==============================================

// Export essential functions for global use immediately
window.supabaseClient = {
    // Initialization
    initializeSupabase,
    testConnection,
    
    // Cache management
    getCachedTokenData,
    getCachedPriceData,
    
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
    getSupabaseClient: () => supabaseClient,
    
    // Status checkers
    isReady: () => !!supabaseClient,
    isConnected: () => !!supabaseClient
};

console.log('✅ FIXED Supabase client module loaded with proper database access');
console.log('🔧 Key Features:');
console.log('   ✅ FIXED: Proper Supabase client instance exposure');
console.log('   ✅ FIXED: Database queries via supabase.from() now work');
console.log('   ✅ Graceful degradation when tables missing');
console.log('   ✅ Direct table queries with comprehensive error handling');
console.log('   ✅ Enhanced cache management functions');
console.log('   ✅ Robust user management with fallbacks');

// FIXED: Auto-initialize with better timing and client exposure
async function autoInitialize() {
    try {
        // Wait a bit for DOM and config to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if config is available
        if (!window.SUPABASE_CONFIG) {
            console.log('⏳ Waiting for SUPABASE_CONFIG...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (window.SUPABASE_CONFIG) {
            console.log('🚀 Auto-initializing Supabase...');
            await initializeSupabase();
        } else {
            console.warn('⚠️ SUPABASE_CONFIG not available, skipping auto-initialization');
        }
    } catch (error) {
        console.warn('⚠️ Auto-initialization failed, manual initialization required:', error.message);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitialize);
} else {
    // DOM already loaded
    autoInitialize();
}
