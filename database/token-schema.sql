-- =====================================================
-- Token Selection System - Additional Tables and Fields
-- Adds token management to existing TokenWars database
-- =====================================================

-- =====================================================
-- TOKENS TABLE - Store validated token data
-- =====================================================

CREATE TABLE IF NOT EXISTS tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    address VARCHAR(50) UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    logo_uri TEXT,
    decimals INTEGER DEFAULT 9,
    
    -- Market data from CoinGecko
    market_cap BIGINT,
    current_price DECIMAL(20, 10),
    total_volume BIGINT,
    price_change_24h DECIMAL(10, 4),
    market_cap_rank INTEGER,
    
    -- Token metadata
    category VARCHAR(20), -- LARGE_CAP, MID_CAP, SMALL_CAP, MICRO_CAP
    age_days INTEGER,
    tags TEXT[],
    
    -- Status and tracking
    is_active BOOLEAN DEFAULT true,
    is_blacklisted BOOLEAN DEFAULT false,
    liquidity_usd BIGINT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_address_length CHECK (LENGTH(address) = 44),
    CONSTRAINT valid_symbol_length CHECK (LENGTH(symbol) BETWEEN 2 AND 20),
    CONSTRAINT positive_market_cap CHECK (market_cap IS NULL OR market_cap > 0),
    CONSTRAINT positive_price CHECK (current_price IS NULL OR current_price > 0)
);

-- =====================================================
-- TOKEN_PAIRS TABLE - Store generated token pairs
-- =====================================================

CREATE TABLE IF NOT EXISTS token_pairs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    token_a_address VARCHAR(50) NOT NULL,
    token_b_address VARCHAR(50) NOT NULL,
    
    -- Pairing metadata
    category VARCHAR(20) NOT NULL,
    market_cap_ratio DECIMAL(10, 4),
    compatibility_score DECIMAL(8, 2),
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    last_competition_id UUID,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT different_tokens CHECK (token_a_address != token_b_address),
    CONSTRAINT valid_compatibility_score CHECK (compatibility_score BETWEEN 0 AND 100)
);

-- =====================================================
-- TOKEN_UPDATES TABLE - Track token refresh cycles
-- =====================================================

CREATE TABLE IF NOT EXISTS token_updates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    update_type VARCHAR(20) NOT NULL,
    tokens_processed INTEGER DEFAULT 0,
    tokens_added INTEGER DEFAULT 0,
    tokens_updated INTEGER DEFAULT 0,
    tokens_removed INTEGER DEFAULT 0,
    
    -- Update metadata
    source VARCHAR(20),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    duration_seconds INTEGER,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- ADD NEW FIELDS TO EXISTING COMPETITIONS TABLE
-- =====================================================

-- Add only the new token-related fields (token_a_address and token_b_address already exist)
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS token_a_logo TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS token_b_logo TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS token_a_start_twap DECIMAL(20, 10);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS token_a_end_twap DECIMAL(20, 10);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS token_b_start_twap DECIMAL(20, 10);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS token_b_end_twap DECIMAL(20, 10);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS twap_calculated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS pair_id UUID;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Tokens table indexes
CREATE INDEX IF NOT EXISTS idx_tokens_address ON tokens(address);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON tokens(symbol);
CREATE INDEX IF NOT EXISTS idx_tokens_market_cap ON tokens(market_cap DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_category ON tokens(category);
CREATE INDEX IF NOT EXISTS idx_tokens_active ON tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_tokens_last_updated ON tokens(last_updated);

-- Token pairs table indexes
CREATE INDEX IF NOT EXISTS idx_token_pairs_category ON token_pairs(category);
CREATE INDEX IF NOT EXISTS idx_token_pairs_compatibility ON token_pairs(compatibility_score DESC);
CREATE INDEX IF NOT EXISTS idx_token_pairs_active ON token_pairs(is_active);
CREATE INDEX IF NOT EXISTS idx_token_pairs_usage ON token_pairs(usage_count);
CREATE INDEX IF NOT EXISTS idx_token_pairs_last_used ON token_pairs(last_used);

-- Unique index to prevent duplicate pairs (A,B) = (B,A)
CREATE UNIQUE INDEX IF NOT EXISTS idx_token_pairs_unique 
ON token_pairs (LEAST(token_a_address, token_b_address), GREATEST(token_a_address, token_b_address));

-- Token updates table indexes
CREATE INDEX IF NOT EXISTS idx_token_updates_type_time ON token_updates(update_type, started_at);

-- Additional competitions table indexes for new token fields
CREATE INDEX IF NOT EXISTS idx_competitions_pair ON competitions(pair_id);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS (with error handling)
-- =====================================================

-- Add foreign key constraints for token pairs (drop and recreate to avoid conflicts)
ALTER TABLE token_pairs DROP CONSTRAINT IF EXISTS fk_token_pairs_token_a;
ALTER TABLE token_pairs DROP CONSTRAINT IF EXISTS fk_token_pairs_token_b;
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS fk_competitions_pair;

-- Note: Only create FK constraints after we have actual tokens in the tokens table
-- These will be enabled once tokens are populated

-- ALTER TABLE token_pairs ADD CONSTRAINT fk_token_pairs_token_a 
--     FOREIGN KEY (token_a_address) REFERENCES tokens(address) ON DELETE CASCADE;

-- ALTER TABLE token_pairs ADD CONSTRAINT fk_token_pairs_token_b 
--     FOREIGN KEY (token_b_address) REFERENCES tokens(address) ON DELETE CASCADE;

-- ALTER TABLE competitions ADD CONSTRAINT fk_competitions_pair 
--     FOREIGN KEY (pair_id) REFERENCES token_pairs(id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_updates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tokens are publicly readable" ON tokens;
DROP POLICY IF EXISTS "Service role can manage tokens" ON tokens;
DROP POLICY IF EXISTS "Token pairs readable by authenticated users" ON token_pairs;
DROP POLICY IF EXISTS "Service role can manage token pairs" ON token_pairs;
DROP POLICY IF EXISTS "Admins can view token updates" ON token_updates;
DROP POLICY IF EXISTS "Service role can manage token updates" ON token_updates;

-- Tokens policies (public read access)
CREATE POLICY "Tokens are publicly readable" ON tokens
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage tokens" ON tokens
    FOR ALL USING (current_setting('app.current_user_role', true) = 'system');

-- Token pairs policies
CREATE POLICY "Token pairs readable by authenticated users" ON token_pairs
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage token pairs" ON token_pairs
    FOR ALL USING (current_setting('app.current_user_role', true) = 'system');

-- Token updates policies
CREATE POLICY "Admins can view token updates" ON token_updates
    FOR SELECT USING (current_setting('app.current_user_role', true) = 'admin');

CREATE POLICY "Service role can manage token updates" ON token_updates
    FOR ALL USING (current_setting('app.current_user_role', true) = 'system');

-- =====================================================
-- VIEWS FOR TOKEN SYSTEM
-- =====================================================

-- Drop existing active_competitions view and recreate with token data
DROP VIEW IF EXISTS active_competitions;

CREATE VIEW active_competitions AS
SELECT 
    c.*,
    COALESCE(ta.symbol, c.token_a_symbol) as token_a_symbol_full,
    COALESCE(ta.name, c.token_a_name) as token_a_name_full,
    ta.logo_uri as token_a_logo_uri,
    ta.current_price as token_a_current_price,
    ta.market_cap as token_a_market_cap,
    COALESCE(tb.symbol, c.token_b_symbol) as token_b_symbol_full,
    COALESCE(tb.name, c.token_b_name) as token_b_name_full,
    tb.logo_uri as token_b_logo_uri,
    tb.current_price as token_b_current_price,
    tb.market_cap as token_b_market_cap,
    COUNT(b.bet_id) as total_bets,
    COUNT(CASE WHEN b.chosen_token = 'token_a' THEN 1 END) as token_a_bets,
    COUNT(CASE WHEN b.chosen_token = 'token_b' THEN 1 END) as token_b_bets,
    SUM(b.amount) as total_betting_volume,
    -- Calculate current performance if competition is active
    CASE 
        WHEN c.status = 'ACTIVE' AND ta.current_price IS NOT NULL AND c.token_a_start_twap IS NOT NULL
        THEN ((ta.current_price - c.token_a_start_twap) / c.token_a_start_twap) * 100
        ELSE NULL 
    END as token_a_current_performance,
    CASE 
        WHEN c.status = 'ACTIVE' AND tb.current_price IS NOT NULL AND c.token_b_start_twap IS NOT NULL
        THEN ((tb.current_price - c.token_b_start_twap) / c.token_b_start_twap) * 100
        ELSE NULL 
    END as token_b_current_performance
FROM competitions c
LEFT JOIN tokens ta ON c.token_a_address = ta.address
LEFT JOIN tokens tb ON c.token_b_address = tb.address
LEFT JOIN bets b ON c.competition_id = b.competition_id
WHERE c.status IN ('SETUP', 'VOTING', 'ACTIVE')
GROUP BY c.competition_id, c.token_a_symbol, c.token_a_name, c.token_b_symbol, c.token_b_name,
         ta.symbol, ta.name, ta.logo_uri, ta.current_price, ta.market_cap,
         tb.symbol, tb.name, tb.logo_uri, tb.current_price, tb.market_cap;

-- Token statistics view
CREATE VIEW token_stats AS
SELECT 
    t.*,
    COUNT(c.competition_id) as competition_count,
    COUNT(CASE WHEN c.winner_token = 'token_a' AND c.token_a_address = t.address THEN 1
              WHEN c.winner_token = 'token_b' AND c.token_b_address = t.address THEN 1
              ELSE NULL END) as wins,
    AVG(CASE WHEN c.token_a_address = t.address THEN 
            ((c.token_a_end_twap - c.token_a_start_twap) / c.token_a_start_twap) * 100
         WHEN c.token_b_address = t.address THEN 
            ((c.token_b_end_twap - c.token_b_start_twap) / c.token_b_start_twap) * 100
         ELSE NULL END) as avg_performance
FROM tokens t
LEFT JOIN competitions c ON (c.token_a_address = t.address OR c.token_b_address = t.address)
    AND c.status = 'RESOLVED'
WHERE t.is_active = true
GROUP BY t.id, t.address, t.symbol, t.name, t.logo_uri, t.decimals, t.market_cap, 
         t.current_price, t.total_volume, t.price_change_24h, t.market_cap_rank, 
         t.category, t.age_days, t.tags, t.is_active, t.is_blacklisted, 
         t.liquidity_usd, t.created_at, t.last_updated;

-- =====================================================
-- TWAP CALCULATION FUNCTIONS
-- =====================================================

-- Drop functions if they exist first
DROP FUNCTION IF EXISTS calculate_twap(VARCHAR(50), TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_competition_twap(UUID);
DROP FUNCTION IF EXISTS update_token_modified_column();

-- Function to calculate TWAP for a token over a time period
CREATE OR REPLACE FUNCTION calculate_twap(
    p_token_address VARCHAR(50),
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE
) RETURNS DECIMAL(20, 10) AS $BODY$
DECLARE
    twap_result DECIMAL(20, 10);
BEGIN
    WITH price_intervals AS (
        SELECT 
            price,
            timestamp,
            LEAD(timestamp) OVER (ORDER BY timestamp) as next_timestamp,
            EXTRACT(EPOCH FROM (LEAD(timestamp) OVER (ORDER BY timestamp) - timestamp)) as time_weight
        FROM price_history
        WHERE token_address = p_token_address
        AND timestamp BETWEEN p_start_time AND p_end_time
        ORDER BY timestamp
    )
    SELECT 
        COALESCE(
            SUM(price * time_weight) / NULLIF(SUM(time_weight), 0),
            (SELECT price FROM price_history 
             WHERE token_address = p_token_address 
             AND timestamp <= p_end_time 
             ORDER BY timestamp DESC LIMIT 1)
        ) INTO twap_result
    FROM price_intervals
    WHERE next_timestamp IS NOT NULL;
    
    RETURN twap_result;
END;
$BODY$ LANGUAGE plpgsql;

-- Function to get competition TWAP data
CREATE OR REPLACE FUNCTION get_competition_twap(
    p_competition_id UUID
) RETURNS TABLE(
    token_a_start_twap DECIMAL(20, 10),
    token_a_end_twap DECIMAL(20, 10),
    token_b_start_twap DECIMAL(20, 10),
    token_b_end_twap DECIMAL(20, 10),
    winner VARCHAR(10)
) AS $BODY$
DECLARE
    comp_record RECORD;
BEGIN
    -- Get competition details
    SELECT * INTO comp_record FROM competitions WHERE competition_id = p_competition_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Competition not found';
    END IF;
    
    -- Calculate TWAPs for both tokens
    SELECT 
        calculate_twap(
            comp_record.token_a_address,
            comp_record.voting_end_time - INTERVAL '10 minutes',
            comp_record.voting_end_time + INTERVAL '10 minutes'
        ),
        calculate_twap(
            comp_record.token_a_address,
            comp_record.end_time - INTERVAL '10 minutes',
            comp_record.end_time + INTERVAL '10 minutes'
        ),
        calculate_twap(
            comp_record.token_b_address,
            comp_record.voting_end_time - INTERVAL '10 minutes',
            comp_record.voting_end_time + INTERVAL '10 minutes'
        ),
        calculate_twap(
            comp_record.token_b_address,
            comp_record.end_time - INTERVAL '10 minutes',
            comp_record.end_time + INTERVAL '10 minutes'
        )
    INTO token_a_start_twap, token_a_end_twap, token_b_start_twap, token_b_end_twap;
    
    -- Determine winner based on price performance
    IF ((token_a_end_twap - token_a_start_twap) / token_a_start_twap) > 
       ((token_b_end_twap - token_b_start_twap) / token_b_start_twap) THEN
        winner := 'token_a';
    ELSE
        winner := 'token_b';
    END IF;
    
    RETURN NEXT;
END;
$BODY$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamp trigger for tokens
CREATE OR REPLACE FUNCTION update_token_modified_column()
RETURNS TRIGGER AS $BODY$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

-- Drop triggers if they exist, then create them
DROP TRIGGER IF EXISTS update_tokens_modified ON tokens;
DROP TRIGGER IF EXISTS update_token_pairs_modified ON token_pairs;

CREATE TRIGGER update_tokens_modified 
    BEFORE UPDATE ON tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_token_modified_column();

CREATE TRIGGER update_token_pairs_modified 
    BEFORE UPDATE ON token_pairs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_token_modified_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant read permissions to authenticated users
GRANT SELECT ON tokens TO authenticated;
GRANT SELECT ON token_pairs TO authenticated;
GRANT SELECT ON token_updates TO authenticated;
GRANT SELECT ON active_competitions TO authenticated;
GRANT SELECT ON token_stats TO authenticated;

-- Grant read permissions to anonymous for public data  
GRANT SELECT ON tokens TO anon;
GRANT SELECT ON active_competitions TO anon;
GRANT SELECT ON token_stats TO anon;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Insert completion record
INSERT INTO token_updates (update_type, success, error_message, tokens_processed) 
VALUES ('schema_setup', true, 'Token management system added successfully', 0);

-- Final validation
SELECT 'Token management system setup completed successfully!' as result;
