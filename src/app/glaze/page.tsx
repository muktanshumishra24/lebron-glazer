'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import {
  checkProxyWalletAction,
  checkBalanceAction,
  fetchAllMarketsAction,
  cancelOrderAction,
  cancelOrdersAction,
} from '../../lib/actions'
import { getApiKey } from '../../lib/api'
import { getOpenOrdersWithApiKey, placeOrderWithApiKey } from '../../lib/orders'
import { sortMarketsWithLALFirst, getTokenIdForOutcome, findTeamMarkets, parseOutcomes, getOutcomeTokenMap } from '../../lib/markets'
import type { PlaceOrderParams, ApiOrder } from '../../types'
import type { Market } from '../../types'
import { Side } from '../../types'
import { HeroSection } from '../../components/hero-section'
import { ErrorDisplay } from '../../components/error-display'
import { StandingsSidebar } from '../../components/standings-sidebar'
import { FraudsCardStack } from '../../components/frauds-card-stack'
import { TrustTheKingCard } from '../../components/trust-the-king-card'
import { CommandCenterModal } from '../../components/command-center-modal'

export default function GlazePage() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [proxyAddress, setProxyAddress] = useState<string | null>(null)
  const [mode, setMode] = useState<'proxy' | 'eoa'>('proxy')
  const [balance, setBalance] = useState<any>(null)
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<any>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [marketsLoading, setMarketsLoading] = useState(false)
  // Standings sidebar is now always visible, no state needed
  const [commandCenterOpen, setCommandCenterOpen] = useState(false)
  const [commandCenterTheme, setCommandCenterTheme] = useState<'enemy-red' | 'lakers-gold'>('lakers-gold')
  const [mounted, setMounted] = useState(false)

  // Order form state - Always LeBron's Side (BUY)
  const [orderForm, setOrderForm] = useState<PlaceOrderParams>({
    tokenId: '',
    side: Side.BUY, // Always BUY - LeBron's Side
    price: 0.5,
    size: 1,
    tickSize: '0.01',
    feeRateBps: 0,
    nonce: 0,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load markets on mount regardless of wallet connection
  useEffect(() => {
    loadMarkets()
  }, [])

  useEffect(() => {
    if (mounted && isConnected && address && walletClient) {
      initialize()
    }
  }, [mounted, isConnected, address, walletClient])

  async function initialize() {
    if (!address) {
      console.log('[INIT] ❌ No address available')
      return
    }
    
    console.log('[INIT] Initializing wallet setup for:', address)
    
    try {
      // Check for proxy
      console.log('[INIT] Checking for proxy wallet...')
      const proxyResult = await checkProxyWalletAction(address as `0x${string}`)
      if (proxyResult.exists) {
        console.log('[INIT] ✅ Proxy wallet found:', proxyResult.address)
        setProxyAddress(proxyResult.address)
        setMode('proxy')
      } else {
        console.log('[INIT] No proxy wallet found, using EOA mode')
        setMode('eoa')
      }

      // Load API key (client-side only - localStorage not available on server)
      console.log('[INIT] Loading API key...')
      const key = await getApiKey()
      if (key) {
        console.log('[INIT] ✅ API key loaded')
      } else {
        console.log('[INIT] ⚠️ No API key found')
      }
      setApiKey(key)

      // Load balance and orders
      console.log('[INIT] Refreshing data...')
      await refreshData()
      
      // Load markets
      console.log('[INIT] Loading markets...')
      await loadMarkets()
      
      console.log('[INIT] ✅ Initialization complete')
    } catch (err: any) {
      console.error('[INIT] ❌ Initialization failed:', err)
      setError(err.message)
    }
  }


  async function loadMarkets() {
    setMarketsLoading(true)
    try {
      const allMarkets = await fetchAllMarketsAction(true)
      const sortedMarkets = sortMarketsWithLALFirst(allMarkets)
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
      setOrderForm({
        ...orderForm,
        tokenId: tokenId,
        side: Side.BUY, // Always LeBron's Side
      })
      setSelectedMarket(null) // Close market selection after selecting
    } else {
      setError(`Could not find token ID for outcome: ${outcome}`)
    }
  }

  async function refreshData() {
    const tradingAddress = mode === 'proxy' && proxyAddress ? proxyAddress : address
    if (!tradingAddress) return

    setLoading(true)
    setError(null)
    try {
      // Check balance
      const balanceInfo = await checkBalanceAction(tradingAddress as `0x${string}`)
      setBalance(balanceInfo)

      // Load orders if API key exists
      if (apiKey && address && walletClient) {
        const ordersResult = await getOpenOrdersWithApiKey(
          tradingAddress as `0x${string}`,
          address as `0x${string}`,
          walletClient,
          mode === 'eoa' ? 'eoa' : undefined,
        )
        setOrders(ordersResult.orders)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePlaceOrder() {
    const accountType = mode === 'eoa' ? 'EOA' : 'PROXY'
    console.log(`[${accountType}] Placing order...`, {
      tokenId: orderForm.tokenId,
      price: orderForm.price,
      size: orderForm.size,
      side: orderForm.side,
      mode
    })

    if (!orderForm.tokenId) {
      console.error(`[${accountType}] ❌ Token ID is required`)
      setError('Token ID is required')
      return
    }

    const tradingAddress = mode === 'proxy' && proxyAddress ? proxyAddress : address
    if (!tradingAddress || !address || !walletClient) {
      console.error(`[${accountType}] ❌ Missing required addresses or wallet client`)
      return
    }

    console.log(`[${accountType}] Trading address:`, tradingAddress)
    console.log(`[${accountType}] EOA address:`, address)
    console.log(`[${accountType}] Using ${mode} mode`)

    setLoading(true)
    setError(null)
    try {
      console.log(`[${accountType}] Calling placeOrderWithApiKey...`)
      const result = await placeOrderWithApiKey(
        tradingAddress as `0x${string}`,
        orderForm,
        walletClient,
        mode === 'eoa',
      )
      
      console.log(`[${accountType}] Order result:`, {
        success: result.success,
        orderId: result.orderId
      })
      
      if (result.success) {
        console.log(`[${accountType}] ✅ Order placed successfully:`, result.orderId)
        setError(null)
        // Reset form
        setOrderForm({
          tokenId: '',
          side: Side.BUY,
          price: 0.5,
          size: 1,
          tickSize: '0.01',
          feeRateBps: 0,
          nonce: 0,
        })
        setCommandCenterOpen(false) // Close modal
        // Refresh orders
        await refreshData()
      } else {
        console.error(`[${accountType}] ❌ Failed to place order`)
        setError('Failed to place order')
      }
    } catch (err: any) {
      console.error(`[${accountType}] ❌ Error placing order:`, err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelOrder(order: ApiOrder) {
    if (!apiKey || !address) {
      setError('API key and wallet address required')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await cancelOrderAction(apiKey, order, address as `0x${string}`, mode === 'eoa' ? 'eoa' : undefined)
      await refreshData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelAllOrders() {
    if (!apiKey || orders.length === 0 || !address) return

    const tradingAddress = mode === 'proxy' && proxyAddress ? proxyAddress : address
    if (!tradingAddress) return

    setLoading(true)
    setError(null)
    try {
      await cancelOrdersAction(
        tradingAddress as `0x${string}`,
        apiKey,
        orders,
        address as `0x${string}`,
        mode === 'eoa' ? 'eoa' : undefined,
      )
      await refreshData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-lakers-gold mb-4">
              WALLET NOT CONNECTED
            </h2>
            <p className="text-gray-400">Connect your wallet to enter The King's Court</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black py-4 relative">
      <div className="max-w-[1600px] mx-auto px-4 flex gap-6 mt-14">
        {/* Main Content */}
        <div className="flex-1 transition-all duration-300">
          <HeroSection />

          <ErrorDisplay 
            error={error} 
            eoaAddress={address as `0x${string}` | undefined}
            proxyAddress={proxyAddress as `0x${string}` | undefined}
            requiredAmount={error?.includes('transfer') ? parseFloat(error.match(/transfer ([\d.]+) USDT/)?.[1] || '0') : undefined}
            onTransferComplete={async () => {
              // Refresh balance after transfer
              if (address && walletClient) {
                const tradingAddress = mode === 'proxy' && proxyAddress ? proxyAddress : address
                const balanceInfo = await checkBalanceAction(tradingAddress as `0x${string}`)
                setBalance(balanceInfo)
                setError(null)
              }
            }}
          />

          {/* Two Rows: LAL on top, Frauds on bottom */}
          <div className="space-y-4">
            {/* Top Row: LAL Markets */}
            <div>
              <TrustTheKingCard
                markets={markets}
                orderForm={orderForm}
                setOrderForm={(form) => {
                  setOrderForm(form)
                  if (form.tokenId) {
                    setCommandCenterTheme('lakers-gold')
                    setCommandCenterOpen(true)
                  }
                }}
                onPlaceOrder={handlePlaceOrder}
                apiKey={apiKey}
                loading={loading}
              />
        </div>

            {/* Bottom Row: Fraud Markets */}
            <div>
              <FraudsCardStack
                markets={markets}
                orderForm={orderForm}
                setOrderForm={(form) => {
                  setOrderForm(form)
                  if (form.tokenId) {
                    setCommandCenterTheme('enemy-red')
                    setCommandCenterOpen(true)
                  }
                }}
                onPlaceOrder={handlePlaceOrder}
                apiKey={apiKey}
                loading={loading}
                excludeMarketIds={(() => {
                  // Get LAL market IDs that are shown in TrustTheKingCard (same filtering logic)
                  const lalMarkets = findTeamMarkets(markets, 'LAL')
                  return lalMarkets.filter((market: Market) => {
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
                  }).map(m => m.id)
                })()}
              />
            </div>
          </div>
        </div>

        {/* Standings Sidebar - Always Visible on Right */}
        <div className="w-72 flex-shrink-0">
          <StandingsSidebar
            isOpen={true}
            onClose={() => {}}
            onToggle={() => {}}
          />
        </div>
      </div>

      {/* Command Center Modal */}
      <CommandCenterModal
        isOpen={commandCenterOpen}
        onClose={() => {
          setCommandCenterOpen(false)
          setOrderForm({ ...orderForm, tokenId: '' })
        }}
        orderForm={orderForm}
        setOrderForm={setOrderForm}
        onPlaceOrder={handlePlaceOrder}
        apiKey={apiKey}
        loading={loading}
        theme={commandCenterTheme}
        isConnected={isConnected}
        onApiKeyCreated={async (newApiKey) => {
          setApiKey(newApiKey)
          // Reload API key from storage to ensure consistency
          const key = await getApiKey()
          setApiKey(key)
        }}
      />
    </div>
  )
}
