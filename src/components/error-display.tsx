'use client'

import { useState } from 'react'
import { useWalletClient } from 'wagmi'
import { transferUSDT } from '../lib/wallet'
import { getPublicClient } from '../config/clients'

interface ErrorDisplayProps {
  error: string | null
  eoaAddress?: `0x${string}`
  proxyAddress?: `0x${string}`
  requiredAmount?: number
  onTransferComplete?: () => void
}

export function ErrorDisplay({ 
  error, 
  eoaAddress, 
  proxyAddress, 
  requiredAmount,
  onTransferComplete 
}: ErrorDisplayProps) {
  const { data: walletClient } = useWalletClient()
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)

  if (!error) return null

  // Check if error mentions proxy wallet and transfer needed
  const needsTransfer = error.includes('proxy wallet') && eoaAddress && proxyAddress && requiredAmount

  const handleTransfer = async () => {
    if (!walletClient || !walletClient.account || !eoaAddress || !proxyAddress || !requiredAmount) {
      return
    }

    setTransferring(true)
    setTransferError(null)

    try {
      console.log(`[TRANSFER] Transferring ${requiredAmount} USDT from ${eoaAddress} to ${proxyAddress}`)
      const { hash } = await transferUSDT(
        eoaAddress,
        proxyAddress,
        requiredAmount,
        walletClient,
        walletClient.account
      )

      console.log(`[TRANSFER] ✅ Transfer transaction submitted: ${hash}`)
      
      // Wait for transaction confirmation
      const publicClient = getPublicClient()
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
        console.log(`[TRANSFER] ✅ Transfer confirmed`)
      }

      if (onTransferComplete) {
        onTransferComplete()
      }
    } catch (err: any) {
      console.error('[TRANSFER] ❌ Transfer failed:', err)
      setTransferError(err.message || 'Transfer failed')
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div className="mt-6 bg-enemy-red/10 border-2 border-enemy-red rounded-lg p-4">
      <h3 className="text-lg font-black uppercase tracking-tighter text-enemy-red mb-2">
        REFEREES ARE REVIEWING...
      </h3>
      <p className="text-gray-300 text-sm mb-3">{error}</p>
      
      {needsTransfer && walletClient && (
        <div className="mt-4 pt-4 border-t border-enemy-red/30">
          <p className="text-gray-300 text-sm mb-3">
            Transfer {requiredAmount?.toFixed(4)} USDT from your main wallet to your proxy wallet to continue.
          </p>
          <button
            onClick={handleTransfer}
            disabled={transferring}
            className="bg-lakers-gold text-black px-4 py-2 rounded-lg text-sm font-bold uppercase hover:bg-lakers-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {transferring ? 'TRANSFERRING...' : 'TRANSFER USDT TO PROXY'}
          </button>
          {transferError && (
            <p className="text-enemy-red text-xs mt-2">{transferError}</p>
          )}
        </div>
      )}
    </div>
  )
}
