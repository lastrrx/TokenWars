/**
 * Competition Management Module - Merged Version
 * Combines rich UI from our version with technical foundation from co-dev version
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
 * Load competitions from backend or generate mock data
 */
async function loadCompetitions(filter = 'all') {
    try {
        // Try to fetch from API first
        const response = await fetch(`${AppState.apiBaseUrl}/competitions?status=${filter}`);
        
        if (response.ok) {
            CompetitionState.competitions = await response.json();
        } else {
            // Use mock data for demo
            CompetitionState.competitions = generateMockCompetitions();
        }
        
        renderCompetitions();
        startCompetitionUpdates();
        
    } catch (error) {
        console.error('Error loading competitions:', error);
        // Fall back to mock data
        CompetitionState.competitions = generateMockCompetitions();
        renderCompetitions();
        startCompetitionUpdates();
    }
}

/**
 * Generate mock competitions for demo (from our version)
 */
function generateMockCompetitions() {
    const tokens = [
        { symbol: 'BONK', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/23095.png', marketCap: 2100000000, price: 0.00002134, change24h: 12.4 },
        { symbol: 'WIF', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28752.png', marketCap: 1950000000, price: 2.34, change24h: -3.2 },
        { symbol: 'JUP', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29210.png', marketCap: 1500000000, price: 1.12, change24h: 8.7 },
        { symbol: 'PYTH', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28177.png', marketCap: 1450000000, price: 0.43, change24h: 5.2 },
        { symbol: 'ORCA', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11165.png', marketCap: 890000000, price: 3.21, change24h: -1.8 },
        { symbol: 'RAY', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/8526.png', marketCap: 920000000, price: 1.89, change24h: 4.5 }
    ];
    
    const competitions = [];
    
    for (let i = 0; i < tokens.length - 1; i += 2) {
        const tokenA = tokens[i];
        const tokenB = tokens[i + 1];
        
        const totalParticipants = Math.floor(Math.random() * 200) + 50;
        const tokenABets = Math.floor(Math.random() * totalParticipants);
        const tokenBBets = totalParticipants - tokenABets;
        
        competitions.push({
            id: `COMP-${Date.now()}-${i}`,
            token_a_symbol: tokenA.symbol,
            token_a_logo: tokenA.logo,
            token_a_price: tokenA.price,
            token_a_market_cap: tokenA.marketCap,
            token_a_change_24h: tokenA.change24h,
            token_b_symbol: tokenB.symbol,
            token_b_logo: tokenB.logo,
            token_b_price: tokenB.price,
            token_b_market_cap: tokenB.marketCap,
            token_b_change_24h: tokenB.change24h,
            status: 'active',
            total_pool: (totalParticipants * 0.1).toFixed(1),
            participant_count: totalParticipants,
            token_a_bets: tokenABets,
            token_b_bets: tokenBBets,
            token_a_percentage: Math.round((tokenABets / totalParticipants) * 100),
            token_b_percentage: Math.round((tokenBBets / totalParticipants) * 100),
            entry_fee: 0.1,
            start_time: new Date(Date.now() - (Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
            end_time: new Date(Date.now() + (Math.random() * 24 * 60 * 60 * 1000)).toISOString()
        });
    }
    
    return competitions;
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
}

/**
 * Create competition card element - enhanced from our version
 */
function createCompetitionCard(competition) {
    const card = document.createElement('div');
    card.className = 'competition-card';
    card.dataset.competitionId = competition.id;
    
    const timeRemaining = calculateTimeRemaining(competition.end_time);
    const status = getCompetitionStatus(competition);
    
    card.innerHTML = `
        <div class="competition-header">
            <span class="competition-id">#${competition.id.slice(-4)}</span>
            <span class="status-indicator ${status}">
                ${status.toUpperCase()}
            </span>
        </div>
        
        <div class="token-battle-display">
            <div class="token-card">
                <img src="${competition.token_a_logo}" class="token-logo" alt="${competition.token_a_symbol}">
                <div class="token-symbol">${competition.token_a_symbol}</div>
                <div class="token-price">${formatTokenPrice(competition.token_a_price)}</div>
            </div>
            
            <div class="vs-separator">
                <div class="vs-text">VS</div>
                <div class="competition-timer" data-end="${competition.end_time}">
                    ${timeRemaining}
                </div>
            </div>
            
            <div class="token-card">
                <img src="${competition.token_b_logo}" class="token-logo" alt="${competition.token_b_symbol}">
                <div class="token-symbol">${competition.token_b_symbol}</div>
                <div class="token-price">${formatTokenPrice(competition.token_b_price)}</div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${competition.total_pool} SOL</div>
                <div class="stat-label">Prize Pool</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${competition.participant_count}</div>
                <div class="stat-label">Players</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${competition.entry_fee} SOL</div>
                <div class="stat-label">Entry</div>
            </div>
        </div>
        
        <div class="betting-progress">
            <div class="progress-side token-a" style="width: ${competition.token_a_percentage}%">
                ${competition.token_a_percentage}%
            </div>
            <div class="progress-side token-b" style="width: ${competition.token_b_percentage}%">
                ${competition.token_b_percentage}%
            </div>
        </div>
        
        <button class="btn-place-bet" onclick="viewCompetition('${competition.id}')">
            ${status === 'active' ? 'Place Prediction' : 'View Details'}
        </button>
    `;
    
    return card;
}

/**
 * View competition details
 */
async function viewCompetition(competitionId) {
    try {
        // Find competition in state
        CompetitionState.activeCompetition = CompetitionState.competitions.find(c => c.id === competitionId);
        
        if (!CompetitionState.activeCompetition) {
            // Try to fetch from API
            const response = await fetch(`${AppState.apiBaseUrl}/competitions/${competitionId}`);
            if (response.ok) {
                CompetitionState.activeCompetition = await response.json();
            } else {
                throw new Error('Competition not found');
            }
        }
        
        // Show modal with competition details
        showCompetitionModal();
        
    } catch (error) {
        console.error('Error loading competition:', error);
        showNotification('Failed to load competition details', 'error');
    }
}

/**
 * Show competition modal - enhanced version
 */
function showCompetitionModal() {
    const modal = document.getElementById('competition-modal');
    const modalBody = document.getElementById('modal-body');
    const competition = CompetitionState.activeCompetition;
    
    CompetitionState.selectedToken = null;
    
    modalBody.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">Competition #${competition.id.slice(-4)}</h2>
        </div>
        
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
                <img src="${competition.token_a_logo}" class="token-logo" alt="${competition.token_a_symbol}">
                <h3>${competition.token_a_symbol}</h3>
                <div class="token-stats">
                    <p>Current Price: ${formatTokenPrice(competition.token_a_price)}</p>
                    <p>24h Change: ${formatPercentage(competition.token_a_change_24h)}</p>
                    <p>Market Cap: ${formatLargeNumber(competition.token_a_market_cap)}</p>
                </div>
                <div class="chart-container" id="chart-token-a"></div>
            </div>
            
            <div class="token-detail">
                <img src="${competition.token_b_logo}" class="token-logo" alt="${competition.token_b_symbol}">
                <h3>${competition.token_b_symbol}</h3>
                <div class="token-stats">
                    <p>Current Price: ${formatTokenPrice(competition.token_b_price)}</p>
                    <p>24h Change: ${formatPercentage(competition.token_b_change_24h)}</p>
                    <p>Market Cap: ${formatLargeNumber(competition.token_b_market_cap)}</p>
                </div>
                <div class="chart-container" id="chart-token-b"></div>
            </div>
        </div>
        
        ${competition.status === 'active' && AppState.isConnected ? renderBettingForm() : ''}
        ${!AppState.isConnected && competition.status === 'active' ? '<p class="text-center">Please connect your wallet to place predictions</p>' : ''}
        ${competition.status === 'completed' ? renderCompetitionResults() : ''}
        
        <div class="risk-disclaimer">
            <p>⚠️ Predictions involve risk. Only participate with funds you can afford to lose. Past performance does not guarantee future results.</p>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Initialize price charts if competition is active
    if (competition.status === 'active') {
        setTimeout(() => initializePriceCharts(), 100);
    }
}

/**
 * Render betting form - from our enhanced version
 */
function renderBettingForm() {
    const competition = CompetitionState.activeCompetition;
    
    return `
        <div class="betting-form">
            <h3>Place Your Prediction</h3>
            
            <div class="token-selection">
                <div class="token-option" id="tokenOptionA" data-token="A" onclick="selectToken('A')">
                    <img src="${competition.token_a_logo}" class="token-logo">
                    <h4>${competition.token_a_symbol}</h4>
                    <div class="token-metrics">
                        <span class="metric">Backed by ${competition.token_a_percentage}%</span>
                    </div>
                    <div class="selection-indicator">SELECT</div>
                </div>
                
                <div class="token-option" id="tokenOptionB" data-token="B" onclick="selectToken('B')">
                    <img src="${competition.token_b_logo}" class="token-logo">
                    <h4>${competition.token_b_symbol}</h4>
                    <div class="token-metrics">
                        <span class="metric">Backed by ${competition.token_b_percentage}%</span>
                    </div>
                    <div class="selection-indicator">SELECT</div>
                </div>
            </div>
            
            <div class="prediction-details" id="predictionDetails" style="display: none;">
                <div class="detail-row">
                    <span>Entry Fee:</span>
                    <span class="detail-value">0.1 SOL</span>
                </div>
                <div class="detail-row">
                    <span>Current Pool:</span>
                    <span class="detail-value">${competition.total_pool} SOL</span>
                </div>
                <div class="detail-row">
                    <span>Your Side:</span>
                    <span class="detail-value" id="yourSide">Not Selected</span>
                </div>
                <div class="detail-row highlight">
                    <span>Potential Win:</span>
                    <span class="detail-value" id="potentialWin">-- SOL</span>
                </div>
            </div>
            
            <button class="btn btn-primary bet-submit" id="submitBetBtn" onclick="submitBet()" disabled>
                Select a Token to Continue
            </button>
        </div>
    `;
}

/**
 * Select token for betting
 */
function selectToken(token) {
    CompetitionState.selectedToken = token;
    const competition = CompetitionState.activeCompetition;
    
    // Update UI
    document.getElementById('tokenOptionA').classList.toggle('selected', token === 'A');
    document.getElementById('tokenOptionB').classList.toggle('selected', token === 'B');
    
    // Show prediction details
    document.getElementById('predictionDetails').style.display = 'block';
    
    // Update selection info
    const selectedSymbol = token === 'A' ? competition.token_a_symbol : competition.token_b_symbol;
    document.getElementById('yourSide').textContent = selectedSymbol;
    
    // Calculate potential win
    const entryFee = 0.1;
    const totalPool = parseFloat(competition.total_pool) + entryFee;
    const platformFee = totalPool * 0.15;
    const winnerPool = totalPool - platformFee;
    
    const yourSideBets = token === 'A' ? competition.token_a_bets : competition.token_b_bets;
    const estimatedWinners = yourSideBets + 1;
    const potentialWin = (winnerPool / estimatedWinners).toFixed(3);
    
    document.getElementById('potentialWin').textContent = `${potentialWin} SOL`;
    
    // Enable submit button
    const submitBtn = document.getElementById('submitBetBtn');
    submitBtn.disabled = false;
    submitBtn.textContent = `Confirm Prediction on ${selectedSymbol}`;
}

/**
 * Submit bet - enhanced with proper error handling
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
        const submitBtn = document.getElementById('submitBetBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        showNotification('Preparing transaction...', 'info');
        
        // In production, this would:
        // 1. Call backend to prepare transaction
        // 2. Sign transaction with wallet
        // 3. Send transaction to blockchain
        // 4. Confirm transaction
        
        // Simulate transaction for demo
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const competition = CompetitionState.activeCompetition;
        const selectedSymbol = CompetitionState.selectedToken === 'A' ? 
            competition.token_a_symbol : competition.token_b_symbol;
        
        showNotification(`✅ Prediction placed successfully on ${selectedSymbol}!`, 'success');
        
        // Close modal
        closeModal();
        
        // Reload competitions to show updated data
        await loadCompetitions();
        
    } catch (error) {
        console.error('Betting error:', error);
        showNotification('Failed to place bet. Please try again.', 'error');
        
        const submitBtn = document.getElementById('submitBetBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Try Again';
    }
}

/**
 * Initialize price charts using Chart.js
 */
function initializePriceCharts() {
    const competition = CompetitionState.activeCompetition;
    
    // Mock price data for demo
    const generatePriceData = () => {
        const data = [];
        const basePrice = Math.random() * 5;
        for (let i = 0; i < 24; i++) {
            data.push(basePrice + (Math.random() - 0.5) * 0.5);
        }
        return data;
    };
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: '#9CA3AF' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#9CA3AF' }
            }
        }
    };
    
    // Token A chart
    const ctxA = document.getElementById('chart-token-a');
    if (ctxA) {
        new Chart(ctxA, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}h`),
                datasets: [{
                    data: generatePriceData(),
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: chartOptions
        });
    }
    
    // Token B chart
    const ctxB = document.getElementById('chart-token-b');
    if (ctxB) {
        new Chart(ctxB, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}h`),
                datasets: [{
                    data: generatePriceData(),
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }]
            },
            options: chartOptions
        });
    }
}

/**
 * Render competition results
 */
function renderCompetitionResults() {
    // TODO: Implement results display
    return '<p class="text-center">Competition has ended. Results will be displayed here.</p>';
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
    document.querySelectorAll('.competition-timer').forEach(element => {
        const endTime = element.dataset.end;
        element.textContent = calculateTimeRemaining(endTime);
    });
}

/**
 * Format token price
 */
function formatTokenPrice(price) {
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
}

/**
 * Format percentage
 */
function formatPercentage(value) {
    const num = parseFloat(value);
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
}

/**
 * Format large number
 */
function formatLargeNumber(num) {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
}

/**
 * Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Set up competition filters
 */
document.getElementById('filter-status')?.addEventListener('change', (e) => {
    loadCompetitions(e.target.value);
});

document.getElementById('sort-by')?.addEventListener('change', (e) => {
    const sortBy = e.target.value;
    
    switch (sortBy) {
        case 'time':
            CompetitionState.competitions.sort((a, b) => 
                new Date(a.end_time) - new Date(b.end_time));
            break;
        case 'pool':
            CompetitionState.competitions.sort((a, b) => 
                parseFloat(b.total_pool) - parseFloat(a.total_pool));
            break;
        case 'participants':
            CompetitionState.competitions.sort((a, b) => 
                b.participant_count - a.participant_count);
            break;
    }
    
    renderCompetitions();
});

// Export functions for global access
window.loadCompetitions = loadCompetitions;
window.viewCompetition = viewCompetition;
window.selectToken = selectToken;
window.submitBet = submitBet;