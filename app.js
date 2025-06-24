// Add these functions to your existing app.js file at the beginning

// ========================================
// WALLET CONNECTION MODAL FUNCTIONALITY
// ========================================

// Global state for modal
let currentStep = 1;
let selectedWallet = null;
let selectedAvatar = '🎯';
let traderData = {
    username: '',
    avatar: '🎯',
    wallet: '',
    walletType: ''
};

// Modal control functions
function openWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        checkWalletAvailability();
        goToStep(1);
    }
}

function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Navigation step functions
function goToStep(stepNum) {
    currentStep = stepNum;
    
    // Update step indicators
    for (let i = 1; i <= 5; i++) {
        const indicator = document.getElementById(`step${i}Indicator`);
        const content = document.getElementById(`step${i}Content`);
        
        if (indicator) {
            indicator.classList.remove('active', 'completed');
            if (i < stepNum) indicator.classList.add('completed');
            if (i === stepNum) indicator.classList.add('active');
        }
        
        if (content) {
            content.classList.remove('active');
            if (i === stepNum) content.classList.add('active');
        }
    }
    
    // Handle step 2.5
    const step2_5 = document.getElementById('step2_5Content');
    if (step2_5) {
        step2_5.classList.remove('active');
        if (stepNum === 2.5) step2_5.classList.add('active');
    }
    
    // Update modal title based on step
    updateModalTitle(stepNum);
}

// Update modal title
function updateModalTitle(step) {
    const title = document.getElementById('modalTitle');
    const subtitle = document.getElementById('modalSubtitle');
    
    switch (step) {
        case 1:
            title.textContent = 'Connect Wallet';
            subtitle.textContent = 'Choose your preferred Solana wallet to get started';
            break;
        case 2:
            title.textContent = 'Connecting...';
            subtitle.textContent = 'Please approve the connection in your wallet';
            break;
        case 2.5:
            title.textContent = 'Wallet Connected';
            subtitle.textContent = 'Confirming wallet details';
            break;
        case 3:
            title.textContent = 'Create Your Trader Profile';
            subtitle.textContent = 'Choose a unique username and avatar';
            break;
        case 4:
            title.textContent = 'Platform Rules';
            subtitle.textContent = 'Important information before you start';
            break;
        case 5:
            title.textContent = 'Welcome to TokenWars!';
            subtitle.textContent = 'You\'re ready to predict';
            break;
    }
}

// Check wallet availability
function checkWalletAvailability() {
    console.log('🔍 Checking wallet availability...');
    
    // Check Phantom
    if (window.solana && window.solana.isPhantom) {
        document.getElementById('phantomStatus').textContent = '✅ Ready';
        document.getElementById('phantomStatus').style.color = '#10b981';
    } else {
        document.getElementById('phantomStatus').textContent = '⚠️ Install Extension';
        document.getElementById('phantomStatus').style.color = '#f59e0b';
    }

    // Check Solflare
    if (window.solflare && window.solflare.isSolflare) {
        document.getElementById('solflareStatus').textContent = '✅ Ready';
        document.getElementById('solflareStatus').style.color = '#10b981';
    } else {
        document.getElementById('solflareStatus').textContent = '⚠️ Install Extension';
        document.getElementById('solflareStatus').style.color = '#f59e0b';
    }

    // Check Backpack
    if (window.backpack) {
        document.getElementById('backpackStatus').textContent = '✅ Ready';
        document.getElementById('backpackStatus').style.color = '#10b981';
    } else {
        document.getElementById('backpackStatus').textContent = '⚠️ Install Extension';
        document.getElementById('backpackStatus').style.color = '#f59e0b';
    }

    // Demo mode always available
    document.getElementById('demoStatus').textContent = '✓ Available';
    document.getElementById('demoStatus').style.color = '#8b5cf6';
}

// Select wallet
async function selectWallet(walletType) {
    selectedWallet = walletType;
    
    goToStep(2);
    
    const walletNames = {
        'phantom': 'Phantom',
        'solflare': 'Solflare', 
        'backpack': 'Backpack',
        'demo': 'Demo Mode'
    };
    
    document.getElementById('selectedWalletName').textContent = walletNames[walletType];
    
    try {
        // For demo mode, skip actual wallet connection
        if (walletType === 'demo') {
            // Generate demo wallet address
            const demoAddress = 'Demo' + Math.random().toString(36).substr(2, 9).toUpperCase();
            handleWalletConnection(walletType, demoAddress);
            return;
        }
        
        // Use existing connectWallet function
        const result = await connectWallet(walletType);
        
        if (result.success) {
            handleWalletConnection(walletType, result.publicKey);
        } else {
            throw new Error(result.error || 'Connection failed');
        }
        
    } catch (error) {
        console.error('Connection error:', error);
        showConnectionError(error.message);
    }
}

// Handle successful wallet connection
function handleWalletConnection(walletType, walletAddress) {
    traderData.wallet = walletAddress;
    traderData.walletType = walletType;
    
    // Show wallet confirmation step
    showWalletConfirmation(walletType, walletAddress);
    
    // Check for existing profile
    checkExistingProfile(walletAddress);
}

// Show wallet confirmation
function showWalletConfirmation(walletType, walletAddress) {
    goToStep(2.5);
    
    // Update wallet type
    document.getElementById('connectedWalletType').textContent = 
        walletType.charAt(0).toUpperCase() + walletType.slice(1);
    
    // Update wallet address
    document.getElementById('connectedWalletAddress').textContent = walletAddress;
    
    // Start checking for profile
    updateTraderStatus('checking', 'Checking for existing profile...');
}

// Check for existing trader profile
async function checkExistingProfile(walletAddress) {
    try {
        // Check localStorage or API for existing profile
        const savedProfile = localStorage.getItem(`trader_${walletAddress}`);
        
        if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            traderData.username = profile.username;
            traderData.avatar = profile.avatar;
            
            updateTraderStatus('found', `Profile "${profile.username}" found!`);
            showContinueButton('existing', 'Load My Profile');
        } else {
            updateTraderStatus('new', 'No profile found. Ready to create your trader profile!');
            showContinueButton('new', 'Create Profile');
        }
    } catch (error) {
        console.error('Profile check error:', error);
        updateTraderStatus('new', 'Ready to create your trader profile!');
        showContinueButton('new', 'Create Profile');
    }
}

// Update trader status
function updateTraderStatus(status, message) {
    const statusDiv = document.querySelector('.trader-status-check');
    const icon = document.getElementById('traderStatusIcon');
    const text = document.getElementById('traderStatusText');
    
    statusDiv.className = `trader-status-check ${status}`;
    text.textContent = message;
    
    switch (status) {
        case 'checking':
            icon.textContent = '🔍';
            break;
        case 'found':
            icon.textContent = '✅';
            break;
        case 'new':
            icon.textContent = '🌟';
            break;
    }
}

// Show continue button
function showContinueButton(type, buttonText) {
    const actions = document.getElementById('confirmationActions');
    const continueBtn = document.getElementById('continueBtn');
    
    if (actions) actions.style.display = 'flex';
    if (continueBtn) {
        continueBtn.textContent = buttonText;
        continueBtn.onclick = () => continueFromConfirmation(type);
    }
}

// Continue from confirmation
function continueFromConfirmation(type) {
    if (type === 'existing') {
        // Load existing profile
        completedOnboarding();
    } else {
        // Go to profile creation
        goToStep(3);
    }
}

// Update trader preview
function updateTraderPreview() {
    const usernameInput = document.getElementById('traderUsername');
    const username = usernameInput.value.trim();
    
    // Update trader data
    traderData.username = username;
    
    // Update preview
    document.getElementById('previewName').textContent = username || 'Trader Username';
    document.getElementById('previewAvatar').textContent = traderData.avatar;
    
    // Validate username
    const isValid = validateUsername(username);
    document.getElementById('createProfileBtn').disabled = !isValid;
}

// Validate username
function validateUsername(username) {
    if (username.length < 3 || username.length > 20) return false;
    return /^[a-zA-Z0-9_]+$/.test(username);
}

// Select avatar
function selectAvatar(avatar) {
    selectedAvatar = avatar;
    traderData.avatar = avatar;
    
    // Update avatar grid selection
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelector(`[data-avatar="${avatar}"]`).classList.add('selected');
    
    // Update preview
    updateTraderPreview();
}

// Toggle agreement checkbox
function toggleAgreement() {
    const checkbox = document.getElementById('agreementCheckbox');
    const finalizeBtn = document.getElementById('finalizeBtn');
    
    checkbox.classList.toggle('checked');
    finalizeBtn.disabled = !checkbox.classList.contains('checked');
}

// Finalize profile creation
async function finalizeProfile() {
    try {
        // Save profile
        const profile = {
            username: traderData.username,
            avatar: traderData.avatar,
            wallet: traderData.wallet,
            walletType: traderData.walletType,
            createdAt: new Date().toISOString()
        };
        
        // Save to localStorage
        localStorage.setItem(`trader_${traderData.wallet}`, JSON.stringify(profile));
        
        // Update app state
        AppState.wallet = traderData.wallet;
        AppState.username = traderData.username;
        AppState.isConnected = true;
        
        // Show success
        goToStep(5);
        
    } catch (error) {
        console.error('Profile creation error:', error);
        alert('Failed to create profile. Please try again.');
    }
}

// Complete onboarding
function completedOnboarding() {
    closeWalletModal();
    
    // Update UI to show connected state
    updateConnectedUI();
    
    // Show main content
    document.getElementById('heroDisconnected').style.display = 'none';
    document.getElementById('heroConnected').style.display = 'block';
    document.getElementById('mainContent').style.display = 'block';
    
    // Update nav
    document.getElementById('connectWalletBtn').style.display = 'none';
    document.getElementById('traderInfo').style.display = 'flex';
    document.getElementById('navTraderAvatar').textContent = traderData.avatar;
    document.getElementById('navTraderName').textContent = traderData.username;
    document.getElementById('heroTraderNameText').textContent = traderData.username;
    
    // Load initial data
    loadMarkets();
}

// Update connected UI
function updateConnectedUI() {
    // Update navigation
    document.getElementById('connectWalletBtn').style.display = 'none';
    document.getElementById('traderInfo').style.display = 'flex';
    document.getElementById('navTraderAvatar').textContent = traderData.avatar || '🎯';
    document.getElementById('navTraderName').textContent = traderData.username || 'Trader';
    
    // Update hero
    document.getElementById('heroDisconnected').style.display = 'none';
    document.getElementById('heroConnected').style.display = 'block';
    document.getElementById('heroTraderNameText').textContent = traderData.username || 'Trader';
}

// Show connection error
function showConnectionError(message) {
    goToStep(1);
    showNotification(`Connection Failed: ${message}`, 'error');
}

// ========================================
// MOBILE NAVIGATION
// ========================================

function initializeMobileNavigation() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const hamburger = document.querySelector('.hamburger');
    
    if (!mobileToggle || !navLinks || !hamburger) return;
    
    mobileToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = navLinks.classList.contains('active');
        if (isOpen) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    });
    
    const navLinksItems = navLinks.querySelectorAll('a');
    navLinksItems.forEach(link => {
        link.addEventListener('click', function() {
            closeMobileMenu();
        });
    });
    
    document.addEventListener('click', function(event) {
        const isClickInsideNav = navLinks.contains(event.target) || 
                                mobileToggle.contains(event.target);
        if (!isClickInsideNav && navLinks.classList.contains('active')) {
            closeMobileMenu();
        }
    });
}

function openMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const hamburger = document.querySelector('.hamburger');
    
    navLinks.classList.add('active');
    hamburger.classList.add('active');
    mobileToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const hamburger = document.querySelector('.hamburger');
    
    navLinks.classList.remove('active');
    hamburger.classList.remove('active');
    mobileToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}

// ========================================
// INITIALIZATION UPDATES
// ========================================

// Update your existing DOMContentLoaded event listener to include:
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 TokenWars initialized with new UI!');
    
    // Initialize mobile navigation
    initializeMobileNavigation();
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768) {
            closeMobileMenu();
        }
    });
    
    // Modal close handlers
    document.addEventListener('click', function(event) {
        const modal = document.getElementById('walletModal');
        if (event.target === modal) {
            closeWalletModal();
        }
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeWalletModal();
        }
    });
    
    // Check for saved session
    checkSavedSession();
});

// Check for saved session
function checkSavedSession() {
    const savedWallet = localStorage.getItem('connected_wallet');
    if (savedWallet) {
        const profile = localStorage.getItem(`trader_${savedWallet}`);
        if (profile) {
            const profileData = JSON.parse(profile);
            traderData = {
                username: profileData.username,
                avatar: profileData.avatar,
                wallet: savedWallet,
                walletType: profileData.walletType || 'unknown'
            };
            
            AppState.wallet = savedWallet;
            AppState.username = profileData.username;
            AppState.isConnected = true;
            
            updateConnectedUI();
            document.getElementById('mainContent').style.display = 'block';
        }
    }
}

// Update disconnectWallet function
async function disconnectWallet() {
    try {
        // Clear app state
        AppState.wallet = null;
        AppState.isConnected = false;
        AppState.username = null;
        
        // Clear saved session
        localStorage.removeItem('connected_wallet');
        
        // Reset UI
        document.getElementById('connectWalletBtn').style.display = 'block';
        document.getElementById('traderInfo').style.display = 'none';
        document.getElementById('heroDisconnected').style.display = 'block';
        document.getElementById('heroConnected').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
        
        // Reset trader data
        traderData = {
            username: '',
            avatar: '🎯',
            wallet: '',
            walletType: ''
        };
        
        showNotification('Wallet disconnected', 'info');
        
    } catch (error) {
        console.error('Disconnect error:', error);
        showNotification('Error disconnecting wallet', 'error');
    }
}
