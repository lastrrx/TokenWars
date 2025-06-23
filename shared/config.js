/**
 * Shared Configuration File
 * Contains all app-wide configuration constants and settings
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
const isProduction = process.env.NODE_ENV === 'production';

// API Configuration
const API_CONFIG = {
    BASE_URL: isDevelopment 
        ? 'http://localhost:3000/api' 
        : 'https://api.tokenbetting.com/api',
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
};

// Solana Configuration
const SOLANA_CONFIG = {
    NETWORK: isDevelopment ? 'devnet' : 'mainnet-beta',
    RPC_ENDPOINTS: {
        devnet: 'https://api.devnet.solana.com',
        testnet: 'https://api.testnet.solana.com',
        'mainnet-beta': [
            'https://api.mainnet-beta.solana.com',
            'https://solana-api.projectserum.com',
            // Add more RPC endpoints for redundancy
        ]
    },
    COMMITMENT: 'confirmed',
    PREFLIGHT_COMMITMENT: 'processed',
    // Program ID will be updated after deployment
    PROGRAM_ID: isDevelopment 
        ? 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'
        : 'YourMainnetProgramIDHere',
};

// Competition Configuration
const COMPETITION_CONFIG = {
    DEFAULT_DURATION_HOURS: 24,
    MIN_DURATION_HOURS: 1,
    MAX_DURATION_HOURS: 168, // 7 days
    BET_AMOUNT_SOL: 0.1,
    BET_AMOUNT_LAMPORTS: 100_000_000, // 0.1 SOL
    PLATFORM_FEE_PERCENTAGE: 15,
    MIN_PARTICIPANTS: 2,
    STATUS: {
        UPCOMING: 'upcoming',
        ACTIVE: 'active',
        CLOSED: 'closed',
        RESOLVED: 'resolved',
        PAUSED: 'paused',
        CANCELLED: 'cancelled'
    },
    // Time before competition start when betting opens
    BETTING_OPEN_MINUTES_BEFORE: 60,
    // Time after competition end before resolution
    RESOLUTION_DELAY_MINUTES: 30,
};

// Token Configuration
const TOKEN_CONFIG = {
    MIN_MARKET_CAP_USD: 5_000_000, // $5M
    MIN_AGE_DAYS: 30,
    MIN_LIQUIDITY_USD: 100_000,
    MIN_HOLDERS: 1000,
    MIN_DAILY_VOLUME_USD: 50_000,
    MARKET_CAP_MATCH_PERCENTAGE: 10, // ±10% for pairing
    BLACKLIST: [
        // Add blacklisted token addresses here
    ],
    // Well-known token addresses
    KNOWN_TOKENS: {
        SOL: 'So11111111111111111111111111111111111111112',
        USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        // Add more as needed
    }
};

// User Configuration
const USER_CONFIG = {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 20,
    USERNAME_REGEX: /^[a-zA-Z0-9_]{3,20}$/,
    SESSION_DURATION_HOURS: 24,
    MAX_BETS_PER_DAY: 50,
    LEADERBOARD_PAGE_SIZE: 100,
};

// WebSocket Configuration
const WEBSOCKET_CONFIG = {
    URL: isDevelopment 
        ? 'ws://localhost:3000' 
        : 'wss://api.tokenbetting.com',
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000,
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    MESSAGE_TYPES: {
        CONNECTION: 'connection',
        COMPETITION_UPDATE: 'competition',
        PRICE_UPDATE: 'price',
        BET_UPDATE: 'bet',
        GLOBAL_UPDATE: 'global',
        ERROR: 'error'
    }
};

// Price Data Configuration
const PRICE_CONFIG = {
    TWAP_WINDOW_MINUTES: 30,
    PRICE_UPDATE_INTERVAL: 300000, // 5 minutes
    PRICE_SOURCES: {
        PRIMARY: 'jupiter',
        SECONDARY: ['coingecko', 'helius'],
    },
    MAX_PRICE_AGE_SECONDS: 300, // 5 minutes
    PRICE_DEVIATION_THRESHOLD: 0.05, // 5% max deviation between sources
};

// UI Configuration
const UI_CONFIG = {
    ANIMATION_DURATION: 300,
    NOTIFICATION_DURATION: 5000,
    REFRESH_INTERVAL: 60000, // 1 minute
    DATE_FORMAT: 'MMM DD, YYYY HH:mm',
    NUMBER_FORMAT: {
        PRICE: {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
        },
        PERCENTAGE: {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
        SOL: {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        }
    },
    CHART_CONFIG: {
        COLORS: {
            PRIMARY: '#9333ea',
            SECONDARY: '#7c3aed',
            SUCCESS: '#10b981',
            DANGER: '#ef4444',
            GRID: '#334155',
        },
        HEIGHT: 300,
        ANIMATION: true,
    }
};

// Admin Configuration
const ADMIN_CONFIG = {
    PIN_LENGTH: 6,
    SESSION_TIMEOUT_MINUTES: 30,
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_MINUTES: 15,
    ROLES: {
        SUPER_ADMIN: 'super_admin',
        ADMIN: 'admin',
        MODERATOR: 'moderator',
        VIEWER: 'viewer'
    },
    PERMISSIONS: {
        COMPETITION_CREATE: 'competitions.create',
        COMPETITION_PAUSE: 'competitions.pause',
        COMPETITION_CANCEL: 'competitions.cancel',
        USER_VIEW: 'users.view',
        USER_BAN: 'users.ban',
        SETTINGS_MODIFY: 'settings.modify',
        EMERGENCY_PAUSE: 'emergency.pause',
    }
};

// Security Configuration
const SECURITY_CONFIG = {
    CSP_HEADER: isDevelopment 
        ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; img-src * data:; connect-src *"
        : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.tokenbetting.com wss://api.tokenbetting.com",
    ALLOWED_ORIGINS: isDevelopment 
        ? ['http://localhost:8080', 'http://localhost:3000']
        : ['https://tokenbetting.com', 'https://www.tokenbetting.com'],
    RATE_LIMITS: {
        API: {
            WINDOW_MS: 15 * 60 * 1000, // 15 minutes
            MAX_REQUESTS: 100,
        },
        AUTH: {
            WINDOW_MS: 15 * 60 * 1000, // 15 minutes
            MAX_ATTEMPTS: 5,
        },
        BETTING: {
            WINDOW_MS: 60 * 1000, // 1 minute
            MAX_BETS: 5,
        }
    }
};

// Error Messages
const ERROR_MESSAGES = {
    NETWORK: {
        TIMEOUT: 'Request timed out. Please try again.',
        OFFLINE: 'No internet connection. Please check your network.',
        SERVER_ERROR: 'Server error. Please try again later.',
        NOT_FOUND: 'Resource not found.',
    },
    WALLET: {
        NOT_CONNECTED: 'Please connect your wallet first.',
        NOT_INSTALLED: 'Please install a Solana wallet (Phantom, Solflare, or Backpack).',
        REJECTED: 'Transaction rejected by user.',
        INSUFFICIENT_BALANCE: 'Insufficient SOL balance.',
    },
    BETTING: {
        ALREADY_BET: 'You have already placed a bet on this competition.',
        COMPETITION_CLOSED: 'This competition is no longer accepting bets.',
        INVALID_AMOUNT: 'Invalid bet amount.',
        INVALID_TOKEN: 'Please select a valid token.',
    },
    AUTH: {
        INVALID_CREDENTIALS: 'Invalid credentials.',
        SESSION_EXPIRED: 'Your session has expired. Please log in again.',
        UNAUTHORIZED: 'You are not authorized to perform this action.',
    },
    VALIDATION: {
        USERNAME_INVALID: 'Username must be 3-20 characters, letters, numbers, and underscores only.',
        USERNAME_TAKEN: 'This username is already taken.',
        INVALID_INPUT: 'Invalid input. Please check and try again.',
    }
};

// Feature Flags
const FEATURE_FLAGS = {
    ENABLE_MULTI_TOKEN: false,
    ENABLE_CONFIDENCE_BETTING: false,
    ENABLE_SOCIAL_FEATURES: false,
    ENABLE_ADVANCED_ANALYTICS: true,
    ENABLE_MOBILE_APP: false,
    ENABLE_GOVERNANCE: false,
    MAINTENANCE_MODE: false,
};

// Export configuration based on environment
const CONFIG = {
    API: API_CONFIG,
    SOLANA: SOLANA_CONFIG,
    COMPETITION: COMPETITION_CONFIG,
    TOKEN: TOKEN_CONFIG,
    USER: USER_CONFIG,
    WEBSOCKET: WEBSOCKET_CONFIG,
    PRICE: PRICE_CONFIG,
    UI: UI_CONFIG,
    ADMIN: ADMIN_CONFIG,
    SECURITY: SECURITY_CONFIG,
    ERRORS: ERROR_MESSAGES,
    FEATURES: FEATURE_FLAGS,
    IS_DEVELOPMENT: isDevelopment,
    IS_PRODUCTION: isProduction,
};

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// TODO: Add configuration for:
// - Analytics tracking
// - Monitoring and alerting
// - Backup and recovery
// - Third-party integrations
// - Localization settings
