'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from './ui'

// --- StatusCard ---

interface StatusCardProps {
  title: string
  status: 'success' | 'warning' | 'error' | 'loading'
  message?: string
  children?: React.ReactNode
  className?: string
}

export function StatusCard({
  title,
  status,
  message,
  children,
  className = '',
}: StatusCardProps) {
  const statusColors = {
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    loading: 'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <div
      className={`
        p-4 rounded-lg border
        ${statusColors[status]}
        ${className}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold">{title}</h3>
      </div>
      {message && <p className="text-sm mb-2 opacity-90">{message}</p>}
      {children}
    </div>
  )
}

// --- WalletConnect ---

export function WalletConnect() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

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

// --- WalletInfo ---

interface WalletInfoProps {
  address: string
  network: string
  chainId: number
  mode: 'proxy' | 'eoa'
  proxyAddress?: string
}

export function WalletInfo({
  address,
  network,
  chainId,
  mode,
  proxyAddress,
}: WalletInfoProps) {
  return (
    <div className="space-y-4">
      <StatusCard
        title="Wallet Connected"
        status="success"
        message={`Connected to ${network} (Chain ID: ${chainId})`}
      >
        <div className="mt-2 space-y-1 text-sm">
          <div>
            <span className="font-medium">EOA Address:</span>{' '}
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              {address}
            </code>
          </div>
          <div>
            <span className="font-medium">Mode:</span>{' '}
            <span className="capitalize">{mode}</span>
          </div>
          {mode === 'proxy' && proxyAddress && (
            <div>
              <span className="font-medium">Proxy Address:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {proxyAddress}
              </code>
            </div>
          )}
        </div>
      </StatusCard>
    </div>
  )
}
