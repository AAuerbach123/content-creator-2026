'use client'

// Schritt 1 · Gestaltungsvorschlag wählen: A, B und C nebeneinander als echte Anzeige
// (aktueller Spieltag, gewählte Zeitung, 1 oder 4 Gewinner). Die Wahl wird in der Kampagne
// gespeichert (`vorlageAbc`) und gilt damit für Live-Vorschau, Gesamtprüfung, Kundenportal,
// Druck-PDFs und monday. Sind schon Spieltage ab heute freigegeben, fragt das Cockpit nach:
// Diese Tage müssen danach neu geprüft und freigegeben werden, die Verlage prüfen sie erneut.

import { useEffect, useMemo, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import AnzeigeVorschau, { type PruefStatus } from '@/app/serie/AnzeigeVorschau'
import { argsFuer, hoeheFuer, htmlFuer, inhaltFuer, kontextLaden, type AnzeigenKontext } from '@/lib/cockpit/anzeigen'
import { kampagneSpeichern, spieltagSpeichern } from '@/lib/cockpit/daten-client'
import { heuteIso } from '@/lib/cockpit/tagesstatus'
import type { Kampagne, Spieltag, VerlagsStatus } from '@/lib/cockpit/typen'
import type { Inhalt } from '@/lib/serie/spiele/typen'
import type { GewinnerAnzahl, Vorschlag } from '@/lib/serie/types'
import Hinweis from './Hinweis'

const VORSCHLAEGE: Vorschlag[] = ['A', 'B', 'C']

type Props = {
  kampagne: Kampagne
  spieltage: Spieltag[]
  /** Spieltag, der als Beispiel gezeigt wird (sonst der erste) */
  spieltag?: Spieltag
  onGewaehlt: (k: Kampagne, geaenderteTage: Spieltag[]) => void
}

export default function VorschlagWahl({ kampagne, spieltage, spieltag, onGewaehlt }: Props) {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const beispiel = spieltag ?? spieltage[0]
  const monat = beispiel?.datum.slice(0, 7) ?? kampagne.monat.slice(0, 7)
  const gewaehlt = ((kampagne.vorlageAbc as Vorschlag) ?? 'A') as Vorschlag

  const [kontext, setKontext] = useState<AnzeigenKontext | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [zeitungId, setZeitungId] = useState('')
  const [gewinner, setGewinner] = useState<GewinnerAnzahl>(4)
  const [anordnung, setAnordnung] = useState<'neben' | 'unter'>('neben')
  const [inhalt, setInhalt] = useState<Inhalt | null>(null)
  const [pruef, setPruef] = useState<Record<string, PruefStatus>>({})
  const [frage, setFrage] = useState<Vorschlag | null>(null)
  const [speichert, setSpeichert] = useState(false)
  const [meldung, setMeldung] = useState<string | null>(null)

  useEffect(() => {
    kontextLaden(kampagne, monat)
      .then((k) => { setKontext(k); setZeitungId((alt) => (k.zeitungen.some((z) => z.id === alt) ? alt : k.zeitungen[0]?.id ?? '')) })
      .catch((e) => setFehler(e instanceof Error ? e.message : String(e)))
  }, [kampagne, monat])

  useEffect(() => {
    if (!kontext || !beispiel) return
    let aktiv = true
    void inhaltFuer(kontext, beispiel).then((i) => { if (aktiv) setInhalt(i) })
    return () => { aktiv = false }
  }, [kontext, beispiel])

  const z = kontext?.zeitungen.find((x) => x.id === zeitungId) ?? kontext?.zeitungen[0]
  const htmls = useMemo(() => {
    if (!kontext || !z || !inhalt) return null
    return Object.fromEntries(VORSCHLAEGE.map((v) => [v, htmlFuer(argsFuer(kontext, z, inhalt, v, gewinner, monat))])) as Record<Vorschlag, string>
  }, [kontext, z, inhalt, gewinner, monat])

  // Bereits freigegebene Spieltage ab heute – die Verlage haben sie in der alten Gestaltung gesehen.
  const betroffen = useMemo(() => {
    const heute = heuteIso()
    return spieltage.filter((s) => s.status === 'freigegeben' && s.datum >= heute)
  }, [spieltage])

  const uebernehmen = async (v: Vorschlag, bestaetigt = false) => {
    if (v === gewaehlt && kampagne.vorlageAbc) return
    if (betroffen.length && !bestaetigt) { setFrage(v); return }
    setSpeichert(true)
    setMeldung(null)
    try {
      const geaendert: Spieltag[] = []
      for (const s of betroffen) {
        const vs: Record<string, VerlagsStatus> = {}
        for (const g of Object.keys(s.verlagsStatus ?? {})) vs[g] = 'tmi-pruefen'
        const neu: Spieltag = { ...s, status: 'vorbereitet', pruefung: undefined, verlagsStatus: Object.keys(vs).length ? vs : s.verlagsStatus }
        await spieltagSpeichern(neu)
        geaendert.push(neu)
      }
      const k: Kampagne = { ...kampagne, vorlageAbc: v, aktualisiertAm: Date.now() }
      await kampagneSpeichern(k)
      onGewaehlt(k, geaendert)
      setFrage(null)
      setMeldung(de
        ? `Vorschlag ${v} gilt jetzt für diese Kampagne.${geaendert.length ? ` ${geaendert.length} Spieltag(e) bitte neu prüfen und freigeben.` : ''}`
        : `Proposal ${v} now applies to this campaign.${geaendert.length ? ` Please re-check and approve ${geaendert.length} game day(s).` : ''}`)
    } catch (e) {
      setMeldung(String(e))
    } finally {
      setSpeichert(false)
    }
  }

  if (fehler) return <Hinweis art="rot">{fehler}</Hinweis>

  return (
    <section aria-label={de ? 'Gestaltungsvorschläge vergleichen' : 'Compare design proposals'}>
      <p style={{ margin: '0 0 12px', color: 'var(--tm-grau)', fontSize: 14 }}>
        {de
          ? 'Die drei Vorschläge als echte Anzeige mit dem Rätsel des gezeigten Spieltags. Die Wahl gilt für Vorschau, Prüfung, Kundenportal, Druck-PDFs und monday.'
          : 'All three proposals as real ads. Your choice applies to preview, check, client portal, print PDFs and monday.'}
        {beispiel ? (de ? ` Gezeigt: Spieltag ${beispiel.nr}.` : ` Shown: day ${beispiel.nr}.`) : ''}
      </p>

      <div className="cockpit-vorschlag-steuer">
        <div className="cockpit-feld" style={{ marginBottom: 0 }}>
          <label htmlFor="vw-zeitung">{de ? 'Zeitung' : 'Newspaper'}</label>
          <select id="vw-zeitung" value={z?.id ?? ''} onChange={(e) => setZeitungId(e.target.value)}>
            {kontext?.zeitungen.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <div className="segment" role="radiogroup" aria-label={de ? 'Gewinner-Fassung' : 'Winner version'}>
          {([1, 4] as const).map((g) => (
            <button key={g} type="button" role="radio" aria-checked={gewinner === g} className={gewinner === g ? 'an' : ''} onClick={() => setGewinner(g)}>
              {g} {de ? 'Gewinner' : g === 1 ? 'winner' : 'winners'}
            </button>
          ))}
        </div>
        <div className="segment" role="radiogroup" aria-label={de ? 'Anordnung' : 'Layout'}>
          <button type="button" role="radio" aria-checked={anordnung === 'neben'} className={anordnung === 'neben' ? 'an' : ''} onClick={() => setAnordnung('neben')}>{de ? 'Nebeneinander' : 'Side by side'}</button>
          <button type="button" role="radio" aria-checked={anordnung === 'unter'} className={anordnung === 'unter' ? 'an' : ''} onClick={() => setAnordnung('unter')}>{de ? 'Groß' : 'Large'}</button>
        </div>
      </div>

      {frage && (
        <Hinweis art="gold">
          <strong>{de ? `Auf Vorschlag ${frage} wechseln?` : `Switch to proposal ${frage}?`}</strong>{' '}
          {de
            ? `${betroffen.length} Spieltag(e) ab heute sind schon freigegeben (${betroffen.map((s) => s.nr).join(', ')}). Sie werden zurückgesetzt: neu prüfen, neu freigeben – die Verlage sehen sie dann erneut im Kundenportal.`
            : `${betroffen.length} game day(s) from today are already approved. They will be reset and must be checked and approved again.`}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" className="cockpit-knopf primaer" disabled={speichert} onClick={() => void uebernehmen(frage, true)}>
              {de ? 'Wechseln und neu prüfen lassen' : 'Switch and re-check'}
            </button>
            <button type="button" className="cockpit-knopf sekundaer" onClick={() => setFrage(null)}>{de ? 'Abbrechen' : 'Cancel'}</button>
          </div>
        </Hinweis>
      )}
      {meldung && <Hinweis art="gold">{meldung}</Hinweis>}

      {!htmls || !z ? (
        <p style={{ color: 'var(--tm-grau)' }}>{de ? 'Vorschläge werden erstellt …' : 'Building proposals …'}</p>
      ) : (
        <div className={`cockpit-vorschlaege ${anordnung}`}>
          {VORSCHLAEGE.map((v) => {
            const p = pruef[v]
            const e = p?.ergebnis
            const ampel = !p || p.laedt ? 'grau' : !e ? 'gelb' : !e.echt_ok ? 'rot' : 'gruen'
            const aktiv = v === gewaehlt && Boolean(kampagne.vorlageAbc)
            return (
              <article key={v} className={`cockpit-vorschlag${aktiv ? ' gewaehlt' : ''}`}>
                <header>
                  <strong>{de ? `Vorschlag ${v}` : `Proposal ${v}`}</strong>
                  {aktiv && <span className="cockpit-chip gruen">✓ {de ? 'gewählt' : 'chosen'}</span>}
                </header>
                <AnzeigeVorschau
                  html={htmls[v]}
                  hoehe={hoeheFuer(z)}
                  titel={de ? `Gestaltungsvorschlag ${v}` : `Design proposal ${v}`}
                  maxHoehe={anordnung === 'neben' ? 520 : 900}
                  onPruefung={(s) => setPruef((alt) => ({ ...alt, [v]: s }))}
                />
                <footer>
                  <span className={`cockpit-chip ${ampel}`} role="status">
                    {!p || p.laedt ? (de ? 'prüfe …' : 'checking …') : !e ? (de ? 'kein Prüfergebnis' : 'no result') : !e.echt_ok ? (de ? 'passt nicht' : 'does not fit') : (de ? 'passt ✓' : 'fits ✓')}
                  </span>
                  {aktiv ? null : (
                    <button type="button" className="cockpit-knopf primaer" disabled={speichert} onClick={() => void uebernehmen(v)}>
                      {de ? 'Diesen Vorschlag nehmen' : 'Use this proposal'}
                    </button>
                  )}
                </footer>
              </article>
            )
          })}
        </div>
      )}
      {inhalt?.muster && <p style={{ fontSize: 12, color: '#6B4A00' }}>{de ? 'Noch kein eigenes Rätsel – gezeigt wird das Muster aus der Präsentation (gelb).' : 'No puzzle yet – showing the sample.'}</p>}
    </section>
  )
}
