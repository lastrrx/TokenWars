/**
 * Backend Utility Functions
 * Common helper functions for the backend
 */

const crypto = require('crypto');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

/**
 * Generate secure random ID
 */
function generateId(prefix = '') {
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString(36);
    return prefix + timestamp + randomBytes;
}

/**
 * Hash data using SHA256
 */
function hashData(data) {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');
}

/**
 * Generate secure random PIN
 */
function generatePin(length = 6) {
    const digits = '0123456789';
    let pin = '';
    
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, digits.length);
        pin += digits[randomIndex];
    }
    
    return pin;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitize user input
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .substring(0, 1000); // Limit length
}

/**
 * Format error response
 */
function formatError(error, statusCode = 500) {
    logger.error(error);
    
    return {
        error: {
            message: process.env.NODE_ENV === 'production' 
                ? 'An error occurred' 
                : error.message,
            statusCode,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Calculate percentage change
 */
function calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Parse boolean from string
 */
function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return false;
}

/**
 * Retry async function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (i < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, i);
                logger.warn(`Retry attempt ${i + 1} after ${delay}ms`);
                await sleep(delay);
            }
        }
    }
    
    throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 */
function chunkArray(array, chunkSize) {
    const chunks = [];
    
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    
    return chunks;
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
 * Rate limiter implementation
 */
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }
    
    isAllowed(identifier) {
        const now = Date.now();
        const requests = this.requests.get(identifier) || [];
        
        // Remove old requests
        const recentRequests = requests.filter(time => now - time < this.windowMs);
        
        if (recentRequests.length >= this.maxRequests) {
            return false;
        }
        
        recentRequests.push(now);
        this.requests.set(identifier, recentRequests);
        
        return true;
    }
    
    reset(identifier) {
        this.requests.delete(identifier);
    }
}

/**
 * Circuit breaker implementation
 */
class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.threshold = threshold;
        this.timeout = timeout;
        this.failures = 0;
        this.nextAttempt = Date.now();
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }
    
    async call(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit breaker is OPEN');
            }
            this.state = 'HALF_OPEN';
        }
        
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }
    
    onFailure() {
        this.failures++;
        
        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
        }
    }
}

/**
 * Metrics collector
 */
class MetricsCollector {
    constructor() {
        this.metrics = new Map();
    }
    
    increment(metric, value = 1) {
        const current = this.metrics.get(metric) || 0;
        this.metrics.set(metric, current + value);
    }
    
    gauge(metric, value) {
        this.metrics.set(metric, value);
    }
    
    timing(metric, duration) {
        const timings = this.metrics.get(`${metric}_timings`) || [];
        timings.push(duration);
        this.metrics.set(`${metric}_timings`, timings);
    }
    
    getMetrics() {
        const result = {};
        
        for (const [key, value] of this.metrics) {
            if (key.endsWith('_timings')) {
                const timings = value;
                result[key] = {
                    count: timings.length,
                    min: Math.min(...timings),
                    max: Math.max(...timings),
                    avg: timings.reduce((a, b) => a + b, 0) / timings.length
                };
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }
    
    reset() {
        this.metrics.clear();
    }
}

// Global metrics instance
const metrics = new MetricsCollector();

module.exports = {
    generateId,
    hashData,
    generatePin,
    isValidEmail,
    sanitizeInput,
    formatError,
    calculatePercentageChange,
    formatNumber,
    parseBoolean,
    retryWithBackoff,
    sleep,
    chunkArray,
    deepClone,
    RateLimiter,
    CircuitBreaker,
    MetricsCollector,
    metrics
};

// TODO: Add more utility functions:
// - Data validation schemas
// - Encryption/decryption utilities
// - File handling utilities
// - Date/time utilities
// - Currency conversion helpers
