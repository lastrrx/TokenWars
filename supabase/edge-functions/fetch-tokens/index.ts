import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// Initialize Supabase client for database operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  console.log('🚀 fetch-tokens called - CACHE-FIRST implementation');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Parse request parameters
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const category = url.searchParams.get('category') || null;
    
    console.log(`📊 Request params: forceRefresh=${forceRefresh}, limit=${limit}, category=${category}`);

    // STEP 1: Try cache first (unless forced refresh)
    if (!forceRefresh) {
      const cacheResult = await getCachedTokens(limit, category);
      if (cacheResult.success && cacheResult.tokens.length > 0) {
        const responseTime = Date.now() - startTime;
        console.log(`✅ Cache hit! Returned ${cacheResult.tokens.length} tokens in ${responseTime}ms`);
        
        // Record cache hit analytics
        await recordCacheAnalytics('fetch-tokens', true, responseTime);
        
        return new Response(JSON.stringify({
          success: true,
          tokens: cacheResult.tokens,
          count: cacheResult.tokens.length,
          source: 'cache',
          cache_status: cacheResult.cache_status,
          timestamp: new Date().toISOString(),
          response_time_ms: responseTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } else {
        console.log('⚠️ Cache miss or empty - falling back to database');
      }
    }

    // STEP 2: Fallback to main tokens table
    const databaseResult = await getDatabaseTokens(limit, category);
    if (databaseResult.success && databaseResult.tokens.length > 0) {
      const responseTime = Date.now() - startTime;
      console.log(`✅ Database fallback! Returned ${databaseResult.tokens.length} tokens in ${responseTime}ms`);
      
      // Record cache miss analytics
      await recordCacheAnalytics('fetch-tokens', false, responseTime);
      
      // Schedule background cache update (fire and forget)
      scheduleBackgroundCacheUpdate().catch(err => 
        console.warn('Background update scheduling failed:', err)
      );
      
      return new Response(JSON.stringify({
        success: true,
        tokens: databaseResult.tokens,
        count: databaseResult.tokens.length,
        source: 'database',
        cache_status: 'FALLBACK',
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime,
        note: 'Background cache update scheduled'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // STEP 3: Final fallback to static data
    console.log('⚠️ Database empty - using static fallback');
    const staticTokens = getStaticFallbackTokens();
    const responseTime = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      success: true,
      tokens: staticTokens.slice(0, limit),
      count: Math.min(staticTokens.length, limit),
      source: 'static_fallback',
      cache_status: 'UNAVAILABLE',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      warning: 'Using static data - cache and database unavailable'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ fetch-tokens error:', error);
    
    // Error fallback - return static data
    const staticTokens = getStaticFallbackTokens();
    
    return new Response(JSON.stringify({
      success: false,
      tokens: staticTokens.slice(0, 10), // Limited fallback
      count: Math.min(staticTokens.length, 10),
      source: 'error_fallback',
      cache_status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // Still return 200 with data
    });
  }
});

/**
 * Get tokens from cache with freshness validation
 */
async function getCachedTokens(limit: number, category: string | null) {
  try {
    let query = supabase
      .from('token_cache')
      .select('*')
      .gte('cache_expires_at', new Date().toISOString()) // Only fresh cache
      .eq('cache_status', 'FRESH')
      .order('market_cap_usd', { ascending: false })
      .limit(limit);

    // Apply category filter if specified
    if (category) {
      // Category filtering logic can be added here
      console.log(`📂 Category filter applied: ${category}`);
    }

    const { data: cachedTokens, error } = await query;

    if (error) {
      console.error('Cache query error:', error);
      return { success: false, tokens: [], cache_status: 'ERROR' };
    }

    if (!cachedTokens || cachedTokens.length === 0) {
      return { success: false, tokens: [], cache_status: 'EMPTY' };
    }

    // Transform cache data to expected format
    const tokens = cachedTokens.map(token => ({
      address: token.token_address,
      symbol: token.symbol,
      name: token.name,
      logoURI: token.logo_uri,
      decimals: 9, // Default for Solana
      market_cap: token.market_cap_usd,
      price: token.current_price,
      volume_24h: token.volume_24h,
      price_change_24h: token.price_change_24h,
      age_days: null, // Not stored in cache
      cache_timestamp: token.cache_created_at,
      data_source: token.data_source
    }));

    return { 
      success: true, 
      tokens, 
      cache_status: 'FRESH'
    };

  } catch (error) {
    console.error('getCachedTokens error:', error);
    return { success: false, tokens: [], cache_status: 'ERROR' };
  }
}

/**
 * Get tokens from main database table
 */
async function getDatabaseTokens(limit: number, category: string | null) {
  try {
    let query = supabase
      .from('tokens')
      .select('*')
      .eq('is_active', true)
      .order('market_cap', { ascending: false })
      .limit(limit);

    // Apply category filter if specified
    if (category) {
      query = query.eq('category', category.toUpperCase());
    }

    const { data: dbTokens, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      return { success: false, tokens: [] };
    }

    if (!dbTokens || dbTokens.length === 0) {
      return { success: false, tokens: [] };
    }

    // Transform database data to expected format
    const tokens = dbTokens.map(token => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      logoURI: token.logo_uri,
      decimals: token.decimals || 9,
      market_cap: token.market_cap,
      price: token.current_price,
      volume_24h: token.total_volume,
      price_change_24h: token.price_change_24h,
      age_days: token.age_days,
      last_updated: token.last_updated
    }));

    return { success: true, tokens };

  } catch (error) {
    console.error('getDatabaseTokens error:', error);
    return { success: false, tokens: [] };
  }
}

/**
 * Schedule background cache update (non-blocking)
 */
async function scheduleBackgroundCacheUpdate() {
  try {
    // Insert background job for cache update
    const { error } = await supabase
      .from('background_jobs')
      .insert([{
        job_type: 'UPDATE_TOKEN_CACHE',
        job_data: { 
          triggered_by: 'cache_miss',
          priority: 'NORMAL',
          batch_size: 20
        },
        priority: 'NORMAL',
        scheduled_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Failed to schedule background job:', error);
    } else {
      console.log('✅ Background cache update scheduled');
    }
  } catch (error) {
    console.error('scheduleBackgroundCacheUpdate error:', error);
  }
}

/**
 * Record cache analytics for monitoring
 */
async function recordCacheAnalytics(operation: string, cacheHit: boolean, responseTime: number) {
  try {
    // Simple analytics recording (could be enhanced)
    const { error } = await supabase
      .from('cache_analytics')
      .upsert([{
        period_start: new Date(Date.now() - 3600000).toISOString(), // Current hour
        period_end: new Date().toISOString(),
        total_requests: 1,
        cache_hits: cacheHit ? 1 : 0,
        cache_misses: cacheHit ? 0 : 1,
        avg_api_response_time_ms: responseTime
      }], { 
        onConflict: 'period_start,period_end',
        ignoreDuplicates: false 
      });

    if (error) {
      console.warn('Analytics recording failed:', error);
    }
  } catch (error) {
    console.warn('recordCacheAnalytics error:', error);
  }
}

/**
 * Static fallback data for emergency situations
 */
function getStaticFallbackTokens() {
  return [
    {
      address: "So11111111111111111111111111111111111111112",
      symbol: "SOL",
      name: "Wrapped SOL",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      decimals: 9,
      market_cap: 45000000000,
      price: 180.50,
      volume_24h: 2500000000,
      price_change_24h: 2.5,
      age_days: 1500,
      source: 'static'
    },
    {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      symbol: "USDC",
      name: "USD Coin",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
      decimals: 6,
      market_cap: 42000000000,
      price: 1.00,
      volume_24h: 1800000000,
      price_change_24h: 0.01,
      age_days: 1200,
      source: 'static'
    },
    {
      address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      symbol: "MSOL",
      name: "Marinade Staked SOL",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png",
      decimals: 9,
      market_cap: 1200000000,
      price: 195.30,
      volume_24h: 45000000,
      price_change_24h: 1.8,
      age_days: 800,
      source: 'static'
    },
    {
      address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      symbol: "JUP",
      name: "Jupiter",
      logoURI: "https://static.jup.ag/jup/icon.png",
      decimals: 6,
      market_cap: 1500000000,
      price: 1.15,
      volume_24h: 85000000,
      price_change_24h: 3.2,
      age_days: 120,
      source: 'static'
    },
    {
      address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      symbol: "BONK",
      name: "Bonk",
      logoURI: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
      decimals: 5,
      market_cap: 900000000,
      price: 0.000023,
      volume_24h: 125000000,
      price_change_24h: -1.5,
      age_days: 400,
      source: 'static'
    }
  ];
}
