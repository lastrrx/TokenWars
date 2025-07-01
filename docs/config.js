// TokenWars Configuration - Fixed Version with No Duplicates
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

// UI Configuration
const UI_CONFIG = {
    THEME: 'dark',
    ANIMATION_DURATION: 300, // ms
    NOTIFICATION_DURATION: 5000, // ms
    MODAL_ANIMATION: true,
    MOBILE_BREAKPOINT: 768, // px
    TABLET_BREAKPOINT: 1024 // px
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

// ==============================================
// BLOCKCHAIN CONFIGURATION (SINGLE DEFINITION)
// ==============================================

const BLOCKCHAIN_CONFIG = {
    // Solana Program Configuration
    SOLANA_PROGRAM_ID: '95LeMiq1NxxUQiTyJwKVELPK6SbYVwzGxckw3XLneCv4',
    SOLANA_NETWORK: 'devnet', // 'mainnet-beta' for production
    SOLANA_RPC_URL: 'https://api.devnet.solana.com',
    
    // Smart Contract Features
    SMART_CONTRACT_ENABLED: true,
    SMART_CONTRACT_COMPETITIONS: true,
    SMART_CONTRACT_ESCROW: true,
    FALLBACK_TO_DATABASE: true,
    
    // Pyth Network Configuration
    PYTH_NETWORK_CLUSTER: 'devnet',
    PYTH_PRICE_FEEDS: {
        // Common Solana tokens with Pyth price feed IDs
        'So11111111111111111111111111111111111111112': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d', // SOL
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e6f94a', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221'  // USDT
    },
    
    // Transaction Configuration
    TRANSACTION_CONFIG: {
        CONFIRMATION_TIMEOUT: 30000, // 30 seconds
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000, // 1 second
        GAS_BUFFER: 1.2 // 20% gas buffer
    },
    
    // Competition Smart Contract Settings
    COMPETITION_CONFIG: {
        MIN_BET_AMOUNT: 0.1, // SOL
        MAX_BET_AMOUNT: 10.0, // SOL
        PLATFORM_FEE_PERCENTAGE: 15,
        TWAP_UPDATE_INTERVAL: 300000, // 5 minutes in milliseconds
        MIN_COMPETITION_DURATION: 3600000, // 1 hour
        MAX_COMPETITION_DURATION: 172800000 // 48 hours
    },
    
    // Wallet Integration (SINGLE DEFINITION)
    WALLET_CONFIG: {
        SUPPORTED_WALLETS: ['phantom', 'solflare', 'backpack', 'demo'],
        DEFAULT_WALLET: 'phantom',
        DEMO_MODE_ENABLED: true,
        AUTO_CONNECT: false,
        AUTO_RECONNECT: true,
        PERSIST_CONNECTION: true,
        CONNECTION_TIMEOUT: 10000, // 10 seconds
        REQUIRED_PERMISSIONS: ['signTransaction', 'signAllTransactions']
    },
    
    // Development Settings
    DEVELOPMENT: {
        ENABLE_CONSOLE_LOGS: true,
        MOCK_TRANSACTIONS: false, // Set to true for testing without real SOL
        BYPASS_WALLET_CHECKS: false,
        TEST_MODE: false
    }
};

// ==============================================
// SERVICE AVAILABILITY CONFIGURATION
// ==============================================

const SERVICE_CONFIG = {
    // Service availability flags
    SERVICES: {
        SMART_CONTRACT_SERVICE: true,
        WALLET_SERVICE: true,
        PRICE_SERVICE: false, // Set to false since not required
        TOKEN_SERVICE: false, // Set to false since not required
        COMPETITION_MANAGER: false // Set to false since removed
    },
    
    // Service initialization timeouts
    TIMEOUTS: {
        SMART_CONTRACT_INIT: 10000, // 10 seconds
        WALLET_CONNECT: 15000, // 15 seconds
        SERVICE_DISCOVERY: 5000 // 5 seconds
    },
    
    // Fallback behavior
    FALLBACKS: {
        USE_DATABASE_ONLY: true, // Fallback to database if smart contract fails
        GRACEFUL_DEGRADATION: true,
        SHOW_SERVICE_STATUS: true,
        SKIP_MISSING_SERVICES: true // Skip services that don't exist
    }
};

// ==============================================
// EXPORTS & GLOBAL ASSIGNMENT
// ==============================================

// Export for use in other files
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.COMPETITION_STATUS = COMPETITION_STATUS;
window.TOKEN_VALIDATION = TOKEN_VALIDATION;
window.TOKEN_ERROR_CODES = TOKEN_ERROR_CODES;
window.NAVIGATION_CONFIG = NAVIGATION_CONFIG;
window.UI_CONFIG = UI_CONFIG;
window.PHASE_CONFIG = PHASE_CONFIG;

// Export blockchain configurations
window.BLOCKCHAIN_CONFIG = BLOCKCHAIN_CONFIG;
window.SERVICE_CONFIG = SERVICE_CONFIG;

// Use wallet config from blockchain config to avoid conflicts
window.WALLET_CONFIG = BLOCKCHAIN_CONFIG.WALLET_CONFIG;

// Blockchain feature checker
window.isBlockchainFeatureEnabled = function(feature) {
    const blockchainFeatures = {
        'smart_contracts': BLOCKCHAIN_CONFIG.SMART_CONTRACT_ENABLED,
        'smart_contract_competitions': BLOCKCHAIN_CONFIG.SMART_CONTRACT_COMPETITIONS,
        'smart_contract_escrow': BLOCKCHAIN_CONFIG.SMART_CONTRACT_ESCROW,
        'pyth_integration': !!BLOCKCHAIN_CONFIG.PYTH_NETWORK_CLUSTER,
        'transaction_signing': BLOCKCHAIN_CONFIG.WALLET_CONFIG.REQUIRED_PERMISSIONS.length > 0,
        'sol_transfers': BLOCKCHAIN_CONFIG.SMART_CONTRACT_ENABLED && !BLOCKCHAIN_CONFIG.DEVELOPMENT.MOCK_TRANSACTIONS,
        'fallback_to_database': BLOCKCHAIN_CONFIG.FALLBACK_TO_DATABASE
    };
    
    return blockchainFeatures[feature] || false;
};

// Smart contract availability checker
window.isSmartContractAvailable = function() {
    try {
        // Check if smart contract service exists and is enabled
        const serviceExists = !!(window.smartContractService || window.getSmartContractService);
        const configEnabled = BLOCKCHAIN_CONFIG.SMART_CONTRACT_ENABLED;
        const serviceEnabled = SERVICE_CONFIG.SERVICES.SMART_CONTRACT_SERVICE;
        
        return serviceExists && configEnabled && serviceEnabled;
    } catch (error) {
        console.warn('Error checking smart contract availability:', error);
        return false;
    }
};

// Service availability checker
window.isServiceAvailable = function(serviceName) {
    const serviceKey = serviceName.toUpperCase() + '_SERVICE';
    return SERVICE_CONFIG.SERVICES[serviceKey] || false;
};

// Configuration summary for debugging
window.getBlockchainConfigSummary = function() {
    return {
        programId: BLOCKCHAIN_CONFIG.SOLANA_PROGRAM_ID,
        network: BLOCKCHAIN_CONFIG.SOLANA_NETWORK,
        smartContractsEnabled: BLOCKCHAIN_CONFIG.SMART_CONTRACT_ENABLED,
        fallbackToDatabase: BLOCKCHAIN_CONFIG.FALLBACK_TO_DATABASE,
        pythFeeds: Object.keys(BLOCKCHAIN_CONFIG.PYTH_PRICE_FEEDS).length,
        servicesAvailable: Object.entries(SERVICE_CONFIG.SERVICES)
            .filter(([key, value]) => value)
            .map(([key]) => key),
        walletSupport: BLOCKCHAIN_CONFIG.WALLET_CONFIG.SUPPORTED_WALLETS,
        development: BLOCKCHAIN_CONFIG.DEVELOPMENT
    };
};

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
    const required = ['SUPABASE_CONFIG', 'APP_CONFIG', 'NAVIGATION_CONFIG', 'PHASE_CONFIG', 'BLOCKCHAIN_CONFIG'];
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
            supported: BLOCKCHAIN_CONFIG.WALLET_CONFIG.SUPPORTED_WALLETS.length,
            demoEnabled: BLOCKCHAIN_CONFIG.WALLET_CONFIG.DEMO_MODE_ENABLED
        },
        navigation: {
            sections: NAVIGATION_CONFIG.SECTIONS.length,
            default: NAVIGATION_CONFIG.DEFAULT_SECTION
        },
        blockchain: window.getBlockchainConfigSummary()
    };
};

// Initialize and log configuration
console.log('⚙️ TokenWars configuration loaded - Fixed version with no duplicates');
console.log('📊 Current Phase:', window.getPhaseStatus().current, '-', window.getPhaseStatus().name);
console.log('🎯 Available Features:', Object.keys(window.getConfigSummary().features).filter(f => window.isFeatureEnabled(f)));
console.log('🔗 Blockchain Config:', window.getBlockchainConfigSummary());
console.log('📋 Full Config Summary:', window.getConfigSummary());
