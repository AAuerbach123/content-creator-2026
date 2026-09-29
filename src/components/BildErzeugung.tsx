'use client'

import { useState } from 'react'
import { assetSpeichern } from '@/lib/db'
import { bildErzeugen, type BildAntwort } from '@/lib/dialog-client'
import { STIL_PRESETS } from '@/lib/stil-presets'
import { useSprache } from './SpracheProvider'

// Bild-Generator: Motiv + Stil-Preset + Orientierung → 3 Varianten (nacheinander).
// Wählt der Nutzer eine, wird sie im Asset-Store abgelegt (contentadressiert)
// und via onUebernehmen mit dem Hash zurückgegeben.

export default function BildErzeugung({
  jobId,
  vorschlagMotiv = '',
  orientierung = 'square',
  onUebernehmen,
}: {
  jobId: string
  vorschlagMotiv?: string
  orientierung?: 'landscape' | 'portrait' | 'square'
  onUebernehmen: (info: { hash: string; dataUrl: string; motiv: string; stil: string }) => void
}) {
  const [motiv, setMotiv] = useState(vorschlagMotiv)
  const [stil, setStil] = useState<string>('aquarell')
  const [orient, setOrient] = useState(orientierung)
  const [varianten, setVarianten] = useState<BildAntwort[]>([])
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const { sprache } = useSprache()

  const dreiVarianten = async () => {
    if (!motiv.trim()) return
    setLaedt(true)
    setFehler(null)
    setVarianten([])
    try {
      // Nacheinander erzeugen — parallel würde bei OpenAI Rate-Limits auslösen.
      const ergebnisse: BildAntwort[] = []
      for (let i = 0; i < 3; i++) {
        const a = await bildErzeugen({ jobId, motiv, stil, orientierung: orient })
        ergebnisse.push(a)
        setVarianten([...ergebnisse])
        if (!a.ok) {
          setFehler(a.fehler || 'unbekannter Fehler')
          break
        }
      }
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(false)
    }
  }

  const uebernehmen = async (v: BildAntwort) => {
    if (!v.dataUrl) return
    const komma = v.dataUrl.indexOf(',')
    const b64 = komma >= 0 ? v.dataUrl.slice(komma + 1) : v.dataUrl
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'image/png' })
    const hash = await assetSpeichern(blob)
    onUebernehmen({ hash, dataUrl: v.dataUrl, motiv, stil: v.stilLabel || stil })
  }

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
        <input
          type="text"
          value={motiv}
          placeholder={sprache === 'de' ? 'Motiv (z. B. „Sonnige Alpwiese mit Wildblumen")' : 'Subject (e.g. "Sunny alpine meadow")'}
          onChange={(e) => setMotiv(e.target.value)}
          style={{
            flex: '1 1 220px',
            background: 'rgba(0,0,0,0.35)',
            color: '#f5f5f7',
            border: '1px solid rgba(255,255,255,0.14)',
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        />
        <select
          value={stil}
          onChange={(e) => setStil(e.target.value)}
          style={{
            background: 'rgba(0,0,0,0.35)',
            color: '#f5f5f7',
            border: '1px solid rgba(255,255,255,0.14)',
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {STIL_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={orient}
          onChange={(e) => setOrient(e.target.value as 'landscape' | 'portrait' | 'square')}
          style={{
            background: 'rgba(0,0,0,0.35)',
            color: '#f5f5f7',
            border: '1px solid rgba(255,255,255,0.14)',
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <option value="landscape">Landscape 3:2</option>
          <option value="portrait">Portrait 2:3</option>
          <option value="square">Square 1:1</option>
        </select>
        <button
          type="button"
          onClick={dreiVarianten}
          disabled={laedt || !motiv.trim()}
          style={{
            background: '#f5f5f7',
            color: '#0b0b0f',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 13,
            cursor: laedt || !motiv.trim() ? 'not-allowed' : 'pointer',
            opacity: laedt || !motiv.trim() ? 0.55 : 1,
          }}
        >
          {laedt ? (sprache === 'de' ? 'Erzeuge …' : 'Generating …') : '3 Varianten'}
        </button>
      </div>

      {fehler && (
        <p style={{ margin: 0, color: '#fecaca', fontSize: 12 }}>
          ⚠ {fehler}
        </p>
      )}

      {varianten.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          {varianten.map((v, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {v.dataUrl ? (
                <img src={v.dataUrl} alt="" style={{ width: '100%', display: 'block' }} />
              ) : (
                <div
                  style={{ padding: 20, color: '#fecaca', fontSize: 12 }}
                >
                  ⚠ {v.fehler || '—'}
                </div>
              )}
              {v.dataUrl && (
                <button
                  type="button"
                  onClick={() => uebernehmen(v)}
                  style={{
                    background: 'transparent',
                    color: '#f5f5f7',
                    border: 'none',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    padding: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {sprache === 'de' ? 'Übernehmen' : 'Use this'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
