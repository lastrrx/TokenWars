// Token Selection Service - Core token data fetching, filtering, and pair matching logic
// This service handles all token-related operations including API calls and data validation

class TokenService {
    constructor() {
        this.tokenCache = new Map();
        this.priceCache = new Map();
        this.lastTokenUpdate = null;
        this.isUpdating = false;
        this.validTokens = [];
        this.tokenPairs = [];
    }

    // ==============================================
    // TOKEN DATA FETCHING
    // ==============================================

    /**
     * Fetch and update the complete token list
     */
    async updateTokenList() {
        if (this.isUpdating) {
            console.log('Token update already in progress...');
            return this.validTokens;
        }

        this.isUpdating = true;
        console.log('Starting token list update...');

        try {
            // Fetch from multiple sources
            const [jupiterTokens, coingeckoTokens] = await Promise.all([
                this.fetchJupiterTokens(),
                this.fetchCoingeckoTokens()
            ]);

            // Merge and validate tokens
            const mergedTokens = this.mergeTokenSources(jupiterTokens, coingeckoTokens);
            
            // Apply filters
            const filteredTokens = await this.applyTokenFilters(mergedTokens);
            
            // Store valid tokens
            this.validTokens = filteredTokens;
            this.lastTokenUpdate = new Date();
            
            // Store in database
            await this.storeTokensInDatabase(filteredTokens);
            
            console.log(`Token list updated: ${filteredTokens.length} valid tokens`);
            return filteredTokens;

        } catch (error) {
            console.error('Token list update failed:', error);
            throw new Error(`Token update failed: ${error.message}`);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Fetch tokens from Jupiter API
     */
    async fetchJupiterTokens() {
        try {
            console.log('Fetching tokens from Jupiter...');
            
            const response = await fetch(window.APP_CONFIG.API_ENDPOINTS.JUPITER_TOKENS);
            if (!response.ok) {
                throw new Error(`Jupiter API error: ${response.status}`);
            }

            const tokens = await response.json();
            
            return tokens.map(token => ({
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                logoURI: token.logoURI,
                decimals: token.decimals,
                source: 'jupiter',
                tags: token.tags || []
            }));

        } catch (error) {
            console.error('Jupiter tokens fetch failed:', error);
            return []; // Return empty array instead of failing completely
        }
    }

    /**
     * Fetch tokens from CoinGecko via Supabase Edge Function
     */
    async fetchCoingeckoTokens() {
        try {
            console.log('Fetching tokens from CoinGecko...');
            
            const { data, error } = await window.supabaseClient.getSupabaseClient()
                .functions
                .invoke('fetch-tokens', {
                    body: {
                        vs_currency: 'usd',
                        order: 'market_cap_desc',
                        per_page: 250,
                        page: 1,
                        sparkline: false,
                        category: 'solana-ecosystem'
                    }
                });

            if (error) {
                console.error('CoinGecko edge function error:', error);
                return [];
            }

            return data.map(token => ({
                address: token.contract_address || token.id,
                symbol: token.symbol?.toUpperCase(),
                name: token.name,
                logoURI: token.image,
                market_cap: token.market_cap,
                current_price: token.current_price,
                price_change_24h: token.price_change_percentage_24h,
                total_volume: token.total_volume,
                market_cap_rank: token.market_cap_rank,
                last_updated: token.last_updated,
                source: 'coingecko',
                age_days: this.calculateTokenAge(token.genesis_date || token.last_updated)
            }));

        } catch (error) {
            console.error('CoinGecko tokens fetch failed:', error);
            return [];
        }
    }

    /**
     * Merge token data from multiple sources
     */
    mergeTokenSources(jupiterTokens, coingeckoTokens) {
        const tokenMap = new Map();

        // Add Jupiter tokens first (they have the most accurate Solana data)
        jupiterTokens.forEach(token => {
            if (token.address && token.symbol) {
                tokenMap.set(token.address, token);
            }
        });

        // Merge CoinGecko data (adds market cap and price info)
        coingeckoTokens.forEach(cgToken => {
            const existingToken = tokenMap.get(cgToken.address);
            
            if (existingToken) {
                // Merge data, preferring Jupiter for basic info, CoinGecko for market data
                tokenMap.set(cgToken.address, {
                    ...existingToken,
                    market_cap: cgToken.market_cap,
                    current_price: cgToken.current_price,
                    price_change_24h: cgToken.price_change_24h,
                    total_volume: cgToken.total_volume,
                    market_cap_rank: cgToken.market_cap_rank,
                    age_days: cgToken.age_days,
                    last_updated: cgToken.last_updated
                });
            } else if (cgToken.address && cgToken.symbol) {
                // Add as new token if not in Jupiter list
                tokenMap.set(cgToken.address, cgToken);
            }
        });

        return Array.from(tokenMap.values());
    }

    /**
     * Apply filters to token list based on requirements
     */
    async applyTokenFilters(tokens) {
        const config = window.APP_CONFIG.TOKEN_SELECTION;
        const filteredTokens = [];

        for (const token of tokens) {
            try {
                // Validate required fields
                if (!this.validateTokenFields(token)) {
                    continue;
                }

                // Market cap filter (minimum $5M)
                if (!token.market_cap || token.market_cap < config.MIN_MARKET_CAP) {
                    continue;
                }

                // Age filter (minimum 30 days)
                if (token.age_days && token.age_days < config.MIN_AGE_DAYS) {
                    continue;
                }

                // Blacklist filter
                if (config.BLACKLISTED_TOKENS.includes(token.address)) {
                    continue;
                }

                // Liquidity check
                if (!await this.checkTokenLiquidity(token)) {
                    continue;
                }

                // Additional validation
                if (this.isValidToken(token)) {
                    filteredTokens.push({
                        ...token,
                        category: this.categorizeToken(token.market_cap),
                        filtered_at: new Date().toISOString()
                    });
                }

            } catch (error) {
                console.warn(`Token validation failed for ${token.symbol}:`, error);
                continue;
            }
        }

        console.log(`Applied filters: ${tokens.length} -> ${filteredTokens.length} tokens`);
        return filteredTokens;
    }

    // ==============================================
    // TOKEN PAIRING LOGIC
    // ==============================================

    /**
     * Generate token pairs for competitions
     */
    generateTokenPairs(tokens = null) {
        const tokenList = tokens || this.validTokens;
        const config = window.APP_CONFIG.TOKEN_SELECTION;
        const pairs = [];

        // Group tokens by market cap categories
        const categories = this.groupTokensByCategory(tokenList);

        Object.entries(categories).forEach(([category, categoryTokens]) => {
            if (categoryTokens.length < 2) return;

            // Generate pairs within each category
            for (let i = 0; i < categoryTokens.length - 1; i++) {
                for (let j = i + 1; j < categoryTokens.length; j++) {
                    const token1 = categoryTokens[i];
                    const token2 = categoryTokens[j];

                    // Check market cap compatibility (within 10% tolerance)
                    if (this.areTokensCompatible(token1, token2)) {
                        pairs.push({
                            id: `${token1.address}-${token2.address}`,
                            token_a: token1,
                            token_b: token2,
                            category: category,
                            market_cap_ratio: Math.max(token1.market_cap, token2.market_cap) / 
                                            Math.min(token1.market_cap, token2.market_cap),
                            compatibility_score: this.calculateCompatibilityScore(token1, token2),
                            created_at: new Date().toISOString()
                        });
                    }
                }
            }
        });

        // Sort pairs by compatibility score
        pairs.sort((a, b) => b.compatibility_score - a.compatibility_score);

        this.tokenPairs = pairs;
        console.log(`Generated ${pairs.length} token pairs`);
        return pairs;
    }

    /**
     * Select best token pair for a new competition
     */
    selectOptimalTokenPair(excludeUsedPairs = []) {
        if (this.tokenPairs.length === 0) {
            this.generateTokenPairs();
        }

        // Filter out recently used pairs
        const availablePairs = this.tokenPairs.filter(pair => 
            !excludeUsedPairs.includes(pair.id)
        );

        if (availablePairs.length === 0) {
            throw new Error('No available token pairs for competition');
        }

        // Select pair with highest compatibility score
        const selectedPair = availablePairs[0];
        
        console.log(`Selected token pair: ${selectedPair.token_a.symbol} vs ${selectedPair.token_b.symbol}`);
        return selectedPair;
    }

    // ==============================================
    // VALIDATION AND UTILITY FUNCTIONS
    // ==============================================

    /**
     * Validate token has all required fields
     */
    validateTokenFields(token) {
        const required = window.TOKEN_VALIDATION.REQUIRED_FIELDS;
        return required.every(field => token[field] && token[field].toString().length > 0);
    }

    /**
     * Check if token has sufficient liquidity
     */
    async checkTokenLiquidity(token) {
        try {
            // For now, use volume as liquidity proxy
            // In production, you'd check DEX liquidity pools
            return token.total_volume && token.total_volume > window.APP_CONFIG.PRICE_CONFIG.MIN_LIQUIDITY_USD;
        } catch (error) {
            console.warn(`Liquidity check failed for ${token.symbol}:`, error);
            return false;
        }
    }

    /**
     * Check if two tokens are compatible for pairing
     */
    areTokensCompatible(token1, token2) {
        const tolerance = window.APP_CONFIG.TOKEN_SELECTION.MARKET_CAP_TOLERANCE;
        const ratio = Math.max(token1.market_cap, token2.market_cap) / 
                     Math.min(token1.market_cap, token2.market_cap);
        
        return (ratio - 1) <= tolerance;
    }

    /**
     * Calculate compatibility score for token pair
     */
    calculateCompatibilityScore(token1, token2) {
        let score = 100;

        // Market cap similarity (higher score for closer market caps)
        const mcRatio = Math.max(token1.market_cap, token2.market_cap) / 
                       Math.min(token1.market_cap, token2.market_cap);
        score -= (mcRatio - 1) * 100;

        // Volume similarity
        if (token1.total_volume && token2.total_volume) {
            const volumeRatio = Math.max(token1.total_volume, token2.total_volume) / 
                               Math.min(token1.total_volume, token2.total_volume);
            score -= (volumeRatio - 1) * 10;
        }

        // Age similarity (prefer similar age tokens)
        if (token1.age_days && token2.age_days) {
            const ageDiff = Math.abs(token1.age_days - token2.age_days);
            score -= ageDiff * 0.1;
        }

        return Math.max(0, score);
    }

    /**
     * Categorize token by market cap
     */
    categorizeToken(marketCap) {
        const categories = window.TOKEN_CATEGORIES;
        
        for (const [key, category] of Object.entries(categories)) {
            if (marketCap >= category.min && marketCap < category.max) {
                return key;
            }
        }
        
        return 'MICRO_CAP'; // Default fallback
    }

    /**
     * Group tokens by market cap category
     */
    groupTokensByCategory(tokens) {
        const groups = {};
        
        tokens.forEach(token => {
            const category = this.categorizeToken(token.market_cap);
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(token);
        });

        return groups;
    }

    /**
     * Calculate token age in days
     */
    calculateTokenAge(dateString) {
        if (!dateString) return null;
        
        const tokenDate = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - tokenDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Validate if token meets all criteria
     */
    isValidToken(token) {
        const validation = window.TOKEN_VALIDATION;
        
        // Symbol length check
        if (token.symbol.length < validation.MIN_SYMBOL_LENGTH || 
            token.symbol.length > validation.MAX_SYMBOL_LENGTH) {
            return false;
        }

        // Name length check
        if (token.name.length < validation.MIN_NAME_LENGTH || 
            token.name.length > validation.MAX_NAME_LENGTH) {
            return false;
        }

        // Address format check (basic)
        if (token.address.length !== validation.VALID_ADDRESS_LENGTH) {
            return false;
        }

        return true;
    }

    // ==============================================
    // DATABASE OPERATIONS
    // ==============================================

    /**
     * Store validated tokens in database
     */
    async storeTokensInDatabase(tokens) {
        try {
            const supabase = window.supabaseClient.getSupabaseClient();
            
            // Prepare data for database
            const tokenData = tokens.map(token => ({
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                logo_uri: token.logoURI,
                decimals: token.decimals || 9,
                market_cap: token.market_cap,
                current_price: token.current_price,
                total_volume: token.total_volume,
                price_change_24h: token.price_change_24h,
                market_cap_rank: token.market_cap_rank,
                category: token.category,
                age_days: token.age_days,
                is_active: true,
                last_updated: new Date().toISOString()
            }));

            // Clear old tokens and insert new ones
            await supabase.from('tokens').delete().neq('address', '');
            
            const { error } = await supabase.from('tokens').insert(tokenData);
            
            if (error) {
                console.error('Database storage error:', error);
                throw error;
            }

            console.log(`Stored ${tokenData.length} tokens in database`);

        } catch (error) {
            console.error('Failed to store tokens in database:', error);
            // Don't throw - this shouldn't break the token update process
        }
    }

    /**
     * Get tokens from database cache
     */
    async getTokensFromDatabase() {
        try {
            const supabase = window.supabaseClient.getSupabaseClient();
            
            const { data, error } = await supabase
                .from('tokens')
                .select('*')
                .eq('is_active', true)
                .order('market_cap', { ascending: false });

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Failed to get tokens from database:', error);
            return [];
        }
    }

    // ==============================================
    // PUBLIC API METHODS
    // ==============================================

    /**
     * Get current valid tokens (with cache check)
     */
    async getValidTokens(forceRefresh = false) {
        const now = new Date();
        const updateInterval = window.APP_CONFIG.UPDATE_INTERVALS.TOKEN_LIST_REFRESH;
        
        // Check if refresh is needed
        if (forceRefresh || 
            !this.lastTokenUpdate || 
            (now - this.lastTokenUpdate) > updateInterval ||
            this.validTokens.length === 0) {
            
            await this.updateTokenList();
        }

        return this.validTokens;
    }

    /**
     * Get available token pairs
     */
    async getTokenPairs(forceRefresh = false) {
        if (forceRefresh || this.tokenPairs.length === 0) {
            const tokens = await this.getValidTokens();
            this.generateTokenPairs(tokens);
        }

        return this.tokenPairs;
    }

    /**
     * Get token by address
     */
    getToken(address) {
        return this.validTokens.find(token => token.address === address);
    }

    /**
     * Search tokens by symbol or name
     */
    searchTokens(query) {
        const lowerQuery = query.toLowerCase();
        return this.validTokens.filter(token => 
            token.symbol.toLowerCase().includes(lowerQuery) ||
            token.name.toLowerCase().includes(lowerQuery)
        );
    }
}

// Create global instance
window.tokenService = new TokenService();

// Export for module use
window.TokenService = TokenService;
