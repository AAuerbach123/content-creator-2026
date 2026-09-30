'use client'

import type { Artefakt, Ebene } from '@/lib/types'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'

// Ebenen-Panel für den Konva-Editor: Auflistung, Auswahl, Sichtbarkeit,
// Reihenfolge (↑/↓), Löschen.

const TYPE_ICON: Record<Ebene['typ'], string> = {
  text: 'T',
  bild: '▤',
  form: '◐',
  logo: '★',
  'video-platzhalter': '▶',
}

export default function EbenenPanel({
  artefakt,
  ausgewaehlteId,
  onAuswahl,
  onAendern,
}: {
  artefakt: Artefakt
  ausgewaehlteId?: string
  onAuswahl: (id?: string) => void
  onAendern: (neu: Artefakt) => void
}) {
  const { sprache } = useSprache()

  const sichtbar = (id: string, s: boolean) =>
    onAendern({
      ...artefakt,
      ebenen: artefakt.ebenen.map((e) => (e.id === id ? { ...e, sichtbar: s } : e)),
    })

  const loeschen = (id: string) =>
    onAendern({ ...artefakt, ebenen: artefakt.ebenen.filter((e) => e.id !== id) })

  const bewegen = (id: string, delta: number) => {
    const idx = artefakt.ebenen.findIndex((e) => e.id === id)
    if (idx < 0) return
    const neu = [...artefakt.ebenen]
    const ziel = Math.max(0, Math.min(neu.length - 1, idx + delta))
    if (ziel === idx) return
    const [entfernt] = neu.splice(idx, 1)
    neu.splice(ziel, 0, entfernt)
    onAendern({ ...artefakt, ebenen: neu })
  }

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          {sprache === 'de' ? 'Ebenen' : 'Layers'}
        </div>
        <HilfePopover
          de={'Alle Ebenen des aktuellen Artefakts. ● / ◌ = Sichtbarkeit, ↑ / ↓ = Reihenfolge (Z-Achse), ✕ = löschen. Buchstabe zeigt den Typ (T Text, ▤ Bild, ★ Logo, ◐ Form, ▶ Video-Platz).'}
          en={'All layers of the current artifact. ● / ◌ = visibility, ↑ / ↓ = order (z-axis), ✕ = delete. Letter shows the type (T text, ▤ image, ★ logo, ◐ shape, ▶ video slot).'}
          anker="ebenen"
        />
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {artefakt.ebenen.map((e) => {
          const aktiv = e.id === ausgewaehlteId
          return (
            <li
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 8px',
                borderRadius: 5,
                background: aktiv ? 'rgba(96,165,250,0.15)' : 'rgba(0,0,0,0.25)',
                border: `1px solid ${aktiv ? '#60a5fa' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <button
                type="button"
                onClick={() => onAuswahl(e.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'transparent',
                  border: 'none',
                  color: '#f5f5f7',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 12,
                  textAlign: 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 18,
                    display: 'inline-block',
                    textAlign: 'center',
                    opacity: 0.7,
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {TYPE_ICON[e.typ]}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
              </button>
              <button
                type="button"
                onClick={() => sichtbar(e.id, e.sichtbar === false)}
                title={e.sichtbar === false ? 'anzeigen' : 'ausblenden'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f5f5f7',
                  opacity: e.sichtbar === false ? 0.4 : 1,
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                {e.sichtbar === false ? '◌' : '●'}
              </button>
              <button
                type="button"
                onClick={() => bewegen(e.id, -1)}
                title="nach hinten"
                style={{ background: 'transparent', border: 'none', color: '#f5f5f7', cursor: 'pointer', fontSize: 11, opacity: 0.7 }}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => bewegen(e.id, 1)}
                title="nach vorne"
                style={{ background: 'transparent', border: 'none', color: '#f5f5f7', cursor: 'pointer', fontSize: 11, opacity: 0.7 }}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => loeschen(e.id)}
                title="löschen"
                style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 11 }}
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
