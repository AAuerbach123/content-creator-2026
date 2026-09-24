import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContentCreator2026',
  description:
    'KI-gestützter Content-Creator für Zeitung, Zeitschrift, Web, Social Media und Kurzvideo.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
