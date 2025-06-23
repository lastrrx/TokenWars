/**
 * TokenWars Main Application Controller
 * Merged version combining best practices from both implementations
 */

// Application state - combining both approaches
const AppState = {
    // Co-dev's state structure
    wallet: null,
    connection: null,
    balance: 0,
    user: null,
    currentSection: 'markets',
    apiBaseUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : '/api',
    
    // Our additional state
    isConnected: false,
    username: null,
    avatar: '🎯',
    activeCompetitions: [],
    platformStats: {
        totalVolume: 2347.8,
        totalPredictions: 12847,
        activeUsers: 3291,
        avgWinRate: 68.5
    }
};

// Solana network configuration
const NETWORK = 'devnet'; // TODO: Change to mainnet-beta for production
const RPC_URL = 'https://api.devnet.solana.com';

/**
 * Initialize the application
 */
async function initializeApp() {
    console.log('🚀 TokenWars initializing...');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize Solana connection
    await initializeSolanaConnection();
    
    // Check for existing wallet connection
    await checkWalletConnection();
    
    // Initialize features from our version
    startLiveTickerAnimation();
    loadPlatformStatistics();
    
    // Load initial data
    await loadInitialData();
    
    // Handle navigation
    handleNavigation();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Wallet connection buttons
    document.getElementById('connect-wallet').addEventListener('click', connectWallet);
    document.getElementById('disconnect-wallet').addEventListener('click', disconnectWallet);
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('href').substring(1);
            navigateToSection(section);
        });
    });
    
    // Modal close button
    document.getElementById('close-modal').addEventListener('click', closeModal);
    
    // Click outside modal to close
    document.getElementById('competition-modal').addEventListener('click', (e) => {
        if (e.target.id === 'competition-modal') {
            closeModal();
        }
    });
}

/**
 * Initialize Solana connection
 */
async function initializeSolanaConnection() {
    try {
        // Use Solana Web3.js Connection
        if (window.solanaWeb3) {
            const { Connection } = window.solanaWeb3;
            AppState.connection = new Connection(RPC_URL, 'confirmed');
            console.log('Connected to Solana network:', NETWORK);
        }
    } catch (error) {
        console.error('Failed to connect to Solana:', error);
        showNotification('Failed to connect to Solana network', 'error');
    }
}

/**
 * Check for existing wallet connection
 */
async function checkWalletConnection() {
    const savedWallet = localStorage.getItem('walletAddress');
    
    if (savedWallet && window.solana) {
        try {
            const response = await window.solana.connect({ onlyIfTrusted: true });
            if (response.publicKey) {
                await handleWalletConnected(response.publicKey.toString());
            }
        } catch (error) {
            console.log('Wallet not auto-connected');
        }
    }
}

/**
 * Connect wallet - enhanced version
 */
async function connectWallet() {
    try {
        // Check for Phantom wallet
        const { solana } = window;
        
        if (!solana || !solana.isPhantom) {
            showNotification('Please install a Solana wallet (Phantom recommended)', 'error');
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        // Request connection
        const response = await solana.connect();
        const publicKey = response.publicKey.toString();
        
        await handleWalletConnected(publicKey);
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        showNotification('Failed to connect wallet', 'error');
    }
}

/**
 * Handle successful wallet connection
 */
async function handleWalletConnected(publicKey) {
    AppState.wallet = publicKey;
    AppState.isConnected = true;
    
    // Save to localStorage for persistence
    localStorage.setItem('walletAddress', publicKey);
    
    // Generate username for demo
    AppState.username = 'Trader' + publicKey.slice(-4);
    
    // Update UI
    updateWalletUI(publicKey);
    
    // Fetch user data
    await fetchUserData(publicKey);
    
    // Fetch wallet balance
    await updateWalletBalance();
    
    // Dispatch custom event
    window.dispatchEvent(new Event('walletConnected'));
    
    showNotification('Wallet connected successfully', 'success');
}

/**
 * Disconnect wallet
 */
async function disconnectWallet() {
    try {
        if (window.solana) {
            await window.solana.disconnect();
        }
        
        AppState.wallet = null;
        AppState.user = null;
        AppState.balance = 0;
        AppState.isConnected = false;
        AppState.username = null;
        
        localStorage.removeItem('walletAddress');
        
        // Update UI
        document.getElementById('connect-wallet').parentElement.style.display = 'block';
        document.getElementById('wallet-info').classList.add('hidden');
        
        // Clear user-specific data
        clearUserData();
        
        showNotification('Wallet disconnected', 'success');
        
    } catch (error) {
        console.error('Disconnect error:', error);
    }
}

/**
 * Update wallet UI with connection info
 */
function updateWalletUI(publicKey) {
    const connectBtn = document.getElementById('connect-wallet').parentElement;
    const walletInfo = document.getElementById('wallet-info');
    
    connectBtn.style.display = 'none';
    walletInfo.classList.remove('hidden');
    
    // Update user info
    document.getElementById('userAvatar').textContent = AppState.avatar;
    document.getElementById('userName').textContent = AppState.username;
    document.getElementById('wallet-balance').textContent = `${AppState.balance.toFixed(2)} SOL`;
}

/**
 * Update wallet balance
 */
async function updateWalletBalance() {
    if (!AppState.wallet || !AppState.connection) {
        // Mock balance for demo
        AppState.balance = 2.5;
        document.getElementById('wallet-balance').textContent = `${AppState.balance.toFixed(2)} SOL`;
        return;
    }
    
    try {
        const { PublicKey } = window.solanaWeb3;
        const publicKey = new PublicKey(AppState.wallet);
        const balance = await AppState.connection.getBalance(publicKey);
        AppState.balance = balance / 1e9; // Convert lamports to SOL
        
        document.getElementById('wallet-balance').textContent = `${AppState.balance.toFixed(2)} SOL`;
        
    } catch (error) {
        console.error('Failed to fetch balance:', error);
    }
}

/**
 * Fetch user data from backend
 */
async function fetchUserData(walletAddress) {
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/users/${walletAddress}`);
        
        if (response.ok) {
            AppState.user = await response.json();
            if (AppState.user.username) {
                AppState.username = AppState.user.username;
            }
        } else if (response.status === 404) {
            // New user, create account
            await createUserAccount(walletAddress);
        }
        
    } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Continue with demo mode
    }
}

/**
 * Create new user account
 */
async function createUserAccount(walletAddress) {
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ wallet_address: walletAddress })
        });
        
        if (response.ok) {
            AppState.user = await response.json();
            showNotification('Account created successfully', 'success');
        }
        
    } catch (error) {
        console.error('Failed to create user account:', error);
    }
}

/**
 * Load initial data
 */
async function loadInitialData() {
    // Load competitions
    await loadCompetitions();
    
    // Load leaderboard
    await loadLeaderboard();
    
    // If connected, load user profile
    if (AppState.isConnected) {
        await initializeUserProfile();
    }
}

/**
 * Navigate to section
 */
function navigateToSection(section) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`a[href="#${section}"]`).classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => {
        s.classList.add('hidden');
    });
    
    // Show selected section
    document.getElementById(section).classList.remove('hidden');
    
    AppState.currentSection = section;
    
    // Update URL hash
    window.location.hash = section;
    
    // Section-specific actions
    if (section === 'analytics') {
        updateAnalyticsCharts();
    }
}

/**
 * Handle browser navigation
 */
function handleNavigation() {
    const hash = window.location.hash.substring(1) || 'markets';
    navigateToSection(hash);
    
    // Handle back/forward buttons
    window.addEventListener('hashchange', () => {
        const section = window.location.hash.substring(1) || 'markets';
        navigateToSection(section);
    });
}

/**
 * Start live ticker animation (from our version)
 */
function startLiveTickerAnimation() {
    const tickerContent = document.getElementById('ticker-content');
    
    // Mock ticker data
    const tickerData = [
        { symbol: 'BONK', change: 12.4, positive: true },
        { symbol: 'WIF', change: -3.2, positive: false },
        { symbol: 'JUP', change: 8.7, positive: true },
        { symbol: 'PYTH', change: 5.2, positive: true },
        { symbol: 'ORCA', change: -1.8, positive: false },
        { symbol: 'RAY', change: 4.5, positive: true }
    ];
    
    // Create ticker HTML
    const tickerHTML = tickerData.map(item => `
        <div class="ticker-item">
            <span class="ticker-symbol">${item.symbol}</span>
            <span class="ticker-change ${item.positive ? 'positive' : 'negative'}">
                ${item.positive ? '+' : ''}${item.change}%
            </span>
        </div>
    `).join('');
    
    // Duplicate for seamless scroll
    tickerContent.innerHTML = tickerHTML + tickerHTML;
}

/**
 * Load platform statistics
 */
function loadPlatformStatistics() {
    // Update platform stats (would be from API in production)
    document.getElementById('total-volume').textContent = `${AppState.platformStats.totalVolume.toFixed(1)} SOL`;
    document.getElementById('total-predictions').textContent = formatNumber(AppState.platformStats.totalPredictions);
    document.getElementById('active-users').textContent = formatNumber(AppState.platformStats.activeUsers);
    document.getElementById('avg-win-rate').textContent = `${AppState.platformStats.avgWinRate}%`;
}

/**
 * Update analytics charts
 */
function updateAnalyticsCharts() {
    const ctx = document.getElementById('volume-chart');
    if (!ctx || ctx.chart) return;
    
    // Create volume chart using Chart.js
    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Daily Volume (SOL)',
                data: [234, 267, 298, 312, 289, 345, 378],
                borderColor: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                }
            }
        }
    });
}

/**
 * Clear user-specific data
 */
function clearUserData() {
    // Clear user profile
    AppState.user = null;
    
    // Reset UI elements
    document.getElementById('user-win-rate').textContent = '0%';
    document.getElementById('net-profit').textContent = '0 SOL';
    document.getElementById('current-streak').textContent = '0';
    document.getElementById('total-wins').textContent = '0/0';
    
    // Clear betting history
    document.getElementById('betting-history-container').innerHTML = '';
    
    // Navigate to markets
    navigateToSection('markets');
}

/**
 * Show notification - enhanced version
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('competition-modal').classList.add('hidden');
}

/**
 * Format large numbers
 */
function formatNumber(num) {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toString();
}

/**
 * Global error handler
 */
window.addEventListener('error', (event) => {
    console.error('Application error:', event.error);
    showNotification('An error occurred. Please try again.', 'error');
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for use in other modules
window.AppState = AppState;
window.showNotification = showNotification;
window.closeModal = closeModal;
window.formatNumber = formatNumber; 