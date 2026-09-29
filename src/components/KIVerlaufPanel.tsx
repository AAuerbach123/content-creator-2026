'use client'

import { useEffect, useState } from 'react'
import { aktionenFuerJob } from '@/lib/db'
import type { KIAktion } from '@/lib/types'
import { useSprache } from './SpracheProvider'

// Verlaufs-Panel (Regel 8): jede KI-Aktion sichtbar. Nachladen per nonce.

export default function KIVerlaufPanel({
  jobId,
  nonce,
}: {
  jobId: string
  nonce: number
}) {
  const { T, sprache } = useSprache()
  const [aktionen, setAktionen] = useState<KIAktion[]>([])

  useEffect(() => {
    let abgebrochen = false
    aktionenFuerJob(jobId).then((a) => {
      if (!abgebrochen) setAktionen(a.reverse())
    })
    return () => {
      abgebrochen = true
    }
  }, [jobId, nonce])

  const gesamtKosten = aktionen.reduce((sum, a) => sum + (a.kostenUsd || 0), 0)

  const formatKosten = (usd: number): string => {
    if (usd === 0) return '—'
    if (usd < 0.01) return sprache === 'de' ? '< 1 ct' : '< 1 ct'
    return `${usd.toFixed(3)} USD`
  }

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{T('verlaufTitel')}</h2>
        <span style={{ fontSize: 11, opacity: 0.65 }}>
          {T('verlaufKosten')}: {formatKosten(gesamtKosten)}
        </span>
      </div>

      {aktionen.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, opacity: 0.55 }}>{T('verlaufLeer')}</p>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {aktionen.map((a) => (
            <li
              key={a.id}
              style={{
                padding: '8px 10px',
                background: a.fehler ? 'rgba(185,28,28,0.12)' : 'rgba(0,0,0,0.25)',
                border: `1px solid ${a.fehler ? 'rgba(185,28,28,0.35)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8,
                fontSize: 11,
                lineHeight: 1.4,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, opacity: 0.75 }}>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{a.route}</span>
                <span>{new Date(a.zeitpunkt).toLocaleTimeString()}</span>
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.prompt}
              </div>
              {a.kostenUsd !== undefined && (
                <div style={{ opacity: 0.55 }}>
                  {a.eingabeTokens}/{a.ausgabeTokens} tok · {formatKosten(a.kostenUsd)}
                </div>
              )}
              {a.fehler && <div style={{ color: '#fecaca' }}>⚠ {a.fehler}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
