'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import { GELDREGEN_EINTRAG, SPIELE } from '@/lib/serie/spiele'
import Karte from '@/components/cockpit/Karte'
import StatusChip, { type Status } from '@/components/cockpit/StatusChip'
import LeererZustand from '@/components/cockpit/LeererZustand'

type Kachel = {
  id: string
  name: string
  monate: string[]
  modell: string
  beschreibung: string
}

const MONAT_NAME: Record<string, { de: string; en: string }> = {
  '01': { de: 'Januar',    en: 'January' },
  '02': { de: 'Februar',   en: 'February' },
  '03': { de: 'März',      en: 'March' },
  '04': { de: 'April',     en: 'April' },
  '05': { de: 'Mai',       en: 'May' },
  '06': { de: 'Juni',      en: 'June' },
  '07': { de: 'Juli',      en: 'July' },
  '08': { de: 'August',    en: 'August' },
  '09': { de: 'September', en: 'September' },
  '10': { de: 'Oktober',   en: 'October' },
  '11': { de: 'November',  en: 'November' },
  '12': { de: 'Dezember',  en: 'December' },
}

export default function CockpitStartseite() {
  const { T, sprache } = useSprache()

  const kacheln = useMemo<Kachel[]>(() => {
    const spiele: Kachel[] = SPIELE.map((s) => ({
      id: s.id,
      name: s.name,
      monate: s.monate,
      modell: s.modell,
      beschreibung: s.beschreibung,
    }))
    const alle = [
      { id: GELDREGEN_EINTRAG.id, name: GELDREGEN_EINTRAG.name, monate: GELDREGEN_EINTRAG.monate, modell: GELDREGEN_EINTRAG.modell, beschreibung: GELDREGEN_EINTRAG.beschreibung },
      ...spiele,
    ]
    return alle.sort((a, b) => (a.monate[0] ?? '').localeCompare(b.monate[0] ?? ''))
  }, [])

  const monatsName = (m: string): string => {
    const nr = m.slice(5, 7)
    return MONAT_NAME[nr]?.[sprache] ?? m
  }

  // Status aktuell per Platzhalter – echter Status folgt in Phase 4 aus kampagnen-Store
  const status: Status = 'vorbereitet'

  return (
    <>
      <section aria-label={T('cockpitFrage')} style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 22 }}>{T('cockpitFrage')}</h2>
        <div className="cockpit-kacheln">
          {kacheln.map((k) => (
            <Link key={k.id} href={`/cockpit/${k.id}`} className="cockpit-kachel">
              <span className="monat">{k.monate.map(monatsName).join(' · ')}</span>
              <span className="name">{k.name}</span>
              <span className="modell">{k.modell}</span>
              <span className="fuss">
                <StatusChip status={status} sprache={sprache} />
                <span aria-hidden style={{ color: 'var(--tm-rot)' }}>→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="cockpit-zweispalt">
        <Karte titel={T('cockpitHeuteZuTun')}>
          <LeererZustand
            titel={T('cockpitKeineOffenen')}
            text={sprache === 'de'
              ? 'Sobald eine Kampagne läuft, erscheinen hier die Spieltage, die heute Rätsel, Gewinner oder Freigabe brauchen.'
              : 'Once a campaign is running, the game days needing puzzles, winners or approval appear here.'
            }
          />
        </Karte>

        <Karte titel={T('cockpitGemeinsameBausteine')}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            <li><Link className="cockpit-knopf sekundaer" href="/cockpit/baustein/v">{T('cockpitBausteinV')}</Link></li>
            <li><Link className="cockpit-knopf sekundaer" href="/cockpit/baustein/g">{T('cockpitBausteinG')}</Link></li>
            <li><Link className="cockpit-knopf sekundaer" href="/cockpit/baustein/f">{T('cockpitBausteinF')}</Link></li>
          </ul>
        </Karte>

        <Karte
          titel={sprache === 'de' ? 'Zeitungen & Rufnummern' : 'Newspapers & phone numbers'}
          hinweis={sprache === 'de'
            ? 'Für jedes Spiel eine eigene Liste hochladen (Excel oder CSV): welche Zeitungen mitmachen und mit welcher Telefonnummer.'
            : 'Upload a separate list for each game (Excel or CSV): which newspapers take part and with which phone number.'}
        >
          <Link className="cockpit-knopf primaer" href="/cockpit/zeitungen">{sprache === 'de' ? 'Liste hochladen' : 'Upload list'}</Link>
        </Karte>
      </div>
    </>
  )
}
