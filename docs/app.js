// =============================================================================
// TOKENWARS - COMPLETE INTEGRATED APP.JS
// Smart Contract + Database Integration with Wallet Bridge
// =============================================================================

console.log('🚀 Loading TokenWars App - Complete Integration...');

// =============================================================================
// GLOBAL STATE MANAGEMENT
// =============================================================================

let currentPage = 'markets';
let connectedUser = null;
let walletService = null;
let servicesReady = false;

// Competition State
const CompetitionState = {
    competitions: [],
    selectedCompetition: null,
    selectedToken: null,
    supabaseClient: null,
    lastUpdate: null,
    autoRefreshInterval: null
};

// UI State
const UIState = {
    modalsOpen: [],
    loadingStates: new Set(),
    notificationQueue: []
};

// =============================================================================
// SERVICE INTEGRATION LAYER
// =============================================================================

/**
 * Get the appropriate service based on configuration and availability
 */
function getActiveCompetitionService() {
    try {
        // Check if smart contracts are enabled in config
        const smartContractEnabled = window.BLOCKCHAIN_CONFIG?.SMART_CONTRACT_ENABLED;
        
        // Check if smart contract service is available
        const smartContractAvailable = window.smartContractService?.isAvailable();
        
        if (smartContractEnabled && smartContractAvailable) {
            console.log('🔗 Using smart contract service');
            return 'smart_contract';
        } else {
            console.log('🗄️ Using database service');
            return 'database';
        }
    } catch (error) {
        console.error('❌ Error determining service:', error);
        return 'database'; // Fallback to database
    }
}

/**
 * Check if smart contracts are currently available for use
 */
function isSmartContractAvailable() {
    try {
        return window.BLOCKCHAIN_CONFIG?.SMART_CONTRACT_ENABLED && 
               window.smartContractService?.isAvailable() &&
               walletService?.isSmartContractReady();
    } catch (error) {
        console.error('❌ Error checking smart contract availability:', error);
        return false;
    }
}

// =============================================================================
// WALLET INTEGRATION
// =============================================================================

async function initializeWalletIntegration() {
    try {
        console.log('🔗 Initializing wallet integration...');
        
        // Get wallet service from global
        walletService = window.getWalletService?.();
        
        if (!walletService) {
            console.warn('⚠️ Wallet service not available');
            return false;
        }
        
        // Set up wallet event listeners
        setupWalletEventListeners();
        
        // Try auto-reconnect
        if (window.WALLET_CONFIG?.AUTO_RECONNECT) {
            await walletService.autoReconnect();
        }
        
        console.log('✅ Wallet integration initialized');
        return true;
        
    } catch (error) {
        console.error('❌ Error initializing wallet integration:', error);
        return false;
    }
}

function setupWalletEventListeners() {
    try {
        walletService.on('connected', async (data) => {
            console.log('🔗 Wallet connected:', data.address);
            connectedUser = {
                wallet: data.address,
                walletType: data.walletType,
                balance: data.balance,
                isDemo: data.isDemo,
                profile: null
            };
            
            // Update UI
            updateConnectionDisplay();
            updateTraderDisplay();
            
            // Refresh current page
            await refreshCurrentPage();
        });
        
        walletService.on('disconnected', () => {
            console.log('🔌 Wallet disconnected');
            connectedUser = null;
            updateConnectionDisplay();
            updateTraderDisplay();
        });
        
        walletService.on('profileUpdated', (data) => {
            if (connectedUser && data) {
                connectedUser.profile = data;
                updateTraderDisplay();
            }
        });
        
        console.log('✅ Wallet event listeners setup');
        
    } catch (error) {
        console.error('❌ Error setting up wallet event listeners:', error);
    }
}

function getWalletAddress() {
    return connectedUser?.wallet || null;
}

function isWalletConnected() {
    return !!connectedUser?.wallet;
}

// =============================================================================
// COMPETITION MANAGEMENT - SMART CONTRACT INTEGRATED
// =============================================================================

/**
 * Load active competitions with smart contract status
 */
async function loadActiveCompetitionsFixed() {
    console.log('🏁 Loading active competitions with smart contract support...');
    
    try {
        if (!CompetitionState.supabaseClient) {
            console.error('❌ Supabase client not available');
            return [];
        }
        
        // Load from database (source of truth)
        const { data, error } = await CompetitionState.supabaseClient
            .from('competitions')
            .select('*')
            .in('status', ['VOTING', 'ACTIVE', 'SETUP'])
            .order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        console.log(`✅ Loaded ${data?.length || 0} competitions from database`);
        
        // Process competitions and add smart contract status
        const processedCompetitions = data.map(comp => {
            const hasSmartContract = !!(comp.escrow_account && comp.program_id);
            
            return {
                competitionId: comp.competition_id,
                tokenA: {
                    symbol: comp.token_a_symbol,
                    name: comp.token_a_name,
                    address: comp.token_a_address
                },
                tokenB: {
                    symbol: comp.token_b_symbol,
                    name: comp.token_b_name,
                    address: comp.token_b_address
                },
                status: comp.status.toLowerCase(),
                participants: comp.total_bets || 0,
                prizePool: parseFloat(comp.total_pool || 0),
                timeRemaining: calculateTimeRemaining(comp.voting_end_time, comp.end_time, comp.status),
                startTime: comp.start_time,
                votingEndTime: comp.voting_end_time,
                endTime: comp.end_time,
                hasSmartContract: hasSmartContract,
                escrowAccount: comp.escrow_account,
                programId: comp.program_id,
                isAutoCreated: comp.is_auto_created
            };
        });
        
        CompetitionState.competitions = processedCompetitions;
        CompetitionState.lastUpdate = new Date();
        
        console.log(`✅ Processed ${processedCompetitions.length} competitions with smart contract status`);
        return processedCompetitions;
        
    } catch (error) {
        console.error('❌ Error loading competitions:', error);
        showNotificationFixed('Failed to load competitions', 'error');
        return [];
    }
}

/**
 * Place bet with smart contract integration
 */
async function placeBetWithSmartContract() {
    try {
        console.log('🎯 Placing bet with smart contract integration...');
        
        // Validate inputs
        if (!CompetitionState.selectedToken || !CompetitionState.selectedCompetition) {
            showNotificationFixed('Please select a token first', 'error');
            return;
        }
        
        const betAmountInput = document.getElementById('betAmount');
        const betAmount = parseFloat(betAmountInput?.value || 0.1);
        
        if (betAmount < 0.001) {
            showNotificationFixed('Minimum bet amount is 0.001 SOL', 'error');
            return;
        }
        
        // Check wallet connection
        const walletAddress = getWalletAddress();
        if (!walletAddress) {
            showNotificationFixed('Wallet not connected', 'error');
            return;
        }

        const competition = CompetitionState.selectedCompetition;
        const useSmartContract = isSmartContractAvailable() && competition.hasSmartContract;
        
        console.log('🔗 Service mode:', useSmartContract ? 'Smart Contract' : 'Database Only');
        
        // Show loading state
        const placeBetButton = document.getElementById('placeBetButton');
        if (placeBetButton) {
            placeBetButton.disabled = true;
            placeBetButton.textContent = useSmartContract ? 'Placing bet on-chain...' : 'Placing bet...';
        }

        let transactionSignature = null;
        let onChainSuccess = false;

        // Try smart contract first if available
        if (useSmartContract) {
            try {
                console.log('📊 Attempting on-chain bet placement...');
                showNotificationFixed('Placing bet on-chain...', 'info');
                
                // Convert token choice to smart contract format
                const tokenChoice = CompetitionState.selectedToken === 'A' ? 'token_a' : 'token_b';
                
                const result = await window.smartContractService.placeBet(
                    competition.competitionId,
                    tokenChoice,
                    betAmount,
                    walletAddress
                );
                
                transactionSignature = result.signature;
                onChainSuccess = true;
                
                console.log('✅ On-chain bet placed successfully:', transactionSignature);
                showNotificationFixed('Bet placed on-chain! Saving to database...', 'success');
                
            } catch (onChainError) {
                console.error('❌ On-chain bet placement failed:', onChainError);
                
                if (window.BLOCKCHAIN_CONFIG?.FALLBACK_TO_DATABASE) {
                    console.log('🔄 Falling back to database-only bet placement...');
                    showNotificationFixed('On-chain failed, placing bet in database...', 'warning');
                } else {
                    showNotificationFixed(`On-chain bet failed: ${onChainError.message}`, 'error');
                    
                    // Reset button and exit
                    if (placeBetButton) {
                        placeBetButton.disabled = false;
                        placeBetButton.textContent = 'Place Bet';
                    }
                    return;
                }
            }
        }

        // Record bet in database
        console.log('💾 Recording bet in database...');
        
        const betData = {
            user_wallet: walletAddress,
            competition_id: competition.competitionId,
            chosen_token: `token_${CompetitionState.selectedToken.toLowerCase()}`,
            amount: betAmount,
            status: onChainSuccess ? 'PLACED' : 'PLACED',
            timestamp: new Date().toISOString()
        };

        // Add transaction signature if on-chain bet was successful
        if (transactionSignature) {
            betData.escrow_transaction_signature = transactionSignature;
        }

        try {
            const { data, error } = await CompetitionState.supabaseClient
                .from('bets')
                .insert([betData])
                .select();

            if (error) {
                throw error;
            }

            console.log('✅ Bet saved to database:', data);

            // Update competition stats
            await updateCompetitionStats(competition.competitionId, betAmount);

            // Show success message
            const successMessage = onChainSuccess 
                ? 'Bet placed successfully on-chain and recorded!'
                : 'Bet placed successfully!';
            
            showNotificationFixed(successMessage, 'success');

            // Close modal and refresh
            closeCompetitionModal();
            await loadActiveCompetitionsFixed();
            updateCompetitionsDisplayFixed();

        } catch (dbError) {
            console.error('❌ Database bet recording failed:', dbError);
            
            if (onChainSuccess) {
                showNotificationFixed('Bet placed on-chain but database update failed. Contact support.', 'warning');
            } else {
                showNotificationFixed(`Bet placement failed: ${dbError.message}`, 'error');
            }
        }

    } catch (error) {
        console.error('❌ Error in placeBetWithSmartContract:', error);
        showNotificationFixed(`Bet placement error: ${error.message}`, 'error');
        
    } finally {
        // Reset button state
        const placeBetButton = document.getElementById('placeBetButton');
        if (placeBetButton) {
            placeBetButton.disabled = false;
            placeBetButton.textContent = 'Place Bet';
        }
    }
}

/**
 * Withdraw winnings with smart contract integration
 */
async function withdrawWinningsWithSmartContract(competitionId) {
    try {
        console.log('💸 Withdrawing winnings with smart contract integration...');
        
        const walletAddress = getWalletAddress();
        if (!walletAddress) {
            showNotificationFixed('Wallet not connected', 'error');
            return;
        }

        // Get competition details
        const competition = CompetitionState.competitions.find(c => c.competitionId === competitionId);
        if (!competition) {
            showNotificationFixed('Competition not found', 'error');
            return;
        }

        const useSmartContract = isSmartContractAvailable() && competition.hasSmartContract;
        
        console.log('💰 Withdrawal mode:', useSmartContract ? 'Smart Contract' : 'Database Only');
        
        showNotificationFixed('Processing withdrawal...', 'info');

        if (useSmartContract) {
            try {
                console.log('📊 Attempting on-chain withdrawal...');
                
                const result = await window.smartContractService.withdrawWinnings(
                    competitionId,
                    walletAddress
                );
                
                console.log('✅ On-chain withdrawal successful:', result.signature);
                
                // Update database to mark as withdrawn
                await CompetitionState.supabaseClient
                    .from('bets')
                    .update({
                        is_withdrawn: true,
                        withdraw_transaction_signature: result.signature,
                        status: 'WITHDRAWN'
                    })
                    .eq('competition_id', competitionId)
                    .eq('user_wallet', walletAddress);

                showNotificationFixed('Winnings withdrawn successfully from smart contract!', 'success');
                
            } catch (withdrawError) {
                console.error('❌ Smart contract withdrawal failed:', withdrawError);
                showNotificationFixed(`Withdrawal failed: ${withdrawError.message}`, 'error');
                return;
            }
        } else {
            // Database-only withdrawal (for testing/fallback)
            console.log('🗄️ Processing database withdrawal...');
            
            const { error } = await CompetitionState.supabaseClient
                .from('bets')
                .update({
                    is_withdrawn: true,
                    status: 'WITHDRAWN'
                })
                .eq('competition_id', competitionId)
                .eq('user_wallet', walletAddress);

            if (error) {
                throw error;
            }

            showNotificationFixed('Withdrawal processed successfully!', 'success');
        }

        // Refresh portfolio
        if (currentPage === 'portfolio') {
            await loadUserPortfolio();
        }

    } catch (error) {
        console.error('❌ Error in withdrawal:', error);
        showNotificationFixed(`Withdrawal error: ${error.message}`, 'error');
    }
}

/**
 * Create competition card with smart contract status indicator
 */
function createCompetitionCardWithSmartContract(competition) {
    const smartContractBadge = competition.hasSmartContract 
        ? '<span class="smart-contract-badge">🔗 On-Chain</span>'
        : '<span class="database-badge">🗄️ Database</span>';

    const statusClass = getStatusClass(competition.status);
    const timeDisplay = formatTimeRemaining(competition.timeRemaining);
    
    return `
        <div class="competition-card ${statusClass}" onclick="openCompetitionModalFixed('${competition.competitionId}')">
            <div class="competition-header">
                <div class="vs-display">
                    <span class="token-symbol">${competition.tokenA.symbol}</span>
                    <span class="vs-text">vs</span>
                    <span class="token-symbol">${competition.tokenB.symbol}</span>
                </div>
                ${smartContractBadge}
            </div>
            
            <div class="competition-stats">
                <div class="stat">
                    <div class="stat-label">Prize Pool</div>
                    <div class="stat-value">${competition.prizePool.toFixed(1)} SOL</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Participants</div>
                    <div class="stat-value">${competition.participants}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Time Remaining</div>
                    <div class="stat-value">${timeDisplay}</div>
                </div>
            </div>
            
            <div class="competition-status">
                <span class="status-indicator ${competition.status}">${competition.status.toUpperCase()}</span>
            </div>
        </div>
    `;
}

// =============================================================================
// STANDARD COMPETITION FUNCTIONS (Updated)
// =============================================================================

async function updateCompetitionStats(competitionId, betAmount) {
    try {
        const { error } = await CompetitionState.supabaseClient
            .from('competitions')
            .update({
                total_pool: CompetitionState.supabaseClient.sql`total_pool + ${betAmount}`,
                total_bets: CompetitionState.supabaseClient.sql`total_bets + 1`,
                updated_at: new Date().toISOString()
            })
            .eq('competition_id', competitionId);

        if (error) {
            console.error('❌ Error updating competition stats:', error);
        }
    } catch (error) {
        console.error('❌ Error in updateCompetitionStats:', error);
    }
}

function updateCompetitionsDisplayFixed() {
    console.log('🎨 Updating competitions display...');
    
    try {
        const container = document.getElementById('competitionsContainer');
        if (!container) {
            console.warn('⚠️ Competitions container not found');
            return;
        }
        
        if (!CompetitionState.competitions || CompetitionState.competitions.length === 0) {
            container.innerHTML = `
                <div class="no-competitions">
                    <h3>No Active Competitions</h3>
                    <p>Check back soon for new trading competitions!</p>
                </div>
            `;
            return;
        }
        
        const competitionsHTML = CompetitionState.competitions
            .map(comp => createCompetitionCardWithSmartContract(comp))
            .join('');
        
        container.innerHTML = competitionsHTML;
        
        console.log(`✅ Updated display with ${CompetitionState.competitions.length} competitions`);
        
    } catch (error) {
        console.error('❌ Error updating competitions display:', error);
    }
}

function openCompetitionModalFixed(competitionId) {
    console.log('🎯 Opening competition modal:', competitionId);
    
    try {
        const competition = CompetitionState.competitions.find(c => c.competitionId === competitionId);
        if (!competition) {
            console.error('❌ Competition not found:', competitionId);
            return;
        }
        
        CompetitionState.selectedCompetition = competition;
        CompetitionState.selectedToken = null;
        
        const modal = document.getElementById('competitionModal');
        if (!modal) {
            console.error('❌ Competition modal not found');
            return;
        }
        
        updateModalContent(competition);
        modal.style.display = 'flex';
        UIState.modalsOpen.push('competition');
        
        console.log('✅ Competition modal opened');
        
    } catch (error) {
        console.error('❌ Error opening competition modal:', error);
    }
}

function updateModalContent(competition) {
    try {
        // Update title with smart contract indicator
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            const smartContractIndicator = competition.hasSmartContract ? ' 🔗' : ' 🗄️';
            modalTitle.textContent = isWalletConnected() ? 
                'Place Your Prediction' + smartContractIndicator : 
                'Competition Details' + smartContractIndicator;
        }
        
        // Update token displays
        updateModalTokenDisplay('A', competition.tokenA);
        updateModalTokenDisplay('B', competition.tokenB);
        
        // Update stats
        const updateStat = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateStat('modalParticipants', competition.participants);
        updateStat('modalPrizePool', `${competition.prizePool.toFixed(1)} SOL`);
        updateStat('modalTimeRemaining', formatTimeRemaining(competition.timeRemaining));
        
        // Show/hide betting interface based on wallet connection and competition status
        const bettingInterface = document.getElementById('bettingInterface');
        if (bettingInterface) {
            if (competition.status === 'voting' && isWalletConnected()) {
                bettingInterface.style.display = 'block';
                setupBettingInterface(competition);
            } else {
                bettingInterface.style.display = 'none';
            }
        }
        
        // Show smart contract status
        const smartContractStatus = document.getElementById('smartContractStatus');
        if (smartContractStatus) {
            if (competition.hasSmartContract) {
                smartContractStatus.innerHTML = `
                    <div class="smart-contract-info">
                        <span class="status-badge on-chain">🔗 On-Chain Competition</span>
                        <small>Bets are placed directly on the Solana blockchain for maximum security</small>
                    </div>
                `;
            } else {
                smartContractStatus.innerHTML = `
                    <div class="smart-contract-info">
                        <span class="status-badge database">🗄️ Database Competition</span>
                        <small>This competition uses database-only betting</small>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('❌ Error updating modal content:', error);
    }
}

function setupBettingInterface(competition) {
    try {
        // Reset button states
        document.querySelectorAll('.token-choice-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Update bet amount with minimum from config
        const betAmountInput = document.getElementById('betAmount');
        if (betAmountInput) {
            const minBet = window.BLOCKCHAIN_CONFIG?.ESCROW_SETTINGS?.MIN_BET_AMOUNT || 0.001;
            betAmountInput.min = minBet;
            betAmountInput.value = Math.max(parseFloat(betAmountInput.value) || 0.1, minBet);
        }
        
        // Update place bet button
        const placeBetButton = document.getElementById('placeBetButton');
        if (placeBetButton) {
            placeBetButton.disabled = true;
            placeBetButton.textContent = 'Select a Token';
            
            // Set the click handler to use smart contract integration
            placeBetButton.onclick = placeBetWithSmartContract;
        }
        
    } catch (error) {
        console.error('❌ Error setting up betting interface:', error);
    }
}

function selectTokenFixed(token) {
    console.log('🎯 Token selected:', token);
    
    try {
        CompetitionState.selectedToken = token;
        
        // Update UI
        document.querySelectorAll('.token-choice-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        const selectedButton = document.getElementById(`choiceToken${token}`);
        if (selectedButton) {
            selectedButton.classList.add('selected');
        }
        
        // Enable place bet button
        const placeBetButton = document.getElementById('placeBetButton');
        if (placeBetButton) {
            placeBetButton.disabled = false;
            
            const useSmartContract = isSmartContractAvailable() && 
                                   CompetitionState.selectedCompetition?.hasSmartContract;
            
            placeBetButton.textContent = useSmartContract ? 'Place Bet (On-Chain)' : 'Place Bet';
        }
        
    } catch (error) {
        console.error('❌ Error selecting token:', error);
    }
}

// =============================================================================
// PORTFOLIO MANAGEMENT
// =============================================================================

async function loadUserPortfolio() {
    try {
        const walletAddress = getWalletAddress();
        if (!walletAddress) {
            return [];
        }

        console.log('📊 Loading user portfolio...');

        const { data, error } = await CompetitionState.supabaseClient
            .from('bets')
            .select(`
                *,
                competitions (
                    competition_id,
                    token_a_symbol,
                    token_b_symbol,
                    status,
                    winning_token,
                    end_time,
                    escrow_account
                )
            `)
            .eq('user_wallet', walletAddress)
            .order('timestamp', { ascending: false });

        if (error) {
            throw error;
        }

        console.log(`✅ Loaded ${data?.length || 0} bets for user`);
        return data || [];

    } catch (error) {
        console.error('❌ Error loading user portfolio:', error);
        return [];
    }
}

// =============================================================================
// UI MANAGEMENT
// =============================================================================

function showPageFixed(page) {
    console.log('📄 Showing page:', page);
    
    try {
        currentPage = page;
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.style.display = 'none';
        });
        
        // Show target page
        const targetPage = document.getElementById(`${page}Page`);
        if (targetPage) {
            targetPage.style.display = 'block';
        }
        
        // Update navigation
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeNavButton = document.querySelector(`[data-page="${page}"]`);
        if (activeNavButton) {
            activeNavButton.classList.add('active');
        }
        
        // Load page-specific content
        loadPageContent(page);
        
    } catch (error) {
        console.error('❌ Error showing page:', error);
    }
}

async function loadPageContent(page) {
    try {
        switch (page) {
            case 'markets':
                await loadActiveCompetitionsFixed();
                updateCompetitionsDisplayFixed();
                break;
                
            case 'portfolio':
                if (isWalletConnected()) {
                    const portfolio = await loadUserPortfolio();
                    updatePortfolioDisplay(portfolio);
                } else {
                    showWalletRequiredMessage();
                }
                break;
                
            case 'leaderboard':
                await loadLeaderboard();
                break;
        }
    } catch (error) {
        console.error('❌ Error loading page content:', error);
    }
}

function showNotificationFixed(message, type = 'info') {
    console.log(`📢 Notification (${type}):`, message);
    
    try {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add to container
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Auto-remove after delay
        const duration = window.UI_CONFIG?.NOTIFICATION_DURATION || 5000;
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
        
    } catch (error) {
        console.error('❌ Error showing notification:', error);
    }
}

// =============================================================================
// WALLET MODAL INTEGRATION
// =============================================================================

function openWalletModal() {
    try {
        const modal = document.getElementById('walletModal');
        if (modal) {
            modal.style.display = 'flex';
            UIState.modalsOpen.push('wallet');
        }
    } catch (error) {
        console.error('❌ Error opening wallet modal:', error);
    }
}

function closeWalletModal() {
    try {
        const modal = document.getElementById('walletModal');
        if (modal) {
            modal.style.display = 'none';
            UIState.modalsOpen = UIState.modalsOpen.filter(m => m !== 'wallet');
        }
    } catch (error) {
        console.error('❌ Error closing wallet modal:', error);
    }
}

async function connectWallet(walletType) {
    try {
        console.log(`🔗 Connecting to ${walletType} wallet...`);
        
        if (!walletService) {
            showNotificationFixed('Wallet service not available', 'error');
            return;
        }
        
        const result = await walletService.connectWallet(walletType);
        
        if (result.success) {
            closeWalletModal();
            showNotificationFixed(`Connected to ${walletType} wallet!`, 'success');
        } else {
            showNotificationFixed(`Failed to connect: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error connecting wallet:', error);
        showNotificationFixed('Wallet connection failed', 'error');
    }
}

async function disconnectWallet() {
    try {
        if (walletService) {
            await walletService.disconnectWallet();
        }
        showNotificationFixed('Wallet disconnected', 'info');
    } catch (error) {
        console.error('❌ Error disconnecting wallet:', error);
    }
}

// =============================================================================
// UI UPDATE FUNCTIONS
// =============================================================================

function updateConnectionDisplay() {
    try {
        const walletInfo = document.getElementById('walletInfo');
        const connectButton = document.getElementById('connectWalletButton');
        
        if (isWalletConnected()) {
            if (walletInfo) {
                const shortAddress = `${connectedUser.wallet.slice(0, 4)}...${connectedUser.wallet.slice(-4)}`;
                const smartContractStatus = isSmartContractAvailable() ? '🔗' : '🗄️';
                walletInfo.innerHTML = `
                    <span class="wallet-address">${smartContractStatus} ${shortAddress}</span>
                    <span class="wallet-balance">${connectedUser.balance?.toFixed(3) || '0.000'} SOL</span>
                `;
                walletInfo.style.display = 'block';
            }
            
            if (connectButton) {
                connectButton.style.display = 'none';
            }
        } else {
            if (walletInfo) {
                walletInfo.style.display = 'none';
            }
            
            if (connectButton) {
                connectButton.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('❌ Error updating connection display:', error);
    }
}

function updateTraderDisplay() {
    // Implementation for trader profile display
    // This would update any trader-specific UI elements
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function closeCompetitionModal() {
    try {
        const modal = document.getElementById('competitionModal');
        if (modal) {
            modal.style.display = 'none';
            UIState.modalsOpen = UIState.modalsOpen.filter(m => m !== 'competition');
        }
        
        // Reset state
        CompetitionState.selectedCompetition = null;
        CompetitionState.selectedToken = null;
    } catch (error) {
        console.error('❌ Error closing competition modal:', error);
    }
}

function updateModalTokenDisplay(token, tokenData) {
    try {
        const symbolElement = document.getElementById(`modalToken${token}Symbol`);
        const nameElement = document.getElementById(`modalToken${token}Name`);
        
        if (symbolElement) symbolElement.textContent = tokenData.symbol;
        if (nameElement) nameElement.textContent = tokenData.name;
    } catch (error) {
        console.error('❌ Error updating token display:', error);
    }
}

function calculateTimeRemaining(votingEndTime, endTime, status) {
    // Implementation for time calculation
    const now = new Date();
    const target = status === 'voting' ? new Date(votingEndTime) : new Date(endTime);
    const diff = target.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
}

function formatTimeRemaining(timeRemaining) {
    return timeRemaining || 'Calculating...';
}

function getStatusClass(status) {
    return `status-${status}`;
}

async function refreshCurrentPage() {
    await loadPageContent(currentPage);
}

// =============================================================================
// INITIALIZATION
// =============================================================================

async function initializeApp() {
    console.log('🚀 Initializing TokenWars App...');
    
    try {
        // Initialize Supabase client
        if (window.getSupabase) {
            CompetitionState.supabaseClient = window.getSupabase();
            console.log('✅ Supabase client initialized');
        }
        
        // Initialize wallet integration
        await initializeWalletIntegration();
        
        // Initialize smart contract service status
        if (window.smartContractService) {
            const status = window.smartContractService.getServiceStatus();
            console.log('🔗 Smart Contract Service Status:', status);
        }
        
        // Load initial page
        showPageFixed(window.NAVIGATION_CONFIG?.DEFAULT_SECTION || 'markets');
        
        // Update connection display
        updateConnectionDisplay();
        
        // Set up auto-refresh
        setupAutoRefresh();
        
        servicesReady = true;
        console.log('✅ TokenWars App initialized successfully!');
        console.log('🎯 Smart Contract Integration:', isSmartContractAvailable() ? 'ENABLED' : 'DISABLED');
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        showNotificationFixed('Failed to initialize app', 'error');
    }
}

function setupAutoRefresh() {
    // Auto-refresh competitions every 30 seconds
    setInterval(async () => {
        if (currentPage === 'markets' && servicesReady) {
            await loadActiveCompetitionsFixed();
            updateCompetitionsDisplayFixed();
        }
    }, 30000);
}

// =============================================================================
// GLOBAL EXPORTS
// =============================================================================

// Export functions for HTML integration
window.showPage = showPageFixed;
window.openWalletModal = openWalletModal;
window.closeWalletModal = closeWalletModal;
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.openCompetitionModal = openCompetitionModalFixed;
window.closeCompetitionModal = closeCompetitionModal;
window.selectToken = selectTokenFixed;
window.placeBet = placeBetWithSmartContract;
window.withdrawWinnings = withdrawWinningsWithSmartContract;

// Export app object
window.app = {
    showPage: showPageFixed,
    navigateToPage: (page) => showPageFixed(page),
    getCurrentPage: () => currentPage,
    getCurrentUser: () => connectedUser,
    getWalletService: () => walletService,
    isWalletConnected,
    showNotification: showNotificationFixed,
    getServicesReady: () => servicesReady,
    isSmartContractAvailable,
    getActiveCompetitionService
};

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    setTimeout(initializeApp, 100);
}

console.log('✅ Complete Integrated TokenWars App.js loaded!');
console.log('🔧 INTEGRATED FEATURES:');
console.log('   ✅ Smart Contract Integration with wallet bridge');
console.log('   ✅ Database fallback for reliability');
console.log('   ✅ Real-time transaction feedback');
console.log('   ✅ Multi-wallet support with blockchain capabilities');
console.log('   ✅ Competition management with on-chain escrow');
console.log('   ✅ Portfolio tracking with withdrawal support');
console.log('   ✅ Service status monitoring and fallbacks');
console.log('🚀 Ready for production blockchain betting!');
