'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import { WalletConnect } from './wallet'
import { SetupModal } from './setup-modal'
import { checkBalanceAction, checkProxyWalletAction } from '../lib/actions'
import { getLALStanding } from '../config/nba-standings'

export function Navigation() {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const [balances, setBalances] = useState<{ eoa: number | null, proxy: number | null }>({ eoa: null, proxy: null })
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [setupModalOpen, setSetupModalOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && isConnected && address) {
      loadBalances()
    } else {
      setBalances({ eoa: null, proxy: null })
    }
  }, [mounted, isConnected, address])

  async function loadBalances() {
    if (!address) return
    setBalanceLoading(true)
    try {
      // 1. Fetch EOA Balance
      const eoaInfo = await checkBalanceAction(address as `0x${string}`)
      
      // 2. Check for Proxy and Fetch Proxy Balance
      let proxyBalance = null
      const proxyResult = await checkProxyWalletAction(address as `0x${string}`)
      if (proxyResult.exists && proxyResult.address) {
        const proxyInfo = await checkBalanceAction(proxyResult.address as `0x${string}`)
        proxyBalance = proxyInfo.balanceFormatted
      }

      setBalances({
        eoa: eoaInfo.balanceFormatted,
        proxy: proxyBalance
      })
    } catch (err) {
      console.error('Failed to load balances:', err)
    } finally {
      setBalanceLoading(false)
    }
  }

  const lalRank = getLALStanding()?.rank

  const navItems = [
    { href: '/glaze', label: 'Quick Glaze' },
    { href: '/king-crowd', label: 'King & Crowd' },
    { href: '/battlefield', label: 'Battlefield' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/75 backdrop-blur-sm border-b border-white/10" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="hidden sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors
                    ${
                      pathname === item.href
                        ? 'text-lakers-gold'
                        : 'text-white hover:text-lakers-gold/70'
                    }
                  `}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Low Profile Stats - Only render after mount to prevent hydration issues */}
            {mounted && isConnected && (
              <div className="hidden md:flex items-center gap-4 text-xs text-gray-400">
                {/* EOA Balance */}
                {balances.eoa !== null && !balanceLoading && (
                  <div className="flex items-center gap-1" title="EOA Balance">
                    <span className="text-gray-500">EOA:</span>
                    <span className="text-white/80 font-mono">
                      {balances.eoa.toFixed(2)}
                    </span>
                    <span className="text-gray-600 text-[10px]">USDT</span>
                  </div>
                )}
                
                {/* Proxy Balance */}
                {balances.proxy !== null && !balanceLoading && (
                  <div className="flex items-center gap-1" title="Proxy Wallet Balance">
                    <span className="text-gray-500">PROXY:</span>
                    <span className="text-lakers-gold/90 font-mono">
                      {balances.proxy.toFixed(2)}
                    </span>
                    <span className="text-gray-600 text-[10px]">USDT</span>
                  </div>
                )}

                {lalRank && (
                  <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                    <span className="text-gray-500">LAL:</span>
                    <span className="text-lakers-gold/70 font-mono">#{lalRank}</span>
                  </div>
                )}
              </div>
            )}
            {mounted && isConnected && (
              <button
                onClick={() => setSetupModalOpen(true)}
                className="px-4 py-2 text-xs font-medium uppercase tracking-wide
                  bg-lakers-gold text-black rounded
                  hover:bg-lakers-gold/90
                  active:bg-lakers-gold/80
                  transition-colors duration-150"
              >
                TRADE
              </button>
            )}
            <WalletConnect />
          </div>
        </div>
      </div>
      <SetupModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        onComplete={() => {
          // Refresh balance after setup
          if (address) {
            loadBalances()
          }
        }}
      />
    </nav>
  )
}
