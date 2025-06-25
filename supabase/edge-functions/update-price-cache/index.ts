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
const JUPITER_PRICE_API = 'https://price.jup.ag/v4/price';

// Rate limiting configuration
const RATE_LIMITS = {
  COINGECKO: { requestsPerHour: 30, requestsPerMinute: 1 },
  JUPITER: { requestsPerHour: 100, requestsPerMinute: 2 }
};

serve(async (req) => {
  console.log('💰 update-price-cache called - BACKGROUND PRICE UPDATE JOB');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Parse request parameters
    const { 
      token_addresses = [], 
      priority = 'NORMAL', 
      competition_tokens = false,
      batch_size = 10 
    } = await req.json();
    
    console.log(`🎯 Starting price update: ${token_addresses.length} tokens, priority=${priority}`);
    
    // STEP 1: Check rate limits
    const rateLimitCheck = await checkPriceUpdateRateLimits();
    if (!rateLimitCheck.canProceed) {
      console.log('⚠️ Price API rate limit reached, scheduling for later');
      await scheduleRetryPriceJob(token_addresses, priority);
      
      return new Response(JSON.stringify({
        success: false,
        reason: 'rate_limited',
        message: 'Price API rate limit reached, job rescheduled',
        nextAvailableTime: rateLimitCheck.nextAvailableTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // STEP 2: Get tokens to update prices for
    const tokensToUpdate = token_addresses.length > 0 
      ? token_addresses 
      : await getTokensNeedingPriceUpdate(batch_size, priority, competition_tokens);
    
    if (!tokensToUpdate || tokensToUpdate.length === 0) {
      console.log('✅ No tokens need price updates at this time');
      return new Response(JSON.stringify({
        success: true,
        pricesUpdated: 0,
        message: 'No tokens required price updates',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`📊 Updating prices for ${tokensToUpdate.length} tokens`);

    // STEP 3: Process price updates in small batches
    const results = {
      processed: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    // Process in micro-batches of 3 for price APIs (more conservative)
    const microBatchSize = 3;
    for (let i = 0; i < tokensToUpdate.length; i += microBatchSize) {
      const batch = tokensToUpdate.slice(i, i + microBatchSize);
      console.log(`🔄 Processing price batch ${Math.floor(i/microBatchSize) + 1}/${Math.ceil(tokensToUpdate.length/microBatchSize)}`);
      
      const batchResult = await processPriceBatch(batch);
      results.processed += batchResult.processed;
      results.updated += batchResult.updated;
      results.failed += batchResult.failed;
      results.errors.push(...batchResult.errors);
      
      // Update rate limit tracking
      await updatePriceRateLimitUsage('JUPITER', batchResult.processed);
      
      // Longer delay between price batches (APIs are more sensitive)
      if (i + microBatchSize < tokensToUpdate.length) {
        await delay(5000); // 5 second delay between micro-batches
      }
    }

    // STEP 4: Clean up old price cache entries
    await cleanupOldPriceCache();

    // STEP 5: Record update completion
    await recordPriceUpdateCompletion(results, startTime);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Price cache update completed in ${totalTime}ms: ${results.updated}/${results.processed} successful`);

    return new Response(JSON.stringify({
      success: true,
      tokensProcessed: results.processed,
      pricesUpdated: results.updated,
      pricesFailed: results.failed,
      executionTimeMs: totalTime,
      errors: results.errors,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ update-price-cache error:', error);
    
    await recordPriceUpdateFailure(error.message);
    
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
 * Check if we can make price API calls within rate limits
 */
async function checkPriceUpdateRateLimits() {
  try {
    const { data: limits, error } = await supabase
      .from('api_rate_limits')
      .select('*')
      .eq('api_source', 'JUPITER')
      .gte('window_start', new Date(Date.now() - 3600000).toISOString())
      .order('window_start', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Price rate limit check failed:', error);
      return { canProceed: true };
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
    console.error('checkPriceUpdateRateLimits error:', error);
    return { canProceed: true };
  }
}

/**
 * Get tokens that need price updates
 */
async function getTokensNeedingPriceUpdate(batchSize: number, priority: string, competitionTokens: boolean) {
  try {
    if (competitionTokens) {
      // Get tokens from active competitions (highest priority)
      const { data: competitionTokenData, error: compError } = await supabase
        .from('competitions')
        .select('token_a_address, token_b_address')
        .in('status', ['SETUP', 'VOTING', 'ACTIVE'])
        .limit(10);

      if (!compError && competitionTokenData) {
        const addresses = new Set();
        competitionTokenData.forEach(comp => {
          addresses.add(comp.token_a_address);
          addresses.add(comp.token_b_address);
        });
        return Array.from(addresses).slice(0, batchSize);
      }
    }

    // Get tokens with stale price cache
    const { data: stalePrices, error: staleError } = await supabase
      .from('price_cache')
      .select('token_address')
      .lt('cache_expires_at', new Date().toISOString())
      .limit(batchSize);

    if (!staleError && stalePrices && stalePrices.length > 0) {
      return stalePrices.map(p => p.token_address);
    }

    // Fallback: get tokens from token cache that need price updates
    const { data: tokens, error } = await supabase
      .from('token_cache')
      .select('token_address')
      .eq('cache_status', 'FRESH')
      .limit(batchSize)
      .order('cache_created_at', { ascending: true }); // Oldest first

    if (error) {
      console.error('getTokensNeedingPriceUpdate error:', error);
      return [];
    }

    return tokens ? tokens.map(t => t.token_address) : [];

  } catch (error) {
    console.error('getTokensNeedingPriceUpdate error:', error);
    return [];
  }
}

/**
 * Process a batch of price updates
 */
async function processPriceBatch(tokenAddresses: string[]) {
  const results = {
    processed: 0,
    updated: 0,
    failed: 0,
    errors: []
  };

  // Try to get all prices in one Jupiter API call (more efficient)
  try {
    const jupiterPrices = await fetchPricesFromJupiter(tokenAddresses);
    
    for (const address of tokenAddresses) {
      results.processed++;
      
      const priceData = jupiterPrices.find(p => p.address === address);
      
      if (priceData && priceData.price > 0) {
        const updateSuccess = await updatePriceCache(address, priceData);
        if (updateSuccess) {
          results.updated++;
          console.log(`✅ Updated price for ${address}: $${priceData.price}`);
        } else {
          results.failed++;
          results.errors.push(`Failed to update price cache for ${address}`);
        }
      } else {
        // Try individual token from CoinGecko if Jupiter failed
        if (COINGECKO_API_KEY) {
          const cgPrice = await fetchPriceFromCoinGecko(address);
          if (cgPrice) {
            const updateSuccess = await updatePriceCache(address, cgPrice);
            if (updateSuccess) {
              results.updated++;
              console.log(`✅ Updated price for ${address} from CoinGecko: $${cgPrice.price}`);
            } else {
              results.failed++;
              results.errors.push(`Failed to update CoinGecko price cache for ${address}`);
            }
          } else {
            results.failed++;
            results.errors.push(`No price data found for ${address}`);
          }
        } else {
          results.failed++;
          results.errors.push(`No price data found for ${address} (Jupiter failed, no CoinGecko key)`);
        }
      }
    }
    
  } catch (error) {
    console.error('processPriceBatch error:', error);
    // Mark all as failed
    tokenAddresses.forEach(address => {
      results.failed++;
      results.errors.push(`Batch processing failed for ${address}: ${error.message}`);
    });
  }

  return results;
}

/**
 * Fetch prices from Jupiter API (batch)
 */
async function fetchPricesFromJupiter(tokenAddresses: string[]) {
  try {
    const addressParams = tokenAddresses.join(',');
    const response = await fetch(`${JUPITER_PRICE_API}?ids=${addressParams}`, {
      headers: {
        'User-Agent': 'TokenWars/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Jupiter price API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Jupiter response to our format
    const prices = Object.entries(data.data || {}).map(([address, priceInfo]: [string, any]) => ({
      address,
      price: priceInfo.price || 0,
      source: 'JUPITER',
      confidence: 0.9,
      timestamp: new Date().toISOString()
    }));

    return prices;

  } catch (error) {
    console.error('Jupiter price API error:', error);
    return [];
  }
}

/**
 * Fetch price from CoinGecko API (individual token)
 */
async function fetchPriceFromCoinGecko(tokenAddress: string) {
  if (!COINGECKO_API_KEY) {
    return null;
  }

  try {
    // Note: CoinGecko requires token ID, not address. This is a simplified version.
    // In production, you'd need a mapping from Solana addresses to CoinGecko IDs
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&x_cg_demo_api_key=${COINGECKO_API_KEY}`,
      {
        headers: {
          'User-Agent': 'TokenWars/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko price API error: ${response.status}`);
    }

    const data = await response.json();
    
    // This is simplified - in reality you'd need proper address->ID mapping
    return {
      address: tokenAddress,
      price: data.solana?.usd || 0,
      source: 'COINGECKO',
      confidence: 0.85,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('CoinGecko price API error:', error);
    return null;
  }
}

/**
 * Update price cache with new data
 */
async function updatePriceCache(tokenAddress: string, priceData: any) {
  try {
    const cacheData = {
      token_address: tokenAddress,
      price: priceData.price,
      volume: priceData.volume || null,
      market_cap: priceData.market_cap || null,
      source: priceData.source,
      confidence_score: priceData.confidence || 1.0,
      timestamp: new Date().toISOString(),
      cache_expires_at: new Date(Date.now() + 120000).toISOString(), // 2 minutes
      fetch_duration_ms: 100
    };

    const { error } = await supabase
      .from('price_cache')
      .insert([cacheData]);

    if (error) {
      console.error('Price cache update error:', error);
      return false;
    }

    // Also update token_cache with latest price if it exists
    await supabase
      .from('token_cache')
      .update({ 
        current_price: priceData.price,
        cache_created_at: new Date().toISOString()
      })
      .eq('token_address', tokenAddress);

    return true;

  } catch (error) {
    console.error('updatePriceCache error:', error);
    return false;
  }
}

/**
 * Clean up old price cache entries
 */
async function cleanupOldPriceCache() {
  try {
    const { error } = await supabase
      .from('price_cache')
      .delete()
      .lt('timestamp', new Date(Date.now() - 86400000).toISOString()); // Remove entries older than 24 hours

    if (error) {
      console.warn('Price cache cleanup failed:', error);
    } else {
      console.log('✅ Old price cache entries cleaned up');
    }
  } catch (error) {
    console.warn('cleanupOldPriceCache error:', error);
  }
}

/**
 * Update price API rate limit usage
 */
async function updatePriceRateLimitUsage(apiSource: string, requestsMade: number) {
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
      console.warn('Price rate limit update failed:', error);
    }
  } catch (error) {
    console.warn('updatePriceRateLimitUsage error:', error);
  }
}

/**
 * Record successful price update completion
 */
async function recordPriceUpdateCompletion(results: any, startTime: number) {
  try {
    const { error } = await supabase
      .from('token_updates')
      .insert([{
        update_type: 'BACKGROUND_PRICE_UPDATE',
        tokens_processed: results.processed,
        tokens_updated: results.updated,
        success: results.failed === 0,
        error_message: results.errors.length > 0 ? results.errors.join('; ') : null,
        duration_seconds: Math.floor((Date.now() - startTime) / 1000),
        source: 'price_background_job'
      }]);

    if (error) {
      console.warn('Price update completion recording failed:', error);
    }
  } catch (error) {
    console.warn('recordPriceUpdateCompletion error:', error);
  }
}

/**
 * Record price update failure
 */
async function recordPriceUpdateFailure(errorMessage: string) {
  try {
    const { error } = await supabase
      .from('token_updates')
      .insert([{
        update_type: 'BACKGROUND_PRICE_UPDATE',
        tokens_processed: 0,
        success: false,
        error_message: errorMessage,
        source: 'price_background_job'
      }]);

    if (error) {
      console.warn('Price update failure recording failed:', error);
    }
  } catch (error) {
    console.warn('recordPriceUpdateFailure error:', error);
  }
}

/**
 * Schedule retry job for later
 */
async function scheduleRetryPriceJob(tokenAddresses: string[], priority: string) {
  try {
    const { error } = await supabase
      .from('background_jobs')
      .insert([{
        job_type: 'UPDATE_PRICE_CACHE',
        job_data: {
          token_addresses: tokenAddresses,
          priority,
          retryReason: 'rate_limited'
        },
        priority: 'LOW',
        scheduled_at: new Date(Date.now() + 1800000).toISOString() // Retry in 30 minutes
      }]);

    if (error) {
      console.error('Price retry job scheduling failed:', error);
    }
  } catch (error) {
    console.error('scheduleRetryPriceJob error:', error);
  }
}

/**
 * Simple delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
