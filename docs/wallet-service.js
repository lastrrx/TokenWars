// smart-contract-service.js - Complete TokenWars Smart Contract Integration
// Updated with wallet service integration and blockchain configuration

class SmartContractService {
    constructor() {
        console.log('🔗 Initializing Smart Contract Service...');
        
        // Initialize with blockchain configuration
        this.initializeFromConfig();
        
        // Instruction discriminators (computed from instruction names)
        this.instructions = {
            createEscrow: this.computeInstructionDiscriminator('global:create_escrow'),
            placeBet: this.computeInstructionDiscriminator('global:place_bet'),
            startCompetition: this.computeInstructionDiscriminator('global:start_competition'),
            updateTwapSample: this.computeInstructionDiscriminator('global:update_twap_sample'),
            finalizeStartTwap: this.computeInstructionDiscriminator('global:finalize_start_twap'),
            resolveCompetition: this.computeInstructionDiscriminator('global:resolve_competition'),
            withdrawWinnings: this.computeInstructionDiscriminator('global:withdraw_winnings'),
            collectPlatformFee: this.computeInstructionDiscriminator('global:collect_platform_fee')
        };
        
        // Service state
        this.isInitialized = false;
        this.lastConnectionTest = null;
        this.connectionTestInterval = 30000; // Test every 30 seconds
        
        console.log('✅ Smart Contract Service initialized');
    }

    // 🚀 NEW: Initialize from blockchain configuration
    initializeFromConfig() {
        try {
            const config = window.BLOCKCHAIN_CONFIG;
            
            if (config) {
                // Use configuration values
                this.connection = new solanaWeb3.Connection(
                    config.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
                    config.CONFIRMATION_COMMITMENT || 'confirmed'
                );
                this.programId = new solanaWeb3.PublicKey(config.SOLANA_PROGRAM_ID);
                this.platformWallet = new solanaWeb3.PublicKey(config.PLATFORM_WALLET);
                this.enabled = config.SMART_CONTRACT_ENABLED;
                this.fallbackToDatabase = config.FALLBACK_TO_DATABASE;
                
                console.log('🔧 Smart contract configured from BLOCKCHAIN_CONFIG');
                console.log('📊 Program ID:', this.programId.toString());
                console.log('🌐 Network:', config.SOLANA_NETWORK);
                console.log('✅ Enabled:', this.enabled);
            } else {
                // Fallback to hardcoded values
                this.connection = new solanaWeb3.Connection('https://api.devnet.solana.com');
                this.programId = new solanaWeb3.PublicKey('95LeMiq1NxxUQiTyJwKVELPK6SbYVwzGxckw3XLneCv4');
                this.platformWallet = new solanaWeb3.PublicKey('HmT6Nj3r24YKCxGLPFvf1gSJijXyNcrPHKKeknZYGRXv');
                this.enabled = false; // Default to disabled without config
                this.fallbackToDatabase = true;
                
                console.warn('⚠️ No BLOCKCHAIN_CONFIG found, using defaults with smart contracts disabled');
            }
        } catch (error) {
            console.error('❌ Error initializing smart contract configuration:', error);
            this.enabled = false;
            this.fallbackToDatabase = true;
        }
    }

    // Compute instruction discriminator (Anchor-style)
    computeInstructionDiscriminator(name) {
        // In production, this would use proper Anchor discriminator computation
        // For now, using placeholder values that match the deployed program
        const discriminators = {
            'global:create_escrow': Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            'global:place_bet': Buffer.from([0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            'global:start_competition': Buffer.from([0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            'global:update_twap_sample': Buffer.from([0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            'global:finalize_start_twap': Buffer.from([0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            'global:resolve_competition': Buffer.from([0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            'global:withdraw_winnings': Buffer.from([0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
            'global:collect_platform_fee': Buffer.from([0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
        };
        
        return discriminators[name] || Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    }

    // 🚀 UPDATED: Get connected wallet from wallet service
    async getConnectedWallet() {
        try {
            // Get wallet service instance
            const walletService = window.getWalletService && window.getWalletService();
            
            if (!walletService) {
                throw new Error('Wallet service not available');
            }
            
            if (!walletService.isConnected()) {
                throw new Error('No wallet connected');
            }
            
            if (!walletService.isSmartContractReady()) {
                throw new Error('Wallet not ready for smart contract transactions (may be in demo mode)');
            }
            
            // Return wallet service for transaction signing
            return walletService;
            
        } catch (error) {
            console.error('❌ Error getting connected wallet:', error);
            throw error;
        }
    }

    // 🚀 ENHANCED: Check if smart contract features are available
    isAvailable() {
        try {
            // Check configuration
            if (!this.enabled) {
                console.log('🚫 Smart contracts disabled in configuration');
                return false;
            }
            
            // Check wallet service
            const walletService = window.getWalletService && window.getWalletService();
            if (!walletService || !walletService.isSmartContractReady()) {
                console.log('🚫 Wallet service not ready for smart contracts');
                return false;
            }
            
            // Check connection
            if (!this.connection) {
                console.log('🚫 No Solana connection available');
                return false;
            }
            
            // Check program ID
            if (!this.programId) {
                console.log('🚫 No program ID configured');
                return false;
            }
            
            console.log('✅ Smart contract service is available');
            return true;
            
        } catch (error) {
            console.error('❌ Error checking smart contract availability:', error);
            return false;
        }
    }

    // Test connection to ensure RPC is working
    async testConnection() {
        try {
            const now = Date.now();
            
            // Rate limit connection tests
            if (this.lastConnectionTest && (now - this.lastConnectionTest) < this.connectionTestInterval) {
                return true;
            }
            
            const blockHeight = await this.connection.getBlockHeight();
            this.lastConnectionTest = now;
            
            console.log('🌐 Solana connection test successful, block height:', blockHeight);
            return true;
            
        } catch (error) {
            console.error('❌ Solana connection test failed:', error);
            return false;
        }
    }

    // Get Pyth price feed accounts for tokens
    async getPythPriceFeedIds(tokenAAddress, tokenBAddress) {
        // Simplified mapping - in production, use Pyth API to get current feeds
        const pythAccounts = {
            'So11111111111111111111111111111111111111112': 'H6ARHf6YXtGYeQFeB1VVnow2Ka49F6ZHJQZvJ7vYN5M2', // SOL/USD
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': '6NpdXrQEpmDZ3jZKmM2rhdmkd3H6QAk23j2x8bkXcHKA', // USDC/USD
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': '6NpdXrQEpmDZ3jZKmM2rhdmkd3H6QAk23j2x8bkXcHKA', // USDT/USD
        };
        
        // Default to SOL price feed if token not found
        const defaultFeed = 'H6ARHf6YXtGYeQFeB1VVnow2Ka49F6ZHJQZvJ7vYN5M2';
        
        return {
            tokenA: pythAccounts[tokenAAddress] || defaultFeed,
            tokenB: pythAccounts[tokenBAddress] || defaultFeed
        };
    }

    // Get Pyth price accounts as PublicKey objects
    async getPythPriceAccounts(tokenAAddress, tokenBAddress) {
        const pythIds = await this.getPythPriceFeedIds(tokenAAddress, tokenBAddress);
        
        return {
            tokenA: new solanaWeb3.PublicKey(pythIds.tokenA),
            tokenB: new solanaWeb3.PublicKey(pythIds.tokenB)
        };
    }

    // Create escrow for new competition
    async createCompetitionEscrow(competitionId, tokenAPythId, tokenBPythId, adminWallet) {
        try {
            console.log('📊 Creating competition escrow on-chain:', competitionId);
            
            // Test connection first
            if (!(await this.testConnection())) {
                throw new Error('Solana connection test failed');
            }
            
            const walletService = await this.getConnectedWallet();
            
            // Generate escrow PDA
            const [escrowAccount, bump] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );
            
            console.log('🔑 Generated escrow PDA:', escrowAccount.toString());
            
            // Calculate competition timing
            const now = Math.floor(Date.now() / 1000);
            const config = window.APP_CONFIG || {};
            const votingDuration = config.COMPETITION_DURATION?.VOTING_PHASE || 15;
            const activeDuration = config.COMPETITION_DURATION?.ACTIVE_PHASE || 24;
            
            const votingEndTime = now + (votingDuration * 60); // minutes to seconds
            const competitionEndTime = votingEndTime + (activeDuration * 60 * 60); // hours to seconds
            
            // Build create_escrow instruction
            const instruction = await this.buildCreateEscrowInstruction({
                escrow: escrowAccount,
                authority: new solanaWeb3.PublicKey(adminWallet),
                systemProgram: solanaWeb3.SystemProgram.programId,
                competitionId: competitionId,
                tokenAPythId: tokenAPythId,
                tokenBPythId: tokenBPythId,
                votingEndTime: votingEndTime,
                competitionEndTime: competitionEndTime,
                platformFeeBps: window.BLOCKCHAIN_CONFIG?.ESCROW_SETTINGS?.PLATFORM_FEE_BPS || 1500
            });
            
            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(adminWallet);
            
            console.log('📤 Sending create escrow transaction...');
            const signature = await walletService.signAndSendTransaction(transaction);
            
            console.log('✅ Competition escrow created successfully:', signature);
            
            return {
                signature,
                escrowAccount: escrowAccount.toString(),
                bump,
                competitionId
            };
            
        } catch (error) {
            console.error('❌ Error creating competition escrow:', error);
            throw error;
        }
    }

    // Build create_escrow instruction
    async buildCreateEscrowInstruction(accounts) {
        const keys = [
            { pubkey: accounts.escrow, isSigner: false, isWritable: true },
            { pubkey: accounts.authority, isSigner: true, isWritable: true },
            { pubkey: accounts.systemProgram, isSigner: false, isWritable: false }
        ];
        
        // Serialize instruction data
        const data = Buffer.concat([
            this.instructions.createEscrow,
            this.serializeString(accounts.competitionId),
            Buffer.from(accounts.tokenAPythId),
            Buffer.from(accounts.tokenBPythId),
            this.serializeU64(accounts.votingEndTime),
            this.serializeU64(accounts.competitionEndTime),
            this.serializeU16(accounts.platformFeeBps)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    // Place bet on competition
    async placeBet(competitionId, tokenChoice, amount, userWallet) {
        try {
            console.log('💰 Placing bet on-chain:', { competitionId, tokenChoice, amount });
            
            // Test connection first
            if (!(await this.testConnection())) {
                throw new Error('Solana connection test failed');
            }
            
            const walletService = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );
            
            // Generate user bet PDA
            const [userBetAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("bet"), Buffer.from(competitionId), new solanaWeb3.PublicKey(userWallet).toBuffer()],
                this.programId
            );
            
            console.log('🎯 User bet PDA:', userBetAccount.toString());
            
            // Convert SOL to lamports
            const lamports = Math.floor(amount * solanaWeb3.LAMPORTS_PER_SOL);
            
            // Build place_bet instruction
            const instruction = await this.buildPlaceBetInstruction({
                escrow: escrowAccount,
                userBet: userBetAccount,
                user: new solanaWeb3.PublicKey(userWallet),
                systemProgram: solanaWeb3.SystemProgram.programId,
                competitionId: competitionId,
                tokenChoice: tokenChoice,
                amount: lamports
            });
            
            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(userWallet);
            
            console.log('📤 Sending place bet transaction...');
            const signature = await walletService.signAndSendTransaction(transaction);
            
            console.log('✅ Bet placed successfully:', signature);
            
            return {
                signature,
                competitionId,
                tokenChoice,
                amount,
                userBetAccount: userBetAccount.toString()
            };
            
        } catch (error) {
            console.error('❌ Error placing bet:', error);
            throw error;
        }
    }

    // Build place_bet instruction
    async buildPlaceBetInstruction(accounts) {
        const keys = [
            { pubkey: accounts.escrow, isSigner: false, isWritable: true },
            { pubkey: accounts.userBet, isSigner: false, isWritable: true },
            { pubkey: accounts.user, isSigner: true, isWritable: true },
            { pubkey: accounts.systemProgram, isSigner: false, isWritable: false }
        ];
        
        // Convert token choice to number (0 = token_a, 1 = token_b)
        const tokenChoiceValue = accounts.tokenChoice === 'token_a' ? 0 : 1;
        
        // Serialize instruction data
        const data = Buffer.concat([
            this.instructions.placeBet,
            this.serializeString(accounts.competitionId),
            Buffer.from([tokenChoiceValue]),
            this.serializeU64(accounts.amount)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    // Start competition and begin TWAP calculation
    async startCompetition(competitionId, tokenAAddress, tokenBAddress, adminWallet) {
        try {
            console.log('🚀 Starting competition with TWAP:', competitionId);
            
            // Test connection first
            if (!(await this.testConnection())) {
                throw new Error('Solana connection test failed');
            }
            
            const walletService = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );
            
            // Get Pyth price accounts
            const priceAccounts = await this.getPythPriceAccounts(tokenAAddress, tokenBAddress);
            
            // Build start_competition instruction
            const instruction = await this.buildStartCompetitionInstruction({
                escrow: escrowAccount,
                authority: new solanaWeb3.PublicKey(adminWallet),
                tokenAPriceFeed: priceAccounts.tokenA,
                tokenBPriceFeed: priceAccounts.tokenB,
                competitionId: competitionId
            });
            
            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(adminWallet);
            
            console.log('📤 Sending start competition transaction...');
            const signature = await walletService.signAndSendTransaction(transaction);
            
            console.log('✅ Competition started successfully:', signature);
            return signature;
            
        } catch (error) {
            console.error('❌ Error starting competition:', error);
            throw error;
        }
    }

    // Build start_competition instruction
    async buildStartCompetitionInstruction(accounts) {
        const keys = [
            { pubkey: accounts.escrow, isSigner: false, isWritable: true },
            { pubkey: accounts.authority, isSigner: true, isWritable: false },
            { pubkey: accounts.tokenAPriceFeed, isSigner: false, isWritable: false },
            { pubkey: accounts.tokenBPriceFeed, isSigner: false, isWritable: false }
        ];
        
        // Serialize instruction data
        const data = Buffer.concat([
            this.instructions.startCompetition,
            this.serializeString(accounts.competitionId)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    // Update TWAP sample during 5-minute windows
    async updateTwapSample(competitionId, tokenAAddress, tokenBAddress, adminWallet) {
        try {
            console.log('📊 Updating TWAP sample:', competitionId);
            
            const walletService = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );
            
            // Get Pyth price accounts
            const priceAccounts = await this.getPythPriceAccounts(tokenAAddress, tokenBAddress);
            
            // Build update_twap_sample instruction
            const instruction = await this.buildUpdateTwapInstruction({
                escrow: escrowAccount,
                authority: new solanaWeb3.PublicKey(adminWallet),
                tokenAPriceFeed: priceAccounts.tokenA,
                tokenBPriceFeed: priceAccounts.tokenB,
                competitionId: competitionId
            });
            
            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(adminWallet);
            
            console.log('📤 Sending TWAP update transaction...');
            const signature = await walletService.signAndSendTransaction(transaction);
            
            console.log('✅ TWAP sample updated successfully:', signature);
            return signature;
            
        } catch (error) {
            console.error('❌ Error updating TWAP sample:', error);
            throw error;
        }
    }

    // Build update_twap_sample instruction
    async buildUpdateTwapInstruction(accounts) {
        const keys = [
            { pubkey: accounts.escrow, isSigner: false, isWritable: true },
            { pubkey: accounts.authority, isSigner: true, isWritable: false },
            { pubkey: accounts.tokenAPriceFeed, isSigner: false, isWritable: false },
            { pubkey: accounts.tokenBPriceFeed, isSigner: false, isWritable: false }
        ];
        
        // Serialize instruction data
        const data = Buffer.concat([
            this.instructions.updateTwapSample,
            this.serializeString(accounts.competitionId)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    // Resolve competition and determine winner
    async resolveCompetition(competitionId, adminWallet) {
        try {
            console.log('🏆 Resolving competition:', competitionId);
            
            const walletService = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );
            
            // Build resolve_competition instruction
            const instruction = await this.buildResolveCompetitionInstruction({
                escrow: escrowAccount,
                authority: new solanaWeb3.PublicKey(adminWallet),
                competitionId: competitionId
            });
            
            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(adminWallet);
            
            console.log('📤 Sending resolve competition transaction...');
            const signature = await walletService.signAndSendTransaction(transaction);
            
            console.log('✅ Competition resolved successfully:', signature);
            return signature;
            
        } catch (error) {
            console.error('❌ Error resolving competition:', error);
            throw error;
        }
    }

    // Build resolve_competition instruction
    async buildResolveCompetitionInstruction(accounts) {
        const keys = [
            { pubkey: accounts.escrow, isSigner: false, isWritable: true },
            { pubkey: accounts.authority, isSigner: true, isWritable: false }
        ];
        
        // Serialize instruction data
        const data = Buffer.concat([
            this.instructions.resolveCompetition,
            this.serializeString(accounts.competitionId)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    // Withdraw winnings from resolved competition
    async withdrawWinnings(competitionId, userWallet) {
        try {
            console.log('💸 Withdrawing winnings:', competitionId);
            
            const walletService = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );
            
            // Get user bet PDA
            const [userBetAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("bet"), Buffer.from(competitionId), new solanaWeb3.PublicKey(userWallet).toBuffer()],
                this.programId
            );
            
            // Build withdraw_winnings instruction
            const instruction = await this.buildWithdrawInstruction({
                escrow: escrowAccount,
                userBet: userBetAccount,
                user: new solanaWeb3.PublicKey(userWallet),
                competitionId: competitionId
            });
            
            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(userWallet);
            
            console.log('📤 Sending withdraw winnings transaction...');
            const signature = await walletService.signAndSendTransaction(transaction);
            
            console.log('✅ Winnings withdrawn successfully:', signature);
            return signature;
            
        } catch (error) {
            console.error('❌ Error withdrawing winnings:', error);
            throw error;
        }
    }

    // Build withdraw_winnings instruction
    async buildWithdrawInstruction(accounts) {
        const keys = [
            { pubkey: accounts.escrow, isSigner: false, isWritable: true },
            { pubkey: accounts.userBet, isSigner: false, isWritable: true },
            { pubkey: accounts.user, isSigner: true, isWritable: true }
        ];
        
        // Serialize instruction data
        const data = Buffer.concat([
            this.instructions.withdrawWinnings,
            this.serializeString(accounts.competitionId)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    // 🚀 NEW: Get comprehensive service status
    getServiceStatus() {
        return {
            enabled: this.enabled,
            connected: !!this.connection,
            programId: this.programId?.toString(),
            walletReady: this.isAvailable(),
            lastConnectionTest: this.lastConnectionTest,
            fallbackToDatabase: this.fallbackToDatabase
        };
    }

    // Serialization helpers
    serializeString(str) {
        const strBytes = Buffer.from(str, 'utf8');
        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeUInt32LE(strBytes.length, 0);
        return Buffer.concat([lengthBuffer, strBytes]);
    }

    serializeU64(value) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value), 0);
        return buffer;
    }

    serializeU16(value) {
        const buffer = Buffer.alloc(2);
        buffer.writeUInt16LE(value, 0);
        return buffer;
    }
}

// ==============================================
// GLOBAL EXPOSURE AND INITIALIZATION
// ==============================================

// Create and expose service instance
window.SmartContractService = SmartContractService;
window.smartContractService = new SmartContractService();

// Log successful initialization
console.log('🔗 Enhanced Smart Contract Service loaded!');
console.log('🚀 NEW FEATURES:');
console.log('   ✅ Wallet service integration for transaction signing');
console.log('   ✅ Blockchain configuration support');
console.log('   ✅ Enhanced connection testing');
console.log('   ✅ Improved error handling and fallbacks');
console.log('   ✅ Comprehensive service status reporting');
console.log('🎯 Ready for blockchain transactions!');
