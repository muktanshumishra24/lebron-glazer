/**
 * NBA Western Conference Standings
 * Ordered by current Rank (1-15) as of Jan 12, 2026
 */
import type { TeamStanding } from '../types';

export const WESTERN_CONFERENCE_STANDINGS: TeamStanding[] = [
  { rank: 1,  code: 'OKC', name: 'Oklahoma City Thunder',  wins: 35, losses: 8,  winPct: '81.4%' },
  { rank: 2,  code: 'SAS', name: 'San Antonio Spurs',      wins: 29, losses: 13, winPct: '69.0%' },
  { rank: 3,  code: 'DEN', name: 'Denver Nuggets',         wins: 29, losses: 14, winPct: '67.4%' },
  { rank: 4,  code: 'MIN', name: 'Minnesota Timberwolves', wins: 27, losses: 16, winPct: '62.8%' },
  { rank: 5,  code: 'HOU', name: 'Houston Rockets',        wins: 25, losses: 15, winPct: '62.5%' },
  { rank: 6,  code: 'LAL', name: 'Los Angeles Lakers',     wins: 25, losses: 16, winPct: '61.0%' },
  { rank: 7,  code: 'PHX', name: 'Phoenix Suns',           wins: 25, losses: 17, winPct: '59.5%' },
  { rank: 8,  code: 'GSW', name: 'Golden State Warriors',  wins: 24, losses: 19, winPct: '55.8%' },
  { rank: 9,  code: 'POR', name: 'Portland Trail Blazers', wins: 22, losses: 22, winPct: '50.0%' },
  { rank: 10, code: 'MEM', name: 'Memphis Grizzlies',      wins: 18, losses: 23, winPct: '43.9%' },
  { rank: 11, code: 'LAC', name: 'LA Clippers',            wins: 18, losses: 23, winPct: '43.9%' },
  { rank: 12, code: 'DAL', name: 'Dallas Mavericks',       wins: 17, losses: 26, winPct: '39.5%' },
  { rank: 13, code: 'UTA', name: 'Utah Jazz',              wins: 14, losses: 28, winPct: '33.3%' },
  { rank: 14, code: 'SAC', name: 'Sacramento Kings',       wins: 12, losses: 31, winPct: '27.9%' },
  { rank: 15, code: 'NOP', name: 'New Orleans Pelicans',   wins: 10, losses: 35, winPct: '22.2%' },
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
