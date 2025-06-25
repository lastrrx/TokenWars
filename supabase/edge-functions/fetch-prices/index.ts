import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  console.log('💰 fetch-prices called - CACHE-FIRST implementation');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Parse request body
    const { addresses, forceRefresh } = await req.json();
    
    if (!addresses || !Array.isArray(addresses)) {
      throw new Error('Invalid addresses parameter - must be array');
    }

    console.log(`📊 Fetching prices for ${addresses.length} tokens, forceRefresh=${forceRefresh}`);

    // STEP 1: Try cache first (unless forced refresh)
    if (!forceRefresh) {
      const cacheResult = await getCachedPrices(addresses);
      
      // If we got prices for all requested tokens from cache
      if (cacheResult.success && cacheResult.prices.length === addresses.length) {
        const responseTime = Date.now() - startTime;
        console.log(`✅ Full cache hit! Returned prices for ${cacheResult.prices.length} tokens in ${responseTime}ms`);
        
        // Record cache hit analytics
        await recordPriceAnalytics('fetch-prices', true, responseTime, addresses.length);
        
        return new Response(JSON.stringify({
          success: true,
          prices: cacheResult.prices,
          count: cacheResult.prices.length,
          source: 'cache',
          cache_status: 'FRESH',
          timestamp: new Date().toISOString(),
          response_time_ms: responseTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } else if (cacheResult.success && cacheResult.prices.length > 0) {
        // Partial cache hit - we have some prices but not all
        console.log(`⚠️ Partial cache hit - got ${cacheResult.prices.length}/${addresses.length} prices from cache`);
        
        // Get missing addresses
        const cachedAddresses = new Set(cacheResult.prices.map(p => p.address));
        const missingAddresses = addresses.filter(addr => !cachedAddresses.has(addr));
        
        // Try to fill missing prices from price_history
        const historyResult = await getPricesFromHistory(missingAddresses);
        const allPrices = [...cacheResult.prices, ...historyResult.prices];
        
        const responseTime = Date.now() - startTime;
        console.log(`✅ Mixed sources! Returned ${allPrices.length} prices in ${responseTime}ms`);
        
        // Schedule background update for missing tokens
        if (missingAddresses.length > 0) {
          scheduleBackgroundPriceUpdate(missingAddresses).catch(err => 
            console.warn('Background price update scheduling failed:', err)
          );
        }
        
        return new Response(JSON.stringify({
          success: true,
          prices: allPrices,
          count: allPrices.length,
          source: 'mixed_cache_history',
          cache_status: 'PARTIAL',
          timestamp: new Date().toISOString(),
          response_time_ms: responseTime,
          note: `${cacheResult.prices.length} from cache, ${historyResult.prices.length} from history`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } else {
        console.log('⚠️ Cache miss - no prices in cache');
      }
    }

    // STEP 2: Fallback to price_history table
    const historyResult = await getPricesFromHistory(addresses);
    if (historyResult.success && historyResult.prices.length > 0) {
      const responseTime = Date.now() - startTime;
      console.log(`✅ History fallback! Returned ${historyResult.prices.length} prices in ${responseTime}ms`);
      
      // Record cache miss analytics
      await recordPriceAnalytics('fetch-prices', false, responseTime, addresses.length);
      
      // Schedule background cache update
      scheduleBackgroundPriceUpdate(addresses).catch(err => 
        console.warn('Background update scheduling failed:', err)
      );
      
      return new Response(JSON.stringify({
        success: true,
        prices: historyResult.prices,
        count: historyResult.prices.length,
        source: 'price_history',
        cache_status: 'FALLBACK',
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime,
        note: 'Background cache update scheduled'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // STEP 3: Final fallback to mock/static prices
    console.log('⚠️ No historical data - generating static prices');
    const staticPrices = generateStaticPrices(addresses);
    const responseTime = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      success: true,
      prices: staticPrices,
      count: staticPrices.length,
      source: 'static_fallback',
      cache_status: 'UNAVAILABLE',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      warning: 'Using static data - cache and history unavailable'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ fetch-prices error:', error);
    
    // Error fallback
    return new Response(JSON.stringify({
      success: false,
      prices: [],
      count: 0,
      source: 'error_fallback',
      cache_status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

/**
 * Get prices from cache with freshness validation
 */
async function getCachedPrices(addresses: string[]) {
  try {
    const { data: cachedPrices, error } = await supabase
      .from('price_cache')
      .select('*')
      .in('token_address', addresses)
      .gte('cache_expires_at', new Date().toISOString()) // Only fresh cache
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Price cache query error:', error);
      return { success: false, prices: [] };
    }

    if (!cachedPrices || cachedPrices.length === 0) {
      return { success: false, prices: [] };
    }

    // Get the most recent price for each token
    const latestPrices = new Map();
    cachedPrices.forEach(price => {
      const existing = latestPrices.get(price.token_address);
      if (!existing || new Date(price.timestamp) > new Date(existing.timestamp)) {
        latestPrices.set(price.token_address, price);
      }
    });

    // Transform to expected format
    const prices = Array.from(latestPrices.values()).map(price => ({
      address: price.token_address,
      price: parseFloat(price.price),
      volume: price.volume || 0,
      market_cap: price.market_cap || 0,
      success: true,
      source: price.source,
      confidence: price.confidence_score || 1.0,
      timestamp: price.timestamp,
      cache_expires_at: price.cache_expires_at
    }));

    return { success: true, prices };

  } catch (error) {
    console.error('getCachedPrices error:', error);
    return { success: false, prices: [] };
  }
}

/**
 * Get prices from price_history table (fallback)
 */
async function getPricesFromHistory(addresses: string[]) {
  try {
    // Get latest price for each token from history
    const { data: historyPrices, error } = await supabase
      .from('price_history')
      .select('*')
      .in('token_address', addresses)
      .gte('timestamp', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Price history query error:', error);
      return { success: false, prices: [] };
    }

    if (!historyPrices || historyPrices.length === 0) {
      return { success: false, prices: [] };
    }

    // Get the most recent price for each token
    const latestPrices = new Map();
    historyPrices.forEach(price => {
      const existing = latestPrices.get(price.token_address);
      if (!existing || new Date(price.timestamp) > new Date(existing.timestamp)) {
        latestPrices.set(price.token_address, price);
      }
    });

    // Transform to expected format
    const prices = Array.from(latestPrices.values()).map(price => ({
      address: price.token_address,
      price: parseFloat(price.price),
      volume: price.volume || 0,
      market_cap: price.market_cap || 0,
      success: true,
      source: price.source || 'history',
      confidence: 0.8, // Lower confidence for historical data
      timestamp: price.timestamp
    }));

    return { success: true, prices };

  } catch (error) {
    console.error('getPricesFromHistory error:', error);
    return { success: false, prices: [] };
  }
}

/**
 * Generate static/mock prices for addresses (emergency fallback)
 */
function generateStaticPrices(addresses: string[]) {
  const staticPricesMap = {
    'So11111111111111111111111111111111111111112': { price: 180.50, volume: 2500000000 }, // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { price: 1.00, volume: 1800000000 }, // USDC
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { price: 195.30, volume: 45000000 }, // MSOL
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { price: 1.15, volume: 85000000 }, // JUP
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { price: 0.000023, volume: 125000000 } // BONK
  };

  return addresses.map(address => {
    const staticPrice = staticPricesMap[address];
    
    if (staticPrice) {
      // Add small random variation (±2%)
      const variation = (Math.random() - 0.5) * 0.04;
      const adjustedPrice = staticPrice.price * (1 + variation);
      
      return {
        address,
        price: Math.max(0.000001, adjustedPrice),
        volume: staticPrice.volume,
        market_cap: 0,
        success: true,
        source: 'static',
        confidence: 0.5, // Low confidence for static data
        timestamp: new Date().toISOString()
      };
    } else {
      // Unknown token - generate random price
      return {
        address,
        price: Math.random() * 100, // Random price 0-100
        volume: Math.random() * 1000000,
        market_cap: 0,
        success: true,
        source: 'generated',
        confidence: 0.1, // Very low confidence
        timestamp: new Date().toISOString()
      };
    }
  });
}

/**
 * Schedule background price update (non-blocking)
 */
async function scheduleBackgroundPriceUpdate(addresses: string[]) {
  try {
    const { error } = await supabase
      .from('background_jobs')
      .insert([{
        job_type: 'UPDATE_PRICE_CACHE',
        job_data: { 
          token_addresses: addresses,
          triggered_by: 'cache_miss',
          priority: addresses.length <= 5 ? 'HIGH' : 'NORMAL'
        },
        priority: addresses.length <= 5 ? 'HIGH' : 'NORMAL',
        scheduled_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Failed to schedule background price job:', error);
    } else {
      console.log(`✅ Background price update scheduled for ${addresses.length} tokens`);
    }
  } catch (error) {
    console.error('scheduleBackgroundPriceUpdate error:', error);
  }
}

/**
 * Record price analytics for monitoring
 */
async function recordPriceAnalytics(operation: string, cacheHit: boolean, responseTime: number, tokenCount: number) {
  try {
    const { error } = await supabase
      .from('cache_analytics')
      .upsert([{
        period_start: new Date(Date.now() - 3600000).toISOString(),
        period_end: new Date().toISOString(),
        total_requests: 1,
        cache_hits: cacheHit ? 1 : 0,
        cache_misses: cacheHit ? 0 : 1,
        avg_api_response_time_ms: responseTime,
        tokens_updated: tokenCount
      }], { 
        onConflict: 'period_start,period_end',
        ignoreDuplicates: false 
      });

    if (error) {
      console.warn('Price analytics recording failed:', error);
    }
  } catch (error) {
    console.warn('recordPriceAnalytics error:', error);
  }
}
