'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useConnect, useAccount, useWalletClient } from 'wagmi'
import { createOrLoadApiKey, getApiKey } from '../../lib/api-key'
import type { PlaceOrderParams } from '../../lib/orders'

interface CommandCenterModalProps {
  isOpen: boolean
  onClose: () => void
  orderForm: PlaceOrderParams
  setOrderForm: (form: PlaceOrderParams) => void
  onPlaceOrder: () => void
  apiKey: any
  loading: boolean
  theme: 'enemy-red' | 'lakers-gold'
  isConnected: boolean
  onApiKeyCreated?: (apiKey: any) => void
}

export function CommandCenterModal({
  isOpen,
  onClose,
  orderForm,
  setOrderForm,
  onPlaceOrder,
  apiKey,
  loading,
  theme,
  isConnected,
  onApiKeyCreated,
}: CommandCenterModalProps) {
  const [mounted, setMounted] = useState(false)
  const [apiKeyLoading, setApiKeyLoading] = useState(false)
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)
  const { connectors, connect } = useConnect()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check for existing API key when modal opens
  useEffect(() => {
    if (isOpen && isConnected && !apiKey) {
      const checkApiKey = async () => {
        const existingKey = await getApiKey()
        if (existingKey && onApiKeyCreated) {
          console.log('[API_KEY] Found existing API key in modal, updating parent state')
          onApiKeyCreated(existingKey)
        }
      }
      checkApiKey()
    }
  }, [isOpen, isConnected, apiKey, onApiKeyCreated])

  // Find MetaMask connector
  const metaMaskConnector = connectors.find(
    (connector) => connector.name.toLowerCase().includes('metamask') || connector.id === 'metaMask'
  )

  const handleConnectWallet = () => {
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector })
    }
  }

  if (!mounted) return null
  if (!isOpen || !orderForm.tokenId) return null

  const borderColor = theme === 'enemy-red' ? 'border-enemy-red/40' : 'border-lakers-gold/30'
  const textColor = theme === 'enemy-red' ? 'text-enemy-red' : 'text-lakers-gold'
  const bgColor = theme === 'enemy-red' ? 'bg-enemy-red' : 'bg-lakers-gold'
  const inputBorderColor = theme === 'enemy-red' ? 'border-enemy-red/50 focus:border-enemy-red' : 'border-lakers-gold/50 focus:border-lakers-gold'
  const inputBgColor = theme === 'enemy-red' ? 'bg-black/40 focus:bg-black/60' : 'bg-black/40 focus:bg-black/60'
  const inputTextColor = theme === 'enemy-red' ? 'text-white placeholder:text-gray-500' : 'text-lakers-gold placeholder:text-gray-500'
  const labelColor = theme === 'enemy-red' ? 'text-gray-300' : 'text-gray-300'

  const handleCreateApiKey = async () => {
    console.log('[API_KEY] Creating API key from CommandCenterModal...')
    
    if (!address || !walletClient || !walletClient.account) {
      console.error('[API_KEY] ❌ Wallet not connected')
      setApiKeyError('Wallet not connected')
      return
    }

    console.log('[API_KEY] ✅ Wallet connected:', {
      address,
      account: walletClient.account.address
    })

    setApiKeyLoading(true)
    setApiKeyError(null)

    try {
      console.log('[API_KEY] Calling createOrLoadApiKey...')
      const result = await createOrLoadApiKey(walletClient, address as `0x${string}`)
      console.log('[API_KEY] ✅ API key created:', {
        isNew: result.isNew,
        hasKey: !!result.apiKey?.key
      })
      
      if (onApiKeyCreated) {
        onApiKeyCreated(result.apiKey)
      }
    } catch (err: any) {
      console.error('[API_KEY] ❌ Error creating API key:', err)
      setApiKeyError(err.message || 'Failed to create API key')
    } finally {
      setApiKeyLoading(false)
    }
  }

  const handlePlaceOrder = () => {
    onPlaceOrder()
    onClose()
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative z-10 bg-black border-2 ${borderColor} rounded-lg p-6 w-full max-w-md shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h3 className={`text-lg font-black uppercase ${textColor} mb-1`}>
            Quick Bet         
             </h3>
          <p className={`text-xs ${textColor}/70`}>LEBRON'S SIDE (BUY)</p>
        </div>

        {/* Wallet Connection Prompt */}
        {!isConnected && (
          <div className="mb-6 p-4 bg-black/60 border border-white/10 rounded-lg">
            <p className="text-sm text-gray-300 mb-3 text-center">
              Connect your wallet to place an order
            </p>
            {metaMaskConnector ? (
              <button
                onClick={handleConnectWallet}
                className={`w-full py-2.5 px-4 rounded font-medium uppercase text-xs transition-colors ${
                  theme === 'enemy-red'
                    ? 'bg-enemy-red text-white hover:bg-enemy-red/90'
                    : 'bg-lakers-gold text-black hover:bg-lakers-gold/90'
                }`}
              >
                Connect MetaMask
              </button>
            ) : (
              <p className="text-xs text-gray-500 text-center">
                MetaMask not detected. Please install MetaMask extension.
              </p>
            )}
          </div>
        )}

        {/* API Key Setup */}
        {isConnected && !apiKey && (
          <div className="space-y-4">
            <div className="p-4 bg-black/60 border border-white/10 rounded-lg">
              <p className="text-sm text-gray-300 mb-3 text-center">
                API key required to place orders
              </p>
              {apiKeyError && (
                <div className="mb-3 p-2 bg-enemy-red/10 border border-enemy-red/30 rounded text-xs text-enemy-red text-center">
                  {apiKeyError}
                </div>
              )}
              <button
                onClick={handleCreateApiKey}
                disabled={apiKeyLoading}
                className={`w-full py-2.5 px-4 rounded font-medium uppercase text-xs transition-colors ${
                  apiKeyLoading
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : theme === 'enemy-red'
                    ? 'bg-enemy-red text-white hover:bg-enemy-red/90'
                    : 'bg-lakers-gold text-black hover:bg-lakers-gold/90'
                }`}
              >
                {apiKeyLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    Creating API Key...
                  </span>
                ) : (
                  'Create API Key'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {isConnected && apiKey && (
          <div className="space-y-4">
          <div className="w-full">
            <label className={`block text-xs font-medium ${labelColor} mb-1.5 uppercase tracking-wide`}>
              Price
            </label>
            <input
              type="text"
              value={orderForm.price.toString()}
              onChange={(e) => {
                const value = e.target.value
                if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                  setOrderForm({
                    ...orderForm,
                    price: value === '' ? 0 : parseFloat(value) || 0,
                  })
                }
              }}
              className={`
                w-full px-4 py-2.5 rounded-lg border-2 transition-all
                ${inputBgColor} ${inputBorderColor} ${inputTextColor}
                focus:outline-none focus:ring-2 focus:ring-offset-0
                ${theme === 'enemy-red' ? 'focus:ring-enemy-red/50' : 'focus:ring-lakers-gold/50'}
                font-mono text-sm
              `}
              placeholder="0.00"
            />
          </div>
          <div className="w-full">
            <label className={`block text-xs font-medium ${labelColor} mb-1.5 uppercase tracking-wide`}>
              Size
            </label>
            <input
              type="text"
              value={orderForm.size.toString()}
              onChange={(e) => {
                const value = e.target.value
                if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                  setOrderForm({
                    ...orderForm,
                    size: value === '' ? 0 : parseFloat(value) || 0,
                  })
                }
              }}
              className={`
                w-full px-4 py-2.5 rounded-lg border-2 transition-all
                ${inputBgColor} ${inputBorderColor} ${inputTextColor}
                focus:outline-none focus:ring-2 focus:ring-offset-0
                ${theme === 'enemy-red' ? 'focus:ring-enemy-red/50' : 'focus:ring-lakers-gold/50'}
                font-mono text-sm
              `}
              placeholder="0"
            />
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={!apiKey || !orderForm.tokenId || loading}
            className={`w-full py-2.5 px-4 rounded font-medium uppercase text-xs transition-colors ${
              !apiKey || !orderForm.tokenId || loading
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : theme === 'enemy-red'
                ? 'bg-enemy-red text-white hover:bg-enemy-red/90'
                : 'bg-lakers-gold text-black hover:bg-lakers-gold/90'
            }`}
          >
            {loading ? 'CALCULATING...' : 'EXECUTE ORDER'}
          </button>
          
          {/* Disabled state message */}
          {!orderForm.tokenId && !loading && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Select a market to place an order.
            </p>
          )}
        </div>
        )}
      </div>
    </div>
  )

  if (typeof window === 'undefined' || !document.body) return null

  return createPortal(modalContent, document.body)
}
