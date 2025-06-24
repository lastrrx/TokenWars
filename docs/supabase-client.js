// Supabase Client Initialization and Database Interface
// This file handles all direct communication with Supabase including new token and price management

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
// TOKEN MANAGEMENT FUNCTIONS
// ==============================================

// Store tokens in database
async function storeTokens(tokens) {
    try {
        // Clear existing tokens
        await supabase.from('tokens').delete().neq('address', '');
        
        // Insert new tokens in batches
        const batchSize = 100;
        for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);
            
            const { error } = await supabase
                .from('tokens')
                .insert(batch);
            
            if (error) throw error;
        }
        
        console.log(`Stored ${tokens.length} tokens in database`);
        return true;
    } catch (error) {
        console.error('Error storing tokens:', error);
        throw error;
    }
}

// Get active tokens from database
async function getActiveTokens() {
    try {
        const { data, error } = await supabase
            .from('tokens')
            .select('*')
            .eq('is_active', true)
            .order('market_cap', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching active tokens:', error);
        throw error;
    }
}

// Get token by address
async function getToken(address) {
    try {
        const { data, error } = await supabase
            .from('tokens')
            .select('*')
            .eq('address', address)
            .eq('is_active', true)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (error) {
        console.error('Error fetching token:', error);
        throw error;
    }
}

// Update token data
async function updateToken(address, updates) {
    try {
        const { data, error } = await supabase
            .from('tokens')
            .update({
                ...updates,
                last_updated: new Date().toISOString()
            })
            .eq('address', address)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating token:', error);
        throw error;
    }
}

// Search tokens
async function searchTokens(query, limit = 20) {
    try {
        const { data, error } = await supabase
            .from('tokens')
            .select('*')
            .eq('is_active', true)
            .or(`symbol.ilike.%${query}%,name.ilike.%${query}%`)
            .order('market_cap', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error searching tokens:', error);
        throw error;
    }
}

// ==============================================
// TOKEN PAIRS MANAGEMENT
// ==============================================

// Store token pairs
async function storeTokenPairs(pairs) {
    try {
        // Clear existing pairs
        await supabase.from('token_pairs').delete().neq('id', '');
        
        // Insert new pairs
        const { error } = await supabase
            .from('token_pairs')
            .insert(pairs);
        
        if (error) throw error;
        
        console.log(`Stored ${pairs.length} token pairs`);
        return true;
    } catch (error) {
        console.error('Error storing token pairs:', error);
        throw error;
    }
}

// Get available token pairs
async function getAvailableTokenPairs(excludeUsed = [], limit = 50) {
    try {
        let query = supabase
            .from('token_pairs')
            .select(`
                *,
                token_a:tokens!token_pairs_token_a_address_fkey(*),
                token_b:tokens!token_pairs_token_b_address_fkey(*)
            `)
            .eq('is_active', true)
            .order('compatibility_score', { ascending: false })
            .limit(limit);

        if (excludeUsed.length > 0) {
            query = query.not('id', 'in', `(${excludeUsed.join(',')})`);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error fetching token pairs:', error);
        throw error;
    }
}

// Mark token pair as used
async function markTokenPairAsUsed(pairId, competitionId) {
    try {
        const { error } = await supabase
            .from('token_pairs')
            .update({
                last_used: new Date().toISOString(),
                last_competition_id: competitionId,
                usage_count: supabase.sql`usage_count + 1`
            })
            .eq('id', pairId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error marking token pair as used:', error);
        throw error;
    }
}

// ==============================================
// PRICE HISTORY FUNCTIONS
// ==============================================

// Store price history record
async function storePriceHistory(tokenAddress, price, timestamp = null, volume = null, marketCap = null) {
    try {
        const record = {
            token_address: tokenAddress,
            price: price,
            timestamp: timestamp || new Date().toISOString(),
            volume: volume || 0,
            market_cap: marketCap || 0
        };

        const { error } = await supabase
            .from('price_history')
            .insert([record]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error storing price history:', error);
        throw error;
    }
}

// Get price history for token
async function getPriceHistory(tokenAddress, startTime, endTime, limit = 1000) {
    try {
        const { data, error } = await supabase
            .from('price_history')
            .select('*')
            .eq('token_address', tokenAddress)
            .gte('timestamp', startTime)
            .lte('timestamp', endTime)
            .order('timestamp', { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching price history:', error);
        throw error;
    }
}

// Get latest price for token
async function getLatestPrice(tokenAddress) {
    try {
        const { data, error } = await supabase
            .from('price_history')
            .select('*')
            .eq('token_address', tokenAddress)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (error) {
        console.error('Error fetching latest price:', error);
        throw error;
    }
}

// Cleanup old price history (keep last 30 days)
async function cleanupPriceHistory() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { error } = await supabase
            .from('price_history')
            .delete()
            .lt('timestamp', thirtyDaysAgo.toISOString());

        if (error) throw error;
        console.log('Price history cleanup completed');
        return true;
    } catch (error) {
        console.error('Error cleaning up price history:', error);
        throw error;
    }
}

// ==============================================
// COMPETITION FUNCTIONS (UPDATED)
// ==============================================

// Get active competitions with token data
async function getActiveCompetitions() {
    try {
        const { data, error } = await supabase
            .from('active_competitions')
            .select(`
                *,
                token_a_data:tokens!competitions_token_a_address_fkey(*),
                token_b_data:tokens!competitions_token_b_address_fkey(*)
            `)
            .in('status', ['SETUP', 'VOTING', 'ACTIVE'])
            .order('start_time', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching competitions:', error);
        throw error;
    }
}

// Create competition with token pair
async function createCompetition(tokenPair, startTime, duration) {
    try {
        const competitionData = {
            token_a_address: tokenPair.token_a.address,
            token_a_symbol: tokenPair.token_a.symbol,
            token_a_name: tokenPair.token_a.name,
            token_a_logo: tokenPair.token_a.logoURI,
            token_b_address: tokenPair.token_b.address,
            token_b_symbol: tokenPair.token_b.symbol,
            token_b_name: tokenPair.token_b.name,
            token_b_logo: tokenPair.token_b.logoURI,
            start_time: startTime,
            end_time: new Date(new Date(startTime).getTime() + duration * 60 * 60 * 1000).toISOString(),
            voting_end_time: new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(), // 1 hour voting
            status: 'SETUP',
            total_pool: 0,
            token_a_bets: 0,
            token_b_bets: 0,
            pair_id: tokenPair.id
        };

        const { data, error } = await supabase
            .from('competitions')
            .insert([competitionData])
            .select()
            .single();

        if (error) throw error;

        // Mark token pair as used
        await markTokenPairAsUsed(tokenPair.id, data.competition_id);

        console.log('Competition created:', data);
        return data;
    } catch (error) {
        console.error('Error creating competition:', error);
        throw error;
    }
}

// Update competition with TWAP data
async function updateCompetitionTWAP(competitionId, twapData) {
    try {
        const { data, error } = await supabase
            .from('competitions')
            .update({
                token_a_start_twap: twapData.token_a.start_twap,
                token_a_end_twap: twapData.token_a.end_twap,
                token_b_start_twap: twapData.token_b.start_twap,
                token_b_end_twap: twapData.token_b.end_twap,
                winner_token: twapData.winner,
                twap_calculated_at: new Date().toISOString()
            })
            .eq('competition_id', competitionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating competition TWAP:', error);
        throw error;
    }
}

// Get competition by ID with bet counts
async function getCompetitionDetails(competitionId) {
    try {
        const { data, error } = await supabase
            .from('active_competitions')
            .select(`
                *,
                token_a_data:tokens!competitions_token_a_address_fkey(*),
                token_b_data:tokens!competitions_token_b_address_fkey(*)
            `)
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

        // Update competition total pool and bet counts
        const updateField = chosenToken === 'token_a' ? 'token_a_bets' : 'token_b_bets';
        await supabase
            .from('competitions')
            .update({ 
                total_pool: supabase.sql`total_pool + ${amount}`,
                [updateField]: supabase.sql`${updateField} + 1`
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
                    token_a_logo,
                    token_b_logo,
                    start_time,
                    end_time,
                    status,
                    winner_token,
                    token_a_start_twap,
                    token_a_end_twap,
                    token_b_start_twap,
                    token_b_end_twap
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

// Subscribe to token updates
function subscribeToTokenUpdates(callback) {
    return supabase
        .channel('tokens')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'tokens'
        }, callback)
        .subscribe();
}

// Subscribe to price updates for specific tokens
function subscribeToPriceUpdates(tokenAddresses, callback) {
    const channels = tokenAddresses.map(address => 
        supabase
            .channel(`price-${address}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'price_history',
                filter: `token_address=eq.${address}`
            }, callback)
            .subscribe()
    );
    
    return channels;
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
    
    // Token management
    storeTokens,
    getActiveTokens,
    getToken,
    updateToken,
    searchTokens,
    
    // Token pairs
    storeTokenPairs,
    getAvailableTokenPairs,
    markTokenPairAsUsed,
    
    // Price history
    storePriceHistory,
    getPriceHistory,
    getLatestPrice,
    cleanupPriceHistory,
    
    // Competition functions
    getActiveCompetitions,
    createCompetition,
    updateCompetitionTWAP,
    getCompetitionDetails,
    placeBet,
    getUserBets,
    
    // Leaderboard
    getLeaderboard,
    getUserLeaderboardPosition,
    
    // Real-time subscriptions
    subscribeToCompetitions,
    subscribeToCompetitionBets,
    subscribeToLeaderboard,
    subscribeToTokenUpdates,
    subscribeToPriceUpdates,
    
    // Utilities
    handleSupabaseError,
    getCurrentUser: () => currentUser,
    getSupabaseClient: () => supabase
};
