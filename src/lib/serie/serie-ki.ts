// Serien-Modus · KI-Hilfen (gemeinsam für API-Routen und Oberfläche, reine Funktionen).
// Aufgaben:
//  • Text-Overrides auf ein SpielDef anwenden (titel, unterzeile, schritte, hinweis)
//  • KI-Antworten streng prüfen: genau 3 Varianten A/B/C, Längen, nur <b>/<br> als HTML,
//    keine erfundenen Beträge (nur die des Spiels), keine Telefonnummern, keine Rechtsaussagen,
//    echte Umlaute (Ersatzschreibungen wie „taeglich“ werden abgelehnt).
// Regel: lieber ablehnen und eine klare Fehlermeldung zeigen, als Unsicheres in eine Anzeige zu setzen.

import type { Vorschlag } from './types'
import type { SpielDef } from './spiele/typen'

export type TextOverride = Pick<SpielDef, 'titel' | 'unterzeile' | 'schritte' | 'hinweis'>

export type SerieVariante = TextOverride & {
  vorschlag: Vorschlag
  name: string
  begruendung: string
}

/** In IndexedDB gespeicherte Variante (Store `serienVarianten`, DB-Version 5). */
export type GespeicherteVariante = SerieVariante & {
  id: string
  spielId: string
  quelle: 'ki' | 'manuell'
  zusatzvorgaben?: string
  erstelltAm: number
}

export type SerieFrage = { frage: string; a1: string; a2: string; richtig: 1 | 2 }

export type TextFeld = 'titel' | 'unterzeile' | 'hinweis' | 'schritt'

export const GRENZEN = {
  name: 40,
  begruendung: 320,
  titel: 40,
  unterzeile: 90,
  schritt: 140,
  hinweisTitel: 40,
  hinweisText: 230,
  frage: 120,
  antwort: 30,
  zusatz: 600,
} as const

/** Wendet Text-Overrides an (ohne das Original zu verändern). */
export function spielMitText(spiel: SpielDef, o?: Partial<TextOverride> | null): SpielDef {
  if (!o) return spiel
  return {
    ...spiel,
    titel: o.titel ?? spiel.titel,
    unterzeile: o.unterzeile ?? spiel.unterzeile,
    schritte: o.schritte && o.schritte.length ? o.schritte : spiel.schritte,
    hinweis: o.hinweis ?? spiel.hinweis,
  }
}

export function textOverrideVon(spiel: SpielDef): TextOverride {
  return { titel: spiel.titel, unterzeile: spiel.unterzeile, schritte: [...spiel.schritte], hinweis: { ...spiel.hinweis } }
}

// ------------------------------------------------------------------ Säubern
const ERLAUBTE_ENTITAETEN = /^&(nbsp|shy|amp);/

/** Lässt nur <b>, </b> und <br> stehen; alles andere wird als Text maskiert. */
export function textSaeubern(s: string): string {
  const teile = s.replace(/\r/g, '').replace(/\n+/g, ' ').split(/(<\/?b>|<br\s*\/?>)/gi)
  return teile
    .map((t) => {
      if (/^<\/?b>$/i.test(t)) return t.toLowerCase()
      if (/^<br\s*\/?>$/i.test(t)) return '<br>'
      let aus = ''
      for (let i = 0; i < t.length; i++) {
        const c = t[i]
        if (c === '&') aus += ERLAUBTE_ENTITAETEN.test(t.slice(i)) ? '&' : '&amp;'
        else if (c === '<') aus += '&lt;'
        else if (c === '>') aus += '&gt;'
        else aus += c
      }
      return aus
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Sichtbarer Text (ohne Tags/Entitäten) – für Längenprüfungen. */
export function sichtbar(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&shy;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/** HTML-Maskierung für reinen Text (z. B. KI-Fragen im Geldregen-Generator, der nicht selbst maskiert). */
export function htmlMaskieren(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ------------------------------------------------------------------ Inhaltliche Prüfungen
const BETRAG = /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s?(?:€|Euro\b|EUR\b)/gi

export function betraege(s: string): string[] {
  const t = sichtbar(s).replace(/ /g, ' ')
  return [...t.matchAll(BETRAG)].map((m) => m[1] + ' €')
}

/** Beträge, die ein Spiel bereits nennt (Mechanik + Originaltexte) – nur diese darf die KI verwenden. */
export function erlaubteBetraege(spiel: SpielDef): string[] {
  const s = new Set<string>()
  const m = spiel.mechanik
  if (m.art === 'geldpakete') ['10.000 €', '5.000 €', '1.000 €', '500 €', '250 €', '100 €'].forEach((b) => s.add(b))
  if (m.art === 'tagespreis') {
    s.add(m.tagespreis.replace(/\s/g, ' '))
    if (m.supertag) s.add(m.supertag.replace(/\s/g, ' '))
  }
  if (m.art === 'jackpot') s.add(m.tagespreis.replace(/\s/g, ' '))
  for (const t of [spiel.unterzeile, spiel.hinweis.text, spiel.hinweis.titel, ...spiel.schritte]) betraege(t).forEach((b) => s.add(b))
  return [...s]
}

/** Platzhalter, die die Rahmen-Engine nur in der Unterzeile ersetzt – in Schritten/Hinweis selbst ersetzen. */
export function platzhalterErsetzen(s: string, spiel: SpielDef): string {
  const m = spiel.mechanik
  const tp = m.art === 'geldpakete' ? '10.000 €' : m.tagespreis
  const st = m.art === 'tagespreis' && m.supertag ? m.supertag : tp
  return s.replace(/\{TAGESPREIS\}/g, tp).replace(/\{SUPERTAG\}/g, st)
}

const TELEFON = /(?:\+\d|\b0)\d[\d \/-]{5,}\d|\b\d{6,}\b/
const RECHT = /garant|rechtlich|gesetzlich|notariell|amtlich|steuerfrei|ohne risiko|risikolos|100\s?%|sicherer gewinn|gewinn sicher|ab 18|volljährig|teilnahmebedingung|datenschutz|dsgvo|kostenlos|gratis|gebührenfrei/i
const ERSATZ = /\b(fuer|fuers|ueber|ueberall|grosse?|gross|heisst)\b|glueck|taeglich|waehl|raetsel|loesung|koenn|moeglich|zaehl|haeuf|naechst|spaet|frueh|muenz|schluessel|praemie|hoer|woech|buero|gruen|maerz|aender/i

export type Pruefung = { ok: true } | { ok: false; grund: string }

/** Prüft einen (bereits gesäuberten) Anzeigentext. `erlaubt` = zulässige Beträge. */
export function textPruefen(text: string, feld: string, max: number, erlaubt: string[]): Pruefung {
  const v = sichtbar(text)
  if (!v) return { ok: false, grund: `${feld}: leer` }
  if (v.length > max) return { ok: false, grund: `${feld}: zu lang (${v.length} > ${max} Zeichen)` }
  if (TELEFON.test(v)) return { ok: false, grund: `${feld}: enthält eine Telefonnummer o. ä. – Nummern kommen nur aus den Zeitungsdaten` }
  if (RECHT.test(v)) return { ok: false, grund: `${feld}: enthält eine Rechts-/Kosten-Aussage („${(v.match(RECHT) ?? [''])[0]}“) – nicht erlaubt` }
  if (ERSATZ.test(v)) return { ok: false, grund: `${feld}: Ersatzschreibung statt Umlaut („${(v.match(ERSATZ) ?? [''])[0]}“)` }
  const fremd = betraege(text).filter((b) => !erlaubt.includes(b))
  if (fremd.length) return { ok: false, grund: `${feld}: erfundener Betrag ${fremd.join(', ')} (erlaubt: ${erlaubt.join(', ') || 'keine'})` }
  return { ok: true }
}

function str(x: unknown): string {
  return typeof x === 'string' ? x : ''
}

/** Eine KI-Variante prüfen und säubern. */
export function varianteValidieren(roh: unknown, spiel: SpielDef, erwartet: Vorschlag): { ok: true; v: SerieVariante } | { ok: false; grund: string } {
  if (!roh || typeof roh !== 'object') return { ok: false, grund: `Variante ${erwartet}: kein Objekt` }
  const r = roh as Record<string, unknown>
  const erlaubt = erlaubteBetraege(spiel)
  const name = sichtbar(textSaeubern(str(r.name)))
  const begruendung = sichtbar(textSaeubern(str(r.begruendung)))
  const titel = textSaeubern(str(r.titel))
  const unterzeile = textSaeubern(str(r.unterzeile))
  const schritteRoh = Array.isArray(r.schritte) ? r.schritte : []
  const schritte = schritteRoh.map((s) => textSaeubern(platzhalterErsetzen(str(s), spiel))).filter(Boolean)
  const h = (r.hinweis && typeof r.hinweis === 'object' ? r.hinweis : {}) as Record<string, unknown>
  const hinweis = { titel: textSaeubern(platzhalterErsetzen(str(h.titel), spiel)), text: textSaeubern(platzhalterErsetzen(str(h.text), spiel)) }

  if (!name) return { ok: false, grund: `Variante ${erwartet}: Name fehlt` }
  if (name.length > GRENZEN.name) return { ok: false, grund: `Variante ${erwartet}: Name zu lang` }
  if (!begruendung) return { ok: false, grund: `Variante ${erwartet}: Begründung fehlt` }
  if (schritte.length < 3 || schritte.length > 4) return { ok: false, grund: `Variante ${erwartet}: 3–4 Schritte erwartet (${schritte.length})` }
  const checks: [string, string, number][] = [
    [titel, 'Titel', GRENZEN.titel],
    [unterzeile, 'Unterzeile', GRENZEN.unterzeile],
    [hinweis.titel, 'Hinweis-Titel', GRENZEN.hinweisTitel],
    [hinweis.text, 'Hinweis-Text', GRENZEN.hinweisText],
    ...schritte.map((s, i): [string, string, number] => [s, `Schritt ${i + 1}`, GRENZEN.schritt]),
  ]
  for (const [t, f, max] of checks) {
    const p = textPruefen(t, `Variante ${erwartet} · ${f}`, max, erlaubt)
    if (!p.ok) return p
  }
  const nb = textPruefen(begruendung, `Variante ${erwartet} · Begründung`, GRENZEN.begruendung, erlaubt)
  if (!nb.ok) return nb
  return { ok: true, v: { vorschlag: erwartet, name, begruendung, titel, unterzeile, schritte, hinweis } }
}

/** Genau drei Varianten A, B, C. */
export function variantenValidieren(roh: unknown, spiel: SpielDef): { ok: true; varianten: SerieVariante[] } | { ok: false; grund: string } {
  const liste = roh && typeof roh === 'object' && Array.isArray((roh as { varianten?: unknown }).varianten) ? ((roh as { varianten: unknown[] }).varianten) : null
  if (!liste) return { ok: false, grund: 'Antwort enthält kein Feld „varianten“' }
  if (liste.length !== 3) return { ok: false, grund: `Genau 3 Varianten erwartet, erhalten: ${liste.length}` }
  const aus: SerieVariante[] = []
  const reihenfolge: Vorschlag[] = ['A', 'B', 'C']
  for (const v of reihenfolge) {
    const roheV = liste.find((x) => x && typeof x === 'object' && (x as { vorschlag?: unknown }).vorschlag === v)
    if (!roheV) return { ok: false, grund: `Variante ${v} fehlt (Feld „vorschlag“ muss A, B und C je einmal enthalten)` }
    const p = varianteValidieren(roheV, spiel, v)
    if (!p.ok) return p
    aus.push(p.v)
  }
  return { ok: true, varianten: aus }
}

/** Verbesserungs-Vorschläge für ein einzelnes Textfeld prüfen. */
export function verbesserungenValidieren(roh: unknown, spiel: SpielDef, feld: TextFeld): { ok: true; vorschlaege: string[] } | { ok: false; grund: string } {
  const liste = roh && typeof roh === 'object' && Array.isArray((roh as { vorschlaege?: unknown }).vorschlaege) ? ((roh as { vorschlaege: unknown[] }).vorschlaege) : null
  if (!liste || !liste.length) return { ok: false, grund: 'Antwort enthält keine „vorschlaege“' }
  const max = feld === 'titel' ? GRENZEN.titel : feld === 'unterzeile' ? GRENZEN.unterzeile : feld === 'schritt' ? GRENZEN.schritt : GRENZEN.hinweisText
  const erlaubt = erlaubteBetraege(spiel)
  const aus: string[] = []
  const gruende: string[] = []
  for (const x of liste.slice(0, 3)) {
    let t = textSaeubern(str(x))
    if (feld !== 'unterzeile') t = platzhalterErsetzen(t, spiel)
    const p = textPruefen(t, 'Vorschlag', max, erlaubt)
    if (p.ok) aus.push(t)
    else gruende.push(p.grund)
  }
  if (!aus.length) return { ok: false, grund: gruende.join(' · ') || 'keine gültigen Vorschläge' }
  return { ok: true, vorschlaege: aus }
}

/** Tagesfragen prüfen: Frage + zwei kurze Antworten + richtig 1|2. */
export function fragenValidieren(roh: unknown, anzahl: number): { ok: true; fragen: SerieFrage[]; verworfen: string[] } | { ok: false; grund: string } {
  const liste = roh && typeof roh === 'object' && Array.isArray((roh as { fragen?: unknown }).fragen) ? ((roh as { fragen: unknown[] }).fragen) : null
  if (!liste) return { ok: false, grund: 'Antwort enthält kein Feld „fragen“' }
  const aus: SerieFrage[] = []
  const verworfen: string[] = []
  for (const x of liste) {
    if (aus.length >= anzahl) break
    const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const frage = sichtbar(str(r.frage))
    const a1 = sichtbar(str(r.a1))
    const a2 = sichtbar(str(r.a2))
    const richtig = Number(r.richtig)
    const fehler: string[] = []
    if (!frage || frage.length > GRENZEN.frage) fehler.push('Frage leer/zu lang')
    if (!a1 || !a2 || a1.length > GRENZEN.antwort || a2.length > GRENZEN.antwort) fehler.push('Antwort leer/zu lang')
    if (a1 && a1 === a2) fehler.push('Antworten gleich')
    if (richtig !== 1 && richtig !== 2) fehler.push('„richtig“ nicht 1/2')
    for (const [t, f] of [[frage, 'Frage'], [a1, 'Antwort 1'], [a2, 'Antwort 2']] as const) {
      if (TELEFON.test(t)) fehler.push(`${f}: Telefonnummer`)
      if (ERSATZ.test(t)) fehler.push(`${f}: Ersatzschreibung statt Umlaut`)
    }
    if (fehler.length) verworfen.push(`${frage.slice(0, 50) || '?'} → ${fehler.join(', ')}`)
    else aus.push({ frage, a1, a2, richtig: richtig as 1 | 2 })
  }
  if (!aus.length) return { ok: false, grund: 'Keine gültige Frage erhalten' + (verworfen.length ? ': ' + verworfen.slice(0, 3).join(' · ') : '') }
  return { ok: true, fragen: aus, verworfen }
}
