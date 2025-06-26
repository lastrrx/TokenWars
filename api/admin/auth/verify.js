export default function handler(req, res) {
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
    console.log('Auth request body:', req.body);
    
    const { walletAddress, pin } = req.body;
    
    // Validate input
    if (!walletAddress || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Missing wallet address or PIN'
      });
    }
    
    // Validate PIN format
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be 6 digits'
      });
    }
    
    // Simple hardcoded authentication for testing
    const validWallet = 'HmT6Nj3r24YKCxGLPvf1gSJijXyNcrPHKKeknZYGRXv';
    const validPin = '999196';
    
    console.log('Comparing:', { 
      receivedWallet: walletAddress, 
      validWallet,
      receivedPin: pin, 
      validPin,
      walletMatch: walletAddress === validWallet,
      pinMatch: pin === validPin
    });
    
    if (walletAddress === validWallet && pin === validPin) {
      return res.status(200).json({
        success: true,
        token: 'admin-token-' + Date.now(),
        user: {
          username: 'superadmin',
          role: 'SUPER_ADMIN',
          wallet: walletAddress
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
