/**
 * TokenApproval Component - Token Approval Workflow System
 * Updated with proper database constraints and no fallbacks
 */

class TokenApproval {
    constructor(adminState) {
        this.adminState = adminState;
        this.isInitialized = false;
        this.approvalQueue = [];
        this.selectedTokens = new Set();
        this.updateInterval = null;
        
        // Approval workflow states
        this.approvalStates = {
            PENDING: 'pending',
            REVIEWING: 'reviewing',
            APPROVED: 'approved',
            REJECTED: 'rejected'
        };
        
        console.log('TokenApproval: Component initialized');
    }

    /**
     * Initialize Token Approval Component
     */
    async initialize() {
        try {
            console.log('✅ Initializing Token Approval System...');
            
            // Load pending approvals from database
            await this.loadPendingApprovals();
            
            // Start monitoring for new tokens
            this.startApprovalMonitoring();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Token Approval System initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Token Approval System:', error);
            this.showAdminNotification('Failed to initialize Token Approval System', 'error');
            return false;
        }
    }

    /**
     * Load Pending Approvals from Database - LIVE DATA ONLY
     */
    async loadPendingApprovals() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            // Get all tokens from token_cache that are not yet approved or blacklisted
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

            // Get approved tokens
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
            
        } catch (error) {
            console.error('Error loading pending approvals:', error);
            this.showAdminNotification(`Failed to load pending approvals: ${error.message}`, 'error');
            this.approvalQueue = [];
            this.updateApprovalStatistics();
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
     * Approve Token - Write to Database
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

            console.log(`✅ Approving token: ${token.symbol}`);
            
            const now = new Date().toISOString();
            
            // Insert into token_approvals table
            const { data: approval, error: approvalError } = await supabase
                .from('token_approvals')
                .insert({
                    token_address: token.tokenAddress,
                    token_symbol: token.symbol,
                    token_name: token.name,
                    approved_by: sessionStorage.getItem('adminWallet') || 'admin',
                    approved_at: now,
                    approval_notes: `Market Cap: $${token.marketCap?.toLocaleString() || 'N/A'}, Volume: $${token.volume24h?.toLocaleString() || 'N/A'}`,
                    risk_score: token.riskScore,
                    market_cap_at_approval: token.marketCap,
                    created_at: now
                })
                .select()
                .single();

            if (approvalError) {
                throw approvalError;
            }

            // Log to admin audit log
            await this.logAdminAction('token_approval', {
                action: 'approve_token',
                token_address: token.tokenAddress,
                token_symbol: token.symbol,
                details: {
                    market_cap: token.marketCap,
                    risk_score: token.riskScore,
                    approval_id: approval.id
                }
            });
            
            // Remove from pending queue
            this.approvalQueue = this.approvalQueue.filter(t => t.id !== token.id);
            
            // Update statistics and UI
            this.updateApprovalStatistics();
            this.updateApprovalDisplay();
            
            this.showAdminNotification(`Token ${token.symbol} approved successfully`, 'success');
            
        } catch (error) {
            console.error('Error approving token:', error);
            this.showAdminNotification(`Failed to approve token: ${error.message}`, 'error');
        }
    }

    /**
     * Reject Token - Write to Blacklist with Proper Database Constraints
     */
    async rejectToken(tokenId) {
        try {
            const token = this.approvalQueue.find(t => t.id == tokenId);
            if (!token) {
                throw new Error('Token not found in approval queue');
            }

            // Simple reason prompt
            const reason = prompt(`Enter rejection reason for ${token.symbol}:`);
            if (!reason || reason.trim() === '') {
                return; // User cancelled or entered empty reason
            }

            const supabase = this.getSupabase();
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            console.log(`❌ Rejecting token: ${token.symbol} - Reason: ${reason}`);
            
            const now = new Date().toISOString();
            
            // Insert into token_blacklist table with proper constraints
            const blacklistData = {
                token_address: token.tokenAddress,
                token_symbol: token.symbol,
                token_name: token.name,
                category: 'manual', // Required field - default to 'manual' for admin rejections
                reason: reason.trim(), // Required field - admin provided reason
                severity: null, // Optional field - set to null
                added_by: sessionStorage.getItem('adminWallet') || 'admin', // Required field
                added_at: now,
                is_active: true,
                detection_algorithm: null, // Optional - null for manual rejections
                confidence: null, // Optional - null for manual rejections
                evidence: null, // Optional - null for manual rejections
                appeal: null, // Optional - null initially
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
                action: 'blacklist_token',
                token_address: token.tokenAddress,
                token_symbol: token.symbol,
                details: {
                    reason: reason.trim(),
                    category: 'manual',
                    risk_score: token.riskScore,
                    blacklist_id: blacklist.id
                }
            });
            
            // Remove from pending queue
            this.approvalQueue = this.approvalQueue.filter(t => t.id !== token.id);
            
            // Update statistics and UI
            this.updateApprovalStatistics();
            this.updateApprovalDisplay();
            
            this.showAdminNotification(`Token ${token.symbol} blacklisted successfully`, 'warning');
            
        } catch (error) {
            console.error('Error rejecting token:', error);
            this.showAdminNotification(`Failed to blacklist token: ${error.message}`, 'error');
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
                    action_type: actionType,
                    action_data: actionData,
                    ip_address: 'web-client',
                    user_agent: navigator.userAgent,
                    created_at: new Date().toISOString()
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

console.log('✅ TokenApproval component loaded - LIVE DATA ONLY version');
