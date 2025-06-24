-- Token Management Database Schema
-- This file contains all table definitions for token selection, price tracking, and TWAP calculations

-- ==============================================
-- TOKENS TABLE
-- Stores validated token data from Jupiter and CoinGecko
-- ==============================================

CREATE TABLE IF NOT EXISTS tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address VARCHAR(50) UNIQUE NOT NULL, -- Solana token address
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    logo_uri TEXT,
    decimals INTEGER DEFAULT 9,
    
    -- Market data
    market_cap BIGINT, -- Market cap in USD
    current_price DECIMAL(20, 10), -- Current price in USD
    total_volume BIGINT, -- 24h volume in USD
    price_change_24h DECIMAL(10, 4), -- 24h price change percentage
    market_cap_rank INTEGER,
    
    -- Token metadata
    category VARCHAR(20), -- LARGE_CAP, MID_CAP, SMALL_CAP, MICRO_CAP
    age_days INTEGER, -- Age of token in days
    tags TEXT[], -- Array of tags from Jupiter
    
    -- Status and tracking
    is_active BOOLEAN DEFAULT true,
    is_blacklisted BOOLEAN DEFAULT false,
    last_liquidity_check TIMESTAMP WITH TIME ZONE,
    liquidity_usd BIGINT, -- Current liquidity in USD
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT valid_address_length CHECK (LENGTH(address) = 44),
    CONSTRAINT valid_symbol_length CHECK (LENGTH(symbol) BETWEEN 2 AND 20),
    CONSTRAINT valid_name_length CHECK (LENGTH(name) BETWEEN 3 AND 100),
    CONSTRAINT positive_market_cap CHECK (market_cap > 0),
    CONSTRAINT positive_price CHECK (current_price > 0)
);

-- Indexes for tokens table
CREATE INDEX IF NOT EXISTS idx_tokens_address ON tokens(address);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON tokens(symbol);
CREATE INDEX IF NOT EXISTS idx_tokens_market_cap ON tokens(market_cap DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_category ON tokens(category);
CREATE INDEX IF NOT EXISTS idx_tokens_active ON tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_tokens_last_updated ON tokens(last_updated);

-- ==============================================
-- TOKEN_PAIRS TABLE
-- Stores generated token pairs for competitions
-- ==============================================

CREATE TABLE IF NOT EXISTS token_pairs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_a_address VARCHAR(50) NOT NULL,
    token_b_address VARCHAR(50) NOT NULL,
    
    -- Pairing metadata
    category VARCHAR(20) NOT NULL, -- Market cap category
    market_cap_ratio DECIMAL(10, 4), -- Ratio of larger to smaller market cap
    compatibility_score DECIMAL(8, 2), -- 0-100 score for pair quality
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    last_competition_id UUID,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    FOREIGN KEY (token_a_address) REFERENCES tokens(address) ON DELETE CASCADE,
    FOREIGN KEY (token_b_address) REFERENCES tokens(address) ON DELETE CASCADE,
    
    -- Ensure no duplicate pairs (A,B) = (B,A)
    CONSTRAINT unique_token_pair UNIQUE (LEAST(token_a_address, token_b_address), GREATEST(token_a_address, token_b_address)),
    CONSTRAINT different_tokens CHECK (token_a_address != token_b_address),
    CONSTRAINT valid_compatibility_score CHECK (compatibility_score BETWEEN 0 AND 100)
);

-- Indexes for token_pairs table
CREATE INDEX IF NOT EXISTS idx_token_pairs_category ON token_pairs(category);
CREATE INDEX IF NOT EXISTS idx_token_pairs_compatibility ON token_pairs(compatibility_score DESC);
CREATE INDEX IF NOT EXISTS idx_token_pairs_active ON token_pairs(is_active);
CREATE INDEX IF NOT EXISTS idx_token_pairs_usage ON token_pairs(usage_count);
CREATE INDEX IF NOT EXISTS idx_token_pairs_last_used ON token_pairs(last_used);

-- ==============================================
-- PRICE_HISTORY TABLE
-- Stores historical price data for TWAP calculations
-- ==============================================

CREATE TABLE IF NOT EXISTS price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_address VARCHAR(50) NOT NULL,
    price DECIMAL(20, 10) NOT NULL,
    volume BIGINT DEFAULT 0, -- Volume at time of price
    market_cap BIGINT DEFAULT 0, -- Market cap at time of price
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Price source metadata
    source VARCHAR(20) DEFAULT 'aggregated', -- jupiter, coingecko, dexscreener, etc.
    confidence_score DECIMAL(5, 2) DEFAULT 100.0, -- Confidence in price accuracy (0-100)
    
    -- Foreign key constraint
    FOREIGN KEY (token_address) REFERENCES tokens(address) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT positive_price CHECK (price > 0),
    CONSTRAINT valid_confidence CHECK (confidence_score BETWEEN 0 AND 100)
);

-- Indexes for price_history table
CREATE INDEX IF NOT EXISTS idx_price_history_token_timestamp ON price_history(token_address, timestamp);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_price_history_token ON price_history(token_address);

-- Partition by timestamp for better performance (optional, for large datasets)
-- CREATE TABLE price_history_y2024m01 PARTITION OF price_history 
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ==============================================
-- TOKEN_UPDATES TABLE
-- Tracks when token list was last updated
-- ==============================================

CREATE TABLE IF NOT EXISTS token_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    update_type VARCHAR(20) NOT NULL, -- 'full_refresh', 'price_update', 'metadata_update'
    tokens_processed INTEGER DEFAULT 0,
    tokens_added INTEGER DEFAULT 0,
    tokens_updated INTEGER DEFAULT 0,
    tokens_removed INTEGER DEFAULT 0,
    
    -- Update metadata
    source VARCHAR(20), -- 'jupiter', 'coingecko', 'manual'
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Performance metrics
    duration_seconds INTEGER, -- How long the update took
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for token_updates table
CREATE INDEX IF NOT EXISTS idx_token_updates_type_time ON token_updates(update_type, started_at);

-- ==============================================
-- COMPETITIONS TABLE UPDATES
-- Add token-related fields to existing competitions table
-- ==============================================

-- Add new columns to competitions table for token integration
ALTER TABLE competitions 
ADD COLUMN IF NOT EXISTS token_a_address VARCHAR(50),
ADD COLUMN IF NOT EXISTS token_b_address VARCHAR(50),
ADD COLUMN IF NOT EXISTS token_a_logo TEXT,
ADD COLUMN IF NOT EXISTS token_b_logo TEXT,
ADD COLUMN IF NOT EXISTS token_a_start_twap DECIMAL(20, 10),
ADD COLUMN IF NOT EXISTS token_a_end_twap DECIMAL(20, 10),
ADD COLUMN IF NOT EXISTS token_b_start_twap DECIMAL(20, 10),
ADD COLUMN IF NOT EXISTS token_b_end_twap DECIMAL(20, 10),
ADD COLUMN IF NOT EXISTS twap_calculated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pair_id UUID;

-- Add foreign key constraints for competitions table
ALTER TABLE competitions 
ADD CONSTRAINT fk_competitions_token_a FOREIGN KEY (token_a_address) REFERENCES tokens(address),
ADD CONSTRAINT fk_competitions_token_b FOREIGN KEY (token_b_address) REFERENCES tokens(address),
ADD CONSTRAINT fk_competitions_pair FOREIGN KEY (pair_id) REFERENCES token_pairs(id);

-- Add indexes for competitions table
CREATE INDEX IF NOT EXISTS idx_competitions_token_a ON competitions(token_a_address);
CREATE INDEX IF NOT EXISTS idx_competitions_token_b ON competitions(token_b_address);
CREATE INDEX IF NOT EXISTS idx_competitions_pair ON competitions(pair_id);

-- ==============================================
-- VIEWS FOR EASIER QUERYING
-- ==============================================

-- Active competitions with token data
CREATE OR REPLACE VIEW active_competitions AS
SELECT 
    c.*,
    ta.symbol as token_a_symbol,
    ta.name as token_a_name,
    ta.logo_uri as token_a_logo_uri,
    ta.current_price as token_a_current_price,
    ta.market_cap as token_a_market_cap,
    tb.symbol as token_b_symbol,
    tb.name as token_b_name,
    tb.logo_uri as token_b_logo_uri,
    tb.current_price as token_b_current_price,
    tb.market_cap as token_b_market_cap,
    -- Calculate current performance if competition is active
    CASE 
        WHEN c.status = 'ACTIVE' AND ta.current_price IS NOT NULL AND c.token_a_start_twap IS NOT NULL
        THEN ((ta.current_price - c.token_a_start_twap) / c.token_a_start_twap) * 100
        ELSE NULL 
    END as token_a_performance,
    CASE 
        WHEN c.status = 'ACTIVE' AND tb.current_price IS NOT NULL AND c.token_b_start_twap IS NOT NULL
        THEN ((tb.current_price - c.token_b_start_twap) / c.token_b_start_twap) * 100
        ELSE NULL 
    END as token_b_performance
FROM competitions c
LEFT JOIN tokens ta ON c.token_a_address = ta.address
LEFT JOIN tokens tb ON c.token_b_address = tb.address
WHERE c.status IN ('SETUP', 'VOTING', 'ACTIVE', 'CLOSED');

-- Token statistics view
CREATE OR REPLACE VIEW token_stats AS
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
         t.last_liquidity_check, t.liquidity_usd, t.created_at, t.last_updated;

-- ==============================================
-- FUNCTIONS FOR TWAP CALCULATIONS
-- ==============================================

-- Function to calculate TWAP for a token over a time period
CREATE OR REPLACE FUNCTION calculate_twap(
    p_token_address VARCHAR(50),
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE
) RETURNS DECIMAL(20, 10) AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get competition TWAP data
CREATE OR REPLACE FUNCTION get_competition_twap(
    p_competition_id UUID
) RETURNS TABLE(
    token_a_start_twap DECIMAL(20, 10),
    token_a_end_twap DECIMAL(20, 10),
    token_b_start_twap DECIMAL(20, 10),
    token_b_end_twap DECIMAL(20, 10),
    winner VARCHAR(10)
) AS $$
DECLARE
    comp_record RECORD;
    twap_window_minutes INTEGER := 10;
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
$$ LANGUAGE plpgsql;

-- ==============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================

-- Update timestamp trigger for tokens
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tokens_modified 
    BEFORE UPDATE ON tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_token_pairs_modified 
    BEFORE UPDATE ON token_pairs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_updates ENABLE ROW LEVEL SECURITY;

-- Public read access for tokens (they're public data)
CREATE POLICY "Tokens are publicly readable" ON tokens
    FOR SELECT USING (true);

-- Only authenticated users can read token pairs
CREATE POLICY "Token pairs readable by authenticated users" ON token_pairs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Price history readable by authenticated users
CREATE POLICY "Price history readable by authenticated users" ON price_history
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can insert/update tokens and price data
CREATE POLICY "Service role can manage tokens" ON tokens
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage token pairs" ON token_pairs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage price history" ON price_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage token updates" ON token_updates
    FOR ALL USING (auth.role() = 'service_role');

-- ==============================================
-- DATA CLEANUP AND MAINTENANCE
-- ==============================================

-- Function to cleanup old price history (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_price_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM price_history 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO token_updates (update_type, tokens_processed, success, duration_seconds)
    VALUES ('cleanup', deleted_count, true, 0);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily (would be set up in Supabase cron or external scheduler)
-- SELECT cron.schedule('cleanup-price-history', '0 2 * * *', 'SELECT cleanup_old_price_history();');

-- ==============================================
-- INITIAL DATA AND CONFIGURATIONS
-- ==============================================

-- Insert default token categories configuration
INSERT INTO token_updates (update_type, success, error_message) 
VALUES ('schema_setup', true, 'Token management schema created successfully')
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT SELECT ON tokens TO authenticated;
GRANT SELECT ON token_pairs TO authenticated;
GRANT SELECT ON price_history TO authenticated;
GRANT SELECT ON active_competitions TO authenticated;
GRANT SELECT ON token_stats TO authenticated;
