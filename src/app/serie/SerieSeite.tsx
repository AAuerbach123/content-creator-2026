'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HandbuchKnopf from '@/components/HandbuchKnopf'
import HilfePopover from '@/components/HilfePopover'
import { useFenster } from '@/components/KartenGrid'
import SpracheUmschalter from '@/components/SpracheUmschalter'
import { useSprache } from '@/components/SpracheProvider'
import { pad2 } from '@/lib/serie/generator'
import type { MondaySpieltag } from '@/lib/serie/monday-typen'
import { serienGewinnerLaden, type SerienGewinner } from '@/lib/db'
import { datenMitStamm, einfuehrungLaden, stammLaden, type EinfuehrungEintrag, type ZeitungenStamm } from '@/lib/cockpit/zeitungen-stamm'
import { htmlMaskieren, sichtbar, spielMitText, type SerieFrage, type TextOverride } from '@/lib/serie/serie-ki'
import {
  anzeigeDateiname,
  anzeigeHoehe,
  anzeigeHtml,
  fragenAnwenden,
  geldregenInhalte,
  htmlPruefen,
  inhaltPruefen,
  serienDatenLaden,
  type SerienBasis,
  type VorschauArgs,
} from '@/lib/serie/serie-client'
import { katalog } from '@/lib/serie/spiele'
import { MONATE } from '@/lib/serie/spiele/kalender'
import type { Inhalt, SpielDef } from '@/lib/serie/spiele/typen'
import type { GewinnerAnzahl, Pruefergebnis, Vorschlag, Zeitung } from '@/lib/serie/types'
import AnzeigeVorschau, { PruefAmpel, type PruefStatus } from './AnzeigeVorschau'
import FragenPanel from './FragenPanel'
import GewinnerPanel, { fotoUrl } from './GewinnerPanel'
import MailPanel from './MailPanel'
import MondayPanel from './MondayPanel'
import NeuesSpielPanel from './NeuesSpielPanel'
import { GRAU_TEXT, HELLGRAU, ROT, TEXT, eingabe, gesperrt, hinweisGelb, hinweisRot, karte, kartenTitel, knopf, knopfKlein, label, segment } from './stil'

// Seite „Serien-Anzeigen“ (/serie): Spiel, Monat, Zeitungen, Vorschlag A/B/C, Gewinner 1/4, Spieltag wählen →
// Live-Vorschau (iframe) mit Prüfampel aus dem Einpass-Skript, A/B/C-Vergleich, Prüflauf über alle gewählten
// Zeitungen, Mail-Versand (über das Mail-Programm), KI (Umsetzungsvarianten, Tagesfragen, Text verbessern) und
// monday.com-Übertragung. Geldregen läuft über den freigegebenen Generator (generator.ts), alle anderen Spiele
// über die Rahmen-Engine (rahmen.ts).

const KATALOG = katalog()
const VORSCHLAEGE: Vorschlag[] = ['A', 'B', 'C']

function monatName(m: string, sprache: 'de' | 'en'): string {
  const [j, mm] = m.split('-').map(Number)
  if (sprache === 'en') return new Date(Date.UTC(j, mm - 1, 1)).toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
  return `${MONATE[mm]} ${j}`
}

type LaufErgebnis = { z: Zeitung; ergebnis: Pruefergebnis | null; fehler: string[]; platzhalter: string[] }

export default function SerieSeite() {
  const { T, sprache } = useSprache()
  const fenster = useFenster()
  const breit = !!fenster && fenster.w >= 1100
  const mittel = !!fenster && fenster.w >= 720
  const schmal = !fenster || fenster.w < 640

  const [basisRoh, setBasis] = useState<SerienBasis | null>(null)
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)
  const [spielId, setSpielId] = useState<string>('geldregen')
  const [monat, setMonat] = useState<string>('2027-11')
  // Rufnummern + Teilnehmer je Spiel (Cockpit → Zeitungen & Rufnummern) und Einführungstext 1. Spieltag
  const [stamm, setStamm] = useState<ZeitungenStamm | undefined>(undefined)
  const [einf, setEinf] = useState<EinfuehrungEintrag | undefined>(undefined)
  const basis = useMemo<SerienBasis | null>(
    () => (basisRoh ? (stamm ? { ...basisRoh, daten: datenMitStamm(basisRoh.daten, stamm) } : basisRoh) : null),
    [basisRoh, stamm],
  )
  const [gewaehlt, setGewaehlt] = useState<string[]>([])
  const [vorschauId, setVorschauId] = useState<string>('')
  const [vorschlag, setVorschlag] = useState<Vorschlag>('A')
  const [gewinner, setGewinner] = useState<GewinnerAnzahl>(1)
  const [tagIndex, setTagIndex] = useState(0)
  const [override, setOverride] = useState<TextOverride | null>(null)
  const [kiFragen, setKiFragen] = useState<SerieFrage[] | null>(null)
  const [kiFragenAktiv, setKiFragenAktiv] = useState(false)
  const [pruefung, setPruefung] = useState<PruefStatus>({ laedt: true, ergebnis: null })
  const [abc, setAbc] = useState<Record<string, PruefStatus>>({})
  const [lauf, setLauf] = useState<{ fertig: number; gesamt: number; ergebnisse: LaufErgebnis[] } | null>(null)
  const laufStop = useRef(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    serienDatenLaden()
      .then((b) => {
        setBasis(b)
        setGewaehlt(b.daten.zeitungen.map((z) => z.id))
        setVorschauId(b.daten.zeitungen[0]?.id ?? '')
      })
      .catch((e) => setLadeFehler(e instanceof Error ? e.message : String(e)))
  }, [])

  // Startseite „Spiele 2027" setzt /serie?spiel=<id> – vorausgewähltes Spiel übernehmen.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const vorgewaehlt = new URLSearchParams(window.location.search).get('spiel')
    if (!vorgewaehlt) return
    const k = KATALOG.find((x) => x.id === vorgewaehlt)
    if (k) {
      setSpielId(vorgewaehlt)
      setMonat(k.monate[0])
    }
  }, [])

  const eintrag = KATALOG.find((k) => k.id === spielId) ?? KATALOG[0]
  const originalSpiel: SpielDef | null = eintrag.art === 'spiel' ? eintrag.spiel : null
  const spiel = useMemo(() => (originalSpiel ? spielMitText(originalSpiel, override) : null), [originalSpiel, override])

  const spielWaehlen = (id: string) => {
    const k = KATALOG.find((x) => x.id === id)
    if (!k) return
    setSpielId(id)
    setMonat(k.monate[0])
    setOverride(null)
    setKiFragen(null)
    setKiFragenAktiv(false)
    setTagIndex(0)
    setLauf(null)
  }

  const { inhalte, ausDatei } = useMemo(() => {
    if (!basis) return { inhalte: [] as Inhalt[], ausDatei: true }
    if (!originalSpiel) return geldregenInhalte(basis.fragen, monat)
    return { inhalte: originalSpiel.musterInhalte(monat), ausDatei: true }
  }, [basis, originalSpiel, monat])

  // Echte Gewinnerinnen/Gewinner (IndexedDB) – ersetzen in der Anzeige die Muster-Porträts
  const [gewListe, setGewListe] = useState<SerienGewinner[]>([])
  const [fotos, setFotos] = useState<Record<string, string>>({})
  const gewLaden = useCallback(async () => {
    const l = await serienGewinnerLaden(spielId, monat)
    const neu: Record<string, string> = {}
    for (const g of l) if (g.fotoHash && !neu[g.fotoHash]) {
      const u = await fotoUrl(g.fotoHash)
      if (u) neu[g.fotoHash] = u
    }
    setGewListe(l)
    setFotos(neu)
  }, [spielId, monat])
  useEffect(() => {
    gewLaden().catch(() => setGewListe([]))
  }, [gewLaden])

  useEffect(() => {
    let aktiv = true
    stammLaden(spielId).then((s) => { if (aktiv) setStamm(s) }).catch(() => setStamm(undefined))
    return () => { aktiv = false }
  }, [spielId])
  useEffect(() => {
    let aktiv = true
    einfuehrungLaden(spielId, monat).then((e) => { if (aktiv) setEinf(e) }).catch(() => setEinf(undefined))
    return () => { aktiv = false }
  }, [spielId, monat])
  // Teilnehmende Zeitungen des Spiels vorauswählen (aus der hochgeladenen Liste; sonst alle)
  useEffect(() => {
    if (!basisRoh) return
    setGewaehlt(stamm?.teilnehmer?.length ? stamm.teilnehmer : basisRoh.daten.zeitungen.map((x) => x.id))
  }, [basisRoh, stamm])

  const zeitungen = basis?.daten.zeitungen ?? []
  const gewaehlteZeitungen = zeitungen.filter((z) => gewaehlt.includes(z.id))
  const z = zeitungen.find((x) => x.id === vorschauId) ?? gewaehlteZeitungen[0] ?? zeitungen[0]

  const wirksameInhalte = useMemo(() => {
    const roh = fragenAnwenden(inhalte, kiFragenAktiv ? kiFragen : null)
    // Einführungstext (Cockpit) am 1. Spieltag; Klartext – wird im Generator maskiert
    const basisInhalte = einf ? roh.map((inh) => (inh.tag === 1 ? { ...inh, einfuehrung: { titel: einf.titel, text: einf.text } } : inh)) : roh
    if (!gewListe.length || !z) return basisInhalte
    return basisInhalte.map((inh) => {
      const echte = gewListe
        .filter((g) => g.tag === inh.tag && (!g.zeitungen.length || g.zeitungen.includes(z.id)))
        .map((g) => ({ name: htmlMaskieren(g.name), ort: htmlMaskieren(g.ort), betrag: htmlMaskieren(g.betrag), text: htmlMaskieren(g.text), foto: g.fotoHash ? fotos[g.fotoHash] : undefined }))
      return echte.length ? { ...inh, gewinner: echte } : inh
    })
  }, [inhalte, kiFragen, kiFragenAktiv, gewListe, fotos, z, einf])
  const inhalt = wirksameInhalte[Math.min(tagIndex, Math.max(0, wirksameInhalte.length - 1))]

  const args: VorschauArgs | null = basis && z && inhalt ? { basis, spiel, z, inhalt, vorschlag, gewinner, monat, kiText: kiFragenAktiv && !!kiFragen } : null
  const html = useMemo(() => (args ? anzeigeHtml(args) : ''), [args?.basis, args?.spiel, args?.z, args?.inhalt, args?.vorschlag, args?.gewinner, args?.monat, args?.kiText]) // eslint-disable-line react-hooks/exhaustive-deps
  const abcHtml = useMemo(
    () => (args ? VORSCHLAEGE.map((v) => anzeigeHtml({ ...args, vorschlag: v })) : []),
    [args?.basis, args?.spiel, args?.z, args?.inhalt, args?.gewinner, args?.monat, args?.kiText], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const inhaltCheck = useMemo(() => (args && html ? inhaltPruefen(args, html) : { fehler: [], platzhalter: [] }), [html]) // eslint-disable-line react-hooks/exhaustive-deps
  const hoehe = z ? anzeigeHoehe(z) : 1000

  const hinweise: string[] = [...inhaltCheck.platzhalter]
  if (inhalt?.muster) hinweise.push(T('serieMusterHinweis'))
  if (!originalSpiel && !ausDatei && !(kiFragenAktiv && kiFragen)) hinweise.push(T('serieKeineFragen'))
  if (kiFragenAktiv && kiFragen) hinweise.push(T('serieKiFaktenPruefen'))
  if (override) hinweise.push(T('serieNeuOverrideAktiv'))

  const bauen = useCallback(
    (s: SpielDef, v: Vorschlag) => (args ? anzeigeHtml({ ...args, spiel: s, vorschlag: v }) : ''),
    [args?.basis, args?.z, args?.inhalt, args?.gewinner, args?.monat], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const mondayTage: MondaySpieltag[] = useMemo(() => {
    if (!args) return []
    return wirksameInhalte.map((inh) => {
      const a1 = sichtbar(inh.a1 ?? '')
      const a2 = sichtbar(inh.a2 ?? '')
      const loesungswort = !!spiel && spiel.antwort === 'loesungswort'
      return {
        name: `Spieltag ${pad2(inh.tag)}`,
        datum: inh.datum,
        frage: sichtbar(inh.frage ?? ''),
        a1,
        a2,
        richtig: loesungswort ? (inh.loesung ?? '') : inh.richtig ? `${inh.richtig} – ${inh.richtig === 1 ? a1 : a2}` : '',
        dateiname: anzeigeDateiname({ ...args, inhalt: inh }),
      }
    })
  }, [wirksameInhalte, args?.basis, args?.spiel, args?.z, args?.vorschlag, args?.gewinner, args?.monat]) // eslint-disable-line react-hooks/exhaustive-deps

  const pruefLauf = async () => {
    if (!args) return
    laufStop.current = false
    const liste = gewaehlteZeitungen
    const ergebnisse: LaufErgebnis[] = []
    setLauf({ fertig: 0, gesamt: liste.length, ergebnisse: [] })
    for (const zz of liste) {
      if (laufStop.current) break
      const a = { ...args, z: zz }
      const h = anzeigeHtml(a)
      const ergebnis = await htmlPruefen(h, anzeigeHoehe(zz))
      const c = inhaltPruefen(a, h)
      ergebnisse.push({ z: zz, ergebnis, fehler: c.fehler, platzhalter: c.platzhalter })
      setLauf({ fertig: ergebnisse.length, gesamt: liste.length, ergebnisse: [...ergebnisse] })
    }
  }

  // Export-Auftrag für „Serien-Anzeigen erstellen.command“: ganzer Monat (Vorproduktion) oder nur einzelne Spieltage (Tages-Update mit Gewinnern)
  const auftragLaden = (tage?: number[]) => {
    const auftrag = { spiel: spielId, monat, zeitungen: gewaehlt.join(','), vorschlaege: 'A,B,C', gewinner: '1,4', tage: tage ?? [], inhalte: wirksameInhalte, nummern: stamm?.aenderungen ?? {}, erstelltAm: new Date().toISOString() }
    const b = new Blob([JSON.stringify(auftrag, null, 1)], { type: 'application/json' })
    const u = URL.createObjectURL(b)
    const l = document.createElement('a')
    l.href = u
    l.download = `serie-auftrag-${spielId}-${monat}${tage?.length ? '-ST' + tage.map((t) => pad2(t)).join('-') : ''}.json`
    l.click()
    setTimeout(() => URL.revokeObjectURL(u), 2000)
  }

  const umschalten = (id: string) => setGewaehlt((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]))

  const spielName = eintrag.name
  const beschreibung = z && inhalt ? `${spielName} · ${z.name} · ${T('serieVorschlag')} ${vorschlag} · ${inhalt.tag}. ${T('serieSpieltag')} (${inhalt.label})` : ''
  const offen = originalSpiel?.offen ?? []

  return (
    <div style={{ minHeight: '100dvh', background: '#ffffff', color: TEXT, fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', borderTop: `4px solid ${ROT}`, overflowX: 'clip' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: schmal ? '10px 14px' : '12px 24px', borderBottom: '1px solid #ECEDF1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <Link href="/erweitert" aria-label={T('serieZurStart')} style={{ display: 'block', flexShrink: 0 }}>
            <img src="/telemedia-logo.png" alt={T('startLogoAlt')} width={1119} height={388} style={{ height: schmal ? 40 : 50, width: 'auto', display: 'block' }} />
          </Link>
          <span style={{ fontSize: schmal ? 15 : 17, fontWeight: 700, borderLeft: `1px solid ${HELLGRAU}`, paddingLeft: 14, whiteSpace: 'nowrap' }}>{T('cardSerie')}</span>
          <HilfePopover
            de="Serien-Modus: Spiel, Monat, Zeitungen, Gestaltungsvorschlag A/B/C, Gewinnerzahl und Spieltag wählen – die Anzeige erscheint sofort als Live-Vorschau. Die Ampel zeigt das Ergebnis der eingebauten Prüfung (Einpassen, Überlappung, Überlauf, gelbe Platzhalter). Rufnummern, Logos, Hausfarben und Teilnahmebedingungen kommen aus den Zeitungsdaten; Fehlendes bleibt gelb, nichts wird erfunden."
            en="Series mode: pick game, month, newspapers, design proposal A/B/C, number of winners and game day – the ad appears instantly as a live preview. The traffic light shows the built-in check (fit, overlap, overflow, yellow placeholders). Phone numbers, logos, house colours and terms come from the newspaper data; anything missing stays yellow, nothing is invented."
            anker="serie"
            ausrichtung="links"
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/erweitert" style={{ ...knopfKlein, textDecoration: 'none' }}>
            {T('serieZurStart')}
          </Link>
          <HandbuchKnopf anker="serie" />
          <SpracheUmschalter />
        </div>
      </header>

      <main style={{ maxWidth: 1480, margin: '0 auto', padding: schmal ? '14px 12px 60px' : '20px 24px 70px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        {ladeFehler && <div style={hinweisRot}>{T('serieLadeFehler')} {ladeFehler}</div>}
        {!basis && !ladeFehler && <div style={{ color: GRAU_TEXT, fontSize: 13 }}>{T('serieLaedt')}</div>}

        {basis && z && inhalt && args && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: breit ? '360px minmax(0,1fr)' : 'minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
              {/* ------------------------------------------------ Auswahl */}
              <section style={karte}>
                <h2 style={kartenTitel}>
                  {T('serieAuswahl')}
                  <HilfePopover
                    de="Spiel aus dem Gewinnspielplan 2027 wählen (Monat und Modell stehen dabei). Mehrere Zeitungen anhaken – die Vorschau zeigt die unter „Vorschau für“ gewählte, der Prüflauf prüft alle angehakten."
                    en="Pick a game from the 2027 plan (month and model shown). Tick several newspapers – the preview shows the one chosen under “Preview for”, the check run tests all ticked ones."
                    anker="serie"
                    ausrichtung="links"
                  />
                </h2>
                <label style={label} htmlFor="serie-spiel">
                  {T('serieSpiel')}
                </label>
                <select id="serie-spiel" value={spielId} onChange={(e) => spielWaehlen(e.target.value)} style={eingabe}>
                  {KATALOG.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.monate.map((m) => monatName(m, sprache)).join(', ')} · {k.name} · {k.modell}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 12, color: GRAU_TEXT, marginTop: 6 }}>{eintrag.beschreibung}</div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
                  <div>
                    <label style={label} htmlFor="serie-monat">
                      {T('serieMonat')}
                    </label>
                    <select
                      id="serie-monat"
                      value={monat}
                      onChange={(e) => {
                        setMonat(e.target.value)
                        setTagIndex(0)
                        setKiFragen(null)
                        setKiFragenAktiv(false)
                      }}
                      style={eingabe}
                    >
                      {eintrag.monate.map((m) => (
                        <option key={m} value={m}>
                          {monatName(m, sprache)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={label} htmlFor="serie-tag">
                      {T('serieSpieltag')}
                    </label>
                    <select id="serie-tag" value={Math.min(tagIndex, wirksameInhalte.length - 1)} onChange={(e) => setTagIndex(Number(e.target.value))} style={eingabe}>
                      {wirksameInhalte.map((inh, i) => (
                        <option key={i} value={i}>
                          {inh.tag}. · {inh.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <span style={label}>{T('serieVorschlag')}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {VORSCHLAEGE.map((v) => (
                    <button key={v} type="button" onClick={() => setVorschlag(v)} style={segment(vorschlag === v)} aria-pressed={vorschlag === v}>
                      {v}
                    </button>
                  ))}
                  <span style={{ width: 12 }} />
                  {([1, 4] as GewinnerAnzahl[]).map((g) => (
                    <button key={g} type="button" onClick={() => setGewinner(g)} style={segment(gewinner === g)} aria-pressed={gewinner === g}>
                      {g} {T('serieGewinner')}
                    </button>
                  ))}
                </div>

                <label style={label} htmlFor="serie-vorschau-z">
                  {T('serieVorschauFuer')}
                </label>
                <select id="serie-vorschau-z" value={z.id} onChange={(e) => setVorschauId(e.target.value)} style={eingabe}>
                  {(gewaehlteZeitungen.length ? gewaehlteZeitungen : zeitungen).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {x.format[0]}×{x.format[1]} mm
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <span style={{ ...label, margin: 0 }}>
                    {T('serieZeitungen')} ({gewaehlt.length}/{zeitungen.length})
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button type="button" style={knopfKlein} onClick={() => setGewaehlt(zeitungen.map((x) => x.id))}>
                      {T('serieAlle')}
                    </button>
                    <button type="button" style={knopfKlein} onClick={() => setGewaehlt([])}>
                      {T('serieKeine')}
                    </button>
                  </span>
                </div>
                <div style={{ maxHeight: 190, overflowY: 'auto', border: `1px solid ${HELLGRAU}`, borderRadius: 6, padding: '4px 8px', marginTop: 6 }}>
                  {zeitungen.map((x) => (
                    <label key={x.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
                      <input type="checkbox" checked={gewaehlt.includes(x.id)} onChange={() => umschalten(x.id)} />
                      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, background: x.farbe, flexShrink: 0 }} />
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* ------------------------------------------------ Vorschau */}
              <section style={karte}>
                <h2 style={{ ...kartenTitel, flexWrap: 'wrap' }}>
                  {T('serieVorschauTitel')}
                  <HilfePopover
                    de="Die echte Anzeige im Zeitungsformat, verkleinert auf die Fensterbreite. Grün: alle Prüfungen bestanden. Gelb: nur Platzhalter oder Muster-Inhalte (z. B. fehlende Rufnummer). Rot: echte Probleme wie Überlappung oder Text, der nicht passt – Liste darunter."
                    en="The real ad in newspaper format, scaled to the window width. Green: all checks passed. Yellow: placeholders or sample content only (e.g. missing phone number). Red: real problems such as overlap or text that does not fit – list below."
                    anker="serie"
                    ausrichtung="links"
                  />
                </h2>
                <div style={{ fontSize: 12, color: GRAU_TEXT, marginBottom: 8 }}>{beschreibung}</div>
                <PruefAmpel status={pruefung} fehler={inhaltCheck.fehler} hinweise={hinweise} />
                <div style={{ marginTop: 10 }}>
                  <AnzeigeVorschau
                    html={html}
                    hoehe={hoehe}
                    titel={T('serieVorschauTitel')}
                    onPruefung={setPruefung}
                    onIframe={(f) => {
                      iframeRef.current = f
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{T('serieAblaufTitel')}</div>
                    <div style={{ fontSize: 12, color: GRAU_TEXT }}>{T('serieAblaufHinweis')}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" style={knopf} onClick={() => auftragLaden()}>
                        ⬇ {T('serieExportAuftrag')}
                      </button>
                      {inhalt && (
                        <button type="button" style={knopf} onClick={() => auftragLaden([inhalt.tag])}>
                          ⬇ {T('serieTagesUpdate')} {inhalt.tag}. {T('serieSpieltag')}
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: GRAU_TEXT }}>{T('serieExportHinweis')}</span>
                  </div>
                  <MailPanel html={html} iframe={() => iframeRef.current} z={z} dateiname={anzeigeDateiname(args)} beschreibung={beschreibung} />
                </div>
              </section>
            </div>

            {/* ------------------------------------------------ A/B/C vergleichen */}
            <section style={karte}>
              <h2 style={kartenTitel}>
                {T('serieAbcTitel')}
                <HilfePopover
                  de="Die drei Gestaltungsvorschläge A („Goldene Nacht“), B („Hell & Hausfarbe“) und C („Hausfarbe mit Verlauf“) nebeneinander – mit derselben Zeitung, demselben Spieltag und derselben Gewinnerzahl. Klick auf „Diesen wählen“ übernimmt den Vorschlag oben."
                  en="The three design proposals A (“Golden night”), B (“Light & house colour”) and C (“House colour gradient”) side by side – same newspaper, game day and number of winners. “Choose this” applies the proposal above."
                  anker="serie"
                  ausrichtung="links"
                />
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: mittel ? 'repeat(3, minmax(0,1fr))' : 'minmax(0,1fr)', gap: 12 }}>
                {VORSCHLAEGE.map((v, i) => (
                  <div key={v} style={{ border: `2px solid ${vorschlag === v ? ROT : HELLGRAU}`, borderRadius: 8, padding: 8, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 13 }}>
                        {T('serieVorschlag')} {v}
                      </b>
                      <PruefAmpel status={abc[v] ?? { laedt: true, ergebnis: null }} kompakt />
                    </div>
                    <AnzeigeVorschau html={abcHtml[i] ?? ''} hoehe={hoehe} titel={`${T('serieVorschlag')} ${v}`} onPruefung={(s) => setAbc((p) => ({ ...p, [v]: s }))} />
                    <button type="button" onClick={() => setVorschlag(v)} disabled={vorschlag === v} style={{ ...knopf, ...(vorschlag === v ? gesperrt : {}) }}>
                      {vorschlag === v ? T('serieGewaehlt') : T('serieDiesenWaehlen')}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* ------------------------------------------------ Prüflauf + offene Punkte */}
            <div style={{ display: 'grid', gridTemplateColumns: mittel ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
              <section style={karte}>
                <h2 style={kartenTitel}>
                  {T('seriePrueflaufTitel')}
                  <HilfePopover
                    de="Prüft die aktuelle Einstellung (Spiel, Spieltag, Vorschlag, Gewinner) für alle angehakten Zeitungen nacheinander – mit derselben Prüfung wie die Vorschau. So siehst du vor dem Export, bei welchem Zeitungsformat etwas nicht passt."
                    en="Checks the current setting (game, game day, proposal, winners) for every ticked newspaper in turn – with the same check as the preview. So you see before exporting which newspaper format has a problem."
                    anker="serie"
                    ausrichtung="links"
                  />
                </h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" style={{ ...knopf, ...(!gewaehlteZeitungen.length ? gesperrt : {}) }} disabled={!gewaehlteZeitungen.length} onClick={pruefLauf}>
                    {T('seriePrueflaufKnopf')} ({gewaehlteZeitungen.length})
                  </button>
                  {lauf && lauf.fertig < lauf.gesamt && (
                    <button type="button" style={knopf} onClick={() => (laufStop.current = true)}>
                      {T('serieStopp')}
                    </button>
                  )}
                </div>
                {lauf && (
                  <div style={{ marginTop: 10, fontSize: 12 }}>
                    <div style={{ color: GRAU_TEXT }}>
                      {lauf.fertig}/{lauf.gesamt} · {T('serieAmpelRot')}: {lauf.ergebnisse.filter((r) => !r.ergebnis || !r.ergebnis.echt_ok || r.fehler.length).length} · {T('serieAmpelGelb')}:{' '}
                      {lauf.ergebnisse.filter((r) => r.ergebnis && r.ergebnis.echt_ok && !r.fehler.length && (!r.ergebnis.ok || r.platzhalter.length)).length}
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {lauf.ergebnisse.map((r) => {
                        const rot = !r.ergebnis || !r.ergebnis.echt_ok || r.fehler.length > 0
                        const gelb = !rot && (!r.ergebnis!.ok || r.platzhalter.length > 0)
                        const farbe = rot ? '#C8102E' : gelb ? '#E0A800' : '#1E8E3E'
                        const details = [...r.fehler, ...(r.ergebnis?.warnungen ?? []), ...r.platzhalter]
                        return (
                          <li key={r.z.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: farbe, marginTop: 3, flexShrink: 0 }} />
                            <span style={{ minWidth: 0 }}>
                              <button type="button" onClick={() => setVorschauId(r.z.id)} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontWeight: 700, color: TEXT, fontFamily: 'inherit', fontSize: 12 }}>
                                {r.z.name}
                              </button>
                              {!r.ergebnis && <span style={{ color: '#9E0B22' }}> · {T('serieAmpelKeinErgebnis')}</span>}
                              {details.length > 0 && <span style={{ color: GRAU_TEXT }}> · {details.join(' | ')}</span>}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </section>

              <section style={karte}>
                <h2 style={kartenTitel}>
                  {T('serieOffenTitel')}
                  <HilfePopover
                    de="Was beim gewählten Spiel noch offen ist (aus dem Spiele-Katalog), und ob die Vorschau Muster-Inhalte aus der Präsentation zeigt. Muster-Inhalte sind gelb markiert und nicht für den Druck gedacht."
                    en="What is still open for the chosen game (from the game catalogue), and whether the preview shows sample content from the presentation. Sample content is marked yellow and not meant for print."
                    anker="serie"
                    ausrichtung="links"
                  />
                </h2>
                {inhalt.muster && <div style={{ ...hinweisGelb, marginBottom: 8 }}>{T('serieMusterHinweis')}</div>}
                {!originalSpiel && !ausDatei && <div style={{ ...hinweisGelb, marginBottom: 8 }}>{T('serieKeineFragen')}</div>}
                {offen.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {offen.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: 13, color: GRAU_TEXT }}>{originalSpiel ? T('serieOffenKeine') : T('serieOffenGeldregen')}</div>
                )}
              </section>
            </div>

            {/* ------------------------------------------------ KI */}
            <NeuesSpielPanel
              spiel={originalSpiel}
              zeitungName={z.name}
              override={override}
              setOverride={setOverride}
              setVorschlag={setVorschlag}
              bauen={bauen}
              hoehe={hoehe}
              breit={mittel}
            />

            <div style={{ display: 'grid', gridTemplateColumns: mittel ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
              <FragenPanel
                spielId={spielId}
                zweiAntworten={!originalSpiel || originalSpiel.antwort !== 'loesungswort'}
                mitBildern={!!originalSpiel}
                monat={monat}
                labels={inhalte.map((x) => x.label)}
                fragen={kiFragen}
                setFragen={setKiFragen}
                aktiv={kiFragenAktiv}
                setAktiv={setKiFragenAktiv}
              />
              <GewinnerPanel spielId={spielId} monat={monat} inhalte={inhalte} tagAktuell={inhalt?.tag ?? 1} z={z} liste={gewListe} neuLaden={gewLaden} />
              <MondayPanel spieltage={mondayTage} muster={wirksameInhalte.some((x) => x.muster) || (!originalSpiel && !ausDatei && !(kiFragenAktiv && kiFragen))} dateien={{
                  spielId,
                  ordner: (originalSpiel ? originalSpiel.name.replace(/&/g, 'und').replace(/[^A-Za-z0-9ÄÖÜäöüß]+/g, '-') : 'Geldregen') + '_' + monat,
                  monat,
                  vorschlag,
                  gewinner,
                  tage: wirksameInhalte.map((x) => x.tag),
                }} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
