// PriceService - Simplified Version for Basic Functionality
// Provides mock price data until Edge Functions are deployed

class PriceService {
    constructor() {
        this.priceCache = new Map();
        this.lastUpdate = null;
        this.isInitialized = false;
        this.updateInterval = null;
        
        console.log('PriceService constructor called');
    }

    async initialize() {
        try {
            console.log('Initializing PriceService...');
            
            // Initialize with demo price data
            this.initializeDemoPrices();
            
            // Start periodic price updates (demo mode)
            this.startPriceUpdates();
            
            this.isInitialized = true;
            console.log('PriceService initialized with demo data');
            
            return true;
        } catch (error) {
            console.error('PriceService initialization failed:', error);
            throw error;
        }
    }

    // Initialize demo prices
    initializeDemoPrices() {
        const demoPrices = {
            'So11111111111111111111111111111111111111112': { // SOL
                price: 180.50 + (Math.random() - 0.5) * 5,
                volume: 2500000000,
                market_cap: 45000000000,
                timestamp: new Date().toISOString()
            },
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { // USDC
                price: 1.00 + (Math.random() - 0.5) * 0.01,
                volume: 1800000000,
                market_cap: 42000000000,
                timestamp: new Date().toISOString()
            },
            'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { // MSOL
                price: 195.30 + (Math.random() - 0.5) * 8,
                volume: 45000000,
                market_cap: 1200000000,
                timestamp: new Date().toISOString()
            },
            'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { // JUP
                price: 1.15 + (Math.random() - 0.5) * 0.2,
                volume: 85000000,
                market_cap: 1500000000,
                timestamp: new Date().toISOString()
            },
            'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { // BONK
                price: 0.000023 + (Math.random() - 0.5) * 0.000005,
                volume: 125000000,
                market_cap: 900000000,
                timestamp: new Date().toISOString()
            },
            'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': { // RENDER
                price: 7.85 + (Math.random() - 0.5) * 1.2,
                volume: 35000000,
                market_cap: 850000000,
                timestamp: new Date().toISOString()
            }
        };

        // Store in cache
        for (const [address, data] of Object.entries(demoPrices)) {
            this.priceCache.set(address, data);
        }

        this.lastUpdate = new Date();
    }

    // Start periodic price updates (demo mode with small variations)
    startPriceUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            this.updateDemoPrices();
        }, 60000); // Update every minute

        console.log('Demo price updates started');
    }

    // Update demo prices with small random variations
    updateDemoPrices() {
        try {
            for (const [address, priceData] of this.priceCache.entries()) {
                // Small random price change (-2% to +2%)
                const changePercent = (Math.random() - 0.5) * 0.04;
                const newPrice = priceData.price * (1 + changePercent);
                
                // Update price data
                this.priceCache.set(address, {
                    ...priceData,
                    price: Math.max(0.000001, newPrice), // Ensure price doesn't go negative
                    timestamp: new Date().toISOString()
                });
            }

            this.lastUpdate = new Date();
            console.log('Demo prices updated');
        } catch (error) {
            console.error('Error updating demo prices:', error);
        }
    }

    // Get current market data for a token
    async getMarketData(tokenAddress) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const data = this.priceCache.get(tokenAddress);
            
            if (!data) {
                // Return default data for unknown tokens
                return {
                    price: 0,
                    volume: 0,
                    market_cap: 0,
                    timestamp: new Date().toISOString(),
                    success: false
                };
            }

            return {
                ...data,
                success: true
            };
        } catch (error) {
            console.error('Error getting market data:', error);
            return {
                price: 0,
                volume: 0,
                market_cap: 0,
                timestamp: new Date().toISOString(),
                success: false
            };
        }
    }

    // Get current prices for multiple tokens
    async getCurrentPrices(tokenAddresses) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const results = [];
            
            for (const address of tokenAddresses) {
                const marketData = await this.getMarketData(address);
                results.push({
                    address,
                    price: marketData.price,
                    success: marketData.success
                });
            }

            return results;
        } catch (error) {
            console.error('Error getting current prices:', error);
            return tokenAddresses.map(address => ({
                address,
                price: 0,
                success: false
            }));
        }
    }

    // Calculate TWAP (simplified version)
    async calculateTWAP(tokenAddress, startTime, endTime) {
        try {
            // For demo, just return current price as TWAP
            const marketData = await this.getMarketData(tokenAddress);
            return marketData.price;
        } catch (error) {
            console.error('Error calculating TWAP:', error);
            return 0;
        }
    }

    // Store price history (demo implementation)
    async storePriceHistory(tokenAddress, price, timestamp = null) {
        try {
            // In demo mode, just log the storage
            console.log(`Price history stored: ${tokenAddress} = $${price} at ${timestamp || new Date().toISOString()}`);
            return true;
        } catch (error) {
            console.error('Error storing price history:', error);
            return false;
        }
    }

    // Start price history recording for specific tokens
    startPriceHistoryRecording(tokenAddresses) {
        console.log(`Starting price history recording for ${tokenAddresses.length} tokens (demo mode)`);
        
        // In demo mode, just log which tokens we're "tracking"
        tokenAddresses.forEach(address => {
            console.log(`Tracking price history for: ${address}`);
        });
    }

    // Get price history for a token (demo implementation)
    async getPriceHistory(tokenAddress, startTime, endTime) {
        try {
            // Return demo price history data
            const currentPrice = this.priceCache.get(tokenAddress)?.price || 100;
            const history = [];
            
            const start = new Date(startTime);
            const end = new Date(endTime);
            const duration = end.getTime() - start.getTime();
            const intervals = Math.min(100, Math.max(10, duration / (5 * 60 * 1000))); // 5-minute intervals
            
            for (let i = 0; i <= intervals; i++) {
                const timestamp = new Date(start.getTime() + (duration * i / intervals));
                const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
                const price = currentPrice * (1 + variation);
                
                history.push({
                    timestamp: timestamp.toISOString(),
                    price: Math.max(0.000001, price),
                    volume: Math.random() * 1000000
                });
            }
            
            return history;
        } catch (error) {
            console.error('Error getting price history:', error);
            return [];
        }
    }

    // Schedule price collection for competition
    async scheduleCompetitionPriceCollection(competitionId, tokens, startTime, endTime) {
        console.log(`Scheduling price collection for competition ${competitionId} (demo mode)`);
        console.log(`Tokens: ${tokens.join(', ')}`);
        console.log(`Period: ${startTime} to ${endTime}`);
        
        // In demo mode, just return success
        return true;
    }

    // Validate token prices
    async validateTokenPrices(tokenAddresses) {
        try {
            const results = [];
            
            for (const address of tokenAddresses) {
                const data = this.priceCache.get(address);
                results.push({
                    address,
                    valid: !!data && data.price > 0,
                    price: data?.price || 0,
                    lastUpdate: data?.timestamp
                });
            }
            
            return results;
        } catch (error) {
            console.error('Error validating token prices:', error);
            return [];
        }
    }

    // Clean up resources
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.priceCache.clear();
        console.log('PriceService cleaned up');
    }

    // Get cache status
    getCacheStatus() {
        return {
            size: this.priceCache.size,
            lastUpdate: this.lastUpdate,
            isInitialized: this.isInitialized
        };
    }

    // Check if service is ready
    isReady() {
        return this.isInitialized;
    }
}

// Immediately expose PriceService globally
window.PriceService = PriceService;

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    if (!window.priceService) {
        console.log('Auto-initializing PriceService...');
        window.priceService = new PriceService();
    }
});

console.log('PriceService class loaded and exposed globally');
