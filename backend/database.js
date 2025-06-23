/**
 * Database Connection and Models
 * Handles all database operations and connection pooling
 */

const { Pool } = require('pg');
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

// Create connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? {
        rejectUnauthorized: false
    } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Database module
const database = {
    /**
     * Initialize database connection
     */
    async initialize() {
        try {
            // Test connection
            const client = await pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            
            logger.info('Database connection established');
            
            // Run migrations if needed
            // await this.runMigrations();
            
        } catch (error) {
            logger.error('Database initialization error:', error);
            throw error;
        }
    },
    
    /**
     * Close database connections
     */
    async close() {
        await pool.end();
        logger.info('Database connections closed');
    },
    
    // User operations
    
    /**
     * Create new user
     */
    async createUser(walletAddress) {
        const query = `
            INSERT INTO users (wallet_address, created_at)
            VALUES ($1, NOW())
            ON CONFLICT (wallet_address) DO UPDATE
            SET last_login = NOW()
            RETURNING *
        `;
        
        try {
            const result = await pool.query(query, [walletAddress]);
            return result.rows[0];
        } catch (error) {
            logger.error('Create user error:', error);
            throw error;
        }
    },
    
    /**
     * Get user by wallet address
     */
    async getUser(walletAddress) {
        const query = `
            SELECT 
                wallet_address,
                username,
                created_at,
                total_bets,
                total_winnings,
                win_rate,
                current_streak
            FROM users
            WHERE wallet_address = $1
        `;
        
        try {
            const result = await pool.query(query, [walletAddress]);
            return result.rows[0];
        } catch (error) {
            logger.error('Get user error:', error);
            throw error;
        }
    },
    
    /**
     * Update username
     */
    async updateUsername(walletAddress, username) {
        // Check if username is already taken
        const checkQuery = 'SELECT 1 FROM users WHERE username = $1 AND wallet_address != $2';
        const checkResult = await pool.query(checkQuery, [username, walletAddress]);
        
        if (checkResult.rows.length > 0) {
            throw new Error('Username already taken');
        }
        
        const updateQuery = `
            UPDATE users
            SET username = $1
            WHERE wallet_address = $2
            RETURNING *
        `;
        
        try {
            const result = await pool.query(updateQuery, [username, walletAddress]);
            return result.rows[0];
        } catch (error) {
            logger.error('Update username error:', error);
            throw error;
        }
    },
    
    // Competition operations
    
    /**
     * Get competitions with filters
     */
    async getCompetitions(status = 'all', limit = 50, offset = 0) {
        let query = `
            SELECT 
                c.*,
                COUNT(DISTINCT b.user_wallet) as participant_count,
                COALESCE(SUM(b.amount), 0) as total_pool
            FROM competitions c
            LEFT JOIN bets b ON c.competition_id = b.competition_id
        `;
        
        const params = [];
        if (status !== 'all') {
            params.push(status);
            query += ` WHERE c.status = $${params.length}`;
        }
        
        query += `
            GROUP BY c.competition_id
            ORDER BY c.start_time DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        params.push(limit, offset);
        
        try {
            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('Get competitions error:', error);
            throw error;
        }
    },
    
    /**
     * Get competition by ID
     */
    async getCompetitionById(competitionId) {
        const query = `
            SELECT 
                c.*,
                COUNT(DISTINCT b.user_wallet) as participant_count,
                COALESCE(SUM(b.amount), 0) as total_pool,
                COUNT(CASE WHEN b.chosen_token = c.token_a THEN 1 END) as token_a_bets,
                COUNT(CASE WHEN b.chosen_token = c.token_b THEN 1 END) as token_b_bets
            FROM competitions c
            LEFT JOIN bets b ON c.competition_id = b.competition_id
            WHERE c.competition_id = $1
            GROUP BY c.competition_id
        `;
        
        try {
            const result = await pool.query(query, [competitionId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Get competition by ID error:', error);
            throw error;
        }
    },
    
    /**
     * Create new competition
     */
    async createCompetition(competitionData) {
        const query = `
            INSERT INTO competitions (
                token_a, token_b, 
                token_a_symbol, token_b_symbol,
                start_time, end_time, 
                status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const params = [
            competitionData.tokenA,
            competitionData.tokenB,
            competitionData.tokenASymbol,
            competitionData.tokenBSymbol,
            competitionData.startTime,
            competitionData.endTime,
            'upcoming',
            competitionData.createdBy
        ];
        
        try {
            const result = await pool.query(query, params);
            return result.rows[0];
        } catch (error) {
            logger.error('Create competition error:', error);
            throw error;
        }
    },
    
    /**
     * Update competition status
     */
    async updateCompetitionStatus(competitionId, status, winnerToken = null) {
        const query = `
            UPDATE competitions
            SET status = $2, winner_token = $3
            WHERE competition_id = $1
            RETURNING *
        `;
        
        try {
            const result = await pool.query(query, [competitionId, status, winnerToken]);
            return result.rows[0];
        } catch (error) {
            logger.error('Update competition status error:', error);
            throw error;
        }
    },
    
    // Betting operations
    
    /**
     * Place bet
     */
    async placeBet(betData) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Check if user already bet on this competition
            const checkQuery = `
                SELECT 1 FROM bets 
                WHERE user_wallet = $1 AND competition_id = $2
            `;
            const checkResult = await client.query(checkQuery, [
                betData.userWallet, 
                betData.competitionId
            ]);
            
            if (checkResult.rows.length > 0) {
                throw new Error('User already placed a bet on this competition');
            }
            
            // Insert bet
            const insertQuery = `
                INSERT INTO bets (
                    user_wallet, competition_id, 
                    chosen_token, amount, 
                    transaction_signature, timestamp
                ) VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING *
            `;
            
            const insertResult = await client.query(insertQuery, [
                betData.userWallet,
                betData.competitionId,
                betData.chosenToken,
                betData.amount,
                betData.transactionSignature
            ]);
            
            // Update user stats
            await client.query(`
                UPDATE users 
                SET total_bets = total_bets + 1
                WHERE wallet_address = $1
            `, [betData.userWallet]);
            
            await client.query('COMMIT');
            
            return insertResult.rows[0];
            
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Place bet error:', error);
            throw error;
        } finally {
            client.release();
        }
    },
    
    /**
     * Get user bets
     */
    async getUserBets(walletAddress, limit = 50) {
        const query = `
            SELECT 
                b.*,
                c.token_a_symbol,
                c.token_b_symbol,
                c.status as competition_status,
                c.winner_token,
                CASE 
                    WHEN c.winner_token = b.chosen_token THEN true
                    WHEN c.winner_token IS NOT NULL THEN false
                    ELSE NULL
                END as won
            FROM bets b
            JOIN competitions c ON b.competition_id = c.competition_id
            WHERE b.user_wallet = $1
            ORDER BY b.timestamp DESC
            LIMIT $2
        `;
        
        try {
            const result = await pool.query(query, [walletAddress, limit]);
            return result.rows;
        } catch (error) {
            logger.error('Get user bets error:', error);
            throw error;
        }
    },
    
    /**
     * Update bet payout
     */
    async updateBetPayout(betId, payoutAmount, claimTx = null) {
        const query = `
            UPDATE bets
            SET 
                payout_amount = $2,
                claimed_status = $3,
                claim_transaction = $4,
                claimed_at = $5
            WHERE bet_id = $1
            RETURNING *
        `;
        
        const params = [
            betId,
            payoutAmount,
            claimTx ? 'claimed' : 'pending',
            claimTx,
            claimTx ? new Date() : null
        ];
        
        try {
            const result = await pool.query(query, params);
            return result.rows[0];
        } catch (error) {
            logger.error('Update bet payout error:', error);
            throw error;
        }
    },
    
    // Leaderboard operations
    
    /**
     * Get leaderboard
     */
    async getLeaderboard(period = 'all', limit = 100) {
        let dateFilter = '';
        
        switch (period) {
            case 'daily':
                dateFilter = "AND b.timestamp >= NOW() - INTERVAL '24 hours'";
                break;
            case 'weekly':
                dateFilter = "AND b.timestamp >= NOW() - INTERVAL '7 days'";
                break;
            case 'monthly':
                dateFilter = "AND b.timestamp >= NOW() - INTERVAL '30 days'";
                break;
        }
        
        const query = `
            SELECT 
                u.wallet_address,
                u.username,
                COUNT(DISTINCT b.competition_id) as competitions_played,
                COUNT(CASE WHEN c.winner_token = b.chosen_token THEN 1 END) as competitions_won,
                CASE 
                    WHEN COUNT(b.bet_id) > 0 
                    THEN (COUNT(CASE WHEN c.winner_token = b.chosen_token THEN 1 END)::float / COUNT(b.bet_id) * 100)
                    ELSE 0
                END as win_rate,
                COALESCE(SUM(
                    CASE WHEN c.winner_token = b.chosen_token 
                    THEN b.payout_amount 
                    ELSE 0 END
                ), 0) as total_winnings
            FROM users u
            LEFT JOIN bets b ON u.wallet_address = b.user_wallet ${dateFilter}
            LEFT JOIN competitions c ON b.competition_id = c.competition_id
            WHERE c.status = 'completed' OR c.status IS NULL
            GROUP BY u.wallet_address, u.username
            HAVING COUNT(b.bet_id) > 0
            ORDER BY total_winnings DESC
            LIMIT $1
        `;
        
        try {
            const result = await pool.query(query, [limit]);
            return result.rows;
        } catch (error) {
            logger.error('Get leaderboard error:', error);
            throw error;
        }
    },
    
    // Admin operations
    
    /**
     * Verify admin access
     */
    async verifyAdmin(walletAddress, pin) {
        const query = `
            SELECT * FROM admin_users
            WHERE wallet_address = $1 AND pin_hash = crypt($2, pin_hash)
        `;
        
        try {
            const result = await pool.query(query, [walletAddress, pin]);
            
            if (result.rows.length > 0) {
                // Update last login
                await pool.query(
                    'UPDATE admin_users SET last_login = NOW() WHERE admin_id = $1',
                    [result.rows[0].admin_id]
                );
                
                return result.rows[0];
            }
            
            return null;
        } catch (error) {
            logger.error('Verify admin error:', error);
            throw error;
        }
    },
    
    /**
     * Log admin action
     */
    async logAdminAction(adminId, action, details) {
        const query = `
            INSERT INTO admin_logs (admin_id, action, details, timestamp)
            VALUES ($1, $2, $3, NOW())
        `;
        
        try {
            await pool.query(query, [adminId, action, JSON.stringify(details)]);
        } catch (error) {
            logger.error('Log admin action error:', error);
            // Don't throw - logging shouldn't break operations
        }
    },
    
    // Price history operations
    
    /**
     * Store price data
     */
    async storePriceData(tokenAddress, priceData) {
        const query = `
            INSERT INTO price_history (
                token_address, timestamp, 
                price, volume, market_cap
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (token_address, timestamp) DO UPDATE
            SET price = $3, volume = $4, market_cap = $5
        `;
        
        try {
            await pool.query(query, [
                tokenAddress,
                priceData.timestamp,
                priceData.price,
                priceData.volume,
                priceData.marketCap
            ]);
        } catch (error) {
            logger.error('Store price data error:', error);
            throw error;
        }
    },
    
    /**
     * Get price history
     */
    async getPriceHistory(tokenAddress, startTime, endTime) {
        const query = `
            SELECT * FROM price_history
            WHERE token_address = $1
            AND timestamp >= $2
            AND timestamp <= $3
            ORDER BY timestamp ASC
        `;
        
        try {
            const result = await pool.query(query, [tokenAddress, startTime, endTime]);
            return result.rows;
        } catch (error) {
            logger.error('Get price history error:', error);
            throw error;
        }
    }
};

module.exports = database;

// TODO: Implement additional database operations:
// - Batch operations for efficiency
// - Transaction management utilities
// - Database migrations system
// - Connection retry logic
// - Query performance monitoring
// - Automated backups
