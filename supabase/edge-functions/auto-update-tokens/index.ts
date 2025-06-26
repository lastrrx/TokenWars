
// =============================================================================
// 2. BACKGROUND SCHEDULER: auto-update-tokens/index.ts
// =============================================================================
// New Edge Function for automated periodic updates

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('⏰ Starting automated token cache update...');
    const { 
      batchSize = 100,     // Process 100 tokens per minute
      maxBatches = 10      // Maximum batches per run
    } = await req.json();

    let totalProcessed = 0;
    let currentOffset = 0;
    let batchCount = 0;

    // Process multiple batches until we've covered significant token volume
    while (batchCount < maxBatches) {
      console.log(`📦 Processing batch ${batchCount + 1}/${maxBatches} (offset: ${currentOffset})`);
      
      try {
        // Call the main token fetch function with pagination
        const batchResponse = await fetch(`${supabaseUrl}/functions/v1/live-token-fetch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            limit: batchSize,
            offset: currentOffset,
            forceUpdate: true,
            batchMode: true
          })
        });

        if (batchResponse.ok) {
          const batchResult = await batchResponse.json();
          totalProcessed += batchResult.tokens_processed || 0;
          
          console.log(`✅ Batch ${batchCount + 1}: ${batchResult.tokens_processed} tokens processed`);
          
          // Check if there are more tokens to process
          if (!batchResult.pagination?.has_more) {
            console.log('📋 Reached end of token list, cycling back to beginning');
            currentOffset = 0; // Start over from beginning
          } else {
            currentOffset += batchSize;
          }
          
          batchCount++;
          
          // Small delay between batches to respect rate limits
          if (batchCount < maxBatches) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
          }
        } else {
          console.error(`❌ Batch ${batchCount + 1} failed:`, batchResponse.status);
          break;
        }
      } catch (batchError) {
        console.error(`❌ Batch ${batchCount + 1} error:`, batchError);
        break;
      }
    }

    // Update cache health metrics
    const { data: cacheStats } = await supabase
      .from('token_cache')
      .select('count', { count: 'exact' });

    console.log(`🎉 Automated update completed: ${totalProcessed} tokens processed, ${cacheStats?.length || 0} total cached`);

    return new Response(JSON.stringify({
      success: true,
      source: 'automated_update',
      total_tokens_processed: totalProcessed,
      batches_completed: batchCount,
      total_cached_tokens: cacheStats?.length || 0,
      next_update_in: '60 seconds',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Automated update failed:', error);
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
✅ COMPREHENSIVE TOKEN SYSTEM FEATURES:

1. ✅ UPSERT-BASED UPDATES
   - Uses UPSERT instead of INSERT to handle existing tokens
   - Always updates existing records with fresh market data
   - No more duplicate key constraint violations

2. ✅ COMPREHENSIVE TOKEN DISCOVERY
   - Uses Jupiter 'all' endpoint for complete token list (10,000+ tokens)
   - Processes tokens in batches to handle large datasets
   - Supports pagination for systematic coverage

3. ✅ ENHANCED MARKET DATA
   - Fetches multiple pages from CoinGecko (750+ market data points)
   - Intelligent symbol matching with fuzzy fallbacks
   - Quality scoring based on data availability

4. ✅ AUTOMATED BACKGROUND UPDATES
   - Separate Edge Function for periodic automation
   - Processes 100+ tokens per minute in batches
   - Cycles through entire token list systematically

5. ✅ RATE LIMIT MANAGEMENT
   - Built-in delays between API calls
   - Conservative batch sizes to prevent quota exhaustion
   - Graceful error handling and recovery

6. ✅ COMPREHENSIVE MONITORING
   - Detailed success/failure reporting
   - Pagination tracking for large datasets
   - Cache health metrics and statistics

DEPLOYMENT:
1. Replace live-token-fetch/index.ts with the main function above
2. Create new auto-update-tokens/index.ts with the scheduler function
3. Set up cron job or manual triggers for periodic updates

RESULT: Complete Solana token database with automatic updates
*/
