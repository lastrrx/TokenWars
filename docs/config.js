// Supabase Configuration for GitHub Pages
// Since GitHub Pages is static hosting, we use direct values instead of environment variables
// These values are safe to expose publicly (URL and anon key are meant to be public)

const SUPABASE_CONFIG = {
    url: 'https://lavbfujrqmxiyfkfgcqy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdmJmdWpycW14aXlma2ZnY3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjYwNjIsImV4cCI6MjA2NjM0MjA2Mn0.hlDZzchNyhcEX4KW5YNXwcaq3WYDWkc7IeSdflmAYbs'
};

// App Configuration
const APP_CONFIG = {
    // Competition settings
    BET_AMOUNT: 0.1, // SOL
    PLATFORM_FEE: 15, // Percentage
    COMPETITION_DURATION: 24, // Hours
    VOTING_DURATION: 1, // Hours
    
    // Solana configuration
    SOLANA_NETWORK: 'devnet', // or 'mainnet-beta'
    
    // Token Selection Algorithm Parameters
    TOKEN_SELECTION: {
        MIN_MARKET_CAP: 5000000, // $5M minimum
        MIN_AGE_DAYS: 30, // 1 month minimum
        MARKET_CAP_TOLERANCE: 0.10, // 10% tolerance for pairing
        MAX_MARKET_CAP_DEVIATION: 0.15, // 15% max deviation for fair pairing
        BLACKLISTED_TOKENS: [
            // Add problematic token addresses here
        ],
        PREFERRED_CATEGORIES: [
            'solana-ecosystem',
            'defi',
            'gaming'
        ]
    },
    
    // Price and TWAP Configuration
    PRICE_CONFIG: {
        TWAP_WINDOW_MINUTES: 10, // 10 minutes before/after events
        PRICE_UPDATE_INTERVAL: 60000, // 1 minute in milliseconds
        PRICE_CACHE_DURATION: 300000, // 5 minutes cache
        MIN_LIQUIDITY_USD: 100000, // $100k minimum liquidity
        OUTLIER_THRESHOLD: 0.20 // 20% price change threshold for outlier detection
    },
    
    // Enhanced Cache Configuration
    CACHE_CONFIG: {
        // Token cache settings
        TOKEN_CACHE_DURATION: 300000, // 5 minutes for token metadata
        TOKEN_CACHE_CLEANUP_INTERVAL: 3600000, // 1 hour cleanup cycle
        
        // Price cache settings  
        PRICE_CACHE_DURATION: 120000, // 2 minutes for price data
        PRICE_CACHE_MAX_AGE: 86400000, // 24 hours max retention
        
        // Cache freshness thresholds
        CACHE_FRESH_THRESHOLD: 180000, // 3 minutes = fresh
        CACHE_STALE_THRESHOLD: 600000, // 10 minutes = stale
        CACHE_EXPIRED_THRESHOLD: 1800000, // 30 minutes = expired
        
        // Background update intervals
        BACKGROUND_UPDATE_INTERVAL: 900000, // 15 minutes between background jobs
        PRIORITY_TOKEN_UPDATE_INTERVAL: 300000, // 5 minutes for active competition tokens
        
        // Cache health monitoring
        HEALTH_CHECK_INTERVAL: 60000, // 1 minute health checks
        ANALYTICS_AGGREGATION_INTERVAL: 3600000, // 1 hour analytics
        
        // Performance targets
        TARGET_CACHE_HIT_RATE: 0.95, // 95% cache hit rate target
        TARGET_API_RESPONSE_TIME: 500, // 500ms max API response time
        MAX_CONCURRENT_API_CALLS: 5, // Limit concurrent external calls
        
        // Fallback settings
        ENABLE_STATIC_FALLBACK: true, // Use static data if cache fails
        ENABLE_DATABASE_FALLBACK: true, // Use main tokens table if cache empty
        FALLBACK_TIMEOUT: 5000 // 5 seconds timeout for fallbacks
    },
    
    // API Rate Limiting Configuration
    API_RATE_LIMITS: {
        COINGECKO: {
            requests_per_hour: 30, // Conservative free tier limit
            requests_per_minute: 1, // Smooth out requests
            circuit_breaker_threshold: 10, // Failed requests before circuit break
            circuit_breaker_timeout: 300000 // 5 minutes circuit breaker
        },
        JUPITER: {
            requests_per_hour: 100,
            requests_per_minute: 2,
            circuit_breaker_threshold: 15,
            circuit_breaker_timeout: 180000 // 3 minutes
        },
        DEXSCREENER: {
            requests_per_hour: 50,
            requests_per_minute: 1,
            circuit_breaker_threshold: 8,
            circuit_breaker_timeout: 300000
        },
        HELIUS: {
            requests_per_hour: 80,
            requests_per_minute: 2,
            circuit_breaker_threshold: 12,
            circuit_breaker_timeout: 240000 // 4 minutes
        }
    },
    
    // API endpoints - Enhanced with cache-aware endpoints
    API_ENDPOINTS: {
        JUPITER_PRICE: 'https://price.jup.ag/v4/price',
        JUPITER_TOKENS: 'https://token.jup.ag/all',
        COINGECKO_PROXY: '/functions/v1/fetch-tokens', // Cache-first edge function
        COINGECKO_PRICES_PROXY: '/functions/v1/fetch-prices', // Cache-first edge function
        
        // Background update endpoints
        UPDATE_TOKEN_CACHE: '/functions/v1/update-token-cache',
        UPDATE_PRICE_CACHE: '/functions/v1/update-price-cache',
        
        // Cache management endpoints
        CACHE_HEALTH: '/functions/v1/cache-health',
        CACHE_CLEANUP: '/functions/v1/cache-cleanup',
        
        // External APIs (used by background jobs only)
        DEX_SCREENER: 'https://api.dexscreener.com/latest/dex',
        HELIUS_RPC: 'https://api.helius.xyz/v0'
    },
    
    // Update intervals
    UPDATE_INTERVALS: {
        TOKEN_LIST_REFRESH: 3600000, // 1 hour
        PRICE_UPDATES: 60000, // 1 minute
        COMPETITION_STATUS: 30000, // 30 seconds
        LEADERBOARD_REFRESH: 300000 // 5 minutes
    },
    
    // Display configuration
    DISPLAY_CONFIG: {
        MAX_TOKENS_PER_CATEGORY: 50,
        COMPETITION_CARDS_PER_PAGE: 12,
        PRICE_DECIMAL_PLACES: 6,
        PERCENTAGE_DECIMAL_PLACES: 2
    }
};

// Token Categories for better organization
const TOKEN_CATEGORIES = {
    LARGE_CAP: { min: 1000000000, max: Infinity, label: 'Large Cap ($1B+)' },
    MID_CAP: { min: 250000000, max: 1000000000, label: 'Mid Cap ($250M-$1B)' },
    SMALL_CAP: { min: 50000000, max: 250000000, label: 'Small Cap ($50M-$250M)' },
    MICRO_CAP: { min: 5000000, max: 50000000, label: 'Micro Cap ($5M-$50M)' }
};

// Competition Status Definitions
const COMPETITION_STATUS = {
    SETUP: 'SETUP',
    VOTING: 'VOTING', 
    ACTIVE: 'ACTIVE',
    CLOSED: 'CLOSED',
    RESOLVED: 'RESOLVED',
    PAUSED: 'PAUSED',
    CANCELLED: 'CANCELLED'
};

// Price Sources Priority (fallback order)
const PRICE_SOURCES = [
    { name: 'Jupiter', weight: 0.4, endpoint: 'jupiter' },
    { name: 'CoinGecko', weight: 0.3, endpoint: 'coingecko' },
    { name: 'DexScreener', weight: 0.2, endpoint: 'dexscreener' },
    { name: 'Helius', weight: 0.1, endpoint: 'helius' }
];

// Token validation rules
const TOKEN_VALIDATION = {
    REQUIRED_FIELDS: ['symbol', 'name', 'address', 'logoURI'],
    MIN_SYMBOL_LENGTH: 2,
    MAX_SYMBOL_LENGTH: 10,
    MIN_NAME_LENGTH: 3,
    MAX_NAME_LENGTH: 50,
    VALID_ADDRESS_LENGTH: 44 // Solana address length
};

// Error codes for token selection
const TOKEN_ERROR_CODES = {
    INSUFFICIENT_MARKET_CAP: 'INSUFFICIENT_MARKET_CAP',
    TOO_NEW: 'TOO_NEW',
    BLACKLISTED: 'BLACKLISTED',
    INSUFFICIENT_LIQUIDITY: 'INSUFFICIENT_LIQUIDITY',
    INVALID_DATA: 'INVALID_DATA',
    API_ERROR: 'API_ERROR',
    NO_PAIR_FOUND: 'NO_PAIR_FOUND'
};

// Cache-specific error codes
const CACHE_ERROR_CODES = {
    CACHE_MISS: 'CACHE_MISS',
    CACHE_EXPIRED: 'CACHE_EXPIRED',
    CACHE_STALE: 'CACHE_STALE',
    CACHE_UPDATE_FAILED: 'CACHE_UPDATE_FAILED',
    API_RATE_LIMITED: 'API_RATE_LIMITED',
    CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
    BACKGROUND_JOB_FAILED: 'BACKGROUND_JOB_FAILED',
    CACHE_CORRUPTION: 'CACHE_CORRUPTION'
};

// Cache management utilities
const CACHE_UTILS = {
    // Cache status checks
    isCacheFresh: (cacheTimestamp, maxAge = APP_CONFIG.CACHE_CONFIG.CACHE_FRESH_THRESHOLD) => {
        return (Date.now() - new Date(cacheTimestamp).getTime()) < maxAge;
    },
    
    // Cache key generators
    generateTokenCacheKey: (address) => `token:${address}`,
    generatePriceCacheKey: (address, timestamp) => `price:${address}:${timestamp}`,
    
    // Cache health scoring
    calculateHealthScore: (fresh, total) => {
        if (total === 0) return 0;
        return Math.round((fresh / total) * 100) / 100;
    },
    
    // Rate limit checking
    isRateLimited: (apiSource, currentCount, limit) => {
        return currentCount >= limit;
    },
    
    // Performance metrics
    calculateCacheHitRate: (hits, total) => {
        if (total === 0) return 0;
        return Math.round((hits / total) * 10000) / 100; // Two decimal places
    }
};

// Export for use in other files
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.TOKEN_CATEGORIES = TOKEN_CATEGORIES;
window.COMPETITION_STATUS = COMPETITION_STATUS;
window.PRICE_SOURCES = PRICE_SOURCES;
window.TOKEN_VALIDATION = TOKEN_VALIDATION;
window.TOKEN_ERROR_CODES = TOKEN_ERROR_CODES;
window.CACHE_ERROR_CODES = CACHE_ERROR_CODES;
window.CACHE_UTILS = CACHE_UTILS;
