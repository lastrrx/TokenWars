// config.js - TokenWars Configuration
// Updated with blockchain smart contract integration

// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://lavbfujrqmxiyfkfgcqy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdmJmdWpycW14aXlma2ZnY3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMTU2ODIsImV4cCI6MjA1MDg5MTY4Mn0.q-w6zI9QNnX0Q_Yj2X0W8rF7wZ8U1V2rH6dZ8pL9mU4'
};

// Application Configuration
const APP_CONFIG = {
    BET_AMOUNT: 0.1, // SOL
    PLATFORM_FEE_PERCENTAGE: 15, // 15%
    COMPETITION_DURATION: {
        VOTING_PHASE: 15, // minutes
        ACTIVE_PHASE: 24, // hours
        SETUP_PHASE: 5   // minutes delay before start
    },
    TOKEN_REQUIREMENTS: {
        MIN_MARKET_CAP: 100000, // $100k USD
        MIN_AGE_HOURS: 24,      // 24 hours old
        MIN_LIQUIDITY: 50000,   // $50k liquidity
        MAX_TOKENS_PER_REQUEST: 50
    },
    DISPLAY: {
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

// 🚀 NEW: Blockchain Smart Contract Configuration
const BLOCKCHAIN_CONFIG = {
    // Solana Program Configuration
    SOLANA_PROGRAM_ID: '95LeMiq1NxxUQiTyJwKVELPK6SbYVwzGxckw3XLneCv4', // TokenWars deployed program
    SOLANA_NETWORK: 'devnet', // devnet for testing, mainnet for production
    SOLANA_RPC_URL: 'https://api.devnet.solana.com',
    
    // Pyth Network Configuration for Price Feeds
    PYTH_NETWORK_CLUSTER: 'devnet',
    PYTH_PROGRAM_ID: 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH', // Pyth Program ID
    
    // Smart Contract Feature Flags
    SMART_CONTRACT_ENABLED: true, // 🔑 Main flag to enable blockchain features
    FALLBACK_TO_DATABASE: true,   // Allow fallback to database if blockchain fails
    
    // Platform Configuration
    PLATFORM_WALLET: 'HmT6Nj3r24YKCxGLPFvf1gSJijXyNcrPHKKeknZYGRXv', // Platform fee collection wallet
    
    // Transaction Settings
    TRANSACTION_TIMEOUT: 30000, // 30 seconds
    CONFIRMATION_COMMITMENT: 'confirmed', // confirmed, finalized
    MAX_TRANSACTION_RETRIES: 3,
    
    // TWAP Configuration (Time-Weighted Average Price)
    TWAP_SETTINGS: {
        SAMPLE_INTERVAL: 300, // 5 minutes between samples
        MIN_SAMPLES: 12,      // Minimum samples for valid TWAP (1 hour)
        MAX_PRICE_DEVIATION: 0.1 // 10% max deviation between samples
    },
    
    // Escrow Configuration
    ESCROW_SETTINGS: {
        MIN_BET_AMOUNT: 0.001, // 0.001 SOL minimum bet
        MAX_BET_AMOUNT: 100,   // 100 SOL maximum bet
        PLATFORM_FEE_BPS: 1500 // 15% platform fee (basis points)
    }
};

// Phase tracking configuration
const PHASE_CONFIG = {
    CURRENT_PHASE: 5, // Updated to Phase 5 - Smart Contract Integration
    PHASES: {
        1: {
            name: 'Navigation & UI Framework',
            features: ['navigation', 'ui_framework', 'wallet_modal_ui', 'responsive_design'],
            description: 'Basic navigation and user interface components',
            status: 'completed'
        },
        2: {
            name: 'Database & Backend Services',
            features: ['database_schema', 'real_token_data', 'price_tracking', 'backend_services'],
            description: 'Database integration and backend service implementation',
            status: 'completed'
        },
        3: {
            name: 'Wallet Connection System',
            features: ['wallet_connection', 'user_profiles', 'authentication', 'session_management'],
            description: 'Complete wallet integration and user management',
            status: 'completed'
        },
        4: {
            name: 'Admin Panel & Deployment',
            features: ['admin_panel', 'token_management', 'system_monitoring', 'admin_controls'],
            description: 'Administrative interface and system management',
            status: 'completed'
        },
        5: {
            name: 'Smart Contract Integration',
            features: ['blockchain_transactions', 'smart_contract_escrow', 'twap_integration', 'trustless_betting'],
            description: 'Complete blockchain integration with smart contracts',
            status: 'in_progress'
        }
    }
};

// 🚀 NEW: Smart Contract Function Availability Check
function isSmartContractEnabled() {
    return BLOCKCHAIN_CONFIG.SMART_CONTRACT_ENABLED && 
           window.smartContractService && 
           window.smartContractService.isAvailable &&
           window.smartContractService.isAvailable();
}

// 🚀 NEW: Get appropriate service based on configuration
function getCompetitionService() {
    if (isSmartContractEnabled()) {
        console.log('🔗 Using smart contract service');
        return 'smart_contract';
    } else {
        console.log('🗄️ Using database service');
        return 'database';
    }
}

// Development and Debug Configuration
const DEBUG_CONFIG = {
    ENABLED: true,
    LOG_LEVELS: ['error', 'warn', 'info', 'debug'],
    MODULES: {
        WALLET: true,
        COMPETITION: true,
        SMART_CONTRACT: true,
        DATABASE: true,
        UI: true
    }
};

// Export all configurations for use in other files
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.COMPETITION_STATUS = COMPETITION_STATUS;
window.TOKEN_VALIDATION = TOKEN_VALIDATION;
window.TOKEN_ERROR_CODES = TOKEN_ERROR_CODES;
window.NAVIGATION_CONFIG = NAVIGATION_CONFIG;
window.WALLET_CONFIG = WALLET_CONFIG;
window.UI_CONFIG = UI_CONFIG;
window.BLOCKCHAIN_CONFIG = BLOCKCHAIN_CONFIG; // 🚀 NEW
window.PHASE_CONFIG = PHASE_CONFIG;
window.DEBUG_CONFIG = DEBUG_CONFIG;

// 🚀 NEW: Helper functions
window.isSmartContractEnabled = isSmartContractEnabled;
window.getCompetitionService = getCompetitionService;

// Log configuration load
console.log('⚙️ TokenWars configuration loaded - Updated with blockchain integration');
console.log('🔗 Smart contract enabled:', BLOCKCHAIN_CONFIG.SMART_CONTRACT_ENABLED);
console.log('📊 Program ID:', BLOCKCHAIN_CONFIG.SOLANA_PROGRAM_ID);
console.log('🌐 Network:', BLOCKCHAIN_CONFIG.SOLANA_NETWORK);
