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
        console.log('🔧 Initializing wallet service with storage validation...');
        
        // Clean up storage first
        const wasCorrupted = await this.cleanupStorage();
        
        if (wasCorrupted) {
            console.log('🔄 Storage was corrupted and cleaned - starting fresh');
        }
        
        // Original initialization code
        this.setupWalletEventListeners();
        
        // Try to restore previous connection only if storage is clean
        if (!wasCorrupted) {
            await this.restorePersistedConnection();
        }
        
        this.isInitialized = true;
        console.log('✅ Wallet service initialized');
        
        return { success: true, wasCorrupted };
        
    } catch (error) {
        console.error('❌ Error initializing wallet service:', error);
        this.isInitialized = true; // Set as initialized even if restore fails
        return { success: false, error: error.message };
    }
}


// ==============================================
// STORAGE CLEANUP & CORRUPTION PREVENTION
// Add this to your WalletService class
// ==============================================

/**
 * Clean up corrupted or invalid storage data
 */
async cleanupStorage() {
    try {
        console.log('🧹 Checking for storage cleanup...');
        
        // Check for storage corruption signs
        const issues = [];
        
        // Check for invalid wallet type
        const storedWalletType = localStorage.getItem(this.storageKeys.walletType);
        if (storedWalletType && !['phantom', 'solflare', 'backpack', 'demo'].includes(storedWalletType)) {
            issues.push('invalid_wallet_type');
        }
        
        // Check for malformed public key
        const storedPublicKey = localStorage.getItem(this.storageKeys.publicKey);
        if (storedPublicKey && (storedPublicKey.length < 32 || storedPublicKey.length > 50)) {
            issues.push('invalid_public_key');
        }
        
        // Check for corrupted JSON data
        try {
            const storedProfile = localStorage.getItem(this.storageKeys.userProfile);
            if (storedProfile) {
                JSON.parse(storedProfile);
            }
        } catch (error) {
            issues.push('corrupted_profile');
        }
        
        // Check for storage version mismatch
        const currentVersion = '2.0'; // Update this when you change storage structure
        const storedVersion = localStorage.getItem('walletServiceVersion');
        if (storedVersion && storedVersion !== currentVersion) {
            issues.push('version_mismatch');
        }
        
        // Clean up if issues found
        if (issues.length > 0) {
            console.log('⚠️ Storage issues detected:', issues);
            console.log('🧹 Cleaning up corrupted storage...');
            
            this.clearPersistedConnection();
            localStorage.setItem('walletServiceVersion', currentVersion);
            
            console.log('✅ Storage cleaned up successfully');
            return true;
        }
        
        // Set version if not exists
        if (!storedVersion) {
            localStorage.setItem('walletServiceVersion', currentVersion);
        }
        
        console.log('✅ Storage is clean');
        return false;
        
    } catch (error) {
        console.error('❌ Error during storage cleanup:', error);
        // If cleanup fails, clear everything as fallback
        this.clearPersistedConnection();
        return true;
    }
}

/**
 * Enhanced restore with expiration check
 */
async restorePersistedConnection() {
    try {
        console.log('🔄 Attempting to restore persisted connection...');
        
        // Check session expiration (24 hours)
        const timestamp = localStorage.getItem('walletServiceTimestamp');
        if (timestamp) {
            const age = Date.now() - parseInt(timestamp);
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (age > maxAge) {
                console.log('⏰ Session expired - clearing old data');
                this.clearPersistedConnection();
                return { success: false, reason: 'expired' };
            }
        }
        
        // Get stored connection data
        const walletType = localStorage.getItem(this.storageKeys.walletType);
        const publicKey = localStorage.getItem(this.storageKeys.publicKey);
        const isDemo = localStorage.getItem(this.storageKeys.isDemo) === 'true';
        
        if (!walletType || !publicKey) {
            console.log('📝 No previous connection found');
            return { success: false, reason: 'no_data' };
        }
        
        console.log(`🔗 Found previous ${walletType} connection`);
        
        // Restore demo connection
        if (isDemo) {
            const demoSessionData = localStorage.getItem(this.storageKeys.demoSession);
            if (demoSessionData) {
                this.demoSession = JSON.parse(demoSessionData);
                this.connectedWallet = 'demo';
                this.walletType = 'demo';
                this.publicKey = publicKey;
                this.isDemo = true;
                
                console.log('✅ Demo session restored');
                this.notifyConnectionListeners('connected', this.getConnectionStatus());
                return { success: true };
            }
        } else {
            // Verify real wallet is still connected
            const availableWallets = await this.detectAvailableWallets();
            const targetWallet = availableWallets[walletType];
            
            if (targetWallet?.isInstalled) {
                const isStillConnected = await this.checkWalletStillConnected(walletType, targetWallet.provider);
                
                if (isStillConnected) {
                    this.connectedWallet = targetWallet.provider;
                    this.walletProvider = targetWallet.provider;
                    this.walletType = walletType;
                    this.publicKey = publicKey;
                    this.isDemo = false;
                    
                    // Load user profile
                    await this.loadUserProfile();
                    
                    console.log('✅ Real wallet connection restored');
                    this.notifyConnectionListeners('connected', this.getConnectionStatus());
                    return { success: true };
                } else {
                    console.log('⚠️ Wallet no longer connected - clearing stale data');
                    this.clearPersistedConnection();
                    return { success: false, reason: 'disconnected' };
                }
            } else {
                console.log('⚠️ Wallet no longer available - clearing stale data');
                this.clearPersistedConnection();
                return { success: false, reason: 'unavailable' };
            }
        }
        
        return { success: false, reason: 'unknown' };
        
    } catch (error) {
        console.error('❌ Error restoring connection:', error);
        this.clearPersistedConnection();
        return { success: false, reason: 'error', error: error.message };
    }
}

/**
 * Add emergency storage reset function
 */
emergencyStorageReset() {
    console.log('🚨 Emergency storage reset triggered');
    
    try {
        // Clear all wallet-related storage
        const keysToRemove = [
            ...Object.values(this.storageKeys),
            'walletServiceVersion',
            'walletServiceTimestamp'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        console.log('✅ Emergency storage reset complete');
        
        // Show user notification
        if (typeof showNotificationFixed === 'function') {
            showNotificationFixed('Wallet storage reset - please reconnect your wallet', 'warning');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Emergency storage reset failed:', error);
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

async detectAvailableWallets() {
    console.log('🔍 Detecting available wallets with readiness check...');
    
    // Wait a moment for wallets to inject
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const wallets = {
        phantom: {
            name: 'Phantom',
            icon: '👻',
            provider: window.phantom?.solana,
            isInstalled: !!(window.phantom?.solana?.isPhantom),
            downloadUrl: 'https://phantom.app/'
        },
        solflare: {
            name: 'Solflare',
            icon: '☀️',
            provider: window.solflare,
            isInstalled: !!(window.solflare?.isSolflare),
            downloadUrl: 'https://solflare.com/'
        },
        backpack: {
            name: 'Backpack',
            icon: '🎒',
            provider: window.backpack,
            isInstalled: !!(window.backpack?.isBackpack),
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
    
    console.log('🔍 Wallet detection results:', {
        phantom: wallets.phantom.isInstalled,
        solflare: wallets.solflare.isInstalled,
        backpack: wallets.backpack.isInstalled
    });
    
    return wallets;
}

    // ==============================================
    // WALLET CONNECTION (Fixed & Simplified)
    // ==============================================

async connectWallet(walletType) {
    try {
        console.log(`🔗 Connecting to ${walletType} wallet...`);
        
        if (walletType === 'demo') {
            return await this.connectDemoWallet();
        }
        
        // IMPORTANT: Wait for wallet to be ready before attempting connection
        console.log(`⏳ Waiting for ${walletType} wallet to be ready...`);
        const isWalletReady = await this.waitForWalletReady(walletType);
        
        if (!isWalletReady) {
            throw new Error(`${walletType} wallet is not installed or not ready. Please make sure the extension is installed and enabled.`);
        }
        
        // Get fresh wallet list after readiness check
        const availableWallets = await this.detectAvailableWallets();
        const selectedWallet = availableWallets[walletType];
        
        if (!selectedWallet?.isInstalled) {
            throw new Error(`${selectedWallet?.name || walletType} is not installed`);
        }
        
        // Connect based on wallet type
        let connection;
        switch (walletType) {
            case 'phantom':
                connection = await this.connectPhantom();
                break;
            case 'solflare':
                connection = await this.connectSolflare();
                break;
            case 'backpack':
                connection = await this.connectBackpack();
                break;
            default:
                throw new Error(`Unsupported wallet type: ${walletType}`);
        }
        
        if (connection.success) {
            await this.handleSuccessfulConnection(walletType, connection);
            return { success: true, publicKey: this.publicKey };
        } else {
            throw new Error(connection.error);
        }
        
    } catch (error) {
        console.error(`❌ Failed to connect ${walletType}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Wait for wallet extension to be ready
 * This fixes the timing issue where detection happens before wallet injection
 */
async waitForWalletReady(walletType, maxWaitTime = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkWallet = () => {
            let isReady = false;
            
            switch (walletType) {
                case 'phantom':
                    isReady = !!(window.phantom?.solana?.isPhantom);
                    break;
                case 'solflare':
                    isReady = !!(window.solflare?.isSolflare);
                    break;
                case 'backpack':
                    isReady = !!(window.backpack?.isBackpack);
                    break;
                default:
                    isReady = false;
            }
            
            if (isReady) {
                console.log(`✅ ${walletType} wallet ready`);
                resolve(true);
                return;
            }
            
            // Check if we've exceeded max wait time
            if (Date.now() - startTime > maxWaitTime) {
                console.log(`⏰ ${walletType} wallet wait timeout`);
                resolve(false);
                return;
            }
            
            // Check again in 100ms
            setTimeout(checkWallet, 100);
        };
        
        checkWallet();
    });
}

    // ==============================================
    // INDIVIDUAL WALLET CONNECTIONS (Simplified)
    // ==============================================

async connectPhantom() {
    try {
        // Double-check Phantom is available
        const phantom = window.phantom?.solana;
        
        if (!phantom) {
            throw new Error('Phantom wallet extension not found. Please install Phantom wallet.');
        }
        
        if (!phantom.isPhantom) {
            throw new Error('Phantom wallet not properly loaded. Please refresh the page and try again.');
        }
        
        console.log('🔗 Requesting Phantom connection...');
        const response = await phantom.connect();
        
        if (!response.publicKey) {
            throw new Error('No public key received from Phantom');
        }
        
        console.log('✅ Phantom connected successfully');
        return {
            success: true,
            publicKey: response.publicKey.toString(),
            provider: phantom
        };
        
    } catch (error) {
        console.error('❌ Phantom connection error:', error);
        
        if (error.code === 4001) {
            return { success: false, error: 'User rejected the connection request' };
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

/**
 * Enhanced storage save with validation
 */
saveSessionData() {
    try {
        // Validate data before saving
        if (!this.walletType || !this.publicKey) {
            console.log('⚠️ Incomplete session data - skipping save');
            return;
        }
        
        // Save with timestamp for expiration
        const sessionData = {
            walletType: this.walletType,
            publicKey: this.publicKey,
            isDemo: this.isDemo,
            timestamp: Date.now(),
            version: '2.0'
        };
        
        localStorage.setItem(this.storageKeys.walletType, sessionData.walletType);
        localStorage.setItem(this.storageKeys.publicKey, sessionData.publicKey);
        localStorage.setItem(this.storageKeys.isDemo, sessionData.isDemo.toString());
        localStorage.setItem('walletServiceTimestamp', sessionData.timestamp.toString());
        localStorage.setItem('walletServiceVersion', sessionData.version);
        
        if (this.isDemo && this.demoSession) {
            localStorage.setItem(this.storageKeys.demoSession, JSON.stringify(this.demoSession));
        }
        
        console.log('💾 Session data saved with validation');
        
    } catch (error) {
        console.error('❌ Error saving session data:', error);
        // If save fails, clear storage to prevent corruption
        this.clearPersistedConnection();
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
                        .from('users')
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
                        .from('users')
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

/**
     * Sign a descriptive message before transaction (NEW METHOD)
     */
    async signTransactionMessage(messageText) {
        try {
            if (!this.isConnected()) {
                throw new Error('Wallet not connected');
            }
            
            if (this.isDemo) {
                console.log('🎮 Demo message signing:', messageText);
                return { success: true };
            }
            
            console.log('📝 Signing transaction message:', messageText);
            const encodedMessage = new TextEncoder().encode(messageText);
            
            const provider = this.getWalletProvider();
            
            if (typeof provider.signMessage === 'function') {
                await provider.signMessage(encodedMessage, "utf8");
                return { success: true };
            }
            
            // If signMessage not available, just continue
            console.log('⚠️ Message signing not supported, continuing anyway');
            return { success: false, reason: 'not_supported' };
            
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('Transaction cancelled by user');
            }
            // Don't fail transaction for message signing issues
            console.log('⚠️ Message signing failed, continuing anyway:', error.message);
            return { success: false, reason: 'failed' };
        }
    }

    /**
     * Generate transaction message templates (NEW METHOD)
     */
    generateTransactionMessage(transactionType, details) {
        const { tokenASymbol, tokenBSymbol, amount } = details;
        
        switch (transactionType) {
            case 'PLACE_BET':
                return `Place ${amount} SOL bet on ${tokenASymbol} vs ${tokenBSymbol}`;
            case 'WITHDRAW_WINNINGS':
                return `Withdraw ${amount} SOL winnings from ${tokenASymbol} vs ${tokenBSymbol}`;
            case 'WITHDRAW_REFUND':
                return `Withdraw ${amount} SOL refund from ${tokenASymbol} vs ${tokenBSymbol}`;
            default:
                return `Confirm ${amount} SOL transaction`;
        }
    }

    /**
     * Enhanced transaction sending with messaging (NEW METHOD)
     */
    async sendTransactionWithMessage(transaction, connection, messageDetails) {
        try {
            // Step 1: Try to show message first
            if (messageDetails) {
                const message = this.generateTransactionMessage(messageDetails.type, messageDetails.details);
                console.log('📝 Attempting to show message:', message);
                await this.signTransactionMessage(message);
            }
            
            // Step 2: Send actual transaction (use existing method)
            return await this.signAndSendTransactionWithConnection(transaction, connection);
            
        } catch (error) {
            console.error('❌ Transaction with message failed:', error);
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

    // ==============================================
    // SMART CONTRACT INTEGRATION BRIDGE
    // ==============================================

    /**
     * Get wallet provider for smart contract operations
     */
    getWalletProvider() {
        if (!this.isConnected()) {
            throw new Error('Wallet not connected');
        }
        
        return this.walletProvider || this.connectedWallet;
    }

    /**
     * Enhanced transaction sending with smart contract support
     */
    async signAndSendTransaction(transaction, connection) {
        try {
            if (!this.isConnected()) {
                throw new Error('Wallet not connected');
            }
            
            if (this.isDemo) {
                console.log('🎮 Demo transaction sending (simulated)');
                await new Promise(resolve => setTimeout(resolve, 2000));
                return 'demo_signature_' + Math.random().toString(36).substr(2, 9);
            }
            
            console.log('📤 Signing and sending transaction with', this.walletType);
            
            const provider = this.getWalletProvider();
            
            if (typeof provider.signAndSendTransaction === 'function') {
                return await provider.signAndSendTransaction(transaction);
            } else if (typeof provider.sendTransaction === 'function') {
                return await provider.sendTransaction(transaction, connection);
            } else {
                throw new Error(`Transaction signing not supported for ${this.walletType}`);
            }
            
        } catch (error) {
            console.error('❌ Transaction signing failed:', error);
            throw error;
        }
    }

/**
     * Get competition details for messaging (NEW METHOD)
     */
    async getCompetitionDetails(competitionId) {
        try {
            const supabase = window.getSupabase ? window.getSupabase() : window.supabase;
            if (!supabase) {
                return { token_a_symbol: 'Token A', token_b_symbol: 'Token B' };
            }
            
            const { data: competition, error } = await supabase
                .from('competitions')
                .select('token_a_symbol, token_b_symbol, required_bet_amount')
                .eq('competition_id', competitionId)
                .single();
            
            if (error) throw error;
            return competition;
            
        } catch (error) {
            console.error('❌ Error getting competition details:', error);
            return { token_a_symbol: 'Token A', token_b_symbol: 'Token B' };
        }
    }
    
    /**
     * Enhanced transaction sending with connection parameter support
     */
async signAndSendTransactionWithConnection(transaction, connection) {
    try {
        if (!this.isConnected()) {
            throw new Error('Wallet not connected');
        }
        
        if (this.isDemo) {
            console.log('🎮 Demo transaction sending (simulated)');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return 'demo_signature_' + Math.random().toString(36).substr(2, 9);
        }
        
        console.log('📤 Signing and sending transaction with connection:', this.walletType);
        
        const provider = this.getWalletProvider();
        
        // ✅ FIXED: Try sendTransaction FIRST for smart contracts
        if (typeof provider.sendTransaction === 'function') {
            try {
                console.log('🔍 Trying provider.sendTransaction first...');
                return await provider.sendTransaction(transaction, connection, {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed'
                });
            } catch (sendTxError) {
                console.error('❌ sendTransaction failed with error:', sendTxError);
                console.error('❌ Error name:', sendTxError.name);
                console.error('❌ Error message:', sendTxError.message);
                console.error('❌ Error code:', sendTxError.code);
                console.error('❌ Full error object:', JSON.stringify(sendTxError, null, 2));
                
                // Try to extract simulation logs if available
                if (sendTxError.logs) {
                    console.error('❌ Simulation logs:', sendTxError.logs);
                }
                if (sendTxError.simulation) {
                    console.error('❌ Simulation details:', sendTxError.simulation);
                }
                
                // Continue to fallback (don't return here)
                console.log('🔄 Falling back to signAndSendTransaction...');
            }
        }
        
        // ✅ FIXED: This is now a separate fallback, not an "else if"
        if (typeof provider.signAndSendTransaction === 'function') {
            console.log('🔍 Trying signAndSendTransaction fallback...');
            console.log('🔍 Passing connection:', !!connection);
            
            try {
                // Try with connection first
                return await provider.signAndSendTransaction(transaction, connection);
            } catch (withConnectionError) {
                console.error('❌ signAndSendTransaction with connection failed:', withConnectionError);
                
                // Fallback to without connection
                try {
                    console.log('🔄 Trying signAndSendTransaction without connection...');
                    return await provider.signAndSendTransaction(transaction);
                } catch (withoutConnectionError) {
                    console.error('❌ signAndSendTransaction without connection ALSO failed:', withoutConnectionError);
                    console.error('❌ Final error message:', withoutConnectionError.message);
                    throw withoutConnectionError;
                }
            }
        } else {
            throw new Error(`Enhanced transaction signing not supported for ${this.walletType}`);
        }
        
    } catch (error) {
        console.error('❌ Enhanced transaction signing failed:', error);
        throw new Error(`Wallet transaction failed: ${error.message}`);
    }
}
        
    /**
     * Check if wallet supports smart contract transactions
     */
    supportsSmartContracts() {
        if (!this.isConnected()) return false;
        if (this.isDemo) return true;
        
        const provider = this.walletProvider || this.connectedWallet;
        return provider && (
            typeof provider.sendTransaction === 'function' ||
            typeof provider.signAndSendTransaction === 'function'
        );
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

// Export emergency function globally for console access
window.emergencyWalletReset = () => {
    if (window.walletService) {
        return window.walletService.emergencyStorageReset();
    } else {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
    }
};
// ==============================================
// IMMEDIATE GLOBAL EXPOSURE
// ==============================================

// Expose WalletService globally immediately
window.WalletService = WalletService;
window.getWalletService = getWalletService;

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
