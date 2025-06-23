-- Test Data for Token Betting Platform
-- This script creates sample data for development and testing

-- Clear existing test data
TRUNCATE TABLE price_history CASCADE;
TRUNCATE TABLE bets CASCADE;
TRUNCATE TABLE competitions CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE activity_logs CASCADE;

-- Insert test users
INSERT INTO users (wallet_address, username, created_at, total_bets, total_winnings, win_rate) VALUES
('DemoSKjq3YchecW8gVAFz5i3NwSVpbQWkbE7HvYkPfHB', 'demo_whale', NOW() - INTERVAL '180 days', 45, 8.5, 55.5),
('TestBH5eHyxvC43xgHFjNUz3ZaH4qMKNcLLCEGq5CkWAT', 'test_trader', NOW() - INTERVAL '90 days', 32, 5.2, 48.3),
('User3jKnvP8nJNzGmSXvYhYKqN4hHQoeKY7tBdXGqCcV8', 'lucky_sol', NOW() - INTERVAL '60 days', 28, 6.8, 62.1),
('User4mWGPtSmHQr8tcvxQCxjNdMsVkp4CkKYKctnPmRn', 'anon_4567', NOW() - INTERVAL '45 days', 15, 2.1, 43.7),
('User5kXnQhSxKMdRyBqCWqvUBcBKHEZrCpCBQHfKtJH9', 'solana_fan', NOW() - INTERVAL '30 days', 22, 4.3, 51.2),
('User6nPvYK3vXKRBqMnEHXvYkKqN4hHQoeKY7tBdXGqCc', 'moonshot_mike', NOW() - INTERVAL '20 days', 18, 3.7, 58.9),
('User7qSKjq3YchecW8gVAFz5i3NwSVpbQWkbE7HvYkPf', 'degen_dave', NOW() - INTERVAL '15 days', 12, 1.8, 41.5),
('User8tBH5eHyxvC43xgHFjNUz3ZaH4qMKNcLLCEGq5Ck', 'crypto_claire', NOW() - INTERVAL '10 days', 8, 2.2, 71.4),
('User9wjKnvP8nJNzGmSXvYhYKqN4hHQoeKY7tBdXGqCc', NULL, NOW() - INTERVAL '5 days', 5, 0.4, 35.0),
('UserAmWGPtSmHQr8tcvxQCxjNdMsVkp4CkKYKctnPmRn', 'newbie_nick', NOW() - INTERVAL '2 days', 2, 0.0, 0.0);

-- Common Solana token addresses for testing
-- Note: These are example addresses, replace with actual token addresses
DO $$
DECLARE
    bonk_token VARCHAR := 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
    sol_token VARCHAR := 'So11111111111111111111111111111111111111112';
    usdc_token VARCHAR := 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    ray_token VARCHAR := '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R';
    orca_token VARCHAR := 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE';
    serum_token VARCHAR := 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt';
BEGIN
    -- Insert test competitions
    
    -- Completed competition (BONK vs RAY)
    INSERT INTO competitions (
        competition_id, token_a, token_b, token_a_symbol, token_b_symbol,
        start_time, end_time, status, total_pool, winner_token,
        token_a_start_price, token_b_start_price, token_a_end_price, token_b_end_price,
        token_a_performance, token_b_performance
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440001',
        bonk_token, ray_token, 'BONK', 'RAY',
        NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days',
        'resolved', 2.5, bonk_token,
        0.0000234, 3.45, 0.0000267, 3.38,
        14.10, -2.03
    );
    
    -- Active competition (SOL vs USDC)
    INSERT INTO competitions (
        competition_id, token_a, token_b, token_a_symbol, token_b_symbol,
        start_time, end_time, status, total_pool,
        token_a_start_price, token_b_start_price
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440002',
        sol_token, usdc_token, 'SOL', 'USDC',
        NOW() - INTERVAL '12 hours', NOW() + INTERVAL '12 hours',
        'active', 1.8,
        145.67, 1.00
    );
    
    -- Upcoming competition (ORCA vs SRM)
    INSERT INTO competitions (
        competition_id, token_a, token_b, token_a_symbol, token_b_symbol,
        start_time, end_time, status
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440003',
        orca_token, serum_token, 'ORCA', 'SRM',
        NOW() + INTERVAL '2 hours', NOW() + INTERVAL '26 hours',
        'upcoming'
    );
    
    -- More completed competitions for history
    INSERT INTO competitions (
        competition_id, token_a, token_b, token_a_symbol, token_b_symbol,
        start_time, end_time, status, total_pool, winner_token,
        token_a_performance, token_b_performance
    ) VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440004',
        bonk_token, sol_token, 'BONK', 'SOL',
        NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days',
        'resolved', 3.2, sol_token,
        -5.23, 8.76
    ),
    (
        '550e8400-e29b-41d4-a716-446655440005',
        ray_token, orca_token, 'RAY', 'ORCA',
        NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days',
        'resolved', 1.5, ray_token,
        12.45, 3.21
    );
    
    -- Insert test bets for completed competition
    INSERT INTO bets (
        user_wallet, competition_id, chosen_token, amount,
        transaction_signature, timestamp, payout_amount, claimed_status
    ) VALUES
    -- Winners (chose BONK)
    ('DemoSKjq3YchecW8gVAFz5i3NwSVpbQWkbE7HvYkPfHB', '550e8400-e29b-41d4-a716-446655440001', 
     bonk_token, 0.1, 'tx_demo_001', NOW() - INTERVAL '3 days', 0.185, 'claimed'),
    ('User3jKnvP8nJNzGmSXvYhYKqN4hHQoeKY7tBdXGqCcV8', '550e8400-e29b-41d4-a716-446655440001',
     bonk_token, 0.1, 'tx_user3_001', NOW() - INTERVAL '3 days', 0.185, 'pending'),
    ('User5kXnQhSxKMdRyBqCWqvUBcBKHEZrCpCBQHfKtJH9', '550e8400-e29b-41d4-a716-446655440001',
     bonk_token, 0.1, 'tx_user5_001', NOW() - INTERVAL '3 days', 0.185, 'claimed'),
    -- Losers (chose RAY)
    ('TestBH5eHyxvC43xgHFjNUz3ZaH4qMKNcLLCEGq5CkWAT', '550e8400-e29b-41d4-a716-446655440001',
     ray_token, 0.1, 'tx_test_001', NOW() - INTERVAL '3 days', 0, 'pending'),
    ('User4mWGPtSmHQr8tcvxQCxjNdMsVkp4CkKYKctnPmRn', '550e8400-e29b-41d4-a716-446655440001',
     ray_token, 0.1, 'tx_user4_001', NOW() - INTERVAL '3 days', 0, 'pending');
    
    -- Insert bets for active competition
    INSERT INTO bets (
        user_wallet, competition_id, chosen_token, amount,
        transaction_signature, timestamp
    ) VALUES
    ('DemoSKjq3YchecW8gVAFz5i3NwSVpbQWkbE7HvYkPfHB', '550e8400-e29b-41d4-a716-446655440002',
     sol_token, 0.1, 'tx_demo_002', NOW() - INTERVAL '6 hours'),
    ('TestBH5eHyxvC43xgHFjNUz3ZaH4qMKNcLLCEGq5CkWAT', '550e8400-e29b-41d4-a716-446655440002',
     usdc_token, 0.1, 'tx_test_002', NOW() - INTERVAL '5 hours'),
    ('User3jKnvP8nJNzGmSXvYhYKqN4hHQoeKY7tBdXGqCcV8', '550e8400-e29b-41d4-a716-446655440002',
     sol_token, 0.1, 'tx_user3_002', NOW() - INTERVAL '4 hours'),
    ('User6nPvYK3vXKRBqMnEHXvYkKqN4hHQoeKY7tBdXGqCc', '550e8400-e29b-41d4-a716-446655440002',
     sol_token, 0.1, 'tx_user6_001', NOW() - INTERVAL '3 hours'),
    ('User7qSKjq3YchecW8gVAFz5i3NwSVpbQWkbE7HvYkPf', '550e8400-e29b-41d4-a716-446655440002',
     usdc_token, 0.1, 'tx_user7_001', NOW() - INTERVAL '2 hours');
END $$;

-- Insert sample price history
DO $$
DECLARE
    i INTEGER;
    base_time TIMESTAMP := NOW() - INTERVAL '24 hours';
    bonk_price DECIMAL := 0.0000234;
    sol_price DECIMAL := 145.67;
BEGIN
    -- Generate hourly price data for the last 24 hours
    FOR i IN 0..24 LOOP
        -- BONK prices with some volatility
        INSERT INTO price_history (token_address, timestamp, price, volume, market_cap, source)
        VALUES (
            'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
            base_time + (i || ' hours')::INTERVAL,
            bonk_price * (1 + (RANDOM() - 0.5) * 0.1), -- ±5% volatility
            1000000 + RANDOM() * 500000,
            1200000000,
            'jupiter'
        );
        
        -- SOL prices
        INSERT INTO price_history (token_address, timestamp, price, volume, market_cap, source)
        VALUES (
            'So11111111111111111111111111111111111111112',
            base_time + (i || ' hours')::INTERVAL,
            sol_price * (1 + (RANDOM() - 0.5) * 0.06), -- ±3% volatility
            50000000 + RANDOM() * 10000000,
            65000000000,
            'jupiter'
        );
    END LOOP;
END $$;

-- Insert activity logs
INSERT INTO activity_logs (activity_type, description, wallet_address, competition_id, amount, timestamp) VALUES
('bet_placed', 'Demo Whale placed a bet on SOL', 'DemoSKjq3YchecW8gVAFz5i3NwSVpbQWkbE7HvYkPfHB', 
 '550e8400-e29b-41d4-a716-446655440002', 0.1, NOW() - INTERVAL '6 hours'),
('competition_started', 'Competition SOL vs USDC started', NULL, 
 '550e8400-e29b-41d4-a716-446655440002', NULL, NOW() - INTERVAL '12 hours'),
('winnings_claimed', 'Lucky Sol claimed winnings', 'User3jKnvP8nJNzGmSXvYhYKqN4hHQoeKY7tBdXGqCcV8',
 '550e8400-e29b-41d4-a716-446655440001', 0.185, NOW() - INTERVAL '1 day'),
('competition_resolved', 'Competition BONK vs RAY resolved', NULL,
 '550e8400-e29b-41d4-a716-446655440001', NULL, NOW() - INTERVAL '2 days'),
('user_registered', 'New user joined', 'UserAmWGPtSmHQr8tcvxQCxjNdMsVkp4CkKYKctnPmRn',
 NULL, NULL, NOW() - INTERVAL '2 days');

-- Update user stats based on bets
UPDATE users u
SET 
    win_rate = calculate_user_win_rate(u.wallet_address),
    current_streak = CASE 
        WHEN u.wallet_address IN ('DemoSKjq3YchecW8gVAFz5i3NwSVpbQWkbE7HvYkPfHB', 'User3jKnvP8nJNzGmSXvYhYKqN4hHQoeKY7tBdXGqCcV8')
        THEN 3
        ELSE 0
    END;

-- Create test leaderboard entries
INSERT INTO leaderboards (period, wallet_address, username, competitions_played, competitions_won, win_rate, total_winnings, ranking)
SELECT 
    'all_time',
    u.wallet_address,
    u.username,
    u.total_bets,
    FLOOR(u.total_bets * u.win_rate / 100),
    u.win_rate,
    u.total_winnings,
    ROW_NUMBER() OVER (ORDER BY u.total_winnings DESC)
FROM users u
WHERE u.total_bets > 0;

-- Display summary
DO $$
BEGIN
    RAISE NOTICE 'Test data created successfully!';
    RAISE NOTICE 'Users: 10';
    RAISE NOTICE 'Competitions: 5 (1 active, 1 upcoming, 3 resolved)';
    RAISE NOTICE 'Bets: 10';
    RAISE NOTICE 'Price history entries: 50';
END $$;

-- Useful queries for testing

-- View active competitions with bet counts
-- SELECT * FROM active_competition_stats;

-- View user leaderboard
-- SELECT * FROM leaderboards WHERE period = 'all_time' ORDER BY ranking;

-- View recent activity
-- SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 10;

-- Check user bet history
-- SELECT b.*, c.token_a_symbol, c.token_b_symbol, c.winner_token
-- FROM bets b
-- JOIN competitions c ON b.competition_id = c.competition_id
-- WHERE b.user_wallet = 'DemoSKjq3YchecW8gVAFz5i3NwSVpbQWkbE7HvYkPfHB'
-- ORDER BY b.timestamp DESC;
