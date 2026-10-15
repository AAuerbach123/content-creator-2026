'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import { GELDREGEN_EINTRAG, SPIELE } from '@/lib/serie/spiele'
import Karte from '@/components/cockpit/Karte'
import HeuteZuTun, { kampagnenMitTagen, teilnehmerIds, useZeitungen, type KampagneMitTagen } from '@/components/cockpit/HeuteZuTun'
import { verlagsgruppen } from '@/lib/cockpit/verlagsgruppen'
import { geldregenNovDezSicherstellen } from '@/lib/cockpit/import'
import { useIch } from '@/components/cockpit/IchKontext'
import { heuteZuTun, spieltagAmpel } from '@/lib/cockpit/tagesstatus'

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

  const [daten, setDaten] = useState<KampagneMitTagen[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [altdaten, setAltdaten] = useState(0)
  const { ich, darf } = useIch()
  const zeitungsDaten = useZeitungen()

  useEffect(() => {
    if (!ich) return
    void (async () => {
      // Geldregen Nov+Dez 2027 (durchgehend) automatisch bereitstellen – einmalig, feste IDs
      if (darf('bearbeiten')) await geldregenNovDezSicherstellen().catch(() => false)
      await kampagnenMitTagen().then(setDaten).catch((e) => setFehler(e instanceof Error ? e.message : String(e)))
    })()
    // Hinweis, falls in diesem Browser noch alte (nur lokal gespeicherte) Cockpit-Daten liegen
    void (async () => {
      try {
        if (window.localStorage.getItem('cockpit:uebernahme-erledigt')) return
        const { getDb } = await import('@/lib/db')
        setAltdaten(await getDb().kampagnen.count())
      } catch { /* kein IndexedDB */ }
    })()
  }, [ich]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Status-Chip je Spiel: nächster offener Spieltag der neuesten Kampagne. */
  const spielStatus = (spielId: string): { klasse: string; text: string } => {
    const kd = daten?.find((d) => d.kampagne.spielId === spielId)
    if (!kd) return { klasse: 'grau', text: sprache === 'de' ? 'keine Kampagne' : 'no campaign' }
    const { ueberfaellig, naechster } = heuteZuTun(kd.spieltage)
    if (ueberfaellig.length) return { klasse: 'rot', text: sprache === 'de' ? `${ueberfaellig.length} überfällig` : `${ueberfaellig.length} overdue` }
    if (!naechster) return { klasse: 'gruen', text: sprache === 'de' ? 'alles freigegeben' : 'all approved' }
    const gruppen = zeitungsDaten ? verlagsgruppen(zeitungsDaten.daten.zeitungen, teilnehmerIds(kd.kampagne, zeitungsDaten)).map((g) => g.schluessel) : []
    const a = spieltagAmpel(kd.kampagne, naechster, gruppen)
    return { klasse: a.farbe, text: sprache === 'de' ? `Tag ${naechster.nr}: ${a.offen} offen` : `Day ${naechster.nr}: ${a.offen} open` }
  }

  return (
    <>
      {altdaten > 0 && (
        <div className="cockpit-hinweis gold" style={{ marginBottom: 16 }}>
          {sprache === 'de'
            ? `In diesem Browser liegen noch ${altdaten} Kampagne(n) aus der Zeit vor dem zentralen Speicher. `
            : `This browser still holds ${altdaten} campaign(s) from before the central storage. `}
          {darf('admin')
            ? <Link href="/cockpit/team" className="cockpit-knopf text">{sprache === 'de' ? 'Jetzt übernehmen' : 'Upload now'}</Link>
            : (sprache === 'de' ? 'Bitte eine Person mit Admin-Rolle bitten, sie unter „Team“ zu übernehmen.' : 'Ask an admin to upload them under “Team”.')}
        </div>
      )}

      <section aria-label={T('cockpitHeuteZuTun')} style={{ marginBottom: 28 }} data-tour="heute">
        <Karte titel={T('cockpitHeuteZuTun')} aktion={<Link href="/cockpit/kalender" className="cockpit-knopf text">{sprache === 'de' ? 'Kalender →' : 'Calendar →'}</Link>}>
          <HeuteZuTun daten={daten} fehler={fehler} />
        </Karte>
      </section>

      <section aria-label={T('cockpitFrage')} style={{ marginBottom: 28 }} data-tour="spiele">
        <h2 style={{ margin: '0 0 16px', fontSize: 22 }}>{T('cockpitFrage')}</h2>
        <div className="cockpit-kacheln">
          {kacheln.map((k) => (
            <Link key={k.id} href={`/cockpit/${k.id}`} className="cockpit-kachel">
              <span className="monat">{k.monate.map(monatsName).join(' · ')}</span>
              <span className="name">{k.name}</span>
              <span className="modell">{k.modell}</span>
              <span className="fuss">
                <span className={`cockpit-chip ${spielStatus(k.id).klasse}`}>{spielStatus(k.id).text}</span>
                <span aria-hidden style={{ color: 'var(--tm-rot)' }}>→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="cockpit-zweispalt">
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
