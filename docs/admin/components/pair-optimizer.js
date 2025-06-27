/**
 * PairOptimizer Component - Token Pair Optimization Engine
 * Updated with database integration for approved tokens and pair generation
 */

class PairOptimizer {
    constructor(adminState) {
        this.adminState = adminState;
        this.isInitialized = false;
        this.optimizationInterval = null;
        this.performanceChart = null;
        this.abTestResults = [];
        
        // Optimization algorithms
        this.algorithms = {
            MARKET_CAP_MATCHING: 'market_cap_matching',
            VOLATILITY_BALANCE: 'volatility_balance',
            COMMUNITY_INTEREST: 'community_interest',
            HISTORICAL_PERFORMANCE: 'historical_performance'
        };
        
        // Pair generation strategies
        this.strategies = {
            CONSERVATIVE: 'conservative',
            BALANCED: 'balanced',
            AGGRESSIVE: 'aggressive',
            EXPERIMENTAL: 'experimental'
        };
        
        console.log('PairOptimizer: Component initialized');
    }

    /**
     * Initialize Pair Optimizer Component
     */
    async initialize() {
        try {
            console.log('⚡ Initializing Pair Optimizer...');
            
            // Load optimization settings
            await this.loadOptimizationSettings();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Pair Optimizer initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Pair Optimizer:', error);
            return false;
        }
    }

    /**
     * Load Optimization Settings
     */
    async loadOptimizationSettings() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                this.setDefaultOptimizationSettings();
                return;
            }

            // Try to load from database
            const { data: settings, error } = await supabase
                .from('pair_optimization_settings')
                .select('*')
                .eq('is_active', true)
                .single();

            if (error || !settings) {
                console.warn('Using default optimization settings');
                this.setDefaultOptimizationSettings();
                return;
            }

            this.adminState.pairOptimizationState.algorithm = {
                ...this.adminState.pairOptimizationState.algorithm,
                ...settings.algorithm_config
            };

            console.log('✅ Optimization settings loaded from database');
            
        } catch (error) {
            console.error('Error loading optimization settings:', error);
            this.setDefaultOptimizationSettings();
        }
    }

    /**
     * Set Default Optimization Settings
     */
    setDefaultOptimizationSettings() {
        this.adminState.pairOptimizationState.algorithm = {
            marketCapTolerance: 10, // 10% tolerance
            liquidityMinimum: 30,
            newTokenPriority: 25,
            balancedExposure: 75,
            communityWeight: 40,
            feedbackWeight: 30,
            minFeedbackCount: 10
        };
    }

    /**
     * Get Available Tokens from Database
     */
    async getAvailableTokens() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            // Get approved tokens with their cache data
            const { data: approvedTokens, error } = await supabase
                .from('token_approvals')
                .select(`
                    token_address,
                    token_symbol,
                    token_name,
                    token_cache!inner (
                        current_price,
                        market_cap_usd,
                        volume_24h,
                        price_change_24h,
                        logo_uri,
                        data_source
                    )
                `)
                .eq('token_cache.cache_status', 'FRESH')
                .order('token_cache.market_cap_usd', { ascending: false });

            if (error) {
                throw error;
            }

            if (!approvedTokens || approvedTokens.length === 0) {
                console.warn('No approved tokens found');
                return [];
            }

            // Transform data to expected format
            return approvedTokens.map(item => ({
                address: item.token_address,
                symbol: item.token_symbol,
                name: item.token_name,
                marketCap: item.token_cache.market_cap_usd,
                price: item.token_cache.current_price,
                volume24h: item.token_cache.volume_24h,
                priceChange24h: item.token_cache.price_change_24h,
                logoURI: item.token_cache.logo_uri,
                dataSource: item.token_cache.data_source
            }));

        } catch (error) {
            console.error('Error getting available tokens:', error);
            this.showAdminNotification('Failed to load approved tokens', 'error');
            return [];
        }
    }

    /**
     * Generate Optimal Pairs
     */
    async generateOptimalPairs() {
        try {
            console.log('⚡ Generating optimal token pairs...');
            this.showAdminNotification('Generating optimal pairs...', 'info');
            
            // Get current algorithm settings
            const settings = this.adminState.pairOptimizationState.algorithm;
            
            // Get approved tokens from database
            const tokens = await this.getAvailableTokens();
            if (tokens.length < 2) {
                this.showAdminNotification('Insufficient approved tokens for pair generation', 'warning');
                return;
            }
            
            console.log(`Found ${tokens.length} approved tokens for pair generation`);
            
            // Generate pairs using market cap matching algorithm
            const optimalPairs = await this.runPairGenerationAlgorithm(tokens, settings);
            
            if (optimalPairs.length === 0) {
                this.showAdminNotification('No compatible pairs found with current settings', 'warning');
                return;
            }
            
            // Save generated pairs to database
            await this.savePairsToDatabase(optimalPairs);
            
            this.showAdminNotification(
                `Generated ${optimalPairs.length} optimal pairs successfully`, 
                'success'
            );
            
        } catch (error) {
            console.error('Error generating optimal pairs:', error);
            this.showAdminNotification('Failed to generate optimal pairs', 'error');
        }
    }

    /**
     * Run Pair Generation Algorithm
     */
    async runPairGenerationAlgorithm(tokens, settings) {
        const pairs = [];
        const usedTokens = new Set();
        
        // Calculate market cap tolerance
        const tolerance = settings.marketCapTolerance / 100; // Convert percentage to decimal
        
        console.log(`Using market cap tolerance: ${settings.marketCapTolerance}%`);
        
        // Sort tokens by market cap for efficient pairing
        const sortedTokens = [...tokens].sort((a, b) => b.marketCap - a.marketCap);
        
        for (let i = 0; i < sortedTokens.length - 1; i++) {
            const tokenA = sortedTokens[i];
            
            // Skip if token already used
            if (usedTokens.has(tokenA.address)) continue;
            
            for (let j = i + 1; j < sortedTokens.length; j++) {
                const tokenB = sortedTokens[j];
                
                // Skip if token already used
                if (usedTokens.has(tokenB.address)) continue;
                
                // Calculate market cap ratio
                const minMarketCap = Math.min(tokenA.marketCap, tokenB.marketCap);
                const maxMarketCap = Math.max(tokenA.marketCap, tokenB.marketCap);
                const marketCapDifference = Math.abs(tokenA.marketCap - tokenB.marketCap);
                const marketCapRatio = marketCapDifference / minMarketCap;
                
                // Check if within tolerance
                if (marketCapRatio <= tolerance) {
                    const compatibility = this.calculatePairCompatibility(tokenA, tokenB, settings);
                    
                    pairs.push({
                        tokenA,
                        tokenB,
                        compatibility,
                        marketCapRatio,
                        algorithm: this.algorithms.MARKET_CAP_MATCHING,
                        strategy: this.determineStrategy(compatibility.score),
                        generatedAt: new Date()
                    });
                    
                    // Mark tokens as used
                    usedTokens.add(tokenA.address);
                    usedTokens.add(tokenB.address);
                    
                    console.log(`✅ Paired ${tokenA.symbol} with ${tokenB.symbol} (ratio: ${(marketCapRatio * 100).toFixed(1)}%)`);
                    break; // Move to next tokenA
                }
            }
        }
        
        // Sort pairs by compatibility score
        return pairs.sort((a, b) => b.compatibility.score - a.compatibility.score);
    }

    /**
     * Calculate Pair Compatibility
     */
    calculatePairCompatibility(tokenA, tokenB, settings) {
        let score = 0;
        const factors = [];
        
        // Market cap similarity (already within tolerance, so give high score)
        const marketCapRatio = Math.min(tokenA.marketCap, tokenB.marketCap) / 
                              Math.max(tokenA.marketCap, tokenB.marketCap);
        const marketCapScore = marketCapRatio; // 0 to 1 scale
        score += marketCapScore * 0.4;
        factors.push({ factor: 'market_cap', score: marketCapScore });
        
        // Volume similarity
        const volumeRatio = Math.min(tokenA.volume24h, tokenB.volume24h) / 
                           Math.max(tokenA.volume24h, tokenB.volume24h);
        const volumeScore = volumeRatio;
        score += volumeScore * 0.3;
        factors.push({ factor: 'volume', score: volumeScore });
        
        // Price volatility balance
        const volatilityDiff = Math.abs(Math.abs(tokenA.priceChange24h) - Math.abs(tokenB.priceChange24h));
        const volatilityScore = Math.max(0, 1 - (volatilityDiff / 100)); // Normalize to 0-1
        score += volatilityScore * 0.3;
        factors.push({ factor: 'volatility', score: volatilityScore });
        
        return {
            score: Math.min(score, 1.0),
            factors,
            marketCapRatio,
            volumeRatio,
            volatilityDiff
        };
    }

    /**
     * Determine Strategy Based on Score
     */
    determineStrategy(compatibilityScore) {
        if (compatibilityScore >= 0.9) return this.strategies.CONSERVATIVE;
        if (compatibilityScore >= 0.8) return this.strategies.BALANCED;
        if (compatibilityScore >= 0.7) return this.strategies.AGGRESSIVE;
        return this.strategies.EXPERIMENTAL;
    }

    /**
     * Save Pairs to Database
     */
    async savePairsToDatabase(pairs) {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            const now = new Date().toISOString();
            const adminWallet = sessionStorage.getItem('adminWallet') || 'admin';
            
            // Prepare pairs for insertion
            const pairRecords = pairs.map(pair => ({
                token_a_address: pair.tokenA.address,
                token_a_symbol: pair.tokenA.symbol,
                token_a_name: pair.tokenA.name,
                token_b_address: pair.tokenB.address,
                token_b_symbol: pair.tokenB.symbol,
                token_b_name: pair.tokenB.name,
                market_cap_ratio: pair.marketCapRatio,
                compatibility_score: pair.compatibility.score,
                algorithm_used: pair.algorithm,
                strategy_type: pair.strategy,
                is_active: true,
                created_by: adminWallet,
                created_at: now,
                last_updated: now,
                metadata: {
                    volume_ratio: pair.compatibility.volumeRatio,
                    volatility_diff: pair.compatibility.volatilityDiff,
                    factors: pair.compatibility.factors
                }
            }));

            // Insert pairs into database
            const { data, error } = await supabase
                .from('token_pairs')
                .insert(pairRecords)
                .select();

            if (error) {
                throw error;
            }

            console.log(`✅ Saved ${data.length} pairs to database`);
            
            // Log to admin audit log
            await this.logAdminAction('pair_generation', {
                action: 'generate_pairs',
                pairs_count: data.length,
                algorithm: this.algorithms.MARKET_CAP_MATCHING,
                settings: {
                    marketCapTolerance: this.adminState.pairOptimizationState.algorithm.marketCapTolerance
                }
            });
            
            return data;
            
        } catch (error) {
            console.error('Error saving pairs to database:', error);
            throw error;
        }
    }

    /**
     * Test Pair Combination
     */
    async testPairCombination() {
        try {
            console.log('🧪 Testing pair combination...');
            
            // Get test parameters
            const testConfig = {
                tokenA: prompt('Enter first token symbol:'),
                tokenB: prompt('Enter second token symbol:')
            };
            
            if (!testConfig.tokenA || !testConfig.tokenB) {
                this.showAdminNotification('Test cancelled - missing token symbols', 'warning');
                return;
            }
            
            // Get tokens from database
            const tokens = await this.getAvailableTokens();
            const tokenA = tokens.find(t => t.symbol.toUpperCase() === testConfig.tokenA.toUpperCase());
            const tokenB = tokens.find(t => t.symbol.toUpperCase() === testConfig.tokenB.toUpperCase());
            
            if (!tokenA || !tokenB) {
                this.showAdminNotification('One or both tokens not found in approved list', 'error');
                return;
            }
            
            // Calculate compatibility
            const settings = this.adminState.pairOptimizationState.algorithm;
            const compatibility = this.calculatePairCompatibility(tokenA, tokenB, settings);
            
            // Calculate market cap ratio
            const minMarketCap = Math.min(tokenA.marketCap, tokenB.marketCap);
            const marketCapDifference = Math.abs(tokenA.marketCap - tokenB.marketCap);
            const marketCapRatio = marketCapDifference / minMarketCap;
            const withinTolerance = marketCapRatio <= (settings.marketCapTolerance / 100);
            
            // Show test results
            this.showTestResults({
                tokenA,
                tokenB,
                compatibility,
                marketCapRatio,
                withinTolerance,
                tolerance: settings.marketCapTolerance
            });
            
        } catch (error) {
            console.error('Error testing pair combination:', error);
            this.showAdminNotification('Pair combination test failed', 'error');
        }
    }

    /**
     * Show Test Results
     */
    showTestResults(results) {
        const modalHtml = `
            <div class="modal" id="test-results-modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                    <h3>🧪 Pair Combination Test Results</h3>
                    
                    <div style="margin: 1rem 0;">
                        <h4>Token Pair</h4>
                        <p><strong>${results.tokenA.symbol}</strong> (MC: $${this.formatNumber(results.tokenA.marketCap)}) 
                           vs 
                           <strong>${results.tokenB.symbol}</strong> (MC: $${this.formatNumber(results.tokenB.marketCap)})</p>
                    </div>
                    
                    <div style="margin: 1rem 0;">
                        <h4>Market Cap Analysis</h4>
                        <p><strong>Market Cap Difference:</strong> ${(results.marketCapRatio * 100).toFixed(1)}%</p>
                        <p><strong>Tolerance Setting:</strong> ${results.tolerance}%</p>
                        <p><strong>Within Tolerance:</strong> 
                            <span class="status-badge ${results.withinTolerance ? 'active' : 'inactive'}">
                                ${results.withinTolerance ? 'YES ✅' : 'NO ❌'}
                            </span>
                        </p>
                    </div>
                    
                    <div style="margin: 1rem 0;">
                        <h4>Compatibility Score</h4>
                        <p><strong>Overall Score:</strong> ${(results.compatibility.score * 100).toFixed(1)}%</p>
                        <div style="margin-top: 0.5rem;">
                            ${results.compatibility.factors.map(factor => `
                                <div style="display: flex; justify-content: space-between; margin: 0.25rem 0;">
                                    <span>${factor.factor.replace('_', ' ').toUpperCase()}:</span>
                                    <span>${(factor.score * 100).toFixed(1)}%</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div style="margin: 1rem 0;">
                        <h4>Recommendation</h4>
                        <p class="status-badge ${results.withinTolerance && results.compatibility.score >= 0.7 ? 'active' : 
                                                results.withinTolerance && results.compatibility.score >= 0.5 ? 'warning' : 
                                                'inactive'}">
                            ${results.withinTolerance ? 
                                (results.compatibility.score >= 0.7 ? 'Excellent pair - highly recommended' :
                                 results.compatibility.score >= 0.5 ? 'Good pair - acceptable' :
                                 'Poor compatibility - not recommended') :
                                'Market cap difference exceeds tolerance'}
                        </p>
                    </div>
                    
                    <div style="text-align: right; margin-top: 2rem;">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Save Optimization Settings
     */
    async saveOptimizationSettings() {
        try {
            console.log('💾 Saving optimization settings...');
            
            // Get values from form
            const settings = this.getSettingsFromForm();
            
            // Update state
            this.adminState.pairOptimizationState.algorithm = {
                ...this.adminState.pairOptimizationState.algorithm,
                ...settings
            };
            
            // Save to database
            const supabase = this.getSupabase();
            if (supabase) {
                await supabase
                    .from('pair_optimization_settings')
                    .upsert({
                        id: 1,
                        algorithm_config: this.adminState.pairOptimizationState.algorithm,
                        is_active: true,
                        updated_at: new Date().toISOString(),
                        updated_by: sessionStorage.getItem('adminWallet') || 'admin'
                    });
                
                // Log action
                await this.logAdminAction('settings_update', {
                    action: 'update_pair_optimization_settings',
                    settings: settings
                });
            }
            
            this.showAdminNotification('Optimization settings saved successfully', 'success');
            
        } catch (error) {
            console.error('Error saving optimization settings:', error);
            this.showAdminNotification('Failed to save settings', 'error');
        }
    }

    /**
     * Get Settings from Form
     */
    getSettingsFromForm() {
        const settings = {};
        
        const sliders = [
            'market-cap-tolerance',
            'liquidity-minimum',
            'new-token-priority',
            'balanced-exposure',
            'community-weight',
            'feedback-weight',
            'min-feedback-count'
        ];
        
        sliders.forEach(sliderId => {
            const slider = document.getElementById(sliderId);
            if (slider) {
                const key = sliderId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                settings[key] = parseInt(slider.value);
            }
        });
        
        return settings;
    }

    /**
     * Log Admin Action
     */
    async logAdminAction(actionType, actionData) {
        try {
            const supabase = this.getSupabase();
            if (!supabase) return;

            const adminWallet = sessionStorage.getItem('adminWallet') || 'admin';
            
            await supabase
                .from('admin_audit_log')
                .insert({
                    admin_id: adminWallet,
                    action_type: actionType,
                    action_data: actionData,
                    ip_address: 'web-client',
                    user_agent: navigator.userAgent,
                    created_at: new Date().toISOString()
                });

            console.log(`📝 Admin action logged: ${actionType}`);
            
        } catch (error) {
            console.error('Error logging admin action:', error);
        }
    }

    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        // Optimization actions
        document.addEventListener('click', (e) => {
            if (e.target.onclick?.toString().includes('generateOptimalPairs')) {
                this.generateOptimalPairs();
            } else if (e.target.onclick?.toString().includes('testPairCombination')) {
                this.testPairCombination();
            } else if (e.target.onclick?.toString().includes('saveOptimizationSettings')) {
                this.saveOptimizationSettings();
            } else if (e.target.onclick?.toString().includes('resetToDefaults')) {
                this.resetToDefaults();
            }
        });

        console.log('✅ Pair optimizer event listeners set up');
    }

    /**
     * Reset to Defaults
     */
    resetToDefaults() {
        if (!confirm('🔄 Reset all optimization settings to defaults?')) {
            return;
        }
        
        this.setDefaultOptimizationSettings();
        this.updateAlgorithmSettingsDisplay();
        
        this.showAdminNotification('Settings reset to defaults', 'warning');
        console.log('🔄 Optimization settings reset to defaults');
    }

    /**
     * Update Algorithm Settings Display
     */
    updateAlgorithmSettingsDisplay() {
        const settings = this.adminState.pairOptimizationState.algorithm;
        
        Object.entries(settings).forEach(([key, value]) => {
            const elementId = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            const slider = document.getElementById(elementId);
            
            if (slider) {
                slider.value = value;
                slider.dispatchEvent(new Event('input'));
            }
        });
    }

    // ===== UTILITY FUNCTIONS =====

    /**
     * Get Supabase Client
     */
    getSupabase() {
        if (this.adminState.supabaseClient) {
            if (typeof this.adminState.supabaseClient.getSupabaseClient === 'function') {
                return this.adminState.supabaseClient.getSupabaseClient();
            } else if (this.adminState.supabaseClient.from) {
                return this.adminState.supabaseClient;
            }
        }
        
        if (window.supabase) {
            return window.supabase;
        }
        
        return null;
    }

    /**
     * Format Number
     */
    formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Show Admin Notification
     */
    showAdminNotification(message, type = 'info') {
        if (window.showAdminNotification) {
            window.showAdminNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Cleanup
     */
    cleanup() {
        if (this.optimizationInterval) {
            clearInterval(this.optimizationInterval);
            this.optimizationInterval = null;
        }
        
        if (this.performanceChart) {
            this.performanceChart.destroy();
            this.performanceChart = null;
        }
        
        console.log('🧹 Pair Optimizer cleaned up');
    }
}

// Create singleton instance
PairOptimizer.instance = null;

// Export for global use
window.PairOptimizer = PairOptimizer;

console.log('✅ PairOptimizer component loaded with database integration');
