/**
 * Admin Authentication Module
 * Handles wallet + PIN authentication for admin access
 */

// Authentication state
const AuthState = {
    walletConnected: false,
    walletAddress: null,
    authToken: null,
    maxPinAttempts: 3,
    currentAttempts: 0
};

/**
 * Initialize authentication
 */
async function initializeAuth() {
    console.log('Initializing admin authentication...');
    
    // Check for existing session
    const existingToken = sessionStorage.getItem('adminToken');
    if (existingToken) {
        // Verify token is still valid
        const isValid = await verifyAuthToken(existingToken);
        if (isValid) {
            showAdminPanel();
            return;
        }
    }
    
    // Set up authentication event listeners
    setupAuthEventListeners();
}

/**
 * Set up authentication event listeners
 */
function setupAuthEventListeners() {
    // Connect wallet button
    document.getElementById('connect-admin-wallet').addEventListener('click', connectAdminWallet);
    
    // PIN input
    const pinInput = document.getElementById('admin-pin');
    pinInput.addEventListener('input', handlePinInput);
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verifyPin();
        }
    });
    
    // Verify PIN button
    document.getElementById('verify-pin').addEventListener('click', verifyPin);
}

/**
 * Connect admin wallet
 */
async function connectAdminWallet() {
    try {
        // Check for Phantom wallet
        if (!window.solana) {
            showAuthError('Please install Phantom wallet to access admin panel');
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        // Request connection
        const response = await window.solana.connect();
        const publicKey = response.publicKey.toString();
        
        AuthState.walletAddress = publicKey;
        AuthState.walletConnected = true;
        
        // Update UI
        updateWalletStatus(publicKey);
        
        // Enable PIN input
        enablePinStep();
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        showAuthError('Failed to connect wallet. Please try again.');
    }
}

/**
 * Update wallet status display
 */
function updateWalletStatus(address) {
    const connectBtn = document.getElementById('connect-admin-wallet');
    const walletStatus = document.getElementById('wallet-status');
    const walletAddress = document.querySelector('.wallet-address');
    
    connectBtn.style.display = 'none';
    walletStatus.classList.remove('hidden');
    walletAddress.textContent = truncateAddress(address);
}

/**
 * Enable PIN step
 */
function enablePinStep() {
    const pinStep = document.getElementById('step-pin');
    const pinInput = document.getElementById('admin-pin');
    const verifyBtn = document.getElementById('verify-pin');
    
    pinStep.classList.remove('disabled');
    pinInput.disabled = false;
    verifyBtn.disabled = false;
    pinInput.focus();
}

/**
 * Handle PIN input
 */
function handlePinInput(e) {
    const input = e.target;
    const value = input.value;
    
    // Only allow digits
    input.value = value.replace(/\D/g, '');
    
    // Enable/disable verify button
    const verifyBtn = document.getElementById('verify-pin');
    verifyBtn.disabled = input.value.length !== 6;
}

/**
 * Verify PIN
 */
async function verifyPin() {
    const pin = document.getElementById('admin-pin').value;
    
    if (pin.length !== 6) {
        showAuthError('Please enter a 6-digit PIN');
        return;
    }
    
    try {
        // Disable form during verification
        setAuthFormLoading(true);
        
        // Call backend to verify wallet + PIN
        const response = await fetch('/api/admin/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                walletAddress: AuthState.walletAddress,
                pin: pin
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Authentication successful
            AuthState.authToken = data.token;
            sessionStorage.setItem('adminToken', data.token);
            sessionStorage.setItem('adminWallet', AuthState.walletAddress);
            
            // Show success and redirect to admin panel
            showAuthSuccess();
            setTimeout(() => {
                showAdminPanel();
            }, 1000);
            
        } else {
            // Authentication failed
            AuthState.currentAttempts++;
            
            if (AuthState.currentAttempts >= AuthState.maxPinAttempts) {
                showAuthError('Maximum attempts exceeded. Access denied.');
                disableAuthForm();
            } else {
                const remaining = AuthState.maxPinAttempts - AuthState.currentAttempts;
                showAuthError(`Invalid PIN. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`);
                document.getElementById('admin-pin').value = '';
                document.getElementById('admin-pin').focus();
            }
        }
        
    } catch (error) {
        console.error('PIN verification error:', error);
        showAuthError('Failed to verify PIN. Please try again.');
    } finally {
        setAuthFormLoading(false);
    }
}

/**
 * Verify auth token validity
 */
async function verifyAuthToken(token) {
    try {
        const response = await fetch('/api/admin/auth/verify-token', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        return response.ok;
        
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}

/**
 * Show admin panel
 */
function showAdminPanel() {
    // Hide auth screen
    document.getElementById('auth-screen').classList.add('hidden');
    
    // Show admin panel
    document.getElementById('admin-panel').classList.remove('hidden');
    
    // Update admin wallet display
    const adminWallet = sessionStorage.getItem('adminWallet');
    document.querySelector('.admin-wallet').textContent = truncateAddress(adminWallet);
    
    // Initialize admin panel
    initializeAdminPanel();
}

/**
 * Set auth form loading state
 */
function setAuthFormLoading(loading) {
    const pinInput = document.getElementById('admin-pin');
    const verifyBtn = document.getElementById('verify-pin');
    
    pinInput.disabled = loading;
    verifyBtn.disabled = loading;
    verifyBtn.textContent = loading ? 'Verifying...' : 'Verify Access';
}

/**
 * Disable auth form
 */
function disableAuthForm() {
    const pinInput = document.getElementById('admin-pin');
    const verifyBtn = document.getElementById('verify-pin');
    
    pinInput.disabled = true;
    verifyBtn.disabled = true;
    
    // TODO: Implement lockout period
    // Could store lockout timestamp in localStorage
}

/**
 * Show auth error
 */
function showAuthError(message) {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

/**
 * Show auth success
 */
function showAuthSuccess() {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = 'Authentication successful! Redirecting...';
    errorDiv.classList.remove('hidden', 'error-message');
    errorDiv.classList.add('success-message');
}

/**
 * Truncate wallet address
 */
function truncateAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Security measures
 */

// Prevent console access in production
if (fales) {//(window.location.hostname !== 'localhost') {
    // Disable right-click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    document.addEventListener('keydown', (e) => {
        if (e.keyCode === 123 || // F12
            (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
            (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
            (e.ctrlKey && e.keyCode === 85)) { // Ctrl+U
            e.preventDefault();
            return false;
        }
    });
}

// Session timeout (30 minutes)
let sessionTimeout;
function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        sessionStorage.clear();
        location.reload();
    }, 30 * 60 * 1000);
}

// Reset timeout on user activity
document.addEventListener('click', resetSessionTimeout);
document.addEventListener('keypress', resetSessionTimeout);

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', initializeAuth);

// TODO: Implement additional security features:
// - Rate limiting for PIN attempts
// - IP address logging
// - Two-factor authentication
// - Audit logging for all admin actions
// - Session encryption
// - CSRF protection
