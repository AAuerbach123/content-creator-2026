'use client'

// Startseite · „Heute zu tun“ (Vorschläge 1 + 2): je laufender Kampagne der nächste offene Spieltag
// (Ausgabe ab morgen) und alle überfälligen, mit Ampel und Fristen-Countdown. Klick springt zur Stelle.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import { alleKampagnen, spieltageLaden } from '@/lib/cockpit/daten-client'
import type { Kampagne, Spieltag } from '@/lib/cockpit/typen'
import { datumLang, fristenFuer, heuteZuTun, spieltagAmpel } from '@/lib/cockpit/tagesstatus'
import { verlagsgruppen } from '@/lib/cockpit/verlagsgruppen'
import { GELDREGEN_EINTRAG, SPIELE } from '@/lib/serie/spiele'
import { serienDatenLaden, type SerienBasis } from '@/lib/serie/serie-client'
import { standardTeilnehmer } from '@/lib/serie/zeitungs-pool'
import AmpelZeile from './AmpelZeile'
import FristChip from './FristChip'
import LeererZustand from './LeererZustand'

export type KampagneMitTagen = { kampagne: Kampagne; spieltage: Spieltag[] }

export const spielName = (id: string) => (id === 'geldregen' ? GELDREGEN_EINTRAG.name : SPIELE.find((s) => s.id === id)?.name ?? id)

/** Lädt alle Kampagnen mit ihren Spieltagen (für Startseite und Kalender). */
export async function kampagnenMitTagen(): Promise<KampagneMitTagen[]> {
  const ks = await alleKampagnen()
  return Promise.all(ks.map(async (kampagne) => ({ kampagne, spieltage: await spieltageLaden(kampagne.id) })))
}

/** Zeitungs-Pool (Geldregen + Wissensquiz Juli 2026) mit Standard-Teilnehmern je Spiel. */
export function useZeitungen(): SerienBasis | null {
  const [d, setD] = useState<SerienBasis | null>(null)
  useEffect(() => {
    serienDatenLaden().then(setD).catch(() => setD(null))
  }, [])
  return d
}

/** Teilnehmende Zeitungs-IDs einer Kampagne (Kampagne → sonst Standard des Spiels). */
export function teilnehmerIds(k: Kampagne, basis: SerienBasis): string[] {
  if (k.verlage.length) return k.verlage
  return basis.standard ? standardTeilnehmer(k.spielId, basis.standard) : basis.daten.zeitungen.map((z) => z.id)
}

type Props = { daten: KampagneMitTagen[] | null; fehler?: string | null }

export default function HeuteZuTun({ daten, fehler }: Props) {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const zeitungen = useZeitungen()

  if (fehler) return <p role="alert" style={{ color: '#6B0820' }}>{fehler}</p>
  if (!daten) return <p style={{ color: 'var(--tm-grau)' }}>{de ? 'Lade …' : 'Loading …'}</p>

  const zeilen: Array<{ k: Kampagne; s: Spieltag; ueberfaellig: boolean }> = []
  for (const { kampagne, spieltage } of daten) {
    const { ueberfaellig, naechster, korrekturen } = heuteZuTun(spieltage)
    for (const s of ueberfaellig) zeilen.push({ k: kampagne, s, ueberfaellig: true })
    if (naechster) zeilen.push({ k: kampagne, s: naechster, ueberfaellig: false })
    for (const s of korrekturen) zeilen.push({ k: kampagne, s, ueberfaellig: false })
  }

  if (zeilen.length === 0) {
    return (
      <LeererZustand
        titel={de ? 'Keine offenen Spieltage' : 'No open game days'}
        text={daten.length
          ? (de ? 'Alle Spieltage der laufenden Kampagnen sind freigegeben.' : 'All game days of running campaigns are approved.')
          : (de ? 'Noch keine Kampagne angelegt. Wähle oben ein Spiel und richte in Schritt 2 eine Kampagne ein.' : 'No campaign yet. Pick a game above and set up a campaign in step 2.')}
      />
    )
  }

  return (
    <ul className="cockpit-heute">
      {zeilen.map(({ k, s, ueberfaellig }) => {
        const gruppen = zeitungen ? verlagsgruppen(zeitungen.daten.zeitungen, teilnehmerIds(k, zeitungen)).map((g) => g.schluessel) : []
        const ampel = spieltagAmpel(k, s, gruppen)
        const link = `/cockpit/${k.spielId}?tag=${encodeURIComponent(s.id)}`
        return (
          <li key={s.id} className={`cockpit-heute-zeile ${ampel.farbe}`}>
            <div className="kopf">
              <Link href={`${link}&phase=${ampel.punkte.find((p) => !p.ok)?.phase ?? 4}`} className="titel">
                {spielName(k.spielId)} · {de ? 'Spieltag' : 'Day'} {s.nr}
              </Link>
              <span className="datum">
                {ueberfaellig ? (de ? 'überfällig – Ausgabe ' : 'overdue – issue ') : (de ? 'für die Ausgabe ' : 'for issue ')}
                {datumLang(s.datum, de)}
              </span>
            </div>
            <AmpelZeile ampel={ampel} de={de} basisLink={link} />
            {!ueberfaellig && (() => {
              // Tagesfristen (Anruf, Foto) nur für die nächsten Ausgaben zeigen; die monday-Deadline immer
              const tageBis = (new Date(s.datum + 'T12:00:00').getTime() - Date.now()) / 86400000
              const fristen = fristenFuer(k, s).filter((f) => f.art === 'deadline' || tageBis <= 3)
              return fristen.length ? (
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {fristen.map((f) => <FristChip key={f.art} frist={f} de={de} />)}
                </span>
              ) : null
            })()}
          </li>
        )
      })}
    </ul>
  )
}
