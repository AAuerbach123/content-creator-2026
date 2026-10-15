'use client'

// Waagrechte Leiste aller Spieltage einer Kampagne mit Ampelfarbe; aktiver Tag hervorgehoben.
import { useEffect, useRef } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import type { Kampagne, Spieltag } from '@/lib/cockpit/typen'
import { heuteIso, spieltagAmpel } from '@/lib/cockpit/tagesstatus'

type Props = { kampagne: Kampagne; spieltage: Spieltag[]; aktiv?: string; onWahl: (id: string) => void }

export default function SpieltagLeiste({ kampagne, spieltage, aktiv, onWahl }: Props) {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const ref = useRef<HTMLDivElement | null>(null)
  const heute = heuteIso()

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [aktiv])

  return (
    <div className="cockpit-tagleiste" ref={ref} role="tablist" aria-label={de ? 'Spieltag wählen' : 'Choose game day'}>
      {spieltage.map((s) => {
        const a = spieltagAmpel(kampagne, s)
        const d = new Date(s.datum + 'T12:00:00')
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === aktiv}
            aria-current={s.id === aktiv ? 'true' : undefined}
            className={`tag ${a.farbe}${s.id === aktiv ? ' aktiv' : ''}${s.datum === heute ? ' heute' : ''}`}
            onClick={() => onWahl(s.id)}
            title={`${de ? 'Spieltag' : 'Day'} ${s.nr} · ${a.offen} ${de ? 'offen' : 'open'}`}
          >
            <span className="nr">{s.nr}</span>
            <span className="dat">{d.toLocaleDateString(de ? 'de-DE' : 'en-GB', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
          </button>
        )
      })}
    </div>
  )
}
