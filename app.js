// Main Application Logic with Supabase Integration
// This file handles wallet connection, user authentication, and app initialization

// Global state
let walletProvider = null;
let connectedWallet = null;
let currentUser = null;
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
        
        console.log('App initialization complete');
    } catch (error) {
        console.error('App initialization failed:', error);
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
    document.getElementById('traderUsername').value = '';
    document.getElementById('agreementCheckbox').classList.remove('checked');
    document.getElementById('createProfileBtn').disabled = true;
    document.getElementById('finalizeBtn').disabled = true;
    
    // Reset avatar selection
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelector('[data-avatar="🎯"]').classList.add('selected');
    
    updateTraderPreview();
}

// Select wallet type
async function selectWallet(walletType) {
    console.log('Selecting wallet:', walletType);
    
    document.getElementById('selectedWalletName').textContent = 
        walletType.charAt(0).toUpperCase() + walletType.slice(1);
    document.getElementById('connectedWalletType').textContent = 
        walletType.charAt(0).toUpperCase() + walletType.slice(1);
    
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
        document.getElementById('connectedWalletAddress').textContent = 
            formatWalletAddress(connectedWallet.address);
        
        goToStep(2.5); // Wallet confirmation step
        
        // Check if user exists in database
        document.getElementById('traderStatusText').textContent = 'Checking for existing profile...';
        
        const existingUser = await window.supabaseClient.getOrCreateUser(connectedWallet.address);
        
        if (existingUser) {
            // User exists, complete login
            currentUser = existingUser;
            document.getElementById('traderStatusIcon').textContent = '✅';
            document.getElementById('traderStatusText').textContent = `Welcome back, ${existingUser.username}!`;
            document.getElementById('continueBtn').textContent = 'Continue to Dashboard';
            document.getElementById('continueBtn').onclick = completedOnboarding;
        } else {
            // New user, needs profile creation
            document.getElementById('traderStatusIcon').textContent = '🎯';
            document.getElementById('traderStatusText').textContent = 'No profile found. Let\'s create one!';
            document.getElementById('continueBtn').textContent = 'Create Profile';
            document.getElementById('continueBtn').onclick = () => goToStep(3);
        }
        
        // Show confirmation actions
        document.getElementById('confirmationActions').style.display = 'flex';
        
    } catch (error) {
        console.error('Error handling wallet connection:', error);
        showErrorNotification('Failed to connect to database');
        goToStep(1);
    }
}

// Continue from confirmation step
function continueFromConfirmation() {
    if (currentUser) {
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
    const username = document.getElementById('traderUsername').value || 'Trader Username';
    const avatar = selectedAvatar || '🎯';
    
    document.getElementById('previewName').textContent = username;
    document.getElementById('previewAvatar').textContent = avatar;
    
    // Validate username and enable/disable button
    const isValid = validateUsername(username);
    const createBtn = document.getElementById('createProfileBtn');
    createBtn.disabled = !isValid;
    
    if (isValid && username !== 'Trader Username') {
        createBtn.disabled = false;
    } else {
        createBtn.disabled = true;
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
    document.querySelector(`[data-avatar="${emoji}"]`).classList.add('selected');
    
    updateTraderPreview();
}

// Toggle agreement checkbox
function toggleAgreement() {
    agreementAccepted = !agreementAccepted;
    
    const checkbox = document.getElementById('agreementCheckbox');
    const finalizeBtn = document.getElementById('finalizeBtn');
    
    if (agreementAccepted) {
        checkbox.classList.add('checked');
        finalizeBtn.disabled = false;
    } else {
        checkbox.classList.remove('checked');
        finalizeBtn.disabled = true;
    }
}

// Finalize profile creation
async function finalizeProfile() {
    const username = document.getElementById('traderUsername').value;
    
    if (!validateUsername(username)) {
        showErrorNotification('Please enter a valid username');
        return;
    }
    
    if (!agreementAccepted) {
        showErrorNotification('Please accept the platform rules');
        return;
    }
    
    try {
        document.getElementById('finalizeBtn').disabled = true;
        document.getElementById('finalizeBtn').textContent = 'Creating Profile...';
        
        // Check username availability
        const isAvailable = await window.supabaseClient.checkUsernameAvailability(username);
        if (!isAvailable) {
            throw new Error('Username is already taken');
        }
        
        // Create user profile
        currentUser = await window.supabaseClient.createUserProfile(
            connectedWallet.address,
            username,
            selectedAvatar
        );
        
        console.log('User profile created:', currentUser);
        goToStep(5);
        
    } catch (error) {
        console.error('Profile creation failed:', error);
        showErrorNotification(`Failed to create profile: ${error.message}`);
        document.getElementById('finalizeBtn').disabled = false;
        document.getElementById('finalizeBtn').textContent = 'Join TokenWars';
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
    document.getElementById('heroDisconnected').style.display = 'none';
    document.getElementById('connectWalletBtn').style.display = 'none';
    
    // Show connected state
    document.getElementById('heroConnected').style.display = 'block';
    document.getElementById('traderInfo').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'block';
    
    // Update user info in navigation
    document.getElementById('navTraderName').textContent = currentUser.username;
    document.getElementById('navTraderAvatar').textContent = selectedAvatar;
    
    // Update hero welcome message
    document.getElementById('heroTraderNameText').textContent = currentUser.username;
    
    console.log('UI updated for connected user:', currentUser.username);
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
        displayCompetitions(competitions);
    } catch (error) {
        console.error('Failed to load competitions:', error);
        document.getElementById('competitions-grid').innerHTML = 
            '<div class="error-message">Failed to load competitions</div>';
    }
}

// Load user portfolio
async function loadUserPortfolio() {
    if (!currentUser) return;
    
    try {
        const [bets, leaderboardPos] = await Promise.all([
            window.supabaseClient.getUserBets(currentUser.wallet_address),
            window.supabaseClient.getUserLeaderboardPosition(currentUser.wallet_address)
        ]);
        
        displayUserPortfolio(bets, leaderboardPos);
    } catch (error) {
        console.error('Failed to load portfolio:', error);
        document.getElementById('portfolio-content').innerHTML = 
            '<div class="error-message">Failed to load portfolio</div>';
    }
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const leaderboard = await window.supabaseClient.getLeaderboard();
        displayLeaderboard(leaderboard);
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        document.getElementById('leaderboard-content').innerHTML = 
            '<div class="error-message">Failed to load leaderboard</div>';
    }
}

// ==============================================
// REAL-TIME SUBSCRIPTIONS
// ==============================================

// Set up real-time subscriptions
function setupRealtimeSubscriptions() {
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
        document.getElementById('step2Indicator').classList.add('active');
    } else {
        stepElement = document.getElementById(`step${step}Content`);
        document.getElementById(`step${step}Indicator`).classList.add('active');
    }
    
    if (stepElement) {
        stepElement.classList.add('active');
        currentStep = step;
    }
}

// Show different sections
function showMarkets() {
    hideAllSections();
    document.getElementById('markets').style.display = 'block';
    updateActiveNavLink('markets');
}

function showCompetitions() {
    showMarkets(); // Same as markets for now
}

function showLeaderboard() {
    hideAllSections();
    document.getElementById('leaderboard').style.display = 'block';
    updateActiveNavLink('leaderboard');
}

function showPortfolio() {
    hideAllSections();
    document.getElementById('portfolio').style.display = 'block';
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
        await window.supabaseClient.clearUserContext();
        
        // Disconnect from wallet provider
        if (walletProvider && walletProvider.disconnect) {
            await walletProvider.disconnect();
        }
        
        // Clear local state
        connectedWallet = null;
        currentUser = null;
        walletProvider = null;
        
        // Clear local storage
        localStorage.removeItem('tokenWars_lastWallet');
        localStorage.removeItem('tokenWars_demoAddress');
        
        // Reset UI
        document.getElementById('heroDisconnected').style.display = 'block';
        document.getElementById('heroConnected').style.display = 'none';
        document.getElementById('connectWalletBtn').style.display = 'block';
        document.getElementById('traderInfo').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
        
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

// Make functions globally available
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
    getCurrentUser: () => currentUser,
    getConnectedWallet: () => connectedWallet
};
