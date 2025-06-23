/**
 * Smart Contract Test Suite
 * Tests for Solana program functionality
 */

const anchor = require('@coral-xyz/anchor');
const { SystemProgram } = anchor.web3;
const assert = require('assert');

describe('token-betting', () => {
    // Configure the client to use the local cluster
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    const program = anchor.workspace.TokenBetting;
    
    // Test accounts
    let platformConfig;
    let platformWallet;
    let authority;
    let user1;
    let user2;
    let competition;
    let escrow;
    
    before(async () => {
        // Generate keypairs for testing
        authority = provider.wallet;
        platformWallet = anchor.web3.Keypair.generate();
        user1 = anchor.web3.Keypair.generate();
        user2 = anchor.web3.Keypair.generate();
        
        // Airdrop SOL to test accounts
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(user1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
        );
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(user2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
        );
    });
    
    describe('initialize', () => {
        it('initializes the platform', async () => {
            const [platformConfigPda] = await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from('platform_config')],
                program.programId
            );
            
            platformConfig = platformConfigPda;
            
            await program.methods
                .initialize(1500) // 15% platform fee
                .accounts({
                    platformConfig,
                    authority: authority.publicKey,
                    platformWallet: platformWallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            
            // Fetch and verify platform config
            const config = await program.account.platformConfig.fetch(platformConfig);
            assert.equal(config.authority.toString(), authority.publicKey.toString());
            assert.equal(config.platformWallet.toString(), platformWallet.publicKey.toString());
            assert.equal(config.platformFee, 1500);
            assert.equal(config.isPaused, false);
        });
        
        it('prevents re-initialization', async () => {
            try {
                await program.methods
                    .initialize(2000)
                    .accounts({
                        platformConfig,
                        authority: authority.publicKey,
                        platformWallet: platformWallet.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                    
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.toString().includes('already in use'));
            }
        });
    });
    
    describe('create_competition', () => {
        const competitionId = 'test-competition-001';
        const tokenA = anchor.web3.Keypair.generate().publicKey;
        const tokenB = anchor.web3.Keypair.generate().publicKey;
        const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        const endTime = startTime + 86400; // 24 hours duration
        
        it('creates a competition', async () => {
            const [competitionPda] = await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from('competition'), Buffer.from(competitionId)],
                program.programId
            );
            
            const [escrowPda] = await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from('escrow'), Buffer.from(competitionId)],
                program.programId
            );
            
            competition = competitionPda;
            escrow = escrowPda;
            
            await program.methods
                .createCompetition(competitionId, tokenA, tokenB, new anchor.BN(startTime), new anchor.BN(endTime))
                .accounts({
                    competition,
                    escrow,
                    platformConfig,
                    authority: authority.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            
            // Verify competition data
            const comp = await program.account.competition.fetch(competition);
            assert.equal(comp.competitionId, competitionId);
            assert.equal(comp.tokenA.toString(), tokenA.toString());
            assert.equal(comp.tokenB.toString(), tokenB.toString());
            assert.equal(comp.status.upcoming !== undefined, true);
            assert.equal(comp.totalPool.toNumber(), 0);
        });
        
        it('prevents duplicate tokens', async () => {
            const duplicateId = 'duplicate-test';
            const [dupCompetition] = await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from('competition'), Buffer.from(duplicateId)],
                program.programId
            );
            
            const [dupEscrow] = await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from('escrow'), Buffer.from(duplicateId)],
                program.programId
            );
            
            try {
                await program.methods
                    .createCompetition(duplicateId, tokenA, tokenA, new anchor.BN(startTime), new anchor.BN(endTime))
                    .accounts({
                        competition: dupCompetition,
                        escrow: dupEscrow,
                        platformConfig,
                        authority: authority.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                    
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.toString().includes('DuplicateTokens'));
            }
        });
    });
    
    describe('place_bet', () => {
        let userBet1;
        const betAmount = new anchor.BN(100_000_000); // 0.1 SOL
        
        before(async () => {
            // Wait for competition to start (in real tests, you'd mock time)
            // For now, we'll update the competition manually
            // TODO: Implement time manipulation for tests
        });
        
        it('places a bet successfully', async () => {
            const [betPda] = await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from('bet'), competition.toBuffer(), user1.publicKey.toBuffer()],
                program.programId
            );
            
            userBet1 = betPda;
            
            // Get competition data
            const comp = await program.account.competition.fetch(competition);
            
            // For testing, we'll assume competition is active
            // In production, you'd need to wait or mock time
            
            const tx = await program.methods
                .placeBet(comp.tokenA, betAmount)
                .accounts({
                    bet: userBet1,
                    competition,
                    escrow,
                    platformConfig,
                    user: user1.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([user1])
                .rpc();
            
            // Verify bet was placed
            const bet = await program.account.bet.fetch(userBet1);
            assert.equal(bet.user.toString(), user1.publicKey.toString());
            assert.equal(bet.chosenToken.toString(), comp.tokenA.toString());
            assert.equal(bet.amount.toNumber(), betAmount.toNumber());
            assert.equal(bet.claimed, false);
            
            // Verify escrow received funds
            const escrowBalance = await provider.connection.getBalance(escrow);
            assert.equal(escrowBalance, betAmount.toNumber());
        });
        
        it('prevents duplicate bets from same user', async () => {
            const comp = await program.account.competition.fetch(competition);
            
            try {
                await program.methods
                    .placeBet(comp.tokenB, betAmount)
                    .accounts({
                        bet: userBet1,
                        competition,
                        escrow,
                        platformConfig,
                        user: user1.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([user1])
                    .rpc();
                    
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.toString().includes('AlreadyBet'));
            }
        });
        
        it('validates bet amount', async () => {
            const [betPda2] = await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from('bet'), competition.toBuffer(), user2.publicKey.toBuffer()],
                program.programId
            );
            
            const comp = await program.account.competition.fetch(competition);
            const wrongAmount = new anchor.BN(50_000_000); // 0.05 SOL
            
            try {
                await program.methods
                    .placeBet(comp.tokenA, wrongAmount)
                    .accounts({
                        bet: betPda2,
                        competition,
                        escrow,
                        platformConfig,
                        user: user2.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([user2])
                    .rpc();
                    
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.toString().includes('InvalidBetAmount'));
            }
        });
    });
    
    describe('resolve_competition', () => {
        it('resolves competition with winner', async () => {
            const comp = await program.account.competition.fetch(competition);
            const tokenAPerformance = new anchor.BN(1523); // 15.23%
            const tokenBPerformance = new anchor.BN(-234); // -2.34%
            
            await program.methods
                .resolveCompetition(comp.tokenA, tokenAPerformance, tokenBPerformance)
                .accounts({
                    competition,
                    platformConfig,
                    authority: authority.publicKey,
                })
                .rpc();
            
            // Verify resolution
            const resolvedComp = await program.account.competition.fetch(competition);
            assert.equal(resolvedComp.status.resolved !== undefined, true);
            assert.equal(resolvedComp.winnerToken.toString(), comp.tokenA.toString());
            assert.equal(resolvedComp.tokenAFinalPerformance.toNumber(), tokenAPerformance.toNumber());
            assert.equal(resolvedComp.tokenBFinalPerformance.toNumber(), tokenBPerformance.toNumber());
        });
        
        it('only allows authority to resolve', async () => {
            // Try to resolve with non-authority account
            try {
                await program.methods
                    .resolveCompetition(tokenA, new anchor.BN(100), new anchor.BN(50))
                    .accounts({
                        competition,
                        platformConfig,
                        authority: user1.publicKey, // Wrong authority
                    })
                    .signers([user1])
                    .rpc();
                    
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.toString().includes('Unauthorized'));
            }
        });
    });
    
    describe('claim_winnings', () => {
        it('allows winner to claim', async () => {
            const initialUserBalance = await provider.connection.getBalance(user1.publicKey);
            const config = await program.account.platformConfig.fetch(platformConfig);
            
            await program.methods
                .claimWinnings()
                .accounts({
                    bet: userBet1,
                    competition,
                    escrow,
                    platformConfig,
                    platformWallet: config.platformWallet,
                    user: user1.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([user1])
                .rpc();
            
            // Verify claim
            const bet = await program.account.bet.fetch(userBet1);
            assert.equal(bet.claimed, true);
            assert.ok(bet.payoutAmount.toNumber() > 0);
            
            // Verify user received funds
            const finalUserBalance = await provider.connection.getBalance(user1.publicKey);
            assert.ok(finalUserBalance > initialUserBalance);
            
            // Verify platform received fee
            const platformBalance = await provider.connection.getBalance(config.platformWallet);
            assert.ok(platformBalance > 0);
        });
        
        it('prevents double claiming', async () => {
            try {
                await program.methods
                    .claimWinnings()
                    .accounts({
                        bet: userBet1,
                        competition,
                        escrow,
                        platformConfig,
                        platformWallet: platformWallet.publicKey,
                        user: user1.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([user1])
                    .rpc();
                    
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.toString().includes('AlreadyClaimed'));
            }
        });
    });
    
    describe('emergency_pause', () => {
        it('allows authority to pause platform', async () => {
            await program.methods
                .emergencyPause(true)
                .accounts({
                    platformConfig,
                    authority: authority.publicKey,
                })
                .rpc();
            
            const config = await program.account.platformConfig.fetch(platformConfig);
            assert.equal(config.isPaused, true);
        });
        
        it('prevents operations when paused', async () => {
            const pausedCompId = 'paused-comp';
            const [pausedComp] = await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from('competition'), Buffer.from(pausedCompId)],
                program.programId
            );
            
            const [pausedEscrow] = await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from('escrow'), Buffer.from(pausedCompId)],
                program.programId
            );
            
            try {
                await program.methods
                    .createCompetition(
                        pausedCompId,
                        tokenA,
                        tokenB,
                        new anchor.BN(Math.floor(Date.now() / 1000) + 3600),
                        new anchor.BN(Math.floor(Date.now() / 1000) + 7200)
                    )
                    .accounts({
                        competition: pausedComp,
                        escrow: pausedEscrow,
                        platformConfig,
                        authority: authority.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                    
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error.toString().includes('PlatformPaused'));
            }
        });
        
        it('allows unpausing', async () => {
            await program.methods
                .emergencyPause(false)
                .accounts({
                    platformConfig,
                    authority: authority.publicKey,
                })
                .rpc();
            
            const config = await program.account.platformConfig.fetch(platformConfig);
            assert.equal(config.isPaused, false);
        });
    });
});

// TODO: Add more tests for:
// - Emergency refunds
// - Competition cancellation
// - TWAP price validation
// - Multi-token competitions (when implemented)
// - Edge cases and error conditions
// - Integration with price oracles
// - Performance and gas optimization
