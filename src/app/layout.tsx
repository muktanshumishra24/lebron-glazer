import type { Metadata } from 'next'
import './globals.css'
import { Navigation } from '../components/navigation'
import { Providers } from '../lib/providers'

export const metadata: Metadata = {
  title: 'Delusio!',
  description: 'Betting on Delusions',
  icons: {
    icon: '/leb.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  )
}
