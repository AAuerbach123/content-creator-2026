'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import HandbuchKnopf from '@/components/HandbuchKnopf'
import SpracheUmschalter from '@/components/SpracheUmschalter'
import { useSprache } from '@/components/SpracheProvider'
import { katalog } from '@/lib/serie/spiele'
import { MONATE } from '@/lib/serie/spiele/kalender'

// Pfade zu kleinen Musterbildern (vorhanden aus Phase 5 unter public/praesentation/)
const BILDER: Record<string, string> = {
  'aus2mach1': '/praesentation/aus2mach1.jpg',
  'fehlerjagd': '/praesentation/fehler_b.jpg',
  'kreuzquer-april': '/praesentation/kuq_april.jpg',
  'brueckenraetsel': '/praesentation/bruecke.jpg',
  'kombinieren': '/praesentation/kombi.jpg',
  'sommer-postkarte': '/praesentation/jul1.jpg',
  'wahr-oder-erfunden': '/praesentation/jul2.jpg',
  'sprichwort-raetsel': '/praesentation/jul3.jpg',
  'schattenraetsel': '/praesentation/jul4.jpg',
  'gitterraetsel': '/praesentation/gitter.jpg',
  'kreuzquer-oktober': '/praesentation/kuq_okt.jpg',
  'geldregen': '/praesentation/geldregen.jpg',
}

function monatText(m: string): string {
  const [j, mm] = m.split('-').map(Number)
  return `${MONATE[mm]} ${j}`
}

export default function SpieleUebersicht() {
  const { T, sprache } = useSprache()
  const eintraege = useMemo(() => katalog(), [])

  const kopfKnopf = { color: '#1d1d1f', textDecoration: 'none', fontSize: 12, padding: '5px 10px', border: '1px solid #D2D4DC', borderRadius: 6, background: '#ffffff' } as const

  return (
    <div style={{ minHeight: '100dvh', background: '#ffffff', color: '#1d1d1f', fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <header style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ECEEF2' }}>
        <Link href="/" style={{ ...kopfKnopf }}>← {T('startUebersicht')}</Link>
        <div style={{ display: 'flex', gap: 8 }}><HandbuchKnopf anker="spiele2027" /><SpracheUmschalter /></div>
      </header>
      <main style={{ maxWidth: 1200, margin: '24px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 28, margin: '8px 0 4px' }}>{T('spiele2027Titel')}</h1>
        <p style={{ color: '#4E5260', margin: '0 0 20px' }}>{T('spiele2027Untertitel')}</p>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {eintraege.map((e) => {
            const bild = BILDER[e.id]
            const monate = e.monate.map(monatText).join(' · ')
            return (
              <li key={e.id} style={{ padding: 0, border: '1px solid #ECEEF2', borderRadius: 10, overflow: 'hidden', background: '#ffffff' }}>
                <Link href={`/serie?spiel=${encodeURIComponent(e.id)}`} style={{ display: 'block', color: '#1d1d1f', textDecoration: 'none' }}>
                  {bild && (
                    <div style={{ aspectRatio: '16/10', background: '#F3F4F6', backgroundImage: `url(${bild})`, backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden="true" />
                  )}
                  <div style={{ padding: 12 }}>
                    <div style={{ color: '#C8102E', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{monate}</div>
                    <div style={{ fontWeight: 700, fontSize: 16, margin: '4px 0 6px' }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: '#4E5260' }}>{e.modell}</div>
                    <div style={{ fontSize: 12, color: '#1d1d1f', marginTop: 6 }}>{e.beschreibung}</div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>

        <p style={{ fontSize: 12, color: '#4E5260', marginTop: 24 }}>
          {sprache === 'en'
            ? 'Click a tile to open the Series mode with that game preselected.'
            : 'Klick auf eine Kachel öffnet den Serien-Modus mit vorausgewähltem Spiel.'}
        </p>
      </main>
    </div>
  )
}
