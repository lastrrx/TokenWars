-- Admin Setup for Token Betting Platform
-- This script creates admin tables and initial admin users

-- Admin users table
CREATE TABLE admin_users (
    admin_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    username VARCHAR(50) NOT NULL,
    pin_hash VARCHAR(60) NOT NULL, -- bcrypt hash of 6-digit PIN
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(admin_id),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(32),
    CONSTRAINT valid_role CHECK (role IN ('super_admin', 'admin', 'moderator', 'viewer'))
);

-- Create indexes for admin users
CREATE INDEX idx_admin_users_wallet ON admin_users(wallet_address);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- Admin sessions table
CREATE TABLE admin_sessions (
    session_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES admin_users(admin_id),
    token_hash VARCHAR(64) NOT NULL, -- SHA256 hash of JWT
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    revoked_reason TEXT
);

-- Create indexes for admin sessions
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Admin action logs table
CREATE TABLE admin_logs (
    log_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES admin_users(admin_id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    affected_user VARCHAR(44),
    affected_competition UUID,
    severity VARCHAR(20) DEFAULT 'info',
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Create indexes for admin logs
CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_timestamp ON admin_logs(timestamp DESC);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_severity ON admin_logs(severity);

-- Admin permissions reference table
CREATE TABLE admin_permissions (
    permission_key VARCHAR(50) PRIMARY KEY,
    description TEXT,
    category VARCHAR(30),
    required_role VARCHAR(20)
);

-- Insert permission definitions
INSERT INTO admin_permissions (permission_key, description, category, required_role) VALUES
('competitions.create', 'Create new competitions', 'competitions', 'admin'),
('competitions.pause', 'Pause active competitions', 'competitions', 'admin'),
('competitions.cancel', 'Cancel competitions', 'competitions', 'super_admin'),
('competitions.resolve', 'Manually resolve competitions', 'competitions', 'admin'),
('users.view', 'View user details', 'users', 'moderator'),
('users.ban', 'Ban users', 'users', 'admin'),
('users.modify', 'Modify user data', 'users', 'super_admin'),
('settings.view', 'View platform settings', 'settings', 'viewer'),
('settings.modify', 'Modify platform settings', 'settings', 'super_admin'),
('admin.create', 'Create new admin users', 'admin', 'super_admin'),
('admin.modify', 'Modify admin permissions', 'admin', 'super_admin'),
('emergency.pause', 'Emergency pause platform', 'emergency', 'super_admin'),
('emergency.refund', 'Process emergency refunds', 'emergency', 'super_admin');

-- IP whitelist table for additional security
CREATE TABLE admin_ip_whitelist (
    id SERIAL PRIMARY KEY,
    admin_id UUID REFERENCES admin_users(admin_id),
    ip_address INET NOT NULL,
    description TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by UUID REFERENCES admin_users(admin_id),
    UNIQUE(admin_id, ip_address)
);

-- Failed login attempts tracking
CREATE TABLE admin_login_attempts (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44),
    ip_address INET,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE,
    failure_reason TEXT
);

-- Create index for login attempts
CREATE INDEX idx_login_attempts_wallet_time ON admin_login_attempts(wallet_address, attempted_at DESC);
CREATE INDEX idx_login_attempts_ip_time ON admin_login_attempts(ip_address, attempted_at DESC);

-- Functions for admin management

-- Function to verify admin PIN
CREATE OR REPLACE FUNCTION verify_admin_pin(
    p_wallet_address VARCHAR,
    p_pin VARCHAR
)
RETURNS TABLE(admin_id UUID, role VARCHAR, is_valid BOOLEAN) AS $$
DECLARE
    v_admin_record RECORD;
BEGIN
    -- Get admin record
    SELECT a.admin_id, a.pin_hash, a.role, a.is_active
    INTO v_admin_record
    FROM admin_users a
    WHERE a.wallet_address = p_wallet_address;
    
    IF NOT FOUND THEN
        -- Log failed attempt
        INSERT INTO admin_login_attempts (wallet_address, success, failure_reason)
        VALUES (p_wallet_address, FALSE, 'Admin not found');
        
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, FALSE;
        RETURN;
    END IF;
    
    IF NOT v_admin_record.is_active THEN
        -- Log failed attempt
        INSERT INTO admin_login_attempts (wallet_address, success, failure_reason)
        VALUES (p_wallet_address, FALSE, 'Admin account inactive');
        
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, FALSE;
        RETURN;
    END IF;
    
    -- Verify PIN using pgcrypto
    IF crypt(p_pin, v_admin_record.pin_hash) = v_admin_record.pin_hash THEN
        -- Update last login
        UPDATE admin_users SET last_login = CURRENT_TIMESTAMP
        WHERE admin_id = v_admin_record.admin_id;
        
        -- Log successful attempt
        INSERT INTO admin_login_attempts (wallet_address, success)
        VALUES (p_wallet_address, TRUE);
        
        RETURN QUERY SELECT v_admin_record.admin_id, v_admin_record.role, TRUE;
    ELSE
        -- Log failed attempt
        INSERT INTO admin_login_attempts (wallet_address, success, failure_reason)
        VALUES (p_wallet_address, FALSE, 'Invalid PIN');
        
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if IP is whitelisted
CREATE OR REPLACE FUNCTION is_ip_whitelisted(
    p_admin_id UUID,
    p_ip_address INET
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_ip_whitelist
        WHERE admin_id = p_admin_id AND ip_address = p_ip_address
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM admin_sessions
    WHERE expires_at < CURRENT_TIMESTAMP AND NOT revoked;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create initial super admin (CHANGE THESE VALUES!)
-- Note: The PIN '123456' is hashed here. MUST BE CHANGED in production!
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE role = 'super_admin') THEN
        INSERT INTO admin_users (
            wallet_address,
            username,
            pin_hash,
            role,
            permissions
        ) VALUES (
            'YourSuperAdminWalletAddressHere', -- CHANGE THIS!
            'superadmin',
            crypt('123456', gen_salt('bf')), -- CHANGE THIS PIN!
            'super_admin',
            '{"all": true}'::jsonb
        );
        
        RAISE NOTICE 'Super admin created. IMPORTANT: Change the wallet address and PIN immediately!';
    END IF;
END $$;

-- Schedule cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions();');

-- Grants for admin operations
-- GRANT SELECT, INSERT, UPDATE ON admin_users TO token_betting_admin;
-- GRANT SELECT, INSERT, UPDATE ON admin_sessions TO token_betting_admin;
-- GRANT SELECT, INSERT ON admin_logs TO token_betting_admin;

-- Comments for documentation
COMMENT ON TABLE admin_users IS 'Admin users with wallet + PIN authentication';
COMMENT ON TABLE admin_sessions IS 'Active admin sessions for JWT validation';
COMMENT ON TABLE admin_logs IS 'Audit trail of all admin actions';
COMMENT ON COLUMN admin_users.pin_hash IS 'Bcrypt hash of 6-digit PIN';

-- Security notes:
-- 1. Always use HTTPS for admin panel
-- 2. Implement rate limiting at application level
-- 3. Use environment variables for sensitive data
-- 4. Enable 2FA for production super admins
-- 5. Regularly rotate admin PINs
-- 6. Monitor admin_logs for suspicious activity
