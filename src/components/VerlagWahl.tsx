'use client'

import { useEffect, useMemo, useState } from 'react'
import { verlageGruppieren, verlagePresetsLaden, type VerlagsPreset } from '@/lib/verlage'
import { useSprache } from './SpracheProvider'

// Verlags-Auswahl (Brand-Kit). Zeigt die 46 Presets aus dem Ad-Creator gruppiert
// nach Verlagsgruppe. Auswahl liefert das komplette Preset (Farben, Font, Logo).

export default function VerlagWahl({ onWahl }: { onWahl: (v: VerlagsPreset) => void }) {
  const { sprache } = useSprache()
  const [liste, setListe] = useState<VerlagsPreset[]>([])
  const [suche, setSuche] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    verlagePresetsLaden().then(setListe).catch((e) => setFehler(String(e)))
  }, [])

  const gefiltert = useMemo(() => {
    const s = suche.trim().toLowerCase()
    if (!s) return liste
    return liste.filter(
      (v) =>
        v.titelKanonisch?.toLowerCase().includes(s) ||
        v.titel.toLowerCase().includes(s) ||
        v.verlag.toLowerCase().includes(s) ||
        v.gruppe.toLowerCase().includes(s),
    )
  }, [liste, suche])

  const gruppen = useMemo(() => verlageGruppieren(gefiltert), [gefiltert])

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
          {sprache === 'de' ? `Verlage (${liste.length})` : `Publishers (${liste.length})`}
        </h3>
        <input
          type="text"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder={sprache === 'de' ? 'Suchen …' : 'Search …'}
          style={{
            background: 'rgba(0,0,0,0.35)',
            color: '#f5f5f7',
            border: '1px solid rgba(255,255,255,0.14)',
            padding: '4px 8px',
            borderRadius: 5,
            fontSize: 12,
            fontFamily: 'inherit',
            width: 180,
          }}
        />
      </div>

      {fehler && (
        <p style={{ margin: 0, color: '#fecaca', fontSize: 12 }}>⚠ {fehler}</p>
      )}

      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(gruppen)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([gruppe, items]) => (
            <div key={gruppe}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  opacity: 0.5,
                  marginBottom: 4,
                }}
              >
                {gruppe} · {items.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onWahl(v)}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6,
                      padding: '6px 10px',
                      color: '#f5f5f7',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                  >
                    {v.logoUrl && (
                      <img
                        src={v.logoUrl}
                        alt=""
                        style={{
                          width: 30,
                          height: 20,
                          objectFit: 'contain',
                          background: '#fff',
                          padding: 2,
                          borderRadius: 3,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {v.titelKanonisch || v.titel}
                    </span>
                    <span style={{ display: 'flex', gap: 3 }}>
                      {[v.colors.title, v.colors.prize, v.colors.intro]
                        .filter((c, i, arr) => c && arr.indexOf(c) === i)
                        .slice(0, 3)
                        .map((c) => (
                          <span
                            key={c}
                            title={c}
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              background: c,
                              border: '1px solid rgba(0,0,0,0.3)',
                            }}
                          />
                        ))}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </section>
  )
}
