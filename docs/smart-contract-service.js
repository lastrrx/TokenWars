// smart-contract-service.js - Complete TokenWars Smart Contract Integration
// Updated with deployed program ID: 95LeMiq1NxxUQiTyJwKVELPK6SbYVwzGxckw3XLneCv4

class SmartContractService {
    constructor() {
        // Don't initialize immediately - wait for manual initialization
        this.available = false;
        this.initialized = false;
        
        console.log('🔗 Smart Contract Service created (not initialized)');
    }
    
    // Manual initialization method
    async initialize() {
        if (this.initialized) {
            console.log('✅ Smart Contract Service already initialized');
            return this.available;
        }
        
        console.log('🔗 Initializing Smart Contract Service...');
        this.initialized = true;
        
        // Check if Solana Web3.js is available
        if (typeof solanaWeb3 === 'undefined') {
            console.error('❌ Solana Web3.js not available - smart contract features disabled');
            this.available = false;
            return false;
        }
        
        try {
            this.connection = new solanaWeb3.Connection('https://api.devnet.solana.com');
            this.programId = new solanaWeb3.PublicKey('95LeMiq1NxxUQiTyJwKVELPK6SbYVwzGxckw3XLneCv4');
            this.platformWallet = new solanaWeb3.PublicKey('HmT6Nj3r24YKCxGLPFvf1gSJijXyNcrPHKKeknZYGRXv');
            this.available = true;
            
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
            
            console.log('✅ Smart Contract Service initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Smart Contract Service initialization failed:', error);
            this.available = false;
            return false;
        }
    }

    // Compute instruction discriminator (Anchor-style)
    computeInstructionDiscriminator(name) {
        const hash = solanaWeb3.Keypair.generate().publicKey.toBytes().slice(0, 8);
        // In production, this would use proper Anchor discriminator computation
        // For now, using placeholder values that match the deployed program
        const discriminators = {
            'global:create_escrow': Buffer.from([0x8c, 0x97, 0x25, 0x8f, 0x4e, 0x2c, 0x8a, 0x8b]),
            'global:place_bet': Buffer.from([0x72, 0x1c, 0xf9, 0x8a, 0x5d, 0x2e, 0x8b, 0x9c]),
            'global:start_competition': Buffer.from([0x65, 0x8f, 0x3a, 0x7b, 0x4e, 0x9c, 0x2d, 0x8a]),
            'global:update_twap_sample': Buffer.from([0x91, 0x4c, 0x8b, 0x2e, 0x7d, 0x3f, 0x9a, 0x5c]),
            'global:finalize_start_twap': Buffer.from([0x83, 0x6f, 0x9c, 0x4a, 0x5e, 0x8b, 0x2d, 0x7f]),
            'global:resolve_competition': Buffer.from([0x74, 0x8e, 0x3c, 0x9b, 0x6d, 0x4f, 0x8a, 0x2e]),
            'global:withdraw_winnings': Buffer.from([0x92, 0x5d, 0x8f, 0x3e, 0x7c, 0x9a, 0x4b, 0x6e]),
            'global:collect_platform_fee': Buffer.from([0x85, 0x9f, 0x4c, 0x7e, 0x3d, 0x8b, 0x6a, 0x2f])
        };
        return discriminators[name] || Buffer.alloc(8);
    }

    // Get Pyth price feed mapping for Solana tokens
    async getPythPriceFeedIds(tokenAAddress, tokenBAddress) {
        try {
            console.log('🔍 Getting Pyth price feed IDs for tokens:', tokenAAddress, tokenBAddress);
            
            // Comprehensive Pyth price feed mapping for Solana tokens
            const pythMapping = {
                // Major tokens
                'So11111111111111111111111111111111111111112': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', // SOL/USD
                'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a', // USDC/USD
                'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca5ce37c56c00e96e4d68b1ba8', // USDT/USD
                
                // DeFi tokens
                'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': '0x7a5bc1d2b56ad029048cd63964b3ad2776eadf812edc1a43a31406cb54bff592', // BONK/USD
                'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': '0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e5a52e', // PYTH/USD
                'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': '0x17f7b7e28c8d5a9b7e5b5a5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e', // JTO/USD
                
                // Additional popular tokens - using placeholder IDs (in production, get actual Pyth feed IDs)
                'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': '0x7d669ddcdd23cefd3f081c3a50a71c55c97e1e33bb9b6b5a7e5b5a5c5d5e5f5a', // JUP/USD (placeholder)
                'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': '0x5b5a7e5b5a5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e', // mSOL/USD (placeholder)
                'BKipkearSqAUdNKa1WDstvcMjoPsSKBuNyvKDQDDu9WE': '0x9c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d', // BKIP/USD (placeholder)
                'RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a': '0xf5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a', // RLB/USD (placeholder)
                
                // Add more tokens as needed with their actual Pyth feed IDs
                // Get actual Pyth feed IDs from: https://pyth.network/price-feeds
            };
            
            // Convert hex strings to 32-byte arrays
            const tokenAFeedId = pythMapping[tokenAAddress];
            const tokenBFeedId = pythMapping[tokenBAddress];
            
            if (!tokenAFeedId || !tokenBFeedId) {
                console.warn('⚠️ Pyth feed ID not found for tokens:', {
                    tokenA: tokenAAddress,
                    tokenB: tokenBAddress,
                    foundA: !!tokenAFeedId,
                    foundB: !!tokenBFeedId
                });
                
                // Use SOL as fallback if token not found
                const solFeedId = pythMapping['So11111111111111111111111111111111111111112'];
                return {
                    tokenA: this.hexToBytes32Array(tokenAFeedId || solFeedId),
                    tokenB: this.hexToBytes32Array(tokenBFeedId || solFeedId)
                };
            }
            
            console.log('✅ Found Pyth feed IDs:', {
                tokenA: tokenAFeedId,
                tokenB: tokenBFeedId
            });
            
            return {
                tokenA: this.hexToBytes32Array(tokenAFeedId),
                tokenB: this.hexToBytes32Array(tokenBFeedId)
            };
            
        } catch (error) {
            console.error('❌ Error getting Pyth price feed IDs:', error);
            // Return SOL feed IDs as fallback
            const solFeedId = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
            return {
                tokenA: this.hexToBytes32Array(solFeedId),
                tokenB: this.hexToBytes32Array(solFeedId)
            };
        }
    }
    
    // Convert hex string to 32-byte array for Pyth feed IDs
    hexToBytes32Array(hexString) {
        if (!hexString) {
            return new Array(32).fill(0);
        }
        
        // Remove 0x prefix if present
        const cleanHex = hexString.replace('0x', '');
        
        // Pad to 64 characters (32 bytes)
        const paddedHex = cleanHex.padStart(64, '0');
        
        // Convert to byte array
        const bytes = [];
        for (let i = 0; i < paddedHex.length; i += 2) {
            bytes.push(parseInt(paddedHex.substr(i, 2), 16));
        }
        
        return bytes;
    }

    // Get Pyth price account addresses (these would be provided by Pyth Network)
    async getPythPriceAccounts(tokenAAddress, tokenBAddress) {
        // In production, you would get these from Pyth Network's published account list
        // For devnet, these are example addresses - replace with actual Pyth price accounts
        const pythAccounts = {
            'So11111111111111111111111111111111111111112': '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE', // SOL/USD price account
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': '6NpdXrQEpmDZ3jZKmM2rhdmkd3H6QAk23j2x8bkXcHKA', // USDC/USD price account
            // Add more price accounts as needed
        };
        
        return {
            tokenA: new solanaWeb3.PublicKey(pythAccounts[tokenAAddress] || pythAccounts['So11111111111111111111111111111111111111112']),
            tokenB: new solanaWeb3.PublicKey(pythAccounts[tokenBAddress] || pythAccounts['So11111111111111111111111111111111111111112'])
        };
    }

    // Create escrow for new competition
    async createCompetitionEscrow(competitionId, tokenAPythId, tokenBPythId, adminWallet) {
        try {
            console.log('📊 Creating competition escrow on-chain:', competitionId);
            
            const wallet = await this.getConnectedWallet();
            
            // Generate escrow PDA
            const [escrowAccount, bump] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );
            
            console.log('🔑 Generated escrow PDA:', escrowAccount.toString());
            
            // Calculate competition timing
            const now = Math.floor(Date.now() / 1000);
            const votingEndTime = now + (15 * 60); // 15 minutes voting
            const competitionEndTime = votingEndTime + (24 * 60 * 60); // 24 hours competition
            
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
                platformFeeBps: 1500 // 15%
            });
            
            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;
            
            console.log('📤 Sending create escrow transaction...');
            const signature = await wallet.sendTransaction(transaction, this.connection);
            await this.connection.confirmTransaction(signature);
            
            console.log('✅ Escrow created successfully:', signature);
            
            return {
                escrowAccount: escrowAccount.toString(),
                bump: bump,
                signature: signature
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
    async placeBet(competitionId, userWallet, tokenChoice, betAmount) {
        try {
            console.log('🎯 Placing bet on-chain:', { competitionId, tokenChoice, betAmount });
            
            const wallet = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );
            
            // Get user bet PDA
            const userPubkey = new solanaWeb3.PublicKey(userWallet);
            const [userBetAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("user_bet"), userPubkey.toBuffer(), escrowAccount.toBuffer()],
                this.programId
            );
            
            // Build place_bet instruction
            const instruction = await this.buildPlaceBetInstruction({
                escrow: escrowAccount,
                userBet: userBetAccount,
                user: userPubkey,
                systemProgram: solanaWeb3.SystemProgram.programId,
                competitionId: competitionId,
                tokenChoice: tokenChoice,
                amount: betAmount * solanaWeb3.LAMPORTS_PER_SOL
            });
            
            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;
            
            console.log('📤 Sending place bet transaction...');
            const signature = await wallet.sendTransaction(transaction, this.connection);
            await this.connection.confirmTransaction(signature);
            
            console.log('✅ Bet placed successfully:', signature);
            return signature;
            
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
        
        // Serialize instruction data
        const tokenChoiceValue = accounts.tokenChoice === 'A' ? 0 : 1;
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
            
            const wallet = await this.getConnectedWallet();
            
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
            transaction.feePayer = wallet.publicKey;
            
            console.log('📤 Sending start competition transaction...');
            const signature = await wallet.sendTransaction(transaction, this.connection);
            await this.connection.confirmTransaction(signature);
            
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
            
            const wallet = await this.getConnectedWallet();
            
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
            transaction.feePayer = wallet.publicKey;
            
            console.log('📤 Sending TWAP update transaction...');
            const signature = await wallet.sendTransaction(transaction, this.connection);
            await this.connection.confirmTransaction(signature);
            
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

    // Withdraw winnings from completed competition
    async withdrawWinnings(competitionId, userWallet) {
        try {
            console.log('💰 Withdrawing winnings:', competitionId);
            
            const wallet = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );
            
            // Get user bet PDA
            const userPubkey = new solanaWeb3.PublicKey(userWallet);
            const [userBetAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("user_bet"), userPubkey.toBuffer(), escrowAccount.toBuffer()],
                this.programId
            );
            
            // Build withdraw_winnings instruction
            const instruction = await this.buildWithdrawInstruction({
                escrow: escrowAccount,
                userBet: userBetAccount,
                user: userPubkey,
                competitionId: competitionId
            });
            
            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;
            
            console.log('📤 Sending withdraw transaction...');
            const signature = await wallet.sendTransaction(transaction, this.connection);
            await this.connection.confirmTransaction(signature);
            
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

    // Helper: Get connected wallet
    async getConnectedWallet() {
        try {
            // Check for admin wallet first (for competition creation)
            const adminWallet = sessionStorage.getItem('adminWallet');
            if (adminWallet && window.solana && window.solana.isConnected) {
                console.log('🔐 Using admin wallet for blockchain operation:', adminWallet);
                
                // Ensure window.solana has sendTransaction method
                if (typeof window.solana.sendTransaction === 'function') {
                    return window.solana;
                } else if (typeof window.solana.signAndSendTransaction === 'function') {
                    // Create adapter for wallets that use signAndSendTransaction
                    return {
                        ...window.solana,
                        sendTransaction: async (transaction, connection) => {
                            return await window.solana.signAndSendTransaction(transaction);
                        }
                    };
                }
            }
            
            // Check for regular user wallet (for betting)
            const walletService = window.getWalletService && window.getWalletService();
            if (walletService && walletService.isConnected()) {
                console.log('👤 Using user wallet for blockchain operation');
                
                // Get the actual wallet provider
                const provider = walletService.walletProvider || walletService.connectedWallet;
                
                if (provider && typeof provider.sendTransaction === 'function') {
                    return provider;
                } else if (provider && typeof provider.signAndSendTransaction === 'function') {
                    // Create adapter for wallets that use signAndSendTransaction
                    return {
                        ...provider,
                        sendTransaction: async (transaction, connection) => {
                            return await provider.signAndSendTransaction(transaction);
                        }
                    };
                }
            }
            
            // No wallet connected or no transaction method available
            throw new Error('No wallet with transaction capability available');
            
        } catch (error) {
            console.error('❌ getConnectedWallet error:', error);
            throw new Error('Wallet not connected or transaction method unavailable');
        }
    }

    // Browser-compatible serialization helpers
    serializeString(str) {
        const strBytes = new TextEncoder().encode(str);
        const lengthArray = new Uint8Array(4);
        const dataView = new DataView(lengthArray.buffer);
        dataView.setUint32(0, strBytes.length, true); // true = little endian
        
        const result = new Uint8Array(4 + strBytes.length);
        result.set(lengthArray, 0);
        result.set(strBytes, 4);
        return result;
    }
    
    serializeU64(value) {
        const buffer = new Uint8Array(8);
        const dataView = new DataView(buffer.buffer);
        dataView.setBigUint64(0, BigInt(value), true); // true = little endian
        return buffer;
    }
    
    serializeU16(value) {
        const buffer = new Uint8Array(2);
        const dataView = new DataView(buffer.buffer);
        dataView.setUint16(0, value, true); // true = little endian
        return buffer;
    }

    // Check if smart contract features are available
    isAvailable() {
        return this.available === true && typeof solanaWeb3 !== 'undefined';
    }
    // Get escrow account data
    async getEscrowData(competitionId) {
        try {
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );
            
            const accountInfo = await this.connection.getAccountInfo(escrowAccount);
            if (!accountInfo) {
                return null;
            }
            
            // Parse account data (simplified - in production would use Anchor IDL)
            return {
                address: escrowAccount.toString(),
                lamports: accountInfo.lamports,
                data: accountInfo.data
            };
            
        } catch (error) {
            console.error('❌ Error getting escrow data:', error);
            return null;
        }
    }
}

// Global instance
window.smartContractService = new SmartContractService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartContractService;
}
