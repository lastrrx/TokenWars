// TokenService - UPDATED FOR LIVE DATA INTEGRATION
// Now uses live-token-fetch Edge Function for real market data

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
        
        console.log('TokenService constructor called - LIVE DATA VERSION');
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
            console.log('TokenService: Starting initialization with LIVE DATA...');
            
            // Step 1: Try to load LIVE data first
            console.log('🔄 Step 1: Loading LIVE tokens from market APIs...');
            const liveLoaded = await this.loadLiveTokenData();
            
            // Step 2: If live data fails, try cache
            if (!liveLoaded || this.tokens.length === 0) {
                console.log('🔄 Step 2: Live data failed, trying cache...');
                const cacheLoaded = await this.loadTokensFromCache();
                
                if (!cacheLoaded || this.tokens.length === 0) {
                    console.log('🔄 Step 3: Cache empty, using demo fallback...');
                    this.tokens = this.createDemoTokens();
                    this.cacheStatus = 'demo_fallback';
                }
            }
            
            // Step 3: Generate token pairs
            console.log('🔄 Step 4: Generating token pairs...');
            this.tokenPairs = this.generateDemoTokenPairs();
            
            // Step 4: Mark as initialized
            console.log('🔄 Step 5: Finalizing initialization...');
            this.lastUpdate = new Date();
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log(`✅ TokenService initialized: ${this.tokens.length} tokens, ${this.tokenPairs.length} pairs, status: ${this.cacheStatus}`);
            
            // Step 5: Start background refresh cycle
            if (!this.updateInterval) {
                console.log('🔄 Step 6: Starting background refresh...');
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

    // NEW: Load live token data from market APIs
    async loadLiveTokenData() {
        try {
            const supabaseUrl = window.SUPABASE_CONFIG?.url;
            if (!supabaseUrl) {
                throw new Error('Supabase configuration not available');
            }

            console.log('📡 Fetching LIVE tokens from market APIs...');
            
            const response = await fetch(`${supabaseUrl}/functions/v1/live-token-fetch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.SUPABASE_CONFIG.anonKey}`
                },
                body: JSON.stringify({
                    limit: 10 // Get 10 live tokens
                })
            });

            if (!response.ok) {
                throw new Error(`Live data fetch failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('📦 Live data response received:', typeof data);
            console.log('📊 Response keys:', Object.keys(data));
            
            if (data.success && data.results && Array.isArray(data.results) && data.results.length > 0) {
                console.log(`🔄 Processing ${data.results.length} live tokens...`);
                
                // Load tokens from cache after live update
                const cacheSuccess = await this.loadTokensFromCache();
                
                if (cacheSuccess && this.tokens.length > 0) {
                    this.cacheStatus = 'live_data';
                    console.log(`✅ Loaded ${this.tokens.length} tokens from live data`);
                    return true;
                } else {
                    console.log('⚠️ Live data processed but cache empty');
                    return false;
                }
            } else {
                console.log('⚠️ Live data function returned no results');
                console.log('Response structure:', data);
                return false;
            }
            
        } catch (error) {
            console.error('Error loading live token data:', error);
            return false;
        }
    }

    // UPDATED: Load tokens from cache (now used after live data updates)
    async loadTokensFromCache() {
        try {
            const supabaseUrl = window.SUPABASE_CONFIG?.url;
            if (!supabaseUrl) {
                throw new Error('Supabase configuration not available');
            }

            console.log('Fetching tokens from cache...');
            
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
                throw new Error(`Cache fetch failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('📦 Cache response received:', typeof data);
            
            if (data.success && data.tokens && Array.isArray(data.tokens) && data.tokens.length > 0) {
                console.log(`🔄 Processing ${data.tokens.length} cached tokens...`);
                
                // Process tokens safely
                this.tokens = this.processTokensSafely(data.tokens);
                
                // Update cache status based on source
                if (this.cacheStatus !== 'live_data') {
                    this.cacheStatus = data.source || 'cache';
                }
                
                console.log(`✅ Loaded ${this.tokens.length} tokens from cache`);
                
                if (this.tokens.length > 0) {
                    console.log('🔍 First token sample:', this.tokens[0]);
                    return true;
                } else {
                    console.log('⚠️ No tokens processed successfully');
                    return false;
                }
            } else {
                console.log('⚠️ Cache returned invalid structure or no tokens');
                return false;
            }
            
        } catch (error) {
            console.error('Error loading tokens from cache:', error);
            return false;
        }
    }

    // NEW: Force live data refresh
    async refreshLiveData() {
        try {
            console.log('🔄 Forcing live data refresh...');
            
            const liveSuccess = await this.loadLiveTokenData();
            
            if (liveSuccess) {
                this.lastUpdate = new Date();
                console.log('✅ Live data refresh successful');
                return true;
            } else {
                console.log('⚠️ Live data refresh failed');
                return false;
            }
        } catch (error) {
            console.error('Error refreshing live data:', error);
            return false;
        }
    }

    // ENHANCED: Safe token processing without spread operator + Logo validation
    processTokensSafely(rawTokens) {
        const processedTokens = [];
        const now = new Date().toISOString();
        
        console.log(`🔄 Processing ${rawTokens.length} raw tokens safely with logo validation...`);
        
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
                    
                    // LOGO FIX: Enhanced logo processing with validation
                    logoURI: this.processTokenLogo(rawToken),
                    
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
                    data_source: this.extractProperty(rawToken, ['data_source']) || 'cache',
                    
                    // LOGO DEBUG INFO
                    logo_source: this.extractProperty(rawToken, ['logo_source']) || 'unknown'
                };
                
                // Validate processed token
                if (this.validateProcessedToken(processedToken)) {
                    processedTokens.push(processedToken);
                    console.log(`✅ Token ${i + 1} processed successfully:`, processedToken.symbol, 'Logo:', processedToken.logoURI ? '✅' : '❌');
                } else {
                    console.warn(`⚠️ Token ${i + 1} failed validation:`, processedToken.symbol);
                }
                
            } catch (tokenError) {
                console.error(`❌ Error processing token ${i + 1}:`, tokenError);
                // Continue with next token
            }
        }
        
        console.log(`✅ Successfully processed ${processedTokens.length}/${rawTokens.length} tokens with logos`);
        return processedTokens;
    }

    // NEW: Enhanced logo processing with fallback system
    processTokenLogo(rawToken) {
        try {
            // Try multiple logo property names
            let logoURI = this.extractProperty(rawToken, ['logoURI', 'logo_uri', 'image', 'logo_url']);
            
            // Get symbol for fallback generation
            const symbol = this.extractProperty(rawToken, ['symbol']) || 'TOKEN';
            
            // If no logo or broken placeholder, generate fallback
            if (!logoURI || 
                logoURI.includes('placeholder-token.png') || 
                logoURI === '/placeholder-token.png' ||
                logoURI.includes('lastrrx.github.io')) {
                
                console.log(`🖼️ Generating logo fallback for ${symbol}`);
                logoURI = this.generateTokenLogoFallback(symbol);
            }
            
            // Validate logo URL format
            if (!this.isValidLogoURL(logoURI)) {
                console.warn(`🖼️ Invalid logo URL for ${symbol}, using fallback`);
                logoURI = this.generateTokenLogoFallback(symbol);
            }
            
            return logoURI;
            
        } catch (error) {
            console.error('Error processing token logo:', error);
            const symbol = this.extractProperty(rawToken, ['symbol']) || 'TOKEN';
            return this.generateTokenLogoFallback(symbol);
        }
    }

    // Generate reliable logo fallback using UI Avatars
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

    // Validate logo URL format
    isValidLogoURL(url) {
        try {
            if (!url || typeof url !== 'string') return false;
            
            // Check if it's a valid URL
            new URL(url);
            
            // Check if it's likely an image
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
            const hasImageExtension = imageExtensions.some(ext => url.toLowerCase().includes(ext));
            
            // Allow known image services
            const imageServices = ['ui-avatars.com', 'coingecko.com', 'arweave.net', 'githubusercontent.com', 'jup.ag'];
            const isImageService = imageServices.some(service => url.includes(service));
            
            return hasImageExtension || isImageService;
        } catch (error) {
            return false;
        }
    }

    // Safe property extraction helper
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

    // Safe numeric value parsing
    parseNumericValue(value) {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number' && !isNaN(value)) return value;
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    // Validate processed token
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
            
            // Logo should always be present now
            if (!token.logoURI) {
                console.warn('Token missing logo URI:', token.symbol);
                // Don't fail validation, just fix it
                token.logoURI = this.generateTokenLogoFallback(token.symbol);
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
                liquidity_score: 0.95,
                is_active: true,
                last_updated: now,
                decimals: 9,
                data_source: 'demo',
                logo_source: 'solana'
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
                data_source: 'demo',
                logo_source: 'solana'
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
                data_source: 'demo',
                logo_source: 'arweave'
            }
        ];
    }

    // Generate demo token pairs
    generateDemoTokenPairs() {
        const pairs = [];
        const tokens = this.tokens;
        const now = new Date().toISOString();
        
        if (tokens.length >= 2) {
            pairs.push({
                id: 1,
                token_a_address: tokens[0].address,
                token_b_address: tokens[1].address,
                token_a: tokens[0],
                token_b: tokens[1],
                compatibility_score: 0.85,
                market_cap_ratio: tokens[0].market_cap / tokens[1].market_cap,
                is_active: true,
                created_at: now,
                last_used: null
            });
        }
        
        return pairs;
    }

    // Start background refresh cycle (enhanced with live data)
    startBackgroundRefresh() {
        // Clear existing interval to prevent multiple timers
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Refresh every 3 minutes (more frequent for live data)
        this.updateInterval = setInterval(async () => {
            try {
                console.log('Background live data refresh triggered...');
                await this.refreshLiveData();
            } catch (error) {
                console.error('Background refresh failed:', error);
            }
        }, 3 * 60 * 1000); // 3 minutes

        console.log('Background live data refresh started (3-minute intervals)');
    }

    // UPDATED: Refresh data with live data priority
    async refreshTokenData(forceRefresh = false) {
        try {
            if (this.isInitializing) {
                console.log('Skipping refresh - initialization in progress');
                return false;
            }
            
            console.log(`Refreshing token data (forceRefresh: ${forceRefresh})...`);
            
            const oldTokenCount = this.tokens.length;
            
            // Try live data first, then cache
            let wasSuccessful = false;
            
            if (forceRefresh) {
                wasSuccessful = await this.loadLiveTokenData();
            }
            
            if (!wasSuccessful) {
                wasSuccessful = await this.loadTokensFromCache();
            }
            
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

    // Get valid tokens - ENHANCED
    async getValidTokens(forceRefresh = false) {
        try {
            if (!this.isInitialized && !this.isInitializing) {
                await this.initialize();
            }
            
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

    // Get eligible tokens (with validation)
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

    // Get token pairs
    async getTokenPairs() {
        try {
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

    // Generate token pairs with compatibility scoring
    async generateTokenPairs(count = 10) {
        try {
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
        
        const staleThreshold = window.APP_CONFIG?.CACHE_CONFIG?.TOKEN_CACHE_DURATION || 180000; // 3 minutes for live data
        const age = Date.now() - this.lastUpdate.getTime();
        
        return age > staleThreshold;
    }

    // Get cache status - ENHANCED
    getCacheStatus() {
        return {
            status: this.cacheStatus,
            tokenCount: this.tokens.length,
            pairCount: this.tokenPairs.length,
            lastUpdate: this.lastUpdate,
            isInitialized: this.isInitialized,
            isStale: this.isDataStale(),
            isLiveData: this.cacheStatus === 'live_data'
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

console.log('✅ TokenService (LIVE DATA VERSION) class loaded and exposed globally');
console.log('🔧 Enhanced Features:');
console.log('   ✅ Live market data integration via live-token-fetch');
console.log('   ✅ Automatic background refresh with live data');
console.log('   ✅ Cache-first fallback for reliability');
console.log('   ✅ Enhanced logo processing and validation');
console.log('   ✅ Real-time data source indicators');
