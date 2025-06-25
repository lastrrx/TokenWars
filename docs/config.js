// Basic Configuration for TokenWars - Phase 1
// Essential configuration for navigation and basic functionality

// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://lavbfujrqmxiyfkfgcqy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdmJmdWpycW14aXlma2ZnY3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjYwNjIsImV4cCI6MjA2NjM0MjA2Mn0.hlDZzchNyhcEX4KW5YNXwcaq3WYDWkc7IeSdflmAYbs'
};

// Basic App Configuration
const APP_CONFIG = {
    // Competition settings
    BET_AMOUNT: 0.1, // SOL
    PLATFORM_FEE: 15, // Percentage
    COMPETITION_DURATION: 24, // Hours
    VOTING_DURATION: 1, // Hours
    
    // Solana configuration
    SOLANA_NETWORK: 'devnet',
    
    // Update intervals
    UPDATE_INTERVALS: {
        TOKEN_LIST_REFRESH: 3600000, // 1 hour
        PRICE_UPDATES: 60000, // 1 minute
        COMPETITION_STATUS: 30000, // 30 seconds
        LEADERBOARD_REFRESH: 300000 // 5 minutes
    },
    
    // Basic token selection (for Phase 1)
    TOKEN_SELECTION: {
        MIN_MARKET_CAP: 5000000, // $5M minimum
        MIN_AGE_DAYS: 30, // 1 month minimum
        MARKET_CAP_TOLERANCE: 0.10, // 10% tolerance for pairing
        BLACKLISTED_TOKENS: []
    },
    
    // Basic cache configuration (for Phase 1)
    CACHE_CONFIG: {
        TOKEN_CACHE_DURATION: 300000, // 5 minutes
        PRICE_CACHE_DURATION: 120000, // 2 minutes
        CACHE_FRESH_THRESHOLD: 180000, // 3 minutes
        ENABLE_STATIC_FALLBACK: true
    },
    
    // Display configuration
    DISPLAY_CONFIG: {
        MAX_TOKENS_PER_CATEGORY: 50,
        COMPETITION_CARDS_PER_PAGE: 12,
        PRICE_DECIMAL_PLACES: 6,
        PERCENTAGE_DECIMAL_PLACES: 2
    }
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

// Token validation rules (basic)
const TOKEN_VALIDATION = {
    REQUIRED_FIELDS: ['symbol', 'name', 'address'],
    MIN_SYMBOL_LENGTH: 2,
    MAX_SYMBOL_LENGTH: 10,
    MIN_NAME_LENGTH: 3,
    MAX_NAME_LENGTH: 50,
    VALID_ADDRESS_LENGTH: 44 // Solana address length
};

// Basic error codes
const TOKEN_ERROR_CODES = {
    INSUFFICIENT_MARKET_CAP: 'INSUFFICIENT_MARKET_CAP',
    TOO_NEW: 'TOO_NEW',
    BLACKLISTED: 'BLACKLISTED',
    INVALID_DATA: 'INVALID_DATA',
    API_ERROR: 'API_ERROR'
};

// Navigation configuration
const NAVIGATION_CONFIG = {
    DEFAULT_SECTION: 'markets',
    SECTIONS: ['markets', 'leaderboard', 'portfolio'],
    REQUIRE_WALLET_CONNECTION: ['portfolio'],
    SECTION_TITLES: {
        markets: 'Active Markets',
        leaderboard: 'Leaderboard',
        portfolio: 'My Portfolio'
    }
};

// Wallet configuration
const WALLET_CONFIG = {
    SUPPORTED_WALLETS: ['phantom', 'solflare', 'backpack', 'demo'],
    DEFAULT_WALLET: 'phantom',
    DEMO_MODE_ENABLED: true,
    AUTO_RECONNECT: true,
    CONNECTION_TIMEOUT: 10000 // 10 seconds
};

// UI Configuration
const UI_CONFIG = {
    THEME: 'dark',
    ANIMATION_DURATION: 300, // ms
    NOTIFICATION_DURATION: 5000, // ms
    MODAL_ANIMATION: true,
    MOBILE_BREAKPOINT: 768, // px
    TABLET_BREAKPOINT: 1024 // px
};

// Export for use in other files
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.COMPETITION_STATUS = COMPETITION_STATUS;
window.TOKEN_VALIDATION = TOKEN_VALIDATION;
window.TOKEN_ERROR_CODES = TOKEN_ERROR_CODES;
window.NAVIGATION_CONFIG = NAVIGATION_CONFIG;
window.WALLET_CONFIG = WALLET_CONFIG;
window.UI_CONFIG = UI_CONFIG;

// Utility function to check if feature is enabled
window.isFeatureEnabled = function(feature) {
    const features = {
        'wallet_connection': false, // Phase 3
        'token_system': false, // Phase 2
        'real_competitions': false, // Phase 2
        'admin_panel': false, // Phase 4
        'smart_contracts': false, // Phase 5
        'navigation': true, // Phase 1 ✅
        'ui_framework': true, // Phase 1 ✅
        'demo_mode': true // Phase 1 ✅
    };
    
    return features[feature] || false;
};

// Configuration validation
window.validateConfig = function() {
    const required = ['SUPABASE_CONFIG', 'APP_CONFIG', 'NAVIGATION_CONFIG'];
    const missing = required.filter(config => !window[config]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required configuration:', missing);
        return false;
    }
    
    console.log('✅ Configuration validation passed');
    return true;
};

// Debug helper
window.getConfigSummary = function() {
    return {
        supabase: {
            url: SUPABASE_CONFIG.url,
            hasKey: !!SUPABASE_CONFIG.anonKey
        },
        features: {
            navigation: window.isFeatureEnabled('navigation'),
            ui_framework: window.isFeatureEnabled('ui_framework'),
            demo_mode: window.isFeatureEnabled('demo_mode')
        },
        wallet: {
            supported: WALLET_CONFIG.SUPPORTED_WALLETS.length,
            demoEnabled: WALLET_CONFIG.DEMO_MODE_ENABLED
        },
        navigation: {
            sections: NAVIGATION_CONFIG.SECTIONS.length,
            default: NAVIGATION_CONFIG.DEFAULT_SECTION
        }
    };
};

console.log('⚙️ Basic config.js loaded - Phase 1 configuration ready');
console.log('📋 Config summary:', window.getConfigSummary());
