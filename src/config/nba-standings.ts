/**
 * NBA Western Conference Standings
 * Ordered by current Rank (1-15) as of Jan 12, 2026
 */
export interface TeamStanding {
  rank: number;
  code: string;
  name: string;
  wins: number;
  losses: number;
  winPct: string;
}

export const WESTERN_CONFERENCE_STANDINGS: TeamStanding[] = [
  { rank: 1,  code: 'OKC', name: 'Oklahoma City Thunder',  wins: 32, losses: 7,  winPct: '82.1%' },
  { rank: 2,  code: 'SAS', name: 'San Antonio Spurs',      wins: 27, losses: 11, winPct: '71.1%' },
  { rank: 3,  code: 'DEN', name: 'Denver Nuggets',         wins: 25, losses: 13, winPct: '65.8%' },
  { rank: 4,  code: 'MIN', name: 'Minnesota Timberwolves', wins: 25, losses: 14, winPct: '64.1%' },
  { rank: 5,  code: 'LAL', name: 'Los Angeles Lakers',     wins: 23, losses: 13, winPct: '63.9%' },
  { rank: 6,  code: 'HOU', name: 'Houston Rockets',        wins: 22, losses: 13, winPct: '62.9%' },
  { rank: 7,  code: 'PHX', name: 'Phoenix Suns',           wins: 23, losses: 15, winPct: '60.5%' },
  { rank: 8,  code: 'GSW', name: 'Golden State Warriors',  wins: 21, losses: 18, winPct: '53.8%' },
  { rank: 9,  code: 'POR', name: 'Portland Trail Blazers', wins: 19, losses: 20, winPct: '48.7%' },
  { rank: 10, code: 'MEM', name: 'Memphis Grizzlies',      wins: 16, losses: 22, winPct: '42.1%' },
  { rank: 11, code: 'LAC', name: 'LA Clippers',            wins: 15, losses: 23, winPct: '39.5%' },
  { rank: 12, code: 'DAL', name: 'Dallas Mavericks',       wins: 14, losses: 25, winPct: '35.9%' },
  { rank: 13, code: 'UTA', name: 'Utah Jazz',              wins: 13, losses: 25, winPct: '34.2%' },
  { rank: 14, code: 'NOP', name: 'New Orleans Pelicans',   wins: 9,  losses: 31, winPct: '22.5%' },
  { rank: 15, code: 'SAC', name: 'Sacramento Kings',       wins: 8,  losses: 30, winPct: '21.1%' },
];

/**
 * Helper to get color for "Win Status" (Green if >= 50%)
 */
export function getTeamColor(winPct: string): string {
  const percentage = parseFloat(winPct);
  return percentage >= 50 ? 'text-green-500' : 'text-red-500';
}

/**
 * Get team standing by team code
 */
export function getTeamByCode(code: string): TeamStanding | undefined {
  return WESTERN_CONFERENCE_STANDINGS.find(team => team.code === code);
}

/**
 * Get team standing by team name (partial match)
 */
export function getTeamByName(name: string): TeamStanding | undefined {
  const lowerName = name.toLowerCase();
  return WESTERN_CONFERENCE_STANDINGS.find(team => 
    team.name.toLowerCase().includes(lowerName) || 
    lowerName.includes(team.name.toLowerCase())
  );
}

/**
 * Get LAL standing
 */
export function getLALStanding(): TeamStanding | undefined {
  return getTeamByCode('LAL');
}

/**
 * Get teams ranked above LAL
 * @returns Teams with better rank than LAL
 */
export function getTeamsAboveLAL(): TeamStanding[] {
  const lal = getLALStanding();
  if (!lal) return [];
  
  return WESTERN_CONFERENCE_STANDINGS.filter(team => team.rank < lal.rank);
}
