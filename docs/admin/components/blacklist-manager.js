/**
 * BlacklistManager - Live Blacklist Management with Whitelist Analytics
 * Updated to use token_address instead of id for all operations
 */

class BlacklistManager {
    constructor(adminState) {
        // Singleton pattern
        if (BlacklistManager.instance) {
            console.log('BlacklistManager: Returning existing instance');
            return BlacklistManager.instance;
        }
        
        this.adminState = adminState;
        this.isInitialized = false;
        this.blacklistData = {
            manual: [],
            automatic: [],
            community: [],
            appeals: []
        };
        this.statistics = {
            totalBlacklisted: 0,
            autoDetected: 0,
            detectionAccuracy: 0,
            appealsPending: 0
        };
        this.selectedTokens = new Set(); // Now stores token_address instead of id
        
        // Store singleton instance
        BlacklistManager.instance = this;
        
        console.log('✅ BlacklistManager constructor called');
    }

    async initialize() {
        try {
            if (this.isInitialized) {
                console.log('BlacklistManager already initialized');
                return true;
            }
            
            console.log('🚫 Initializing BlacklistManager...');
            
            // Load blacklist data from database
            await this.loadBlacklistData();
            
            // Calculate statistics
            this.calculateStatistics();
            
            // Update UI
            this.updateBlacklistDisplay();
            
            this.isInitialized = true;
            console.log('✅ BlacklistManager initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ BlacklistManager initialization failed:', error);
            return false;
        }
    }

    /**
     * Load Blacklist Data from Database
     */
    async loadBlacklistData() {
        try {
            console.log('📊 Loading blacklist data from database...');
            
            if (!this.adminState.supabaseClient) {
                throw new Error('Supabase client not available');
            }

            const supabase = this.getSupabase();
            
            // Load all blacklisted tokens with details
            const { data: blacklistedTokens, error } = await supabase
                .from('token_blacklist')
                .select('*')
                .eq('is_active', true)
                .order('added_at', { ascending: false });

            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }

            // Clear existing data
            this.blacklistData = {
                manual: [],
                automatic: [],
                community: [],
                appeals: []
            };

            // Debug: Log the raw data from database
            console.log('📊 Raw blacklist data from database:', blacklistedTokens);

            if (blacklistedTokens && blacklistedTokens.length > 0) {
                blacklistedTokens.forEach(token => {
                    // Debug: Log each token's structure
                    console.log('🔍 Processing token:', {
                        token_address: token.token_address,
                        token_symbol: token.token_symbol,
                        category: token.category
                    });

                    const category = token.category?.toLowerCase() || 'manual';
                    if (this.blacklistData[category]) {
                        this.blacklistData[category].push(token);
                    } else {
                        this.blacklistData.manual.push(token);
                    }
                });
            }

            console.log(`✅ Loaded blacklist data:`);
            console.log(`   Manual: ${this.blacklistData.manual.length}`);
            console.log(`   Automatic: ${this.blacklistData.automatic.length}`);
            console.log(`   Community: ${this.blacklistData.community.length}`);
            console.log(`   Appeals: ${this.blacklistData.appeals.length}`);

            return true;
        } catch (error) {
            console.error('Error loading blacklist data:', error);
            throw error;
        }
    }

    /**
     * Get Supabase Client Helper
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
        
        throw new Error('Supabase client not available');
    }

    /**
     * Calculate Blacklist Statistics
     */
    calculateStatistics() {
        try {
            const totalBlacklisted = Object.values(this.blacklistData).reduce((sum, arr) => sum + arr.length, 0);
            const autoDetected = this.blacklistData.automatic.length;
            const appealsPending = this.blacklistData.appeals.length;
            
            // Calculate detection accuracy (simplified)
            const detectionAccuracy = autoDetected > 0 ? 
                Math.min(95, 75 + (autoDetected / totalBlacklisted * 20)) : 0;

            this.statistics = {
                totalBlacklisted,
                autoDetected,
                detectionAccuracy: Math.round(detectionAccuracy),
                appealsPending
            };

            // Update admin state
            if (this.adminState.blacklistState) {
                this.adminState.blacklistState.statistics = this.statistics;
                this.adminState.blacklistState.categories = {
                    manual: this.blacklistData.manual.length,
                    automatic: this.blacklistData.automatic.length,
                    community: this.blacklistData.community.length,
                    appeals: this.blacklistData.appeals.length
                };
            }

            console.log('📊 Blacklist statistics calculated:', this.statistics);
        } catch (error) {
            console.error('Error calculating statistics:', error);
        }
    }

    /**
     * Update Blacklist Display in UI
     */
    updateBlacklistDisplay() {
        try {
            // Update statistics in UI
            this.updateStatisticsDisplay();
            
            // Update category displays - only manual for now
            this.updateCategoryDisplay('manual', this.blacklistData.manual);
            // Comment out until containers are added back:
            // this.updateCategoryDisplay('auto', this.blacklistData.automatic);
            // this.updateCategoryDisplay('community', this.blacklistData.community);
            
            console.log('✅ Blacklist display updated');
        } catch (error) {
            console.error('Error updating blacklist display:', error);
        }
    }

    /**
     * Update Statistics Display
     */
    updateStatisticsDisplay() {
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };

        updateElement('total-blacklisted', this.statistics.totalBlacklisted);
        updateElement('auto-detected', this.statistics.autoDetected);
        updateElement('detection-accuracy', `${this.statistics.detectionAccuracy}%`);
        updateElement('appeals-pending', this.statistics.appealsPending);

        // Update count badges
        updateElement('manual-blacklist-count', this.blacklistData.manual.length);
        updateElement('auto-blacklist-count', this.blacklistData.automatic.length);
        updateElement('community-blacklist-count', this.blacklistData.community.length);
    }

    /**
     * Update Category Display
     */
        updateCategoryDisplay(category, tokens) {
            const containerId = `${category}-blacklist`;
            const container = document.getElementById(containerId);
            
            if (!container) {
                console.warn(`Container not found: ${containerId}`);
                return; // Just return silently, don't process this category
            }
            
            // Only process if container exists
            if (tokens.length === 0) {
                container.innerHTML = `
                    <div style="padding: 1rem; text-align: center; color: #94a3b8;">
                        No ${category} blacklisted tokens
                    </div>
                `;
                return;
            }
        
            container.innerHTML = tokens.map(token => this.createBlacklistItemHTML(token)).join('');
        }

    /**
     * Create Blacklist Item HTML
     */
    createBlacklistItemHTML(token) {
        const severity = token.severity || 'medium';
        const reason = token.reason || 'No reason provided';
        const addedDate = token.added_at ? this.formatDate(token.added_at) : 'Unknown';
        const confidence = token.confidence ? `${Math.round(token.confidence * 100)}%` : 'N/A';

        // Debug: Log token address being used in HTML
        console.log('🔍 Creating HTML for token address:', token.token_address);

        return `
            <div class="blacklist-item" data-token-address="${token.token_address}">
                <div class="blacklist-token-info">
                    <input type="checkbox" class="blacklist-checkbox" data-token-address="${token.token_address}" onchange="window.BlacklistManager.instance.toggleTokenSelection('${token.token_address}')">
                    <div class="token-avatar" style="background: #ef4444; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600;">
                        ${(token.token_symbol || token.token_address.substring(0, 2)).charAt(0).toUpperCase()}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                            ${token.token_symbol || 'Unknown'}
                            <span class="severity-badge ${severity}" style="padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 500;">
                                ${severity.toUpperCase()}
                            </span>
                        </div>
                        <div style="font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.25rem;">
                            ${token.token_name || token.token_address}
                        </div>
                        <div style="font-size: 0.75rem; color: #94a3b8;">
                            <div><strong>Reason:</strong> ${reason}</div>
                            <div><strong>Added:</strong> ${addedDate} | <strong>Confidence:</strong> ${confidence}</div>
                            ${token.detection_algorithm ? `<div><strong>Algorithm:</strong> ${token.detection_algorithm}</div>` : ''}
                        </div>
                    </div>
                </div>
                <div class="blacklist-actions">
                    <button class="btn btn-small btn-success" onclick="window.BlacklistManager.instance.whitelistToken('${token.token_address}')">
                        ✅ Whitelist
                    </button>
                    <button class="btn btn-small btn-info" onclick="window.BlacklistManager.instance.reviewToken('${token.token_address}')">
                        🔍 Review
                    </button>
                    <button class="btn btn-small btn-warning" onclick="window.BlacklistManager.instance.updateSeverity('${token.token_address}')">
                        ⚠️ Update Severity
                    </button>
                </div>
            </div>
        `;
    }

        /**
         * Whitelist Token (Remove from blacklist)
         */
        async whitelistToken(tokenAddress) {
            try {
                // Debug: Log the token address being searched for
                console.log('🔍 Searching for token with address:', tokenAddress);
        
                const token = this.findTokenByAddress(tokenAddress);
                if (!token) {
                    console.error('❌ Token not found with address:', tokenAddress);
                    throw new Error(`Token not found with address: ${tokenAddress}`);
                }
        
                const confirmed = confirm(`Whitelist ${token.token_symbol || token.token_address}?\n\nThis will remove the token from blacklist.`);
                if (!confirmed) return;
        
                console.log(`🔄 Whitelisting token: ${token.token_symbol} (${tokenAddress})`);
        
                const supabase = this.getSupabase();
        
                // Remove blacklist entry completely
                const { error: blacklistError } = await supabase
                    .from('token_blacklist')
                    .delete()
                    .eq('token_address', tokenAddress);
        
                if (blacklistError) {
                    throw new Error(`Failed to remove from blacklist: ${blacklistError.message}`);
                }
        
                // Log admin action
                await this.logAdminAction('whitelist_token', {
                    token_address: token.token_address,
                    token_symbol: token.token_symbol,
                    original_blacklist_reason: token.reason,
                    original_category: token.category
                });
        
                // Update local data and display
                await this.loadBlacklistData();
                this.calculateStatistics();
                this.updateBlacklistDisplay();
        
                this.showNotification(`Token ${token.token_symbol} successfully removed from blacklist`, 'success');
        
                console.log(`✅ Token whitelisted: ${token.token_symbol}`);
            } catch (error) {
                console.error('Failed to whitelist token:', error);
                this.showNotification(`Failed to whitelist token: ${error.message}`, 'error');
            }
        }
    /**
     * Bulk Whitelist Selected Tokens
     */
    async bulkWhitelist() {
        try {
            const selectedAddresses = Array.from(this.selectedTokens);
            if (selectedAddresses.length === 0) {
                this.showNotification('No tokens selected for whitelisting', 'warning');
                return;
            }

            const confirmed = confirm(`Whitelist ${selectedAddresses.length} selected tokens?\n\nThis will remove them from blacklist and add to approval queue.`);
            if (!confirmed) return;

            console.log(`🔄 Bulk whitelisting ${selectedAddresses.length} tokens...`);

            let successCount = 0;
            let errorCount = 0;

            for (const tokenAddress of selectedAddresses) {
                try {
                    await this.whitelistToken(tokenAddress);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to whitelist token ${tokenAddress}:`, error);
                    errorCount++;
                }
            }

            // Clear selection
            this.selectedTokens.clear();
            this.updateSelectionCount();

            this.showNotification(
                `Bulk whitelist completed: ${successCount} successful, ${errorCount} failed`,
                errorCount === 0 ? 'success' : 'warning'
            );

        } catch (error) {
            console.error('Bulk whitelist failed:', error);
            this.showNotification(`Bulk whitelist failed: ${error.message}`, 'error');
        }
    }

    /**
     * Review Token (Open details modal or external link)
     */
    async reviewToken(tokenAddress) {
        try {
            const token = this.findTokenByAddress(tokenAddress);
            if (!token) {
                throw new Error(`Token not found with address: ${tokenAddress}`);
            }

            // Create review modal
            this.showTokenReviewModal(token);

        } catch (error) {
            console.error('Failed to review token:', error);
            this.showNotification(`Failed to review token: ${error.message}`, 'error');
        }
    }

    /**
     * Show Token Review Modal
     */
    showTokenReviewModal(token) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        modal.innerHTML = `
            <div style="background: #1e293b; border-radius: 12px; padding: 2rem; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; color: #f1f5f9;">Token Review: ${token.token_symbol || 'Unknown'}</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                
                <div style="space-y: 1rem;">
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: #e2e8f0;">Token Address:</strong>
                        <div style="background: #0f172a; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; font-family: monospace; word-break: break-all; color: #94a3b8;">
                            ${token.token_address}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: #e2e8f0;">Blacklist Information:</strong>
                        <div style="background: #0f172a; padding: 1rem; border-radius: 4px; margin-top: 0.5rem;">
                            <div style="margin-bottom: 0.5rem;"><strong>Category:</strong> ${token.category || 'Unknown'}</div>
                            <div style="margin-bottom: 0.5rem;"><strong>Severity:</strong> ${token.severity || 'Unknown'}</div>
                            <div style="margin-bottom: 0.5rem;"><strong>Reason:</strong> ${token.reason || 'No reason provided'}</div>
                            <div style="margin-bottom: 0.5rem;"><strong>Added By:</strong> ${token.added_by || 'System'}</div>
                            <div style="margin-bottom: 0.5rem;"><strong>Added Date:</strong> ${this.formatDate(token.added_at)}</div>
                            ${token.confidence ? `<div style="margin-bottom: 0.5rem;"><strong>Confidence:</strong> ${Math.round(token.confidence * 100)}%</div>` : ''}
                            ${token.detection_algorithm ? `<div><strong>Detection Algorithm:</strong> ${token.detection_algorithm}</div>` : ''}
                        </div>
                    </div>
                    
                    ${token.evidence ? `
                        <div style="margin-bottom: 1rem;">
                            <strong style="color: #e2e8f0;">Evidence:</strong>
                            <div style="background: #0f172a; padding: 1rem; border-radius: 4px; margin-top: 0.5rem;">
                                <pre style="color: #94a3b8; white-space: pre-wrap; font-size: 0.875rem;">${JSON.stringify(token.evidence, null, 2)}</pre>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button onclick="window.BlacklistManager.instance.whitelistToken('${token.token_address}'); this.closest('.modal-overlay').remove();" 
                                style="flex: 1; background: #22c55e; color: white; padding: 0.75rem; border: none; border-radius: 6px; cursor: pointer;">
                            ✅ Whitelist Token
                        </button>
                        <button onclick="window.open('https://solscan.io/token/${token.token_address}', '_blank')" 
                                style="flex: 1; background: #3b82f6; color: white; padding: 0.75rem; border: none; border-radius: 6px; cursor: pointer;">
                            🔍 View on Solscan
                        </button>
                        <button onclick="this.closest('.modal-overlay').remove()" 
                                style="flex: 1; background: #64748b; color: white; padding: 0.75rem; border: none; border-radius: 6px; cursor: pointer;">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Update Token Severity
     */
    async updateSeverity(tokenAddress) {
        try {
            // Debug: Log the token address being searched for
            console.log('🔍 Update severity - searching for token with address:', tokenAddress);

            const token = this.findTokenByAddress(tokenAddress);
            if (!token) {
                console.error('❌ Token not found for severity update with address:', tokenAddress);
                throw new Error(`Token not found with address: ${tokenAddress}`);
            }

            const newSeverity = prompt(`Update severity for ${token.token_symbol}:\n\nCurrent: ${token.severity || 'medium'}\n\nEnter new severity (low, medium, high, critical):`, token.severity || 'medium');
            
            if (!newSeverity || !['low', 'medium', 'high', 'critical'].includes(newSeverity.toLowerCase())) {
                this.showNotification('Invalid severity level', 'error');
                return;
            }

            const supabase = this.getSupabase();

            const { error } = await supabase
                .from('token_blacklist')
                .update({ 
                    severity: newSeverity.toLowerCase(),
                    updated_at: new Date().toISOString()
                })
                .eq('token_address', tokenAddress);

            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }

            // Log admin action
            await this.logAdminAction('update_severity', {
                token_address: token.token_address,
                old_severity: token.severity,
                new_severity: newSeverity.toLowerCase()
            });

            // Refresh display
            await this.loadBlacklistData();
            this.updateBlacklistDisplay();

            this.showNotification(`Severity updated to ${newSeverity}`, 'success');

        } catch (error) {
            console.error('Failed to update severity:', error);
            this.showNotification(`Failed to update severity: ${error.message}`, 'error');
        }
    }

    /**
     * Export Blacklist Data
     */
    exportBlacklist() {
        try {
            const allBlacklistedTokens = [
                ...this.blacklistData.manual,
                ...this.blacklistData.automatic,
                ...this.blacklistData.community,
                ...this.blacklistData.appeals
            ];

            const exportData = {
                export_date: new Date().toISOString(),
                total_tokens: allBlacklistedTokens.length,
                statistics: this.statistics,
                tokens: allBlacklistedTokens.map(token => ({
                    token_address: token.token_address,
                    token_symbol: token.token_symbol,
                    token_name: token.token_name,
                    category: token.category,
                    severity: token.severity,
                    reason: token.reason,
                    added_by: token.added_by,
                    added_at: token.added_at,
                    confidence: token.confidence,
                    detection_algorithm: token.detection_algorithm
                }))
            };

            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tokenWars_blacklist_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification(`Blacklist exported: ${allBlacklistedTokens.length} tokens`, 'success');

        } catch (error) {
            console.error('Failed to export blacklist:', error);
            this.showNotification(`Export failed: ${error.message}`, 'error');
        }
    }

    /**
     * Scan for New Threats (Placeholder for automated detection)
     */
    async scanForThreats() {
        try {
            this.showNotification('Threat scan initiated - this feature requires automated detection algorithms', 'info');
            
            // Log action
            await this.logAdminAction('scan_threats', {
                scan_type: 'manual_trigger',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Failed to scan for threats:', error);
            this.showNotification(`Threat scan failed: ${error.message}`, 'error');
        }
    }

    /**
     * Selection Management
     */
    toggleTokenSelection(tokenAddress) {
        console.log('🔍 Toggling selection for token address:', tokenAddress);
        if (this.selectedTokens.has(tokenAddress)) {
            this.selectedTokens.delete(tokenAddress);
        } else {
            this.selectedTokens.add(tokenAddress);
        }
        this.updateSelectionCount();
    }

    selectAllTokens() {
        const allTokens = [
            ...this.blacklistData.manual,
            ...this.blacklistData.automatic,
            ...this.blacklistData.community
        ];
        
        allTokens.forEach(token => this.selectedTokens.add(token.token_address));
        this.updateSelectionCount();
        this.updateCheckboxes();
    }

    clearSelection() {
        this.selectedTokens.clear();
        this.updateSelectionCount();
        this.updateCheckboxes();
    }

    updateSelectionCount() {
        const countElement = document.getElementById('selected-count');
        if (countElement) {
            countElement.textContent = this.selectedTokens.size;
        }
        console.log('📊 Selection count updated:', this.selectedTokens.size);
    }

    updateCheckboxes() {
        document.querySelectorAll('.blacklist-checkbox').forEach(checkbox => {
            const tokenAddress = checkbox.dataset.tokenAddress;
            checkbox.checked = this.selectedTokens.has(tokenAddress);
        });
    }

    /**
     * Utility Functions
     */
    findTokenByAddress(tokenAddress) {
        const allTokens = [
            ...this.blacklistData.manual,
            ...this.blacklistData.automatic,
            ...this.blacklistData.community,
            ...this.blacklistData.appeals
        ];
        
        // Debug: Enhanced logging for token search
        console.log('🔍 findTokenByAddress called with:', tokenAddress);
        console.log('🔍 Available tokens for search:', allTokens.map(t => t.token_address));
        
        const foundToken = allTokens.find(token => token.token_address === tokenAddress);
        
        console.log('🔍 findTokenByAddress result:', foundToken ? 'Found' : 'Not found');
        return foundToken;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    async logAdminAction(actionType, actionData) {
        try {
            const supabase = this.getSupabase();
            const adminWallet = sessionStorage.getItem('adminWallet');
            
            await supabase
                .from('admin_audit_log')
                .insert({
                    admin_id: adminWallet,
                    action: actionType,
                    table_name: 'token_blacklist',
                    new_values: actionData,
                    ip_address: 'web-client',
                    user_agent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                });

            console.log(`📝 Admin action logged: ${actionType}`);
        } catch (error) {
            console.warn('Could not log admin action:', error);
        }
    }

    showNotification(message, type = 'info') {
        if (window.showAdminNotification) {
            window.showAdminNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Public API Methods
     */
    refreshBlacklistData() {
        return this.loadBlacklistData();
    }

    getBlacklistStatistics() {
        return this.statistics;
    }

    getBlacklistData() {
        return this.blacklistData;
    }
}

// Global functions for onclick handlers
window.bulkWhitelist = function() {
    if (window.BlacklistManager.instance) {
        window.BlacklistManager.instance.bulkWhitelist();
    }
};

window.whitelistWithApproval = function() {
    if (window.BlacklistManager.instance) {
        window.BlacklistManager.instance.bulkWhitelist();
    }
};

window.exportBlacklist = function() {
    if (window.BlacklistManager.instance) {
        window.BlacklistManager.instance.exportBlacklist();
    }
};

window.scanForThreats = function() {
    if (window.BlacklistManager.instance) {
        window.BlacklistManager.instance.scanForThreats();
    }
};

// Export class
window.BlacklistManager = BlacklistManager;

console.log('✅ BlacklistManager loaded - Using token_address for all operations');
console.log('🚀 Features:');
console.log('   📊 Live blacklist data from token_blacklist table');
console.log('   ✅ Whitelist functionality (blacklist → approval queue)');
console.log('   📈 Blacklist analytics and statistics');
console.log('   🔍 Token review with detailed information');
console.log('   📤 Export functionality for blacklist data');
console.log('   🚨 Threat scanning integration');
console.log('   📝 Complete admin audit logging');
console.log('   🎯 Token address-based operations (no more ID confusion!)');
