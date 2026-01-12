'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export function HeroSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative mb-6 h-[30vh] min-h-[30vh] rounded-xl overflow-hidden border border-lakers-gold/30 shadow-2xl shadow-lakers-gold/20">
      {/* Enhanced gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-lakers-purple/20 via-black/50 to-lakers-gold/10"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40"></div>
      
      {/* Animated glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-lakers-gold/5 to-transparent animate-pulse"></div>
      
      <div className="relative z-10 flex items-center justify-center w-full h-full px-6">
        <div className="flex-1 text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter mb-3 drop-shadow-2xl">
            {mounted ? (
              <span className="bg-gradient-to-r from-lakers-gold via-white to-lakers-gold bg-clip-text text-transparent inline-block animate-pulse">
                RETAKE THE THRONE
              </span>
            ) : (
              <span className="text-lakers-gold inline-block">
                RETAKE THE THRONE
              </span>
            )}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 uppercase tracking-widest font-bold drop-shadow-lg">The King's Court</p>
        </div>
        <div className="flex-shrink-0 ml-8">
          <div className="relative">
            <div className="absolute inset-0 bg-lakers-gold/20 rounded-full blur-xl animate-pulse"></div>
            <Image 
              src="/leb.png" 
              alt="LeBron James" 
              width={140}
              height={140}
              className="relative w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  )
}
