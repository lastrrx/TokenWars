/**
 * Competition Management Module
 * Handles competition lifecycle, state management, and winner determination
 */

const database = require('./database');
const tokens = require('./tokens');
const { broadcastUpdate } = require('./server');
const winston = require('winston');
const cron = require('node-cron');

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

// Competition states
const CompetitionStatus = {
    UPCOMING: 'upcoming',
    ACTIVE: 'active',
    CLOSED: 'closed',
    RESOLVED: 'resolved',
    PAUSED: 'paused',
    CANCELLED: 'cancelled'
};

// Competition manager
const competitionManager = {
    activeCompetitions: new Map(),
    scheduledJobs: new Map(),
    
    /**
     * Initialize competition manager
     */
    async initialize() {
        logger.info('Initializing competition manager...');
        
        // Load active competitions
        await this.loadActiveCompetitions();
        
        // Schedule regular tasks
        this.scheduleRegularTasks();
        
        logger.info('Competition manager initialized');
    },
    
    /**
     * Load active competitions from database
     */
    async loadActiveCompetitions() {
        try {
            const competitions = await database.getCompetitions('active');
            
            competitions.forEach(comp => {
                this.activeCompetitions.set(comp.competition_id, comp);
                this.scheduleCompetitionTasks(comp);
            });
            
            logger.info(`Loaded ${competitions.length} active competitions`);
            
        } catch (error) {
            logger.error('Failed to load active competitions:', error);
        }
    },
    
    /**
     * Schedule regular tasks
     */
    scheduleRegularTasks() {
        // Check competition statuses every minute
        cron.schedule('* * * * *', async () => {
            await this.updateCompetitionStatuses();
        });
        
        // Create new competitions every hour
        cron.schedule('0 * * * *', async () => {
            await this.createAutomaticCompetitions();
        });
        
        // Calculate TWAP prices every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            await this.calculateTWAPPrices();
        });
    },
    
    /**
     * Update competition statuses
     */
    async updateCompetitionStatuses() {
        const now = new Date();
        
        for (const [id, competition] of this.activeCompetitions) {
            const startTime = new Date(competition.start_time);
            const endTime = new Date(competition.end_time);
            
            // Check if competition should start
            if (competition.status === CompetitionStatus.UPCOMING && now >= startTime) {
                await this.startCompetition(id);
            }
            
            // Check if competition should end
            if (competition.status === CompetitionStatus.ACTIVE && now >= endTime) {
                await this.endCompetition(id);
            }
        }
    },
    
    /**
     * Start competition
     */
    async startCompetition(competitionId) {
        try {
            logger.info(`Starting competition ${competitionId}`);
            
            // Update status in database
            const competition = await database.updateCompetitionStatus(
                competitionId, 
                CompetitionStatus.ACTIVE
            );
            
            // Record starting prices
            await this.recordStartingPrices(competition);
            
            // Update local cache
            this.activeCompetitions.set(competitionId, competition);
            
            // Broadcast update
            broadcastUpdate('competition', {
                competitionId,
                status: CompetitionStatus.ACTIVE,
                message: 'Competition has started'
            });
            
        } catch (error) {
            logger.error(`Failed to start competition ${competitionId}:`, error);
        }
    },
    
    /**
     * End competition
     */
    async endCompetition(competitionId) {
        try {
            logger.info(`Ending competition ${competitionId}`);
            
            // Update status to closed
            await database.updateCompetitionStatus(
                competitionId, 
                CompetitionStatus.CLOSED
            );
            
            // Start resolution process
            await this.resolveCompetition(competitionId);
            
        } catch (error) {
            logger.error(`Failed to end competition ${competitionId}:`, error);
        }
    },
    
    /**
     * Resolve competition and determine winner
     */
    async resolveCompetition(competitionId) {
        try {
            logger.info(`Resolving competition ${competitionId}`);
            
            const competition = this.activeCompetitions.get(competitionId);
            if (!competition) {
                throw new Error('Competition not found');
            }
            
            // Calculate final TWAP prices
            const endTime = new Date(competition.end_time);
            const twapWindow = 30; // 30 minutes
            
            const tokenAPrices = await tokens.calculateTWAP(
                competition.token_a,
                new Date(endTime - twapWindow * 60 * 1000),
                endTime
            );
            
            const tokenBPrices = await tokens.calculateTWAP(
                competition.token_b,
                new Date(endTime - twapWindow * 60 * 1000),
                endTime
            );
            
            // Calculate performance
            const tokenAPerformance = (tokenAPrices.endPrice - tokenAPrices.startPrice) / tokenAPrices.startPrice;
            const tokenBPerformance = (tokenBPrices.endPrice - tokenBPrices.startPrice) / tokenBPrices.startPrice;
            
            // Determine winner
            const winnerToken = tokenAPerformance > tokenBPerformance 
                ? competition.token_a 
                : competition.token_b;
            
            // Update competition with winner
            await database.updateCompetitionStatus(
                competitionId,
                CompetitionStatus.RESOLVED,
                winnerToken
            );
            
            // Calculate and distribute payouts
            await this.calculatePayouts(competitionId, winnerToken);
            
            // Remove from active competitions
            this.activeCompetitions.delete(competitionId);
            
            // Broadcast resolution
            broadcastUpdate('competition', {
                competitionId,
                status: CompetitionStatus.RESOLVED,
                winner: winnerToken,
                tokenAPerformance: (tokenAPerformance * 100).toFixed(2) + '%',
                tokenBPerformance: (tokenBPerformance * 100).toFixed(2) + '%'
            });
            
        } catch (error) {
            logger.error(`Failed to resolve competition ${competitionId}:`, error);
        }
    },
    
    /**
     * Calculate payouts for winners
     */
    async calculatePayouts(competitionId, winnerToken) {
        try {
            // Get all bets for this competition
            const bets = await database.getCompetitionBets(competitionId);
            
            // Calculate total pool and winner pool
            const totalPool = bets.reduce((sum, bet) => sum + bet.amount, 0);
            const platformFee = totalPool * 0.15; // 15% platform fee
            const winnerPool = totalPool - platformFee;
            
            // Get winning bets
            const winningBets = bets.filter(bet => bet.chosen_token === winnerToken);
            const winningTotal = winningBets.reduce((sum, bet) => sum + bet.amount, 0);
            
            // Calculate payouts proportionally
            for (const bet of winningBets) {
                const payoutAmount = (bet.amount / winningTotal) * winnerPool;
                await database.updateBetPayout(bet.bet_id, payoutAmount);
            }
            
            logger.info(`Calculated payouts for competition ${competitionId}`);
            
        } catch (error) {
            logger.error(`Failed to calculate payouts for competition ${competitionId}:`, error);
        }
    },
    
    /**
     * Create automatic competitions
     */
    async createAutomaticCompetitions() {
        try {
            logger.info('Creating automatic competitions...');
            
            // Get token pairs from algorithm
            const tokenPairs = await tokens.selectCompetitionPairs(5); // Create 5 competitions
            
            for (const pair of tokenPairs) {
                const competitionData = {
                    tokenA: pair.tokenA.address,
                    tokenB: pair.tokenB.address,
                    tokenASymbol: pair.tokenA.symbol,
                    tokenBSymbol: pair.tokenB.symbol,
                    startTime: new Date(Date.now() + 60 * 60 * 1000), // Start in 1 hour
                    endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // 24 hours duration
                    createdBy: 'system'
                };
                
                const competition = await database.createCompetition(competitionData);
                
                // Schedule tasks for this competition
                this.scheduleCompetitionTasks(competition);
                
                logger.info(`Created automatic competition ${competition.competition_id}`);
            }
            
        } catch (error) {
            logger.error('Failed to create automatic competitions:', error);
        }
    },
    
    /**
     * Schedule tasks for a specific competition
     */
    scheduleCompetitionTasks(competition) {
        // Schedule start task
        const startTime = new Date(competition.start_time);
        if (startTime > new Date()) {
            const startJob = cron.schedule(
                startTime,
                () => this.startCompetition(competition.competition_id),
                { scheduled: false }
            );
            startJob.start();
            this.scheduledJobs.set(`start-${competition.competition_id}`, startJob);
        }
        
        // Schedule end task
        const endTime = new Date(competition.end_time);
        if (endTime > new Date()) {
            const endJob = cron.schedule(
                endTime,
                () => this.endCompetition(competition.competition_id),
                { scheduled: false }
            );
            endJob.start();
            this.scheduledJobs.set(`end-${competition.competition_id}`, endJob);
        }
    },
    
    /**
     * Record starting prices for competition
     */
    async recordStartingPrices(competition) {
        try {
            const tokenAPrice = await tokens.getCurrentPrice(competition.token_a);
            const tokenBPrice = await tokens.getCurrentPrice(competition.token_b);
            
            // Store in database
            await database.storePriceData(competition.token_a, {
                timestamp: new Date(),
                price: tokenAPrice.price,
                volume: tokenAPrice.volume,
                marketCap: tokenAPrice.marketCap
            });
            
            await database.storePriceData(competition.token_b, {
                timestamp: new Date(),
                price: tokenBPrice.price,
                volume: tokenBPrice.volume,
                marketCap: tokenBPrice.marketCap
            });
            
        } catch (error) {
            logger.error('Failed to record starting prices:', error);
        }
    },
    
    /**
     * Calculate TWAP prices for active competitions
     */
    async calculateTWAPPrices() {
        for (const [id, competition] of this.activeCompetitions) {
            if (competition.status === CompetitionStatus.ACTIVE) {
                try {
                    // Fetch and store current prices
                    await this.recordStartingPrices(competition);
                } catch (error) {
                    logger.error(`Failed to calculate TWAP for competition ${id}:`, error);
                }
            }
        }
    }
};

/**
 * Get competitions endpoint
 */
async function getCompetitions(req, res) {
    try {
        const { status = 'all', limit = 50, offset = 0 } = req.query;
        
        const competitions = await database.getCompetitions(
            status,
            parseInt(limit),
            parseInt(offset)
        );
        
        res.json(competitions);
        
    } catch (error) {
        logger.error('Get competitions error:', error);
        res.status(500).json({ error: 'Failed to fetch competitions' });
    }
}

/**
 * Get competition by ID endpoint
 */
async function getCompetitionById(req, res) {
    try {
        const { id } = req.params;
        
        const competition = await database.getCompetitionById(id);
        
        if (!competition) {
            return res.status(404).json({ error: 'Competition not found' });
        }
        
        // Add current prices if competition is active
        if (competition.status === CompetitionStatus.ACTIVE) {
            const [tokenAPrice, tokenBPrice] = await Promise.all([
                tokens.getCurrentPrice(competition.token_a),
                tokens.getCurrentPrice(competition.token_b)
            ]);
            
            competition.token_a_price = tokenAPrice.price;
            competition.token_a_change_24h = tokenAPrice.change24h;
            competition.token_a_market_cap = tokenAPrice.marketCap;
            
            competition.token_b_price = tokenBPrice.price;
            competition.token_b_change_24h = tokenBPrice.change24h;
            competition.token_b_market_cap = tokenBPrice.marketCap;
        }
        
        res.json(competition);
        
    } catch (error) {
        logger.error('Get competition by ID error:', error);
        res.status(500).json({ error: 'Failed to fetch competition' });
    }
}

/**
 * Get competition bets endpoint
 */
async function getCompetitionBets(req, res) {
    try {
        const { id } = req.params;
        
        const bets = await database.getCompetitionBets(id);
        
        res.json(bets);
        
    } catch (error) {
        logger.error('Get competition bets error:', error);
        res.status(500).json({ error: 'Failed to fetch competition bets' });
    }
}

module.exports = {
    initialize: () => competitionManager.initialize(),
    getCompetitions,
    getCompetitionById,
    getCompetitionBets,
    competitionManager
};

// TODO: Implement additional features:
// - Manual competition creation by admins
// - Competition templates
// - Multi-token competitions
// - Special event competitions
// - Competition analytics
// - Historical competition data API
