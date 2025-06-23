/**
 * Admin API Module
 * Handles all admin-specific endpoints and functionality
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const database = require('./database');
const { competitionManager } = require('./competitions');
const winston = require('winston');

const router = express.Router();

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

// JWT configuration for admin
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.SESSION_SECRET;
const ADMIN_JWT_EXPIRY = '8h';

/**
 * Admin authentication endpoint
 */
router.post('/auth/verify', async (req, res) => {
    const { walletAddress, pin } = req.body;
    
    try {
        // Validate input
        if (!walletAddress || !pin || pin.length !== 6) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Check rate limiting
        const rateLimitKey = `admin_auth_${walletAddress}`;
        // TODO: Implement proper rate limiting with Redis
        
        // Verify admin credentials
        const admin = await database.verifyAdmin(walletAddress, pin);
        
        if (!admin) {
            // Log failed attempt
            await database.logAdminAction(null, 'failed_login', {
                walletAddress,
                ip: req.ip
            });
            
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate admin token
        const token = jwt.sign(
            {
                adminId: admin.admin_id,
                wallet: admin.wallet_address,
                role: admin.role,
                permissions: admin.permissions
            },
            ADMIN_JWT_SECRET,
            { expiresIn: ADMIN_JWT_EXPIRY }
        );
        
        // Log successful login
        await database.logAdminAction(admin.admin_id, 'login', {
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
        
        res.json({
            token,
            admin: {
                wallet: admin.wallet_address,
                role: admin.role,
                permissions: admin.permissions
            }
        });
        
    } catch (error) {
        logger.error('Admin auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

/**
 * Verify admin token
 */
router.get('/auth/verify-token', adminAuth, (req, res) => {
    res.json({ valid: true, admin: req.admin });
});

/**
 * Admin authentication middleware
 */
function adminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No admin token provided' });
    }
    
    const token = authHeader.substring(7);
    
    try {
        const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        logger.error('Admin auth middleware error:', error);
        res.status(401).json({ error: 'Invalid or expired admin token' });
    }
}

// Apply admin auth to all routes below
router.use(adminAuth);

/**
 * Dashboard data endpoint
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Fetch dashboard metrics
        const [
            totalVolume,
            activeUsers,
            platformRevenue,
            activeCompetitions,
            recentActivity
        ] = await Promise.all([
            database.getTotalVolume(),
            database.getActiveUserCount(),
            database.getPlatformRevenue(),
            database.getActiveCompetitionCount(),
            database.getRecentActivity(20)
        ]);
        
        res.json({
            totalVolume,
            activeUsers,
            platformRevenue,
            activeCompetitions,
            recentActivity
        });
        
    } catch (error) {
        logger.error('Dashboard data error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

/**
 * Get all competitions (admin view)
 */
router.get('/competitions', async (req, res) => {
    try {
        const competitions = await database.getCompetitionsAdmin();
        res.json(competitions);
    } catch (error) {
        logger.error('Get competitions error:', error);
        res.status(500).json({ error: 'Failed to fetch competitions' });
    }
});

/**
 * Create competition
 */
router.post('/competitions', async (req, res) => {
    try {
        const competitionData = {
            ...req.body,
            createdBy: req.admin.wallet
        };
        
        // Validate competition data
        const validation = validateCompetitionData(competitionData);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        
        // Create competition
        const competition = await database.createCompetition(competitionData);
        
        // Log admin action
        await database.logAdminAction(req.admin.adminId, 'create_competition', {
            competitionId: competition.competition_id
        });
        
        res.json(competition);
        
    } catch (error) {
        logger.error('Create competition error:', error);
        res.status(500).json({ error: 'Failed to create competition' });
    }
});

/**
 * Pause competition
 */
router.post('/competitions/:id/pause', async (req, res) => {
    try {
        const { id } = req.params;
        
        await database.updateCompetitionStatus(id, 'paused');
        
        // Log admin action
        await database.logAdminAction(req.admin.adminId, 'pause_competition', {
            competitionId: id
        });
        
        res.json({ success: true, message: 'Competition paused' });
        
    } catch (error) {
        logger.error('Pause competition error:', error);
        res.status(500).json({ error: 'Failed to pause competition' });
    }
});

/**
 * Get users list
 */
router.get('/users', async (req, res) => {
    try {
        const { search, limit = 100, offset = 0 } = req.query;
        
        const users = await database.getUsersAdmin(search, limit, offset);
        
        res.json(users);
        
    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * Get user details
 */
router.get('/users/:wallet', async (req, res) => {
    try {
        const { wallet } = req.params;
        
        const [user, recentBets, stats] = await Promise.all([
            database.getUser(wallet),
            database.getUserBets(wallet, 10),
            database.getUserStats(wallet)
        ]);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            ...user,
            recentBets,
            stats
        });
        
    } catch (error) {
        logger.error('Get user details error:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

/**
 * Get analytics data
 */
router.get('/analytics', async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        
        const analytics = await database.getAnalytics(period);
        
        res.json(analytics);
        
    } catch (error) {
        logger.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

/**
 * Get platform settings
 */
router.get('/settings', async (req, res) => {
    try {
        const settings = await database.getPlatformSettings();
        res.json(settings);
    } catch (error) {
        logger.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * Update platform settings
 */
router.put('/settings', async (req, res) => {
    try {
        // Only super admins can update settings
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        const settings = await database.updatePlatformSettings(req.body);
        
        // Log admin action
        await database.logAdminAction(req.admin.adminId, 'update_settings', req.body);
        
        res.json(settings);
        
    } catch (error) {
        logger.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

/**
 * Emergency pause all competitions
 */
router.post('/emergency/pause', async (req, res) => {
    try {
        // Only super admins can emergency pause
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        // Pause all active competitions
        const activeCompetitions = competitionManager.activeCompetitions;
        const pausedCount = 0;
        
        for (const [id, competition] of activeCompetitions) {
            await database.updateCompetitionStatus(id, 'paused');
            pausedCount++;
        }
        
        // Log admin action
        await database.logAdminAction(req.admin.adminId, 'emergency_pause', {
            pausedCount,
            reason: req.body.reason
        });
        
        res.json({
            success: true,
            message: `Emergency pause activated. ${pausedCount} competitions paused.`
        });
        
    } catch (error) {
        logger.error('Emergency pause error:', error);
        res.status(500).json({ error: 'Failed to execute emergency pause' });
    }
});

/**
 * Get admin list
 */
router.get('/admins', async (req, res) => {
    try {
        const admins = await database.getAdminList();
        res.json(admins);
    } catch (error) {
        logger.error('Get admin list error:', error);
        res.status(500).json({ error: 'Failed to fetch admin list' });
    }
});

/**
 * Add new admin
 */
router.post('/admins', async (req, res) => {
    try {
        // Only super admins can add new admins
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        const { walletAddress, pin, role = 'admin' } = req.body;
        
        // Validate input
        if (!walletAddress || !pin || pin.length !== 6) {
            return res.status(400).json({ error: 'Invalid admin data' });
        }
        
        // Hash PIN
        const pinHash = await bcrypt.hash(pin, 10);
        
        // Create admin
        const newAdmin = await database.createAdmin({
            walletAddress,
            pinHash,
            role,
            addedBy: req.admin.adminId
        });
        
        // Log admin action
        await database.logAdminAction(req.admin.adminId, 'add_admin', {
            newAdminWallet: walletAddress,
            role
        });
        
        res.json(newAdmin);
        
    } catch (error) {
        logger.error('Add admin error:', error);
        res.status(500).json({ error: 'Failed to add admin' });
    }
});

/**
 * Get admin logs
 */
router.get('/logs', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        
        const logs = await database.getAdminLogs(limit, offset);
        
        res.json(logs);
        
    } catch (error) {
        logger.error('Get admin logs error:', error);
        res.status(500).json({ error: 'Failed to fetch admin logs' });
    }
});

/**
 * Validate competition data
 */
function validateCompetitionData(data) {
    if (!data.startTime || !data.endTime) {
        return { valid: false, error: 'Start and end times are required' };
    }
    
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    
    if (start >= end) {
        return { valid: false, error: 'End time must be after start time' };
    }
    
    if (start < new Date()) {
        return { valid: false, error: 'Start time must be in the future' };
    }
    
    if (data.selectionMethod === 'manual') {
        if (!data.tokenA || !data.tokenB) {
            return { valid: false, error: 'Both tokens must be specified for manual selection' };
        }
    }
    
    return { valid: true };
}

module.exports = {
    router
};

// TODO: Implement additional admin features:
// - Export data functionality
// - Bulk operations
// - Admin notifications
// - Audit trail export
// - System health monitoring
// - Backup management
