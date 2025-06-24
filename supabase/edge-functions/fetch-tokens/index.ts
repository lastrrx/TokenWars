// Supabase Edge Function: fetch-tokens
// Securely fetches token data from CoinGecko API with filtering and validation
// Handles: Market cap filtering, age validation, logo fetching, token metadata

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  atl: number;
  market_cap_change_percentage_24h: number;
  genesis_date: string;
  platforms: Record<string, string>;
}

interface JupiterTokenData {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

interface ProcessedToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo_uri: string;
  price_usd: number;
  market_cap_usd: number;
  market_cap_rank: number;
  price_change_24h: number;
  circulating_supply: number;
  total_supply: number;
  created_at_timestamp: number;
  age_days: number;
  coingecko_id: string;
  tags: string[];
  is_verified: boolean;
  liquidity_score: number;
  volume_24h: number;
  holders_count?: number;
}

class TokenFetcher {
  private coingeckoApiKey: string;
  private supabase: any;
  private readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
  private readonly JUPITER_BASE_URL = 'https://token.jup.ag';
  
  // Filter constants
  private readonly MIN_MARKET_CAP = 5_000_000; // $5M
  private readonly MIN_AGE_DAYS = 30; // 30 days
  private readonly MIN_LIQUIDITY_SCORE = 0.3;
  private readonly MAX_TOKENS_PER_REQUEST = 250;
  
  constructor(coingeckoApiKey: string, supabaseUrl: string, supabaseKey: string) {
    this.coingeckoApiKey = coingeckoApiKey;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Fetch tokens from Jupiter API
   */
  async fetchJupiterTokens(): Promise<JupiterTokenData[]> {
    try {
      console.log('Fetching tokens from Jupiter...');
      
      const response = await fetch(`${this.JUPITER_BASE_URL}/strict`);
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }
      
      const jupiterTokens: JupiterTokenData[] = await response.json();
      console.log(`Fetched ${jupiterTokens.length} tokens from Jupiter`);
      
      // Filter out tokens without proper metadata
      const validTokens = jupiterTokens.filter(token => 
        token.address && 
        token.symbol && 
        token.name && 
        token.decimals !== undefined &&
        !token.symbol.includes('$') && // Remove meme coins with $ in symbol
        token.symbol.length <= 10 && // Reasonable symbol length
        token.name.length <= 50 // Reasonable name length
      );
      
      console.log(`${validTokens.length} tokens passed initial validation`);
      return validTokens;
      
    } catch (error) {
      console.error('Error fetching Jupiter tokens:', error);
      throw new Error(`Failed to fetch Jupiter tokens: ${error.message}`);
    }
  }

  /**
   * Get Solana token addresses from CoinGecko
   */
  async fetchCoinGeckoSolanaTokens(): Promise<TokenData[]> {
    try {
      console.log('Fetching Solana tokens from CoinGecko...');
      
      const response = await fetch(
        `${this.COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`,
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
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: TokenData[] = await response.json();
      console.log(`Fetched ${data.length} Solana tokens from CoinGecko`);
      
      return data;
      
    } catch (error) {
      console.error('Error fetching CoinGecko tokens:', error);
      throw new Error(`Failed to fetch CoinGecko data: ${error.message}`);
    }
  }

  /**
   * Get detailed token information from CoinGecko
   */
  async fetchTokenDetails(coingeckoId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.COINGECKO_BASE_URL}/coins/${coingeckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
        {
          headers: {
            'X-CG-Demo-API-Key': this.coingeckoApiKey,
            'accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko details API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`Failed to fetch details for ${coingeckoId}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate token age from genesis date
   */
  private calculateTokenAge(genesisDate: string | null): number {
    if (!genesisDate) return 0;
    
    try {
      const genesis = new Date(genesisDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - genesis.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate liquidity score based on volume and market cap
   */
  private calculateLiquidityScore(volume24h: number, marketCap: number): number {
    if (!volume24h || !marketCap || marketCap === 0) return 0;
    
    // Volume to market cap ratio as liquidity indicator
    const volumeRatio = volume24h / marketCap;
    
    // Normalize to 0-1 scale (0.1 = 10% daily volume is considered high liquidity)
    const normalizedScore = Math.min(volumeRatio / 0.1, 1);
    
    return Math.round(normalizedScore * 100) / 100;
  }

  /**
   * Extract Solana address from CoinGecko platforms
   */
  private extractSolanaAddress(platforms: Record<string, string>): string | null {
    if (!platforms) return null;
    
    // Check various Solana platform keys
    const solanaKeys = ['solana', 'spl', 'solana-ecosystem'];
    
    for (const key of solanaKeys) {
      if (platforms[key]) {
        return platforms[key];
      }
    }
    
    return null;
  }

  /**
   * Merge Jupiter and CoinGecko data
   */
  async processTokenData(jupiterTokens: JupiterTokenData[], coingeckoTokens: TokenData[]): Promise<ProcessedToken[]> {
    const processedTokens: ProcessedToken[] = [];
    const now = Date.now();
    
    console.log('Processing and merging token data...');
    
    // Create a map of Solana addresses from CoinGecko
    const coingeckoMap = new Map<string, TokenData>();
    
    for (const cgToken of coingeckoTokens) {
      const solanaAddress = this.extractSolanaAddress(cgToken.platforms);
      if (solanaAddress) {
        coingeckoMap.set(solanaAddress.toLowerCase(), cgToken);
      }
    }
    
    console.log(`Mapped ${coingeckoMap.size} CoinGecko tokens with Solana addresses`);
    
    // Process Jupiter tokens with CoinGecko data overlay
    for (const jupToken of jupiterTokens) {
      const cgToken = coingeckoMap.get(jupToken.address.toLowerCase());
      
      if (!cgToken) {
        // Skip tokens not found in CoinGecko (no price/market data)
        continue;
      }
      
      // Apply market cap filter
      if (!cgToken.market_cap || cgToken.market_cap < this.MIN_MARKET_CAP) {
        continue;
      }
      
      // Get detailed token information for age verification
      const tokenDetails = await this.fetchTokenDetails(cgToken.id);
      const ageInDays = tokenDetails ? this.calculateTokenAge(tokenDetails.genesis_date) : 0;
      
      // Apply age filter
      if (ageInDays < this.MIN_AGE_DAYS) {
        console.log(`Skipping ${cgToken.symbol}: Age ${ageInDays} days < ${this.MIN_AGE_DAYS} required`);
        continue;
      }
      
      // Calculate liquidity score
      const volume24h = tokenDetails?.market_data?.total_volume?.usd || 0;
      const liquidityScore = this.calculateLiquidityScore(volume24h, cgToken.market_cap);
      
      // Apply liquidity filter
      if (liquidityScore < this.MIN_LIQUIDITY_SCORE) {
        console.log(`Skipping ${cgToken.symbol}: Liquidity score ${liquidityScore} < ${this.MIN_LIQUIDITY_SCORE} required`);
        continue;
      }
      
      // Create processed token
      const processedToken: ProcessedToken = {
        address: jupToken.address,
        symbol: jupToken.symbol.toUpperCase(),
        name: jupToken.name,
        decimals: jupToken.decimals,
        logo_uri: jupToken.logoURI || cgToken.image || '',
        price_usd: cgToken.current_price || 0,
        market_cap_usd: cgToken.market_cap || 0,
        market_cap_rank: cgToken.market_cap_rank || 999999,
        price_change_24h: cgToken.price_change_percentage_24h || 0,
        circulating_supply: cgToken.circulating_supply || 0,
        total_supply: cgToken.total_supply || 0,
        created_at_timestamp: tokenDetails?.genesis_date ? new Date(tokenDetails.genesis_date).getTime() : now,
        age_days: ageInDays,
        coingecko_id: cgToken.id,
        tags: jupToken.tags || [],
        is_verified: (jupToken.tags || []).includes('verified') || cgToken.market_cap_rank <= 100,
        liquidity_score: liquidityScore,
        volume_24h: volume24h,
        holders_count: tokenDetails?.community_data?.holders || undefined
      };
      
      processedTokens.push(processedToken);
      
      // Rate limiting - small delay between CoinGecko detail requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Sort by market cap rank (lower is better)
    processedTokens.sort((a, b) => a.market_cap_rank - b.market_cap_rank);
    
    console.log(`Processed ${processedTokens.length} tokens that meet all criteria`);
    return processedTokens;
  }

  /**
   * Save tokens to Supabase database
   */
  async saveTokensToDatabase(tokens: ProcessedToken[]): Promise<number> {
    try {
      console.log(`Saving ${tokens.length} tokens to database...`);
      
      // Batch insert/upsert tokens
      const { data, error } = await this.supabase
        .from('tokens')
        .upsert(tokens, {
          onConflict: 'address'
        });
      
      if (error) {
        throw new Error(`Database save error: ${error.message}`);
      }
      
      // Update the token_updates table
      await this.supabase
        .from('token_updates')
        .insert({
          update_type: 'full_refresh',
          success: true,
          tokens_processed: tokens.length,
          error_message: null
        });
      
      console.log(`Successfully saved ${tokens.length} tokens to database`);
      return tokens.length;
      
    } catch (error) {
      console.error('Error saving tokens to database:', error);
      
      // Log failed update
      await this.supabase
        .from('token_updates')
        .insert({
          update_type: 'full_refresh',
          success: false,
          tokens_processed: 0,
          error_message: error.message
        });
      
      throw error;
    }
  }

  /**
   * Get blacklisted token addresses from database
   */
  async getBlacklistedTokens(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('tokens')
        .select('address')
        .eq('is_blacklisted', true);
      
      if (error) {
        console.warn('Error fetching blacklisted tokens:', error.message);
        return [];
      }
      
      return (data || []).map(token => token.address.toLowerCase());
    } catch (error) {
      console.warn('Error fetching blacklisted tokens:', error);
      return [];
    }
  }

  /**
   * Main execution function
   */
  async execute(forceRefresh: boolean = false): Promise<{ success: boolean; tokensProcessed: number; message: string }> {
    try {
      console.log('Starting token fetch process...');
      
      // Check if we need to update (max once per hour unless forced)
      if (!forceRefresh) {
        const { data: lastUpdate } = await this.supabase
          .from('token_updates')
          .select('updated_at')
          .eq('success', true)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (lastUpdate && lastUpdate.length > 0) {
          const lastUpdateTime = new Date(lastUpdate[0].updated_at);
          const now = new Date();
          const hoursSinceUpdate = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceUpdate < 1) {
            return {
              success: true,
              tokensProcessed: 0,
              message: `Tokens were updated ${Math.round(hoursSinceUpdate * 60)} minutes ago. Skipping update.`
            };
          }
        }
      }
      
      // Fetch data from both sources
      const [jupiterTokens, coingeckoTokens] = await Promise.all([
        this.fetchJupiterTokens(),
        this.fetchCoinGeckoSolanaTokens()
      ]);
      
      // Get blacklisted tokens
      const blacklistedTokens = await this.getBlacklistedTokens();
      
      // Filter out blacklisted tokens
      const filteredJupiterTokens = jupiterTokens.filter(token => 
        !blacklistedTokens.includes(token.address.toLowerCase())
      );
      
      console.log(`Filtered out ${jupiterTokens.length - filteredJupiterTokens.length} blacklisted tokens`);
      
      // Process and merge data
      const processedTokens = await this.processTokenData(filteredJupiterTokens, coingeckoTokens);
      
      // Save to database
      const savedCount = await this.saveTokensToDatabase(processedTokens);
      
      return {
        success: true,
        tokensProcessed: savedCount,
        message: `Successfully processed and saved ${savedCount} tokens`
      };
      
    } catch (error) {
      console.error('Token fetch process failed:', error);
      return {
        success: false,
        tokensProcessed: 0,
        message: `Token fetch failed: ${error.message}`
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

    // Parse request body for parameters
    let forceRefresh = false;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        forceRefresh = body.forceRefresh || false;
      } catch {
        // Ignore JSON parse errors, use defaults
      }
    }

    // Initialize token fetcher and execute
    const tokenFetcher = new TokenFetcher(coingeckoApiKey, supabaseUrl, supabaseServiceKey);
    const result = await tokenFetcher.execute(forceRefresh);

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
        tokensProcessed: 0,
        message: `Edge function error: ${error.message}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
