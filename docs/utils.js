// Basic Utility Functions for TokenWars - Phase 1
// Essential functions for navigation and basic UI functionality

// ==============================================
// BASIC FORMATTING FUNCTIONS
// ==============================================

/**
 * Format price for display with appropriate precision
 * @param {number|string} price - The price to format
 * @returns {string} Formatted price string
 */
function formatPrice(price) {
    if (!price || isNaN(price)) return '0.00';
    
    const num = parseFloat(price);
    
    if (num === 0) return '0.00';
    if (num < 0.000001) return num.toExponential(2);
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toFixed(2);
}

/**
 * Format wallet address for display
 * @param {string} address - Wallet address
 * @returns {string} Formatted address
 */
function formatWalletAddress(address) {
    if (!address || typeof address !== 'string') return '';
    if (address.startsWith('DEMO')) return address;
    if (address.length <= 16) return address;
    
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

/**
 * Format SOL amounts for display
 * @param {number|string} amount - SOL amount
 * @returns {string} Formatted SOL amount
 */
function formatSOL(amount) {
    if (!amount && amount !== 0) return '0.000';
    const num = parseFloat(amount);
    return num.toFixed(3);
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
function truncateString(str, maxLength) {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

// ==============================================
// VALIDATION FUNCTIONS
// ==============================================

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} Whether username is valid
 */
function validateUsername(username) {
    if (!username || typeof username !== 'string') return false;
    if (username === 'Trader Username') return false;
    if (username.length < 3 || username.length > 20) return false;
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return false;
    return true;
}

/**
 * Validate wallet address format
 * @param {string} address - Wallet address to validate
 * @returns {boolean} Whether address is valid
 */
function validateWalletAddress(address) {
    if (!address || typeof address !== 'string') return false;
    if (address.startsWith('DEMO')) return true;
    if (address.length !== 44) return false;
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) return false;
    return true;
}

// ==============================================
// TIME FORMATTING FUNCTIONS
// ==============================================

/**
 * Format relative time (e.g., "5 minutes ago")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const target = new Date(date);
    const diff = Math.abs(now - target);
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

/**
 * Format time difference for display
 * @param {Date|string} targetTime - Target time
 * @returns {string} Formatted time difference
 */
function formatTimeDifference(targetTime) {
    if (!targetTime) return 'Unknown';
    
    const target = new Date(targetTime);
    const current = new Date();
    const diff = target - current;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// ==============================================
// LOCAL STORAGE UTILITIES
// ==============================================

/**
 * Safe localStorage wrapper with error handling
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} Success status
 */
function setLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
        return false;
    }
}

/**
 * Safe localStorage getter with error handling
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Stored value or default
 */
function getLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn('Failed to read from localStorage:', error);
        return defaultValue;
    }
}

/**
 * Remove item from localStorage safely
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
function removeLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
        return false;
    }
}

// ==============================================
// UI UTILITY FUNCTIONS
// ==============================================

/**
 * Debounce function to limit rapid function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
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
 * Simple notification creator (console-based for Phase 1)
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @returns {object} Notification object
 */
function createNotification(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const notification = {
        id: Date.now() + Math.random(),
        message: message,
        type: type,
        icon: icons[type] || icons.info,
        timestamp: timestamp
    };
    
    // Log to console for Phase 1
    console.log(`${notification.icon} [${type.toUpperCase()}] ${message} (${timestamp})`);
    
    return notification;
}

// ==============================================
// MATHEMATICAL UTILITIES
// ==============================================

/**
 * Calculate percentage with safe division
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {number} Percentage
 */
function calculatePercentage(part, total) {
    if (!total || total === 0) return 0;
    return parseFloat(((part / total) * 100).toFixed(2));
}

/**
 * Clamp value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Generate random number between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

// ==============================================
// PLACEHOLDER FUNCTIONS FOR PHASE 1
// ==============================================

/**
 * Placeholder user portfolio display
 * @param {Array} bets - User bets
 * @param {Object} leaderboardPos - Leaderboard position
 */
function displayUserPortfolio(bets, leaderboardPos) {
    console.log('📊 Portfolio display placeholder called');
    const portfolioContent = document.getElementById('portfolio-content');
    if (portfolioContent) {
        portfolioContent.innerHTML = `
            <div class="loading">
                <p>Portfolio system will be implemented in Phase 3</p>
                <p>User bets: ${bets ? bets.length : 0}</p>
                <p>Rank: ${leaderboardPos?.ranking || 'Unranked'}</p>
            </div>
        `;
    }
}

/**
 * Placeholder leaderboard display
 * @param {Array} leaderboard - Leaderboard data
 */
function displayLeaderboard(leaderboard) {
    console.log('🏆 Leaderboard display placeholder called');
    const leaderboardContent = document.getElementById('leaderboard-content');
    if (leaderboardContent) {
        leaderboardContent.innerHTML = `
            <div class="loading">
                <p>Leaderboard system will be implemented in Phase 3</p>
                <p>Players: ${leaderboard ? leaderboard.length : 0}</p>
            </div>
        `;
    }
}

// ==============================================
// DOM UTILITY FUNCTIONS
// ==============================================

/**
 * Wait for element to exist in DOM
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Element>} Promise that resolves with element
 */
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }
        
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Check if element is visible
 * @param {Element} element - DOM element
 * @returns {boolean} Whether element is visible
 */
function isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
}

// ==============================================
// EXPORT UTILITIES FOR GLOBAL ACCESS
// ==============================================

// Export all utility functions for global use
window.utils = {
    // Formatting functions
    formatPrice,
    formatWalletAddress,
    formatSOL,
    truncateString,
    
    // Validation functions
    validateUsername,
    validateWalletAddress,
    
    // Time functions
    formatRelativeTime,
    formatTimeDifference,
    
    // Storage functions
    setLocalStorage,
    getLocalStorage,
    removeLocalStorage,
    
    // UI functions
    debounce,
    createNotification,
    waitForElement,
    isElementVisible,
    
    // Math functions
    calculatePercentage,
    clamp,
    randomBetween,
    
    // Placeholder functions
    displayUserPortfolio,
    displayLeaderboard
};

// Make frequently used functions available globally
window.formatPrice = formatPrice;
window.formatWalletAddress = formatWalletAddress;
window.formatSOL = formatSOL;
window.validateUsername = validateUsername;
window.displayUserPortfolio = displayUserPortfolio;
window.displayLeaderboard = displayLeaderboard;

console.log('🛠️ Basic utils.js loaded - Phase 1 utilities ready');
