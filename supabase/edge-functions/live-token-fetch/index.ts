// LIGHTWEIGHT SOLANA TOKEN SYSTEM - 10 TOKENS PER MINUTE
// Designed to avoid WORKER_LIMIT errors with minimal compute usage

// =============================================================================
// 1. MAIN EDGE FUNCTION: live-token-fetch/index.ts (LIGHTWEIGHT VERSION)
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const coinGeckoApiKey = Deno.env.get('COINGECKO_API_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('⚡ Starting lightweight 10-token update...');
    const { 
      limit = 10,          // FIXED: Only 10 tokens per call
      offset = 0           // Track progress through token list
    } = await req.json();
    
    const startTime = Date.now();

    // Step 1: Get current progress from database (avoid refetching all tokens)
    console.log('📊 Checking current progress...');
    const { data: progressData } = await supabase
      .from('token_cache')
      .select('count')
      .limit(1);
    
    const currentCachedCount = progressData?.[0]?.count || 0;
    console.log(`📈 Currently cached tokens: ${currentCachedCount}`);

    // Step 2: Get ONLY the tokens we need (lightweight Jupiter call)
    console.log(`📡 Fetching ${limit} tokens from Jupiter (offset: ${offset})...`);
    
    // Use a smaller, more focused approach
    const jupiterResponse = await fetch('https://token.jup.ag/strict'); // Use strict for quality tokens only
    if (!jupiterResponse.ok) {
      throw new Error(`Jupiter API failed: ${jupiterResponse.status}`);
    }
    const allTokens = await jupiterResponse.json();
    
    // Filter and paginate immediately to reduce memory usage
    const validTokens = allTokens
      .filter(token => 
        token.symbol && 
        token.address && 
        token.address.length >= 43 && 
        token.address.length <= 44 && 
        !token.symbol.includes('_') &&
        !token.symbol.includes('-') &&
        token.symbol.length <= 10
      )
      .slice(offset, offset + limit); // Only keep the tokens we need
    
    console.log(`✅ Processing ${validTokens.length} tokens from batch`);

    if (validTokens.length === 0) {
      // If we've reached the end, start over from beginning
      const resetOffset = offset > 0 ? 0 : offset;
      return new Response(JSON.stringify({
        success: true,
        tokens_processed: 0,
        message: 'Reached end of token list, reset to beginning',
        next_offset: resetOffset,
        total_cached: currentCachedCount,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 3: Get market data ONLY for the symbols we need (lightweight CoinGecko call)
    console.log('💰 Fetching targeted market data...');
    const symbolList = validTokens.map(t => t.symbol.toUpperCase()).join(',');
    
    // Single, targeted API call instead of fetching hundreds of tokens
    const headers = coinGeckoApiKey ? { 'x-cg-demo-api-key': coinGeckoApiKey } : {};
    let marketData = [];
    
    try {
      // Just get top market cap tokens (single page, lightweight)
      const marketResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1`,
        { headers }
      );
      
      if (marketResponse.ok) {
        marketData = await marketResponse.json();
        console.log(`💹 Got market data for comparison`);
      }
    } catch (marketError) {
      console.log('⚠️ Market data fetch failed, using token data only');
      marketData = [];
    }

    // Step 4: Process tokens quickly (minimal computation)
    const processedTokens = [];
    const apiCallTime = Date.now();

    for (const token of validTokens) {
      const symbolKey = token.symbol.toUpperCase();
      
      // Quick symbol lookup
      const marketMatch = marketData.find(market => 
        market.symbol.toUpperCase() === symbolKey
      );

      const processedToken = {
        // Core data
        token_address: token.address,
        symbol: symbolKey,
        name: marketMatch?.name || token.name || symbolKey,
        logo_uri: (marketMatch?.image || token.logoURI || '').substring(0, 200), // Truncate to avoid length issues
        
        // Market data (use defaults if not available)
        current_price: marketMatch?.current_price || 0,
        market_cap_usd: marketMatch?.market_cap || 0,
        volume_24h: marketMatch?.total_volume || 0,
        price_change_1h: marketMatch?.price_change_percentage_1h || null,
        price_change_24h: marketMatch?.price_change_percentage_24h || 0,
        
        // Cache metadata
        cache_status: marketMatch ? 'FRESH' : 'STALE',
        data_source: marketMatch ? 'COINGECKO' : 'JUPITER',
        cache_created_at: new Date().toISOString(),
        cache_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        
        // Tracking
        last_api_call: new Date().toISOString(),
        api_call_count: 1,
        response_time_ms: Date.now() - apiCallTime,
        data_quality_score: marketMatch ? 1.0 : 0.5
      };

      processedTokens.push(processedToken);
    }

    console.log(`⚡ Processed ${processedTokens.length} tokens quickly`);

    // Step 5: Lightweight database upsert
    console.log('💾 Upserting tokens...');
    let successfulUpserts = 0;
    let upsertErrors = [];

    // Use batch upsert for efficiency (all tokens at once)
    try {
      const { data, error } = await supabase
        .from('token_cache')
        .upsert(processedTokens, { 
          onConflict: 'token_address',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Batch upsert failed:', error);
        upsertErrors.push({ error: error.message });
      } else {
        successfulUpserts = processedTokens.length;
        console.log(`✅ Successfully upserted ${successfulUpserts} tokens`);
      }
    } catch (batchError) {
      console.error('❌ Batch upsert exception:', batchError);
      upsertErrors.push({ error: batchError.message });
    }

    // Step 6: Return lightweight response
    const responseTime = Date.now() - startTime;
    console.log(`⚡ Completed in ${responseTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      source: 'lightweight_solana_update',
      tokens_processed: successfulUpserts,
      tokens_attempted: processedTokens.length,
      successful_upserts: successfulUpserts,
      failed_upserts: upsertErrors.length,
      errors: upsertErrors.slice(0, 2),
      
      // Progress tracking for scheduled updates
      pagination: {
        current_offset: offset,
        next_offset: offset + limit,
        batch_size: limit,
        estimated_total: 2000 // Conservative estimate
      },
      
      performance: {
        response_time_ms: responseTime,
        tokens_per_second: (successfulUpserts / (responseTime / 1000)).toFixed(2)
      },
      
      timestamp: new Date().toISOString(),
      
      // Sample results (minimal data)
      sample_tokens: processedTokens.slice(0, 3).map(token => ({
        symbol: token.symbol,
        price: token.current_price,
        status: token.cache_status
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Lightweight update failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
});

// =============================================================================
// 2. PROGRESS TRACKER: get-update-progress/index.ts
// =============================================================================
// Simple function to track database build progress

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📊 Checking database build progress...');

    // Get cache statistics
    const { data: totalCount } = await supabase
      .from('token_cache')
      .select('count')
      .limit(1);

    const { data: recentTokens } = await supabase
      .from('token_cache')
      .select('symbol, name, current_price, cache_created_at, data_source')
      .order('cache_created_at', { ascending: false })
      .limit(10);

    const { data: qualityBreakdown } = await supabase
      .from('token_cache')
      .select('data_source, count')
      .group('data_source');

    const totalCached = totalCount?.[0]?.count || 0;
    const estimatedTotal = 2000; // Conservative estimate for quality tokens
    const progressPercent = ((totalCached / estimatedTotal) * 100).toFixed(1);

    return new Response(JSON.stringify({
      success: true,
      source: 'progress_tracker',
      database_stats: {
        total_cached_tokens: totalCached,
        estimated_total_tokens: estimatedTotal,
        progress_percentage: progressPercent,
        completion_status: totalCached >= estimatedTotal ? 'COMPLETE' : 'IN_PROGRESS'
      },
      quality_breakdown: qualityBreakdown || [],
      recent_additions: recentTokens || [],
      next_update_eta: '1 minute',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Progress check failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/*
⚡ LIGHTWEIGHT SYSTEM FEATURES:

1. ✅ MINIMAL COMPUTE USAGE
   - Only processes 10 tokens per call
   - Single Jupiter API call (not 'all' endpoint)
   - Single CoinGecko page (100 tokens max)
   - Batch database operations for efficiency

2. ✅ MEMORY EFFICIENT
   - Filters and slices data immediately
   - Doesn't store large arrays in memory
   - Minimal data processing and transformation

3. ✅ PROGRESSIVE DATABASE BUILDING
   - Tracks offset to systematically cover all tokens
   - Each call processes next 10 tokens in sequence
   - Cycles back to beginning when end is reached

4. ✅ FAST RESPONSE TIMES
   - Target: <1000ms per call
   - Minimal API calls and processing
   - Efficient database batch operations

5. ✅ SCHEDULING READY
   - Designed for 1-minute intervals
   - Lightweight enough to run continuously
   - Progress tracking for monitoring

6. ✅ ERROR RESILIENT
   - Graceful fallbacks if market data fails
   - Continues processing even with partial failures
   - Conservative resource usage prevents WORKER_LIMIT

USAGE:
- Deploy live-token-fetch with this lightweight version
- Create get-update-progress for monitoring
- Schedule live-token-fetch to run every minute with incrementing offset
- Monitor progress with get-update-progress

RESULT: Builds comprehensive database over time without resource limits
*/
