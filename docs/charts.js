// charts.js - TokenWars Chart Service
// Handles all chart creation and management for the platform

class ChartService {
    constructor() {
        this.charts = new Map(); // Store chart instances
        this.defaultColors = {
            primary: '#8b5cf6',
            secondary: '#a855f7',
            success: '#22c55e',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        console.log('📊 ChartService initialized');
    }

    /**
     * Create Win Rate Trend Chart - WITH DEBUGGING
     */
    createWinRateTrend(containerId, data) {
        console.log('📊 Creating win rate chart for:', containerId);
        console.log('📊 Chart data received:', data);
        
        // ADD SAFETY CHECK
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn('📊 No valid data for win rate chart, using sample data');
            data = this.generateSampleData().winRateTrend;
        }
        
        const canvas = this.createCanvas(containerId, 'winRateTrend');
        
        // Sample data structure: [{date: '2024-01-01', winRate: 65.5}, ...]
        const chartData = {
            labels: data.map(d => new Date(d.date).toLocaleDateString()),
            datasets: [{
                label: 'Win Rate %',
                data: data.map(d => d.winRate),
                borderColor: this.defaultColors.primary,
                backgroundColor: this.defaultColors.primary + '20',
                fill: true,
                tension: 0.4
            }]
        };

        const config = {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: value => value + '%' }
                    }
                }
            }
        };

        return this.renderChart(canvas, config, 'winRateTrend');
    }

    /**
     * Create Profit/Loss Over Time Chart - WITH DEBUGGING
     */
    createProfitLossChart(containerId, data) {
        console.log('📊 Creating profit/loss chart for:', containerId);
        console.log('📊 Chart data received:', data);
        
        // ADD SAFETY CHECK
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn('📊 No valid data for profit/loss chart, using sample data');
            data = this.generateSampleData().profitLoss;
        }
        
        const canvas = this.createCanvas(containerId, 'profitLoss');
        
        // Sample data: [{date: '2024-01-01', profit: 2.5}, ...]
        const chartData = {
            labels: data.map(d => new Date(d.date).toLocaleDateString()),
            datasets: [{
                label: 'Profit/Loss (SOL)',
                data: data.map(d => d.profit),
                borderColor: data.map(d => d.profit >= 0 ? this.defaultColors.success : this.defaultColors.danger),
                backgroundColor: data.map(d => d.profit >= 0 ? this.defaultColors.success + '20' : this.defaultColors.danger + '20'),
                fill: true
            }]
        };

        const config = {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        ticks: { callback: value => value + ' SOL' }
                    }
                }
            }
        };

        return this.renderChart(canvas, config, 'profitLoss');
    }

    /**
     * Create Token Performance Pie Chart - WITH DEBUGGING
     */
    createTokenPerformanceChart(containerId, data) {
        console.log('📊 Creating token performance chart for:', containerId);
        console.log('📊 Chart data received:', data);
        
        // ADD SAFETY CHECK
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn('📊 No valid data for token performance chart, using sample data');
            data = this.generateSampleData().tokenPerformance;
        }
        
        const canvas = this.createCanvas(containerId, 'tokenPerformance');
        
        // Sample data: [{token: 'SOL', wins: 5, losses: 2}, ...]
        const chartData = {
            labels: data.map(d => d.token),
            datasets: [{
                data: data.map(d => d.wins),
                backgroundColor: [
                    this.defaultColors.primary,
                    this.defaultColors.secondary,
                    this.defaultColors.success,
                    this.defaultColors.info,
                    this.defaultColors.warning
                ]
            }]
        };

        const config = {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        };

        return this.renderChart(canvas, config, 'tokenPerformance');
    }

    /**
     * Create Betting Distribution Chart - WITH DEBUGGING
     */
    createBettingDistributionChart(containerId, data) {
        console.log('📊 Creating betting distribution chart for:', containerId);
        console.log('📊 Chart data received:', data);
        
        // ADD SAFETY CHECK
        if (!data || typeof data !== 'object' || (data.tokenA === undefined && data.tokenB === undefined)) {
            console.warn('📊 No valid data for betting distribution chart, using sample data');
            data = this.generateSampleData().bettingDistribution;
        }
        
        const canvas = this.createCanvas(containerId, 'bettingDistribution');
        
        // Sample data: {tokenA: 60, tokenB: 40}
        const chartData = {
            labels: ['Token A Bets', 'Token B Bets'],
            datasets: [{
                data: [data.tokenA || 0, data.tokenB || 0],
                backgroundColor: [this.defaultColors.primary, this.defaultColors.secondary]
            }]
        };

        const config = {
            type: 'pie',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        };

        return this.renderChart(canvas, config, 'bettingDistribution');
    }

    /**
     * Create Mini Streak Chart for User Cards - WITH DEBUGGING
     */
    createMiniStreakChart(containerId, streakData) {
        console.log('📊 Creating mini streak chart for:', containerId);
        console.log('📊 Streak data received:', streakData);
        
        // ADD SAFETY CHECK
        if (!streakData || !Array.isArray(streakData) || streakData.length === 0) {
            console.warn('📊 No valid data for mini streak chart, using sample data');
            streakData = this.generateSampleData().streak;
        }
        
        const canvas = this.createCanvas(containerId, 'miniStreak');
        canvas.width = 200;
        canvas.height = 60;
        
        // Simple streak visualization: [W, L, W, W, W] -> green/red bars
        const chartData = {
            labels: streakData.map((_, i) => i + 1),
            datasets: [{
                data: streakData.map(result => result === 'W' ? 1 : 0),
                backgroundColor: streakData.map(result => 
                    result === 'W' ? this.defaultColors.success : this.defaultColors.danger
                )
            }]
        };

        const config = {
            type: 'bar',
            data: chartData,
            options: {
                responsive: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: false }
                },
                elements: { bar: { borderRadius: 2 } }
            }
        };

        return this.renderChart(canvas, config, 'miniStreak');
    }

    /**
     * Helper Methods
     */
    createCanvas(containerId, chartId) {
        console.log('📊 Creating canvas for container:', containerId);
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Container ${containerId} not found`);
            throw new Error(`Container ${containerId} not found`);
        }

        // Remove existing canvas if any
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) {
            console.log('📊 Removing existing canvas');
            existingCanvas.remove();
        }

        const canvas = document.createElement('canvas');
        canvas.id = `chart-${chartId}`;
        container.appendChild(canvas);
        
        console.log('📊 Canvas created successfully');
        return canvas;
    }

    renderChart(canvas, config, chartId) {
        console.log('📊 Rendering chart:', chartId);
        console.log('📊 Chart config:', config);
        
        // Using Chart.js (needs to be loaded externally)
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js library not loaded');
            this.showChartPlaceholder(canvas.parentElement, 'Chart.js library required');
            return null;
        }

        try {
            // Destroy existing chart if it exists
            if (this.charts.has(chartId)) {
                console.log('📊 Destroying existing chart:', chartId);
                this.charts.get(chartId).destroy();
            }

            console.log('📊 Creating Chart.js instance...');
            const chart = new Chart(canvas, config);
            this.charts.set(chartId, chart);
            
            console.log('✅ Chart created successfully:', chartId);
            return chart;
        } catch (error) {
            console.error('❌ Error creating chart:', error);
            this.showChartPlaceholder(canvas.parentElement, 'Chart creation failed: ' + error.message);
            return null;
        }
    }

    showChartPlaceholder(container, message) {
        console.log('📊 Showing chart placeholder:', message);
        container.innerHTML = `
            <div class="chart-placeholder">
                <div class="placeholder-icon">📊</div>
                <div class="placeholder-text">${message}</div>
            </div>
        `;
    }

    /**
     * Utility method to generate sample data for testing
     */
    generateSampleData() {
        console.log('📊 Generating sample chart data');
        return {
            winRateTrend: Array.from({length: 10}, (_, i) => ({
                date: new Date(Date.now() - (9-i) * 24 * 60 * 60 * 1000).toISOString(),
                winRate: Math.random() * 100
            })),
            profitLoss: Array.from({length: 10}, (_, i) => ({
                date: new Date(Date.now() - (9-i) * 24 * 60 * 60 * 1000).toISOString(),
                profit: (Math.random() - 0.5) * 5
            })),
            tokenPerformance: [
                {token: 'SOL', wins: 15},
                {token: 'USDC', wins: 8},
                {token: 'RAY', wins: 5}
            ],
            bettingDistribution: {tokenA: 65, tokenB: 35},
            streak: ['W', 'W', 'L', 'W', 'W', 'W', 'L', 'W']
        };
    }

    /**
     * Cleanup method
     */
    destroyAll() {
        console.log('📊 Destroying all charts');
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}

// Add these functions after the class definition but before the initialization
async function createUserBettingDistribution(containerId, userWallet) {
    console.log('📊 Creating user betting distribution for wallet:', userWallet);
    
    try {
        // Check if supabase is available
        if (!window.supabase) {
            console.error('❌ Supabase not available');
            window.chartService.showChartPlaceholder(
                document.getElementById(containerId), 
                'Database connection required'
            );
            return;
        }

        // Fetch user's betting choices from database
        const { data, error } = await window.supabase
            .from('bets')
            .select('chosen_token')
            .eq('user_wallet', userWallet);
            
        if (error) {
            console.error('❌ Database query error:', error);
            throw error;
        }
        
        console.log('📊 User betting data:', data);
        
        // Count token_a vs token_b choices
        const tokenA = data ? data.filter(bet => bet.chosen_token === 'token_a').length : 0;
        const tokenB = data ? data.filter(bet => bet.chosen_token === 'token_b').length : 0;
        
        console.log('📊 Token distribution - A:', tokenA, 'B:', tokenB);
        
        // Use existing chart service
        return window.chartService.createBettingDistributionChart(containerId, {
            tokenA: tokenA,
            tokenB: tokenB
        });
        
    } catch (error) {
        console.error('❌ Error creating betting distribution chart:', error);
        window.chartService.showChartPlaceholder(
            document.getElementById(containerId), 
            'Unable to load betting data'
        );
    }
}

async function createUserProfitLossChart(containerId, userWallet) {
    console.log('📊 Creating user profit/loss chart for wallet:', userWallet);
    
    try {
        // Check if supabase is available
        if (!window.supabase) {
            console.error('❌ Supabase not available');
            window.chartService.showChartPlaceholder(
                document.getElementById(containerId), 
                'Database connection required'
            );
            return;
        }

        const { data, error } = await window.supabase
            .from('bets')
            .select('payout_amount, amount, timestamp')
            .eq('user_wallet', userWallet)
            .order('timestamp', { ascending: true });
            
        if (error) {
            console.error('❌ Database query error:', error);
            throw error;
        }
        
        console.log('📊 User profit/loss data:', data);
        
        // Group by date and calculate daily profit/loss
        const dailyData = {};
        if (data && data.length > 0) {
            data.forEach(bet => {
                const date = new Date(bet.timestamp).toDateString();
                if (!dailyData[date]) dailyData[date] = 0;
                dailyData[date] += (bet.payout_amount || 0) - bet.amount;
            });
        }
        
        const chartData = Object.entries(dailyData).map(([date, profit]) => ({
            date: date,
            profit: profit
        }));
        
        console.log('📊 Processed profit/loss chart data:', chartData);
        
        return window.chartService.createProfitLossChart(containerId, chartData);
        
    } catch (error) {
        console.error('❌ Error creating profit/loss chart:', error);
        window.chartService.showChartPlaceholder(
            document.getElementById(containerId), 
            'Unable to load profit data'
        );
    }
}

async function createUserWinRateChart(containerId, userWallet) {
    console.log('📊 Creating user win rate chart for wallet:', userWallet);
    
    try {
        // Check if supabase is available
        if (!window.supabase) {
            console.error('❌ Supabase not available');
            window.chartService.showChartPlaceholder(
                document.getElementById(containerId), 
                'Database connection required'
            );
            return;
        }

        const { data, error } = await window.supabase
            .from('bets')
            .select('status, timestamp')
            .eq('user_wallet', userWallet)
            .order('timestamp', { ascending: true });
            
        if (error) {
            console.error('❌ Database query error:', error);
            throw error;
        }
        
        console.log('📊 User win rate data:', data);
        
        // Group by date and calculate daily win rate
        const dailyData = {};
        if (data && data.length > 0) {
            data.forEach(bet => {
                const date = new Date(bet.timestamp).toDateString();
                if (!dailyData[date]) dailyData[date] = { wins: 0, total: 0 };
                dailyData[date].total++;
                if (bet.status === 'WON') dailyData[date].wins++;
            });
        }
        
        const chartData = Object.entries(dailyData).map(([date, stats]) => ({
            date: date,
            winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
        }));
        
        console.log('📊 Processed win rate chart data:', chartData);
        
        return window.chartService.createWinRateTrend(containerId, chartData);
        
    } catch (error) {
        console.error('❌ Error creating win rate chart:', error);
        window.chartService.showChartPlaceholder(
            document.getElementById(containerId), 
            'Unable to load win rate data'
        );
    }
}

// Initialize global chart service
console.log('📊 Initializing ChartService...');
window.chartService = new ChartService();

// Export chart creation functions globally
window.createUserBettingDistribution = createUserBettingDistribution;
window.createUserProfitLossChart = createUserProfitLossChart;
window.createUserWinRateChart = createUserWinRateChart;

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartService;
}

console.log('✅ Chart service and functions ready');
