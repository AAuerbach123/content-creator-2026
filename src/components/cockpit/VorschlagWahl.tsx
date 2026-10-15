'use client'

// Schritt 1 · Gestaltung wählen.
//  • Oben: die drei festen, geprüften Vorschläge A, B, C als echte Anzeige.
//  • Darunter: „3 KI-Varianten erzeugen“ – je Vorschlag eine Variante mit neuen Farben, Titel und Unterzeile
//    (Raster, Rufnummern, Teilnahmebedingungen bleiben). Varianten lassen sich anpassen.
// Die Wahl wird in der Kampagne gespeichert (`vorlageAbc` + `gestaltung`) und gilt für Live-Vorschau,
// Gesamtprüfung, Kundenportal und Druck-PDFs. Sind schon Spieltage ab heute freigegeben, fragt das Cockpit nach:
// Diese Tage gehen zurück auf „neu prüfen und freigeben“, die Verlage prüfen sie erneut.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import AnzeigeVorschau, { type PruefStatus } from '@/app/serie/AnzeigeVorschau'
import { argsFuer, hoeheFuer, htmlFuer, inhaltFuer, kontextLaden, type AnzeigenKontext } from '@/lib/cockpit/anzeigen'
import { kampagneSpeichern, spieltagSpeichern } from '@/lib/cockpit/daten-client'
import { heuteIso } from '@/lib/cockpit/tagesstatus'
import type { Kampagne, Spieltag, VerlagsStatus } from '@/lib/cockpit/typen'
import type { Inhalt } from '@/lib/serie/spiele/typen'
import type { GewinnerAnzahl, Vorschlag } from '@/lib/serie/types'
import { farbenAbsichern, type Variante } from '@/lib/serie/variante'
import Hinweis from './Hinweis'

const VORSCHLAEGE: Vorschlag[] = ['A', 'B', 'C']
const GELDREGEN_ORIGINAL = {
  A: { titel: 'Geldregen', unterzeile: 'Mit einem Anruf bis zu **10.000 €** gewinnen', stil: 'dunkelblau mit Gold, goldener Schriftzug' },
  B: { titel: 'Es regnet|Geld.', unterzeile: 'Mit einem Anruf bis zu **10.000 €** gewinnen', stil: 'weiß mit Farbspalte links (Hausfarbe der Zeitung)' },
  C: { titel: 'GELDREGEN', unterzeile: 'Mit einem Anruf bis zu **10.000 €** gewinnen', stil: 'Verlauf in Hausfarbe, Preistafel als Tabelle' },
}

type Auswahl = { vorschlag: Vorschlag; variante: Variante | null }

type Props = {
  kampagne: Kampagne
  spieltage: Spieltag[]
  spieltag?: Spieltag
  onGewaehlt: (k: Kampagne, geaenderteTage: Spieltag[]) => void
}

function hoechstgewinn(k: Kampagne): string {
  const p = k.preise
  const n = p.art === 'geldpakete' ? Math.max(...p.stufen.map((s) => s.betrag)) : p.art === 'tagespreis' ? Math.max(p.tagespreis, p.supermittwoch ?? 0) : Math.max(...p.wochen.map((w) => (w.jackpotAn ? w.jackpotBetrag ?? w.tagespreis : w.tagespreis)))
  return `${n.toLocaleString('de-DE')} €`
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
  const [frage, setFrage] = useState<Auswahl | null>(null)
  const [speichert, setSpeichert] = useState(false)
  const [meldung, setMeldung] = useState<string | null>(null)
  const [wunsch, setWunsch] = useState('')
  const [erzeugt, setErzeugt] = useState(false)
  const [varianten, setVarianten] = useState<Variante[]>(kampagne.varianten ?? [])

  useEffect(() => { setVarianten(kampagne.varianten ?? []) }, [kampagne.varianten])

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
  const bauen = (v: Vorschlag, variante: Variante | null) =>
    kontext && z && inhalt ? htmlFuer(argsFuer(kontext, z, inhalt, v, gewinner, monat, variante)) : ''
  const originale = useMemo(() => Object.fromEntries(VORSCHLAEGE.map((v) => [v, bauen(v, null)])) as Record<Vorschlag, string>,
    [kontext, z, inhalt, gewinner, monat]) // eslint-disable-line react-hooks/exhaustive-deps
  const variantenHtml = useMemo(() => Object.fromEntries(varianten.map((x) => [x.id, bauen(x.basis, x)])) as Record<string, string>,
    [kontext, z, inhalt, gewinner, monat, varianten]) // eslint-disable-line react-hooks/exhaustive-deps

  const betroffen = useMemo(() => {
    const heute = heuteIso()
    return spieltage.filter((s) => s.status === 'freigegeben' && s.datum >= heute)
  }, [spieltage])

  const istAktiv = (a: Auswahl) => Boolean(kampagne.vorlageAbc) && a.vorschlag === gewaehlt && (a.variante ? kampagne.gestaltung?.id === a.variante.id && JSON.stringify(kampagne.gestaltung) === JSON.stringify(a.variante) : !kampagne.gestaltung)

  const uebernehmen = async (a: Auswahl, bestaetigt = false) => {
    if (istAktiv(a)) return
    if (betroffen.length && !bestaetigt) { setFrage(a); return }
    setSpeichert(true)
    setMeldung(null)
    try {
      const geaendert: Spieltag[] = []
      for (const s of betroffen) {
        const vs: Record<string, VerlagsStatus> = {}
        for (const g of Object.keys(s.verlagsStatus ?? {})) vs[g] = 'tmi-pruefen'
        const neu: Spieltag = { ...s, status: 'vorbereitet', pruefung: undefined, freigabe: undefined, verlagsStatus: Object.keys(vs).length ? vs : s.verlagsStatus }
        await spieltagSpeichern(neu)
        geaendert.push(neu)
      }
      const k: Kampagne = { ...kampagne, vorlageAbc: a.vorschlag, gestaltung: a.variante ?? undefined, varianten, aktualisiertAm: Date.now() }
      await kampagneSpeichern(k)
      onGewaehlt(k, geaendert)
      setFrage(null)
      const was = a.variante ? `${de ? 'Variante' : 'Variant'} „${a.variante.name}“ (${a.vorschlag})` : `${de ? 'Vorschlag' : 'Proposal'} ${a.vorschlag}`
      setMeldung(de
        ? `${was} gilt jetzt für diese Kampagne.${geaendert.length ? ` ${geaendert.length} Spieltag(e) bitte neu prüfen und freigeben.` : ''}`
        : `${was} now applies to this campaign.${geaendert.length ? ` Please re-check ${geaendert.length} game day(s).` : ''}`)
    } catch (e) {
      setMeldung(String(e))
    } finally {
      setSpeichert(false)
    }
  }

  const erzeugen = async () => {
    setErzeugt(true)
    setMeldung(null)
    try {
      const spiel = kontext?.spiel
      const hg = hoechstgewinn(kampagne)
      const original = spiel
        ? Object.fromEntries(VORSCHLAEGE.map((v) => [v, { titel: spiel.titel, unterzeile: spiel.unterzeile.replace('{TAGESPREIS}', hg).replace('{SUPERTAG}', ''), stil: v === 'A' ? 'dunkelblau mit Gold' : v === 'B' ? 'weiß mit Farbspalte (Hausfarbe)' : 'Verlauf in Hausfarbe' }]))
        : GELDREGEN_ORIGINAL
      const datum = new Date((kampagne.monat.slice(0, 7)) + '-15T12:00:00')
      const zeitraum = datum.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) + (kampagne.monatBis ? ` bis ${new Date(kampagne.monatBis + '-15T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}` : '')
      const r = await fetch('/api/cockpit/varianten', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spielName: spiel?.name ?? 'Geldregen', zeitraum, hoechstgewinn: hg, original, wunsch }),
      })
      const j = (await r.json()) as { varianten?: Variante[]; fehler?: string }
      if (!r.ok || !j.varianten) throw new Error(j.fehler ?? `HTTP ${r.status}`)
      setVarianten(j.varianten)
      const k: Kampagne = { ...kampagne, varianten: j.varianten, aktualisiertAm: Date.now() }
      await kampagneSpeichern(k)
      onGewaehlt(k, [])
    } catch (e) {
      setMeldung((de ? 'Varianten konnten nicht erzeugt werden: ' : 'Could not create variants: ') + (e instanceof Error ? e.message : String(e)))
    } finally {
      setErzeugt(false)
    }
  }

  const anpassen = (id: string, teil: Partial<Variante>) => {
    setVarianten((alt) => alt.map((x) => (x.id === id ? farbenAbsichern({ ...x, ...teil }) : x)))
  }
  const anpassungSpeichern = async () => {
    const k: Kampagne = { ...kampagne, varianten, aktualisiertAm: Date.now() }
    await kampagneSpeichern(k)
    onGewaehlt(k, [])
  }

  if (fehler) return <Hinweis art="rot">{fehler}</Hinweis>

  const karte = (schluessel: string, titel: string, untertitel: string | undefined, html: string, a: Auswahl, extra?: ReactNode) => {
    const p = pruef[schluessel]
    const e = p?.ergebnis
    const ampel = !p || p.laedt ? 'grau' : !e ? 'gelb' : !e.echt_ok ? 'rot' : 'gruen'
    const aktiv = istAktiv(a)
    return (
      <article key={schluessel} className={`cockpit-vorschlag${aktiv ? ' gewaehlt' : ''}`}>
        <header>
          <div style={{ minWidth: 0 }}>
            <strong>{titel}</strong>
            {untertitel && <div style={{ fontSize: 13, color: 'var(--tm-grau)' }}>{untertitel}</div>}
          </div>
          {aktiv && <span className="cockpit-chip gruen">✓ {de ? 'gewählt' : 'chosen'}</span>}
        </header>
        {z && html && (
          <AnzeigeVorschau
            html={html}
            hoehe={hoeheFuer(z)}
            titel={titel}
            maxHoehe={anordnung === 'neben' ? 520 : 900}
            onPruefung={(s) => setPruef((alt) => ({ ...alt, [schluessel]: s }))}
          />
        )}
        {extra}
        <footer>
          <span className={`cockpit-chip ${ampel}`} role="status">
            {!p || p.laedt ? (de ? 'prüfe …' : 'checking …') : !e ? (de ? 'kein Prüfergebnis' : 'no result') : !e.echt_ok ? (de ? 'passt nicht' : 'does not fit') : (de ? 'passt ✓' : 'fits ✓')}
          </span>
          {!aktiv && (
            <button type="button" className="cockpit-knopf primaer" disabled={speichert || ampel === 'rot'} onClick={() => void uebernehmen(a)}
              title={ampel === 'rot' ? (de ? 'Passt nicht ins Format – erst anpassen' : 'Does not fit') : undefined}>
              {a.variante ? (de ? 'Diese Variante nehmen' : 'Use this variant') : (de ? 'Diesen Vorschlag nehmen' : 'Use this proposal')}
            </button>
          )}
        </footer>
      </article>
    )
  }

  return (
    <section aria-label={de ? 'Gestaltung wählen' : 'Choose design'}>
      <p style={{ margin: '0 0 12px', color: 'var(--tm-grau)', fontSize: 14 }}>
        {de
          ? 'Oben die drei festen Vorschläge, darunter KI-Varianten davon. Gezeigt wird die echte Anzeige mit dem Rätsel des Spieltags. Die Wahl gilt für Vorschau, Prüfung, Kundenportal und Druck-PDFs.'
          : 'The three fixed proposals and AI variants of them, shown as real ads. Your choice applies everywhere.'}
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
          <strong>{de ? 'Gestaltung wechseln?' : 'Switch design?'}</strong>{' '}
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

      <h3 className="cockpit-vorschlag-titel">{de ? 'Die drei Vorschläge' : 'The three proposals'}</h3>
      {!inhalt || !z ? (
        <p style={{ color: 'var(--tm-grau)' }}>{de ? 'Vorschläge werden erstellt …' : 'Building proposals …'}</p>
      ) : (
        <div className={`cockpit-vorschlaege ${anordnung}`}>
          {VORSCHLAEGE.map((v) => karte(`o-${v}`, de ? `Vorschlag ${v}` : `Proposal ${v}`, de ? 'Original' : 'original', originale[v], { vorschlag: v, variante: null }))}
        </div>
      )}

      <h3 className="cockpit-vorschlag-titel">{de ? 'KI-Varianten' : 'AI variants'}</h3>
      <p style={{ margin: '0 0 10px', color: 'var(--tm-grau)', fontSize: 14 }}>
        {de
          ? 'Die KI macht aus jedem Vorschlag eine Variante mit neuen Farben, eigenem Titel und eigener Unterzeile. Raster, Rufnummern und Teilnahmebedingungen bleiben unverändert.'
          : 'The AI creates one variant per proposal with new colours, title and subline. Layout, numbers and terms stay unchanged.'}
      </p>
      <div className="cockpit-vorschlag-steuer">
        <div className="cockpit-feld" style={{ marginBottom: 0 }}>
          <label htmlFor="vw-wunsch">{de ? 'Wunsch oder Anlass (freiwillig)' : 'Wish or occasion (optional)'}</label>
          <input id="vw-wunsch" type="text" value={wunsch} onChange={(e) => setWunsch(e.target.value)} placeholder={de ? 'z. B. Advent, festlich, warme Farben' : 'e.g. Christmas, warm colours'} />
        </div>
        <button type="button" className="cockpit-knopf primaer" disabled={erzeugt} onClick={() => void erzeugen()}>
          {erzeugt ? (de ? 'KI arbeitet …' : 'AI working …') : varianten.length ? (de ? '3 neue Varianten erzeugen' : 'Create 3 new variants') : (de ? '3 Varianten erzeugen' : 'Create 3 variants')}
        </button>
      </div>
      {varianten.length > 0 && z && inhalt && (
        <div className={`cockpit-vorschlaege ${anordnung}`}>
          {varianten.map((x) =>
            karte(`v-${x.id}`, `${x.name} · ${de ? 'aus' : 'from'} ${x.basis}`, x.idee, variantenHtml[x.id] ?? '', { vorschlag: x.basis, variante: x },
              <details className="cockpit-variante-anpassen">
                <summary>{de ? 'Anpassen' : 'Adjust'}</summary>
                <label>{de ? 'Titel („|“ = neue Zeile)' : 'Title'}<input type="text" value={x.titel ?? ''} onChange={(e) => anpassen(x.id, { titel: e.target.value })} /></label>
                <label>{de ? 'Unterzeile (**fett**)' : 'Subline'}<input type="text" value={x.unterzeile ?? ''} onChange={(e) => anpassen(x.id, { unterzeile: e.target.value })} /></label>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <label className="farbe">{de ? 'Grundfarbe' : 'Base'}<input type="color" value={x.grund} onChange={(e) => anpassen(x.id, { grund: e.target.value })} /></label>
                  <label className="farbe">{de ? 'Akzent' : 'Accent'}<input type="color" value={x.akzent} onChange={(e) => anpassen(x.id, { akzent: e.target.value })} /></label>
                  {x.basis !== 'A' && (
                    <label className="farbe"><input type="checkbox" checked={x.eigeneFarbe !== false} onChange={(e) => anpassen(x.id, { eigeneFarbe: e.target.checked })} />{de ? 'statt Hausfarbe der Zeitung' : 'instead of house colour'}</label>
                  )}
                </div>
                <button type="button" className="cockpit-knopf sekundaer" onClick={() => void anpassungSpeichern()}>{de ? 'Anpassung speichern' : 'Save'}</button>
                <p style={{ fontSize: 12, color: 'var(--tm-grau)', margin: 0 }}>{de ? 'Farben werden automatisch so angepasst, dass Schrift gut lesbar bleibt. Ist die Variante schon gewählt, mit „Diese Variante nehmen“ erneut übernehmen.' : 'Colours are adjusted for legibility.'}</p>
              </details>,
            ),
          )}
        </div>
      )}
      {inhalt?.muster && <p style={{ fontSize: 12, color: '#6B4A00' }}>{de ? 'Noch kein eigenes Rätsel – gezeigt wird das Muster aus der Präsentation (gelb).' : 'No puzzle yet – showing the sample.'}</p>}
    </section>
  )
}
