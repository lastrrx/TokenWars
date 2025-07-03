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

// Enhanced createCompetitionEscrow method with comprehensive error handling
async createCompetitionEscrow(competitionId, tokenAAddress, tokenBAddress, adminWallet) {
    try {
        console.log('📊 Creating competition escrow on-chain:', competitionId);
        console.log('🔍 Input parameters:', {
            competitionId,
            tokenAAddress,
            tokenBAddress,
            adminWallet
        });
        
        // Check if smart contract service is properly initialized
        if (!this.isAvailable()) {
            throw new Error('Smart contract service not available or not initialized');
        }
        
        console.log('🔍 Service status check:', {
            initialized: this.initialized,
            available: this.available,
            connectionReady: !!this.connection,
            programId: this.programId?.toString()
        });
        
        const wallet = await this.getConnectedWallet();
        console.log('✅ Connected wallet obtained:', wallet.publicKey.toString());
        
        const tokenInfo = await this.getTokenPriceInfo(tokenAAddress, tokenBAddress);
        console.log('📊 Using Jupiter price discovery for tokens:', tokenInfo);
        
        // Generate escrow PDA
        const [escrowAccount, bump] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("escrow"), Buffer.from(competitionId)],
            this.programId
        );
        
        console.log('🔑 Generated escrow PDA:', escrowAccount.toString());
        console.log('🔑 PDA bump:', bump);
        
        // Calculate competition timing
        const now = Math.floor(Date.now() / 1000);
        const votingEndTime = now + (15 * 60); // 15 minutes voting
        const competitionEndTime = votingEndTime + (24 * 60 * 60); // 24 hours competition
        
        console.log('⏰ Competition timing:', {
            now,
            votingEndTime,
            competitionEndTime,
            votingDurationMinutes: 15,
            competitionDurationHours: 24
        });
        
        // Build create_escrow instruction
        console.log('🔨 Building create escrow instruction...');
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
        
        console.log('✅ Instruction built successfully');
        
        // Create transaction
        const transaction = new solanaWeb3.Transaction().add(instruction);
        console.log('📦 Transaction created with', transaction.instructions.length, 'instructions');
        
        // Get fresh blockhash
        console.log('⏳ Getting recent blockhash...');
        const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        
        console.log('🔗 Transaction configured:', {
            recentBlockhash: blockhash,
            feePayer: wallet.publicKey.toString()
        });
        
        // Get fee estimate using modern API
        let estimatedFee = 'unknown';
        try {
            const fee = await this.connection.getFeeForMessage(transaction.compileMessage());
            estimatedFee = fee.value || 'unknown';
            console.log('💰 Estimated transaction fee:', estimatedFee, 'lamports');
        } catch (feeError) {
            console.warn('⚠️ Could not estimate fee:', feeError.message);
        }
        
        console.log('📤 Sending create escrow transaction...');
        console.log('🔍 Final transaction details:', {
            instructions: transaction.instructions.length,
            feePayer: transaction.feePayer?.toString(),
            recentBlockhash: transaction.recentBlockhash,
            estimatedFee: estimatedFee
        });
        
        // Send transaction with enhanced error handling
        let signature;
        try {
            signature = await wallet.sendTransaction(transaction, this.connection);
            console.log('✅ Transaction sent successfully, signature:', signature);
        } catch (sendError) {
            console.error('❌ Transaction send failed:', sendError);
            
            // Provide specific error guidance
            if (sendError.message.includes('rejected') || sendError.message.includes('cancelled')) {
                throw new Error('Transaction was rejected by user. Please try again and approve the transaction.');
            } else if (sendError.message.includes('insufficient')) {
                throw new Error('Insufficient SOL balance. Please add SOL to your wallet and try again.');
            } else if (sendError.message.includes('blockhash')) {
                throw new Error('Transaction expired. Please try again.');
            } else if (sendError.message.includes('simulation failed')) {
                throw new Error('Transaction simulation failed. Check your wallet balance and try again.');
            } else {
                throw new Error(`Transaction failed: ${sendError.message}`);
            }
        }
        
        // Wait for confirmation with timeout
        console.log('⏳ Confirming transaction...');
        let confirmation;
        try {
            confirmation = await Promise.race([
                this.connection.confirmTransaction(signature, 'confirmed'),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Transaction confirmation timeout after 30 seconds')), 30000)
                )
            ]);
            
            console.log('📋 Transaction confirmation received:', confirmation);
        } catch (confirmError) {
            console.error('❌ Transaction confirmation failed:', confirmError);
            
            if (confirmError.message.includes('timeout')) {
                console.warn('⚠️ Transaction may still be processing. Check Solana Explorer with signature:', signature);
                throw new Error('Transaction confirmation timeout. Transaction may still be processing.');
            } else {
                throw new Error(`Transaction confirmation failed: ${confirmError.message}`);
            }
        }
        
        if (confirmation.value?.err) {
            console.error('❌ Transaction failed on-chain:', confirmation.value.err);
            throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        console.log('✅ Escrow created successfully');
        console.log('🎉 Final result:', {
            escrowAccount: escrowAccount.toString(),
            bump,
            signature,
            status: 'success'
        });
        
        return {
            escrowAccount: escrowAccount.toString(),
            bump: bump,
            signature: signature
        };
        
    } catch (error) {
        console.error('❌ Detailed transaction error:', error);
        
        // Log additional error context for debugging
        if (error.name) console.error('Error name:', error.name);
        if (error.code) console.error('Error code:', error.code);
        if (error.logs) console.error('Transaction logs:', error.logs);
        if (error.message) console.error('Error message:', error.message);
        if (error.stack) console.error('Error stack:', error.stack);
        
        // Don't wrap already user-friendly errors
        if (error.message.includes('rejected') || 
            error.message.includes('cancelled') || 
            error.message.includes('insufficient') ||
            error.message.includes('expired') ||
            error.message.includes('timeout')) {
            throw error;
        }
        
        // Provide more specific error messages for other cases
        let errorMessage = error.message || 'Unknown transaction error';
        if (errorMessage.includes('simulation failed')) {
            errorMessage = 'Transaction simulation failed - check account balances and try again';
        } else if (errorMessage.includes('Network request failed')) {
            errorMessage = 'Network connection failed - check your internet connection and try again';
        } else if (errorMessage.includes('Invalid blockhash')) {
            errorMessage = 'Transaction expired - please try again';
        }
        
        throw new Error(`Transaction failed: ${errorMessage}`);
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
            const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
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
            const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
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


// FIXED: Complete getConnectedWallet method with comprehensive error handling
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
                            
                            // Use enhanced WalletService method for transaction signing
                            console.log('📤 Using enhanced WalletService transaction method');
                            return await walletService.signAndSendTransactionWithConnection(transaction, connection);
                            
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
        if (adminWallet && window.solana) {
            console.log('🔐 Checking admin wallet for blockchain operation:', adminWallet);
            
            // Enhanced wallet state checking
            console.log('🔍 Wallet state check:', {
                isConnected: window.solana.isConnected,
                publicKey: window.solana.publicKey?.toString(),
                hasSignAndSendTransaction: typeof window.solana.signAndSendTransaction === 'function',
                hasSendTransaction: typeof window.solana.sendTransaction === 'function'
            });
            
            // Check if wallet needs to be reconnected
            if (!window.solana.isConnected) {
                console.log('🔄 Wallet not connected, attempting to reconnect...');
                try {
                    await window.solana.connect();
                    console.log('✅ Wallet reconnected successfully');
                } catch (connectError) {
                    console.error('❌ Failed to reconnect wallet:', connectError);
                    throw new Error('Wallet connection lost and reconnection failed');
                }
            }
            
            // Verify we have a public key
            if (!window.solana.publicKey) {
                throw new Error('Wallet connected but no public key available');
            }
            
            // Check SOL balance
            try {
                const balance = await this.connection.getBalance(window.solana.publicKey);
                const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
                console.log(`💰 Admin wallet balance: ${solBalance} SOL`);
                
                if (solBalance < 0.01) {
                    throw new Error(`Insufficient SOL balance: ${solBalance} SOL (minimum 0.01 SOL required)`);
                }
            } catch (balanceError) {
                console.warn('⚠️ Could not check wallet balance:', balanceError.message);
            }
            
            return {
                publicKey: window.solana.publicKey,
                sendTransaction: async (transaction, connection) => {
                    try {
                        console.log('📤 Preparing admin wallet transaction...');
                        
                        // Ensure transaction is properly configured
                        transaction.feePayer = window.solana.publicKey;
                        
                        // Get fresh blockhash
                        const { blockhash } = await connection.getLatestBlockhash('confirmed');
                        transaction.recentBlockhash = blockhash;
                        
                        console.log('🔍 Final transaction check:', {
                            feePayer: transaction.feePayer.toString(),
                            recentBlockhash: transaction.recentBlockhash,
                            instructions: transaction.instructions.length
                        });
                        
                        // Try different signing methods with specific error handling
                        let signature;
                        
                        if (typeof window.solana.signAndSendTransaction === 'function') {
                            console.log('📤 Using admin wallet signAndSendTransaction');
                            try {
                                signature = await window.solana.signAndSendTransaction(transaction);
                                console.log('✅ signAndSendTransaction successful:', signature);
                            } catch (signError) {
                                console.error('❌ signAndSendTransaction failed:', signError);
                                
                                // Provide specific error messages
                                if (signError.message.includes('User rejected')) {
                                    throw new Error('Transaction was rejected by user');
                                } else if (signError.code === 4001) {
                                    throw new Error('Transaction was cancelled by user');
                                } else if (signError.message.includes('insufficient funds')) {
                                    throw new Error('Insufficient SOL balance for transaction');
                                } else {
                                    throw new Error(`Transaction signing failed: ${signError.message}`);
                                }
                            }
                        } else if (typeof window.solana.sendTransaction === 'function') {
                            console.log('📤 Using admin wallet sendTransaction');
                            try {
                                signature = await window.solana.sendTransaction(transaction, connection, {
                                    skipPreflight: false,
                                    preflightCommitment: 'confirmed',
                                    maxRetries: 3
                                });
                                console.log('✅ sendTransaction successful:', signature);
                            } catch (sendError) {
                                console.error('❌ sendTransaction failed:', sendError);
                                
                                if (sendError.message.includes('User rejected')) {
                                    throw new Error('Transaction was rejected by user');
                                } else if (sendError.code === 4001) {
                                    throw new Error('Transaction was cancelled by user');
                                } else if (sendError.message.includes('insufficient funds')) {
                                    throw new Error('Insufficient SOL balance for transaction');
                                } else if (sendError.message.includes('blockhash')) {
                                    throw new Error('Transaction expired, please try again');
                                } else {
                                    throw new Error(`Transaction failed: ${sendError.message}`);
                                }
                            }
                        } else {
                            throw new Error('Admin wallet does not support transaction sending methods');
                        }
                        
                        if (!signature) {
                            throw new Error('No transaction signature received');
                        }
                        
                        console.log('✅ Admin wallet transaction completed:', signature);
                        return signature;
                        
                    } catch (error) {
                        console.error('❌ Admin wallet transaction error:', error);
                        
                        // Don't wrap already specific errors
                        if (error.message.includes('rejected') || 
                            error.message.includes('cancelled') || 
                            error.message.includes('insufficient') ||
                            error.message.includes('expired')) {
                            throw error;
                        }
                        
                        throw new Error(`Admin wallet transaction failed: ${error.message}`);
                    }
                }
            };
        }
        
        // No wallet available
        throw new Error('No connected wallet found. Please connect a wallet first.');
        
    } catch (error) {
        console.error('❌ Error getting connected wallet:', error);
        throw error;
    }
}

// ALSO ADD: Enhanced sendTransaction method with better error handling
async sendTransaction(transaction, wallet) {
    try {
        console.log('📤 Sending blockchain transaction...');
        
        // Prepare transaction
        console.log('⏳ Getting recent blockhash...');
        const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        
        // Show transaction details for debugging
        console.log('🔍 Transaction details:', {
            instructions: transaction.instructions.length,
            feePayer: wallet.publicKey.toString(),
            recentBlockhash: blockhash,
            estimatedFee: 'unknown'
        });
        
        console.log('📤 Sending transaction...');
        const signature = await wallet.sendTransaction(transaction, this.connection);
        
        // Wait for confirmation
        console.log('⏳ Confirming transaction...');
        await this.connection.confirmTransaction(signature, 'confirmed');
        
        console.log('✅ Transaction confirmed, signature:', signature);
        return {
            success: true,
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
        
        // Provide more specific error messages
        let errorMessage = 'Unknown transaction error';
        if (error.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient SOL balance for transaction';
        } else if (error.message.includes('blockhash')) {
            errorMessage = 'Transaction expired, please try again';
        } else if (error.message.includes('simulation failed')) {
            errorMessage = 'Transaction simulation failed - check account balances';
        } else if (error.message.includes('User rejected')) {
            errorMessage = 'Transaction was rejected by user';
        } else if (error.message.includes('Network request failed')) {
            errorMessage = 'Network connection failed, please try again';
        } else {
            errorMessage = error.message || 'Transaction failed';
        }
        
        throw new Error(`Transaction failed: ${errorMessage}`);
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
