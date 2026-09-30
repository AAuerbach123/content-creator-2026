'use client'

import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'
import type { Richtung } from '@/lib/types'

// Drei-Richtungen-Vorschlag (Weg A). Zeigt farbige Karten mit Layoutbeschreibung,
// Farbwelt-Chips, Tonalität und Beispiel-Headline. Auswahl gibt die id zurück.

export default function RichtungenPanel({
  richtungen,
  aktuellGewaehlt,
  onWaehlen,
}: {
  richtungen: Richtung[]
  aktuellGewaehlt?: string
  onWaehlen: (id: string) => void
}) {
  const { T } = useSprache()

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>{T('richtungenTitel')}</h2>
        <HilfePopover
          de={'Drei visuell klar unterschiedliche Karten (Layout, Farbwelt, Tonalität, Beispiel-Headline). Ein Klick wählt die Richtung — danach verfeinert die KI per Multiple Choice und erzeugt den Schrittplan.'}
          en={'Three visually distinct cards (layout, palette, tone, sample headline). One click picks the direction — the AI then refines via multiple choice and generates the step plan.'}
          anker="richtungen"
        />
      </div>
      <p style={{ margin: '0 0 14px', opacity: 0.65, fontSize: 13 }}>{T('richtungenHinweis')}</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
        }}
      >
        {richtungen.map((r) => {
          const gewaehlt = aktuellGewaehlt === r.id
          const hauptFarbe = r.farbwelt[0] || '#60a5fa'
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onWaehlen(r.id)}
              style={{
                textAlign: 'left',
                background: gewaehlt ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${gewaehlt ? hauptFarbe : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 14,
                padding: 16,
                cursor: 'pointer',
                color: '#f5f5f7',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                transition: 'transform 120ms ease, border-color 120ms ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!gewaehlt) e.currentTarget.style.borderColor = hauptFarbe
              }}
              onMouseLeave={(e) => {
                if (!gewaehlt) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                {r.farbwelt.slice(0, 5).map((farbe, idx) => (
                  <span
                    key={idx}
                    title={farbe}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: farbe,
                      border: '1px solid rgba(0,0,0,0.35)',
                    }}
                  />
                ))}
              </div>
              <strong style={{ fontSize: 15 }}>{r.name}</strong>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.8, lineHeight: 1.45 }}>
                {r.layoutBeschreibung}
              </p>
              <div
                style={{
                  padding: '8px 10px',
                  background: 'rgba(0,0,0,0.35)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: hauptFarbe,
                  lineHeight: 1.35,
                }}
              >
                „{r.beispielHeadline}"
              </div>
              <span style={{ fontSize: 11, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {r.tonalitaet}
              </span>
              <span
                style={{
                  alignSelf: 'flex-start',
                  padding: '6px 12px',
                  background: gewaehlt ? hauptFarbe : 'rgba(255,255,255,0.06)',
                  color: gewaehlt ? '#0b0b0f' : '#f5f5f7',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 6,
                }}
              >
                {gewaehlt ? '✓' : T('richtungWaehlen')}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
