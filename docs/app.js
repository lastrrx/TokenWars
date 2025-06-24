// Main Application Logic with Supabase Integration
// This file handles wallet connection, user authentication, and app initialization

// Global state - using unique variable names to avoid conflicts
let walletProvider = null;
let connectedWallet = null;
let appCurrentUser = null; // Changed from currentUser to avoid conflicts
let currentStep = 1;
let selectedAvatar = '🎯';
let agreementAccepted = false;

// Initialize the application
async function initializeApp() {
    console.log('Initializing TokenWars app...');
    
    try {
        // Check if user was previously connected
        const lastWallet = localStorage.getItem('tokenWars_lastWallet');
        if (lastWallet) {
            console.log('Attempting to reconnect to last wallet:', lastWallet);
            // Try to reconnect automatically
            setTimeout(() => selectWallet(lastWallet), 1000);
        }
        
        // Initialize wallet status checking
        updateWalletStatus();
        
        // Set up periodic wallet status updates
        setInterval(updateWalletStatus, 5000);
        
        console.log('TokenWars app initialization complete');
    } catch (error) {
        console.error('TokenWars app initialization failed:', error);
        showErrorNotification('Failed to initialize application');
    }
}

// Update wallet availability status
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

// ==============================================
// WALLET CONNECTION FUNCTIONS
// ==============================================

// Open wallet connection modal
function openWalletModal() {
    document.getElementById('walletModal').style.display = 'flex';
    goToStep(1);
    updateWalletStatus();
}

// Close wallet connection modal
function closeWalletModal() {
    document.getElementById('walletModal').style.display = 'none';
    resetModal();
}

// Reset modal to initial state
function resetModal() {
    currentStep = 1;
    selectedAvatar = '🎯';
    agreementAccepted = false;
    
    // Reset form inputs
    const usernameInput = document.getElementById('traderUsername');
    const agreementCheckbox = document.getElementById('agreementCheckbox');
    const createBtn = document.getElementById('createProfileBtn');
    const finalizeBtn = document.getElementById('finalizeBtn');
    
    if (usernameInput) usernameInput.value = '';
    if (agreementCheckbox) agreementCheckbox.classList.remove('checked');
    if (createBtn) createBtn.disabled = true;
    if (finalizeBtn) finalizeBtn.disabled = true;
    
    // Reset avatar selection
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.classList.remove('selected');
    });
    const defaultAvatar = document.querySelector('[data-avatar="🎯"]');
    if (defaultAvatar) defaultAvatar.classList.add('selected');
    
    updateTraderPreview();
}

// Select wallet type
async function selectWallet(walletType) {
    console.log('Selecting wallet:', walletType);
    
    const selectedNameEl = document.getElementById('selectedWalletName');
    const connectedTypeEl = document.getElementById('connectedWalletType');
    
    if (selectedNameEl) {
        selectedNameEl.textContent = walletType.charAt(0).toUpperCase() + walletType.slice(1);
    }
    if (connectedTypeEl) {
        connectedTypeEl.textContent = walletType.charAt(0).toUpperCase() + walletType.slice(1);
    }
    
    goToStep(2);
    
    try {
        if (walletType === 'demo') {
            await connectDemoWallet();
        } else {
            await connectRealWallet(walletType);
        }
    } catch (error) {
        console.error('Wallet connection failed:', error);
        showErrorNotification(`Failed to connect to ${walletType} wallet: ${error.message}`);
        goToStep(1);
    }
}

// Connect to demo wallet (for testing)
async function connectDemoWallet() {
    try {
        // Generate a demo wallet address
        const demoAddress = 'DEMO' + Math.random().toString(36).substring(2, 15).toUpperCase();
        
        connectedWallet = {
            address: demoAddress,
            provider: 'demo'
        };
        
        localStorage.setItem('tokenWars_lastWallet', 'demo');
        localStorage.setItem('tokenWars_demoAddress', demoAddress);
        
        await handleWalletConnection();
    } catch (error) {
        console.error('Demo wallet connection failed:', error);
        throw error;
    }
}

// Connect to real Solana wallet
async function connectRealWallet(walletType) {
    try {
        let provider;
        
        switch (walletType) {
            case 'phantom':
                if (!window.phantom?.solana) {
                    throw new Error('Phantom wallet not installed');
                }
                provider = window.phantom.solana;
                break;
                
            case 'solflare':
                if (!window.solflare) {
                    throw new Error('Solflare wallet not installed');
                }
                provider = window.solflare;
                break;
                
            case 'backpack':
                if (!window.backpack) {
                    throw new Error('Backpack wallet not installed');
                }
                provider = window.backpack;
                break;
                
            default:
                throw new Error('Unsupported wallet type');
        }
        
        // Connect to wallet
        const response = await provider.connect();
        
        connectedWallet = {
            address: response.publicKey.toString(),
            provider: walletType,
            providerObject: provider
        };
        
        walletProvider = provider;
        localStorage.setItem('tokenWars_lastWallet', walletType);
        
        await handleWalletConnection();
    } catch (error) {
        console.error('Real wallet connection failed:', error);
        throw error;
    }
}

// Handle successful wallet connection
async function handleWalletConnection() {
    try {
        console.log('Wallet connected:', connectedWallet.address);
        
        // Update UI with wallet address
        const addressEl = document.getElementById('connectedWalletAddress');
        if (addressEl) {
            addressEl.textContent = formatWalletAddress(connectedWallet.address);
        }
        
        goToStep(2.5); // Wallet confirmation step
        
        // Check if user exists in database
        const statusTextEl = document.getElementById('traderStatusText');
        if (statusTextEl) {
            statusTextEl.textContent = 'Checking for existing profile...';
        }
        
        // Check if supabaseClient is available
        if (!window.supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        const existingUser = await window.supabaseClient.getOrCreateUser(connectedWallet.address);
        
        const statusIconEl = document.getElementById('traderStatusIcon');
        const continueBtnEl = document.getElementById('continueBtn');
        
        if (existingUser) {
            // User exists, complete login
            appCurrentUser = existingUser;
            if (statusIconEl) statusIconEl.textContent = '✅';
            if (statusTextEl) statusTextEl.textContent = `Welcome back, ${existingUser.username}!`;
            if (continueBtnEl) {
                continueBtnEl.textContent = 'Continue to Dashboard';
                continueBtnEl.onclick = completedOnboarding;
            }
        } else {
            // New user, needs profile creation
            if (statusIconEl) statusIconEl.textContent = '🎯';
            if (statusTextEl) statusTextEl.textContent = 'No profile found. Let\'s create one!';
            if (continueBtnEl) {
                continueBtnEl.textContent = 'Create Profile';
                continueBtnEl.onclick = () => goToStep(3);
            }
        }
        
        // Show confirmation actions
        const confirmationActionsEl = document.getElementById('confirmationActions');
        if (confirmationActionsEl) {
            confirmationActionsEl.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Error handling wallet connection:', error);
        showErrorNotification('Failed to connect to database');
        goToStep(1);
    }
}

// Continue from confirmation step
function continueFromConfirmation() {
    if (appCurrentUser) {
        // Existing user
        completedOnboarding();
    } else {
        // New user
        goToStep(3);
    }
}

// ==============================================
// USER PROFILE CREATION
// ==============================================

// Update trader preview
function updateTraderPreview() {
    const usernameInput = document.getElementById('traderUsername');
    const previewNameEl = document.getElementById('previewName');
    const previewAvatarEl = document.getElementById('previewAvatar');
    const createBtn = document.getElementById('createProfileBtn');
    
    const username = usernameInput?.value || 'Trader Username';
    const avatar = selectedAvatar || '🎯';
    
    if (previewNameEl) previewNameEl.textContent = username;
    if (previewAvatarEl) previewAvatarEl.textContent = avatar;
    
    // Validate username and enable/disable button
    const isValid = validateUsername(username);
    if (createBtn) {
        createBtn.disabled = !isValid || username === 'Trader Username';
    }
}

// Validate username
function validateUsername(username) {
    if (!username || username === 'Trader Username') return false;
    if (username.length < 3 || username.length > 20) return false;
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return false;
    return true;
}

// Select avatar
function selectAvatar(emoji) {
    selectedAvatar = emoji;
    
    // Update UI
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.classList.remove('selected');
    });
    const selectedOption = document.querySelector(`[data-avatar="${emoji}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    updateTraderPreview();
}

// Toggle agreement checkbox
function toggleAgreement() {
    agreementAccepted = !agreementAccepted;
    
    const checkbox = document.getElementById('agreementCheckbox');
    const finalizeBtn = document.getElementById('finalizeBtn');
    
    if (checkbox && finalizeBtn) {
        if (agreementAccepted) {
            checkbox.classList.add('checked');
            finalizeBtn.disabled = false;
        } else {
            checkbox.classList.remove('checked');
            finalizeBtn.disabled = true;
        }
    }
}

// Finalize profile creation
async function finalizeProfile() {
    const usernameInput = document.getElementById('traderUsername');
    const username = usernameInput?.value;
    
    if (!validateUsername(username)) {
        showErrorNotification('Please enter a valid username');
        return;
    }
    
    if (!agreementAccepted) {
        showErrorNotification('Please accept the platform rules');
        return;
    }
    
    try {
        const finalizeBtn = document.getElementById('finalizeBtn');
        if (finalizeBtn) {
            finalizeBtn.disabled = true;
            finalizeBtn.textContent = 'Creating Profile...';
        }
        
        // Check username availability
        const isAvailable = await window.supabaseClient.checkUsernameAvailability(username);
        if (!isAvailable) {
            throw new Error('Username is already taken');
        }
        
        // Create user profile
        appCurrentUser = await window.supabaseClient.createUserProfile(
            connectedWallet.address,
            username,
            selectedAvatar
        );
        
        console.log('User profile created:', appCurrentUser);
        goToStep(5);
        
    } catch (error) {
        console.error('Profile creation failed:', error);
        showErrorNotification(`Failed to create profile: ${error.message}`);
        const finalizeBtn = document.getElementById('finalizeBtn');
        if (finalizeBtn) {
            finalizeBtn.disabled = false;
            finalizeBtn.textContent = 'Join TokenWars';
        }
    }
}

// Complete onboarding process
function completedOnboarding() {
    closeWalletModal();
    updateUIForConnectedUser();
    loadUserDashboard();
}

// ==============================================
// UI UPDATE FUNCTIONS
// ==============================================

// Update UI for connected user
function updateUIForConnectedUser() {
    // Hide disconnected state
    const heroDisconnected = document.getElementById('heroDisconnected');
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    
    if (heroDisconnected) heroDisconnected.style.display = 'none';
    if (connectWalletBtn) connectWalletBtn.style.display = 'none';
    
    // Show connected state
    const heroConnected = document.getElementById('heroConnected');
    const traderInfo = document.getElementById('traderInfo');
    const mainContent = document.getElementById('mainContent');
    
    if (heroConnected) heroConnected.style.display = 'block';
    if (traderInfo) traderInfo.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'block';
    
    // Update user info in navigation
    const navTraderName = document.getElementById('navTraderName');
    const navTraderAvatar = document.getElementById('navTraderAvatar');
    const heroTraderNameText = document.getElementById('heroTraderNameText');
    
    if (appCurrentUser) {
        if (navTraderName) navTraderName.textContent = appCurrentUser.username;
        if (navTraderAvatar) navTraderAvatar.textContent = selectedAvatar;
        if (heroTraderNameText) heroTraderNameText.textContent = appCurrentUser.username;
    }
    
    console.log('UI updated for connected user:', appCurrentUser?.username);
}

// Load user dashboard
async function loadUserDashboard() {
    try {
        // Load initial data
        await Promise.all([
            loadActiveCompetitions(),
            loadUserPortfolio(),
            loadLeaderboard()
        ]);
        
        // Set up real-time subscriptions
        setupRealtimeSubscriptions();
        
        console.log('User dashboard loaded');
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showErrorNotification('Failed to load dashboard data');
    }
}

// Load active competitions
async function loadActiveCompetitions() {
    try {
        const competitions = await window.supabaseClient.getActiveCompetitions();
        if (window.competition && window.competition.displayCompetitions) {
            window.competition.displayCompetitions(competitions);
        }
    } catch (error) {
        console.error('Failed to load competitions:', error);
        const gridEl = document.getElementById('competitions-grid');
        if (gridEl) {
            gridEl.innerHTML = '<div class="error-message">Failed to load competitions</div>';
        }
    }
}

// Load user portfolio
async function loadUserPortfolio() {
    if (!appCurrentUser) return;
    
    try {
        const [bets, leaderboardPos] = await Promise.all([
            window.supabaseClient.getUserBets(appCurrentUser.wallet_address),
            window.supabaseClient.getUserLeaderboardPosition(appCurrentUser.wallet_address)
        ]);
        
        if (window.user && window.user.displayUserPortfolio) {
            window.user.displayUserPortfolio(bets, leaderboardPos);
        }
    } catch (error) {
        console.error('Failed to load portfolio:', error);
        const portfolioEl = document.getElementById('portfolio-content');
        if (portfolioEl) {
            portfolioEl.innerHTML = '<div class="error-message">Failed to load portfolio</div>';
        }
    }
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const leaderboard = await window.supabaseClient.getLeaderboard();
        if (window.user && window.user.displayLeaderboard) {
            window.user.displayLeaderboard(leaderboard);
        }
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        const leaderboardEl = document.getElementById('leaderboard-content');
        if (leaderboardEl) {
            leaderboardEl.innerHTML = '<div class="error-message">Failed to load leaderboard</div>';
        }
    }
}

// ==============================================
// REAL-TIME SUBSCRIPTIONS
// ==============================================

// Set up real-time subscriptions
function setupRealtimeSubscriptions() {
    if (!window.supabaseClient) return;
    
    // Subscribe to competition updates
    window.supabaseClient.subscribeToCompetitions((payload) => {
        console.log('Competition update:', payload);
        loadActiveCompetitions(); // Refresh competitions
    });
    
    // Subscribe to leaderboard updates
    window.supabaseClient.subscribeToLeaderboard((payload) => {
        console.log('Leaderboard update:', payload);
        loadLeaderboard(); // Refresh leaderboard
    });
}

// ==============================================
// NAVIGATION FUNCTIONS
// ==============================================

// Go to specific step in modal
function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Hide all step indicators
    document.querySelectorAll('.step-indicator').forEach(indicator => {
        indicator.classList.remove('active');
    });
    
    // Show current step
    let stepElement;
    if (step === 2.5) {
        stepElement = document.getElementById('step2_5Content');
        const step2Indicator = document.getElementById('step2Indicator');
        if (step2Indicator) step2Indicator.classList.add('active');
    } else {
        stepElement = document.getElementById(`step${step}Content`);
        const stepIndicator = document.getElementById(`step${step}Indicator`);
        if (stepIndicator) stepIndicator.classList.add('active');
    }
    
    if (stepElement) {
        stepElement.classList.add('active');
        currentStep = step;
    }
}

// Show different sections
function showMarkets() {
    hideAllSections();
    const marketsEl = document.getElementById('markets');
    if (marketsEl) marketsEl.style.display = 'block';
    updateActiveNavLink('markets');
}

function showCompetitions() {
    showMarkets(); // Same as markets for now
}

function showLeaderboard() {
    hideAllSections();
    const leaderboardEl = document.getElementById('leaderboard');
    if (leaderboardEl) leaderboardEl.style.display = 'block';
    updateActiveNavLink('leaderboard');
}

function showPortfolio() {
    hideAllSections();
    const portfolioEl = document.getElementById('portfolio');
    if (portfolioEl) portfolioEl.style.display = 'block';
    updateActiveNavLink('portfolio');
}

function hideAllSections() {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
}

function updateActiveNavLink(activeSection) {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[href="#${activeSection}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// ==============================================
// WALLET DISCONNECT
// ==============================================

// Disconnect wallet
async function disconnectWallet() {
    try {
        // Clear user context in database
        if (window.supabaseClient) {
            await window.supabaseClient.clearUserContext();
        }
        
        // Disconnect from wallet provider
        if (walletProvider && walletProvider.disconnect) {
            await walletProvider.disconnect();
        }
        
        // Clear local state
        connectedWallet = null;
        appCurrentUser = null;
        walletProvider = null;
        
        // Clear local storage
        localStorage.removeItem('tokenWars_lastWallet');
        localStorage.removeItem('tokenWars_demoAddress');
        
        // Reset UI
        const heroDisconnected = document.getElementById('heroDisconnected');
        const heroConnected = document.getElementById('heroConnected');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        const traderInfo = document.getElementById('traderInfo');
        const mainContent = document.getElementById('mainContent');
        
        if (heroDisconnected) heroDisconnected.style.display = 'block';
        if (heroConnected) heroConnected.style.display = 'none';
        if (connectWalletBtn) connectWalletBtn.style.display = 'block';
        if (traderInfo) traderInfo.style.display = 'none';
        if (mainContent) mainContent.style.display = 'none';
        
        console.log('Wallet disconnected successfully');
        showNotification('Wallet disconnected', 'success');
        
    } catch (error) {
        console.error('Error disconnecting wallet:', error);
        showErrorNotification('Failed to disconnect wallet');
    }
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

// Format wallet address for display
function formatWalletAddress(address) {
    if (!address) return '';
    if (address.startsWith('DEMO')) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

// Show error notification
function showErrorNotification(message) {
    showNotification(message, 'error');
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '2rem',
        right: '2rem',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        minWidth: '300px',
        maxWidth: '500px'
    });
    
    // Set background color based on type
    if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    } else if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    }
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// ==============================================
// GLOBAL EXPORTS
// ==============================================

// Make functions globally available for HTML onclick handlers
window.initializeApp = initializeApp;
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
window.showMarkets = showMarkets;
window.showCompetitions = showCompetitions;
window.showLeaderboard = showLeaderboard;
window.showPortfolio = showPortfolio;

// App object for accessing internal state
window.app = {
    initializeApp,
    openWalletModal,
    closeWalletModal,
    selectWallet,
    goToStep,
    continueFromConfirmation,
    updateTraderPreview,
    selectAvatar,
    toggleAgreement,
    finalizeProfile,
    completedOnboarding,
    disconnectWallet,
    showMarkets,
    showCompetitions,
    showLeaderboard,
    showPortfolio,
    getCurrentUser: () => appCurrentUser,
    getConnectedWallet: () => connectedWallet,
    loadActiveCompetitions,
    loadUserPortfolio,
    loadLeaderboard
};
