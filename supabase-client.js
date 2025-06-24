// Supabase Client Initialization and Database Interface
// This file handles all direct communication with Supabase

// Global variables
let supabase = null;
let currentUser = null;

// Initialize Supabase connection
async function initializeSupabase() {
    try {
        // Get configuration
        const config = window.SUPABASE_CONFIG;
        
        if (!config.url || !config.anonKey) {
            throw new Error('Supabase configuration missing. Please check config.js');
        }

        // Initialize Supabase client
        supabase = window.supabase.createClient(config.url, config.anonKey);
        
        console.log('Supabase client initialized');
        updateDbStatus('connected', 'Database: Connected');
        
        // Test connection
        await testConnection();
        
        return supabase;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        updateDbStatus('disconnected', 'Database: Connection Failed');
        throw error;
    }
}

// Test database connection
async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('competitions')
            .select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        
        console.log('Database connection test successful');
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error);
        throw error;
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
        await supabase.rpc('set_user_context', {
            wallet_addr: walletAddress,
            user_role: role
        });
        console.log('User context set for:', walletAddress);
    } catch (error) {
        console.error('Failed to set user context:', error);
        throw error;
    }
}

// Get or create user by wallet address
async function getOrCreateUser(walletAddress) {
    try {
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

        // Create initial leaderboard entry
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
// COMPETITION FUNCTIONS
// ==============================================

// Get active competitions
async function getActiveCompetitions() {
    try {
        const { data, error } = await supabase
            .from('active_competitions')
            .select('*')
            .in('status', ['SETUP', 'VOTING', 'ACTIVE'])
            .order('start_time', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching competitions:', error);
        throw error;
    }
}

// Get competition by ID with bet counts
async function getCompetitionDetails(competitionId) {
    try {
        const { data, error } = await supabase
            .from('active_competitions')
            .select('*')
            .eq('competition_id', competitionId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching competition details:', error);
        throw error;
    }
}

// Place a bet
async function placeBet(competitionId, chosenToken, amount, walletAddress) {
    try {
        await setUserContext(walletAddress);
        
        const betData = {
            user_wallet: walletAddress,
            competition_id: competitionId,
            chosen_token: chosenToken,
            amount: amount,
            status: 'PLACED',
            timestamp: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('bets')
            .insert([betData])
            .select()
            .single();

        if (error) throw error;

        // Update competition total pool
        await supabase
            .from('competitions')
            .update({ 
                total_pool: supabase.sql`total_pool + ${amount}`
            })
            .eq('competition_id', competitionId);

        console.log('Bet placed successfully:', data);
        return data;
    } catch (error) {
        console.error('Error placing bet:', error);
        throw error;
    }
}

// Get user's betting history
async function getUserBets(walletAddress, limit = 50) {
    try {
        await setUserContext(walletAddress);
        
        const { data, error } = await supabase
            .from('bets')
            .select(`
                *,
                competitions (
                    token_a_symbol,
                    token_b_symbol,
                    start_time,
                    end_time,
                    status,
                    winner_token
                )
            `)
            .eq('user_wallet', walletAddress)
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching user bets:', error);
        throw error;
    }
}

// ==============================================
// LEADERBOARD FUNCTIONS
// ==============================================

// Get leaderboard data
async function getLeaderboard(limit = 100) {
    try {
        const { data, error } = await supabase
            .from('leaderboards')
            .select('*')
            .order('total_score', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
    }
}

// Get user's leaderboard position
async function getUserLeaderboardPosition(walletAddress) {
    try {
        const { data, error } = await supabase
            .from('leaderboards')
            .select('ranking, total_score, competitions_won')
            .eq('user_wallet', walletAddress)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (error) {
        console.error('Error fetching user leaderboard position:', error);
        return null;
    }
}

// ==============================================
// PRICE DATA FUNCTIONS
// ==============================================

// Get price history for a token
async function getTokenPriceHistory(tokenAddress, hours = 24) {
    try {
        const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        const { data, error } = await supabase
            .from('price_history')
            .select('*')
            .eq('token_address', tokenAddress)
            .gte('timestamp', hoursAgo.toISOString())
            .order('timestamp', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching price history:', error);
        throw error;
    }
}

// ==============================================
// REAL-TIME SUBSCRIPTIONS
// ==============================================

// Subscribe to competition updates
function subscribeToCompetitions(callback) {
    return supabase
        .channel('competitions')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'competitions'
        }, callback)
        .subscribe();
}

// Subscribe to bet updates for a specific competition
function subscribeToCompetitionBets(competitionId, callback) {
    return supabase
        .channel(`competition-${competitionId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'bets',
            filter: `competition_id=eq.${competitionId}`
        }, callback)
        .subscribe();
}

// Subscribe to leaderboard updates
function subscribeToLeaderboard(callback) {
    return supabase
        .channel('leaderboard')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'leaderboards'
        }, callback)
        .subscribe();
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
    
    // Show error to user
    showErrorNotification(userMessage);
    
    return userMessage;
}

// Clear user context (for logout)
async function clearUserContext() {
    try {
        await supabase.rpc('clear_user_context');
        currentUser = null;
        console.log('User context cleared');
    } catch (error) {
        console.error('Failed to clear user context:', error);
    }
}

// Export functions for global use
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
    
    // Competition functions
    getActiveCompetitions,
    getCompetitionDetails,
    placeBet,
    getUserBets,
    
    // Leaderboard
    getLeaderboard,
    getUserLeaderboardPosition,
    
    // Price data
    getTokenPriceHistory,
    
    // Real-time subscriptions
    subscribeToCompetitions,
    subscribeToCompetitionBets,
    subscribeToLeaderboard,
    
    // Utilities
    handleSupabaseError,
    getCurrentUser: () => currentUser,
    getSupabaseClient: () => supabase
};