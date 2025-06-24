// TokenService - Simplified Version That Works Without Edge Functions
// This version provides basic functionality while Edge Functions are being set up

class TokenService {
    constructor() {
        this.tokens = [];
        this.tokenPairs = [];
        this.lastUpdate = null;
        this.isInitialized = false;
        
        console.log('TokenService constructor called');
    }

    async initialize() {
        try {
            console.log('Initializing TokenService...');
            
            // For now, create some demo tokens to prevent errors
            this.tokens = this.createDemoTokens();
            this.tokenPairs = this.generateDemoTokenPairs();
            this.lastUpdate = new Date();
            this.isInitialized = true;
            
            console.log('TokenService initialized with demo data');
            return true;
        } catch (error) {
            console.error('TokenService initialization failed:', error);
            throw error;
        }
    }

    // Create demo tokens for testing
    createDemoTokens() {
        return [
            {
                address: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL',
                name: 'Wrapped SOL',
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
                market_cap: 45000000000,
                price: 180.50,
                age_days: 1500,
                liquidity_score: 0.95,
                is_active: true
            },
            {
                address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                symbol: 'USDC',
                name: 'USD Coin',
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
                market_cap: 42000000000,
                price: 1.00,
                age_days: 1200,
                liquidity_score: 0.98,
                is_active: true
            },
            {
                address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
                symbol: 'MSOL',
                name: 'Marinade Staked SOL',
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
                market_cap: 1200000000,
                price: 195.30,
                age_days: 800,
                liquidity_score: 0.85,
                is_active: true
            },
            {
                address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                symbol: 'JUP',
                name: 'Jupiter',
                logoURI: 'https://static.jup.ag/jup/icon.png',
                market_cap: 1500000000,
                price: 1.15,
                age_days: 120,
                liquidity_score: 0.82,
                is_active: true
            },
            {
                address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                symbol: 'BONK',
                name: 'Bonk',
                logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
                market_cap: 900000000,
                price: 0.000023,
                age_days: 400,
                liquidity_score: 0.75,
                is_active: true
            },
            {
                address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
                symbol: 'RENDER',
                name: 'Render Token',
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof/logo.png',
                market_cap: 850000000,
                price: 7.85,
                age_days: 600,
                liquidity_score: 0.78,
                is_active: true
            }
        ];
    }

    // Generate demo token pairs
    generateDemoTokenPairs() {
        const pairs = [];
        const tokens = this.tokens;
        
        // Create some compatible pairs
        if (tokens.length >= 2) {
            pairs.push({
                id: 1,
                token_a_address: tokens[2].address, // MSOL
                token_b_address: tokens[3].address, // JUP
                token_a: tokens[2],
                token_b: tokens[3],
                compatibility_score: 0.85,
                market_cap_ratio: tokens[2].market_cap / tokens[3].market_cap,
                is_active: true,
                created_at: new Date().toISOString()
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
                created_at: new Date().toISOString()
            });
        }
        
        return pairs;
    }

    // Get valid tokens
    async getValidTokens() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            return this.tokens.filter(token => token.is_active);
        } catch (error) {
            console.error('Error getting valid tokens:', error);
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

    // Generate token pairs (simplified version)
    async generateTokenPairs(tokens = null) {
        try {
            if (!tokens) {
                tokens = await this.getValidTokens();
            }
            
            // Return existing demo pairs for now
            return this.tokenPairs;
        } catch (error) {
            console.error('Error generating token pairs:', error);
            return [];
        }
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

    // Update token list (simplified - returns demo data)
    async updateTokenList() {
        try {
            console.log('Updating token list (demo mode)...');
            
            // In demo mode, just return the existing tokens
            this.lastUpdate = new Date();
            
            return this.tokens;
        } catch (error) {
            console.error('Error updating token list:', error);
            throw error;
        }
    }

    // Validate token for competitions
    validateToken(token) {
        if (!token) return false;
        
        // Basic validation
        if (!token.address || !token.symbol || !token.name) return false;
        if (!token.market_cap || token.market_cap < 5000000) return false; // Min $5M
        if (!token.age_days || token.age_days < 30) return false; // Min 30 days
        
        return true;
    }

    // Check if token is blacklisted
    isTokenBlacklisted(address) {
        const blacklist = window.APP_CONFIG?.TOKEN_SELECTION?.BLACKLISTED_TOKENS || [];
        return blacklist.includes(address);
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

    // Get last update time
    getLastUpdateTime() {
        return this.lastUpdate;
    }

    // Check if initialization is complete
    isReady() {
        return this.isInitialized;
    }
}

// Immediately expose TokenService globally
window.TokenService = TokenService;

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    if (!window.tokenService) {
        console.log('Auto-initializing TokenService...');
        window.tokenService = new TokenService();
    }
});

console.log('TokenService class loaded and exposed globally');
