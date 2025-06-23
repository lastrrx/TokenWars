/**
 * Competition Management Module
 * Handles competition display, betting interface, and real-time updates
 */

// Competition state
const CompetitionState = {
    competitions: [],
    activeCompetition: null,
    selectedToken: null,
    priceCharts: new Map(),
    updateInterval: null
};

/**
 * Load competitions from backend
 */
async function loadCompetitions(filter = 'all') {
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/competitions?status=${filter}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch competitions');
        }
        
        CompetitionState.competitions = await response.json();
        renderCompetitions();
        
    } catch (error) {
        console.error('Error loading competitions:', error);
        showNotification('Failed to load competitions', 'error');
    }
}

/**
 * Render competition cards
 */
function renderCompetitions() {
    const container = document.getElementById('competitions-grid');
    container.innerHTML = '';
    
    if (CompetitionState.competitions.length === 0) {
        container.innerHTML = '<div class="no-competitions">No competitions available</div>';
        return;
    }
    
    CompetitionState.competitions.forEach(competition => {
        const card = createCompetitionCard(competition);
        container.appendChild(card);
    });
    
    // Start real-time updates
    startCompetitionUpdates();
}

/**
 * Create competition card element
 */
function createCompetitionCard(competition) {
    const card = document.createElement('div');
    card.className = 'competition-card';
    card.dataset.competitionId = competition.id;
    
    // Calculate time remaining
    const timeRemaining = calculateTimeRemaining(competition.end_time);
    const status = getCompetitionStatus(competition);
    
    card.innerHTML = `
        <div class="competition-header">
            <span class="competition-id">#${competition.id}</span>
            <span class="competition-status status-${status}">${status.toUpperCase()}</span>
        </div>
        
        <div class="token-pair">
            <div class="token-info">
                <div class="token-symbol">${competition.token_a_symbol}</div>
                <div class="token-price">$${formatPrice(competition.token_a_price)}</div>
            </div>
            
            <div class="vs-divider">VS</div>
            
            <div class="token-info">
                <div class="token-symbol">${competition.token_b_symbol}</div>
                <div class="token-price">$${formatPrice(competition.token_b_price)}</div>
            </div>
        </div>
        
        <div class="competition-stats">
            <div class="stat">
                <div class="stat-label">Time Remaining</div>
                <div class="stat-value countdown" data-end-time="${competition.end_time}">
                    ${timeRemaining}
                </div>
            </div>
            <div class="stat">
                <div class="stat-label">Total Pool</div>
                <div class="stat-value">${competition.total_pool} SOL</div>
            </div>
        </div>
        
        <button class="btn btn-primary view-competition" onclick="viewCompetition('${competition.id}')">
            ${status === 'active' ? 'Place Bet' : 'View Details'}
        </button>
    `;
    
    return card;
}

/**
 * View competition details
 */
async function viewCompetition(competitionId) {
    try {
        // Fetch detailed competition data
        const response = await fetch(`${AppState.apiBaseUrl}/competitions/${competitionId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch competition details');
        }
        
        CompetitionState.activeCompetition = await response.json();
        
        // Show modal with competition details
        showCompetitionModal();
        
    } catch (error) {
        console.error('Error loading competition:', error);
        showNotification('Failed to load competition details', 'error');
    }
}

/**
 * Show competition modal
 */
function showCompetitionModal() {
    const modal = document.getElementById('competition-modal');
    const modalBody = document.getElementById('modal-body');
    const competition = CompetitionState.activeCompetition;
    
    // TODO: Fetch user's bet if exists
    const userBet = null; // Will be fetched from backend
    
    modalBody.innerHTML = `
        <h2>Competition #${competition.id}</h2>
        
        <div class="competition-details">
            <div class="detail-row">
                <span class="label">Start Time:</span>
                <span class="value">${formatDate(competition.start_time)}</span>
            </div>
            <div class="detail-row">
                <span class="label">End Time:</span>
                <span class="value">${formatDate(competition.end_time)}</span>
            </div>
            <div class="detail-row">
                <span class="label">Total Pool:</span>
                <span class="value">${competition.total_pool} SOL</span>
            </div>
            <div class="detail-row">
                <span class="label">Participants:</span>
                <span class="value">${competition.participant_count}</span>
            </div>
        </div>
        
        <div class="token-comparison">
            <div class="token-detail">
                <h3>${competition.token_a_symbol}</h3>
                <div class="token-stats">
                    <p>Current Price: $${formatPrice(competition.token_a_price)}</p>
                    <p>24h Change: ${formatPercentage(competition.token_a_change_24h)}</p>
                    <p>Market Cap: $${formatLargeNumber(competition.token_a_market_cap)}</p>
                </div>
                <div class="chart-container" id="chart-token-a"></div>
            </div>
            
            <div class="token-detail">
                <h3>${competition.token_b_symbol}</h3>
                <div class="token-stats">
                    <p>Current Price: $${formatPrice(competition.token_b_price)}</p>
                    <p>24h Change: ${formatPercentage(competition.token_b_change_24h)}</p>
                    <p>Market Cap: $${formatLargeNumber(competition.token_b_market_cap)}</p>
                </div>
                <div class="chart-container" id="chart-token-b"></div>
            </div>
        </div>
        
        ${competition.status === 'active' && !userBet ? renderBettingForm() : ''}
        ${userBet ? renderUserBet(userBet) : ''}
        ${competition.status === 'completed' ? renderCompetitionResults() : ''}
    `;
    
    modal.classList.remove('hidden');
    
    // Initialize price charts if competition is active
    if (competition.status === 'active') {
        initializePriceCharts();
    }
}

/**
 * Render betting form
 */
function renderBettingForm() {
    const competition = CompetitionState.activeCompetition;
    
    return `
        <div class="betting-form">
            <h3>Place Your Bet</h3>
            
            <div class="token-selection">
                <div class="token-option" data-token="A" onclick="selectToken('A')">
                    <h4>${competition.token_a_symbol}</h4>
                    <p>Select this token</p>
                </div>
                
                <div class="token-option" data-token="B" onclick="selectToken('B')">
                    <h4>${competition.token_b_symbol}</h4>
                    <p>Select this token</p>
                </div>
            </div>
            
            <div class="bet-amount-display">
                <p>Bet Amount</p>
                <p class="amount">0.1 SOL</p>
                <p class="usd-value">≈ $${(0.1 * 150).toFixed(2)} USD</p>
            </div>
            
            <button class="btn btn-primary bet-submit" onclick="submitBet()" disabled>
                Select a Token to Continue
            </button>
            
            <p class="bet-warning">
                By placing a bet, you agree that all bets are final and cannot be cancelled.
            </p>
        </div>
    `;
}

/**
 * Select token for betting
 */
function selectToken(token) {
    CompetitionState.selectedToken = token;
    
    // Update UI
    document.querySelectorAll('.token-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    document.querySelector(`[data-token="${token}"]`).classList.add('selected');
    
    // Enable submit button
    const submitBtn = document.querySelector('.bet-submit');
    submitBtn.disabled = false;
    submitBtn.textContent = `Bet on ${token === 'A' ? CompetitionState.activeCompetition.token_a_symbol : CompetitionState.activeCompetition.token_b_symbol}`;
}

/**
 * Submit bet
 */
async function submitBet() {
    if (!AppState.wallet) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    if (!CompetitionState.selectedToken) {
        showNotification('Please select a token', 'error');
        return;
    }
    
    // Check wallet balance
    if (AppState.balance < 0.1) {
        showNotification('Insufficient balance. You need at least 0.1 SOL', 'error');
        return;
    }
    
    try {
        // Disable submit button
        const submitBtn = document.querySelector('.bet-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        // TODO: Create and sign transaction
        // 1. Call backend to prepare transaction
        // 2. Sign transaction with wallet
        // 3. Send transaction to blockchain
        // 4. Confirm transaction
        
        // Mock transaction for now
        showNotification('Preparing transaction...', 'info');
        
        // Simulate transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showNotification('Bet placed successfully!', 'success');
        
        // Refresh competition data
        await viewCompetition(CompetitionState.activeCompetition.id);
        
    } catch (error) {
        console.error('Betting error:', error);
        showNotification('Failed to place bet. Please try again.', 'error');
        
        // Re-enable button
        const submitBtn = document.querySelector('.bet-submit');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Try Again';
    }
}

/**
 * Initialize price charts
 */
function initializePriceCharts() {
    // TODO: Implement Chart.js integration
    // Fetch historical price data
    // Create line charts for both tokens
    // Update charts in real-time
    
    console.log('TODO: Initialize price charts');
}

/**
 * Calculate time remaining
 */
function calculateTimeRemaining(endTime) {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) {
        return 'Ended';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
}

/**
 * Get competition status
 */
function getCompetitionStatus(competition) {
    const now = new Date();
    const start = new Date(competition.start_time);
    const end = new Date(competition.end_time);
    
    if (now < start) return 'upcoming';
    if (now >= start && now < end) return 'active';
    return 'completed';
}

/**
 * Start real-time competition updates
 */
function startCompetitionUpdates() {
    // Clear existing interval
    if (CompetitionState.updateInterval) {
        clearInterval(CompetitionState.updateInterval);
    }
    
    // Update countdowns every minute
    CompetitionState.updateInterval = setInterval(() => {
        updateCountdowns();
    }, 60000);
    
    // Initial update
    updateCountdowns();
}

/**
 * Update countdown timers
 */
function updateCountdowns() {
    document.querySelectorAll('.countdown').forEach(element => {
        const endTime = element.dataset.endTime;
        element.textContent = calculateTimeRemaining(endTime);
    });
}

/**
 * Set up competition filters
 */
document.getElementById('filter-status')?.addEventListener('change', (e) => {
    loadCompetitions(e.target.value);
});

document.getElementById('sort-by')?.addEventListener('change', (e) => {
    // TODO: Implement sorting logic
    console.log('Sort by:', e.target.value);
});

// Export functions for global access
window.loadCompetitions = loadCompetitions;
window.viewCompetition = viewCompetition;
window.selectToken = selectToken;
window.submitBet = submitBet;

// TODO: Implement WebSocket connection for real-time updates
// TODO: Add price chart integration
// TODO: Implement transaction signing with Solana wallet
// TODO: Add bet history tracking
// TODO: Implement TWAP price calculation display
