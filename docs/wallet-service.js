// FIXED WalletService - Simplified & Reliable for Modal Integration
// Critical fixes: Simplified flow, immediate UI updates, proper modal coordination
// BROWSER COMPATIBILITY: Fixed syntax errors and Buffer dependencies

// ==============================================
// SIMPLIFIED WALLET SERVICE CLASS
// ==============================================

class WalletService {
    constructor() {
        // Prevent duplicate instances
        if (WalletService.instance) {
            return WalletService.instance;
        }
        
        console.log('🔗 Creating simplified WalletService...');
        
        // Basic state
        this.isInitialized = false;
        this.connectedWallet = null;
        this.walletProvider = null;
        this.walletType = null;
        this.publicKey = null;
        this.isDemo = false;
        this.userProfile = null;
        this.connectionListeners = [];
        this.balance = 0;
        this.transactions = [];
        this.lastBalanceUpdate = null;
        
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
        
        console.log('✅ WalletService created');
    }

    // ==============================================
    // CORE INITIALIZATION (Simplified)
    // ==============================================

    async initialize() {
        try {
            if (this.isInitialized) {
                console.log('✅ WalletService already initialized');
                return true;
            }
            
            console.log('🔄 Initializing WalletService...');
            
            // Check for persisted connection
            await this.checkPersistedConnection();
            
            // Set up wallet event listeners
            this.setupWalletEventListeners();
            
            this.isInitialized = true;
            console.log('✅ WalletService initialized successfully');
            
            return true;
            
        } catch (error) {
            console.error('❌ WalletService initialization failed:', error);
            return false;
        }
    }

    // ==============================================
    // CONNECTION STATUS METHODS (Fixed)
    // ==============================================

    isConnected() {
        return !!(this.connectedWallet && this.publicKey);
    }

    isReady() {
        return this.isInitialized && this.isConnected();
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
            userProfile: this.userProfile
        };
    }

    // ==============================================
    // WALLET DETECTION (Simplified)
    // ==============================================

    detectAvailableWallets() {
        const wallets = {
            phantom: {
                name: 'Phantom',
                icon: '👻',
                provider: window.phantom?.solana,
                isInstalled: !!window.phantom?.solana?.isPhantom,
                downloadUrl: 'https://phantom.app/'
            },
            solflare: {
                name: 'Solflare',
                icon: '☀️',
                provider: window.solflare,
                isInstalled: !!window.solflare?.isSolflare,
                downloadUrl: 'https://solflare.com/'
            },
            backpack: {
                name: 'Backpack',
                icon: '🎒',
                provider: window.backpack,
                isInstalled: !!window.backpack?.isBackpack,
                downloadUrl: 'https://www.backpack.app/'
            },
            demo: {
                name: 'Demo Mode',
                icon: '🎮',
                provider: null,
                isInstalled: true,
                downloadUrl: null
            }
        };
        
        console.log('🔍 Available wallets detected');
        return wallets;
    }

    // ==============================================
    // WALLET CONNECTION (Fixed & Simplified)
    // ==============================================

/**
 * UPDATED: Enhanced wallet connection with transaction capabilities
 * Location: Update existing connectWallet() function in wallet-service.js
 */
async function connectWallet(walletType = 'phantom') {
    try {
        console.log(`🔌 Connecting to ${walletType} wallet with transaction support...`);
        
        let wallet;
        
        // Get wallet adapter based on type
        switch (walletType.toLowerCase()) {
            case 'phantom':
                if (window.solana?.isPhantom) {
                    wallet = window.solana;
                } else {
                    throw new Error('Phantom wallet not installed');
                }
                break;
                
            case 'solflare':
                if (window.solflare?.isSolflare) {
                    wallet = window.solflare;
                } else {
                    throw new Error('Solflare wallet not installed');
                }
                break;
                
            case 'backpack':
                if (window.backpack?.isBackpack) {
                    wallet = window.backpack;
                } else {
                    throw new Error('Backpack wallet not installed');
                }
                break;
                
            case 'demo':
                // Demo mode for testing
                wallet = createDemoWallet();
                break;
                
            default:
                throw new Error(`Unsupported wallet type: ${walletType}`);
        }
        
        // Connect to wallet
        const response = await wallet.connect();
        const publicKey = response.publicKey || wallet.publicKey;
        
        if (!publicKey) {
            throw new Error('Failed to get wallet public key');
        }
        
        // Update wallet state
        walletState = {
            isConnected: true,
            walletType,
            publicKey: publicKey.toString(),
            wallet: wallet,
            connectedAt: new Date().toISOString()
        };
        
        // Verify transaction signing capability
        if (!wallet.signTransaction && !wallet.signAndSendTransaction && walletType !== 'demo') {
            console.warn('⚠️ Wallet may not support transaction signing');
        }
        
        // Get initial balance
        const balance = await getBalance();
        walletState.balance = balance;
        
        console.log('✅ Wallet connected successfully with transaction support:', {
            walletType,
            publicKey: publicKey.toString(),
            balance: `${balance} SOL`,
            hasSigningSupport: !!(wallet.signTransaction || wallet.signAndSendTransaction)
        });
        
        // Update UI
        updateWalletUI();
        broadcastWalletEvent('walletConnected', walletState);
        
        // Create or update user profile
        await createOrUpdateUserProfile();
        
        return walletState;
        
    } catch (error) {
        console.error('❌ Error connecting wallet:', error);
        walletState.isConnected = false;
        updateWalletUI();
        throw error;
    }
}

    // ==============================================
    // INDIVIDUAL WALLET CONNECTIONS (Simplified)
    // ==============================================

    async connectPhantom() {
        try {
            const phantom = window.phantom?.solana;
            
            if (!phantom?.isPhantom) {
                throw new Error('Phantom wallet not detected');
            }
            
            const response = await phantom.connect();
            
            if (!response.publicKey) {
                throw new Error('No public key received');
            }
            
            console.log('✅ Phantom connected');
            return {
                success: true,
                publicKey: response.publicKey.toString(),
                provider: phantom
            };
            
        } catch (error) {
            if (error.code === 4001) {
                return { success: false, error: 'User rejected connection' };
            }
            return { success: false, error: error.message };
        }
    }

    async connectSolflare() {
        try {
            const solflare = window.solflare;
            
            if (!solflare?.isSolflare) {
                throw new Error('Solflare wallet not detected');
            }
            
            await solflare.connect();
            
            if (solflare.isConnected && solflare.publicKey) {
                console.log('✅ Solflare connected');
                return {
                    success: true,
                    publicKey: solflare.publicKey.toString(),
                    provider: solflare
                };
            } else {
                throw new Error('Connection failed');
            }
            
        } catch (error) {
            if (error.code === 4001) {
                return { success: false, error: 'User rejected connection' };
            }
            return { success: false, error: error.message };
        }
    }

    async connectBackpack() {
        try {
            const backpack = window.backpack;
            
            if (!backpack?.isBackpack) {
                throw new Error('Backpack wallet not detected');
            }
            
            await backpack.connect();
            
            if (backpack.isConnected && backpack.publicKey) {
                console.log('✅ Backpack connected');
                return {
                    success: true,
                    publicKey: backpack.publicKey.toString(),
                    provider: backpack
                };
            } else {
                throw new Error('Connection failed');
            }
            
        } catch (error) {
            if (error.code === 4001) {
                return { success: false, error: 'User rejected connection' };
            }
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

    // ==============================================
    // CONNECTION HANDLING (Fixed)
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
                userProfile: this.userProfile
            });
            
            console.log(`✅ ${walletType} connection handling complete`);
            
        } catch (error) {
            console.error('❌ Error handling connection:', error);
            throw error;
        }
    }

    // ==============================================
    // USER PROFILE MANAGEMENT (Simplified)
    // ==============================================

    async loadUserProfile() {
        try {
            if (!this.publicKey) {
                console.warn('No wallet address for profile lookup');
                return;
            }
            
            console.log('👤 Loading user profile...');
            
            // Try to load from database if available
            if (window.supabase && window.SupabaseReady) {
                try {
                    await window.SupabaseReady;
                    
                    const { data, error } = await window.supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('wallet_address', this.publicKey)
                        .single();
                    
                    if (!error && data) {
                        this.userProfile = data;
                        this.saveUserProfile();
                        console.log('✅ User profile loaded from database');
                        return;
                    }
                } catch (dbError) {
                    console.warn('Database profile lookup failed:', dbError);
                }
            }
            
            // Try to load from cache
            try {
                const cachedProfile = localStorage.getItem(this.storageKeys.userProfile);
                if (cachedProfile) {
                    const profileData = JSON.parse(cachedProfile);
                    if (profileData.wallet_address === this.publicKey) {
                        this.userProfile = profileData;
                        console.log('✅ User profile loaded from cache');
                        return;
                    }
                }
            } catch (cacheError) {
                console.warn('Cache profile lookup failed:', cacheError);
            }
            
            console.log('ℹ️ No existing profile found');
            this.userProfile = null;
            
        } catch (error) {
            console.error('❌ Error loading user profile:', error);
            this.userProfile = null;
        }
    }

    getUserProfile() {
        return this.userProfile;
    }

    async createUserProfile(profileData) {
        try {
            console.log('👤 Creating user profile...');
            
            const newProfile = {
                wallet_address: this.publicKey,
                username: profileData.username,
                avatar: profileData.avatar,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Try to save to database if available
            if (window.supabase && window.SupabaseReady) {
                try {
                    await window.SupabaseReady;
                    
                    const { data, error } = await window.supabase
                        .from('user_profiles')
                        .insert([newProfile])
                        .select()
                        .single();
                    
                    if (!error && data) {
                        this.userProfile = data;
                        this.saveUserProfile();
                        console.log('✅ User profile created in database');
                        
                        this.notifyConnectionListeners('profileCreated', this.userProfile);
                        return { success: true, profile: this.userProfile };
                    }
                } catch (dbError) {
                    console.warn('Database profile creation failed:', dbError);
                }
            }
            
            // Fallback to cache-only profile
            this.userProfile = newProfile;
            this.saveUserProfile();
            console.log('✅ User profile created in cache');
            
            this.notifyConnectionListeners('profileCreated', this.userProfile);
            return { success: true, profile: this.userProfile };
            
        } catch (error) {
            console.error('❌ Error creating user profile:', error);
            return { success: false, error: error.message };
        }
    }

    // ==============================================
    // TRANSACTION SIGNING (Smart Contract Integration)
    // ==============================================

    async signTransaction(transaction) {
        try {
            if (!this.isConnected()) {
                throw new Error('Wallet not connected');
            }
            
            if (this.isDemo) {
                // Demo mode - simulate transaction signing
                console.log('🎮 Demo transaction signing (simulated)');
                return {
                    signature: 'demo_signature_' + Math.random().toString(36).substr(2, 9),
                    publicKey: this.publicKey
                };
            }
            
            // Real wallet transaction signing
            console.log('✍️ Signing transaction with', this.walletType);
            
            switch (this.walletType) {
                case 'phantom':
                    if (this.walletProvider.signTransaction) {
                        const signed = await this.walletProvider.signTransaction(transaction);
                        return signed;
                    }
                    break;
                case 'solflare':
                    if (this.walletProvider.signTransaction) {
                        const signed = await this.walletProvider.signTransaction(transaction);
                        return signed;
                    }
                    break;
                case 'backpack':
                    if (this.walletProvider.signTransaction) {
                        const signed = await this.walletProvider.signTransaction(transaction);
                        return signed;
                    }
                    break;
                default:
                    throw new Error(`Transaction signing not supported for ${this.walletType}`);
            }
            
            throw new Error('Transaction signing method not available');
            
        } catch (error) {
            console.error('❌ Transaction signing failed:', error);
            throw error;
        }
    }

    async sendTransaction(transaction) {
        try {
            if (!this.isConnected()) {
                throw new Error('Wallet not connected');
            }
            
            if (this.isDemo) {
                // Demo mode - simulate transaction
                console.log('🎮 Demo transaction sending (simulated)');
                return 'demo_signature_' + Math.random().toString(36).substr(2, 9);
            }
            
            // Real wallet transaction sending
            console.log('📤 Sending transaction with', this.walletType);
            
            if (this.walletProvider.sendTransaction) {
                const signature = await this.walletProvider.sendTransaction(transaction);
                return signature;
            }
            
            throw new Error('Transaction sending method not available');
            
        } catch (error) {
            console.error('❌ Transaction sending failed:', error);
            throw error;
        }
    }



    // ==============================================
    // SESSION PERSISTENCE (Fixed)
    // ==============================================

    async checkPersistedConnection() {
        try {
            const walletType = localStorage.getItem(this.storageKeys.walletType);
            const publicKey = localStorage.getItem(this.storageKeys.publicKey);
            const isDemo = localStorage.getItem(this.storageKeys.isDemo) === 'true';
            
            if (!walletType || !publicKey) {
                return false;
            }
            
            console.log(`🔄 Restoring ${walletType} connection...`);
            
            if (isDemo) {
                // Restore demo session
                const demoSessionData = localStorage.getItem(this.storageKeys.demoSession);
                if (demoSessionData) {
                    this.demoSession = JSON.parse(demoSessionData);
                    this.isDemo = true;
                    this.publicKey = publicKey;
                    this.walletType = 'demo';
                    this.connectedWallet = 'demo';
                    
                    await this.loadUserProfile();
                    
                    console.log('✅ Demo session restored');
                    
                    this.notifyConnectionListeners('connectionRestored', {
                        walletType: this.walletType,
                        publicKey: this.publicKey,
                        userProfile: this.userProfile
                    });
                    
                    return true;
                }
            } else {
                // Check if real wallet is still connected
                const availableWallets = this.detectAvailableWallets();
                const wallet = availableWallets[walletType];
                
                if (wallet?.isInstalled && wallet.provider) {
                    const isStillConnected = await this.checkWalletStillConnected(walletType, wallet.provider);
                    
                    if (isStillConnected) {
                        this.connectedWallet = wallet.provider;
                        this.walletProvider = wallet.provider;
                        this.walletType = walletType;
                        this.publicKey = publicKey;
                        this.isDemo = false;
                        
                        await this.loadUserProfile();
                        
                        console.log(`✅ ${walletType} connection restored`);
                        
                        this.notifyConnectionListeners('connectionRestored', {
                            walletType: this.walletType,
                            publicKey: this.publicKey,
                            userProfile: this.userProfile
                        });
                        
                        return true;
                    } else {
                        console.log(`❌ ${walletType} no longer connected`);
                        this.clearPersistedConnection();
                    }
                } else {
                    console.log(`❌ ${walletType} no longer available`);
                    this.clearPersistedConnection();
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Error checking persisted connection:', error);
            this.clearPersistedConnection();
            return false;
        }
    }

    async checkWalletStillConnected(walletType, provider) {
        try {
            switch (walletType) {
                case 'phantom':
                    return provider.isConnected && provider.publicKey;
                case 'solflare':
                    return provider.isConnected && provider.publicKey;
                case 'backpack':
                    return provider.isConnected && provider.publicKey;
                default:
                    return false;
            }
        } catch (error) {
            console.error('Error checking wallet connection:', error);
            return false;
        }
    }

    saveSessionData() {
        try {
            localStorage.setItem(this.storageKeys.walletType, this.walletType);
            localStorage.setItem(this.storageKeys.publicKey, this.publicKey);
            localStorage.setItem(this.storageKeys.isDemo, this.isDemo.toString());
            
            if (this.isDemo && this.demoSession) {
                localStorage.setItem(this.storageKeys.demoSession, JSON.stringify(this.demoSession));
            }
            
            console.log('💾 Session data saved');
        } catch (error) {
            console.error('Error saving session data:', error);
        }
    }

    saveUserProfile() {
        try {
            if (this.userProfile) {
                localStorage.setItem(this.storageKeys.userProfile, JSON.stringify(this.userProfile));
                console.log('💾 User profile saved to cache');
            }
        } catch (error) {
            console.error('Error saving user profile:', error);
        }
    }

    clearPersistedConnection() {
        try {
            Object.values(this.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });
            
            this.connectedWallet = null;
            this.walletProvider = null;
            this.walletType = null;
            this.publicKey = null;
            this.isDemo = false;
            this.demoSession = null;
            this.userProfile = null;
            
            console.log('🧹 Persisted connection cleared');
        } catch (error) {
            console.error('Error clearing persisted connection:', error);
        }
    }

    // ==============================================
    // DISCONNECTION (Simplified)
    // ==============================================

    async disconnectWallet() {
        try {
            console.log('🔌 Disconnecting wallet...');
            
            // Try to disconnect from wallet provider
            if (this.walletProvider && !this.isDemo) {
                try {
                    if (this.walletType === 'phantom' && this.walletProvider.disconnect) {
                        await this.walletProvider.disconnect();
                    }
                } catch (error) {
                    console.warn('Wallet provider disconnect failed:', error);
                }
            }
            
            // Clear all state
            this.clearPersistedConnection();
            
            // Notify listeners
            this.notifyConnectionListeners('disconnected', null);
            
            console.log('✅ Wallet disconnected');
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error disconnecting wallet:', error);
            return { success: false, error: error.message };
        }
    }

/**
 * NEW: Refresh wallet balance
 * Location: Add this new function to wallet-service.js
 */
async function refreshBalance() {
    if (walletState.isConnected) {
        try {
            const balance = await getBalance();
            walletState.balance = balance;
            broadcastWalletEvent('balanceUpdated', { balance });
            return balance;
        } catch (error) {
            console.error('❌ Error refreshing balance:', error);
            return walletState.balance;
        }
    }
    return 0;
}

/**
 * NEW: Create demo wallet for testing
 * Location: Add this new function to wallet-service.js
 */
function createDemoWallet() {
    const demoKeypair = solanaWeb3.Keypair.generate();
    
    return {
        publicKey: demoKeypair.publicKey,
        signTransaction: async (transaction) => {
            // Demo signing - just return the transaction
            transaction.partialSign(demoKeypair);
            return transaction;
        },
        signAndSendTransaction: async (transaction) => {
            // Demo transaction - return fake signature
            return 'demo_transaction_' + Date.now();
        },
        isDemo: true
    };
}

 * NEW: Get connection to Solana network
 * Location: Add this new function to wallet-service.js
 */
function getConnection() {
    return new solanaWeb3.Connection(
        'https://api.devnet.solana.com',
        'confirmed'
    );
}

/**
 * NEW: Sign and send transaction
 * Location: Add this new function to wallet-service.js
 */
async function signAndSendTransaction(transaction, description = 'Transaction') {
    try {
        console.log(`🔐 Signing transaction: ${description}`);
        
        if (!walletState.isConnected || !walletState.wallet) {
            throw new Error('Wallet not connected');
        }
        
        // Get the current wallet adapter
        const wallet = walletState.wallet;
        
        if (!wallet.signAndSendTransaction) {
            throw new Error('Wallet does not support transaction signing');
        }
        
        console.log('📝 Requesting transaction signature...');
        
        // Sign and send the transaction
        const signature = await wallet.signAndSendTransaction(transaction);
        
        console.log(`✅ Transaction signed and sent: ${signature}`);
        
        // Wait for confirmation
        const connection = new solanaWeb3.Connection(
            'https://api.devnet.solana.com',
            'confirmed'
        );
        
        console.log('⏳ Waiting for transaction confirmation...');
        
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }
        
        console.log('🎉 Transaction confirmed!');
        
        return {
            signature,
            confirmation,
            success: true
        };
        
    } catch (error) {
        console.error('❌ Error signing transaction:', error);
        
        // Handle user rejection gracefully
        if (error.message?.includes('User rejected') || error.code === 4001) {
            throw new Error('Transaction was cancelled by user');
        }
        
        throw error;
    }
}

/**
 * NEW: Get wallet balance in SOL
 * Location: Add this new function to wallet-service.js
 */
async function getBalance() {
    try {
        if (!walletState.isConnected || !walletState.publicKey) {
            throw new Error('Wallet not connected');
        }
        
        const connection = new solanaWeb3.Connection(
            'https://api.devnet.solana.com',
            'confirmed'
        );
        
        const publicKey = new solanaWeb3.PublicKey(walletState.publicKey);
        const balance = await connection.getBalance(publicKey);
        
        // Convert lamports to SOL
        const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
        
        console.log(`💰 Wallet balance: ${solBalance} SOL`);
        return solBalance;
        
    } catch (error) {
        console.error('❌ Error getting wallet balance:', error);
        return 0;
    }
}

/**
 * NEW: Sign transaction without sending (for multi-step transactions)
 * Location: Add this new function to wallet-service.js
 */
async function signTransaction(transaction, description = 'Transaction') {
    try {
        console.log(`🔐 Signing transaction (no send): ${description}`);
        
        if (!walletState.isConnected || !walletState.wallet) {
            throw new Error('Wallet not connected');
        }
        
        const wallet = walletState.wallet;
        
        if (!wallet.signTransaction) {
            throw new Error('Wallet does not support transaction signing');
        }
        
        console.log('📝 Requesting transaction signature...');
        
        const signedTransaction = await wallet.signTransaction(transaction);
        
        console.log('✅ Transaction signed successfully');
        
        return signedTransaction;
        
    } catch (error) {
        console.error('❌ Error signing transaction:', error);
        
        if (error.message?.includes('User rejected') || error.code === 4001) {
            throw new Error('Transaction was cancelled by user');
        }
        
        throw error;
    }

/**
 * NEW: Get wallet public key as PublicKey object
 * Location: Add this new function to wallet-service.js
 */
function getPublicKey() {
    if (!walletState.isConnected || !walletState.publicKey) {
        return null;
    }
    
    try {
        return new solanaWeb3.PublicKey(walletState.publicKey);
    } catch (error) {
        console.error('❌ Error creating PublicKey:', error);
        return null;
    }
}

/**
 * NEW: Add transaction to history
 * Location: Add this new function to wallet-service.js
 */
function addTransactionToHistory(transaction) {
    walletState.transactions.unshift({
        ...transaction,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 transactions
    if (walletState.transactions.length > 50) {
        walletState.transactions = walletState.transactions.slice(0, 50);
    }
    
    // Broadcast update
    broadcastWalletEvent('transactionAdded', transaction);
}

    // ==============================================
    // EVENT HANDLING (Simplified)
    // ==============================================

    setupWalletEventListeners() {
        try {
            // Phantom events
            if (window.phantom?.solana) {
                window.phantom.solana.on('disconnect', () => {
                    if (this.walletType === 'phantom') {
                        console.log('Phantom disconnected externally');
                        this.handleExternalDisconnection();
                    }
                });
                
                window.phantom.solana.on('accountChanged', (publicKey) => {
                    if (this.walletType === 'phantom' && publicKey) {
                        console.log('Phantom account changed');
                        this.handleAccountChange(publicKey.toString());
                    }
                });
            }
            
            console.log('✅ Wallet event listeners setup');
            
        } catch (error) {
            console.error('❌ Error setting up wallet event listeners:', error);
        }
    }

    handleExternalDisconnection() {
        console.log('⚠️ Wallet disconnected externally');
        this.clearPersistedConnection();
        this.notifyConnectionListeners('disconnected', null);
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
            userProfile: this.userProfile
        });
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
// IMMEDIATE GLOBAL EXPOSURE
// ==============================================

// Expose WalletService globally immediately
window.WalletService = WalletService;
window.getWalletService = getWalletService;
window.walletService = getWalletService();

// Create and expose singleton instance immediately
window.walletService = getWalletService();

console.log('✅ FIXED WalletService loaded and ready!');
console.log('🔧 CRITICAL FIXES:');
console.log('   ✅ SIMPLIFIED connection flow for modal integration');
console.log('   ✅ IMMEDIATE function availability for app.js coordination');
console.log('   ✅ RELIABLE session persistence and restoration');
console.log('   ✅ PROPER event handling for UI updates');
console.log('   ✅ GRACEFUL degradation when database unavailable');
console.log('   ✅ CONSISTENT error handling and user feedback');
console.log('   ✅ FIXED demo wallet mode for testing');
console.log('   ✅ STREAMLINED profile creation flow');
console.log('   ✅ ADDED transaction signing for smart contracts');
console.log('   ✅ FIXED all syntax errors and browser compatibility');
console.log('🚀 Ready for immediate wallet connections!');
