'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { HANDBUCH_ABSCHNITTE } from '@/lib/handbuch-inhalt'
import { useSprache } from './SpracheProvider'

// Vollbild-Overlay über dem laufenden Job. Links Inhaltsverzeichnis + Suche,
// rechts alle Abschnitte scrollbar. Der Anker wird beim Öffnen sofort
// angesprungen. Schließen per ✕, Escape oder Klick auf den dunklen Rand.

export default function HandbuchOverlay({
  ankerInitial,
  onSchliessen,
}: {
  ankerInitial?: string
  onSchliessen: () => void
}) {
  const { sprache } = useSprache()
  const [suche, setSuche] = useState('')
  const inhaltRef = useRef<HTMLDivElement>(null)

  const gefiltert = useMemo(() => {
    if (!suche.trim()) return HANDBUCH_ABSCHNITTE
    const s = suche.trim().toLowerCase()
    return HANDBUCH_ABSCHNITTE.filter((a) => {
      const felder = sprache === 'de' ? [a.titelDe, a.koerperDe] : [a.titelEn, a.koerperEn]
      return felder.some((f) => f.toLowerCase().includes(s))
    })
  }, [suche, sprache])

  useEffect(() => {
    if (!ankerInitial || !inhaltRef.current) return
    // Direkt nach dem Rendern zum Anker springen
    const ziel = inhaltRef.current.querySelector<HTMLElement>(`#handbuch-${ankerInitial}`)
    if (ziel) ziel.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [ankerInitial])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSchliessen()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSchliessen])

  const springeZuAnker = (anker: string) => {
    const ziel = inhaltRef.current?.querySelector<HTMLElement>(`#handbuch-${anker}`)
    if (ziel) ziel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={sprache === 'de' ? 'Handbuch' : 'Manual'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSchliessen()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(3px)',
        zIndex: 200,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        padding: '4vh 2vw',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1080,
          background: '#0b0b0f',
          color: '#f5f5f7',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Roboto, sans-serif',
        }}
      >
        <aside
          style={{
            borderRight: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ padding: '14px 14px 10px' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.55 }}>
              {sprache === 'de' ? 'Handbuch' : 'Manual'}
            </div>
            <input
              type="search"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder={sprache === 'de' ? 'Suchen …' : 'Search …'}
              style={{
                width: '100%',
                marginTop: 8,
                background: 'rgba(0,0,0,0.35)',
                color: '#f5f5f7',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 6,
                padding: '7px 10px',
                fontSize: 12,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>
          <nav
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '4px 8px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {gefiltert.map((a) => (
              <button
                key={a.anker}
                type="button"
                onClick={() => springeZuAnker(a.anker)}
                style={{
                  textAlign: 'left',
                  background: 'transparent',
                  color: '#f5f5f7',
                  border: 'none',
                  padding: '7px 10px',
                  borderRadius: 5,
                  fontSize: 12,
                  cursor: 'pointer',
                  opacity: 0.85,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {sprache === 'de' ? a.titelDe : a.titelEn}
              </button>
            ))}
            {gefiltert.length === 0 && (
              <p style={{ margin: '10px', fontSize: 12, opacity: 0.55 }}>
                {sprache === 'de' ? 'Nichts gefunden.' : 'No results.'}
              </p>
            )}
          </nav>
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Link
              href="/handbuch"
              onClick={onSchliessen}
              style={{ color: '#93c5fd', fontSize: 11, textDecoration: 'none' }}
            >
              {sprache === 'de' ? 'Als eigene Seite öffnen →' : 'Open as own page →'}
            </Link>
          </div>
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <header
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              {sprache === 'de' ? 'Grafiker-Handbuch' : "Designer's manual"}
            </h2>
            <button
              type="button"
              onClick={onSchliessen}
              aria-label={sprache === 'de' ? 'Handbuch schließen' : 'Close manual'}
              style={{
                background: 'transparent',
                color: '#f5f5f7',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </header>
          <div
            ref={inhaltRef}
            style={{
              overflowY: 'auto',
              padding: '18px 26px 40px',
              lineHeight: 1.6,
              fontSize: 13,
            }}
          >
            {HANDBUCH_ABSCHNITTE.map((a) => (
              <section
                key={a.anker}
                id={`handbuch-${a.anker}`}
                style={{ marginBottom: 22, scrollMarginTop: 20 }}
              >
                <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>
                  {sprache === 'de' ? a.titelDe : a.titelEn}
                </h3>
                <p style={{ margin: 0, opacity: 0.85, whiteSpace: 'pre-wrap' }}>
                  {sprache === 'de' ? a.koerperDe : a.koerperEn}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
