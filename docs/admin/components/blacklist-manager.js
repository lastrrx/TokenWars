/**
 * BlacklistManager Component - LIVE DATA ONLY with Whitelist & Analytics
 * Real-time blacklist management with database integration - NO mock data
 */

class BlacklistManager {
    constructor(adminState) {
        this.adminState = adminState;
        this.isInitialized = false;
        this.detectionInterval = null;
        this.selectedBlacklistItems = new Set();
        this.analyticsData = {};
        
        // Blacklist categories
        this.blacklistCategories = {
            MANUAL: 'manual',
            AUTOMATIC: 'automatic', 
            COMMUNITY: 'community',
            APPEALS: 'appeals'
        };
        
        // Detection algorithms tracking
        this.detectionAlgorithms = {
            RUGPULL: 'rugpull_detection',
            SCAM: 'scam_detection',
            HONEYPOT: 'honeypot_analysis',
            DUPLICATE: 'duplicate_name_detection'
        };
        
        // Analytics state - LIVE DATA ONLY
        this.analyticsState = {
            overview: {
                totalBlacklisted: 0,
                autoDetected: 0,
                manuallyAdded: 0,
                communityReported: 0,
                activeAppeals: 0,
                detectionAccuracy: 0,
                recentActivity: []
            },
            categories: {
                manual: { count: 0, percentage: 0 },
                automatic: { count: 0, percentage: 0 },
                community: { count: 0, percentage: 0 },
                appeals: { count: 0, percentage: 0 }
            },
            severity: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0
            },
            timeline: [],
            topReasons: [],
            whitelistCandidates: []
        };
        
        console.log('BlacklistManager: Component initialized - LIVE DATA ONLY');
    }

    /**
     * Initialize Blacklist Manager Component
     */
    async initialize() {
        try {
            console.log('🚫 Initializing Blacklist Manager - LIVE DATA ONLY...');
            
            // Load existing blacklist data from database
            await this.loadBlacklistData();
            
            // Load blacklist analytics
            await this.loadBlacklistAnalytics();
            
            // Start real-time monitoring
            this.startBlacklistMonitoring();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Blacklist Manager initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Blacklist Manager:', error);
            this.showAdminNotification('Failed to initialize Blacklist Manager', 'error');
            return false;
        }
    }

    /**
     * Load Blacklist Data from Database
     */
    async loadBlacklistData() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            console.log('📊 Loading blacklist data from database...');

            // Load all active blacklist entries
            const { data: blacklistItems, error } = await supabase
                .from('token_blacklist')
                .select('*')
                .eq('is_active', true)
                .order('added_at', { ascending: false });

            if (error) {
                throw error;
            }

            // Categorize blacklist items
            this.categorizeBlacklistItems(blacklistItems || []);
            
            // Update analytics overview
            this.updateAnalyticsOverview(blacklistItems || []);
            
            console.log(`✅ Loaded ${blacklistItems?.length || 0} active blacklist items`);
            
        } catch (error) {
            console.error('Error loading blacklist data:', error);
            throw error;
        }
    }

    /**
     * Categorize Blacklist Items from Database
     */
    categorizeBlacklistItems(items) {
        // Reset arrays
        this.adminState.blacklistState.manual = [];
        this.adminState.blacklistState.automatic = [];
        this.adminState.blacklistState.community = [];
        this.adminState.blacklistState.appeals = [];

        // Categorize items
        items.forEach(item => {
            const category = item.category;
            const blacklistItem = {
                id: item.id,
                tokenAddress: item.token_address,
                tokenSymbol: item.token_symbol,
                tokenName: item.token_name,
                category: category,
                reason: item.reason,
                evidence: item.evidence,
                addedBy: item.added_by,
                addedAt: item.added_at,
                severity: item.severity,
                confidence: item.confidence,
                detectionAlgorithm: item.detection_algorithm,
                appeal: item.appeal,
                isActive: item.is_active
            };

            switch (category) {
                case this.blacklistCategories.MANUAL:
                    this.adminState.blacklistState.manual.push(blacklistItem);
                    break;
                case this.blacklistCategories.AUTOMATIC:
                    this.adminState.blacklistState.automatic.push(blacklistItem);
                    break;
                case this.blacklistCategories.COMMUNITY:
                    this.adminState.blacklistState.community.push(blacklistItem);
                    break;
                default:
                    // Check if it has an appeal
                    if (item.appeal) {
                        this.adminState.blacklistState.appeals.push(blacklistItem);
                    } else {
                        this.adminState.blacklistState.manual.push(blacklistItem);
                    }
            }
        });

        // Update category counts
        this.adminState.blacklistState.categories = {
            manual: this.adminState.blacklistState.manual.length,
            automatic: this.adminState.blacklistState.automatic.length,
            community: this.adminState.blacklistState.community.length,
            appeals: this.adminState.blacklistState.appeals.length
        };
    }

    /**
     * Update Analytics Overview from Live Data
     */
    updateAnalyticsOverview(items) {
        const total = items.length;
        
        this.analyticsState.overview = {
            totalBlacklisted: total,
            autoDetected: items.filter(i => i.category === 'automatic').length,
            manuallyAdded: items.filter(i => i.category === 'manual').length,
            communityReported: items.filter(i => i.category === 'community').length,
            activeAppeals: items.filter(i => i.appeal && i.appeal.status === 'pending').length,
            detectionAccuracy: this.calculateDetectionAccuracy(items),
            recentActivity: items.slice(0, 10) // Last 10 items
        };

        // Update category percentages
        Object.keys(this.analyticsState.categories).forEach(category => {
            const count = items.filter(i => i.category === category).length;
            this.analyticsState.categories[category] = {
                count: count,
                percentage: total > 0 ? (count / total) * 100 : 0
            };
        });

        // Update severity distribution
        this.analyticsState.severity = {
            critical: items.filter(i => i.severity === 'critical').length,
            high: items.filter(i => i.severity === 'high').length,
            medium: items.filter(i => i.severity === 'medium').length,
            low: items.filter(i => i.severity === 'low').length
        };

        // Calculate top reasons
        this.calculateTopReasons(items);

        // Update admin state statistics
        this.adminState.blacklistState.statistics = {
            totalBlacklisted: this.analyticsState.overview.totalBlacklisted,
            autoDetected: this.analyticsState.overview.autoDetected,
            detectionAccuracy: this.analyticsState.overview.detectionAccuracy,
            appealsPending: this.analyticsState.overview.activeAppeals
        };
    }

    /**
     * Calculate Detection Accuracy from Live Data
     */
    calculateDetectionAccuracy(items) {
        const autoDetected = items.filter(i => i.category === 'automatic');
        if (autoDetected.length === 0) return 0;

        // Calculate accuracy based on confidence scores and appeal success
        const totalConfidence = autoDetected.reduce((sum, item) => {
            return sum + (item.confidence || 0.5);
        }, 0);

        const avgConfidence = totalConfidence / autoDetected.length;
        
        // Adjust for successful appeals (lower accuracy)
        const successfulAppeals = autoDetected.filter(item => 
            item.appeal && item.appeal.status === 'approved'
        ).length;

        const appealAdjustment = successfulAppeals > 0 ? 
            (successfulAppeals / autoDetected.length) * 10 : 0;

        return Math.max(0, Math.min(100, (avgConfidence * 100) - appealAdjustment));
    }

    /**
     * Calculate Top Blacklist Reasons
     */
    calculateTopReasons(items) {
        const reasonCounts = {};
        
        items.forEach(item => {
            const reason = item.reason || 'Unknown';
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });

        this.analyticsState.topReasons = Object.entries(reasonCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([reason, count]) => ({ reason, count }));
    }

    /**
     * Load Blacklist Analytics
     */
    async loadBlacklistAnalytics() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            console.log('📈 Loading blacklist analytics...');

            // Load historical blacklist data for timeline
            const { data: timelineData, error: timelineError } = await supabase
                .from('token_blacklist')
                .select('added_at, category, severity')
                .gte('added_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
                .order('added_at', { ascending: true });

            if (!timelineError && timelineData) {
                this.processTimelineData(timelineData);
            }

            // Load whitelist candidates
            await this.loadWhitelistCandidates();

            console.log('✅ Blacklist analytics loaded');
            
        } catch (error) {
            console.error('Error loading blacklist analytics:', error);
        }
    }

    /**
     * Process Timeline Data for Analytics
     */
    processTimelineData(data) {
        // Group by day
        const dailyData = {};
        
        data.forEach(item => {
            const date = new Date(item.added_at).toDateString();
            if (!dailyData[date]) {
                dailyData[date] = { date, manual: 0, automatic: 0, community: 0, total: 0 };
            }
            dailyData[date][item.category]++;
            dailyData[date].total++;
        });

        this.analyticsState.timeline = Object.values(dailyData);
    }

    /**
     * Load Whitelist Candidates
     */
    async loadWhitelistCandidates() {
        try {
            const supabase = this.getSupabase();
            
            // Get tokens that are good candidates for whitelisting
            // (automatic detections with lower confidence or older community reports)
            const { data: candidates, error } = await supabase
                .from('token_blacklist')
                .select('*')
                .eq('is_active', true)
                .or('category.eq.automatic,category.eq.community')
                .lt('confidence', 0.8) // Lower confidence automatic detections
                .order('added_at', { ascending: true });

            if (!error && candidates) {
                this.analyticsState.whitelistCandidates = candidates.map(item => ({
                    id: item.id,
                    tokenAddress: item.token_address,
                    tokenSymbol: item.token_symbol,
                    tokenName: item.token_name,
                    category: item.category,
                    reason: item.reason,
                    confidence: item.confidence,
                    addedAt: item.added_at,
                    severity: item.severity,
                    daysSinceAdded: Math.floor((Date.now() - new Date(item.added_at)) / (1000 * 60 * 60 * 24))
                }));
            }

            console.log(`✅ Loaded ${this.analyticsState.whitelistCandidates.length} whitelist candidates`);
            
        } catch (error) {
            console.error('Error loading whitelist candidates:', error);
        }
    }

    /**
     * Start Real-time Blacklist Monitoring
     */
    startBlacklistMonitoring() {
        try {
            // Monitor blacklist changes every 2 minutes
            this.detectionInterval = setInterval(async () => {
                try {
                    await this.refreshBlacklistData();
                } catch (error) {
                    console.error('Blacklist monitoring error:', error);
                }
            }, 2 * 60 * 1000);

            console.log('✅ Blacklist monitoring started');
            
        } catch (error) {
            console.error('Failed to start blacklist monitoring:', error);
        }
    }

    /**
     * Refresh Blacklist Data
     */
    async refreshBlacklistData() {
        try {
            console.log('🔄 Refreshing blacklist data...');
            await this.loadBlacklistData();
            await this.loadBlacklistAnalytics();
            this.updateBlacklistDisplay();
            console.log('✅ Blacklist data refreshed');
            
        } catch (error) {
            console.error('Error refreshing blacklist data:', error);
        }
    }

    // ===== WHITELIST FUNCTIONALITY =====

    /**
     * Whitelist Token - Remove from blacklist and add to approval queue
     */
    async whitelistToken(blacklistId, reason = null) {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            // Find the blacklist item
            const allItems = [
                ...this.adminState.blacklistState.manual,
                ...this.adminState.blacklistState.automatic,
                ...this.adminState.blacklistState.community,
                ...this.adminState.blacklistState.appeals
            ];
            
            const blacklistItem = allItems.find(item => item.id == blacklistId);
            if (!blacklistItem) {
                throw new Error('Blacklist item not found');
            }

            const adminWallet = sessionStorage.getItem('adminWallet') || 'admin';
            const whitelistReason = reason || prompt(`Enter whitelist reason for ${blacklistItem.tokenSymbol}:`);
            
            if (!whitelistReason || whitelistReason.trim() === '') {
                return; // User cancelled
            }

            if (!confirm(`🔄 Whitelist token ${blacklistItem.tokenSymbol}? This will remove it from blacklist and make it available for approval.`)) {
                return;
            }

            console.log(`🔄 Whitelisting token: ${blacklistItem.tokenSymbol}`);
            
            const now = new Date().toISOString();

            // Update blacklist entry (set is_active = false and add appeal info)
            const { error: updateError } = await supabase
                .from('token_blacklist')
                .update({
                    is_active: false,
                    appeal: {
                        status: 'approved',
                        approved_by: adminWallet,
                        approved_at: now,
                        reason: whitelistReason.trim(),
                        type: 'admin_whitelist'
                    },
                    updated_at: now
                })
                .eq('id', blacklistItem.id);

            if (updateError) {
                throw updateError;
            }

            // Log admin action
            await this.logAdminAction('token_whitelist', {
                action: 'whitelist_token',
                token_address: blacklistItem.tokenAddress,
                token_symbol: blacklistItem.tokenSymbol,
                details: {
                    original_blacklist_reason: blacklistItem.reason,
                    original_category: blacklistItem.category,
                    blacklist_id: blacklistItem.id,
                    whitelist_reason: whitelistReason.trim(),
                    original_severity: blacklistItem.severity
                }
            });

            // Refresh data
            await this.refreshBlacklistData();
            
            this.showAdminNotification(`Token ${blacklistItem.tokenSymbol} whitelisted successfully`, 'success');
            
            console.log(`✅ Token ${blacklistItem.tokenSymbol} whitelisted successfully`);
            
        } catch (error) {
            console.error('Error whitelisting token:', error);
            this.showAdminNotification(`Failed to whitelist token: ${error.message}`, 'error');
        }
    }

    /**
     * Bulk Whitelist Selected Tokens
     */
    async bulkWhitelist() {
        try {
            const selectedItems = Array.from(this.selectedBlacklistItems);
            if (selectedItems.length === 0) {
                this.showAdminNotification('No tokens selected for whitelisting', 'warning');
                return;
            }

            const reason = prompt(`Enter whitelist reason for ${selectedItems.length} selected tokens:`);
            if (!reason || reason.trim() === '') {
                return;
            }

            if (!confirm(`🔄 Whitelist ${selectedItems.length} selected tokens? They will be removed from blacklist.`)) {
                return;
            }

            console.log(`🔄 Starting bulk whitelist of ${selectedItems.length} tokens...`);
            
            let successCount = 0;
            let errorCount = 0;

            for (const itemId of selectedItems) {
                try {
                    await this.whitelistToken(itemId, reason);
                    successCount++;
                    
                    // Small delay to prevent overwhelming the database
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`Failed to whitelist item ${itemId}:`, error);
                    errorCount++;
                }
            }

            // Clear selection
            this.selectedBlacklistItems.clear();

            // Show summary notification
            if (errorCount === 0) {
                this.showAdminNotification(`✅ Successfully whitelisted ${successCount} tokens`, 'success');
            } else {
                this.showAdminNotification(`⚠️ Whitelisted ${successCount}, failed ${errorCount} tokens`, 'warning');
            }

            // Refresh display
            await this.refreshBlacklistData();
            this.updateBlacklistDisplay();
            
        } catch (error) {
            console.error('Error in bulk whitelist:', error);
            this.showAdminNotification('Bulk whitelist operation failed', 'error');
        }
    }

    /**
     * Add Token to Blacklist
     */
    async addToBlacklist(tokenAddress, tokenSymbol, tokenName, reason, category = 'manual', severity = 'medium') {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            const adminWallet = sessionStorage.getItem('adminWallet') || 'admin';
            const now = new Date().toISOString();

            const blacklistData = {
                token_address: tokenAddress,
                token_symbol: tokenSymbol || 'UNKNOWN',
                token_name: tokenName || 'Manual Addition',
                category: category,
                reason: reason.trim(),
                severity: severity,
                added_by: adminWallet,
                added_at: now,
                is_active: true,
                detection_algorithm: category === 'manual' ? null : 'manual_review',
                confidence: category === 'manual' ? null : 1.0,
                evidence: null,
                appeal: null,
                created_at: now
            };

            const { data, error } = await supabase
                .from('token_blacklist')
                .insert(blacklistData)
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Log admin action
            await this.logAdminAction('token_blacklist_add', {
                action: 'add_to_blacklist',
                token_address: tokenAddress,
                token_symbol: tokenSymbol,
                details: {
                    reason: reason.trim(),
                    category: category,
                    severity: severity,
                    blacklist_id: data.id
                }
            });

            this.showAdminNotification(`Token ${tokenSymbol} added to blacklist`, 'success');
            
            // Refresh data
            await this.refreshBlacklistData();
            
        } catch (error) {
            console.error('Error adding to blacklist:', error);
            this.showAdminNotification(`Failed to add token to blacklist: ${error.message}`, 'error');
        }
    }

    /**
     * Remove from Blacklist (Deactivate)
     */
    async removeFromBlacklist(blacklistId) {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            const { error } = await supabase
                .from('token_blacklist')
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', blacklistId);

            if (error) {
                throw error;
            }

            this.showAdminNotification('Token removed from blacklist', 'success');
            await this.refreshBlacklistData();
            
        } catch (error) {
            console.error('Error removing from blacklist:', error);
            this.showAdminNotification(`Failed to remove from blacklist: ${error.message}`, 'error');
        }
    }

    // ===== ANALYTICS FUNCTIONS =====

    /**
     * View Blacklist Analytics
     */
    async viewBlacklistAnalytics() {
        try {
            this.showBlacklistAnalyticsModal();
            
        } catch (error) {
            console.error('Error viewing blacklist analytics:', error);
            this.showAdminNotification('Failed to load blacklist analytics', 'error');
        }
    }

    /**
     * Show Blacklist Analytics Modal
     */
    showBlacklistAnalyticsModal() {
        const modalHtml = `
            <div class="modal" id="blacklist-analytics-modal">
                <div class="modal-content" style="max-width: 1200px;">
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                    <h3>📊 Blacklist Analytics Dashboard</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0;">
                        <div class="metric-card">
                            <h4>Total Blacklisted</h4>
                            <p class="metric-value">${this.analyticsState.overview.totalBlacklisted}</p>
                        </div>
                        <div class="metric-card">
                            <h4>Auto-Detected</h4>
                            <p class="metric-value">${this.analyticsState.overview.autoDetected}</p>
                        </div>
                        <div class="metric-card">
                            <h4>Detection Accuracy</h4>
                            <p class="metric-value">${this.analyticsState.overview.detectionAccuracy.toFixed(1)}%</p>
                        </div>
                        <div class="metric-card">
                            <h4>Active Appeals</h4>
                            <p class="metric-value">${this.analyticsState.overview.activeAppeals}</p>
                        </div>
                        <div class="metric-card">
                            <h4>Whitelist Candidates</h4>
                            <p class="metric-value">${this.analyticsState.whitelistCandidates.length}</p>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 2rem 0;">
                        <div>
                            <h4>Category Distribution</h4>
                            <div style="margin: 1rem 0;">
                                ${Object.entries(this.analyticsState.categories).map(([category, data]) => `
                                    <div style="display: flex; justify-content: space-between; margin: 0.5rem 0;">
                                        <span>${category.charAt(0).toUpperCase() + category.slice(1)}:</span>
                                        <span>${data.count} (${data.percentage.toFixed(1)}%)</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div>
                            <h4>Severity Distribution</h4>
                            <div style="margin: 1rem 0;">
                                ${Object.entries(this.analyticsState.severity).map(([severity, count]) => `
                                    <div style="display: flex; justify-content: space-between; margin: 0.5rem 0;">
                                        <span class="status-badge ${severity}">${severity.charAt(0).toUpperCase() + severity.slice(1)}:</span>
                                        <span>${count}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin: 2rem 0;">
                        <h4>🔄 Whitelist Candidates</h4>
                        <p>Tokens that could potentially be removed from blacklist:</p>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${this.analyticsState.whitelistCandidates.length === 0 ? 
                                '<p>No whitelist candidates found.</p>' :
                                `<table class="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Token</th>
                                            <th>Category</th>
                                            <th>Confidence</th>
                                            <th>Days Since Added</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.analyticsState.whitelistCandidates.slice(0, 10).map(candidate => `
                                            <tr>
                                                <td>
                                                    <div><strong>${candidate.tokenSymbol}</strong></div>
                                                    <div style="font-size: 0.875rem; color: #94a3b8;">${candidate.tokenName}</div>
                                                </td>
                                                <td><span class="status-badge ${candidate.category}">${candidate.category}</span></td>
                                                <td>${candidate.confidence ? (candidate.confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
                                                <td>${candidate.daysSinceAdded} days</td>
                                                <td>
                                                    <button class="btn btn-small btn-success" onclick="window.BlacklistManager.instance.whitelistToken('${candidate.id}')">
                                                        🔄 Whitelist
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>`
                            }
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button class="btn btn-primary" onclick="window.BlacklistManager.instance.exportBlacklistAnalytics()">
                            📤 Export Analytics
                        </button>
                        <button class="btn btn-secondary" onclick="window.BlacklistManager.instance.refreshBlacklistData()">
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
     * Export Blacklist Analytics
     */
    async exportBlacklistAnalytics() {
        try {
            console.log('📤 Exporting blacklist analytics...');
            this.showAdminNotification('Preparing analytics export...', 'info');
            
            const exportData = {
                exportDate: new Date().toISOString(),
                overview: this.analyticsState.overview,
                categories: this.analyticsState.categories,
                severity: this.analyticsState.severity,
                timeline: this.analyticsState.timeline,
                topReasons: this.analyticsState.topReasons,
                whitelistCandidates: this.analyticsState.whitelistCandidates,
                detailedData: {
                    manual: this.adminState.blacklistState.manual,
                    automatic: this.adminState.blacklistState.automatic,
                    community: this.adminState.blacklistState.community,
                    appeals: this.adminState.blacklistState.appeals
                }
            };
            
            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tokenwars-blacklist-analytics-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showAdminNotification('Analytics exported successfully', 'success');
            
            // Log admin action
            await this.logAdminAction('analytics_export', {
                action: 'export_blacklist_analytics',
                export_type: 'full_blacklist_analytics',
                total_items: this.analyticsState.overview.totalBlacklisted,
                admin_wallet: sessionStorage.getItem('adminWallet') || 'admin'
            });
            
        } catch (error) {
            console.error('Error exporting analytics:', error);
            this.showAdminNotification('Export failed', 'error');
        }
    }

    /**
     * Scan for New Threats (Manual Trigger)
     */
    async scanForThreats() {
        try {
            console.log('🔍 Triggering manual threat scan...');
            this.showAdminNotification('Manual threat scan initiated...', 'info');
            
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            // Create background job for threat scanning
            const { data: job, error } = await supabase
                .from('background_jobs')
                .insert({
                    job_type: 'THREAT_SCAN',
                    job_data: {
                        scan_type: 'MANUAL_FULL_SCAN',
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

            this.showAdminNotification('Threat scan job queued successfully', 'success');
            
            // Log admin action
            await this.logAdminAction('threat_scan', {
                action: 'manual_threat_scan',
                job_id: job.id,
                admin_wallet: sessionStorage.getItem('adminWallet') || 'admin'
            });
            
        } catch (error) {
            console.error('Error triggering threat scan:', error);
            this.showAdminNotification('Failed to initiate threat scan: ' + error.message, 'error');
        }
    }

    /**
     * Update Blacklist Display
     */
    updateBlacklistDisplay() {
        // Update statistics if on blacklist section
        if (window.updateBlacklistStatistics) {
            window.updateBlacklistStatistics();
        }
        
        // Re-render categories if on blacklist section
        if (window.renderBlacklistCategories) {
            window.renderBlacklistCategories();
        }

        // Update admin state
        this.adminState.blacklistState.statistics = {
            totalBlacklisted: this.analyticsState.overview.totalBlacklisted,
            autoDetected: this.analyticsState.overview.autoDetected,
            detectionAccuracy: this.analyticsState.overview.detectionAccuracy,
            appealsPending: this.analyticsState.overview.activeAppeals
        };
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
        // Bulk operations and analytics
        document.addEventListener('click', (e) => {
            if (e.target.onclick?.toString().includes('bulkWhitelist')) {
                this.bulkWhitelist();
            } else if (e.target.onclick?.toString().includes('viewBlacklistAnalytics')) {
                this.viewBlacklistAnalytics();
            } else if (e.target.onclick?.toString().includes('exportBlacklistAnalytics')) {
                this.exportBlacklistAnalytics();
            } else if (e.target.onclick?.toString().includes('scanForThreats')) {
                this.scanForThreats();
            } else if (e.target.onclick?.toString().includes('refreshBlacklistData')) {
                this.refreshBlacklistData();
            }
        });

        // Selection tracking
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('blacklist-checkbox')) {
                this.updateSelectionCount();
            }
        });

        console.log('✅ Blacklist manager event listeners set up');
    }

    /**
     * Update Selection Count
     */
    updateSelectionCount() {
        this.selectedBlacklistItems.clear();
        
        document.querySelectorAll('.blacklist-checkbox:checked').forEach(checkbox => {
            this.selectedBlacklistItems.add(checkbox.dataset.itemId);
        });
        
        const selectedCountElement = document.getElementById('blacklist-selected-count');
        if (selectedCountElement) {
            selectedCountElement.textContent = this.selectedBlacklistItems.size;
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
     * Format Date
     */
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString();
    }

    /**
     * Format Relative Time
     */
    formatRelativeTime(dateString) {
        if (!dateString) return 'Unknown';
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
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        
        console.log('🧹 Blacklist Manager cleaned up');
    }
}

// Create singleton instance
BlacklistManager.instance = null;

// Export for global use
window.BlacklistManager = BlacklistManager;

console.log('✅ BlacklistManager component loaded - LIVE DATA ONLY');
console.log('🚫 Features:');
console.log('   📊 Live blacklist analytics from database');
console.log('   🔄 Whitelist functionality (blacklist → approval queue)');
console.log('   📈 Detection accuracy and category analytics');
console.log('   🔍 Threat scanning and background job integration');
console.log('   📤 Analytics export and audit logging');
console.log('   ⚡ Real-time monitoring and refresh capabilities');
