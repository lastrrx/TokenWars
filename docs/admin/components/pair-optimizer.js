/**
 * PairOptimizer Component - Token Pair Optimization Engine
 * Handles intelligent pair generation, performance analytics, and algorithm tuning
 */

class PairOptimizer {
    constructor(adminState) {
        this.adminState = adminState;
        this.isInitialized = false;
        this.optimizationInterval = null;
        this.performanceChart = null;
        this.abTestResults = [];
        
        // Optimization algorithms
        this.algorithms = {
            MARKET_CAP_MATCHING: 'market_cap_matching',
            VOLATILITY_BALANCE: 'volatility_balance',
            COMMUNITY_INTEREST: 'community_interest',
            HISTORICAL_PERFORMANCE: 'historical_performance',
            PREDICTIVE_ML: 'predictive_ml'
        };
        
        // Pair generation strategies
        this.strategies = {
            CONSERVATIVE: 'conservative',
            BALANCED: 'balanced',
            AGGRESSIVE: 'aggressive',
            EXPERIMENTAL: 'experimental'
        };
        
        // Performance metrics
        this.metrics = {
            SUCCESS_RATE: 'success_rate',
            ENGAGEMENT: 'engagement',
            REVENUE: 'revenue',
            USER_SATISFACTION: 'user_satisfaction',
            COMPLETION_RATE: 'completion_rate'
        };
        
        console.log('PairOptimizer: Component initialized');
    }

    /**
     * Initialize Pair Optimizer Component
     */
    async initialize() {
        try {
            console.log('⚡ Initializing Pair Optimizer...');
            
            // Load historical performance data
            await this.loadPerformanceData();
            
            // Load optimization settings
            await this.loadOptimizationSettings();
            
            // Load community feedback data
            await this.loadCommunityFeedback();
            
            // Start performance monitoring
            this.startPerformanceMonitoring();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Pair Optimizer initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Pair Optimizer:', error);
            return false;
        }
    }

    /**
     * Load Performance Data
     */
    async loadPerformanceData() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                console.warn('Supabase not available, using demo data');
                this.loadDemoPerformanceData();
                return;
            }

            // Load from database
            const { data: performanceData, error } = await supabase
                .from('pair_performance_analytics')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.warn('Could not load performance data from database:', error);
                this.loadDemoPerformanceData();
                return;
            }

            this.processPerformanceData(performanceData || []);
            console.log('✅ Performance data loaded from database');
            
        } catch (error) {
            console.error('Error loading performance data:', error);
            this.loadDemoPerformanceData();
        }
    }

    /**
     * Load Demo Performance Data (Fallback)
     */
    loadDemoPerformanceData() {
        const demoData = {
            dailyMetrics: this.generateDailyMetrics(30), // Last 30 days
            pairHistory: this.generatePairHistory(50), // Last 50 pairs
            algorithmPerformance: {
                [this.algorithms.MARKET_CAP_MATCHING]: { successRate: 0.92, avgEngagement: 0.78 },
                [this.algorithms.VOLATILITY_BALANCE]: { successRate: 0.89, avgEngagement: 0.82 },
                [this.algorithms.COMMUNITY_INTEREST]: { successRate: 0.85, avgEngagement: 0.95 },
                [this.algorithms.HISTORICAL_PERFORMANCE]: { successRate: 0.94, avgEngagement: 0.71 },
                [this.algorithms.PREDICTIVE_ML]: { successRate: 0.87, avgEngagement: 0.88 }
            },
            userFeedback: this.generateUserFeedback(100),
            seasonalTrends: this.generateSeasonalTrends()
        };

        this.performanceData = demoData;
        this.updatePerformanceMetrics();
        console.log('📊 Using demo performance data');
    }

    /**
     * Generate Daily Metrics
     */
    generateDailyMetrics(days) {
        const metrics = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const dayMetrics = {
                date: date.toISOString().split('T')[0],
                pairsGenerated: Math.floor(Math.random() * 10) + 5,
                successfulPairs: Math.floor(Math.random() * 8) + 4,
                avgEngagement: 0.7 + Math.random() * 0.25,
                revenueGenerated: (Math.random() * 200) + 100,
                userSatisfaction: 0.8 + Math.random() * 0.15,
                completionRate: 0.75 + Math.random() * 0.2
            };
            
            dayMetrics.successRate = dayMetrics.successfulPairs / dayMetrics.pairsGenerated;
            metrics.push(dayMetrics);
        }
        
        return metrics;
    }

    /**
     * Generate Pair History
     */
    generatePairHistory(count) {
        const pairs = [];
        const tokens = ['SOL', 'USDC', 'MSOL', 'JUP', 'BONK', 'RENDER', 'RAY', 'SRM', 'COPE', 'STEP'];
        
        for (let i = 0; i < count; i++) {
            const tokenA = tokens[Math.floor(Math.random() * tokens.length)];
            let tokenB = tokens[Math.floor(Math.random() * tokens.length)];
            while (tokenB === tokenA) {
                tokenB = tokens[Math.floor(Math.random() * tokens.length)];
            }
            
            const pair = {
                id: i + 1,
                tokenA,
                tokenB,
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                algorithm: Object.values(this.algorithms)[Math.floor(Math.random() * Object.values(this.algorithms).length)],
                strategy: Object.values(this.strategies)[Math.floor(Math.random() * Object.values(this.strategies).length)],
                marketCapRatio: 0.8 + Math.random() * 0.4,
                compatibilityScore: 0.6 + Math.random() * 0.4,
                participants: Math.floor(Math.random() * 100) + 20,
                volume: Math.random() * 10000 + 1000,
                duration: Math.random() * 48 + 12, // 12-60 hours
                outcome: Math.random() > 0.15 ? 'successful' : 'failed',
                userRating: 1 + Math.random() * 4, // 1-5 stars
                engagementScore: Math.random(),
                revenueGenerated: Math.random() * 500 + 50
            };
            
            pairs.push(pair);
        }
        
        return pairs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Generate User Feedback
     */
    generateUserFeedback(count) {
        const feedbackTypes = ['positive', 'neutral', 'negative'];
        const feedbackMessages = {
            positive: [
                'Great token pairing!',
                'Love these competition matchups',
                'Perfect balance of risk and reward',
                'Exciting pairs to bet on',
                'Well-matched tokens'
            ],
            neutral: [
                'Decent pair selection',
                'Could be more interesting',
                'Average competition',
                'Nothing special but okay',
                'Standard pairing'
            ],
            negative: [
                'Boring token combination',
                'Too predictable',
                'Unfair matchup',
                'Not interested in these tokens',
                'Poor pairing choice'
            ]
        };
        
        const feedback = [];
        
        for (let i = 0; i < count; i++) {
            const type = feedbackTypes[Math.floor(Math.random() * feedbackTypes.length)];
            const messages = feedbackMessages[type];
            
            feedback.push({
                id: i + 1,
                type,
                rating: type === 'positive' ? 4 + Math.random() : 
                       type === 'neutral' ? 2 + Math.random() * 2 : 
                       1 + Math.random(),
                message: messages[Math.floor(Math.random() * messages.length)],
                pairId: Math.floor(Math.random() * 50) + 1,
                userId: `user_${Math.floor(Math.random() * 1000)}`,
                submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                helpful: Math.floor(Math.random() * 20),
                verified: Math.random() > 0.3
            });
        }
        
        return feedback.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    }

    /**
     * Generate Seasonal Trends
     */
    generateSeasonalTrends() {
        return {
            bullMarket: {
                preferredCategories: ['defi', 'gaming', 'nft'],
                volatilityTolerance: 0.8,
                riskAppetite: 0.9,
                engagementMultiplier: 1.3
            },
            bearMarket: {
                preferredCategories: ['stablecoin', 'utility', 'infrastructure'],
                volatilityTolerance: 0.4,
                riskAppetite: 0.3,
                engagementMultiplier: 0.7
            },
            sideways: {
                preferredCategories: ['meme', 'community', 'experimental'],
                volatilityTolerance: 0.6,
                riskAppetite: 0.6,
                engagementMultiplier: 1.0
            }
        };
    }

    /**
     * Load Optimization Settings
     */
    async loadOptimizationSettings() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                // Use default settings
                this.setDefaultOptimizationSettings();
                return;
            }

            // Load from database
            const { data: settings, error } = await supabase
                .from('pair_optimization_settings')
                .select('*')
                .eq('is_active', true)
                .single();

            if (error || !settings) {
                console.warn('Using default optimization settings');
                this.setDefaultOptimizationSettings();
                return;
            }

            this.adminState.pairOptimizationState.algorithm = {
                ...this.adminState.pairOptimizationState.algorithm,
                ...settings.algorithm_config
            };

            console.log('✅ Optimization settings loaded');
            
        } catch (error) {
            console.error('Error loading optimization settings:', error);
            this.setDefaultOptimizationSettings();
        }
    }

    /**
     * Set Default Optimization Settings
     */
    setDefaultOptimizationSettings() {
        this.adminState.pairOptimizationState.algorithm = {
            marketCapTolerance: 10,
            liquidityMinimum: 30,
            newTokenPriority: 25,
            balancedExposure: 75,
            communityWeight: 40,
            feedbackWeight: 30,
            minFeedbackCount: 10,
            riskTolerance: 60,
            volatilityPreference: 50,
            seasonalAdjustment: true,
            mlPredictionWeight: 20
        };
    }

    /**
     * Load Community Feedback
     */
    async loadCommunityFeedback() {
        try {
            if (this.performanceData?.userFeedback) {
                this.processCommunityFeedback(this.performanceData.userFeedback);
                console.log('✅ Community feedback processed');
            }
        } catch (error) {
            console.error('Error loading community feedback:', error);
        }
    }

    /**
     * Process Community Feedback
     */
    processCommunityFeedback(feedback) {
        const summary = {
            totalFeedback: feedback.length,
            averageRating: feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length,
            positivePercentage: (feedback.filter(f => f.type === 'positive').length / feedback.length) * 100,
            verifiedFeedbackPercentage: (feedback.filter(f => f.verified).length / feedback.length) * 100,
            topConcerns: this.extractTopConcerns(feedback),
            recommendations: this.generateFeedbackRecommendations(feedback)
        };

        this.communityFeedbackSummary = summary;
    }

    /**
     * Extract Top Concerns from Feedback
     */
    extractTopConcerns(feedback) {
        const concerns = {};
        const negativeFeedback = feedback.filter(f => f.type === 'negative');
        
        negativeFeedback.forEach(f => {
            const words = f.message.toLowerCase().split(' ');
            words.forEach(word => {
                if (word.length > 3) {
                    concerns[word] = (concerns[word] || 0) + 1;
                }
            });
        });
        
        return Object.entries(concerns)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word, count]) => ({ concern: word, frequency: count }));
    }

    /**
     * Generate Feedback Recommendations
     */
    generateFeedbackRecommendations(feedback) {
        const recommendations = [];
        const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
        
        if (avgRating < 3) {
            recommendations.push({
                type: 'critical',
                message: 'Overall user satisfaction is low. Consider reviewing pair selection algorithm.',
                action: 'algorithm_review'
            });
        }
        
        const negativePercentage = (feedback.filter(f => f.type === 'negative').length / feedback.length) * 100;
        if (negativePercentage > 30) {
            recommendations.push({
                type: 'warning',
                message: 'High percentage of negative feedback. Investigate common complaints.',
                action: 'feedback_analysis'
            });
        }
        
        const recentFeedback = feedback.filter(f => 
            new Date(f.submittedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        
        if (recentFeedback.length < feedback.length * 0.1) {
            recommendations.push({
                type: 'info',
                message: 'Low recent feedback volume. Consider increasing user engagement.',
                action: 'engagement_boost'
            });
        }
        
        return recommendations;
    }

    /**
     * Start Performance Monitoring
     */
    startPerformanceMonitoring() {
        // Monitor performance every 2 minutes
        this.optimizationInterval = setInterval(async () => {
            try {
                await this.updatePerformanceMetrics();
                await this.runOptimizationAnalysis();
            } catch (error) {
                console.error('Performance monitoring error:', error);
            }
        }, 2 * 60 * 1000);

        console.log('✅ Performance monitoring started');
    }

    /**
     * Update Performance Metrics
     */
    async updatePerformanceMetrics() {
        try {
            if (!this.performanceData) return;
            
            const latest = this.performanceData.dailyMetrics.slice(-7); // Last 7 days
            
            this.adminState.pairOptimizationState.performance = {
                successRate: latest.reduce((sum, day) => sum + day.successRate, 0) / latest.length * 100,
                avgEngagement: latest.reduce((sum, day) => sum + day.avgEngagement, 0) / latest.length * 100,
                activePairs: Math.floor(Math.random() * 20) + 10, // Simulated
                revenuePerPair: latest.reduce((sum, day) => sum + day.revenueGenerated, 0) / 
                               latest.reduce((sum, day) => sum + day.pairsGenerated, 0),
                totalGenerated: this.performanceData.pairHistory.length,
                successful: this.performanceData.pairHistory.filter(p => p.outcome === 'successful').length,
                avgDuration: this.performanceData.pairHistory.reduce((sum, p) => sum + p.duration, 0) / 
                            this.performanceData.pairHistory.length,
                userSatisfaction: this.communityFeedbackSummary?.averageRating || 4.2
            };
            
        } catch (error) {
            console.error('Error updating performance metrics:', error);
        }
    }

    /**
     * Run Optimization Analysis
     */
    async runOptimizationAnalysis() {
        try {
            // Analyze algorithm performance
            const algorithmAnalysis = this.analyzeAlgorithmPerformance();
            
            // Check for optimization opportunities
            const opportunities = this.identifyOptimizationOpportunities();
            
            // Generate recommendations
            const recommendations = this.generateOptimizationRecommendations(algorithmAnalysis, opportunities);
            
            this.optimizationAnalysis = {
                algorithmAnalysis,
                opportunities,
                recommendations,
                lastAnalysis: new Date()
            };
            
        } catch (error) {
            console.error('Error in optimization analysis:', error);
        }
    }

    /**
     * Analyze Algorithm Performance
     */
    analyzeAlgorithmPerformance() {
        if (!this.performanceData?.algorithmPerformance) return {};
        
        const analysis = {};
        
        Object.entries(this.performanceData.algorithmPerformance).forEach(([algorithm, metrics]) => {
            analysis[algorithm] = {
                ...metrics,
                score: (metrics.successRate * 0.6) + (metrics.avgEngagement * 0.4),
                trend: this.calculateAlgorithmTrend(algorithm),
                recommendation: this.getAlgorithmRecommendation(metrics)
            };
        });
        
        return analysis;
    }

    /**
     * Calculate Algorithm Trend
     */
    calculateAlgorithmTrend(algorithm) {
        // Simulate trend calculation
        const trends = ['improving', 'stable', 'declining'];
        return trends[Math.floor(Math.random() * trends.length)];
    }

    /**
     * Get Algorithm Recommendation
     */
    getAlgorithmRecommendation(metrics) {
        if (metrics.successRate < 0.8) {
            return 'Consider adjusting parameters to improve success rate';
        } else if (metrics.avgEngagement < 0.7) {
            return 'Focus on improving user engagement with this algorithm';
        } else {
            return 'Performance is good, continue current settings';
        }
    }

    /**
     * Identify Optimization Opportunities
     */
    identifyOptimizationOpportunities() {
        const opportunities = [];
        const { performance } = this.adminState.pairOptimizationState;
        
        if (performance.successRate < 90) {
            opportunities.push({
                type: 'success_rate',
                severity: 'medium',
                description: 'Success rate could be improved',
                potential_impact: 'high',
                estimated_improvement: '5-10%'
            });
        }
        
        if (performance.avgEngagement < 80) {
            opportunities.push({
                type: 'engagement',
                severity: 'high',
                description: 'User engagement is below target',
                potential_impact: 'very_high',
                estimated_improvement: '15-25%'
            });
        }
        
        if (performance.userSatisfaction < 4.0) {
            opportunities.push({
                type: 'satisfaction',
                severity: 'critical',
                description: 'User satisfaction needs immediate attention',
                potential_impact: 'critical',
                estimated_improvement: '20-30%'
            });
        }
        
        return opportunities;
    }

    /**
     * Generate Optimization Recommendations
     */
    generateOptimizationRecommendations(algorithmAnalysis, opportunities) {
        const recommendations = [];
        
        // Algorithm-based recommendations
        Object.entries(algorithmAnalysis).forEach(([algorithm, analysis]) => {
            if (analysis.score < 0.7) {
                recommendations.push({
                    type: 'algorithm_tuning',
                    priority: 'high',
                    algorithm,
                    recommendation: analysis.recommendation,
                    estimated_effort: 'medium'
                });
            }
        });
        
        // Opportunity-based recommendations
        opportunities.forEach(opportunity => {
            recommendations.push({
                type: 'optimization_opportunity',
                priority: opportunity.severity,
                description: opportunity.description,
                potential_impact: opportunity.potential_impact,
                estimated_improvement: opportunity.estimated_improvement
            });
        });
        
        // General recommendations
        if (this.communityFeedbackSummary?.averageRating < 4.0) {
            recommendations.push({
                type: 'user_feedback',
                priority: 'high',
                recommendation: 'Implement user feedback suggestions to improve satisfaction',
                estimated_effort: 'high'
            });
        }
        
        return recommendations;
    }

    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        // Optimization actions
        document.addEventListener('click', (e) => {
            if (e.target.onclick?.toString().includes('generateOptimalPairs')) {
                this.generateOptimalPairs();
            } else if (e.target.onclick?.toString().includes('testPairCombination')) {
                this.testPairCombination();
            } else if (e.target.onclick?.toString().includes('saveOptimizationSettings')) {
                this.saveOptimizationSettings();
            } else if (e.target.onclick?.toString().includes('resetToDefaults')) {
                this.resetToDefaults();
            } else if (e.target.onclick?.toString().includes('runABTest')) {
                this.runABTest();
            } else if (e.target.onclick?.toString().includes('viewFeedbackData')) {
                this.viewFeedbackData();
            } else if (e.target.onclick?.toString().includes('integrateFeedback')) {
                this.integrateFeedback();
            }
        });

        // Algorithm settings updates
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('optimization-slider')) {
                this.updateAlgorithmSettings();
            }
        });

        console.log('✅ Pair optimizer event listeners set up');
    }

    /**
     * Generate Optimal Pairs
     */
    async generateOptimalPairs() {
        try {
            console.log('⚡ Generating optimal token pairs...');
            this.showAdminNotification('Optimal pair generation started...', 'info');
            
            // Get current algorithm settings
            const settings = this.adminState.pairOptimizationState.algorithm;
            
            // Get available tokens
            const tokens = await this.getAvailableTokens();
            if (tokens.length < 2) {
                this.showAdminNotification('Insufficient tokens for pair generation', 'warning');
                return;
            }
            
            // Generate pairs using optimized algorithm
            const optimalPairs = await this.runPairGenerationAlgorithm(tokens, settings);
            
            // Evaluate pairs
            const evaluatedPairs = this.evaluatePairQuality(optimalPairs);
            
            // Save generated pairs
            await this.savePairGeneration(evaluatedPairs);
            
            this.showAdminNotification(
                `Generated ${evaluatedPairs.length} optimal pairs with avg score ${evaluatedPairs.reduce((sum, p) => sum + p.score, 0) / evaluatedPairs.length * 100}%`, 
                'success'
            );
            
        } catch (error) {
            console.error('Error generating optimal pairs:', error);
            this.showAdminNotification('Optimal pair generation failed', 'error');
        }
    }

    /**
     * Get Available Tokens
     */
    async getAvailableTokens() {
        try {
            if (this.adminState.tokenService) {
                return await this.adminState.tokenService.getEligibleTokens();
            }
            
            // Fallback to demo tokens
            return [
                { symbol: 'SOL', marketCap: 45000000000, liquidity: 0.95, volatility: 0.15 },
                { symbol: 'USDC', marketCap: 42000000000, liquidity: 0.98, volatility: 0.02 },
                { symbol: 'MSOL', marketCap: 1200000000, liquidity: 0.85, volatility: 0.18 },
                { symbol: 'JUP', marketCap: 1500000000, liquidity: 0.82, volatility: 0.25 },
                { symbol: 'BONK', marketCap: 900000000, liquidity: 0.75, volatility: 0.35 },
                { symbol: 'RENDER', marketCap: 850000000, liquidity: 0.78, volatility: 0.28 }
            ];
        } catch (error) {
            console.error('Error getting available tokens:', error);
            return [];
        }
    }

    /**
     * Run Pair Generation Algorithm
     */
    async runPairGenerationAlgorithm(tokens, settings) {
        const pairs = [];
        const usedTokens = new Set();
        
        // Sort tokens by various criteria
        const sortedByMarketCap = [...tokens].sort((a, b) => b.marketCap - a.marketCap);
        const sortedByLiquidity = [...tokens].sort((a, b) => b.liquidity - a.liquidity);
        
        for (let i = 0; i < sortedByMarketCap.length - 1; i++) {
            for (let j = i + 1; j < sortedByMarketCap.length; j++) {
                const tokenA = sortedByMarketCap[i];
                const tokenB = sortedByMarketCap[j];
                
                // Skip if tokens already used
                if (usedTokens.has(tokenA.symbol) || usedTokens.has(tokenB.symbol)) {
                    continue;
                }
                
                // Check compatibility
                const compatibility = this.calculatePairCompatibility(tokenA, tokenB, settings);
                
                if (compatibility.score >= 0.7) {
                    pairs.push({
                        tokenA,
                        tokenB,
                        compatibility,
                        algorithm: this.algorithms.MARKET_CAP_MATCHING,
                        strategy: this.determineStrategy(compatibility.score),
                        generatedAt: new Date()
                    });
                    
                    usedTokens.add(tokenA.symbol);
                    usedTokens.add(tokenB.symbol);
                    
                    if (pairs.length >= 10) break; // Limit pairs
                }
            }
            if (pairs.length >= 10) break;
        }
        
        return pairs;
    }

    /**
     * Calculate Pair Compatibility
     */
    calculatePairCompatibility(tokenA, tokenB, settings) {
        let score = 0;
        const factors = [];
        
        // Market cap similarity
        const marketCapRatio = Math.min(tokenA.marketCap, tokenB.marketCap) / 
                              Math.max(tokenA.marketCap, tokenB.marketCap);
        const marketCapScore = Math.max(0, (marketCapRatio - 0.5) * 2);
        score += marketCapScore * (settings.marketCapTolerance / 100);
        factors.push({ factor: 'market_cap', score: marketCapScore });
        
        // Liquidity compatibility
        const avgLiquidity = (tokenA.liquidity + tokenB.liquidity) / 2;
        const liquidityScore = Math.max(0, (avgLiquidity - settings.liquidityMinimum / 100) * 2);
        score += liquidityScore * 0.2;
        factors.push({ factor: 'liquidity', score: liquidityScore });
        
        // Volatility balance
        const volatilityDiff = Math.abs(tokenA.volatility - tokenB.volatility);
        const volatilityScore = Math.max(0, 1 - volatilityDiff * 2);
        score += volatilityScore * (settings.balancedExposure / 100);
        factors.push({ factor: 'volatility', score: volatilityScore });
        
        // Community interest (simulated)
        const communityScore = Math.random() * 0.8 + 0.2;
        score += communityScore * (settings.communityWeight / 100);
        factors.push({ factor: 'community', score: communityScore });
        
        return {
            score: Math.min(score, 1.0),
            factors,
            marketCapRatio,
            avgLiquidity,
            volatilityDiff
        };
    }

    /**
     * Determine Strategy
     */
    determineStrategy(compatibilityScore) {
        if (compatibilityScore >= 0.9) return this.strategies.CONSERVATIVE;
        if (compatibilityScore >= 0.8) return this.strategies.BALANCED;
        if (compatibilityScore >= 0.7) return this.strategies.AGGRESSIVE;
        return this.strategies.EXPERIMENTAL;
    }

    /**
     * Evaluate Pair Quality
     */
    evaluatePairQuality(pairs) {
        return pairs.map(pair => {
            const qualityScore = this.calculateQualityScore(pair);
            return {
                ...pair,
                score: qualityScore.overall,
                qualityFactors: qualityScore.factors,
                recommendation: this.getPairRecommendation(qualityScore.overall)
            };
        }).sort((a, b) => b.score - a.score);
    }

    /**
     * Calculate Quality Score
     */
    calculateQualityScore(pair) {
        const factors = {
            compatibility: pair.compatibility.score * 0.4,
            marketBalance: this.assessMarketBalance(pair) * 0.3,
            userAppeal: this.assessUserAppeal(pair) * 0.2,
            riskProfile: this.assessRiskProfile(pair) * 0.1
        };
        
        const overall = Object.values(factors).reduce((sum, score) => sum + score, 0);
        
        return { overall, factors };
    }

    /**
     * Assess Market Balance
     */
    assessMarketBalance(pair) {
        const ratio = pair.compatibility.marketCapRatio;
        return ratio > 0.8 ? 1.0 : ratio > 0.6 ? 0.8 : ratio > 0.4 ? 0.6 : 0.4;
    }

    /**
     * Assess User Appeal
     */
    assessUserAppeal(pair) {
        // Simulated based on token popularity
        const popularTokens = ['SOL', 'USDC', 'JUP', 'BONK'];
        const appealScore = (popularTokens.includes(pair.tokenA.symbol) ? 0.5 : 0) +
                           (popularTokens.includes(pair.tokenB.symbol) ? 0.5 : 0);
        return Math.max(0.3, appealScore + Math.random() * 0.3);
    }

    /**
     * Assess Risk Profile
     */
    assessRiskProfile(pair) {
        const avgVolatility = (pair.tokenA.volatility + pair.tokenB.volatility) / 2;
        return avgVolatility < 0.2 ? 1.0 : avgVolatility < 0.3 ? 0.8 : 0.6;
    }

    /**
     * Get Pair Recommendation
     */
    getPairRecommendation(score) {
        if (score >= 0.9) return 'Excellent pair - highly recommended';
        if (score >= 0.8) return 'Good pair - recommended';
        if (score >= 0.7) return 'Acceptable pair - monitor performance';
        return 'Poor pair - consider alternatives';
    }

    /**
     * Save Pair Generation
     */
    async savePairGeneration(pairs) {
        try {
            // Update state
            this.adminState.pairOptimizationState.lastOptimization = new Date();
            
            // Save to database if available
            const supabase = this.getSupabase();
            if (supabase) {
                await supabase
                    .from('generated_pairs')
                    .insert(pairs.map(pair => ({
                        token_a_symbol: pair.tokenA.symbol,
                        token_b_symbol: pair.tokenB.symbol,
                        compatibility_score: pair.compatibility.score,
                        quality_score: pair.score,
                        algorithm: pair.algorithm,
                        strategy: pair.strategy,
                        generated_at: pair.generatedAt
                    })));
            }
            
            console.log(`✅ Saved ${pairs.length} generated pairs`);
            
        } catch (error) {
            console.error('Error saving pair generation:', error);
        }
    }

    /**
     * Test Pair Combination
     */
    async testPairCombination() {
        try {
            console.log('🧪 Testing pair combination...');
            
            // Get test parameters
            const testConfig = {
                tokenA: prompt('Enter first token symbol:'),
                tokenB: prompt('Enter second token symbol:'),
                duration: 24 // hours
            };
            
            if (!testConfig.tokenA || !testConfig.tokenB) {
                this.showAdminNotification('Test cancelled - missing token symbols', 'warning');
                return;
            }
            
            // Run compatibility test
            const tokens = await this.getAvailableTokens();
            const tokenA = tokens.find(t => t.symbol === testConfig.tokenA.toUpperCase());
            const tokenB = tokens.find(t => t.symbol === testConfig.tokenB.toUpperCase());
            
            if (!tokenA || !tokenB) {
                this.showAdminNotification('One or both tokens not found', 'error');
                return;
            }
            
            const compatibility = this.calculatePairCompatibility(
                tokenA, 
                tokenB, 
                this.adminState.pairOptimizationState.algorithm
            );
            
            // Show test results
            this.showTestResults(testConfig, compatibility);
            
        } catch (error) {
            console.error('Error testing pair combination:', error);
            this.showAdminNotification('Pair combination test failed', 'error');
        }
    }

    /**
     * Show Test Results
     */
    showTestResults(testConfig, compatibility) {
        const modalHtml = `
            <div class="modal" id="test-results-modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                    <h3>🧪 Pair Combination Test Results</h3>
                    
                    <div style="margin: 1rem 0;">
                        <h4>Test Configuration</h4>
                        <p><strong>Token Pair:</strong> ${testConfig.tokenA} vs ${testConfig.tokenB}</p>
                        <p><strong>Test Duration:</strong> ${testConfig.duration} hours</p>
                    </div>
                    
                    <div style="margin: 1rem 0;">
                        <h4>Compatibility Analysis</h4>
                        <p><strong>Overall Score:</strong> ${(compatibility.score * 100).toFixed(1)}%</p>
                        <p><strong>Market Cap Ratio:</strong> ${compatibility.marketCapRatio.toFixed(3)}</p>
                        <p><strong>Average Liquidity:</strong> ${(compatibility.avgLiquidity * 100).toFixed(1)}%</p>
                        <p><strong>Volatility Difference:</strong> ${compatibility.volatilityDiff.toFixed(3)}</p>
                    </div>
                    
                    <div style="margin: 1rem 0;">
                        <h4>Factor Breakdown</h4>
                        ${compatibility.factors.map(factor => `
                            <div style="display: flex; justify-content: space-between; margin: 0.25rem 0;">
                                <span>${factor.factor.replace('_', ' ').toUpperCase()}:</span>
                                <span>${(factor.score * 100).toFixed(1)}%</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="margin: 1rem 0;">
                        <h4>Recommendation</h4>
                        <p class="status-badge ${compatibility.score >= 0.8 ? 'active' : compatibility.score >= 0.6 ? 'warning' : 'inactive'}">
                            ${compatibility.score >= 0.8 ? 'Excellent pair - highly recommended' :
                              compatibility.score >= 0.6 ? 'Good pair - acceptable for use' :
                              'Poor pair - not recommended'}
                        </p>
                    </div>
                    
                    <div style="text-align: right; margin-top: 2rem;">
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
     * Save Optimization Settings
     */
    async saveOptimizationSettings() {
        try {
            console.log('💾 Saving optimization settings...');
            
            // Get values from form
            const settings = this.getSettingsFromForm();
            
            // Update state
            this.adminState.pairOptimizationState.algorithm = {
                ...this.adminState.pairOptimizationState.algorithm,
                ...settings
            };
            
            // Save to database
            const supabase = this.getSupabase();
            if (supabase) {
                await supabase
                    .from('pair_optimization_settings')
                    .upsert({
                        id: 1,
                        algorithm_config: this.adminState.pairOptimizationState.algorithm,
                        is_active: true,
                        updated_at: new Date()
                    });
            }
            
            this.showAdminNotification('Optimization settings saved successfully', 'success');
            
        } catch (error) {
            console.error('Error saving optimization settings:', error);
            this.showAdminNotification('Failed to save settings', 'error');
        }
    }

    /**
     * Get Settings from Form
     */
    getSettingsFromForm() {
        const settings = {};
        
        const sliders = [
            'market-cap-tolerance',
            'liquidity-minimum',
            'new-token-priority',
            'balanced-exposure',
            'community-weight',
            'feedback-weight',
            'min-feedback-count'
        ];
        
        sliders.forEach(sliderId => {
            const slider = document.getElementById(sliderId);
            if (slider) {
                const key = sliderId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                settings[key] = parseInt(slider.value);
            }
        });
        
        return settings;
    }

    /**
     * Reset to Defaults
     */
    resetToDefaults() {
        if (!confirm('🔄 Reset all optimization settings to defaults?')) {
            return;
        }
        
        this.setDefaultOptimizationSettings();
        this.updateAlgorithmSettingsDisplay();
        
        this.showAdminNotification('Settings reset to defaults', 'warning');
        console.log('🔄 Optimization settings reset to defaults');
    }

    /**
     * Run A/B Test
     */
    async runABTest() {
        try {
            console.log('🎯 Starting A/B test...');
            this.showAdminNotification('A/B test initiated...', 'info');
            
            // Create test variations
            const testVariations = this.createTestVariations();
            
            // Simulate test execution
            setTimeout(async () => {
                const results = await this.simulateABTestResults(testVariations);
                this.showABTestResults(results);
            }, 3000);
            
        } catch (error) {
            console.error('Error running A/B test:', error);
            this.showAdminNotification('A/B test failed', 'error');
        }
    }

    /**
     * Create Test Variations
     */
    createTestVariations() {
        const currentSettings = this.adminState.pairOptimizationState.algorithm;
        
        return {
            control: { ...currentSettings },
            variation1: {
                ...currentSettings,
                marketCapTolerance: currentSettings.marketCapTolerance + 5,
                communityWeight: currentSettings.communityWeight + 10
            },
            variation2: {
                ...currentSettings,
                liquidityMinimum: currentSettings.liquidityMinimum - 5,
                balancedExposure: currentSettings.balancedExposure + 10
            }
        };
    }

    /**
     * Simulate A/B Test Results
     */
    async simulateABTestResults(variations) {
        const results = {};
        
        Object.keys(variations).forEach(variation => {
            results[variation] = {
                successRate: 0.75 + Math.random() * 0.2,
                engagement: 0.65 + Math.random() * 0.25,
                userSatisfaction: 3.5 + Math.random() * 1.3,
                revenue: 100 + Math.random() * 150,
                sampleSize: 1000 + Math.floor(Math.random() * 500)
            };
        });
        
        return results;
    }

    /**
     * Show A/B Test Results
     */
    showABTestResults(results) {
        const modalHtml = `
            <div class="modal" id="ab-test-results-modal">
                <div class="modal-content" style="max-width: 800px;">
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                    <h3>🎯 A/B Test Results</h3>
                    
                    <div style="overflow-x: auto;">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Variation</th>
                                    <th>Success Rate</th>
                                    <th>Engagement</th>
                                    <th>User Satisfaction</th>
                                    <th>Revenue</th>
                                    <th>Sample Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(results).map(([variation, data]) => `
                                    <tr>
                                        <td><strong>${variation.toUpperCase()}</strong></td>
                                        <td>${(data.successRate * 100).toFixed(1)}%</td>
                                        <td>${(data.engagement * 100).toFixed(1)}%</td>
                                        <td>${data.userSatisfaction.toFixed(1)}/5</td>
                                        <td>$${data.revenue.toFixed(2)}</td>
                                        <td>${data.sampleSize}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="margin: 1rem 0;">
                        <h4>Recommendations</h4>
                        <div class="analytics-insight">
                            <div class="insight-title">Test Conclusions</div>
                            <div class="insight-description">
                                Based on the results, ${this.getWinningVariation(results)} shows the best overall performance.
                                Consider implementing these settings for improved results.
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: right; margin-top: 2rem;">
                        <button class="btn btn-primary" onclick="window.PairOptimizer.instance.implementWinningVariation('${this.getWinningVariation(results)}')">
                            Implement Winner
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.abTestResults = results;
    }

    /**
     * Get Winning Variation
     */
    getWinningVariation(results) {
        let bestVariation = 'control';
        let bestScore = 0;
        
        Object.entries(results).forEach(([variation, data]) => {
            const score = (data.successRate * 0.3) + (data.engagement * 0.3) + 
                         (data.userSatisfaction / 5 * 0.2) + (data.revenue / 250 * 0.2);
            
            if (score > bestScore) {
                bestScore = score;
                bestVariation = variation;
            }
        });
        
        return bestVariation;
    }

    /**
     * View Feedback Data
     */
    viewFeedbackData() {
        try {
            console.log('📊 Opening feedback data interface...');
            
            const feedback = this.performanceData?.userFeedback || [];
            this.showFeedbackDataModal(feedback);
            
        } catch (error) {
            console.error('Error viewing feedback data:', error);
        }
    }

    /**
     * Show Feedback Data Modal
     */
    showFeedbackDataModal(feedback) {
        const recentFeedback = feedback.slice(0, 20); // Show last 20
        
        const modalHtml = `
            <div class="modal" id="feedback-data-modal">
                <div class="modal-content" style="max-width: 900px;">
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                    <h3>📊 Community Feedback Data</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0;">
                        <div class="metric-item">
                            <div class="value">${feedback.length}</div>
                            <div class="label">Total Feedback</div>
                        </div>
                        <div class="metric-item">
                            <div class="value">${this.communityFeedbackSummary?.averageRating.toFixed(1) || 'N/A'}</div>
                            <div class="label">Average Rating</div>
                        </div>
                        <div class="metric-item">
                            <div class="value">${this.communityFeedbackSummary?.positivePercentage.toFixed(1) || 'N/A'}%</div>
                            <div class="label">Positive Feedback</div>
                        </div>
                        <div class="metric-item">
                            <div class="value">${this.communityFeedbackSummary?.verifiedFeedbackPercentage.toFixed(1) || 'N/A'}%</div>
                            <div class="label">Verified Users</div>
                        </div>
                    </div>
                    
                    <h4>Recent Feedback</h4>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${recentFeedback.map(f => `
                            <div style="border: 1px solid var(--admin-border); border-radius: 8px; padding: 1rem; margin: 0.5rem 0;">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                            <span class="status-badge ${f.type}">${f.type.toUpperCase()}</span>
                                            <span>Rating: ${f.rating.toFixed(1)}/5</span>
                                            ${f.verified ? '<span class="status-badge active">✓ Verified</span>' : ''}
                                        </div>
                                        <p style="margin: 0.5rem 0;">"${f.message}"</p>
                                        <small style="color: var(--admin-text-secondary);">
                                            ${new Date(f.submittedAt).toLocaleDateString()} • ${f.helpful} helpful votes
                                        </small>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="text-align: right; margin-top: 2rem;">
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
     * Integrate Feedback
     */
    async integrateFeedback() {
        try {
            console.log('🔄 Integrating community feedback...');
            this.showAdminNotification('Analyzing feedback for optimization insights...', 'info');
            
            // Analyze feedback patterns
            const insights = this.analyzeFeedbackPatterns();
            
            // Apply feedback-based optimizations
            const optimizations = this.generateFeedbackOptimizations(insights);
            
            // Update algorithm settings
            this.applyFeedbackOptimizations(optimizations);
            
            this.showAdminNotification(
                `Feedback integration completed. Applied ${optimizations.length} optimizations.`, 
                'success'
            );
            
        } catch (error) {
            console.error('Error integrating feedback:', error);
            this.showAdminNotification('Feedback integration failed', 'error');
        }
    }

    /**
     * Analyze Feedback Patterns
     */
    analyzeFeedbackPatterns() {
        const feedback = this.performanceData?.userFeedback || [];
        
        return {
            positivePatterns: this.extractPatterns(feedback.filter(f => f.type === 'positive')),
            negativePatterns: this.extractPatterns(feedback.filter(f => f.type === 'negative')),
            ratingTrends: this.analyzeRatingTrends(feedback),
            commonConcerns: this.communityFeedbackSummary?.topConcerns || []
        };
    }

    /**
     * Extract Patterns
     */
    extractPatterns(feedback) {
        const patterns = {};
        
        feedback.forEach(f => {
            const words = f.message.toLowerCase().split(' ');
            words.forEach(word => {
                if (word.length > 3) {
                    patterns[word] = (patterns[word] || 0) + 1;
                }
            });
        });
        
        return Object.entries(patterns)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word, count]) => ({ pattern: word, frequency: count }));
    }

    /**
     * Analyze Rating Trends
     */
    analyzeRatingTrends(feedback) {
        const recent = feedback.filter(f => 
            new Date(f.submittedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        
        const older = feedback.filter(f => 
            new Date(f.submittedAt) <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        
        const recentAvg = recent.reduce((sum, f) => sum + f.rating, 0) / recent.length;
        const olderAvg = older.reduce((sum, f) => sum + f.rating, 0) / older.length;
        
        return {
            recent: recentAvg,
            older: olderAvg,
            trend: recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable'
        };
    }

    /**
     * Generate Feedback Optimizations
     */
    generateFeedbackOptimizations(insights) {
        const optimizations = [];
        
        // Check for negative patterns
        insights.negativePatterns.forEach(pattern => {
            if (pattern.pattern.includes('boring') || pattern.pattern.includes('predictable')) {
                optimizations.push({
                    type: 'increase_variety',
                    setting: 'newTokenPriority',
                    adjustment: 10,
                    reason: 'Users find pairs boring/predictable'
                });
            }
            
            if (pattern.pattern.includes('unfair') || pattern.pattern.includes('unbalanced')) {
                optimizations.push({
                    type: 'improve_balance',
                    setting: 'marketCapTolerance',
                    adjustment: -5,
                    reason: 'Users report unfair/unbalanced pairs'
                });
            }
        });
        
        // Check rating trends
        if (insights.ratingTrends.trend === 'declining') {
            optimizations.push({
                type: 'boost_engagement',
                setting: 'communityWeight',
                adjustment: 15,
                reason: 'Rating trend is declining'
            });
        }
        
        return optimizations;
    }

    /**
     * Apply Feedback Optimizations
     */
    applyFeedbackOptimizations(optimizations) {
        optimizations.forEach(opt => {
            const currentValue = this.adminState.pairOptimizationState.algorithm[opt.setting];
            const newValue = Math.max(0, Math.min(100, currentValue + opt.adjustment));
            
            this.adminState.pairOptimizationState.algorithm[opt.setting] = newValue;
            
            console.log(`Applied optimization: ${opt.setting} ${currentValue} → ${newValue} (${opt.reason})`);
        });
        
        // Update display
        this.updateAlgorithmSettingsDisplay();
    }

    /**
     * Update Algorithm Settings Display
     */
    updateAlgorithmSettingsDisplay() {
        const settings = this.adminState.pairOptimizationState.algorithm;
        
        Object.entries(settings).forEach(([key, value]) => {
            const elementId = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            const slider = document.getElementById(elementId);
            
            if (slider) {
                slider.value = value;
                slider.dispatchEvent(new Event('input'));
            }
        });
    }

    /**
     * Update Algorithm Settings
     */
    updateAlgorithmSettings() {
        // Real-time update of algorithm settings as user adjusts sliders
        // This is called by the input event listener
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
        if (this.optimizationInterval) {
            clearInterval(this.optimizationInterval);
            this.optimizationInterval = null;
        }
        
        if (this.performanceChart) {
            this.performanceChart.destroy();
            this.performanceChart = null;
        }
        
        console.log('🧹 Pair Optimizer cleaned up');
    }
}

// Create singleton instance
PairOptimizer.instance = null;

// Export for global use
window.PairOptimizer = PairOptimizer;

console.log('✅ PairOptimizer component loaded');
console.log('⚡ Features:');
console.log('   🎯 Intelligent pair generation algorithm');
console.log('   📊 Performance analytics and monitoring');
console.log('   🔬 A/B testing for optimization');
console.log('   👥 Community feedback integration');
console.log('   📈 Historical performance tracking');
