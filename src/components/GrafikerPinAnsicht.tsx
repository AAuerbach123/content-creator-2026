'use client'

import { useCallback, useEffect, useState } from 'react'
import ArtefaktRenderer from './ArtefaktRenderer'
import KorrekturPinLayer from './KorrekturPinLayer'
import { freigabeSpeichern, freigabenFuerJob } from '@/lib/db'
import type { Artefakt, Freigabe, Pinstatus } from '@/lib/types'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'

// Grafiker-Sicht auf die Korrektur-Pins: alle Freigaben zu diesem Artefakt
// zusammenfassen, Pins direkt in der Vorschau anzeigen, Antwort/Status setzen.

export default function GrafikerPinAnsicht({
  jobId,
  artefaktId,
  artefakt,
}: {
  jobId: string
  artefaktId: string
  artefakt: Artefakt
}) {
  const { sprache } = useSprache()
  const [freigaben, setFreigaben] = useState<Freigabe[]>([])
  const [offen, setOffen] = useState(false)

  const laden = useCallback(async () => {
    const alle = await freigabenFuerJob(jobId)
    setFreigaben(alle.filter((f) => f.artefaktId === artefaktId))
  }, [artefaktId, jobId])

  useEffect(() => {
    laden()
  }, [laden])

  const antworten = useCallback(
    async (freigabeId: string, pinId: string, antwort: { autor?: string; text: string }) => {
      const f = freigaben.find((x) => x.id === freigabeId)
      if (!f) return
      const aktualisiert: Freigabe = {
        ...f,
        pins: f.pins.map((p) =>
          p.id === pinId
            ? { ...p, antworten: [...(p.antworten || []), { ...antwort, erstelltAm: Date.now() }] }
            : p,
        ),
      }
      await freigabeSpeichern(aktualisiert)
      await laden()
    },
    [freigaben, laden],
  )

  const statusSetzen = useCallback(
    async (freigabeId: string, pinId: string, status: Pinstatus) => {
      const f = freigaben.find((x) => x.id === freigabeId)
      if (!f) return
      const aktualisiert: Freigabe = {
        ...f,
        pins: f.pins.map((p) => (p.id === pinId ? { ...p, status } : p)),
      }
      await freigabeSpeichern(aktualisiert)
      await laden()
    },
    [freigaben, laden],
  )

  const allePins = freigaben.flatMap((f) => f.pins.map((p) => ({ ...p, freigabeId: f.id })))
  const offenePins = allePins.filter((p) => p.status === 'offen').length

  if (allePins.length === 0) return null

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => setOffen((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#f5f5f7',
            padding: 0,
            textAlign: 'left',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <span>
            {sprache === 'de' ? 'Kundenkorrekturen' : 'Customer feedback'} · {allePins.length}
          </span>
          <span style={{ fontSize: 11, color: offenePins > 0 ? '#fbbf24' : '#34d399' }}>
            {offenePins} {sprache === 'de' ? 'offen' : 'open'} {offen ? '▲' : '▼'}
          </span>
        </button>
        <HilfePopover
          de={'Pins mit Kommentar-Thread und Status pro Freigabe. Antworten wird lokal gespeichert; für den Kunden brauchst du das Korrekturportal weiter oben (Server-Snapshot).'}
          en={'Pins with comment thread and status per share. Replies stored locally; to reach the client use the correction portal above (server snapshot).'}
          anker="korrektur"
        />
      </div>

      {offen && (
        <div style={{ position: 'relative' }}>
          <ArtefaktRenderer artefakt={artefakt} maxBreite={560} />
          <KorrekturPinLayer
            breite={artefakt.breite}
            hoehe={artefakt.hoehe}
            pins={allePins}
            bearbeitbar={false}
            onAntwort={(pinId, a) => {
              const zugehoerig = allePins.find((p) => p.id === pinId)
              if (zugehoerig) antworten(zugehoerig.freigabeId, pinId, a)
            }}
            onStatus={(pinId, s) => {
              const zugehoerig = allePins.find((p) => p.id === pinId)
              if (zugehoerig) statusSetzen(zugehoerig.freigabeId, pinId, s)
            }}
          />
        </div>
      )}
    </section>
  )
}
