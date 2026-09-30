import type { Metadata } from 'next'
import './globals.css'
import { HandbuchProvider } from '@/components/HandbuchProvider'
import { SpracheProvider } from '@/components/SpracheProvider'
import TabGuardBanner from '@/components/TabGuardBanner'

export const metadata: Metadata = {
  title: 'ContentCreator2026',
  description:
    'KI-gestützter Content-Creator für Zeitung, Zeitschrift, Web, Social Media und Kurzvideo.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <SpracheProvider>
          <HandbuchProvider>
            <TabGuardBanner />
            {children}
          </HandbuchProvider>
        </SpracheProvider>
      </body>
    </html>
  )
}
