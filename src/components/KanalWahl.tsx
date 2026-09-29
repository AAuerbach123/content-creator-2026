'use client'

import { KANAL_PRESETS } from '@/lib/kanaele'
import type { Kanal } from '@/lib/types'
import { useSprache } from './SpracheProvider'

export default function KanalWahl({
  aktueller,
  onWahl,
}: {
  aktueller?: Kanal
  onWahl: (k: Kanal) => void
}) {
  const { sprache } = useSprache()
  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
        {sprache === 'de' ? 'Kanal wählen' : 'Pick channel'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6 }}>
        {KANAL_PRESETS.map((p) => {
          const aktiv = aktueller === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onWahl(p.id)}
              style={{
                background: aktiv ? '#f5f5f7' : 'rgba(0,0,0,0.3)',
                color: aktiv ? '#0b0b0f' : '#f5f5f7',
                border: `1px solid ${aktiv ? '#f5f5f7' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span style={{ fontWeight: 600 }}>{sprache === 'de' ? p.labelDe : p.labelEn}</span>
              <span style={{ fontSize: 10, opacity: aktiv ? 0.6 : 0.55 }}>
                {p.breite}×{p.hoehe} {p.einheit}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
