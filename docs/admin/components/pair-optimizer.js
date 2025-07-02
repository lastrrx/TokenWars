/**
 * PairOptimizer Component - ANALYTICS ONLY
 * Read-only analytics dashboard for token_pairs table - NO generation functionality
 */

class PairOptimizer {
    constructor(adminState) {
        this.adminState = adminState;
        this.isInitialized = false;
        this.analyticsInterval = null;
        this.performanceChart = null;
        this.pairAnalytics = [];
        
        // Analytics state - NO generation functionality
        this.analyticsState = {
            overview: {
                totalPairs: 0,
                activePairs: 0,
                avgMarketCapDiff: 0,
                avgCompatibility: 0,
                lastUpdate: null,
                nextUpdate: 'Edge Function Automated',
                pairGenerationStatus: 'Automated via Edge Functions'
            },
            performance: {
                successRate: 0,
                avgEngagement: 0,
                revenuePerPair: 0,
                totalGenerated: 0,
                successful: 0,
                avgDuration: 0,
                userSatisfaction: 0
            },
            categories: {
                conservative: 0,
                balanced: 0,
                aggressive: 0,
                experimental: 0
            },
            recentActivity: [],
            topPerformingPairs: [],
            compatibilityDistribution: {}
        };
        
        console.log('PairOptimizer: Component initialized - ANALYTICS ONLY');
    }

    /**
     * Initialize Pair Optimizer Analytics Component
     */
    async initialize() {
        try {
            console.log('📈 Initializing Pair Analytics Dashboard...');
            
            // Load pair analytics data
            await this.loadPairAnalyticsData();
            
            // Set up analytics monitoring
            this.startAnalyticsMonitoring();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Pair Analytics Dashboard initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Pair Analytics Dashboard:', error);
            this.showAdminNotification('Failed to initialize Pair Analytics Dashboard', 'error');
            return false;
        }
    }

    /**
     * Load Pair Analytics Data from Database
     */
    async loadPairAnalyticsData() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            console.log('📊 Loading pair analytics data from database...');
            
            // Load pair overview data
            await this.loadPairOverview();
            
            // Load pair performance metrics
            await this.loadPairPerformance();
            
            // Load recent pair activity
            await this.loadRecentPairActivity();
            
            // Load top performing pairs
            await this.loadTopPerformingPairs();
            
            // Calculate analytics
            this.calculateAnalytics();
            
            console.log('✅ Pair analytics data loaded successfully');
            
        } catch (error) {
            console.error('Error loading pair analytics data:', error);
            throw error;
        }
    }

    /**
     * Load Pair Overview from token_pairs Table
     */
    async loadPairOverview() {
        try {
            const supabase = this.getSupabase();
            
            // Get all active token pairs
            const { data: allPairs, error: pairsError } = await supabase
                .from('token_pairs')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (pairsError) {
                throw pairsError;
            }

            this.pairAnalytics = allPairs || [];
            
            // Calculate overview metrics
            this.analyticsState.overview.totalPairs = this.pairAnalytics.length;
            this.analyticsState.overview.activePairs = this.pairAnalytics.filter(p => p.is_active).length;
            
            // Calculate average market cap difference
            const marketCapDiffs = this.pairAnalytics
                .filter(p => p.market_cap_ratio !== null)
                .map(p => p.market_cap_ratio * 100);
            
            this.analyticsState.overview.avgMarketCapDiff = marketCapDiffs.length > 0 ?
                marketCapDiffs.reduce((sum, diff) => sum + diff, 0) / marketCapDiffs.length : 0;
            
            // Calculate average compatibility
            const compatibilityScores = this.pairAnalytics
                .filter(p => p.compatibility_score !== null)
                .map(p => p.compatibility_score);
            
            this.analyticsState.overview.avgCompatibility = compatibilityScores.length > 0 ?
                compatibilityScores.reduce((sum, score) => sum + score, 0) / compatibilityScores.length : 0;
            
            // Get last update time
            if (this.pairAnalytics.length > 0) {
                const lastUpdate = this.pairAnalytics[0].created_at;
                this.analyticsState.overview.lastUpdate = lastUpdate;
            }
            
            console.log(`✅ Loaded ${this.pairAnalytics.length} token pairs for analytics`);
            
        } catch (error) {
            console.error('Error loading pair overview:', error);
            throw error;
        }
    }

    /**
     * Load Pair Performance Metrics
     */
    async loadPairPerformance() {
        try {
            const supabase = this.getSupabase();
            
            // Get competitions that used these pairs to calculate performance
            const { data: competitions, error: compError } = await supabase
                .from('competitions')
                .select('*')
                .in('status', ['CLOSED', 'RESOLVED'])
                .order('created_at', { ascending: false })
                .limit(100);

            if (compError) {
                console.warn('Could not load competition data for performance metrics:', compError);
                return;
            }

            if (competitions && competitions.length > 0) {
                // Calculate performance metrics from closed competitions
                const totalCompetitions = competitions.length;
                const successfulCompetitions = competitions.filter(c => c.winner_token).length;
                
                this.analyticsState.performance.successRate = totalCompetitions > 0 ?
                    (successfulCompetitions / totalCompetitions) * 100 : 0;
                
                // Calculate average pool size as engagement metric
                const avgPoolSize = competitions
                    .filter(c => c.total_pool)
                    .reduce((sum, c) => sum + (c.total_pool || 0), 0) / totalCompetitions;
                
                this.analyticsState.performance.avgEngagement = avgPoolSize || 0;
                
                // Calculate revenue per pair (platform fees collected)
                const totalRevenue = competitions
                    .reduce((sum, c) => sum + (c.platform_fee_collected || 0), 0);
                
                this.analyticsState.performance.revenuePerPair = this.analyticsState.overview.totalPairs > 0 ?
                    totalRevenue / this.analyticsState.overview.totalPairs : 0;
                
                this.analyticsState.performance.totalGenerated = this.analyticsState.overview.totalPairs;
                this.analyticsState.performance.successful = successfulCompetitions;
            }
            
            console.log('✅ Pair performance metrics calculated');
            
        } catch (error) {
            console.error('Error loading pair performance:', error);
            // Don't throw - performance metrics are optional
        }
    }

    /**
     * Load Recent Pair Activity
     */
    async loadRecentPairActivity() {
        try {
            // Get recent pair activity (last 10 pairs created)
            const recentPairs = this.pairAnalytics
                .slice(0, 10)
                .map(pair => ({
                    tokenA: pair.token_a_symbol,
                    tokenB: pair.token_b_symbol,
                    compatibility: pair.compatibility_score,
                    category: pair.category,
                    createdAt: pair.created_at,
                    usageCount: pair.usage_count || 0
                }));
            
            this.analyticsState.recentActivity = recentPairs;
            console.log(`✅ Loaded ${recentPairs.length} recent pair activities`);
            
        } catch (error) {
            console.error('Error loading recent pair activity:', error);
        }
    }

    /**
     * Load Top Performing Pairs
     */
    async loadTopPerformingPairs() {
        try {
            // Sort pairs by usage count and compatibility score
            const topPairs = this.pairAnalytics
                .filter(pair => pair.usage_count > 0 || pair.compatibility_score > 0)
                .sort((a, b) => {
                    const scoreA = (a.usage_count || 0) * 0.6 + (a.compatibility_score || 0) * 0.4;
                    const scoreB = (b.usage_count || 0) * 0.6 + (b.compatibility_score || 0) * 0.4;
                    return scoreB - scoreA;
                })
                .slice(0, 10)
                .map(pair => ({
                    tokenA: pair.token_a_symbol,
                    tokenB: pair.token_b_symbol,
                    compatibility: pair.compatibility_score,
                    usageCount: pair.usage_count || 0,
                    lastUsed: pair.last_used,
                    category: pair.category,
                    marketCapRatio: pair.market_cap_ratio
                }));
            
            this.analyticsState.topPerformingPairs = topPairs;
            console.log(`✅ Loaded ${topPairs.length} top performing pairs`);
            
        } catch (error) {
            console.error('Error loading top performing pairs:', error);
        }
    }

    /**
     * Calculate Additional Analytics
     */
    calculateAnalytics() {
        try {
            // Calculate category distribution
            const categories = this.pairAnalytics.reduce((acc, pair) => {
                const category = pair.category || 'unknown';
                acc[category] = (acc[category] || 0) + 1;
                return acc;
            }, {});
            
            this.analyticsState.categories = {
                conservative: categories.conservative || 0,
                balanced: categories.balanced || 0,
                aggressive: categories.aggressive || 0,
                experimental: categories.experimental || 0
            };
            
            // Calculate compatibility distribution
            const compatibilityRanges = {
                excellent: 0, // 90-100%
                good: 0,      // 70-89%
                fair: 0,      // 50-69%
                poor: 0       // <50%
            };
            
            this.pairAnalytics.forEach(pair => {
                const score = pair.compatibility_score || 0;
                if (score >= 90) compatibilityRanges.excellent++;
                else if (score >= 70) compatibilityRanges.good++;
                else if (score >= 50) compatibilityRanges.fair++;
                else compatibilityRanges.poor++;
            });
            
            this.analyticsState.compatibilityDistribution = compatibilityRanges;
            
            console.log('✅ Additional analytics calculated');
            
        } catch (error) {
            console.error('Error calculating analytics:', error);
        }
    }

    /**
     * Start Analytics Monitoring
     */
    startAnalyticsMonitoring() {
        try {
            // Refresh analytics every 5 minutes
            this.analyticsInterval = setInterval(async () => {
                try {
                    await this.refreshAnalytics();
                } catch (error) {
                    console.error('Analytics monitoring error:', error);
                }
            }, 5 * 60 * 1000);

            console.log('✅ Analytics monitoring started');
            
        } catch (error) {
            console.error('Failed to start analytics monitoring:', error);
        }
    }

    /**
     * Refresh Analytics Data
     */
    async refreshAnalytics() {
        try {
            console.log('🔄 Refreshing pair analytics...');
            await this.loadPairAnalyticsData();
            this.updateAnalyticsDisplay();
            console.log('✅ Pair analytics refreshed');
            
        } catch (error) {
            console.error('Error refreshing analytics:', error);
        }
    }

    /**
     * Update Analytics Display
     */
    updateAnalyticsDisplay() {
        try {
            // Update overview metrics
            this.updateElement('total-pairs', this.analyticsState.overview.totalPairs);
            this.updateElement('active-pairs-count', this.analyticsState.overview.activePairs);
            this.updateElement('avg-market-cap-diff', this.analyticsState.overview.avgMarketCapDiff.toFixed(1) + '%');
            this.updateElement('avg-compatibility', this.analyticsState.overview.avgCompatibility.toFixed(1) + '%');
            
            // Update status information
            this.updateElement('last-pair-update', this.formatRelativeTime(this.analyticsState.overview.lastUpdate));
            this.updateElement('next-pair-update', this.analyticsState.overview.nextUpdate);
            
            // Update pair analytics table
            this.updatePairAnalyticsTable();
            
            // Update performance chart if needed
            this.updatePerformanceChart();
            
            console.log('✅ Analytics display updated');
            
        } catch (error) {
            console.error('Error updating analytics display:', error);
        }
    }

    /**
     * Update Pair Analytics Table
     */
    updatePairAnalyticsTable() {
        const tbody = document.getElementById('pairs-analytics-tbody');
        if (!tbody) return;
        
        if (this.pairAnalytics.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No pair data available</td></tr>';
            return;
        }
        
        // Show first 20 pairs
        const displayPairs = this.pairAnalytics.slice(0, 20);
        
        tbody.innerHTML = displayPairs.map(pair => `
            <tr>
                <td>
                    <div style="font-weight: 600;">${pair.token_a_symbol}</div>
                    <div style="font-size: 0.875rem; color: #94a3b8;">${pair.token_a_name || 'N/A'}</div>
                </td>
                <td>
                    <div style="font-weight: 600;">${pair.token_b_symbol}</div>
                    <div style="font-size: 0.875rem; color: #94a3b8;">${pair.token_b_name || 'N/A'}</div>
                </td>
                <td>${pair.market_cap_ratio ? (pair.market_cap_ratio * 100).toFixed(1) + '%' : 'N/A'}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 60px; height: 4px; background: #e5e7eb; border-radius: 2px;">
                            <div style="width: ${(pair.compatibility_score || 0)}%; height: 100%; background: ${this.getCompatibilityColor(pair.compatibility_score)}; border-radius: 2px;"></div>
                        </div>
                        <span>${pair.compatibility_score ? pair.compatibility_score.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                </td>
                <td><span class="status-badge ${pair.category || 'unknown'}">${pair.category || 'Unknown'}</span></td>
                <td>${this.formatRelativeTime(pair.created_at)}</td>
                <td>
                    <div>Used: ${pair.usage_count || 0} times</div>
                    ${pair.last_used ? `<div style="font-size: 0.875rem; color: #94a3b8;">Last: ${this.formatRelativeTime(pair.last_used)}</div>` : ''}
                </td>
            </tr>
        `).join('');
    }

    /**
     * Get Compatibility Color for Progress Bar
     */
    getCompatibilityColor(score) {
        if (!score) return '#6b7280';
        if (score >= 90) return '#22c55e';
        if (score >= 70) return '#3b82f6';
        if (score >= 50) return '#f59e0b';
        return '#ef4444';
    }

    /**
     * Update Performance Chart
     */
    updatePerformanceChart() {
        try {
            const canvas = document.getElementById('pair-performance-chart');
            if (!canvas) return;
            
            // Destroy existing chart
            if (this.performanceChart) {
                this.performanceChart.destroy();
            }
            
            const ctx = canvas.getContext('2d');
            
            // Create compatibility distribution chart
            this.performanceChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Excellent (90%+)', 'Good (70-89%)', 'Fair (50-69%)', 'Poor (<50%)'],
                    datasets: [{
                        data: [
                            this.analyticsState.compatibilityDistribution.excellent,
                            this.analyticsState.compatibilityDistribution.good,
                            this.analyticsState.compatibilityDistribution.fair,
                            this.analyticsState.compatibilityDistribution.poor
                        ],
                        backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
                        borderColor: '#1f2937',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Pair Compatibility Distribution',
                            color: '#f3f4f6'
                        },
                        legend: {
                            labels: {
                                color: '#f3f4f6'
                            }
                        }
                    }
                }
            });
            
            console.log('✅ Performance chart updated');
            
        } catch (error) {
            console.error('Error updating performance chart:', error);
        }
    }

    /**
     * Export Pair Analytics
     */
    async exportPairAnalytics() {
        try {
            console.log('📤 Exporting pair analytics...');
            this.showAdminNotification('Preparing analytics export...', 'info');
            
            const exportData = {
                exportDate: new Date().toISOString(),
                overview: this.analyticsState.overview,
                performance: this.analyticsState.performance,
                categories: this.analyticsState.categories,
                compatibilityDistribution: this.analyticsState.compatibilityDistribution,
                recentActivity: this.analyticsState.recentActivity,
                topPerformingPairs: this.analyticsState.topPerformingPairs,
                allPairs: this.pairAnalytics.map(pair => ({
                    tokenA: pair.token_a_symbol,
                    tokenB: pair.token_b_symbol,
                    compatibility: pair.compatibility_score,
                    marketCapRatio: pair.market_cap_ratio,
                    category: pair.category,
                    usageCount: pair.usage_count,
                    created: pair.created_at,
                    lastUsed: pair.last_used
                }))
            };
            
            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tokenwars-pair-analytics-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showAdminNotification('Analytics exported successfully', 'success');
            
            // Log admin action
            await this.logAdminAction('analytics_export', {
                action: 'export_pair_analytics',
                export_type: 'full_analytics',
                pairs_count: this.pairAnalytics.length,
                admin_wallet: sessionStorage.getItem('adminWallet') || 'admin'
            });
            
        } catch (error) {
            console.error('Error exporting analytics:', error);
            this.showAdminNotification('Export failed', 'error');
        }
    }

    /**
     * View Detailed Pair Analysis
     */
    async viewDetailedAnalysis() {
        try {
            this.showDetailedAnalysisModal();
            
        } catch (error) {
            console.error('Error viewing detailed analysis:', error);
            this.showAdminNotification('Failed to load detailed analysis', 'error');
        }
    }

    /**
     * Show Detailed Analysis Modal
     */
    showDetailedAnalysisModal() {
        const modalHtml = `
            <div class="modal" id="detailed-analysis-modal">
                <div class="modal-content" style="max-width: 1200px;">
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                    <h3>📈 Detailed Pair Analysis</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin: 1rem 0;">
                        <div class="metric-card">
                            <h4>Performance Summary</h4>
                            <p><strong>Success Rate:</strong> ${this.analyticsState.performance.successRate.toFixed(1)}%</p>
                            <p><strong>Avg Engagement:</strong> ${this.analyticsState.performance.avgEngagement.toFixed(2)} SOL</p>
                            <p><strong>Revenue per Pair:</strong> ${this.analyticsState.performance.revenuePerPair.toFixed(3)} SOL</p>
                        </div>
                        
                        <div class="metric-card">
                            <h4>Category Distribution</h4>
                            <p><strong>Conservative:</strong> ${this.analyticsState.categories.conservative}</p>
                            <p><strong>Balanced:</strong> ${this.analyticsState.categories.balanced}</p>
                            <p><strong>Aggressive:</strong> ${this.analyticsState.categories.aggressive}</p>
                            <p><strong>Experimental:</strong> ${this.analyticsState.categories.experimental}</p>
                        </div>
                        
                        <div class="metric-card">
                            <h4>Compatibility Ranges</h4>
                            <p><strong>Excellent (90%+):</strong> ${this.analyticsState.compatibilityDistribution.excellent}</p>
                            <p><strong>Good (70-89%):</strong> ${this.analyticsState.compatibilityDistribution.good}</p>
                            <p><strong>Fair (50-69%):</strong> ${this.analyticsState.compatibilityDistribution.fair}</p>
                            <p><strong>Poor (<50%):</strong> ${this.analyticsState.compatibilityDistribution.poor}</p>
                        </div>
                    </div>
                    
                    <div style="margin: 2rem 0;">
                        <h4>🏆 Top Performing Pairs</h4>
                        <div style="max-height: 300px; overflow-y: auto;">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Pair</th>
                                        <th>Compatibility</th>
                                        <th>Usage Count</th>
                                        <th>Category</th>
                                        <th>Last Used</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.analyticsState.topPerformingPairs.map(pair => `
                                        <tr>
                                            <td><strong>${pair.tokenA}</strong> vs <strong>${pair.tokenB}</strong></td>
                                            <td>${pair.compatibility ? pair.compatibility.toFixed(1) + '%' : 'N/A'}</td>
                                            <td>${pair.usageCount}</td>
                                            <td><span class="status-badge ${pair.category}">${pair.category}</span></td>
                                            <td>${pair.lastUsed ? this.formatRelativeTime(pair.lastUsed) : 'Never'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button class="btn btn-primary" onclick="window.PairOptimizer.instance.exportPairAnalytics()">
                            📤 Export Analytics
                        </button>
                        <button class="btn btn-secondary" onclick="window.PairOptimizer.instance.refreshAnalytics()">
                            🔄 Refresh Data
                        </button>
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
                    action: actionType,
                    action_data: actionData,
                    ip_address: 'web-client',
                    user_agent: navigator.userAgent,
                    timestamp: new Date().toISOString()
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
        // Analytics actions
        document.addEventListener('click', (e) => {
            if (e.target.onclick?.toString().includes('exportPairAnalytics')) {
                this.exportPairAnalytics();
            } else if (e.target.onclick?.toString().includes('viewDetailedAnalysis')) {
                this.viewDetailedAnalysis();
            } else if (e.target.onclick?.toString().includes('refreshPairAnalytics')) {
                this.refreshAnalytics();
            }
        });

        console.log('✅ Pair analytics event listeners set up');
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
     * Update Element Helper
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Format Relative Time
     */
    formatRelativeTime(dateString) {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diff = (now - date) / 1000;
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
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
        if (this.analyticsInterval) {
            clearInterval(this.analyticsInterval);
            this.analyticsInterval = null;
        }
        
        if (this.performanceChart) {
            this.performanceChart.destroy();
            this.performanceChart = null;
        }
        
        console.log('🧹 Pair Analytics cleaned up');
    }
}

// Create singleton instance
PairOptimizer.instance = null;

// Export for global use
window.PairOptimizer = PairOptimizer;

console.log('✅ PairOptimizer component loaded - ANALYTICS ONLY');
console.log('📈 Features:');
console.log('   📊 Read-only analytics dashboard for token_pairs table');
console.log('   🚫 NO pair generation functionality (handled by edge functions)');
console.log('   📈 Compatibility distribution and performance metrics');
console.log('   🏆 Top performing pairs analysis');
console.log('   📤 Analytics export functionality');
console.log('   ⏰ Real-time monitoring and refresh capabilities');
