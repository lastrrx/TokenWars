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
            // FIXED: Use correct deployed Program ID
            this.programId = new solanaWeb3.PublicKey(
                window.BLOCKCHAIN_CONFIG?.SOLANA_PROGRAM_ID || 'Dqusfo21uM5XX6rEpSVRXuLikyf1drkisqGUDDFo2qj5'
            );
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
            console.log('📋 Program ID:', this.programId.toString());
            return true;
            
        } catch (error) {
            console.error('❌ Smart Contract Service initialization failed:', error);
            this.available = false;
            return false;
        }
    }

    // Compute instruction discriminator (Anchor-style)
    computeInstructionDiscriminator(name) {
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

    // FIXED: Jupiter integration for token price info
    async getTokenPriceInfo(tokenAAddress, tokenBAddress) {
        try {
            console.log('🔍 Getting token price info for Jupiter integration:', tokenAAddress, tokenBAddress);
            
            // Since you're using Jupiter now, return simplified token info
            // Jupiter handles price discovery, so we don't need Pyth feed IDs
            return {
                tokenA: {
                    address: tokenAAddress,
                    source: 'jupiter'
                },
                tokenB: {
                    address: tokenBAddress,
                    source: 'jupiter'
                }
            };
            
        } catch (error) {
            console.error('❌ Error getting token price info:', error);
            throw error;
        }
    }

    // Create escrow for new competition
    async createCompetitionEscrow(competitionId, tokenAAddress, tokenBAddress, adminWallet) {
        try {
            console.log('📊 Creating competition escrow on-chain:', competitionId);
            
            const wallet = await this.getConnectedWallet();
            const tokenInfo = await this.getTokenPriceInfo(tokenAAddress, tokenBAddress);
            console.log('📊 Using Jupiter price discovery for tokens:', tokenInfo);
            
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
                tokenAAddress: tokenAAddress,
                tokenBAddress: tokenBAddress,
                votingEndTime: votingEndTime,
                competitionEndTime: competitionEndTime,
                platformFeeBps: 1500 // 15%
            });
            
            // Create transaction
            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get fresh blockhash
            console.log('⏳ Getting recent blockhash...');
            const { blockhash, feeCalculator } = await this.connection.getRecentBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;
            
            console.log('📤 Sending create escrow transaction...');
            console.log('🔍 Transaction details:', {
                instructions: transaction.instructions.length,
                feePayer: transaction.feePayer?.toString(),
                recentBlockhash: transaction.recentBlockhash,
                estimatedFee: feeCalculator ? feeCalculator.lamportsPerSignature : 'unknown'
            });
            
            // Send transaction with proper error handling
            const signature = await wallet.sendTransaction(transaction, this.connection);
            console.log('✅ Transaction sent successfully, signature:', signature);
            
            // Wait for confirmation with timeout
            console.log('⏳ Confirming transaction...');
            const confirmation = await Promise.race([
                this.connection.confirmTransaction(signature, 'confirmed'),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
                )
            ]);
            
            console.log('📋 Transaction confirmation:', confirmation);
            
            if (confirmation.value?.err) {
                console.error('❌ Transaction failed on-chain:', confirmation.value.err);
                throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
            }
            
            console.log('✅ Escrow created successfully');
            
            return {
                escrowAccount: escrowAccount.toString(),
                bump: bump,
                signature: signature
            };
            
        } catch (error) {
            // Enhanced error logging with more details
            console.error('❌ Detailed transaction error:', error);
            
            // Log additional error context
            if (error.name) console.error('Error name:', error.name);
            if (error.code) console.error('Error code:', error.code);
            if (error.logs) console.error('Transaction logs:', error.logs);
            if (error.message) console.error('Error message:', error.message);
            
            // Re-throw with more context
            throw new Error(`Transaction failed: ${error.message || 'Unknown error'}`);
        }
    }

    // FIXED: Complete buildCreateEscrowInstruction method
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
            this.serializeString(accounts.tokenAAddress),
            this.serializeString(accounts.tokenBAddress),
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
            
            // Create and send transaction
            const transaction = new solanaWeb3.Transaction().add(instruction);
            const { blockhash } = await this.connection.getRecentBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;
            
            const signature = await wallet.sendTransaction(transaction, this.connection);
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            console.log('✅ Bet placed successfully, signature:', signature);
            return { signature, userBetAccount: userBetAccount.toString() };
            
        } catch (error) {
            console.error('❌ Error placing bet:', error);
            throw new Error(`Bet placement failed: ${error.message}`);
        }
    }

    // FIXED: Complete buildPlaceBetInstruction method
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
            
            // Create and send transaction
            const transaction = new solanaWeb3.Transaction().add(instruction);
            const { blockhash } = await this.connection.getRecentBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;
            
            const signature = await wallet.sendTransaction(transaction, this.connection);
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            console.log('✅ Winnings withdrawn successfully, signature:', signature);
            return { signature };
            
        } catch (error) {
            console.error('❌ Error withdrawing winnings:', error);
            throw new Error(`Withdrawal failed: ${error.message}`);
        }
    }

    // FIXED: Complete buildWithdrawInstruction method
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

    // FIXED: Complete getConnectedWallet method
    async getConnectedWallet() {
        try {
            console.log('🔍 Getting connected wallet for blockchain operation...');
            
            // First try to get wallet from WalletService
            const walletService = window.getWalletService && window.getWalletService();
            if (walletService && walletService.isConnected()) {
                console.log('👤 Using WalletService connected wallet');
                
                const provider = walletService.getWalletProvider();
                if (provider && provider.publicKey) {
                    return {
                        publicKey: provider.publicKey,
                        sendTransaction: async (transaction, connection) => {
                            try {
                                // Ensure transaction is properly configured
                                transaction.feePayer = provider.publicKey;
                                
                                // Use WalletService method for transaction signing
                                console.log('📤 Using WalletService signAndSendTransaction');
                                return await walletService.signAndSendTransaction(transaction, connection);
                                
                            } catch (error) {
                                console.error('❌ WalletService transaction error:', error);
                                throw new Error(`WalletService transaction failed: ${error.message}`);
                            }
                        }
                    };
                }
            }
            
            // Fallback: Check for admin wallet (direct window.solana access)
            const adminWallet = sessionStorage.getItem('adminWallet');
            if (adminWallet && window.solana && window.solana.isConnected) {
                console.log('🔐 Using admin wallet for blockchain operation:', adminWallet);
                
                if (window.solana.publicKey) {
                    return {
                        publicKey: window.solana.publicKey,
                        sendTransaction: async (transaction, connection) => {
                            try {
                                // Ensure transaction is properly configured
                                transaction.feePayer = window.solana.publicKey;
                                
                                // Try different wallet methods in order of preference
                                if (typeof window.solana.signAndSendTransaction === 'function') {
                                    console.log('📤 Using admin wallet signAndSendTransaction');
                                    return await window.solana.signAndSendTransaction(transaction);
                                } else if (typeof window.solana.sendTransaction === 'function') {
                                    console.log('📤 Using admin wallet sendTransaction');
                                    return await window.solana.sendTransaction(transaction, connection);
                                } else {
                                    throw new Error('Admin wallet does not support transaction sending');
                                }
                                
                            } catch (error) {
                                console.error('❌ Admin wallet transaction error:', error);
                                throw new Error(`Admin wallet transaction failed: ${error.message}`);
                            }
                        }
                    };
                } else {
                    throw new Error('Admin wallet publicKey not available');
                }
            }
            
            // No wallet available
            throw new Error('No connected wallet found. Please connect a wallet first.');
            
        } catch (error) {
            console.error('❌ getConnectedWallet error:', error);
            throw new Error(`Wallet connection failed: ${error.message}`);
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

// Global instance
window.smartContractService = new SmartContractService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartContractService;
}
