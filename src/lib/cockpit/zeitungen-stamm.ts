// Zeitungen & Rufnummern · Stammdaten-Import fürs Cockpit.
//
// Grundsatz: public/serie/zeitungen.json bleibt unverändert (Referenz für
// check-serie, bytegleicher Geldregen). Hochgeladene Nummern werden als
// „Änderungen" im Browser (IndexedDB, Store `stammdaten`) gespeichert und beim
// Laden der Seriendaten darübergelegt. Ohne Änderungen → identische Daten.
//
// Regel: nichts erfinden. Unbekannte Zeitungen werden nicht angelegt, sondern
// gemeldet; ungültige Nummern werden nicht übernommen.

import JSZip from 'jszip'
import type { SerienDaten, Zeitung } from '../serie/types'

// ------------------------------------------------------------------ Typen

export type NummernFeld = 'nummer' | 'raetsel_nummer'

export type ZeitungAenderung = Partial<Record<NummernFeld, string | null>>

export type ZeitungenStamm = {
  /** `zeitungen:<spielId>` – jedes Spiel hat seine eigene Liste */
  id: string
  art: 'zeitungen'
  spielId: string
  /** Schlüssel = Zeitungs-ID aus zeitungen.json */
  aenderungen: Record<string, ZeitungAenderung>
  /** Zeitungen, die bei diesem Spiel mitmachen (aus der hochgeladenen Liste). Fehlt = alle. */
  teilnehmer?: string[]
  /** Stand vor der letzten Übernahme (für „Rückgängig") */
  vorher?: { aenderungen: Record<string, ZeitungAenderung>; teilnehmer?: string[] }
  quelle?: string
  aktualisiertAm: number
}

/** Einführungstext am 1. Spieltag je Spiel und Monat (`einfuehrung:<spielId>:<monat>`). */
export type EinfuehrungEintrag = {
  id: string
  art: 'einfuehrung'
  titel: string
  text: string
  aktualisiertAm: number
}

export type StammEintrag = ZeitungenStamm | EinfuehrungEintrag

export type Tabelle = string[][]

export type Spaltenrolle = 'ignorieren' | 'zeitung' | NummernFeld

export type ImportZeile = {
  zeile: number
  name: string
  zeitungId: string | null
  /** automatisch erkannt (true) oder von Hand zugeordnet (false) */
  automatisch: boolean
  werte: Partial<Record<NummernFeld, string>>
  fehler: Partial<Record<NummernFeld, string>>
  warnung: Partial<Record<NummernFeld, string>>
}

// ------------------------------------------------------------------ Speicher

// Zentral auf dem Server (Typ „stamm“) – alle Eingeloggten sehen dieselben Listen.
async function dc() {
  return import('./daten-client')
}

export const stammId = (spielId: string) => `zeitungen:${spielId}`

export async function stammLaden(spielId: string): Promise<ZeitungenStamm | undefined> {
  if (typeof window === 'undefined') return undefined
  try {
    const e = await (await dc()).dokLaden<StammEintrag>('stamm', stammId(spielId))
    return e && e.art === 'zeitungen' ? e : undefined
  } catch {
    return undefined
  }
}

export async function stammSpeichern(s: ZeitungenStamm): Promise<void> {
  await (await dc()).dokSpeichern('stamm', s.id, s)
}

/** Legt die Nummern-Änderungen eines Spiels über die Original-Daten. Ohne Änderungen: gleiches Objekt zurück. */
export function datenMitStamm(daten: SerienDaten, stamm: ZeitungenStamm | undefined): SerienDaten {
  const a = stamm?.aenderungen
  if (!a || Object.keys(a).length === 0) return daten
  return {
    ...daten,
    zeitungen: daten.zeitungen.map((z) => (a[z.id] ? { ...z, ...a[z.id] } : z)),
  }
}

/** Bequem für Lade-Funktionen: Original laden → Änderungen des Spiels darüberlegen. */
export async function stammAnwenden(daten: SerienDaten, spielId: string): Promise<SerienDaten> {
  return datenMitStamm(daten, await stammLaden(spielId))
}

/** Welche Nummer druckt das Spiel? Geldregen-Mechanik (Geldpakete) → `nummer`, alle anderen → `raetsel_nummer`. */
export function nummernFeldFuer(spielId: string, mechanikArt?: string): NummernFeld {
  return spielId === 'geldregen' || mechanikArt === 'geldpakete' ? 'nummer' : 'raetsel_nummer'
}

// ------------------------------------------------------------------ Einführungstext 1. Spieltag

export const EINFUEHRUNG_TITEL_MAX = 40
export const EINFUEHRUNG_TEXT_MAX = 280

export const einfuehrungId = (spielId: string, monat: string) => `einfuehrung:${spielId}:${monat}`

export async function einfuehrungLaden(spielId: string, monat: string): Promise<EinfuehrungEintrag | undefined> {
  if (typeof window === 'undefined') return undefined
  try {
    const e = await (await dc()).dokLaden<StammEintrag>('stamm', einfuehrungId(spielId, monat))
    return e && e.art === 'einfuehrung' ? e : undefined
  } catch {
    return undefined
  }
}

export async function einfuehrungSpeichern(spielId: string, monat: string, titel: string, text: string): Promise<void> {
  const d = await dc()
  const id = einfuehrungId(spielId, monat)
  if (!titel.trim() && !text.trim()) { await d.dokLoeschen('stamm', id).catch(() => undefined); return }
  await d.dokSpeichern('stamm', id, { id, art: 'einfuehrung', titel, text, aktualisiertAm: Date.now() })
}

// ------------------------------------------------------------------ Datei lesen

/** Liest .xlsx, .csv oder .txt in eine Tabelle (Zeilen × Zellen, alles Text). */
export async function dateiLesen(datei: File): Promise<Tabelle> {
  const name = datei.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) return xlsxLesen(await datei.arrayBuffer())
  if (name.endsWith('.xls')) {
    throw new Error('Altes Excel-Format (.xls) wird nicht unterstützt. Bitte in Excel „Speichern unter → .xlsx“ wählen.')
  }
  return textLesen(await datei.text())
}

/** CSV / Tab-getrennt (auch: aus Excel kopiert und eingefügt). */
export function textLesen(text: string): Tabelle {
  const zeilen = text.replace(/^﻿/, '').split(/\r?\n/).filter((z) => z.trim() !== '')
  if (zeilen.length === 0) return []
  const kopf = zeilen[0]
  const zaehle = (c: string) => kopf.split(c).length - 1
  const trenner = ['\t', ';', ','].sort((x, y) => zaehle(y) - zaehle(x))[0]
  return zeilen.map((z) => csvZeile(z, trenner))
}

function csvZeile(zeile: string, trenner: string): string[] {
  const out: string[] = []
  let feld = ''
  let inQuote = false
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i]
    if (inQuote) {
      if (c === '"' && zeile[i + 1] === '"') { feld += '"'; i++ }
      else if (c === '"') inQuote = false
      else feld += c
    } else if (c === '"') inQuote = true
    else if (c === trenner) { out.push(feld.trim()); feld = '' }
    else feld += c
  }
  out.push(feld.trim())
  return out
}

/** Minimaler .xlsx-Leser (erstes Tabellenblatt) über JSZip + DOMParser. */
async function xlsxLesen(buf: ArrayBuffer): Promise<Tabelle> {
  const zip = await JSZip.loadAsync(buf)
  const lies = async (p: string) => {
    const f = zip.file(p)
    return f ? f.async('string') : null
  }
  const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml')

  // erstes Blatt finden
  let blattPfad = 'xl/worksheets/sheet1.xml'
  const wb = await lies('xl/workbook.xml')
  const rels = await lies('xl/_rels/workbook.xml.rels')
  if (wb && rels) {
    const erstes = xml(wb).getElementsByTagName('sheet')[0]
    const rid = erstes?.getAttribute('r:id') ?? erstes?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    const rel = Array.from(xml(rels).getElementsByTagName('Relationship')).find((r) => r.getAttribute('Id') === rid)
    const ziel = rel?.getAttribute('Target')
    if (ziel) blattPfad = ziel.startsWith('/') ? ziel.slice(1) : 'xl/' + ziel.replace(/^\.\//, '')
  }

  const shared: string[] = []
  const ss = await lies('xl/sharedStrings.xml')
  if (ss) {
    for (const si of Array.from(xml(ss).getElementsByTagName('si'))) {
      shared.push(Array.from(si.getElementsByTagName('t')).map((t) => t.textContent ?? '').join(''))
    }
  }

  const blatt = await lies(blattPfad)
  if (!blatt) throw new Error('Kein Tabellenblatt in der Excel-Datei gefunden.')
  const tabelle: Tabelle = []
  for (const row of Array.from(xml(blatt).getElementsByTagName('row'))) {
    const zeile: string[] = []
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const ref = c.getAttribute('r') ?? ''
      const spalte = spaltenIndex(ref.replace(/\d+/g, ''))
      const typ = c.getAttribute('t')
      const v = c.getElementsByTagName('v')[0]?.textContent ?? ''
      let wert = ''
      if (typ === 's') wert = shared[Number(v)] ?? ''
      else if (typ === 'inlineStr') wert = Array.from(c.getElementsByTagName('t')).map((t) => t.textContent ?? '').join('')
      else wert = v
      zeile[spalte >= 0 ? spalte : zeile.length] = wert.trim()
    }
    for (let i = 0; i < zeile.length; i++) if (zeile[i] === undefined) zeile[i] = ''
    if (zeile.some((x) => x !== '')) tabelle.push(zeile)
  }
  return tabelle
}

function spaltenIndex(buchstaben: string): number {
  if (!buchstaben) return -1
  let n = 0
  for (const ch of buchstaben.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

// ------------------------------------------------------------------ Spalten erkennen

export function normal(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '')
}

const istNummer = (s: string) => /^[\d\s+/()\-.]+$/.test(s) && s.replace(/\D/g, '').length >= 6

/** Hat die erste Zeile Überschriften (keine Telefonnummern)? */
export function hatKopfzeile(t: Tabelle): boolean {
  return t.length > 0 && !t[0].some((z) => istNummer(z))
}

export function spaltenErkennen(t: Tabelle, kopf: boolean): Spaltenrolle[] {
  const breite = Math.max(0, ...t.map((z) => z.length))
  const rollen: Spaltenrolle[] = Array(breite).fill('ignorieren')
  const daten = kopf ? t.slice(1) : t
  const titel = kopf ? t[0].map((x) => normal(x ?? '')) : Array(breite).fill('')
  const anteilNummern = (i: number) => {
    const w = daten.map((z) => z[i] ?? '').filter(Boolean)
    return w.length ? w.filter(istNummer).length / w.length : 0
  }

  // 1. per Überschrift
  // Zeitungsname: bevorzugt „Zeitung/Titel/Objekt …", erst danach „Verlag" (oft nur die Verlagsgruppe)
  titel.forEach((h, i) => {
    if (!h) return
    if (/raetsel|wissensquiz|quiz|gewinnhotline/.test(h) && !rollen.includes('raetsel_nummer')) rollen[i] = 'raetsel_nummer'
    else if (/geldregen|mwn/.test(h) && !rollen.includes('nummer')) rollen[i] = 'nummer'
  })
  for (const muster of [/zeitung|titel|objekt|ausgabe|medium/, /name/, /verlag/]) {
    if (rollen.includes('zeitung')) break
    const i = titel.findIndex((h, j) => h && rollen[j] === 'ignorieren' && muster.test(h) && anteilNummern(j) < 0.5)
    if (i >= 0) rollen[i] = 'zeitung'
  }
  // 2. allgemeine Nummernspalte → Geldregen-Nummer, falls noch frei
  if (!rollen.includes('nummer')) {
    const i = titel.findIndex((h, j) => rollen[j] === 'ignorieren' && /telefon|rufnummer|nummer|hotline|tel/.test(h))
    if (i >= 0) rollen[i] = 'nummer'
  }
  // 3. ohne Überschrift: erste Textspalte = Zeitung, erste Nummernspalte = Geldregen
  if (!rollen.includes('zeitung')) {
    const i = rollen.findIndex((r, j) => r === 'ignorieren' && anteilNummern(j) < 0.5 && daten.some((z) => (z[j] ?? '').length > 1))
    if (i >= 0) rollen[i] = 'zeitung'
  }
  if (!rollen.includes('nummer') && !rollen.includes('raetsel_nummer')) {
    const i = rollen.findIndex((r, j) => r === 'ignorieren' && anteilNummern(j) >= 0.5)
    if (i >= 0) rollen[i] = 'nummer'
  }
  return rollen
}

// ------------------------------------------------------------------ Zeitungen zuordnen

export function zeitungFinden(name: string, zeitungen: Zeitung[]): Zeitung | null {
  const n = normal(name)
  if (!n) return null
  const exakt = zeitungen.filter((z) => normal(z.id) === n || normal(z.name) === n)
  if (exakt.length === 1) return exakt[0]
  // Teilnamen: „Stuttgarter Zeitung / Stuttgarter Nachrichten", „Suhler … (Freies Wort / …)"
  const teile = (z: Zeitung) =>
    z.name.split(/[/(),]| wie /).map((x) => normal(x)).filter((x) => x.length >= 3)
  const teil = zeitungen.filter((z) => teile(z).some((t) => t === n))
  if (teil.length === 1) return teil[0]
  const enthaelt = zeitungen.filter((z) => {
    const zn = normal(z.name)
    return (n.length >= 5 && zn.includes(n)) || (zn.length >= 5 && n.includes(zn))
  })
  if (enthaelt.length === 1) return enthaelt[0]
  return null
}

// ------------------------------------------------------------------ Nummern prüfen

/** Leerzeichen vereinheitlichen; führende 0 ergänzen, falls Excel sie verschluckt hat. */
export function nummerBereinigen(roh: string): { wert: string; hinweis?: string } {
  let w = roh.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
  if (/^\d+(\.0+)?$/.test(w)) w = w.replace(/\.0+$/, '')
  if (/^[1-9]\d{8,}$/.test(w)) return { wert: '0' + w, hinweis: 'Führende 0 ergänzt (Excel hatte sie entfernt).' }
  return { wert: w }
}

export function nummerFehler(w: string): string | undefined {
  if (!w) return undefined
  if (!/^[\d\s+/()\-]+$/.test(w)) return 'Enthält Buchstaben oder Sonderzeichen.'
  const ziffern = w.replace(/\D/g, '').length
  if (ziffern < 6) return 'Zu kurz.'
  if (ziffern > 15) return 'Zu lang.'
  return undefined
}

export const ziffern = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')

/** Baut die Import-Vorschau aus Tabelle + Spaltenrollen. */
export function importVorschau(
  t: Tabelle,
  kopf: boolean,
  rollen: Spaltenrolle[],
  zeitungen: Zeitung[],
  handZuordnung: Record<number, string>,
): ImportZeile[] {
  const iName = rollen.indexOf('zeitung')
  const start = kopf ? 1 : 0
  const out: ImportZeile[] = []
  for (let r = start; r < t.length; r++) {
    const z = t[r]
    const name = iName >= 0 ? (z[iName] ?? '').trim() : ''
    const werte: ImportZeile['werte'] = {}
    const fehler: ImportZeile['fehler'] = {}
    const warnung: ImportZeile['warnung'] = {}
    rollen.forEach((rolle, i) => {
      if (rolle !== 'nummer' && rolle !== 'raetsel_nummer') return
      const roh = (z[i] ?? '').trim()
      if (!roh) return
      const { wert, hinweis } = nummerBereinigen(roh)
      werte[rolle] = wert
      const f = nummerFehler(wert)
      if (f) fehler[rolle] = f
      else if (hinweis) warnung[rolle] = hinweis
    })
    if (!name && Object.keys(werte).length === 0) continue
    const hand = handZuordnung[r]
    const auto = zeitungFinden(name, zeitungen)
    const zeitungId = hand !== undefined ? (hand || null) : auto?.id ?? null
    // Länge mit heutiger Nummer vergleichen (Geldregen: Vorwahl ohne Endziffern)
    const heute = zeitungen.find((x) => x.id === zeitungId)
    if (heute) {
      for (const feld of ['nummer', 'raetsel_nummer'] as const) {
        const neu = werte[feld]
        if (!neu || fehler[feld]) continue
        // Vergleich: bisherige Nummer der Zeitung, sonst die übliche Länge der anderen Zeitungen
        const soll = heute[feld] ? ziffern(heute[feld]).length : ueblicheLaenge(zeitungen, feld)
        if (soll && ziffern(neu).length !== soll) {
          warnung[feld] = [warnung[feld], `${ziffern(neu).length} Ziffern statt der üblichen ${soll}. Bitte prüfen – die Endziffern hängt das Tool selbst an.`].filter(Boolean).join(' ')
        }
      }
    }
    out.push({ zeile: r + 1, name, zeitungId, automatisch: hand === undefined, werte, fehler, warnung })
  }
  return out
}

function ueblicheLaenge(zeitungen: Zeitung[], feld: NummernFeld): number | null {
  const zaehler = new Map<number, number>()
  for (const z of zeitungen) {
    const n = ziffern(z[feld]).length
    if (n) zaehler.set(n, (zaehler.get(n) ?? 0) + 1)
  }
  let best: number | null = null
  let max = 0
  for (const [n, c] of zaehler) if (c > max) { best = n; max = c }
  return best
}

/** Welche Felder ändern sich wirklich (ohne Fehler, ungleich heute)? */
export function aenderungenAus(zeilen: ImportZeile[], zeitungen: Zeitung[]): Record<string, ZeitungAenderung> {
  const out: Record<string, ZeitungAenderung> = {}
  for (const z of zeilen) {
    if (!z.zeitungId) continue
    const heute = zeitungen.find((x) => x.id === z.zeitungId)
    if (!heute) continue
    for (const feld of ['nummer', 'raetsel_nummer'] as const) {
      const neu = z.werte[feld]
      if (!neu || z.fehler[feld]) continue
      if (ziffern(neu) === ziffern(heute[feld])) continue
      ;(out[z.zeitungId] = out[z.zeitungId] || {})[feld] = neu
    }
  }
  return out
}

/** Aktuelle Liste als CSV (Semikolon, Excel-tauglich). */
export function alsCsv(zeitungen: Zeitung[]): string {
  const q = (s: string | null | undefined) => `"${(s ?? '').replace(/"/g, '""')}"`
  const kopf = ['ID', 'Zeitung', 'Geldregen-Nummer', 'Rätsel-Nummer', 'Verlagsgruppe'].join(';')
  const zeilen = zeitungen.map((z) => [q(z.id), q(z.name), q(z.nummer), q(z.raetsel_nummer ?? ''), q(z.hotline)].join(';'))
  return '﻿' + [kopf, ...zeilen].join('\r\n')
}
