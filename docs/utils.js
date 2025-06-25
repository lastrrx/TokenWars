// Utility Functions for TokenWars
// Phase 3: Essential utilities for wallet integration

// ==============================================
// STRING UTILITIES
// ==============================================

// Format wallet address for display
function formatWalletAddress(address, length = 4) {
    if (!address) return 'Not connected';
    if (address.startsWith('DEMO')) return address;
    if (address.length < length * 2) return address;
    return `${address.slice(0, length)}...${address.slice(-length)}`;
}

// Format SOL amount nicely
function formatSOL(amount, decimals = 2) {
    if (!amount || amount === 0) return '0.00';
    if (amount < 0.01) return '< 0.01';
    if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
    return parseFloat(amount).toFixed(decimals);
}

// Format market cap
function formatMarketCap(value) {
    if (!value || value === 0) return '$0';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
}

// Format percentage
function formatPercentage(value, decimals = 2) {
    if (!value || value === 0) return '0.00%';
    const formatted = parseFloat(value).toFixed(decimals);
    return `${formatted}%`;
}

// ==============================================
// TIME UTILITIES
// ==============================================

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return time.toLocaleDateString();
}

// Format countdown timer
function formatCountdown(endTime) {
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
}

// ==============================================
// VALIDATION UTILITIES
// ==============================================

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate Solana address
function isValidSolanaAddress(address) {
    if (!address) return false;
    if (address.startsWith('DEMO')) return true; // Demo addresses are valid
    
    // Basic Solana address validation (base58, 32-44 chars)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
}

// Validate username format
function isValidUsername(username) {
    if (!username) return false;
    if (username.length < 3 || username.length > 20) return false;
    
    // Only letters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    return usernameRegex.test(username);
}

// ==============================================
// DOM UTILITIES
// ==============================================

// Safe element selector
function safeGetElement(id) {
    try {
        return document.getElementById(id);
    } catch (error) {
        console.warn(`Element not found: ${id}`);
        return null;
    }
}

// Safe element text update
function safeUpdateText(elementId, text) {
    const element = safeGetElement(elementId);
    if (element) {
        element.textContent = text;
        return true;
    }
    return false;
}

// Safe element HTML update
function safeUpdateHTML(elementId, html) {
    const element = safeGetElement(elementId);
    if (element) {
        element.innerHTML = html;
        return true;
    }
    return false;
}

// Add CSS class safely
function safeAddClass(elementId, className) {
    const element = safeGetElement(elementId);
    if (element) {
        element.classList.add(className);
        return true;
    }
    return false;
}

// Remove CSS class safely
function safeRemoveClass(elementId, className) {
    const element = safeGetElement(elementId);
    if (element) {
        element.classList.remove(className);
        return true;
    }
    return false;
}

// ==============================================
// DEBOUNCE AND THROTTLE
// ==============================================

// Debounce function for input validation
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

// Throttle function for performance
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
// ARRAY UTILITIES
// ==============================================

// Shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Get random item from array
function getRandomItem(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

// Remove duplicates from array
function removeDuplicates(array, key = null) {
    if (!key) {
        return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
        const val = item[key];
        if (seen.has(val)) {
            return false;
        }
        seen.add(val);
        return true;
    });
}

// ==============================================
// URL AND QUERY UTILITIES
// ==============================================

// Get URL parameter
function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Set URL parameter without reload
function setURLParameter(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.pushState({}, '', url);
}

// ==============================================
// ERROR HANDLING UTILITIES
// ==============================================

// Safe async function wrapper
function safeAsync(asyncFn) {
    return async (...args) => {
        try {
            return await asyncFn(...args);
        } catch (error) {
            console.error('Async function error:', error);
            return null;
        }
    };
}

// Retry function with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
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

// ==============================================
// MODAL UTILITIES
// ==============================================

// Setup modal event listeners
function setupModalEventListeners(modalId, closeCallback = null) {
    const modal = safeGetElement(modalId);
    if (!modal) return false;
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display !== 'none') {
            if (closeCallback) closeCallback();
        }
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal && closeCallback) {
            closeCallback();
        }
    });
    
    return true;
}

// ==============================================
// STORAGE UTILITIES
// ==============================================

// Safe localStorage operations
const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },
    
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },
    
    remove: (key) => {
        try {
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
    }
};

// ==============================================
// ANIMATION UTILITIES
// ==============================================

// Smooth scroll to element
function smoothScrollTo(elementId, offset = 0) {
    const element = safeGetElement(elementId);
    if (element) {
        const top = element.offsetTop - offset;
        window.scrollTo({
            top: top,
            behavior: 'smooth'
        });
    }
}

// Fade in element
function fadeIn(elementId, duration = 300) {
    const element = safeGetElement(elementId);
    if (element) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            element.style.opacity = Math.min(progress, 1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }
}

// Fade out element
function fadeOut(elementId, duration = 300) {
    const element = safeGetElement(elementId);
    if (element) {
        let start = null;
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            element.style.opacity = 1 - Math.min(progress, 1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        }
        
        requestAnimationFrame(animate);
    }
}

// ==============================================
// GLOBAL EXPORTS
// ==============================================

// Export all utilities to global scope
window.utils = {
    // String utilities
    formatWalletAddress,
    formatSOL,
    formatMarketCap,
    formatPercentage,
    
    // Time utilities
    formatRelativeTime,
    formatCountdown,
    
    // Validation utilities
    isValidEmail,
    isValidSolanaAddress,
    isValidUsername,
    
    // DOM utilities
    safeGetElement,
    safeUpdateText,
    safeUpdateHTML,
    safeAddClass,
    safeRemoveClass,
    
    // Function utilities
    debounce,
    throttle,
    
    // Array utilities
    shuffleArray,
    getRandomItem,
    removeDuplicates,
    
    // URL utilities
    getURLParameter,
    setURLParameter,
    
    // Error handling
    safeAsync,
    retryWithBackoff,
    
    // Modal utilities
    setupModalEventListeners,
    
    // Storage utilities
    storage,
    
    // Animation utilities
    smoothScrollTo,
    fadeIn,
    fadeOut
};

// Also export individual functions for direct access
Object.assign(window, {
    formatWalletAddress,
    formatSOL,
    formatMarketCap,
    formatPercentage,
    formatRelativeTime,
    formatCountdown,
    isValidEmail,
    isValidSolanaAddress,
    isValidUsername,
    safeGetElement,
    safeUpdateText,
    safeUpdateHTML,
    safeAddClass,
    safeRemoveClass,
    debounce,
    throttle,
    shuffleArray,
    getRandomItem,
    removeDuplicates,
    getURLParameter,
    setURLParameter,
    safeAsync,
    retryWithBackoff,
    setupModalEventListeners,
    storage,
    smoothScrollTo,
    fadeIn,
    fadeOut
});

console.log('✅ Utils.js loaded - All utility functions available');
