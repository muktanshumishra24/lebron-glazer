'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import {
  checkProxyWalletAction,
  checkBalanceAction,
  cancelOrderAction,
  cancelOrdersAction,
  getApiKeyAction,
  getPositionsAction,
  getPnLAction,
  fetchAllMarketsAction,
  getOpenOrdersAction,
} from '../../lib/actions'
import { getOpenOrdersWithApiKey } from '../../lib/orders'
import { createOrLoadApiKey } from '../../lib/api'
import type { ApiOrder, Position, Market, PnLData } from '../../types'

export default function BattlefieldPage() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [proxyAddress, setProxyAddress] = useState<string | null>(null)
  const [mode, setMode] = useState<'proxy' | 'eoa'>('proxy')
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [positionFilter, setPositionFilter] = useState<'active' | 'resolved'>('active')
  const [pnlData, setPnlData] = useState<PnLData | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && isConnected && address && walletClient) {
      initialize()
    }
  }, [isConnected, address, walletClient, mounted])

  // Poll for updates every 15 seconds
  useEffect(() => {
    if (!mounted || !isConnected || !address || !apiKey) return

    const interval = setInterval(() => {
      refreshData()
    }, 15000)

    return () => clearInterval(interval)
  }, [mounted, isConnected, address, apiKey, markets]) // Added markets dependency

  async function initialize() {
    if (!address || !walletClient) return
    
    console.log('=== INITIALIZE CALLED ===');
    console.log('User Address:', address);
    
    try {
      // Check for proxy
      const proxyResult = await checkProxyWalletAction(address as `0x${string}`)
      
      let detectedProxyAddress: string | null = null;
      let detectedMode: 'proxy' | 'eoa' = 'eoa';
      
      if (proxyResult.exists) {
        detectedProxyAddress = proxyResult.address;
        detectedMode = 'proxy';
        setProxyAddress(proxyResult.address)
        setMode('proxy')
      } else {
        setMode('eoa')
      }

      // Load or create API key automatically (client-side to avoid passing walletClient to server)
      let key = await getApiKeyAction();
      
      if (!key && walletClient) {
        try {
          // Call createOrLoadApiKey directly on client side
          const result = await createOrLoadApiKey(walletClient, address as `0x${string}`, false);
          key = result.apiKey;
        } catch (err) {
          console.error('Failed to create API key:', err);
        }
      }
      
      setApiKey(key)

      // Load markets (fetch ALL active and inactive to support resolved positions)
      const [activeMarkets, inactiveMarkets] = await Promise.all([
        fetchAllMarketsAction(true),
        fetchAllMarketsAction(false)
      ])
      
      // Deduplicate by ID just in case
      const marketMap = new Map<string, Market>()
      activeMarkets.forEach(m => marketMap.set(m.id, m))
      inactiveMarkets.forEach(m => marketMap.set(m.id, m))
      
      const allMarkets = Array.from(marketMap.values())
      setMarkets(allMarkets)

      // Load data - pass the detected proxy address directly to avoid state timing issues
      await refreshData(allMarkets, key, detectedProxyAddress, detectedMode)
    } catch (err: any) {
      console.error('Initialize error:', err);
      setError(err.message)
    }
  }

  async function refreshData(currentMarkets?: Market[], currentApiKey?: any, currentProxyAddress?: string | null, currentMode?: 'proxy' | 'eoa') {
    if (!address || !walletClient) return
    
    // Use passed parameters if available, otherwise fall back to state
    const useApiKey = currentApiKey || apiKey;
    const useProxyAddress = currentProxyAddress !== undefined ? currentProxyAddress : proxyAddress;
    const useMode = currentMode || mode;
    
    // Refresh orders
    if (useApiKey) {
      await refreshOrders()
    }

    // Refresh positions
    try {
      const marketsToUse = currentMarkets || markets
      
      // We need markets to map IDs, but if empty we might still want to try? 
      // Actually getPositions requires markets for metadata.
      if (marketsToUse.length === 0) return

      const tradingAddress = useMode === 'proxy' && useProxyAddress ? useProxyAddress : address
      
      if (useApiKey) {
          const pos = await getPositionsAction(tradingAddress as `0x${string}`, useApiKey)
          setPositions(pos)
          
          // Fetch PnL data
          try {
            const pnl = await getPnLAction(tradingAddress as `0x${string}`, useApiKey)
            setPnlData(pnl)
          } catch (err: any) {
            console.error('Failed to load PnL:', err)
          }
      }
    } catch (err: any) {
      console.error('Failed to load positions:', err)
    }
  }

  async function refreshOrders() {
    if (!address || !walletClient || !apiKey) return

    try {
      const tradingAddress = mode === 'proxy' && proxyAddress ? proxyAddress : address
      if (!tradingAddress) return

      // Use server action to avoid CORS issues
      const ordersResult = await getOpenOrdersAction(
        tradingAddress as `0x${string}`,
        apiKey,
        address as `0x${string}`,
        mode === 'eoa' ? 'eoa' : undefined,
      )
      setOrders(ordersResult.orders)
    } catch (err: any) {
      console.error('Failed to load orders:', err)
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
      await refreshOrders()
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
      await refreshOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Calculate generic PnL
  const calculatePnL = (pos: Position) => {
    // Current Value - Cost Basis
    // Cost Basis = Balance * Entry Price (mapped to 'price' in Position)
    // Value = Mapped to 'value' in Position
    const costBasis = pos.balance * pos.price;
    const currentValue = pos.value;
    const pnl = currentValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    return { pnl, pnlPercent };
  }

  // Filter positions
  // We assume a position is 'resolved' if the market is not active or if the value is 0 but balance > 0 (for losers)?
  // Actually, checking market.active is safer.
  const filteredPositions = positions.filter(pos => {
      const market = markets.find(m => m.id === pos.marketId);
      const isMarketActive = market ? market.active : true; // Default to true if unknown
      
      if (positionFilter === 'active') {
          return isMarketActive;
      } else {
          return !isMarketActive;
      }
  });

  if (!mounted) return null

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-lakers-gold mb-4">
              WALLET NOT CONNECTED
            </h2>
            <p className="text-gray-400">Connect your wallet to enter The Battlefield</p>
          </div>
        </div>
      </div>
    )
  }

  // Use API PnL data if available, otherwise fall back to calculated PnL
  const displayPnL = pnlData?.totalPnl ?? positions.reduce((acc, pos) => acc + calculatePnL(pos).pnl, 0);

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="my-10">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 text-lakers-gold">
              THE BATTLEFIELD
            </h1>
          <p className="text-gray-400 uppercase tracking-wider">Portfolio, Active Positions & Open Orders</p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Portfolio Value</h3>
            <p className="text-4xl font-black text-white font-mono">
              ${positions.reduce((acc, p) => acc + (p.value), 0).toFixed(2)}
              <span className="text-sm text-gray-500 ml-2">(Est.)</span>
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 flex flex-col justify-center">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total PnL</h3>
            <p className={`text-4xl font-black font-mono ${displayPnL >= 0 ? 'text-green-500' : 'text-enemy-red'}`}>
              {displayPnL >= 0 ? '+' : ''}${Math.abs(displayPnL).toFixed(2)}
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Active Positions</h3>
            <p className="text-4xl font-black text-lakers-gold font-mono">
                {positions.filter(p => markets.find(m => m.id === p.marketId)?.active).length}
            </p>
          </div>
        </div>

        {/* Positions List */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-2xl font-black uppercase tracking-tighter text-lakers-gold">
                YOUR HOLDINGS
             </h2>
             <div className="flex bg-white/10 rounded p-1">
                 <button
                    onClick={() => setPositionFilter('active')}
                    className={`px-4 py-1 rounded text-xs font-bold uppercase transition-all ${
                        positionFilter === 'active' 
                        ? 'bg-lakers-gold text-black' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                 >
                    Active
                 </button>
                 <button
                    onClick={() => setPositionFilter('resolved')}
                    className={`px-4 py-1 rounded text-xs font-bold uppercase transition-all ${
                        positionFilter === 'resolved' 
                        ? 'bg-lakers-gold text-black' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                 >
                    Resolved
                 </button>
             </div>
          </div>
          
          {filteredPositions.length === 0 ? (
            <p className="text-gray-400 text-sm uppercase tracking-wider">No {positionFilter} positions</p>
          ) : (
            <div className="space-y-3">
               {filteredPositions.map((pos) => {
                 const { pnl, pnlPercent } = calculatePnL(pos);
                 const market = markets.find(m => m.id === pos.marketId);
                 
                 return (
                <div key={pos.id} className="bg-black/40 border border-white/10 rounded-lg p-4 hover:border-lakers-gold/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black uppercase px-2 py-1 bg-white/10 rounded text-white">
                          {pos.outcome}
                        </span>
                        <span className="text-sm font-bold text-gray-300">
                           {market?.question || 'Unknown Market'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono flex gap-4">
                        <span>ID: {pos.tokenId.slice(0, 8)}...</span>
                        <span>Avg Price: ${pos.price.toFixed(3)}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-6">
                       <div>
                          <div className={`text-sm font-mono font-bold ${pnl >= 0 ? 'text-green-500' : 'text-enemy-red'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                          </div>
                          <div className={`text-xs ${pnl >= 0 ? 'text-green-500' : 'text-enemy-red'}`}>
                            {pnlPercent.toFixed(1)}%
                          </div>
                      </div>
                      <div>
                          <div className="text-xl font-mono font-bold text-white">
                            {pos.balance.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 uppercase">Shares</div>
                      </div>
                    </div>
                  </div>
                </div>
               )})} 
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
              OPEN ORDERS
            </h2>
            {orders.length > 0 && (
              <button
                onClick={handleCancelAllOrders}
                disabled={loading}
                className="bg-enemy-red text-white px-4 py-2 rounded-lg font-black uppercase hover:bg-enemy-red/80 hover:scale-105 transition-all disabled:opacity-50"
              >
                CANCEL ALL
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-enemy-red/20 border border-enemy-red rounded-lg">
              <p className="text-enemy-red text-sm">{error}</p>
            </div>
          )}

          {orders.length === 0 ? (
            <p className="text-gray-400 text-sm uppercase tracking-wider">No active orders</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.orderId}
                  className="bg-black/40 border border-white/10 rounded-lg p-4 hover:border-lakers-gold/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className={`text-xs font-black uppercase px-3 py-1 rounded ${
                          order.side === 'BUY' 
                            ? 'bg-lakers-gold/20 text-lakers-gold border border-lakers-gold/50' 
                            : 'bg-enemy-red/20 text-enemy-red border border-enemy-red/50'
                        }`}>
                          {order.side}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          ID: {String(order.orderId).slice(0, 8)}...
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          Token: {order.tokenId?.slice(0, 12)}...
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">Price:</span>
                          <span className="text-lakers-gold font-mono ml-2">{order.price}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Size:</span>
                          <span className="text-white font-mono ml-2">{order.origQty}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Filled:</span>
                          <span className="text-gray-400 font-mono ml-2">{order.executedQty}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelOrder(order)}
                      disabled={loading}
                      className="bg-enemy-red/20 text-enemy-red border border-enemy-red/50 px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-enemy-red/30 hover:scale-105 transition-all disabled:opacity-50"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
