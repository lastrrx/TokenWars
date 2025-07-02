// TokenWars Configuration - Phase 1 Basic Setup
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
    
    // Update intervals (Phase 1: Basic settings)
    UPDATE_INTERVALS: {
        TOKEN_LIST_REFRESH: 3600000, // 1 hour
        PRICE_UPDATES: 60000, // 1 minute
        COMPETITION_STATUS: 30000, // 30 seconds
        LEADERBOARD_REFRESH: 300000 // 5 minutes
    },
    
    // Basic token selection (Phase 1: Placeholder values)
    TOKEN_SELECTION: {
        MIN_MARKET_CAP: 5000000, // $5M minimum
        MIN_AGE_DAYS: 30, // 1 month minimum
        MARKET_CAP_TOLERANCE: 0.10, // 10% tolerance for pairing
        BLACKLISTED_TOKENS: []
    },
    
    // Basic cache configuration (Phase 1: Basic settings)
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

// Add smart contract configuration

const BLOCKCHAIN_CONFIG = {
    SOLANA_PROGRAM_ID: 'Dqusfo21uM5XX6rEpSVRXuLikyf1drkisqGUDDFo2qj5',
    SOLANA_NETWORK: 'devnet',
    JUPITER_API_URL: 'https://lite-api.jup.ag/tokens/v2',
    SMART_CONTRACT_ENABLED: true,
    TWAP_SAMPLING_INTERVAL: 5000, // 5 seconds
    TWAP_WINDOW_DURATION: 300000, // 5 minutes
    FALLBACK_TO_DATABASE: true,
    PLATFORM_WALLET: 'HmT6Nj3r24YKCxGLPvf1gSJijXyNcrPHKKeknZYGRXv'
    RPC_URL: 'https://api.devnet.solana.com'  // ← ADD THIS LINE
};

// Phase tracking configuration
const PHASE_CONFIG = {
    CURRENT_PHASE: 1,
    PHASES: {
        1: {
            name: 'Navigation & UI Framework',
            features: ['navigation', 'ui_framework', 'wallet_modal_ui', 'responsive_design'],
            description: 'Basic navigation and user interface components'
        },
        2: {
            name: 'Database & Backend Services',
            features: ['database_schema', 'real_token_data', 'price_tracking', 'backend_services'],
            description: 'Database integration and backend service implementation'
        },
        3: {
            name: 'Wallet Connection System',
            features: ['wallet_connection', 'user_profiles', 'authentication', 'session_management'],
            description: 'Complete wallet integration and user management'
        },
        4: {
            name: 'Admin Panel & Deployment',
            features: ['admin_panel', 'token_management', 'system_monitoring', 'admin_controls'],
            description: 'Administrative interface and system management'
        },
        5: {
            name: 'System Integration & Testing',
            features: ['end_to_end_testing', 'performance_optimization', 'production_deployment'],
            description: 'Final integration, testing, and production readiness'
        }
    }
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
window.PHASE_CONFIG = PHASE_CONFIG;
window.BLOCKCHAIN_CONFIG = BLOCKCHAIN_CONFIG;

// Phase 1: Feature availability checker
window.isFeatureEnabled = function(feature) {
    const phase1Features = {
        // Phase 1 ✅ Available
        'navigation': true,
        'ui_framework': true,
        'wallet_modal_ui': true,
        'responsive_design': true,
        'demo_mode': true,
        'basic_sections': true,
        
        // Phase 2+ 🚧 Coming Soon
        'wallet_connection': false,
        'token_system': false,
        'real_competitions': false,
        'database_integration': false,
        'price_tracking': false,
        'backend_services': false,
        
        // Phase 3+ 🚧 Future
        'admin_panel': false,
        'smart_contracts': false,
        'production_features': false
    };
    
    return phase1Features[feature] || false;
};

// Configuration validation
window.validateConfig = function() {
    const required = ['SUPABASE_CONFIG', 'APP_CONFIG', 'NAVIGATION_CONFIG', 'PHASE_CONFIG'];
    const missing = required.filter(config => !window[config]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required configuration:', missing);
        return false;
    }
    
    console.log('✅ Configuration validation passed');
    return true;
};

// Phase status checker
window.getPhaseStatus = function() {
    const currentPhase = PHASE_CONFIG.CURRENT_PHASE;
    const phaseInfo = PHASE_CONFIG.PHASES[currentPhase];
    
    return {
        current: currentPhase,
        name: phaseInfo.name,
        description: phaseInfo.description,
        features: phaseInfo.features,
        nextPhase: currentPhase < 5 ? currentPhase + 1 : null
    };
};

// Debug helper
window.getConfigSummary = function() {
    const phaseStatus = window.getPhaseStatus();
    
    return {
        phase: {
            current: phaseStatus.current,
            name: phaseStatus.name,
            features: phaseStatus.features.length
        },
        supabase: {
            url: SUPABASE_CONFIG.url,
            hasKey: !!SUPABASE_CONFIG.anonKey
        },
        features: {
            navigation: window.isFeatureEnabled('navigation'),
            ui_framework: window.isFeatureEnabled('ui_framework'),
            demo_mode: window.isFeatureEnabled('demo_mode'),
            wallet_connection: window.isFeatureEnabled('wallet_connection')
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

console.log('⚙️ TokenWars configuration loaded - Phase 1 setup complete');
console.log('📊 Current Phase:', window.getPhaseStatus().current, '-', window.getPhaseStatus().name);
console.log('🎯 Available Features:', Object.keys(window.getConfigSummary().features).filter(f => window.isFeatureEnabled(f)));
console.log('📋 Config summary:', window.getConfigSummary());
