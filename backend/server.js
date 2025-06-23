/**
 * Main Server Application
 * Sets up Express server with all middleware and routes
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const WebSocket = require('ws');
const winston = require('winston');

// Import modules
const database = require('./database');
const auth = require('./auth');
const competitions = require('./competitions');
const betting = require('./betting');
const tokens = require('./tokens');
const adminApi = require('./admin-api');

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Global middleware
app.use(helmet()); // Security headers
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Admin routes have stricter rate limiting
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many admin requests, please try again later.'
});
app.use('/api/admin', adminLimiter);

// Request logging middleware
app.use((req, res, next) => {
    logger.info({
        method: req.method,
        url: req.url,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes

// Public routes
app.get('/api', (req, res) => {
    res.json({
        message: 'Token Betting API',
        version: '1.0.0',
        endpoints: {
            competitions: '/api/competitions',
            leaderboard: '/api/leaderboard',
            users: '/api/users'
        }
    });
});

// Competition routes
app.get('/api/competitions', competitions.getCompetitions);
app.get('/api/competitions/:id', competitions.getCompetitionById);
app.get('/api/competitions/:id/bets', competitions.getCompetitionBets);

// Leaderboard routes
app.get('/api/leaderboard', async (req, res) => {
    try {
        const period = req.query.period || 'daily';
        const leaderboard = await database.getLeaderboard(period);
        res.json(leaderboard);
    } catch (error) {
        logger.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// User routes (public)
app.post('/api/users', auth.createUser);
app.get('/api/users/:wallet', auth.getUser);

// Protected user routes (require wallet signature)
app.use('/api/users/:wallet/*', auth.verifyWalletOwnership);
app.put('/api/users/:wallet/username', auth.updateUsername);
app.get('/api/users/:wallet/bets', betting.getUserBets);
app.post('/api/users/:wallet/claim/:betId', betting.claimWinnings);

// Betting routes (protected)
app.post('/api/bets', auth.authenticate, betting.placeBet);

// Admin routes (require admin authentication)
app.use('/api/admin', adminApi.router);

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    logger.info('WebSocket client connected');
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to Token Betting WebSocket'
    }));
    
    // Handle client messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            logger.error('WebSocket message error:', error);
        }
    });
    
    // Handle disconnection
    ws.on('close', () => {
        logger.info('WebSocket client disconnected');
    });
    
    // Handle errors
    ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
    });
});

/**
 * Handle WebSocket messages
 */
function handleWebSocketMessage(ws, data) {
    switch (data.type) {
        case 'subscribe':
            // Subscribe to competition updates
            if (data.competitionId) {
                // TODO: Implement subscription logic
                ws.competitionSubscriptions = ws.competitionSubscriptions || [];
                ws.competitionSubscriptions.push(data.competitionId);
            }
            break;
            
        case 'unsubscribe':
            // Unsubscribe from competition updates
            if (data.competitionId && ws.competitionSubscriptions) {
                ws.competitionSubscriptions = ws.competitionSubscriptions.filter(
                    id => id !== data.competitionId
                );
            }
            break;
            
        default:
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Unknown message type'
            }));
    }
}

/**
 * Broadcast updates to WebSocket clients
 */
function broadcastUpdate(type, data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            // Check if client is subscribed to this update
            if (type === 'competition' && client.competitionSubscriptions) {
                if (client.competitionSubscriptions.includes(data.competitionId)) {
                    client.send(JSON.stringify({
                        type,
                        data,
                        timestamp: new Date().toISOString()
                    }));
                }
            } else if (type === 'global') {
                // Send global updates to all clients
                client.send(JSON.stringify({
                    type,
                    data,
                    timestamp: new Date().toISOString()
                }));
            }
        }
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error({
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found'
    });
});

// Initialize services
async function initializeServer() {
    try {
        // Initialize database
        await database.initialize();
        logger.info('Database initialized');
        
        // Initialize token price service
        await tokens.initialize();
        logger.info('Token service initialized');
        
        // Initialize competition manager
        await competitions.initialize();
        logger.info('Competition manager initialized');
        
        // Start server
        const port = process.env.PORT || 3000;
        server.listen(port, () => {
            logger.info(`Server running on port ${port}`);
            logger.info(`WebSocket server ready`);
        });
        
    } catch (error) {
        logger.error('Server initialization error:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    // Close WebSocket server
    wss.close(() => {
        logger.info('WebSocket server closed');
    });
    
    // Close HTTP server
    server.close(() => {
        logger.info('HTTP server closed');
    });
    
    // Close database connections
    await database.close();
    
    process.exit(0);
});

// Start the server
initializeServer();

// Export for testing
module.exports = { app, broadcastUpdate };

// TODO: Implement additional features:
// - Request validation middleware
// - API documentation (Swagger/OpenAPI)
// - Metrics collection (Prometheus)
// - Request caching (Redis)
// - Background job processing
// - Email notifications
