'use client'

import { parseOutcomes, getOutcomeTokenMap, findTeamMarkets } from '../../lib/markets'
import { getLALStanding } from '../../config/nba-standings'
import type { Market } from '../../lib/markets'
import type { PlaceOrderParams } from '../../lib/orders'
import { Side } from '../../types'

interface TrustTheKingCardProps {
  markets: Market[]
  orderForm: PlaceOrderParams
  setOrderForm: (form: PlaceOrderParams) => void
  onPlaceOrder: () => void
  apiKey: any
  loading: boolean
}

export function TrustTheKingCard({
  markets,
  orderForm,
  setOrderForm,
  onPlaceOrder,
  apiKey,
  loading,
}: TrustTheKingCardProps) {
  const lalMarkets = findTeamMarkets(markets, 'LAL')
  const lalStanding = getLALStanding()

  const filteredLALMarkets = lalMarkets.filter((market) => {
    // Filter out markets without valid tokenIds
    const yesToken = market.tokens.find(t => t.outcome === 'Yes')
    const noToken = market.tokens.find(t => t.outcome === 'No')
    const outcomes = parseOutcomes(market.outcomes)
    const outcomeTokenMap = getOutcomeTokenMap(market)

    if (yesToken && noToken) {
      return true // Has Yes/No tokens
    }

    const lalOutcome = outcomes.find(outcome =>
      outcome.toLowerCase().includes('lal') ||
      outcome.toLowerCase().includes('los angeles') ||
      outcome.toLowerCase().includes('lakers')
    )
    if (lalOutcome) {
      return !!outcomeTokenMap.get(lalOutcome)
    }
    return false
  })

  if (filteredLALMarkets.length === 0) {
    return (
      <div>
        <div className="mb-4">
          <h4 className="font-bold text-lg uppercase tracking-tight text-lakers-gold">
            LAL - LOS ANGELES LAKERS
          </h4>
          <p className="text-xs text-gray-400 uppercase mt-1">
            Rank #{lalStanding?.rank || '?'} • {lalStanding?.winPct || '?'} win rate
          </p>
        </div>
        <div className="bg-lakers-gold/5 border border-lakers-gold/30 rounded-lg p-6 text-center">
          <p className="text-xs text-gray-400 italic">No LAL markets found</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3">
        <h4 className="font-bold text-lg uppercase tracking-tight text-lakers-gold">
          LAL - LOS ANGELES LAKERS
        </h4>
        <p className="text-xs text-gray-400 uppercase mt-1">
          Rank #{lalStanding?.rank || '?'} • {lalStanding?.winPct || '?'} win rate • {filteredLALMarkets.length} markets
        </p>
      </div>

      {/* LAL Markets - Small Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredLALMarkets.map((market) => {
          const yesToken = market.tokens.find(t => t.outcome === 'Yes')
          const noToken = market.tokens.find(t => t.outcome === 'No')
          const outcomes = parseOutcomes(market.outcomes)
          const outcomeTokenMap = getOutcomeTokenMap(market)

          let tokenId: string | null = null

          if (yesToken && noToken) {
            tokenId = yesToken.token_id
          } else {
            const lalOutcome = outcomes.find(outcome =>
              outcome.toLowerCase().includes('lal') ||
              outcome.toLowerCase().includes('los angeles') ||
              outcome.toLowerCase().includes('lakers')
            )
            if (lalOutcome) {
              tokenId = outcomeTokenMap.get(lalOutcome) || null
            }
          }

          return (
            <div key={market.id} className="bg-black/80 border border-lakers-gold/30 rounded-lg p-4 hover:border-lakers-gold/50 transition-colors">
              <p className="font-semibold text-lakers-gold line-clamp-2 mb-3 text-sm">{market.question}</p>
              {tokenId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 bg-lakers-gold/10 rounded p-2 border border-lakers-gold/20">
                    <span className="text-lakers-gold font-mono text-xs flex-1 truncate font-medium">
                      {tokenId.slice(0, 16)}...
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setOrderForm({ ...orderForm, tokenId, side: Side.BUY })
                    }}
                    className="w-full text-xs bg-lakers-gold text-black px-3 py-2 rounded font-medium uppercase hover:bg-lakers-gold/90 transition-colors"
                  >
                    BEND THE KNEE
                  </button>
                </div>
              )}
              {market.liquidity && parseFloat(market.liquidity) > 0 && (
                <p className="text-xs text-gray-400 uppercase font-mono mt-2 bg-black/30 rounded px-2 py-1 inline-block">
                  ${parseFloat(market.liquidity).toFixed(2)}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
