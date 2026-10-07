// Serien-Modus: inhaltliche Prüfung einer erzeugten Anzeige (ohne Browser).
// Port von Geldregen_2027/werkzeug/pruefe_daten.py. Prüft je Anzeige:
//  • Format • Gewinnfrage + Antworten • Spieltag • Datum/Wochentag • Preisangabe 6×
//  • 12 Telefonnummern exakt (Präfix + Paket 1–6 + Endziffer 1/2) bzw. 12 Platzhalter
//  • Teilnahmebedingungen: eigene Verlagsgruppe zuerst, Aktionszeitraum, optional exakter Wortlaut gegen Referenz
//  • Logos eingebunden
// Layout-Prüfung (Überlappung, Überlauf, TNB-Größe) macht das Einpass-Skript im Browser (fit-source.ts).

import type { Eintrag, SerienDaten, Spieltag, TnbReferenz } from './types'

export type PruefInfo = { fehler: string[]; platzhalter: string[] }

/** Mechanik mit Zeitschiene (Geldregen-Geldpakete, Juli-Jackpot) darf keinen Vorzählfaktor-Text enthalten.
 *  Regel Jenny/Yasmina 07.10.2026: nur bei den normalen Rätselspielen (AZS/Auszahlung) ist er zulässig. */
export function pruefeKeinVorzaehlfaktor(mechanikArt: 'geldpakete' | 'jackpot' | 'tagespreis', html: string): string[] {
  if (mechanikArt === 'tagespreis') return []
  return /Vorzählfaktor/i.test(html)
    ? [`Mechanik ${mechanikArt}: „Vorzählfaktor“ im Text (nicht erlaubt bei Zeitschienen-Spielen).`]
    : []
}

/** Anzeigen dürfen keine Schatten/Filter enthalten. Chrome legt box-shadow als Rasterbild ins PDF,
 *  das in der Mac-Vorschau als graue Kästen erscheint (Regel 06.10.2026). Prüfung gegen `spielSeite()`-HTML
 *  einer einzelnen Anzeige (nicht gegen die Prüfseite — dort gibt es den erlaubten .zelle-Rahmen). */
export function pruefeKeineSchatten(html: string): string[] {
  const fehler: string[] = []
  if (/\bbox-shadow\s*:/.test(html)) fehler.push('box-shadow im HTML (nicht erlaubt)')
  if (/\btext-shadow\s*:/.test(html)) fehler.push('text-shadow im HTML (nicht erlaubt)')
  if (/(?<!backdrop-)filter\s*:/.test(html)) fehler.push('filter: im HTML (nicht erlaubt)')
  return fehler
}

function entitaeten(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

const norm = (x: string) => x.replace(/\s+/g, ' ').trim()

export function pruefeInhalt(
  daten: SerienDaten,
  e: Eintrag,
  t: Spieltag,
  monat: string,
  html: string,
  tnbRef?: TnbReferenz,
): PruefInfo {
  const fehler: string[] = []
  const platzhalter: string[] = []
  const { z } = e
  const pf = (bed: boolean, msg: string) => {
    if (!bed) fehler.push(msg)
  }

  const m = html.match(/data-wmm="(\d+)" data-hmm="(\d+)"/)
  pf(!!m && +m[1] === z.format[0] && +m[2] === z.format[1], 'Format falsch')

  const body = html.split('<body>')[1] ?? ''
  const txt = norm(entitaeten(body.split('<script>')[0].replace(/<[^>]+>/g, ' ')))

  pf(txt.includes(t.frage) && txt.includes(t.a1) && txt.includes(t.a2), 'Gewinnfrage/Antworten fehlen')
  pf(new RegExp('(?<!\\d)' + t.tag + '\\. SPIELTAG').test(txt), 'Spieltag fehlt/falsch')
  pf(txt.includes(t.label.toUpperCase()), 'Datum/Wochentag der Frage fehlt')
  pf(txt.split('Telemedia Interactive GmbH; 0,50 €').length - 1 === 6, 'Preisangabe nicht 6×')

  // Telefonnummern: genau 12 in fester Reihenfolge
  if (z.nummer) {
    const d = z.nummer.replace(/ /g, '').replace(/-/g, '')
    const soll: string[] = []
    for (let p = 1; p <= 6; p++) for (const en of [1, 2]) soll.push(`${(d + p).slice(0, 5)} ${(d + p).slice(5)}|${en}`)
    const ist = [...html.matchAll(/<span class="nr">([^<]*)<i>(\d)<\/i>/g)].map((x) => `${norm(x[1])}|${x[2]}`)
    pf(JSON.stringify(ist) === JSON.stringify(soll), `Telefonnummern falsch: ${ist.slice(0, 2).join(', ')}… statt ${soll.slice(0, 2).join(', ')}…`)
  } else {
    platzhalter.push(`${z.id}: Nummer fehlt (Platzhalter)`)
    pf(html.split('NUMMER FOLGT').length - 1 === 12, 'Platzhalter-Nummern nicht 12×')
  }

  // Teilnahmebedingungen
  const soll = tnbRef?.[monat]
  if (soll && typeof soll !== 'string' && soll[z.id]) pf(txt.includes(soll[z.id]), 'Teilnahmebedingungen weichen vom freigegebenen Wortlaut ab (tnb_referenz.json)')
  const R = daten.tnb_gruppen
  pf(txt.includes('Tageszeitungen ' + (R[z.tnb_gruppe] as string)), 'eigene Verlagsgruppe nicht an erster Stelle')
  const zeitraum = daten.aktionszeitraum?.[monat] // durchgehende Aktion (z. B. Nov+Dez 2027)
  pf(zeitraum ? txt.includes(`Aktionszeitraum ${zeitraum}`) : txt.includes(`Aktionszeitraum vom 01.${monat.slice(5)}.${monat.slice(0, 4)} bis`), 'Aktionszeitraum falsch')
  if (!daten.hotline_texte[z.hotline]) platzhalter.push(`${z.id}: Hotline-Satz fehlt (Platzhalter)`)
  if (!daten.datenschutz_texte[z.datenschutz]) platzhalter.push(`${z.id}: Datenschutz-Hinweis fehlt (Platzhalter)`)

  for (const l of z.logos) pf(html.includes(`logos/${l}.png`), `Logo ${l} fehlt`)

  pf(!html.includes('undefined') && !html.includes('NaN'), 'Technischer Fehler im Text (undefined/NaN)')

  return { fehler, platzhalter: [...new Set(platzhalter)] }
}
