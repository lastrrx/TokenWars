// FIXED WalletService - Simplified & Reliable for Modal Integration
// Critical fixes: Simplified flow, immediate UI updates, proper modal coordination

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

    async connectWallet(walletType) {
        try {
            console.log(`🔗 Connecting to ${walletType} wallet...`);
            
            if (walletType === 'demo') {
                return await this.connectDemoWallet();
            }
            
            const availableWallets = this.detectAvailableWallets();
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
            if (window.supabase) {
                try {
                    const { data: user, error } = await window.supabase
                        .from('users')
                        .select('*')
                        .eq('wallet_address', this.publicKey)
                        .single();
                    
                    if (user && !error) {
                        this.userProfile = user;
                        this.saveUserProfile();
                        console.log('✅ Profile loaded from database:', user.username);
                        
                        this.notifyConnectionListeners('profileLoaded', this.userProfile);
                        return;
                    }
                } catch (dbError) {
                    console.warn('Database profile lookup failed:', dbError);
                }
            }
            
            // Try to load from cache
            this.loadCachedUserProfile();
            
            if (!this.userProfile) {
                console.log('ℹ️ No user profile found, needs creation');
                this.notifyConnectionListeners('profileNeeded', { walletAddress: this.publicKey });
            }
            
        } catch (error) {
            console.error('❌ Error loading user profile:', error);
        }
    }

    loadCachedUserProfile() {
        try {
            const cachedProfile = localStorage.getItem(this.storageKeys.userProfile);
            if (cachedProfile) {
                this.userProfile = JSON.parse(cachedProfile);
                console.log('✅ Profile loaded from cache:', this.userProfile.username);
                this.notifyConnectionListeners('profileLoaded', this.userProfile);
            }
        } catch (error) {
            console.error('Error loading cached profile:', error);
        }
    }

    async createUserProfile(username, avatar = '🎯') {
        try {
            console.log(`👤 Creating profile: ${username}`);
            
            if (!this.publicKey) {
                throw new Error('No wallet connected');
            }
            
            // Basic validation
            if (!username || username.length < 3 || username.length > 20) {
                throw new Error('Username must be 3-20 characters');
            }
            
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                throw new Error('Username can only contain letters, numbers, and underscores');
            }
            
            const profileData = {
                walletAddress: this.publicKey,
                username: username,
                avatar: avatar,
                isDemo: this.isDemo,
                walletType: this.walletType,
                createdAt: new Date().toISOString(),
                totalBets: 0,
                totalWinnings: 0,
                winRate: 0,
                currentStreak: 0
            };
            
            // Try to save to database if available
            if (window.supabase && !this.isDemo) {
                try {
                    const { data: dbProfile, error } = await window.supabase
                        .from('users')
                        .insert([{
                            wallet_address: this.publicKey,
                            username: username,
                            avatar: avatar,
                            total_winnings: 0,
                            total_bets: 0,
                            win_rate: 0,
                            current_streak: 0,
                            is_banned: false,
                            created_at: new Date().toISOString()
                        }])
                        .select()
                        .single();
                    
                    if (dbProfile && !error) {
                        profileData.id = dbProfile.id;
                        console.log('✅ Profile saved to database');
                    }
                } catch (dbError) {
                    console.warn('Database save failed:', dbError);
                }
            }
            
            // Save locally
            this.userProfile = profileData;
            this.saveUserProfile();
            
            console.log('✅ User profile created:', username);
            
            this.notifyConnectionListeners('profileCreated', profileData);
            
            return profileData;
            
        } catch (error) {
            console.error('❌ Error creating profile:', error);
            throw error;
        }
    }

    getUserProfile() {
        return this.userProfile;
    }

    // ==============================================
    // SESSION PERSISTENCE (Simplified)
    // ==============================================

    async checkPersistedConnection() {
        try {
            const walletType = localStorage.getItem(this.storageKeys.walletType);
            const publicKey = localStorage.getItem(this.storageKeys.publicKey);
            const isDemo = localStorage.getItem(this.storageKeys.isDemo) === 'true';
            
            if (!walletType || !publicKey) {
                console.log('No persisted connection found');
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
console.log('🚀 Ready for immediate wallet connections!');
