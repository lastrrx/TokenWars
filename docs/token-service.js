// CompetitionService - SIMPLIFIED FOR COMPETITIONS TABLE ONLY
// Focuses only on competitions table - managed via admin panel

class CompetitionService {
    constructor() {
        // Singleton pattern
        if (CompetitionService.instance) {
            console.log('CompetitionService: Returning existing instance');
            return CompetitionService.instance;
        }
        
        this.competitions = [];
        this.isInitialized = false;
        this.isInitializing = false;
        this.lastUpdate = null;
        this.updateInterval = null;
        
        // Store as singleton instance
        CompetitionService.instance = this;
        
        console.log('CompetitionService constructor called - SIMPLIFIED VERSION');
    }

    async initialize() {
        try {
            if (this.isInitializing) {
                console.log('CompetitionService: Already initializing, waiting...');
                let attempts = 0;
                while (this.isInitializing && !this.isInitialized && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                return this.isInitialized;
            }
            
            if (this.isInitialized) {
                console.log('CompetitionService: Already initialized');
                return true;
            }
            
            this.isInitializing = true;
            console.log('CompetitionService: Starting simplified initialization...');
            
            // Step 1: Try to load from competitions table
            console.log('🔄 Loading competitions from table...');
            const competitionsLoaded = await this.loadCompetitionsFromTable();
            
            // Step 2: If no competitions, create demo data
            if (!competitionsLoaded || this.competitions.length === 0) {
                console.log('🔄 No competitions found, using demo data...');
                this.competitions = this.createDemoCompetitions();
            }
            
            // Step 3: Mark as initialized
            this.lastUpdate = new Date();
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log(`✅ CompetitionService initialized: ${this.competitions.length} competitions`);
            
            // Step 4: Start background refresh
            this.startBackgroundRefresh();
            
            return true;
        } catch (error) {
            console.error('❌ CompetitionService initialization failed:', error);
            
            // Emergency fallback to demo data
            this.competitions = this.createDemoCompetitions();
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('CompetitionService initialized with demo data');
            return true;
        }
    }

    // Load competitions directly from competitions table
    async loadCompetitionsFromTable() {
        try {
            if (!window.supabase) {
                console.warn('Supabase client not available');
                return false;
            }

            console.log('🏆 Loading competitions from table...');
            
            // Query competitions table for active competitions
            const { data: competitions, error } = await window.supabase
                .from('competitions')
                .select('*')
                .in('status', ['SETUP', 'VOTING', 'ACTIVE'])
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('Competitions query error:', error);
                return false;
            }

            if (!competitions || competitions.length === 0) {
                console.log('⚠️ No active competitions found');
                return false;
            }

            console.log(`📦 Found ${competitions.length} competitions`);
            
            // Process competitions with token data
            this.competitions = await this.processCompetitions(competitions);
            
            console.log(`✅ Loaded ${this.competitions.length} competitions`);
            return this.competitions.length > 0;
            
        } catch (error) {
            console.error('Error loading competitions:', error);
            return false;
        }
    }

    // Process competitions and enrich with token data
    async processCompetitions(rawCompetitions) {
        const processedCompetitions = [];
        const tokenService = window.getTokenService?.();
        
        console.log(`🔄 Processing ${rawCompetitions.length} competitions...`);
        
        for (let i = 0; i < rawCompetitions.length; i++) {
            try {
                const competition = rawCompetitions[i];
                
                // Get token data for the competition
                let tokenA = null;
                let tokenB = null;
                
                if (tokenService && tokenService.isReady()) {
                    tokenA = await tokenService.getTokenByAddress(competition.token_a_address);
                    tokenB = await tokenService.getTokenByAddress(competition.token_b_address);
                }
                
                // Create processed competition object
                const processedCompetition = {
                    // Core competition data
                    id: competition.id || competition.competition_id,
                    title: competition.title || `${competition.token_a_symbol} vs ${competition.token_b_symbol}`,
                    description: competition.description || `Predict which token will perform better`,
                    
                    // Token data
                    token_a_address: competition.token_a_address,
                    token_b_address: competition.token_b_address,
                    token_a_symbol: competition.token_a_symbol,
                    token_b_symbol: competition.token_b_symbol,
                    token_a: tokenA,
                    token_b: tokenB,
                    
                    // Competition settings
                    status: competition.status,
                    start_time: competition.start_time,
                    end_time: competition.end_time,
                    voting_end_time: competition.voting_end_time,
                    
                    // Pool and betting data
                    total_pool: parseFloat(competition.total_pool) || 0,
                    entry_fee: parseFloat(competition.entry_fee) || 0.1,
                    max_participants: parseInt(competition.max_participants) || 100,
                    current_participants: parseInt(competition.current_participants) || 0,
                    
                    // Metadata
                    created_at: competition.created_at,
                    created_by: competition.created_by || 'admin',
                    
                    // Calculated fields
                    is_active: competition.status === 'ACTIVE',
                    is_voting: competition.status === 'VOTING',
                    can_join: competition.status === 'SETUP' || competition.status === 'VOTING',
                    time_remaining: this.calculateTimeRemaining(competition.end_time)
                };
                
                processedCompetitions.push(processedCompetition);
                console.log(`✅ Competition ${i + 1} processed: ${processedCompetition.title}`);
                
            } catch (competitionError) {
                console.error(`❌ Error processing competition ${i + 1}:`, competitionError);
            }
        }
        
        console.log(`✅ Successfully processed ${processedCompetitions.length}/${rawCompetitions.length} competitions`);
        return processedCompetitions;
    }

    // Calculate time remaining for a competition
    calculateTimeRemaining(endTime) {
        try {
            if (!endTime) return null;
            
            const now = new Date();
            const end = new Date(endTime);
            const diff = end.getTime() - now.getTime();
            
            if (diff <= 0) return { expired: true };
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            return {
                expired: false,
                hours,
                minutes,
                formatted: `${hours}h ${minutes}m`
            };
        } catch (error) {
            console.error('Error calculating time remaining:', error);
            return null;
        }
    }

    // Create demo competitions (fallback)
    createDemoCompetitions() {
        const now = new Date();
        const futureTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        return [
            {
                id: 'demo-1',
                title: 'SOL vs USDC',
                description: 'Which will perform better in the next 24 hours?',
                token_a_address: 'So11111111111111111111111111111111111111112',
                token_b_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                token_a_symbol: 'SOL',
                token_b_symbol: 'USDC',
                token_a: null,
                token_b: null,
                status: 'VOTING',
                start_time: now.toISOString(),
                end_time: futureTime.toISOString(),
                voting_end_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
                total_pool: 15.7,
                entry_fee: 0.1,
                max_participants: 100,
                current_participants: 23,
                created_at: now.toISOString(),
                created_by: 'demo-admin',
                is_active: false,
                is_voting: true,
                can_join: true,
                time_remaining: this.calculateTimeRemaining(futureTime.toISOString())
            },
            {
                id: 'demo-2',
                title: 'BONK vs JUP',
                description: 'Battle of the meme coins vs utility tokens',
                token_a_address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                token_b_address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                token_a_symbol: 'BONK',
                token_b_symbol: 'JUP',
                token_a: null,
                token_b: null,
                status: 'SETUP',
                start_time: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(),
                end_time: new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString(),
                voting_end_time: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
                total_pool: 8.3,
                entry_fee: 0.1,
                max_participants: 50,
                current_participants: 12,
                created_at: now.toISOString(),
                created_by: 'demo-admin',
                is_active: false,
                is_voting: false,
                can_join: true,
                time_remaining: this.calculateTimeRemaining(new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString())
            }
        ];
    }

    // Refresh competitions data
    async refreshCompetitions() {
        try {
            if (this.isInitializing) {
                console.log('Skipping refresh - initialization in progress');
                return false;
            }
            
            console.log('Refreshing competitions from table...');
            
            const wasSuccessful = await this.loadCompetitionsFromTable();
            
            if (wasSuccessful) {
                this.lastUpdate = new Date();
                console.log(`✅ Competitions refreshed: ${this.competitions.length} competitions`);
                return true;
            } else {
                console.log('⚠️ Refresh failed, keeping existing data');
                return false;
            }
        } catch (error) {
            console.error('Error refreshing competitions:', error);
            return false;
        }
    }

    // Start background refresh cycle
    startBackgroundRefresh() {
        // Clear existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Refresh every 2 minutes (competitions change more frequently)
        this.updateInterval = setInterval(async () => {
            try {
                console.log('Background competitions refresh triggered...');
                await this.refreshCompetitions();
            } catch (error) {
                console.error('Background refresh failed:', error);
            }
        }, 2 * 60 * 1000); // 2 minutes

        console.log('Background competitions refresh started (2-minute intervals)');
    }

    // Get all competitions
    async getCompetitions() {
        try {
            if (!this.isInitialized && !this.isInitializing) {
                await this.initialize();
            }
            
            return this.competitions;
        } catch (error) {
            console.error('Error getting competitions:', error);
            return this.competitions;
        }
    }

    // Get active competitions
    async getActiveCompetitions() {
        try {
            const competitions = await this.getCompetitions();
            return competitions.filter(comp => comp.is_active);
        } catch (error) {
            console.error('Error getting active competitions:', error);
            return [];
        }
    }

    // Get competitions by status
    async getCompetitionsByStatus(status) {
        try {
            const competitions = await this.getCompetitions();
            return competitions.filter(comp => comp.status === status);
        } catch (error) {
            console.error('Error getting competitions by status:', error);
            return [];
        }
    }

    // Get competition by ID
    async getCompetitionById(id) {
        try {
            const competitions = await this.getCompetitions();
            return competitions.find(comp => comp.id === id);
        } catch (error) {
            console.error('Error getting competition by ID:', error);
            return null;
        }
    }

    // Get service status
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            competitionCount: this.competitions.length,
            lastUpdate: this.lastUpdate
        };
    }

    // Check if ready
    isReady() {
        return this.isInitialized;
    }

    // Cleanup
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('CompetitionService cleaned up');
    }
}

// Static property to hold singleton instance
CompetitionService.instance = null;

// Create global singleton instance
function getCompetitionService() {
    if (!window.competitionService) {
        window.competitionService = new CompetitionService();
    }
    return window.competitionService;
}

// Expose globally
window.CompetitionService = CompetitionService;
window.getCompetitionService = getCompetitionService;

console.log('✅ CompetitionService (SIMPLIFIED) class loaded and exposed globally');
console.log('🏆 Features:');
console.log('   ✅ Direct competitions table queries only');
console.log('   ✅ Demo competition fallback when table empty');
console.log('   ✅ Background refresh every 2 minutes');
console.log('   ✅ Token data enrichment from TokenService');
console.log('   ✅ Status filtering and time calculations');
