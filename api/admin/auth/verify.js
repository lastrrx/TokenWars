import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { walletAddress, pin } = req.body;

  // Validate PIN length
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid PIN format. Must be 6 digits.' 
    });
  }

  try {
    // Query admin user and verify PIN using direct database query
    const { data, error } = await supabase
      .from('admin_users')
      .select('username, pin_hash, role')
      .eq('wallet_address', walletAddress)
      .single();

    if (error || !data) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify PIN using SQL function
    const { data: verifyResult, error: verifyError } = await supabase
      .rpc('verify_pin', {
        stored_hash: data.pin_hash,
        input_pin: pin
      });

    if (verifyError) {
      console.error('PIN verification error:', verifyError);
      return res.status(500).json({
        success: false,
        message: 'Authentication service error'
      });
    }

    if (verifyResult) {
      // Generate a simple token (in production, use JWT)
      const token = Buffer.from(`${walletAddress}:${Date.now()}`).toString('base64');
      
      return res.status(200).json({
        success: true,
        token: token,
        user: {
          username: data.username,
          role: data.role
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
