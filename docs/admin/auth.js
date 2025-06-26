/**
 * Admin Authentication Module - Fixed for Vercel Deployment
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
        console.log('Found existing admin token, showing admin panel...');
        showAdminPanel();
        return;
    }
    
    // Set up authentication event listeners
    setupAuthEventListeners();
}

/**
 * Set up authentication event listeners
 */
function setupAuthEventListeners() {
    // Connect wallet button
    const connectBtn = document.getElementById('connect-admin-wallet');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectAdminWallet);
    }
    
    // PIN input
    const pinInput = document.getElementById('admin-pin');
    if (pinInput) {
        pinInput.addEventListener('input', handlePinInput);
        pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verifyPin();
            }
        });
    }
    
    // Verify PIN button
    const verifyBtn = document.getElementById('verify-pin');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyPin);
    }
}

/**
 * Connect admin wallet
 */
async function connectAdminWallet() {
    try {
        console.log('Attempting to connect admin wallet...');
        
        // Check for Phantom wallet
        if (!window.solana) {
            showAuthError('Please install Phantom wallet to access admin panel');
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        // Request connection
        const response = await window.solana.connect();
        const publicKey = response.publicKey.toString();
        
        console.log('Wallet connected:', publicKey);
        
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
    
    if (connectBtn) connectBtn.style.display = 'none';
    if (walletStatus) walletStatus.classList.remove('hidden');
    if (walletAddress) walletAddress.textContent = truncateAddress(address);
}

/**
 * Enable PIN step
 */
function enablePinStep() {
    const pinStep = document.getElementById('step-pin');
    const pinInput = document.getElementById('admin-pin');
    const verifyBtn = document.getElementById('verify-pin');
    
    if (pinStep) pinStep.classList.remove('disabled');
    if (pinInput) {
        pinInput.disabled = false;
        pinInput.focus();
    }
    if (verifyBtn) verifyBtn.disabled = false;
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
    if (verifyBtn) {
        verifyBtn.disabled = input.value.length !== 6;
    }
}

/**
 * Verify PIN with improved error handling
 */
async function verifyPin() {
    const pin = document.getElementById('admin-pin')?.value;
    
    if (!pin || pin.length !== 6) {
        showAuthError('Please enter a 6-digit PIN');
        return;
    }
    
    if (!AuthState.walletAddress) {
        showAuthError('Please connect your wallet first');
        return;
    }
    
    try {
        console.log('Verifying PIN...');
        console.log('Wallet:', AuthState.walletAddress);
        console.log('PIN length:', pin.length);
        
        // Disable form during verification
        setAuthFormLoading(true);
        
        // Get the current domain for API call
        const apiUrl = `${window.location.origin}/api/admin/auth/verify`;
        console.log('Making request to:', apiUrl);
        
        const requestData = {
            walletAddress: AuthState.walletAddress,
            pin: pin
        };
        
        console.log('Request data:', requestData);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Get response text first to debug
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Response was not JSON:', responseText);
            throw new Error('Server returned invalid response: ' + responseText.substring(0, 100));
        }
        
        console.log('Parsed response:', data);
        
        if (response.ok && data.success) {
            // Authentication successful
            console.log('✅ Authentication successful');
            
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
            console.log('❌ Authentication failed:', data.message);
            
            AuthState.currentAttempts++;
            
            if (AuthState.currentAttempts >= AuthState.maxPinAttempts) {
                showAuthError('Maximum attempts exceeded. Access denied.');
                disableAuthForm();
            } else {
                const remaining = AuthState.maxPinAttempts - AuthState.currentAttempts;
                showAuthError(data.message || `Invalid PIN. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`);
                document.getElementById('admin-pin').value = '';
                document.getElementById('admin-pin').focus();
            }
        }
        
    } catch (error) {
        console.error('PIN verification error:', error);
        showAuthError('Failed to verify PIN: ' + error.message);
    } finally {
        setAuthFormLoading(false);
    }
}

/**
 * Show admin panel
 */
function showAdminPanel() {
    console.log('Showing admin panel...');
    
    // Hide auth screen
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.classList.add('hidden');
    
    // Show admin panel
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) adminPanel.classList.remove('hidden');
    
    // Update admin wallet display
    const adminWallet = sessionStorage.getItem('adminWallet');
    const adminWalletElement = document.querySelector('.admin-wallet');
    if (adminWalletElement && adminWallet) {
        adminWalletElement.textContent = truncateAddress(adminWallet);
    }
    
    // Initialize admin panel
    if (window.initializeAdminPanel) {
        console.log('Initializing admin panel...');
        window.initializeAdminPanel().catch(error => {
            console.error('Failed to initialize admin panel:', error);
            showAuthError('Failed to initialize admin panel: ' + error.message);
        });
    } else {
        console.warn('initializeAdminPanel function not available');
    }
}

/**
 * Set auth form loading state
 */
function setAuthFormLoading(loading) {
    const pinInput = document.getElementById('admin-pin');
    const verifyBtn = document.getElementById('verify-pin');
    
    if (pinInput) pinInput.disabled = loading;
    if (verifyBtn) {
        verifyBtn.disabled = loading;
        verifyBtn.textContent = loading ? 'Verifying...' : 'Verify Access';
    }
}

/**
 * Disable auth form
 */
function disableAuthForm() {
    const pinInput = document.getElementById('admin-pin');
    const verifyBtn = document.getElementById('verify-pin');
    
    if (pinInput) pinInput.disabled = true;
    if (verifyBtn) verifyBtn.disabled = true;
}

/**
 * Show auth error
 */
function showAuthError(message) {
    console.error('Auth Error:', message);
    
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden', 'success-message');
        errorDiv.classList.add('error-message');
        
        // Auto-hide after 10 seconds for errors
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 10000);
    }
}

/**
 * Show auth success
 */
function showAuthSuccess() {
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) {
        errorDiv.textContent = 'Authentication successful! Loading admin panel...';
        errorDiv.classList.remove('hidden', 'error-message');
        errorDiv.classList.add('success-message');
    }
}

/**
 * Truncate wallet address
 */
function truncateAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Security measures (disabled for development)
 */
// if (window.location.hostname !== 'localhost') { 
//     // Disable right-click
//     document.addEventListener('contextmenu', (e) => e.preventDefault());
//     
//     // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
//     document.addEventListener('keydown', (e) => {
//         if (e.keyCode === 123 || // F12
//             (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
//             (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
//             (e.ctrlKey && e.keyCode === 85)) { // Ctrl+U
//             e.preventDefault();
//             return false;
//         }
//     });
// }

// Session timeout (30 minutes)
let sessionTimeout;
function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        console.log('Session timed out');
        sessionStorage.clear();
        location.reload();
    }, 30 * 60 * 1000);
}

// Reset timeout on user activity
document.addEventListener('click', resetSessionTimeout);
document.addEventListener('keypress', resetSessionTimeout);

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing auth...');
    initializeAuth();
});

// Export for debugging
window.AuthState = AuthState;
window.verifyPin = verifyPin;
window.connectAdminWallet = connectAdminWallet;

console.log('✅ Admin authentication module loaded with enhanced error handling');
