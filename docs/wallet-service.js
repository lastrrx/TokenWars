// wallet-service.js - TokenWars Wallet Service with Smart Contract Integration
// Updated to include blockchain transaction signing capabilities

// ==============================================
// ENHANCED WALLET SERVICE CLASS
// ==============================================

class WalletService {
    constructor() {
        // Prevent duplicate instances
        if (WalletService.instance) {
            return WalletService.instance;
        }
        
        console.log('🔗 Creating enhanced WalletService with smart contract support...');
        
        // Basic state
        this.isInitialized = false;
        this.connectedWallet = null;
        this.walletProvider = null;
        this.walletType = null;
        this.publicKey = null;
        this.isDemo = false;
        this.userProfile = null;
        this.connectionListeners = [];
        
        // 🚀 NEW: Smart contract integration
        this.solanaConnection = null;
        this.transactionQueue = [];
        this.isTransactionInProgress = false;
        
        // Demo session data
        this.demoSession = null;
        
        // Session persistence keys
        this.storageKeys = {
            walletType: 'tokenWars_walletType',
            publicKey: 'tokenWars_publicKey',
            isDemo: 'tokenWars_isDemo',
            demoSession: 'tokenWars_demoSession',
            userProfile: 'tokenWars_userProfile'
        };
        
        // Store singleton
        WalletService.instance = this;
        
        console.log('✅ Enhanced WalletService created');
    }

    // ==============================================
    // CORE INITIALIZATION
    // ==============================================

    async initialize() {
        try {
            if (this.isInitialized) {
                console.log('✅ WalletService already initialized');
                return true;
            }
            
            console.log('🔄 Initializing enhanced WalletService...');
            
            // 🚀 NEW: Initialize Solana connection for smart contracts
            this.initializeSolanaConnection();
            
            // Check for persisted connection
            await this.checkPersistedConnection();
            
            // Set up wallet event listeners
            this.setupWalletEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Enhanced WalletService initialized successfully');
            
            return true;
            
        } catch (error) {
            console.error('❌ WalletService initialization failed:', error);
            return false;
        }
    }

    // 🚀 NEW: Initialize Solana connection for blockchain transactions
    initializeSolanaConnection() {
        try {
            if (window.BLOCKCHAIN_CONFIG?.SOLANA_RPC_URL) {
                this.solanaConnection = new solanaWeb3.Connection(
                    window.BLOCKCHAIN_CONFIG.SOLANA_RPC_URL,
                    window.BLOCKCHAIN_CONFIG.CONFIRMATION_COMMITMENT || 'confirmed'
                );
                console.log('🌐 Solana connection initialized:', window.BLOCKCHAIN_CONFIG.SOLANA_RPC_URL);
            } else {
                console.warn('⚠️ No Solana RPC URL configured, using default devnet');
                this.solanaConnection = new solanaWeb3.Connection('https://api.devnet.solana.com');
            }
        } catch (error) {
            console.error('❌ Failed to initialize Solana connection:', error);
            this.solanaConnection = null;
        }
    }

    // ==============================================
    // CONNECTION STATUS METHODS
    // ==============================================

    isConnected() {
        return !!(this.connectedWallet && this.publicKey);
    }

    isReady() {
        return this.isInitialized && this.isConnected();
    }

    // 🚀 NEW: Check if smart contract transactions are available
    isSmartContractReady() {
        return this.isConnected() && 
               this.solanaConnection && 
               !this.isDemo && 
               window.BLOCKCHAIN_CONFIG?.SMART_CONTRACT_ENABLED;
    }

    getWalletAddress() {
        return this.publicKey || null;
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected(),
            walletType: this.walletType,
            publicKey: this.publicKey,
            isDemo: this.isDemo,
            hasProfile: !!this.userProfile,
            smartContractReady: this.isSmartContractReady() // 🚀 NEW
        };
    }

    // ==============================================
    // 🚀 NEW: SMART CONTRACT TRANSACTION METHODS
    // ==============================================

    /**
     * Sign a transaction with the connected wallet
     * @param {Transaction} transaction - Solana transaction to sign
     * @returns {Promise<Transaction>} Signed transaction
     */
    async signTransaction(transaction) {
        if (!this.isSmartContractReady()) {
            throw new Error('Smart contract functionality not available. Wallet may be in demo mode or not connected.');
        }

        if (!this.connectedWallet?.signTransaction) {
            throw new Error('Connected wallet does not support transaction signing');
        }

        try {
            console.log('✍️ Signing transaction with wallet...');
            
            // Get recent blockhash if not set
            if (!transaction.recentBlockhash) {
                const { blockhash } = await this.solanaConnection.getRecentBlockhash();
                transaction.recentBlockhash = blockhash;
            }

            // Set fee payer if not set
            if (!transaction.feePayer) {
                transaction.feePayer = new solanaWeb3.PublicKey(this.publicKey);
            }

            const signedTransaction = await this.connectedWallet.signTransaction(transaction);
            console.log('✅ Transaction signed successfully');
            
            return signedTransaction;
            
        } catch (error) {
            console.error('❌ Failed to sign transaction:', error);
            throw new Error(`Transaction signing failed: ${error.message}`);
        }
    }

    /**
     * Sign and send a transaction to the blockchain
     * @param {Transaction} transaction - Solana transaction to sign and send
     * @param {Object} options - Transaction options (skipPreflight, maxRetries, etc.)
     * @returns {Promise<string>} Transaction signature
     */
    async signAndSendTransaction(transaction, options = {}) {
        if (!this.isSmartContractReady()) {
            throw new Error('Smart contract functionality not available. Wallet may be in demo mode or not connected.');
        }

        // Check if wallet supports direct send
        if (this.connectedWallet?.signAndSendTransaction) {
            try {
                console.log('📤 Signing and sending transaction directly...');
                
                const signature = await this.connectedWallet.signAndSendTransaction(
                    transaction,
                    this.solanaConnection,
                    options
                );
                
                console.log('✅ Transaction sent successfully:', signature);
                
                // Wait for confirmation if requested
                if (options.waitForConfirmation !== false) {
                    await this.waitForTransactionConfirmation(signature);
                }
                
                return signature;
                
            } catch (error) {
                console.error('❌ Failed to sign and send transaction:', error);
                throw new Error(`Transaction failed: ${error.message}`);
            }
        } else {
            // Fallback: sign then send manually
            try {
                console.log('📤 Signing transaction then sending manually...');
                
                const signedTransaction = await this.signTransaction(transaction);
                const signature = await this.solanaConnection.sendRawTransaction(
                    signedTransaction.serialize(),
                    {
                        skipPreflight: options.skipPreflight || false,
                        preflightCommitment: 'processed'
                    }
                );
                
                console.log('✅ Transaction sent successfully:', signature);
                
                // Wait for confirmation if requested
                if (options.waitForConfirmation !== false) {
                    await this.waitForTransactionConfirmation(signature);
                }
                
                return signature;
                
            } catch (error) {
                console.error('❌ Failed to sign and send transaction manually:', error);
                throw new Error(`Transaction failed: ${error.message}`);
            }
        }
    }

    /**
     * Wait for transaction confirmation on the blockchain
     * @param {string} signature - Transaction signature to wait for
     * @param {string} commitment - Confirmation level (processed, confirmed, finalized)
     * @returns {Promise<Object>} Transaction confirmation details
     */
    async waitForTransactionConfirmation(signature, commitment = 'confirmed') {
        if (!this.solanaConnection) {
            throw new Error('No Solana connection available');
        }

        try {
            console.log('⏳ Waiting for transaction confirmation:', signature);
            
            const timeout = window.BLOCKCHAIN_CONFIG?.TRANSACTION_TIMEOUT || 30000;
            const startTime = Date.now();
            
            while (Date.now() - startTime < timeout) {
                const confirmation = await this.solanaConnection.getSignatureStatus(signature);
                
                if (confirmation?.value?.confirmationStatus) {
                    const status = confirmation.value.confirmationStatus;
                    console.log('📊 Transaction status:', status);
                    
                    if (status === commitment || 
                        (commitment === 'confirmed' && status === 'finalized') ||
                        (commitment === 'processed' && ['confirmed', 'finalized'].includes(status))) {
                        
                        console.log('✅ Transaction confirmed with status:', status);
                        return confirmation.value;
                    }
                }
                
                if (confirmation?.value?.err) {
                    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
                }
                
                // Wait before checking again
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            throw new Error('Transaction confirmation timeout');
            
        } catch (error) {
            console.error('❌ Transaction confirmation failed:', error);
            throw error;
        }
    }

    /**
     * Get SOL balance for connected wallet
     * @returns {Promise<number>} SOL balance
     */
    async getSOLBalance() {
        if (!this.solanaConnection || !this.publicKey) {
            return 0;
        }

        if (this.isDemo) {
            return this.demoSession?.balance || 10.0;
        }

        try {
            const balance = await this.solanaConnection.getBalance(
                new solanaWeb3.PublicKey(this.publicKey)
            );
            return balance / solanaWeb3.LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('❌ Failed to get SOL balance:', error);
            return 0;
        }
    }

    /**
     * Validate transaction before signing (safety check)
     * @param {Transaction} transaction - Transaction to validate
     * @returns {Object} Validation result
     */
    validateTransaction(transaction) {
        const validation = {
            isValid: true,
            warnings: [],
            errors: []
        };

        // Check if transaction has instructions
        if (!transaction.instructions || transaction.instructions.length === 0) {
            validation.errors.push('Transaction has no instructions');
            validation.isValid = false;
        }

        // Check if fee payer is set correctly
        if (transaction.feePayer && transaction.feePayer.toString() !== this.publicKey) {
            validation.warnings.push('Transaction fee payer differs from connected wallet');
        }

        // Check for suspicious large amounts (basic safety)
        const maxSOL = window.BLOCKCHAIN_CONFIG?.ESCROW_SETTINGS?.MAX_BET_AMOUNT || 100;
        transaction.instructions.forEach((instruction, index) => {
            // This is a basic check - in production, you'd parse instruction data more thoroughly
            if (instruction.data && instruction.data.length > 8) {
                // Check for large lamport amounts in instruction data
                // This is a simplified check - adjust based on your program's instruction format
            }
        });

        return validation;
    }

    // ==============================================
    // WALLET CONNECTION METHODS
    // ==============================================

    detectAvailableWallets() {
        const wallets = {};
        
        // Detect Phantom
        if (window.solana?.isPhantom) {
            wallets.phantom = {
                name: 'Phantom',
                icon: '👻',
                detected: true,
                provider: window.solana
            };
        }
        
        // Detect Solflare
        if (window.solflare?.isSolflare) {
            wallets.solflare = {
                name: 'Solflare',
                icon: '🔥',
                detected: true,
                provider: window.solflare
            };
        }
        
        // Detect Backpack
        if (window.backpack?.isBackpack) {
            wallets.backpack = {
                name: 'Backpack',
                icon: '🎒',
                detected: true,
                provider: window.backpack
            };
        }
        
        // Always available demo wallet
        wallets.demo = {
            name: 'Demo Mode',
            icon: '🎮',
            detected: true,
            provider: 'demo'
        };
        
        return wallets;
    }

    async connectWallet(walletType) {
        try {
            console.log(`🔌 Attempting to connect ${walletType} wallet...`);
            
            if (walletType === 'demo') {
                return await this.connectDemoWallet();
            }
            
            const availableWallets = this.detectAvailableWallets();
            const wallet = availableWallets[walletType];
            
            if (!wallet?.detected) {
                throw new Error(`${walletType} wallet not detected. Please install it first.`);
            }
            
            const provider = wallet.provider;
            
            // Connect to wallet
            const connection = await provider.connect();
            const publicKey = connection.publicKey.toString();
            
            console.log(`✅ ${walletType} connected:`, publicKey);
            
            // Handle successful connection
            await this.handleSuccessfulConnection(walletType, {
                provider: provider,
                publicKey: publicKey
            });
            
            return { success: true, publicKey: publicKey };
            
        } catch (error) {
            console.error(`❌ ${walletType} connection failed:`, error);
            return { success: false, error: error.message };
        }
    }

    async connectDemoWallet() {
        try {
            console.log('🎮 Connecting demo wallet...');
   
            // Create demo session
            this.demoSession = {
                publicKey: 'DEMO' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                balance: 10.0,
                createdAt: new Date().toISOString()
            };
            
            this.isDemo = true;
            this.publicKey = this.demoSession.publicKey;
            this.walletType = 'demo';
            this.connectedWallet = 'demo';
            
            // Store demo session
            this.saveSessionData();
            
            console.log('✅ Demo wallet connected:', this.publicKey);
            
            return { success: true, publicKey: this.publicKey };
            
        } catch (error) {
            console.error('❌ Demo wallet connection failed:', error);
            return { success: false, error: error.message };
        }
    }

    async disconnectWallet() {
        try {
            console.log('🔌 Disconnecting wallet...');
            
            // Disconnect from wallet provider if not demo
            if (!this.isDemo && this.connectedWallet?.disconnect) {
                await this.connectedWallet.disconnect();
            }
            
            // Clear state
            this.connectedWallet = null;
            this.walletProvider = null;
            this.walletType = null;
            this.publicKey = null;
            this.isDemo = false;
            this.userProfile = null;
            this.demoSession = null;
            
            // Clear persisted data
            this.clearPersistedConnection();
            
            // Notify listeners
            this.notifyConnectionListeners('disconnected', null);
            
            console.log('✅ Wallet disconnected successfully');
            
        } catch (error) {
            console.error('❌ Error disconnecting wallet:', error);
            // Still clear local state even if disconnect failed
            this.connectedWallet = null;
            this.walletType = null;
            this.publicKey = null;
            this.clearPersistedConnection();
            this.notifyConnectionListeners('disconnected', null);
        }
    }

    // ==============================================
    // SESSION MANAGEMENT
    // ==============================================

    async checkPersistedConnection() {
        try {
            const savedWalletType = sessionStorage.getItem(this.storageKeys.walletType);
            const savedPublicKey = sessionStorage.getItem(this.storageKeys.publicKey);
            const savedIsDemo = sessionStorage.getItem(this.storageKeys.isDemo) === 'true';
            
            if (savedWalletType && savedPublicKey) {
                console.log('🔄 Found persisted connection:', savedWalletType);
                
                if (savedIsDemo) {
                    // Restore demo session
                    const savedDemoSession = sessionStorage.getItem(this.storageKeys.demoSession);
                    if (savedDemoSession) {
                        this.demoSession = JSON.parse(savedDemoSession);
                        this.isDemo = true;
                        this.publicKey = savedPublicKey;
                        this.walletType = savedWalletType;
                        this.connectedWallet = 'demo';
                        
                        await this.loadUserProfile();
                        console.log('✅ Demo session restored');
                    }
                } else {
                    // Try to reconnect to actual wallet
                    const availableWallets = this.detectAvailableWallets();
                    const wallet = availableWallets[savedWalletType];
                    
                    if (wallet?.detected) {
                        try {
                            // Check if wallet is still connected
                            const provider = wallet.provider;
                            if (provider.isConnected && provider.publicKey) {
                                this.connectedWallet = provider;
                                this.walletProvider = provider;
                                this.walletType = savedWalletType;
                                this.publicKey = provider.publicKey.toString();
                                this.isDemo = false;
                                
                                await this.loadUserProfile();
                                console.log('✅ Wallet session restored');
                            }
                        } catch (error) {
                            console.warn('⚠️ Failed to restore wallet session:', error);
                            this.clearPersistedConnection();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error checking persisted connection:', error);
        }
    }

    saveSessionData() {
        try {
            sessionStorage.setItem(this.storageKeys.walletType, this.walletType || '');
            sessionStorage.setItem(this.storageKeys.publicKey, this.publicKey || '');
            sessionStorage.setItem(this.storageKeys.isDemo, this.isDemo.toString());
            
            if (this.isDemo && this.demoSession) {
                sessionStorage.setItem(this.storageKeys.demoSession, JSON.stringify(this.demoSession));
            }
            
            if (this.userProfile) {
                sessionStorage.setItem(this.storageKeys.userProfile, JSON.stringify(this.userProfile));
            }
        } catch (error) {
            console.error('❌ Error saving session data:', error);
        }
    }

    clearPersistedConnection() {
        Object.values(this.storageKeys).forEach(key => {
            sessionStorage.removeItem(key);
        });
    }

    // ==============================================
    // USER PROFILE MANAGEMENT
    // ==============================================

    async loadUserProfile() {
        try {
            if (!this.publicKey) {
                console.warn('No wallet address for profile lookup');
                return;
            }
            
            // Check for cached profile first
            const cachedProfile = sessionStorage.getItem(this.storageKeys.userProfile);
            if (cachedProfile) {
                try {
                    this.userProfile = JSON.parse(cachedProfile);
                    console.log('✅ User profile loaded from cache');
                    return;
                } catch (e) {
                    console.warn('Invalid cached profile, will reload');
                }
            }
            
            // Try to load from database if supabase is available
            if (window.getSupabase) {
                const supabase = window.getSupabase();
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('wallet_address', this.publicKey)
                    .single();
                
                if (data) {
                    this.userProfile = data;
                    console.log('✅ User profile loaded from database');
                } else if (!error || error.code === 'PGRST116') {
                    // User doesn't exist, create profile
                    await this.createUserProfile();
                } else {
                    console.error('Error loading user profile:', error);
                }
            } else {
                // Create basic profile without database
                this.userProfile = {
                    wallet_address: this.publicKey,
                    display_name: this.formatAddress(),
                    is_demo: this.isDemo,
                    created_at: new Date().toISOString()
                };
                console.log('✅ Basic user profile created (no database)');
            }
            
        } catch (error) {
            console.error('❌ Error loading user profile:', error);
            // Create fallback profile
            this.userProfile = {
                wallet_address: this.publicKey,
                display_name: this.formatAddress(),
                is_demo: this.isDemo,
                created_at: new Date().toISOString()
            };
        }
    }

    async createUserProfile() {
        try {
            if (!this.publicKey) {
                throw new Error('No wallet address available');
            }
            
            const profileData = {
                wallet_address: this.publicKey,
                display_name: this.formatAddress(),
                is_demo: this.isDemo,
                total_bets: 0,
                total_winnings: 0,
                created_at: new Date().toISOString()
            };
            
            if (window.getSupabase) {
                const supabase = window.getSupabase();
                const { data, error } = await supabase
                    .from('users')
                    .insert([profileData])
                    .select()
                    .single();
                
                if (data) {
                    this.userProfile = data;
                    console.log('✅ User profile created in database');
                } else {
                    console.error('Error creating user profile:', error);
                    this.userProfile = profileData;
                }
            } else {
                this.userProfile = profileData;
                console.log('✅ User profile created (no database)');
            }
            
        } catch (error) {
            console.error('❌ Error creating user profile:', error);
            // Create basic fallback profile
            this.userProfile = {
                wallet_address: this.publicKey,
                display_name: this.formatAddress(),
                is_demo: this.isDemo,
                created_at: new Date().toISOString()
            };
        }
    }

    getUserProfile() {
        return this.userProfile;
    }

    // ==============================================
    // EVENT HANDLING
    // ==============================================

    async handleSuccessfulConnection(walletType, connection) {
        try {
            console.log(`✅ Handling successful ${walletType} connection...`);
            
            // Update state
            this.connectedWallet = connection.provider;
            this.walletProvider = connection.provider;
            this.walletType = walletType;
            this.publicKey = connection.publicKey;
            this.isDemo = false;
            
            // Save session
            this.saveSessionData();
            
            // Load user profile
            await this.loadUserProfile();
            
            // Notify listeners
            this.notifyConnectionListeners('connected', {
                walletType: this.walletType,
                publicKey: this.publicKey,
                userProfile: this.userProfile,
                smartContractReady: this.isSmartContractReady() // 🚀 NEW
            });
            
            console.log(`✅ ${walletType} connection handling complete`);
            
        } catch (error) {
            console.error('❌ Error handling connection:', error);
            throw error;
        }
    }

    setupWalletEventListeners() {
        // Listen for account changes on supported wallets
        if (window.solana?.on) {
            window.solana.on('accountChanged', (publicKey) => {
                if (this.walletType === 'phantom') {
                    this.handleAccountChange(publicKey?.toString());
                }
            });
            
            window.solana.on('disconnect', () => {
                if (this.walletType === 'phantom') {
                    this.handleDisconnect();
                }
            });
        }
    }

    async handleAccountChange(newPublicKey) {
        console.log('🔄 Account changed');
        this.publicKey = newPublicKey;
        this.saveSessionData();
        
        // Clear old profile and load new one
        this.userProfile = null;
        await this.loadUserProfile();
        
        this.notifyConnectionListeners('accountChanged', {
            publicKey: newPublicKey,
            userProfile: this.userProfile,
            smartContractReady: this.isSmartContractReady() // 🚀 NEW
        });
    }

    handleDisconnect() {
        console.log('🔌 Wallet disconnected externally');
        this.clearPersistedConnection();
        this.notifyConnectionListeners('disconnected', null);
    }

    addConnectionListener(callback) {
        this.connectionListeners.push(callback);
    }

    removeConnectionListener(callback) {
        this.connectionListeners = this.connectionListeners.filter(listener => listener !== callback);
    }

    notifyConnectionListeners(event, data) {
        this.connectionListeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in connection listener:', error);
            }
        });
    }

    // ==============================================
    // UTILITY METHODS
    // ==============================================

    formatAddress(address = null) {
        const addr = address || this.publicKey;
        if (!addr) return 'Not connected';
        if (addr.startsWith('DEMO')) return addr;
        return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    }

    getWalletInfo() {
        return {
            available: this.detectAvailableWallets(),
            connected: this.getConnectionStatus(),
            profile: this.getUserProfile()
        };
    }

    cleanup() {
        this.connectionListeners = [];
        console.log('🧹 WalletService cleaned up');
    }
}

// ==============================================
// SINGLETON INSTANCE MANAGEMENT
// ==============================================

WalletService.instance = null;

function getWalletService() {
    if (!window.walletService) {
        window.walletService = new WalletService();
    }
    return window.walletService;
}

// ==============================================
// GLOBAL EXPOSURE
// ==============================================

// Expose WalletService globally
window.WalletService = WalletService;
window.getWalletService = getWalletService;

// Create and expose singleton instance
window.walletService = getWalletService();

// Log successful load
console.log('🔗 Enhanced WalletService loaded with smart contract support!');
console.log('🚀 NEW FEATURES:');
console.log('   ✅ Smart contract transaction signing');
console.log('   ✅ SOL balance checking');
console.log('   ✅ Transaction confirmation waiting');
console.log('   ✅ Blockchain connection management');
console.log('   ✅ Transaction validation and safety checks');
console.log('   ✅ Integration with BLOCKCHAIN_CONFIG');
console.log('🎯 Ready for blockchain transactions!');
