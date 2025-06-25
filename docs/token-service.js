// TokenService - Cache-Aware Version with Real-Time Integration
// Integrates with cache-first edge functions and provides fallback support

class TokenService {
    constructor() {
        this.tokens = [];
        this.tokenPairs = [];
        this.lastUpdate = null;
        this.isInitialized = false;
        this.cacheStatus = 'unknown';
        this.updateInterval = null;
        
        console.log('TokenService constructor called');
    }

    async initialize() {
        try {
            console.log('Initializing TokenService with cache integration...');
            
            // Step 1: Try to load from cache-first edge function
            await this.loadTokensFromCache();
            
            // Step 2: If cache is empty, create demo tokens as fallback
            if (this.tokens.length === 0) {
                console.log('Cache empty, loading demo tokens as fallback...');
                this.tokens = this.createDemoTokens();
                this.cacheStatus = 'demo_fallback';
            }
            
            // Step 3: Generate token pairs
            this.tokenPairs = await this.generateTokenPairs();
            
            // Step 4: Start background refresh cycle
            this.startBackgroundRefresh();
            
            this.lastUpdate = new Date();
            this.isInitialized = true;
            
            console.log(`TokenService initialized: ${this.tokens.length} tokens, ${this.tokenPairs.length} pairs, status: ${this.cacheStatus}`);
            return true;
        } catch (error) {
            console.error('TokenService initialization failed:', error);
            
            // Emergency fallback to demo data
            this.tokens = this.createDemoTokens();
            this.tokenPairs = this.generateDemoTokenPairs();
            this.cacheStatus = 'error_fallback';
            this.isInitialized = true;
            
            console.log('TokenService initialized with emergency fallback data');
            return true;
        }
    }

    // Load tokens from cache-first edge function
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
            
            if (data.success && data.tokens && data.tokens.length > 0) {
                this.tokens = data.tokens.map(token => ({
                    ...token,
                    is_active: true,
                    last_updated: token.cache_timestamp || new Date().toISOString()
                }));
                
                this.cacheStatus = data.source || 'cache';
                console.log(`✅ Loaded ${this.tokens.length} tokens from ${this.cacheStatus}`);
                return true;
            } else {
                console.log('⚠️ Edge function returned no tokens');
                return false;
            }
            
        } catch (error) {
            console.error('Error loading tokens from cache:', error);
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
                age_days: 1500,
                liquidity_score: 0.95,
                is_active: true,
                last_updated: now,
                decimals: 9
            },
            {
                address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                symbol: 'USDC',
                name: 'USD Coin',
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
                market_cap: 42000000000,
                price: 1.00 + (Math.random() - 0.5) * 0.02,
                age_days: 1200,
                liquidity_score: 0.98,
                is_active: true,
                last_updated: now,
                decimals: 6
            },
            {
                address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
                symbol: 'MSOL',
                name: 'Marinade Staked SOL',
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
                market_cap: 1200000000,
                price: 195.30 + (Math.random() - 0.5) * 15,
                age_days: 800,
                liquidity_score: 0.85,
                is_active: true,
                last_updated: now,
                decimals: 9
            },
            {
                address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                symbol: 'JUP',
                name: 'Jupiter',
                logoURI: 'https://static.jup.ag/jup/icon.png',
                market_cap: 1500000000,
                price: 1.15 + (Math.random() - 0.5) * 0.3,
                age_days: 120,
                liquidity_score: 0.82,
                is_active: true,
                last_updated: now,
                decimals: 6
            },
            {
                address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                symbol: 'BONK',
                name: 'Bonk',
                logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
                market_cap: 900000000,
                price: 0.000023 + (Math.random() - 0.5) * 0.000005,
                age_days: 400,
                liquidity_score: 0.75,
                is_active: true,
                last_updated: now,
                decimals: 5
            },
            {
                address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
                symbol: 'RENDER',
                name: 'Render Token',
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof/logo.png',
                market_cap: 850000000,
                price: 7.85 + (Math.random() - 0.5) * 1.2,
                age_days: 600,
                liquidity_score: 0.78,
                is_active: true,
                last_updated: now,
                decimals: 8
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

    // Refresh token data from cache
    async refreshTokenData(forceRefresh = false) {
        try {
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

    // Get valid tokens with cache awareness
    async getValidTokens(forceRefresh = false) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
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
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            return this.tokenPairs;
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

// Immediately expose TokenService globally (no auto-initialization)
window.TokenService = TokenService;

console.log('TokenService class loaded and exposed globally');
