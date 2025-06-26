export default async function handler(req, res) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    
    console.log('Environment debug:', {
      url: url,
      urlValid: url && url.includes('supabase.co'),
      keyPrefix: key ? key.substring(0, 10) + '...' : 'missing',
      keyLength: key ? key.length : 0
    });
    
    // Test Supabase connection
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(url, key);
    
    // Simple test query
    const { data, error } = await supabase
      .from('admin_users')
      .select('count')
      .limit(1);
    
    console.log('Database test:', { data, error });
    
    return res.json({
      success: !error,
      url: url,
      keyLength: key ? key.length : 0,
      error: error?.message,
      data: data
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

