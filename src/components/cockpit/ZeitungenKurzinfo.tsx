'use client'

// Kurzinfo im Spiel (Phase „Kampagne einstellen"): Gibt es eine eigene Zeitungs-/Rufnummernliste für dieses Spiel?
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import { stammLaden, type ZeitungenStamm } from '@/lib/cockpit/zeitungen-stamm'
import Karte from './Karte'

export default function ZeitungenKurzinfo({ spielId }: { spielId: string }) {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const [stamm, setStamm] = useState<ZeitungenStamm | undefined | null>(null)
  useEffect(() => { stammLaden(spielId).then(setStamm).catch(() => setStamm(undefined)) }, [spielId])

  const text = stamm === null
    ? '…'
    : stamm?.quelle
      ? (de
          ? `Eigene Liste: ${stamm.teilnehmer?.length ?? 'alle'} Zeitungen, zuletzt geändert ${new Date(stamm.aktualisiertAm).toLocaleDateString('de-DE')} (${stamm.quelle}).`
          : `Own list: ${stamm.teilnehmer?.length ?? 'all'} newspapers, last changed ${new Date(stamm.aktualisiertAm).toLocaleDateString('en-GB')} (${stamm.quelle}).`)
      : (de ? 'Noch keine eigene Liste für dieses Spiel – es gilt die Standardliste.' : 'No own list for this game yet – the default list applies.')

  return (
    <Karte
      titel={de ? 'Zeitungen & Rufnummern' : 'Newspapers & phone numbers'}
      aktion={<Link href={`/cockpit/zeitungen?spiel=${encodeURIComponent(spielId)}`} className="cockpit-knopf sekundaer">{de ? 'Liste hochladen' : 'Upload list'}</Link>}
    >
      <p style={{ margin: 0 }}>{text}</p>
    </Karte>
  )
}
