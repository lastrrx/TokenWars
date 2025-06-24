// Main Application Logic with Enhanced Token Integration
// FIXED VERSION: Better error handling and initialization order

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

// Expose main functions globally immediately
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
        
        // Initialize token management system with error handling
        try {
            await initializeTokenSystem();
        } catch (tokenError) {
            console.warn('Token system initialization failed, continuing with basic functionality:', tokenError);
            showNotification('Token system starting in demo mode', 'warning');
        }
        
        // Start background services
        startBackgroundServices();
        
        console.log('App initialization complete');
        showNotification('TokenWars initialized successfully!', 'success');
        
    } catch (error) {
        console.error('App initialization failed:', error);
        showErrorNotification('Failed to initialize application - some features may not work');
    }
}

// Initialize token management system with better error handling
async function initializeTokenSystem() {
    try {
        console.log('Initializing token management system...');
        
        // Check if services are available
        if (!window.tokenService) {
            console.warn('Token service not available yet, creating instance...');
            if (window.TokenService) {
                window.tokenService = new window.TokenService();
            } else {
                throw new Error('TokenService class not loaded');
            }
        }

        if (!window.priceService) {
            console.warn('Price service not available yet, creating instance...');
            if (window.PriceService) {
                window.priceService = new window.PriceService();
            } else {
                throw new Error('PriceService class not loaded');
            }
        }

        // Initialize services
        await window.tokenService.initialize();
        await window.priceService.initialize();
        
        // Load any existing competitions with real-time data
        await loadCompetitionsWithTokenData();
        
        console.log('Token system initialized successfully');
        
    } catch (error) {
        console.error('Token system initialization failed:', error);
        throw error;
    }
}

// Load competitions with enhanced token data
async function loadCompetitionsWithTokenData() {
    try {
        if (!window.supabaseClient) {
            console.warn('Database not available for loading competitions');
            return;
        }

        const competitions = await window.supabaseClient.getActiveCompetitions();
        
        if (competitions && competitions.length > 0) {
            // Enhance competitions with real-time price data if price service is available
            let enhancedCompetitions = competitions;
            
            if (window.priceService && window.priceService.isReady()) {
                enhancedCompetitions = await Promise.all(
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
            }
            
            // Display enhanced competitions
            if (window.competition?.displayCompetitions) {
                window.competition.displayCompetitions(enhancedCompetitions);
            } else {
                console.warn('Competition display function not available');
            }
        } else {
            console.log('No active competitions found');
        }
        
    } catch (error) {
        console.error('Failed to load competitions with token data:', error);
        // Don't fail the app, just show basic message
        const competitionsGrid = document.getElementById('competitions-grid');
        if (competitionsGrid) {
            competitionsGrid.innerHTML = '<div class="loading">No competitions available yet</div>';
        }
    }
}

// Start background services for real-time updates
function startBackgroundServices() {
    console.log('Starting background services...');
    
    try {
        // Only start services if the required components are available
        if (window.APP_CONFIG && window.tokenService) {
            // Token list refresh (every hour)
            tokenUpdateInterval = setInterval(async () => {
                try {
                    console.log('Performing scheduled token list update...');
                    await updateTokensInBackground();
                } catch (error) {
                    console.warn('Scheduled token update failed:', error);
                }
            }, window.APP_CONFIG.UPDATE_INTERVALS?.TOKEN_LIST_REFRESH || 3600000);
        }
        
        if (window.APP_CONFIG && window.priceService) {
            // Price updates for active competitions (every minute)
            priceUpdateInterval = setInterval(async () => {
                try {
                    await updateActivePrices();
                } catch (error) {
                    console.warn('Price update failed:', error);
                }
            }, window.APP_CONFIG.UPDATE_INTERVALS?.PRICE_UPDATES || 60000);
        }
        
        // Competition status updates (every 30 seconds)
        competitionStatusInterval = setInterval(async () => {
            try {
                await updateCompetitionStatuses();
            } catch (error) {
                console.warn('Competition status update failed:', error);
            }
        }, window.APP_CONFIG.UPDATE_INTERVALS?.COMPETITION_STATUS || 30000);
        
        console.log('Background services started successfully');
    } catch (error) {
        console.error('Failed to start background services:', error);
    }
}

// Update tokens in background without blocking UI
async function updateTokensInBackground() {
    try {
        if (!window.tokenService) {
            console.warn('Token service not available for background update');
            return;
        }

        // Start token update process
        const tokens = await window.tokenService.updateTokenList();
        
        if (tokens && tokens.length > 0) {
            console.log(`Updated ${tokens.length} tokens successfully`);
            showNotification(`Updated ${tokens.length} tokens for better predictions!`, 'success');
            
            // Generate new token pairs if service supports it
            if (window.tokenService.generateTokenPairs) {
                const pairs = await window.tokenService.generateTokenPairs(tokens);
                console.log(`Generated ${pairs.length} token pairs`);
                
                // Store pairs in database if available
                if (window.supabaseClient?.storeTokenPairs) {
                    await window.supabaseClient.storeTokenPairs(pairs);
                }
            }
            
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

// Update prices for active competitions
async function updateActivePrices() {
    try {
        if (!window.priceService) {
            return;
        }

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
    try {
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
    } catch (error) {
        console.warn('Error updating token prices in UI:', error);
    }
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
                    
                    // Refresh this specific competition if update function exists
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
    if (window.priceService && window.priceService.cleanup) {
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
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.style.display = 'flex';
        goToStep(1);
        updateWalletStatus();
    }
}

// Close wallet connection modal
function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.style.display = 'none';
        resetModal();
    }
}

// Reset modal to initial state
function resetModal() {
    currentStep = 1;
    selectedAvatar = '🎯';
    agreementAccepted = false;
    
    // Reset form inputs
    const usernameInput = document.getElementById('traderUsername');
    if (usernameInput) usernameInput.value = '';
    
    const agreementCheckbox = document.getElementById('agreementCheckbox');
    if (agreementCheckbox) agreementCheckbox.classList.remove('checked');
    
    const createBtn = document.getElementById('createProfileBtn');
    if (createBtn) createBtn.disabled = true;
    
    const finalizeBtn = document.getElementById('finalizeBtn');
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
    
    const selectedWalletName = document.getElementById('selectedWalletName');
    if (selectedWalletName) {
        selectedWalletName.textContent = walletType.charAt(0).toUpperCase() + walletType.slice(1);
    }
    
    const connectedWalletType = document.getElementById('connectedWalletType');
    if (connectedWalletType) {
        connectedWalletType.textContent = walletType.charAt(0).toUpperCase() + walletType.slice(1);
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
        const connectedWalletAddress = document.getElementById('connectedWalletAddress');
        if (connectedWalletAddress) {
            connectedWalletAddress.textContent = formatWalletAddress(connectedWallet.address);
        }
        
        goToStep(2.5); // Wallet confirmation step
        
        // Check if user exists in database
        const traderStatusText = document.getElementById('traderStatusText');
        if (traderStatusText) {
            traderStatusText.textContent = 'Checking for existing profile...';
        }
        
        let existingUser = null;
        if (window.supabaseClient) {
            try {
                existingUser = await window.supabaseClient.getOrCreateUser(connectedWallet.address);
            } catch (error) {
                console.warn('Database check failed, continuing with profile creation:', error);
            }
        }
        
        const traderStatusIcon = document.getElementById('traderStatusIcon');
        const continueBtn = document.getElementById('continueBtn');
        
        if (existingUser) {
            // User exists, complete login
            connectedUser = existingUser;
            if (traderStatusIcon) traderStatusIcon.textContent = '✅';
            if (traderStatusText) traderStatusText.textContent = `Welcome back, ${existingUser.username}!`;
            if (continueBtn) {
                continueBtn.textContent = 'Continue to Dashboard';
                continueBtn.onclick = completedOnboarding;
            }
        } else {
            // New user, needs profile creation
            if (traderStatusIcon) traderStatusIcon.textContent = '🎯';
            if (traderStatusText) traderStatusText.textContent = 'No profile found. Let\'s create one!';
            if (continueBtn) {
                continueBtn.textContent = 'Create Profile';
                continueBtn.onclick = () => goToStep(3);
            }
        }
        
        // Show confirmation actions
        const confirmationActions = document.getElementById('confirmationActions');
        if (confirmationActions) {
            confirmationActions.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Error handling wallet connection:', error);
        showErrorNotification('Failed to process wallet connection');
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
    const usernameInput = document.getElementById('traderUsername');
    const username = usernameInput ? usernameInput.value || 'Trader Username' : 'Trader Username';
    const avatar = selectedAvatar || '🎯';
    
    const previewName = document.getElementById('previewName');
    const previewAvatar = document.getElementById('previewAvatar');
    
    if (previewName) previewName.textContent = username;
    if (previewAvatar) previewAvatar.textContent = avatar;
    
    // Validate username and enable/disable button
    const isValid = validateUsername(username);
    const createBtn = document.getElementById('createProfileBtn');
    
    if (createBtn) {
        if (isValid && username !== 'Trader Username') {
            createBtn.disabled = false;
        } else {
            createBtn.disabled = true;
        }
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
    
    if (agreementAccepted) {
        if (checkbox) checkbox.classList.add('checked');
        if (finalizeBtn) finalizeBtn.disabled = false;
    } else {
        if (checkbox) checkbox.classList.remove('checked');
        if (finalizeBtn) finalizeBtn.disabled = true;
    }
}

// Finalize profile creation
async function finalizeProfile() {
    const usernameInput = document.getElementById('traderUsername');
    const username = usernameInput ? usernameInput.value : '';
    
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
        
        // Check username availability if database is available
        if (window.supabaseClient) {
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
        } else {
            // Create mock user if database not available
            connectedUser = {
                wallet_address: connectedWallet.address,
                username: username,
                avatar: selectedAvatar,
                created_at: new Date().toISOString()
            };
        }
        
        console.log('User profile created:', connectedUser);
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
    
    if (navTraderName && connectedUser) navTraderName.textContent = connectedUser.username;
    if (navTraderAvatar) navTraderAvatar.textContent = selectedAvatar;
    
    // Update hero welcome message
    const heroTraderNameText = document.getElementById('heroTraderNameText');
    if (heroTraderNameText && connectedUser) {
        heroTraderNameText.textContent = connectedUser.username;
    }
    
    console.log('UI updated for connected user:', connectedUser?.username || 'Unknown');
}

// Load user dashboard with enhanced features
async function loadUserDashboard() {
    try {
        // Load initial data with error handling
        await Promise.all([
            loadActiveCompetitions().catch(error => {
                console.warn('Failed to load competitions:', error);
            }),
            loadUserPortfolio().catch(error => {
                console.warn('Failed to load portfolio:', error);
            }),
            loadLeaderboard().catch(error => {
                console.warn('Failed to load leaderboard:', error);
            })
        ]);
        
        // Set up real-time subscriptions if available
        try {
            setupRealtimeSubscriptions();
        } catch (error) {
            console.warn('Failed to setup real-time subscriptions:', error);
        }
        
        // Start token price tracking for user's active bets
        try {
            await startUserTokenTracking();
        } catch (error) {
            console.warn('Failed to start user token tracking:', error);
        }
        
        console.log('Enhanced user dashboard loaded');
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showErrorNotification('Dashboard loaded with limited functionality');
    }
}

// Start tracking tokens for user's active bets
async function startUserTokenTracking() {
    try {
        if (!connectedUser || !window.supabaseClient || !window.priceService) return;
        
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

// Load active competitions with error handling
async function loadActiveCompetitions() {
    try {
        if (!window.supabaseClient) {
            console.warn('Database not available for loading competitions');
            const competitionsGrid = document.getElementById('competitions-grid');
            if (competitionsGrid) {
                competitionsGrid.innerHTML = '<div class="loading">Competitions loading in demo mode...</div>';
            }
            return;
        }

        const competitions = await window.supabaseClient.getActiveCompetitions();
        
        if (window.competition?.displayCompetitions) {
            window.competition.displayCompetitions(competitions);
        } else {
            console.warn('Competition display function not available');
        }
    } catch (error) {
        console.error('Failed to load competitions:', error);
        const competitionsGrid = document.getElementById('competitions-grid');
        if (competitionsGrid) {
            competitionsGrid.innerHTML = '<div class="error-message">Failed to load competitions</div>';
        }
    }
}

// Load user portfolio
async function loadUserPortfolio() {
    if (!connectedUser) return;
    
    try {
        if (!window.supabaseClient) {
            const portfolioContent = document.getElementById('portfolio-content');
            if (portfolioContent) {
                portfolioContent.innerHTML = '<div class="loading">Portfolio loading in demo mode...</div>';
            }
            return;
        }

        const [bets, leaderboardPos] = await Promise.all([
            window.supabaseClient.getUserBets(connectedUser.wallet_address),
            window.supabaseClient.getUserLeaderboardPosition(connectedUser.wallet_address)
        ]);
        
        displayUserPortfolio(bets, leaderboardPos);
    } catch (error) {
        console.error('Failed to load portfolio:', error);
        const portfolioContent = document.getElementById('portfolio-content');
        if (portfolioContent) {
            portfolioContent.innerHTML = '<div class="error-message">Failed to load portfolio</div>';
        }
    }
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        if (!window.supabaseClient) {
            const leaderboardContent = document.getElementById('leaderboard-content');
            if (leaderboardContent) {
                leaderboardContent.innerHTML = '<div class="loading">Leaderboard loading in demo mode...</div>';
            }
            return;
        }

        const leaderboard = await window.supabaseClient.getLeaderboard();
        displayLeaderboard(leaderboard);
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        const leaderboardContent = document.getElementById('leaderboard-content');
        if (leaderboardContent) {
            leaderboardContent.innerHTML = '<div class="error-message">Failed to load leaderboard</div>';
        }
    }
}

// ==============================================
// REAL-TIME SUBSCRIPTIONS (ENHANCED)
// ==============================================

// Set up real-time subscriptions
function setupRealtimeSubscriptions() {
    if (!window.supabaseClient) {
        console.warn('Supabase client not available for real-time subscriptions');
        return;
    }

    try {
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
        
        console.log('Real-time subscriptions set up successfully');
    } catch (error) {
        console.error('Failed to set up real-time subscriptions:', error);
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
    const marketsSection = document.getElementById('markets');
    if (marketsSection) {
        marketsSection.style.display = 'block';
        updateActiveNavLink('markets');
        
        // Refresh competitions when markets are shown
        if (connectedUser) {
            loadActiveCompetitions();
        }
    }
}

function showCompetitions() {
    showMarkets(); // Same as markets for now
}

function showLeaderboard() {
    hideAllSections();
    const leaderboardSection = document.getElementById('leaderboard');
    if (leaderboardSection) {
        leaderboardSection.style.display = 'block';
        updateActiveNavLink('leaderboard');
        
        // Refresh leaderboard when shown
        if (connectedUser) {
            loadLeaderboard();
        }
    }
}

function showPortfolio() {
    hideAllSections();
    const portfolioSection = document.getElementById('portfolio');
    if (portfolioSection) {
        portfolioSection.style.display = 'block';
        updateActiveNavLink('portfolio');
        
        // Refresh portfolio when shown
        if (connectedUser) {
            loadUserPortfolio();
        }
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
        if (window.supabaseClient?.clearUserContext) {
            await window.supabaseClient.clearUserContext();
        }
        
        // Disconnect from wallet provider
        if (walletProvider && walletProvider.disconnect) {
            try {
                await walletProvider.disconnect();
            } catch (error) {
                console.warn('Wallet disconnect failed:', error);
            }
        }
        
        // Clear local state
        connectedWallet = null;
        connectedUser = null;
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
        
        // Restart basic services for anonymous browsing
        try {
            await initializeTokenSystem();
            startBackgroundServices();
        } catch (error) {
            console.warn('Failed to restart basic services:', error);
        }
        
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
    console.log('Portfolio data:', { bets, leaderboardPos });
    // TODO: Implement enhanced portfolio display
}

function displayLeaderboard(leaderboard) {
    console.log('Leaderboard data:', leaderboard);
    // TODO: Implement enhanced leaderboard display
}

// Make all functions available globally
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

console.log('App.js loaded and functions exposed globally');
