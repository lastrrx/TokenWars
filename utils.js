/**
 * TokenWars Utility Functions - Merged Version
 * Combines all utility functions from both implementations
 */

// From our version - financial formatting utilities
/**
 * Format numbers with appropriate suffixes
 */
function formatNumber(num) {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}

// Local storage wrapper with error handling (enhanced from both versions)
const storage = {
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }
};

// Session storage wrapper (from co-dev version)
const session = {
    get(key) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Session get error:', error);
            return null;
        }
    },
    
    set(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Session set error:', error);
            return false;
        }
    }
};

// Notification utilities (from our version)
/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// API error handling (from our version)
/**
 * Handle API errors with user-friendly messages
 */
function handleAPIError(error) {
    console.error('API Error:', error);
    
    if (error.response) {
        // Server responded with error
        switch (error.response.status) {
            case 400:
                showNotification('Invalid request. Please check your input.', 'error');
                break;
            case 401:
                showNotification('Authentication required. Please connect your wallet.', 'error');
                break;
            case 404:
                showNotification('Resource not found.', 'error');
                break;
            case 500:
                showNotification('Server error. Please try again later.', 'error');
                break;
            default:
                showNotification('An error occurred. Please try again.', 'error');
        }
    } else if (error.request) {
        // Request made but no response
        showNotification('Network error. Please check your connection.', 'error');
    } else {
        // Something else happened
        showNotification('An unexpected error occurred.', 'error');
    }
}

// Solana transaction helpers (from our version)
/**
 * Send transaction with proper error handling
 */
async function sendTransaction(connection, transaction, wallet) {
    try {
        const signature = await wallet.sendTransaction(transaction, connection);
        
        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error('Transaction failed');
        }
        
        return signature;
    } catch (error) {
        console.error('Transaction error:', error);
        throw error;
    }
}

// Price calculation helpers (from our version)
/**
 * Calculate potential win amount
 */
function calculatePotentialWin(pool, entryFee, yourSideBets, totalBets) {
    const totalPool = pool + entryFee;
    const platformFee = totalPool * 0.15;
    const winnerPool = totalPool - platformFee;
    const estimatedWinners = yourSideBets + 1;
    
    return winnerPool / estimatedWinners;
}

/**
 * Calculate ROI
 */
function calculateROI(invested, returned) {
    if (invested === 0) return 0;
    return ((returned - invested) / invested * 100).toFixed(2);
}

// Additional utilities from co-dev version
/**
 * Parse URL query parameters
 */
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Deep clone object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    
    const clonedObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    return clonedObj;
}

/**
 * Check if user is on mobile device
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Request animation frame wrapper
 */
const raf = window.requestAnimationFrame || 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    function(callback) { return setTimeout(callback, 1000 / 60); };

/**
 * Cancel animation frame wrapper
 */
const cancelRaf = window.cancelAnimationFrame || 
    window.webkitCancelAnimationFrame || 
    window.mozCancelAnimationFrame || 
    function(id) { clearTimeout(id); };

/**
 * Check if element is in viewport
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Export all utility functions as a global utils object
window.utils = {
    // Number formatting
    formatNumber,
    formatSOL,
    formatPercentage,
    calculatePercentageChange,
    formatTokenPrice,
    formatPrice,
    formatLargeNumber,
    
    // Date/time formatting
    formatDate,
    formatRelativeTime,
    
    // Wallet utilities
    truncateAddress,
    isValidSolanaAddress,
    
    // Function utilities
    debounce,
    throttle,
    
    // Clipboard
    copyToClipboard,
    
    // Storage
    storage,
    session,
    
    // Notifications
    showToast,
    handleAPIError,
    
    // Solana helpers
    sendTransaction,
    calculatePotentialWin,
    calculateROI,
    
    // General utilities
    getQueryParams,
    generateId,
    deepClone,
    isMobile,
    raf,
    cancelRaf,
    isInViewport
};

// Also export individual functions for backward compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.utils;
}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
}

/**
 * Format SOL amount
 */
function formatSOL(amount) {
    return `${parseFloat(amount).toFixed(3)} SOL`;
}

/**
 * Format percentage with + or - sign
 */
function formatPercentage(percent) {
    const formatted = parseFloat(percent).toFixed(2);
    return percent >= 0 ? `+${formatted}%` : `${formatted}%`;
}

/**
 * Calculate percentage change
 */
function calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue * 100).toFixed(2);
}

/**
 * Token price formatting
 */
function formatTokenPrice(price) {
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
}

// From co-dev version - enhanced formatting utilities
/**
 * Format price with appropriate decimal places
 */
function formatPrice(price) {
    if (price >= 1) {
        return price.toFixed(2);
    } else if (price >= 0.01) {
        return price.toFixed(4);
    } else {
        return price.toFixed(6);
    }
}

/**
 * Format large numbers with abbreviations
 */
function formatLargeNumber(num) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toFixed(2);
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return formatDate(dateString);
}

// Wallet and address utilities
/**
 * Truncate wallet address
 */
function truncateAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
}

/**
 * Validate Solana address
 */
function isValidSolanaAddress(address) {
    try {
        // Check if it's a valid base58 string and has correct length
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        return base58Regex.test(address);
    } catch (error) {
        return false;
    }
}

// Enhanced debounce and throttle functions
/**
 * Debounce function for input handling
 */
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

/**
 * Throttle function for rate limiting
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Clipboard utilities
/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard', 'success');
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        showNotification('Failed to copy', 'error');
        return false;
    }
}