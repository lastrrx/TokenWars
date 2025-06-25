// FIXED Main Application Logic - Phase 1: Navigation & UI Framework Fixes
// CRITICAL FIXES: Navigation, section display, wallet modal, and UI state management

// Global state
let walletProvider = null;
let connectedWallet = null;
let connectedUser = null;
let currentStep = 1;
let selectedAvatar = '🎯';
let agreementAccepted = false;

// Token and price update intervals
let tokenUpdateInterval = null;
let priceUpdateInterval = null;
let competitionStatusInterval = null;

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
// FIXED NAVIGATION FUNCTIONS
// ==============================================

// FIXED: Show Markets Section
function showMarkets() {
    console.log('📊 Switching to Markets section');
    
    hideAllSections();
    
    const marketsSection = document.getElementById('markets');
    const mainContent = document.getElementById('mainContent');
    
    // Ensure main content is visible
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // Show markets section
    if (marketsSection) {
        marketsSection.style.display = 'block';
        console.log('✅ Markets section displayed');
    } else {
        console.error('❌ Markets section not found');
        return;
    }
    
    updateActiveNavLink('markets');
    
    // Load competitions if user is connected
    if (connectedUser) {
        loadActiveCompetitions();
    } else {
        // Show message for non-connected users
        const competitionsGrid = document.getElementById('competitions-grid');
        if (competitionsGrid) {
            competitionsGrid.innerHTML = `
                <div class="empty-competitions">
                    <div class="empty-icon">🔗</div>
                    <h3>Connect Wallet to View Markets</h3>
                    <p>Connect your wallet to see active token competitions</p>
                    <button class="btn-primary" onclick="openWalletModal()">Connect Wallet</button>
                </div>
            `;
        }
    }
}

// FIXED: Show Competitions (alias for markets)
function showCompetitions() {
    console.log('🏁 Switching to Competitions section');
    showMarkets(); // Same as markets for now
}

// FIXED: Show Leaderboard Section  
function showLeaderboard() {
    console.log('🏆 Switching to Leaderboard section');
    
    hideAllSections();
    
    const leaderboardSection = document.getElementById('leaderboard');
    const mainContent = document.getElementById('mainContent');
    
    // Ensure main content is visible
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // Show leaderboard section
    if (leaderboardSection) {
        leaderboardSection.style.display = 'block';
        console.log('✅ Leaderboard section displayed');
    } else {
        console.error('❌ Leaderboard section not found');
        return;
    }
    
    updateActiveNavLink('leaderboard');
    
    // Load leaderboard data
    if (connectedUser) {
        loadLeaderboard();
    } else {
        // Show message for non-connected users
        const leaderboardContent = document.getElementById('leaderboard-content');
        if (leaderboardContent) {
            leaderboardContent.innerHTML = `
                <div class="leaderboard-empty">
                    <div class="empty-icon">🔗</div>
                    <h3>Connect Wallet to View Leaderboard</h3>
                    <p>Connect your wallet to see top traders and your ranking</p>
                    <button class="btn-primary" onclick="openWalletModal()">Connect Wallet</button>
                </div>
            `;
        }
    }
}

// FIXED: Show Portfolio Section
function showPortfolio() {
    console.log('💼 Switching to Portfolio section');
    
    hideAllSections();
    
    const portfolioSection = document.getElementById('portfolio');
    const mainContent = document.getElementById('mainContent');
    
    // Ensure main content is visible
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // Show portfolio section
    if (portfolioSection) {
        portfolioSection.style.display = 'block';
        console.log('✅ Portfolio section displayed');
    } else {
        console.error('❌ Portfolio section not found');
        return;
    }
    
    updateActiveNavLink('portfolio');
    
    // Load portfolio data
    if (connectedUser) {
        loadUserPortfolio();
    } else {
        // Show message for non-connected users
        const portfolioContent = document.getElementById('portfolio-content');
        if (portfolioContent) {
            portfolioContent.innerHTML = `
                <div class="portfolio-empty">
                    <div class="empty-icon">🔗</div>
                    <h3>Connect Wallet to View Portfolio</h3>
                    <p>Connect your wallet to see your betting history and statistics</p>
                    <button class="btn-primary" onclick="openWalletModal()">Connect Wallet</button>
                </div>
            `;
        }
    }
}

// FIXED: Hide all sections with better error handling
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

// FIXED: Update active navigation link with better error handling
function updateActiveNavLink(activeSection) {
    console.log(`🔗 Updating active nav link to: ${activeSection}`);
    
    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to current section link
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
// FIXED WALLET MODAL FUNCTIONS
// ==============================================

// FIXED: Open wallet connection modal
function openWalletModal() {
    console.log('🔗 Opening wallet modal');
    
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        
        // Reset to first step
        goToStep(1);
        updateWalletStatus();
        
        console.log('✅ Wallet modal opened');
        
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
    } else {
        console.error('❌ Wallet modal not found');
    }
}

// FIXED: Close wallet connection modal
function closeWalletModal() {
    console.log('❌ Closing wallet modal');
    
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
        
        // Reset modal state
        resetModal();
        
        console.log('✅ Wallet modal closed');
        
        // Restore background scrolling
        document.body.style.overflow = 'auto';
    }
}

// FIXED: Go to specific step in modal with better error handling
function goToStep(step) {
    console.log(`📍 Going to step ${step}`);
    
    // Hide all step content
    const stepContents = document.querySelectorAll('.step-content');
    stepContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Hide all step indicators
    const stepIndicators = document.querySelectorAll('.step-indicator');
    stepIndicators.forEach(indicator => {
        indicator.classList.remove('active');
    });
    
    // Show current step
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
// FIXED USER INTERFACE FUNCTIONS
// ==============================================

// FIXED: Update UI for connected user with better state management
function updateUIForConnectedUser() {
    console.log('👤 Updating UI for connected user');
    
    try {
        // Hide disconnected state elements
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
        
        // Show connected state elements
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
        
        // Update user info in navigation
        const navTraderName = document.getElementById('navTraderName');
        const navTraderAvatar = document.getElementById('navTraderAvatar');
        const heroTraderNameText = document.getElementById('heroTraderNameText');
        
        if (connectedUser) {
            if (navTraderName) navTraderName.textContent = connectedUser.username;
            if (heroTraderNameText) heroTraderNameText.textContent = connectedUser.username;
        }
        
        if (navTraderAvatar) navTraderAvatar.textContent = selectedAvatar;
        
        console.log('✅ UI updated for connected user:', connectedUser?.username || 'Unknown');
        
        // Show markets by default after connection
        setTimeout(() => {
            showMarkets();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error updating UI for connected user:', error);
    }
}

// ==============================================
// INITIALIZATION FUNCTIONS (IMPROVED)
// ==============================================

// Initialize the application with better error handling
async function initializeApp() {
    console.log('🚀 Initializing TokenWars app (Phase 1 mode)...');
    
    try {
        // Set up basic UI event listeners
        setupUIEventListeners();
        
        // Check if user was previously connected
        const lastWallet = localStorage.getItem('tokenWars_lastWallet');
        if (lastWallet) {
            console.log('🔄 Attempting to reconnect to last wallet:', lastWallet);
            setTimeout(() => selectWallet(lastWallet), 2000);
        }
        
        // Initialize wallet status checking
        updateWalletStatus();
        setInterval(updateWalletStatus, 5000);
        
        // Initialize token management system (Phase 1: basic mode)
        await initializeTokenSystem();
        
        // Start background services
        startBackgroundServices();
        
        console.log('✅ App initialization complete');
        showNotification('TokenWars Phase 1 loaded successfully! Navigation ready.', 'success');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showErrorNotification('Failed to initialize application - some features may not work');
    }
}

// FIXED: Set up UI event listeners
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

// ==============================================
// PHASE 1 SERVICE INITIALIZATION
// ==============================================

// PHASE 1: Basic token system initialization (placeholder)
async function initializeTokenSystem() {
    console.log('🪙 Token system initialization (Phase 1 mode)...');
    
    try {
        // For Phase 1, just check if classes are loaded
        if (window.TokenService) {
            console.log('✅ TokenService class available');
        } else {
            console.log('⚠️ TokenService class not loaded - will be implemented in Phase 2');
        }
        
        if (window.PriceService) {
            console.log('✅ PriceService class available');
        } else {
            console.log('⚠️ PriceService class not loaded - will be implemented in Phase 2');
        }
        
        // Phase 1: Just log that initialization is complete
        console.log('✅ Token system ready for Phase 1 (basic mode)');
        return true;
        
    } catch (error) {
        console.log('⚠️ Token system initialization skipped for Phase 1:', error.message);
        return true; // Don't fail Phase 1 for token issues
    }
}

// PHASE 1: Basic background services (placeholder)
function startBackgroundServices() {
    console.log('⚙️ Starting background services (Phase 1 mode)...');
    
    try {
        // For Phase 1, just log that services would start here
        console.log('✅ Background services ready for Phase 1');
        console.log('   • Token updates: Will be implemented in Phase 2');
        console.log('   • Price monitoring: Will be implemented in Phase 2');
        console.log('   • Competition management: Will be implemented in Phase 2');
        
        return true;
    } catch (error) {
        console.error('Background services error (Phase 1):', error);
        return false;
    }
}

// ==============================================
// PLACEHOLDER FUNCTIONS (TO BE IMPLEMENTED IN LATER PHASES)
// ==============================================

// Update wallet status
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

// Wallet connection functions (placeholders)
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
    console.log('📊 Loading competitions placeholder');
    const competitionsGrid = document.getElementById('competitions-grid');
    if (competitionsGrid) {
        competitionsGrid.innerHTML = '<div class="loading">Loading competitions...</div>';
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

// Notification functions (simplified)
function showNotification(message, type = 'info') {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

// ==============================================
// GLOBAL EXPORTS
// ==============================================

// Export main app object for access
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
    
    // Utility functions
    showNotification,
    showErrorNotification,
    
    // State getters
    getCurrentUser: () => connectedUser,
    getConnectedWallet: () => connectedWallet
};

console.log('📱 App.js Phase 1 fixes loaded - Navigation & UI Framework ready');
console.log('🎯 Phase 1 Features Available:');
console.log('   ✅ Complete navigation system (Markets, Leaderboard, Portfolio)');
console.log('   ✅ Wallet modal UI (Phase 3 will add functionality)');
console.log('   ✅ Section switching and display');
console.log('   ✅ Responsive design');
console.log('   ✅ Basic services framework');
console.log('   📋 Next: Phase 2 will add database & backend services');
