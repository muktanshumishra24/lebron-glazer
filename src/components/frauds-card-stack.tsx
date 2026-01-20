'use client'

import { parseOutcomes, getOutcomeTokenMap } from '../lib/markets'
import { getTeamsAboveLAL } from '../config/nba-standings'
import type { TeamStanding } from '../types'
import type { Market } from '../types'
import type { PlaceOrderParams } from '../types'
import { Side } from '../types'

interface FraudsCardStackProps {
  markets: Market[]
  orderForm: PlaceOrderParams
  setOrderForm: (form: PlaceOrderParams) => void
  onPlaceOrder: () => void
  apiKey: any
  loading: boolean
  excludeMarketIds?: string[]
}

export function FraudsCardStack({
  markets,
  orderForm,
  setOrderForm,
  onPlaceOrder,
  apiKey,
  loading,
  excludeMarketIds = [],
}: FraudsCardStackProps) {
  const teamsAboveLAL = getTeamsAboveLAL()
  
  const allFraudMarkets: Array<{
    market: Market
    type: 'lal-vs-fraud' | 'fraud-vs-fraud' | 'fraud-vs-others'
    team1: TeamStanding
    team2?: TeamStanding
  }> = []

  const excludedSet = new Set(excludeMarketIds)

  markets.forEach(market => {
    if (excludedSet.has(market.id)) {
      return
    }
    const outcomes = parseOutcomes(market.outcomes)
    const marketText = `${market.description} ${market.question}`.toLowerCase()
    
    const hasLAL = marketText.includes('lal') || 
                   marketText.includes('los angeles') || 
                   marketText.includes('lakers') ||
                   outcomes.some(o => o.toLowerCase().includes('lal') || 
                                     o.toLowerCase().includes('los angeles') || 
                                     o.toLowerCase().includes('lakers'))
    
    const fraudTeams = teamsAboveLAL.filter(team => {
      const teamCodeLower = team.code.toLowerCase()
      const codeRegex = new RegExp(`\\b${teamCodeLower}\\b`, 'i')
      const foundInText = codeRegex.test(marketText)
      const foundInOutcomes = outcomes.some(o => codeRegex.test(o))
      return foundInText || foundInOutcomes
    })

    if (fraudTeams.length === 0) return

    if (hasLAL) {
      allFraudMarkets.push({
        market,
        type: 'lal-vs-fraud',
        team1: fraudTeams[0],
      })
    } else if (fraudTeams.length >= 2) {
      allFraudMarkets.push({
        market,
        type: 'fraud-vs-fraud',
        team1: fraudTeams[0],
        team2: fraudTeams[1],
      })
    } else {
      allFraudMarkets.push({
        market,
        type: 'fraud-vs-others',
        team1: fraudTeams[0],
      })
    }
  })

  const validFraudMarkets = allFraudMarkets.filter(({ market, type, team1, team2 }) => {
    const outcomes = parseOutcomes(market.outcomes)
    const outcomeTokenMap = getOutcomeTokenMap(market)

    if (type === 'lal-vs-fraud') {
      const lalOutcome = outcomes.find(outcome =>
        outcome.toLowerCase().includes('lal') ||
        outcome.toLowerCase().includes('los angeles') ||
        outcome.toLowerCase().includes('lakers')
      )
      if (lalOutcome) {
        return !!outcomeTokenMap.get(lalOutcome)
      }
      const yesToken = market.tokens.find(t => t.outcome === 'Yes')
      const noToken = market.tokens.find(t => t.outcome === 'No')
      return !!(yesToken && noToken)
    } else if (type === 'fraud-vs-fraud' && team2) {
      const team1Outcome = outcomes.find(o =>
        o.toLowerCase().includes(team1.code.toLowerCase())
      )
      const team2Outcome = outcomes.find(o =>
        o.toLowerCase().includes(team2.code.toLowerCase())
      )
      const canShortTeam1 = team1Outcome && outcomeTokenMap.get(team2Outcome || '')
      const canShortTeam2 = team2Outcome && outcomeTokenMap.get(team1Outcome || '')
      return !!(canShortTeam1 || canShortTeam2)
    } else if (type === 'fraud-vs-others') {
      const team1Outcome = outcomes.find(o =>
        o.toLowerCase().includes(team1.code.toLowerCase())
      )
      if (!team1Outcome) return false
      const otherOutcome = outcomes.find(o => o !== team1Outcome)
      if (otherOutcome) {
        return !!outcomeTokenMap.get(otherOutcome)
      }
      return false
    }
    return false
  })

  if (validFraudMarkets.length === 0) {
    return (
      <div>
        <div className="mb-4">
          <h4 className="font-bold text-lg uppercase tracking-tight text-enemy-red">
            FRAUDS
          </h4>
        </div>
        <div className="bg-red-900/10 border border-enemy-red/30 rounded-lg p-6 text-center">
          <p className="text-xs text-gray-400 italic">No frauds to expose</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3">
        <h4 className="font-bold text-lg uppercase tracking-tight text-enemy-red">
          FRAUDS
        </h4>
        <p className="text-xs text-gray-400 uppercase mt-1">
          {validFraudMarkets.length} markets
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {validFraudMarkets.map(({ market, type, team1, team2 }, index) => {
          const outcomes = parseOutcomes(market.outcomes)
          const outcomeTokenMap = getOutcomeTokenMap(market)

          if (type === 'lal-vs-fraud') {
            const lalOutcome = outcomes.find(outcome =>
              outcome.toLowerCase().includes('lal') ||
              outcome.toLowerCase().includes('los angeles') ||
              outcome.toLowerCase().includes('lakers')
            )

            let tokenId: string | null = null

            if (lalOutcome) {
              tokenId = outcomeTokenMap.get(lalOutcome) || null
            } else {
              const yesToken = market.tokens.find(t => t.outcome === 'Yes')
              if (yesToken) {
                tokenId = yesToken.token_id
              }
            }

            return (
              <div key={`${market.id}-${index}`} className="bg-black/80 border border-enemy-red/30 rounded-lg p-4 hover:border-enemy-red/50 transition-colors">
                <div className="mb-2">
                  <p className="font-bold text-xs text-enemy-red uppercase">
                    LAL vs {team1.code}
                  </p>
                </div>
                <p className="font-semibold text-white line-clamp-2 mb-3 text-sm">{market.question}</p>
                {tokenId && (
                  <button
                    onClick={() => {
                      setOrderForm({ ...orderForm, tokenId: tokenId!, side: Side.BUY })
                    }}
                    className="w-full text-xs bg-enemy-red text-white px-3 py-2 rounded font-medium uppercase hover:bg-enemy-red/90 transition-colors"
                  >
                    SHORT {team1.code}
                  </button>
                )}
              </div>
            )
          } else if (type === 'fraud-vs-fraud' && team2) {
            const team1Outcome = outcomes.find(o =>
              o.toLowerCase().includes(team1.code.toLowerCase())
            )
            const team2Outcome = outcomes.find(o =>
              o.toLowerCase().includes(team2.code.toLowerCase())
            )

            const tokenId1 = team1Outcome ? outcomeTokenMap.get(team2Outcome || '') : null
            const tokenId2 = team2Outcome ? outcomeTokenMap.get(team1Outcome || '') : null

            return (
              <div key={`${market.id}-${index}`} className="bg-black/80 border border-enemy-red/30 rounded-lg p-4 hover:border-enemy-red/50 transition-colors">
                <div className="mb-2">
                  <p className="font-bold text-xs text-enemy-red uppercase">
                    {team1.code} vs {team2.code}
                  </p>
                </div>
                <p className="font-semibold text-white line-clamp-2 mb-3 text-sm">{market.question}</p>
                <div className="space-y-2">
                  {tokenId2 && (
                    <button
                      onClick={() => {
                        setOrderForm({ ...orderForm, tokenId: tokenId2!, side: Side.BUY })
                      }}
                      className="w-full text-xs bg-enemy-red text-white px-3 py-2 rounded font-medium uppercase hover:bg-enemy-red/90 transition-colors"
                    >
                      SHORT {team1.code}
                    </button>
                  )}
                  {tokenId1 && (
                    <button
                      onClick={() => {
                        setOrderForm({ ...orderForm, tokenId: tokenId1!, side: Side.BUY })
                      }}
                      className="w-full text-xs bg-enemy-red text-white px-3 py-2 rounded font-medium uppercase hover:bg-enemy-red/90 transition-colors"
                    >
                      SHORT {team2.code}
                    </button>
                  )}
                </div>
              </div>
            )
          } else if (type === 'fraud-vs-others') {
            const team1Outcome = outcomes.find(o =>
              o.toLowerCase().includes(team1.code.toLowerCase())
            )
            
            let otherOutcome: string | undefined
            let tokenId: string | undefined
            
            if (team1Outcome) {
              otherOutcome = outcomes.find(o => o !== team1Outcome)
              if (otherOutcome) {
                tokenId = outcomeTokenMap.get(otherOutcome)
              }
            }
            
            return (
              <div key={`${market.id}-${index}`} className="bg-black/80 border border-enemy-red/30 rounded-lg p-4 hover:border-enemy-red/50 transition-colors">
                <div className="mb-2">
                  <p className="font-bold text-xs text-enemy-red uppercase">
                    {otherOutcome ? `${otherOutcome} vs ${team1.code}` : `${team1.code} Match`}
                  </p>
                </div>
                <p className="font-semibold text-white line-clamp-2 mb-3 text-sm">{market.question}</p>
                {tokenId && (
                  <button
                    onClick={() => {
                      setOrderForm({ ...orderForm, tokenId: tokenId!, side: Side.BUY })
                    }}
                    className="w-full text-xs bg-enemy-red text-white px-3 py-2 rounded font-medium uppercase hover:bg-enemy-red/90 transition-colors"
                  >
                    SHORT {team1.code}
                  </button>
                )}
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
