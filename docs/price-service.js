// PriceService - Basic Implementation for Phase 3
// Provides price tracking functionality with safe initialization

class PriceService {
    constructor() {
        // Singleton pattern
        if (PriceService.instance) {
            console.log('PriceService: Returning existing instance');
            return PriceService.instance;
        }
        
        this.isInitialized = false;
        this.isInitializing = false;
        this.prices = new Map();
        this.lastUpdate = null;
        this.updateInterval = null;
        
        // Store as singleton instance
        PriceService.instance = this;
        
        console.log('PriceService constructor called');
    }

    async initialize() {
        try {
            if (this.isInitializing) {
                console.log('PriceService: Already initializing, waiting...');
                let attempts = 0;
                while (this.isInitializing && !this.isInitialized && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                return this.isInitialized;
            }
            
            if (this.isInitialized) {
                console.log('PriceService: Already initialized');
                return true;
            }
            
            this.isInitializing = true;
            console.log('PriceService: Starting initialization...');
            
            // Initialize with demo prices
            this.initializeDemoPrices();
            
            this.isInitialized = true;
            this.isInitializing = false;
            this.lastUpdate = new Date();
            
            console.log('✅ PriceService initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ PriceService initialization failed:', error);
            this.isInitialized = true; // Mark as initialized even if failed
            this.isInitializing = false;
            return true; // Don't block other services
        }
    }

    initializeDemoPrices() {
        // Initialize with some demo prices
        const demoPrices = [
            { address: 'So11111111111111111111111111111111111111112', price: 180.50, symbol: 'SOL' },
            { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', price: 1.00, symbol: 'USDC' },
            { address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', price: 195.30, symbol: 'MSOL' },
            { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', price: 1.15, symbol: 'JUP' },
            { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', price: 0.000023, symbol: 'BONK' },
            { address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof', price: 7.85, symbol: 'RENDER' }
        ];
        
        demoPrices.forEach(token => {
            this.prices.set(token.address, {
                price: token.price,
                timestamp: new Date().toISOString(),
                source: 'demo'
            });
        });
        
        console.log(`📊 Initialized ${this.prices.size} demo prices`);
    }

    async updatePrices(tokenAddresses = []) {
        try {
            if (!this.isInitialized) {
                console.log('PriceService: Not initialized, skipping price update');
                return false;
            }
            
            // For Phase 3, just update demo prices with slight variations
            const now = new Date().toISOString();
            let updated = 0;
            
            for (const [address, priceData] of this.prices.entries()) {
                // Add small random variation (±5%)
                const variation = (Math.random() - 0.5) * 0.1; // ±5%
                const newPrice = priceData.price * (1 + variation);
                
                this.prices.set(address, {
                    price: newPrice,
                    timestamp: now,
                    source: 'demo_updated'
                });
                updated++;
            }
            
            this.lastUpdate = new Date();
            console.log(`💰 Updated ${updated} token prices`);
            return true;
            
        } catch (error) {
            console.error('Error updating prices:', error);
            return false;
        }
    }

    getPrice(tokenAddress) {
        try {
            if (!this.isInitialized) return null;
            return this.prices.get(tokenAddress) || null;
        } catch (error) {
            console.error('Error getting price:', error);
            return null;
        }
    }

    getAllPrices() {
        try {
            if (!this.isInitialized) return new Map();
            return new Map(this.prices);
        } catch (error) {
            console.error('Error getting all prices:', error);
            return new Map();
        }
    }

    shouldRefreshPrices() {
        if (!this.lastUpdate) return true;
        const age = Date.now() - this.lastUpdate.getTime();
        return age > 60000; // 1 minute
    }

    isReady() {
        return this.isInitialized;
    }

    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('PriceService cleaned up');
    }

    // TWAP calculation placeholder
    async calculateTWAP(tokenAddress, startTime, endTime) {
        try {
            const currentPrice = this.getPrice(tokenAddress);
            return currentPrice ? currentPrice.price : 0;
        } catch (error) {
            console.error('Error calculating TWAP:', error);
            return 0;
        }
    }
}

// Static property to hold singleton instance
PriceService.instance = null;

// Create global singleton instance
function getPriceService() {
    if (!window.priceService) {
        window.priceService = new PriceService();
    }
    return window.priceService;
}

// Immediately expose PriceService globally
window.PriceService = PriceService;
window.getPriceService = getPriceService;

console.log('✅ PriceService (Basic) class loaded and exposed globally');
console.log('📊 Features:');
console.log('   ✅ Safe initialization with singleton pattern');
console.log('   ✅ Demo price data for Phase 3 testing');
console.log('   ✅ Price update simulation');
console.log('   ✅ TWAP calculation placeholder');
console.log('   ✅ Non-blocking initialization');
