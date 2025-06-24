// Competition Display and Betting Logic with Supabase Integration

// Global state for competitions
let activeCompetitions = [];
let competitionSubscriptions = new Map();

// ==============================================
// COMPETITION DISPLAY FUNCTIONS
// ==============================================

// Display competitions in the grid
function displayCompetitions(competitions) {
    const grid = document.getElementById('competitions-grid');
    
    if (!competitions || competitions.length === 0) {
        grid.innerHTML = `
            <div class="no-competitions">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎯</div>
                <h3>No Active Competitions</h3>
                <p>New competitions will appear here soon!</p>
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
    });
}

// Create HTML for a single competition card
function createCompetitionCard(competition) {
    const timeRemaining = getTimeRemaining(competition);
    const statusInfo = getCompetitionStatusInfo(competition);
    const participantCount = (competition.total_bets || 0);
    const poolSize = formatSOL(competition.total_pool || 0);
    
    return `
        <div class="competition-card" data-competition-id="${competition.competition_id}">
            <div class="competition-header">
                <div class="competition-status ${statusInfo.class}">
                    ${statusInfo.text}
                </div>
                <div class="competition-time">
                    ${timeRemaining}
                </div>
            </div>
            
            <div class="token-pair">
                <div class="token token-a" data-token="token_a">
                    <div class="token-icon">🪙</div>
                    <div class="token-info">
                        <div class="token-symbol">${competition.token_a_symbol}</div>
                        <div class="token-name">${truncateString(competition.token_a_name, 20)}</div>
                        <div class="token-price">$${formatPrice(competition.token_a_start_price)}</div>
                    </div>
                    <div class="bet-count">
                        ${competition.token_a_bets || 0} bets
                    </div>
                </div>
                
                <div class="vs-divider">
                    <div class="vs-text">VS</div>
                    <div class="vs-line"></div>
                </div>
                
                <div class="token token-b" data-token="token_b">
                    <div class="token-icon">🪙</div>
                    <div class="token-info">
                        <div class="token-symbol">${competition.token_b_symbol}</div>
                        <div class="token-name">${truncateString(competition.token_b_name, 20)}</div>
                        <div class="token-price">$${formatPrice(competition.token_b_start_price)}</div>
                    </div>
                    <div class="bet-count">
                        ${competition.token_b_bets || 0} bets
                    </div>
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

// Create action buttons based on competition status
function createCompetitionActions(competition) {
    const currentUser = window.app?.getCurrentUser();
    
    if (!currentUser) {
        return `
            <div class="competition-actions">
                <button class="btn-competition-primary" onclick="window.app.openWalletModal()">
                    Connect Wallet to Bet
                </button>
            </div>
        `;
    }
    
    switch (competition.status) {
        case 'SETUP':
            return `
                <div class="competition-actions">
                    <button class="btn-competition-secondary" disabled>
                        Waiting for Voting Phase
                    </button>
                </div>
            `;
            
        case 'VOTING':
            return `
                <div class="competition-actions">
                    <button class="btn-competition-primary token-bet-btn" 
                            onclick="showBetModal('${competition.competition_id}', 'token_a')">
                        Bet on ${competition.token_a_symbol}
                    </button>
                    <button class="btn-competition-primary token-bet-btn" 
                            onclick="showBetModal('${competition.competition_id}', 'token_b')">
                        Bet on ${competition.token_b_symbol}
                    </button>
                </div>
            `;
            
        case 'ACTIVE':
            return `
                <div class="competition-actions">
                    <button class="btn-competition-secondary" disabled>
                        Competition In Progress
                    </button>
                    <button class="btn-competition-tertiary" 
                            onclick="showCompetitionDetails('${competition.competition_id}')">
                        View Details
                    </button>
                </div>
            `;
            
        case 'CLOSED':
            return `
                <div class="competition-actions">
                    <button class="btn-competition-secondary" disabled>
                        Calculating Results
                    </button>
                </div>
            `;
            
        case 'RESOLVED':
            const winnerToken = competition.winner_token;
            const winnerSymbol = winnerToken === 'token_a' ? competition.token_a_symbol : competition.token_b_symbol;
            
            return `
                <div class="competition-actions">
                    <div class="winner-announcement">
                        🏆 Winner: ${winnerSymbol}
                    </div>
                    <button class="btn-competition-tertiary" 
                            onclick="showCompetitionResults('${competition.competition_id}')">
                        View Results
                    </button>
                </div>
            `;
            
        default:
            return '<div class="competition-actions"></div>';
    }
}

// ==============================================
// BETTING MODAL AND FUNCTIONS
// ==============================================

// Show betting modal
function showBetModal(competitionId, chosenToken) {
    const competition = activeCompetitions.find(c => c.competition_id === competitionId);
    if (!competition) {
        showErrorNotification('Competition not found');
        return;
    }
    
    const tokenSymbol = chosenToken === 'token_a' ? competition.token_a_symbol : competition.token_b_symbol;
    const tokenName = chosenToken === 'token_a' ? competition.token_a_name : competition.token_b_name;
    
    const modalHTML = `
        <div class="bet-modal" id="betModal">
            <div class="bet-modal-content">
                <div class="modal-header">
                    <button class="modal-close" onclick="closeBetModal()">×</button>
                    <div class="modal-title">Place Your Bet</div>
                </div>
                
                <div class="bet-details">
                    <div class="chosen-token">
                        <div class="token-icon">🪙</div>
                        <div class="token-info">
                            <div class="token-symbol">${tokenSymbol}</div>
                            <div class="token-name">${tokenName}</div>
                        </div>
                    </div>
                    
                    <div class="bet-amount">
                        <div class="amount-label">Bet Amount</div>
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
                    <div class="confirmation-text">
                        You are betting <strong>${window.APP_CONFIG.BET_AMOUNT} SOL</strong> that 
                        <strong>${tokenSymbol}</strong> will outperform its competitor over the next hour.
                    </div>
                    
                    <div class="risk-warning">
                        ⚠️ This bet is final once placed. Make sure you understand the risks.
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-modal-secondary" onclick="closeBetModal()">Cancel</button>
                    <button class="btn-modal-primary" id="placeBetBtn" 
                            onclick="placeBet('${competitionId}', '${chosenToken}')">
                        Place Bet (${window.APP_CONFIG.BET_AMOUNT} SOL)
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Calculate potential return
    calculatePotentialReturn(competition, chosenToken);
}

// Close betting modal
function closeBetModal() {
    const modal = document.getElementById('betModal');
    if (modal) {
        modal.remove();
    }
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
    
    document.getElementById('potentialReturn').textContent = 
        `${formatSOL(potentialReturn)} SOL (${formatPercent((potentialReturn / window.APP_CONFIG.BET_AMOUNT - 1) * 100)}% profit)`;
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
        placeBetBtn.textContent = 'Placing Bet...';
        
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
        showNotification('Bet placed successfully! 🎯', 'success');
        
        // Refresh competitions to show updated counts
        await window.app.loadActiveCompetitions?.();
        
        // Refresh user portfolio
        await window.app.loadUserPortfolio?.();
        
    } catch (error) {
        console.error('Failed to place bet:', error);
        showErrorNotification(`Failed to place bet: ${error.message}`);
        
        const placeBetBtn = document.getElementById('placeBetBtn');
        if (placeBetBtn) {
            placeBetBtn.disabled = false;
            placeBetBtn.textContent = `Place Bet (${window.APP_CONFIG.BET_AMOUNT} SOL)`;
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

// ==============================================
// REAL-TIME UPDATES
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
        }
    } catch (error) {
        console.error('Failed to update competition display:', error);
    }
}

// Clean up subscriptions
function cleanupCompetitionSubscriptions() {
    competitionSubscriptions.forEach((subscription, competitionId) => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
        }
    });
    competitionSubscriptions.clear();
}

// ==============================================
// UTILITY FUNCTIONS
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
    if (!price) return '0.00';
    const num = parseFloat(price);
    if (num < 0.01) {
        return num.toExponential(2);
    }
    return num.toFixed(4);
}

// Format percentage
function formatPercent(percent) {
    return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}`;
}

// Truncate string
function truncateString(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
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
    cleanupCompetitionSubscriptions
};
