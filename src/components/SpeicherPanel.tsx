'use client'

import { useEffect, useState } from 'react'
import { assetsAufraeumen, speicherStatus } from '@/lib/db'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'

// Kleines Panel für /uebersicht:
//  - Zeigt den Browser-Speicher (Storage-API), damit Andreas sieht, ob die
//    IndexedDB-Quota knapp wird.
//  - Erlaubt Aufräumen verwaister Assets (Regel 2: Assets werden nicht
//    automatisch gelöscht, um geteilte Referenzen nicht zu zerschlagen).
export default function SpeicherPanel() {
  const { sprache } = useSprache()
  const [stat, setStat] = useState<Awaited<ReturnType<typeof speicherStatus>>>({})
  const [lauft, setLauft] = useState(false)
  const [meldung, setMeldung] = useState<string | null>(null)

  const laden = () => {
    speicherStatus().then(setStat).catch(() => {})
  }

  useEffect(() => {
    laden()
  }, [])

  const aufraeumen = async () => {
    setLauft(true)
    setMeldung(null)
    try {
      const r = await assetsAufraeumen()
      setMeldung(
        sprache === 'de'
          ? `${r.geloescht} verwaiste Assets gelöscht (${r.behalten} behalten).`
          : `${r.geloescht} orphan assets removed (${r.behalten} kept).`,
      )
      laden()
    } catch {
      setMeldung(sprache === 'de' ? 'Fehler beim Aufräumen.' : 'Cleanup failed.')
    } finally {
      setLauft(false)
    }
  }

  const genutztProzent = stat.grenzeMb && stat.genutztMb ? Math.round((stat.genutztMb / stat.grenzeMb) * 100) : null
  const ampelFarbe = genutztProzent === null ? '#a3a3af' : genutztProzent >= 90 ? '#f43f5e' : genutztProzent >= 75 ? '#f5b40a' : '#22c55e'

  return (
    <section
      style={{
        marginTop: 24,
        padding: 20,
        borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>
          {sprache === 'de' ? '💾 Speicher & Aufräumen' : '💾 Storage & Cleanup'}
        </h2>
        <HilfePopover
          anker="einstellungen"
          de={'Zeigt den Browser-Speicher (Chrome/Firefox erlauben je Origin ~ 60 % der Festplatte). Aufräumen entfernt Assets, die kein Job/Snapshot/Vorlage mehr referenziert.'}
          en={'Shows the browser storage (Chrome/Firefox allow ~60 % of disk per origin). Cleanup removes assets no longer referenced by any job, snapshot or template.'}
        />
      </div>
      <div style={{ fontSize: 13, color: '#c7c7cf', marginBottom: 12 }}>
        {stat.genutztMb !== undefined ? (
          <>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: ampelFarbe, marginRight: 8, verticalAlign: 'middle' }} />
            {sprache === 'de' ? 'Belegt' : 'Used'}: <b>{stat.genutztMb} MB</b>{' '}
            {stat.grenzeMb ? (
              <>
                {sprache === 'de' ? 'von' : 'of'} {stat.grenzeMb} MB ({genutztProzent}%)
              </>
            ) : null}
          </>
        ) : (
          <span>{sprache === 'de' ? 'Speicher-API in diesem Browser nicht verfügbar.' : 'Storage API not available in this browser.'}</span>
        )}
      </div>
      <button
        type="button"
        onClick={aufraeumen}
        disabled={lauft}
        style={{
          padding: '8px 14px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background: lauft ? 'rgba(255,255,255,0.08)' : '#0b0b0f',
          color: '#f5f5f7',
          cursor: lauft ? 'wait' : 'pointer',
          fontSize: 13,
        }}
      >
        {lauft ? (sprache === 'de' ? 'Räumt auf …' : 'Cleaning …') : sprache === 'de' ? 'Verwaiste Assets aufräumen' : 'Clean up orphan assets'}
      </button>
      {meldung && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#c7c7cf' }}>
          {meldung}
        </div>
      )}
    </section>
  )
}
