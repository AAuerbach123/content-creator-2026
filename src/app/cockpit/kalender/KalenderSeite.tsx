'use client'

// Kalender (Vorschlag 5): Monatsraster mit allen Spieltagen, Farbe = Ampel. Klick öffnet den Spieltag.
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import Karte from '@/components/cockpit/Karte'
import { kampagnenMitTagen, spielName, type KampagneMitTagen } from '@/components/cockpit/HeuteZuTun'
import { heuteIso, spieltagAmpel } from '@/lib/cockpit/tagesstatus'

const pad = (n: number) => String(n).padStart(2, '0')

export default function KalenderSeite() {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const [daten, setDaten] = useState<KampagneMitTagen[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [spiel, setSpiel] = useState('')
  const jetzt = new Date()
  const [monat, setMonat] = useState(`${jetzt.getFullYear()}-${pad(jetzt.getMonth() + 1)}`)

  useEffect(() => {
    kampagnenMitTagen().then(setDaten).catch((e) => setFehler(e instanceof Error ? e.message : String(e)))
  }, [])

  const eintraege = useMemo(() => {
    const out: Array<{ datum: string; spielId: string; nr: number; id: string; farbe: string; offen: number }> = []
    for (const { kampagne, spieltage } of daten ?? []) {
      if (spiel && kampagne.spielId !== spiel) continue
      for (const s of spieltage) {
        const a = spieltagAmpel(kampagne, s)
        out.push({ datum: s.datum, spielId: kampagne.spielId, nr: s.nr, id: s.id, farbe: a.farbe, offen: a.offen })
      }
    }
    return out
  }, [daten, spiel])

  const monateMitDaten = useMemo(() => [...new Set(eintraege.map((e) => e.datum.slice(0, 7)))].sort(), [eintraege])
  const spiele = useMemo(() => [...new Set((daten ?? []).map((d) => d.kampagne.spielId))], [daten])

  const [jahr, mon] = monat.split('-').map(Number)
  const erster = new Date(jahr, mon - 1, 1)
  const tageImMonat = new Date(jahr, mon, 0).getDate()
  const versatz = (erster.getDay() + 6) % 7 // Montag = 0
  const zellen: Array<string | null> = [...Array(versatz).fill(null), ...Array.from({ length: tageImMonat }, (_, i) => `${monat}-${pad(i + 1)}`)]
  while (zellen.length % 7) zellen.push(null)
  const heute = heuteIso()
  const wechsel = (d: number) => {
    const n = new Date(jahr, mon - 1 + d, 1)
    setMonat(`${n.getFullYear()}-${pad(n.getMonth() + 1)}`)
  }
  const wochentage = de ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 24 }}>{de ? 'Kalender' : 'Calendar'}</h2>
          <p style={{ margin: 0, color: 'var(--tm-grau)' }}>{de ? 'Alle Spieltage im Überblick. Grün = fertig, Gelb = in Arbeit, Rot = Problem, Grau = noch nichts.' : 'All game days. Green = done, yellow = in progress, red = problem, grey = not started.'}</p>
        </div>
        <div className="cockpit-feld" style={{ marginLeft: 'auto', marginBottom: 0, minWidth: 220 }}>
          <label htmlFor="kal-spiel">{de ? 'Spiel' : 'Game'}</label>
          <select id="kal-spiel" value={spiel} onChange={(e) => setSpiel(e.target.value)}>
            <option value="">{de ? 'alle Spiele' : 'all games'}</option>
            {spiele.map((s) => <option key={s} value={s}>{spielName(s)}</option>)}
          </select>
        </div>
      </div>

      {fehler && <p role="alert">{fehler}</p>}

      <Karte
        titel={erster.toLocaleDateString(de ? 'de-DE' : 'en-GB', { month: 'long', year: 'numeric' })}
        aktion={
          <span style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="cockpit-knopf sekundaer" onClick={() => wechsel(-1)} aria-label={de ? 'Vorheriger Monat' : 'Previous month'}>←</button>
            <button type="button" className="cockpit-knopf sekundaer" onClick={() => setMonat(`${jetzt.getFullYear()}-${pad(jetzt.getMonth() + 1)}`)}>{de ? 'Heute' : 'Today'}</button>
            <button type="button" className="cockpit-knopf sekundaer" onClick={() => wechsel(1)} aria-label={de ? 'Nächster Monat' : 'Next month'}>→</button>
          </span>
        }
      >
        {monateMitDaten.length > 0 && (
          <p style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {de ? 'Monate mit Spieltagen:' : 'Months with game days:'}
            {monateMitDaten.map((m) => (
              <button key={m} type="button" className={`cockpit-knopf ${m === monat ? 'primaer' : 'text'}`} style={{ minHeight: 32, padding: '4px 10px' }} onClick={() => setMonat(m)}>
                {new Date(m + '-15').toLocaleDateString(de ? 'de-DE' : 'en-GB', { month: 'short', year: '2-digit' })}
              </button>
            ))}
          </p>
        )}
        <div className="cockpit-kalender" role="grid" aria-label={de ? 'Monatskalender' : 'Month calendar'}>
          {wochentage.map((w) => <div key={w} className="kopf" role="columnheader">{w}</div>)}
          {zellen.map((d, i) => (
            <div key={i} className={`zelle${d === heute ? ' heute' : ''}${d ? '' : ' leer'}`} role="gridcell">
              {d && <span className="tag">{Number(d.slice(8))}</span>}
              {d && eintraege.filter((e) => e.datum === d).map((e) => (
                <Link key={e.id} href={`/cockpit/${e.spielId}?tag=${encodeURIComponent(e.id)}&phase=2`} className={`eintrag ${e.farbe}`} title={`${spielName(e.spielId)} · ${de ? 'Spieltag' : 'Day'} ${e.nr} · ${e.offen} ${de ? 'offen' : 'open'}`}>
                  {spielName(e.spielId)} {e.nr}
                </Link>
              ))}
            </div>
          ))}
        </div>
        {daten && eintraege.length === 0 && <p style={{ marginTop: 12 }}>{de ? 'Noch keine Spieltage angelegt.' : 'No game days yet.'}</p>}
      </Karte>
    </div>
  )
}
