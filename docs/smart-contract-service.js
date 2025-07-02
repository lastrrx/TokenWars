// Jupiter API Integration Smart Contract Service
// Updated to work with the new smart contract: Dqusfo21uM5XX6rEpSVRXuLikyf1drkisqGUDDFo2qj5

class JupiterSmartContractService {
    constructor() {
        this.available = false;
        this.programId = null;
        this.connection = null;
        this.instructions = {};
        this.jupiterApiUrl = 'https://lite-api.jup.ag/tokens/v2';
        this.priceCache = new Map();
        this.lastCacheUpdate = 0;
        this.cacheTimeout = 30000; // 30 seconds cache
    }

    // Initialize the service with Jupiter API integration
    async initialize() {
        try {
            console.log('🚀 Initializing Jupiter Smart Contract Service...');
            
            // Check if Solana Web3 is available
            if (typeof solanaWeb3 === 'undefined') {
                console.error('❌ Solana Web3 not found');
                return false;
            }

            // Initialize connection to Solana devnet
            this.connection = new solanaWeb3.Connection(
                'https://api.devnet.solana.com',
                'confirmed'
            );

            // Set the new program ID for Jupiter integration
            this.programId = new solanaWeb3.PublicKey('Dqusfo21uM5XX6rEpSVRXuLikyf1drkisqGUDDFo2qj5');

            // Test connection
            const latestBlockhash = await this.connection.getLatestBlockhash();
            console.log('✅ Connected to Solana devnet, latest blockhash:', latestBlockhash.blockhash);

            // Initialize instruction discriminators for new contract
            this.instructions = {
                createEscrow: Buffer.from([0x8c, 0x97, 0x25, 0x8f, 0x4e, 0x2c, 0x8a, 0x8b]),
                placeBet: Buffer.from([0x72, 0x1c, 0xf9, 0x8a, 0x5d, 0x2e, 0x8b, 0x9c]),
                startCompetition: Buffer.from([0x65, 0x8f, 0x3a, 0x7b, 0x4e, 0x9c, 0x2d, 0x8a]),
                updateTwapSample: Buffer.from([0x91, 0x4c, 0x8b, 0x2e, 0x7d, 0x3f, 0x9a, 0x5c]),
                finalizeStartTwap: Buffer.from([0x83, 0x6f, 0x9c, 0x4a, 0x5e, 0x8b, 0x2d, 0x7f]),
                resolveCompetition: Buffer.from([0x74, 0x8e, 0x3c, 0x9b, 0x6d, 0x4f, 0x8a, 0x2e]),
                withdrawWinnings: Buffer.from([0x92, 0x5d, 0x8f, 0x3e, 0x7c, 0x9a, 0x4b, 0x6e]),
                collectPlatformFee: Buffer.from([0x85, 0x9f, 0x4c, 0x7e, 0x3d, 0x8b, 0x6a, 0x2f]),
                cleanupEscrow: Buffer.from([0x99, 0x2f, 0x7e, 0x4c, 0x8b, 0x3d, 0x9a, 0x5f])
            };

            this.available = true;
            console.log('✅ Jupiter Smart Contract Service initialized successfully');
            console.log('📋 New Program ID:', this.programId.toString());
            return true;
            
        } catch (error) {
            console.error('❌ Jupiter Smart Contract Service initialization failed:', error);
            this.available = false;
            return false;
        }
    }

    // Fetch token data from Jupiter API
    async fetchJupiterTokenData(tokenAddresses) {
        try {
            const now = Date.now();
            
            // Check cache first
            if (now - this.lastCacheUpdate < this.cacheTimeout) {
                const cachedData = [];
                let allCached = true;
                
                for (const address of tokenAddresses) {
                    if (this.priceCache.has(address)) {
                        cachedData.push({
                            address,
                            ...this.priceCache.get(address)
                        });
                    } else {
                        allCached = false;
                        break;
                    }
                }
                
                if (allCached) {
                    console.log('📊 Using cached Jupiter data');
                    return cachedData;
                }
            }

            console.log('🔍 Fetching fresh Jupiter API data for tokens:', tokenAddresses);
            
            // Fetch from Jupiter API
            const response = await fetch(this.jupiterApiUrl);
            if (!response.ok) {
                throw new Error(`Jupiter API error: ${response.status}`);
            }

            const allTokens = await response.json();
            console.log(`📊 Fetched ${Object.keys(allTokens).length} tokens from Jupiter API`);

            // Filter requested tokens and add market cap data
            const tokenData = [];
            for (const address of tokenAddresses) {
                const tokenInfo = allTokens[address];
                if (tokenInfo) {
                    const data = {
                        address,
                        symbol: tokenInfo.symbol,
                        name: tokenInfo.name,
                        price: parseFloat(tokenInfo.price || 0),
                        marketCap: this.calculateMarketCap(tokenInfo),
                        timestamp: now
                    };
                    
                    tokenData.push(data);
                    this.priceCache.set(address, data);
                } else {
                    console.warn(`⚠️ Token ${address} not found in Jupiter API`);
                    // Use fallback data
                    const fallbackData = {
                        address,
                        symbol: 'UNKNOWN',
                        name: 'Unknown Token',
                        price: 0,
                        marketCap: 0,
                        timestamp: now
                    };
                    tokenData.push(fallbackData);
                }
            }

            this.lastCacheUpdate = now;
            console.log('✅ Jupiter API data processed:', tokenData.length, 'tokens');
            return tokenData;

        } catch (error) {
            console.error('❌ Error fetching Jupiter token data:', error);
            throw error;
        }
    }

    // Calculate market cap from Jupiter token info
    calculateMarketCap(tokenInfo) {
        try {
            // Jupiter API provides price, calculate market cap if supply is available
            const price = parseFloat(tokenInfo.price || 0);
            const supply = parseFloat(tokenInfo.totalSupply || tokenInfo.supply || 0);
            
            if (price > 0 && supply > 0) {
                return Math.floor(price * supply);
            }
            
            // Use existing market cap if available
            return parseInt(tokenInfo.marketCap || tokenInfo.market_cap || 0);
        } catch (error) {
            console.error('❌ Error calculating market cap:', error);
            return 0;
        }
    }

    // Create competition escrow with Jupiter token addresses
    async createCompetitionEscrow(competitionId, tokenAAddress, tokenBAddress, votingEndTime, competitionEndTime, platformFeeBps, adminWallet) {
        try {
            console.log('🎯 Creating competition escrow with Jupiter integration:', competitionId);
            
            if (!this.available) {
                throw new Error('Jupiter Smart Contract Service not available');
            }

            const wallet = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount, bump] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );

            // Build create_escrow instruction with token addresses
            const instruction = await this.buildCreateEscrowInstruction({
                escrow: escrowAccount,
                authority: new solanaWeb3.PublicKey(adminWallet),
                systemProgram: solanaWeb3.SystemProgram.programId,
                competitionId: competitionId,
                tokenAAddress: tokenAAddress,
                tokenBAddress: tokenBAddress,
                votingEndTime: votingEndTime,
                competitionEndTime: competitionEndTime,
                platformFeeBps: platformFeeBps
            });

            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(adminWallet);

            // Sign and send transaction
            const signedTransaction = await wallet.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
            
            // Confirm transaction
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            console.log('✅ Competition escrow created:', competitionId);
            return {
                signature,
                escrowAccount: escrowAccount.toString(),
                competitionId
            };

        } catch (error) {
            console.error('❌ Error creating competition escrow:', error);
            throw error;
        }
    }

    // Start competition with Jupiter API data
    async startCompetition(competitionId, tokenAAddress, tokenBAddress, adminWallet) {
        try {
            console.log('🚀 Starting competition with Jupiter TWAP collection:', competitionId);
            
            // Fetch current Jupiter data for both tokens
            const tokenData = await this.fetchJupiterTokenData([tokenAAddress, tokenBAddress]);
            
            const tokenAData = tokenData.find(t => t.address === tokenAAddress);
            const tokenBData = tokenData.find(t => t.address === tokenBAddress);
            
            if (!tokenAData || !tokenBData) {
                throw new Error('Could not fetch token data from Jupiter API');
            }

            const wallet = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );

            // Convert prices and market caps to appropriate scale (multiply by 1e6 for precision)
            const tokenAPrice = Math.floor(tokenAData.price * 1e6);
            const tokenBPrice = Math.floor(tokenBData.price * 1e6);
            const tokenAMarketCap = tokenAData.marketCap;
            const tokenBMarketCap = tokenBData.marketCap;

            // Build start_competition instruction
            const instruction = await this.buildStartCompetitionInstruction({
                escrow: escrowAccount,
                authority: new solanaWeb3.PublicKey(adminWallet),
                competitionId: competitionId,
                tokenAPrice: tokenAPrice,
                tokenBPrice: tokenBPrice,
                tokenAMarketCap: tokenAMarketCap,
                tokenBMarketCap: tokenBMarketCap
            });

            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(adminWallet);

            // Sign and send transaction
            const signedTransaction = await wallet.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
            
            // Confirm transaction
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            console.log('✅ Competition started with Jupiter data:', {
                competitionId,
                tokenAPrice: tokenAData.price,
                tokenBPrice: tokenBData.price,
                tokenAMarketCap: tokenAData.marketCap,
                tokenBMarketCap: tokenBData.marketCap
            });

            // Start TWAP sampling process
            this.startTwapSampling(competitionId, tokenAAddress, tokenBAddress, adminWallet);
            
            return {
                signature,
                tokenAPrice: tokenAData.price,
                tokenBPrice: tokenBData.price,
                tokenAMarketCap: tokenAData.marketCap,
                tokenBMarketCap: tokenBData.marketCap
            };

        } catch (error) {
            console.error('❌ Error starting competition:', error);
            throw error;
        }
    }

    // TWAP sampling every 5 seconds during collection windows
    startTwapSampling(competitionId, tokenAAddress, tokenBAddress, adminWallet) {
        console.log('📊 Starting TWAP sampling for competition:', competitionId);
        
        const samplingInterval = setInterval(async () => {
            try {
                // Fetch current Jupiter data
                const tokenData = await this.fetchJupiterTokenData([tokenAAddress, tokenBAddress]);
                
                const tokenAData = tokenData.find(t => t.address === tokenAAddress);
                const tokenBData = tokenData.find(t => t.address === tokenBAddress);
                
                if (!tokenAData || !tokenBData) {
                    console.warn('⚠️ Could not fetch token data for TWAP sampling');
                    return;
                }

                // Update TWAP sample on-chain
                await this.updateTwapSample(
                    competitionId,
                    Math.floor(tokenAData.price * 1e6),
                    Math.floor(tokenBData.price * 1e6),
                    tokenAData.marketCap,
                    tokenBData.marketCap,
                    adminWallet
                );

                console.log('📊 TWAP sample updated:', {
                    competitionId,
                    tokenAPrice: tokenAData.price,
                    tokenBPrice: tokenBData.price
                });

            } catch (error) {
                console.error('❌ Error in TWAP sampling:', error);
                // Continue sampling despite errors
            }
        }, 5000); // Every 5 seconds

        // Store interval ID for cleanup
        if (!this.twapIntervals) {
            this.twapIntervals = new Map();
        }
        this.twapIntervals.set(competitionId, samplingInterval);

        // Stop sampling after 1 hour (adjust based on competition duration)
        setTimeout(() => {
            clearInterval(samplingInterval);
            this.twapIntervals.delete(competitionId);
            console.log('🛑 TWAP sampling stopped for competition:', competitionId);
        }, 3600000); // 1 hour
    }

    // Update TWAP sample on-chain
    async updateTwapSample(competitionId, tokenAPrice, tokenBPrice, tokenAMarketCap, tokenBMarketCap, adminWallet) {
        try {
            const wallet = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );

            // Build update_twap_sample instruction
            const instruction = await this.buildUpdateTwapInstruction({
                escrow: escrowAccount,
                authority: new solanaWeb3.PublicKey(adminWallet),
                competitionId: competitionId,
                tokenAPrice: tokenAPrice,
                tokenBPrice: tokenBPrice,
                tokenAMarketCap: tokenAMarketCap,
                tokenBMarketCap: tokenBMarketCap
            });

            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(adminWallet);

            // Sign and send transaction
            const signedTransaction = await wallet.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
            
            // Don't wait for confirmation to keep sampling fast
            this.connection.confirmTransaction(signature, 'confirmed').catch(err => {
                console.warn('⚠️ TWAP sample confirmation failed:', err);
            });

            return signature;

        } catch (error) {
            console.error('❌ Error updating TWAP sample:', error);
            throw error;
        }
    }

    // Place bet with updated smart contract
    async placeBet(competitionId, tokenChoice, betAmount, userWallet) {
        try {
            console.log('💰 Placing bet:', competitionId, tokenChoice, betAmount);
            
            const wallet = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );

            // Build place_bet instruction
            const instruction = await this.buildPlaceBetInstruction({
                escrow: escrowAccount,
                user: new solanaWeb3.PublicKey(userWallet),
                systemProgram: solanaWeb3.SystemProgram.programId,
                competitionId: competitionId,
                tokenChoice: tokenChoice,
                betAmount: betAmount
            });

            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(userWallet);

            // Sign and send transaction
            const signedTransaction = await wallet.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
            
            // Confirm transaction
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            console.log('✅ Bet placed successfully:', competitionId);
            return signature;

        } catch (error) {
            console.error('❌ Error placing bet:', error);
            throw error;
        }
    }

    // Collect platform fee with variable percentage
    async collectPlatformFee(competitionId, platformWallet) {
        try {
            console.log('💳 Collecting platform fee:', competitionId);
            
            const wallet = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );

            // Build collect_platform_fee instruction
            const instruction = await this.buildCollectPlatformFeeInstruction({
                escrow: escrowAccount,
                platformWallet: new solanaWeb3.PublicKey(platformWallet),
                competitionId: competitionId
            });

            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(platformWallet);

            // Sign and send transaction
            const signedTransaction = await wallet.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
            
            // Confirm transaction
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            console.log('✅ Platform fee collected:', competitionId);
            return signature;

        } catch (error) {
            console.error('❌ Error collecting platform fee:', error);
            throw error;
        }
    }

    // Cleanup escrow after 3 months
    async cleanupEscrow(competitionId, platformWallet) {
        try {
            console.log('🧹 Cleaning up escrow after 3 months:', competitionId);
            
            const wallet = await this.getConnectedWallet();
            
            // Get escrow PDA
            const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from("escrow"), Buffer.from(competitionId)],
                this.programId
            );

            // Build cleanup_escrow instruction
            const instruction = await this.buildCleanupEscrowInstruction({
                escrow: escrowAccount,
                platformWallet: new solanaWeb3.PublicKey(platformWallet),
                competitionId: competitionId
            });

            const transaction = new solanaWeb3.Transaction().add(instruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new solanaWeb3.PublicKey(platformWallet);

            // Sign and send transaction
            const signedTransaction = await wallet.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
            
            // Confirm transaction
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            console.log('✅ Escrow cleaned up, unclaimed funds sent to platform:', competitionId);
            return signature;

        } catch (error) {
            console.error('❌ Error cleaning up escrow:', error);
            throw error;
        }
    }

    // Build instruction methods (simplified for space)
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
            this.serializeI64(accounts.votingEndTime),
            this.serializeI64(accounts.competitionEndTime),
            this.serializeU16(accounts.platformFeeBps)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    async buildStartCompetitionInstruction(accounts) {
        const keys = [
            { pubkey: accounts.escrow, isSigner: false, isWritable: true },
            { pubkey: accounts.authority, isSigner: true, isWritable: false }
        ];
        
        const data = Buffer.concat([
            this.instructions.startCompetition,
            this.serializeString(accounts.competitionId),
            this.serializeU64(accounts.tokenAPrice),
            this.serializeU64(accounts.tokenBPrice),
            this.serializeU64(accounts.tokenAMarketCap),
            this.serializeU64(accounts.tokenBMarketCap)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    async buildUpdateTwapInstruction(accounts) {
        const keys = [
            { pubkey: accounts.escrow, isSigner: false, isWritable: true },
            { pubkey: accounts.authority, isSigner: true, isWritable: false }
        ];
        
        const data = Buffer.concat([
            this.instructions.updateTwapSample,
            this.serializeString(accounts.competitionId),
            this.serializeU64(accounts.tokenAPrice),
            this.serializeU64(accounts.tokenBPrice),
            this.serializeU64(accounts.tokenAMarketCap),
            this.serializeU64(accounts.tokenBMarketCap)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    async buildPlaceBetInstruction(accounts) {
        const keys = [
            { pubkey: accounts.escrow, isSigner: false, isWritable: true },
            { pubkey: accounts.user, isSigner: true, isWritable: true },
            { pubkey: accounts.systemProgram, isSigner: false, isWritable: false }
        ];
        
        const data = Buffer.concat([
            this.instructions.placeBet,
            this.serializeString(accounts.competitionId),
            this.serializeU8(accounts.tokenChoice),
            this.serializeU64(accounts.betAmount)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    async buildCollectPlatformFeeInstruction(accounts) {
        const keys = [
            { pubkey: accounts.escrow, isSigner: false, isWritable: true },
            { pubkey: accounts.platformWallet, isSigner: true, isWritable: true }
        ];
        
        const data = Buffer.concat([
            this.instructions.collectPlatformFee,
            this.serializeString(accounts.competitionId)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    async buildCleanupEscrowInstruction(accounts) {
        const keys = [
            { pubkey: accounts.escrow, isSigner: false, isWritable: true },
            { pubkey: accounts.platformWallet, isSigner: true, isWritable: true }
        ];
        
        const data = Buffer.concat([
            this.instructions.cleanupEscrow,
            this.serializeString(accounts.competitionId)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    // Serialization helpers
    serializeString(str) {
        const bytes = Buffer.from(str, 'utf8');
        const length = Buffer.alloc(4);
        length.writeUInt32LE(bytes.length, 0);
        return Buffer.concat([length, bytes]);
    }

    serializeU8(value) {
        const buffer = Buffer.alloc(1);
        buffer.writeUInt8(value, 0);
        return buffer;
    }

    serializeU16(value) {
        const buffer = Buffer.alloc(2);
        buffer.writeUInt16LE(value, 0);
        return buffer;
    }

    serializeU64(value) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value), 0);
        return buffer;
    }

    serializeI64(value) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigInt64LE(BigInt(value), 0);
        return buffer;
    }

    // Get connected wallet
    async getConnectedWallet() {
        if (typeof window !== 'undefined' && window.walletService) {
            const wallet = await window.walletService.getConnectedWallet();
            if (!wallet) {
                throw new Error('No wallet connected');
            }
            return wallet;
        }
        throw new Error('Wallet service not available');
    }

    // Check if service is available
    isAvailable() {
        return this.available;
    }

    // Get program ID
    getProgramId() {
        return this.programId ? this.programId.toString() : null;
    }

    // Stop all TWAP sampling
    stopAllTwapSampling() {
        if (this.twapIntervals) {
            for (const [competitionId, interval] of this.twapIntervals) {
                clearInterval(interval);
                console.log('🛑 Stopped TWAP sampling for:', competitionId);
            }
            this.twapIntervals.clear();
        }
    }
}

// Initialize global instance
if (typeof window !== 'undefined') {
    window.jupiterSmartContractService = new JupiterSmartContractService();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await window.jupiterSmartContractService.initialize();
        });
    } else {
        window.jupiterSmartContractService.initialize();
    }
}

console.log('🎯 Jupiter Smart Contract Service module loaded');
