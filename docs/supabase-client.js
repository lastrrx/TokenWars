// Supabase Client Initialization and Database Interface
// This file handles all direct communication with Supabase

// Global variables - using unique names to avoid conflicts
let supabaseInstance = null;
let dbCurrentUser = null; // Changed from currentUser to avoid conflicts

// Initialize Supabase connection
async function initializeSupabase() {
    try {
        console.log('Initializing Supabase...');
        
        // Wait a moment for config to be available
        let retries = 0;
        while (!window.SUPABASE_CONFIG && retries < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        // Get configuration
        const config = window.SUPABASE_CONFIG;
        
        if (!config) {
            throw new Error('Supabase configuration not found. Please check config.js loading.');
        }
        
        if (!config.url || !config.anonKey) {
            throw new Error('Supabase configuration incomplete. Missing URL or anon key.');
        }

        console.log('Using Supabase config:', { url: config.url, hasKey: !!config.anonKey });

        // Check if supabase library is loaded
        if (!window.supabase) {
            throw new Error('Supabase library not loaded. Please check the script tag.');
        }

        // Initialize Supabase client
        supabaseInstance = window.supabase.createClient(config.url, config.anonKey);
        
        console.log('Supabase client initialized successfully');
        updateDbStatus('connected', 'Database: Connected');
        
        // Test connection
        await testConnection();
        
        return supabaseInstance;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        updateDbStatus('disconnected', `Database: ${error.message}`);
        throw error;
    }
}

// Test database connection
async function testConnection() {
    try {
        if (!supabaseInstance) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabaseInstance
            .from('competitions')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.warn('Database test query failed:', error);
            // Don't throw error for test query failures as tables might not exist yet
            return false;
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
// USER MANAGEMENT FUNCTIONS
// ==============================================

// Set user context for RLS policies
async function setUserContext(walletAddress, role = 'user') {
    try {
        if (!supabaseInstance) {
            throw new Error('Supabase not initialized');
        }
        
        const { error } = await supabaseInstance.rpc('set_user_context', {
            wallet_addr: walletAddress,
            user_role: role
        });
        
        if (error) {
            console.warn('Failed to set user context:', error);
            // Don't throw as this might not be critical
        } else {
            console.log('User context set for:', walletAddress);
        }
    } catch (error) {
        console.error('Failed to set user context:', error);
        // Don't throw as this might not be critical for demo
    }
}

// Get or create user by wallet address
async function getOrCreateUser(walletAddress) {
    try {
        if (!supabaseInstance) {
            throw new Error('Supabase not initialized');
        }
        
        // Set user context for RLS
        await setUserContext(walletAddress);
        
        // First, try to get existing user
        const { data: existingUser, error: selectError } = await supabaseInstance
            .from('users')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();

        if (selectError && selectError.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is expected for new users
            console.error('Error getting user:', selectError);
            throw selectError;
        }

        if (existingUser) {
            // Update last active time
            const { error: updateError } = await supabaseInstance
                .from('users')
                .update({ last_active: new Date().toISOString() })
                .eq('wallet_address', walletAddress);
            
            if (updateError) {
                console.warn('Failed to update last active time:', updateError);
            }
            
            dbCurrentUser = existingUser;
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
        if (!supabaseInstance) {
            throw new Error('Supabase not initialized');
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

        const { data, error } = await supabaseInstance
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) throw error;

        // Create initial leaderboard entry
        const { error: leaderboardError } = await supabaseInstance
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

        if (leaderboardError) {
            console.warn('Failed to create leaderboard entry:', leaderboardError);
        }

        dbCurrentUser = data;
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
        if (!supabaseInstance) {
            throw new Error('Supabase not initialized');
        }
        
        const { data, error } = await supabaseInstance
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

        if (error && error.code === 'PGRST116') {
            // No rows returned = username available
            return true;
        }

        if (error) {
            console.error('Error checking username:', error);
            return false;
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
        if (!supabaseInstance) {
            console.warn('Supabase not initialized, returning mock data');
            return getMockCompetitions();
        }
        
        const { data, error } = await supabaseInstance
            .from('active_competitions')
            .select('*')
            .in('status', ['SETUP', 'VOTING', 'ACTIVE'])
            .order('start_time', { ascending: true });

        if (error) {
            console.warn('Error fetching competitions, using mock data:', error);
            return getMockCompetitions();
        }
        
        return data || [];
    } catch (error) {
        console.error('Error fetching competitions:', error);
        return getMockCompetitions();
    }
}

// Mock competitions for testing when database is not available
function getMockCompetitions() {
    return [
        {
            competition_id: 'mock-1',
            token_a_symbol: 'SOL',
            token_a_name: 'Solana',
            token_a_start_price: 23.45,
            token_a_bets: 5,
            token_b_symbol: 'BONK',
            token_b_name: 'Bonk',
            token_b_start_price: 0.0000234,
            token_b_bets: 3,
            start_time: new Date().toISOString(),
            voting_end_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
            status: 'VOTING',
            total_pool: 0.8,
            total_bets: 8
        }
    ];
}

// Get competition by ID with bet counts
async function getCompetitionDetails(competitionId) {
    try {
        if (!supabaseInstance) {
            throw new Error('Supabase not initialized');
        }
        
        const { data, error } = await supabaseInstance
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
        if (!supabaseInstance) {
            throw new Error('Supabase not initialized');
        }
        
        await setUserContext(walletAddress);
        
        const betData = {
            user_wallet: walletAddress,
            competition_id: competitionId,
            chosen_token: chosenToken,
            amount: amount,
            status: 'PLACED',
            timestamp: new Date().toISOString()
        };

        const { data, error } = await supabaseInstance
            .from('bets')
            .insert([betData])
            .select()
            .single();

        if (error) throw error;

        // Update competition total pool
        const { error: updateError } = await supabaseInstance
            .from('competitions')
            .update({ 
                total_pool: supabaseInstance.sql`total_pool + ${amount}`
            })
            .eq('competition_id', competitionId);

        if (updateError) {
            console.warn('Failed to update competition pool:', updateError);
        }

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
        if (!supabaseInstance) {
            console.warn('Supabase not initialized, returning empty bets');
            return [];
        }
        
        await setUserContext(walletAddress);
        
        const { data, error } = await supabaseInstance
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

        if (error) {
            console.warn('Error fetching user bets:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error fetching user bets:', error);
        return [];
    }
}

// ==============================================
// LEADERBOARD FUNCTIONS
// ==============================================

// Get leaderboard data
async function getLeaderboard(limit = 100) {
    try {
        if (!supabaseInstance) {
            console.warn('Supabase not initialized, returning empty leaderboard');
            return [];
        }
        
        const { data, error } = await supabaseInstance
            .from('leaderboards')
            .select('*')
            .order('total_score', { ascending: false })
            .limit(limit);

        if (error) {
            console.warn('Error fetching leaderboard:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

// Get user's leaderboard position
async function getUserLeaderboardPosition(walletAddress) {
    try {
        if (!supabaseInstance) {
            return null;
        }
        
        const { data, error } = await supabaseInstance
            .from('leaderboards')
            .select('ranking, total_score, competitions_won')
            .eq('user_wallet', walletAddress)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.warn('Error fetching user leaderboard position:', error);
        }
        
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
        if (!supabaseInstance) {
            return [];
        }
        
        const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        const { data, error } = await supabaseInstance
            .from('price_history')
            .select('*')
            .eq('token_address', tokenAddress)
            .gte('timestamp', hoursAgo.toISOString())
            .order('timestamp', { ascending: true });

        if (error) {
            console.warn('Error fetching price history:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error fetching price history:', error);
        return [];
    }
}

// ==============================================
// REAL-TIME SUBSCRIPTIONS
// ==============================================

// Subscribe to competition updates
function subscribeToCompetitions(callback) {
    if (!supabaseInstance) {
        console.warn('Supabase not initialized, cannot subscribe to competitions');
        return null;
    }
    
    return supabaseInstance
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
    if (!supabaseInstance) {
        console.warn('Supabase not initialized, cannot subscribe to competition bets');
        return null;
    }
    
    return supabaseInstance
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
    if (!supabaseInstance) {
        console.warn('Supabase not initialized, cannot subscribe to leaderboard');
        return null;
    }
    
    return supabaseInstance
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
    
    // Show error to user if function exists
    if (window.showErrorNotification) {
        window.showErrorNotification(userMessage);
    }
    
    return userMessage;
}

// Clear user context (for logout)
async function clearUserContext() {
    try {
        if (!supabaseInstance) {
            return;
        }
        
        const { error } = await supabaseInstance.rpc('clear_user_context');
        if (error) {
            console.warn('Failed to clear user context:', error);
        }
        
        dbCurrentUser = null;
        console.log('User context cleared');
    } catch (error) {
        console.error('Failed to clear user context:', error);
    }
}

// ==============================================
// GLOBAL EXPORTS
// ==============================================

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
    getCurrentUser: () => dbCurrentUser,
    getSupabaseClient: () => supabaseInstance
};

// Make initializeSupabase globally available
window.initializeSupabase = initializeSupabase;
