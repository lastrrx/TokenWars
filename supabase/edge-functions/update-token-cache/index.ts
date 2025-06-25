import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// API Configuration
const COINGECKO_API_KEY = Deno.env.get('COINGECKO_API_KEY') || '';
const JUPITER_API_BASE = 'https://token.jup.ag';

// Rate limiting configuration
const RATE_LIMITS = {
  COINGECKO: { requestsPerHour: 30, requestsPerMinute: 1 },
  JUPITER: { requestsPerHour: 100, requestsPerMinute: 2 }
};

serve(async (req) => {
  console.log('🔄 update-token-cache called - BACKGROUND UPDATE JOB');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Parse request parameters
    const { batchSize = 10, priority = 'NORMAL', specific_tokens = null } = await req.json();
    
    console.log(`🎯 Starting token cache update: batchSize=${batchSize}, priority=${priority}`);
    
    // STEP 1: Check rate limits before proceeding
    const rateLimitCheck = await checkRateLimits();
    if (!rateLimitCheck.canProceed) {
      console.log('⚠️ Rate limit reached, scheduling for later');
      await scheduleRetryJob(batchSize, priority, specific_tokens);
      
      return new Response(JSON.stringify({
        success: false,
        reason: 'rate_limited',
        message: 'Rate limit reached, job rescheduled',
        nextAvailableTime: rateLimitCheck.nextAvailableTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // STEP 2: Get tokens to update
    const tokensToUpdate = specific_tokens || await getTokensToUpdate(batchSize, priority);
    
    if (!tokensToUpdate || tokensToUpdate.length === 0) {
      console.log('✅ No tokens need updating at this time');
      return new Response(JSON.stringify({
        success: true,
        tokensProcessed: 0,
        message: 'No tokens required updating',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`📊 Updating ${tokensToUpdate.length} tokens`);

    // STEP 3: Process tokens in small batches to avoid timeouts
    const results = {
      processed: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    // Process in micro-batches of 5 to be extra safe
    const microBatchSize = 5;
    for (let i = 0; i < tokensToUpdate.length; i += microBatchSize) {
      const batch = tokensToUpdate.slice(i, i + microBatchSize);
      console.log(`🔄 Processing micro-batch ${Math.floor(i/microBatchSize) + 1}/${Math.ceil(tokensToUpdate.length/microBatchSize)}`);
      
      const batchResult = await procesTokenBatch(batch);
      results.processed += batchResult.processed;
      results.updated += batchResult.updated;
      results.failed += batchResult.failed;
      results.errors.push(...batchResult.errors);
      
      // Update rate limit tracking
      await updateRateLimitUsage('COINGECKO', batchResult.processed);
      
      // Small delay between batches to be respectful
      if (i + microBatchSize < tokensToUpdate.length) {
        await delay(2000); // 2 second delay between micro-batches
      }
    }

    // STEP 4: Record update completion
    await recordUpdateCompletion(results, startTime);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Token cache update completed in ${totalTime}ms: ${results.updated}/${results.processed} successful`);

    return new Response(JSON.stringify({
      success: true,
      tokensProcessed: results.processed,
      tokensUpdated: results.updated,
      tokensFailed: results.failed,
      executionTimeMs: totalTime,
      errors: results.errors,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ update-token-cache error:', error);
    
    // Record failure
    await recordUpdateFailure(error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

/**
 * Check if we can make API calls within rate limits
 */
async function checkRateLimits() {
  try {
    const { data: limits, error } = await supabase
      .from('api_rate_limits')
      .select('*')
      .eq('api_source', 'COINGECKO')
      .gte('window_start', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('window_start', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Rate limit check failed:', error);
      return { canProceed: true }; // Proceed if we can't check
    }

    if (!limits || limits.length === 0) {
      return { canProceed: true };
    }

    const currentLimit = limits[0];
    const canProceed = currentLimit.requests_made < currentLimit.requests_limit && !currentLimit.is_limited;
    
    return {
      canProceed,
      currentUsage: currentLimit.requests_made,
      limit: currentLimit.requests_limit,
      nextAvailableTime: currentLimit.limit_expires_at || new Date(Date.now() + 300000).toISOString()
    };

  } catch (error) {
    console.error('checkRateLimits error:', error);
    return { canProceed: true }; // Default to allowing requests
  }
}

/**
 * Get tokens that need cache updates
 */
async function getTokensToUpdate(batchSize: number, priority: string) {
  try {
    let query = supabase
      .from('tokens')
      .select('address, symbol, name')
      .eq('is_active', true);

    // Prioritize tokens without recent cache
    if (priority === 'HIGH') {
      // Get tokens with stale or no cache
      const { data: staleCacheTokens, error: staleError } = await supabase
        .from('token_cache')
        .select('token_address')
        .lt('cache_expires_at', new Date().toISOString());
      
      if (!staleError && staleCacheTokens) {
        const staleAddresses = staleCacheTokens.map(t => t.token_address);
        if (staleAddresses.length > 0) {
          query = query.in('address', staleAddresses);
        }
      }
    }

    query = query.limit(batchSize).order('market_cap', { ascending: false });

    const { data: tokens, error } = await query;

    if (error) {
      console.error('getTokensToUpdate error:', error);
      return [];
    }

    return tokens || [];

  } catch (error) {
    console.error('getTokensToUpdate error:', error);
    return [];
  }
}

/**
 * Process a batch of tokens
 */
async function procesTokenBatch(tokens: any[]) {
  const results = {
    processed: 0,
    updated: 0,
    failed: 0,
    errors: []
  };

  for (const token of tokens) {
    try {
      results.processed++;
      
      // Try Jupiter first (more reliable, higher rate limit)
      let tokenData = await fetchTokenFromJupiter(token.address);
      
      // If Jupiter fails and we have CoinGecko API key, try CoinGecko
      if (!tokenData && COINGECKO_API_KEY) {
        tokenData = await fetchTokenFromCoinGecko(token.symbol);
      }
      
      if (tokenData) {
        // Update token cache
        const updateSuccess = await updateTokenCache(token.address, tokenData);
        if (updateSuccess) {
          results.updated++;
          console.log(`✅ Updated cache for ${token.symbol}`);
        } else {
          results.failed++;
          results.errors.push(`Failed to update cache for ${token.symbol}`);
        }
      } else {
        results.failed++;
        results.errors.push(`No data found for ${token.symbol}`);
      }
      
    } catch (error) {
      results.failed++;
      results.errors.push(`Error processing ${token.symbol}: ${error.message}`);
      console.error(`❌ Error processing ${token.symbol}:`, error);
    }
  }

  return results;
}

/**
 * Fetch token data from Jupiter API
 */
async function fetchTokenFromJupiter(tokenAddress: string) {
  try {
    const response = await fetch(`${JUPITER_API_BASE}/all`, {
      headers: {
        'User-Agent': 'TokenWars/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }

    const allTokens = await response.json();
    const token = allTokens.find((t: any) => t.address === tokenAddress);
    
    if (!token) {
      return null;
    }

    // Jupiter doesn't provide price/market cap, so we'll get basic info only
    return {
      symbol: token.symbol,
      name: token.name,
      logo_uri: token.logoURI,
      decimals: token.decimals,
      source: 'JUPITER'
    };

  } catch (error) {
    console.error('Jupiter API error:', error);
    return null;
  }
}

/**
 * Fetch token data from CoinGecko API (if API key available)
 */
async function fetchTokenFromCoinGecko(symbol: string) {
  if (!COINGECKO_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${symbol}&x_cg_demo_api_key=${COINGECKO_API_KEY}`,
      {
        headers: {
          'User-Agent': 'TokenWars/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }

    const token = data[0];
    return {
      symbol: token.symbol.toUpperCase(),
      name: token.name,
      logo_uri: token.image,
      current_price: token.current_price,
      market_cap_usd: token.market_cap,
      volume_24h: token.total_volume,
      price_change_24h: token.price_change_percentage_24h,
      source: 'COINGECKO'
    };

  } catch (error) {
    console.error('CoinGecko API error:', error);
    return null;
  }
}

/**
 * Update token cache with new data
 */
async function updateTokenCache(tokenAddress: string, tokenData: any) {
  try {
    const cacheData = {
      token_address: tokenAddress,
      symbol: tokenData.symbol,
      name: tokenData.name,
      logo_uri: tokenData.logo_uri,
      current_price: tokenData.current_price || null,
      market_cap_usd: tokenData.market_cap_usd || null,
      volume_24h: tokenData.volume_24h || null,
      price_change_24h: tokenData.price_change_24h || null,
      cache_status: 'FRESH',
      data_source: tokenData.source,
      cache_created_at: new Date().toISOString(),
      cache_expires_at: new Date(Date.now() + 300000).toISOString(), // 5 minutes
      response_time_ms: 100, // Approximate
      data_quality_score: tokenData.current_price ? 1.0 : 0.5
    };

    const { error } = await supabase
      .from('token_cache')
      .upsert([cacheData], { 
        onConflict: 'token_address'
      });

    if (error) {
      console.error('Token cache update error:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('updateTokenCache error:', error);
    return false;
  }
}

/**
 * Update rate limit usage tracking
 */
async function updateRateLimitUsage(apiSource: string, requestsMade: number) {
  try {
    const { error } = await supabase
      .from('api_rate_limits')
      .upsert([{
        api_source: apiSource,
        requests_made: requestsMade,
        requests_limit: RATE_LIMITS[apiSource].requestsPerHour,
        window_start: new Date().toISOString(),
        window_duration_minutes: 60
      }], {
        onConflict: 'api_source,window_start'
      });

    if (error) {
      console.warn('Rate limit update failed:', error);
    }
  } catch (error) {
    console.warn('updateRateLimitUsage error:', error);
  }
}

/**
 * Record successful update completion
 */
async function recordUpdateCompletion(results: any, startTime: number) {
  try {
    const { error } = await supabase
      .from('token_updates')
      .insert([{
        update_type: 'BACKGROUND_CACHE_UPDATE',
        tokens_processed: results.processed,
        tokens_updated: results.updated,
        success: results.failed === 0,
        error_message: results.errors.length > 0 ? results.errors.join('; ') : null,
        duration_seconds: Math.floor((Date.now() - startTime) / 1000),
        source: 'background_job'
      }]);

    if (error) {
      console.warn('Update completion recording failed:', error);
    }
  } catch (error) {
    console.warn('recordUpdateCompletion error:', error);
  }
}

/**
 * Record update failure
 */
async function recordUpdateFailure(errorMessage: string) {
  try {
    const { error } = await supabase
      .from('token_updates')
      .insert([{
        update_type: 'BACKGROUND_CACHE_UPDATE',
        tokens_processed: 0,
        success: false,
        error_message: errorMessage,
        source: 'background_job'
      }]);

    if (error) {
      console.warn('Update failure recording failed:', error);
    }
  } catch (error) {
    console.warn('recordUpdateFailure error:', error);
  }
}

/**
 * Schedule retry job for later
 */
async function scheduleRetryJob(batchSize: number, priority: string, specificTokens: any) {
  try {
    const { error } = await supabase
      .from('background_jobs')
      .insert([{
        job_type: 'UPDATE_TOKEN_CACHE',
        job_data: {
          batchSize,
          priority,
          specific_tokens: specificTokens,
          retryReason: 'rate_limited'
        },
        priority: 'LOW',
        scheduled_at: new Date(Date.now() + 3600000).toISOString() // Retry in 1 hour
      }]);

    if (error) {
      console.error('Retry job scheduling failed:', error);
    }
  } catch (error) {
    console.error('scheduleRetryJob error:', error);
  }
}

/**
 * Simple delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
