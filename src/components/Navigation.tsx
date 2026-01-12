'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount } from 'wagmi'
import { WalletConnect } from './WalletConnect'
import { SetupModal } from './SetupModal'
import { checkBalanceAction } from '../app/actions'
import { getLALStanding } from '../config/nba-standings'

export function Navigation() {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const [balance, setBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [setupModalOpen, setSetupModalOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7244/ingest/aaa7f80b-2477-4b58-bbd9-5c137396a9f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Navigation.tsx:20',message:'Component mounted - client side',data:{mounted:true,isConnected,hasAddress:!!address},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    }
    // #endregion
  }, [])

  useEffect(() => {
    if (mounted && isConnected && address) {
      loadBalance()
    } else {
      setBalance(null)
    }
  }, [mounted, isConnected, address])

  async function loadBalance() {
    if (!address) return
    setBalanceLoading(true)
    try {
      const balanceInfo = await checkBalanceAction(address as `0x${string}`)
      setBalance(balanceInfo.balanceFormatted)
    } catch (err) {
      // Silently fail - don't show errors in header
      console.error('Failed to load balance:', err)
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
                {balance !== null && !balanceLoading && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">USDT:</span>
                    <span className="text-lakers-gold/70 font-mono">
                      {balance.toFixed(2)}
                    </span>
                  </div>
                )}
                {lalRank && (
                  <div className="flex items-center gap-1">
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
            loadBalance()
          }
        }}
      />
    </nav>
  )
}
