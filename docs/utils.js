// Enhanced Utility Functions for Token Wars
// Includes price formatting, market cap formatting, token validation, and display utilities

// ==============================================
// PRICE AND FINANCIAL FORMATTING
// ==============================================

/**
 * Format price for display with appropriate precision
 * @param {number|string} price - The price to format
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string} Formatted price string
 */
function formatPrice(price, currency = '$') {
    if (!price || isNaN(price)) return `${currency}0.00`;
    
    const num = parseFloat(price);
    
    if (num === 0) return `${currency}0.00`;
    
    // Handle very small numbers with scientific notation
    if (num < 0.000001) {
        return `${currency}${num.toExponential(2)}`;
    }
    
    // Handle small numbers with more decimal places
    if (num < 0.01) {
        return `${currency}${num.toFixed(6)}`;
    }
    
    // Handle numbers less than 1 with 4 decimal places
    if (num < 1) {
        return `${currency}${num.toFixed(4)}`;
    }
    
    // Handle numbers less than 1000 with 2 decimal places
    if (num < 1000) {
        return `${currency}${num.toFixed(2)}`;
    }
    
    // Handle larger numbers with appropriate formatting
    return `${currency}${num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/**
 * Format market cap for display
 * @param {number|string} marketCap - Market cap value
 * @param {boolean} includeSymbol - Whether to include $ symbol
 * @returns {string} Formatted market cap string
 */
function formatMarketCap(marketCap, includeSymbol = true) {
    if (!marketCap || isNaN(marketCap)) return 'N/A';
    
    const num = parseFloat(marketCap);
    const symbol = includeSymbol ? '$' : '';
    
    if (num >= 1e12) {
        return `${symbol}${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
        return `${symbol}${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
        return `${symbol}${(num / 1e6).toFixed(1)}M`;
    } else if (num >= 1e3) {
        return `${symbol}${(num / 1e3).toFixed(0)}K`;
    } else {
        return `${symbol}${num.toLocaleString()}`;
    }
}

/**
 * Format percentage change with appropriate styling info
 * @param {number|string} percentage - Percentage to format
 * @param {boolean} includeSign - Whether to include + for positive values
 * @returns {object} Object with text and isPositive properties
 */
function formatPercentageChange(percentage, includeSign = true) {
    if (!percentage && percentage !== 0) {
        return { text: 'N/A', isPositive: null };
    }
    
    const num = parseFloat(percentage);
    const isPositive = num >= 0;
    const sign = includeSign && isPositive ? '+' : '';
    
    return {
        text: `${sign}${num.toFixed(2)}%`,
        isPositive: isPositive,
        className: isPositive ? 'positive' : 'negative'
    };
}

/**
 * Format SOL amounts for display
 * @param {number|string} amount - SOL amount
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted SOL amount
 */
function formatSOL(amount, decimals = 3) {
    if (!amount && amount !== 0) return '0.000';
    
    const num = parseFloat(amount);
    return num.toFixed(decimals);
}

/**
 * Format volume for display
 * @param {number|string} volume - Volume value
 * @returns {string} Formatted volume string
 */
function formatVolume(volume) {
    if (!volume || isNaN(volume)) return 'N/A';
    
    const num = parseFloat(volume);
    
    if (num >= 1e9) {
        return `$${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
        return `$${(num / 1e6).toFixed(1)}M`;
    } else if (num >= 1e3) {
        return `$${(num / 1e3).toFixed(0)}K`;
    } else {
        return `$${num.toLocaleString()}`;
    }
}

// ==============================================
// TIME AND DATE FORMATTING
// ==============================================

/**
 * Format time difference for display
 * @param {Date|string} targetTime - Target time
 * @param {Date} currentTime - Current time (default: now)
 * @returns {string} Formatted time difference
 */
function formatTimeDifference(targetTime, currentTime = new Date()) {
    const target = new Date(targetTime);
    const current = new Date(currentTime);
    const diff = target - current;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Format relative time (e.g., "5 minutes ago")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
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
 * Format date and time for display
 * @param {Date|string} date - Date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
function formatDateTime(date, includeTime = true) {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return d.toLocaleDateString(undefined, options);
}

// ==============================================
// TOKEN VALIDATION AND UTILITIES
// ==============================================

/**
 * Validate token symbol format
 * @param {string} symbol - Token symbol to validate
 * @returns {boolean} Whether symbol is valid
 */
function validateTokenSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') return false;
    
    const validation = window.TOKEN_VALIDATION;
    if (!validation) return true; // Fallback if config not loaded
    
    // Check length
    if (symbol.length < validation.MIN_SYMBOL_LENGTH || 
        symbol.length > validation.MAX_SYMBOL_LENGTH) {
        return false;
    }
    
    // Check format (letters, numbers, underscore only)
    if (!/^[A-Z0-9_]+$/i.test(symbol)) {
        return false;
    }
    
    return true;
}

/**
 * Validate token name format
 * @param {string} name - Token name to validate
 * @returns {boolean} Whether name is valid
 */
function validateTokenName(name) {
    if (!name || typeof name !== 'string') return false;
    
    const validation = window.TOKEN_VALIDATION;
    if (!validation) return true; // Fallback if config not loaded
    
    // Check length
    if (name.length < validation.MIN_NAME_LENGTH || 
        name.length > validation.MAX_NAME_LENGTH) {
        return false;
    }
    
    return true;
}

/**
 * Validate Solana wallet address
 * @param {string} address - Wallet address to validate
 * @returns {boolean} Whether address is valid
 */
function validateWalletAddress(address) {
    if (!address || typeof address !== 'string') return false;
    
    // Demo addresses are valid
    if (address.startsWith('DEMO')) return true;
    
    const validation = window.TOKEN_VALIDATION;
    if (!validation) {
        // Basic validation fallback
        return address.length === 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
    }
    
    // Check length
    if (address.length !== validation.VALID_ADDRESS_LENGTH) return false;
    
    // Check format (Base58)
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) return false;
    
    return true;
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {object} Validation result with isValid and error properties
 */
function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return { isValid: false, error: 'Username is required' };
    }
    
    if (username.length < 3) {
        return { isValid: false, error: 'Username must be at least 3 characters' };
    }
    
    if (username.length > 20) {
        return { isValid: false, error: 'Username must be 20 characters or less' };
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }
    
    return { isValid: true, error: null };
}

// ==============================================
// STRING AND TEXT UTILITIES
// ==============================================

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated string
 */
function truncateString(str, maxLength, suffix = '...') {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter of each word
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeWords(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

/**
 * Format wallet address for display
 * @param {string} address - Wallet address
 * @param {number} prefixLength - Length of prefix to show
 * @param {number} suffixLength - Length of suffix to show
 * @returns {string} Formatted address
 */
function formatWalletAddress(address, prefixLength = 8, suffixLength = 8) {
    if (!address || typeof address !== 'string') return '';
    if (address.startsWith('DEMO')) return address;
    if (address.length <= prefixLength + suffixLength) return address;
    
    return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

// ==============================================
// COMPARISON AND RANKING UTILITIES
// ==============================================

/**
 * Calculate market cap ratio between two tokens
 * @param {number} marketCap1 - First token market cap
 * @param {number} marketCap2 - Second token market cap
 * @returns {number} Ratio (larger/smaller)
 */
function calculateMarketCapRatio(marketCap1, marketCap2) {
    if (!marketCap1 || !marketCap2 || isNaN(marketCap1) || isNaN(marketCap2)) {
        return null;
    }
    
    const num1 = parseFloat(marketCap1);
    const num2 = parseFloat(marketCap2);
    
    return Math.max(num1, num2) / Math.min(num1, num2);
}

/**
 * Determine if two tokens are compatible for pairing
 * @param {object} token1 - First token data
 * @param {object} token2 - Second token data
 * @returns {object} Compatibility result
 */
function checkTokenCompatibility(token1, token2) {
    if (!token1 || !token2) {
        return { compatible: false, reason: 'Missing token data' };
    }
    
    // Check market cap compatibility
    const ratio = calculateMarketCapRatio(token1.market_cap, token2.market_cap);
    if (!ratio) {
        return { compatible: false, reason: 'Missing market cap data' };
    }
    
    const tolerance = window.APP_CONFIG?.TOKEN_SELECTION?.MARKET_CAP_TOLERANCE || 0.10;
    const compatible = (ratio - 1) <= tolerance;
    
    return {
        compatible: compatible,
        ratio: ratio,
        reason: compatible ? null : `Market cap difference too large (${ratio.toFixed(2)}x)`
    };
}

/**
 * Calculate performance percentage
 * @param {number} startPrice - Starting price
 * @param {number} endPrice - Ending price
 * @returns {number} Performance percentage
 */
function calculatePerformance(startPrice, endPrice) {
    if (!startPrice || !endPrice || isNaN(startPrice) || isNaN(endPrice)) {
        return null;
    }
    
    const start = parseFloat(startPrice);
    const end = parseFloat(endPrice);
    
    return ((end - start) / start) * 100;
}

// ==============================================
// STORAGE AND CACHING UTILITIES
// ==============================================

/**
 * Safe localStorage wrapper with error handling
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
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
// NOTIFICATION AND UI UTILITIES
// ==============================================

/**
 * Create notification data object
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds
 * @returns {object} Notification object
 */
function createNotification(message, type = 'info', duration = 5000) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    return {
        id: Date.now() + Math.random(),
        message: message,
        type: type,
        icon: icons[type] || icons.info,
        duration: duration,
        timestamp: new Date()
    };
}

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
 * Throttle function to limit function execution rate
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
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

// ==============================================
// SORTING AND FILTERING UTILITIES
// ==============================================

/**
 * Sort competitions by different criteria
 * @param {Array} competitions - Array of competitions
 * @param {string} sortBy - Sort criteria (time, pool, participants)
 * @param {string} order - Sort order (asc, desc)
 * @returns {Array} Sorted competitions
 */
function sortCompetitions(competitions, sortBy = 'time', order = 'asc') {
    if (!Array.isArray(competitions)) return [];
    
    const sortFunctions = {
        time: (a, b) => new Date(a.end_time) - new Date(b.end_time),
        pool: (a, b) => (a.total_pool || 0) - (b.total_pool || 0),
        participants: (a, b) => (a.total_bets || 0) - (b.total_bets || 0)
    };
    
    const sortFunc = sortFunctions[sortBy] || sortFunctions.time;
    const sorted = [...competitions].sort(sortFunc);
    
    return order === 'desc' ? sorted.reverse() : sorted;
}

/**
 * Filter competitions by status
 * @param {Array} competitions - Array of competitions
 * @param {string|Array} status - Status or array of statuses to filter by
 * @returns {Array} Filtered competitions
 */
function filterCompetitionsByStatus(competitions, status) {
    if (!Array.isArray(competitions)) return [];
    
    const statusArray = Array.isArray(status) ? status : [status];
    
    return competitions.filter(competition => 
        statusArray.includes(competition.status)
    );
}

// ==============================================
// MATHEMATICAL UTILITIES
// ==============================================

/**
 * Calculate percentage with safe division
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @param {number} decimals - Decimal places
 * @returns {number} Percentage
 */
function calculatePercentage(part, total, decimals = 2) {
    if (!total || total === 0) return 0;
    return parseFloat(((part / total) * 100).toFixed(decimals));
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
// EXPORT UTILITIES FOR GLOBAL ACCESS
// ==============================================

// Export all utility functions for global use
window.utils = {
    // Price and financial formatting
    formatPrice,
    formatMarketCap,
    formatPercentageChange,
    formatSOL,
    formatVolume,
    
    // Time and date formatting
    formatTimeDifference,
    formatRelativeTime,
    formatDateTime,
    
    // Token validation
    validateTokenSymbol,
    validateTokenName,
    validateWalletAddress,
    validateUsername,
    
    // String utilities
    truncateString,
    capitalizeWords,
    formatWalletAddress,
    
    // Comparison utilities
    calculateMarketCapRatio,
    checkTokenCompatibility,
    calculatePerformance,
    
    // Storage utilities
    setLocalStorage,
    getLocalStorage,
    removeLocalStorage,
    
    // UI utilities
    createNotification,
    debounce,
    throttle,
    
    // Sorting and filtering
    sortCompetitions,
    filterCompetitionsByStatus,
    
    // Mathematical utilities
    calculatePercentage,
    clamp,
    randomBetween
};

// Make specific functions available globally for backward compatibility
window.formatPrice = formatPrice;
window.formatMarketCap = formatMarketCap;
window.formatSOL = formatSOL;
window.truncateString = truncateString;
window.formatTimeDifference = formatTimeDifference;
window.formatWalletAddress = formatWalletAddress;
window.validateUsername = validateUsername;
