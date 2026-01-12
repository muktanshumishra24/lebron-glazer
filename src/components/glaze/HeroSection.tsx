'use client'

import Image from 'next/image'

export function HeroSection() {
  return (
    <div className="relative mb-12 py-16 rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-lakers-purple/20 to-transparent"></div>
      <div className="relative z-10 flex items-center justify-center gap-8">
        <div className="flex-1 text-center">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-4">
            <span className="bg-gradient-to-r from-lakers-gold via-white to-lakers-gold bg-clip-text text-transparent">
              RETAKE THE THRONE
            </span>
          </h1>
          <p className="text-xl text-gray-400 uppercase tracking-wider">The King's Court</p>
        </div>
        <div className="flex-shrink-0">
          <Image 
            src="/leb.png" 
            alt="LeBron James" 
            width={192}
            height={192}
            className="w-32 h-32 md:w-48 md:h-48 object-contain animate-pulse"
            priority
          />
        </div>
      </div>
    </div>
  )
}
