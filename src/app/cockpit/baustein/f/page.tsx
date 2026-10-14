'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSprache } from '@/components/SpracheProvider'
import { alleKampagnen, spieltageLaden } from '@/lib/db'
import type { Kampagne, Spieltag } from '@/lib/cockpit/typen'
import FreigabePanel from '@/components/cockpit/FreigabePanel'
import LeererZustand from '@/components/cockpit/LeererZustand'

export default function BausteinFSeite() {
  const { T, sprache } = useSprache()
  const [kampagnen, setKampagnen] = useState<Kampagne[]>([])
  const [spieltage, setSpieltage] = useState<Spieltag[]>([])
  const [kId, setKId] = useState<string>('')
  const [sId, setSId] = useState<string>('')

  useEffect(() => { void alleKampagnen().then(setKampagnen) }, [])
  useEffect(() => {
    if (!kId) return
    void spieltageLaden(kId).then((liste) => {
      setSpieltage(liste)
      setSId(liste.find((s) => s.status !== 'freigegeben')?.id ?? liste[0]?.id ?? '')
    })
  }, [kId])

  const aktiv = useMemo(() => spieltage.find((s) => s.id === sId), [spieltage, sId])
  const kampagne = useMemo(() => kampagnen.find((k) => k.id === kId), [kampagnen, kId])

  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <Link href="/cockpit" className="cockpit-knopf text">← {T('cockpitZurueck')}</Link>
        <h2 style={{ margin: '4px 0 0', fontSize: 22 }}>{T('cockpitBausteinF')}</h2>
      </header>

      {kampagnen.length === 0 ? (
        <LeererZustand
          titel={sprache === 'de' ? 'Noch keine Kampagne' : 'No campaign yet'}
          text={sprache === 'de' ? 'Lege erst ein Spiel + Kampagne an.' : 'Create a game and campaign first.'}
          aktion={<Link href="/cockpit" className="cockpit-knopf primaer">{sprache === 'de' ? 'Zu den Spielen' : 'To the games'}</Link>}
        />
      ) : (
        <section className="cockpit-karte" style={{ marginBottom: 16 }}>
          <div className="cockpit-feld">
            <label>{sprache === 'de' ? 'Kampagne' : 'Campaign'}</label>
            <select value={kId} onChange={(e) => setKId(e.target.value)}>
              <option value="">{sprache === 'de' ? '— wählen —' : '— choose —'}</option>
              {kampagnen.map((k) => <option key={k.id} value={k.id}>{k.spielId} · {k.monat}</option>)}
            </select>
          </div>
          <div className="cockpit-feld">
            <label>{sprache === 'de' ? 'Spieltag' : 'Game day'}</label>
            <select value={sId} onChange={(e) => setSId(e.target.value)}>
              {spieltage.map((s) => <option key={s.id} value={s.id}>Tag {s.nr} · {s.datum} · {s.status}</option>)}
            </select>
          </div>
        </section>
      )}

      {kampagne && aktiv && (
        <FreigabePanel
          spielId={kampagne.spielId}
          kampagne={kampagne}
          spieltag={aktiv}
          onAendern={async () => setSpieltage(await spieltageLaden(kId))}
        />
      )}
    </>
  )
}
