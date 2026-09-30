'use client'

import Link from 'next/link'
import KostenUebersicht from '@/components/KostenUebersicht'
import PerformanceCheck from '@/components/PerformanceCheck'
import SpracheUmschalter from '@/components/SpracheUmschalter'
import { useSprache } from '@/components/SpracheProvider'

export default function UebersichtSeite() {
  const { sprache } = useSprache()
  return (
    <div style={{ minHeight: '100dvh', background: '#0b0b0f', color: '#f5f5f7', fontFamily: 'ui-sans-serif, system-ui, -apple-system, Roboto, sans-serif' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link href="/" style={{ color: '#f5f5f7', textDecoration: 'none', fontSize: 13 }}>
          ← ContentCreator2026
        </Link>
        <SpracheUmschalter />
      </header>
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={{ fontSize: 26, margin: '0 0 20px' }}>{sprache === 'de' ? 'Übersicht' : 'Overview'}</h1>
        <KostenUebersicht />
        <PerformanceCheck />
      </main>
    </div>
  )
}
