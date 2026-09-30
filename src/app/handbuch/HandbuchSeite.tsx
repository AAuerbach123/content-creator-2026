'use client'

import Link from 'next/link'
import HandbuchKnopf from '@/components/HandbuchKnopf'
import SpracheUmschalter from '@/components/SpracheUmschalter'
import { useSprache } from '@/components/SpracheProvider'
import { HANDBUCH_ABSCHNITTE } from '@/lib/handbuch-inhalt'

export default function HandbuchSeite() {
  const { sprache } = useSprache()
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0b0b0f',
        color: '#f5f5f7',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Roboto, sans-serif',
      }}
    >
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <HandbuchKnopf />
          <SpracheUmschalter />
        </div>
      </header>
      <main
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '32px 24px 80px',
          lineHeight: 1.65,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 220px) minmax(0, 1fr)',
          gap: 28,
          alignItems: 'start',
        }}
      >
        <nav
          aria-label={sprache === 'de' ? 'Inhaltsverzeichnis' : 'Contents'}
          style={{
            position: 'sticky',
            top: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            paddingRight: 8,
            borderRight: '1px solid rgba(255,255,255,0.06)',
            fontSize: 12,
            maxHeight: 'calc(100dvh - 100px)',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              opacity: 0.5,
              margin: '0 8px 8px',
            }}
          >
            {sprache === 'de' ? 'Inhalt' : 'Contents'}
          </div>
          {HANDBUCH_ABSCHNITTE.map((a) => (
            <a
              key={a.anker}
              href={`#handbuch-${a.anker}`}
              style={{
                color: '#f5f5f7',
                textDecoration: 'none',
                padding: '5px 8px',
                borderRadius: 4,
                opacity: 0.85,
              }}
            >
              {sprache === 'de' ? a.titelDe : a.titelEn}
            </a>
          ))}
        </nav>

        <section style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 30, margin: '0 0 8px' }}>
            {sprache === 'de' ? 'Grafiker-Handbuch' : "Designer's manual"}
          </h1>
          <p style={{ opacity: 0.65, margin: '0 0 32px', fontSize: 14 }}>
            {sprache === 'de'
              ? 'Kurze Referenz für den Alltag mit dem ContentCreator2026. Rechts oben öffnet der 📖-Knopf dieselbe Referenz überall als Overlay.'
              : 'Short reference for daily work with ContentCreator2026. The 📖 button in the top right opens the same reference as an overlay everywhere.'}
          </p>

          {HANDBUCH_ABSCHNITTE.map((a) => (
            <article
              key={a.anker}
              id={`handbuch-${a.anker}`}
              style={{ marginBottom: 24, scrollMarginTop: 20 }}
            >
              <h2 style={{ fontSize: 18, margin: '0 0 6px' }}>
                {sprache === 'de' ? a.titelDe : a.titelEn}
              </h2>
              <p style={{ margin: 0, opacity: 0.85, whiteSpace: 'pre-wrap' }}>
                {sprache === 'de' ? a.koerperDe : a.koerperEn}
              </p>
            </article>
          ))}

          <p style={{ marginTop: 32, opacity: 0.55, fontSize: 12 }}>
            {sprache === 'de' ? (
              <>
                Vollständige KI-Kosten und Performance-Messung auf{' '}
                <Link href="/uebersicht" style={{ color: '#93c5fd' }}>
                  /uebersicht
                </Link>
                .
              </>
            ) : (
              <>
                Full AI cost & performance measurement at{' '}
                <Link href="/uebersicht" style={{ color: '#93c5fd' }}>
                  /uebersicht
                </Link>
                .
              </>
            )}
          </p>
        </section>
      </main>
    </div>
  )
}
