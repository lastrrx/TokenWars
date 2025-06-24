// Price Service - TWAP calculations, real-time price updates, and price history management
// This service handles all price-related operations including TWAP calculation for competitions

class PriceService {
    constructor() {
        this.priceCache = new Map();
        this.priceHistory = new Map();
        this.updateInterval = null;
        this.isUpdating = false;
        this.activePriceSubscriptions = new Set();
    }

    // ==============================================
    // PRICE FETCHING AND CACHING
    // ==============================================

    /**
     * Get current price for a token from multiple sources
     */
    async getCurrentPrice(tokenAddress, useCache = true) {
        const cacheKey = `price_${tokenAddress}`;
        const now = Date.now();
        
        // Check cache first
        if (useCache && this.priceCache.has(cacheKey)) {
            const cached = this.priceCache.get(cacheKey);
            const cacheAge = now - cached.timestamp;
            
            if (cacheAge < window.APP_CONFIG.PRICE_CONFIG.PRICE_CACHE_DURATION) {
                return cached.price;
            }
        }

        try {
            // Fetch from multiple sources for reliability
            const prices = await this.fetchPriceFromSources(tokenAddress);
            
            // Calculate weighted average
            const price = this.calculateWeightedPrice(prices);
            
            // Cache the result
            this.priceCache.set(cacheKey, {
                price: price,
                timestamp: now,
                sources: prices
            });

            return price;

        } catch (error) {
            console.error(`Failed to get price for ${tokenAddress}:`, error);
            
            // Return cached price if available, even if stale
            if (this.priceCache.has(cacheKey)) {
                return this.priceCache.get(cacheKey).price;
            }
            
            throw error;
        }
    }

    /**
     * Fetch price from multiple sources
     */
    async fetchPriceFromSources(tokenAddress) {
        const sources = window.PRICE_SOURCES;
        const pricePromises = sources.map(source => 
            this.fetchPriceFromSource(tokenAddress, source)
        );

        // Wait for all sources, but don't fail if some fail
        const results = await Promise.allSettled(pricePromises);
        
        const validPrices = results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map((result, index) => ({
                source: sources[index].name,
                price: result.value,
                weight: sources[index].weight
            }));

        if (validPrices.length === 0) {
            throw new Error('No valid price sources available');
        }

        return validPrices;
    }

    /**
     * Fetch price from a specific source
     */
    async fetchPriceFromSource(tokenAddress, source) {
        try {
            switch (source.endpoint) {
                case 'jupiter':
                    return await this.fetchJupiterPrice(tokenAddress);
                
                case 'coingecko':
                    return await this.fetchCoingeckoPrice(tokenAddress);
                
                case 'dexscreener':
                    return await this.fetchDexScreenerPrice(tokenAddress);
                
                case 'helius':
                    return await this.fetchHeliusPrice(tokenAddress);
                
                default:
                    console.warn(`Unknown price source: ${source.endpoint}`);
                    return null;
            }
        } catch (error) {
            console.warn(`Price fetch failed for ${source.name}:`, error);
            return null;
        }
    }

    /**
     * Fetch price from Jupiter
     */
    async fetchJupiterPrice(tokenAddress) {
        const response = await fetch(
            `${window.APP_CONFIG.API_ENDPOINTS.JUPITER_PRICE}?ids=${tokenAddress}`
        );
        
        if (!response.ok) {
            throw new Error(`Jupiter API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.data && data.data[tokenAddress]) {
            return parseFloat(data.data[tokenAddress].price);
        }
        
        return null;
    }

    /**
     * Fetch price from CoinGecko via Supabase Edge Function
     */
    async fetchCoingeckoPrice(tokenAddress) {
        try {
            const { data, error } = await window.supabaseClient.getSupabaseClient()
                .functions
                .invoke('fetch-prices', {
                    body: {
                        ids: tokenAddress,
                        vs_currencies: 'usd'
                    }
                });

            if (error) throw error;
            
            if (data && data[tokenAddress] && data[tokenAddress].usd) {
                return parseFloat(data[tokenAddress].usd);
            }
            
            return null;

        } catch (error) {
            console.warn(`CoinGecko price fetch failed: ${error}`);
            return null;
        }
    }

    /**
     * Fetch price from DexScreener
     */
    async fetchDexScreenerPrice(tokenAddress) {
        try {
            const response = await fetch(
                `${window.APP_CONFIG.API_ENDPOINTS.DEX_SCREENER}/tokens/${tokenAddress}`
            );
            
            if (!response.ok) return null;
            
            const data = await response.json();
            
            if (data.pairs && data.pairs.length > 0) {
                // Get price from the pair with highest liquidity
                const bestPair = data.pairs.reduce((best, current) => 
                    (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best
                );
                
                return parseFloat(bestPair.priceUsd);
            }
            
            return null;

        } catch (error) {
            console.warn(`DexScreener price fetch failed: ${error}`);
            return null;
        }
    }

    /**
     * Fetch price from Helius
     */
    async fetchHeliusPrice(tokenAddress) {
        // Placeholder for Helius implementation
        // Would require Helius API key setup
        return null;
    }

    /**
     * Calculate weighted average price from multiple sources
     */
    calculateWeightedPrice(prices) {
        if (prices.length === 0) {
            throw new Error('No prices available for calculation');
        }

        if (prices.length === 1) {
            return prices[0].price;
        }

        // Remove outliers first
        const filteredPrices = this.filterPriceOutliers(prices);
        
        // Calculate weighted average
        let totalWeight = 0;
        let weightedSum = 0;

        filteredPrices.forEach(priceData => {
            weightedSum += priceData.price * priceData.weight;
            totalWeight += priceData.weight;
        });

        return weightedSum / totalWeight;
    }

    /**
     * Filter out price outliers
     */
    filterPriceOutliers(prices) {
        if (prices.length <= 2) return prices;

        const priceValues = prices.map(p => p.price);
        const median = this.calculateMedian(priceValues);
        const threshold = window.APP_CONFIG.PRICE_CONFIG.OUTLIER_THRESHOLD;

        return prices.filter(priceData => {
            const deviation = Math.abs(priceData.price - median) / median;
            return deviation <= threshold;
        });
    }

    /**
     * Calculate median of price array
     */
    calculateMedian(prices) {
        const sorted = [...prices].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    // ==============================================
    // TWAP (Time-Weighted Average Price) CALCULATIONS
    // ==============================================

    /**
     * Calculate TWAP for a token over a specific time window
     */
    async calculateTWAP(tokenAddress, startTime, endTime) {
        try {
            // Get price history for the time window
            const priceHistory = await this.getPriceHistory(
                tokenAddress, 
                startTime, 
                endTime
            );

            if (priceHistory.length === 0) {
                throw new Error('No price history available for TWAP calculation');
            }

            if (priceHistory.length === 1) {
                return priceHistory[0].price;
            }

            // Calculate time-weighted average
            let totalWeightedPrice = 0;
            let totalTime = 0;

            for (let i = 0; i < priceHistory.length - 1; i++) {
                const currentPrice = priceHistory[i];
                const nextPrice = priceHistory[i + 1];
                
                const timeDiff = new Date(nextPrice.timestamp) - new Date(currentPrice.timestamp);
                const weight = timeDiff / 1000; // Convert to seconds
                
                totalWeightedPrice += currentPrice.price * weight;
                totalTime += weight;
            }

            // Include the last price for the remaining time
            const lastPrice = priceHistory[priceHistory.length - 1];
            const remainingTime = new Date(endTime) - new Date(lastPrice.timestamp);
            if (remainingTime > 0) {
                totalWeightedPrice += lastPrice.price * (remainingTime / 1000);
                totalTime += remainingTime / 1000;
            }

            return totalTime > 0 ? totalWeightedPrice / totalTime : lastPrice.price;

        } catch (error) {
            console.error(`TWAP calculation failed for ${tokenAddress}:`, error);
            throw error;
        }
    }

    /**
     * Calculate TWAP for competition pricing (specific windows)
     */
    async calculateCompetitionTWAP(tokenAddress, competitionStart, competitionEnd) {
        const config = window.APP_CONFIG.PRICE_CONFIG;
        const windowMinutes = config.TWAP_WINDOW_MINUTES;

        try {
            // Calculate start TWAP (10 minutes before voting ends to 10 minutes after)
            const votingEnd = new Date(competitionStart);
            const startTWAPBegin = new Date(votingEnd.getTime() - windowMinutes * 60 * 1000);
            const startTWAPEnd = new Date(votingEnd.getTime() + windowMinutes * 60 * 1000);

            // Calculate end TWAP (10 minutes before competition ends to 10 minutes after)
            const compEnd = new Date(competitionEnd);
            const endTWAPBegin = new Date(compEnd.getTime() - windowMinutes * 60 * 1000);
            const endTWAPEnd = new Date(compEnd.getTime() + windowMinutes * 60 * 1000);

            const [startTWAP, endTWAP] = await Promise.all([
                this.calculateTWAP(tokenAddress, startTWAPBegin, startTWAPEnd),
                this.calculateTWAP(tokenAddress, endTWAPBegin, endTWAPEnd)
            ]);

            return {
                start_twap: startTWAP,
                end_twap: endTWAP,
                price_change: ((endTWAP - startTWAP) / startTWAP) * 100,
                start_window: { begin: startTWAPBegin, end: startTWAPEnd },
                end_window: { begin: endTWAPBegin, end: endTWAPEnd }
            };

        } catch (error) {
            console.error(`Competition TWAP calculation failed:`, error);
            throw error;
        }
    }

    // ==============================================
    // PRICE HISTORY MANAGEMENT
    // ==============================================

    /**
     * Record price in history
     */
    async recordPriceHistory(tokenAddress, price, timestamp = null) {
        try {
            const supabase = window.supabaseClient.getSupabaseClient();
            const recordTime = timestamp || new Date().toISOString();

            const { error } = await supabase
                .from('price_history')
                .insert({
                    token_address: tokenAddress,
                    price: price,
                    timestamp: recordTime,
                    volume: 0, // Would be fetched separately
                    market_cap: 0 // Would be calculated
                });

            if (error) {
                console.error('Price history recording failed:', error);
            }

        } catch (error) {
            console.error('Failed to record price history:', error);
        }
    }

    /**
     * Get price history for a token within a time range
     */
    async getPriceHistory(tokenAddress, startTime, endTime) {
        try {
            const supabase = window.supabaseClient.getSupabaseClient();

            const { data, error } = await supabase
                .from('price_history')
                .select('*')
                .eq('token_address', tokenAddress)
                .gte('timestamp', startTime)
                .lte('timestamp', endTime)
                .order('timestamp', { ascending: true });

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Failed to get price history:', error);
            return [];
        }
    }

    /**
     * Start recording price history for tracked tokens
     */
    startPriceHistoryRecording(tokenAddresses) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        const interval = window.APP_CONFIG.PRICE_CONFIG.PRICE_UPDATE_INTERVAL;

        this.updateInterval = setInterval(async () => {
            if (this.isUpdating) return;
            
            this.isUpdating = true;
            
            try {
                await this.recordPricesForTokens(tokenAddresses);
            } catch (error) {
                console.error('Price recording cycle failed:', error);
            } finally {
                this.isUpdating = false;
            }
        }, interval);

        console.log(`Started price history recording for ${tokenAddresses.length} tokens`);
    }

    /**
     * Record prices for multiple tokens
     */
    async recordPricesForTokens(tokenAddresses) {
        const timestamp = new Date().toISOString();
        const pricePromises = tokenAddresses.map(async (address) => {
            try {
                const price = await this.getCurrentPrice(address, false);
                await this.recordPriceHistory(address, price, timestamp);
                return { address, price, success: true };
            } catch (error) {
                console.warn(`Failed to record price for ${address}:`, error);
                return { address, error: error.message, success: false };
            }
        });

        const results = await Promise.allSettled(pricePromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        console.log(`Price recording: ${successful}/${tokenAddresses.length} successful`);
    }

    /**
     * Stop price history recording
     */
    stopPriceHistoryRecording() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('Stopped price history recording');
        }
    }

    // ==============================================
    // REAL-TIME PRICE UPDATES
    // ==============================================

    /**
     * Subscribe to real-time price updates for a token
     */
    subscribeToPriceUpdates(tokenAddress, callback) {
        const subscriptionKey = `price_${tokenAddress}`;
        
        if (this.activePriceSubscriptions.has(subscriptionKey)) {
            return; // Already subscribed
        }

        const interval = setInterval(async () => {
            try {
                const price = await this.getCurrentPrice(tokenAddress, false);
                callback({
                    tokenAddress,
                    price,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.warn(`Price update failed for ${tokenAddress}:`, error);
            }
        }, window.APP_CONFIG.PRICE_CONFIG.PRICE_UPDATE_INTERVAL);

        this.activePriceSubscriptions.add(subscriptionKey);
        
        return () => {
            clearInterval(interval);
            this.activePriceSubscriptions.delete(subscriptionKey);
        };
    }

    /**
     * Get price change percentage over time period
     */
    async getPriceChange(tokenAddress, hoursAgo = 24) {
        try {
            const now = new Date();
            const pastTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

            const [currentPrice, pastPrice] = await Promise.all([
                this.getCurrentPrice(tokenAddress),
                this.getPriceAtTime(tokenAddress, pastTime)
            ]);

            if (!pastPrice) {
                return null;
            }

            return ((currentPrice - pastPrice) / pastPrice) * 100;

        } catch (error) {
            console.error(`Price change calculation failed:`, error);
            return null;
        }
    }

    /**
     * Get price at a specific time (closest available)
     */
    async getPriceAtTime(tokenAddress, targetTime) {
        try {
            const supabase = window.supabaseClient.getSupabaseClient();

            // Get the closest price record to the target time
            const { data, error } = await supabase
                .from('price_history')
                .select('price, timestamp')
                .eq('token_address', tokenAddress)
                .lte('timestamp', targetTime.toISOString())
                .order('timestamp', { ascending: false })
                .limit(1);

            if (error) throw error;

            return data && data.length > 0 ? data[0].price : null;

        } catch (error) {
            console.error('Failed to get historical price:', error);
            return null;
        }
    }

    // ==============================================
    // UTILITY FUNCTIONS
    // ==============================================

    /**
     * Format price for display
     */
    formatPrice(price, decimals = null) {
        if (!price || isNaN(price)) return '0.00';
        
        const decimalPlaces = decimals || window.APP_CONFIG.DISPLAY_CONFIG.PRICE_DECIMAL_PLACES;
        
        if (price < 0.000001) {
            return price.toExponential(2);
        } else if (price < 0.01) {
            return price.toFixed(6);
        } else if (price < 1) {
            return price.toFixed(4);
        } else {
            return price.toFixed(2);
        }
    }

    /**
     * Format price change percentage
     */
    formatPriceChange(change) {
        if (!change || isNaN(change)) return '0.00%';
        
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)}%`;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.stopPriceHistoryRecording();
        this.activePriceSubscriptions.clear();
        this.priceCache.clear();
        this.priceHistory.clear();
    }

    // ==============================================
    // PUBLIC API METHODS
    // ==============================================

    /**
     * Get current prices for multiple tokens
     */
    async getCurrentPrices(tokenAddresses) {
        const pricePromises = tokenAddresses.map(async (address) => {
            try {
                const price = await this.getCurrentPrice(address);
                return { address, price, success: true };
            } catch (error) {
                return { address, error: error.message, success: false };
            }
        });

        return await Promise.all(pricePromises);
    }

    /**
     * Get market data for display
     */
    async getMarketData(tokenAddress) {
        try {
            const [currentPrice, priceChange24h] = await Promise.all([
                this.getCurrentPrice(tokenAddress),
                this.getPriceChange(tokenAddress, 24)
            ]);

            return {
                price: currentPrice,
                price_change_24h: priceChange24h,
                formatted_price: this.formatPrice(currentPrice),
                formatted_change: this.formatPriceChange(priceChange24h),
                last_updated: new Date().toISOString()
            };

        } catch (error) {
            console.error(`Market data fetch failed for ${tokenAddress}:`, error);
            return null;
        }
    }
}

// Create global instance
window.priceService = new PriceService();

// Export for module use
window.PriceService = PriceService;
