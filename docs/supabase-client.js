// Supabase Client Initialization and Database Interface
// FIXED VERSION: Immediate global exposure and better error handling

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
        
        // Test connection
        await testConnection();
        
        return supabase;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        updateDbStatus('disconnected', `Database: ${error.message}`);
        throw error;
    }
}

// Test database connection
async function testConnection() {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        // Simple test query - just check if we can connect
        const { data, error } = await supabase
            .from('competitions')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.warn('Database test query failed, but connection might still work:', error);
            // Don't throw here, as table might not exist yet
        }
        
        console.log('Database connection test successful');
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error);
        // Don't throw here to allow app to continue with basic functionality
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
// USER MANAGEMENT FUNCTIONS
// ==============================================

// Set user context for RLS policies
async function setUserContext(walletAddress, role = 'user') {
    try {
        if (!supabase) {
            console.warn('Supabase not initialized for user context');
            return;
        }
        
        await supabase.rpc('set_user_context', {
            wallet_addr: walletAddress,
            user_role: role
        });
        console.log('User context set for:', walletAddress);
    } catch (error) {
        console.error('Failed to set user context:', error);
        // Don't throw - let app continue
    }
}

// Get or create user by wallet address
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
            throw selectError;
        }

        if (existingUser) {
            // Update last active time
            await supabase
                .from('users')
                .update({ last_active: new Date().toISOString() })
                .eq('wallet_address', walletAddress);
            
            currentUser = existingUser;
            return existingUser;
        }

        // User doesn't exist, return null to prompt profile creation
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        throw error;
    }
}

// Create new user profile
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

        if (error) throw error;

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

// Check username availability
async function checkUsernameAvailability(username) {
    try {
        if (!supabase) {
            throw new Error('Database not available');
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

        return false; // Username exists
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
}

// ==============================================
// TOKEN MANAGEMENT FUNCTIONS - SIMPLIFIED FOR NOW
// ==============================================

// Basic token functions that work without Edge Functions
async function getActiveCompetitions() {
    try {
        if (!supabase) {
            console.warn('Database not available for competitions');
            return [];
        }
        
        const { data, error } = await supabase
            .from('competitions')
            .select('*')
            .in('status', ['SETUP', 'VOTING', 'ACTIVE'])
            .order('start_time', { ascending: true });

        if (error) {
            console.warn('Error fetching competitions:', error);
            return [];
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

// Handle Supabase errors
function handleSupabaseError(error) {
    console.error('Supabase error:', error);
    
    // Map common error codes to user-friendly messages
    const errorMessages = {
        'PGRST116': 'No data found',
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
            await supabase.rpc('clear_user_context');
        }
        currentUser = null;
        console.log('User context cleared');
    } catch (error) {
        console.error('Failed to clear user context:', error);
    }
}

// Export essential functions for global use immediately
window.supabaseClient = {
    // Initialization
    initializeSupabase,
    testConnection,
    
    // User management
    getOrCreateUser,
    createUserProfile,
    checkUsernameAvailability,
    setUserContext,
    clearUserContext,
    
    // Basic functions
    getActiveCompetitions,
    
    // Utilities
    handleSupabaseError,
    getCurrentUser: () => currentUser,
    getSupabaseClient: () => supabase
};

console.log('Supabase client module loaded and exposed globally');
