// Supabase Configuration
// For production, these will be set via GitHub Pages environment variables
// or you can embed them directly (URL and anon key are safe to expose)

const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL || 'https://lavbfujrqmxiyfkfgcqy.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdmJmdWpycW14aXlma2ZnY3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjYwNjIsImV4cCI6MjA2NjM0MjA2Mn0.hlDZzchNyhcEX4KW5YNXwcaq3WYDWkc7IeSdflmAYbs'
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
    
    // API endpoints for price data
    PRICE_APIS: {
        HELIUS: 'https://api.helius.xyz',
        COINGECKO: 'https://api.coingecko.com/api/v3',
        JUPITER: 'https://price.jup.ag/v4'
    }
};

// Export for use in other files
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
