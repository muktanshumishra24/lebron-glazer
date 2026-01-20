import axios from 'axios';
import type { MarketToken, Market, MarketsResponse } from '../types';



/**
 * Fetch active markets from the API
 * @param active - Whether to fetch only active markets (default: true)
 * @param page - Page number (default: 1)
 * @param limit - Results per page (default: 100)
 * @returns Markets response
 */
export async function fetchMarkets(
  active: boolean = true,
  page: number = 1,
  limit: number = 100,
): Promise<MarketsResponse> {
  try {
    const response = await axios.get<MarketsResponse>(
      `https://market-api.probable.markets/public/api/v1/markets`,
      {
        params: {
          active: active.toString(),
          page: page.toString(),
          limit: limit.toString(),
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      throw new Error(`Failed to fetch markets: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Fetch all markets with pagination
 * @param active - Whether to fetch only active markets (default: true)
 * @returns All markets
 */
export async function fetchAllMarkets(active: boolean = true): Promise<Market[]> {
  const allMarkets: Market[] = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchMarkets(active, currentPage, 100);
    allMarkets.push(...(response.markets || []));
    
    if (response.pagination) {
      hasMore = response.pagination.hasMore;
      currentPage++;
    } else {
      hasMore = false;
    }
  }

  return allMarkets;
}

/**
 * Filter markets by keyword in description
 * @param markets - Array of markets to filter
 * @param keyword - Keyword to search for (case-insensitive)
 * @returns Filtered markets
 */
export function filterMarketsByDescription(markets: Market[], keyword: string): Market[] {
  const lowerKeyword = keyword.toLowerCase();
  return markets.filter(market => 
    market.description.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * Parse outcomes string from market
 * @param outcomes - JSON string array of outcomes
 * @returns Array of outcome strings
 */
export function parseOutcomes(outcomes: string): string[] {
  try {
    return JSON.parse(outcomes);
  } catch {
    return [];
  }
}

/**
 * Get token ID for a specific outcome in a market
 * @param market - The market object
 * @param outcome - The desired outcome (e.g., "ATL", "LAL", "Yes", "No")
 * @returns Token ID if found, null otherwise
 */
export function getTokenIdForOutcome(market: Market, outcome: string): string | null {
  const outcomes = parseOutcomes(market.outcomes);
  
  // Direct match: if outcome is "Yes" or "No", find the token directly
  if (outcome === 'Yes' || outcome === 'No') {
    const token = market.tokens.find(t => t.outcome === outcome);
    return token?.token_id || null;
  }
  
  // For markets with Yes/No tokens but named outcomes (e.g., NBA games)
  if (outcomes.length === 2 && market.tokens.length === 2) {
    const yesToken = market.tokens.find(t => t.outcome === 'Yes');
    const noToken = market.tokens.find(t => t.outcome === 'No');
    
    if (yesToken && noToken) {
      // Parse description to understand mapping
      // Format: "If [Team1] wins, the market will resolve to '[Outcome1]'. If [Team2] wins, the market will resolve to '[Outcome2]'."
      const description = market.description;
      
      // Find which outcome maps to "Yes" (first mentioned) and which to "No" (second mentioned)
      // The first outcome in the outcomes array typically maps to "Yes"
      const outcomeIndex = outcomes.indexOf(outcome);
      
      if (outcomeIndex === 0) {
        // First outcome maps to "Yes" token
        return yesToken.token_id;
      } else if (outcomeIndex === 1) {
        // Second outcome maps to "No" token
        return noToken.token_id;
      }
    }
  }
  
  // For markets where tokens directly match outcomes
  const outcomeIndex = outcomes.indexOf(outcome);
  if (outcomeIndex >= 0 && outcomeIndex < market.tokens.length) {
    return market.tokens[outcomeIndex].token_id;
  }
  
  return null;
}

/**
 * Get all available outcomes for a market with their token IDs
 * @param market - The market object
 * @returns Map of outcome to token ID
 */
export function getOutcomeTokenMap(market: Market): Map<string, string> {
  const map = new Map<string, string>();
  const outcomes = parseOutcomes(market.outcomes);
  
  // For markets with Yes/No tokens but named outcomes (e.g., NBA games)
  if (outcomes.length === 2 && market.tokens.length === 2) {
    const yesToken = market.tokens.find(t => t.outcome === 'Yes');
    const noToken = market.tokens.find(t => t.outcome === 'No');
    
    if (yesToken && noToken) {
      // First outcome in array maps to "Yes" token, second to "No" token
      map.set(outcomes[0], yesToken.token_id);
      map.set(outcomes[1], noToken.token_id);
    }
  } else {
    // For other markets, try direct mapping by index
    outcomes.forEach((outcome, index) => {
      if (index < market.tokens.length) {
        map.set(outcome, market.tokens[index].token_id);
      }
    });
  }
  
  return map;
}

/**
 * Check if a market is related to Los Angeles Lakers (LAL)
 * @param market - The market object
 * @returns True if market mentions LAL or Los Angeles Lakers
 */
export function isLALMarket(market: Market): boolean {
  const lalKeywords = ['LAL', 'Los Angeles Lakers', 'Lakers'];
  const searchText = `${market.description} ${market.question} ${market.groupItemTitle}`.toLowerCase();
  
  return lalKeywords.some(keyword => 
    searchText.includes(keyword.toLowerCase())
  );
}

/**
 * Sort markets to prioritize LAL (Los Angeles Lakers) markets
 * @param markets - Array of markets to sort
 * @returns Sorted markets with LAL markets first
 */
export function sortMarketsWithLALFirst(markets: Market[]): Market[] {
  return [...markets].sort((a, b) => {
    const aIsLAL = isLALMarket(a);
    const bIsLAL = isLALMarket(b);
    
    // LAL markets come first
    if (aIsLAL && !bIsLAL) return -1;
    if (!aIsLAL && bIsLAL) return 1;
    
    // Otherwise maintain original order
    return 0;
  });
}

/**
 * Check if a market involves a specific team
 * @param market - The market object
 * @param teamCode - Team code (e.g., "LAL", "OKC")
 * @returns True if market mentions the team
 */
export function isTeamMarket(market: Market, teamCode: string): boolean {
  const searchText = `${market.description} ${market.question} ${market.groupItemTitle}`.toLowerCase();
  const teamCodeLower = teamCode.toLowerCase();
  
  // Also check for common team name variations
  const teamNames: Record<string, string[]> = {
    'LAL': ['los angeles lakers', 'lakers', 'lal'],
    'OKC': ['oklahoma city thunder', 'thunder', 'okc'],
    'SAS': ['san antonio spurs', 'spurs', 'sas'],
    'DEN': ['denver nuggets', 'nuggets', 'den'],
    'MIN': ['minnesota timberwolves', 'timberwolves', 'wolves', 'min'],
    'HOU': ['houston rockets', 'rockets', 'hou'],
    'PHX': ['phoenix suns', 'suns', 'phx'],
    'GSW': ['golden state warriors', 'warriors', 'gsw'],
    'POR': ['portland trail blazers', 'trail blazers', 'blazers', 'por'],
    'MEM': ['memphis grizzlies', 'grizzlies', 'mem'],
    'LAC': ['la clippers', 'clippers', 'lac'],
    'DAL': ['dallas mavericks', 'mavericks', 'dal'],
    'UTA': ['utah jazz', 'jazz', 'uta'],
    'NOP': ['new orleans pelicans', 'pelicans', 'nop'],
    'SAC': ['sacramento kings', 'kings', 'sac'],
  };
  
  const variations = teamNames[teamCode] || [teamCodeLower];
  return variations.some(variation => searchText.includes(variation));
}

/**
 * Find markets involving a specific team
 * @param markets - Array of markets to search
 * @param teamCode - Team code (e.g., "LAL", "OKC")
 * @returns Markets involving the team
 */
export function findTeamMarkets(markets: Market[], teamCode: string): Market[] {
  return markets.filter(market => isTeamMarket(market, teamCode));
}

/**
 * Get all teams mentioned in a market
 * @param market - The market object
 * @returns Array of team codes found in the market
 */
export function getTeamsInMarket(market: Market): string[] {
  const teamCodes = ['LAL', 'OKC', 'SAS', 'DEN', 'MIN', 'HOU', 'PHX', 'GSW', 'POR', 'MEM', 'LAC', 'DAL', 'UTA', 'NOP', 'SAC'];
  const searchText = `${market.description} ${market.question} ${market.groupItemTitle}`.toLowerCase();
  
  return teamCodes.filter(code => isTeamMarket(market, code));
}

/**
 * Check if a market involves two teams that are both better than LAL
 * @param market - The market object
 * @param teamsAboveLAL - Array of teams ranked above LAL
 * @returns Object with both teams if both are better than LAL, null otherwise
 */
export function getBothTeamsBetterThanLAL(
  market: Market,
  teamsAboveLAL: Array<{ code: string; name: string; rank: number; wins: number; losses: number; winPct: string }>
): { team1: { code: string; name: string; rank: number; wins: number; losses: number; winPct: string }, team2: { code: string; name: string; rank: number; wins: number; losses: number; winPct: string } } | null {
  const teamsInMarket = getTeamsInMarket(market);
  const betterTeams = teamsInMarket
    .map(code => teamsAboveLAL.find(t => t.code === code))
    .filter((team): team is { code: string; name: string; rank: number; wins: number; losses: number; winPct: string } => team !== undefined);
  
  if (betterTeams.length >= 2) {
    return {
      team1: betterTeams[0],
      team2: betterTeams[1],
    };
  }
  
  return null;
}
