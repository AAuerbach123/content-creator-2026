// Serien-Modus · Browser-Helfer für die Seite /serie:
//  • Daten laden (public/serie/*.json)
//  • Anzeige-HTML für Vorschau bauen (Geldregen über generator.ts, alle anderen über rahmen.ts)
//  • Prüfergebnis des Einpass-Skripts aus einem iframe lesen (window.__pruefung)
//  • Gestaltungsvorschlag als Datei: eigenständiges HTML (Bilder eingebettet), PNG (Canvas) und PDF (pdf-lib, Bild)
//  • KI-/monday-Aufrufe inkl. Eintrag in den KI-Verlauf (Regel 8)

import { aktionSpeichern } from '../db'
import { poolBilden, type Standards } from './zeitungs-pool'
import { anzeigeBauen } from './anzeige-bauen'
import { W, dateiname as grDateiname, pyRound, seite, tagesdaten } from './generator'
import type { MondayAntwort, MondaySpieltag } from './monday-typen'
import { pruefeInhalt } from './pruefen'
import { htmlMaskieren, type SerieFrage, type SerieVariante, type TextFeld } from './serie-ki'
import { spieltage } from './spiele/kalender'
import { spielDateiname, spielSeite } from './spiele/rahmen'
import type { Inhalt, SpielDef } from './spiele/typen'
import type { GewinnerAnzahl, Pruefergebnis, SerienDaten, Spieltag, TnbReferenz, Vorschlag, Zeitung } from './types'

export const ASSET_BASIS = '/serie/assets/'
export const pfadBrowser = (n: string) => ASSET_BASIS + n

export type SerienBasis = { daten: SerienDaten; fragen: Record<string, Spieltag[] | string>; tnbRef: TnbReferenz; standard?: Standards }

export async function serienDatenLaden(): Promise<SerienBasis> {
  const lade = async (n: string) => {
    const r = await fetch('/serie/' + n)
    if (!r.ok) throw new Error(`${n}: HTTP ${r.status}`)
    return r.json()
  }
  const [roh, fragen, tnbRef, weitere] = await Promise.all([
    lade('zeitungen.json'), lade('fragen_2027.json'), lade('tnb_referenz.json'),
    lade('zeitungen-weitere.json').catch(() => null),
  ])
  // Pool: Geldregen-Referenz + weitere Zeitungen (Wissensquiz Juli 2026); zeitungen.json selbst bleibt unverändert
  const { daten, standard } = poolBilden(roh, weitere)
  return { daten, fragen, tnbRef, standard }
}

/** Spieltage eines Monats für Geldregen: aus fragen_2027.json – fehlt der Monat, Kalender mit leeren Fragen. */
export function geldregenInhalte(fragen: SerienBasis['fragen'], monat: string): { inhalte: Inhalt[]; ausDatei: boolean } {
  const t = fragen[monat]
  if (Array.isArray(t)) return { inhalte: t.map((x) => ({ ...x })), ausDatei: true }
  return {
    inhalte: spieltage(monat).map((k) => ({ tag: k.tag, datum: k.datum, label: k.label, frage: '', a1: '', a2: '', richtig: 1 })),
    ausDatei: false,
  }
}

/** KI-Fragen (in Reihenfolge) auf die Spieltage legen. */
export function fragenAnwenden(inhalte: Inhalt[], fragen: SerieFrage[] | null): Inhalt[] {
  if (!fragen?.length) return inhalte
  return inhalte.map((inh, i) => (fragen[i] ? { ...inh, frage: fragen[i].frage, a1: fragen[i].a1, a2: fragen[i].a2, richtig: fragen[i].richtig } : inh))
}

export type VorschauArgs = {
  basis: SerienBasis
  /** null = Geldregen (freigegebener Generator) */
  spiel: SpielDef | null
  z: Zeitung
  inhalt: Inhalt
  vorschlag: Vorschlag
  gewinner: GewinnerAnzahl
  monat: string
  /** true = Frage/Antworten stammen aus der KI (für Geldregen HTML-maskieren) */
  kiText?: boolean
  /** KI-Gestaltungsvariante der Kampagne (gilt nur für ihren Basis-Vorschlag) */
  variante?: import('./variante').Variante | null
}

function alsSpieltag(inh: Inhalt, maskieren: boolean): Spieltag {
  const m = (s: string) => (maskieren ? htmlMaskieren(s) : s)
  return {
    tag: inh.tag,
    datum: inh.datum,
    label: inh.label,
    frage: m(inh.frage || '[Frage folgt]'),
    a1: m(inh.a1 || '[Antwort 1]'),
    a2: m(inh.a2 || '[Antwort 2]'),
    richtig: inh.richtig ?? 1,
  }
}

export function anzeigeHtml(a: VorschauArgs): string {
  return anzeigeBauen({ daten: a.basis.daten, spiel: a.spiel, z: a.z, inhalt: a.inhalt, vorschlag: a.vorschlag, gewinner: a.gewinner, monat: a.monat, pfad: pfadBrowser, kiText: a.kiText, variante: a.variante })
}

/** Inhaltliche Prüfung ohne Browser (nur Geldregen: pruefen.ts). */
export function inhaltPruefen(a: VorschauArgs, html: string): { fehler: string[]; platzhalter: string[] } {
  if (a.spiel) return { fehler: [], platzhalter: [] }
  // Generator bekommt (bei KI-Text) maskierten Text; die Prüfung vergleicht mit dem entschlüsselten Seitentext → Rohtext
  const td = tagesdaten(a.z, alsSpieltag(a.inhalt, !!a.kiText), a.inhalt.gewinner, a.inhalt.einfuehrung)
  const roh = alsSpieltag(a.inhalt, false)
  return pruefeInhalt(a.basis.daten, { z: a.z, td, v: a.vorschlag, g: a.gewinner }, roh, a.monat, html, a.basis.tnbRef)
}

export function anzeigeDateiname(a: VorschauArgs): string {
  if (!a.spiel) return grDateiname(a.z, a.monat, alsSpieltag(a.inhalt, false), a.vorschlag, a.gewinner)
  return spielDateiname(a.spiel, a.z, a.monat, a.inhalt, a.vorschlag, a.gewinner)
}

export function anzeigeHoehe(z: Zeitung): number {
  const [wmm, hmm] = z.format
  return pyRound((W * hmm) / wmm)
}

export { W as ANZEIGE_BREITE }

// ------------------------------------------------------------------ Prüfergebnis aus dem iframe
type PruefFenster = Window & { __pruefung?: Pruefergebnis }

export async function aufPruefungWarten(iframe: HTMLIFrameElement, maxMs = 10000): Promise<Pruefergebnis | null> {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const w = iframe.contentWindow as PruefFenster | null
      if (w?.__pruefung) return w.__pruefung
    } catch {
      return null
    }
    await new Promise((r) => setTimeout(r, 120))
  }
  return null
}

/** Unsichtbares iframe: HTML laden, Einpass-Skript abwarten, Ergebnis zurückgeben (für Prüflauf über viele Zeitungen). */
export async function htmlPruefen(html: string, hoehe: number): Promise<Pruefergebnis | null> {
  const f = document.createElement('iframe')
  f.setAttribute('aria-hidden', 'true')
  f.tabIndex = -1
  f.style.cssText = `position:fixed;left:-30000px;top:0;width:${W}px;height:${hoehe}px;border:0;opacity:0;pointer-events:none`
  document.body.appendChild(f)
  try {
    await new Promise<void>((res) => {
      f.onload = () => res()
      f.srcdoc = html
    })
    return await aufPruefungWarten(f)
  } finally {
    f.remove()
  }
}

// ------------------------------------------------------------------ Dateien für die Mail
const ASSET_RE = /\/serie\/assets\/[^"'()\s>&]+/g

async function alsDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(blob)
  })
}

/** Ersetzt alle /serie/assets/…-Verweise durch data:-URIs (eigenständige Datei). */
export async function assetsEinbetten(html: string): Promise<string> {
  const namen = [...new Set(html.match(ASSET_RE) ?? [])]
  const karte = new Map<string, string>()
  await Promise.all(
    namen.map(async (n) => {
      const r = await fetch(n)
      if (r.ok) karte.set(n, await alsDataUrl(await r.blob()))
    }),
  )
  return html.replace(ASSET_RE, (n) => karte.get(n) ?? n)
}

/** Gerenderte Anzeige (nach dem Einpassen) als Canvas – über SVG/foreignObject. Wirft, wenn der Browser das nicht kann. */
export async function iframeAlsCanvas(iframe: HTMLIFrameElement, hoehe: number, skala = 1.5): Promise<HTMLCanvasElement> {
  const doc = iframe.contentDocument
  if (!doc) throw new Error('Vorschau nicht bereit')
  const live = await assetsEinbetten(doc.documentElement.outerHTML)
  const kopie = new DOMParser().parseFromString(live, 'text/html')
  kopie.querySelectorAll('script').forEach((s) => s.remove())
  const ad = kopie.querySelector('.ad')
  if (!ad) throw new Error('Anzeige nicht gefunden')
  const huelle = kopie.createElement('div')
  huelle.setAttribute('style', `width:${W}px;height:${hoehe}px;background:#fff`)
  kopie.querySelectorAll('style').forEach((s) => huelle.appendChild(s))
  huelle.appendChild(ad)
  const xhtml = new XMLSerializer().serializeToString(huelle)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${hoehe}"><foreignObject x="0" y="0" width="${W}" height="${hoehe}">${xhtml}</foreignObject></svg>`
  const bild = new Image()
  bild.decoding = 'sync'
  await new Promise<void>((res, rej) => {
    bild.onload = () => res()
    bild.onerror = () => rej(new Error('SVG-Bild konnte nicht geladen werden'))
    bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
  // kurz warten, damit eingebettete Schriften/Bilder im SVG fertig dekodiert sind
  await new Promise((r) => setTimeout(r, 250))
  const c = document.createElement('canvas')
  c.width = Math.round(W * skala)
  c.height = Math.round(hoehe * skala)
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2D-Kontext nicht verfügbar')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.scale(skala, skala)
  ctx.drawImage(bild, 0, 0, W, hoehe)
  return c
}

function canvasBlob(c: HTMLCanvasElement, typ: 'image/png' | 'image/jpeg', q = 0.9): Promise<Blob> {
  return new Promise((res, rej) => {
    try {
      c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob lieferte null'))), typ, q)
    } catch (e) {
      rej(e)
    }
  })
}

export type MailDateien = { dateien: File[]; nurHtml: boolean; hinweis?: string }

/**
 * Anhänge für „Gestaltungsvorschlag per E-Mail“:
 *  • immer: eigenständige HTML-Anzeige (Vektor, Bilder eingebettet, öffnet in jedem Browser)
 *  • wenn der Browser es kann: PNG-Bild + PDF (Bild im Anzeigenformat, mm) – Ansicht, keine Druckvorlage
 */
export async function mailDateienErzeugen(args: { html: string; iframe: HTMLIFrameElement | null; z: Zeitung; name: string; titel: string }): Promise<MailDateien> {
  const hoehe = anzeigeHoehe(args.z)
  const htmlDatei = new File([await assetsEinbetten(args.html)], args.name + '.html', { type: 'text/html' })
  if (!args.iframe) return { dateien: [htmlDatei], nurHtml: true, hinweis: 'Vorschau nicht bereit' }
  try {
    const c = await iframeAlsCanvas(args.iframe, hoehe)
    const png = await canvasBlob(c, 'image/png')
    const jpg = await canvasBlob(c, 'image/jpeg', 0.9)
    const { PDFDocument } = await import('pdf-lib')
    const pdf = await PDFDocument.create()
    pdf.setTitle(args.titel)
    pdf.setCreator('ContentCreator2026')
    const mm = 72 / 25.4
    const [wmm, hmm] = args.z.format
    const seiteP = pdf.addPage([wmm * mm, hmm * mm])
    const bild = await pdf.embedJpg(new Uint8Array(await jpg.arrayBuffer()))
    seiteP.drawImage(bild, { x: 0, y: 0, width: wmm * mm, height: hmm * mm })
    const pdfBytes = await pdf.save()
    const pdfDatei = new File([new Uint8Array(pdfBytes)], args.name + '.pdf', { type: 'application/pdf' })
    const pngDatei = new File([png], args.name + '.png', { type: 'image/png' })
    return { dateien: [pdfDatei, pngDatei, htmlDatei], nurHtml: false }
  } catch (e) {
    return { dateien: [htmlDatei], nurHtml: true, hinweis: e instanceof Error ? e.message : String(e) }
  }
}

export function dateiHerunterladen(f: File): void {
  const url = URL.createObjectURL(f)
  const a = document.createElement('a')
  a.href = url
  a.download = f.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 8000)
}

export function kannTeilen(dateien: File[]): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: dateien })
}

// ------------------------------------------------------------------ KI- und monday-Aufrufe
type KiKosten = { modell?: string; eingabeTokens?: number; ausgabeTokens?: number; kostenUsd?: number }

async function verlauf(route: string, prompt: string, ok: boolean, kurz: string, k: KiKosten, fehler?: string) {
  try {
    await aktionSpeichern({
      id: crypto.randomUUID(),
      route,
      modell: k.modell,
      prompt: prompt.slice(0, 400),
      antwortKurz: kurz.slice(0, 400),
      eingabeTokens: k.eingabeTokens,
      ausgabeTokens: k.ausgabeTokens,
      kostenUsd: k.kostenUsd,
      fehler: ok ? undefined : fehler,
      zeitpunkt: Date.now(),
    })
  } catch {
    /* Verlauf ist nie blockierend */
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T & { ok: boolean; fehler?: string }> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const d = (await r.json().catch(() => ({}))) as T & { ok?: boolean; fehler?: string }
    return { ...d, ok: r.ok && d.ok !== false, fehler: d.fehler || (r.ok ? undefined : `HTTP ${r.status}`) }
  } catch (e) {
    return { ok: false, fehler: e instanceof Error ? e.message : String(e) } as T & { ok: boolean; fehler?: string }
  }
}

export async function kiVariantenHolen(args: { spielId: string; zeitung?: string; zusatz: string }) {
  const d = await postJson<{ varianten?: SerieVariante[] } & KiKosten>('/api/serie-varianten', { aktion: 'varianten', ...args })
  await verlauf('/api/serie-varianten', `Varianten ${args.spielId}: ${args.zusatz}`, d.ok, d.varianten ? d.varianten.map((v) => v.name).join(' | ') : '', d, d.fehler)
  return d
}

export async function kiTextVerbessern(args: { spielId: string; feld: TextFeld; text: string; zusatz: string }) {
  const d = await postJson<{ vorschlaege?: string[] } & KiKosten>('/api/serie-varianten', { aktion: 'verbessern', ...args })
  await verlauf('/api/serie-varianten', `Verbessern ${args.feld}: ${args.text}`, d.ok, (d.vorschlaege ?? []).join(' | '), d, d.fehler)
  return d
}

export async function kiFragenHolen(args: { monat: string; anzahl: number; spielId: string; zusatz: string; labels: string[] }) {
  const d = await postJson<{ fragen?: SerieFrage[]; verworfen?: string[] } & KiKosten>('/api/serie-fragen', args)
  await verlauf('/api/serie-fragen', `Fragen ${args.monat} × ${args.anzahl}: ${args.zusatz}`, d.ok, (d.fragen ?? []).map((f) => f.frage).join(' | '), d, d.fehler)
  return d
}

export async function mondayAufrufen(args: { aktion: 'spalten' | 'uebertragen'; boardId: string; testmodus: boolean; spieltage?: MondaySpieltag[] }): Promise<MondayAntwort> {
  return postJson<MondayAntwort>('/api/monday', args)
}
