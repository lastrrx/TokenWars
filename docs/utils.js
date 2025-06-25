// Utility Functions for TokenWars - ENHANCED VERSION
// Phase 3: Essential utilities with comprehensive error handling

// ==============================================
// STRING UTILITIES - ENHANCED
// ==============================================

// Format wallet address for display
function formatWalletAddress(address, length = 4) {
    try {
        if (!address) return 'Not connected';
        if (typeof address !== 'string') return 'Invalid address';
        if (address.startsWith('DEMO')) return address;
        if (address.length < length * 2) return address;
        return `${address.slice(0, length)}...${address.slice(-length)}`;
    } catch (error) {
        console.error('Error formatting wallet address:', error);
        return 'Invalid address';
    }
}

// Format SOL amount nicely
function formatSOL(amount, decimals = 2) {
    try {
        if (!amount || amount === 0) return '0.00';
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return '0.00';
        if (numAmount < 0.01) return '< 0.01';
        if (numAmount >= 1000) return (numAmount / 1000).toFixed(1) + 'K';
        return numAmount.toFixed(decimals);
    } catch (error) {
        console.error('Error formatting SOL amount:', error);
        return '0.00';
    }
}

// Format market cap with enhanced handling
function formatMarketCap(value) {
    try {
        if (!value || value === 0) return '$0';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '$0';
        
        if (numValue >= 1e12) return `$${(numValue / 1e12).toFixed(1)}T`;
        if (numValue >= 1e9) return `$${(numValue / 1e9).toFixed(1)}B`;
        if (numValue >= 1e6) return `$${(numValue / 1e6).toFixed(1)}M`;
        if (numValue >= 1e3) return `$${(numValue / 1e3).toFixed(1)}K`;
        return `$${numValue.toFixed(0)}`;
    } catch (error) {
        console.error('Error formatting market cap:', error);
        return '$0';
    }
}

// Format percentage with enhanced validation
function formatPercentage(value, decimals = 2) {
    try {
        if (!value || value === 0) return '0.00%';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '0.00%';
        const formatted = numValue.toFixed(decimals);
        return `${formatted}%`;
    } catch (error) {
        console.error('Error formatting percentage:', error);
        return '0.00%';
    }
}

// NEW: Format token price with appropriate decimals
function formatTokenPrice(price, decimals = 6) {
    try {
        if (!price || price === 0) return '0.00';
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) return '0.00';
        
        if (numPrice >= 1) {
            return numPrice.toFixed(2);
        } else if (numPrice >= 0.01) {
            return numPrice.toFixed(4);
        } else {
            return numPrice.toFixed(decimals);
        }
    } catch (error) {
        console.error('Error formatting token price:', error);
        return '0.00';
    }
}

// NEW: Format large numbers with abbreviations
function formatLargeNumber(num, decimals = 1) {
    try {
        if (!num || num === 0) return '0';
        const numValue = parseFloat(num);
        if (isNaN(numValue)) return '0';
        
        if (numValue >= 1e12) return `${(numValue / 1e12).toFixed(decimals)}T`;
        if (numValue >= 1e9) return `${(numValue / 1e9).toFixed(decimals)}B`;
        if (numValue >= 1e6) return `${(numValue / 1e6).toFixed(decimals)}M`;
        if (numValue >= 1e3) return `${(numValue / 1e3).toFixed(decimals)}K`;
        return numValue.toString();
    } catch (error) {
        console.error('Error formatting large number:', error);
        return '0';
    }
}

// ==============================================
// TIME UTILITIES - ENHANCED
// ==============================================

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(timestamp) {
    try {
        if (!timestamp) return 'Unknown';
        
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return time.toLocaleDateString();
    } catch (error) {
        console.error('Error formatting relative time:', error);
        return 'Unknown';
    }
}

// Format countdown timer with enhanced precision
function formatCountdown(endTime) {
    try {
        if (!endTime) return 'Unknown';
        
        const now = new Date();
        const end = new Date(endTime);
        const diff = end - now;
        
        if (diff <= 0) return 'Ended';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    } catch (error) {
        console.error('Error formatting countdown:', error);
        return 'Unknown';
    }
}

// NEW: Format timestamp for display
function formatTimestamp(timestamp, includeTime = true) {
    try {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return date.toLocaleDateString('en-US', options);
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return 'Unknown';
    }
}

// ==============================================
// VALIDATION UTILITIES - ENHANCED
// ==============================================

// Validate email format
function isValidEmail(email) {
    try {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    } catch (error) {
        console.error('Error validating email:', error);
        return false;
    }
}

// Validate Solana address with enhanced checks
function isValidSolanaAddress(address) {
    try {
        if (!address || typeof address !== 'string') return false;
        if (address.startsWith('DEMO')) return true; // Demo addresses are valid
        
        // Basic Solana address validation (base58, 32-44 chars)
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        return base58Regex.test(address);
    } catch (error) {
        console.error('Error validating Solana address:', error);
        return false;
    }
}

// Validate username format with enhanced rules
function isValidUsername(username) {
    try {
        if (!username || typeof username !== 'string') return false;
        if (username.length < 3 || username.length > 20) return false;
        
        // Only letters, numbers, and underscores
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        return usernameRegex.test(username);
    } catch (error) {
        console.error('Error validating username:', error);
        return false;
    }
}

// NEW: Validate token address format
function isValidTokenAddress(address) {
    try {
        if (!address || typeof address !== 'string') return false;
        // Solana token addresses are typically 44 characters base58
        const tokenAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
        return tokenAddressRegex.test(address);
    } catch (error) {
        console.error('Error validating token address:', error);
        return false;
    }
}

// NEW: Validate numeric value
function isValidNumber(value, min = null, max = null) {
    try {
        if (value === null || value === undefined) return false;
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
    } catch (error) {
        console.error('Error validating number:', error);
        return false;
    }
}

// ==============================================
// DOM UTILITIES - ENHANCED
// ==============================================

// Safe element selector with enhanced error handling
function safeGetElement(id) {
    try {
        if (!id || typeof id !== 'string') return null;
        return document.getElementById(id);
    } catch (error) {
        console.warn(`Element not found: ${id}`, error);
        return null;
    }
}

// Safe element text update with validation
function safeUpdateText(elementId, text) {
    try {
        const element = safeGetElement(elementId);
        if (element && text !== null && text !== undefined) {
            element.textContent = String(text);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error updating text for ${elementId}:`, error);
        return false;
    }
}

// Safe element HTML update with validation
function safeUpdateHTML(elementId, html) {
    try {
        const element = safeGetElement(elementId);
        if (element && html !== null && html !== undefined) {
            element.innerHTML = String(html);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error updating HTML for ${elementId}:`, error);
        return false;
    }
}

// Add CSS class safely with validation
function safeAddClass(elementId, className) {
    try {
        const element = safeGetElement(elementId);
        if (element && className && typeof className === 'string') {
            element.classList.add(className);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error adding class ${className} to ${elementId}:`, error);
        return false;
    }
}

// Remove CSS class safely with validation
function safeRemoveClass(elementId, className) {
    try {
        const element = safeGetElement(elementId);
        if (element && className && typeof className === 'string') {
            element.classList.remove(className);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error removing class ${className} from ${elementId}:`, error);
        return false;
    }
}

// NEW: Toggle class safely
function safeToggleClass(elementId, className) {
    try {
        const element = safeGetElement(elementId);
        if (element && className && typeof className === 'string') {
            element.classList.toggle(className);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error toggling class ${className} on ${elementId}:`, error);
        return false;
    }
}

// ==============================================
// DEBOUNCE AND THROTTLE - ENHANCED
// ==============================================

// Debounce function for input validation with enhanced error handling
function debounce(func, wait) {
    if (typeof func !== 'function') {
        console.error('Debounce requires a function as first argument');
        return () => {};
    }
    
    let timeout;
    return function executedFunction(...args) {
        try {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        } catch (error) {
            console.error('Error in debounced function:', error);
        }
    };
}

// Throttle function for performance with enhanced error handling
function throttle(func, limit) {
    if (typeof func !== 'function') {
        console.error('Throttle requires a function as first argument');
        return () => {};
    }
    
    let inThrottle;
    return function(...args) {
        try {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        } catch (error) {
            console.error('Error in throttled function:', error);
        }
    };
}

// ==============================================
// ARRAY UTILITIES - ENHANCED
// ==============================================

// Shuffle array safely
function shuffleArray(array) {
    try {
        if (!Array.isArray(array)) return [];
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    } catch (error) {
        console.error('Error shuffling array:', error);
        return array || [];
    }
}

// Get random item from array safely
function getRandomItem(array) {
    try {
        if (!Array.isArray(array) || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    } catch (error) {
        console.error('Error getting random item:', error);
        return null;
    }
}

// Remove duplicates from array with enhanced key handling
function removeDuplicates(array, key = null) {
    try {
        if (!Array.isArray(array)) return [];
        
        if (!key) {
            return [...new Set(array)];
        }
        
        const seen = new Set();
        return array.filter(item => {
            try {
                const val = item[key];
                if (seen.has(val)) {
                    return false;
                }
                seen.add(val);
                return true;
            } catch (error) {
                console.warn('Error processing item in removeDuplicates:', error);
                return false;
            }
        });
    } catch (error) {
        console.error('Error removing duplicates:', error);
        return array || [];
    }
}

// NEW: Sort array by property safely
function sortArrayByProperty(array, property, ascending = true) {
    try {
        if (!Array.isArray(array)) return [];
        
        return [...array].sort((a, b) => {
            try {
                const aVal = a[property];
                const bVal = b[property];
                
                if (aVal === bVal) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;
                
                const comparison = aVal < bVal ? -1 : 1;
                return ascending ? comparison : -comparison;
            } catch (error) {
                console.warn('Error comparing items in sort:', error);
                return 0;
            }
        });
    } catch (error) {
        console.error('Error sorting array:', error);
        return array || [];
    }
}

// ==============================================
// URL AND QUERY UTILITIES - ENHANCED
// ==============================================

// Get URL parameter safely
function getURLParameter(name) {
    try {
        if (!name || typeof name !== 'string') return null;
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    } catch (error) {
        console.error('Error getting URL parameter:', error);
        return null;
    }
}

// Set URL parameter without reload safely
function setURLParameter(name, value) {
    try {
        if (!name || typeof name !== 'string') return false;
        const url = new URL(window.location);
        url.searchParams.set(name, String(value));
        window.history.pushState({}, '', url);
        return true;
    } catch (error) {
        console.error('Error setting URL parameter:', error);
        return false;
    }
}

// ==============================================
// ERROR HANDLING UTILITIES - ENHANCED
// ==============================================

// Safe async function wrapper with enhanced error handling
function safeAsync(asyncFn) {
    if (typeof asyncFn !== 'function') {
        console.error('safeAsync requires a function argument');
        return async () => null;
    }
    
    return async (...args) => {
        try {
            return await asyncFn(...args);
        } catch (error) {
            console.error('Async function error:', error);
            return null;
        }
    };
}

// Retry function with exponential backoff and enhanced logging
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    if (typeof fn !== 'function') {
        throw new Error('retryWithBackoff requires a function as first argument');
    }
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            const delay = baseDelay * Math.pow(2, i);
            console.warn(`Retry ${i + 1}/${maxRetries} after ${delay}ms:`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// NEW: Safe JSON parse
function safeJSONParse(jsonString, defaultValue = null) {
    try {
        if (!jsonString || typeof jsonString !== 'string') return defaultValue;
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('Error parsing JSON:', error);
        return defaultValue;
    }
}

// NEW: Safe JSON stringify
function safeJSONStringify(obj, defaultValue = '{}') {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        console.warn('Error stringifying JSON:', error);
        return defaultValue;
    }
}

// ==============================================
// MODAL UTILITIES - ENHANCED
// ==============================================

// Setup modal event listeners with enhanced error handling
function setupModalEventListeners(modalId, closeCallback = null) {
    try {
        const modal = safeGetElement(modalId);
        if (!modal) return false;
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && modal.style.display !== 'none') {
                if (closeCallback && typeof closeCallback === 'function') {
                    closeCallback();
                }
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Close on backdrop click
        const backdropHandler = (e) => {
            if (e.target === modal && closeCallback && typeof closeCallback === 'function') {
                closeCallback();
            }
        };
        modal.addEventListener('click', backdropHandler);
        
        return true;
    } catch (error) {
        console.error('Error setting up modal event listeners:', error);
        return false;
    }
}

// ==============================================
// STORAGE UTILITIES - ENHANCED
// ==============================================

// Safe localStorage operations with comprehensive error handling
const storage = {
    set: (key, value) => {
        try {
            if (!key || typeof key !== 'string') return false;
            localStorage.setItem(key, safeJSONStringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },
    
    get: (key, defaultValue = null) => {
        try {
            if (!key || typeof key !== 'string') return defaultValue;
            const item = localStorage.getItem(key);
            return item ? safeJSONParse(item, defaultValue) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },
    
    remove: (key) => {
        try {
            if (!key || typeof key !== 'string') return false;
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },
    
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },
    
    // NEW: Check if storage is available
    isAvailable: () => {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
};

// ==============================================
// ANIMATION UTILITIES - ENHANCED
// ==============================================

// Smooth scroll to element with enhanced validation
function smoothScrollTo(elementId, offset = 0) {
    try {
        const element = safeGetElement(elementId);
        if (element) {
            const top = element.offsetTop - offset;
            window.scrollTo({
                top: Math.max(0, top),
                behavior: 'smooth'
            });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error in smooth scroll:', error);
        return false;
    }
}

// Fade in element with enhanced error handling
function fadeIn(elementId, duration = 300) {
    try {
        const element = safeGetElement(elementId);
        if (!element) return false;
        
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        function animate(timestamp) {
            try {
                if (!start) start = timestamp;
                const progress = (timestamp - start) / duration;
                
                element.style.opacity = Math.min(progress, 1);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            } catch (error) {
                console.error('Error in fade in animation:', error);
            }
        }
        
        requestAnimationFrame(animate);
        return true;
    } catch (error) {
        console.error('Error starting fade in:', error);
        return false;
    }
}

// Fade out element with enhanced error handling
function fadeOut(elementId, duration = 300) {
    try {
        const element = safeGetElement(elementId);
        if (!element) return false;
        
        let start = null;
        function animate(timestamp) {
            try {
                if (!start) start = timestamp;
                const progress = (timestamp - start) / duration;
                
                element.style.opacity = 1 - Math.min(progress, 1);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                }
            } catch (error) {
                console.error('Error in fade out animation:', error);
            }
        }
        
        requestAnimationFrame(animate);
        return true;
    } catch (error) {
        console.error('Error starting fade out:', error);
        return false;
    }
}

// ==============================================
// TOKEN-SPECIFIC UTILITIES - NEW
// ==============================================

// Format token symbol for display
function formatTokenSymbol(symbol) {
    try {
        if (!symbol || typeof symbol !== 'string') return 'UNKNOWN';
        return symbol.toUpperCase();
    } catch (error) {
        console.error('Error formatting token symbol:', error);
        return 'UNKNOWN';
    }
}

// Format token name for display
function formatTokenName(name, maxLength = 20) {
    try {
        if (!name || typeof name !== 'string') return 'Unknown Token';
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength - 3) + '...';
    } catch (error) {
        console.error('Error formatting token name:', error);
        return 'Unknown Token';
    }
}

// Generate token logo fallback
function getTokenLogoFallback(symbol) {
    try {
        if (!symbol || typeof symbol !== 'string') return '🪙';
        const firstChar = symbol.charAt(0).toUpperCase();
        return `https://ui-avatars.com/api/?name=${firstChar}&background=8b5cf6&color=fff&size=64`;
    } catch (error) {
        console.error('Error generating token logo fallback:', error);
        return '🪙';
    }
}

// Calculate price change color
function getPriceChangeColor(change) {
    try {
        const numChange = parseFloat(change);
        if (isNaN(numChange) || numChange === 0) return '#9ca3af'; // gray
        return numChange > 0 ? '#22c55e' : '#ef4444'; // green or red
    } catch (error) {
        console.error('Error calculating price change color:', error);
        return '#9ca3af';
    }
}

// Format price change with color and arrow
function formatPriceChange(change) {
    try {
        const numChange = parseFloat(change);
        if (isNaN(numChange)) return { text: '0.00%', color: '#9ca3af', arrow: '' };
        
        const color = getPriceChangeColor(numChange);
        const arrow = numChange > 0 ? '↗' : numChange < 0 ? '↘' : '';
        const text = formatPercentage(Math.abs(numChange));
        
        return { text, color, arrow };
    } catch (error) {
        console.error('Error formatting price change:', error);
        return { text: '0.00%', color: '#9ca3af', arrow: '' };
    }
}

// ==============================================
// GLOBAL EXPORTS - ENHANCED
// ==============================================

// Export all utilities to global scope
window.utils = {
    // String utilities
    formatWalletAddress,
    formatSOL,
    formatMarketCap,
    formatPercentage,
    formatTokenPrice,
    formatLargeNumber,
    
    // Time utilities
    formatRelativeTime,
    formatCountdown,
    formatTimestamp,
    
    // Validation utilities
    isValidEmail,
    isValidSolanaAddress,
    isValidUsername,
    isValidTokenAddress,
    isValidNumber,
    
    // DOM utilities
    safeGetElement,
    safeUpdateText,
    safeUpdateHTML,
    safeAddClass,
    safeRemoveClass,
    safeToggleClass,
    
    // Function utilities
    debounce,
    throttle,
    
    // Array utilities
    shuffleArray,
    getRandomItem,
    removeDuplicates,
    sortArrayByProperty,
    
    // URL utilities
    getURLParameter,
    setURLParameter,
    
    // Error handling
    safeAsync,
    retryWithBackoff,
    safeJSONParse,
    safeJSONStringify,
    
    // Modal utilities
    setupModalEventListeners,
    
    // Storage utilities
    storage,
    
    // Animation utilities
    smoothScrollTo,
    fadeIn,
    fadeOut,
    
    // Token-specific utilities
    formatTokenSymbol,
    formatTokenName,
    getTokenLogoFallback,
    getPriceChangeColor,
    formatPriceChange
};

// Also export individual functions for direct access
Object.assign(window, {
    formatWalletAddress,
    formatSOL,
    formatMarketCap,
    formatPercentage,
    formatTokenPrice,
    formatLargeNumber,
    formatRelativeTime,
    formatCountdown,
    formatTimestamp,
    isValidEmail,
    isValidSolanaAddress,
    isValidUsername,
    isValidTokenAddress,
    isValidNumber,
    safeGetElement,
    safeUpdateText,
    safeUpdateHTML,
    safeAddClass,
    safeRemoveClass,
    safeToggleClass,
    debounce,
    throttle,
    shuffleArray,
    getRandomItem,
    removeDuplicates,
    sortArrayByProperty,
    getURLParameter,
    setURLParameter,
    safeAsync,
    retryWithBackoff,
    safeJSONParse,
    safeJSONStringify,
    setupModalEventListeners,
    storage,
    smoothScrollTo,
    fadeIn,
    fadeOut,
    formatTokenSymbol,
    formatTokenName,
    getTokenLogoFallback,
    getPriceChangeColor,
    formatPriceChange
});

console.log('✅ Utils.js (ENHANCED) loaded - All utility functions available');
console.log('🔧 Enhanced Features:');
console.log('   ✅ Comprehensive error handling for all functions');
console.log('   ✅ Token-specific formatting utilities');
console.log('   ✅ Enhanced validation with detailed checks');
console.log('   ✅ Safe JSON parsing and storage operations');
console.log('   ✅ Price change formatting with colors and arrows');
console.log('   ✅ Improved array and DOM manipulation utilities');
