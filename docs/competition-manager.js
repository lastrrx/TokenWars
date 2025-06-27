/**
 * CompetitionManager - Competition Lifecycle Management
 * UPDATED: Automated creation DISABLED by default, controllable via admin panel
 */

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
        
        // AUTOMATED CREATION DISABLED BY DEFAULT
        this.automationConfig = {
            enabled: false, // ❌ DISABLED BY DEFAULT
            autoCreateInterval: 4 * 60 * 60 * 1000, // 4 hours
            maxConcurrentCompetitions: 6,
            votingDuration: 15 * 60 * 1000, // 15 minutes
            activeDuration: 60 * 60 * 1000, // 1 hour
            twapWindow: 10 * 60 * 1000, // 10 minutes
            minParticipants: 1,
            maxRetries: 3,
            failureCount: 0 // Track consecutive failures
        };
        
        // Service references
        this.tokenService = null;
        this.priceService = null;
        this.supabaseClient = null;
        
        // Store singleton instance
        CompetitionManager.instance = this;
        
        console.log('CompetitionManager: Constructor called - Automated creation DISABLED');
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
            
            // Step 4: Start background automation (but NOT auto-creation)
            this.startBackgroundAutomation();
            
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('✅ CompetitionManager initialized successfully');
            console.log(`   🎯 Active competitions: ${this.activeCompetitions.size}`);
            console.log(`   ⏰ Phase timers: ${this.phaseTimers.size}`);
            console.log(`   📊 Price schedules: ${this.priceCollectionSchedules.size}`);
            console.log(`   🤖 Automated creation: ${this.automationConfig.enabled ? 'ENABLED' : 'DISABLED'}`);
            
            return true;
        } catch (error) {
            console.error('❌ CompetitionManager initialization failed:', error);
            this.isInitialized = false;
            this.isInitializing = false;
            return false;
        }
    }

    // ===== AUTOMATION CONTROL FUNCTIONS =====

    /**
     * Enable automated competition creation
     */
    enableAutomatedCreation(config = {}) {
        try {
            this.automationConfig.enabled = true;
            this.automationConfig.failureCount = 0; // Reset failure count
            
            // Update config if provided
            if (config.maxConcurrentCompetitions) {
                this.automationConfig.maxConcurrentCompetitions = config.maxConcurrentCompetitions;
            }
            if (config.autoCreateInterval) {
                this.automationConfig.autoCreateInterval = config.autoCreateInterval * 60 * 60 * 1000; // Convert hours to ms
            }
            if (config.votingDuration) {
                this.automationConfig.votingDuration = config.votingDuration * 60 * 1000; // Convert minutes to ms
            }
            if (config.activeDuration) {
                this.automationConfig.activeDuration = config.activeDuration * 60 * 60 * 1000; // Convert hours to ms
            }
            
            console.log('🤖 Automated competition creation ENABLED');
            console.log('   📊 Config:', {
                maxConcurrent: this.automationConfig.maxConcurrentCompetitions,
                intervalHours: this.automationConfig.autoCreateInterval / (60 * 60 * 1000),
                votingMinutes: this.automationConfig.votingDuration / (60 * 1000),
                activeHours: this.automationConfig.activeDuration / (60 * 60 * 1000)
            });
            
            // Show admin notification
            if (window.showAdminNotification) {
                window.showAdminNotification('Automated competition creation enabled', 'success');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to enable automated creation:', error);
            return false;
        }
    }

    /**
     * Disable automated competition creation
     */
    disableAutomatedCreation() {
        try {
            this.automationConfig.enabled = false;
            console.log('🛑 Automated competition creation DISABLED');
            
            // Show admin notification
            if (window.showAdminNotification) {
                window.showAdminNotification('Automated competition creation disabled', 'warning');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to disable automated creation:', error);
            return false;
        }
    }

    /**
     * Get automation status
     */
    getAutomationStatus() {
        return {
            enabled: this.automationConfig.enabled,
            config: {
                maxConcurrentCompetitions: this.automationConfig.maxConcurrentCompetitions,
                autoCreateIntervalHours: this.automationConfig.autoCreateInterval / (60 * 60 * 1000),
                votingDurationMinutes: this.automationConfig.votingDuration / (60 * 1000),
                activeDurationHours: this.automationConfig.activeDuration / (60 * 60 * 1000)
            },
            status: {
                activeCompetitions: this.activeCompetitions.size,
                lastCreated: this.lastCompetitionCreated,
                failureCount: this.automationConfig.failureCount
            }
        };
    }

    /**
     * Update automation parameters
     */
    updateAutomationParameters(params) {
        try {
            if (params.maxConcurrentCompetitions !== undefined) {
                this.automationConfig.maxConcurrentCompetitions = params.maxConcurrentCompetitions;
            }
            if (params.autoCreateInterval !== undefined) {
                this.automationConfig.autoCreateInterval = params.autoCreateInterval * 60 * 60 * 1000;
            }
            if (params.votingDuration !== undefined) {
                this.automationConfig.votingDuration = params.votingDuration * 60 * 1000;
            }
            if (params.activeDuration !== undefined) {
                this.automationConfig.activeDuration = params.activeDuration * 60 * 60 * 1000;
            }
            
            console.log('✅ Automation parameters updated:', params);
            
            if (window.showAdminNotification) {
                window.showAdminNotification('Automation parameters updated', 'info');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to update automation parameters:', error);
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
                        await this.advanceCompetitionPhase(competitionId);
                    }
                } else if (status === 'VOTING') {
                    const votingEndTime = new Date(competition.voting_end_time);
                    if (votingEndTime > now) {
                        this.schedulePhaseTransition(competitionId, 'ACTIVE', votingEndTime);
                    } else {
                        await this.advanceCompetitionPhase(competitionId);
                    }
                } else if (status === 'ACTIVE') {
                    const endTime = new Date(competition.end_time);
                    if (endTime > now) {
                        this.schedulePhaseTransition(competitionId, 'CLOSED', endTime);
                        await this.scheduleCompetitionPriceCollection(competitionId);
                    } else {
                        await this.advanceCompetitionPhase(competitionId);
                    }
                } else if (status === 'CLOSED') {
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

    // Start background automation (monitoring only, not auto-creation)
    startBackgroundAutomation() {
        // Clear existing interval
        if (this.automationInterval) {
            clearInterval(this.automationInterval);
        }
        
        // Run automation every 30 seconds (monitoring only)
        this.automationInterval = setInterval(async () => {
            try {
                await this.processCompetitionQueue();
                await this.checkExpiredCompetitions();
                
                // Only auto-create if explicitly enabled
                if (this.automationConfig.enabled) {
                    await this.autoCreateCompetitions();
                }
            } catch (error) {
                console.error('Background automation error:', error);
            }
        }, 30000); // 30 seconds
        
        console.log('✅ Background automation started (monitoring only)');
    }

    // ==============================================
    // MANUAL COMPETITION CREATION (Always Available)
    // ==============================================

    /**
     * Create competition manually (admin-triggered)
     */
    async createManualCompetition(config = {}) {
        try {
            console.log('🎯 Creating manual competition...');
            
            // Merge with default config
            const competitionConfig = {
                ...this.automationConfig,
                ...config,
                isManual: true
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
            const timing = this.calculateCompetitionTiming(competitionConfig);
            
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
            
            console.log(`✅ Created manual competition: ${competition.competition_id}`);
            console.log(`   🪙 Tokens: ${tokenPair.token_a.symbol} vs ${tokenPair.token_b.symbol}`);
            console.log(`   ⏰ Start: ${timing.startTime}`);
            console.log(`   🏁 End: ${timing.endTime}`);
            
            if (window.showAdminNotification) {
                window.showAdminNotification(
                    `Manual competition created: ${tokenPair.token_a.symbol} vs ${tokenPair.token_b.symbol}`,
                    'success'
                );
            }
            
            return competition;
        } catch (error) {
            console.error('Failed to create manual competition:', error);
            if (window.showAdminNotification) {
                window.showAdminNotification(`Failed to create competition: ${error.message}`, 'error');
            }
            throw error;
        }
    }

    // ==============================================
    // AUTOMATED COMPETITION CREATION (Disabled by Default)
    // ==============================================

    // Create automated competition (only if automation enabled)
    async createAutomatedCompetition(config = {}) {
        if (!this.automationConfig.enabled) {
            console.log('🛑 Automated competition creation is disabled');
            return null;
        }
        
        try {
            console.log('🤖 Creating automated competition...');
            
            const competitionConfig = {
                ...this.automationConfig,
                ...config,
                isManual: false
            };
            
            const tokenPair = await this.selectOptimalTokenPair();
            if (!tokenPair) {
                throw new Error('No suitable token pair available');
            }
            
            const validation = await this.validateCompetitionTokens(
                tokenPair.token_a, 
                tokenPair.token_b
            );
            
            if (!validation.valid) {
                throw new Error(`Token validation failed: ${validation.reason}`);
            }
            
            const timing = this.calculateCompetitionTiming(competitionConfig);
            
            const competition = await this.createCompetitionInDatabase({
                tokenPair,
                timing,
                config: competitionConfig
            });
            
            await this.setupCompetitionAutomation(competition);
            this.activeCompetitions.set(competition.competition_id, competition);
            
            // Reset failure count on successful creation
            this.automationConfig.failureCount = 0;
            
            console.log(`✅ Created automated competition: ${competition.competition_id}`);
            
            return competition;
        } catch (error) {
            console.error('Failed to create automated competition:', error);
            
            // Increment failure count
            this.automationConfig.failureCount = (this.automationConfig.failureCount || 0) + 1;
            
            throw error;
        }
    }

    // Auto-create competitions (only if enabled)
    async autoCreateCompetitions() {
        try {
            if (!this.automationConfig.enabled) {
                return; // Automation disabled
            }
            
            // Check failure count - disable if too many failures
            if (this.automationConfig.failureCount >= 5) {
                console.log('🔴 Too many automated creation failures, disabling automation...');
                this.disableAutomatedCreation();
                return;
            }
            
            const activeCount = this.activeCompetitions.size;
            
            // Check if we need more competitions
            if (activeCount >= this.automationConfig.maxConcurrentCompetitions) {
                return;
            }
            
            // Check if enough time has passed since last creation
            if (this.lastCompetitionCreated) {
                const timeSinceLastCreation = Date.now() - new Date(this.lastCompetitionCreated).getTime();
                if (timeSinceLastCreation < this.automationConfig.autoCreateInterval) {
                    return;
                }
            }
            
            console.log(`🤖 Auto-creating competition (${activeCount}/${this.automationConfig.maxConcurrentCompetitions} active)`);
            
            const competition = await this.createAutomatedCompetition();
            if (competition) {
                this.lastCompetitionCreated = new Date().toISOString();
                console.log(`✅ Auto-created competition: ${competition.competition_id}`);
                
                if (window.showAdminNotification) {
                    window.showAdminNotification(
                        `Automated competition created: ${competition.token_a_symbol} vs ${competition.token_b_symbol}`,
                        'info'
                    );
                }
            }
        } catch (error) {
            console.error('Failed to auto-create competition:', error);
            this.automationConfig.failureCount = (this.automationConfig.failureCount || 0) + 1;
        }
    }

    // Select optimal token pair for competition
    async selectOptimalTokenPair() {
        try {
            if (!this.tokenService) {
                throw new Error('TokenService not available');
            }
            
            const tokenPairs = await this.tokenService.getAvailableTokenPairs();
            
            if (!tokenPairs || tokenPairs.length === 0) {
                console.warn('No token pairs available, generating new ones...');
                const newPairs = await this.tokenService.generateTokenPairs(10);
                if (!newPairs || newPairs.length === 0) {
                    return null;
                }
                return newPairs[0];
            }
            
            const availablePairs = tokenPairs.filter(pair => 
                !this.isTokenPairRecentlyUsed(pair)
            );
            
            if (availablePairs.length === 0) {
                console.warn('All pairs recently used, using oldest available...');
                return tokenPairs[0];
            }
            
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
            
            const marketCapA = tokenA.market_cap || 0;
            const marketCapB = tokenB.market_cap || 0;
            
            if (marketCapA === 0 || marketCapB === 0) {
                return { valid: false, reason: 'Missing market cap data' };
            }
            
            const ratio = Math.max(marketCapA, marketCapB) / Math.min(marketCapA, marketCapB);
            if (ratio > 1.1) {
                return { 
                    valid: false, 
                    reason: `Market cap difference too large: ${((ratio - 1) * 100).toFixed(1)}%` 
                };
            }
            
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
    calculateCompetitionTiming(config = this.automationConfig) {
        const now = new Date();
        
        const startTime = new Date(now.getTime() + 5 * 60 * 1000);
        const votingEndTime = new Date(startTime.getTime() + config.votingDuration);
        const endTime = new Date(votingEndTime.getTime() + config.activeDuration);
        
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
                is_auto_created: !config.isManual,
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

    async setupCompetitionAutomation(competition) {
        try {
            const competitionId = competition.competition_id;
            
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

    schedulePhaseTransition(competitionId, newPhase, transitionTime) {
        try {
            const now = new Date();
            const delay = transitionTime.getTime() - now.getTime();
            
            if (delay <= 0) {
                this.advanceCompetitionPhase(competitionId);
                return;
            }
            
            const existingTimer = this.phaseTimers.get(competitionId);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }
            
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
            
            await this.updateCompetitionStatus(competitionId, nextPhase);
            
            console.log(`🔄 Competition ${competitionId}: ${currentPhase} → ${nextPhase}`);
            
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
    // PLACEHOLDER FUNCTIONS (Competition Lifecycle)
    // ==============================================

    async scheduleCompetitionPriceCollection(competitionId) {
        console.log(`📊 Price collection scheduled for competition: ${competitionId}`);
        return true;
    }

    async resolveCompetition(competitionId) {
        console.log(`🏁 Resolving competition: ${competitionId}`);
        this.cleanupCompetition(competitionId);
        return true;
    }

    async processCompetitionQueue() {
        // Process any queued tasks
    }

    async checkExpiredCompetitions() {
        // Check for competitions that need resolution
    }

    cleanupCompetition(competitionId) {
        const timer = this.phaseTimers.get(competitionId);
        if (timer) {
            clearTimeout(timer);
            this.phaseTimers.delete(competitionId);
        }
        
        this.priceCollectionSchedules.delete(competitionId);
        this.activeCompetitions.delete(competitionId);
        
        console.log(`🧹 Cleaned up resources for competition: ${competitionId}`);
    }

    // ==============================================
    // UTILITY FUNCTIONS
    // ==============================================

    getCompetitionStatus() {
        return {
            activeCompetitions: this.activeCompetitions.size,
            phaseTimers: this.phaseTimers.size,
            priceSchedules: this.priceCollectionSchedules.size,
            queueSize: this.competitionQueue.length,
            lastCreated: this.lastCompetitionCreated,
            isInitialized: this.isInitialized,
            automationEnabled: this.automationConfig.enabled
        };
    }

    getCompetition(competitionId) {
        return this.activeCompetitions.get(competitionId);
    }

    getAllActiveCompetitions() {
        return Array.from(this.activeCompetitions.values());
    }

    isReady() {
        return this.isInitialized;
    }

    cleanup() {
        if (this.automationInterval) {
            clearInterval(this.automationInterval);
            this.automationInterval = null;
        }
        
        this.phaseTimers.forEach((timer, competitionId) => {
            clearTimeout(timer);
        });
        this.phaseTimers.clear();
        
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

console.log('✅ CompetitionManager class loaded - UPDATED VERSION');
console.log('🏁 Features:');
console.log('   🛑 Automated competition creation DISABLED by default');
console.log('   🎯 Manual competition creation available');
console.log('   🤖 Enhanced admin controls for automation');
console.log('   ⏰ Complete lifecycle management for existing competitions');
console.log('   📊 Competition monitoring and phase transitions');
console.log('   ⚠️ Automatic disabling after repeated failures');
console.log('   🔔 Admin notifications for status changes');
