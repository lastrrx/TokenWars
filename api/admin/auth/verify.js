// Vercel API endpoint for admin authentication
// File: api/admin/auth/verify.js

export default async function handler(req, res) {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
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
    console.log('=== ADMIN AUTH REQUEST ===');
    
    const { walletAddress, pin } = req.body;
    console.log('Auth attempt:', { walletAddress, pinProvided: !!pin });
    
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
    
    // Hardcoded admin credentials for Phase 1
    const ADMIN_WALLET = 'HmT6Nj3r24YKCxGLPFvf1gSJijXyNcrPHKKeknZYGRXv';
    const ADMIN_PIN = '999196';
    
    console.log('Checking credentials...');
    console.log('Expected wallet:', ADMIN_WALLET);
    console.log('Provided wallet:', walletAddress);
    console.log('Expected PIN:', ADMIN_PIN);
    console.log('Provided PIN:', pin);
    
    if (walletAddress === ADMIN_WALLET && pin === ADMIN_PIN) {
      console.log('✅ Admin authentication successful');
      
      const token = 'admin-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      return res.status(200).json({
        success: true,
        token: token,
        user: {
          id: 'admin-1',
          username: 'TokenWars Admin',
          role: 'admin',
          wallet: walletAddress
        }
      });
    }
    
    // Authentication failed
    console.log('❌ Authentication failed - invalid credentials');
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
    
  } catch (error) {
    console.error('❌ Auth API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
