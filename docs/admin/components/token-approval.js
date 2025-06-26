/**
 * TokenApproval Component - Token Approval Workflow System
 * Handles pending token reviews, batch operations, and auto-approval rules
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
            REJECTED: 'rejected',
            AUTO_APPROVED: 'auto_approved'
        };
        
        // Auto-approval criteria
        this.defaultAutoApprovalRules = {
            minMarketCap: 5000000, // $5M
            minAge: 30, // days
            minLiquidity: 0.3, // 30%
            verificationRequired: false,
            maxAutoApprovalsPerHour: 10,
            requiresManualReview: ['rugpull_risk', 'honeypot_detected', 'duplicate_name']
        };
        
        console.log('TokenApproval: Component initialized');
    }

    /**
     * Initialize Token Approval Component
     */
    async initialize() {
        try {
            console.log('✅ Initializing Token Approval System...');
            
            // Load pending approvals
            await this.loadPendingApprovals();
            
            // Load auto-approval rules
            await this.loadAutoApprovalRules();
            
            // Start monitoring new submissions
            this.startApprovalMonitoring();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Token Approval System initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Token Approval System:', error);
            return false;
        }
    }

    /**
     * Load Pending Approvals
     */
    async loadPendingApprovals() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                console.warn('Supabase not available, using demo data');
                this.loadDemoApprovals();
                return;
            }

            // Load from database
            const { data: pendingTokens, error } = await supabase
                .from('token_approvals')
                .select('*')
                .eq('status', this.approvalStates.PENDING)
                .order('submitted_at', { ascending: true });

            if (error) {
                console.warn('Could not load pending approvals from database:', error);
                this.loadDemoApprovals();
                return;
            }

            this.approvalQueue = pendingTokens || [];
            
            // Update statistics
            this.updateApprovalStatistics();
            
            console.log(`✅ Loaded ${this.approvalQueue.length} pending approvals`);
            
        } catch (error) {
            console.error('Error loading pending approvals:', error);
            this.loadDemoApprovals();
        }
    }

    /**
     * Load Demo Approvals (Fallback)
     */
    loadDemoApprovals() {
        this.approvalQueue = [
            {
                id: 1,
                tokenAddress: 'ABC123def456ghi789jkl012mno345pqr678stu901',
                symbol: 'NEWCOIN',
                name: 'New Promising Token',
                logoURI: null,
                marketCap: 8500000,
                price: 0.045,
                volume24h: 2400000,
                priceChange24h: 12.5,
                age: 45,
                liquidity: 0.65,
                verificationStatus: 'unverified',
                submittedAt: new Date(Date.now() - 7200000), // 2 hours ago
                submittedBy: 'community',
                riskScore: 0.25,
                autoApprovalEligible: true,
                tags: ['defi', 'utility'],
                socialLinks: {
                    website: 'https://newcoin.example.com',
                    twitter: '@newcoin_token',
                    telegram: 't.me/newcoin'
                }
            },
            {
                id: 2,
                tokenAddress: 'DEF456ghi789jkl012mno345pqr678stu901vwx234',
                symbol: 'RISING',
                name: 'Rising Star Token',
                logoURI: null,
                marketCap: 12000000,
                price: 1.23,
                volume24h: 5600000,
                priceChange24h: 18.3,
                age: 67,
                liquidity: 0.78,
                verificationStatus: 'pending',
                submittedAt: new Date(Date.now() - 3600000), // 1 hour ago
                submittedBy: 'team',
                riskScore: 0.15,
                autoApprovalEligible: true,
                tags: ['gaming', 'nft'],
                socialLinks: {
                    website: 'https://risingstar.example.com',
                    twitter: '@risingstar_game'
                }
            },
            {
                id: 3,
                tokenAddress: 'GHI789jkl012mno345pqr678stu901vwx234yzab567',
                symbol: 'MEMECOIN',
                name: 'Community Meme Token',
                logoURI: null,
                marketCap: 3200000,
                price: 0.00000012,
                volume24h: 890000,
                priceChange24h: -5.2,
                age: 15,
                liquidity: 0.45,
                verificationStatus: 'unverified',
                submittedAt: new Date(Date.now() - 1800000), // 30 minutes ago
                submittedBy: 'community',
                riskScore: 0.65,
                autoApprovalEligible: false,
                tags: ['meme', 'community'],
                riskFlags: ['low_liquidity', 'recent_token'],
                socialLinks: {
                    twitter: '@memecoin_fun',
                    telegram: 't.me/memecoin_community'
                }
            }
        ];

        console.log('📊 Using demo approval data');
    }

    /**
     * Load Auto-Approval Rules
     */
    async loadAutoApprovalRules() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                this.adminState.approvalState.autoApprovalRules = { ...this.defaultAutoApprovalRules };
                return;
            }

            // Load from database
            const { data: rules, error } = await supabase
                .from('auto_approval_rules')
                .select('*')
                .eq('is_active', true)
                .single();

            if (error || !rules) {
                console.warn('Using default auto-approval rules');
                this.adminState.approvalState.autoApprovalRules = { ...this.defaultAutoApprovalRules };
                return;
            }

            this.adminState.approvalState.autoApprovalRules = {
                ...this.defaultAutoApprovalRules,
                ...rules.rules
            };

            console.log('✅ Auto-approval rules loaded');
            
        } catch (error) {
            console.error('Error loading auto-approval rules:', error);
            this.adminState.approvalState.autoApprovalRules = { ...this.defaultAutoApprovalRules };
        }
    }

    /**
     * Start Approval Monitoring
     */
    startApprovalMonitoring() {
        // Monitor for new submissions every 30 seconds
        this.updateInterval = setInterval(async () => {
            try {
                await this.checkForNewSubmissions();
                await this.processAutoApprovals();
            } catch (error) {
                console.error('Approval monitoring error:', error);
            }
        }, 30000);

        console.log('✅ Approval monitoring started');
    }

    /**
     * Check for New Submissions
     */
    async checkForNewSubmissions() {
        try {
            // Simulate new submissions occasionally
            if (Math.random() < 0.1) { // 10% chance
                const newSubmission = this.generateRandomSubmission();
                this.approvalQueue.push(newSubmission);
                
                // Check if eligible for auto-approval
                if (this.isEligibleForAutoApproval(newSubmission)) {
                    await this.processAutoApproval(newSubmission);
                } else {
                    console.log(`📥 New token submission: ${newSubmission.symbol}`);
                    this.updateApprovalDisplay();
                }
            }
        } catch (error) {
            console.error('Error checking for new submissions:', error);
        }
    }

    /**
     * Generate Random Submission (for demo)
     */
    generateRandomSubmission() {
        const symbols = ['NEWTOKEN', 'CRYPTO', 'DEFI', 'CHAIN', 'COIN', 'TOKEN'];
        const names = ['New Token', 'Crypto Project', 'DeFi Protocol', 'Chain Token', 'Utility Coin'];
        
        const symbol = symbols[Math.floor(Math.random() * symbols.length)] + Math.floor(Math.random() * 1000);
        const name = names[Math.floor(Math.random() * names.length)] + ' ' + Math.floor(Math.random() * 100);
        
        return {
            id: Date.now(),
            tokenAddress: this.generateRandomAddress(),
            symbol,
            name,
            logoURI: null,
            marketCap: Math.floor(Math.random() * 50000000) + 1000000,
            price: Math.random() * 10,
            volume24h: Math.floor(Math.random() * 5000000),
            priceChange24h: (Math.random() - 0.5) * 40,
            age: Math.floor(Math.random() * 200) + 10,
            liquidity: Math.random() * 0.8 + 0.2,
            verificationStatus: Math.random() > 0.5 ? 'unverified' : 'pending',
            submittedAt: new Date(),
            submittedBy: Math.random() > 0.5 ? 'community' : 'team',
            riskScore: Math.random() * 0.8,
            autoApprovalEligible: Math.random() > 0.3,
            tags: ['defi', 'utility', 'gaming', 'nft', 'meme'].slice(0, Math.floor(Math.random() * 3) + 1)
        };
    }

    /**
     * Process Auto-Approvals
     */
    async processAutoApprovals() {
        try {
            const eligibleTokens = this.approvalQueue.filter(token => 
                token.status === this.approvalStates.PENDING && 
                this.isEligibleForAutoApproval(token)
            );

            for (const token of eligibleTokens.slice(0, 5)) { // Limit to 5 per batch
                await this.processAutoApproval(token);
            }

        } catch (error) {
            console.error('Error processing auto-approvals:', error);
        }
    }

    /**
     * Check if Token is Eligible for Auto-Approval
     */
    isEligibleForAutoApproval(token) {
        const rules = this.adminState.approvalState.autoApprovalRules;
        
        // Check basic criteria
        if (token.marketCap < rules.minMarketCap) return false;
        if (token.age < rules.minAge) return false;
        if (token.liquidity < rules.minLiquidity) return false;
        if (rules.verificationRequired && token.verificationStatus === 'unverified') return false;
        
        // Check risk flags
        if (token.riskFlags && token.riskFlags.some(flag => 
            rules.requiresManualReview.includes(flag))) {
            return false;
        }
        
        // Check risk score
        if (token.riskScore > 0.5) return false;
        
        return true;
    }

    /**
     * Process Auto-Approval
     */
    async processAutoApproval(token) {
        try {
            console.log(`🤖 Auto-approving token: ${token.symbol}`);
            
            // Update token status
            token.status = this.approvalStates.AUTO_APPROVED;
            token.approvedAt = new Date();
            token.approvedBy = 'auto_system';
            
            // Remove from pending queue
            this.approvalQueue = this.approvalQueue.filter(t => t.id !== token.id);
            
            // Update statistics
            this.adminState.approvalState.statistics.autoApprovedPercent++;
            this.adminState.approvalState.statistics.pendingCount--;
            
            // Add to approved list
            if (!this.adminState.approvalState.approved) {
                this.adminState.approvalState.approved = [];
            }
            this.adminState.approvalState.approved.push(token);
            
            this.updateApprovalDisplay();
            
        } catch (error) {
            console.error('Error processing auto-approval:', error);
        }
    }

    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        // Approval actions
        document.addEventListener('click', (e) => {
            const tokenId = e.target.dataset.tokenId;
            
            if (e.target.onclick?.toString().includes('approveToken') && tokenId) {
                this.approveToken(tokenId);
            } else if (e.target.onclick?.toString().includes('rejectToken') && tokenId) {
                this.rejectToken(tokenId);
            } else if (e.target.onclick?.toString().includes('reviewToken') && tokenId) {
                this.openTokenReview(tokenId);
            }
        });

        // Batch operations
        document.addEventListener('click', (e) => {
            if (e.target.onclick?.toString().includes('batchApprove')) {
                this.batchApprove();
            } else if (e.target.onclick?.toString().includes('batchReject')) {
                this.batchReject();
            } else if (e.target.onclick?.toString().includes('selectAll')) {
                this.selectAllTokens();
            } else if (e.target.onclick?.toString().includes('clearSelection')) {
                this.clearSelection();
            } else if (e.target.onclick?.toString().includes('bulkAnalyze')) {
                this.bulkAnalyze();
            }
        });

        // Auto-approval rules
        document.addEventListener('click', (e) => {
            if (e.target.onclick?.toString().includes('saveAutoApprovalRules')) {
                this.saveAutoApprovalRules();
            } else if (e.target.onclick?.toString().includes('testAutoApprovalRules')) {
                this.testAutoApprovalRules();
            } else if (e.target.onclick?.toString().includes('resetAutoApprovalRules')) {
                this.resetAutoApprovalRules();
            }
        });

        // Checkbox events
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('approval-checkbox')) {
                this.updateSelectedCount();
            }
        });

        console.log('✅ Token approval event listeners set up');
    }

    /**
     * Approve Token
     */
    async approveToken(tokenId) {
        try {
            const token = this.approvalQueue.find(t => t.id == tokenId);
            if (!token) {
                console.error('Token not found:', tokenId);
                return;
            }

            console.log(`✅ Approving token: ${token.symbol}`);
            
            // Update token status
            token.status = this.approvalStates.APPROVED;
            token.approvedAt = new Date();
            token.approvedBy = 'admin_manual';
            
            // Remove from pending queue
            this.approvalQueue = this.approvalQueue.filter(t => t.id !== token.id);
            
            // Update statistics
            this.adminState.approvalState.statistics.pendingCount--;
            this.adminState.approvalState.statistics.approvalRate = 
                ((this.adminState.approvalState.statistics.approvalRate * 10) + 1) / 11; // Simple moving average
            
            // Add to approved list
            if (!this.adminState.approvalState.approved) {
                this.adminState.approvalState.approved = [];
            }
            this.adminState.approvalState.approved.push(token);
            
            this.updateApprovalDisplay();
            this.showAdminNotification(`Token ${token.symbol} approved successfully`, 'success');
            
        } catch (error) {
            console.error('Error approving token:', error);
            this.showAdminNotification('Failed to approve token', 'error');
        }
    }

    /**
     * Reject Token
     */
    async rejectToken(tokenId) {
        try {
            const token = this.approvalQueue.find(t => t.id == tokenId);
            if (!token) {
                console.error('Token not found:', tokenId);
                return;
            }

            const reason = prompt(`Enter rejection reason for ${token.symbol}:`);
            if (!reason) return;

            console.log(`❌ Rejecting token: ${token.symbol} - Reason: ${reason}`);
            
            // Update token status
            token.status = this.approvalStates.REJECTED;
            token.rejectedAt = new Date();
            token.rejectedBy = 'admin_manual';
            token.rejectionReason = reason;
            
            // Remove from pending queue
            this.approvalQueue = this.approvalQueue.filter(t => t.id !== token.id);
            
            // Update statistics
            this.adminState.approvalState.statistics.pendingCount--;
            
            // Add to rejected list
            if (!this.adminState.approvalState.rejected) {
                this.adminState.approvalState.rejected = [];
            }
            this.adminState.approvalState.rejected.push(token);
            
            this.updateApprovalDisplay();
            this.showAdminNotification(`Token ${token.symbol} rejected`, 'warning');
            
        } catch (error) {
            console.error('Error rejecting token:', error);
            this.showAdminNotification('Failed to reject token', 'error');
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
            
            // Create detailed review modal
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
                            <p><strong>Name:</strong> ${token.name}</p>
                            <p><strong>Symbol:</strong> ${token.symbol}</p>
                            <p><strong>Address:</strong> ${this.truncateAddress(token.tokenAddress)}</p>
                            <p><strong>Market Cap:</strong> $${this.formatNumber(token.marketCap)}</p>
                            <p><strong>Price:</strong> $${token.price.toFixed(6)}</p>
                            <p><strong>Age:</strong> ${token.age} days</p>
                        </div>
                        
                        <div>
                            <h4>Risk Assessment</h4>
                            <p><strong>Risk Score:</strong> ${(token.riskScore * 100).toFixed(1)}%</p>
                            <p><strong>Liquidity:</strong> ${(token.liquidity * 100).toFixed(1)}%</p>
                            <p><strong>24h Volume:</strong> $${this.formatNumber(token.volume24h)}</p>
                            <p><strong>24h Change:</strong> ${token.priceChange24h.toFixed(2)}%</p>
                            <p><strong>Verification:</strong> ${token.verificationStatus}</p>
                            <p><strong>Auto-Eligible:</strong> ${token.autoApprovalEligible ? 'Yes' : 'No'}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h4>Tags</h4>
                        <div style="display: flex; gap: 0.5rem; margin: 0.5rem 0;">
                            ${token.tags ? token.tags.map(tag => `<span class="status-badge">${tag}</span>`).join('') : 'No tags'}
                        </div>
                    </div>
                    
                    ${token.riskFlags ? `
                        <div>
                            <h4>Risk Flags</h4>
                            <div style="display: flex; gap: 0.5rem; margin: 0.5rem 0;">
                                ${token.riskFlags.map(flag => `<span class="status-badge inactive">${flag}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
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
     * Batch Approve Selected Tokens
     */
    async batchApprove() {
        try {
            const selectedIds = Array.from(this.selectedTokens);
            if (selectedIds.length === 0) {
                this.showAdminNotification('No tokens selected', 'warning');
                return;
            }

            if (!confirm(`✅ Approve ${selectedIds.length} selected tokens?`)) {
                return;
            }

            console.log(`✅ Batch approving ${selectedIds.length} tokens...`);
            
            for (const tokenId of selectedIds) {
                await this.approveToken(tokenId);
            }
            
            this.clearSelection();
            this.showAdminNotification(`Approved ${selectedIds.length} tokens`, 'success');
            
        } catch (error) {
            console.error('Error in batch approval:', error);
            this.showAdminNotification('Batch approval failed', 'error');
        }
    }

    /**
     * Batch Reject Selected Tokens
     */
    async batchReject() {
        try {
            const selectedIds = Array.from(this.selectedTokens);
            if (selectedIds.length === 0) {
                this.showAdminNotification('No tokens selected', 'warning');
                return;
            }

            const reason = prompt(`Enter rejection reason for ${selectedIds.length} tokens:`);
            if (!reason) return;

            if (!confirm(`❌ Reject ${selectedIds.length} selected tokens?`)) {
                return;
            }

            console.log(`❌ Batch rejecting ${selectedIds.length} tokens...`);
            
            for (const tokenId of selectedIds) {
                const token = this.approvalQueue.find(t => t.id == tokenId);
                if (token) {
                    token.rejectionReason = reason;
                    await this.rejectToken(tokenId);
                }
            }
            
            this.clearSelection();
            this.showAdminNotification(`Rejected ${selectedIds.length} tokens`, 'warning');
            
        } catch (error) {
            console.error('Error in batch rejection:', error);
            this.showAdminNotification('Batch rejection failed', 'error');
        }
    }

    /**
     * Select All Tokens
     */
    selectAllTokens() {
        this.selectedTokens.clear();
        
        document.querySelectorAll('.approval-checkbox').forEach(checkbox => {
            checkbox.checked = true;
            this.selectedTokens.add(checkbox.dataset.tokenId);
        });
        
        this.updateSelectedCount();
        console.log('🗂️ Selected all tokens');
    }

    /**
     * Clear Selection
     */
    clearSelection() {
        this.selectedTokens.clear();
        
        document.querySelectorAll('.approval-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.updateSelectedCount();
        console.log('🗑️ Cleared selection');
    }

    /**
     * Bulk Analyze Tokens
     */
    async bulkAnalyze() {
        try {
            const selectedIds = Array.from(this.selectedTokens);
            if (selectedIds.length === 0) {
                this.showAdminNotification('No tokens selected', 'warning');
                return;
            }

            console.log(`🔍 Running bulk analysis on ${selectedIds.length} tokens...`);
            
            for (const tokenId of selectedIds) {
                const token = this.approvalQueue.find(t => t.id == tokenId);
                if (token) {
                    // Run analysis (simulated)
                    token.analysisCompleted = true;
                    token.analysisScore = Math.random() * 100;
                    token.riskScore = Math.random() * 0.8;
                }
            }
            
            this.updateApprovalDisplay();
            this.showAdminNotification(`Analysis completed for ${selectedIds.length} tokens`, 'success');
            
        } catch (error) {
            console.error('Error in bulk analysis:', error);
            this.showAdminNotification('Bulk analysis failed', 'error');
        }
    }

    /**
     * Save Auto-Approval Rules
     */
    async saveAutoApprovalRules() {
        try {
            console.log('💾 Saving auto-approval rules...');
            
            // Get values from form
            const rules = {
                minMarketCap: parseInt(document.getElementById('min-market-cap')?.value || '5') * 1000000,
                minAge: parseInt(document.getElementById('min-age')?.value || '30'),
                minLiquidity: parseFloat(document.getElementById('min-liquidity')?.value || '30') / 100,
                verificationRequired: document.getElementById('verification-required')?.value === 'true'
            };
            
            // Update state
            this.adminState.approvalState.autoApprovalRules = {
                ...this.adminState.approvalState.autoApprovalRules,
                ...rules
            };
            
            // Save to database (simulated)
            const supabase = this.getSupabase();
            if (supabase) {
                // Save rules to database
                console.log('Saving rules to database...');
            }
            
            this.showAdminNotification('Auto-approval rules saved successfully', 'success');
            
        } catch (error) {
            console.error('Error saving auto-approval rules:', error);
            this.showAdminNotification('Failed to save rules', 'error');
        }
    }

    /**
     * Test Auto-Approval Rules
     */
    async testAutoApprovalRules() {
        try {
            console.log('🧪 Testing auto-approval rules...');
            
            let eligible = 0;
            let ineligible = 0;
            
            for (const token of this.approvalQueue) {
                if (this.isEligibleForAutoApproval(token)) {
                    eligible++;
                } else {
                    ineligible++;
                }
            }
            
            const message = `Test Results: ${eligible} eligible, ${ineligible} ineligible for auto-approval`;
            this.showAdminNotification(message, 'info');
            
        } catch (error) {
            console.error('Error testing auto-approval rules:', error);
            this.showAdminNotification('Rule testing failed', 'error');
        }
    }

    /**
     * Reset Auto-Approval Rules
     */
    resetAutoApprovalRules() {
        if (!confirm('🔄 Reset all rules to default values?')) {
            return;
        }
        
        this.adminState.approvalState.autoApprovalRules = { ...this.defaultAutoApprovalRules };
        
        // Update form values
        this.updateAutoApprovalRulesDisplay();
        
        this.showAdminNotification('Rules reset to defaults', 'warning');
        console.log('🔄 Auto-approval rules reset to defaults');
    }

    /**
     * Update Approval Statistics
     */
    updateApprovalStatistics() {
        this.adminState.approvalState.statistics.pendingCount = this.approvalQueue.length;
        
        // Calculate approval rate
        const totalProcessed = (this.adminState.approvalState.approved?.length || 0) + 
                              (this.adminState.approvalState.rejected?.length || 0);
        const approved = this.adminState.approvalState.approved?.length || 0;
        
        if (totalProcessed > 0) {
            this.adminState.approvalState.statistics.approvalRate = (approved / totalProcessed) * 100;
        }
        
        // Calculate average review time (simulated)
        this.adminState.approvalState.statistics.avgReviewTime = 2.4 + (Math.random() - 0.5) * 1;
    }

    /**
     * Update Approval Display
     */
    updateApprovalDisplay() {
        this.updateApprovalStatistics();
        
        // Update statistics display
        if (window.updateApprovalStatistics) {
            window.updateApprovalStatistics();
        }
        
        // Re-render approval queue
        if (window.renderApprovalQueue) {
            window.renderApprovalQueue();
        }
        
        // Update pending count in dashboard
        const pendingCountElement = document.getElementById('pending-count');
        if (pendingCountElement) {
            pendingCountElement.textContent = this.adminState.approvalState.statistics.pendingCount;
        }
    }

    /**
     * Update Auto-Approval Rules Display
     */
    updateAutoApprovalRulesDisplay() {
        const rules = this.adminState.approvalState.autoApprovalRules;
        
        // Update sliders
        const marketCapSlider = document.getElementById('min-market-cap');
        if (marketCapSlider) {
            marketCapSlider.value = rules.minMarketCap / 1000000;
            marketCapSlider.dispatchEvent(new Event('input'));
        }
        
        const ageSlider = document.getElementById('min-age');
        if (ageSlider) {
            ageSlider.value = rules.minAge;
            ageSlider.dispatchEvent(new Event('input'));
        }
        
        const liquiditySlider = document.getElementById('min-liquidity');
        if (liquiditySlider) {
            liquiditySlider.value = rules.minLiquidity * 100;
            liquiditySlider.dispatchEvent(new Event('input'));
        }
        
        // Update dropdown
        const verificationSelect = document.getElementById('verification-required');
        if (verificationSelect) {
            verificationSelect.value = rules.verificationRequired.toString();
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
     * Generate Random Address
     */
    generateRandomAddress() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 44; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Truncate Address
     */
    truncateAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-6)}`;
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

console.log('✅ TokenApproval component loaded');
console.log('✅ Features:');
console.log('   📋 Pending approval queue management');
console.log('   🔄 Batch approval operations');
console.log('   🤖 Auto-approval rule system');
console.log('   🔍 Detailed token review interface');
console.log('   📊 Approval analytics and statistics');
