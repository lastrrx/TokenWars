use anchor_lang::prelude::*;

#[error_code]
pub enum BettingError {
    #[msg("Invalid platform fee percentage")]
    InvalidPlatformFee,
    
    #[msg("Competition start time must be in the future")]
    InvalidStartTime,
    
    #[msg("Competition end time must be after start time")]
    InvalidEndTime,
    
    #[msg("Cannot use the same token twice")]
    DuplicateTokens,
    
    #[msg("Competition has not started yet")]
    CompetitionNotStarted,
    
    #[msg("Competition has already ended")]
    CompetitionEnded,
    
    #[msg("Competition is not active")]
    CompetitionNotActive,
    
    #[msg("Invalid token choice")]
    InvalidTokenChoice,
    
    #[msg("Invalid bet amount")]
    InvalidBetAmount,
    
    #[msg("User has already placed a bet on this competition")]
    AlreadyBet,
    
    #[msg("Competition has not ended yet")]
    CompetitionNotEnded,
    
    #[msg("Invalid competition status")]
    InvalidCompetitionStatus,
    
    #[msg("Invalid winner token")]
    InvalidWinner,
    
    #[msg("Competition not resolved yet")]
    CompetitionNotResolved,
    
    #[msg("No winner set for competition")]
    NoWinner,
    
    #[msg("User did not win this competition")]
    NotWinner,
    
    #[msg("Winnings already claimed")]
    AlreadyClaimed,
    
    #[msg("No winner pool available")]
    NoWinnerPool,
    
    #[msg("Platform is currently paused")]
    PlatformPaused,
    
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Competition is not paused")]
    CompetitionNotPaused,
    
    #[msg("Already refunded")]
    AlreadyRefunded,
    
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance,
    
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("Invalid oracle data")]
    InvalidOracleData,
    
    #[msg("Competition ID too long")]
    CompetitionIdTooLong,
}

// TODO: Add more specific error types for:
// - Oracle failures
// - Network issues
// - Invalid state transitions
// - Governance errors
// - Staking errors
