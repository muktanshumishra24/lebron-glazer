'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { fetchAllMarketsAction } from '../actions'
import type { Market } from '../../lib/markets'
import { parseOutcomes, filterMarketsByDescription, sortMarketsWithLALFirst, getOutcomeTokenMap, isLALMarket, getTokenIdForOutcome } from '../../lib/markets'
import { Side } from '../../types'

export default function KingCrowdPage() {
  const { isConnected } = useAccount()
  const [markets, setMarkets] = useState<Market[]>([])
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [marketsLoading, setMarketsLoading] = useState(false)

  useEffect(() => {
    if (isConnected) {
      loadMarkets()
    }
  }, [isConnected])

  async function loadMarkets() {
    setMarketsLoading(true)
    try {
      // Fetch all markets
      const allMarkets = await fetchAllMarketsAction(true)
      
      // Filter for NBA markets only (search for "NBA" in description)
      const nbaMarkets = filterMarketsByDescription(allMarkets, 'NBA')
      
      // Sort to prioritize LAL markets
      const sortedMarkets = sortMarketsWithLALFirst(nbaMarkets)
      
      setMarkets(sortedMarkets)
    } catch (err: any) {
      console.error('Failed to load markets:', err)
    } finally {
      setMarketsLoading(false)
    }
  }

  function handleMarketSelect(market: Market) {
    setSelectedMarket(market)
  }

  function handleOutcomeSelect(market: Market, outcome: string) {
    const tokenId = getTokenIdForOutcome(market, outcome)
    if (tokenId) {
      // Could navigate to /glaze with token ID or show a message
      console.log('Selected token ID:', tokenId)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-lakers-gold mb-4">
              WALLET NOT CONNECTED
            </h2>
            <p className="text-gray-400">Connect your wallet to enter King & Crowd</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Markets Section - King & Crowd */}
        <div className="mt-10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-lakers-gold">
                THE ARENA
              </h2>
              <p className="text-sm text-gray-400 mt-1 uppercase tracking-wider">
                {markets.length} MARKET{markets.length !== 1 ? 'S' : ''} • LAL PRIORITIZED
              </p>
            </div>
            <button
              onClick={loadMarkets}
              disabled={marketsLoading}
              className="bg-white/5 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm font-bold uppercase hover:border-lakers-gold/50 hover:text-lakers-gold transition-all"
            >
              {marketsLoading ? 'CALCULATING...' : 'REFRESH'}
            </button>
          </div>
          
          {marketsLoading ? (
            <div className="text-center py-8 text-gray-400 uppercase tracking-wider">Calculated Aura...</div>
          ) : markets.length === 0 ? (
            <div className="text-center py-8 text-gray-400 uppercase tracking-wider">No markets available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {markets.map((market) => {
                const isLAL = isLALMarket(market)
                const outcomeTokenMap = getOutcomeTokenMap(market)
                const outcomes = parseOutcomes(market.outcomes)
                const yesToken = market.tokens.find(t => t.outcome === 'Yes')
                const noToken = market.tokens.find(t => t.outcome === 'No')
                
                return (
                  <div
                    key={market.id}
                    className={`bg-white/5 backdrop-blur-md border-2 rounded-lg p-4 cursor-pointer transition-all hover:scale-105 ${
                      isLAL 
                        ? 'border-lakers-gold bg-lakers-gold/5 shadow-[0_0_20px_rgba(253,185,39,0.3)]' 
                        : 'border-white/10 hover:border-lakers-purple/50'
                    }`}
                    onClick={() => handleMarketSelect(market)}
                  >
                    {isLAL && (
                      <div className="mb-3">
                        <span className="text-xs font-black uppercase tracking-tighter text-lakers-gold bg-lakers-gold/20 px-3 py-1.5 rounded border border-lakers-gold/50 inline-block">
                          👑 THE KING'S MARKET
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      {market.icon && (
                        <img
                          src={market.icon}
                          alt={market.groupItemTitle}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-black text-sm uppercase tracking-tighter truncate mb-2 ${
                          isLAL ? 'text-lakers-gold' : 'text-gray-200'
                        }`}>
                          {market.groupItemTitle || market.question}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{market.question}</p>
                        <div className="mt-3 space-y-1">
                          {outcomes.map((outcome) => {
                            const tokenId = outcomeTokenMap.get(outcome)
                            return (
                              <button
                                key={outcome}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOutcomeSelect(market, outcome)
                                }}
                                className={`text-xs px-3 py-2 rounded w-full text-left flex justify-between items-center font-bold uppercase transition-all hover:scale-105 ${
                                  isLAL
                                    ? 'bg-lakers-gold/20 text-lakers-gold border border-lakers-gold/30 hover:bg-lakers-gold/30'
                                    : 'bg-white/5 text-gray-300 border border-white/10 hover:border-lakers-purple/50'
                                }`}
                              >
                                <span>{outcome}</span>
                                {tokenId && (
                                  <span className="text-xs font-mono text-gray-500">
                                    {tokenId.slice(0, 8)}...
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                        {/* Show Yes/No token IDs explicitly for LAL markets */}
                        {isLAL && yesToken && noToken && (
                          <div className="mt-3 p-3 bg-lakers-gold/10 border border-lakers-gold/30 rounded text-xs">
                            <div className="font-black uppercase text-lakers-gold mb-2 tracking-tighter">TOKEN IDs:</div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-gray-300">GLAZE:</span>{' '}
                                  <span className="font-mono text-lakers-gold text-xs">{yesToken.token_id.slice(0, 16)}...</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-gray-300">HATE:</span>{' '}
                                  <span className="font-mono text-enemy-red text-xs">{noToken.token_id.slice(0, 16)}...</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {market.liquidity && parseFloat(market.liquidity) > 0 && (
                          <p className="text-xs text-gray-500 mt-2 uppercase font-mono">
                            LIQUIDITY: ${parseFloat(market.liquidity).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
