/**
 * Betting Logic Module
 * Handles bet placement, validation, escrow management, and payouts
 */

const { Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { Program, AnchorProvider } = require('@coral-xyz/anchor');
const database = require('./database');
const { broadcastUpdate } = require('./server');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Solana connection
const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
);

// Betting constants
const BET_AMOUNT = parseFloat(process.env.BET_AMOUNT_SOL) || 0.1;
const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 15;

/**
 * Place a bet
 */
async function placeBet(req, res) {
    const { 
        competitionId, 
        chosenToken, 
        walletAddress,
        transactionSignature 
    } = req.body;
    
    try {
        // Validate input
        const validation = validateBetInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        
        // Get competition details
        const competition = await database.getCompetitionById(competitionId);
        
        if (!competition) {
            return res.status(404).json({ error: 'Competition not found' });
        }
        
        // Check competition status
        if (competition.status !== 'active') {
            return res.status(400).json({ error: 'Competition is not active' });
        }
        
        // Verify chosen token is part of competition
        if (chosenToken !== competition.token_a && chosenToken !== competition.token_b) {
            return res.status(400).json({ error: 'Invalid token choice' });
        }
        
        // TODO: Verify transaction on-chain
        // This would check that the user actually sent SOL to the escrow
        // const isValid = await verifyTransaction(transactionSignature, walletAddress, BET_AMOUNT);
        
        // Store bet in database
        const bet = await database.placeBet({
            userWallet: walletAddress,
            competitionId,
            chosenToken,
            amount: BET_AMOUNT,
            transactionSignature
        });
        
        // Broadcast update
        broadcastUpdate('competition', {
            competitionId,
            type: 'new_bet',
            totalPool: competition.total_pool + BET_AMOUNT,
            participantCount: competition.participant_count + 1
        });
        
        res.json({
            success: true,
            bet,
            message: 'Bet placed successfully'
        });
        
    } catch (error) {
        logger.error('Place bet error:', error);
        
        if (error.message === 'User already placed a bet on this competition') {
            return res.status(409).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Failed to place bet' });
    }
}

/**
 * Get user bets
 */
async function getUserBets(req, res) {
    const { wallet } = req.params;
    const { limit = 50 } = req.query;
    
    try {
        const bets = await database.getUserBets(wallet, parseInt(limit));
        
        res.json(bets);
        
    } catch (error) {
        logger.error('Get user bets error:', error);
        res.status(500).json({ error: 'Failed to fetch user bets' });
    }
}

/**
 * Claim winnings
 */
async function claimWinnings(req, res) {
    const { wallet, betId } = req.params;
    
    try {
        // Get bet details
        const bets = await database.getUserBets(wallet, 1000);
        const bet = bets.find(b => b.bet_id === betId);
        
        if (!bet) {
            return res.status(404).json({ error: 'Bet not found' });
        }
        
        // Verify ownership
        if (bet.user_wallet !== wallet) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Check if already claimed
        if (bet.claimed_status === 'claimed') {
            return res.status(400).json({ error: 'Winnings already claimed' });
        }
        
        // Check if bet won
        if (!bet.won) {
            return res.status(400).json({ error: 'This bet did not win' });
        }
        
        // Check if payout is calculated
        if (!bet.payout_amount) {
            return res.status(400).json({ error: 'Payout not yet calculated' });
        }
        
        // TODO: Create and send transaction to transfer winnings
        // This would interact with the smart contract to release funds
        const claimTransaction = await createClaimTransaction(
            wallet,
            bet.payout_amount,
            betId
        );
        
        // For now, we'll simulate the transaction
        const mockTxSignature = 'mock_' + Date.now();
        
        // Update bet as claimed
        await database.updateBetPayout(
            betId,
            bet.payout_amount,
            mockTxSignature
        );
        
        res.json({
            success: true,
            transaction: mockTxSignature,
            amount: bet.payout_amount,
            message: 'Winnings claimed successfully'
        });
        
    } catch (error) {
        logger.error('Claim winnings error:', error);
        res.status(500).json({ error: 'Failed to claim winnings' });
    }
}

/**
 * Validate bet input
 */
function validateBetInput(data) {
    const { competitionId, chosenToken, walletAddress, transactionSignature } = data;
    
    if (!competitionId) {
        return { valid: false, error: 'Competition ID is required' };
    }
    
    if (!chosenToken) {
        return { valid: false, error: 'Token choice is required' };
    }
    
    if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
        return { valid: false, error: 'Valid wallet address is required' };
    }
    
    if (!transactionSignature) {
        return { valid: false, error: 'Transaction signature is required' };
    }
    
    return { valid: true };
}

/**
 * Verify transaction on-chain
 */
async function verifyTransaction(signature, expectedSender, expectedAmount) {
    try {
        // Get transaction details
        const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed'
        });
        
        if (!tx) {
            return false;
        }
        
        // Check if transaction is successful
        if (tx.meta.err !== null) {
            return false;
        }
        
        // TODO: Parse transaction and verify:
        // 1. Sender is the expected wallet
        // 2. Amount is correct
        // 3. Recipient is the escrow account
        // 4. Transaction is recent (within last hour)
        
        // For now, return true for development
        return true;
        
    } catch (error) {
        logger.error('Transaction verification error:', error);
        return false;
    }
}

/**
 * Create claim transaction
 */
async function createClaimTransaction(walletAddress, amount, betId) {
    try {
        // TODO: Implement actual smart contract interaction
        // This would:
        // 1. Load the betting program
        // 2. Create instruction to claim winnings
        // 3. Return transaction for user to sign
        
        const transaction = new Transaction();
        
        // Add claim instruction
        // const claimIx = await program.methods
        //     .claimWinnings(betId)
        //     .accounts({
        //         user: walletAddress,
        //         escrow: escrowAccount,
        //         systemProgram: SystemProgram.programId
        //     })
        //     .instruction();
        
        // transaction.add(claimIx);
        
        return transaction;
        
    } catch (error) {
        logger.error('Create claim transaction error:', error);
        throw error;
    }
}

/**
 * Check if Solana address is valid
 */
function isValidSolanaAddress(address) {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Calculate escrow account address
 */
async function getEscrowAccount(competitionId) {
    // TODO: Implement PDA derivation
    // const [escrowPda] = await PublicKey.findProgramAddress(
    //     [
    //         Buffer.from('escrow'),
    //         Buffer.from(competitionId)
    //     ],
    //     programId
    // );
    // return escrowPda;
    
    return new PublicKey('11111111111111111111111111111111'); // Placeholder
}

/**
 * Emergency withdraw (admin only)
 */
async function emergencyWithdraw(competitionId, adminWallet) {
    try {
        // TODO: Implement emergency withdrawal
        // This would allow admins to return funds in case of issues
        
        logger.info(`Emergency withdraw initiated for competition ${competitionId} by ${adminWallet}`);
        
        // Get all bets for competition
        const bets = await database.getCompetitionBets(competitionId);
        
        // Create transactions to refund all bets
        // ...
        
        return true;
        
    } catch (error) {
        logger.error('Emergency withdraw error:', error);
        throw error;
    }
}

module.exports = {
    placeBet,
    getUserBets,
    claimWinnings,
    emergencyWithdraw
};

// TODO: Implement additional features:
// - Batch claim transactions
// - Bet history analytics
// - Refund mechanism
// - Betting limits per user
// - Anti-manipulation measures
// - Gas fee estimation
