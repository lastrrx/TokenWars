/**
 * Shared Type Definitions
 * Data structures used by both frontend and backend
 */

// User Types
const UserTypes = {
    // User object structure
    User: {
        wallet_address: 'string', // Solana wallet address
        username: 'string|null', // Optional username
        created_at: 'Date',
        last_login: 'Date|null',
        total_bets: 'number',
        total_winnings: 'number', // in SOL
        win_rate: 'number', // percentage
        current_streak: 'number',
        is_banned: 'boolean',
        ban_reason: 'string|null'
    },
    
    // User profile response
    UserProfile: {
        ...this.User,
        recent_bets: 'Bet[]',
        statistics: 'UserStatistics',
        achievements: 'Achievement[]'
    },
    
    // User statistics
    UserStatistics: {
        total_volume: 'number', // Total SOL wagered
        biggest_win: 'number',
        favorite_token: 'string|null',
        best_streak: 'number',
        competitions_played: 'number',
        competitions_won: 'number',
        roi: 'number' // Return on investment percentage
    }
};

// Competition Types
const CompetitionTypes = {
    // Competition status enum
    CompetitionStatus: {
        UPCOMING: 'upcoming',
        ACTIVE: 'active',
        CLOSED: 'closed',
        RESOLVED: 'resolved',
        PAUSED: 'paused',
        CANCELLED: 'cancelled'
    },
    
    // Competition object
    Competition: {
        competition_id: 'string', // UUID
        token_a: 'string', // Token address
        token_b: 'string', // Token address
        token_a_symbol: 'string',
        token_b_symbol: 'string',
        start_time: 'Date',
        end_time: 'Date',
        status: 'CompetitionStatus',
        total_pool: 'number', // in SOL
        winner_token: 'string|null',
        token_a_start_price: 'number|null',
        token_b_start_price: 'number|null',
        token_a_end_price: 'number|null',
        token_b_end_price: 'number|null',
        token_a_performance: 'number|null', // percentage
        token_b_performance: 'number|null',
        created_by: 'string',
        created_at: 'Date',
        resolved_at: 'Date|null',
        transaction_signature: 'string|null'
    },
    
    // Competition with additional stats
    CompetitionDetail: {
        ...this.Competition,
        participant_count: 'number',
        token_a_bets: 'number',
        token_b_bets: 'number',
        token_a_pool: 'number',
        token_b_pool: 'number',
        current_prices: 'TokenPrices|null'
    },
    
    // Token price data
    TokenPrices: {
        token_a_price: 'number',
        token_a_change_24h: 'number',
        token_a_market_cap: 'number',
        token_b_price: 'number',
        token_b_change_24h: 'number',
        token_b_market_cap: 'number',
        last_updated: 'Date'
    }
};

// Betting Types
const BettingTypes = {
    // Bet status enum
    BetStatus: {
        PENDING: 'pending',
        CLAIMED: 'claimed',
        EXPIRED: 'expired',
        REFUNDED: 'refunded'
    },
    
    // Bet object
    Bet: {
        bet_id: 'string', // UUID
        user_wallet: 'string',
        competition_id: 'string',
        chosen_token: 'string',
        amount: 'number', // in SOL
        transaction_signature: 'string',
        timestamp: 'Date',
        payout_amount: 'number|null',
        claimed_status: 'BetStatus',
        claim_transaction: 'string|null',
        claimed_at: 'Date|null'
    },
    
    // Bet with competition details
    BetDetail: {
        ...this.Bet,
        competition: 'Competition',
        won: 'boolean|null',
        potential_payout: 'number|null'
    },
    
    // Place bet request
    PlaceBetRequest: {
        competition_id: 'string',
        chosen_token: 'string',
        wallet_address: 'string',
        transaction_signature: 'string'
    }
};

// Admin Types
const AdminTypes = {
    // Admin roles
    AdminRole: {
        SUPER_ADMIN: 'super_admin',
        ADMIN: 'admin',
        MODERATOR: 'moderator',
        VIEWER: 'viewer'
    },
    
    // Admin user
    AdminUser: {
        admin_id: 'string',
        wallet_address: 'string',
        username: 'string',
        role: 'AdminRole',
        permissions: 'object', // JSON permissions
        created_at: 'Date',
        last_login: 'Date|null',
        is_active: 'boolean'
    },
    
    // Admin action log
    AdminLog: {
        log_id: 'string',
        admin_id: 'string',
        action: 'string',
        details: 'object',
        ip_address: 'string',
        timestamp: 'Date',
        affected_user: 'string|null',
        affected_competition: 'string|null',
        severity: 'string'
    }
};

// API Types
const APITypes = {
    // Standard API response
    APIResponse: {
        success: 'boolean',
        data: 'any|null',
        error: 'APIError|null',
        timestamp: 'Date'
    },
    
    // API error
    APIError: {
        code: 'string',
        message: 'string',
        details: 'object|null',
        status_code: 'number'
    },
    
    // Pagination
    PaginationParams: {
        page: 'number',
        limit: 'number',
        sort_by: 'string|null',
        sort_order: 'asc|desc'
    },
    
    // Paginated response
    PaginatedResponse: {
        data: 'array',
        pagination: {
            page: 'number',
            limit: 'number',
            total: 'number',
            total_pages: 'number',
            has_next: 'boolean',
            has_prev: 'boolean'
        }
    }
};

// WebSocket Types
const WebSocketTypes = {
    // WebSocket message
    WebSocketMessage: {
        type: 'string',
        data: 'any',
        timestamp: 'Date',
        id: 'string|null'
    },
    
    // Competition update
    CompetitionUpdate: {
        competition_id: 'string',
        type: 'new_bet|status_change|price_update|resolved',
        data: 'object'
    },
    
    // Price update
    PriceUpdate: {
        token_address: 'string',
        price: 'number',
        change_24h: 'number',
        timestamp: 'Date'
    }
};

// Token Types
const TokenTypes = {
    // Token info
    TokenInfo: {
        address: 'string',
        symbol: 'string',
        name: 'string',
        decimals: 'number',
        logo_url: 'string|null',
        market_cap: 'number',
        volume_24h: 'number',
        price: 'number',
        price_change_24h: 'number',
        holders: 'number|null',
        liquidity: 'number|null'
    },
    
    // Token pair
    TokenPair: {
        token_a: 'TokenInfo',
        token_b: 'TokenInfo',
        market_cap_difference: 'number', // percentage
        correlation: 'number|null'
    }
};

// Leaderboard Types
const LeaderboardTypes = {
    // Leaderboard period
    LeaderboardPeriod: {
        DAILY: 'daily',
        WEEKLY: 'weekly',
        MONTHLY: 'monthly',
        ALL_TIME: 'all_time'
    },
    
    // Leaderboard entry
    LeaderboardEntry: {
        rank: 'number',
        wallet_address: 'string',
        username: 'string|null',
        competitions_played: 'number',
        competitions_won: 'number',
        win_rate: 'number',
        total_winnings: 'number',
        change: 'number|null' // Rank change from previous period
    }
};

// Transaction Types
const TransactionTypes = {
    // Transaction status
    TransactionStatus: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        FAILED: 'failed',
        EXPIRED: 'expired'
    },
    
    // Transaction info
    TransactionInfo: {
        signature: 'string',
        status: 'TransactionStatus',
        type: 'bet|claim|refund',
        amount: 'number',
        from: 'string',
        to: 'string',
        timestamp: 'Date',
        slot: 'number|null',
        confirmation_status: 'string|null'
    }
};

// Validation Schemas (for use with validation libraries)
const ValidationSchemas = {
    // Username validation
    username: {
        type: 'string',
        pattern: '^[a-zA-Z0-9_]{3,20}$',
        minLength: 3,
        maxLength: 20
    },
    
    // Wallet address validation
    walletAddress: {
        type: 'string',
        pattern: '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    },
    
    // Competition ID validation
    competitionId: {
        type: 'string',
        format: 'uuid'
    },
    
    // Amount validation
    betAmount: {
        type: 'number',
        minimum: 0.1,
        maximum: 1000,
        multipleOf: 0.1
    }
};

// Export all types
const TYPES = {
    User: UserTypes,
    Competition: CompetitionTypes,
    Betting: BettingTypes,
    Admin: AdminTypes,
    API: APITypes,
    WebSocket: WebSocketTypes,
    Token: TokenTypes,
    Leaderboard: LeaderboardTypes,
    Transaction: TransactionTypes,
    Validation: ValidationSchemas
};

// Helper function to validate type
function validateType(data, typeDefinition) {
    // TODO: Implement runtime type validation
    // This could use a library like joi, yup, or custom validation
    return true;
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TYPES;
    module.exports.validateType = validateType;
} else if (typeof window !== 'undefined') {
    window.TYPES = TYPES;
    window.validateType = validateType;
}

// TODO: Add types for:
// - Analytics events
// - Notification preferences
// - Achievement system
// - Governance proposals
// - Staking mechanisms
