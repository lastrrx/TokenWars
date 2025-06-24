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

// Debug log to confirm config is loaded
console.log('Config loaded successfully:', { 
    supabaseUrl: SUPABASE_CONFIG.url,
    hasAnonKey: !!SUPABASE_CONFIG.anonKey 
});
