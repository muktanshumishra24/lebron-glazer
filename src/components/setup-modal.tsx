'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useWalletClient } from 'wagmi'
import { checkProxyWallet, createProxyWallet, checkApprovals, approveTokensForEOA, approveTokensForProxy } from '../lib/wallet'
import { checkBalanceAction } from '../lib/actions'
import { createOrLoadApiKey, getApiKey } from '../lib/api'

interface SetupModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

type SetupStep = 'mode' | 'proxy' | 'approvals' | 'balance' | 'apikey-only' | 'complete'

export function SetupModal({ isOpen, onClose, onComplete }: SetupModalProps) {
  const [mounted, setMounted] = useState(false)
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [mode, setMode] = useState<'eoa' | 'scw'>('scw')
  const [step, setStep] = useState<SetupStep>('mode')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proxyAddress, setProxyAddress] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render until mounted to prevent hydration issues
  if (!mounted) return null
  
  if (!isOpen) return null

  async function handleCreateApiKeyOnly() {
    console.log('[API_KEY] Starting API key creation flow...')
    
    if (!address) {
      console.error('[API_KEY] ❌ Wallet address not found')
      setError('Wallet address not found. Please connect your wallet.')
      return
    }

    if (!walletClient) {
      console.error('[API_KEY] ❌ Wallet client not available')
      setError('Wallet client not available. Please ensure your wallet is connected.')
      return
    }

    if (!walletClient.account) {
      console.error('[API_KEY] ❌ Wallet account not found')
      setError('Wallet account not found. Please reconnect your wallet.')
      return
    }

    console.log('[API_KEY] ✅ Wallet connected:', {
      address,
      account: walletClient.account.address,
      chainId: walletClient.chain?.id
    })

    setError(null)
    setLoading(true)
    setStep('apikey-only')

    try {
      setProgress('Creating API key...')
      console.log('[API_KEY] Creating API key for address:', address)
      const result = await createOrLoadApiKey(walletClient, address as `0x${string}`)
      
      console.log('[API_KEY] ✅ API key created successfully:', {
        isNew: result.isNew,
        hasKey: !!result.apiKey?.key,
        hasSecret: !!result.apiKey?.secret
      })
      
      setStep('complete')
      setProgress('API key created successfully!')
      
      setTimeout(() => {
        onComplete()
        onClose()
        // Reset
        setStep('mode')
        setProgress('')
        setLoading(false)
      }, 1500)
    } catch (err: any) {
      console.error('[API_KEY] ❌ Error creating API key:', err)
      const errorMessage = err?.message || err?.toString() || 'Failed to create API key'
      setError(errorMessage)
      setStep('mode')
      setLoading(false)
    }
  }

  async function handleStartSetup() {
    console.log(`[SETUP] Starting ${mode.toUpperCase()} setup flow...`)
    
    if (!address || !walletClient || !walletClient.account) {
      console.error('[SETUP] ❌ Wallet not connected')
      setError('Wallet not connected')
      return
    }

    console.log('[SETUP] ✅ Wallet connected:', {
      address,
      account: walletClient.account.address,
      chainId: walletClient.chain?.id,
      mode
    })

    setError(null)
    setLoading(true)

    try {
      const account = walletClient.account
      const tradingAddress = address as `0x${string}`
      let currentProxyAddress: string | null = null

      if (mode === 'scw') {
        // Step 1: Check/Create Proxy Wallet
        console.log('[PROXY] Step 1: Checking proxy wallet...')
        setStep('proxy')
        setProgress('Checking proxy wallet...')
        
        const proxyResult = await checkProxyWallet(tradingAddress)
        console.log('[PROXY] Proxy wallet check result:', {
          exists: proxyResult.exists,
          address: proxyResult.address
        })
        
        if (proxyResult.exists) {
          console.log('[PROXY] ✅ Proxy wallet already exists:', proxyResult.address)
          currentProxyAddress = proxyResult.address
          setProxyAddress(proxyResult.address)
        } else {
          console.log('[PROXY] Creating new proxy wallet...')
          setProgress('Creating proxy wallet...')
          const createResult = await createProxyWallet(tradingAddress, walletClient, account)
          console.log('[PROXY] ✅ Proxy wallet created:', {
            address: createResult.address,
            txHash: createResult.transactionHash
          })
          currentProxyAddress = createResult.address
          setProxyAddress(createResult.address)
        }
      } else {
        console.log('[EOA] Using EOA mode - no proxy wallet needed')
      }

      // Step 2: Check Approvals
      // For SCW mode, we need to check/approve for the PROXY address, not the EOA
      const approvalAddress = (mode === 'scw' && currentProxyAddress) ? currentProxyAddress : tradingAddress
      console.log(`[${mode.toUpperCase()}] Step 2: Checking approvals for address:`, approvalAddress)
      console.log(`[${mode.toUpperCase()}] Using ${mode === 'scw' ? 'PROXY' : 'EOA'} address for approvals`)
      setStep('approvals')
      setProgress('Checking token approvals...')
      
      const approvalAddressTyped = approvalAddress as `0x${string}`
      const approvalStatus = await checkApprovals(approvalAddressTyped)
      console.log(`[${mode.toUpperCase()}] Approval status:`, {
        needsUSDTForExchange: approvalStatus.needsUSDTForExchange,
        needsUSDTForCTFToken: approvalStatus.needsUSDTForCTFToken,
        needsCTFTokenForExchange: approvalStatus.needsCTFTokenForExchange
      })
      
      if (approvalStatus.needsUSDTForExchange || approvalStatus.needsUSDTForCTFToken || approvalStatus.needsCTFTokenForExchange) {
        console.log(`[${mode.toUpperCase()}] Approving tokens...`)
        setProgress('Approving tokens...')
        if (mode === 'eoa') {
          console.log('[EOA] Executing EOA token approvals...')
          await approveTokensForEOA(approvalAddressTyped, walletClient)
          console.log('[EOA] ✅ Token approvals completed')
        } else {
          // For proxy wallets, use the proxy approval function with the PROXY address
          console.log('[PROXY] Executing proxy wallet token approvals for proxy:', approvalAddressTyped)
          try {
            await approveTokensForProxy(approvalAddressTyped, walletClient)
            console.log('[PROXY] ✅ Token approvals completed')
          } catch (err: any) {
            console.error('[PROXY] ❌ Error approving tokens for proxy:', err)
            // If Safe SDK is required, show a helpful error but continue setup
            if (err.message?.includes('Safe SDK')) {
              console.warn('[PROXY] ⚠️ Proxy wallet approvals require additional setup. Continuing with setup...')
              // Continue setup - approvals can be done later
            } else {
              throw err
            }
          }
        }
      } else {
        console.log(`[${mode.toUpperCase()}] ✅ All approvals already in place`)
      }

      // Step 3: Check Balance
      // For balance, we check the trading address (proxy for SCW, EOA for EOA mode)
      const balanceAddress = (mode === 'scw' && currentProxyAddress) ? currentProxyAddress : tradingAddress
      console.log(`[${mode.toUpperCase()}] Step 3: Checking balance for address:`, balanceAddress)
      setStep('balance')
      setProgress('Checking balance...')
      const balanceResult = await checkBalanceAction(balanceAddress as `0x${string}`)
      console.log(`[${mode.toUpperCase()}] Balance check result:`, {
        balance: balanceResult.balanceFormatted,
        address: balanceAddress
      })

      // Note: API keys expire in 30 seconds, so we don't create them during setup
      // They will be created automatically on-demand when placing orders
      // The handleApiKeyError function will regenerate them if they expire
      console.log(`[${mode.toUpperCase()}] ⚠️ Skipping API key creation - keys expire in 30 seconds`)
      console.log(`[${mode.toUpperCase()}] API keys will be created automatically when placing orders`)

      // Complete
      console.log(`[${mode.toUpperCase()}] ✅ Setup complete!`)
      setStep('complete')
      setProgress('Setup complete!')
      
      setTimeout(() => {
        onComplete()
        onClose()
        // Reset
        setStep('mode')
        setProgress('')
        setProxyAddress(null)
        setLoading(false)
      }, 1500)
    } catch (err: any) {
      console.error(`[${mode.toUpperCase()}] ❌ Setup failed:`, err)
      setError(err.message || 'Setup failed')
    } finally {
      setLoading(false)
    }
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
        className="relative z-10 bg-black border border-lakers-gold/30 rounded-lg p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black tracking-tighter text-lakers-gold">
            Initiate Trade
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>

        {step === "mode" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Select your trading mode:</p>
            <div className="space-y-2">
              <button
                onClick={() => setMode("scw")}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  mode === "scw"
                    ? "border-lakers-gold bg-lakers-gold/10 text-lakers-gold"
                    : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20"
                }`}
              >
                <div className="font-black uppercase text-sm mb-1">
                  Proxy Wallet
                </div>{" "}
                <div className="text-xs text-gray-400">
                  Batched Approvals, Security and Control
                </div>
              </button>
              <button
                onClick={() => setMode("eoa")}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  mode === "eoa"
                    ? "border-lakers-gold bg-lakers-gold/10 text-lakers-gold"
                    : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20"
                }`}
              >
                <div className="font-black uppercase text-sm mb-1">
                  EOA (Direct)
                </div>
                <div className="text-xs text-gray-400">
                  Simple Trades, Your Wallet, tho more clicks!
                </div>
              </button>
            </div>
            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="w-full bg-lakers-gold text-black py-3 rounded-lg font-black uppercase hover:bg-lakers-gold/90 transition-all disabled:opacity-50"
            >
              START SETUP
            </button>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="px-3 text-xs text-gray-500">OR</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleCreateApiKeyOnly()
              }}
              disabled={loading}
              className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-lg font-medium uppercase text-xs hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create API Key Only'}
            </button>
          </div>
        )}

        {(step === "proxy" ||
          step === "approvals" ||
          step === "balance" ||
          step === "apikey-only") && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-lakers-gold border-t-transparent rounded-full animate-spin"></div>
              <div>
                <div className="text-sm font-black uppercase text-lakers-gold">
                  {step === "apikey-only" ? "CREATING API KEY" : step.toUpperCase()}
                </div>
                <div className="text-xs text-gray-400">{progress}</div>
              </div>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-4 text-center">
            <div className="text-3xl">✅</div>
            <div className="text-lg font-black uppercase text-lakers-gold">
              READY TO GLAZE!
            </div>
            <div className="text-xs text-gray-400">All systems initialized</div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-enemy-red/10 border border-enemy-red rounded-lg">
            <div className="text-sm text-enemy-red">{error}</div>
            <button
              onClick={() => {
                setError(null);
                setStep("mode");
              }}
              className="mt-2 text-xs text-enemy-red hover:underline"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof window === 'undefined' || !document.body) return null

  return createPortal(modalContent, document.body)
}
