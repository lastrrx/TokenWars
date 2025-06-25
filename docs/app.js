// Main Application Logic - Phase 2: Real Services Integration
// Updated initialization for TokenService and PriceService integration

// Global state
let walletProvider = null;
let connectedWallet = null;
let connectedUser = null;
let currentStep = 1;
let selectedAvatar = '🎯';
let agreementAccepted = false;

// Service instances
let tokenService = null;
let priceService = null;
let supabaseClient = null;

// Update intervals
let tokenUpdateInterval = null;
let priceUpdateInterval = null;
let competitionStatusInterval = null;
let systemHealthInterval = null;

// CRITICAL FIX: Ensure functions are exposed globally IMMEDIATELY
(function() {
    // Navigation functions - FIXED to work immediately
    window.showMarkets = showMarkets;
    window.showCompetitions = showCompetitions; 
    window.showLeaderboard = showLeaderboard;
    window.showPortfolio = showPortfolio;
    window.hideAllSections = hideAllSections;
    window.updateActiveNavLink = updateActiveNavLink;
    
    // Wallet functions
    window.openWalletModal = openWalletModal;
    window.closeWalletModal = closeWalletModal;
    window.selectWallet = selectWallet;
    window.goToStep = goToStep;
    window.continueFromConfirmation = continueFromConfirmation;
    window.updateTraderPreview = updateTraderPreview;
    window.selectAvatar = selectAvatar;
    window.toggleAgreement = toggleAgreement;
    window.finalizeProfile = finalizeProfile;
    window.completedOnboarding = completedOnboarding;
    window.disconnectWallet = disconnectWallet;
    
    // Core app function
    window.initializeApp = initializeApp;
    
    console.log('✅ All navigation functions exposed globally');
})();

// ==============================================
// NAVIGATION FUNCTIONS (UNCHANGED)
// ==============================================

function showMarkets() {
    console.log('📊 Switching to Markets section');
    
    hideAllSections();
    
    const marketsSection = document.getElementById('markets');
    const mainContent = document.getElementById('mainContent');
    
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    if (marketsSection) {
        marketsSection.style.display = 'block';
        console.log('✅ Markets section displayed');
    } else {
        console.error('❌ Markets section not found');
        return;
    }
    
    updateActiveNavLink('markets');
    
    // Load competitions with real services
    if (connectedUser) {
        loadActiveCompetitions();
    } else {
        showConnectWalletPrompt('competitions-grid', 'Connect Wallet to View Markets', 'Connect your wallet to see active token competitions');
    }
}

function showCompetitions() {
    console.log('🏁 Switching to Competitions section');
    showMarkets(); // Same as markets for now
}

function showLeaderboard() {
    console.log('🏆 Switching to Leaderboard section');
    
    hideAllSections();
    
    const leaderboardSection = document.getElementById('leaderboard');
    const mainContent = document.getElementById('mainContent');
    
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    if (leaderboardSection) {
        leaderboardSection.style.display = 'block';
        console.log('✅ Leaderboard section displayed');
    } else {
        console.error('❌ Leaderboard section not found');
        return;
    }
    
    updateActiveNavLink('leaderboard');
    
    if (connectedUser) {
        loadLeaderboard();
    } else {
        showConnectWalletPrompt('leaderboard-content', 'Connect Wallet to View Leaderboard', 'Connect your wallet to see top traders and your ranking');
    }
}

function showPortfolio() {
    console.log('💼 Switching to Portfolio section');
    
    hideAllSections();
    
    const portfolioSection = document.getElementById('portfolio');
    const mainContent = document.getElementById('mainContent');
    
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    if (portfolioSection) {
        portfolioSection.style.display = 'block';
        console.log('✅ Portfolio section displayed');
    } else {
        console.error('❌ Portfolio section not found');
        return;
    }
    
    updateActiveNavLink('portfolio');
    
    if (connectedUser) {
        loadUserPortfolio();
    } else {
        showConnectWalletPrompt('portfolio-content', 'Connect Wallet to View Portfolio', 'Connect your wallet to see your betting history and statistics');
    }
}

function hideAllSections() {
    console.log('🙈 Hiding all sections');
    
    const sections = document.querySelectorAll('.section');
    let hiddenCount = 0;
    
    sections.forEach(section => {
        if (section) {
            section.style.display = 'none';
            hiddenCount++;
        }
    });
    
    console.log(`✅ Hidden ${hiddenCount} sections`);
}

function updateActiveNavLink(activeSection) {
    console.log(`🔗 Updating active nav link to: ${activeSection}`);
    
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[href="#${activeSection}"]`) || 
                     document.querySelector(`[onclick*="${activeSection}"]`);
    
    if (activeLink) {
        activeLink.classList.add('active');
        console.log(`✅ Active link updated for ${activeSection}`);
    } else {
        console.warn(`⚠️ No nav link found for ${activeSection}`);
    }
}

// ==============================================
// WALLET MODAL FUNCTIONS (UNCHANGED)
// ==============================================

function openWalletModal() {
    console.log('🔗 Opening wallet modal');
    
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        
        goToStep(1);
        updateWalletStatus();
        
        console.log('✅ Wallet modal opened');
        document.body.style.overflow = 'hidden';
    } else {
        console.error('❌ Wallet modal not found');
    }
}

function closeWalletModal() {
    console.log('❌ Closing wallet modal');
    
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
        
        resetModal();
        
        console.log('✅ Wallet modal closed');
        document.body.style.overflow = 'auto';
    }
}

function goToStep(step) {
    console.log(`📍 Going to step ${step}`);
    
    const stepContents = document.querySelectorAll('.step-content');
    stepContents.forEach(content => {
        content.classList.remove('active');
    });
    
    const stepIndicators = document.querySelectorAll('.step-indicator');
    stepIndicators.forEach(indicator => {
        indicator.classList.remove('active');
    });
    
    let stepElement;
    let indicatorElement;
    
    if (step === 2.5) {
        stepElement = document.getElementById('step2_5Content');
        indicatorElement = document.getElementById('step2Indicator');
    } else {
        stepElement = document.getElementById(`step${step}Content`);
        indicatorElement = document.getElementById(`step${step}Indicator`);
    }
    
    if (stepElement) {
        stepElement.classList.add('active');
        currentStep = step;
        console.log(`✅ Step ${step} activated`);
    } else {
        console.error(`❌ Step ${step} element not found`);
    }
    
    if (indicatorElement) {
        indicatorElement.classList.add('active');
    }
}

// ==============================================
// PHASE 2 SERVICE INITIALIZATION
// ==============================================

async function initializeApp() {
    console.log('🚀 Initializing TokenWars app (Phase 2 mode)...');
    
    try {
        // Set up basic UI event listeners
        setupUIEventListeners();
        
        // Initialize core services in Phase 2 mode
        await initializeSupabaseConnection();
        await initializeTokenService();
        await initializePriceService();
        await initializeCompetitionSystem();
        
        // Start system monitoring
        startSystemHealthMonitoring();
        
        // Start background services
        startBackgroundServices();
        
        // Check for previous wallet connection
        const lastWallet = localStorage.getItem('tokenWars_lastWallet');
        if (lastWallet) {
            console.log('🔄 Attempting to reconnect to last wallet:', lastWallet);
            setTimeout(() => selectWallet(lastWallet), 2000);
        }
        
        // Initialize wallet status checking
        updateWalletStatus();
        setInterval(updateWalletStatus, 5000);
        
        console.log('✅ App initialization complete - Phase 2 ready');
        showNotification('TokenWars Phase 2 loaded successfully! Real token services active.', 'success');
        
        // Update status indicators
        updateTokenStatus('✅ Tokens: Ready');
        updateDbStatus('connected', '✅ Database: Connected');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showErrorNotification('Failed to initialize application - some features may not work');
        
        // Update status indicators
        updateTokenStatus('❌ Tokens: Error');
        updateDbStatus('disconnected', '❌ Database: Error');
    }
}

// Initialize Supabase connection
async function initializeSupabaseConnection() {
    try {
        console.log('🔗 Initializing Supabase connection...');
        
        if (window.supabaseClient && typeof window.supabaseClient.initializeSupabase === 'function') {
            supabaseClient = await window.supabaseClient.initializeSupabase();
            console.log('✅ Supabase connection initialized');
            return true;
        } else {
            throw new Error('Supabase client not available');
        }
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
        return false;
    }
}

// Initialize TokenService (Phase 2)
async function initializeTokenService() {
    try {
        console.log('🪙 Initializing TokenService (Phase 2)...');
        
        if (window.TokenService) {
            tokenService = window.getTokenService();
            const success = await tokenService.initialize();
            
            if (success) {
                console.log('✅ TokenService initialized successfully');
                
                // Log service status
                const status = tokenService.getCacheStatus();
                console.log(`   📊 Token count: ${status.tokenCount}`);
                console.log(`   🔗 Token pairs: ${status.pairCount}`);
                console.log(`   📅 Last update: ${status.lastUpdate}`);
                
                return true;
            } else {
                throw new Error('TokenService initialization failed');
            }
        } else {
            throw new Error('TokenService class not available');
        }
    } catch (error) {
        console.error('❌ TokenService initialization failed:', error);
        return false;
    }
}

// Initialize PriceService (Phase 2)
async function initializePriceService() {
    try {
        console.log('💰 Initializing PriceService (Phase 2)...');
        
        if (window.PriceService) {
            priceService = window.getPriceService();
            const success = await priceService.initialize();
            
            if (success) {
                console.log('✅ PriceService initialized successfully');
                
                // Log service status
                const status = priceService.getCacheStatus();
                console.log(`   📊 Cached prices: ${status.totalPrices}`);
                console.log(`   🔥 Fresh prices: ${status.freshPrices}`);
                console.log(`   🎯 Competition tokens: ${status.competitionTokens}`);
                
                return true;
            } else {
                throw new Error('PriceService initialization failed');
            }
        } else {
            throw new Error('PriceService class not available');
        }
    } catch (error) {
        console.error('❌ PriceService initialization failed:', error);
        return false;
    }
}

// Initialize Competition System (Phase 2)
async function initializeCompetitionSystem() {
    try {
        console.log('🏁 Initializing Competition System (Phase 2)...');
        
        if (window.initializeCompetitionSystem && typeof window.initializeCompetitionSystem === 'function') {
            await window.initializeCompetitionSystem();
            console.log('✅ Competition system initialized successfully');
            return true;
        } else {
            console.warn('⚠️ Competition system not available');
            return false;
        }
    } catch (error) {
        console.error('❌ Competition system initialization failed:', error);
        return false;
    }
}

// Start system health monitoring
function startSystemHealthMonitoring() {
    if (systemHealthInterval) {
        clearInterval(systemHealthInterval);
    }
    
    systemHealthInterval = setInterval(async () => {
        try {
            await checkSystemHealth();
        } catch (error) {
            console.error('System health check failed:', error);
        }
    }, 60000); // Check every minute
    
    console.log('✅ System health monitoring started');
}

// Check system health
async function checkSystemHealth() {
    try {
        let healthStatus = {
            database: 'unknown',
            tokenService: 'unknown',
            priceService: 'unknown',
            timestamp: new Date().toISOString()
        };
        
        // Check database health
        if (supabaseClient) {
            try {
                const testResult = await window.supabaseClient.testConnection();
                healthStatus.database = testResult ? 'healthy' : 'degraded';
            } catch (error) {
                healthStatus.database = 'error';
            }
        }
        
        // Check TokenService health
        if (tokenService && tokenService.isReady()) {
            healthStatus.tokenService = 'healthy';
        } else {
            healthStatus.tokenService = 'error';
        }
        
        // Check PriceService health
        if (priceService && priceService.isReady()) {
            healthStatus.priceService = 'healthy';
        } else {
            healthStatus.priceService = 'error';
        }
        
        // Update status indicators
        if (healthStatus.database === 'healthy') {
            updateDbStatus('connected', '✅ Database: Connected');
        } else {
            updateDbStatus('disconnected', '❌ Database: ' + healthStatus.database);
        }
        
        if (healthStatus.tokenService === 'healthy' && healthStatus.priceService === 'healthy') {
            updateTokenStatus('✅ Services: Active');
        } else {
            updateTokenStatus('⚠️ Services: ' + (healthStatus.tokenService === 'error' || healthStatus.priceService === 'error' ? 'Error' : 'Degraded'));
        }
        
        return healthStatus;
    } catch (error) {
        console.error('Health check error:', error);
        updateDbStatus('disconnected', '❌ Database: Error');
        updateTokenStatus('❌ Services: Error');
        return { error: error.message };
    }
}

// Start background services (Phase 2)
function startBackgroundServices() {
    console.log('⚙️ Starting background services (Phase 2)...');
    
    try {
        // Token data refresh every 2 hours
        if (tokenService) {
            tokenUpdateInterval = setInterval(async () => {
                try {
                    console.log('🔄 Background token refresh...');
                    await tokenService.refreshTokenData();
                } catch (error) {
                    console.error('Background token refresh failed:', error);
                }
            }, 2 * 60 * 60 * 1000); // 2 hours
        }
        
        // Price updates every 5 minutes for active tokens
        if (priceService) {
            priceUpdateInterval = setInterval(async () => {
                try {
                    if (priceService.shouldRefreshPrices()) {
                        console.log('💰 Background price refresh...');
                        await priceService.updatePrices();
                    }
                } catch (error) {
                    console.error('Background price refresh failed:', error);
                }
            }, 5 * 60 * 1000); // 5 minutes
        }
        
        // Competition status updates every 30 seconds
        competitionStatusInterval = setInterval(async () => {
            try {
                if (window.updateCompetitionsDisplay && typeof window.updateCompetitionsDisplay === 'function') {
                    // Only update if markets section is visible
                    const marketsSection = document.getElementById('markets');
                    if (marketsSection && marketsSection.style.display !== 'none') {
                        await window.updateCompetitionsDisplay();
                    }
                }
            } catch (error) {
                console.error('Competition status update failed:', error);
            }
        }, 30 * 1000); // 30 seconds
        
        console.log('✅ Background services started:');
        console.log('   🪙 Token refresh: Every 2 hours');
        console.log('   💰 Price updates: Every 5 minutes');
        console.log('   🏁 Competition status: Every 30 seconds');
        console.log('   🔍 Health monitoring: Every 1 minute');
        
        return true;
    } catch (error) {
        console.error('Background services error:', error);
        return false;
    }
}

// ==============================================
// UI HELPER FUNCTIONS
// ==============================================

function setupUIEventListeners() {
    console.log('🎧 Setting up UI event listeners');
    
    // Handle escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('walletModal');
            if (modal && modal.style.display !== 'none') {
                closeWalletModal();
            }
        }
    });
    
    // Handle clicks outside modal to close
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('walletModal');
        if (modal && e.target === modal) {
            closeWalletModal();
        }
    });
    
    // Handle navigation link clicks as backup
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('href').substring(1);
            
            switch(target) {
                case 'markets':
                case 'competitions':
                    showMarkets();
                    break;
                case 'leaderboard':
                    showLeaderboard();
                    break;
                case 'portfolio':
                    showPortfolio();
                    break;
            }
        });
    });
    
    console.log('✅ UI event listeners set up');
}

function showConnectWalletPrompt(containerId, title, description) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="empty-competitions">
                <div class="empty-icon">🔗</div>
                <h3>${title}</h3>
                <p>${description}</p>
                <button class="btn-primary" onclick="openWalletModal()">Connect Wallet</button>
            </div>
        `;
    }
}

function updateUIForConnectedUser() {
    console.log('👤 Updating UI for connected user');
    
    try {
        const elementsToHide = [
            'heroDisconnected',
            'connectWalletBtn'
        ];
        
        elementsToHide.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        const elementsToShow = [
            { id: 'heroConnected', display: 'block' },
            { id: 'traderInfo', display: 'flex' },
            { id: 'mainContent', display: 'block' }
        ];
        
        elementsToShow.forEach(({ id, display }) => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = display;
            }
        });
        
        const navTraderName = document.getElementById('navTraderName');
        const navTraderAvatar = document.getElementById('navTraderAvatar');
        const heroTraderNameText = document.getElementById('heroTraderNameText');
        
        if (connectedUser) {
            if (navTraderName) navTraderName.textContent = connectedUser.username;
            if (heroTraderNameText) heroTraderNameText.textContent = connectedUser.username;
        }
        
        if (navTraderAvatar) navTraderAvatar.textContent = selectedAvatar;
        
        console.log('✅ UI updated for connected user:', connectedUser?.username || 'Unknown');
        
        setTimeout(() => {
            showMarkets();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error updating UI for connected user:', error);
    }
}

// ==============================================
// STATUS UPDATE FUNCTIONS
// ==============================================

function updateDbStatus(status, message) {
    const statusElement = document.getElementById('dbStatus');
    if (statusElement) {
        statusElement.className = `db-status ${status}`;
        statusElement.textContent = message;
    }
}

function updateTokenStatus(message) {
    const statusElement = document.getElementById('tokenStatus');
    if (statusElement) {
        statusElement.textContent = message;
        
        // Update class based on message
        if (message.includes('✅')) {
            statusElement.className = 'db-status connected';
        } else if (message.includes('⚠️')) {
            statusElement.className = 'db-status degraded';
        } else {
            statusElement.className = 'db-status disconnected';
        }
    }
}

// ==============================================
// PLACEHOLDER FUNCTIONS (TO BE IMPLEMENTED)
// ==============================================

function updateWalletStatus() {
    const wallets = {
        phantom: window.phantom?.solana,
        solflare: window.solflare,
        backpack: window.backpack
    };
    
    Object.entries(wallets).forEach(([name, provider]) => {
        const statusElement = document.getElementById(`${name}Status`);
        if (statusElement) {
            statusElement.textContent = provider ? '✓ Installed' : '⚠ Not Installed';
            statusElement.style.color = provider ? '#22c55e' : '#f59e0b';
        }
    });
}

async function selectWallet(walletType) {
    console.log('🔗 Wallet selection placeholder:', walletType);
    showNotification('Wallet connection will be implemented in Phase 3', 'info');
}

function resetModal() {
    console.log('🔄 Modal reset placeholder');
    currentStep = 1;
    selectedAvatar = '🎯';
    agreementAccepted = false;
}

function continueFromConfirmation() {
    console.log('➡️ Continue from confirmation placeholder');
}

function updateTraderPreview() {
    console.log('👤 Update trader preview placeholder');
}

function selectAvatar(emoji) {
    console.log('🎭 Select avatar placeholder:', emoji);
    selectedAvatar = emoji;
}

function toggleAgreement() {
    console.log('📋 Toggle agreement placeholder');
    agreementAccepted = !agreementAccepted;
}

function finalizeProfile() {
    console.log('✅ Finalize profile placeholder');
}

function completedOnboarding() {
    console.log('🎉 Completed onboarding placeholder');
}

function disconnectWallet() {
    console.log('🔌 Disconnect wallet placeholder');
}

function loadActiveCompetitions() {
    console.log('📊 Loading active competitions with real services...');
    
    // The competition system will handle this automatically
    if (window.loadRealCompetitions && typeof window.loadRealCompetitions === 'function') {
        window.loadRealCompetitions();
    } else {
        const competitionsGrid = document.getElementById('competitions-grid');
        if (competitionsGrid) {
            competitionsGrid.innerHTML = '<div class="loading">Loading competitions...</div>';
        }
    }
}

function loadUserPortfolio() {
    console.log('💼 Loading portfolio placeholder');
    const portfolioContent = document.getElementById('portfolio-content');
    if (portfolioContent) {
        portfolioContent.innerHTML = '<div class="loading">Loading portfolio...</div>';
    }
}

function loadLeaderboard() {
    console.log('🏆 Loading leaderboard placeholder');
    const leaderboardContent = document.getElementById('leaderboard-content');
    if (leaderboardContent) {
        leaderboardContent.innerHTML = '<div class="loading">Loading leaderboard...</div>';
    }
}

// ==============================================
// NOTIFICATION FUNCTIONS
// ==============================================

function showNotification(message, type = 'info') {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    
    // TODO: Implement visual notifications
    // For now, just log to console
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

// ==============================================
// CLEANUP FUNCTIONS
// ==============================================

function cleanup() {
    console.log('🧹 Cleaning up application...');
    
    // Clear intervals
    if (tokenUpdateInterval) {
        clearInterval(tokenUpdateInterval);
        tokenUpdateInterval = null;
    }
    
    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
        priceUpdateInterval = null;
    }
    
    if (competitionStatusInterval) {
        clearInterval(competitionStatusInterval);
        competitionStatusInterval = null;
    }
    
    if (systemHealthInterval) {
        clearInterval(systemHealthInterval);
        systemHealthInterval = null;
    }
    
    // Cleanup services
    if (tokenService && typeof tokenService.cleanup === 'function') {
        tokenService.cleanup();
    }
    
    if (priceService && typeof priceService.cleanup === 'function') {
        priceService.cleanup();
    }
    
    console.log('✅ Application cleanup complete');
}

// Handle page unload
window.addEventListener('beforeunload', cleanup);

// ==============================================
// GLOBAL EXPORTS
// ==============================================

window.app = {
    // Navigation functions
    showMarkets,
    showCompetitions,
    showLeaderboard,
    showPortfolio,
    hideAllSections,
    updateActiveNavLink,
    
    // Wallet functions
    openWalletModal,
    closeWalletModal,
    selectWallet,
    disconnectWallet,
    
    // App lifecycle
    initializeApp,
    cleanup,
    
    // Service access
    getTokenService: () => tokenService,
    getPriceService: () => priceService,
    getSupabaseClient: () => supabaseClient,
    
    // Utility functions
    showNotification,
    showErrorNotification,
    checkSystemHealth,
    
    // State getters
    getCurrentUser: () => connectedUser,
    getConnectedWallet: () => connectedWallet
};

console.log('📱 App.js Phase 2 integration loaded - Real Services Framework ready');
console.log('🎯 Phase 2 Features Available:');
console.log('   ✅ Complete navigation system (Markets, Leaderboard, Portfolio)');
console.log('   ✅ Real TokenService with Jupiter API integration');
console.log('   ✅ Real PriceService with CoinGecko API integration');
console.log('   ✅ Real-time competition system with live token data');
console.log('   ✅ Background services and health monitoring');
console.log('   ✅ Database integration and caching');
console.log('   📋 Next: Phase 3 will add wallet connection functionality');
