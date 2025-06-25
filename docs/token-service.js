// TokenService - FIXED VERSION - Safe Token Processing Without Spread Operator
// Resolves initialization hang issue in Phase 3

class TokenService {
    constructor() {
        // Singleton pattern - prevent multiple instances
        if (TokenService.instance) {
            console.log('TokenService: Returning existing instance');
            return TokenService.instance;
        }
        
        this.tokens = [];
        this.tokenPairs = [];
        this.lastUpdate = null;
        this.isInitialized = false;
        this.isInitializing = false; // Prevent concurrent initialization
        this.cacheStatus = 'unknown';
        this.updateInterval = null;
        
        // Store as singleton instance
        TokenService.instance = this;
        
        console.log('TokenService constructor called - NEW INSTANCE');
    }

    async initialize() {
        try {
            // Prevent concurrent initialization
            if (this.isInitializing) {
                console.log('TokenService: Already initializing, waiting...');
                // Wait for current initialization to complete
                let attempts = 0;
                while (this.isInitializing && !this.isInitialized && attempts < 100) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                if (attempts >= 100) {
                    console.error('TokenService: Initialization timeout, forcing completion');
                    this.isInitializing = false;
                    return false;
                }
                return this.isInitialized;
            }
            
            if (this.isInitialized) {
                console.log('TokenService: Already initialized');
                return true;
            }
            
            this.isInitializing = true;
            console.log('TokenService: Starting initialization...');
            
            // Step 1: Try to load from cache-first edge function
            console.log('🔄 Step 1: Loading tokens from cache...');
            const cacheLoaded = await this.loadTokensFromCache();
            
            // Step 2: If cache is empty, create demo tokens as fallback
            if (!cacheLoaded || this.tokens.length === 0) {
                console.log('🔄 Step 2: Cache empty, loading demo tokens as fallback...');
                this.tokens = this.createDemoTokens();
                this.cacheStatus = 'demo_fallback';
            }
            
            // Step 3: Generate token pairs - NO RECURSIVE CALLS
            console.log('🔄 Step 3: Generating token pairs...');
            this.tokenPairs = this.generateDemoTokenPairs(); // Use demo pairs during initialization
            
            // Step 4: Mark as initialized BEFORE starting background tasks
            console.log('🔄 Step 4: Finalizing initialization...');
            this.lastUpdate = new Date();
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log(`✅ TokenService initialized: ${this.tokens.length} tokens, ${this.tokenPairs.length} pairs, status: ${this.cacheStatus}`);
            
            // Step 5: Start background refresh cycle (only once) - AFTER initialization
            if (!this.updateInterval) {
                console.log('🔄 Step 5: Starting background refresh...');
                this.startBackgroundRefresh();
            }
            
            return true;
        } catch (error) {
            console.error('❌ TokenService initialization failed:', error);
            console.error('Error stack:', error.stack);
            
            // Emergency fallback to demo data
            this.tokens = this.createDemoTokens();
            this.tokenPairs = this.generateDemoTokenPairs();
            this.cacheStatus = 'error_fallback';
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('TokenService initialized with emergency fallback data');
            return true;
        }
    }

    // FIXED: Load tokens from cache-first edge function with safe processing
    async loadTokensFromCache() {
        try {
            const supabaseUrl = window.SUPABASE_CONFIG?.url;
            if (!supabaseUrl) {
                throw new Error('Supabase configuration not available');
            }

            console.log('Fetching tokens from cache-first edge function...');
            
            const response = await fetch(`${supabaseUrl}/functions/v1/fetch-tokens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.SUPABASE_CONFIG.anonKey}`
                },
                body: JSON.stringify({
                    limit: 50,
                    forceRefresh: false
                })
            });

            if (!response.ok) {
                throw new Error(`Edge function error: ${response.status}`);
            }

            const data = await response.json();
            console.log('📦 Edge function response received:', typeof data);
            console.log('📊 Response keys:', Object.keys(data));
            
            if (data.success && data.tokens && Array.isArray(data.tokens) && data.tokens.length > 0) {
                console.log(`🔄 Processing ${data.tokens.length} tokens...`);
                
                // SAFE TOKEN PROCESSING - No spread operator
                this.tokens = this.processTokensSafely(data.tokens);
                
                this.cacheStatus = data.source || 'cache';
                console.log(`✅ Loaded ${this.tokens.length} tokens from ${this.cacheStatus}`);
                
                if (this.tokens.length > 0) {
                    console.log('🔍 First token sample:', this.tokens[0]);
                    return true;
                } else {
                    console.log('⚠️ No tokens processed successfully');
                    return false;
                }
            } else {
                console.log('⚠️ Edge function returned invalid structure or no tokens');
                console.log('Response structure:', data);
                return false;
            }
            
        } catch (error) {
            console.error('Error loading tokens from cache:', error);
            return false;
        }
    }

    // NEW: Safe token processing without spread operator
    processTokensSafely(rawTokens) {
        const processedTokens = [];
        const now = new Date().toISOString();
        
        console.log(`🔄 Processing ${rawTokens.length} raw tokens safely...`);
        
        for (let i = 0; i < rawTokens.length; i++) {
            try {
                const rawToken = rawTokens[i];
                console.log(`Processing token ${i + 1}/${rawTokens.length}:`, rawToken?.symbol || 'Unknown');
                
                // EXPLICIT PROPERTY COPYING - NO SPREAD OPERATOR
                const processedToken = {
                    // Core identifiers
                    address: this.extractProperty(rawToken, ['address', 'token_address']),
                    symbol: this.extractProperty(rawToken, ['symbol']),
                    name: this.extractProperty(rawToken, ['name']),
                    
                    // Logo and display
                    logoURI: this.extractProperty(rawToken, ['logoURI', 'logo_uri', 'image']),
                    
                    // Financial data
                    market_cap: this.parseNumericValue(this.extractProperty(rawToken, ['market_cap', 'market_cap_usd'])),
                    price: this.parseNumericValue(this.extractProperty(rawToken, ['price', 'current_price'])),
                    volume_24h: this.parseNumericValue(this.extractProperty(rawToken, ['volume_24h', 'total_volume'])),
                    price_change_24h: this.parseNumericValue(this.extractProperty(rawToken, ['price_change_24h'])),
                    
                    // Technical data
                    decimals: parseInt(this.extractProperty(rawToken, ['decimals'])) || 9,
                    age_days: parseInt(this.extractProperty(rawToken, ['age_days'])) || 0,
                    liquidity_score: this.parseNumericValue(this.extractProperty(rawToken, ['liquidity_score'])) || 0.5,
                    
                    // Status and metadata
                    is_active: true,
                    last_updated: this.extractProperty(rawToken, ['cache_timestamp', 'last_updated']) || now,
                    data_source: this.extractProperty(rawToken, ['data_source']) || 'cache'
                };
                
                // Validate processed token
                if (this.validateProcessedToken(processedToken)) {
                    processedTokens.push(processedToken);
                    console.log(`✅ Token ${i + 1} processed successfully:`, processedToken.symbol);
                } else {
                    console.warn(`⚠️ Token ${i + 1} failed validation:`, processedToken.symbol);
                }
                
            } catch (tokenError) {
                console.error(`❌ Error processing token ${i + 1}:`, tokenError);
                // Continue with next token
            }
        }
        
        console.log(`✅ Successfully processed ${processedTokens.length}/${rawTokens.length} tokens`);
        return processedTokens;
    }

    // NEW: Safe property extraction helper
    extractProperty(obj, propertyNames) {
        if (!obj || typeof obj !== 'object') return null;
        
        for (const propName of propertyNames) {
            try {
                if (obj.hasOwnProperty(propName) && obj[propName] !== undefined && obj[propName] !== null) {
                    return obj[propName];
                }
            } catch (error) {
                console.warn(`Error accessing property ${propName}:`, error);
                continue;
            }
        }
        return null;
    }

    // NEW: Safe numeric value parsing
    parseNumericValue(value) {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number' && !isNaN(value)) return value;
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    // NEW: Validate processed token
    validateProcessedToken(token) {
        try {
            // Check required fields
            if (!token.address || !token.symbol || !token.name) {
                console.warn('Token missing required fields:', { address: token.address, symbol: token.symbol, name: token.name });
                return false;
            }
            
            // Check numeric values
            if (typeof token.market_cap !== 'number' || token.market_cap < 0) {
                console.warn('Token has invalid market cap:', token.market_cap);
                return false;
            }
            
            if (typeof token.price !== 'number' || token.price <= 0) {
                console.warn('Token has invalid price:', token.price);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error validating token:', error);
            return false;
        }
    }

    // Create demo tokens for testing and fallback
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
                liquidity_score: 0.95,
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
                liquidity_score: 0.98,
                is_active: true,
                last_updated: now,
                decimals: 6,
                data_source: 'demo'
            },
            {
                address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
                symbol: 'MSOL',
                name: 'Marinade Staked SOL',
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
                market_cap: 1200000000,
                price: 195.30 + (Math.random() - 0.5) * 15,
                volume_24h: 150000000,
                price_change_24h: (Math.random() - 0.5) * 8,
                age_days: 800,
                liquidity_score: 0.85,
                is_active: true,
                last_updated: now,
                decimals: 9,
                data_source: 'demo'
            },
            {
                address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                symbol: 'JUP',
                name: 'Jupiter',
                logoURI: 'https://static.jup.ag/jup/icon.png',
                market_cap: 1500000000,
                price: 1.15 + (Math.random() - 0.5) * 0.3,
                volume_24h: 280000000,
                price_change_24h: (Math.random() - 0.5) * 12,
                age_days: 120,
                liquidity_score: 0.82,
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
                liquidity_score: 0.75,
                is_active: true,
                last_updated: now,
                decimals: 5,
                data_source: 'demo'
            },
            {
                address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
                symbol: 'RENDER',
                name: 'Render Token',
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof/logo.png',
                market_cap: 850000000,
                price: 7.85 + (Math.random() - 0.5) * 1.2,
                volume_24h: 95000000,
                price_change_24h: (Math.random() - 0.5) * 10,
                age_days: 600,
                liquidity_score: 0.78,
                is_active: true,
                last_updated: now,
                decimals: 8,
                data_source: 'demo'
            }
        ];
    }

    // Generate demo token pairs with fresh timestamps
    generateDemoTokenPairs() {
        const pairs = [];
        const tokens = this.tokens;
        const now = new Date().toISOString();
        
        // Create some compatible pairs
        if (tokens.length >= 4) {
            pairs.push({
                id: 1,
                token_a_address: tokens[2].address, // MSOL
                token_b_address: tokens[3].address, // JUP
                token_a: tokens[2],
                token_b: tokens[3],
                compatibility_score: 0.85,
                market_cap_ratio: tokens[2].market_cap / tokens[3].market_cap,
                is_active: true,
                created_at: now,
                last_used: null
            });
            
            pairs.push({
                id: 2,
                token_a_address: tokens[4].address, // BONK
                token_b_address: tokens[5].address, // RENDER
                token_a: tokens[4],
                token_b: tokens[5],
                compatibility_score: 0.78,
                market_cap_ratio: tokens[4].market_cap / tokens[5].market_cap,
                is_active: true,
                created_at: now,
                last_used: null
            });
        }
        
        return pairs;
    }

    // Start background refresh cycle (singleton-aware)
    startBackgroundRefresh() {
        // Clear existing interval to prevent multiple timers
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

    // Refresh token data from cache
    async refreshTokenData(forceRefresh = false) {
        try {
            if (this.isInitializing) {
                console.log('Skipping refresh - initialization in progress');
                return false;
            }
            
            console.log(`Refreshing token data (forceRefresh: ${forceRefresh})...`);
            
            const oldTokenCount = this.tokens.length;
            const wasSuccessful = await this.loadTokensFromCache();
            
            if (wasSuccessful) {
                // Regenerate pairs if tokens changed significantly
                if (Math.abs(this.tokens.length - oldTokenCount) > 2) {
                    this.tokenPairs = await this.generateTokenPairs();
                }
                
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

    // Get valid tokens with cache awareness - SAFE VERSION
    async getValidTokens(forceRefresh = false) {
        try {
            // CHANGED: Don't call initialize() if already initializing
            if (!this.isInitialized && !this.isInitializing) {
                await this.initialize();
            }
            
            // If still not initialized, return current tokens
            if (!this.isInitialized) {
                console.log('TokenService: Not fully initialized, returning current tokens');
                return this.tokens.filter(token => token.is_active);
            }
            
            // Check if data is stale and needs refresh
            if (forceRefresh || this.isDataStale()) {
                await this.refreshTokenData(forceRefresh);
            }
            
            return this.tokens.filter(token => token.is_active);
        } catch (error) {
            console.error('Error getting valid tokens:', error);
            return this.tokens.filter(token => token.is_active);
        }
    }

    // Get eligible tokens (with validation) - SAFE VERSION
    async getEligibleTokens(filters = {}) {
        try {
            const validTokens = await this.getValidTokens();
            
            let eligibleTokens = validTokens.filter(token => {
                // Apply validation
                if (!this.validateToken(token)) return false;
                
                // Apply filters
                if (filters.minMarketCap && token.market_cap < filters.minMarketCap) return false;
                if (filters.maxMarketCap && token.market_cap > filters.maxMarketCap) return false;
                if (filters.minAge && token.age_days < filters.minAge) return false;
                if (filters.category && token.category !== filters.category) return false;
                
                return true;
            });
            
            return eligibleTokens;
        } catch (error) {
            console.error('Error getting eligible tokens:', error);
            return [];
        }
    }

    // Get token pairs - SAFE VERSION
    async getTokenPairs() {
        try {
            // CHANGED: Don't call initialize() if already initializing
            if (!this.isInitialized && !this.isInitializing) {
                await this.initialize();
            }
            
            return this.tokenPairs || [];
        } catch (error) {
            console.error('Error getting token pairs:', error);
            return [];
        }
    }

    // Get available token pairs (alias for backward compatibility)
    async getAvailableTokenPairs() {
        try {
            return await this.getTokenPairs();
        } catch (error) {
            console.error('Error getting available token pairs:', error);
            return [];
        }
    }

    // Generate token pairs with compatibility scoring - ASYNC VERSION
    async generateTokenPairs(count = 10) {
        try {
            // CHANGED: Only generate if fully initialized
            if (!this.isInitialized) {
                console.log('TokenService: Not initialized, using demo pairs');
                return this.generateDemoTokenPairs();
            }
            
            const eligibleTokens = await this.getEligibleTokens();
            
            if (eligibleTokens.length < 2) {
                console.log('Not enough eligible tokens for pairing');
                return this.generateDemoTokenPairs();
            }
            
            const pairs = [];
            const usedTokens = new Set();
            
            for (let i = 0; i < count && pairs.length < count; i++) {
                const availableTokens = eligibleTokens.filter(token => !usedTokens.has(token.address));
                
                if (availableTokens.length < 2) break;
                
                // Find compatible pair
                for (let j = 0; j < availableTokens.length - 1; j++) {
                    for (let k = j + 1; k < availableTokens.length; k++) {
                        const tokenA = availableTokens[j];
                        const tokenB = availableTokens[k];
                        
                        const compatibility = this.calculateCompatibility(tokenA, tokenB);
                        
                        if (compatibility.score >= 0.7) {
                            pairs.push({
                                id: pairs.length + 1,
                                token_a_address: tokenA.address,
                                token_b_address: tokenB.address,
                                token_a: tokenA,
                                token_b: tokenB,
                                compatibility_score: compatibility.score,
                                market_cap_ratio: tokenA.market_cap / tokenB.market_cap,
                                is_active: true,
                                created_at: new Date().toISOString(),
                                last_used: null
                            });
                            
                            usedTokens.add(tokenA.address);
                            usedTokens.add(tokenB.address);
                            break;
                        }
                    }
                    if (usedTokens.has(availableTokens[j].address)) break;
                }
            }
            
            return pairs.length > 0 ? pairs : this.generateDemoTokenPairs();
        } catch (error) {
            console.error('Error generating token pairs:', error);
            return this.generateDemoTokenPairs();
        }
    }

    // Calculate compatibility between two tokens
    calculateCompatibility(tokenA, tokenB) {
        let score = 1.0;
        const reasons = [];
        
        // Market cap similarity (±10% is ideal)
        const marketCapDiff = Math.abs(tokenA.market_cap - tokenB.market_cap);
        const avgMarketCap = (tokenA.market_cap + tokenB.market_cap) / 2;
        const marketCapDiffPercent = (marketCapDiff / avgMarketCap) * 100;
        
        if (marketCapDiffPercent <= 10) {
            score += 0.2; // Bonus for similar market caps
        } else if (marketCapDiffPercent <= 20) {
            // Acceptable
        } else {
            score -= (marketCapDiffPercent - 20) * 0.01; // Penalty
            reasons.push(`Market cap difference: ${marketCapDiffPercent.toFixed(1)}%`);
        }
        
        // Age similarity bonus
        if (tokenA.age_days && tokenB.age_days) {
            const ageDiff = Math.abs(tokenA.age_days - tokenB.age_days);
            if (ageDiff < 100) {
                score += 0.1;
            }
        }
        
        // Liquidity score bonus
        const avgLiquidity = ((tokenA.liquidity_score || 0.5) + (tokenB.liquidity_score || 0.5)) / 2;
        score += avgLiquidity * 0.2;
        
        // Ensure minimum requirements
        if (marketCapDiffPercent > 50) {
            score = 0; // Incompatible
            reasons.push('Market cap difference too large');
        }
        
        return {
            score: Math.max(0, Math.min(1, score)),
            reasons,
            marketCapDiff: marketCapDiffPercent
        };
    }

    // Get a specific token by address
    async getTokenByAddress(address) {
        try {
            const tokens = await this.getValidTokens();
            return tokens.find(token => token.address === address);
        } catch (error) {
            console.error('Error getting token by address:', error);
            return null;
        }
    }

    // Validate token for competitions
    validateToken(token) {
        if (!token) return false;
        
        // Basic validation
        if (!token.address || !token.symbol || !token.name) return false;
        if (!token.market_cap || token.market_cap < 5000000) return false; // Min $5M
        if (!token.age_days || token.age_days < 30) return false; // Min 30 days
        
        // Check blacklist
        if (this.isTokenBlacklisted(token.address)) return false;
        
        return true;
    }

    // Check if token is blacklisted
    isTokenBlacklisted(address) {
        const blacklist = window.APP_CONFIG?.TOKEN_SELECTION?.BLACKLISTED_TOKENS || [];
        return blacklist.includes(address);
    }

    // Check if data is stale
    isDataStale() {
        if (!this.lastUpdate) return true;
        
        const staleThreshold = window.APP_CONFIG?.CACHE_CONFIG?.TOKEN_CACHE_DURATION || 300000; // 5 minutes
        const age = Date.now() - this.lastUpdate.getTime();
        
        return age > staleThreshold;
    }

    // Get token categories
    getTokensByCategory() {
        const tokens = this.tokens;
        const categories = {
            LARGE_CAP: [],
            MID_CAP: [],
            SMALL_CAP: [],
            MICRO_CAP: []
        };
        
        tokens.forEach(token => {
            const marketCap = token.market_cap;
            if (marketCap >= 1000000000) {
                categories.LARGE_CAP.push(token);
            } else if (marketCap >= 250000000) {
                categories.MID_CAP.push(token);
            } else if (marketCap >= 50000000) {
                categories.SMALL_CAP.push(token);
            } else if (marketCap >= 5000000) {
                categories.MICRO_CAP.push(token);
            }
        });
        
        return categories;
    }

    // Get cache status
    getCacheStatus() {
        return {
            status: this.cacheStatus,
            tokenCount: this.tokens.length,
            pairCount: this.tokenPairs.length,
            lastUpdate: this.lastUpdate,
            isInitialized: this.isInitialized,
            isStale: this.isDataStale()
        };
    }

    // Get last update time
    getLastUpdateTime() {
        return this.lastUpdate;
    }

    // Check if initialization is complete
    isReady() {
        return this.isInitialized;
    }

    // Cleanup function
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

// Immediately expose TokenService globally
window.TokenService = TokenService;
window.getTokenService = getTokenService;

console.log('✅ TokenService (FIXED) class loaded and exposed globally');
console.log('🔧 Fixed Issues:');
console.log('   ✅ Removed problematic spread operator');
console.log('   ✅ Added safe property extraction');
console.log('   ✅ Enhanced error handling for token processing');
console.log('   ✅ Explicit property copying prevents circular references');
console.log('   ✅ Individual token validation with detailed logging');
