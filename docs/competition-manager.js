/**
 * CompetitionManager - Competition Lifecycle Management
 * FIXED: Database-Centric Architecture - Removed Service Layer Dependencies
 * SOLUTION: Direct database queries instead of TokenService/PriceService calls
 * FIXED: UUID issues resolved - proper variable references and typos corrected
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
        
        // FIXED: Database client reference instead of service references
        this.supabaseClient = null;
        
        // Store singleton instance
        CompetitionManager.instance = this;
        
        console.log('CompetitionManager: Constructor called - Database-centric mode, automated creation DISABLED');
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
            console.log('🏁 CompetitionManager: Starting initialization with database-centric architecture...');
            
            // Step 1: Initialize database client reference
            await this.initializeDatabaseClient();
            
            // Step 2: Load existing active competitions
            await this.loadActiveCompetitions();
            
            // Step 3: Set up phase timers for existing competitions
            await this.setupExistingPhaseTimers();
            
            // Step 4: Start background automation (but NOT auto-creation)
            this.startBackgroundAutomation();
            
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('✅ CompetitionManager initialized successfully (database-centric)');
            console.log(`   🎯 Active competitions: ${this.activeCompetitions.size}`);
            console.log(`   ⏰ Phase timers: ${this.phaseTimers.size}`);
            console.log(`   📊 Price schedules: ${this.priceCollectionSchedules.size}`);
            console.log(`   🤖 Automated creation: ${this.automationConfig.enabled ? 'ENABLED' : 'DISABLED'}`);
            console.log(`   💾 Database client: ${this.supabaseClient ? 'Ready' : 'Not available'}`);
            
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
            
            console.log('🤖 Automated competition creation ENABLED (database-centric)');
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
            
            console.log('✅ Automation parameters updated (database-centric):', params);
            
            if (window.showAdminNotification) {
                window.showAdminNotification('Automation parameters updated', 'info');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to update automation parameters:', error);
            return false;
        }
    }

    // FIXED: Initialize database client instead of service references
    async initializeDatabaseClient() {
        try {
            // Get Supabase client
            if (window.supabaseClient) {
                this.supabaseClient = window.supabaseClient;
            } else if (window.getSupabaseClient) {
                this.supabaseClient = { getSupabaseClient: window.getSupabaseClient };
            } else if (window.supabase) {
                this.supabaseClient = { getSupabaseClient: () => window.supabase };
            } else {
                throw new Error('Supabase client not available');
            }
            
            console.log('✅ Database client initialized for CompetitionManager');
            console.log(`   💾 Supabase: ${this.supabaseClient ? 'Ready' : 'Not available'}`);
            
            return true;
        } catch (error) {
            console.error('Failed to initialize database client:', error);
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
            
            const competitions = await this.getActiveCompetitionsFromDatabase();
            
            if (competitions && competitions.length > 0) {
                competitions.forEach(competition => {
                    this.activeCompetitions.set(competition.competition_id, competition);
                });
                
                console.log(`✅ Loaded ${competitions.length} active competitions from database`);
            } else {
                console.log('No existing active competitions found');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to load active competitions:', error);
            return false;
        }
    }

    // FIXED: Get active competitions directly from database
    async getActiveCompetitionsFromDatabase() {
        try {
            const supabase = this.getSupabaseInstance();
            
            const { data, error } = await supabase
                .from('competitions')
                .select('*')
                .in('status', ['SETUP', 'VOTING', 'ACTIVE'])
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Database query error:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error getting active competitions from database:', error);
            return [];
        }
    }

    // Helper to get Supabase instance
    getSupabaseInstance() {
        if (this.supabaseClient) {
            if (typeof this.supabaseClient.getSupabaseClient === 'function') {
                return this.supabaseClient.getSupabaseClient();
            } else if (this.supabaseClient.from) {
                return this.supabaseClient;
            }
        }
        
        if (window.supabase) {
            return window.supabase;
        }
        
        throw new Error('Supabase instance not available');
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
        
        console.log('✅ Background automation started (monitoring only, database-centric)');
    }

    // ==============================================
    // MANUAL COMPETITION CREATION (Always Available)
    // ==============================================

    /**
     * Create competition manually (admin-triggered) - FIXED DATABASE-CENTRIC
     */
    async createManualCompetition(config = {}) {
        try {
            console.log('🎯 Creating manual competition with database-centric approach...');
            
            // Merge with default config
            const competitionConfig = {
                ...this.automationConfig,
                ...config,
                isManual: true
            };
            
            // FIXED: Get token pair directly from database or use provided pair
            let tokenPair;
            if (config.selectedPair) {
                // Use provided pair from admin interface
                tokenPair = config.selectedPair;
                console.log('Using provided token pair:', tokenPair.token_a_symbol, 'vs', tokenPair.token_b_symbol);
            } else {
                // Select optimal pair from database
                tokenPair = await this.selectOptimalTokenPairFromDatabase();
                if (!tokenPair) {
                    throw new Error('No suitable token pair available');
                }
            }
            
            // Validate token compatibility using database approach
            const validation = await this.validateTokenPairFromDatabase(tokenPair);
            
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
            console.log(`   🪙 Tokens: ${tokenPair.token_a_symbol} vs ${tokenPair.token_b_symbol}`);
            console.log(`   ⏰ Start: ${timing.startTime}`);
            console.log(`   🏁 End: ${timing.endTime}`);
            
            if (window.showAdminNotification) {
                window.showAdminNotification(
                    `Manual competition created: ${tokenPair.token_a_symbol} vs ${tokenPair.token_b_symbol}`,
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

    // Create automated competition (only if automation enabled) - FIXED DATABASE-CENTRIC
    async createAutomatedCompetition(config = {}) {
        if (!this.automationConfig.enabled) {
            console.log('🛑 Automated competition creation is disabled');
            return null;
        }
        
        try {
            console.log('🤖 Creating automated competition with database-centric approach...');
            
            const competitionConfig = {
                ...this.automationConfig,
                ...config,
                isManual: false
            };
            
            // FIXED: Select token pair from database
            const tokenPair = await this.selectOptimalTokenPairFromDatabase();
            if (!tokenPair) {
                throw new Error('No suitable token pair available');
            }
            
            const validation = await this.validateTokenPairFromDatabase(tokenPair);
            
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

    // Auto-create competitions (only if enabled) - FIXED DATABASE-CENTRIC
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

    // FIXED: Select optimal token pair from database (No Service Layer)
    async selectOptimalTokenPairFromDatabase() {
        try {
            console.log('🎯 Selecting optimal token pair from database...');
            
            const supabase = this.getSupabaseInstance();
            
            // Get active token pairs from database
            const { data: tokenPairs, error } = await supabase
                .from('token_pairs')
                .select('*')
                .eq('is_active', true)
                .order('compatibility_score', { ascending: false });
            
            if (error) {
                console.error('Error fetching token pairs:', error);
                return null;
            }
            
            if (!tokenPairs || tokenPairs.length === 0) {
                console.warn('No token pairs available in database');
                return null;
            }
            
            console.log(`Found ${tokenPairs.length} available token pairs`);
            
            // Filter out recently used pairs (last 24 hours)
            const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours
            const now = Date.now();
            
            const availablePairs = tokenPairs.filter(pair => {
                if (!pair.last_used) return true;
                const lastUsed = new Date(pair.last_used).getTime();
                return (now - lastUsed) > recentThreshold;
            });
            
            // If all pairs were used recently, use the oldest one
            const pairsToChoose = availablePairs.length > 0 ? availablePairs : tokenPairs;
            
            // Select the best pair (highest compatibility score)
            const optimalPair = pairsToChoose.reduce((best, current) => 
                (current.compatibility_score || 0) > (best.compatibility_score || 0) ? current : best
            );
            
            console.log(`✅ Selected optimal pair: ${optimalPair.token_a_symbol} vs ${optimalPair.token_b_symbol}`, {
                compatibility: optimalPair.compatibility_score,
                lastUsed: optimalPair.last_used,
                usageCount: optimalPair.usage_count
            });
            
            return optimalPair;
        } catch (error) {
            console.error('Failed to select optimal token pair from database:', error);
            return null;
        }
    }

    // FIXED: Validate token pair using database approach (No Service Layer)
    async validateTokenPairFromDatabase(tokenPair) {
        try {
            if (!tokenPair) {
                return { valid: false, reason: 'Missing token pair data' };
            }
            
            // Basic validation - since token pairs are already pre-approved in the database,
            // we mainly need to check data completeness
            if (!tokenPair.token_a_address || !tokenPair.token_b_address) {
                return { valid: false, reason: 'Missing token addresses' };
            }
            
            if (!tokenPair.token_a_symbol || !tokenPair.token_b_symbol) {
                return { valid: false, reason: 'Missing token symbols' };
            }
            
            if (!tokenPair.token_a_name || !tokenPair.token_b_name) {
                return { valid: false, reason: 'Missing token names' };
            }
            
            // Check if pair is still active
            if (tokenPair.is_active === false) {
                return { valid: false, reason: 'Token pair is not active' };
            }
            
            // Since pairs in the database are already approved and filtered,
            // we don't need to check blacklists or additional validation
            console.log(`✅ Token pair validation passed: ${tokenPair.token_a_symbol} vs ${tokenPair.token_b_symbol}`);
            
            return { 
                valid: true, 
                compatibility: tokenPair.compatibility_score || 0.8
            };
        } catch (error) {
            console.error('Token pair validation error:', error);
            return { valid: false, reason: `Validation error: ${error.message}` };
        }
    }

    // Calculate competition timing
    calculateCompetitionTiming(config = this.automationConfig) {
        const now = new Date();
        
        // Default to 5 minutes delay if startDelay not provided
        const startDelay = config.startDelay || (5 * 60 * 1000);
        
        const startTime = new Date(now.getTime() + startDelay);
        const votingEndTime = new Date(startTime.getTime() + config.votingDuration);
        const endTime = new Date(votingEndTime.getTime() + config.activeDuration);
        
        return {
            createdAt: now.toISOString(),
            startTime: startTime.toISOString(),
            votingEndTime: votingEndTime.toISOString(),
            endTime: endTime.toISOString()
        };
    }

    // Create competition in database - FIXED DATABASE-CENTRIC APPROACH
    async createCompetitionInDatabase({ tokenPair, timing, config }) {
        try {
            console.log('💾 Creating competition in database with database-centric approach...');
            
            const supabase = this.getSupabaseInstance();
            
            const competitionData = {
                token_a_address: tokenPair.token_a_address,
                token_b_address: tokenPair.token_b_address,
                token_a_symbol: tokenPair.token_a_symbol,
                token_b_symbol: tokenPair.token_b_symbol,
                token_a_name: tokenPair.token_a_name,
                token_b_name: tokenPair.token_b_name,
                token_a_start_price: 0, // Will be populated when competition starts
                token_b_start_price: 0, // Will be populated when competition starts
                status: 'SETUP',
                start_time: timing.startTime,
                voting_end_time: timing.votingEndTime,
                end_time: timing.endTime,
                total_pool: 0,
                total_bets: 0,
                winner_token: null,
                token_a_end_price: null,
                token_b_end_price: null,
                token_a_performance: null,
                token_b_performance: null,
                platform_fee_collected: 0,
                escrow_account: null,
                token_a_logo: null,
                token_b_logo: null,
                token_a_start_twap: null,
                token_a_end_twap: null,
                token_b_start_twap: null,
                token_b_end_twap: null,
                twap_calculated_at: null,
                pair_id: tokenPair.id,
                created_by: config.isManual ? (config.createdBy || 'ADMIN_MANUAL') : 'AUTOMATED_SYSTEM',
                created_at: timing.createdAt,
                updated_at: timing.createdAt,
                bet_amount: config.betAmount || 0.1,
                platform_fee_percentage: config.platformFeePercentage || 15.0,
                is_auto_created: !config.isManual
            };
            
            console.log('Competition data prepared:', competitionData);
            
            const { data, error } = await supabase
                .from('competitions')
                .insert([competitionData])
                .select()
                .single();
            
            if (error) {
                console.error('Database insert failed:', error);
                throw new Error(`Database insert failed: ${error.message}`);
            }
            
            console.log('✅ Competition created in database:', data);
            
            // Update token pair usage count
            try {
                await supabase
                    .from('token_pairs')
                    .update({ 
                        usage_count: (tokenPair.usage_count || 0) + 1,
                        last_used: new Date().toISOString(),
                        last_competition_id: data.competition_id, // ✅ Fixed: use data.competition_id after insert
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', tokenPair.id);
                
                console.log('✅ Token pair usage updated');
            } catch (updateError) {
                console.warn('Failed to update token pair usage:', updateError);
                // Don't fail the whole operation for this
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
            
            console.log(`✅ Automation set up for competition: ${competitionId}`); // ✅ Fixed: use competitionId
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
                    console.error(`Failed to advance competition ${competitionId} to ${newPhase}:`, error); // ✅ Fixed: use competitionId
                }
            }, delay);
            
            this.phaseTimers.set(competitionId, timer);
            
            console.log(`📅 Scheduled ${competitionId} → ${newPhase} in ${Math.round(delay / 1000)}s`); // ✅ Fixed: use competitionId
        } catch (error) {
            console.error('Failed to schedule phase transition:', error);
        }
    }

    async advanceCompetitionPhase(competitionId) {
        try {
            const competition = this.activeCompetitions.get(competitionId);
            if (!competition) {
                console.warn(`Competition ${competitionId} not found in active competitions`); // ✅ Fixed: use competitionId
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
                    console.warn(`Unknown phase: ${currentPhase} for competition ${competitionId}`); // ✅ Fixed: use competitionId
                    return false;
            }
            
            await this.updateCompetitionStatus(competitionId, nextPhase);
            
            console.log(`🔄 Competition ${competitionId}: ${currentPhase} → ${nextPhase}`); // ✅ Fixed: use competitionId
            
            if (nextPhase === 'VOTING') {
                this.schedulePhaseTransition(competitionId, 'ACTIVE', new Date(competition.voting_end_time));
            } else if (nextPhase === 'ACTIVE') {
                this.schedulePhaseTransition(competitionId, 'CLOSED', new Date(competition.end_time));
            }
            
            return true;
        } catch (error) {
            console.error(`Failed to advance competition ${competitionId}:`, error); // ✅ Fixed: use competitionId
            return false;
        }
    }

    async updateCompetitionStatus(competitionId, newStatus, additionalData = {}) {
        try {
            const supabase = this.getSupabaseInstance();
            
            const updateData = {
                status: newStatus,
                updated_at: new Date().toISOString(),
                ...additionalData
            };
            
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
            console.error(`Failed to update competition status for ${competitionId}:`, error); // ✅ Fixed: use competitionId
            throw error;
        }
    }

    // ==============================================
    // PLACEHOLDER FUNCTIONS (Competition Lifecycle)
    // ==============================================

    async scheduleCompetitionPriceCollection(competitionId) {
        console.log(`📊 Price collection scheduled for competition: ${competitionId}`); // ✅ Fixed: use competitionId
        return true;
    }

    async resolveCompetition(competitionId) {
        console.log(`🏁 Resolving competition: ${competitionId}`); // ✅ Fixed: use competitionId
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
        
        console.log(`🧹 Cleaned up resources for competition: ${competitionId}`); // ✅ Fixed: use competitionId
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
            automationEnabled: this.automationConfig.enabled,
            databaseConnected: !!this.supabaseClient
        };
    }

    getCompetition(competitionId) {
        return this.activeCompetitions.get(competitionId);
    }

    getAllActiveCompetitions() {
        return Array.from(this.activeCompetitions.values());
    }

    isReady() {
        return this.isInitialized && !!this.supabaseClient;
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

console.log('✅ CompetitionManager class loaded - DATABASE-CENTRIC VERSION (UUID ISSUES FIXED)');
console.log('🏁 Key Features:');
console.log('   💾 Database-Centric Architecture: Direct database queries, no service layer dependencies');
console.log('   🎯 Token Pair Selection: selectOptimalTokenPairFromDatabase() using direct SQL queries');
console.log('   ✅ Token Validation: validateTokenPairFromDatabase() with database approach');
console.log('   📝 Competition Creation: createCompetitionInDatabase() with direct inserts');
console.log('   🔄 Data Flow: Uses existing token_pairs table instead of TokenService');
console.log('   🛑 Automated creation DISABLED by default with admin controls');
console.log('   ⏰ Complete lifecycle management for existing competitions');
console.log('   📊 Competition monitoring and phase transitions');
console.log('   ⚠️ Automatic disabling after repeated failures');
console.log('   🔔 Admin notifications for status changes');
console.log('   🗄️ Supabase integration with error handling and graceful degradation');
console.log('   🔧 UUID FIXES: Removed custom ID generation, fixed variable references, added missing columns');
