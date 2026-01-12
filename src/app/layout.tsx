import type { Metadata } from 'next'
import './globals.css'
import { Navigation } from '../components/Navigation'
import { Providers } from '../lib/providers'

export const metadata: Metadata = {
  title: 'Delusio!',
  description: 'Betting on Delusions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  )
}
