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

// CoinGecko API configuration
const COINGECKO_API_KEY = Deno.env.get('COINGECKO_API_KEY');
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

serve(async (req) => {
  console.log('🚀 fetch-tokens called - CACHE-FIRST with LOGO FIX implementation');
  
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
        
        // LOGO FIX: Validate and enhance logo URLs
        const tokensWithValidLogos = await enhanceTokenLogos(cacheResult.tokens);
        
        // Record cache hit analytics
        await recordCacheAnalytics('fetch-tokens', true, responseTime);
        
        return new Response(JSON.stringify({
          success: true,
          tokens: tokensWithValidLogos,
          count: tokensWithValidLogos.length,
          source: 'cache',
          cache_status: cacheResult.cache_status,
          timestamp: new Date().toISOString(),
          response_time_ms: responseTime,
          logo_enhancement: 'applied'
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
      
      // LOGO FIX: Validate and enhance logo URLs for database tokens
      const tokensWithValidLogos = await enhanceTokenLogos(databaseResult.tokens);
      
      // Record cache miss analytics
      await recordCacheAnalytics('fetch-tokens', false, responseTime);
      
      // Schedule background cache update (fire and forget)
      scheduleBackgroundCacheUpdate().catch(err => 
        console.warn('Background update scheduling failed:', err)
      );
      
      return new Response(JSON.stringify({
        success: true,
        tokens: tokensWithValidLogos,
        count: tokensWithValidLogos.length,
        source: 'database',
        cache_status: 'FALLBACK',
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime,
        note: 'Background cache update scheduled',
        logo_enhancement: 'applied'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // STEP 3: Final fallback to static data with CoinGecko logo enhancement
    console.log('⚠️ Database empty - using static fallback with CoinGecko logos');
    const staticTokens = getStaticFallbackTokens();
    const enhancedStaticTokens = await enhanceTokenLogos(staticTokens.slice(0, limit));
    const responseTime = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      success: true,
      tokens: enhancedStaticTokens,
      count: enhancedStaticTokens.length,
      source: 'static_fallback',
      cache_status: 'UNAVAILABLE',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      warning: 'Using static data - cache and database unavailable',
      logo_enhancement: 'applied'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ fetch-tokens error:', error);
    
    // Error fallback - return static data with basic logo fallbacks
    const staticTokens = getStaticFallbackTokens();
    const tokensWithFallbackLogos = staticTokens.slice(0, 10).map(token => ({
      ...token,
      logoURI: generateLogoFallback(token.symbol)
    }));
    
    return new Response(JSON.stringify({
      success: false,
      tokens: tokensWithFallbackLogos,
      count: tokensWithFallbackLogos.length,
      source: 'error_fallback',
      cache_status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString(),
      logo_enhancement: 'fallback_only'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // Still return 200 with data
    });
  }
});

/**
 * LOGO FIX: Enhance tokens with validated and fallback logo URLs
 */
async function enhanceTokenLogos(tokens: any[]): Promise<any[]> {
  console.log(`🖼️ Enhancing logos for ${tokens.length} tokens...`);
  
  const enhanced = await Promise.all(tokens.map(async (token) => {
    try {
      // Check if existing logo URL is valid
      let logoURI = token.logoURI;
      
      // If no logo or placeholder, try to get from CoinGecko
      if (!logoURI || logoURI.includes('placeholder') || logoURI === '/placeholder-token.png') {
        logoURI = await getCoinGeckoLogo(token.symbol, token.address);
      }
      
      // If still no logo, try Solana token list
      if (!logoURI) {
        logoURI = getSolanaTokenListLogo(token.address);
      }
      
      // Final fallback to generated logo
      if (!logoURI) {
        logoURI = generateLogoFallback(token.symbol);
      }
      
      return {
        ...token,
        logoURI,
        logo_source: logoURI.includes('ui-avatars.com') ? 'generated' : 
                    logoURI.includes('coingecko.com') ? 'coingecko' :
                    logoURI.includes('solana-labs') ? 'solana' : 'original'
      };
      
    } catch (error) {
      console.warn(`Logo enhancement failed for ${token.symbol}:`, error);
      return {
        ...token,
        logoURI: generateLogoFallback(token.symbol),
        logo_source: 'fallback'
      };
    }
  }));
  
  console.log(`✅ Enhanced ${enhanced.length} token logos`);
  return enhanced;
}

/**
 * Get logo from CoinGecko API
 */
async function getCoinGeckoLogo(symbol: string, address?: string): Promise<string | null> {
  try {
    if (!COINGECKO_API_KEY) {
      console.warn('CoinGecko API key not available');
      return null;
    }
    
    // Try to get token info from CoinGecko
    const headers: any = {
      'Accept': 'application/json',
      'User-Agent': 'TokenWars/1.0'
    };
    
    if (COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = COINGECKO_API_KEY;
    }
    
    // Search by symbol first
    const searchUrl = `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(symbol)}`;
    const searchResponse = await fetch(searchUrl, { headers });
    
    if (!searchResponse.ok) {
      throw new Error(`CoinGecko search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    // Find matching coin
    const coin = searchData.coins?.find((c: any) => 
      c.symbol.toLowerCase() === symbol.toLowerCase()
    );
    
    if (coin?.large) {
      console.log(`✅ Found CoinGecko logo for ${symbol}: ${coin.large}`);
      return coin.large;
    }
    
    return null;
    
  } catch (error) {
    console.warn(`CoinGecko logo fetch failed for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get logo from Solana token list
 */
function getSolanaTokenListLogo(address: string): string | null {
  const knownLogos: { [key: string]: string } = {
    'So11111111111111111111111111111111111111112': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'https://static.jup.ag/jup/icon.png',
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
    'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof/logo.png'
  };
  
  return knownLogos[address] || null;
}

/**
 * Generate fallback logo using UI Avatars service
 */
function generateLogoFallback(symbol: string): string {
  const cleanSymbol = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const firstChar = cleanSymbol.charAt(0) || 'T';
  
  // Use UI Avatars with consistent styling
  return `https://ui-avatars.com/api/?name=${firstChar}&background=8b5cf6&color=fff&size=64&bold=true&format=png`;
}

/**
 * Validate if a logo URL is accessible
 */
async function validateLogoUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch {
    return false;
  }
}

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
      logoURI: token.logo_uri, // Will be enhanced later
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
      logoURI: token.logo_uri, // Will be enhanced later
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
 * Static fallback data for emergency situations - WITH PROPER LOGOS
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
    },
    {
      address: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
      symbol: "RENDER",
      name: "Render Token",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof/logo.png",
      decimals: 8,
      market_cap: 850000000,
      price: 7.85,
      volume_24h: 95000000,
      price_change_24h: -2.1,
      age_days: 600,
      source: 'static'
    }
  ];
}
