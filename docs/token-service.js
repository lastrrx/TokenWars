// TokenService - SIMPLIFIED FOR TOKEN_CACHE TABLE ONLY
// Focuses only on token_cache table - no user management, no complex features

class TokenService {
    constructor() {
        // Singleton pattern
        if (TokenService.instance) {
            console.log('TokenService: Returning existing instance');
            return TokenService.instance;
        }
        
        this.tokens = [];
        this.isInitialized = false;
        this.isInitializing = false;
        this.lastUpdate = null;
        this.cacheStatus = 'unknown';
        this.updateInterval = null;
        
        // Store as singleton instance
        TokenService.instance = this;
        
        console.log('TokenService constructor called - SIMPLIFIED VERSION');
    }

    async initialize() {
        try {
            if (this.isInitializing) {
                console.log('TokenService: Already initializing, waiting...');
                let attempts = 0;
                while (this.isInitializing && !this.isInitialized && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                return this.isInitialized;
            }
            
            if (this.isInitialized) {
                console.log('TokenService: Already initialized');
                return true;
            }
            
            this.isInitializing = true;
            console.log('TokenService: Starting simplified initialization...');
            
            // Step 1: Try to load from token_cache table
            console.log('🔄 Loading tokens from token_cache table...');
            const cacheLoaded = await this.loadTokensFromCache();
            
            // Step 2: If cache fails, use demo data
            if (!cacheLoaded || this.tokens.length === 0) {
                console.log('🔄 Cache empty, using demo tokens...');
                this.tokens = this.createDemoTokens();
                this.cacheStatus = 'demo_fallback';
            }
            
            // Step 3: Mark as initialized
            this.lastUpdate = new Date();
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log(`✅ TokenService initialized: ${this.tokens.length} tokens, status: ${this.cacheStatus}`);
            
            // Step 4: Start background refresh
            this.startBackgroundRefresh();
            
            return true;
        } catch (error) {
            console.error('❌ TokenService initialization failed:', error);
            
            // Emergency fallback to demo data
            this.tokens = this.createDemoTokens();
            this.cacheStatus = 'error_fallback';
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('TokenService initialized with emergency demo data');
            return true;
        }
    }

    // Load tokens directly from token_cache table only
    async loadTokensFromCache() {
        try {
            if (!window.supabase) {
                console.warn('Supabase client not available');
                return false;
            }

            console.log('📊 Loading tokens from token_cache table...');
            
            // Query token_cache table directly
            const { data: cachedTokens, error } = await window.supabase
                .from('token_cache')
                .select('*')
                .gte('cache_expires_at', new Date().toISOString()) // Only fresh cache
                .eq('cache_status', 'FRESH')
                .order('market_cap_usd', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Token cache query error:', error);
                return false;
            }

            if (!cachedTokens || cachedTokens.length === 0) {
                console.log('⚠️ No fresh tokens in cache');
                return false;
            }

            console.log(`📦 Found ${cachedTokens.length} cached tokens`);
            
            // Process tokens
            this.tokens = this.processTokensFromCache(cachedTokens);
            this.cacheStatus = 'cache';
            
            console.log(`✅ Loaded ${this.tokens.length} tokens from cache`);
            return this.tokens.length > 0;
            
        } catch (error) {
            console.error('Error loading tokens from cache:', error);
            return false;
        }
    }

    // Process tokens from cache table
    processTokensFromCache(cachedTokens) {
        const processedTokens = [];
        const now = new Date().toISOString();
        
        console.log(`🔄 Processing ${cachedTokens.length} cached tokens...`);
        
        for (let i = 0; i < cachedTokens.length; i++) {
            try {
                const cachedToken = cachedTokens[i];
                
                // Map from cache table structure to token format
                const processedToken = {
                    // Core identifiers
                    address: cachedToken.token_address,
                    symbol: cachedToken.symbol,
                    name: cachedToken.name,
                    
                    // Logo with validation
                    logoURI: this.validateAndFixTokenLogo(cachedToken.logo_uri, cachedToken.symbol),
                    
                    // Financial data
                    market_cap: parseFloat(cachedToken.market_cap_usd) || 0,
                    price: parseFloat(cachedToken.current_price) || 0,
                    volume_24h: parseFloat(cachedToken.volume_24h) || 0,
                    price_change_24h: parseFloat(cachedToken.price_change_24h) || 0,
                    
                    // Technical data
                    decimals: parseInt(cachedToken.decimals) || 9,
                    age_days: parseInt(cachedToken.age_days) || 0,
                    
                    // Status and metadata
                    is_active: true,
                    last_updated: cachedToken.cache_created_at || now,
                    data_source: cachedToken.data_source || 'cache'
                };
                
                // Basic validation
                if (this.validateToken(processedToken)) {
                    processedTokens.push(processedToken);
                    console.log(`✅ Token ${i + 1} processed: ${processedToken.symbol}`);
                } else {
                    console.warn(`⚠️ Token ${i + 1} failed validation: ${processedToken.symbol}`);
                }
                
            } catch (tokenError) {
                console.error(`❌ Error processing token ${i + 1}:`, tokenError);
            }
        }
        
        console.log(`✅ Successfully processed ${processedTokens.length}/${cachedTokens.length} tokens`);
        return processedTokens;
    }

    // Validate and fix token logo
    validateAndFixTokenLogo(logoURI, symbol) {
        try {
            // If no logo or broken placeholder, generate fallback
            if (!logoURI || 
                logoURI.includes('placeholder-token.png') || 
                logoURI === '/placeholder-token.png' ||
                logoURI.includes('lastrrx.github.io') ||
                logoURI === 'null' ||
                logoURI === 'undefined') {
                
                return this.generateTokenLogoFallback(symbol);
            }
            
            // Return existing logo if it looks valid
            return logoURI;
            
        } catch (error) {
            console.error('Error validating token logo:', error);
            return this.generateTokenLogoFallback(symbol || 'TOKEN');
        }
    }

    // Generate reliable logo fallback
    generateTokenLogoFallback(symbol) {
        try {
            const cleanSymbol = String(symbol).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            const firstChar = cleanSymbol.charAt(0) || 'T';
            
            // Use UI Avatars with TokenWars branding
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstChar)}&background=8b5cf6&color=fff&size=64&bold=true&format=png`;
        } catch (error) {
            console.error('Error generating logo fallback:', error);
            return 'https://ui-avatars.com/api/?name=T&background=8b5cf6&color=fff&size=64&bold=true&format=png';
        }
    }

    // Basic token validation
    validateToken(token) {
        try {
            // Check required fields
            if (!token.address || !token.symbol || !token.name) {
                return false;
            }
            
            // Check numeric values
            if (typeof token.market_cap !== 'number' || token.market_cap < 0) {
                return false;
            }
            
            if (typeof token.price !== 'number' || token.price <= 0) {
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error validating token:', error);
            return false;
        }
    }

    // Create demo tokens (fallback only)
    createDemoTokens() {
        const now = new Date().toISOString();
        return [
            {
                address: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL',
                name: 'Wrapped SOL',
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
                market_cap: 45000000000,
                price: 180.50 + (Math.random() - 0.5) * 10,
                volume_24h: 2500000000,
                price_change_24h: (Math.random() - 0.5) * 10,
                age_days: 1500,
                is_active: true,
                last_updated: now,
                decimals: 9,
                data_source: 'demo'
            },
            {
                address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                symbol: 'USDC',
                name: 'USD Coin',
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
                market_cap: 42000000000,
                price: 1.00 + (Math.random() - 0.5) * 0.02,
                volume_24h: 3000000000,
                price_change_24h: (Math.random() - 0.5) * 0.5,
                age_days: 1200,
                is_active: true,
                last_updated: now,
                decimals: 6,
                data_source: 'demo'
            },
            {
                address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                symbol: 'BONK',
                name: 'Bonk',
                logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
                market_cap: 900000000,
                price: 0.000023 + (Math.random() - 0.5) * 0.000005,
                volume_24h: 120000000,
                price_change_24h: (Math.random() - 0.5) * 15,
                age_days: 400,
                is_active: true,
                last_updated: now,
                decimals: 5,
                data_source: 'demo'
            }
        ];
    }

    // Refresh token data
    async refreshTokenData() {
        try {
            if (this.isInitializing) {
                console.log('Skipping refresh - initialization in progress');
                return false;
            }
            
            console.log('Refreshing token data from cache...');
            
            const wasSuccessful = await this.loadTokensFromCache();
            
            if (wasSuccessful) {
                this.lastUpdate = new Date();
                console.log(`✅ Token data refreshed: ${this.tokens.length} tokens`);
                return true;
            } else {
                console.log('⚠️ Refresh failed, keeping existing data');
                return false;
            }
        } catch (error) {
            console.error('Error refreshing token data:', error);
            return false;
        }
    }

    // Start background refresh cycle
    startBackgroundRefresh() {
        // Clear existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Refresh every 5 minutes
        this.updateInterval = setInterval(async () => {
            try {
                console.log('Background token refresh triggered...');
                await this.refreshTokenData();
            } catch (error) {
                console.error('Background refresh failed:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes

        console.log('Background token refresh started (5-minute intervals)');
    }

    // Get all tokens
    async getTokens() {
        try {
            if (!this.isInitialized && !this.isInitializing) {
                await this.initialize();
            }
            
            return this.tokens.filter(token => token.is_active);
        } catch (error) {
            console.error('Error getting tokens:', error);
            return this.tokens.filter(token => token.is_active);
        }
    }

    // Get token by address
    async getTokenByAddress(address) {
        try {
            const tokens = await this.getTokens();
            return tokens.find(token => token.address === address);
        } catch (error) {
            console.error('Error getting token by address:', error);
            return null;
        }
    }

    // Get cache status
    getCacheStatus() {
        return {
            status: this.cacheStatus,
            tokenCount: this.tokens.length,
            lastUpdate: this.lastUpdate,
            isInitialized: this.isInitialized,
            dataSource: this.cacheStatus
        };
    }

    // Check if ready
    isReady() {
        return this.isInitialized;
    }

    // Cleanup
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('TokenService cleaned up');
    }
}

// Static property to hold singleton instance
TokenService.instance = null;

// Create global singleton instance
function getTokenService() {
    if (!window.tokenService) {
        window.tokenService = new TokenService();
    }
    return window.tokenService;
}

// Expose globally
window.TokenService = TokenService;
window.getTokenService = getTokenService;

console.log('✅ TokenService (SIMPLIFIED) class loaded and exposed globally');
console.log('🎯 Features:');
console.log('   ✅ Direct token_cache table queries only');
console.log('   ✅ Demo token fallback when cache empty');
console.log('   ✅ Background refresh every 5 minutes');
console.log('   ✅ Logo validation and fallback generation');
console.log('   ✅ Clean, minimal code focused on core functionality');
