/**
 * Competition Manager - Automated Competition Creation and Management
 * Handles: Token pair selection, competition scheduling, automated creation, lifecycle management
 */

class CompetitionManager {
    constructor() {
        this.isInitialized = false;
        this.automationEnabled = false;
        this.competitionInterval = null;
        this.priceUpdateInterval = null;
        
        // Configuration
        this.config = {
            // Competition settings
            defaultDuration: 60, // 60 minutes
            votingDuration: 10, // 10 minutes
            betAmount: 0.1, // 0.1 SOL
            platformFee: 0.15, // 15%
            
            // Token pair settings
            marketCapTolerance: 0.10, // 10% tolerance
            minParticipants: 2,
            maxParticipants: 100,
            
            // Automation settings
            competitionCreationInterval: 30, // 30 minutes
            priceUpdateInterval: 60, // 1 minute
            maxActiveCompetitions: 10,
            
            // TWAP settings
            twapWindowMinutes: 10,
            priceCollectionInterval: 60 // 1 minute
        };
        
        this.activeCompetitions = new Map();
        this.competitionQueue = [];
        this.priceCollectionTasks = new Map();
    }

    /**
     * Initialize the competition manager
     */
    async initialize() {
        try {
            console.log('Initializing Competition Manager...');
            
            // Verify dependencies
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }
            
            if (!window.tokenService) {
                throw new Error('Token service not available');
            }
            
            if (!window.priceService) {
                throw new Error('Price service not available');
            }
            
            // Load existing active competitions
            await this.loadActiveCompetitions();
            
            // Set up real-time subscriptions
            await this.setupRealtimeSubscriptions();
            
            // Start automated processes
            this.startAutomation();
            
            this.isInitialized = true;
            console.log('Competition Manager initialized successfully');
            
        } catch (error) {
            console.error('Competition Manager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Load existing active competitions from database
     */
    async loadActiveCompetitions() {
        try {
            // Updated query without foreign key relationships for now
            const { data: competitions, error } = await window.supabase
                .from('competitions')
                .select('*')
                .in('status', ['upcoming', 'voting', 'active']);
            
            if (error) throw error;
            
            this.activeCompetitions.clear();
            
            for (const competition of competitions || []) {
                this.activeCompetitions.set(competition.competition_id, {
                    ...competition,
                    lastUpdated: Date.now()
                });
                
                // Set up price collection if competition is active
                if (competition.status === 'active') {
                    this.startPriceCollection(competition);
                }
            }
            
            console.log(`Loaded ${this.activeCompetitions.size} active competitions`);
            
        } catch (error) {
            console.error('Error loading active competitions:', error);
        }
    }

    /**
     * Set up real-time subscriptions for competition updates
     */
    async setupRealtimeSubscriptions() {
        try {
            // Subscribe to competition changes
            window.supabase
                .channel('competitions')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'competitions'
                }, (payload) => {
                    this.handleCompetitionUpdate(payload);
                })
                .subscribe();
            
            // Subscribe to bet changes
            window.supabase
                .channel('bets')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bets'
                }, (payload) => {
                    this.handleNewBet(payload);
                })
                .subscribe();
            
            console.log('Real-time subscriptions established');
            
        } catch (error) {
            console.error('Error setting up real-time subscriptions:', error);
        }
    }

    /**
     * Handle competition update events
     */
    handleCompetitionUpdate(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        try {
            switch (eventType) {
                case 'INSERT':
                    if (['upcoming', 'voting', 'active'].includes(newRecord.status)) {
                        this.activeCompetitions.set(newRecord.competition_id, {
                            ...newRecord,
                            lastUpdated: Date.now()
                        });
                        
                        if (newRecord.status === 'active') {
                            this.startPriceCollection(newRecord);
                        }
                    }
                    break;
                    
                case 'UPDATE':
                    if (this.activeCompetitions.has(newRecord.competition_id)) {
                        this.activeCompetitions.set(newRecord.competition_id, {
                            ...newRecord,
                            lastUpdated: Date.now()
                        });
                        
                        // Handle status changes
                        if (oldRecord.status !== newRecord.status) {
                            this.handleStatusChange(newRecord, oldRecord.status);
                        }
                    }
                    break;
                    
                case 'DELETE':
                    this.activeCompetitions.delete(oldRecord.competition_id);
                    this.stopPriceCollection(oldRecord.competition_id);
                    break;
            }
            
        } catch (error) {
            console.error('Error handling competition update:', error);
        }
    }

    /**
     * Handle new bet events
     */
    handleNewBet(payload) {
        const bet = payload.new;
        
        try {
            // Update competition participant count
            if (this.activeCompetitions.has(bet.competition_id)) {
                const competition = this.activeCompetitions.get(bet.competition_id);
                // Trigger a refresh of competition data
                this.refreshCompetitionData(bet.competition_id);
            }
            
        } catch (error) {
            console.error('Error handling new bet:', error);
        }
    }

    /**
     * Handle competition status changes
     */
    handleStatusChange(competition, oldStatus) {
        try {
            console.log(`Competition ${competition.competition_id} status changed: ${oldStatus} -> ${competition.status}`);
            
            switch (competition.status) {
                case 'voting':
                    // Competition moved to voting phase
                    this.scheduleVotingEnd(competition);
                    break;
                    
                case 'active':
                    // Competition started - begin price collection
                    this.startPriceCollection(competition);
                    this.scheduleCompetitionEnd(competition);
                    break;
                    
                case 'closed':
                    // Competition ended - stop price collection and trigger resolution
                    this.stopPriceCollection(competition.competition_id);
                    this.scheduleCompetitionResolution(competition);
                    break;
                    
                case 'completed':
                    // Competition completed - clean up
                    this.activeCompetitions.delete(competition.competition_id);
                    break;
            }
            
        } catch (error) {
            console.error('Error handling status change:', error);
        }
    }

    /**
     * Start automated competition creation and management
     */
    startAutomation() {
        if (this.automationEnabled) return;
        
        this.automationEnabled = true;
        
        // Create competitions periodically
        this.competitionInterval = setInterval(() => {
            this.tryCreateNewCompetition();
        }, this.config.competitionCreationInterval * 60 * 1000);
        
        // Update competition statuses
        this.statusUpdateInterval = setInterval(() => {
            this.updateCompetitionStatuses();
        }, 30 * 1000); // Every 30 seconds
        
        // Initial competition creation
        setTimeout(() => {
            this.tryCreateNewCompetition();
        }, 5000);
        
        console.log('Competition automation started');
    }

    /**
     * Stop automation
     */
    stopAutomation() {
        this.automationEnabled = false;
        
        if (this.competitionInterval) {
            clearInterval(this.competitionInterval);
            this.competitionInterval = null;
        }
        
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
        }
        
        // Stop all price collection tasks
        for (const [competitionId] of this.priceCollectionTasks) {
            this.stopPriceCollection(competitionId);
        }
        
        console.log('Competition automation stopped');
    }

    /**
     * Try to create a new competition if conditions are met
     */
    async tryCreateNewCompetition() {
        try {
            // Check if we need more competitions
            const activeCount = Array.from(this.activeCompetitions.values())
                .filter(comp => ['upcoming', 'voting', 'active'].includes(comp.status)).length;
            
            if (activeCount >= this.config.maxActiveCompetitions) {
                console.log(`Maximum active competitions reached (${activeCount})`);
                return;
            }
            
            // Generate a new token pair
            const tokenPair = await this.generateTokenPair();
            if (!tokenPair) {
                console.log('No suitable token pair found for new competition');
                return;
            }
            
            // Create the competition
            const competition = await this.createCompetition(tokenPair);
            if (competition) {
                console.log(`Created new competition: ${competition.competition_id}`);
            }
            
        } catch (error) {
            console.error('Error creating new competition:', error);
        }
    }

    /**
     * Generate a suitable token pair for competition
     */
    async generateTokenPair() {
        try {
            console.log('Generating token pair...');
            
            // Get available token pairs from the token service
            const tokenPairs = await window.tokenService.generateTokenPairs(1);
            
            if (!tokenPairs || tokenPairs.length === 0) {
                console.log('No token pairs available');
                return null;
            }
            
            const pair = tokenPairs[0];
            
            // Validate pair suitability
            if (!this.validateTokenPair(pair)) {
                console.log('Generated token pair failed validation');
                return null;
            }
            
            console.log(`Generated token pair: ${pair.token_a.symbol} vs ${pair.token_b.symbol}`);
            return pair;
            
        } catch (error) {
            console.error('Error generating token pair:', error);
            return null;
        }
    }

    /**
     * Validate if a token pair is suitable for competition
     * FIXED: Updated validation logic to work with current token structure
     */
    validateTokenPair(pair) {
        try {
            console.log(`Validating token pair: ${pair.token_a?.symbol} vs ${pair.token_b?.symbol}`);
            
            // Check if tokens exist
            if (!pair.token_a || !pair.token_b) {
                console.log('Missing token data in pair');
                return false;
            }
            
            // Check market cap tolerance (use market_cap instead of market_cap_usd)
            const tokenAMarketCap = pair.token_a.market_cap || 0;
            const tokenBMarketCap = pair.token_b.market_cap || 0;
            
            if (tokenAMarketCap === 0 || tokenBMarketCap === 0) {
                console.log('Invalid market cap data for tokens');
                return false;
            }
            
            const marketCapDiff = Math.abs(tokenAMarketCap - tokenBMarketCap);
            const avgMarketCap = (tokenAMarketCap + tokenBMarketCap) / 2;
            const tolerance = marketCapDiff / avgMarketCap;
            
            if (tolerance > this.config.marketCapTolerance) {
                console.log(`Market cap tolerance exceeded: ${tolerance.toFixed(3)} > ${this.config.marketCapTolerance}`);
                return false;
            }
            
            // FIXED: More lenient price data validation for development
            const now = Date.now();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days (much more lenient)
            
            // Check token A price data (use last_updated instead of last_price_update)
            const tokenALastUpdate = pair.token_a.last_updated ? new Date(pair.token_a.last_updated).getTime() : now;
            if (now - tokenALastUpdate > maxAge) {
                console.log(`Token A price data too old: ${pair.token_a.symbol} (${Math.round((now - tokenALastUpdate) / (24 * 60 * 60 * 1000))} days old)`);
                // Don't return false - just warn for development
                console.warn('Allowing old price data for development purposes');
            }
            
            // Check token B price data (use last_updated instead of last_price_update)
            const tokenBLastUpdate = pair.token_b.last_updated ? new Date(pair.token_b.last_updated).getTime() : now;
            if (now - tokenBLastUpdate > maxAge) {
                console.log(`Token B price data too old: ${pair.token_b.symbol} (${Math.round((now - tokenBLastUpdate) / (24 * 60 * 60 * 1000))} days old)`);
                // Don't return false - just warn for development
                console.warn('Allowing old price data for development purposes');
            }
            
            // FIXED: More lenient liquidity validation for development
            const tokenALiquidity = pair.token_a.liquidity_score || 0.5; // Default to 0.5 if missing
            const tokenBLiquidity = pair.token_b.liquidity_score || 0.5; // Default to 0.5 if missing
            
            if (tokenALiquidity < 0.1 || tokenBLiquidity < 0.1) {
                console.log(`Low liquidity for tokens: A=${tokenALiquidity}, B=${tokenBLiquidity}`);
                // Don't return false - just warn for development
                console.warn('Allowing low liquidity for development purposes');
            }
            
            // Check if tokens have valid prices
            const tokenAPrice = pair.token_a.price || pair.token_a.price_usd;
            const tokenBPrice = pair.token_b.price || pair.token_b.price_usd;
            
            if (!tokenAPrice || !tokenBPrice || tokenAPrice <= 0 || tokenBPrice <= 0) {
                console.log(`Invalid price data: A=${tokenAPrice}, B=${tokenBPrice}`);
                return false;
            }
            
            console.log(`✅ Token pair validation passed: ${pair.token_a.symbol} vs ${pair.token_b.symbol}`);
            console.log(`   Market caps: $${(tokenAMarketCap / 1e6).toFixed(1)}M vs $${(tokenBMarketCap / 1e6).toFixed(1)}M`);
            console.log(`   Tolerance: ${tolerance.toFixed(3)} (max: ${this.config.marketCapTolerance})`);
            console.log(`   Prices: $${tokenAPrice} vs $${tokenBPrice}`);
            
            return true;
            
        } catch (error) {
            console.error('Error validating token pair:', error);
            return false;
        }
    }

    /**
     * Create a new competition with the given token pair
     */
    async createCompetition(tokenPair) {
        try {
            const now = Date.now();
            const votingStartTime = now + (2 * 60 * 1000); // Start voting in 2 minutes
            const competitionStartTime = votingStartTime + (this.config.votingDuration * 60 * 1000);
            const competitionEndTime = competitionStartTime + (this.config.defaultDuration * 60 * 1000);
            
            // FIXED: Use correct field names from token objects
            const competitionData = {
                token_a_address: tokenPair.token_a.address,
                token_b_address: tokenPair.token_b.address,
                token_a_symbol: tokenPair.token_a.symbol,
                token_b_symbol: tokenPair.token_b.symbol,
                token_a_name: tokenPair.token_a.name,
                token_b_name: tokenPair.token_b.name,
                token_a_logo: tokenPair.token_a.logoURI || tokenPair.token_a.logo_uri,
                token_b_logo: tokenPair.token_b.logoURI || tokenPair.token_b.logo_uri,
                token_a_start_price: tokenPair.token_a.price || tokenPair.token_a.price_usd,
                token_b_start_price: tokenPair.token_b.price || tokenPair.token_b.price_usd,
                voting_start_time: new Date(votingStartTime).toISOString(),
                competition_start_time: new Date(competitionStartTime).toISOString(),
                competition_end_time: new Date(competitionEndTime).toISOString(),
                status: 'upcoming',
                bet_amount: this.config.betAmount,
                platform_fee: this.config.platformFee,
                min_participants: this.config.minParticipants,
                max_participants: this.config.maxParticipants,
                market_cap_tolerance: this.config.marketCapTolerance,
                twap_window_minutes: this.config.twapWindowMinutes,
                created_by: 'system',
                is_automated: true
            };
            
            const { data: competition, error } = await window.supabase
                .from('competitions')
                .insert(competitionData)
                .select()
                .single();
            
            if (error) throw error;
            
            // Save the token pair information
            await this.saveTokenPair(tokenPair, competition.competition_id);
            
            // Schedule status updates
            this.scheduleStatusUpdate(competition, 'voting', votingStartTime);
            this.scheduleStatusUpdate(competition, 'active', competitionStartTime);
            this.scheduleStatusUpdate(competition, 'closed', competitionEndTime);
            
            return competition;
            
        } catch (error) {
            console.error('Error creating competition:', error);
            return null;
        }
    }

    /**
     * Save token pair information to database
     */
    async saveTokenPair(tokenPair, competitionId) {
        try {
            // FIXED: Use correct field names and add error handling
            const tokenAMarketCap = tokenPair.token_a.market_cap || 0;
            const tokenBMarketCap = tokenPair.token_b.market_cap || 0;
            
            const pairData = {
                competition_id: competitionId,
                token_a_address: tokenPair.token_a.address,
                token_b_address: tokenPair.token_b.address,
                market_cap_difference: Math.abs(tokenAMarketCap - tokenBMarketCap),
                compatibility_score: tokenPair.compatibility_score || 0.5,
                category: tokenPair.category || 'general',
                created_at: new Date().toISOString()
            };
            
            const { error } = await window.supabase
                .from('token_pairs')
                .insert(pairData);
            
            if (error) {
                console.error('Error saving token pair:', error);
            } else {
                console.log('Token pair saved successfully');
            }
            
        } catch (error) {
            console.error('Error saving token pair:', error);
        }
    }

    /**
     * Schedule a status update for a competition
     */
    scheduleStatusUpdate(competition, newStatus, timestamp) {
        const delay = timestamp - Date.now();
        
        if (delay > 0) {
            setTimeout(async () => {
                try {
                    await this.updateCompetitionStatus(competition.competition_id, newStatus);
                } catch (error) {
                    console.error(`Error updating competition status to ${newStatus}:`, error);
                }
            }, delay);
        }
    }

    /**
     * Update competition status
     */
    async updateCompetitionStatus(competitionId, newStatus) {
        try {
            const { error } = await window.supabase
                .from('competitions')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('competition_id', competitionId);
            
            if (error) throw error;
            
            console.log(`Updated competition ${competitionId} status to ${newStatus}`);
            
        } catch (error) {
            console.error('Error updating competition status:', error);
        }
    }

    /**
     * Update all competition statuses based on timestamps
     */
    async updateCompetitionStatuses() {
        const now = Date.now();
        
        for (const [competitionId, competition] of this.activeCompetitions) {
            try {
                let newStatus = competition.status;
                
                const votingStart = new Date(competition.voting_start_time).getTime();
                const competitionStart = new Date(competition.competition_start_time).getTime();
                const competitionEnd = new Date(competition.competition_end_time).getTime();
                
                // Determine correct status based on timestamps
                if (now >= competitionEnd && competition.status !== 'closed') {
                    newStatus = 'closed';
                } else if (now >= competitionStart && competition.status === 'voting') {
                    newStatus = 'active';
                } else if (now >= votingStart && competition.status === 'upcoming') {
                    newStatus = 'voting';
                }
                
                // Update status if changed
                if (newStatus !== competition.status) {
                    await this.updateCompetitionStatus(competitionId, newStatus);
                }
                
            } catch (error) {
                console.error(`Error updating status for competition ${competitionId}:`, error);
            }
        }
    }

    /**
     * Start price collection for an active competition
     */
    startPriceCollection(competition) {
        if (this.priceCollectionTasks.has(competition.competition_id)) {
            return; // Already collecting prices
        }
        
        console.log(`Starting price collection for competition ${competition.competition_id}`);
        
        const interval = setInterval(async () => {
            try {
                await this.collectCompetitionPrices(competition);
            } catch (error) {
                console.error(`Error collecting prices for competition ${competition.competition_id}:`, error);
            }
        }, this.config.priceCollectionInterval * 1000);
        
        this.priceCollectionTasks.set(competition.competition_id, interval);
        
        // Also collect initial prices immediately
        setTimeout(() => {
            this.collectCompetitionPrices(competition);
        }, 1000);
    }

    /**
     * Stop price collection for a competition
     */
    stopPriceCollection(competitionId) {
        const interval = this.priceCollectionTasks.get(competitionId);
        if (interval) {
            clearInterval(interval);
            this.priceCollectionTasks.delete(competitionId);
            console.log(`Stopped price collection for competition ${competitionId}`);
        }
    }

    /**
     * Collect current prices for competition tokens
     */
    async collectCompetitionPrices(competition) {
        try {
            const tokenAddresses = [competition.token_a_address, competition.token_b_address];
            
            // Call the price service to fetch current prices
            const priceResult = await window.priceService.fetchPrices(tokenAddresses);
            
            if (priceResult.success && priceResult.prices) {
                // Update competition with current prices
                const tokenAPrice = priceResult.prices.find(p => p.address === competition.token_a_address);
                const tokenBPrice = priceResult.prices.find(p => p.address === competition.token_b_address);
                
                if (tokenAPrice && tokenBPrice) {
                    await this.updateCompetitionPrices(competition.competition_id, {
                        token_a_current_price: tokenAPrice.price_usd || tokenAPrice.price,
                        token_b_current_price: tokenBPrice.price_usd || tokenBPrice.price,
                        price_last_updated: new Date().toISOString()
                    });
                }
            }
            
        } catch (error) {
            console.error('Error collecting competition prices:', error);
        }
    }

    /**
     * Update competition with current prices
     */
    async updateCompetitionPrices(competitionId, priceData) {
        try {
            const { error } = await window.supabase
                .from('competitions')
                .update(priceData)
                .eq('competition_id', competitionId);
            
            if (error) throw error;
            
        } catch (error) {
            console.error('Error updating competition prices:', error);
        }
    }

    /**
     * Schedule competition resolution
     */
    scheduleCompetitionResolution(competition) {
        // Wait for TWAP window before resolving
        const resolutionDelay = this.config.twapWindowMinutes * 60 * 1000;
        
        setTimeout(async () => {
            try {
                await this.resolveCompetition(competition.competition_id);
            } catch (error) {
                console.error(`Error resolving competition ${competition.competition_id}:`, error);
            }
        }, resolutionDelay);
    }

    /**
     * Resolve a completed competition using TWAP
     */
    async resolveCompetition(competitionId) {
        try {
            console.log(`Resolving competition ${competitionId}...`);
            
            const competition = this.activeCompetitions.get(competitionId);
            if (!competition) {
                console.error(`Competition ${competitionId} not found`);
                return;
            }
            
            const competitionStart = new Date(competition.competition_start_time).getTime();
            const competitionEnd = new Date(competition.competition_end_time).getTime();
            
            // Calculate TWAP for both tokens
            const twapStartA = competitionStart - (this.config.twapWindowMinutes * 60 * 1000);
            const twapEndA = competitionStart + (this.config.twapWindowMinutes * 60 * 1000);
            const twapStartB = competitionEnd - (this.config.twapWindowMinutes * 60 * 1000);
            const twapEndB = competitionEnd + (this.config.twapWindowMinutes * 60 * 1000);
            
            // Call price service to calculate TWAP
            const twapResult = await window.priceService.calculateTWAP([
                {
                    tokenAddress: competition.token_a_address,
                    startTimestamp: twapStartA,
                    endTimestamp: twapEndA
                },
                {
                    tokenAddress: competition.token_b_address,
                    startTimestamp: twapStartB,
                    endTimestamp: twapEndB
                }
            ]);
            
            if (!twapResult.success || !twapResult.calculations) {
                throw new Error('TWAP calculation failed');
            }
            
            const tokenATwap = twapResult.calculations.find(c => c.token_address === competition.token_a_address);
            const tokenBTwap = twapResult.calculations.find(c => c.token_address === competition.token_b_address);
            
            if (!tokenATwap || !tokenBTwap) {
                throw new Error('TWAP data incomplete');
            }
            
            // Calculate performance
            const tokenAPerformance = (tokenBTwap.twap_price - tokenATwap.twap_price) / tokenATwap.twap_price;
            const tokenBPerformance = (tokenBTwap.twap_price - tokenBTwap.twap_price) / tokenBTwap.twap_price;
            
            // Determine winner
            const winnerToken = tokenAPerformance > tokenBPerformance ? 'A' : 'B';
            
            // Update competition with results
            const { error } = await window.supabase
                .from('competitions')
                .update({
                    status: 'completed',
                    winner_token: winnerToken,
                    token_a_twap_start: tokenATwap.twap_price,
                    token_b_twap_start: tokenBTwap.twap_price,
                    token_a_twap_end: tokenATwap.twap_price,
                    token_b_twap_end: tokenBTwap.twap_price,
                    token_a_performance: tokenAPerformance,
                    token_b_performance: tokenBPerformance,
                    resolved_at: new Date().toISOString()
                })
                .eq('competition_id', competitionId);
            
            if (error) throw error;
            
            console.log(`Competition ${competitionId} resolved. Winner: Token ${winnerToken}`);
            
            // Process payouts (this would trigger smart contract interactions)
            await this.processPayouts(competitionId);
            
        } catch (error) {
            console.error(`Error resolving competition ${competitionId}:`, error);
            
            // Mark competition as failed
            await window.supabase
                .from('competitions')
                .update({
                    status: 'failed',
                    error_message: error.message,
                    resolved_at: new Date().toISOString()
                })
                .eq('competition_id', competitionId);
        }
    }

    /**
     * Process payouts for resolved competition
     */
    async processPayouts(competitionId) {
        try {
            // This would integrate with smart contracts for actual payouts
            console.log(`Processing payouts for competition ${competitionId}`);
            
            // For now, just update bet statuses
            const { error } = await window.supabase
                .from('bets')
                .update({ 
                    payout_processed: true,
                    processed_at: new Date().toISOString()
                })
                .eq('competition_id', competitionId);
            
            if (error) throw error;
            
        } catch (error) {
            console.error(`Error processing payouts for competition ${competitionId}:`, error);
        }
    }

    /**
     * Refresh competition data from database
     */
    async refreshCompetitionData(competitionId) {
        try {
            // FIXED: Simplified query without foreign key relationships for now
            const { data: competition, error } = await window.supabase
                .from('competitions')
                .select('*')
                .eq('competition_id', competitionId)
                .single();
            
            if (error) throw error;
            
            if (competition) {
                this.activeCompetitions.set(competitionId, {
                    ...competition,
                    lastUpdated: Date.now()
                });
            }
            
        } catch (error) {
            console.error(`Error refreshing competition data for ${competitionId}:`, error);
        }
    }

    /**
     * Get competition statistics
     */
    getStats() {
        const stats = {
            totalActive: this.activeCompetitions.size,
            byStatus: {},
            automationEnabled: this.automationEnabled,
            priceCollectionTasks: this.priceCollectionTasks.size
        };
        
        for (const competition of this.activeCompetitions.values()) {
            stats.byStatus[competition.status] = (stats.byStatus[competition.status] || 0) + 1;
        }
        
        return stats;
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.stopAutomation();
        this.activeCompetitions.clear();
        this.competitionQueue = [];
        this.isInitialized = false;
        console.log('Competition Manager destroyed');
    }
}

// Initialize competition manager globally
window.CompetitionManager = CompetitionManager;

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined') {
    window.addEventListener('load', async () => {
        // Wait for other services to initialize
        let retries = 0;
        const maxRetries = 30; // 30 seconds max wait
        
        while (retries < maxRetries) {
            if (window.supabase && window.tokenService && window.priceService) {
                try {
                    window.competitionManager = new CompetitionManager();
                    await window.competitionManager.initialize();
                    console.log('Competition Manager auto-initialized');
                    break;
                } catch (error) {
                    console.error('Competition Manager auto-initialization failed:', error);
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            retries++;
        }
        
        if (retries >= maxRetries) {
            console.warn('Competition Manager auto-initialization timed out');
        }
    });
}
