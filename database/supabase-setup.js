-- =====================================================
-- Solana Token Betting Platform - Supabase Database Setup
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

CREATE TYPE competition_status AS ENUM ('SETUP', 'VOTING', 'ACTIVE', 'CLOSED', 'RESOLVED', 'CANCELLED');
CREATE TYPE bet_status AS ENUM ('PLACED', 'WON', 'LOST', 'CLAIMED', 'REFUNDED');
CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR');

-- =====================================================
-- CORE USER TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
    wallet_address VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_winnings DECIMAL(20, 9) DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_banned BOOLEAN DEFAULT FALSE,
    referral_code VARCHAR(10) UNIQUE,
    referred_by VARCHAR(50),
    
    CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by) REFERENCES users(wallet_address)
);

-- Competitions table
CREATE TABLE competitions (
    competition_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_a_address VARCHAR(50) NOT NULL,
    token_a_symbol VARCHAR(20) NOT NULL,
    token_a_name VARCHAR(100) NOT NULL,
    token_b_address VARCHAR(50) NOT NULL,
    token_b_symbol VARCHAR(20) NOT NULL,
    token_b_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    voting_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status competition_status DEFAULT 'SETUP',
    total_pool DECIMAL(20, 9) DEFAULT 0,
    winner_token VARCHAR(50),
    token_a_start_price DECIMAL(20, 9),
    token_b_start_price DECIMAL(20, 9),
    token_a_end_price DECIMAL(20, 9),
    token_b_end_price DECIMAL(20, 9),
    token_a_performance DECIMAL(10, 6),
    token_b_performance DECIMAL(10, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(50),
    platform_fee_collected DECIMAL(20, 9) DEFAULT 0,
    escrow_account VARCHAR(50),
    
    CONSTRAINT fk_competitions_created_by FOREIGN KEY (created_by) REFERENCES users(wallet_address)
);

-- Bets table
CREATE TABLE bets (
    bet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_wallet VARCHAR(50) NOT NULL,
    competition_id UUID NOT NULL,
    chosen_token VARCHAR(50) NOT NULL,
    amount DECIMAL(20, 9) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payout_amount DECIMAL(20, 9) DEFAULT 0,
    status bet_status DEFAULT 'PLACED',
    claimed_at TIMESTAMP WITH TIME ZONE,
    transaction_signature VARCHAR(100),
    
    CONSTRAINT fk_bets_user_wallet FOREIGN KEY (user_wallet) REFERENCES users(wallet_address),
    CONSTRAINT fk_bets_competition_id FOREIGN KEY (competition_id) REFERENCES competitions(competition_id),
    CONSTRAINT check_chosen_token CHECK (chosen_token IN ('token_a', 'token_b'))
);

-- Leaderboards table
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_wallet VARCHAR(50) NOT NULL,
    username VARCHAR(50),
    ranking INTEGER,
    total_score DECIMAL(15, 2) DEFAULT 0,
    competitions_won INTEGER DEFAULT 0,
    competitions_participated INTEGER DEFAULT 0,
    total_winnings DECIMAL(20, 9) DEFAULT 0,
    win_percentage DECIMAL(5, 2) DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_leaderboards_user_wallet FOREIGN KEY (user_wallet) REFERENCES users(wallet_address),
    UNIQUE(user_wallet)
);

-- Price history table
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    price DECIMAL(20, 9) NOT NULL,
    volume DECIMAL(20, 9),
    market_cap DECIMAL(20, 2),
    source VARCHAR(50),
    
    UNIQUE(token_address, timestamp, source)
);

-- =====================================================
-- ADMIN TABLES
-- =====================================================

-- Admin users table
CREATE TABLE admin_users (
    admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    role admin_role DEFAULT 'MODERATOR',
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    
    CONSTRAINT fk_admin_users_created_by FOREIGN KEY (created_by) REFERENCES admin_users(admin_id)
);

-- Admin sessions table
CREATE TABLE admin_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT fk_admin_sessions_admin_id FOREIGN KEY (admin_id) REFERENCES admin_users(admin_id)
);

-- Competition configurations table
CREATE TABLE competition_configs (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_name VARCHAR(100) UNIQUE NOT NULL,
    competition_duration_hours INTEGER DEFAULT 24,
    voting_duration_hours INTEGER DEFAULT 1,
    bet_amount DECIMAL(20, 9) DEFAULT 0.1,
    platform_fee_percentage DECIMAL(5, 2) DEFAULT 15.0,
    min_market_cap DECIMAL(20, 2) DEFAULT 5000000,
    max_market_cap DECIMAL(20, 2) DEFAULT 100000000,
    market_cap_tolerance_percentage DECIMAL(5, 2) DEFAULT 10.0,
    min_token_age_days INTEGER DEFAULT 30,
    min_daily_volume DECIMAL(20, 2) DEFAULT 100000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    
    CONSTRAINT fk_competition_configs_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users(admin_id)
);

-- =====================================================
-- AUDIT AND LOGGING TABLES
-- =====================================================

-- Admin actions audit log
CREATE TABLE admin_audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_admin_audit_log_admin_id FOREIGN KEY (admin_id) REFERENCES admin_users(admin_id)
);

-- System events log
CREATE TABLE system_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    severity VARCHAR(20) DEFAULT 'INFO',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(50)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_total_winnings ON users(total_winnings DESC);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- Competitions table indexes
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_start_time ON competitions(start_time);
CREATE INDEX idx_competitions_end_time ON competitions(end_time);
CREATE INDEX idx_competitions_voting_end_time ON competitions(voting_end_time);
CREATE INDEX idx_competitions_created_at ON competitions(created_at DESC);
CREATE INDEX idx_competitions_tokens ON competitions(token_a_address, token_b_address);

-- Bets table indexes
CREATE INDEX idx_bets_user_wallet ON bets(user_wallet);
CREATE INDEX idx_bets_competition_id ON bets(competition_id);
CREATE INDEX idx_bets_timestamp ON bets(timestamp);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_user_competition ON bets(user_wallet, competition_id);

-- Leaderboards table indexes
CREATE INDEX idx_leaderboards_ranking ON leaderboards(ranking);
CREATE INDEX idx_leaderboards_total_score ON leaderboards(total_score DESC);
CREATE INDEX idx_leaderboards_competitions_won ON leaderboards(competitions_won DESC);

-- Price history indexes
CREATE INDEX idx_price_history_token_timestamp ON price_history(token_address, timestamp DESC);
CREATE INDEX idx_price_history_timestamp ON price_history(timestamp);

-- Admin tables indexes
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_timestamp ON admin_audit_log(timestamp);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (wallet_address = current_setting('app.current_user_wallet', true));
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (wallet_address = current_setting('app.current_user_wallet', true));

-- Competitions policies
CREATE POLICY "Everyone can view competitions" ON competitions FOR SELECT USING (true);
CREATE POLICY "Only admins can insert competitions" ON competitions FOR INSERT WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY "Only admins can update competitions" ON competitions FOR UPDATE USING (current_setting('app.current_user_role', true) = 'admin');

-- Bets policies
CREATE POLICY "Users can view own bets" ON bets FOR SELECT USING (user_wallet = current_setting('app.current_user_wallet', true) OR current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY "Users can insert own bets" ON bets FOR INSERT WITH CHECK (user_wallet = current_setting('app.current_user_wallet', true));
CREATE POLICY "Users can update own bets" ON bets FOR UPDATE USING (user_wallet = current_setting('app.current_user_wallet', true) OR current_setting('app.current_user_role', true) = 'admin');

-- Leaderboards policies
CREATE POLICY "Everyone can view leaderboards" ON leaderboards FOR SELECT USING (true);
CREATE POLICY "Only system can modify leaderboards" ON leaderboards FOR ALL USING (current_setting('app.current_user_role', true) = 'system');

-- Price history policies
CREATE POLICY "Everyone can view price history" ON price_history FOR SELECT USING (true);
CREATE POLICY "Only system can insert price data" ON price_history FOR INSERT WITH CHECK (current_setting('app.current_user_role', true) = 'system');

-- Admin policies
CREATE POLICY "Admins can view admin users" ON admin_users FOR SELECT USING (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY "Super admins can manage admin users" ON admin_users FOR ALL USING (current_setting('app.current_admin_role', true) = 'SUPER_ADMIN');

CREATE POLICY "Admins can view own sessions" ON admin_sessions FOR SELECT USING (admin_id::text = current_setting('app.current_admin_id', true) OR current_setting('app.current_admin_role', true) = 'SUPER_ADMIN');
CREATE POLICY "Admins can manage own sessions" ON admin_sessions FOR ALL USING (admin_id::text = current_setting('app.current_admin_id', true));

CREATE POLICY "Admins can view configs" ON competition_configs FOR SELECT USING (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY "Super admins can manage configs" ON competition_configs FOR ALL USING (current_setting('app.current_admin_role', true) = 'SUPER_ADMIN');

CREATE POLICY "Admins can view audit log" ON admin_audit_log FOR SELECT USING (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY "System can insert audit log" ON admin_audit_log FOR INSERT WITH CHECK (current_setting('app.current_user_role', true) = 'system');

CREATE POLICY "Admins can view system events" ON system_events FOR SELECT USING (current_setting('app.current_user_role', true) = 'admin');
CREATE POLICY "System can manage system events" ON system_events FOR ALL USING (current_setting('app.current_user_role', true) = 'system');

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user statistics when a bet is resolved
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('WON', 'LOST') THEN
        UPDATE users SET
            total_bets = (SELECT COUNT(*) FROM bets WHERE user_wallet = NEW.user_wallet AND status IN ('WON', 'LOST')),
            total_winnings = COALESCE((SELECT SUM(payout_amount) FROM bets WHERE user_wallet = NEW.user_wallet AND status = 'WON'), 0),
            win_rate = CASE 
                WHEN (SELECT COUNT(*) FROM bets WHERE user_wallet = NEW.user_wallet AND status IN ('WON', 'LOST')) > 0 
                THEN (SELECT COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM bets WHERE user_wallet = NEW.user_wallet AND status IN ('WON', 'LOST')) * 100 
                      FROM bets WHERE user_wallet = NEW.user_wallet AND status = 'WON')
                ELSE 0 
            END
        WHERE wallet_address = NEW.user_wallet;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user statistics
CREATE TRIGGER trigger_update_user_statistics
    AFTER UPDATE ON bets
    FOR EACH ROW
    EXECUTE FUNCTION update_user_statistics();

-- Function to update leaderboard
CREATE OR REPLACE FUNCTION update_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO leaderboards (user_wallet, username, total_score, competitions_won, competitions_participated, total_winnings, win_percentage)
    SELECT 
        u.wallet_address,
        u.username,
        (u.total_winnings * 100 + COALESCE(COUNT(b.bet_id), 0) * 10) as total_score,
        COALESCE(COUNT(CASE WHEN b.status = 'WON' THEN 1 END), 0) as competitions_won,
        COALESCE(COUNT(DISTINCT b.competition_id), 0) as competitions_participated,
        u.total_winnings,
        u.win_rate
    FROM users u
    LEFT JOIN bets b ON u.wallet_address = b.user_wallet
    WHERE u.wallet_address = NEW.wallet_address
    GROUP BY u.wallet_address, u.username, u.total_winnings, u.win_rate
    ON CONFLICT (user_wallet) DO UPDATE SET
        username = EXCLUDED.username,
        total_score = EXCLUDED.total_score,
        competitions_won = EXCLUDED.competitions_won,
        competitions_participated = EXCLUDED.competitions_participated,
        total_winnings = EXCLUDED.total_winnings,
        win_percentage = EXCLUDED.win_percentage,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update leaderboard when user stats change
CREATE TRIGGER trigger_update_leaderboard
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (OLD.total_winnings != NEW.total_winnings OR OLD.win_rate != NEW.win_rate)
    EXECUTE FUNCTION update_leaderboard();

-- Function to update competition status based on time
CREATE OR REPLACE FUNCTION update_competition_status()
RETURNS void AS $$
BEGIN
    -- Update competitions to VOTING when start_time is reached
    UPDATE competitions 
    SET status = 'VOTING' 
    WHERE status = 'SETUP' AND start_time <= NOW();
    
    -- Update competitions to ACTIVE when voting_end_time is reached
    UPDATE competitions 
    SET status = 'ACTIVE' 
    WHERE status = 'VOTING' AND voting_end_time <= NOW();
    
    -- Update competitions to CLOSED when end_time is reached
    UPDATE competitions 
    SET status = 'CLOSED' 
    WHERE status = 'ACTIVE' AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired admin sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    UPDATE admin_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active competitions view
CREATE VIEW active_competitions AS
SELECT 
    c.*,
    COUNT(b.bet_id) as total_bets,
    COUNT(CASE WHEN b.chosen_token = 'token_a' THEN 1 END) as token_a_bets,
    COUNT(CASE WHEN b.chosen_token = 'token_b' THEN 1 END) as token_b_bets,
    SUM(b.amount) as total_betting_volume
FROM competitions c
LEFT JOIN bets b ON c.competition_id = b.competition_id
WHERE c.status IN ('SETUP', 'VOTING', 'ACTIVE')
GROUP BY c.competition_id;

-- User betting summary view
CREATE VIEW user_betting_summary AS
SELECT 
    u.wallet_address,
    u.username,
    u.total_winnings,
    u.total_bets,
    u.win_rate,
    COUNT(DISTINCT b.competition_id) as competitions_participated,
    AVG(b.amount) as avg_bet_amount,
    MAX(b.payout_amount) as highest_payout
FROM users u
LEFT JOIN bets b ON u.wallet_address = b.user_wallet
GROUP BY u.wallet_address, u.username, u.total_winnings, u.total_bets, u.win_rate;

-- Competition results view
CREATE VIEW competition_results AS
SELECT 
    c.competition_id,
    c.token_a_symbol,
    c.token_b_symbol,
    c.start_time,
    c.end_time,
    c.status,
    c.winner_token,
    c.token_a_performance,
    c.token_b_performance,
    c.total_pool,
    COUNT(b.bet_id) as total_participants,
    COUNT(CASE WHEN b.status = 'WON' THEN 1 END) as winners_count,
    SUM(CASE WHEN b.status = 'WON' THEN b.payout_amount ELSE 0 END) as total_payouts
FROM competitions c
LEFT JOIN bets b ON c.competition_id = b.competition_id
WHERE c.status = 'RESOLVED'
GROUP BY c.competition_id;

-- =====================================================
-- INITIAL CONFIGURATION DATA
-- =====================================================

-- Insert default competition configuration
INSERT INTO competition_configs (config_name, competition_duration_hours, voting_duration_hours, bet_amount, platform_fee_percentage, min_market_cap, max_market_cap, market_cap_tolerance_percentage, min_token_age_days, min_daily_volume)
VALUES ('default', 24, 1, 0.1, 15.0, 5000000, 100000000, 10.0, 30, 100000);

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to set user context for RLS
CREATE OR REPLACE FUNCTION set_user_context(wallet_addr text, user_role text DEFAULT 'user')
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_wallet', wallet_addr, true);
    PERFORM set_config('app.current_user_role', user_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set admin context for RLS
CREATE OR REPLACE FUNCTION set_admin_context(admin_id_val text, admin_role_val text)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_admin_id', admin_id_val, true);
    PERFORM set_config('app.current_admin_role', admin_role_val, true);
    PERFORM set_config('app.current_user_role', 'admin', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear user context
CREATE OR REPLACE FUNCTION clear_user_context()
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_wallet', '', true);
    PERFORM set_config('app.current_user_role', '', true);
    PERFORM set_config('app.current_admin_id', '', true);
    PERFORM set_config('app.current_admin_role', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INITIAL ADMIN USER (UPDATE WITH YOUR DETAILS)
-- =====================================================

-- Create initial super admin user (replace with your wallet address and desired PIN)
INSERT INTO admin_users (wallet_address, username, pin_hash, role)
VALUES ('YOUR_WALLET_ADDRESS_HERE', 'superadmin', crypt('1234', gen_salt('bf')), 'SUPER_ADMIN');

-- =====================================================
-- PERMISSIONS FOR APPLICATION
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant read permissions to anonymous users for public data
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON competitions, leaderboards, price_history TO anon;
GRANT SELECT ON active_competitions, competition_results TO anon;

-- =====================================================
-- FINAL SETUP VALIDATION
-- =====================================================

-- Verify all tables exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    IF table_count < 10 THEN
        RAISE EXCEPTION 'Not all tables were created successfully. Expected at least 10 tables, found %', table_count;
    ELSE
        RAISE NOTICE 'Database setup completed successfully. Created % tables.', table_count;
    END IF;
END $$;
