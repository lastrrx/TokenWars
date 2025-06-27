/**
 * TokenApproval Component - LIVE DATA ONLY with Whitelist Integration
 * Manual approval workflow only - NO auto-approval functionality
 */

class TokenApproval {
    constructor(adminState) {
        this.adminState = adminState;
        this.isInitialized = false;
        this.approvalQueue = [];
        this.selectedTokens = new Set();
        this.updateInterval = null;
        this.whitelistQueue = [];
        
        // Manual approval states only - NO auto-approval
        this.approvalStates = {
            PENDING: 'pending',
            REVIEWING: 'reviewing',
            APPROVED: 'approved'
        };
        
        // Whitelist integration states
        this.whitelistStates = {
            PENDING_REVIEW: 'pending_review',
            APPROVED_FOR_WHITELIST: 'approved_for_whitelist',
            REJECTED_WHITELIST: 'rejected_whitelist'
        };
        
        console.log('TokenApproval: Component initialized - MANUAL ONLY with Whitelist');
    }

    /**
     * Initialize Token Approval Component
     */
    async initialize() {
        try {
            console.log('✅ Initializing Token Approval System - MANUAL ONLY...');
            
            // Load pending approvals from database
            await this.loadPendingApprovals();
            
            // Load whitelist queue
            await this.loadWhitelistQueue();
            
            // Start monitoring for new tokens
            this.startApprovalMonitoring();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Token Approval System initialized successfully - MANUAL WORKFLOW ONLY');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Token Approval System:', error);
            this.showAdminNotification('Failed to initialize Token Approval System', 'error');
            return false;
        }
    }

    /**
     * Load Pending Approvals - LIVE DATA ONLY
     */
    async loadPendingApprovals() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            console.log('📊 Loading pending approvals from database...');

            // Get all tokens from token_cache that are FRESH
            const { data: allTokens, error: tokenError } = await supabase
                .from('token_cache')
                .select('*')
                .eq('cache_status', 'FRESH')
                .order('market_cap_usd', { ascending: false });

            if (tokenError) {
                throw tokenError;
            }

            if (!allTokens || allTokens.length === 0) {
                console.log('No tokens found in cache for approval');
                this.approvalQueue = [];
                this.updateApprovalStatistics();
                return;
            }

            // Get approved tokens (all records in token_approvals are approved)
            const { data: approvedTokens, error: approvedError } = await supabase
                .from('token_approvals')
                .select('token_address');

            if (approvedError) {
                console.warn('Could not load approved tokens:', approvedError);
            }

            // Get blacklisted tokens
            const { data: blacklistedTokens, error: blacklistError } = await supabase
                .from('token_blacklist')
                .select('token_address')
                .eq('is_active', true);

            if (blacklistError) {
                console.warn('Could not load blacklisted tokens:', blacklistError);
            }

            // Create sets for quick lookup
            const approvedSet = new Set((approvedTokens || []).map(t => t.token_address));
            const blacklistedSet = new Set((blacklistedTokens || []).map(t => t.token_address));

            // Filter tokens that need approval
            this.approvalQueue = allTokens
                .filter(token => 
                    !approvedSet.has(token.token_address) && 
                    !blacklistedSet.has(token.token_address)
                )
                .map(token => ({
                    id: token.id,
                    tokenAddress: token.token_address,
                    symbol: token.symbol,
                    name: token.name,
                    logoURI: token.logo_uri,
                    marketCap: token.market_cap_usd,
                    price: token.current_price,
                    volume24h: token.volume_24h,
                    priceChange24h: token.price_change_24h,
                    priceChange1h: token.price_change_1h,
                    dataSource: token.data_source,
                    lastUpdated: token.last_updated,
                    submittedAt: token.cache_created_at,
                    status: this.approvalStates.PENDING,
                    riskScore: this.calculateRiskScore(token),
                    tags: this.generateTags(token)
                }));
            
            // Update statistics
            this.updateApprovalStatistics();
            
            console.log(`✅ Loaded ${this.approvalQueue.length} tokens pending approval`);
            console.log(`   📊 Approved tokens: ${approvedSet.size}`);
            console.log(`   🚫 Blacklisted tokens: ${blacklistedSet.size}`);
            
        } catch (error) {
            console.error('Error loading pending approvals:', error);
            this.showAdminNotification(`Failed to load pending approvals: ${error.message}`, 'error');
            this.approvalQueue = [];
            this.updateApprovalStatistics();
            throw error;
        }
    }

    /**
     * Load Whitelist Queue - NEW FEATURE
     */
    async loadWhitelistQueue() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            console.log('🔄 Loading whitelist queue from database...');

            // Get tokens that are candidates for whitelisting
            // These are blacklisted tokens that could potentially be moved back to approval queue
            const { data: whitelistCandidates, error } = await supabase
                .from('token_blacklist')
                .select('*')
                .eq('is_active', true)
                .in('category', ['automatic', 'community']) // Manual blacklists typically shouldn't be auto-whitelisted
                .order('added_at', { ascending: false });

            if (error) {
                console.warn('Could not load whitelist candidates:', error);
                this.whitelistQueue = [];
                return;
            }

            this.whitelistQueue = (whitelistCandidates || []).map(item => ({
                id: item.id,
                tokenAddress: item.token_address,
                symbol: item.token_symbol,
                name: item.token_name,
                category: item.category,
                reason: item.reason,
                addedAt: item.added_at,
                addedBy: item.added_by,
                severity: item.severity,
                confidence: item.confidence,
                evidence: item.evidence,
                appeal: item.appeal,
                status: this.whitelistStates.PENDING_REVIEW
            }));

            console.log(`✅ Loaded ${this.whitelistQueue.length} tokens in whitelist queue`);
            
        } catch (error) {
            console.error('Error loading whitelist queue:', error);
            this.whitelistQueue = [];
        }
    }

    /**
     * Calculate Risk Score for Token
     */
    calculateRiskScore(token) {
        let riskScore = 0;
        
        // Market cap risk
        if (token.market_cap_usd < 1000000) riskScore += 0.3;
        else if (token.market_cap_usd < 5000000) riskScore += 0.2;
        
        // Volume risk
        if (token.volume_24h < 10000) riskScore += 0.2;
        else if (token.volume_24h < 50000) riskScore += 0.1;
        
        // Price volatility risk
        if (Math.abs(token.price_change_24h || 0) > 50) riskScore += 0.3;
        else if (Math.abs(token.price_change_24h || 0) > 25) riskScore += 0.2;
        
        return Math.min(riskScore, 1.0);
    }

    /**
     * Generate Tags for Token
     */
    generateTags(token) {
        const tags = [];
        
        // Market cap based tags
        if (token.market_cap_usd > 1000000000) tags.push('large-cap');
        else if (token.market_cap_usd > 100000000) tags.push('mid-cap');
        else if (token.market_cap_usd > 10000000) tags.push('small-cap');
        else tags.push('micro-cap');
        
        // Volatility tags
        if (Math.abs(token.price_change_24h || 0) > 20) tags.push('volatile');
        if ((token.price_change_24h || 0) > 10) tags.push('trending-up');
        if ((token.price_change_24h || 0) < -10) tags.push('trending-down');
        
        // Source tags
        if (token.data_source) tags.push(token.data_source.toLowerCase());
        
        return tags;
    }

    /**
     * Start Approval Monitoring
     */
    startApprovalMonitoring() {
        // Check for new tokens every 60 seconds
        this.updateInterval = setInterval(async () => {
            try {
                await this.checkForNewTokens();
            } catch (error) {
                console.error('Approval monitoring error:', error);
            }
        }, 60000);

        console.log('✅ Approval monitoring started');
    }

    /**
     * Check for New Tokens
     */
    async checkForNewTokens() {
        try {
            const previousCount = this.approvalQueue.length;
            await this.loadPendingApprovals();
            
            const newCount = this.approvalQueue.length;
            if (newCount > previousCount) {
                const difference = newCount - previousCount;
                console.log(`📥 ${difference} new token(s) added to approval queue`);
                this.showAdminNotification(`${difference} new token(s) require approval`, 'info');
                this.updateApprovalDisplay();
            }
        } catch (error) {
            console.error('Error checking for new tokens:', error);
        }
    }

    /**
     * Approve Token - MANUAL ONLY
     */
    async approveToken(tokenId) {
        try {
            const token = this.approvalQueue.find(t => t.id == tokenId);
            if (!token) {
                throw new Error('Token not found in approval queue');
            }

            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            console.log(`✅ Manually approving token: ${token.symbol}`);
            
            const now = new Date().toISOString();
            const adminWallet = sessionStorage.getItem('adminWallet') || 'admin';
            
            // Check if already approved
            const { data: existingApproval, error: checkError } = await supabase
                .from('token_approvals')
                .select('id')
                .eq('token_address', token.tokenAddress)
                .single();

            // If already approved, skip
            if (!checkError && existingApproval) {
                console.log(`⚠️ Token ${token.symbol} already approved`);
                this.showAdminNotification(`Token ${token.symbol} already approved`, 'info');
                
                // Remove from pending queue
                this.approvalQueue = this.approvalQueue.filter(t => t.id !== token.id);
                this.updateApprovalStatistics();
                this.updateApprovalDisplay();
                return;
            }

            // INSERT new approval record
            const { data: newApproval, error: insertError } = await supabase
                .from('token_approvals')
                .insert({
                    token_address: token.tokenAddress,
                    token_symbol: token.symbol,
                    token_name: token.name,
                    submitted_at: now,
                    submitted_by: 'manual_review',
                    reviewed_at: now,
                    reviewed_by: adminWallet,
                    market_cap: token.marketCap,
                    risk_score: token.riskScore,
                    auto_approval_eligible: false, // MANUAL ONLY
                    created_at: now
                })
                .select()
                .single();

            if (insertError) {
                throw insertError;
            }

            // Log to admin audit log
            await this.logAdminAction('token_approval', {
                action: 'approve_token_manual',
                token_address: token.tokenAddress,
                token_symbol: token.symbol,
                details: {
                    market_cap: token.marketCap,
                    risk_score: token.riskScore,
                    approval_id: newApproval.id,
                    approval_type: 'MANUAL'
                }
            });
            
            // Remove from pending queue
            this.approvalQueue = this.approvalQueue.filter(t => t.id !== token.id);
            
            // Update statistics and UI
            this.updateApprovalStatistics();
            this.updateApprovalDisplay();
            
            this.showAdminNotification(`Token ${token.symbol} approved successfully`, 'success');
            
            console.log(`✅ Token ${token.symbol} manually approved and added to token_approvals`);
            
        } catch (error) {
            console.error('Error approving token:', error);
            this.showAdminNotification(`Failed to approve token: ${error.message}`, 'error');
        }
    }

    /**
     * Reject Token - MANUAL ONLY
     */
    async rejectToken(tokenId) {
        try {
            const token = this.approvalQueue.find(t => t.id == tokenId);
            if (!token) {
                throw new Error('Token not found in approval queue');
            }

            // Get rejection reason
            const reason = prompt(`Enter rejection reason for ${token.symbol}:`);
            if (!reason || reason.trim() === '') {
                return; // User cancelled or entered empty reason
            }

            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            console.log(`❌ Manually rejecting token: ${token.symbol} - Reason: ${reason}`);
            
            const now = new Date().toISOString();
            const adminWallet = sessionStorage.getItem('adminWallet') || 'admin';
            
            // Check if already blacklisted
            const { data: existingBlacklist, error: checkError } = await supabase
                .from('token_blacklist')
                .select('id')
                .eq('token_address', token.tokenAddress)
                .eq('is_active', true)
                .single();

            // If already blacklisted, skip
            if (!checkError && existingBlacklist) {
                console.log(`⚠️ Token ${token.symbol} already blacklisted`);
                this.showAdminNotification(`Token ${token.symbol} already blacklisted`, 'info');
                
                // Remove from pending queue
                this.approvalQueue = this.approvalQueue.filter(t => t.id !== token.id);
                this.updateApprovalStatistics();
                this.updateApprovalDisplay();
                return;
            }

            // Insert ONLY into token_blacklist
            const blacklistData = {
                token_address: token.tokenAddress,
                token_symbol: token.symbol,
                token_name: token.name,
                category: 'manual',
                reason: reason.trim(),
                severity: 'medium', // Default for manual rejections
                added_by: adminWallet,
                added_at: now,
                is_active: true,
                detection_algorithm: null,
                confidence: null,
                evidence: null,
                appeal: null,
                created_at: now
            };

            const { data: blacklist, error: blacklistError } = await supabase
                .from('token_blacklist')
                .insert(blacklistData)
                .select()
                .single();

            if (blacklistError) {
                console.error('Blacklist insertion error:', blacklistError);
                throw blacklistError;
            }

            // Log to admin audit log
            await this.logAdminAction('token_blacklist', {
                action: 'blacklist_token_manual',
                token_address: token.tokenAddress,
                token_symbol: token.symbol,
                details: {
                    reason: reason.trim(),
                    category: 'manual',
                    risk_score: token.riskScore,
                    blacklist_id: blacklist.id,
                    rejection_type: 'MANUAL'
                }
            });
            
            // Remove from pending queue
            this.approvalQueue = this.approvalQueue.filter(t => t.id !== token.id);
            
            // Update statistics and UI
            this.updateApprovalStatistics();
            this.updateApprovalDisplay();
            
            this.showAdminNotification(`Token ${token.symbol} blacklisted successfully`, 'warning');
            
            console.log(`❌ Token ${token.symbol} manually rejected and added to token_blacklist ONLY`);
            
        } catch (error) {
            console.error('Error rejecting token:', error);
            this.showAdminNotification(`Failed to blacklist token: ${error.message}`, 'error');
        }
    }

    // ===== WHITELIST FUNCTIONALITY - NEW FEATURES =====

    /**
     * Whitelist Token - Remove from blacklist and add to approval queue
     */
    async whitelistToken(blacklistId) {
        try {
            const blacklistItem = this.whitelistQueue.find(item => item.id == blacklistId);
            if (!blacklistItem) {
                throw new Error('Blacklist item not found');
            }

            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            const adminWallet = sessionStorage.getItem('adminWallet') || 'admin';

            if (!confirm(`🔄 Whitelist token ${blacklistItem.symbol}? This will remove it from blacklist and add to approval queue.`)) {
                return;
            }

            console.log(`🔄 Whitelisting token: ${blacklistItem.symbol}`);
            
            const now = new Date().toISOString();

            // Remove from blacklist (set is_active = false)
            const { error: updateError } = await supabase
                .from('token_blacklist')
                .update({
                    is_active: false,
                    updated_at: now,
                    appeal: {
                        status: 'approved',
                        approved_by: adminWallet,
                        approved_at: now,
                        reason: 'Manual whitelist by admin'
                    }
                })
                .eq('id', blacklistItem.id);

            if (updateError) {
                throw updateError;
            }

            // Log admin action
            await this.logAdminAction('token_whitelist', {
                action: 'whitelist_token',
                token_address: blacklistItem.tokenAddress,
                token_symbol: blacklistItem.symbol,
                details: {
                    original_blacklist_reason: blacklistItem.reason,
                    original_category: blacklistItem.category,
                    blacklist_id: blacklistItem.id,
                    whitelist_reason: 'Manual admin whitelist'
                }
            });

            // Remove from whitelist queue
            this.whitelistQueue = this.whitelistQueue.filter(item => item.id !== blacklistItem.id);

            // Reload approval queue to include whitelisted token
            await this.loadPendingApprovals();
            
            this.showAdminNotification(`Token ${blacklistItem.symbol} whitelisted and moved to approval queue`, 'success');
            
            console.log(`✅ Token ${blacklistItem.symbol} whitelisted successfully`);
            
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
            const selectedItems = Array.from(document.querySelectorAll('.whitelist-checkbox:checked'))
                .map(checkbox => parseInt(checkbox.dataset.itemId));

            if (selectedItems.length === 0) {
                this.showAdminNotification('No tokens selected for whitelisting', 'warning');
                return;
            }

            if (!confirm(`🔄 Whitelist ${selectedItems.length} selected tokens? They will be moved from blacklist to approval queue.`)) {
                return;
            }

            console.log(`🔄 Starting bulk whitelist of ${selectedItems.length} tokens...`);
            
            let successCount = 0;
            let errorCount = 0;

            for (const itemId of selectedItems) {
                try {
                    await this.whitelistToken(itemId);
                    successCount++;
                    
                    // Small delay to prevent overwhelming the database
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`Failed to whitelist item ${itemId}:`, error);
                    errorCount++;
                }
            }

            // Show summary notification
            if (errorCount === 0) {
                this.showAdminNotification(`✅ Successfully whitelisted ${successCount} tokens`, 'success');
            } else {
                this.showAdminNotification(`⚠️ Whitelisted ${successCount}, failed ${errorCount} tokens`, 'warning');
            }

            // Reload both queues
            await this.loadWhitelistQueue();
            await this.loadPendingApprovals();
            this.updateApprovalDisplay();
            
        } catch (error) {
            console.error('Error in bulk whitelist:', error);
            this.showAdminNotification('Bulk whitelist operation failed', 'error');
        }
    }

    /**
     * View Blacklisted Tokens for Whitelist Review
     */
    async viewBlacklistForWhitelist() {
        try {
            await this.loadWhitelistQueue();
            this.showWhitelistReviewModal();
            
        } catch (error) {
            console.error('Error loading blacklist for whitelist review:', error);
            this.showAdminNotification('Failed to load blacklist for review', 'error');
        }
    }

    /**
     * Show Whitelist Review Modal
     */
    showWhitelistReviewModal() {
        const modalHtml = `
            <div class="modal" id="whitelist-review-modal">
                <div class="modal-content" style="max-width: 1000px;">
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                    <h3>🔄 Whitelist Review - Move from Blacklist to Approval Queue</h3>
                    
                    <div style="margin: 1rem 0;">
                        <p>Review blacklisted tokens that could potentially be whitelisted and moved back to the approval queue.</p>
                        <div class="cache-controls" style="margin: 1rem 0;">
                            <button class="btn btn-success" onclick="window.TokenApproval.instance.bulkWhitelist()">
                                ✅ Whitelist Selected
                            </button>
                            <button class="btn btn-secondary" onclick="this.selectAllWhitelist()">
                                🗂️ Select All
                            </button>
                            <button class="btn btn-secondary" onclick="this.clearWhitelistSelection()">
                                🗑️ Clear Selection
                            </button>
                        </div>
                    </div>
                    
                    <div style="max-height: 500px; overflow-y: auto;">
                        ${this.whitelistQueue.length === 0 ? 
                            '<p>No tokens available for whitelisting.</p>' :
                            `<table class="admin-table">
                                <thead>
                                    <tr>
                                        <th><input type="checkbox" onchange="this.toggleAllWhitelist()"></th>
                                        <th>Token</th>
                                        <th>Category</th>
                                        <th>Reason</th>
                                        <th>Added</th>
                                        <th>Severity</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.whitelistQueue.map(item => `
                                        <tr>
                                            <td><input type="checkbox" class="whitelist-checkbox" data-item-id="${item.id}"></td>
                                            <td>
                                                <div><strong>${item.symbol}</strong></div>
                                                <div style="font-size: 0.875rem; color: #94a3b8;">${item.name}</div>
                                            </td>
                                            <td><span class="status-badge ${item.category}">${item.category}</span></td>
                                            <td style="max-width: 200px; word-wrap: break-word;">${item.reason}</td>
                                            <td>${this.formatRelativeTime(item.addedAt)}</td>
                                            <td><span class="status-badge ${item.severity || 'medium'}">${item.severity || 'medium'}</span></td>
                                            <td>
                                                <button class="btn btn-small btn-success" onclick="window.TokenApproval.instance.whitelistToken('${item.id}')">
                                                    🔄 Whitelist
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>`
                        }
                    </div>
                    
                    <div style="text-align: right; margin-top: 1rem;">
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
     * Process Whitelist Queue
     */
    async processWhitelistQueue() {
        try {
            await this.loadWhitelistQueue();
            
            if (this.whitelistQueue.length === 0) {
                this.showAdminNotification('No tokens in whitelist queue', 'info');
                return;
            }

            this.showAdminNotification(`${this.whitelistQueue.length} tokens available for whitelist review`, 'info');
            this.showWhitelistReviewModal();
            
        } catch (error) {
            console.error('Error processing whitelist queue:', error);
            this.showAdminNotification('Failed to process whitelist queue', 'error');
        }
    }

    // ===== BATCH OPERATIONS =====

    /**
     * Batch Approve Selected Tokens
     */
    async batchApprove() {
        const selectedTokens = Array.from(this.selectedTokens);
        if (selectedTokens.length === 0) {
            this.showAdminNotification('No tokens selected for approval', 'warning');
            return;
        }

        if (!confirm(`✅ Approve ${selectedTokens.length} selected tokens?`)) {
            return;
        }

        console.log(`🔄 Starting batch approval of ${selectedTokens.length} tokens...`);
        
        let successCount = 0;
        let errorCount = 0;

        for (const tokenId of selectedTokens) {
            try {
                await this.approveToken(tokenId);
                successCount++;
                
                // Small delay to prevent overwhelming the database
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`Failed to approve token ${tokenId}:`, error);
                errorCount++;
            }
        }

        // Clear selection
        this.selectedTokens.clear();
        this.updateSelectedCount();

        // Show summary notification
        if (errorCount === 0) {
            this.showAdminNotification(`✅ Successfully approved ${successCount} tokens`, 'success');
        } else {
            this.showAdminNotification(`⚠️ Approved ${successCount}, failed ${errorCount} tokens`, 'warning');
        }
    }

    /**
     * Batch Reject Selected Tokens
     */
    async batchReject() {
        const selectedTokens = Array.from(this.selectedTokens);
        if (selectedTokens.length === 0) {
            this.showAdminNotification('No tokens selected for rejection', 'warning');
            return;
        }

        const reason = prompt(`Enter rejection reason for ${selectedTokens.length} selected tokens:`);
        if (!reason || reason.trim() === '') {
            return;
        }

        if (!confirm(`❌ Reject ${selectedTokens.length} selected tokens?`)) {
            return;
        }

        console.log(`🔄 Starting batch rejection of ${selectedTokens.length} tokens...`);
        
        let successCount = 0;
        let errorCount = 0;

        for (const tokenId of selectedTokens) {
            try {
                const token = this.approvalQueue.find(t => t.id == tokenId);
                if (token) {
                    // Simulate the prompt response for batch operation
                    const originalPrompt = window.prompt;
                    window.prompt = () => reason;
                    
                    await this.rejectToken(tokenId);
                    successCount++;
                    
                    // Restore original prompt
                    window.prompt = originalPrompt;
                    
                    // Small delay
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                console.error(`Failed to reject token ${tokenId}:`, error);
                errorCount++;
            }
        }

        // Clear selection
        this.selectedTokens.clear();
        this.updateSelectedCount();

        // Show summary notification
        if (errorCount === 0) {
            this.showAdminNotification(`✅ Successfully rejected ${successCount} tokens`, 'success');
        } else {
            this.showAdminNotification(`⚠️ Rejected ${successCount}, failed ${errorCount} tokens`, 'warning');
        }
    }

    /**
     * Log Admin Action to Audit Log
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
            // Don't throw - logging failure shouldn't stop the main action
        }
    }

    /**
     * Open Token Review Modal
     */
    openTokenReview(tokenId) {
        try {
            const token = this.approvalQueue.find(t => t.id == tokenId);
            if (!token) {
                console.error('Token not found:', tokenId);
                return;
            }

            console.log(`🔍 Opening detailed review for: ${token.symbol}`);
            this.showTokenReviewModal(token);
            
        } catch (error) {
            console.error('Error opening token review:', error);
        }
    }

    /**
     * Show Token Review Modal
     */
    showTokenReviewModal(token) {
        const modalHtml = `
            <div class="modal" id="token-review-modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                    <h3>🔍 Token Review: ${token.symbol}</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0;">
                        <div>
                            <h4>Basic Information</h4>
                            <p><strong>Name:</strong> ${token.name || 'N/A'}</p>
                            <p><strong>Symbol:</strong> ${token.symbol}</p>
                            <p><strong>Address:</strong> ${this.truncateAddress(token.tokenAddress)}</p>
                            <p><strong>Market Cap:</strong> ${token.marketCap ? '$' + this.formatNumber(token.marketCap) : 'N/A'}</p>
                            <p><strong>Price:</strong> ${token.price ? '$' + token.price.toFixed(6) : 'N/A'}</p>
                            <p><strong>Data Source:</strong> ${token.dataSource || 'N/A'}</p>
                        </div>
                        
                        <div>
                            <h4>Market Metrics</h4>
                            <p><strong>24h Volume:</strong> ${token.volume24h ? '$' + this.formatNumber(token.volume24h) : 'N/A'}</p>
                            <p><strong>24h Change:</strong> ${token.priceChange24h !== null ? token.priceChange24h.toFixed(2) + '%' : 'N/A'}</p>
                            <p><strong>1h Change:</strong> ${token.priceChange1h !== null ? token.priceChange1h.toFixed(2) + '%' : 'N/A'}</p>
                            <p><strong>Risk Score:</strong> ${(token.riskScore * 100).toFixed(1)}%</p>
                            <p><strong>Last Updated:</strong> ${token.lastUpdated ? new Date(token.lastUpdated).toLocaleString() : 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h4>Tags</h4>
                        <div style="display: flex; gap: 0.5rem; margin: 0.5rem 0;">
                            ${token.tags && token.tags.length > 0 ? 
                                token.tags.map(tag => `<span class="status-badge">${tag}</span>`).join('') : 
                                '<span style="color: #94a3b8;">No tags</span>'
                            }
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button class="btn btn-success" onclick="window.TokenApproval.instance.approveToken('${token.id}'); this.closest('.modal').remove();">
                            ✅ Approve
                        </button>
                        <button class="btn btn-danger" onclick="window.TokenApproval.instance.rejectToken('${token.id}'); this.closest('.modal').remove();">
                            ❌ Reject
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        // Checkbox events for batch selection
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('approval-checkbox')) {
                this.updateSelectedCount();
            }
        });

        // Whitelist functionality
        document.addEventListener('click', (e) => {
            if (e.target.onclick?.toString().includes('viewBlacklistForWhitelist')) {
                this.viewBlacklistForWhitelist();
            } else if (e.target.onclick?.toString().includes('processWhitelistQueue')) {
                this.processWhitelistQueue();
            } else if (e.target.onclick?.toString().includes('bulkWhitelist')) {
                this.bulkWhitelist();
            }
        });

        console.log('✅ Token approval event listeners set up');
    }

    /**
     * Update Approval Statistics
     */
    updateApprovalStatistics() {
        this.adminState.approvalState.statistics.pendingCount = this.approvalQueue.length;
        
        // Update UI elements
        const pendingElement = document.getElementById('pending-approvals');
        if (pendingElement) {
            pendingElement.textContent = this.approvalQueue.length;
        }
        
        const pendingCountElement = document.getElementById('pending-count');
        if (pendingCountElement) {
            pendingCountElement.textContent = this.approvalQueue.length;
        }
    }

    /**
     * Update Approval Display
     */
    updateApprovalDisplay() {
        this.updateApprovalStatistics();
        
        // Re-render approval queue
        if (window.renderApprovalQueue) {
            window.renderApprovalQueue();
        }
    }

    /**
     * Update Selected Count
     */
    updateSelectedCount() {
        this.selectedTokens.clear();
        
        document.querySelectorAll('.approval-checkbox:checked').forEach(checkbox => {
            this.selectedTokens.add(checkbox.dataset.tokenId);
        });
        
        const selectedCountElement = document.getElementById('selected-count');
        if (selectedCountElement) {
            selectedCountElement.textContent = this.selectedTokens.size;
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
     * Truncate Address
     */
    truncateAddress(address) {
        if (!address) return 'N/A';
        return `${address.slice(0, 6)}...${address.slice(-6)}`;
    }

    /**
     * Format Number
     */
    formatNumber(num) {
        if (!num) return '0';
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
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        console.log('🧹 Token Approval System cleaned up');
    }
}

// Create singleton instance
TokenApproval.instance = null;

// Export for global use
window.TokenApproval = TokenApproval;

console.log('✅ TokenApproval component loaded - MANUAL ONLY with Whitelist Integration');
console.log('🏁 Features:');
console.log('   ✅ Manual token approval workflow ONLY');
console.log('   🚫 NO auto-approval functionality');
console.log('   🔄 Whitelist integration (blacklist → approval queue)');
console.log('   📊 Live database integration with token_approvals and token_blacklist');
console.log('   🔍 Bulk operations for approval, rejection, and whitelisting');
console.log('   📝 Complete admin action audit logging');
