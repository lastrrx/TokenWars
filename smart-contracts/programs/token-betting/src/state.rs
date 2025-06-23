use anchor_lang::prelude::*;

/// Platform configuration account
#[account]
pub struct PlatformConfig {
    pub authority: Pubkey,           // Admin authority
    pub platform_wallet: Pubkey,     // Wallet for platform fees
    pub platform_fee: u16,           // Platform fee in basis points (e.g., 1500 = 15%)
    pub is_paused: bool,             // Emergency pause flag
    pub total_competitions: u64,     // Total competitions created
}

impl PlatformConfig {
    pub const SIZE: usize = 32 + 32 + 2 + 1 + 8;
}

/// Competition account
#[account]
pub struct Competition {
    pub competition_id: String,      // Unique competition identifier (32 chars max)
    pub token_a: Pubkey,             // First token mint address
    pub token_b: Pubkey,             // Second token mint address
    pub start_time: i64,             // Unix timestamp for start
    pub end_time: i64,               // Unix timestamp for end
    pub status: CompetitionStatus,   // Current status
    pub total_pool: u64,             // Total SOL in pool
    pub token_a_pool: u64,           // SOL bet on token A
    pub token_b_pool: u64,           // SOL bet on token B
    pub winner_token: Option<Pubkey>, // Winning token (set after resolution)
    pub escrow: Pubkey,              // Escrow account for this competition
    pub created_at: i64,             // Creation timestamp
    pub token_a_final_performance: i64, // Final performance percentage * 100
    pub token_b_final_performance: i64, // Final performance percentage * 100
}

impl Competition {
    pub const SIZE: usize = 32 + // competition_id
        32 + 32 +                 // token_a, token_b
        8 + 8 +                   // start_time, end_time
        1 +                       // status
        8 + 8 + 8 +              // pools
        33 +                      // winner_token (Option<Pubkey>)
        32 +                      // escrow
        8 +                       // created_at
        8 + 8;                    // final performances
}

/// Individual bet account
#[account]
pub struct Bet {
    pub user: Pubkey,               // User who placed the bet
    pub competition: Pubkey,        // Competition this bet is for
    pub chosen_token: Pubkey,       // Token the user bet on
    pub amount: u64,                // Amount bet (in lamports)
    pub timestamp: i64,             // When the bet was placed
    pub claimed: bool,              // Whether winnings have been claimed
    pub payout_amount: u64,         // Amount paid out (0 if lost or not claimed)
}

impl Bet {
    pub const SIZE: usize = 32 + 32 + 32 + 8 + 8 + 1 + 8;
}

/// Escrow account (PDA) - stores lamports, no data
/// Seeds: [b"escrow", competition_id]

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CompetitionStatus {
    Upcoming,    // Not started yet
    Active,      // Currently running
    Closed,      // Ended but not resolved
    Resolved,    // Winner determined, can claim
    Paused,      // Temporarily paused
    Cancelled,   // Cancelled, refunds available
}

// TODO: Add additional state structures for:
// - User statistics tracking
// - Token metadata caching
// - Price oracle data
// - Governance proposals
// - Staking accounts
