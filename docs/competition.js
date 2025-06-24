// Competition Display and Betting Logic with Real Token Data Integration
// Enhanced with live price updates, token logos, and market data

// Global state for competitions
let activeCompetitions = [];
let competitionSubscriptions = new Map();
let priceUpdateSubscriptions = new Map();

// ==============================================
// COMPETITION DISPLAY FUNCTIONS
// ==============================================

// Display competitions in the grid with real token data
function displayCompetitions(competitions) {
    const grid = document.getElementById('competitions-grid');
    
    if (!competitions || competitions.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <div class="empty-title">No Active Competitions</div>
                <div class="empty-message">New token prediction competitions will appear here soon!</div>
                <div class="empty-submessage">Check back in a few minutes or refresh to see new opportunities.</div>
            </div>
        `;
        return;
    }
    
    activeCompetitions = competitions;
    
    const competitionsHTML = competitions.map(competition => 
        createCompetitionCard(competition)
    ).join('');
    
    grid.innerHTML = competitionsHTML;
    
    // Set up real-time updates for each competition
    competitions.forEach(competition => {
        subscribeToCompetitionUpdates(competition.competition_id);
        
        // Subscribe to price updates for both tokens
        if (competition.token_a_address) {
            subscribeToPriceUpdates(competition.token_a_address, competition.competition_id, 'token_a');
        }
        if (competition.token_b_address) {
            subscribeToPriceUpdates(competition.token_b_address, competition.competition_id, 'token_b');
        }
    });

    console.log(`Displayed ${competitions.length} competitions with real-time updates`);
}

// Create HTML for a single competition card with enhanced token data
function createCompetitionCard(competition) {
    const timeRemaining = getTimeRemaining(competition);
    const statusInfo = getCompetitionStatusInfo(competition);
    const participantCount = (competition.total_bets || 0);
    const poolSize = formatSOL(competition.total_pool || 0);
    
    // Use real token data if available, fallback to competition data
    const tokenA = {
        symbol: competition.token_a_symbol_full || competition.token_a_symbol,
        name: competition.token_a_name_full || competition.token_a_name,
        logo: competition.token_a_logo_uri || competition.token_a_logo || getDefaultTokenLogo(competition.token_a_symbol),
        price: competition.token_a_current_price || competition.token_a_start_price,
        marketCap: competition.token_a_market_cap,
        performance: competition.token_a_current_performance,
        bets: competition.token_a_bets || 0
    };
    
    const tokenB = {
        symbol: competition.token_b_symbol_full || competition.token_b_symbol,
        name: competition.token_b_name_full || competition.token_b_name,
        logo: competition.token_b_logo_uri || competition.token_b_logo || getDefaultTokenLogo(competition.token_b_symbol),
        price: competition.token_b_current_price || competition.token_b_start_price,
        marketCap: competition.token_b_market_cap,
        performance: competition.token_b_current_performance,
        bets: competition.token_b_bets || 0
    };

    return `
        <div class="competition-card" data-competition-id="${competition.competition_id}">
            <div class="competition-header">
                <div class="competition-status ${statusInfo.class}">
                    ${statusInfo.text}
                </div>
                <div class="competition-time" data-end-time="${competition.end_time}">
                    ${timeRemaining}
                </div>
            </div>
            
            <div class="token-battle-display">
                <div class="token-card" data-token="token_a" data-address="${competition.token_a_address}">
                    <img class="token-logo" src="${tokenA.logo}" alt="${tokenA.symbol}" 
                         onerror="this.src='${getDefaultTokenLogo(tokenA.symbol)}'">
                    <div class="token-info">
                        <div class="token-symbol">${tokenA.symbol}</div>
                        <div class="token-name">${truncateString(tokenA.name, 20)}</div>
                        <div class="token-price" data-price="${tokenA.price}">
                            $${formatPrice(tokenA.price)}
                        </div>
                        ${tokenA.marketCap ? `
                            <div class="token-market-cap">
                                MC: $${formatMarketCap(tokenA.marketCap)}
                            </div>
                        ` : ''}
                        ${tokenA.performance !== null && competition.status === 'ACTIVE' ? `
                            <div class="token-performance ${tokenA.performance >= 0 ? 'positive' : 'negative'}">
                                ${formatPercentage(tokenA.performance)}
                            </div>
                        ` : ''}
                    </div>
                    <div class="bet-count">
                        ${tokenA.bets} bet${tokenA.bets !== 1 ? 's' : ''}
                    </div>
                </div>
                
                <div class="vs-separator">
                    <div class="vs-text">VS</div>
                    <div class="vs-line"></div>
                    ${competition.status === 'ACTIVE' ? `
                        <div class="vs-time-remaining">
                            ${timeRemaining}
                        </div>
                    ` : ''}
                </div>
                
                <div class="token-card" data-token="token_b" data-address="${competition.token_b_address}">
                    <img class="token-logo" src="${tokenB.logo}" alt="${tokenB.symbol}" 
                         onerror="this.src='${getDefaultTokenLogo(tokenB.symbol)}'">
                    <div class="token-info">
                        <div class="token-symbol">${tokenB.symbol}</div>
                        <div class="token-name">${truncateString(tokenB.name, 20)}</div>
                        <div class="token-price" data-price="${tokenB.price}">
                            $${formatPrice(tokenB.price)}
                        </div>
                        ${tokenB.marketCap ? `
                            <div class="token-market-cap">
                                MC: $${formatMarketCap(tokenB.marketCap)}
                            </div>
                        ` : ''}
                        ${tokenB.performance !== null && competition.status === 'ACTIVE' ? `
                            <div class="token-performance ${tokenB.performance >= 0 ? 'positive' : 'negative'}">
                                ${formatPercentage(tokenB.performance)}
                            </div>
                        ` : ''}
                    </div>
                    <div class="bet-count">
                        ${tokenB.bets} bet${tokenB.bets !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
            
            <div class="betting-progress">
                <div class="progress-side token-a" style="width: ${getBettingPercentage(tokenA.bets, tokenB.bets, 'a')}%">
                    ${tokenA.bets > 0 ? `${tokenA.bets} bets` : ''}
                </div>
                <div class="progress-side token-b" style="width: ${getBettingPercentage(tokenA.bets, tokenB.bets, 'b')}%">
                    ${tokenB.bets > 0 ? `${tokenB.bets} bets` : ''}
                </div>
            </div>
            
            <div class="competition-stats">
                <div class="stat">
                    <div class="stat-label">Total Pool</div>
                    <div class="stat-value">${poolSize} SOL</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Participants</div>
                    <div class="stat-value">${participantCount}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Entry Fee</div>
                    <div class="stat-value">${window.APP_CONFIG.BET_AMOUNT} SOL</div>
                </div>
            </div>
            
            ${createCompetitionActions(competition)}
        </div>
    `;
}

// Calculate betting distribution percentage
function getBettingPercentage(tokenABets, tokenBBets, side) {
    const total = tokenABets + tokenBBets;
    if (total === 0) return side === 'a' ? 50 : 50;
    
    const percentage = side === 'a' 
        ? (tokenABets / total) * 100 
        : (tokenBBets / total) * 100;
    
    return Math.max(5, percentage); // Minimum 5% for visibility
}

// Create action buttons based on competition status
function createCompetitionActions(competition) {
    const currentUser = window.app?.getCurrentUser();
    
    if (!currentUser) {
        return `
            <div class="competition-actions">
                <button class="btn-competition-primary" onclick="window.app.openWalletModal()">
                    Connect Wallet to Predict
                </button>
            </div>
        `;
    }
    
    switch (competition.status) {
        case 'SETUP':
            return `
                <div class="competition-actions">
                    <button class="btn-competition-secondary" disabled>
                        ⏱️ Starting Soon
                    </button>
                    <button class="btn-competition-tertiary" onclick="showCompetitionDetails('${competition.competition_id}')">
                        View Details
                    </button>
                </div>
            `;
            
        case 'VOTING':
            return `
                <div class="competition-actions">
                    <button class="btn-competition-primary" 
                            onclick="showBetModal('${competition.competition_id}', 'token_a')">
                        🎯 Predict ${competition.token_a_symbol}
                    </button>
                    <button class="btn-competition-primary" 
                            onclick="showBetModal('${competition.competition_id}', 'token_b')">
                        🎯 Predict ${competition.token_b_symbol}
                    </button>
                </div>
            `;
            
        case 'ACTIVE':
            return `
                <div class="competition-actions">
                    <button class="btn-competition-secondary" disabled>
                        🔴 Live Competition
                    </button>
                    <button class="btn-competition-tertiary" 
                            onclick="showCompetitionDetails('${competition.competition_id}')">
                        📊 Watch Live
                    </button>
                </div>
            `;
            
        case 'CLOSED':
            return `
                <div class="competition-actions">
                    <button class="btn-competition-secondary" disabled>
                        ⚖️ Calculating Results...
                    </button>
                    <button class="btn-competition-tertiary" 
                            onclick="showCompetitionDetails('${competition.competition_id}')">
                        View Details
                    </button>
                </div>
            `;
            
        case 'RESOLVED':
            const winnerToken = competition.winner_token;
            const winnerSymbol = winnerToken === 'token_a' 
                ? competition.token_a_symbol 
                : competition.token_b_symbol;
            
            return `
                <div class="competition-actions">
                    <div class="winner-announcement">
                        🏆 Winner: ${winnerSymbol}
                    </div>
                    <button class="btn-competition-tertiary" 
                            onclick="showCompetitionResults('${competition.competition_id}')">
                        📈 View Results
                    </button>
                </div>
            `;
            
        default:
            return '<div class="competition-actions"></div>';
    }
}

// ==============================================
// REAL-TIME PRICE UPDATES
// ==============================================

// Subscribe to price updates for a token in a competition
function subscribeToPriceUpdates(tokenAddress, competitionId, tokenType) {
    const subscriptionKey = `${competitionId}-${tokenType}`;
    
    if (priceUpdateSubscriptions.has(subscriptionKey)) {
        return; // Already subscribed
    }

    const unsubscribe = window.priceService.subscribeToPriceUpdates(tokenAddress, (priceData) => {
        updateTokenPriceInCard(competitionId, tokenType, priceData);
    });

    priceUpdateSubscriptions.set(subscriptionKey, unsubscribe);
}

// Update token price in competition card
function updateTokenPriceInCard(competitionId, tokenType, priceData) {
    const card = document.querySelector(`[data-competition-id="${competitionId}"]`);
    if (!card) return;

    const tokenCard = card.querySelector(`[data-token="${tokenType}"]`);
    if (!tokenCard) return;

    const priceElement = tokenCard.querySelector('.token-price');
    if (priceElement) {
        priceElement.textContent = `$${formatPrice(priceData.price)}`;
        priceElement.setAttribute('data-price', priceData.price);
        
        // Add flash animation for price updates
        priceElement.classList.add('price-updated');
        setTimeout(() => priceElement.classList.remove('price-updated'), 1000);
    }

    // Update performance if competition is active
    const competition = activeCompetitions.find(c => c.competition_id === competitionId);
    if (competition && competition.status === 'ACTIVE') {
        updateTokenPerformance(tokenCard, priceData.price, competition, tokenType);
    }
}

// Update token performance display
function updateTokenPerformance(tokenCard, currentPrice, competition, tokenType) {
    const startTwap = tokenType === 'token_a' 
        ? competition.token_a_start_twap 
        : competition.token_b_start_twap;
    
    if (!startTwap) return;

    const performance = ((currentPrice - startTwap) / startTwap) * 100;
    
    let performanceElement = tokenCard.querySelector('.token-performance');
    if (!performanceElement) {
        performanceElement = document.createElement('div');
        performanceElement.className = 'token-performance';
        tokenCard.querySelector('.token-info').appendChild(performanceElement);
    }

    performanceElement.textContent = formatPercentage(performance);
    performanceElement.className = `token-performance ${performance >= 0 ? 'positive' : 'negative'}`;
}

// ==============================================
// BETTING MODAL AND FUNCTIONS (ENHANCED)
// ==============================================

// Show enhanced betting modal with real token data
function showBetModal(competitionId, chosenToken) {
    const competition = activeCompetitions.find(c => c.competition_id === competitionId);
    if (!competition) {
        showErrorNotification('Competition not found');
        return;
    }
    
    const isTokenA = chosenToken === 'token_a';
    const tokenData = isTokenA ? {
        symbol: competition.token_a_symbol_full || competition.token_a_symbol,
        name: competition.token_a_name_full || competition.token_a_name,
        logo: competition.token_a_logo_uri || getDefaultTokenLogo(competition.token_a_symbol),
        price: competition.token_a_current_price,
        marketCap: competition.token_a_market_cap,
        address: competition.token_a_address
    } : {
        symbol: competition.token_b_symbol_full || competition.token_b_symbol,
        name: competition.token_b_name_full || competition.token_b_name,
        logo: competition.token_b_logo_uri || getDefaultTokenLogo(competition.token_b_symbol),
        price: competition.token_b_current_price,
        marketCap: competition.token_b_market_cap,
        address: competition.token_b_address
    };
    
    const modalHTML = `
        <div class="bet-modal" id="betModal">
            <div class="bet-modal-content">
                <div class="modal-header">
                    <button class="modal-close" onclick="closeBetModal()">×</button>
                    <div class="modal-title">Make Your Prediction</div>
                    <div class="modal-subtitle">Predict which token will perform better</div>
                </div>
                
                <div class="chosen-token-display">
                    <div class="token-showcase">
                        <img class="token-logo-large" src="${tokenData.logo}" alt="${tokenData.symbol}" 
                             onerror="this.src='${getDefaultTokenLogo(tokenData.symbol)}'">
                        <div class="token-details">
                            <div class="token-symbol-large">${tokenData.symbol}</div>
                            <div class="token-name-large">${tokenData.name}</div>
                            <div class="token-price-large" id="modalTokenPrice">$${formatPrice(tokenData.price)}</div>
                            ${tokenData.marketCap ? `
                                <div class="token-market-cap-large">
                                    Market Cap: $${formatMarketCap(tokenData.marketCap)}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="prediction-confidence">
                        <div class="confidence-label">Your Prediction</div>
                        <div class="confidence-text">
                            You believe <strong>${tokenData.symbol}</strong> will outperform its competitor over the next hour
                        </div>
                    </div>
                </div>
                
                <div class="bet-details">
                    <div class="bet-amount">
                        <div class="amount-label">Entry Fee</div>
                        <div class="amount-value">${window.APP_CONFIG.BET_AMOUNT} SOL</div>
                        <div class="amount-note">Fixed entry fee for all predictions</div>
                    </div>
                    
                    <div class="potential-return">
                        <div class="return-label">Potential Return</div>
                        <div class="return-value" id="potentialReturn">Calculating...</div>
                        <div class="return-note">Depends on number of winners</div>
                    </div>
                </div>
                
                <div class="bet-confirmation">
                    <div class="competition-timing">
                        <div class="timing-item">
                            <div class="timing-label">Voting Ends</div>
                            <div class="timing-value">${formatDateTime(competition.voting_end_time)}</div>
                        </div>
                        <div class="timing-item">
                            <div class="timing-label">Competition Ends</div>
                            <div class="timing-value">${formatDateTime(competition.end_time)}</div>
                        </div>
                    </div>
                    
                    <div class="risk-warning">
                        ⚠️ This prediction is final once placed. Winners determined by TWAP pricing to prevent manipulation.
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-modal-secondary" onclick="closeBetModal()">Cancel</button>
                    <button class="btn-modal-primary" id="placeBetBtn" 
                            onclick="placeBet('${competitionId}', '${chosenToken}')">
                        🎯 Place Prediction (${window.APP_CONFIG.BET_AMOUNT} SOL)
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Calculate potential return
    calculatePotentialReturn(competition, chosenToken);
    
    // Start real-time price updates in modal
    startModalPriceUpdates(tokenData.address);
}

// Start price updates in the betting modal
function startModalPriceUpdates(tokenAddress) {
    const priceElement = document.getElementById('modalTokenPrice');
    if (!priceElement) return;

    const updatePrice = async () => {
        try {
            const marketData = await window.priceService.getMarketData(tokenAddress);
            if (marketData && priceElement) {
                priceElement.textContent = marketData.formatted_price;
                priceElement.classList.add('price-updated');
                setTimeout(() => priceElement.classList.remove('price-updated'), 500);
            }
        } catch (error) {
            console.warn('Modal price update failed:', error);
        }
    };

    // Update immediately and then every 30 seconds
    updatePrice();
    const interval = setInterval(updatePrice, 30000);
    
    // Store interval for cleanup
    document.getElementById('betModal').priceUpdateInterval = interval;
}

// Close betting modal
function closeBetModal() {
    const modal = document.getElementById('betModal');
    if (modal) {
        // Clear price update interval
        if (modal.priceUpdateInterval) {
            clearInterval(modal.priceUpdateInterval);
        }
        modal.remove();
    }
}

// ==============================================
// UTILITY FUNCTIONS (ENHANCED)
// ==============================================

// Get default token logo for fallback
function getDefaultTokenLogo(symbol) {
    // Create a simple SVG logo with the token symbol
    const svgLogo = `data:image/svg+xml,${encodeURIComponent(`
        <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="28" fill="linear-gradient(135deg, #8b5cf6, #ec4899)"/>
            <text x="28" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">
                ${symbol ? symbol.substring(0, 3).toUpperCase() : '?'}
            </text>
        </svg>
    `)}`;
    
    return svgLogo;
}

// Format market cap for display
function formatMarketCap(marketCap) {
    if (!marketCap) return 'N/A';
    
    if (marketCap >= 1e9) {
        return `${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
        return `${(marketCap / 1e6).toFixed(1)}M`;
    } else if (marketCap >= 1e3) {
        return `${(marketCap / 1e3).toFixed(0)}K`;
    } else {
        return marketCap.toLocaleString();
    }
}

// Format percentage for display
function formatPercentage(percentage) {
    if (!percentage && percentage !== 0) return 'N/A';
    
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
}

// Format date and time for display
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.round((date - now) / (1000 * 60));
    
    if (diffMinutes > 0) {
        if (diffMinutes < 60) {
            return `in ${diffMinutes}m`;
        } else {
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;
            return `in ${hours}h ${minutes}m`;
        }
    } else {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// ==============================================
// REAL-TIME UPDATES AND SUBSCRIPTIONS
// ==============================================

// Subscribe to real-time updates for a competition
function subscribeToCompetitionUpdates(competitionId) {
    // Don't create duplicate subscriptions
    if (competitionSubscriptions.has(competitionId)) {
        return;
    }
    
    const subscription = window.supabaseClient.subscribeToCompetitionBets(
        competitionId,
        (payload) => {
            console.log('Competition bet update:', payload);
            updateCompetitionDisplay(competitionId);
        }
    );
    
    competitionSubscriptions.set(competitionId, subscription);
}

// Update a specific competition's display
async function updateCompetitionDisplay(competitionId) {
    try {
        const updatedCompetition = await window.supabaseClient.getCompetitionDetails(competitionId);
        
        // Find and update the competition card
        const competitionCard = document.querySelector(`[data-competition-id="${competitionId}"]`);
        if (competitionCard && updatedCompetition) {
            // Update the competition in our local array
            const index = activeCompetitions.findIndex(c => c.competition_id === competitionId);
            if (index !== -1) {
                activeCompetitions[index] = updatedCompetition;
            }
            
            // Replace the card with updated version
            competitionCard.outerHTML = createCompetitionCard(updatedCompetition);
            
            // Re-subscribe to price updates for the new card
            if (updatedCompetition.token_a_address) {
                subscribeToPriceUpdates(updatedCompetition.token_a_address, competitionId, 'token_a');
            }
            if (updatedCompetition.token_b_address) {
                subscribeToPriceUpdates(updatedCompetition.token_b_address, competitionId, 'token_b');
            }
        }
    } catch (error) {
        console.error('Failed to update competition display:', error);
    }
}

// Clean up all subscriptions
function cleanupCompetitionSubscriptions() {
    // Clean up competition subscriptions
    competitionSubscriptions.forEach((subscription, competitionId) => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
        }
    });
    competitionSubscriptions.clear();
    
    // Clean up price update subscriptions
    priceUpdateSubscriptions.forEach((unsubscribe, key) => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    priceUpdateSubscriptions.clear();
}

// ==============================================
// EXISTING FUNCTIONS (PRESERVED)
// ==============================================

// Get time remaining for a competition
function getTimeRemaining(competition) {
    const now = new Date();
    let targetTime;
    
    switch (competition.status) {
        case 'SETUP':
            targetTime = new Date(competition.start_time);
            return `Starts in ${formatTimeDifference(targetTime, now)}`;
            
        case 'VOTING':
            targetTime = new Date(competition.voting_end_time);
            return `Voting ends in ${formatTimeDifference(targetTime, now)}`;
            
        case 'ACTIVE':
            targetTime = new Date(competition.end_time);
            return `Ends in ${formatTimeDifference(targetTime, now)}`;
            
        default:
            return 'Completed';
    }
}

// Get competition status information
function getCompetitionStatusInfo(competition) {
    switch (competition.status) {
        case 'SETUP':
            return { text: 'Upcoming', class: 'status-upcoming' };
        case 'VOTING':
            return { text: 'Voting Open', class: 'status-voting' };
        case 'ACTIVE':
            return { text: 'Live', class: 'status-active' };
        case 'CLOSED':
            return { text: 'Calculating', class: 'status-closed' };
        case 'RESOLVED':
            return { text: 'Completed', class: 'status-completed' };
        default:
            return { text: 'Unknown', class: 'status-unknown' };
    }
}

// Format time difference
function formatTimeDifference(future, now) {
    const diff = future - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Format SOL amount
function formatSOL(amount) {
    return parseFloat(amount).toFixed(3);
}

// Format price
function formatPrice(price) {
    if (!price || isNaN(price)) return '0.00';
    const num = parseFloat(price);
    if (num < 0.000001) {
        return num.toExponential(2);
    } else if (num < 0.01) {
        return num.toFixed(6);
    } else if (num < 1) {
        return num.toFixed(4);
    } else {
        return num.toFixed(2);
    }
}

// Truncate string
function truncateString(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// Calculate potential return for a bet
function calculatePotentialReturn(competition, chosenToken) {
    const totalPool = competition.total_pool || 0;
    const opponentBets = chosenToken === 'token_a' ? 
        (competition.token_b_bets || 0) : 
        (competition.token_a_bets || 0);
    const chosenBets = chosenToken === 'token_a' ? 
        (competition.token_a_bets || 0) : 
        (competition.token_b_bets || 0);
    
    // Assume this user wins and calculate payout
    const newTotalPool = totalPool + window.APP_CONFIG.BET_AMOUNT;
    const platformFee = newTotalPool * (window.APP_CONFIG.PLATFORM_FEE / 100);
    const winnerPool = newTotalPool - platformFee;
    const totalWinners = chosenBets + 1; // Including this bet
    
    const potentialReturn = totalWinners > 0 ? winnerPool / totalWinners : 0;
    const profitPercent = potentialReturn > 0 ? ((potentialReturn / window.APP_CONFIG.BET_AMOUNT - 1) * 100) : 0;
    
    const returnElement = document.getElementById('potentialReturn');
    if (returnElement) {
        returnElement.innerHTML = `
            <span class="return-amount">${formatSOL(potentialReturn)} SOL</span>
            <span class="return-profit ${profitPercent > 0 ? 'positive' : 'negative'}">
                (${profitPercent > 0 ? '+' : ''}${profitPercent.toFixed(1)}% profit)
            </span>
        `;
    }
}

// Place a bet
async function placeBet(competitionId, chosenToken) {
    const currentUser = window.app?.getCurrentUser();
    const connectedWallet = window.app?.getConnectedWallet();
    
    if (!currentUser || !connectedWallet) {
        showErrorNotification('Please connect your wallet first');
        return;
    }
    
    try {
        const placeBetBtn = document.getElementById('placeBetBtn');
        placeBetBtn.disabled = true;
        placeBetBtn.innerHTML = '⏳ Placing Prediction...';
        
        // In a real implementation, you would:
        // 1. Create and sign a Solana transaction to transfer SOL to escrow
        // 2. Submit the transaction to the blockchain
        // 3. Wait for confirmation
        // 4. Then record the bet in the database
        
        // For now, we'll simulate this process
        await simulateSolanaTransaction();
        
        // Record bet in database
        const bet = await window.supabaseClient.placeBet(
            competitionId,
            chosenToken,
            window.APP_CONFIG.BET_AMOUNT,
            currentUser.wallet_address
        );
        
        console.log('Bet placed successfully:', bet);
        
        // Close modal and show success
        closeBetModal();
        showNotification('🎯 Prediction placed successfully! Good luck!', 'success');
        
        // Refresh competitions to show updated counts
        if (window.app?.loadActiveCompetitions) {
            await window.app.loadActiveCompetitions();
        }
        
        // Refresh user portfolio
        if (window.app?.loadUserPortfolio) {
            await window.app.loadUserPortfolio();
        }
        
    } catch (error) {
        console.error('Failed to place bet:', error);
        showErrorNotification(`Failed to place prediction: ${error.message}`);
        
        const placeBetBtn = document.getElementById('placeBetBtn');
        if (placeBetBtn) {
            placeBetBtn.disabled = false;
            placeBetBtn.innerHTML = `🎯 Place Prediction (${window.APP_CONFIG.BET_AMOUNT} SOL)`;
        }
    }
}

// Simulate Solana transaction (replace with real implementation)
async function simulateSolanaTransaction() {
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In production, this would handle real Solana transactions
    // Example structure:
    /*
    const transaction = new solanaWeb3.Transaction();
    transaction.add(
        solanaWeb3.SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: escrowAccount,
            lamports: solanaWeb3.LAMPORTS_PER_SOL * 0.1
        })
    );
    
    const signature = await wallet.signAndSendTransaction(transaction);
    await connection.confirmTransaction(signature);
    */
}

// Show error notification (if not already defined)
function showErrorNotification(message) {
    if (window.app?.showErrorNotification) {
        window.app.showErrorNotification(message);
    } else {
        console.error(message);
        alert(message); // Fallback
    }
}

// Show notification (if not already defined)
function showNotification(message, type = 'info') {
    if (window.app?.showNotification) {
        window.app.showNotification(message, type);
    } else {
        console.log(message);
    }
}

// Export functions for global use
window.competition = {
    displayCompetitions,
    showBetModal,
    closeBetModal,
    placeBet,
    subscribeToCompetitionUpdates,
    updateCompetitionDisplay,
    cleanupCompetitionSubscriptions,
    subscribeToPriceUpdates,
    updateTokenPriceInCard
};
