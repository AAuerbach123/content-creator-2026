'use client'

import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'
import type { Schritt, SchrittStatus } from '@/lib/types'

// Schrittplan-Anzeige mit den drei Aktionen pro Schritt: Annehmen / Ändern / Selbst machen.
// Rein präsentierend — Persistenz macht der Aufrufer.

export default function SchrittplanPanel({
  schritte,
  onStatus,
}: {
  schritte: Schritt[]
  onStatus: (id: string, status: SchrittStatus) => void
}) {
  const { T } = useSprache()

  const label = (status: SchrittStatus): string => {
    switch (status) {
      case 'offen':
        return T('schrittOffen')
      case 'ki-vorschlag':
        return T('schrittVorschlag')
      case 'angenommen':
        return T('schrittAngenommen')
      case 'manuell':
        return T('schrittManuell')
    }
  }

  const statusFarbe = (status: SchrittStatus): string => {
    switch (status) {
      case 'offen':
        return 'rgba(148,163,184,0.9)'
      case 'ki-vorschlag':
        return '#60a5fa'
      case 'angenommen':
        return '#34d399'
      case 'manuell':
        return '#f59e0b'
    }
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{T('schrittplanTitel')}</h2>
        <HilfePopover
          de={'Checkliste der KI zum Ziel. Je Schritt: Annehmen / Ändern / Selbst machen. Farbe am linken Rand zeigt den Status (offen, KI-Vorschlag, angenommen, manuell).'}
          en={'AI checklist toward your goal. Per step: Accept / Change / DIY. Colour on the left indicates status (open, AI proposal, accepted, manual).'}
          anker="schrittplan"
        />
      </div>

      {schritte.length === 0 ? (
        <p style={{ opacity: 0.6, fontSize: 13, margin: 0 }}>{T('schrittplanLeer')}</p>
      ) : (
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...schritte]
            .sort((a, b) => a.reihenfolge - b.reihenfolge)
            .map((s) => (
              <li
                key={s.id}
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: statusFarbe(s.status),
                      color: '#0b0b0f',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {s.reihenfolge + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{s.titel}</div>
                    {s.beschreibung && (
                      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 3, lineHeight: 1.45 }}>
                        {s.beschreibung}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 10,
                        color: statusFarbe(s.status),
                        marginTop: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {label(s.status)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['angenommen', 'ki-vorschlag', 'manuell'] as SchrittStatus[]).map((st) => {
                    const beschriftung =
                      st === 'angenommen'
                        ? T('schrittAnnehmen')
                        : st === 'ki-vorschlag'
                          ? T('schrittAendern')
                          : T('schrittSelbst')
                    const aktiv = s.status === st
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onStatus(s.id, st)}
                        style={{
                          background: aktiv ? statusFarbe(st) : 'transparent',
                          color: aktiv ? '#0b0b0f' : '#f5f5f7',
                          border: `1px solid ${aktiv ? statusFarbe(st) : 'rgba(255,255,255,0.15)'}`,
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {beschriftung}
                      </button>
                    )
                  })}
                </div>
              </li>
            ))}
        </ol>
      )}
    </section>
  )
}
