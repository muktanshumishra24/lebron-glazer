'use client'

import { WESTERN_CONFERENCE_STANDINGS, getTeamsAboveLAL } from '../../config/nba-standings'

interface StandingsSidebarProps {
  isOpen: boolean
  onClose: () => void
  onToggle: () => void
}

export function StandingsSidebar({ isOpen, onClose, onToggle }: StandingsSidebarProps) {
  return (
    <>
      {/* Toggle Button - Always Visible */}
      <button
        onClick={onToggle}
        className={`absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 bg-lakers-gold/20 hover:bg-lakers-gold/30 border border-lakers-gold/50 rounded-l-lg px-3 py-8 transition-all hover:scale-105 ${
          isOpen ? 'rounded-l-none' : ''
        }`}
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        <span className="text-lakers-gold font-black uppercase tracking-tighter text-xs">
          {isOpen ? 'HIDE' : 'THRONE'}
        </span>
      </button>

      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full bg-black/95 backdrop-blur-lg border-l border-white/10 z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`} style={{ width: '320px' }}>
        {/* Standings Content */}
        <div className="h-full overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black uppercase tracking-tighter text-lakers-gold">
              THE THRONE ROOM
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-lakers-gold transition-colors text-xl"
            >
              ×
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
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
      </div>
    </>
  )
}
