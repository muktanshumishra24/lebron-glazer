'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import {
  checkProxyWalletAction,
  checkBalanceAction,
  cancelOrderAction,
  cancelOrdersAction,
  getApiKeyAction,
} from '../actions'
import { getOpenOrdersWithApiKey } from '../../lib/orders'
import type { ApiOrder } from '../../lib/orders'

export default function BattlefieldPage() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [proxyAddress, setProxyAddress] = useState<string | null>(null)
  const [mode, setMode] = useState<'proxy' | 'eoa'>('proxy')
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<any>(null)

  useEffect(() => {
    if (isConnected && address && walletClient) {
      initialize()
    }
  }, [isConnected, address, walletClient])

  async function initialize() {
    if (!address) return
    
    try {
      // Check for proxy
      const proxyResult = await checkProxyWalletAction(address as `0x${string}`)
      if (proxyResult.exists) {
        setProxyAddress(proxyResult.address)
        setMode('proxy')
      } else {
        setMode('eoa')
      }

      // Load API key
      const key = await getApiKeyAction()
      setApiKey(key)

      // Load orders
      await refreshOrders()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function refreshOrders() {
    if (!address || !walletClient || !apiKey) return

    try {
      const tradingAddress = mode === 'proxy' && proxyAddress ? proxyAddress : address
      if (!tradingAddress) return

      const ordersResult = await getOpenOrdersWithApiKey(
        tradingAddress as `0x${string}`,
        address as `0x${string}`,
        walletClient,
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

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="my-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
            <span className="bg-gradient-to-r from-lakers-gold via-white to-lakers-gold bg-clip-text text-transparent">
              THE BATTLEFIELD
            </span>
          </h1>
          <p className="text-gray-400 uppercase tracking-wider">Active Positions & Open Orders</p>
        </div>

        {/* Orders List */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-lakers-gold">
              ACTIVE POSITIONS
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
            <p className="text-gray-400 text-sm uppercase tracking-wider">No active positions</p>
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
