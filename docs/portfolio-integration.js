// Portfolio Integration Code - Add to your app.js or create as portfolio-integration.js

// ==============================================
// PORTFOLIO PAGE INTEGRATION
// ==============================================

/**
 * Initialize Portfolio Page when navigated to
 */
function initializePortfolioPage() {
    console.log('📊 Initializing portfolio page...');
    
    // Initialize portfolio system
    if (window.initializePortfolio && typeof window.initializePortfolio === 'function') {
        window.initializePortfolio();
    } else {
        console.error('Portfolio initialization function not found');
    }
}

/**
 * Handle Wallet Connection Changes for Portfolio
 */
function handlePortfolioWalletChange(isConnected, walletAddress) {
    console.log('👛 Portfolio wallet connection changed:', isConnected);
    
    if (isConnected && window.location.hash === '#portfolio') {
        // Refresh portfolio data when wallet connects
        if (window.refreshPortfolioData && typeof window.refreshPortfolioData === 'function') {
            window.refreshPortfolioData();
        }
    }
}

/**
 * Update the loadPageContent function in app.js
 */
function enhanceLoadPageContent() {
    const originalLoadPageContent = window.loadPageContent;
    
    window.loadPageContent = function(pageName) {
        // Call original function if it exists
        if (originalLoadPageContent && typeof originalLoadPageContent === 'function') {
            originalLoadPageContent(pageName);
        }
        
        // Add portfolio-specific initialization
        if (pageName === 'portfolio') {
            setTimeout(() => {
                initializePortfolioPage();
            }, 100);
        }
    };
}

/**
 * Update the showPage function to handle portfolio
 */
function enhanceShowPage() {
    const originalShowPage = window.showPage;
    
    window.showPage = function(pageName, updateHash = true) {
        console.log(`📄 Enhanced navigation to: ${pageName}`);
        
        // Call original showPage
        if (originalShowPage && typeof originalShowPage === 'function') {
            originalShowPage(pageName, updateHash);
        }
        
        // Handle portfolio page
        if (pageName === 'portfolio') {
            setTimeout(() => {
                initializePortfolioPage();
            }, 200);
        }
    };
}

/**
 * Add Portfolio Stats to Home Page (Optional)
 */
async function loadPortfolioSummaryForHome() {
    try {
        const walletService = window.getWalletService?.();
        if (!walletService?.isConnected()) {
            return;
        }
        
        const supabaseClient = window.supabaseClient;
        if (!supabaseClient?.getSupabaseClient) {
            return;
        }
        
        const walletAddress = walletService.getWalletAddress();
        const supabase = supabaseClient.getSupabaseClient();
        
        // Get user data
        const { data: user, error } = await supabase
            .from('users')
            .select('total_winnings, total_bets, win_rate, current_streak')
            .eq('wallet_address', walletAddress)
            .single();
            
        if (!error && user) {
            // Update home page stats if elements exist
            updateHomePageStats(user);
        }
        
    } catch (error) {
        console.error('Failed to load portfolio summary:', error);
    }
}

/**
 * Update Home Page Stats Display
 */
function updateHomePageStats(userData) {
    // Update any portfolio stats shown on home page
    const updateStat = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };
    
    updateStat('homeWinnings', `${formatSOL(userData.total_winnings)} SOL`);
    updateStat('homeWinRate', `${userData.win_rate.toFixed(1)}%`);
    updateStat('homeTotalBets', userData.total_bets);
    updateStat('homeStreak', userData.current_streak);
}

/**
 * Setup Portfolio Navigation
 */
function setupPortfolioNavigation() {
    // Add click handler to portfolio nav link
    const portfolioLink = document.querySelector('[data-page="portfolio"]');
    if (portfolioLink) {
        portfolioLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.showPage('portfolio');
        });
    }
}

/**
 * Initialize Portfolio Integration
 */
function initializePortfolioIntegration() {
    console.log('🔧 Initializing portfolio integration...');
    
    // Enhance navigation functions
    enhanceShowPage();
    enhanceLoadPageContent();
    
    // Setup navigation
    setupPortfolioNavigation();
    
    // Monitor wallet changes
    if (window.walletService) {
        const originalUpdateUIForConnectedUser = window.updateUIForConnectedUser;
        window.updateUIForConnectedUser = function() {
            if (originalUpdateUIForConnectedUser) {
                originalUpdateUIForConnectedUser();
            }
            handlePortfolioWalletChange(true);
        };
        
        const originalUpdateUIForDisconnectedUser = window.updateUIForDisconnectedUser;
        window.updateUIForDisconnectedUser = function() {
            if (originalUpdateUIForDisconnectedUser) {
                originalUpdateUIForDisconnectedUser();
            }
            handlePortfolioWalletChange(false);
        };
    }
    
    console.log('✅ Portfolio integration initialized');
}

/**
 * Format SOL helper
 */
function formatSOL(amount) {
    return parseFloat(amount || 0).toFixed(3);
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializePortfolioIntegration();
    }, 1000);
});

// Export for global use
window.initializePortfolioPage = initializePortfolioPage;
window.handlePortfolioWalletChange = handlePortfolioWalletChange;
window.loadPortfolioSummaryForHome = loadPortfolioSummaryForHome;
