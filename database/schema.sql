-- Token Betting Platform Database Schema
-- PostgreSQL Database Setup

-- Create database if not exists
-- CREATE DATABASE token_betting;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS platform_settings CASCADE;

-- Users table
CREATE TABLE users (
    wallet_address VARCHAR(44) PRIMARY KEY,
    username VARCHAR(20) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    total_bets INTEGER DEFAULT 0,
    total_winnings DECIMAL(20, 9) DEFAULT 0, -- in SOL
    win_rate DECIMAL(5, 2) DEFAULT 0, -- percentage
    current_streak INTEGER DEFAULT 0,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$')
);

-- Create indexes for users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_total_winnings ON users(total_winnings DESC);

-- Competitions table
CREATE TABLE competitions (
    competition_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    token_a VARCHAR(44) NOT NULL,
    token_b VARCHAR(44) NOT NULL,
    token_a_symbol VARCHAR(10) NOT NULL,
    token_b_symbol VARCHAR(10) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    total_pool DECIMAL(20, 9) DEFAULT 0,
    winner_token VARCHAR(44),
    token_a_start_price DECIMAL(20, 9),
    token_b_start_price DECIMAL(20, 9),
    token_a_end_price DECIMAL(20, 9),
    token_b_end_price DECIMAL(20, 9),
    token_a_performance DECIMAL(10, 4), -- percentage change
    token_b_performance DECIMAL(10, 4),
    created_by VARCHAR(44) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    transaction_signature VARCHAR(88), -- Solana transaction signature
    CONSTRAINT valid_status CHECK (status IN ('upcoming', 'active', 'closed', 'resolved', 'paused', 'cancelled')),
    CONSTRAINT different_tokens CHECK (token_a != token_b),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create indexes for competitions
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_start_time ON competitions(start_time);
CREATE INDEX idx_competitions_end_time ON competitions(end_time);
CREATE INDEX idx_competitions_tokens ON competitions(token_a, token_b);

-- Bets table
CREATE TABLE bets (
    bet_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet_address),
    competition_id UUID NOT NULL REFERENCES competitions(competition_id),
    chosen_token VARCHAR(44) NOT NULL,
    amount DECIMAL(20, 9) NOT NULL DEFAULT 0.1, -- in SOL
    transaction_signature VARCHAR(88) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payout_amount DECIMAL(20, 9),
    claimed_status VARCHAR(20) DEFAULT 'pending',
    claim_transaction VARCHAR(88),
    claimed_at TIMESTAMP,
    CONSTRAINT valid_claimed_status CHECK (claimed_status IN ('pending', 'claimed', 'expired', 'refunded')),
    CONSTRAINT valid_amount CHECK (amount > 0),
    UNIQUE(user_wallet, competition_id) -- One bet per user per competition
);

-- Create indexes for bets
CREATE INDEX idx_bets_user_wallet ON bets(user_wallet);
CREATE INDEX idx_bets_competition_id ON bets(competition_id);
CREATE INDEX idx_bets_timestamp ON bets(timestamp);
CREATE INDEX idx_bets_claimed_status ON bets(claimed_status);

-- Leaderboards table (materialized view for performance)
CREATE TABLE leaderboards (
    id SERIAL PRIMARY KEY,
    period VARCHAR(20) NOT NULL,
    wallet_address VARCHAR(44) NOT NULL REFERENCES users(wallet_address),
    username VARCHAR(20),
    competitions_played INTEGER DEFAULT 0,
    competitions_won INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    total_winnings DECIMAL(20, 9) DEFAULT 0,
    ranking INTEGER NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_period CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time'))
);

-- Create indexes for leaderboards
CREATE INDEX idx_leaderboards_period_ranking ON leaderboards(period, ranking);
CREATE INDEX idx_leaderboards_wallet ON leaderboards(wallet_address);

-- Price history table
CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(44) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    price DECIMAL(20, 9) NOT NULL,
    volume DECIMAL(20, 2),
    market_cap DECIMAL(20, 2),
    source VARCHAR(20), -- 'jupiter', 'coingecko', 'helius', etc.
    UNIQUE(token_address, timestamp, source)
);

-- Create indexes for price history
CREATE INDEX idx_price_history_token_time ON price_history(token_address, timestamp DESC);
CREATE INDEX idx_price_history_timestamp ON price_history(timestamp);

-- Platform settings table
CREATE TABLE platform_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    data_type VARCHAR(20) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(44)
);

-- Insert default platform settings
INSERT INTO platform_settings (key, value, data_type, description) VALUES
('platform_fee', '15', 'number', 'Platform fee percentage'),
('bet_amount', '0.1', 'number', 'Default bet amount in SOL'),
('default_duration', '24', 'number', 'Default competition duration in hours'),
('platform_wallet', '', 'string', 'Platform wallet address for fees'),
('min_market_cap', '5000000', 'number', 'Minimum market cap in USD'),
('token_age_days', '30', 'number', 'Minimum token age in days'),
('maintenance_mode', 'false', 'boolean', 'Platform maintenance mode');

-- Activity logs table (for recent activity feed)
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    wallet_address VARCHAR(44),
    competition_id UUID,
    amount DECIMAL(20, 9),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Create index for activity logs
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);

-- Functions and triggers

-- Function to update user stats after bet
CREATE OR REPLACE FUNCTION update_user_stats_after_bet()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET total_bets = total_bets + 1
    WHERE wallet_address = NEW.user_wallet;
    
    -- Log activity
    INSERT INTO activity_logs (activity_type, description, wallet_address, competition_id, amount)
    VALUES ('bet_placed', 'User placed bet', NEW.user_wallet, NEW.competition_id, NEW.amount);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_stats_after_bet
AFTER INSERT ON bets
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_after_bet();

-- Function to update user stats after claiming winnings
CREATE OR REPLACE FUNCTION update_user_stats_after_claim()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.claimed_status = 'claimed' AND OLD.claimed_status = 'pending' THEN
        UPDATE users 
        SET total_winnings = total_winnings + NEW.payout_amount
        WHERE wallet_address = NEW.user_wallet;
        
        -- Log activity
        INSERT INTO activity_logs (activity_type, description, wallet_address, competition_id, amount)
        VALUES ('winnings_claimed', 'User claimed winnings', NEW.user_wallet, NEW.competition_id, NEW.payout_amount);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_stats_after_claim
AFTER UPDATE ON bets
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_after_claim();

-- Function to update competition status
CREATE OR REPLACE FUNCTION update_competition_status()
RETURNS VOID AS $$
BEGIN
    -- Update upcoming to active
    UPDATE competitions
    SET status = 'active'
    WHERE status = 'upcoming' AND start_time <= CURRENT_TIMESTAMP;
    
    -- Update active to closed
    UPDATE competitions
    SET status = 'closed'
    WHERE status = 'active' AND end_time <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user win rate
CREATE OR REPLACE FUNCTION calculate_user_win_rate(user_wallet_address VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
    total_resolved INTEGER;
    total_won INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_resolved
    FROM bets b
    JOIN competitions c ON b.competition_id = c.competition_id
    WHERE b.user_wallet = user_wallet_address AND c.status = 'resolved';
    
    SELECT COUNT(*) INTO total_won
    FROM bets b
    JOIN competitions c ON b.competition_id = c.competition_id
    WHERE b.user_wallet = user_wallet_address 
    AND c.status = 'resolved'
    AND b.chosen_token = c.winner_token;
    
    IF total_resolved = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (total_won::DECIMAL / total_resolved) * 100;
END;
$$ LANGUAGE plpgsql;

-- View for active competition stats
CREATE OR REPLACE VIEW active_competition_stats AS
SELECT 
    c.competition_id,
    c.token_a_symbol || ' vs ' || c.token_b_symbol as pair,
    c.status,
    c.start_time,
    c.end_time,
    COUNT(DISTINCT b.user_wallet) as participant_count,
    COALESCE(SUM(b.amount), 0) as total_pool,
    COUNT(CASE WHEN b.chosen_token = c.token_a THEN 1 END) as token_a_bets,
    COUNT(CASE WHEN b.chosen_token = c.token_b THEN 1 END) as token_b_bets
FROM competitions c
LEFT JOIN bets b ON c.competition_id = b.competition_id
WHERE c.status IN ('upcoming', 'active')
GROUP BY c.competition_id;

-- Grants for application user (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO token_betting_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO token_betting_app;

-- Create indexes for performance
CREATE INDEX idx_competitions_composite ON competitions(status, start_time, end_time);
CREATE INDEX idx_bets_composite ON bets(user_wallet, competition_id, claimed_status);

-- Add comments for documentation
COMMENT ON TABLE users IS 'Platform users identified by Solana wallet addresses';
COMMENT ON TABLE competitions IS 'Token prediction competitions';
COMMENT ON TABLE bets IS 'User bets on competitions';
COMMENT ON TABLE price_history IS 'Historical token price data for TWAP calculations';
COMMENT ON TABLE platform_settings IS 'Configurable platform parameters';

-- TODO: Add additional tables for:
-- - Token metadata cache
-- - Notification preferences
-- - User achievements
-- - Referral tracking
-- - API rate limiting
