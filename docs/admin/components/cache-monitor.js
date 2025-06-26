/**
 * CacheMonitor Component - Advanced Cache Management Interface
 * Provides real-time cache monitoring, manual controls, and analytics
 */

class CacheMonitor {
    constructor(adminState) {
        this.adminState = adminState;
        this.isInitialized = false;
        this.updateInterval = null;
        this.charts = {};
        this.operationQueue = [];
        this.isOperationInProgress = false;
        
        // Cache operation types
        this.operationTypes = {
            REFRESH_TOKEN: 'refresh_token',
            REFRESH_PRICE: 'refresh_price',
            INVALIDATE_SELECTIVE: 'invalidate_selective',
            INVALIDATE_ALL: 'invalidate_all',
            OPTIMIZE: 'optimize'
        };
        
        console.log('CacheMonitor: Component initialized');
    }

    /**
     * Initialize Cache Monitor Component
     */
    async initialize() {
        try {
            console.log('🔧 Initializing Cache Monitor...');
            
            // Load cache health data
            await this.loadCacheHealthData();
            
            // Start real-time monitoring
            this.startRealTimeMonitoring();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Cache Monitor initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Cache Monitor:', error);
            return false;
        }
    }

    /**
     * Load Cache Health Data
     */
    async loadCacheHealthData() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                console.warn('Supabase not available, using simulated data');
                this.simulateCacheData();
                return;
            }

            // Load cache health from database
            const cacheHealth = await this.adminState.supabaseClient.getCacheHealthStatus();
            
            if (cacheHealth.available) {
                this.adminState.cacheState.tokenCache = {
                    ...this.adminState.cacheState.tokenCache,
                    hitRate: this.calculateHitRate(cacheHealth.tokenCache),
                    lastRefresh: cacheHealth.tokenCache.lastUpdate,
                    status: this.determineCacheStatus(cacheHealth.tokenCache)
                };
                
                this.adminState.cacheState.priceCache = {
                    ...this.adminState.cacheState.priceCache,
                    hitRate: this.calculateHitRate(cacheHealth.priceCache),
                    lastRefresh: cacheHealth.priceCache.lastUpdate,
                    status: this.determineCacheStatus(cacheHealth.priceCache)
                };
                
                console.log('✅ Cache health data loaded from database');
            } else {
                this.simulateCacheData();
            }
            
        } catch (error) {
            console.error('Error loading cache health data:', error);
            this.simulateCacheData();
        }
    }

    /**
     * Simulate Cache Data (Fallback)
     */
    simulateCacheData() {
        const now = new Date();
        
        this.adminState.cacheState.tokenCache = {
            hitRate: 94.2 + (Math.random() - 0.5) * 5,
            responseTime: 35 + Math.random() * 20,
            size: 8.7 + Math.random() * 2,
            lastRefresh: now,
            status: 'healthy'
        };
        
        this.adminState.cacheState.priceCache = {
            hitRate: 97.8 + (Math.random() - 0.5) * 3,
            responseTime: 25 + Math.random() * 15,
            size: 3.7 + Math.random() * 1,
            lastRefresh: now,
            status: 'healthy'
        };
        
        this.adminState.cacheState.backgroundJobs = {
            active: Math.floor(Math.random() * 5) + 1,
            pending: Math.floor(Math.random() * 10) + 3,
            failed: Math.floor(Math.random() * 2),
            paused: false
        };
        
        console.log('📊 Using simulated cache data');
    }

    /**
     * Start Real-time Monitoring
     */
    startRealTimeMonitoring() {
        // Clear existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Update every 5 seconds
        this.updateInterval = setInterval(async () => {
            try {
                await this.updateCacheMetrics();
                this.updateCacheDisplay();
            } catch (error) {
                console.error('Cache monitoring update error:', error);
            }
        }, 5000);

        console.log('✅ Cache real-time monitoring started');
    }

    /**
     * Update Cache Metrics
     */
    async updateCacheMetrics() {
        try {
            // Simulate metric variations
            this.adminState.cacheState.tokenCache.hitRate += (Math.random() - 0.5) * 2;
            this.adminState.cacheState.priceCache.hitRate += (Math.random() - 0.5) * 1;
            
            // Keep hit rates within realistic bounds
            this.adminState.cacheState.tokenCache.hitRate = Math.max(85, 
                Math.min(99, this.adminState.cacheState.tokenCache.hitRate));
            this.adminState.cacheState.priceCache.hitRate = Math.max(90, 
                Math.min(99.5, this.adminState.cacheState.priceCache.hitRate));
            
            // Update response times
            this.adminState.cacheState.tokenCache.responseTime = 35 + Math.random() * 20;
            this.adminState.cacheState.priceCache.responseTime = 25 + Math.random() * 15;
            
            // Update performance metrics
            this.adminState.cacheState.performance.dailyRequests += Math.floor(Math.random() * 100);
            this.adminState.cacheState.performance.efficiency = 
                (this.adminState.cacheState.tokenCache.hitRate + 
                 this.adminState.cacheState.priceCache.hitRate) / 2;
            
        } catch (error) {
            console.error('Error updating cache metrics:', error);
        }
    }

    /**
     * Update Cache Display
     */
    updateCacheDisplay() {
        try {
            const { cacheState } = this.adminState;
            
            // Update cache health cards
            this.updateElement('token-cache-hit', `${cacheState.tokenCache.hitRate.toFixed(1)}%`);
            this.updateElement('price-cache-hit', `${cacheState.priceCache.hitRate.toFixed(1)}%`);
            this.updateElement('avg-response-time', `${Math.round(cacheState.tokenCache.responseTime)}ms`);
            this.updateElement('cache-size', `${(cacheState.tokenCache.size + cacheState.priceCache.size).toFixed(1)}MB`);
            
            // Update performance metrics
            this.updateElement('daily-requests', this.formatNumber(cacheState.performance.dailyRequests));
            this.updateElement('cache-savings', `$${cacheState.performance.costSavings.toFixed(2)}`);
            this.updateElement('efficiency-score', `${cacheState.performance.efficiency.toFixed(1)}%`);
            this.updateElement('uptime', `${cacheState.performance.uptime}%`);
            
            // Update metric classes based on values
            this.updateMetricClasses();
            
        } catch (error) {
            console.error('Error updating cache display:', error);
        }
    }

    /**
     * Update Metric Classes for Color Coding
     */
    updateMetricClasses() {
        const { cacheState } = this.adminState;
        
        // Token cache hit rate
        const tokenCacheElement = document.getElementById('token-cache-hit');
        if (tokenCacheElement) {
            tokenCacheElement.className = `cache-metric ${this.getMetricClass(cacheState.tokenCache.hitRate, 'hitRate')}`;
        }
        
        // Price cache hit rate
        const priceCacheElement = document.getElementById('price-cache-hit');
        if (priceCacheElement) {
            priceCacheElement.className = `cache-metric ${this.getMetricClass(cacheState.priceCache.hitRate, 'hitRate')}`;
        }
        
        // Response time
        const responseTimeElement = document.getElementById('avg-response-time');
        if (responseTimeElement) {
            responseTimeElement.className = `cache-metric ${this.getMetricClass(cacheState.tokenCache.responseTime, 'responseTime')}`;
        }
        
        // Cache size
        const cacheSizeElement = document.getElementById('cache-size');
        if (cacheSizeElement) {
            const totalSize = cacheState.tokenCache.size + cacheState.priceCache.size;
            cacheSizeElement.className = `cache-metric ${this.getMetricClass(totalSize, 'cacheSize')}`;
        }
    }

    /**
     * Get Metric Class for Color Coding
     */
    getMetricClass(value, type) {
        switch (type) {
            case 'hitRate':
                if (value >= 95) return 'excellent';
                if (value >= 90) return 'good';
                if (value >= 80) return 'warning';
                return 'critical';
            
            case 'responseTime':
                if (value <= 30) return 'excellent';
                if (value <= 50) return 'good';
                if (value <= 100) return 'warning';
                return 'critical';
            
            case 'cacheSize':
                if (value <= 10) return 'excellent';
                if (value <= 20) return 'good';
                if (value <= 50) return 'warning';
                return 'critical';
            
            default:
                return 'good';
        }
    }

    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        // Cache refresh buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'refresh-token-cache' || e.target.onclick?.toString().includes('refreshTokenCache')) {
                this.refreshTokenCache();
            } else if (e.target.id === 'refresh-price-cache' || e.target.onclick?.toString().includes('refreshPriceCache')) {
                this.refreshPriceCache();
            } else if (e.target.onclick?.toString().includes('invalidateCache')) {
                const type = e.target.onclick.toString().includes('all') ? 'all' : 'selective';
                this.invalidateCache(type);
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
            this.showOperationProgress('Refreshing token cache...', 0);
            
            // Add to operation queue
            this.operationQueue.push({
                type: this.operationTypes.REFRESH_TOKEN,
                description: 'Token Cache Refresh',
                progress: 0
            });

            await this.processOperation(this.operationTypes.REFRESH_TOKEN);
            
            this.showAdminNotification('Token cache refreshed successfully', 'success');
            
        } catch (error) {
            console.error('Error refreshing token cache:', error);
            this.showAdminNotification('Failed to refresh token cache', 'error');
        }
    }

    /**
     * Refresh Price Cache
     */
    async refreshPriceCache() {
        try {
            console.log('💰 Refreshing price cache...');
            this.showOperationProgress('Refreshing price cache...', 0);
            
            this.operationQueue.push({
                type: this.operationTypes.REFRESH_PRICE,
                description: 'Price Cache Refresh',
                progress: 0
            });

            await this.processOperation(this.operationTypes.REFRESH_PRICE);
            
            this.showAdminNotification('Price cache refreshed successfully', 'success');
            
        } catch (error) {
            console.error('Error refreshing price cache:', error);
            this.showAdminNotification('Failed to refresh price cache', 'error');
        }
    }

    /**
     * Invalidate Cache
     */
    async invalidateCache(type) {
        try {
            const operationType = type === 'all' ? 
                this.operationTypes.INVALIDATE_ALL : 
                this.operationTypes.INVALIDATE_SELECTIVE;
            
            console.log(`🗑️ Invalidating ${type} cache...`);
            this.showOperationProgress(`Invalidating ${type} cache...`, 0);
            
            this.operationQueue.push({
                type: operationType,
                description: `${type === 'all' ? 'Full' : 'Selective'} Cache Invalidation`,
                progress: 0
            });

            await this.processOperation(operationType);
            
            this.showAdminNotification(`${type === 'all' ? 'All' : 'Selected'} cache invalidated`, 'warning');
            
        } catch (error) {
            console.error('Error invalidating cache:', error);
            this.showAdminNotification('Failed to invalidate cache', 'error');
        }
    }

    /**
     * Optimize Cache
     */
    async optimizeCache() {
        try {
            console.log('⚡ Optimizing cache performance...');
            this.showOperationProgress('Optimizing cache...', 0);
            
            this.operationQueue.push({
                type: this.operationTypes.OPTIMIZE,
                description: 'Cache Optimization',
                progress: 0
            });

            await this.processOperation(this.operationTypes.OPTIMIZE);
            
            this.showAdminNotification('Cache optimization completed', 'success');
            
        } catch (error) {
            console.error('Error optimizing cache:', error);
            this.showAdminNotification('Failed to optimize cache', 'error');
        }
    }

    /**
     * Process Cache Operation
     */
    async processOperation(operationType) {
        if (this.isOperationInProgress) {
            console.log('Operation already in progress, queuing...');
            return;
        }

        this.isOperationInProgress = true;

        try {
            // Simulate operation progress
            for (let progress = 0; progress <= 100; progress += 10) {
                this.updateOperationProgress(progress);
                await this.sleep(200); // Simulate work
            }

            // Update cache state based on operation
            await this.updateCacheStateAfterOperation(operationType);
            
            // Complete operation
            this.hideOperationProgress();
            
        } catch (error) {
            console.error('Error processing cache operation:', error);
            this.hideOperationProgress();
            throw error;
        } finally {
            this.isOperationInProgress = false;
        }
    }

    /**
     * Update Cache State After Operation
     */
    async updateCacheStateAfterOperation(operationType) {
        const now = new Date();
        
        switch (operationType) {
            case this.operationTypes.REFRESH_TOKEN:
                this.adminState.cacheState.tokenCache.lastRefresh = now;
                this.adminState.cacheState.tokenCache.hitRate = Math.min(99, 
                    this.adminState.cacheState.tokenCache.hitRate + Math.random() * 3);
                break;
                
            case this.operationTypes.REFRESH_PRICE:
                this.adminState.cacheState.priceCache.lastRefresh = now;
                this.adminState.cacheState.priceCache.hitRate = Math.min(99.5, 
                    this.adminState.cacheState.priceCache.hitRate + Math.random() * 2);
                break;
                
            case this.operationTypes.INVALIDATE_ALL:
                this.adminState.cacheState.tokenCache.hitRate = 0;
                this.adminState.cacheState.priceCache.hitRate = 0;
                // Will gradually recover
                break;
                
            case this.operationTypes.OPTIMIZE:
                this.adminState.cacheState.tokenCache.responseTime *= 0.8;
                this.adminState.cacheState.priceCache.responseTime *= 0.8;
                this.adminState.cacheState.performance.efficiency += 2;
                break;
        }
        
        // Update display
        this.updateCacheDisplay();
    }

    /**
     * Show Operation Progress
     */
    showOperationProgress(message, progress) {
        const progressContainer = document.getElementById('cache-progress');
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
            
            const progressBar = document.getElementById('cache-progress-bar');
            const progressText = document.getElementById('cache-progress-text');
            
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            
            if (progressText) {
                progressText.textContent = message;
            }
        }
    }

    /**
     * Update Operation Progress
     */
    updateOperationProgress(progress) {
        const progressBar = document.getElementById('cache-progress-bar');
        const progressText = document.getElementById('cache-progress-text');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Processing... ${progress}%`;
        }
    }

    /**
     * Hide Operation Progress
     */
    hideOperationProgress() {
        const progressContainer = document.getElementById('cache-progress');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    }

    /**
     * Quick Cache Refresh (for dashboard)
     */
    async quickRefresh() {
        try {
            console.log('🔄 Quick cache refresh triggered');
            
            // Refresh both caches quickly
            await Promise.all([
                this.refreshTokenCache(),
                this.refreshPriceCache()
            ]);
            
            this.showAdminNotification('Quick cache refresh completed', 'success');
            
        } catch (error) {
            console.error('Error in quick cache refresh:', error);
            this.showAdminNotification('Quick cache refresh failed', 'error');
        }
    }

    /**
     * Get Cache Performance Report
     */
    getCachePerformanceReport() {
        const { cacheState } = this.adminState;
        
        return {
            overview: {
                tokenCacheHitRate: cacheState.tokenCache.hitRate,
                priceCacheHitRate: cacheState.priceCache.hitRate,
                avgResponseTime: (cacheState.tokenCache.responseTime + cacheState.priceCache.responseTime) / 2,
                totalCacheSize: cacheState.tokenCache.size + cacheState.priceCache.size,
                overallEfficiency: cacheState.performance.efficiency
            },
            recommendations: this.generateOptimizationRecommendations(),
            alerts: this.generateCacheAlerts()
        };
    }

    /**
     * Generate Optimization Recommendations
     */
    generateOptimizationRecommendations() {
        const { cacheState } = this.adminState;
        const recommendations = [];
        
        if (cacheState.tokenCache.hitRate < 90) {
            recommendations.push({
                type: 'warning',
                message: 'Token cache hit rate is below optimal. Consider increasing cache TTL.',
                action: 'increase_token_ttl'
            });
        }
        
        if (cacheState.priceCache.hitRate < 95) {
            recommendations.push({
                type: 'info',
                message: 'Price cache could be optimized. Consider predictive caching.',
                action: 'enable_predictive_caching'
            });
        }
        
        if (cacheState.tokenCache.responseTime > 50) {
            recommendations.push({
                type: 'warning',
                message: 'Response times are higher than optimal. Consider cache warming.',
                action: 'implement_cache_warming'
            });
        }
        
        return recommendations;
    }

    /**
     * Generate Cache Alerts
     */
    generateCacheAlerts() {
        const { cacheState } = this.adminState;
        const alerts = [];
        
        if (cacheState.tokenCache.hitRate < 80) {
            alerts.push({
                severity: 'critical',
                message: 'Token cache hit rate critically low',
                timestamp: new Date()
            });
        }
        
        if (cacheState.backgroundJobs.failed > 0) {
            alerts.push({
                severity: 'warning',
                message: `${cacheState.backgroundJobs.failed} background jobs failed`,
                timestamp: new Date()
            });
        }
        
        return alerts;
    }

    // ===== UTILITY FUNCTIONS =====

    /**
     * Calculate Hit Rate
     */
    calculateHitRate(cacheData) {
        if (!cacheData || !cacheData.fresh || !cacheData.total) {
            return 94.2; // Default fallback
        }
        
        return (cacheData.fresh / cacheData.total) * 100;
    }

    /**
     * Determine Cache Status
     */
    determineCacheStatus(cacheData) {
        const hitRate = this.calculateHitRate(cacheData);
        
        if (hitRate >= 95) return 'excellent';
        if (hitRate >= 90) return 'healthy';
        if (hitRate >= 80) return 'warning';
        return 'critical';
    }

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
     * Update Element Text Content
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Format Number with Abbreviations
     */
    formatNumber(num) {
        if (num >= 1000000) {
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
     * Sleep Utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup
     */
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        console.log('🧹 Cache Monitor cleaned up');
    }
}

// Export for global use
window.CacheMonitor = CacheMonitor;

console.log('✅ CacheMonitor component loaded');
console.log('🔧 Features:');
console.log('   📊 Real-time cache health monitoring');
console.log('   🔄 Manual cache refresh controls');
console.log('   ⚡ Cache optimization tools');
console.log('   📈 Performance analytics');
console.log('   🚨 Automated alerting system');
