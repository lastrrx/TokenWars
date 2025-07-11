/**
 * CacheMonitor Component - LIVE DATA ONLY
 * Real-time cache monitoring with database integration - NO mock data
 */

class CacheMonitor {
    constructor(adminState) {
        this.adminState = adminState;
        this.isInitialized = false;
        this.monitoringInterval = null;
        this.cacheRefreshInterval = null;
        this.performanceChart = null;
        
        // Live monitoring state - NO fallbacks
        this.monitoringState = {
            tokenCache: {
                status: 'unknown',
                hitRate: 0,
                responseTime: 0,
                size: 0,
                freshCount: 0,
                staleCount: 0,
                expiredCount: 0,
                lastRefresh: null,
                healthScore: 0
            },
            priceCache: {
                status: 'unknown',
                hitRate: 0,
                responseTime: 0,
                size: 0,
                freshCount: 0,
                staleCount: 0,
                expiredCount: 0,
                lastRefresh: null,
                healthScore: 0
            },
            apiRateLimits: {
                coingecko: {
                    requestsMade: 0,
                    requestsLimit: 50,
                    isLimited: false,
                    successRate: 100,
                    avgResponseTime: 0
                },
                jupiter: {
                    requestsMade: 0,
                    requestsLimit: 100,
                    isLimited: false,
                    successRate: 100,
                    avgResponseTime: 0
                }
            },
            backgroundJobs: {
                active: 0,
                pending: 0,
                failed: 0,
                completed: 0,
                paused: false
            },
            systemHealth: {
                overallScore: 0,
                cacheEfficiency: 0,
                apiHealth: 0,
                dataFreshness: 0,
                lastCheck: null
            }
        };
        
        console.log('CacheMonitor: Component initialized - LIVE DATA ONLY');
    }

    /**
     * Initialize Cache Monitor Component
     */
    async initialize() {
        try {
            console.log('🔧 Initializing Cache Monitor - LIVE DATA ONLY...');
            
            // Load live cache data
            await this.loadCacheData();
            
            // Start real-time monitoring
            this.startCacheMonitoring();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Cache Monitor initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Cache Monitor:', error);
            this.showAdminNotification('Failed to initialize Cache Monitor', 'error');
            return false;
        }
    }

    /**
     * Load Live Cache Data from Database
     */
    async loadCacheData() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            console.log('📊 Loading live cache data from database...');
            
            // Load cache health data
            await this.loadCacheHealthData();
            
            // Load API rate limits
            await this.loadApiRateLimits();
            
            // Load background jobs status
            await this.loadBackgroundJobsStatus();
            
            // Calculate system health
            this.calculateSystemHealth();
            
            console.log('✅ Live cache data loaded successfully');
            
        } catch (error) {
            console.error('Error loading cache data:', error);
            throw error;
        }
    }

    /**
     * Load Cache Health Data from Database
     */
    async loadCacheHealthData() {
        try {
            const supabase = this.getSupabase();
            
            // Get latest cache health record
            const { data: cacheHealth, error: healthError } = await supabase
                .from('cache_health')
                .select('*')
                .order('recorded_at', { ascending: false })
                .limit(1)
                .single();

            if (healthError && healthError.code !== 'PGRST116') {
                throw healthError;
            }

            if (cacheHealth) {
                this.monitoringState.systemHealth.overallScore = cacheHealth.overall_health_score * 100;
                this.monitoringState.systemHealth.cacheEfficiency = cacheHealth.cache_hit_rate;
                this.monitoringState.systemHealth.lastCheck = cacheHealth.recorded_at;
                
                // Update cache health metrics
                this.monitoringState.tokenCache.freshCount = cacheHealth.fresh_cache_count;
                this.monitoringState.tokenCache.staleCount = cacheHealth.stale_cache_count;
                this.monitoringState.tokenCache.expiredCount = cacheHealth.expired_cache_count;
                this.monitoringState.tokenCache.size = cacheHealth.total_cached_tokens;
                this.monitoringState.tokenCache.hitRate = cacheHealth.cache_hit_rate;
                this.monitoringState.tokenCache.healthScore = cacheHealth.overall_health_score * 100;
            }

            // Get token cache status
            const { data: tokenCacheStats, error: tokenError } = await supabase
                .from('token_cache')
                .select('cache_status, cache_created_at, cache_expires_at')
                .gte('cache_expires_at', new Date().toISOString());

            if (!tokenError && tokenCacheStats) {
                const now = new Date();
                const fresh = tokenCacheStats.filter(t => 
                    t.cache_status === 'FRESH' && new Date(t.cache_expires_at) > now
                ).length;
                
                this.monitoringState.tokenCache.size = tokenCacheStats.length;
                this.monitoringState.tokenCache.freshCount = fresh;
                this.monitoringState.tokenCache.staleCount = tokenCacheStats.length - fresh;
                this.monitoringState.tokenCache.status = fresh > 0 ? 'healthy' : 'warning';
            }

            // Get price cache status
            const { data: priceCacheStats, error: priceError } = await supabase
                .from('price_cache')
                .select('cache_expires_at, timestamp, fetch_duration_ms')
                .gte('cache_expires_at', new Date().toISOString())
                .order('timestamp', { ascending: false })
                .limit(100);

            if (!priceError && priceCacheStats) {
                const now = new Date();
                const fresh = priceCacheStats.filter(p => 
                    new Date(p.cache_expires_at) > now
                ).length;
                
                this.monitoringState.priceCache.size = priceCacheStats.length;
                this.monitoringState.priceCache.freshCount = fresh;
                this.monitoringState.priceCache.staleCount = priceCacheStats.length - fresh;
                this.monitoringState.priceCache.status = fresh > 0 ? 'healthy' : 'warning';
                
                // Calculate average response time
                const avgResponseTime = priceCacheStats
                    .filter(p => p.fetch_duration_ms)
                    .reduce((sum, p) => sum + p.fetch_duration_ms, 0) / priceCacheStats.length;
                
                this.monitoringState.priceCache.responseTime = Math.round(avgResponseTime) || 0;
            }
            
            console.log('✅ Cache health data loaded');
            
        } catch (error) {
            console.error('Error loading cache health data:', error);
            throw error;
        }
    }

    /**
     * Load API Rate Limits from Database
     */
    async loadApiRateLimits() {
        try {
            const supabase = this.getSupabase();
            
            // Get current API rate limit status
            const { data: rateLimits, error } = await supabase
                .from('api_rate_limits')
                .select('*')
                .gte('window_start', new Date(Date.now() - 3600000).toISOString()); // Last hour

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (rateLimits) {
                rateLimits.forEach(limit => {
                    const source = limit.api_source.toLowerCase();
                    if (this.monitoringState.apiRateLimits[source]) {
                        this.monitoringState.apiRateLimits[source] = {
                            requestsMade: limit.requests_made,
                            requestsLimit: limit.requests_limit,
                            isLimited: limit.is_limited,
                            successRate: limit.success_rate || 100,
                            avgResponseTime: limit.avg_response_time_ms || 0
                        };
                    }
                });
                
                // Calculate API health
                const totalSources = Object.keys(this.monitoringState.apiRateLimits).length;
                const healthySources = Object.values(this.monitoringState.apiRateLimits)
                    .filter(api => !api.isLimited && api.successRate > 90).length;
                
                this.monitoringState.systemHealth.apiHealth = (healthySources / totalSources) * 100;
            }
            
            console.log('✅ API rate limits loaded');
            
        } catch (error) {
            console.error('Error loading API rate limits:', error);
            throw error;
        }
    }

    /**
     * Load Background Jobs Status from Database
     */
    async loadBackgroundJobsStatus() {
        try {
            const supabase = this.getSupabase();
            
            // Get background jobs status
            const { data: jobs, error } = await supabase
                .from('background_jobs')
                .select('status, job_type, started_at, completed_at')
                .gte('scheduled_at', new Date(Date.now() - 86400000).toISOString()); // Last 24 hours

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (jobs) {
                this.monitoringState.backgroundJobs = {
                    active: jobs.filter(j => j.status === 'RUNNING').length,
                    pending: jobs.filter(j => j.status === 'PENDING').length,
                    failed: jobs.filter(j => j.status === 'FAILED').length,
                    completed: jobs.filter(j => j.status === 'COMPLETED').length,
                    paused: false // Could be determined by checking for recent job activity
                };
            }
            
            console.log('✅ Background jobs status loaded');
            
        } catch (error) {
            console.error('Error loading background jobs status:', error);
            throw error;
        }
    }

    /**
     * Calculate Overall System Health
     */
    calculateSystemHealth() {
        try {
            const cacheHealth = (this.monitoringState.tokenCache.healthScore + this.monitoringState.priceCache.healthScore) / 2;
            const apiHealth = this.monitoringState.systemHealth.apiHealth;
            const dataFreshness = this.monitoringState.systemHealth.dataFreshness;
            
            // Weight the different health components
            this.monitoringState.systemHealth.overallScore = Math.round(
                (cacheHealth * 0.4) + 
                (apiHealth * 0.3) + 
                (dataFreshness * 0.3)
            );
            
            console.log(`📊 System health calculated: ${this.monitoringState.systemHealth.overallScore}%`);
            
        } catch (error) {
            console.error('Error calculating system health:', error);
        }
    }

    /**
     * Start Real-time Cache Monitoring
     */
    startCacheMonitoring() {
        try {
            // Monitor cache every 30 seconds
            this.monitoringInterval = setInterval(async () => {
                try {
                    await this.refreshCacheData();
                    this.updateCacheDisplay();
                } catch (error) {
                    console.error('Cache monitoring error:', error);
                }
            }, 3600000);

            console.log('✅ Real-time cache monitoring started');
            
        } catch (error) {
            console.error('Failed to start cache monitoring:', error);
        }
    }

    /**
     * Refresh Cache Data
     */
    async refreshCacheData() {
        try {
            console.log('🔄 Refreshing cache data...');
            await this.loadCacheData();
            this.updateCacheDisplay();
            console.log('✅ Cache data refreshed');
            
        } catch (error) {
            console.error('Error refreshing cache data:', error);
            throw error;
        }
    }

    /**
     * Refresh All Caches
     */
    async refreshAllCaches() {
        try {
            console.log('🔄 Initiating cache refresh...');
            this.showAdminNotification('Cache refresh initiated...', 'info');
            
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            // Trigger background job for cache refresh
            const { data: job, error } = await supabase
                .from('background_jobs')
                .insert({
                    job_type: 'CACHE_REFRESH',
                    job_data: {
                        refresh_type: 'ALL_CACHES',
                        requested_by: sessionStorage.getItem('adminWallet') || 'admin',
                        priority: 'HIGH'
                    },
                    priority: 'HIGH',
                    scheduled_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            this.showAdminNotification('Cache refresh job queued successfully', 'success');
            
            // Refresh data after a delay
            setTimeout(async () => {
                await this.refreshCacheData();
            }, 5000);
            
        } catch (error) {
            console.error('Error refreshing all caches:', error);
            this.showAdminNotification('Failed to refresh caches: ' + error.message, 'error');
        }
    }

          /**
         * Updated clearStaleCache() - Triggers edge function instead of deleting data
         */
        async clearStaleCache() {
            try {
                console.log('🔄 Refreshing stale cache via edge function...');
                this.showAdminNotification('Triggering cache refresh via auto-update-tokens...', 'info');
                
                const supabase = this.getSupabase();
                if (!supabase) {
                    throw new Error('Database connection not available');
                }
        
                // Call the auto-update-tokens edge function
                console.log('📡 Calling auto-update-tokens edge function...');
                
                const edgeFunctionUrl = 'https://lavbfujrqmxiyfkfgcqy.supabase.co/functions/v1/auto-update-tokens';
                
                const response = await fetch(edgeFunctionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabase.supabaseKey || Deno.env.get('SUPABASE_ANON_KEY')}`,
                        'apikey': supabase.supabaseKey || Deno.env.get('SUPABASE_ANON_KEY')
                    },
                    body: JSON.stringify({
                        forceRun: true, // Force run regardless of threshold
                        triggeredBy: 'admin_clear_stale_cache',
                        adminWallet: sessionStorage.getItem('adminWallet') || 'admin'
                    })
                });
        
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Edge function failed: ${response.status} ${response.statusText} - ${errorText}`);
                }
        
                const result = await response.json();
                console.log('✅ Edge function response:', result);
        
                // Log admin action
                await this.logAdminAction('cache_refresh_via_edge_function', {
                    action: 'trigger_auto_update_tokens',
                    edge_function_response: result,
                    admin_wallet: sessionStorage.getItem('adminWallet') || 'admin',
                    method: 'no_deletion_refresh'
                });
        
                // Show success message with details
                if (result.success) {
                    const message = result.tokens_processed 
                        ? `Cache refreshed: ${result.tokens_processed} tokens updated via edge function`
                        : 'Cache refresh completed via edge function';
                    
                    this.showAdminNotification(message, 'success');
                    
                    console.log('🎉 Cache refresh completed:', {
                        tokensProcessed: result.tokens_processed || 0,
                        tokensAttempted: result.tokens_attempted || 0,
                        method: 'edge_function_call'
                    });
                } else {
                    throw new Error(result.error || 'Edge function returned success: false');
                }
        
                // Refresh local cache data after edge function completes
                setTimeout(async () => {
                    console.log('🔄 Refreshing local cache display...');
                    await this.refreshCacheData();
                }, 3000); // Wait 3 seconds for edge function changes to propagate
                
            } catch (error) {
                console.error('Error triggering cache refresh via edge function:', error);
                this.showAdminNotification(`Failed to refresh cache: ${error.message}`, 'error');
            }
        }
        
        /**
         * Alternative function to call edge function with different parameters
         */
        async refreshStaleTokensViaEdgeFunction(options = {}) {
            try {
                const {
                    forceRun = false,
                    maxTokens = 250,
                    triggeredBy = 'admin_manual_refresh'
                } = options;
        
                console.log(`🚀 Calling auto-update-tokens edge function with options:`, options);
                
                const supabase = this.getSupabase();
                const edgeFunctionUrl = 'https://lavbfujrqmxiyfkfgcqy.supabase.co/functions/v1/auto-update-tokens';
                
                const response = await fetch(edgeFunctionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabase.supabaseKey || Deno.env.get('SUPABASE_ANON_KEY')}`,
                        'apikey': supabase.supabaseKey || Deno.env.get('SUPABASE_ANON_KEY')
                    },
                    body: JSON.stringify({
                        forceRun,
                        maxTokens,
                        triggeredBy,
                        adminWallet: sessionStorage.getItem('adminWallet') || 'admin',
                        timestamp: new Date().toISOString()
                    })
                });
        
                if (!response.ok) {
                    throw new Error(`Edge function call failed: ${response.status} ${response.statusText}`);
                }
        
                const result = await response.json();
                return result;
                
            } catch (error) {
                console.error('Error calling auto-update-tokens edge function:', error);
                throw error;
            }
        }

    /**
     * Optimize Cache Performance
     */
    async optimizeCache() {
        try {
            console.log('⚡ Optimizing cache performance...');
            this.showAdminNotification('Cache optimization started...', 'info');
            
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            // Create optimization job
            const { data: job, error } = await supabase
                .from('background_jobs')
                .insert({
                    job_type: 'CACHE_OPTIMIZATION',
                    job_data: {
                        optimization_type: 'FULL_OPTIMIZATION',
                        requested_by: sessionStorage.getItem('adminWallet') || 'admin',
                        targets: ['token_cache', 'price_cache']
                    },
                    priority: 'NORMAL',
                    scheduled_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Log admin action
            await this.logAdminAction('cache_optimization', {
                action: 'optimize_cache',
                job_id: job.id,
                admin_wallet: sessionStorage.getItem('adminWallet') || 'admin'
            });

            this.showAdminNotification('Cache optimization job queued', 'success');
            
        } catch (error) {
            console.error('Error optimizing cache:', error);
            this.showAdminNotification('Failed to optimize cache: ' + error.message, 'error');
        }
    }

    /**
     * Update Cache Display
     */
    updateCacheDisplay() {
        try {
            // Update cache health cards
            this.updateCacheHealthCard('token-cache-hit', this.monitoringState.tokenCache.hitRate.toFixed(1) + '%', 'excellent');
            this.updateCacheHealthCard('cache-response-time', this.monitoringState.tokenCache.responseTime + 'ms', 'good');
            this.updateCacheHealthCard('cache-size', this.formatCacheSize(this.monitoringState.tokenCache.size), 'warning');
            this.updateCacheHealthCard('fresh-tokens', this.monitoringState.tokenCache.freshCount, 'good');
            
            // Update system health indicators
            this.updateSystemHealthIndicators();
            
            console.log('✅ Cache display updated');
            
        } catch (error) {
            console.error('Error updating cache display:', error);
        }
    }

    /**
     * Update Cache Health Card
     */
    updateCacheHealthCard(elementId, value, status) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            element.className = `cache-metric ${status}`;
        }
    }

    /**
     * Update System Health Indicators
     */
    updateSystemHealthIndicators() {
        // Update overall health score
        const healthElement = document.getElementById('system-health-score');
        if (healthElement) {
            const score = this.monitoringState.systemHealth.overallScore;
            healthElement.textContent = score + '%';
            
            if (score >= 90) {
                healthElement.className = 'health-score excellent';
            } else if (score >= 70) {
                healthElement.className = 'health-score good';
            } else {
                healthElement.className = 'health-score warning';
            }
        }
        
        // Update status indicators
        this.updateStatusIndicator('token-cache-status', this.monitoringState.tokenCache.status);
        this.updateStatusIndicator('price-cache-status', this.monitoringState.priceCache.status);
    }

    /**
     * Update Status Indicator
     */
    updateStatusIndicator(elementId, status) {
        const element = document.getElementById(elementId);
        if (element) {
            element.className = `status-indicator ${status}`;
        }
    }

    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        // Cache management buttons
        document.addEventListener('click', (e) => {
            if (e.target.onclick?.toString().includes('refreshTokenCache')) {
                this.refreshTokenCache();
            } else if (e.target.onclick?.toString().includes('clearStaleCache')) {
                this.clearStaleCache();
            } else if (e.target.onclick?.toString().includes('optimizeCache')) {
                this.optimizeCache();
            }
        });

        console.log('✅ Cache monitor event listeners set up');
    }

    /**
     * Refresh Token Cache
     */
    async refreshTokenCache() {
        try {
            console.log('🪙 Refreshing token cache...');
            this.showAdminNotification('Token cache refresh initiated...', 'info');
            
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            // Create background job for token cache refresh
            const { data: job, error } = await supabase
                .from('background_jobs')
                .insert({
                    job_type: 'TOKEN_CACHE_REFRESH',
                    job_data: {
                        refresh_type: 'FULL_REFRESH',
                        requested_by: sessionStorage.getItem('adminWallet') || 'admin'
                    },
                    priority: 'HIGH',
                    scheduled_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            this.showAdminNotification('Token cache refresh job queued', 'success');
            
            // Log admin action
            await this.logAdminAction('token_cache_refresh', {
                action: 'refresh_token_cache',
                job_id: job.id,
                admin_wallet: sessionStorage.getItem('adminWallet') || 'admin'
            });
            
        } catch (error) {
            console.error('Error refreshing token cache:', error);
            this.showAdminNotification('Failed to refresh token cache: ' + error.message, 'error');
        }
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
     * Format Cache Size
     */
    formatCacheSize(sizeBytes) {
        if (!sizeBytes) return '0 KB';
        
        // If it's a count, convert to approximate size
        if (sizeBytes < 1000) {
            return `${sizeBytes} items`;
        }
        
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = sizeBytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
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
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        if (this.cacheRefreshInterval) {
            clearInterval(this.cacheRefreshInterval);
            this.cacheRefreshInterval = null;
        }
        
        if (this.performanceChart) {
            this.performanceChart.destroy();
            this.performanceChart = null;
        }
        
        console.log('🧹 Cache Monitor cleaned up');
    }
}

// Create singleton instance
CacheMonitor.instance = null;

// Export for global use
window.CacheMonitor = CacheMonitor;

console.log('✅ CacheMonitor component loaded - LIVE DATA ONLY');
console.log('🔧 Features:');
console.log('   📊 Real-time cache monitoring from database tables');
console.log('   🔄 Live cache refresh and optimization');
console.log('   📈 Performance analytics and health scoring');
console.log('   🗑️ Stale cache cleanup operations');
console.log('   ⚡ Background job integration for cache operations');
console.log('   📝 Complete admin action audit logging');
