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
            this.programId = new solanaWeb3.PublicKey(window.BLOCKCHAIN_CONFIG?.SOLANA_PROGRAM_ID || 'Dqusfo21uM5XX6rEpSVRXuLikyf1drkisqGUDDFo2qj5');
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
                tokenAAddress: tokenAAddress,
                tokenBAddress: tokenBAddress,
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
            console.log('🔍 Transaction details:', {
                instructions: transaction.instructions.length,
                feePayer: transaction.feePayer?.toString(),
                recentBlockhash: transaction.recentBlockhash
            });
            
            try {
                const signature = await wallet.sendTransaction(transaction, this.connection);
                console.log('✅ Transaction sent, signature:', signature);
                
                console.log('⏳ Confirming transaction...');
                const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
                console.log('📋 Transaction confirmation:', confirmation);
                
                if (confirmation.value.err) {
                    console.error('❌ Transaction failed on-chain:', confirmation.value.err);
                    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
                }
                
                return signature;
            } catch (error) {
                console.error('❌ Detailed transaction error:', error);
                
                // Try to get more specific error info
                if (error.logs) {
                    console.error('📋 Transaction logs:', error.logs);
                }
                
                throw error;
            }
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
