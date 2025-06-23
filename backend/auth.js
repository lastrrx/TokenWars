/**
 * Authentication Module
 * Handles user authentication, session management, and security
 */

const jwt = require('jsonwebtoken');
const { PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const database = require('./database');
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

// JWT configuration
const JWT_SECRET = process.env.SESSION_SECRET || 'development-secret';
const JWT_EXPIRY = '24h';

/**
 * Create new user
 */
async function createUser(req, res) {
    const { wallet_address } = req.body;
    
    try {
        // Validate wallet address
        if (!isValidSolanaAddress(wallet_address)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }
        
        // Create or update user
        const user = await database.createUser(wallet_address);
        
        res.status(201).json(user);
        
    } catch (error) {
        logger.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
}

/**
 * Get user profile
 */
async function getUser(req, res) {
    const { wallet } = req.params;
    
    try {
        // Validate wallet address
        if (!isValidSolanaAddress(wallet)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }
        
        // Get user from database
        const user = await database.getUser(wallet);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
        
    } catch (error) {
        logger.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
}

/**
 * Update username
 */
async function updateUsername(req, res) {
    const { wallet } = req.params;
    const { username } = req.body;
    
    try {
        // Validate username
        if (!isValidUsername(username)) {
            return res.status(400).json({ 
                error: 'Invalid username. Use 3-20 characters, letters, numbers, and underscores only.' 
            });
        }
        
        // Update username
        const user = await database.updateUsername(wallet, username);
        
        res.json(user);
        
    } catch (error) {
        logger.error('Update username error:', error);
        
        if (error.message === 'Username already taken') {
            return res.status(409).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Failed to update username' });
    }
}

/**
 * Authenticate user with wallet signature
 * This would be used for actions that require wallet ownership proof
 */
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    const token = authHeader.substring(7);
    
    try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Add user info to request
        req.user = {
            wallet: decoded.wallet,
            userId: decoded.userId
        };
        
        next();
        
    } catch (error) {
        logger.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

/**
 * Verify wallet ownership middleware
 * Ensures the request is from the wallet owner
 */
async function verifyWalletOwnership(req, res, next) {
    const { wallet } = req.params;
    const { signature, message, publicKey } = req.body;
    
    // For now, we'll implement a simple check
    // TODO: Implement proper signature verification
    
    // In production, you would:
    // 1. Send a nonce/challenge to the client
    // 2. Client signs the nonce with their wallet
    // 3. Verify the signature matches the wallet address
    
    try {
        // Basic validation for now
        if (!wallet || !isValidSolanaAddress(wallet)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }
        
        // TODO: Implement actual signature verification
        // For development, we'll allow all requests
        if (process.env.NODE_ENV === 'development') {
            next();
            return;
        }
        
        // Production signature verification would go here
        // const isValid = await verifySignature(publicKey, signature, message);
        
        res.status(401).json({ error: 'Wallet ownership verification required' });
        
    } catch (error) {
        logger.error('Wallet verification error:', error);
        res.status(401).json({ error: 'Failed to verify wallet ownership' });
    }
}

/**
 * Generate authentication token
 */
function generateAuthToken(walletAddress, userId) {
    return jwt.sign(
        { 
            wallet: walletAddress,
            userId: userId,
            timestamp: Date.now()
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

/**
 * Validate Solana address
 */
function isValidSolanaAddress(address) {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate username
 */
function isValidUsername(username) {
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    return regex.test(username);
}

/**
 * Verify Solana wallet signature
 * @param {string} publicKey - The public key as string
 * @param {string} signature - The signature as base58 string
 * @param {string} message - The original message that was signed
 */
async function verifySignature(publicKey, signature, message) {
    try {
        // Convert public key string to PublicKey object
        const pubKey = new PublicKey(publicKey);
        
        // Decode signature from base58
        const signatureBuffer = bs58.decode(signature);
        
        // Encode message as buffer
        const messageBuffer = new TextEncoder().encode(message);
        
        // Verify signature
        const isValid = nacl.sign.detached.verify(
            messageBuffer,
            signatureBuffer,
            pubKey.toBuffer()
        );
        
        return isValid;
        
    } catch (error) {
        logger.error('Signature verification error:', error);
        return false;
    }
}

/**
 * Rate limiting for authentication attempts
 */
const authAttempts = new Map();

function checkAuthRateLimit(identifier) {
    const now = Date.now();
    const attempts = authAttempts.get(identifier) || [];
    
    // Remove old attempts (older than 15 minutes)
    const recentAttempts = attempts.filter(time => now - time < 15 * 60 * 1000);
    
    if (recentAttempts.length >= 5) {
        return false; // Too many attempts
    }
    
    recentAttempts.push(now);
    authAttempts.set(identifier, recentAttempts);
    
    return true;
}

// Clean up old auth attempts periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, attempts] of authAttempts.entries()) {
        const recentAttempts = attempts.filter(time => now - time < 15 * 60 * 1000);
        if (recentAttempts.length === 0) {
            authAttempts.delete(key);
        } else {
            authAttempts.set(key, recentAttempts);
        }
    }
}, 5 * 60 * 1000); // Every 5 minutes

module.exports = {
    createUser,
    getUser,
    updateUsername,
    authenticate,
    verifyWalletOwnership,
    generateAuthToken,
    isValidSolanaAddress,
    verifySignature,
    checkAuthRateLimit
};

// TODO: Implement additional security features:
// - Two-factor authentication
// - Session management with Redis
// - Refresh token mechanism
// - IP-based security checks
// - Suspicious activity detection
// - Password reset for admin accounts
