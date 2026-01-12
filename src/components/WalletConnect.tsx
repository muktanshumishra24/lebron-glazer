'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from './Button'

export function WalletConnect() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-24 h-8 bg-gray-200/10 rounded animate-pulse"></div>
      </div>
    )
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="text-sm text-lakers-gold hover:text-lakers-gold/70 transition-colors cursor-pointer font-mono border border-lakers-gold/50 rounded-md px-2 py-1"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    )
  }

  // Filter to only show MetaMask connector
  const metaMaskConnector = connectors.find(
    (connector) => connector.name.toLowerCase().includes('metamask') || connector.id === 'metaMask'
  )

  if (!metaMaskConnector) {
    return (
      <div className="text-sm text-gray-400">
        MetaMask not detected. Please install MetaMask extension.
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        key={metaMaskConnector.uid}
        onClick={() => connect({ connector: metaMaskConnector })}
        variant="primary"
        className="text-sm"
      >
        Connect MetaMask
      </Button>
    </div>
  )
}
