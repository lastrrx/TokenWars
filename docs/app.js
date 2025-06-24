// Main Application Logic with Enhanced Token Integration
// This file handles wallet connection, user authentication, app initialization, and token management

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

// Initialize the application
async function initializeApp() {
    console.log('Initializing TokenWars app with token integration...');
    
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
        
        // Initialize token management system
        await initializeTokenSystem();
        
        // Start background services
        startBackgroundServices();
        
        console.log('App initialization complete with token system');
    } catch (error) {
        console.error('App initialization failed:', error);
        showErrorNotification('Failed to initialize application');
    }
}

// Initialize token management system
async function initializeTokenSystem() {
    try {
        console.log('Initializing token management system...');
        
        // Check if token list needs updating
        const shouldUpdate = await shouldUpdateTokens();
        
        if (shouldUpdate) {
            console.log('Token list needs updating...');
            showNotification('Updating token list for better predictions...', 'info');
            
            // Update tokens in background
            updateTokensInBackground();
        } else {
            console.log('Token list is up to date');
        }
        
        // Load any existing competitions with real-time data
        await loadCompetitionsWithTokenData();
        
    } catch (error) {
        console.error('Token system initialization failed:', error);
        // Don't fail the entire app if token system has issues
        console.log('Continuing with basic functionality...');
    }
}

// Check if tokens need updating
async function shouldUpdateTokens() {
    try {
        const tokens = await window.tokenService.getValidTokens();
        const updateInterval = window.APP_CONFIG.UPDATE_INTERVALS.TOKEN_LIST_REFRESH;
        
        // Check if we have no tokens or if it's been too long since last update
        if (tokens.length === 0) {
            return true;
        }
        
        // Check last update time
        if (window.tokenService.lastTokenUpdate) {
            const timeSinceUpdate = Date.now() - window.tokenService.lastTokenUpdate.getTime();
            return timeSinceUpdate > updateInterval;
        }
        
        return true; // Default to updating if we can't determine
    } catch (error) {
        console.error('Error checking token update status:', error);
        return false;
    }
}

// Update tokens in background without blocking UI
async function updateTokensInBackground() {
    try {
        // Start token update process
        const tokens = await window.tokenService.updateTokenList();
        
        if (tokens && tokens.length > 0) {
            console.log(`Updated ${tokens.length} tokens successfully`);
            showNotification(`Updated ${tokens.length} tokens for better predictions!`, 'success');
            
            // Generate new token pairs
            const pairs = window.tokenService.generateTokenPairs(tokens);
            console.log(`Generated ${pairs.length} token pairs`);
            
            // Store pairs in database
            await window.supabaseClient.storeTokenPairs(pairs);
            
            // Refresh competitions if user is connected
            if (connectedUser) {
                await loadActiveCompetitions();
            }
        }
        
    } catch (error) {
        console.error('Background token update failed:', error);
        showNotification('Token update encountered issues, but app is still functional', 'warning');
    }
}

// Load competitions with enhanced token data
async function loadCompetitionsWithTokenData() {
    try {
        const competitions = await window.supabaseClient.getActiveCompetitions();
        
        if (competitions && competitions.length > 0) {
            // Enhance competitions with real-time price data
            const enhancedCompetitions = await Promise.all(
                competitions.map(async (competition) => {
                    try {
                        // Get current market data for both tokens
                        const [tokenAData, tokenBData] = await Promise.all([
                            competition.token_a_address ? 
                                window.priceService.getMarketData(competition.token_a_address) : null,
                            competition.token_b_address ? 
                                window.priceService.getMarketData(competition.token_b_address) : null
                        ]);
                        
                        return {
                            ...competition,
                            token_a_market_data: tokenAData,
                            token_b_market_data: tokenBData
                        };
                    } catch (error) {
                        console.warn(`Failed to get market data for competition ${competition.competition_id}:`, error);
                        return competition;
                    }
                })
            );
            
            // Display enhanced competitions
            if (window.competition?.displayCompetitions) {
                window.competition.displayCompetitions(enhancedCompetitions);
            }
        }
        
    } catch (error) {
        console.error('Failed to load competitions with token data:', error);
        // Fallback to basic competition loading
        if (window.competition?.displayCompetitions) {
            const basicCompetitions = await window.supabaseClient.getActiveCompetitions();
            window.competition.displayCompetitions(basicCompetitions || []);
        }
    }
}

// Start background services for real-time updates
function startBackgroundServices() {
    console.log('Starting background services...');
    
    // Token list refresh (every hour)
    tokenUpdateInterval = setInterval(async () => {
        console.log('Performing scheduled token list update...');
        await updateTokensInBackground();
    }, window.APP_CONFIG.UPDATE_INTERVALS.TOKEN_LIST_REFRESH);
    
    // Price updates for active competitions (every minute)
    priceUpdateInterval = setInterval(async () => {
        await updateActivePrices();
    }, window.APP_CONFIG.UPDATE_INTERVALS.PRICE_UPDATES);
    
    // Competition status updates (every 30 seconds)
    competitionStatusInterval = setInterval(async () => {
        await updateCompetitionStatuses();
    }, window.APP_CONFIG.UPDATE_INTERVALS.COMPETITION_STATUS);
    
    console.log('Background services started successfully');
}

// Update prices for active competitions
async function updateActivePrices() {
    try {
        // Only update if we have active competitions visible
        const competitionCards = document.querySelectorAll('.competition-card');
        if (competitionCards.length === 0) return;
        
        // Collect unique token addresses from visible competitions
        const tokenAddresses = new Set();
        competitionCards.forEach(card => {
            const tokenAAddress = card.querySelector('[data-token="token_a"]')?.getAttribute('data-address');
            const tokenBAddress = card.querySelector('[data-token="token_b"]')?.getAttribute('data-address');
            
            if (tokenAAddress) tokenAddresses.add(tokenAAddress);
            if (tokenBAddress) tokenAddresses.add(tokenBAddress);
        });
        
        if (tokenAddresses.size === 0) return;
        
        // Get current prices for all tokens
        const priceResults = await window.priceService.getCurrentPrices([...tokenAddresses]);
        
        // Update prices in the UI
        priceResults.forEach(result => {
            if (result.success) {
                updateTokenPricesInUI(result.address, result.price);
            }
        });
        
    } catch (error) {
        console.warn('Price update cycle failed:', error);
    }
}

// Update token prices in the UI
function updateTokenPricesInUI(tokenAddress, price) {
    // Find all elements displaying this token's price
    const tokenElements = document.querySelectorAll(`[data-address="${tokenAddress}"]`);
    
    tokenElements.forEach(tokenElement => {
        const priceElement = tokenElement.querySelector('.token-price[data-price]');
        if (priceElement) {
            const oldPrice = parseFloat(priceElement.getAttribute('data-price'));
            const newPrice = parseFloat(price);
            
            // Update price display
            priceElement.textContent = `$${formatPrice(newPrice)}`;
            priceElement.setAttribute('data-price', newPrice);
            
            // Add visual indicator for price changes
            if (oldPrice && oldPrice !== newPrice) {
                const changeClass = newPrice > oldPrice ? 'price-increase' : 'price-decrease';
                priceElement.classList.add(changeClass);
                
                setTimeout(() => {
                    priceElement.classList.remove(changeClass);
                }, 2000);
            }
        }
    });
}

// Update competition statuses
async function updateCompetitionStatuses() {
    try {
        // Check if any competitions need status updates based on time
        const competitionCards = document.querySelectorAll('.competition-card');
        
        for (const card of competitionCards) {
            const competitionId = card.getAttribute('data-competition-id');
            const timeElement = card.querySelector('.competition-time[data-end-time]');
            
            if (timeElement && competitionId) {
                const endTime = new Date(timeElement.getAttribute('data-end-time'));
                const now = new Date();
                
                // Check if competition should transition to next status
                if (now >= endTime) {
                    console.log(`Competition ${competitionId} should transition status`);
                    
                    // Refresh this specific competition
                    if (window.competition?.updateCompetitionDisplay) {
                        await window.competition.updateCompetitionDisplay(competitionId);
                    }
                }
            }
        }
        
    } catch (error) {
        console.warn('Competition status update failed:', error);
    }
}

// Stop background services
function stopBackgroundServices() {
    console.log('Stopping background services...');
    
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
    
    // Clean up price service
    if (window.priceService) {
        window.priceService.cleanup();
    }
    
    console.log('Background services stopped');
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
// WALLET CONNECTION FUNCTIONS (ENHANCED)
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
            connectedUser = existingUser;
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
    if (connectedUser) {
        // Existing user
        completedOnboarding();
    } else {
        // New user
        goToStep(3);
    }
}

// ==============================================
// USER PROFILE CREATION (ENHANCED)
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
        connectedUser = await window.supabaseClient.createUserProfile(
            connectedWallet.address,
            username,
            selectedAvatar
        );
        
        console.log('User profile created:', connectedUser);
        goToStep(5);
        
    } catch (error) {
        console.error('Profile creation failed:', error);
        showErrorNotification(`Failed to create profile: ${error.message}`);
        document.getElementById('finalizeBtn').disabled = false;
        document.getElementById('finalizeBtn').textContent = 'Join TokenWars';
    }
}

// Complete onboarding process
async function completedOnboarding() {
    closeWalletModal();
    updateUIForConnectedUser();
    await loadUserDashboard();
}

// ==============================================
// UI UPDATE FUNCTIONS (ENHANCED)
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
    document.getElementById('navTraderName').textContent = connectedUser.username;
    document.getElementById('navTraderAvatar').textContent = selectedAvatar;
    
    // Update hero welcome message
    document.getElementById('heroTraderNameText').textContent = connectedUser.username;
    
    console.log('UI updated for connected user:', connectedUser.username);
}

// Load user dashboard with enhanced features
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
        
        // Start token price tracking for user's active bets
        await startUserTokenTracking();
        
        console.log('Enhanced user dashboard loaded');
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showErrorNotification('Failed to load dashboard data');
    }
}

// Start tracking tokens for user's active bets
async function startUserTokenTracking() {
    try {
        if (!connectedUser) return;
        
        // Get user's active bets
        const userBets = await window.supabaseClient.getUserBets(connectedUser.wallet_address, 10);
        
        // Extract token addresses from active competitions
        const tokenAddresses = new Set();
        userBets.forEach(bet => {
            if (bet.competitions && bet.status === 'PLACED') {
                const competition = bet.competitions;
                if (competition.token_a_address) tokenAddresses.add(competition.token_a_address);
                if (competition.token_b_address) tokenAddresses.add(competition.token_b_address);
            }
        });
        
        if (tokenAddresses.size > 0) {
            console.log(`Starting price tracking for ${tokenAddresses.size} tokens from user bets`);
            // Start price history recording for these tokens
            window.priceService.startPriceHistoryRecording([...tokenAddresses]);
        }
        
    } catch (error) {
        console.error('Failed to start user token tracking:', error);
    }
}

// Load active competitions with real-time integration
async function loadActiveCompetitions() {
    try {
        const competitions = await window.supabaseClient.getActiveCompetitions();
        
        if (window.competition?.displayCompetitions) {
            window.competition.displayCompetitions(competitions);
        }
    } catch (error) {
        console.error('Failed to load competitions:', error);
        document.getElementById('competitions-grid').innerHTML = 
            '<div class="error-message">Failed to load competitions</div>';
    }
}

// Load user portfolio
async function loadUserPortfolio() {
    if (!connectedUser) return;
    
    try {
        const [bets, leaderboardPos] = await Promise.all([
            window.supabaseClient.getUserBets(connectedUser.wallet_address),
            window.supabaseClient.getUserLeaderboardPosition(connectedUser.wallet_address)
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
// REAL-TIME SUBSCRIPTIONS (ENHANCED)
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
    
    // Subscribe to token updates if available
    if (window.supabaseClient.subscribeToTokenUpdates) {
        window.supabaseClient.subscribeToTokenUpdates((payload) => {
            console.log('Token update:', payload);
            // Handle token data updates
        });
    }
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
    
    // Refresh competitions when markets are shown
    if (connectedUser) {
        loadActiveCompetitions();
    }
}

function showCompetitions() {
    showMarkets(); // Same as markets for now
}

function showLeaderboard() {
    hideAllSections();
    document.getElementById('leaderboard').style.display = 'block';
    updateActiveNavLink('leaderboard');
    
    // Refresh leaderboard when shown
    if (connectedUser) {
        loadLeaderboard();
    }
}

function showPortfolio() {
    hideAllSections();
    document.getElementById('portfolio').style.display = 'block';
    updateActiveNavLink('portfolio');
    
    // Refresh portfolio when shown
    if (connectedUser) {
        loadUserPortfolio();
    }
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
// WALLET DISCONNECT (ENHANCED)
// ==============================================

// Disconnect wallet
async function disconnectWallet() {
    try {
        // Stop background services
        stopBackgroundServices();
        
        // Clean up subscriptions
        if (window.competition?.cleanupCompetitionSubscriptions) {
            window.competition.cleanupCompetitionSubscriptions();
        }
        
        // Clear user context in database
        await window.supabaseClient.clearUserContext();
        
        // Disconnect from wallet provider
        if (walletProvider && walletProvider.disconnect) {
            await walletProvider.disconnect();
        }
        
        // Clear local state
        connectedWallet = null;
        connectedUser = null;
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
        
        // Restart basic services for anonymous browsing
        await initializeTokenSystem();
        startBackgroundServices();
        
    } catch (error) {
        console.error('Error disconnecting wallet:', error);
        showErrorNotification('Failed to disconnect wallet');
    }
}

// ==============================================
// UTILITY FUNCTIONS (ENHANCED)
// ==============================================

// Format wallet address for display
function formatWalletAddress(address) {
    if (!address) return '';
    if (address.startsWith('DEMO')) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

// Format price for display
function formatPrice(price) {
    if (!price || isNaN(price)) return '0.00';
    const num = parseFloat(price);
    if (num < 0.000001) {
        return num.toExponential(2);
    } else if (num < 0.01) {
        return num.toFixed(6);
    } else if (num < 1) {
        return num.toFixed(4);
    } else {
        return num.toFixed(2);
    }
}

// Show error notification
function showErrorNotification(message) {
    showNotification(message, 'error');
}

// Enhanced notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add icon based on type
    const icons = {
        error: '❌',
        success: '✅',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
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
        maxWidth: '500px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
    });
    
    // Set background color based on type
    const colors = {
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        success: 'linear-gradient(135deg, #22c55e, #16a34a)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        info: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

// Placeholder functions for portfolio and leaderboard display
function displayUserPortfolio(bets, leaderboardPos) {
    // TODO: Implement enhanced portfolio display
    console.log('Portfolio data:', { bets, leaderboardPos });
}

function displayLeaderboard(leaderboard) {
    // TODO: Implement enhanced leaderboard display
    console.log('Leaderboard data:', leaderboard);
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
    loadActiveCompetitions,
    loadUserPortfolio,
    loadLeaderboard,
    showNotification,
    showErrorNotification,
    getCurrentUser: () => connectedUser,
    getConnectedWallet: () => connectedWallet,
    
    // Enhanced methods
    updateTokensInBackground,
    startBackgroundServices,
    stopBackgroundServices,
    loadCompetitionsWithTokenData
};
