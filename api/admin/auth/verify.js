// API endpoint for admin authentication
// File: api/admin/auth/verify.js

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://lavbfujrqmxiyfkfgcqy.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
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
    console.log('Auth attempt:', { walletAddress, pinLength: pin?.length });
    
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
    
    // Check hardcoded admin credentials for Phase 1
    const ADMIN_WALLET = 'HmT6Nj3r24YKCxGLPFvf1gSJijXyNcrPHKKeknZYGRXv';
    const ADMIN_PIN = '999196';
    
    if (walletAddress === ADMIN_WALLET && pin === ADMIN_PIN) {
      console.log('✅ Admin authentication successful');
      
      const token = 'admin-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      return res.status(200).json({
        success: true,
        token: token,
        user: {
          id: 'admin-1',
          username: 'Admin',
          role: 'admin',
          wallet: walletAddress
        }
      });
    }
    
    // Try database lookup if hardcoded credentials don't match
    try {
      console.log('Checking database for admin user...');
      
      const { data: adminUser, error: userError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('is_active', true)
        .single();
      
      if (userError || !adminUser) {
        console.log('Admin user not found in database');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // For Phase 1, use simple PIN comparison
      // In production, this should use proper password hashing
      if (adminUser.pin_hash === pin || adminUser.pin === pin) {
        console.log('✅ Database admin authentication successful');
        
        // Update last login
        await supabase
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('admin_id', adminUser.admin_id);
        
        const token = 'admin-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        return res.status(200).json({
          success: true,
          token: token,
          user: {
            id: adminUser.admin_id,
            username: adminUser.username,
            role: adminUser.role,
            wallet: adminUser.wallet_address
          }
        });
      }
      
    } catch (dbError) {
      console.warn('Database check failed, continuing with hardcoded auth:', dbError.message);
    }
    
    // Authentication failed
    console.log('❌ Authentication failed');
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

// Alternative export for different deployment environments
export { handler as default };

// For environments that expect CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = handler;
}

// For edge function environments
if (typeof Deno !== 'undefined') {
  Deno.serve(async (req) => {
    const url = new URL(req.url);
    const method = req.method;
    
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
    
    if (method === 'POST') {
      try {
        const body = await req.json();
        
        const mockRes = {
          status: (code) => ({
            json: (data) => new Response(JSON.stringify(data), {
              status: code,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            })
          }),
          setHeader: () => {},
          end: () => new Response(null, { status: 200 })
        };
        
        const mockReq = {
          method: 'POST',
          body: body
        };
        
        return await handler(mockReq, mockRes);
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  });
}
