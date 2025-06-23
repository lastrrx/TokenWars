use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// TODO: Update with actual program ID after deployment
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub mod state;
pub mod errors;

use crate::state::*;
use crate::errors::*;

#[program]
pub mod token_betting {
    use super::*;

    /// Initialize the platform with configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        platform_fee: u16, // Basis points (e.g., 1500 = 15%)
    ) -> Result<()> {
        require!(
            platform_fee <= 10000,
            BettingError::InvalidPlatformFee
        );

        let platform_config = &mut ctx.accounts.platform_config;
        platform_config.authority = ctx.accounts.authority.key();
        platform_config.platform_wallet = ctx.accounts.platform_wallet.key();
        platform_config.platform_fee = platform_fee;
        platform_config.is_paused = false;
        platform_config.total_competitions = 0;

        msg!("Platform initialized with {}% fee", platform_fee as f64 / 100.0);
        Ok(())
    }

    /// Create a new competition
    pub fn create_competition(
        ctx: Context<CreateCompetition>,
        competition_id: String,
        token_a: Pubkey,
        token_b: Pubkey,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        // Validate inputs
        require!(
            start_time > Clock::get()?.unix_timestamp,
            BettingError::InvalidStartTime
        );
        require!(
            end_time > start_time,
            BettingError::InvalidEndTime
        );
        require!(
            token_a != token_b,
            BettingError::DuplicateTokens
        );

        let competition = &mut ctx.accounts.competition;
        competition.competition_id = competition_id;
        competition.token_a = token_a;
        competition.token_b = token_b;
        competition.start_time = start_time;
        competition.end_time = end_time;
        competition.status = CompetitionStatus::Upcoming;
        competition.total_pool = 0;
        competition.token_a_pool = 0;
        competition.token_b_pool = 0;
        competition.winner_token = None;
        competition.escrow = ctx.accounts.escrow.key();
        competition.created_at = Clock::get()?.unix_timestamp;

        // Update platform stats
        let platform_config = &mut ctx.accounts.platform_config;
        platform_config.total_competitions += 1;

        msg!("Competition {} created", competition_id);
        Ok(())
    }

    /// Place a bet on a competition
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        chosen_token: Pubkey,
        amount: u64,
    ) -> Result<()> {
        let competition = &ctx.accounts.competition;
        let clock = Clock::get()?;

        // Validate competition status
        require!(
            clock.unix_timestamp >= competition.start_time,
            BettingError::CompetitionNotStarted
        );
        require!(
            clock.unix_timestamp < competition.end_time,
            BettingError::CompetitionEnded
        );
        require!(
            competition.status == CompetitionStatus::Active,
            BettingError::CompetitionNotActive
        );

        // Validate token choice
        require!(
            chosen_token == competition.token_a || chosen_token == competition.token_b,
            BettingError::InvalidTokenChoice
        );

        // Validate bet amount (0.1 SOL)
        require!(
            amount == 100_000_000, // 0.1 SOL in lamports
            BettingError::InvalidBetAmount
        );

        // Check if user already bet
        let bet = &ctx.accounts.bet;
        require!(
            bet.user == Pubkey::default(),
            BettingError::AlreadyBet
        );

        // Transfer SOL to escrow
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(transfer_ctx, amount)?;

        // Record bet
        let bet = &mut ctx.accounts.bet;
        bet.user = ctx.accounts.user.key();
        bet.competition = competition.key();
        bet.chosen_token = chosen_token;
        bet.amount = amount;
        bet.timestamp = clock.unix_timestamp;
        bet.claimed = false;

        // Update competition pools
        let competition = &mut ctx.accounts.competition;
        competition.total_pool += amount;
        if chosen_token == competition.token_a {
            competition.token_a_pool += amount;
        } else {
            competition.token_b_pool += amount;
        }

        msg!("Bet placed: {} SOL on token {}", amount as f64 / 1e9, chosen_token);
        Ok(())
    }

    /// Resolve competition and determine winner
    /// This should be called by an oracle or admin after competition ends
    pub fn resolve_competition(
        ctx: Context<ResolveCompetition>,
        winner_token: Pubkey,
        token_a_performance: i64, // Percentage * 10000 (e.g., 1234 = 12.34%)
        token_b_performance: i64,
    ) -> Result<()> {
        let competition = &mut ctx.accounts.competition;
        let clock = Clock::get()?;

        // Validate timing
        require!(
            clock.unix_timestamp >= competition.end_time,
            BettingError::CompetitionNotEnded
        );
        require!(
            competition.status == CompetitionStatus::Active || 
            competition.status == CompetitionStatus::Closed,
            BettingError::InvalidCompetitionStatus
        );

        // Validate winner
        require!(
            winner_token == competition.token_a || winner_token == competition.token_b,
            BettingError::InvalidWinner
        );

        // Set winner and update status
        competition.winner_token = Some(winner_token);
        competition.status = CompetitionStatus::Resolved;
        competition.token_a_final_performance = token_a_performance;
        competition.token_b_final_performance = token_b_performance;

        msg!(
            "Competition resolved. Winner: {}, Performance A: {}%, B: {}%",
            winner_token,
            token_a_performance as f64 / 100.0,
            token_b_performance as f64 / 100.0
        );

        Ok(())
    }

    /// Claim winnings from a resolved competition
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let bet = &ctx.accounts.bet;
        let competition = &ctx.accounts.competition;
        let platform_config = &ctx.accounts.platform_config;

        // Validate competition is resolved
        require!(
            competition.status == CompetitionStatus::Resolved,
            BettingError::CompetitionNotResolved
        );

        // Validate winner
        let winner_token = competition.winner_token
            .ok_or(BettingError::NoWinner)?;
        
        // Check if user won
        require!(
            bet.chosen_token == winner_token,
            BettingError::NotWinner
        );

        // Check if already claimed
        require!(
            !bet.claimed,
            BettingError::AlreadyClaimed
        );

        // Calculate payout
        let winner_pool = if winner_token == competition.token_a {
            competition.token_a_pool
        } else {
            competition.token_b_pool
        };

        require!(
            winner_pool > 0,
            BettingError::NoWinnerPool
        );

        // Calculate user's share of winnings
        let total_pool = competition.total_pool;
        let platform_fee_amount = (total_pool as u128 * platform_config.platform_fee as u128 / 10000) as u64;
        let winner_total_pool = total_pool - platform_fee_amount;
        
        let user_payout = (winner_total_pool as u128 * bet.amount as u128 / winner_pool as u128) as u64;

        // Transfer winnings from escrow to user
        **ctx.accounts.escrow.try_borrow_mut_lamports()? -= user_payout;
        **ctx.accounts.user.try_borrow_mut_lamports()? += user_payout;

        // Transfer platform fee
        **ctx.accounts.escrow.try_borrow_mut_lamports()? -= platform_fee_amount;
        **ctx.accounts.platform_wallet.try_borrow_mut_lamports()? += platform_fee_amount;

        // Mark as claimed
        let bet = &mut ctx.accounts.bet;
        bet.claimed = true;
        bet.payout_amount = user_payout;

        msg!("Winnings claimed: {} SOL", user_payout as f64 / 1e9);
        Ok(())
    }

    /// Emergency pause functionality (admin only)
    pub fn emergency_pause(ctx: Context<EmergencyPause>, pause: bool) -> Result<()> {
        let platform_config = &mut ctx.accounts.platform_config;
        platform_config.is_paused = pause;
        
        msg!("Platform {} paused", if pause { "is now" } else { "is no longer" });
        Ok(())
    }

    /// Emergency refund for a paused competition (admin only)
    pub fn emergency_refund(ctx: Context<EmergencyRefund>) -> Result<()> {
        let bet = &ctx.accounts.bet;
        let competition = &ctx.accounts.competition;
        
        // Validate competition is paused or cancelled
        require!(
            competition.status == CompetitionStatus::Paused ||
            competition.status == CompetitionStatus::Cancelled,
            BettingError::CompetitionNotPaused
        );

        // Check if already refunded
        require!(
            !bet.claimed,
            BettingError::AlreadyRefunded
        );

        // Refund the bet amount
        **ctx.accounts.escrow.try_borrow_mut_lamports()? -= bet.amount;
        **ctx.accounts.user.try_borrow_mut_lamports()? += bet.amount;

        // Mark as claimed/refunded
        let bet = &mut ctx.accounts.bet;
        bet.claimed = true;
        bet.payout_amount = bet.amount;

        msg!("Emergency refund: {} SOL to user {}", bet.amount as f64 / 1e9, bet.user);
        Ok(())
    }
}

// Account validation structs

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PlatformConfig::SIZE,
        seeds = [b"platform_config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Platform wallet for receiving fees
    pub platform_wallet: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(competition_id: String)]
pub struct CreateCompetition<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Competition::SIZE,
        seeds = [b"competition", competition_id.as_bytes()],
        bump
    )]
    pub competition: Account<'info, Competition>,
    
    #[account(
        init,
        payer = authority,
        space = 0,
        seeds = [b"escrow", competition_id.as_bytes()],
        bump
    )]
    /// CHECK: Escrow account for holding bets
    pub escrow: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"platform_config"],
        bump,
        constraint = !platform_config.is_paused @ BettingError::PlatformPaused,
        constraint = platform_config.authority == authority.key() @ BettingError::Unauthorized
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Bet::SIZE,
        seeds = [b"bet", competition.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(
        mut,
        seeds = [b"competition", competition.competition_id.as_bytes()],
        bump
    )]
    pub competition: Account<'info, Competition>,
    
    #[account(
        mut,
        seeds = [b"escrow", competition.competition_id.as_bytes()],
        bump
    )]
    /// CHECK: Escrow account
    pub escrow: AccountInfo<'info>,
    
    #[account(
        seeds = [b"platform_config"],
        bump,
        constraint = !platform_config.is_paused @ BettingError::PlatformPaused
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveCompetition<'info> {
    #[account(
        mut,
        seeds = [b"competition", competition.competition_id.as_bytes()],
        bump
    )]
    pub competition: Account<'info, Competition>,
    
    #[account(
        seeds = [b"platform_config"],
        bump,
        constraint = platform_config.authority == authority.key() @ BettingError::Unauthorized
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        mut,
        seeds = [b"bet", competition.key().as_ref(), user.key().as_ref()],
        bump,
        constraint = bet.user == user.key() @ BettingError::Unauthorized
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(
        seeds = [b"competition", competition.competition_id.as_bytes()],
        bump
    )]
    pub competition: Account<'info, Competition>,
    
    #[account(
        mut,
        seeds = [b"escrow", competition.competition_id.as_bytes()],
        bump
    )]
    /// CHECK: Escrow account
    pub escrow: AccountInfo<'info>,
    
    #[account(
        seeds = [b"platform_config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(mut)]
    /// CHECK: Platform wallet for fees
    pub platform_wallet: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(
        mut,
        seeds = [b"platform_config"],
        bump,
        constraint = platform_config.authority == authority.key() @ BettingError::Unauthorized
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmergencyRefund<'info> {
    #[account(
        mut,
        seeds = [b"bet", competition.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(
        seeds = [b"competition", competition.competition_id.as_bytes()],
        bump
    )]
    pub competition: Account<'info, Competition>,
    
    #[account(
        mut,
        seeds = [b"escrow", competition.competition_id.as_bytes()],
        bump
    )]
    /// CHECK: Escrow account
    pub escrow: AccountInfo<'info>,
    
    #[account(
        seeds = [b"platform_config"],
        bump,
        constraint = platform_config.authority == authority.key() @ BettingError::Unauthorized
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(mut)]
    /// CHECK: User receiving refund
    pub user: AccountInfo<'info>,
    
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// TODO: Implement additional features:
// - Multi-token competitions
// - Confidence-based betting
// - Time-locked withdrawals
// - Governance for parameter updates
// - Fee distribution to stakers
// - Competition templates
