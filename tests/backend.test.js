/**
 * Backend Test Suite
 * Tests for API endpoints and backend functionality
 */

const request = require('supertest');
const { app } = require('../backend/server');
const database = require('../backend/database');
const { generateAuthToken } = require('../backend/auth');

// Mock database
jest.mock('../backend/database');

// Test data
const testUser = {
    wallet_address: 'TestBH5eHyxvC43xgHFjNUz3ZaH4qMKNcLLCEGq5CkWAT',
    username: 'test_user',
    created_at: new Date(),
    total_bets: 5,
    total_winnings: 2.5,
    win_rate: 50.0
};

const testCompetition = {
    competition_id: '550e8400-e29b-41d4-a716-446655440001',
    token_a: 'TokenA123',
    token_b: 'TokenB456',
    token_a_symbol: 'TOKA',
    token_b_symbol: 'TOKB',
    start_time: new Date(Date.now() - 3600000), // 1 hour ago
    end_time: new Date(Date.now() + 3600000), // 1 hour from now
    status: 'active',
    total_pool: 1.5
};

describe('API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    describe('GET /health', () => {
        test('returns health status', async () => {
            const response = await request(app).get('/health');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'ok');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
        });
    });
    
    describe('GET /api', () => {
        test('returns API information', async () => {
            const response = await request(app).get('/api');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('endpoints');
        });
    });
});

describe('User Endpoints', () => {
    describe('POST /api/users', () => {
        test('creates new user successfully', async () => {
            database.createUser.mockResolvedValue(testUser);
            
            const response = await request(app)
                .post('/api/users')
                .send({ wallet_address: testUser.wallet_address });
            
            expect(response.status).toBe(201);
            expect(response.body).toMatchObject(testUser);
            expect(database.createUser).toHaveBeenCalledWith(testUser.wallet_address);
        });
        
        test('rejects invalid wallet address', async () => {
            const response = await request(app)
                .post('/api/users')
                .send({ wallet_address: 'invalid' });
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    
    describe('GET /api/users/:wallet', () => {
        test('returns user profile', async () => {
            database.getUser.mockResolvedValue(testUser);
            
            const response = await request(app)
                .get(`/api/users/${testUser.wallet_address}`);
            
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject(testUser);
        });
        
        test('returns 404 for non-existent user', async () => {
            database.getUser.mockResolvedValue(null);
            
            const response = await request(app)
                .get('/api/users/NonExistentWallet');
            
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'User not found');
        });
    });
    
    describe('PUT /api/users/:wallet/username', () => {
        test('updates username successfully', async () => {
            const updatedUser = { ...testUser, username: 'new_username' };
            database.updateUsername.mockResolvedValue(updatedUser);
            
            const response = await request(app)
                .put(`/api/users/${testUser.wallet_address}/username`)
                .send({ username: 'new_username' });
            
            expect(response.status).toBe(200);
            expect(response.body.username).toBe('new_username');
        });
        
        test('rejects invalid username format', async () => {
            const response = await request(app)
                .put(`/api/users/${testUser.wallet_address}/username`)
                .send({ username: 'invalid-username!' });
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        
        test('handles username already taken', async () => {
            database.updateUsername.mockRejectedValue(new Error('Username already taken'));
            
            const response = await request(app)
                .put(`/api/users/${testUser.wallet_address}/username`)
                .send({ username: 'taken_username' });
            
            expect(response.status).toBe(409);
            expect(response.body.error).toBe('Username already taken');
        });
    });
});

describe('Competition Endpoints', () => {
    describe('GET /api/competitions', () => {
        test('returns list of competitions', async () => {
            const competitions = [testCompetition];
            database.getCompetitions.mockResolvedValue(competitions);
            
            const response = await request(app)
                .get('/api/competitions');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0]).toMatchObject(testCompetition);
        });
        
        test('filters by status', async () => {
            database.getCompetitions.mockResolvedValue([testCompetition]);
            
            const response = await request(app)
                .get('/api/competitions?status=active');
            
            expect(response.status).toBe(200);
            expect(database.getCompetitions).toHaveBeenCalledWith('active', 50, 0);
        });
        
        test('handles pagination', async () => {
            database.getCompetitions.mockResolvedValue([]);
            
            const response = await request(app)
                .get('/api/competitions?limit=10&offset=20');
            
            expect(response.status).toBe(200);
            expect(database.getCompetitions).toHaveBeenCalledWith('all', 10, 20);
        });
    });
    
    describe('GET /api/competitions/:id', () => {
        test('returns competition details', async () => {
            database.getCompetitionById.mockResolvedValue(testCompetition);
            
            const response = await request(app)
                .get(`/api/competitions/${testCompetition.competition_id}`);
            
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject(testCompetition);
        });
        
        test('returns 404 for non-existent competition', async () => {
            database.getCompetitionById.mockResolvedValue(null);
            
            const response = await request(app)
                .get('/api/competitions/non-existent-id');
            
            expect(response.status).toBe(404);
        });
    });
});

describe('Betting Endpoints', () => {
    describe('POST /api/bets', () => {
        const betData = {
            competitionId: testCompetition.competition_id,
            chosenToken: testCompetition.token_a,
            walletAddress: testUser.wallet_address,
            transactionSignature: 'mock_tx_signature_123'
        };
        
        beforeEach(() => {
            database.getCompetitionById.mockResolvedValue(testCompetition);
        });
        
        test('places bet successfully', async () => {
            const placedBet = {
                bet_id: 'bet_123',
                ...betData,
                amount: 0.1,
                timestamp: new Date()
            };
            
            database.placeBet.mockResolvedValue(placedBet);
            
            const token = generateAuthToken(testUser.wallet_address, 'user_123');
            const response = await request(app)
                .post('/api/bets')
                .set('Authorization', `Bearer ${token}`)
                .send(betData);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.bet).toMatchObject(placedBet);
        });
        
        test('rejects bet on inactive competition', async () => {
            database.getCompetitionById.mockResolvedValue({
                ...testCompetition,
                status: 'completed'
            });
            
            const token = generateAuthToken(testUser.wallet_address, 'user_123');
            const response = await request(app)
                .post('/api/bets')
                .set('Authorization', `Bearer ${token}`)
                .send(betData);
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Competition is not active');
        });
        
        test('requires authentication', async () => {
            const response = await request(app)
                .post('/api/bets')
                .send(betData);
            
            expect(response.status).toBe(401);
        });
    });
    
    describe('GET /api/users/:wallet/bets', () => {
        test('returns user betting history', async () => {
            const bets = [
                {
                    bet_id: 'bet_1',
                    user_wallet: testUser.wallet_address,
                    competition_id: testCompetition.competition_id,
                    chosen_token: testCompetition.token_a,
                    amount: 0.1,
                    won: true,
                    payout_amount: 0.185
                }
            ];
            
            database.getUserBets.mockResolvedValue(bets);
            
            const response = await request(app)
                .get(`/api/users/${testUser.wallet_address}/bets`);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0]).toMatchObject(bets[0]);
        });
    });
});

describe('Admin Endpoints', () => {
    const adminToken = 'mock_admin_token';
    const adminUser = {
        admin_id: 'admin_123',
        wallet_address: 'AdminWallet123',
        role: 'admin'
    };
    
    beforeEach(() => {
        // Mock admin authentication
        jest.spyOn(require('../backend/admin-api'), 'adminAuth')
            .mockImplementation((req, res, next) => {
                req.admin = adminUser;
                next();
            });
    });
    
    describe('POST /api/admin/auth/verify', () => {
        test('authenticates admin successfully', async () => {
            database.verifyAdmin.mockResolvedValue(adminUser);
            
            const response = await request(app)
                .post('/api/admin/auth/verify')
                .send({
                    walletAddress: adminUser.wallet_address,
                    pin: '123456'
                });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.admin).toMatchObject({
                wallet: adminUser.wallet_address,
                role: adminUser.role
            });
        });
        
        test('rejects invalid credentials', async () => {
            database.verifyAdmin.mockResolvedValue(null);
            
            const response = await request(app)
                .post('/api/admin/auth/verify')
                .send({
                    walletAddress: 'InvalidWallet',
                    pin: '000000'
                });
            
            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Invalid credentials');
        });
    });
    
    describe('GET /api/admin/dashboard', () => {
        test('returns dashboard data for admin', async () => {
            const dashboardData = {
                totalVolume: 100.5,
                activeUsers: 150,
                platformRevenue: 15.075,
                activeCompetitions: 5,
                recentActivity: []
            };
            
            database.getTotalVolume.mockResolvedValue(dashboardData.totalVolume);
            database.getActiveUserCount.mockResolvedValue(dashboardData.activeUsers);
            database.getPlatformRevenue.mockResolvedValue(dashboardData.platformRevenue);
            database.getActiveCompetitionCount.mockResolvedValue(dashboardData.activeCompetitions);
            database.getRecentActivity.mockResolvedValue(dashboardData.recentActivity);
            
            const response = await request(app)
                .get('/api/admin/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject(dashboardData);
        });
    });
});

describe('Database Operations', () => {
    test('handles database connection errors', async () => {
        database.getCompetitions.mockRejectedValue(new Error('Database connection failed'));
        
        const response = await request(app).get('/api/competitions');
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
    });
    
    test('handles transaction rollbacks', async () => {
        const error = new Error('Constraint violation');
        database.placeBet.mockRejectedValue(error);
        
        // Mock authenticated request
        const token = generateAuthToken(testUser.wallet_address, 'user_123');
        const response = await request(app)
            .post('/api/bets')
            .set('Authorization', `Bearer ${token}`)
            .send({
                competitionId: 'test_id',
                chosenToken: 'token_a',
                walletAddress: testUser.wallet_address,
                transactionSignature: 'tx_123'
            });
        
        expect(response.status).toBe(500);
    });
});

describe('Rate Limiting', () => {
    test('enforces rate limits', async () => {
        // Make multiple requests quickly
        const requests = Array(101).fill(null).map(() => 
            request(app).get('/api/competitions')
        );
        
        const responses = await Promise.all(requests);
        const tooManyRequests = responses.filter(r => r.status === 429);
        
        expect(tooManyRequests.length).toBeGreaterThan(0);
    });
});

// TODO: Add more tests for:
// - WebSocket connections and messages
// - Price data fetching and TWAP calculations
// - Competition lifecycle management
// - Smart contract interactions
// - Emergency procedures
// - Analytics and reporting
// - Caching mechanisms
