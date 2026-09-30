'use client'

import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'

// Multiple-Choice-Fragen zur Vorlage. Wählt der Nutzer eine Option, geht das
// Ergebnis über onAntwort an den Aufrufer und wird im Briefing gespeichert.

export type MCFrage = {
  id: string
  frage: string
  optionen: string[]
  antwort?: string
}

export default function MCFragenPanel({
  fragen,
  onAntwort,
}: {
  fragen: MCFrage[]
  onAntwort: (frageId: string, antwort: string) => void
}) {
  const { T } = useSprache()

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{T('mcTitel')}</h2>
        <HilfePopover
          de={'Aus der Vorlage abgeleitete Fragen (Farben, Schrift, Layout, Bildstil). Je Merkmal: aus Vorlage übernehmen / aus Brand-Kit / neu wählen. Deine Antworten landen im Briefing des Jobs.'}
          en={'Questions derived from the reference (colours, font, layout, imagery). Per attribute: take from reference / from brand kit / pick fresh. Your answers land in the job briefing.'}
          anker="vorlage"
        />
      </div>
      <p style={{ margin: '0 0 14px', opacity: 0.65, fontSize: 13 }}>{T('mcHinweis')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fragen.map((f) => (
          <div
            key={f.id}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{f.frage}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {f.optionen.map((opt) => {
                const gewaehlt = f.antwort === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onAntwort(f.id, opt)}
                    style={{
                      background: gewaehlt ? '#f5f5f7' : 'transparent',
                      color: gewaehlt ? '#0b0b0f' : '#f5f5f7',
                      border: `1px solid ${gewaehlt ? '#f5f5f7' : 'rgba(255,255,255,0.18)'}`,
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
