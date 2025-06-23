/**
 * Main Application Controller
 * Handles wallet connection, navigation, and core app functionality
 */

// Import Solana Web3.js and wallet adapters
// TODO: Configure proper imports for production build
// import { Connection, PublicKey, Transaction } from '@solana/web3.js';

// Application state
const AppState = {
    wallet: null,
    connection: null,
    balance: 0,
    user: null,
    currentSection: 'competitions',
    apiBaseUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : '/api'
};

// Solana network configuration
const NETWORK = 'devnet'; // TODO: Change to mainnet-beta for production
const RPC_URL = 'https://api.devnet.solana.com';

/**
 * Initialize the application
 */
async function initializeApp() {
    console.log('Initializing Token Betting Platform...');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize Solana connection
    await initializeSolanaConnection();
    
    // Check for existing wallet connection
    await checkWalletConnection();
    
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
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    
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
        // TODO: Implement proper Connection class from @solana/web3.js
        // AppState.connection = new Connection(RPC_URL, 'confirmed');
        
        console.log('Connected to Solana network:', NETWORK);
    } catch (error) {
        console.error('Failed to connect to Solana:', error);
        showNotification('Failed to connect to Solana network', 'error');
    }
}

/**
 * Check for existing wallet connection
 */
async function checkWalletConnection() {
    // TODO: Implement wallet adapter persistence
    // Check if user has previously connected wallet
    const savedWallet = localStorage.getItem('wallet_address');
    
    if (savedWallet && window.solana && window.solana.isConnected) {
        await handleWalletConnected(window.solana.publicKey.toString());
    }
}

/**
 * Connect wallet
 */
async function connectWallet() {
    try {
        // Check for Phantom wallet
        if (!window.solana) {
            showNotification('Please install a Solana wallet (Phantom, Solflare, or Backpack)', 'error');
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        // Request connection
        const response = await window.solana.connect();
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
    
    // Save to localStorage for persistence
    localStorage.setItem('wallet_address', publicKey);
    
    // Update UI
    updateWalletUI(publicKey);
    
    // Fetch user data
    await fetchUserData(publicKey);
    
    // Fetch wallet balance
    await updateWalletBalance();
    
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
        
        localStorage.removeItem('wallet_address');
        
        // Update UI
        document.getElementById('connect-wallet').classList.remove('hidden');
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
    const connectBtn = document.getElementById('connect-wallet');
    const walletInfo = document.getElementById('wallet-info');
    const addressSpan = document.querySelector('.wallet-address');
    
    connectBtn.classList.add('hidden');
    walletInfo.classList.remove('hidden');
    
    // Display truncated address
    addressSpan.textContent = truncateAddress(publicKey);
}

/**
 * Update wallet balance
 */
async function updateWalletBalance() {
    if (!AppState.wallet || !AppState.connection) return;
    
    try {
        // TODO: Implement balance fetching with @solana/web3.js
        // const publicKey = new PublicKey(AppState.wallet);
        // const balance = await AppState.connection.getBalance(publicKey);
        // AppState.balance = balance / 1e9; // Convert lamports to SOL
        
        // Mock balance for now
        AppState.balance = 2.5; // TODO: Remove mock
        
        document.querySelector('.wallet-balance').textContent = `${AppState.balance.toFixed(2)} SOL`;
        
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
        } else if (response.status === 404) {
            // New user, create account
            await createUserAccount(walletAddress);
        }
        
    } catch (error) {
        console.error('Failed to fetch user data:', error);
        showNotification('Failed to load user data', 'error');
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
}

/**
 * Handle browser navigation
 */
function handleNavigation() {
    const hash = window.location.hash.substring(1) || 'competitions';
    navigateToSection(hash);
    
    // Handle back/forward buttons
    window.addEventListener('hashchange', () => {
        const section = window.location.hash.substring(1) || 'competitions';
        navigateToSection(section);
    });
}

/**
 * Clear user-specific data
 */
function clearUserData() {
    // TODO: Clear user profile data
    // TODO: Clear betting history
    // TODO: Reset to default view
}

/**
 * Utility function to truncate wallet address
 */
function truncateAddress(address) {
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
}

/**
 * Show notification
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

// TODO: Implement proper module exports for bundler
// export { AppState, showNotification, connectWallet, disconnectWallet };
