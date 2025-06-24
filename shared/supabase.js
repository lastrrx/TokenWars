// =====================================================
// Solana Token Betting Platform - Frontend Supabase Configuration
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://lavbfujrqmxiyfkfgcqy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdmJmdWpycW14aXlma2ZnY3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjYwNjIsImV4cCI6MjA2NjM0MjA2Mn0.hlDZzchNyhcEX4KW5YNXwcaq3WYDWkc7IeSdflmAYbs';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
    },
    db: {
        schema: 'public'
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// =====================================================
// AUTHENTICATION HELPERS
// =====================================================

/**
 * Set user context for the current session
 * @param {string} walletAddress - User's wallet address
 * @param {string} role - User role (default: 'user')
 */
export async function setUserContext(walletAddress, role = 'user') {
    try {
        const { error } = await supabase.rpc('set_user_context', {
            wallet_addr: walletAddress,
            user_role: role
        });
        
        if (error) throw error;
        console.log('User context set:', { walletAddress, role });
    } catch (error) {
        console.error('Error setting user context:', error);
        throw error;
    }
}

/**
 * Clear user context
 */
export async function clearUserContext() {
    try {
        const { error } = await supabase.rpc('clear_user_context');
        if (error) throw error;
        console.log('User context cleared');
    } catch (error) {
        console.error('Error clearing user context:', error);
    }
}

// =====================================================
// USER OPERATIONS
// =====================================================

export const UserAPI = {
    /**
     * Get or create user profile
     * @param {string} walletAddress 
     */
    async getOrCreateProfile(walletAddress) {
        try {
            // First, set user context
            await setUserContext(walletAddress);
            
            // Try to get existing user
            let { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('wallet_address', walletAddress)
                .single();
            
            // If user doesn't exist, create one
            if (error && error.code === 'PGRST116') {
                const referralCode = await this.generateReferralCode();
                
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert([{
                        wallet_address: walletAddress,
                        referral_code: referralCode
                    }])
                    .select()
                    .single();
                
                if (createError) throw createError;
                user = newUser;
            } else if (error) {
                throw error;
            }
            
            return user;
        } catch (error) {
            console.error('Error getting/creating user profile:', error);
            throw error;
        }
    },

    /**
     * Update user profile
     * @param {string} walletAddress 
     * @param {Object} updates 
     */
    async updateProfile(walletAddress, updates) {
        try {
            await setUserContext(walletAddress);
            
            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('wallet_address', walletAddress)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    },

    /**
     * Get user statistics
     * @param {string} walletAddress 
     */
    async getStats(walletAddress) {
        try {
            const { data, error } = await supabase
                .from('user_betting_summary')
                .select('*')
                .eq('wallet_address', walletAddress)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    },

    /**
     * Generate unique referral code
     */
    async generateReferralCode() {
        let code;
        let isUnique = false;
        
        while (!isUnique) {
            code = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            const { data } = await supabase
                .from('users')
                .select('referral_code')
                .eq('referral_code', code)
                .single();
            
            if (!data) isUnique = true;
        }
        
        return code;
    }
};

// =====================================================
// COMPETITION OPERATIONS
// =====================================================

export const CompetitionAPI = {
    /**
     * Get all active competitions
     */
    async getActive() {
        try {
            const { data, error } = await supabase
                .from('active_competitions')
                .select('*')
                .order('start_time', { ascending: true });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting active competitions:', error);
            throw error;
        }
    },

    /**
     * Get competition by ID
     * @param {string} competitionId 
     */
    async getById(competitionId) {
        try {
            const { data, error } = await supabase
                .from('competitions')
                .select('*')
                .eq('competition_id', competitionId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting competition:', error);
            throw error;
        }
    },

    /**
     * Get competition results
     * @param {string} competitionId 
     */
    async getResults(competitionId) {
        try {
            const { data, error } = await supabase
                .from('competition_results')
                .select('*')
                .eq('competition_id', competitionId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting competition results:', error);
            throw error;
        }
    }
};

// =====================================================
// BETTING OPERATIONS
// =====================================================

export const BettingAPI = {
    /**
     * Place a bet
     * @param {Object} betData 
     */
    async placeBet(betData) {
        try {
            await setUserContext(betData.user_wallet);
            
            const { data, error } = await supabase
                .from('bets')
                .insert([betData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error placing bet:', error);
            throw error;
        }
    },

    /**
     * Get user's betting history
     * @param {string} walletAddress 
     */
    async getUserBets(walletAddress) {
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
                .order('timestamp', { ascending: false });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting user bets:', error);
            throw error;
        }
    },

    /**
     * Get unclaimed winnings
     * @param {string} walletAddress 
     */
    async getUnclaimedWinnings(walletAddress) {
        try {
            await setUserContext(walletAddress);
            
            const { data, error } = await supabase
                .from('bets')
                .select(`
                    *,
                    competitions (
                        token_a_symbol,
                        token_b_symbol,
                        end_time
                    )
                `)
                .eq('user_wallet', walletAddress)
                .eq('status', 'WON')
                .is('claimed_at', null);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting unclaimed winnings:', error);
            throw error;
        }
    }
};

// =====================================================
// LEADERBOARD OPERATIONS
// =====================================================

export const LeaderboardAPI = {
    /**
     * Get top users
     * @param {number} limit 
     */
    async getTop(limit = 100) {
        try {
            const { data, error } = await supabase
                .from('leaderboards')
                .select('*')
                .order('total_score', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw error;
        }
    },

    /**
     * Get user rank
     * @param {string} walletAddress 
     */
    async getUserRank(walletAddress) {
        try {
            const { data, error } = await supabase
                .from('leaderboards')
                .select('ranking, total_score, competitions_won')
                .eq('user_wallet', walletAddress)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting user rank:', error);
            throw error;
        }
    }
};

// =====================================================
// REAL-TIME SUBSCRIPTIONS
// =====================================================

export const RealtimeAPI = {
    /**
     * Subscribe to competition updates
     * @param {string} competitionId 
     * @param {Function} callback 
     */
    subscribeToCompetition(competitionId, callback) {
        return supabase
            .channel(`competition-${competitionId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'competitions',
                filter: `competition_id=eq.${competitionId}`
            }, callback)
            .subscribe();
    },

    /**
     * Subscribe to new bets for a competition
     * @param {string} competitionId 
     * @param {Function} callback 
     */
    subscribeToNewBets(competitionId, callback) {
        return supabase
            .channel(`bets-${competitionId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'bets',
                filter: `competition_id=eq.${competitionId}`
            }, callback)
            .subscribe();
    },

    /**
     * Subscribe to leaderboard changes
     * @param {Function} callback 
     */
    subscribeToLeaderboard(callback) {
        return supabase
            .channel('leaderboard-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'leaderboards'
            }, callback)
            .subscribe();
    },

    /**
     * Unsubscribe from a channel
     * @param {Object} subscription 
     */
    unsubscribe(subscription) {
        if (subscription) {
            subscription.unsubscribe();
        }
    }
};

// =====================================================
// ADMIN OPERATIONS (for admin panel)
// =====================================================

export const AdminAPI = {
    /**
     * Authenticate admin user
     * @param {string} walletAddress 
     * @param {string} pin 
     */
    async authenticate(walletAddress, pin) {
        try {
            const { data, error } = await supabase.rpc('authenticate_admin', {
                wallet_addr: walletAddress,
                pin_code: pin
            });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error authenticating admin:', error);
            throw error;
        }
    },

    /**
     * Get system statistics
     */
    async getSystemStats() {
        try {
            const { data, error } = await supabase.rpc('get_system_statistics');
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting system stats:', error);
            throw error;
        }
    }
};

// =====================================================
// ERROR HANDLING
// =====================================================

export function handleSupabaseError(error) {
    console.error('Supabase error:', error);
    
    switch (error.code) {
        case 'PGRST116':
            return 'No data found';
        case '23505':
            return 'This record already exists';
        case '23503':
            return 'Referenced record not found';
        case '42501':
            return 'Permission denied';
        default:
            return error.message || 'An unknown error occurred';
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format Supabase timestamp for display
 * @param {string} timestamp 
 */
export function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

/**
 * Check if user has permission for action
 * @param {string} walletAddress 
 * @param {string} action 
 */
export async function checkPermission(walletAddress, action) {
    try {
        const { data, error } = await supabase.rpc('check_user_permission', {
            wallet_addr: walletAddress,
            action_name: action
        });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}

// =====================================================
// EXPORTS
// =====================================================

export default {
    supabase,
    setUserContext,
    clearUserContext,
    UserAPI,
    CompetitionAPI,
    BettingAPI,
    LeaderboardAPI,
    RealtimeAPI,
    AdminAPI,
    handleSupabaseError,
    formatTimestamp,
    checkPermission
};
