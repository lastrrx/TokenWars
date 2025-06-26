// COMPREHENSIVE SOLANA TOKEN SYSTEM
// This includes both the main Edge Function and background scheduler

// =============================================================================
// 1. MAIN EDGE FUNCTION: live-token-fetch/index.ts 
// =============================================================================
// Updated to use UPSERT for continuous cache updates

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
    console.log('🔄 Starting comprehensive Solana token update...');
    const { 
      limit = 50,           // Increased default to 50 tokens per call
      offset = 0,           // Support pagination for large token sets
      forceUpdate = true,   // Always update existing tokens
      batchMode = false     // For background processing
    } = await req.json();
    
    const startTime = Date.now();

    // Step 1: Get comprehensive Solana token list from Jupiter
    console.log('📡 Fetching comprehensive Solana token list...');
    const jupiterResponse = await fetch('https://token.jup.ag/all'); // Use 'all' instead of 'strict' for more tokens
    if (!jupiterResponse.ok) {
      throw new Error(`Jupiter API failed: ${jupiterResponse.status}`);
    }
    const allSolanaTokens = await jupiterResponse.json();
    console.log(`✅ Got ${allSolanaTokens.length} total Solana tokens from Jupiter`);

    // Step 2: Filter and paginate for processing
    const tradableTokens = allSolanaTokens.filter(token => 
      token.symbol && 
      token.address && 
      token.address.length >= 43 && 
      token.address.length <= 44 && 
      !token.symbol.includes('_') && // Skip derivative tokens
      !token.symbol.includes('-') && // Skip wrapped tokens
      token.decimals !== undefined &&
      token.symbol.length <= 10      // Skip tokens with very long symbols
    );
    
    console.log(`🔍 Found ${tradableTokens.length} valid Solana tokens`);
    
    // Apply pagination for batch processing
    const paginatedTokens = tradableTokens.slice(offset, offset + limit);
    console.log(`📄 Processing batch: ${offset + 1}-${offset + paginatedTokens.length} of ${tradableTokens.length}`);

    // Step 3: Get market data from CoinGecko (multiple pages if needed)
    console.log('💰 Fetching comprehensive market data from CoinGecko...');
    const headers = coinGeckoApiKey ? { 'x-cg-demo-api-key': coinGeckoApiKey } : {};
    
    let allMarketData = [];
    // Fetch multiple pages to get more market data
    for (let page = 1; page <= 3; page++) {
      try {
        const marketResponse = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`,
          { headers }
        );
        if (marketResponse.ok) {
          const pageData = await marketResponse.json();
          allMarketData.push(...pageData);
          console.log(`💹 Page ${page}: Got ${pageData.length} tokens`);
        }
        // Small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (pageError) {
        console.log(`⚠️ Page ${page} failed, continuing...`);
      }
    }
    
    console.log(`💹 Total market data: ${allMarketData.length} tokens`);

    // Step 4: Match Solana tokens with market data
    const matchedTokens = [];
    const processedSymbols = new Set();
    const apiCallTime = Date.now();

    for (const solanaToken of paginatedTokens) {
      const symbolKey = solanaToken.symbol.toUpperCase();
      if (processedSymbols.has(symbolKey)) {
        continue; // Skip duplicates
      }

      // Find matching market data (try exact match first, then fuzzy)
      let marketMatch = allMarketData.find(market => 
        market.symbol.toUpperCase() === symbolKey
      );
      
      // If no exact match, try without common prefixes/suffixes
      if (!marketMatch) {
        const cleanSymbol = symbolKey.replace(/SOL$|USD$|BTC$|ETH$/, '');
        marketMatch = allMarketData.find(market => 
          market.symbol.toUpperCase() === cleanSymbol ||
          market.symbol.toUpperCase().startsWith(cleanSymbol)
        );
      }

      // Include tokens with market data OR significant trading activity
      const hasMarketData = marketMatch && marketMatch.market_cap > 1000000; // $1M minimum
      const isSignificantToken = ['SOL', 'USDC', 'USDT', 'BONK', 'JUP', 'RAY', 'ORCA'].includes(symbolKey);
      
      if (hasMarketData || isSignificantToken) {
        const enhancedToken = {
          // ✅ Core token data
          token_address: solanaToken.address,
          symbol: symbolKey,
          name: marketMatch?.name || solanaToken.name || symbolKey,
          logo_uri: marketMatch?.image || solanaToken.logoURI || '',
          
          // ✅ Market data (use defaults if no market match)
          current_price: marketMatch?.current_price || 0,
          market_cap_usd: marketMatch?.market_cap || 0,
          volume_24h: marketMatch?.total_volume || 0,
          price_change_1h: marketMatch?.price_change_percentage_1h || null,
          price_change_24h: marketMatch?.price_change_percentage_24h || 0,
          
          // ✅ Cache metadata
          cache_status: hasMarketData ? 'FRESH' : 'STALE',
          data_source: hasMarketData ? 'COINGECKO' : 'JUPITER',
          cache_created_at: new Date().toISOString(),
          cache_expires_at: new Date(Date.now() + (hasMarketData ? 5 : 60) * 60 * 1000).toISOString(), // 5min for fresh, 1hr for stale
          
          // ✅ Tracking metadata
          last_api_call: new Date().toISOString(),
          api_call_count: 1,
          response_time_ms: Date.now() - apiCallTime,
          data_quality_score: hasMarketData ? 1.0 : 0.5
        };

        matchedTokens.push(enhancedToken);
        processedSymbols.add(symbolKey);
      }
    }

    console.log(`🎯 Matched ${matchedTokens.length} tokens for database update`);

    if (matchedTokens.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        tokens_processed: 0,
        message: 'No new tokens to process in this batch',
        pagination: { offset, limit, total: tradableTokens.length },
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 5: UPSERT tokens (INSERT new, UPDATE existing)
    console.log('🔄 Upserting tokens into cache (insert new, update existing)...');
    let successfulUpserts = 0;
    let upsertErrors = [];

    for (const token of matchedTokens) {
      try {
        // ✅ Use UPSERT to handle both new and existing tokens
        const { data, error } = await supabase
          .from('token_cache')
          .upsert([token], { 
            onConflict: 'token_address',
            ignoreDuplicates: false  // Always update existing records
          });

        if (error) {
          console.error(`❌ Failed to upsert ${token.symbol}:`, error);
          upsertErrors.push({
            symbol: token.symbol,
            error: error.message
          });
        } else {
          console.log(`✅ Successfully upserted ${token.symbol} (${token.cache_status})`);
          successfulUpserts++;
        }
      } catch (upsertError) {
        console.error(`❌ Upsert exception for ${token.symbol}:`, upsertError);
        upsertErrors.push({
          symbol: token.symbol,
          error: upsertError.message
        });
      }
    }

    console.log(`🎉 Successfully upserted ${successfulUpserts}/${matchedTokens.length} tokens`);

    // Step 6: Return comprehensive results
    return new Response(JSON.stringify({
      success: true,
      source: 'comprehensive_solana_tokens',
      tokens_processed: successfulUpserts,
      tokens_attempted: matchedTokens.length,
      successful_upserts: successfulUpserts,
      failed_upserts: upsertErrors.length,
      upsert_errors: upsertErrors.slice(0, 3),
      pagination: {
        offset,
        limit,
        processed: paginatedTokens.length,
        total_available: tradableTokens.length,
        has_more: offset + limit < tradableTokens.length
      },
      market_data_sources: allMarketData.length,
      response_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      sample_results: matchedTokens.slice(0, 5).map(token => ({
        symbol: token.symbol,
        address: token.token_address.substring(0, 8) + '...',
        price: token.current_price,
        market_cap: token.market_cap_usd,
        status: token.cache_status
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Comprehensive token update failed:', error);
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
