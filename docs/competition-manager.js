// CompetitionManager - Automated Competition Lifecycle Management
// Handles competition creation, phase management, and TWAP-based resolution

class CompetitionManager {
    constructor() {
        // Singleton pattern
        if (CompetitionManager.instance) {
            console.log('CompetitionManager: Returning existing instance');
            return CompetitionManager.instance;
        }
        
        this.isInitialized = false;
        this.isInitializing = false;
        this.activeCompetitions = new Map();
        this.competitionQueue = [];
        this.phaseTimers = new Map();
        this.priceCollectionSchedules = new Map();
        this.automationInterval = null;
        this.lastCompetitionCreated = null;
        this.config = {
            autoCreateInterval: 4 * 60 * 60 * 1000, // 4 hours
            maxConcurrentCompetitions: 6,
            votingDuration: 15 * 60 * 1000, // 15 minutes
            activeDuration: 60 * 60 * 1000, // 1 hour
            twapWindow: 10 * 60 * 1000, // 10 minutes
            minParticipants: 1,
            maxRetries: 3
        };
        
        // Service references
        this.tokenService = null;
        this.priceService = null;
        this.supabaseClient = null;
        
        // Store singleton instance
        CompetitionManager.instance = this;
        
        console.log('CompetitionManager: Constructor called - NEW INSTANCE');
    }

    async initialize() {
        try {
            if (this.isInitializing) {
                console.log('CompetitionManager: Already initializing, waiting...');
                let attempts = 0;
                while (this.isInitializing && !this.isInitialized && attempts < 100) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                return this.isInitialized;
            }
            
            if (this.isInitialized) {
                console.log('CompetitionManager: Already initialized');
                return true;
            }
            
            this.isInitializing = true;
            console.log('🏁 CompetitionManager: Starting initialization...');
            
            // Step 1: Initialize service references
            await this.initializeServiceReferences();
            
            // Step 2: Load existing active competitions
            await this.loadActiveCompetitions();
            
            // Step 3: Set up phase timers for existing competitions
            await this.setupExistingPhaseTimers();
            
            // Step 4: Start background automation
            this.startBackgroundAutomation();
            
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('✅ CompetitionManager initialized successfully');
            console.log(`   🎯 Active competitions: ${this.activeCompetitions.size}`);
            console.log(`   ⏰ Phase timers: ${this.phaseTimers.size}`);
            console.log(`   📊 Price schedules: ${this.priceCollectionSchedules.size}`);
            
            return true;
        } catch (error) {
            console.error('❌ CompetitionManager initialization failed:', error);
            this.isInitialized = false;
            this.isInitializing = false;
            return false;
        }
    }

    // Initialize references to other services
    async initializeServiceReferences() {
        try {
            // Get TokenService
            if (window.getTokenService) {
                this.tokenService = window.getTokenService();
                if (!this.tokenService.isReady()) {
                    await this.tokenService.initialize();
                }
            }
            
            // Get PriceService
            if (window.getPriceService) {
                this.priceService = window.getPriceService();
                if (!this.priceService.isReady()) {
                    await this.priceService.initialize();
                }
            }
            
            // Get Supabase client
            if (window.supabaseClient) {
                this.supabaseClient = window.supabaseClient;
            }
            
            console.log('✅ Service references initialized');
            console.log(`   🪙 TokenService: ${this.tokenService ? 'Ready' : 'Not available'}`);
            console.log(`   💰 PriceService: ${this.priceService ? 'Ready' : 'Not available'}`);
            console.log(`   🗄️ Supabase: ${this.supabaseClient ? 'Ready' : 'Not available'}`);
            
            return true;
        } catch (error) {
            console.error('Failed to initialize service references:', error);
            return false;
        }
    }

    // Load existing active competitions from database
    async loadActiveCompetitions() {
        try {
            if (!this.supabaseClient) {
                console.warn('Supabase client not available for loading competitions');
                return false;
            }
            
            const competitions = await this.supabaseClient.getActiveCompetitions();
            
            if (competitions && competitions.length > 0) {
                competitions.forEach(competition => {
                    this.activeCompetitions.set(competition.competition_id, competition);
                });
                
                console.log(`✅ Loaded ${competitions.length} active competitions`);
            } else {
                console.log('No existing active competitions found');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to load active competitions:', error);
            return false;
        }
    }

    // Set up phase timers for existing competitions
    async setupExistingPhaseTimers() {
        try {
            const now = new Date();
            
            for (const [competitionId, competition] of this.activeCompetitions) {
                const status = competition.status;
                
                if (status === 'SETUP') {
                    const startTime = new Date(competition.start_time);
                    if (startTime > now) {
                        this.schedulePhaseTransition(competitionId, 'VOTING', startTime);
                    } else {
                        // Should already be in voting, advance immediately
                        await this.advanceCompetitionPhase(competitionId);
                    }
                } else if (status === 'VOTING') {
                    const votingEndTime = new Date(competition.voting_end_time);
                    if (votingEndTime > now) {
                        this.schedulePhaseTransition(competitionId, 'ACTIVE', votingEndTime);
                    } else {
                        // Should already be active, advance immediately
                        await this.advanceCompetitionPhase(competitionId);
                    }
                } else if (status === 'ACTIVE') {
                    const endTime = new Date(competition.end_time);
                    if (endTime > now) {
                        this.schedulePhaseTransition(competitionId, 'CLOSED', endTime);
                        
                        // Set up price collection if not already done
                        await this.scheduleCompetitionPriceCollection(competitionId);
                    } else {
                        // Should be closed, advance immediately
                        await this.advanceCompetitionPhase(competitionId);
                    }
                } else if (status === 'CLOSED') {
                    // Try to resolve immediately
                    await this.resolveCompetition(competitionId);
                }
            }
            
            console.log(`✅ Set up phase timers for ${this.phaseTimers.size} competitions`);
            return true;
        } catch (error) {
            console.error('Failed to setup existing phase timers:', error);
            return false;
        }
    }

    // Start background automation
    startBackgroundAutomation() {
        // Clear existing interval
        if (this.automationInterval) {
            clearInterval(this.automationInterval);
        }
        
        // Run automation every 30 seconds
        this.automationInterval = setInterval(async () => {
            try {
                await this.processCompetitionQueue();
                await this.checkExpiredCompetitions();
                await this.autoCreateCompetitions();
            } catch (error) {
                console.error('Background automation error:', error);
            }
        }, 30000); // 30 seconds
        
        console.log('✅ Background automation started (30-second intervals)');
    }

    // ==============================================
    // COMPETITION CREATION
    // ==============================================

    // Create automated competition with token pair selection
    async createAutomatedCompetition(config = {}) {
        try {
            console.log('🎯 Creating automated competition...');
            
            // Merge with default config
            const competitionConfig = {
                ...this.config,
                ...config
            };
            
            // Get eligible token pair
            const tokenPair = await this.selectOptimalTokenPair();
            if (!tokenPair) {
                throw new Error('No suitable token pair available');
            }
            
            // Validate token compatibility
            const validation = await this.validateCompetitionTokens(
                tokenPair.token_a, 
                tokenPair.token_b
            );
            
            if (!validation.valid) {
                throw new Error(`Token validation failed: ${validation.reason}`);
            }
            
            // Calculate competition timing
            const timing = this.calculateCompetitionTiming();
            
            // Create competition in database
            const competition = await this.createCompetitionInDatabase({
                tokenPair,
                timing,
                config: competitionConfig
            });
            
            // Set up automation for this competition
            await this.setupCompetitionAutomation(competition);
            
            // Add to active competitions
            this.activeCompetitions.set(competition.competition_id, competition);
            
            console.log(`✅ Created automated competition: ${competition.competition_id}`);
            console.log(`   🪙 Tokens: ${tokenPair.token_a.symbol} vs ${tokenPair.token_b.symbol}`);
            console.log(`   ⏰ Start: ${timing.startTime}`);
            console.log(`   🏁 End: ${timing.endTime}`);
            
            return competition;
        } catch (error) {
            console.error('Failed to create automated competition:', error);
            throw error;
        }
    }

    // Select optimal token pair for competition
    async selectOptimalTokenPair() {
        try {
            if (!this.tokenService) {
                throw new Error('TokenService not available');
            }
            
            // Get available token pairs
            const tokenPairs = await this.tokenService.getAvailableTokenPairs();
            
            if (!tokenPairs || tokenPairs.length === 0) {
                console.warn('No token pairs available, generating new ones...');
                const newPairs = await this.tokenService.generateTokenPairs(10);
                if (!newPairs || newPairs.length === 0) {
                    return null;
                }
                return newPairs[0];
            }
            
            // Filter out pairs already used in recent competitions
            const availablePairs = tokenPairs.filter(pair => 
                !this.isTokenPairRecentlyUsed(pair)
            );
            
            if (availablePairs.length === 0) {
                console.warn('All pairs recently used, using oldest available...');
                return tokenPairs[0];
            }
            
            // Select pair with highest compatibility score
            const optimalPair = availablePairs.reduce((best, current) => 
                (current.compatibility_score || 0) > (best.compatibility_score || 0) ? current : best
            );
            
            return optimalPair;
        } catch (error) {
            console.error('Failed to select optimal token pair:', error);
            return null;
        }
    }

    // Check if token pair was used recently
    isTokenPairRecentlyUsed(tokenPair) {
        const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        
        for (const competition of this.activeCompetitions.values()) {
            if (competition.created_at) {
                const competitionAge = now - new Date(competition.created_at).getTime();
                
                if (competitionAge < recentThreshold) {
                    const sameTokens = (
                        (competition.token_a_address === tokenPair.token_a_address && 
                         competition.token_b_address === tokenPair.token_b_address) ||
                        (competition.token_a_address === tokenPair.token_b_address && 
                         competition.token_b_address === tokenPair.token_a_address)
                    );
                    
                    if (sameTokens) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    // Validate token compatibility for competition
    async validateCompetitionTokens(tokenA, tokenB) {
        try {
            if (!tokenA || !tokenB) {
                return { valid: false, reason: 'Missing token data' };
            }
            
            // Check if tokens exist and are valid
            if (!this.tokenService) {
                return { valid: false, reason: 'TokenService not available' };
            }
            
            const [validA, validB] = await Promise.all([
                this.tokenService.validateToken(tokenA),
                this.tokenService.validateToken(tokenB)
            ]);
            
            if (!validA) {
                return { valid: false, reason: `Token A (${tokenA.symbol}) validation failed` };
            }
            
            if (!validB) {
                return { valid: false, reason: `Token B (${tokenB.symbol}) validation failed` };
            }
            
            // Check market cap compatibility (±10% tolerance)
            const marketCapA = tokenA.market_cap || 0;
            const marketCapB = tokenB.market_cap || 0;
            
            if (marketCapA === 0 || marketCapB === 0) {
                return { valid: false, reason: 'Missing market cap data' };
            }
            
            const ratio = Math.max(marketCapA, marketCapB) / Math.min(marketCapA, marketCapB);
            if (ratio > 1.1) { // More than 10% difference
                return { 
                    valid: false, 
                    reason: `Market cap difference too large: ${((ratio - 1) * 100).toFixed(1)}%` 
                };
            }
            
            // Check if tokens are blacklisted
            const [blacklistedA, blacklistedB] = await Promise.all([
                this.tokenService.isTokenBlacklisted(tokenA.address),
                this.tokenService.isTokenBlacklisted(tokenB.address)
            ]);
            
            if (blacklistedA) {
                return { valid: false, reason: `Token A (${tokenA.symbol}) is blacklisted` };
            }
            
            if (blacklistedB) {
                return { valid: false, reason: `Token B (${tokenB.symbol}) is blacklisted` };
            }
            
            return { 
                valid: true, 
                compatibility: this.tokenService.calculateCompatibility(tokenA, tokenB)
            };
        } catch (error) {
            console.error('Token validation error:', error);
            return { valid: false, reason: `Validation error: ${error.message}` };
        }
    }

    // Calculate competition timing
    calculateCompetitionTiming() {
        const now = new Date();
        
        // Start in 5 minutes to allow setup
        const startTime = new Date(now.getTime() + 5 * 60 * 1000);
        
        // Voting ends 15 minutes after start
        const votingEndTime = new Date(startTime.getTime() + this.config.votingDuration);
        
        // Competition ends 1 hour after voting starts
        const endTime = new Date(votingEndTime.getTime() + this.config.activeDuration);
        
        return {
            createdAt: now.toISOString(),
            startTime: startTime.toISOString(),
            votingEndTime: votingEndTime.toISOString(),
            endTime: endTime.toISOString()
        };
    }

    // Create competition in database
    async createCompetitionInDatabase({ tokenPair, timing, config }) {
        try {
            if (!this.supabaseClient || !this.supabaseClient.getSupabaseClient) {
                throw new Error('Supabase client not available');
            }
            
            const competitionData = {
                competition_id: `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                token_a_address: tokenPair.token_a_address || tokenPair.token_a.address,
                token_b_address: tokenPair.token_b_address || tokenPair.token_b.address,
                token_a_symbol: tokenPair.token_a.symbol,
                token_b_symbol: tokenPair.token_b.symbol,
                token_a_name: tokenPair.token_a.name,
                token_b_name: tokenPair.token_b.name,
                token_a_start_price: tokenPair.token_a.price || 0,
                token_b_start_price: tokenPair.token_b.price || 0,
                status: 'SETUP',
                start_time: timing.startTime,
                voting_end_time: timing.votingEndTime,
                end_time: timing.endTime,
                bet_amount: window.APP_CONFIG?.BET_AMOUNT || 0.1,
                platform_fee: window.APP_CONFIG?.PLATFORM_FEE || 15,
                total_pool: 0,
                total_bets: 0,
                token_a_bets: 0,
                token_b_bets: 0,
                winner_token: null,
                winner_price: null,
                token_a_twap: null,
                token_b_twap: null,
                is_auto_created: true,
                compatibility_score: tokenPair.compatibility_score || 0.85,
                created_at: timing.createdAt,
                updated_at: timing.createdAt
            };
            
            const supabase = this.supabaseClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('competitions')
                .insert([competitionData])
                .select()
                .single();
            
            if (error) {
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Failed to create competition in database:', error);
            throw error;
        }
    }

    // ==============================================
    // COMPETITION LIFECYCLE MANAGEMENT
    // ==============================================

    // Set up automation for a competition
    async setupCompetitionAutomation(competition) {
        try {
            const competitionId = competition.competition_id;
            
            // Schedule phase transitions
            this.schedulePhaseTransition(competitionId, 'VOTING', new Date(competition.start_time));
            this.schedulePhaseTransition(competitionId, 'ACTIVE', new Date(competition.voting_end_time));
            this.schedulePhaseTransition(competitionId, 'CLOSED', new Date(competition.end_time));
            
            console.log(`✅ Automation set up for competition: ${competitionId}`);
            return true;
        } catch (error) {
            console.error('Failed to setup competition automation:', error);
            return false;
        }
    }

    // Schedule phase transition
    schedulePhaseTransition(competitionId, newPhase, transitionTime) {
        try {
            const now = new Date();
            const delay = transitionTime.getTime() - now.getTime();
            
            if (delay <= 0) {
                // Should transition immediately
                this.advanceCompetitionPhase(competitionId);
                return;
            }
            
            // Clear existing timer for this competition
            const existingTimer = this.phaseTimers.get(competitionId);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }
            
            // Set new timer
            const timer = setTimeout(async () => {
                try {
                    await this.advanceCompetitionPhase(competitionId);
                    this.phaseTimers.delete(competitionId);
                } catch (error) {
                    console.error(`Failed to advance competition ${competitionId} to ${newPhase}:`, error);
                }
            }, delay);
            
            this.phaseTimers.set(competitionId, timer);
            
            console.log(`📅 Scheduled ${competitionId} → ${newPhase} in ${Math.round(delay / 1000)}s`);
        } catch (error) {
            console.error('Failed to schedule phase transition:', error);
        }
    }

    // Advance competition to next phase
    async advanceCompetitionPhase(competitionId) {
        try {
            const competition = this.activeCompetitions.get(competitionId);
            if (!competition) {
                console.warn(`Competition ${competitionId} not found in active competitions`);
                return false;
            }
            
            const currentPhase = competition.status;
            let nextPhase;
            
            switch (currentPhase) {
                case 'SETUP':
                    nextPhase = 'VOTING';
                    break;
                case 'VOTING':
                    nextPhase = 'ACTIVE';
                    await this.scheduleCompetitionPriceCollection(competitionId);
                    break;
                case 'ACTIVE':
                    nextPhase = 'CLOSED';
                    break;
                case 'CLOSED':
                    return await this.resolveCompetition(competitionId);
                default:
                    console.warn(`Unknown phase: ${currentPhase} for competition ${competitionId}`);
                    return false;
            }
            
            // Update competition status
            await this.updateCompetitionStatus(competitionId, nextPhase);
            
            console.log(`🔄 Competition ${competitionId}: ${currentPhase} → ${nextPhase}`);
            
            // Schedule next phase if needed
            if (nextPhase === 'VOTING') {
                this.schedulePhaseTransition(competitionId, 'ACTIVE', new Date(competition.voting_end_time));
            } else if (nextPhase === 'ACTIVE') {
                this.schedulePhaseTransition(competitionId, 'CLOSED', new Date(competition.end_time));
            }
            
            return true;
        } catch (error) {
            console.error(`Failed to advance competition ${competitionId}:`, error);
            return false;
        }
    }

    // Update competition status in database
    async updateCompetitionStatus(competitionId, newStatus, additionalData = {}) {
        try {
            if (!this.supabaseClient || !this.supabaseClient.getSupabaseClient) {
                throw new Error('Supabase client not available');
            }
            
            const updateData = {
                status: newStatus,
                updated_at: new Date().toISOString(),
                ...additionalData
            };
            
            const supabase = this.supabaseClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('competitions')
                .update(updateData)
                .eq('competition_id', competitionId)
                .select()
                .single();
            
            if (error) {
                throw error;
            }
            
            // Update local cache
            if (this.activeCompetitions.has(competitionId)) {
                const competition = this.activeCompetitions.get(competitionId);
                Object.assign(competition, updateData);
            }
            
            return data;
        } catch (error) {
            console.error(`Failed to update competition status for ${competitionId}:`, error);
            throw error;
        }
    }

    // ==============================================
    // PRICE COLLECTION AND TWAP RESOLUTION
    // ==============================================

    // Schedule price collection for competition
    async scheduleCompetitionPriceCollection(competitionId) {
        try {
            const competition = this.activeCompetitions.get(competitionId);
            if (!competition) {
                throw new Error(`Competition ${competitionId} not found`);
            }
            
            if (!this.priceService) {
                console.warn('PriceService not available for price collection');
                return false;
            }
            
            const tokens = [competition.token_a_address, competition.token_b_address];
            const startTime = competition.voting_end_time; // Start collecting when competition becomes active
            const endTime = competition.end_time;
            
            // Schedule price collection
            const success = await this.priceService.scheduleCompetitionPriceCollection(
                competitionId,
                tokens,
                startTime,
                endTime
            );
            
            if (success) {
                this.priceCollectionSchedules.set(competitionId, {
                    tokens,
                    startTime,
                    endTime,
                    scheduledAt: new Date().toISOString()
                });
                
                console.log(`📊 Price collection scheduled for competition: ${competitionId}`);
            }
            
            return success;
        } catch (error) {
            console.error(`Failed to schedule price collection for ${competitionId}:`, error);
            return false;
        }
    }

    // Resolve competition using TWAP calculations
    async resolveCompetition(competitionId, retryCount = 0) {
        try {
            console.log(`🏁 Resolving competition: ${competitionId} (attempt ${retryCount + 1})`);
            
            const competition = this.activeCompetitions.get(competitionId);
            if (!competition) {
                throw new Error(`Competition ${competitionId} not found`);
            }
            
            // Check if already resolved
            if (competition.status === 'RESOLVED') {
                console.log(`Competition ${competitionId} already resolved`);
                return true;
            }
            
            // Check minimum participants
            const totalBets = (competition.total_bets || 0);
            if (totalBets < this.config.minParticipants) {
                console.log(`Competition ${competitionId} cancelled - insufficient participants (${totalBets})`);
                return await this.cancelCompetition(competitionId, 'Insufficient participants');
            }
            
            // Calculate TWAP for both tokens
            const twapResults = await this.calculateCompetitionTWAP(competition);
            
            if (!twapResults.success) {
                if (retryCount < this.config.maxRetries) {
                    console.log(`TWAP calculation failed, retrying in 30 seconds... (${retryCount + 1}/${this.config.maxRetries})`);
                    setTimeout(() => {
                        this.resolveCompetition(competitionId, retryCount + 1);
                    }, 30000);
                    return false;
                } else {
                    console.error(`TWAP calculation failed after ${this.config.maxRetries} attempts, cancelling competition`);
                    return await this.cancelCompetition(competitionId, 'TWAP calculation failed');
                }
            }
            
            // Determine winner
            const winner = this.determineWinner(twapResults);
            
            // Update competition with results
            await this.updateCompetitionStatus(competitionId, 'RESOLVED', {
                winner_token: winner.token,
                winner_price: winner.price,
                token_a_twap: twapResults.tokenA.twap,
                token_b_twap: twapResults.tokenB.twap,
                resolution_method: 'TWAP',
                resolved_at: new Date().toISOString()
            });
            
            // Clean up timers and schedules
            this.cleanupCompetition(competitionId);
            
            console.log(`✅ Competition ${competitionId} resolved: Winner is ${winner.token} (${winner.symbol})`);
            console.log(`   📊 TWAP A: ${twapResults.tokenA.twap}`);
            console.log(`   📊 TWAP B: ${twapResults.tokenB.twap}`);
            console.log(`   🏆 Performance: ${((winner.price / winner.startPrice - 1) * 100).toFixed(2)}%`);
            
            return true;
        } catch (error) {
            console.error(`Failed to resolve competition ${competitionId}:`, error);
            
            if (retryCount < this.config.maxRetries) {
                setTimeout(() => {
                    this.resolveCompetition(competitionId, retryCount + 1);
                }, 30000);
                return false;
            } else {
                return await this.cancelCompetition(competitionId, `Resolution failed: ${error.message}`);
            }
        }
    }

    // Calculate TWAP for competition tokens
    async calculateCompetitionTWAP(competition) {
        try {
            if (!this.priceService) {
                throw new Error('PriceService not available');
            }
            
            const startTime = competition.voting_end_time;
            const endTime = competition.end_time;
            
            // Calculate TWAP for both tokens
            const [twapA, twapB] = await Promise.all([
                this.priceService.calculateTWAP(competition.token_a_address, startTime, endTime),
                this.priceService.calculateTWAP(competition.token_b_address, startTime, endTime)
            ]);
            
            if (!twapA || !twapB || twapA === 0 || twapB === 0) {
                throw new Error('Invalid TWAP calculation results');
            }
            
            return {
                success: true,
                tokenA: {
                    address: competition.token_a_address,
                    symbol: competition.token_a_symbol,
                    twap: twapA,
                    startPrice: competition.token_a_start_price
                },
                tokenB: {
                    address: competition.token_b_address,
                    symbol: competition.token_b_symbol,
                    twap: twapB,
                    startPrice: competition.token_b_start_price
                }
            };
        } catch (error) {
            console.error('TWAP calculation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Determine winner based on TWAP performance
    determineWinner(twapResults) {
        const { tokenA, tokenB } = twapResults;
        
        // Calculate performance relative to start price
        const performanceA = (tokenA.twap / tokenA.startPrice) - 1;
        const performanceB = (tokenB.twap / tokenB.startPrice) - 1;
        
        if (performanceA > performanceB) {
            return {
                token: 'token_a',
                symbol: tokenA.symbol,
                address: tokenA.address,
                price: tokenA.twap,
                startPrice: tokenA.startPrice,
                performance: performanceA
            };
        } else if (performanceB > performanceA) {
            return {
                token: 'token_b',
                symbol: tokenB.symbol,
                address: tokenB.address,
                price: tokenB.twap,
                startPrice: tokenB.startPrice,
                performance: performanceB
            };
        } else {
            // Tie - choose token A by default
            console.log('Competition ended in a tie, defaulting to token A');
            return {
                token: 'token_a',
                symbol: tokenA.symbol,
                address: tokenA.address,
                price: tokenA.twap,
                startPrice: tokenA.startPrice,
                performance: performanceA,
                tie: true
            };
        }
    }

    // Cancel competition
    async cancelCompetition(competitionId, reason) {
        try {
            console.log(`❌ Cancelling competition ${competitionId}: ${reason}`);
            
            await this.updateCompetitionStatus(competitionId, 'CANCELLED', {
                cancellation_reason: reason,
                cancelled_at: new Date().toISOString()
            });
            
            this.cleanupCompetition(competitionId);
            
            return true;
        } catch (error) {
            console.error(`Failed to cancel competition ${competitionId}:`, error);
            return false;
        }
    }

    // Clean up competition resources
    cleanupCompetition(competitionId) {
        // Clear phase timer
        const timer = this.phaseTimers.get(competitionId);
        if (timer) {
            clearTimeout(timer);
            this.phaseTimers.delete(competitionId);
        }
        
        // Remove price collection schedule
        this.priceCollectionSchedules.delete(competitionId);
        
        // Remove from active competitions
        this.activeCompetitions.delete(competitionId);
        
        console.log(`🧹 Cleaned up resources for competition: ${competitionId}`);
    }

    // ==============================================
    // BACKGROUND AUTOMATION
    // ==============================================

    // Process competition queue
    async processCompetitionQueue() {
        if (this.competitionQueue.length === 0) return;
        
        console.log(`🔄 Processing competition queue: ${this.competitionQueue.length} items`);
        
        while (this.competitionQueue.length > 0) {
            const task = this.competitionQueue.shift();
            
            try {
                await this.executeCompetitionTask(task);
            } catch (error) {
                console.error('Failed to execute competition task:', error);
            }
        }
    }

    // Check for expired competitions
    async checkExpiredCompetitions() {
        const now = new Date();
        const expiredCompetitions = [];
        
        for (const [competitionId, competition] of this.activeCompetitions) {
            const endTime = new Date(competition.end_time);
            
            if (now > endTime && competition.status !== 'RESOLVED' && competition.status !== 'CANCELLED') {
                expiredCompetitions.push(competitionId);
            }
        }
        
        if (expiredCompetitions.length > 0) {
            console.log(`⏰ Found ${expiredCompetitions.length} expired competitions`);
            
            for (const competitionId of expiredCompetitions) {
                try {
                    await this.resolveCompetition(competitionId);
                } catch (error) {
                    console.error(`Failed to resolve expired competition ${competitionId}:`, error);
                }
            }
        }
    }

    // Auto-create competitions
    async autoCreateCompetitions() {
        try {
            const activeCount = this.activeCompetitions.size;
            
            // Check if we need more competitions
            if (activeCount >= this.config.maxConcurrentCompetitions) {
                return;
            }
            
            // Check if enough time has passed since last creation
            if (this.lastCompetitionCreated) {
                const timeSinceLastCreation = Date.now() - new Date(this.lastCompetitionCreated).getTime();
                if (timeSinceLastCreation < this.config.autoCreateInterval) {
                    return;
                }
            }
            
            console.log(`🎯 Auto-creating competition (${activeCount}/${this.config.maxConcurrentCompetitions} active)`);
            
            const competition = await this.createAutomatedCompetition();
            this.lastCompetitionCreated = new Date().toISOString();
            
            console.log(`✅ Auto-created competition: ${competition.competition_id}`);
        } catch (error) {
            console.error('Failed to auto-create competition:', error);
        }
    }

    // Execute competition task
    async executeCompetitionTask(task) {
        switch (task.type) {
            case 'advance_phase':
                await this.advanceCompetitionPhase(task.competitionId);
                break;
            case 'resolve':
                await this.resolveCompetition(task.competitionId);
                break;
            case 'cancel':
                await this.cancelCompetition(task.competitionId, task.reason);
                break;
            default:
                console.warn('Unknown competition task type:', task.type);
        }
    }

    // ==============================================
    // UTILITY FUNCTIONS
    // ==============================================

    // Get competition status
    getCompetitionStatus() {
        return {
            activeCompetitions: this.activeCompetitions.size,
            phaseTimers: this.phaseTimers.size,
            priceSchedules: this.priceCollectionSchedules.size,
            queueSize: this.competitionQueue.length,
            lastCreated: this.lastCompetitionCreated,
            isInitialized: this.isInitialized
        };
    }

    // Get competition by ID
    getCompetition(competitionId) {
        return this.activeCompetitions.get(competitionId);
    }

    // Get all active competitions
    getAllActiveCompetitions() {
        return Array.from(this.activeCompetitions.values());
    }

    // Check if ready
    isReady() {
        return this.isInitialized;
    }

    // Cleanup function
    cleanup() {
        // Clear automation interval
        if (this.automationInterval) {
            clearInterval(this.automationInterval);
            this.automationInterval = null;
        }
        
        // Clear all phase timers
        this.phaseTimers.forEach((timer, competitionId) => {
            clearTimeout(timer);
        });
        this.phaseTimers.clear();
        
        // Clear other data
        this.activeCompetitions.clear();
        this.priceCollectionSchedules.clear();
        this.competitionQueue = [];
        
        console.log('🧹 CompetitionManager cleaned up');
    }
}

// Static property to hold singleton instance
CompetitionManager.instance = null;

// Create global singleton instance
function getCompetitionManager() {
    if (!window.competitionManager) {
        window.competitionManager = new CompetitionManager();
    }
    return window.competitionManager;
}

// Immediately expose CompetitionManager globally
window.CompetitionManager = CompetitionManager;
window.getCompetitionManager = getCompetitionManager;

console.log('✅ CompetitionManager class loaded and exposed globally');
console.log('🏁 Phase 2 Features:');
console.log('   🎯 Automated competition creation with token pairs');
console.log('   ⏰ Complete lifecycle management (SETUP → VOTING → ACTIVE → CLOSED → RESOLVED)');
console.log('   📊 TWAP-based competition resolution');
console.log('   🔄 Background automation and monitoring');
console.log('   🔗 Full integration with TokenService and PriceService');
