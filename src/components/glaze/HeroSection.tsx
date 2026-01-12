'use client'

import Image from 'next/image'

export function HeroSection() {
  return (
    <div className="relative mb-4 py-4 rounded-lg overflow-hidden border border-lakers-gold/20">
      <div className="absolute inset-0 bg-gradient-to-b from-lakers-purple/10 to-transparent"></div>
      <div className="relative z-10 flex items-center justify-center gap-4">
        <div className="flex-1 text-center">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-1">
            <span className="bg-gradient-to-r from-lakers-gold via-white to-lakers-gold bg-clip-text text-transparent">
              RETAKE THE THRONE
            </span>
          </h1>
          <p className="text-sm text-gray-400 uppercase tracking-wider">The King's Court</p>
        </div>
        <div className="flex-shrink-0">
          <Image 
            src="/leb.png" 
            alt="LeBron James" 
            width={80}
            height={80}
            className="w-16 h-16 md:w-20 md:h-20 object-contain"
            priority
          />
        </div>
      </div>
    </div>
  )
}
