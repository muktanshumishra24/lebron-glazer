'use client'

import React from 'react'
import { StatusCard } from './StatusCard'

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
