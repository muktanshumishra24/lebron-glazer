'use client'

import { parseOutcomes, getOutcomeTokenMap, getBothTeamsBetterThanLAL } from '../../lib/markets'
import { getTeamsAboveLAL, type TeamStanding } from '../../config/nba-standings'
import type { Market } from '../../lib/markets'
import type { PlaceOrderParams } from '../../lib/orders'
import { Side } from '../../types'

interface FraudsCardStackProps {
  markets: Market[]
  orderForm: PlaceOrderParams
  setOrderForm: (form: PlaceOrderParams) => void
  onPlaceOrder: () => void
  apiKey: any
  loading: boolean
}

export function FraudsCardStack({
  markets,
  orderForm,
  setOrderForm,
  onPlaceOrder,
  apiKey,
  loading,
}: FraudsCardStackProps) {
  const teamsAboveLAL = getTeamsAboveLAL()
  
  // Collect all fraud markets: 
  // 1. Markets where LAL competes against teams ranked above LAL (betting on LAL = shorting the fraud)
  // 2. Markets where two teams ranked above LAL compete (can short either)
  const allFraudMarkets: Array<{
    market: Market
    type: 'lal-vs-fraud' | 'fraud-vs-fraud'
    team1: TeamStanding
    team2?: TeamStanding // Only for fraud-vs-fraud
  }> = []

  markets.forEach(market => {
    const outcomes = parseOutcomes(market.outcomes)
    const marketText = `${market.description} ${market.question}`.toLowerCase()
    
    // Check if LAL is in the market
    const hasLAL = marketText.includes('lal') || 
                   marketText.includes('los angeles') || 
                   marketText.includes('lakers') ||
                   outcomes.some(o => o.toLowerCase().includes('lal') || 
                                     o.toLowerCase().includes('los angeles') || 
                                     o.toLowerCase().includes('lakers'))
    
    if (hasLAL) {
      // LAL vs team ranked above LAL
      teamsAboveLAL.forEach(team => {
        const teamCodeLower = team.code.toLowerCase()
        const hasOpponent = marketText.includes(teamCodeLower) ||
                           outcomes.some(o => o.toLowerCase().includes(teamCodeLower))
        
        if (hasOpponent) {
          allFraudMarkets.push({
            market,
            type: 'lal-vs-fraud',
            team1: team, // The fraud team (ranked above LAL)
          })
        }
      })
    } else {
      // Two teams ranked above LAL competing
      const bothTeams = getBothTeamsBetterThanLAL(market, teamsAboveLAL)
      if (bothTeams) {
        allFraudMarkets.push({
          market,
          type: 'fraud-vs-fraud',
          team1: bothTeams.team1,
          team2: bothTeams.team2,
        })
      }
    }
  })

  // Filter markets with valid tokenIds
  const validFraudMarkets = allFraudMarkets.filter(({ market, type, team1, team2 }) => {
    const outcomes = parseOutcomes(market.outcomes)
    const outcomeTokenMap = getOutcomeTokenMap(market)

    if (type === 'lal-vs-fraud') {
      // Check if we have tokenId for LAL (betting on LAL = shorting the fraud team)
      const lalOutcome = outcomes.find(outcome =>
        outcome.toLowerCase().includes('lal') ||
        outcome.toLowerCase().includes('los angeles') ||
        outcome.toLowerCase().includes('lakers')
      )
      if (lalOutcome) {
        return !!outcomeTokenMap.get(lalOutcome)
      }
      // Fallback: Yes/No tokens
      const yesToken = market.tokens.find(t => t.outcome === 'Yes')
      const noToken = market.tokens.find(t => t.outcome === 'No')
      return !!(yesToken && noToken)
    } else if (type === 'fraud-vs-fraud' && team2) {
      // Check if we have at least one valid tokenId (to short either team)
      const team1Outcome = outcomes.find(o =>
        o.toLowerCase().includes(team1.code.toLowerCase())
      )
      const team2Outcome = outcomes.find(o =>
        o.toLowerCase().includes(team2.code.toLowerCase())
      )
      const hasToken1 = team1Outcome && outcomeTokenMap.get(team2Outcome || '')
      const hasToken2 = team2Outcome && outcomeTokenMap.get(team1Outcome || '')
      return !!(hasToken1 || hasToken2)
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
      <div className="mb-4">
        <h4 className="font-bold text-lg uppercase tracking-tight text-enemy-red">
          FRAUDS
        </h4>
        <p className="text-xs text-gray-400 uppercase mt-1">
          {validFraudMarkets.length} markets
        </p>
      </div>

      {/* Fraud Markets - Small Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {validFraudMarkets.map(({ market, type, team1, team2 }, index) => {
          const outcomes = parseOutcomes(market.outcomes)
          const outcomeTokenMap = getOutcomeTokenMap(market)

          if (type === 'lal-vs-fraud') {
            // LAL vs fraud team - betting on LAL = shorting the fraud
            const lalOutcome = outcomes.find(outcome =>
              outcome.toLowerCase().includes('lal') ||
              outcome.toLowerCase().includes('los angeles') ||
              outcome.toLowerCase().includes('lakers')
            )

            let tokenId: string | null = null

            if (lalOutcome) {
              tokenId = outcomeTokenMap.get(lalOutcome) || null
            } else {
              // Fallback: use Yes token (assuming Yes = LAL wins)
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
                      setOrderForm({ ...orderForm, tokenId, side: Side.BUY })
                    }}
                    className="w-full text-xs bg-enemy-red text-white px-3 py-2 rounded font-medium uppercase hover:bg-enemy-red/90 transition-colors"
                  >
                    SHORT {team1.code}
                  </button>
                )}
              </div>
            )
          } else if (type === 'fraud-vs-fraud' && team2) {
            // Two fraud teams competing - can short either
            const team1Outcome = outcomes.find(o =>
              o.toLowerCase().includes(team1.code.toLowerCase())
            )
            const team2Outcome = outcomes.find(o =>
              o.toLowerCase().includes(team2.code.toLowerCase())
            )

            // Get tokenIds for both options (betting on team2 wins = short team1, and vice versa)
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
                        setOrderForm({ ...orderForm, tokenId: tokenId2, side: Side.BUY })
                      }}
                      className="w-full text-xs bg-enemy-red text-white px-3 py-2 rounded font-medium uppercase hover:bg-enemy-red/90 transition-colors"
                    >
                      SHORT {team1.code}
                    </button>
                  )}
                  {tokenId1 && (
                    <button
                      onClick={() => {
                        setOrderForm({ ...orderForm, tokenId: tokenId1, side: Side.BUY })
                      }}
                      className="w-full text-xs bg-enemy-red text-white px-3 py-2 rounded font-medium uppercase hover:bg-enemy-red/90 transition-colors"
                    >
                      SHORT {team2.code}
                    </button>
                  )}
                </div>
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
