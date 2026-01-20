'use client'

import { WESTERN_CONFERENCE_STANDINGS, getTeamsAboveLAL } from '../config/nba-standings'

interface StandingsSidebarProps {
  isOpen: boolean
  onClose: () => void
  onToggle: () => void
}

export function StandingsSidebar({ isOpen, onClose, onToggle }: StandingsSidebarProps) {
  return (
    <div className="h-full bg-black/90 backdrop-blur-sm border border-lakers-gold/20 rounded-lg p-4 sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black uppercase tracking-tighter text-lakers-gold">
          THE THRONE ROOM
        </h2>
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-black/95 z-10">
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-2 text-xs uppercase tracking-wider text-gray-400">RANK</th>
              <th className="text-left py-2 px-2 text-xs uppercase tracking-wider text-gray-400">TEAM</th>
              <th className="text-right py-2 px-2 text-xs uppercase tracking-wider text-gray-400">W</th>
              <th className="text-right py-2 px-2 text-xs uppercase tracking-wider text-gray-400">L</th>
              <th className="text-right py-2 px-2 text-xs uppercase tracking-wider text-gray-400">%</th>
            </tr>
          </thead>
          <tbody>
            {WESTERN_CONFERENCE_STANDINGS.map((team) => {
              const isLAL = team.code === 'LAL'
              const isEnemy = getTeamsAboveLAL().some(t => t.code === team.code)
              return (
                <tr
                  key={team.code}
                  className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                    isLAL ? 'bg-lakers-gold/10 border-lakers-gold/30' : ''
                  }`}
                >
                  <td className={`py-2 px-2 font-black ${isLAL ? 'text-lakers-gold' : 'text-gray-300'}`}>
                    #{team.rank}
                  </td>
                  <td className="py-2 px-2">
                    <span className={`font-bold text-xs ${isLAL ? 'text-lakers-gold' : isEnemy ? 'text-enemy-red' : 'text-gray-200'}`}>
                      {team.code}
                    </span>
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-gray-300 text-xs">{team.wins}</td>
                  <td className="text-right py-2 px-2 font-mono text-gray-300 text-xs">{team.losses}</td>
                  <td className={`text-right py-2 px-2 font-mono font-bold text-xs ${
                    isLAL ? 'text-lakers-gold' : parseFloat(team.winPct) >= 50 ? 'text-green-400' : 'text-enemy-red'
                  }`}>
                    {team.winPct}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
