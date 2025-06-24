// Utility Functions for TokenWars with Supabase Integration

// ==============================================
// FORMATTING FUNCTIONS
// ==============================================

// Format SOL amounts consistently
function formatSOL(amount, decimals = 3) {
    if (amount === null || amount === undefined) return '0.000';
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.000';
    return num.toFixed(decimals);
}

// Format large numbers with appropriate suffixes
function formatLargeNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

// Format percentages with color coding
function formatPercent(percent, showSign = true) {
    const num = parseFloat(percent);
    if (isNaN(num)) return '0.0%';
    
    const sign = showSign && num > 0 ? '+' : '';
    const formatted = `${sign}${num.toFixed(1)}%`;
    
    return formatted;
}

// Format price with appropriate decimal places
function formatPrice(price) {
    if (!price || price === 0) return '0.0000';
    
    const num = parseFloat(price);
    if (isNaN(num)) return '0.0000';
    
    if (num < 0.0001) return num.toExponential(2);
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    
    return formatLargeNumber(num);
}

// Format wallet addresses for display
function formatWalletAddress(address, startChars = 6, endChars = 4) {
    if (!address) return '';
    if (address.startsWith('DEMO')) return address;
    if (address.length <= startChars + endChars) return address;
    
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// Format time differences
function formatTimeDifference(future, now = new Date()) {
    const diff = future - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

// Format dates for display
function formatDate(dateString, options = {}) {
    const date = new Date(dateString);
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

// ==============================================
// VALIDATION FUNCTIONS
// ==============================================

// Validate username format
function validateUsername(username) {
    if (!username) return { valid: false, message: 'Username is required' };
    if (username.length < 3) return { valid: false, message: 'Username must be at least 3 characters' };
    if (username.length > 20) return { valid: false, message: 'Username must be less than 20 characters' };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }
    if (username.toLowerCase().includes('admin') || username.toLowerCase().includes('official')) {
        return { valid: false, message: 'Username cannot contain reserved words' };
    }
    
    return { valid: true, message: 'Username is valid' };
}

// Validate Solana wallet address
function validateWalletAddress(address) {
    if (!address) return false;
    if (address.startsWith('DEMO')) return true; // Demo addresses
    
    // Basic Solana address validation (base58, 32-44 chars)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return address.length >= 32 && address.length <= 44 && base58Regex.test(address);
}

// Validate SOL amount
function validateSOLAmount(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return { valid: false, message: 'Invalid amount' };
    if (num <= 0) return { valid: false, message: 'Amount must be positive' };
    if (num > 1000) return { valid: false, message: 'Amount too large' };
    
    return { valid: true, message: 'Valid amount' };
}

// ==============================================
// DATA MANIPULATION FUNCTIONS
// ==============================================

// Sort array by multiple criteria
function multiSort(array, criteria) {
    return array.sort((a, b) => {
        for (const criterion of criteria) {
            const { key, direction = 'asc' } = criterion;
            const aVal = getNestedValue(a, key);
            const bVal = getNestedValue(b, key);
            
            let comparison = 0;
            if (aVal > bVal) comparison = 1;
            if (aVal < bVal) comparison = -1;
            
            if (comparison !== 0) {
                return direction === 'desc' ? -comparison : comparison;
            }
        }
        return 0;
    });
}

// Get nested object value by string path
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Group array by key
function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const groupKey = getNestedValue(item, key);
        groups[groupKey] = groups[groupKey] || [];
        groups[groupKey].push(item);
        return groups;
    }, {});
}

// Debounce function for search/filter inputs
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

// Throttle function for scroll/resize events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==============================================
// STATISTICAL FUNCTIONS
// ==============================================

// Calculate win rate
function calculateWinRate(wins, total) {
    if (total === 0) return 0;
    return (wins / total) * 100;
}

// Calculate ROI (Return on Investment)
function calculateROI(totalReturns, totalInvestment) {
    if (totalInvestment === 0) return 0;
    return ((totalReturns - totalInvestment) / totalInvestment) * 100;
}

// Calculate streak (current winning/losing streak)
function calculateStreak(results) {
    if (!results || results.length === 0) return 0;
    
    let streak = 0;
    const lastResult = results[results.length - 1];
    
    for (let i = results.length - 1; i >= 0; i--) {
        if (results[i] === lastResult) {
            streak++;
        } else {
            break;
        }
    }
    
    return lastResult === 'win' ? streak : -streak;
}

// Calculate average
function calculateAverage(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + parseFloat(num || 0), 0);
    return sum / numbers.length;
}

// ==============================================
// UI HELPER FUNCTIONS
// ==============================================

// Show loading state
function showLoading(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
    }
}

// Show error state
function showError(elementId, message = 'An error occurred') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${message}</div>
                <button class="retry-button" onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

// Show empty state
function showEmpty(elementId, title = 'No data', message = 'Nothing to display') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div class="empty-title">${title}</div>
                <div class="empty-message">${message}</div>
            </div>
        `;
    }
}

// Copy text to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard!', 'success');
        return true;
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Copied to clipboard!', 'success');
        return true;
    }
}

// Smooth scroll to element
function scrollToElement(elementId, offset = 0) {
    const element = document.getElementById(elementId);
    if (element) {
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }
}

// ==============================================
// LOCAL STORAGE HELPERS
// ==============================================

// Safe local storage operations
const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    },
    
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return defaultValue;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    },
    
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            return false;
        }
    }
};

// ==============================================
// NOTIFICATION SYSTEM
// ==============================================

// Show notification
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${icon}</div>
            <div class="notification-message">${message}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '2rem',
        right: '2rem',
        padding: '1rem',
        borderRadius: '0.75rem',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        minWidth: '300px',
        maxWidth: '500px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    // Set background color based on type
    const colors = {
        success: 'linear-gradient(135deg, #22c55e, #16a34a)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        info: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    // Add to DOM and animate in
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, duration);
}

// Get notification icon based on type
function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// Specific notification functions
function showSuccessNotification(message) {
    showNotification(message, 'success');
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showWarningNotification(message) {
    showNotification(message, 'warning');
}

function showInfoNotification(message) {
    showNotification(message, 'info');
}

// ==============================================
// ANIMATION HELPERS
// ==============================================

// Fade in animation
function fadeIn(element, duration = 300) {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    const start = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.opacity = progress.toString();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}

// Fade out animation
function fadeOut(element, duration = 300) {
    const start = performance.now();
    const startOpacity = parseFloat(element.style.opacity) || 1;
    
    function animate(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.opacity = (startOpacity * (1 - progress)).toString();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.style.display = 'none';
        }
    }
    
    requestAnimationFrame(animate);
}

// ==============================================
// EXPORT UTILITY FUNCTIONS
// ==============================================

// Make all utilities available globally
window.utils = {
    // Formatting
    formatSOL,
    formatLargeNumber,
    formatPercent,
    formatPrice,
    formatWalletAddress,
    formatTimeDifference,
    formatDate,
    
    // Validation
    validateUsername,
    validateWalletAddress,
    validateSOLAmount,
    
    // Data manipulation
    multiSort,
    getNestedValue,
    groupBy,
    debounce,
    throttle,
    
    // Statistics
    calculateWinRate,
    calculateROI,
    calculateStreak,
    calculateAverage,
    
    // UI helpers
    showLoading,
    showError,
    showEmpty,
    copyToClipboard,
    scrollToElement,
    
    // Storage
    storage,
    
    // Notifications
    showNotification,
    showSuccessNotification,
    showErrorNotification,
    showWarningNotification,
    showInfoNotification,
    
    // Animations
    fadeIn,
    fadeOut
};

// Also make common functions available directly
window.formatSOL = formatSOL;
window.formatWalletAddress = formatWalletAddress;
window.showNotification = showNotification;
window.showErrorNotification = showErrorNotification;
window.showSuccessNotification = showSuccessNotification;
