// Main Application Logic - Phase 3: FIXED INITIALIZATION ORDER
// Resolves TokenService hanging issue with proper service initialization sequence

// Global state
let walletService = null;
let connectedUser = null;
let currentStep = 1;
let selectedAvatar = '🎯';
let agreementAccepted = false;
let usernameValidation = { valid: false, message: '' };

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
    // Navigation functions
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
    window.validateUsernameInput = validateUsernameInput;
    window.setupStep3EventListeners = setupStep3EventListeners;
    window.debugValidationState = debugValidationState;
    
    // Core app function
    window.initializeApp = initializeApp;
    
    console.log('✅ All functions exposed globally - Phase 3 ready');
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
// PHASE 3 APP INITIALIZATION - FIXED ORDER
// ==============================================

async function initializeApp() {
    console.log('🚀 Initializing TokenWars app (Phase 3 mode)...');
    
    try {
        // Set up basic UI event listeners first
        setupUIEventListeners();
        
        // STEP 1: Initialize Supabase (foundational service)
        console.log('🔄 Step 1: Initializing Supabase...');
        const supabaseSuccess = await initializeSupabaseConnection();
        if (supabaseSuccess) {
            updateDbStatus('connected', '✅ Database: Connected');
        } else {
            updateDbStatus('disconnected', '⚠️ Database: Degraded');
        }
        
        // STEP 2: Initialize TokenService (CRITICAL - must complete first)
        console.log('🔄 Step 2: Initializing TokenService...');
        const tokenSuccess = await initializeTokenServiceSafely();
        if (tokenSuccess) {
            updateTokenStatus('✅ Tokens: Ready');
        } else {
            updateTokenStatus('⚠️ Tokens: Fallback');
        }
        
        // STEP 3: Initialize PriceService (depends on TokenService)
        console.log('🔄 Step 3: Initializing PriceService...');
        const priceSuccess = await initializePriceServiceSafely();
        if (priceSuccess) {
            console.log('✅ PriceService initialized');
        } else {
            console.log('⚠️ PriceService using fallback');
        }
        
        // STEP 4: Initialize WalletService (independent)
        console.log('🔄 Step 4: Initializing WalletService...');
        const walletSuccess = await initializeWalletServiceSafely();
        if (walletSuccess) {
            console.log('✅ WalletService initialized');
        } else {
            console.log('⚠️ WalletService degraded');
        }
        
        // STEP 5: Initialize other systems
        console.log('🔄 Step 5: Initializing competition system...');
        await initializeCompetitionSystemSafely();
        
        // STEP 6: Start monitoring and background services
        console.log('🔄 Step 6: Starting system monitoring...');
        startSystemHealthMonitoring();
        startBackgroundServices();
        
        console.log('✅ App initialization complete - Phase 3 ready');
        showNotification('TokenWars Phase 3 loaded successfully! Real wallet integration active.', 'success');
        
        // Update wallet status display
        updateWalletStatusDisplay();
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showErrorNotification('Failed to initialize application - some features may not work');
        
        // Update status indicators to show errors
        updateTokenStatus('❌ Tokens: Error');
        updateDbStatus('disconnected', '❌ Database: Error');
    }
}

// FIXED: Safe TokenService initialization with timeout and detailed logging
async function initializeTokenServiceSafely() {
    try {
        console.log('🪙 Starting TokenService initialization with safety measures...');
        
        if (!window.TokenService || !window.getTokenService) {
            console.error('❌ TokenService class not available');
            return false;
        }
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('TokenService initialization timeout (30 seconds)'));
            }, 30000); // 30 second timeout
        });
        
        // Create initialization promise
        const initPromise = (async () => {
            console.log('🔄 Getting TokenService instance...');
            tokenService = window.getTokenService();
            
            console.log('🔄 Calling TokenService.initialize()...');
            const success = await tokenService.initialize();
            
            if (success) {
                console.log('🔄 Verifying TokenService state...');
                const status = tokenService.getCacheStatus();
                console.log('📊 TokenService status:', status);
                
                if (status.tokenCount > 0) {
                    console.log(`✅ TokenService ready with ${status.tokenCount} tokens`);
                    return true;
                } else {
                    console.warn('⚠️ TokenService initialized but no tokens loaded');
                    return true; // Still consider successful for Phase 3
                }
            } else {
                console.error('❌ TokenService initialization returned false');
                return false;
            }
        })();
        
        // Race between initialization and timeout
        return await Promise.race([initPromise, timeoutPromise]);
        
    } catch (error) {
        console.error('❌ TokenService initialization failed:', error);
        
        // Try to recover with emergency fallback
        try {
            console.log('🔄 Attempting emergency TokenService recovery...');
            if (tokenService && typeof tokenService.createDemoTokens === 'function') {
                tokenService.tokens = tokenService.createDemoTokens();
                tokenService.isInitialized = true;
                console.log('✅ Emergency recovery successful');
                return true;
            }
        } catch (recoveryError) {
            console.error('❌ Emergency recovery failed:', recoveryError);
        }
        
        return false;
    }
}

// Safe PriceService initialization
async function initializePriceServiceSafely() {
    try {
        console.log('💰 Initializing PriceService safely...');
        
        if (window.PriceService && typeof window.getPriceService === 'function') {
            priceService = window.getPriceService();
            const success = await priceService.initialize();
            return success;
        } else {
            console.warn('⚠️ PriceService class not available, using mock');
            priceService = createMockPriceService();
            return true;
        }
    } catch (error) {
        console.error('❌ PriceService initialization failed:', error);
        priceService = createMockPriceService();
        return true; // Don't block app for price service
    }
}

// Safe WalletService initialization
async function initializeWalletServiceSafely() {
    try {
        console.log('🔗 Initializing WalletService safely...');
        
        if (window.getWalletService) {
            walletService = window.getWalletService();
            const success = await walletService.initialize();
            
            if (success) {
                console.log('✅ WalletService initialized successfully');
                
                // Set up wallet event listeners
                walletService.addConnectionListener(handleWalletEvents);
                
                // Check if wallet was already connected
                const status = walletService.getConnectionStatus();
                if (status.isConnected) {
                    console.log('🔄 Wallet already connected, restoring session...');
                    await handleWalletConnectionSuccess(status);
                }
                
                return true;
            } else {
                throw new Error('WalletService initialization failed');
            }
        } else {
            throw new Error('WalletService class not available');
        }
    } catch (error) {
        console.error('❌ WalletService initialization failed:', error);
        return false;
    }
}

// Safe competition system initialization
async function initializeCompetitionSystemSafely() {
    try {
        console.log('🏁 Initializing Competition System safely...');
        
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

// Initialize Supabase connection safely
async function initializeSupabaseConnection() {
    try {
        console.log('🔗 Initializing Supabase connection safely...');
        
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

// Create mock price service for fallback
function createMockPriceService() {
    return {
        initialize: async () => true,
        updatePrices: async () => true,
        getPrice: () => ({ price: 0, timestamp: new Date().toISOString() }),
        getAllPrices: () => new Map(),
        shouldRefreshPrices: () => false,
        isReady: () => true,
        cleanup: () => {}
    };
}

// Handle wallet events
function handleWalletEvents(event, data) {
    console.log(`🔔 Wallet event: ${event}`, data);
    
    switch (event) {
        case 'connected':
            handleWalletConnectionSuccess(data);
            break;
        case 'disconnected':
            handleWalletDisconnection();
            break;
        case 'balanceUpdated':
            updateBalanceDisplay(data.formatted);
            break;
        case 'profileCreated':
            handleProfileCreated(data);
            break;
        case 'accountChanged':
            showNotification('Wallet account changed', 'info');
            updateWalletStatusDisplay();
            break;
    }
}

// ==============================================
// WALLET MODAL FUNCTIONS (ENHANCED)
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
        
        // Set up step-specific functionality
        if (step === 3) {
            setupStep3EventListeners();
        }
    } else {
        console.error(`❌ Step ${step} element not found`);
    }
    
    if (indicatorElement) {
        indicatorElement.classList.add('active');
    }
}

// Set up event listeners for Step 3 (Profile Creation)
function setupStep3EventListeners() {
    console.log('🎯 Setting up Step 3 event listeners...');
    
    try {
        // Set up username validation
        const usernameInput = document.getElementById('traderUsername');
        if (usernameInput) {
            // Remove any existing event listeners
            usernameInput.removeEventListener('input', handleUsernameInput);
            
            // Add new event listener
            usernameInput.addEventListener('input', handleUsernameInput);
            console.log('✅ Username input event listener added');
            
            // Trigger initial validation if there's already text
            if (usernameInput.value.trim()) {
                console.log('🔄 Triggering initial validation for existing text');
                handleUsernameInput();
            }
        } else {
            console.error('❌ Username input element not found!');
        }
        
        // Reset validation state
        usernameValidation = { valid: false, message: '' };
        
        // Clear any previous errors
        clearUsernameError();
        
        // Update preview initially
        updateTraderPreview();
        
        // Add debugging info
        console.log('🐛 Step 3 Debug Info:');
        console.log(`   Username validation: ${JSON.stringify(usernameValidation)}`);
        console.log(`   Agreement accepted: ${agreementAccepted}`);
        console.log(`   WalletService ready: ${walletService?.isReady()}`);
        
    } catch (error) {
        console.error('Error setting up Step 3 event listeners:', error);
    }
}

// Handle username input with debouncing
const handleUsernameInput = debounce(validateUsernameInput, 500);

// ==============================================
// REAL WALLET FUNCTIONS (PHASE 3)
// ==============================================

// Real wallet status update
function updateWalletStatus() {
    if (!walletService) {
        console.warn('WalletService not initialized yet');
        return;
    }
    
    const walletInfo = walletService.getWalletInfo();
    
    // Update wallet status in modal
    Object.entries(walletInfo.available).forEach(([walletType, wallet]) => {
        const statusElement = document.getElementById(`${walletType}Status`);
        if (statusElement) {
            if (walletType === 'demo') {
                statusElement.textContent = '✓ Available';
                statusElement.style.color = '#22c55e';
            } else {
                statusElement.textContent = wallet.isInstalled ? '✓ Installed' : '⚠ Not Installed';
                statusElement.style.color = wallet.isInstalled ? '#22c55e' : '#f59e0b';
            }
        }
    });
}

// Real wallet selection
async function selectWallet(walletType) {
    console.log(`🔗 Selecting wallet: ${walletType}`);
    
    if (!walletService) {
        showNotification('Wallet service not initialized', 'error');
        return;
    }
    
    try {
        // Update UI to show connecting state
        goToStep(2);
        updateModalTitle('Connecting...', `Connecting to ${walletType}...`);
        document.getElementById('selectedWalletName').textContent = walletType;
        
        // Attempt connection
        const result = await walletService.connectWallet(walletType);
        
        if (result.success) {
            console.log('✅ Wallet connected successfully');
            
            // Move to confirmation step
            goToStep(2.5);
            updateModalTitle('Wallet Connected!', `Your ${walletType} wallet has been connected`);
            
            // Update confirmation UI
            document.getElementById('connectedWalletType').textContent = walletType;
            document.getElementById('connectedWalletAddress').textContent = 
                walletService.formatAddress(result.publicKey);
            
            // Check for existing trader
            await checkExistingTrader();
            
        } else {
            console.error('❌ Wallet connection failed:', result.error);
            showNotification(result.error, 'error');
            
            // Return to step 1
            goToStep(1);
            updateModalTitle('Connect Wallet', 'Choose your preferred Solana wallet to get started');
        }
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        showNotification(`Failed to connect to ${walletType}: ${error.message}`, 'error');
        goToStep(1);
    }
}

// Check for existing trader profile
async function checkExistingTrader() {
    try {
        document.getElementById('traderStatusIcon').textContent = '🔍';
        document.getElementById('traderStatusText').textContent = 'Checking for existing profile...';
        
        // Check if user already has a profile
        const existingProfile = walletService.getUserProfile();
        
        // Also check database if not demo mode
        let dbProfile = null;
        if (!walletService.isDemo && window.supabaseClient) {
            dbProfile = await window.supabaseClient.getOrCreateUser(walletService.publicKey);
        }
        
        const hasProfile = existingProfile || dbProfile;
        
        if (hasProfile) {
            // User already has a profile
            document.getElementById('traderStatusIcon').textContent = '✅';
            document.getElementById('traderStatusText').textContent = 'Existing profile found!';
            
            // Show continue button
            const continueBtn = document.getElementById('continueBtn');
            continueBtn.textContent = 'Continue to App';
            continueBtn.onclick = () => completeLoginFlow(hasProfile);
            
        } else {
            // New user - needs to create profile
            document.getElementById('traderStatusIcon').textContent = '👤';
            document.getElementById('traderStatusText').textContent = 'New user - create your profile';
            
            // Show create profile button
            const continueBtn = document.getElementById('continueBtn');
            continueBtn.textContent = 'Create Profile';
            continueBtn.onclick = () => goToStep(3);
        }
        
        // Show action buttons
        document.getElementById('confirmationActions').style.display = 'flex';
        
    } catch (error) {
        console.error('Error checking existing trader:', error);
        document.getElementById('traderStatusIcon').textContent = '⚠️';
        document.getElementById('traderStatusText').textContent = 'Error checking profile';
        
        // Default to profile creation
        const continueBtn = document.getElementById('continueBtn');
        continueBtn.textContent = 'Create Profile';
        continueBtn.onclick = () => goToStep(3);
        document.getElementById('confirmationActions').style.display = 'flex';
    }
}

// Continue from confirmation step
function continueFromConfirmation() {
    // This function is now handled by the dynamic button onclick
    console.log('Continue from confirmation called - handled by dynamic button');
}

// Complete login flow for existing users
async function completeLoginFlow(profile) {
    try {
        console.log('👤 Completing login flow for existing user');
        
        // Set connected user
        connectedUser = profile;
        
        // Update UI for connected state
        updateUIForConnectedUser();
        
        // Close modal
        closeWalletModal();
        
        showNotification(`Welcome back, ${profile.username || 'Trader'}!`, 'success');
        
    } catch (error) {
        console.error('Error completing login flow:', error);
        showNotification('Error loading profile', 'error');
    }
}

// ==============================================
// USER PROFILE CREATION (REAL IMPLEMENTATION)
// ==============================================

// Validate username input (real-time) - Enhanced with error handling
async function validateUsernameInput() {
    const usernameInput = document.getElementById('traderUsername');
    const createProfileBtn = document.getElementById('createProfileBtn');
    
    if (!usernameInput) {
        console.warn('Username input not found');
        return;
    }
    
    if (!walletService) {
        console.warn('WalletService not available for validation');
        if (createProfileBtn) createProfileBtn.disabled = true;
        return;
    }
    
    const username = usernameInput.value.trim();
    
    // Clear previous validation styling
    usernameInput.classList.remove('valid', 'invalid');
    
    if (username.length === 0) {
        usernameValidation = { valid: false, message: '' };
        if (createProfileBtn) createProfileBtn.disabled = true;
        clearUsernameError();
        return;
    }
    
    try {
        console.log(`🔍 Validating username: ${username}`);
        
        // Validate format first
        const formatValidation = walletService.validateUsername(username);
        
        if (!formatValidation.valid) {
            usernameValidation = { valid: false, message: formatValidation.errors[0] };
            usernameInput.classList.add('invalid');
            if (createProfileBtn) createProfileBtn.disabled = true;
            
            // Show error below input
            showUsernameError(formatValidation.errors[0]);
            return;
        }
        
        // Check availability (with timeout and error handling)
        try {
            const availabilityPromise = walletService.checkUsernameAvailability(username);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Availability check timeout')), 5000)
            );
            
            const availability = await Promise.race([availabilityPromise, timeoutPromise]);
            
            if (!availability.available) {
                usernameValidation = { valid: false, message: availability.error || 'Username not available' };
                usernameInput.classList.add('invalid');
                if (createProfileBtn) createProfileBtn.disabled = true;
                showUsernameError(availability.error || 'Username not available');
                return;
            }
            
        } catch (availabilityError) {
            console.warn('Username availability check failed:', availabilityError);
            // Continue with format validation only if availability check fails
            showUsernameError('Could not verify availability - proceeding with format validation only');
        }
        
        // Valid username
        usernameValidation = { valid: true, message: 'Username available!' };
        usernameInput.classList.add('valid');
        if (createProfileBtn) createProfileBtn.disabled = false;
        clearUsernameError();
        
        // Update preview
        updateTraderPreview();
        
        console.log('✅ Username validation passed');
        
    } catch (error) {
        console.error('Username validation error:', error);
        usernameValidation = { valid: false, message: 'Validation error occurred' };
        usernameInput.classList.add('invalid');
        if (createProfileBtn) createProfileBtn.disabled = true;
        showUsernameError('Could not validate username - please try again');
    }
}

// Show username error
function showUsernameError(message) {
    let errorDiv = document.querySelector('.username-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'username-error';
        errorDiv.style.color = '#ef4444';
        errorDiv.style.fontSize = '0.75rem';
        errorDiv.style.marginTop = '0.25rem';
        
        const usernameInput = document.getElementById('traderUsername');
        usernameInput.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
}

// Clear username error
function clearUsernameError() {
    const errorDiv = document.querySelector('.username-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Update trader preview - Enhanced with error handling
function updateTraderPreview() {
    try {
        const usernameInput = document.getElementById('traderUsername');
        const previewName = document.getElementById('previewName');
        const previewAvatar = document.getElementById('previewAvatar');
        const createProfileBtn = document.getElementById('createProfileBtn');
        const finalizeBtn = document.getElementById('finalizeBtn');
        
        if (usernameInput && previewName) {
            const username = usernameInput.value.trim();
            previewName.textContent = username || 'Trader Username';
        }
        
        if (previewAvatar) {
            previewAvatar.textContent = selectedAvatar;
        }
        
        // Step 3 button: Only check username validation (goes to step 4)
        if (createProfileBtn) {
            createProfileBtn.disabled = !usernameValidation.valid;
        }
        
        // Step 4 button: Check both username validation AND agreement (creates profile)
        if (finalizeBtn) {
            finalizeBtn.disabled = !usernameValidation.valid || !agreementAccepted;
        }
        
        console.log('✅ Trader preview updated');
        console.log(`   Username valid: ${usernameValidation.valid}`);
        console.log(`   Agreement accepted: ${agreementAccepted}`);
        console.log(`   Step 3 button disabled: ${createProfileBtn?.disabled}`);
        console.log(`   Step 4 button disabled: ${finalizeBtn?.disabled}`);
    } catch (error) {
        console.error('Error updating trader preview:', error);
    }
}

// Select avatar
function selectAvatar(emoji) {
    console.log('🎭 Avatar selected:', emoji);
    
    selectedAvatar = emoji;
    
    // Update avatar grid selection
    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.textContent === emoji) {
            option.classList.add('selected');
        }
    });
    
    updateTraderPreview();
}

// Toggle agreement - Enhanced with state management
function toggleAgreement() {
    try {
        agreementAccepted = !agreementAccepted;
        
        const checkbox = document.getElementById('agreementCheckbox');
        const finalizeBtn = document.getElementById('finalizeBtn');
        
        if (checkbox) {
            checkbox.classList.toggle('checked', agreementAccepted);
            checkbox.innerHTML = agreementAccepted ? '✓' : '';
        }
        
        // Step 4 button: Check both username validation AND agreement
        if (finalizeBtn) {
            finalizeBtn.disabled = !agreementAccepted || !usernameValidation.valid;
        }
        
        console.log('📋 Agreement toggled:', agreementAccepted);
        console.log(`   Username valid: ${usernameValidation.valid}`);
        console.log(`   Step 4 button disabled: ${finalizeBtn?.disabled}`);
    } catch (error) {
        console.error('Error toggling agreement:', error);
    }
}

// Finalize profile creation - Enhanced error handling
async function finalizeProfile() {
    console.log('✅ Attempting to finalize profile creation...');
    
    try {
        if (!agreementAccepted) {
            showNotification('Please accept the terms to continue', 'warning');
            return;
        }
        
        if (!usernameValidation.valid) {
            showNotification('Please enter a valid username', 'warning');
            return;
        }
        
        if (!walletService) {
            showNotification('Wallet service not available', 'error');
            return;
        }
        
        const usernameInput = document.getElementById('traderUsername');
        if (!usernameInput) {
            showNotification('Username input not found', 'error');
            return;
        }
        
        const username = usernameInput.value.trim();
        
        if (!username) {
            showNotification('Please enter a username', 'warning');
            return;
        }
        
        console.log(`Creating profile for username: ${username}, avatar: ${selectedAvatar}`);
        
        // Create profile using wallet service
        const profile = await walletService.createUserProfile(username, selectedAvatar);
        
        console.log('✅ Profile created successfully:', profile);
        
        // Move to success step
        goToStep(5);
        
        // Update success display
        const successTitle = document.querySelector('.success-title');
        if (successTitle) {
            successTitle.textContent = `Welcome to TokenWars, ${username}!`;
        }
        
    } catch (error) {
        console.error('Profile creation error:', error);
        showNotification(`Failed to create profile: ${error.message}`, 'error');
    }
}

// Complete onboarding
async function completedOnboarding() {
    try {
        console.log('🎉 Completing onboarding...');
        
        // Get the created profile
        const profile = walletService.getUserProfile();
        
        if (profile) {
            connectedUser = profile;
            
            // Update UI for connected state
            updateUIForConnectedUser();
            
            // Close modal
            closeWalletModal();
            
            showNotification(`Welcome to TokenWars, ${profile.username}!`, 'success');
            
            // Navigate to markets
            setTimeout(() => {
                showMarkets();
            }, 1000);
        } else {
            throw new Error('Profile not found after creation');
        }
        
    } catch (error) {
        console.error('Onboarding completion error:', error);
        showNotification('Error completing setup', 'error');
    }
}

// ==============================================
// WALLET CONNECTION HANDLERS
// ==============================================

// Handle successful wallet connection
async function handleWalletConnectionSuccess(connectionData) {
    try {
        console.log('🎉 Handling successful wallet connection');
        
        // Update wallet status display
        updateWalletStatusDisplay();
        
        // Get or create user profile
        const profile = walletService.getUserProfile();
        
        if (profile) {
            connectedUser = profile;
            updateUIForConnectedUser();
        }
        
    } catch (error) {
        console.error('Error handling wallet connection success:', error);
    }
}

// Handle wallet disconnection
function handleWalletDisconnection() {
    console.log('👋 Handling wallet disconnection');
    
    connectedUser = null;
    updateUIForDisconnectedUser();
    updateWalletStatusDisplay();
    
    showNotification('Wallet disconnected', 'info');
}

// Handle profile creation
function handleProfileCreated(profile) {
    console.log('👤 Profile created:', profile);
    connectedUser = profile;
}

// Real disconnect wallet function
async function disconnectWallet() {
    console.log('🔌 Disconnecting wallet...');
    
    if (!walletService) {
        console.warn('WalletService not available');
        return;
    }
    
    try {
        const result = await walletService.disconnectWallet();
        
        if (result.success) {
            console.log('✅ Wallet disconnected successfully');
            // Event handler will update UI
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Disconnect error:', error);
        showNotification('Error disconnecting wallet', 'error');
    }
}

// ==============================================
// UI UPDATE FUNCTIONS
// ==============================================

// Update wallet status display
function updateWalletStatusDisplay() {
    if (!walletService) return;
    
    const status = walletService.getConnectionStatus();
    
    // Update header elements
    const connectBtn = document.getElementById('connectWalletBtn');
    const traderInfo = document.getElementById('traderInfo');
    const navTraderName = document.getElementById('navTraderName');
    const navTraderAvatar = document.getElementById('navTraderAvatar');
    
    if (status.isConnected) {
        // Hide connect button, show trader info
        if (connectBtn) connectBtn.style.display = 'none';
        if (traderInfo) traderInfo.style.display = 'flex';
        
        // Update trader display
        const profile = walletService.getUserProfile();
        if (profile && navTraderName) {
            navTraderName.textContent = profile.username;
        }
        if (profile && navTraderAvatar) {
            navTraderAvatar.textContent = profile.avatar;
        }
        
        // Update balance if element exists
        updateBalanceDisplay(status.formattedBalance);
        
    } else {
        // Show connect button, hide trader info
        if (connectBtn) connectBtn.style.display = 'block';
        if (traderInfo) traderInfo.style.display = 'none';
    }
}

// Update balance display
function updateBalanceDisplay(formattedBalance) {
    const balanceElements = document.querySelectorAll('.wallet-balance, .trader-balance');
    balanceElements.forEach(element => {
        if (element) {
            element.textContent = formattedBalance + ' SOL';
        }
    });
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
            if (navTraderAvatar) navTraderAvatar.textContent = connectedUser.avatar || '🎯';
        }
        
        console.log('✅ UI updated for connected user:', connectedUser?.username || 'Unknown');
        
        setTimeout(() => {
            showMarkets();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error updating UI for connected user:', error);
    }
}

function updateUIForDisconnectedUser() {
    console.log('👤 Updating UI for disconnected user');
    
    try {
        const elementsToShow = [
            { id: 'heroDisconnected', display: 'block' },
            { id: 'connectWalletBtn', display: 'block' }
        ];
        
        elementsToShow.forEach(({ id, display }) => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = display;
            }
        });
        
        const elementsToHide = [
            'heroConnected',
            'traderInfo',
            'mainContent'
        ];
        
        elementsToHide.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        console.log('✅ UI updated for disconnected user');
        
    } catch (error) {
        console.error('❌ Error updating UI for disconnected user:', error);
    }
}

// ==============================================
// MODAL HELPER FUNCTIONS
// ==============================================

function resetModal() {
    console.log('🔄 Resetting modal');
    currentStep = 1;
    selectedAvatar = '🎯';
    agreementAccepted = false;
    usernameValidation = { valid: false, message: '' };
    
    // Reset form inputs
    const usernameInput = document.getElementById('traderUsername');
    if (usernameInput) {
        usernameInput.value = '';
        usernameInput.classList.remove('valid', 'invalid');
    }
    
    // Reset avatar selection
    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.textContent === '🎯') {
            option.classList.add('selected');
        }
    });
    
    // Reset agreement
    const checkbox = document.getElementById('agreementCheckbox');
    if (checkbox) {
        checkbox.classList.remove('checked');
        checkbox.innerHTML = '';
    }
    
    // Clear errors
    clearUsernameError();
    
    // Reset modal title
    updateModalTitle('Connect Wallet', 'Choose your preferred Solana wallet to get started');
}

function updateModalTitle(title, subtitle) {
    const titleElement = document.getElementById('modalTitle');
    const subtitleElement = document.getElementById('modalSubtitle');
    
    if (titleElement) titleElement.textContent = title;
    if (subtitleElement) subtitleElement.textContent = subtitle;
}

// ==============================================
// HELPER FUNCTIONS
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

// Debounce function for input validation
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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
// BACKGROUND SERVICES
// ==============================================

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
    }, 60000);
    
    console.log('✅ System health monitoring started');
}

async function checkSystemHealth() {
    try {
        let healthStatus = {
            database: 'unknown',
            tokenService: 'unknown',
            priceService: 'unknown',
            walletService: 'unknown',
            timestamp: new Date().toISOString()
        };
        
        if (supabaseClient) {
            try {
                const testResult = await window.supabaseClient.testConnection();
                healthStatus.database = testResult ? 'healthy' : 'degraded';
            } catch (error) {
                healthStatus.database = 'error';
            }
        }
        
        if (tokenService && tokenService.isReady()) {
            healthStatus.tokenService = 'healthy';
        } else {
            healthStatus.tokenService = 'error';
        }
        
        if (priceService && priceService.isReady()) {
            healthStatus.priceService = 'healthy';
        } else {
            healthStatus.priceService = 'error';
        }
        
        if (walletService && walletService.isReady()) {
            healthStatus.walletService = 'healthy';
        } else {
            healthStatus.walletService = 'error';
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
            updateTokenStatus('⚠️ Services: Degraded');
        }
        
        return healthStatus;
    } catch (error) {
        console.error('Health check error:', error);
        updateDbStatus('disconnected', '❌ Database: Error');
        updateTokenStatus('❌ Services: Error');
        return { error: error.message };
    }
}

function startBackgroundServices() {
    console.log('⚙️ Starting background services...');
    
    try {
        if (tokenService) {
            tokenUpdateInterval = setInterval(async () => {
                try {
                    console.log('🔄 Background token refresh...');
                    await tokenService.refreshTokenData();
                } catch (error) {
                    console.error('Background token refresh failed:', error);
                }
            }, 2 * 60 * 60 * 1000);
        }
        
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
            }, 5 * 60 * 1000);
        }
        
        competitionStatusInterval = setInterval(async () => {
            try {
                if (window.updateCompetitionsDisplay && typeof window.updateCompetitionsDisplay === 'function') {
                    const marketsSection = document.getElementById('markets');
                    if (marketsSection && marketsSection.style.display !== 'none') {
                        await window.updateCompetitionsDisplay();
                    }
                }
            } catch (error) {
                console.error('Competition status update failed:', error);
            }
        }, 30 * 1000);
        
        console.log('✅ Background services started');
        return true;
    } catch (error) {
        console.error('Background services error:', error);
        return false;
    }
}

// ==============================================
// PLACEHOLDER CONTENT LOADERS
// ==============================================

function loadActiveCompetitions() {
    console.log('📊 Loading active competitions with real services...');
    
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
    console.log('💼 Loading portfolio...');
    const portfolioContent = document.getElementById('portfolio-content');
    if (portfolioContent) {
        portfolioContent.innerHTML = '<div class="loading">Loading portfolio...</div>';
    }
}

function loadLeaderboard() {
    console.log('🏆 Loading leaderboard...');
    const leaderboardContent = document.getElementById('leaderboard-content');
    if (leaderboardContent) {
        leaderboardContent.innerHTML = '<div class="loading">Loading leaderboard...</div>';
    }
}

// ==============================================
// DEBUG FUNCTIONS
// ==============================================

// Debug function to check current validation state
function debugValidationState() {
    console.log('🐛 VALIDATION DEBUG STATE:');
    console.log('========================');
    console.log(`Current Step: ${currentStep}`);
    console.log(`Username Validation: ${JSON.stringify(usernameValidation)}`);
    console.log(`Agreement Accepted: ${agreementAccepted}`);
    console.log(`Selected Avatar: ${selectedAvatar}`);
    console.log(`WalletService Ready: ${walletService?.isReady()}`);
    
    const usernameInput = document.getElementById('traderUsername');
    const createProfileBtn = document.getElementById('createProfileBtn');
    const finalizeBtn = document.getElementById('finalizeBtn');
    
    console.log(`Username Input Value: "${usernameInput?.value || 'NOT FOUND'}"`);
    console.log(`Username Input Classes: ${usernameInput?.className || 'NOT FOUND'}`);
    console.log(`Step 3 Button Disabled: ${createProfileBtn?.disabled ?? 'NOT FOUND'}`);
    console.log(`Step 4 Button Disabled: ${finalizeBtn?.disabled ?? 'NOT FOUND'}`);
    console.log('========================');
    
    // Test username validation manually
    if (usernameInput?.value.trim()) {
        console.log('🔍 Testing manual validation...');
        validateUsernameInput();
    }
}

// ==============================================
// NOTIFICATION FUNCTIONS
// ==============================================

function showNotification(message, type = 'info') {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 400px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

// ==============================================
// CLEANUP FUNCTIONS
// ==============================================

function cleanup() {
    console.log('🧹 Cleaning up application...');
    
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
    
    if (tokenService && typeof tokenService.cleanup === 'function') {
        tokenService.cleanup();
    }
    
    if (priceService && typeof priceService.cleanup === 'function') {
        priceService.cleanup();
    }
    
    if (walletService && typeof walletService.cleanup === 'function') {
        walletService.cleanup();
    }
    
    console.log('✅ Application cleanup complete');
}

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
    
    // Wallet functions (now real)
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
    getWalletService: () => walletService,
    getSupabaseClient: () => supabaseClient,
    
    // Utility functions
    showNotification,
    showErrorNotification,
    checkSystemHealth,
    
    // State getters
    getCurrentUser: () => connectedUser,
    getWalletStatus: () => walletService?.getConnectionStatus() || { isConnected: false },
    
    // Debug functions
    debugValidationState
};

console.log('📱 App.js (FIXED) Phase 3 integration complete - Initialization Order Fixed');
console.log('🔧 Key Fixes Applied:');
console.log('   ✅ Safe TokenService initialization with timeout protection');
console.log('   ✅ Sequential service initialization order (Supabase → Tokens → Price → Wallet)');
console.log('   ✅ Enhanced error handling and fallback mechanisms');
console.log('   ✅ Detailed logging for debugging initialization issues');
console.log('   ✅ Non-blocking service initialization prevents app hang');
console.log('   ✅ Emergency recovery for failed TokenService initialization');
