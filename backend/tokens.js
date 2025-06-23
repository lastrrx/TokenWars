/**
 * Token Selection and Price Management Module
 * Handles token data fetching, price calculations, and TWAP implementation
 */

const axios = require('axios');
const winston = require('winston');
const database = require('./database');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// API configurations
const APIS = {
    HELIUS: {
        url: 'https://api.helius.xyz/v0',
        key: process.env.HELIUS_API_KEY
    },
    ALCHEMY: {
        url: 'https://solana-mainnet.g.alchemy.com/v2',
        key: process.env.ALCHEMY_API_KEY
    },
    COINGECKO: {
        url: 'https://api.coingecko.com/api/v3',
        key: process.env.COINGECKO_API_KEY
    },
    JUPITER: {
        url: 'https://price.jup.ag/v4',
        key: process.env.JUPITER_API_KEY
    }
};

// Token selection criteria
const SELECTION_CRITERIA = {
    MIN_MARKET_CAP: parseInt(process.env.MIN_MARKET_CAP_USD) || 5000000, // $5M
    MIN_AGE_DAYS: parseInt(process.env.TOKEN_AGE_DAYS) || 30,
    MIN_LIQUIDITY: 100000, // $100k
    MIN_HOLDERS: 1000,
    MIN_DAILY_VOLUME: 50000 // $50k
};

// Token cache to reduce API calls
const tokenCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize token service
 */
async function initialize() {
    logger.info('Initializing token service...');
    
    // Test API connections
    await testAPIConnections();
    
    // Load token list
    await refreshTokenList();
    
    logger.info('Token service initialized');
}

/**
 * Test API connections
 */
async function testAPIConnections() {
    const apis = Object.entries(APIS);
    
    for (const [name, config] of apis) {
        try {
            if (config.key) {
                logger.info(`Testing ${name} API connection...`);
                // Add API-specific test calls here
            }
        } catch (error) {
            logger.error(`${name} API test failed:`, error.message);
        }
    }
}

/**
 * Get current token price from multiple sources
 */
async function getCurrentPrice(tokenAddress) {
    // Check cache first
    const cached = tokenCache.get(tokenAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    
    try {
        // Try multiple price sources
        const prices = await Promise.allSettled([
            getPriceFromJupiter(tokenAddress),
            getPriceFromHelius(tokenAddress),
            getPriceFromCoingecko(tokenAddress)
        ]);
        
        // Filter successful responses
        const validPrices = prices
            .filter(p => p.status === 'fulfilled' && p.value)
            .map(p => p.value);
        
        if (validPrices.length === 0) {
            throw new Error('No price data available');
        }
        
        // Calculate average price
        const avgPrice = validPrices.reduce((sum, p) => sum + p.price, 0) / validPrices.length;
        
        const priceData = {
            price: avgPrice,
            volume: validPrices[0].volume || 0,
            marketCap: validPrices[0].marketCap || 0,
            change24h: validPrices[0].change24h || 0,
            timestamp: new Date()
        };
        
        // Cache the result
        tokenCache.set(tokenAddress, {
            data: priceData,
            timestamp: Date.now()
        });
        
        // Store in database for historical data
        await database.storePriceData(tokenAddress, priceData);
        
        return priceData;
        
    } catch (error) {
        logger.error(`Failed to get price for ${tokenAddress}:`, error);
        throw error;
    }
}

/**
 * Get price from Jupiter
 */
async function getPriceFromJupiter(tokenAddress) {
    try {
        const response = await axios.get(`${APIS.JUPITER.url}/price`, {
            params: { ids: tokenAddress }
        });
        
        const data = response.data.data[tokenAddress];
        if (!data) return null;
        
        return {
            price: data.price,
            volume: data.volume24h,
            marketCap: data.marketCap,
            change24h: data.priceChange24h
        };
        
    } catch (error) {
        logger.error('Jupiter price fetch error:', error.message);
        return null;
    }
}

/**
 * Get price from Helius
 */
async function getPriceFromHelius(tokenAddress) {
    try {
        const response = await axios.post(
            `${APIS.HELIUS.url}/token-metadata`,
            { mintAccounts: [tokenAddress] },
            {
                headers: { 'Authorization': `Bearer ${APIS.HELIUS.key}` }
            }
        );
        
        // Parse Helius response format
        // TODO: Adapt to actual Helius API response
        
        return null; // Placeholder
        
    } catch (error) {
        logger.error('Helius price fetch error:', error.message);
        return null;
    }
}

/**
 * Get price from CoinGecko
 */
async function getPriceFromCoingecko(tokenAddress) {
    try {
        const response = await axios.get(
            `${APIS.COINGECKO.url}/simple/token_price/solana`,
            {
                params: {
                    contract_addresses: tokenAddress,
                    vs_currencies: 'usd',
                    include_market_cap: true,
                    include_24hr_vol: true,
                    include_24hr_change: true
                },
                headers: { 'x-cg-pro-api-key': APIS.COINGECKO.key }
            }
        );
        
        const data = response.data[tokenAddress.toLowerCase()];
        if (!data) return null;
        
        return {
            price: data.usd,
            volume: data.usd_24h_vol,
            marketCap: data.usd_market_cap,
            change24h: data.usd_24h_change
        };
        
    } catch (error) {
        logger.error('CoinGecko price fetch error:', error.message);
        return null;
    }
}

/**
 * Calculate Time-Weighted Average Price (TWAP)
 */
async function calculateTWAP(tokenAddress, startTime, endTime) {
    try {
        // Fetch historical prices from database
        const prices = await database.getPriceHistory(tokenAddress, startTime, endTime);
        
        if (prices.length === 0) {
            throw new Error('No price data available for TWAP calculation');
        }
        
        // Calculate TWAP
        let totalWeightedPrice = 0;
        let totalTime = 0;
        
        for (let i = 0; i < prices.length - 1; i++) {
            const price = prices[i].price;
            const nextTime = new Date(prices[i + 1].timestamp);
            const currentTime = new Date(prices[i].timestamp);
            const timeDiff = (nextTime - currentTime) / 1000; // seconds
            
            totalWeightedPrice += price * timeDiff;
            totalTime += timeDiff;
        }
        
        // Add last price point
        const lastPrice = prices[prices.length - 1];
        const lastTimeDiff = (endTime - new Date(lastPrice.timestamp)) / 1000;
        totalWeightedPrice += lastPrice.price * lastTimeDiff;
        totalTime += lastTimeDiff;
        
        const twap = totalWeightedPrice / totalTime;
        
        return {
            twap,
            startPrice: prices[0].price,
            endPrice: prices[prices.length - 1].price,
            pricePoints: prices.length,
            duration: totalTime
        };
        
    } catch (error) {
        logger.error('TWAP calculation error:', error);
        throw error;
    }
}

/**
 * Select token pairs for competitions
 */
async function selectCompetitionPairs(count = 5) {
    try {
        // Get eligible tokens
        const eligibleTokens = await getEligibleTokens();
        
        // Group tokens by market cap ranges
        const marketCapRanges = groupTokensByMarketCap(eligibleTokens);
        
        const pairs = [];
        
        for (const [range, tokens] of Object.entries(marketCapRanges)) {
            if (tokens.length < 2) continue;
            
            // Randomly select pairs from the same range
            const shuffled = tokens.sort(() => Math.random() - 0.5);
            
            for (let i = 0; i < shuffled.length - 1 && pairs.length < count; i += 2) {
                pairs.push({
                    tokenA: shuffled[i],
                    tokenB: shuffled[i + 1],
                    marketCapRange: range
                });
            }
        }
        
        return pairs.slice(0, count);
        
    } catch (error) {
        logger.error('Token pair selection error:', error);
        throw error;
    }
}

/**
 * Get eligible tokens for competitions
 */
async function getEligibleTokens() {
    try {
        // Fetch token list from Jupiter
        const response = await axios.get(`${APIS.JUPITER.url}/tokens`);
        const allTokens = response.data;
        
        // Filter based on criteria
        const eligibleTokens = [];
        
        for (const token of allTokens) {
            // Skip if no market data
            if (!token.marketCap || !token.volume24h) continue;
            
            // Apply selection criteria
            if (token.marketCap < SELECTION_CRITERIA.MIN_MARKET_CAP) continue;
            if (token.volume24h < SELECTION_CRITERIA.MIN_DAILY_VOLUME) continue;
            
            // TODO: Check token age (would require additional API call)
            // TODO: Check holder count (would require additional API call)
            
            eligibleTokens.push({
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                marketCap: token.marketCap,
                volume: token.volume24h,
                liquidity: token.liquidity || 0
            });
        }
        
        logger.info(`Found ${eligibleTokens.length} eligible tokens`);
        
        return eligibleTokens;
        
    } catch (error) {
        logger.error('Failed to get eligible tokens:', error);
        throw error;
    }
}

/**
 * Group tokens by market cap ranges
 */
function groupTokensByMarketCap(tokens) {
    const ranges = {
        'micro': [], // $5M - $50M
        'small': [], // $50M - $250M
        'mid': [],   // $250M - $1B
        'large': []  // $1B+
    };
    
    tokens.forEach(token => {
        const marketCap = token.marketCap;
        
        if (marketCap < 50000000) {
            ranges.micro.push(token);
        } else if (marketCap < 250000000) {
            ranges.small.push(token);
        } else if (marketCap < 1000000000) {
            ranges.mid.push(token);
        } else {
            ranges.large.push(token);
        }
    });
    
    // Further group by 10% ranges within each category
    const detailedRanges = {};
    
    Object.entries(ranges).forEach(([category, tokens]) => {
        tokens.forEach(token => {
            const rangeKey = `${category}-${Math.floor(token.marketCap / 10000000) * 10}M`;
            
            if (!detailedRanges[rangeKey]) {
                detailedRanges[rangeKey] = [];
            }
            
            detailedRanges[rangeKey].push(token);
        });
    });
    
    return detailedRanges;
}

/**
 * Refresh token list periodically
 */
async function refreshTokenList() {
    try {
        await getEligibleTokens();
        
        // Schedule next refresh
        setTimeout(refreshTokenList, 60 * 60 * 1000); // Every hour
        
    } catch (error) {
        logger.error('Token list refresh error:', error);
        
        // Retry in 5 minutes
        setTimeout(refreshTokenList, 5 * 60 * 1000);
    }
}

/**
 * Get token metadata
 */
async function getTokenMetadata(tokenAddress) {
    try {
        // Try to get metadata from multiple sources
        // This could include token name, symbol, logo, etc.
        
        // TODO: Implement metadata fetching
        
        return {
            address: tokenAddress,
            symbol: 'UNKNOWN',
            name: 'Unknown Token',
            logoUrl: null
        };
        
    } catch (error) {
        logger.error('Failed to get token metadata:', error);
        return null;
    }
}

module.exports = {
    initialize,
    getCurrentPrice,
    calculateTWAP,
    selectCompetitionPairs,
    getEligibleTokens,
    getTokenMetadata
};

// TODO: Implement additional features:
// - Token blacklist management
// - Custom token addition by admins
// - Price anomaly detection
// - Multi-chain token support
// - Historical price caching
// - Websocket price feeds
