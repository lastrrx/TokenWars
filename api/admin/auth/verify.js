import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Set headers first
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    console.log('Auth request received');
    
    const { walletAddress, pin } = req.body;
    
    // Validate input
    if (!walletAddress || !pin) {
      console.log('Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Missing wallet address or PIN'
      });
    }
    
    // Validate PIN format
    if (!/^\d{6}$/.test(pin)) {
      console.log('Invalid PIN format');
      return res.status(400).json({
        success: false,
        message: 'PIN must be 6 digits'
      });
    }
    
    console.log('Looking up admin user:', walletAddress);
    
    // Query admin user from database
    const { data: adminUser, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('is_active', true)
      .single();
    
    if (userError || !adminUser) {
      console.log('Admin user not found or error:', userError);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    console.log('Admin user found:', adminUser.username);
    
    // Verify PIN against stored hash using database function
    const { data: pinValid, error: pinError } = await supabase
      .rpc('verify_admin_pin_hash', {
        stored_hash: adminUser.pin_hash,
        input_pin: pin
      });
    
    if (pinError) {
      console.error('PIN verification error:', pinError);
      return res.status(500).json({
        success: false,
        message: 'Authentication service error'
      });
    }
    
    if (!pinValid) {
      console.log('Invalid PIN for user:', adminUser.username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    console.log('Authentication successful for:', adminUser.username);
    
    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('admin_id', adminUser.admin_id);
    
    // Generate secure token (simple version)
    const token = 'admin-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    return res.status(200).json({
      success: true,
      token: token,
      user: {
        id: adminUser.admin_id,
        username: adminUser.username,
        role: adminUser.role,
        wallet: adminUser.wallet_address,
        permissions: adminUser.permissions
      }
    });
    
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
