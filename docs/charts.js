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
    }

    /**
     * Create Win Rate Trend Chart
     */
    createWinRateTrend(containerId, data) {
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
     * Create Profit/Loss Over Time Chart
     */
    createProfitLossChart(containerId, data) {
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
     * Create Token Performance Pie Chart
     */
    createTokenPerformanceChart(containerId, data) {
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
     * Create Betting Distribution Chart
     */
    createBettingDistributionChart(containerId, data) {
        const canvas = this.createCanvas(containerId, 'bettingDistribution');
        
        // Sample data: {tokenA: 60, tokenB: 40}
        const chartData = {
            labels: ['Token A Bets', 'Token B Bets'],
            datasets: [{
                data: [data.tokenA, data.tokenB],
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
     * Create Mini Streak Chart for User Cards
     */
    createMiniStreakChart(containerId, streakData) {
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
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container ${containerId} not found`);
        }

        // Remove existing canvas if any
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }

        const canvas = document.createElement('canvas');
        canvas.id = `chart-${chartId}`;
        container.appendChild(canvas);
        
        return canvas;
    }

    renderChart(canvas, config, chartId) {
        // Using Chart.js (needs to be loaded externally)
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library not loaded');
            this.showChartPlaceholder(canvas.parentElement, 'Chart.js library required');
            return null;
        }

        try {
            // Destroy existing chart if it exists
            if (this.charts.has(chartId)) {
                this.charts.get(chartId).destroy();
            }

            const chart = new Chart(canvas, config);
            this.charts.set(chartId, chart);
            
            return chart;
        } catch (error) {
            console.error('Error creating chart:', error);
            this.showChartPlaceholder(canvas.parentElement, 'Chart creation failed');
            return null;
        }
    }

    showChartPlaceholder(container, message) {
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
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}

// Initialize global chart service
window.chartService = new ChartService();

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartService;
}
