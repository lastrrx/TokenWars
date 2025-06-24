// Supabase Edge Function: fetch-prices
// Handles real-time price fetching, TWAP calculations, and price history management
// Supports: Multiple price sources, outlier detection, TWAP windows, competition pricing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface PriceSource {
  name: string;
  price: number;
  volume24h?: number;
  timestamp: number;
  confidence: number; // 0-1 scale
}

interface TokenPrice {
  address: string;
  symbol: string;
  price_usd: number;
  price_sources: PriceSource[];
  volume_24h: number;
  market_cap: number;
  price_change_1h: number;
  price_change_24h: number;
  confidence_score: number;
  last_updated: number;
}

interface PriceHistoryEntry {
  token_address: string;
  price_usd: number;
  volume_24h: number;
  market_cap: number;
  data_source: string;
  confidence_score: number;
  timestamp: number;
  block_height?: number;
}

interface TWAPCalculation {
  token_address: string;
  start_timestamp: number;
  end_timestamp: number;
  twap_price: number;
  data_points: number;
  confidence_score: number;
  calculation_method: string;
}

class PriceService {
  private coingeckoApiKey: string;
  private supabase: any;
  private readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
  private readonly JUPITER_PRICE_API = 'https://price.jup.ag/v4/price';
  
  // Price validation constants
  private readonly MAX_PRICE_DEVIATION = 0.15; // 15% max deviation between sources
  private readonly MIN_CONFIDENCE_SCORE = 0.6;
  private readonly OUTLIER_THRESHOLD = 2; // Standard deviations
  private readonly MAX_AGE_MINUTES = 5; // Max age for price data
  
  constructor(coingeckoApiKey: string, supabaseUrl: string, supabaseKey: string) {
    this.coingeckoApiKey = coingeckoApiKey;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Fetch prices from CoinGecko
   */
  async fetchCoinGeckoPrices(tokenAddresses: string[]): Promise<Map<string, PriceSource>> {
    const priceMap = new Map<string, PriceSource>();
    
    try {
      // First, get the mapping of Solana addresses to CoinGecko IDs
      const { data: tokens } = await this.supabase
        .from('tokens')
        .select('address, coingecko_id')
        .in('address', tokenAddresses)
        .not('coingecko_id', 'is', null);
      
      if (!tokens || tokens.length === 0) {
        console.log('No tokens found with CoinGecko IDs');
        return priceMap;
      }
      
      const coingeckoIds = tokens.map(t => t.coingecko_id).filter(Boolean);
      const addressToIdMap = new Map(tokens.map(t => [t.address, t.coingecko_id]));
      
      // Fetch prices from CoinGecko
      const idsParam = coingeckoIds.join(',');
      const response = await fetch(
        `${this.COINGECKO_BASE_URL}/simple/price?ids=${idsParam}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`,
        {
          headers: {
            'X-CG-Demo-API-Key': this.coingeckoApiKey,
            'accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('CoinGecko rate limit exceeded');
        }
        throw new Error(`CoinGecko price API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Map prices back to Solana addresses
      for (const [address, coingeckoId] of addressToIdMap) {
        const priceData = data[coingeckoId];
        if (priceData && priceData.usd) {
          priceMap.set(address, {
            name: 'coingecko',
            price: priceData.usd,
            volume24h: priceData.usd_24h_vol || 0,
            timestamp: (priceData.last_updated_at || Date.now() / 1000) * 1000,
            confidence: 0.9 // High confidence for CoinGecko
          });
        }
      }
      
      console.log(`Fetched ${priceMap.size} prices from CoinGecko`);
      return priceMap;
      
    } catch (error) {
      console.error('Error fetching CoinGecko prices:', error);
      return priceMap;
    }
  }

  /**
   * Fetch prices from Jupiter
   */
  async fetchJupiterPrices(tokenAddresses: string[]): Promise<Map<string, PriceSource>> {
    const priceMap = new Map<string, PriceSource>();
    
    try {
      // Jupiter API supports multiple tokens in one request
      const idsParam = tokenAddresses.join(',');
      const response = await fetch(`${this.JUPITER_PRICE_API}?ids=${idsParam}`);
      
      if (!response.ok) {
        throw new Error(`Jupiter price API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      for (const [address, priceData] of Object.entries(data.data || {})) {
        if (priceData && typeof priceData === 'object' && 'price' in priceData) {
          priceMap.set(address, {
            name: 'jupiter',
            price: parseFloat(priceData.price),
            timestamp: Date.now(),
            confidence: 0.8 // Good confidence for Jupiter
          });
        }
      }
      
      console.log(`Fetched ${priceMap.size} prices from Jupiter`);
      return priceMap;
      
    } catch (error) {
      console.error('Error fetching Jupiter prices:', error);
      return priceMap;
    }
  }

  /**
   * Detect price outliers using statistical methods
   */
  private detectOutliers(prices: number[]): boolean[] {
    if (prices.length < 3) return prices.map(() => false);
    
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    return prices.map(price => Math.abs(price - mean) > this.OUTLIER_THRESHOLD * stdDev);
  }

  /**
   * Calculate weighted average price from multiple sources
   */
  private calculateWeightedPrice(sources: PriceSource[]): { price: number; confidence: number } {
    if (sources.length === 0) return { price: 0, confidence: 0 };
    
    // Remove outliers
    const prices = sources.map(s => s.price);
    const outliers = this.detectOutliers(prices);
    const validSources = sources.filter((_, index) => !outliers[index]);
    
    if (validSources.length === 0) {
      // If all are outliers, use the median
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
      return { price: medianPrice, confidence: 0.3 };
    }
    
    // Calculate weighted average based on confidence scores
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const source of validSources) {
      const weight = source.confidence;
      weightedSum += source.price * weight;
      totalWeight += weight;
    }
    
    const weightedPrice = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const confidence = Math.min(totalWeight / validSources.length, 1);
    
    return { price: weightedPrice, confidence };
  }

  /**
   * Aggregate prices from multiple sources
   */
  async aggregatePrices(tokenAddresses: string[]): Promise<TokenPrice[]> {
    console.log(`Aggregating prices for ${tokenAddresses.length} tokens...`);
    
    // Fetch from multiple sources in parallel
    const [coingeckoMap, jupiterMap] = await Promise.all([
      this.fetchCoinGeckoPrices(tokenAddresses),
      this.fetchJupiterPrices(tokenAddresses)
    ]);
    
    const aggregatedPrices: TokenPrice[] = [];
    
    for (const address of tokenAddresses) {
      const sources: PriceSource[] = [];
      
      // Collect all price sources for this token
      if (coingeckoMap.has(address)) {
        sources.push(coingeckoMap.get(address)!);
      }
      
      if (jupiterMap.has(address)) {
        sources.push(jupiterMap.get(address)!);
      }
      
      if (sources.length === 0) {
        console.warn(`No price data found for token ${address}`);
        continue;
      }
      
      // Calculate aggregated price
      const { price, confidence } = this.calculateWeightedPrice(sources);
      
      if (confidence < this.MIN_CONFIDENCE_SCORE) {
        console.warn(`Low confidence score (${confidence}) for token ${address}, skipping`);
        continue;
      }
      
      // Get token metadata
      const { data: tokenData } = await this.supabase
        .from('tokens')
        .select('symbol, market_cap_usd')
        .eq('address', address)
        .single();
      
      // Calculate market cap and volume
      const coingeckoSource = sources.find(s => s.name === 'coingecko');
      const volume24h = coingeckoSource?.volume24h || 0;
      const marketCap = tokenData?.market_cap_usd || 0;
      
      // Create token price object
      const tokenPrice: TokenPrice = {
        address,
        symbol: tokenData?.symbol || 'UNKNOWN',
        price_usd: price,
        price_sources: sources,
        volume_24h: volume24h,
        market_cap: marketCap,
        price_change_1h: 0, // Would need 1h historical data
        price_change_24h: 0, // Calculate from historical data
        confidence_score: confidence,
        last_updated: Date.now()
      };
      
      aggregatedPrices.push(tokenPrice);
    }
    
    console.log(`Successfully aggregated prices for ${aggregatedPrices.length} tokens`);
    return aggregatedPrices;
  }

  /**
   * Save price history to database
   */
  async savePriceHistory(prices: TokenPrice[]): Promise<void> {
    const historyEntries: PriceHistoryEntry[] = [];
    
    for (const tokenPrice of prices) {
      // Create entries for each price source
      for (const source of tokenPrice.price_sources) {
        historyEntries.push({
          token_address: tokenPrice.address,
          price_usd: source.price,
          volume_24h: source.volume24h || 0,
          market_cap: tokenPrice.market_cap,
          data_source: source.name,
          confidence_score: source.confidence,
          timestamp: source.timestamp
        });
      }
      
      // Also create aggregated entry
      historyEntries.push({
        token_address: tokenPrice.address,
        price_usd: tokenPrice.price_usd,
        volume_24h: tokenPrice.volume_24h,
        market_cap: tokenPrice.market_cap,
        data_source: 'aggregated',
        confidence_score: tokenPrice.confidence_score,
        timestamp: tokenPrice.last_updated
      });
    }
    
    // Batch insert price history
    const { error } = await this.supabase
      .from('price_history')
      .insert(historyEntries);
    
    if (error) {
      throw new Error(`Failed to save price history: ${error.message}`);
    }
    
    console.log(`Saved ${historyEntries.length} price history entries`);
  }

  /**
   * Calculate TWAP for a specific time window
   */
  async calculateTWAP(tokenAddress: string, startTimestamp: number, endTimestamp: number): Promise<TWAPCalculation | null> {
    try {
      // Fetch price data for the time window
      const { data: priceData, error } = await this.supabase
        .from('price_history')
        .select('price_usd, volume_24h, timestamp, confidence_score')
        .eq('token_address', tokenAddress)
        .eq('data_source', 'aggregated')
        .gte('timestamp', startTimestamp)
        .lte('timestamp', endTimestamp)
        .order('timestamp', { ascending: true });
      
      if (error || !priceData || priceData.length === 0) {
        console.warn(`No price data found for TWAP calculation: ${tokenAddress}`);
        return null;
      }
      
      // Calculate time-weighted average
      let totalWeightedPrice = 0;
      let totalWeight = 0;
      let totalConfidence = 0;
      
      for (let i = 0; i < priceData.length; i++) {
        const entry = priceData[i];
        
        // Calculate time weight (time until next data point, or remaining time for last point)
        let timeWeight: number;
        if (i < priceData.length - 1) {
          timeWeight = priceData[i + 1].timestamp - entry.timestamp;
        } else {
          timeWeight = endTimestamp - entry.timestamp;
        }
        
        // Weight by time and confidence
        const effectiveWeight = timeWeight * entry.confidence_score;
        
        totalWeightedPrice += entry.price_usd * effectiveWeight;
        totalWeight += effectiveWeight;
        totalConfidence += entry.confidence_score;
      }
      
      if (totalWeight === 0) {
        console.warn(`Zero total weight for TWAP calculation: ${tokenAddress}`);
        return null;
      }
      
      const twapPrice = totalWeightedPrice / totalWeight;
      const avgConfidence = totalConfidence / priceData.length;
      
      return {
        token_address: tokenAddress,
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
        twap_price: twapPrice,
        data_points: priceData.length,
        confidence_score: avgConfidence,
        calculation_method: 'time_weighted_confidence'
      };
      
    } catch (error) {
      console.error(`Error calculating TWAP for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Get active token addresses that need price updates
   */
  async getActiveTokenAddresses(): Promise<string[]> {
    try {
      // Get tokens that are either in active competitions or recently used
      const { data: activeTokens, error } = await this.supabase
        .from('tokens')
        .select('address')
        .eq('is_active', true)
        .order('market_cap_usd', { ascending: false })
        .limit(100); // Limit to top 100 tokens by market cap
      
      if (error) {
        throw new Error(`Failed to fetch active tokens: ${error.message}`);
      }
      
      return (activeTokens || []).map(token => token.address);
      
    } catch (error) {
      console.error('Error getting active token addresses:', error);
      return [];
    }
  }

  /**
   * Clean up old price history data
   */
  async cleanupOldPriceData(): Promise<void> {
    try {
      // Keep price data for 30 days
      const cutoffTimestamp = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      const { error } = await this.supabase
        .from('price_history')
        .delete()
        .lt('timestamp', cutoffTimestamp);
      
      if (error) {
        console.warn('Error cleaning up old price data:', error.message);
      } else {
        console.log('Successfully cleaned up old price data');
      }
    } catch (error) {
      console.warn('Error during price data cleanup:', error);
    }
  }

  /**
   * Main execution function
   */
  async execute(options: { 
    tokenAddresses?: string[];
    calculateTWAP?: boolean;
    twapWindows?: Array<{ tokenAddress: string; startTimestamp: number; endTimestamp: number }>;
    cleanup?: boolean;
  } = {}): Promise<{ success: boolean; pricesUpdated: number; twapCalculations?: number; message: string }> {
    try {
      console.log('Starting price service execution...');
      
      let tokenAddresses = options.tokenAddresses;
      
      // If no specific tokens provided, get active tokens
      if (!tokenAddresses || tokenAddresses.length === 0) {
        tokenAddresses = await this.getActiveTokenAddresses();
      }
      
      if (tokenAddresses.length === 0) {
        return {
          success: true,
          pricesUpdated: 0,
          message: 'No active tokens found for price updates'
        };
      }
      
      // Aggregate prices from multiple sources
      const aggregatedPrices = await this.aggregatePrices(tokenAddresses);
      
      // Save price history
      if (aggregatedPrices.length > 0) {
        await this.savePriceHistory(aggregatedPrices);
      }
      
      let twapCalculations = 0;
      
      // Calculate TWAP if requested
      if (options.calculateTWAP && options.twapWindows) {
        for (const window of options.twapWindows) {
          const twapResult = await this.calculateTWAP(
            window.tokenAddress,
            window.startTimestamp,
            window.endTimestamp
          );
          
          if (twapResult) {
            // Save TWAP calculation (you might want to create a separate table for this)
            console.log(`TWAP for ${window.tokenAddress}: ${twapResult.twap_price}`);
            twapCalculations++;
          }
        }
      }
      
      // Clean up old data if requested
      if (options.cleanup) {
        await this.cleanupOldPriceData();
      }
      
      return {
        success: true,
        pricesUpdated: aggregatedPrices.length,
        twapCalculations,
        message: `Successfully updated prices for ${aggregatedPrices.length} tokens${twapCalculations > 0 ? ` and calculated ${twapCalculations} TWAP values` : ''}`
      };
      
    } catch (error) {
      console.error('Price service execution failed:', error);
      return {
        success: false,
        pricesUpdated: 0,
        message: `Price service failed: ${error.message}`
      };
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const coingeckoApiKey = Deno.env.get('COINGECKO_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!coingeckoApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Parse request options
    let options = {};
    if (req.method === 'POST') {
      try {
        options = await req.json();
      } catch {
        // Use defaults if JSON parsing fails
      }
    }

    // Initialize price service and execute
    const priceService = new PriceService(coingeckoApiKey, supabaseUrl, supabaseServiceKey);
    const result = await priceService.execute(options);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        pricesUpdated: 0,
        message: `Edge function error: ${error.message}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
