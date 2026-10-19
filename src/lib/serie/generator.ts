// Serien-Modus: Anzeigen-Generator Geldregen (Vorschlag A / B / C, je 1 oder 4 Gewinner).
// 1:1-Port von Geldregen_2027/werkzeug/gr_build.py – die HTML-Ausgabe ist (außerhalb des <script>-Blocks)
// Zeichen für Zeichen identisch; das prüft scripts/check-serie.mjs gegen die Python-Ausgabe.
// Reine Funktionen, keine Browser-/Node-APIs → läuft im Browser, in Node (Tests) und im API-Route-Handler.

import { FIT_JS } from './fit-source'
import type { Einfuehrung, Eintrag, EchterGewinner, GewinnerEintrag, Tagesdaten, PfadFn, SerienDaten, Spieltag, Vorschlag, GewinnerAnzahl, Zeitung } from './types'

export const W = 1575 // Layout-Breite in px
export const BODY_H = 922 // Gestaltungshöhe des Inhaltsbereichs
export const PAKETE: [number, string][] = [[3, '10.000'], [7, '5.000'], [15, '1.000'], [25, '500'], [50, '250'], [150, '100']]
export const PREIS = 'Telemedia Interactive GmbH; 0,50 € pro Anruf aus dem dt. Festnetz sowie Mobilfunk. (Flatrates nicht inbegriffen)'
export const SCHRITTE = [
  'Beantworten Sie die heutige Gewinnfrage.',
  'Entscheiden Sie sich für ein Geldpaket.',
  'Wählen Sie die Hotline Ihres Wunschpakets mit der Endziffer Ihrer Antwort (1 oder 2).',
  'Jetzt heißt es nur noch Daumen drücken!',
]
export const ZEITFENSTER =
  'Vor Spielbeginn wurden für alle Gewinne Zeitfenster unterschiedlicher Länge festgelegt, die per Zufallsgenerator ' +
  'über den Spieltag verteilt werden. Treffen Sie mit Ihrem Anruf ein Zeitfenster Ihres Wunschpakets, haben Sie ' +
  'gewonnen – und erfahren es sofort am Telefon.'
// Gewinner-Dummies: Index im Bild gew8.jpg (4 × 2 Porträts, 1280 × 720)
export const GEW_NAMEN = ['Hannelore Bauer', 'Werner Schmidt', 'Gisela Wagner', 'Heinz Hofmann', 'Ingrid Lehmann', 'Klaus Becker', 'Ursula Fischer', 'Manfred Zimmermann']
export const FACES: [number, number][] = [[158, 0], [478, 0], [798, 0], [1119, 0], [158, 362], [478, 362], [798, 362], [1119, 362]] // (Mitte x, Oberkante Zelle)
export const BETRAEGE4 = ['1.000 €', '5.000 €', '500 €', '250 €', '10.000 €', '100 €', '1.000 €', '500 €']
export const BETRAEGE1 = ['10.000 €', '5.000 €', '1.000 €', '10.000 €', '5.000 €']
export const ZITATE = [
  '„Ich konnte es kaum glauben!“', '„Das Geld kommt in die Urlaubskasse.“', '„Mitspielen macht einfach Spaß.“',
  '„Davon gibt es neue Fahrräder für die Enkel.“', '„Ich spiele jeden Tag mit – jetzt hat es geklappt.“',
  '„Damit erfülle ich mir einen kleinen Traum.“', '„Ein schöneres Geschenk vor Weihnachten gibt es nicht.“',
  '„Als die Ansage kam, musste ich mich erst einmal setzen.“',
]

// ------------------------------------------------------------------ Hilfsfunktionen (Python-kompatibel)
/** Python-round(): kaufmännisch auf gerade (Banker's rounding). */
export function pyRound(x: number): number {
  const f = Math.floor(x)
  const d = x - f
  if (d < 0.5) return f
  if (d > 0.5) return f + 1
  return f % 2 === 0 ? f : f + 1
}

/** Python f'{x:.1f}': bei exaktem Gleichstand auf gerade Ziffer (JS toFixed rundet dort weg von 0). */
export function fix1(x: number): string {
  const t = x * 10
  const a = Math.abs(t)
  if (a - Math.floor(a) === 0.5) {
    let n = Math.floor(a)
    if (n % 2 === 1) n += 1
    const s = String(n).padStart(2, '0')
    return (x < 0 ? '-' : '') + s.slice(0, -1) + '.' + s.slice(-1)
  }
  return x.toFixed(1)
}

function hex2(n: number): string {
  return n.toString(16).toUpperCase().padStart(2, '0')
}

export function mischen(c1: string, c2: string, t: number): string {
  const a = [1, 3, 5].map((i) => parseInt(c1.slice(i, i + 2), 16))
  const b = [1, 3, 5].map((i) => parseInt(c2.slice(i, i + 2), 16))
  return '#' + a.map((x, i) => hex2(pyRound(x + (b[i] - x) * t))).join('')
}

export function face(i: number, w: number, h: number, r = '50%', extra = ''): string {
  const [cx, top] = FACES[i]
  let ww = 310.0
  let wh = (310.0 * h) / w
  if (wh > 345) {
    wh = 345.0
    ww = (wh * w) / h
  }
  const sc = w / ww
  const x0 = cx - ww / 2
  let y0 = top + 170 - wh / 2
  y0 = Math.max(top + 2, Math.min(y0, top + 358 - wh))
  return (
    `<div class="g8" style="width:${w}px;height:${h}px;border-radius:${r};flex:none;${extra}` +
    `background-position:${fix1(-x0 * sc)}px ${fix1(-y0 * sc)}px;background-size:${fix1(1280 * sc)}px ${fix1(720 * sc)}px"></div>`
  )
}

/** Gewinnerbild: echtes Foto (Kopf oben → Ausschnitt ab 22 % Höhe, nie angeschnitten) oder Dummy-Porträt aus gew8.jpg */
export function bild(e: GewinnerEintrag, w: number, h: number, r = '50%', extra = ''): string {
  const foto = e[5]
  if (!foto) return face(e[0], w, h, r, extra)
  return `<div class="gfoto" style="width:${w}px;height:${h}px;border-radius:${r};flex:none;${extra}background:url('${foto}') center 22%/cover no-repeat"></div>`
}

/** Geldscheine; schatten=false (Standard) für helle/farbige Hintergründe.
 *  Ohne Schatten zusätzlich Bilder ohne eingebrannten Schattenrand (bn*o.jpg, Rand unten/rechts abgeschnitten).
 *  Hintergrund: Chrome legt box-shadow als Rasterbild ins PDF → in Vorschau/Acrobat graue Kästen. */
export type ScheinTupel = [number, number, number, number, number, number] // Wert, x, y, Breite, Drehung°, Ebene

/** Geldschein-Platzierung der festen Vorschläge (Anzeigen-Pixel, 1575 breit). */
export const SCHEINE_ORIGINAL: Record<'A' | 'B' | 'C', ScheinTupel[]> = {
  A: [[200, 760, -80, 290, -18, 1], [100, 1010, 20, 260, 20, 2], [50, 725, 105, 185, 8, 1], [100, 880, 128, 220, -8, 3], [50, 1150, -70, 210, -28, 1], [200, 1135, 118, 190, 12, 2]],
  B: [[100, 20, 338, 190, -12, 2], [200, 265, 330, 190, 10, 1], [50, 150, 380, 160, -3, 3]],
  C: [[100, 640, -40, 230, 16, 1], [200, 860, -95, 250, -12, 1], [50, 1060, 10, 190, 22, 1], [200, 1240, -70, 240, -9, 1], [100, 1360, 70, 210, 17, 2]],
}

export function scheine(liste: [number, number, number, number, number, number][], schatten = false): string {
  const s = schatten ? 'box-shadow:0 10px 24px rgba(0,0,0,.30);' : ''
  const o = schatten ? '' : 'o'
  return liste
    .map(
      ([wert, x, y, b, rot, z]) =>
        `<div class="bn${wert}${o}" style="position:absolute;left:${x}px;top:${y}px;width:${b}px;aspect-ratio:520/290;transform:rotate(${rot}deg);` +
        `z-index:${z};${s}border-radius:4px"></div>`,
    )
    .join('')
}

export function fehlt(text: string): string {
  return `<span class="fehlt">${text}</span>`
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

// ------------------------------------------------------------------ Teilnahmebedingungen
export function tnbText(daten: SerienDaten, z: Zeitung, monat: string): string {
  const g = z.tnb_gruppe
  const R = daten.tnb_gruppen
  const reihenfolge = [g, ...(R._reihenfolge as string[]).filter((k) => k !== g)] // eigene Verlagsgruppe zuerst
  const liste = reihenfolge.map((k) => R[k] as string).join(', ')
  const hot = daten.hotline_texte[z.hotline] || fehlt('[Hotline-Satz folgt]')
  const ds = daten.datenschutz_texte[z.datenschutz] || fehlt('[Datenschutz-Hinweis folgt]')
  const ver = daten.veranstalter_texte[z.veranstalter ?? ''] ?? ''
  const [j, m] = monat.split('-').map(Number)
  const letzter = new Date(Date.UTC(j + (m === 12 ? 1 : 0), m % 12, 1) - 86400000).getUTCDate()
  const zeitraumMonat = `vom 01.${pad2(m)}.${j} bis ${pad2(letzter)}.${pad2(m)}.${j}`
  // durchgehende Aktion (z. B. Geldregen Nov+Dez 2027): Zeitraum aus zeitungen.json → aktionszeitraum[monat]
  const zeitraum = daten.aktionszeitraum?.[monat] ?? zeitraumMonat
  const kopf =
    `<b>${hot}</b> Teilnahme von 00:00 Uhr am jeweiligen Erscheinungstag bis 23:59 Uhr am selben Tag, ` +
    `Wochenende: Samstag 00:00 Uhr bis Sonntag 23:59 Uhr. ${ver ? ver + ' ' : ''}`
  let rest: string
  if (g === 'NUE') {
    // Wortlaut der Nürnberger Anzeige 2026 (ohne Gender-Stern, ohne Social Media)
    rest =
      'Teilnahmeberechtigt sind Leserinnen und Leser der Tageszeitungen ' + liste + ' (nachfolgend kurz als „Tageszeitungen“ bezeichnet). ' +
      'Mindestalter 18 Jahre. Die Gewinner werden schnellstmöglich telefonisch kontaktiert, spätestens am Folgetag bis 11:00 Uhr, bezüglich ' +
      'Aufnahme der Bankverbindung, Übersendung eines Gewinnerfotos und ggf. zur Vereinbarung eines Termins mit einem Verlagsmitarbeiter. ' +
      'Wird ein Präsenztermin vereinbart, findet eine symbolische Übergabe des Gewinns im Rahmen dieses Termins statt. Über die Gewinner wird ' +
      'ein kurzer redaktioneller Beitrag mit professionellem Foto erstellt und in den Tageszeitungen veröffentlicht. Der Gewinner stimmt durch ' +
      'seine Teilnahme der Erstellung des vorgenannten redaktionellen Beitrags sowie der Veröffentlichung des redaktionellen Beitrags mit Vor- und ' +
      'Zunamen und eines Gewinnerfotos in den Tageszeitungen zu und wird alle hierfür notwendigen Mitwirkungshandlungen erbringen, ansonsten ' +
      'verfällt der Gewinn. Die Freitagsgewinner werden schnellstmöglich telefonisch kontaktiert oder mit den Samstags- und Sonntagsgewinnern am ' +
      'darauffolgenden Montag bis 11:00 Uhr angerufen. Der Gewinn wird so schnell wie möglich auf das angegebene Bankkonto überwiesen. Für die ' +
      'Richtigkeit der angegebenen Daten ist ausschließlich der Teilnehmer verantwortlich. Leider können wir nur einen Teil aller Gewinner ' +
      'veröffentlichen – wir bitten diesbezüglich um Verständnis. Mitarbeiterinnen und Mitarbeiter der Tageszeitungen und der mit ihnen verbundenen ' +
      'Unternehmen sowie deren Angehörige sind von der Teilnahme ausgeschlossen. Ausgeschlossen sind auch Personen, die falsche Personenangaben ' +
      'machen, sich unlauterer Hilfsmittel bedienen oder sich anderweitig durch Manipulation Vorteile verschaffen. Der Gewinnanspruch verfällt ' +
      'auch, wenn der Gewinner es verweigert, eine schriftliche Erklärung zur Einhaltung der Teilnahmebedingungen abzugeben sowie dem Veranstalter ' +
      'eine Kopie seines Personalausweises zur Verfügung zu stellen, falls notwendig. Der Rechtsweg ist ausgeschlossen. '
  } else {
    const social = g === 'NOZ' || g === 'NPG' ? '' : ' sowie auf den Social-Media-Kanälen'
    rest =
      'Teilnahmeberechtigt sind Leser*innen der Tageszeitungen ' + liste + ' (nachfolgend kurz als „Tageszeitungen“ bezeichnet). ' +
      'Mindestalter 18 Jahre. Der/Die Gewinner*in wird schnellstmöglich telefonisch kontaktiert, spätestens am Folgetag bis 11:00 Uhr, ' +
      'bezüglich Aufnahme der Bankverbindung, Übersendung eines Gewinnerfotos und ggf. zur Vereinbarung eines Termins mit einem ' +
      'Verlagsmitarbeiter. Wird ein Präsenztermin vereinbart, findet eine symbolische Übergabe des Gewinns im Rahmen dieses Termins statt. ' +
      `Über den/die Gewinner*in wird ein kurzer redaktioneller Beitrag mit professionellem Foto erstellt und in den Tageszeitungen${social} ` +
      'veröffentlicht. Der/Die Gewinner*in stimmt durch seine/ihre Teilnahme der Erstellung des vorgenannten redaktionellen Beitrags sowie der ' +
      `Veröffentlichung des redaktionellen Beitrags mit Vor- und Zunamen und eines Gewinnerfotos in den Tageszeitungen${social} zu und wird ` +
      'alle hierfür notwendigen Mitwirkungshandlungen erbringen, ansonsten verfällt der Gewinn. Der/Die Freitagsgewinner*in wird ' +
      'schnellstmöglich telefonisch kontaktiert oder mit dem/der Samstags- und Sonntagsgewinner*in am darauffolgenden Montag bis 11:00 Uhr ' +
      'angerufen. Der Gewinn wird so schnell wie möglich auf das angegebene Bankkonto überwiesen. Für die Richtigkeit der angegebenen Daten ist ' +
      'ausschließlich der/die Teilnehmer*in verantwortlich. Leider können wir nur einen Teil aller Gewinner*innen veröffentlichen – wir bitten ' +
      'diesbezüglich um Verständnis. Mitarbeiter*innen der Tageszeitungen und der mit ihnen verbundenen Unternehmen sowie deren Angehörige sind ' +
      'von der Teilnahme ausgeschlossen. Ausgeschlossen sind auch Personen, die falsche Personenangaben machen, sich unlauterer Hilfsmittel ' +
      'bedienen oder sich anderweitig durch Manipulation Vorteile verschaffen. Der Gewinnanspruch verfällt auch, wenn der/die Gewinner*in es ' +
      'verweigert, eine schriftliche Erklärung zur Einhaltung der Teilnahmebedingungen abzugeben sowie dem Veranstalter eine Kopie seines/ihres ' +
      'Personalausweises zur Verfügung zu stellen, falls notwendig. Der Rechtsweg ist ausgeschlossen. '
  }
  return kopf + rest + `Aktionszeitraum ${zeitraum}. Das Gewinnspiel „Geldregen“ kann jederzeit ohne Angabe von Gründen eingestellt werden. ${ds}`
}

/** Band unten: Teilnahmebedingungen umfließen die Logos unten rechts (Höhe/Schrift setzt das Einpass-Skript).
 *  links/rechts = Inhaltsränder (nur zur Info). Die TNB laufen über die ganze Anzeigenbreite, 2 mm vom Rand (siehe FIT_JS). */
export function tnbBand(daten: SerienDaten, z: Zeitung, monat: string, pfad: PfadFn, links: number, rechts: number, cls = '', stil = ''): string {
  const n = z.logos.length
  let floats = ''
  if (n) {
    const mh = ({ 1: 110, 2: 62, 3: 46 } as Record<number, number>)[n] ?? 40
    const lg = z.logos
      .map((l, k) => `<img src="${pfad('logos/' + l + '.png')}" style="display:block;max-width:180px;max-height:${mh}px;margin:${k ? 4 : 0}px 0 0 auto">`)
      .join('')
    floats = `<div class="sp"></div><div class="lg">${lg}</div>`
  }
  return `<div class="tband ${cls}" data-pad="20" data-l="${links}" data-r="${rechts}" style="${stil}"><div class="tnb">${floats}${tnbText(daten, z, monat)}</div></div>`
}

// ------------------------------------------------------------------ Tagesdaten
/** Betrag („1.000 €“, „10.000“, „500,50 €“) als Zahl; null, wenn nicht lesbar. */
export function betragZahl(b: string): number | null {
  const s = String(b ?? '').replace(/€|EUR|Euro/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null
}

export function tagesdaten(z: Zeitung, t: Spieltag, echte?: EchterGewinner[], einfuehrung?: Einfuehrung): Tagesdaten {
  const td = tagesdatenBasis(z, t, echte)
  return einfuehrung && (einfuehrung.titel?.trim() || einfuehrung.text?.trim()) ? { ...td, einfuehrung } : td
}

function tagesdatenBasis(z: Zeitung, t: Spieltag, echte?: EchterGewinner[]): Tagesdaten {
  const n = t.tag
  const s4 = (n * 3) % 8
  const g4: Tagesdaten['g4'] = []
  for (let k = 0; k < 4; k++) {
    const i = (s4 + k) % 8
    g4.push([i, GEW_NAMEN[i], BETRAEGE4[(n + k) % 8], ZITATE[(n + k) % 8], z.orte[k % z.orte.length]])
  }
  g4.sort((a, b) => -parseInt(a[2].replace(/\./g, '').replace(' €', ''), 10) + parseInt(b[2].replace(/\./g, '').replace(' €', ''), 10)) // höchster Gewinn zuerst (stabil wie Python)
  const i1 = (n * 5 + 3) % 8
  const g1: Tagesdaten['g1'] = [i1, GEW_NAMEN[i1], BETRAEGE1[n % 5], ZITATE[(n + 4) % 8], z.orte[n % z.orte.length]]
  if (echte && echte.length) {
    // Echte Gewinner ersetzen die Dummies (max. 4; bei „1 Gewinner“ der erste wie erfasst).
    // 4er-Liste: höchster Gewinn zuerst – nur wenn sich alle Beträge als Zahl lesen lassen, sonst Reihenfolge wie erfasst.
    const ex = echte.slice(0, 4).map((e, k): GewinnerEintrag => [k, e.name, e.betrag, e.text, e.ort, e.foto])
    const zahlen = ex.map((e) => betragZahl(e[2]))
    const sortiert = zahlen.every((x) => x !== null)
      ? ex.map((e, k) => ({ e, v: zahlen[k] as number })).sort((a, b) => b.v - a.v).map((x) => x.e)
      : ex
    return { frage: t.frage, a1: t.a1, a2: t.a2, tag: n, label: t.label, g4: sortiert, g1: ex[0], echt: true }
  }
  return { frage: t.frage, a1: t.a1, a2: t.a2, tag: n, label: t.label, g4, g1 }
}

export function nummer(z: Zeitung, p: number, e: number): string {
  if (!z.nummer) return `<span class="nr">${fehlt('NUMMER FOLGT')}<i>${e}</i></span>`
  const d = z.nummer.replace(/ /g, '').replace(/-/g, '') + String(p)
  return `<span class="nr">${d.slice(0, 5)} ${d.slice(5)}<i>${e}</i></span>`
}

function gewLabel(td: Tagesdaten): string {
  return td.tag === 1 ? 'UNSER GLÜCKSPILZ' : `GEWINNER VOM ${td.tag - 1}. SPIELTAG`
}

// 1. Spieltag: noch keine Gewinner → statt Gewinnerblock ein Start-Hinweis (gilt für die 1- und die 4-Gewinner-Fassung,
// auch wenn echte Gewinner übergeben werden). Beispiele mit Gewinnern daher ab dem 2. Spieltag (Andreas A., 06.10.2026).
export const START_HINWEIS = true
export const START_TITEL = 'Heute startet der Geldregen!'
export const START_TEXT = 'Ab morgen stellen wir Ihnen hier die ersten Gewinnerinnen und Gewinner vor.'

/** Klartext für HTML maskieren (Einführungstext wird von Hand eingegeben). */
export const maskiere = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function startBlock(farbeTitel: string, farbeText: string, rahmen: string, hinter: string, labelStil = '', einf?: Einfuehrung): string {
  const titel = einf?.titel?.trim() ? maskiere(einf.titel.trim()) : START_TITEL
  const text = einf?.text?.trim() ? maskiere(einf.text.trim()).replace(/\n/g, '<br>') : START_TEXT
  return (
    `<div style="border:2px solid ${rahmen};background:${hinter};border-radius:16px;padding:14px 20px">` +
    `<div style="font-size:15px;font-weight:800;letter-spacing:3px;color:${farbeTitel};${labelStil}">UNSERE GLÜCKSPILZE</div>` +
    `<div class="rc" style="font-size:38px;line-height:1.05;color:${farbeTitel};margin-top:6px">${titel}</div>` +
    `<div style="font-size:19px;line-height:1.3;color:${farbeText};margin-top:4px">${text}</div></div>`
  )
}

/** Zusatztext unter einem Gewinner in der 4er-Fassung – nur bei echten Gewinnern mit Text (Dummies bleiben unverändert). */
function zusatz4(td: Tagesdaten, e: GewinnerEintrag): string {
  return td.echt && e[3] ? `<small class="gz4" style="display:block;font-size:13px;line-height:1.2;margin-top:3px;font-style:italic;white-space:normal">${e[3]}</small>` : ''
}

/** Goldverlauf-Schrift als SVG: Unterlängen (g) bleiben vollständig sichtbar, kein Rahmen-Artefakt im PDF
 *  (CSS background-clip:text schnitt die Unterlängen ab und erzeugte im Chrome-PDF eine Haarlinie). */
export function goldTitel(text: string, groesse: number, breite: number): string {
  const h = pyRound(groesse * 1.04)
  const base = pyRound(groesse * 0.8)
  return (
    `<svg class="hl" width="${breite}" height="${h}" viewBox="0 0 ${breite} ${h}" style="display:block;overflow:visible">` +
    `<defs><linearGradient id="goldv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE7A3"/>` +
    `<stop offset=".45" stop-color="#F2C14E"/><stop offset="1" stop-color="#C8902A"/></linearGradient></defs>` +
    `<text x="0" y="${base}" fill="url(#goldv)" font-family="RC" font-weight="700" font-size="${groesse}" letter-spacing="-2">${text}</text></svg>`
  )
}

// ------------------------------------------------------------------ Grund-CSS
export function basisCss(pfad: PfadFn): string {
  return `@font-face{font-family:RC;src:url(${pfad('RobotoCondensed-Bold.ttf')}) format("truetype");font-weight:700}
*{box-sizing:border-box;margin:0;padding:0} html,body{background:#fff}
.ad{width:${W}px;position:relative;overflow:hidden;font-family:"Helvetica Neue",Arial,sans-serif;color:#1d1d1f}
.body{position:absolute;left:0;top:0;width:${W}px;height:${BODY_H}px;transform-origin:0 0}
.abs{position:absolute}
.tband{position:absolute;left:0;width:${W}px;padding:10px 46px;background:#fff}
.tnb{display:flow-root;line-height:1.17;color:#333;text-align:justify;hyphens:auto}
.tnb .sp{float:right;width:0} .tnb .lg{float:right;clear:right;margin-left:16px}
.nr{font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}
.nr i{font-style:normal;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;margin-left:6px;vertical-align:middle}
.g8{background-image:url('${pfad('gew8.jpg')}');background-repeat:no-repeat}
.bn50{background:url('${pfad('bn50r.jpg')}') center/cover} .bn100{background:url('${pfad('bn100r.jpg')}') center/cover} .bn200{background:url('${pfad('bn200r.jpg')}') center/cover}
.bn50o{background:url('${pfad('bn50o.jpg')}') center/cover} .bn100o{background:url('${pfad('bn100o.jpg')}') center/cover} .bn200o{background:url('${pfad('bn200o.jpg')}') center/cover}
.rc{font-family:RC,"Arial Narrow",sans-serif;font-weight:700}
.nm{display:block;white-space:nowrap}
.fehlt{background:#FFE45C;color:#000;padding:0 4px;font-weight:800}
`
}

type Teil = { css: string; inhalt: string; klasse: string; vorab: string }

// ------------------------------------------------------------------ Vorschlag A – Goldene Nacht
function vorschlagA(daten: SerienDaten, z: Zeitung, td: Tagesdaten, nGew: GewinnerAnzahl, monat: string, pfad: PfadFn): Teil {
  const NAVY = '#0D1B36'
  const GOLD = '#F2C14E'
  const css = `.va{background:radial-gradient(120% 90% at 85% 0%,#1F3A6E 0%,${NAVY} 55%,#08122A 100%)}
.va .kick{color:${GOLD};font-weight:800;letter-spacing:4px;font-size:20px}
.va .hl{margin-top:2px}
.va .sub{color:#fff;font-size:36px;font-weight:300;margin-top:4px} .va .sub b{color:${GOLD};font-weight:800}
.va .card{background:#fff;border-radius:18px;padding:16px 22px}
.va .lbl{font-size:15px;font-weight:800;letter-spacing:3px;color:#B07A16}
.va .frage{font-size:27px;font-weight:800;line-height:1.15;margin:6px 0 14px}
.va .ant{display:flex;align-items:center;gap:12px;background:#F3F5FA;border-radius:12px;padding:10px 14px;margin-top:8px}
.va .ant .d{width:42px;height:42px;border-radius:50%;background:${NAVY};color:${GOLD};font-weight:800;font-size:24px;display:flex;align-items:center;justify-content:center;flex:none}
.va .ant b{font-size:26px} .va .ant small{font-size:15px;color:#666;margin-left:auto;white-space:nowrap}
.va .tile{background:linear-gradient(180deg,#183161,#11264D);border:2px solid rgba(242,193,78,.75);border-radius:18px;padding:14px 18px;color:#fff;display:flex;flex-direction:column}
.va .tile .gp{font-size:14px;letter-spacing:3px;color:${GOLD};font-weight:800}
.va .tile .betrag{font-size:54px;line-height:1;text-align:right;font-variant-numeric:tabular-nums;color:${GOLD};margin:6px 0 2px} .va .tile .betrag span{font-size:30px}
.va .tile .anz{font-size:17px;color:#C9D3E8;margin-bottom:8px}
.va .tile .nr{font-size:25px;color:#fff;display:block;margin-top:5px} .va .tile .nr i{width:30px;height:30px;background:${GOLD};color:${NAVY};font-size:19px}
.va .tile .pr{font-size:9.6px;color:#A9B6D3;line-height:1.2;margin-top:8px}
.va .steps{color:#fff;font-size:19px;line-height:1.3;list-style:none} .va .steps li{display:flex;gap:12px;margin-bottom:9px}
.va .steps li b{flex:none;width:30px;height:30px;border-radius:50%;border:2px solid ${GOLD};color:${GOLD};display:flex;align-items:center;justify-content:center;font-size:17px}
.va .zf{color:#DCE3F2;font-size:15.5px;line-height:1.35;border-left:4px solid ${GOLD};padding-left:14px} .va .zf b{color:${GOLD}}
.va .gew{display:flex;gap:8px;align-items:center} .va .gq{color:#fff;font-size:15px;line-height:1.25;flex:1;min-width:0} .va .gq b{color:${GOLD};font-size:22px;display:block} .va .gq small{color:#C9D3E8;font-size:14px;display:block}`
  // Scheine enden über den Geldpaket-Kacheln
  const sch = scheine(SCHEINE_ORIGINAL.A)
  const kopf = `<div class="abs blk" data-n="Kopf" style="left:48px;top:28px"><div class="kick">${z.kicker} · ${td.tag}. SPIELTAG</div>
  ${goldTitel('Geldregen', 146, 600)}<div class="sub">Mit einem Anruf bis zu <b>10.000 €</b> gewinnen</div></div>`
  const links = `<div class="abs blk" data-n="Frage/Schritte" style="left:48px;top:268px;width:560px">
  <div class="card"><div class="lbl">GEWINNFRAGE · ${td.label.toUpperCase()}</div><div class="frage">${td.frage}</div>
   <div class="ant"><div class="d">1</div><b>${td.a1}</b><small>Endziffer 1</small></div>
   <div class="ant"><div class="d">2</div><b>${td.a2}</b><small>Endziffer 2</small></div></div>
  <div class="lbl" style="color:${GOLD};margin:24px 0 12px">SO EINFACH GEHT’S</div>
  <ol class="steps">${SCHRITTE.map((s, i) => `<li><b>${i + 1}</b><span>${s}</span></li>`).join('')}</ol>
  <div class="zf" style="margin-top:14px"><b>Das Glück hat ein Zeitfenster: </b>${ZEITFENSTER}</div></div>`
  const tiles = PAKETE.map(
    ([a, b], i) => `<div class="tile"><div class="gp">GELDPAKET ${i + 1}</div><div class="betrag rc">${b} <span>€</span></div>
  <div class="anz">${a} Gewinne à ${b} €</div>${nummer(z, i + 1, 1)}${nummer(z, i + 1, 2)}<div class="pr">${PREIS}</div></div>`,
  ).join('')
  const rechts = `<div class="abs blk" data-n="Geldpakete" style="left:650px;top:268px;width:877px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px">${tiles}</div>`
  let gew: string
  if (START_HINWEIS && td.tag === 1) {
    gew =
      `<div class="abs blk" data-n="Gewinner" style="left:650px;top:786px;width:877px">` +
      `${startBlock(GOLD, '#DCE3F2', 'rgba(242,193,78,.75)', 'rgba(17,38,77,.85)', '', td.einfuehrung)}</div>`
  } else if (nGew === 4) {
    const g = td.g4
      .map((e) => {
        const [, name, betr, , ort] = e
        return `<div class="gew">${bild(e, 70, 70, '50%', `border:3px solid ${GOLD};`)}<div class="gq"><b>${betr}</b><span class="nm">${name}</span><small class="nm">${ort}</small>${zusatz4(td, e)}</div></div>`
      })
      .join('')
    gew =
      `<div class="abs blk" data-n="Gewinner" style="left:650px;top:786px;width:877px"><div class="lbl" style="color:${GOLD};margin-bottom:8px">UNSERE GLÜCKSPILZE</div>` +
      `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${g}</div></div>`
  } else {
    const [, name, betr, zit, ort] = td.g1
    gew =
      `<div class="abs blk" data-n="Gewinner" style="left:650px;top:784px;width:877px;display:flex;gap:22px;align-items:center">${bild(td.g1, 104, 104, '50%', `border:4px solid ${GOLD};`)}` +
      `<div class="gq" style="font-size:17px"><span class="lbl" style="color:${GOLD}">${gewLabel(td)}</span><b style="font-size:34px;margin:4px 0">${betr} · ${name}, ${ort}</b>` +
      `<small style="font-size:17px;display:block;margin-top:4px;color:#fff">${zit}</small></div></div>`
  }
  return { css, inhalt: `<div class="body">${sch}${kopf}${links}${rechts}${gew}</div>${tnbBand(daten, z, monat, pfad, 48, 1527)}`, klasse: 'va', vorab: '' }
}

// ------------------------------------------------------------------ Vorschlag B – Hell & Hausfarbe
function vorschlagB(daten: SerienDaten, z: Zeitung, td: Tagesdaten, nGew: GewinnerAnzahl, monat: string, pfad: PfadFn): Teil {
  const F = z.farbe
  const T1 = mischen(F, '#FFFFFF', 0.95)
  const T2 = mischen(F, '#FFFFFF', 0.92)
  const css = `.vb{background:#fff} .vb .colbg{position:absolute;left:0;top:0;background:${F}}
.vb .col{color:#fff}
.vb .hl{font-size:98px;line-height:.88;color:#fff;letter-spacing:-1px}
.vb .sub{font-size:28px;line-height:1.15;margin-top:12px;font-weight:300} .vb .sub b{font-weight:800}
.vb .kick{font-size:17px;font-weight:800;letter-spacing:3px;color:${F}}
.vb .frage{font-size:32px;font-weight:800;line-height:1.12;margin:4px 0 12px}
.vb .ant{display:inline-flex;align-items:center;gap:12px;border:2px solid #E2E5E9;border-radius:40px;padding:8px 20px 8px 8px;margin-right:12px}
.vb .ant .d{width:40px;height:40px;border-radius:50%;background:${F};color:#fff;font-weight:800;font-size:22px;display:flex;align-items:center;justify-content:center}
.vb .ant b{font-size:25px} .vb .ant small{font-size:14px;color:#777}
.vb .card{border:1.5px solid #E2E5E9;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;background:#fff}
.vb .card .top{background:${T1};padding:10px 16px 8px;border-bottom:4px solid ${F}}
.vb .card .gp{font-size:13px;font-weight:800;letter-spacing:2.5px;color:${F}}
.vb .card .betrag{font-size:46px;line-height:1;text-align:right;font-variant-numeric:tabular-nums} .vb .card .betrag span{color:${F}}
.vb .card .anz{font-size:16px;color:#555}
.vb .card .bd{padding:8px 16px 10px;display:flex;flex-direction:column;flex:1}
.vb .card .nr{font-size:25px;display:block;margin-top:3px} .vb .card .nr i{width:30px;height:30px;background:${F};color:#fff;font-size:18px}
.vb .card .pr{font-size:9.6px;color:#777;line-height:1.2;margin-top:auto;padding-top:6px}
.vb .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.vb .steps div{font-size:16px;line-height:1.22} .vb .steps b{display:block;font-size:30px;color:${F};line-height:1}
.vb .zf{font-size:14px;line-height:1.3;color:#333;background:${T2};border-radius:12px;padding:10px 16px} .vb .zf b{color:${F}}
.vb .gname{font-size:18px;line-height:1.2;flex:1;min-width:0} .vb .gname b{font-size:24px;display:block}
.vb .tband{border-top:6px solid ${F}}`
  const sch = scheine(SCHEINE_ORIGINAL.B, false)
  let gew: string
  if (START_HINWEIS && td.tag === 1) {
    gew =
      `<div class="abs blk" data-n="Gewinner" style="left:40px;top:520px;width:450px">` +
      `${startBlock('#fff', '#fff', 'rgba(255,255,255,.65)', 'rgba(255,255,255,.10)', '', td.einfuehrung)}</div>`
  } else if (nGew === 4) {
    // 4 Gewinner untereinander: Porträt links, Betrag + Name + Ort daneben in einer Zeile (breite Namensspalte)
    const cells = td.g4
      .map((e) => {
        const [, name, betr, , ort] = e
        return (
          `<div style="display:flex;gap:16px;align-items:center">${bild(e, 74, 74, '12px', 'border:4px solid #fff;')}` +
          `<div class="gname"><b>${betr}</b><span class="nm">${name}, <span style="opacity:.85">${ort}</span></span>${zusatz4(td, e)}</div></div>`
        )
      })
      .join('')
    gew =
      `<div class="abs blk" data-n="Gewinner" style="left:40px;top:512px;width:450px"><div style="font-size:16px;font-weight:800;letter-spacing:3px;margin-bottom:10px">UNSERE GLÜCKSPILZE</div>` +
      `<div style="display:grid;grid-template-columns:1fr;gap:10px">${cells}</div></div>`
  } else {
    const [, name, betr, zit, ort] = td.g1
    gew =
      `<div class="abs blk" data-n="Gewinner" style="left:40px;top:528px;width:450px"><div style="font-size:16px;font-weight:800;letter-spacing:3px;margin-bottom:8px">${gewLabel(td)}</div>` +
      `<div style="display:flex;gap:18px;align-items:flex-end">${bild(td.g1, 200, 235, '14px', 'border:5px solid #fff;')}` +
      `<div class="gname"><b style="font-size:40px">${betr}</b>${name}, ${ort}<div style="font-size:16px;margin-top:8px;line-height:1.3">${zit}</div></div></div></div>`
  }
  const spalte = `<div class="abs col" style="left:0;top:0;width:520px;height:${BODY_H}px">
  <div class="abs blk" data-n="Titel" style="left:40px;top:38px"><div style="font-size:18px;font-weight:800;letter-spacing:4px;opacity:.85">${z.kicker}</div>
  <div class="hl rc" style="margin-top:6px">Es regnet<br>Geld.</div><div class="sub">Mit einem Anruf bis zu<br><b>10.000 € gewinnen</b></div></div>
  ${sch}${gew}</div>`
  const kopf = `<div class="abs blk" data-n="Frage" style="left:560px;top:36px;width:975px">
  <div class="kick">GEWINNFRAGE · ${td.tag}. SPIELTAG · ${td.label.toUpperCase()}</div><div class="frage">${td.frage}</div>
  <div class="ant"><div class="d">1</div><b>${td.a1}</b><small>Endziffer 1</small></div><div class="ant"><div class="d">2</div><b>${td.a2}</b><small>Endziffer 2</small></div></div>`
  const karten = PAKETE.map(
    ([a, b], i) => `<div class="card"><div class="top"><div class="gp">GELDPAKET ${i + 1}</div><div class="betrag rc">${b} <span>€</span></div><div class="anz">${a} Gewinne</div></div>
  <div class="bd">${nummer(z, i + 1, 1)}${nummer(z, i + 1, 2)}<div class="pr">${PREIS}</div></div></div>`,
  ).join('')
  const grid = `<div class="abs blk" data-n="Geldpakete" style="left:560px;top:236px;width:975px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${karten}</div>`
  const steps =
    `<div class="abs blk" data-n="Schritte" style="left:560px;top:702px;width:975px"><div class="kick" style="margin-bottom:8px">SO EINFACH GEHT’S</div><div class="steps">` +
    SCHRITTE.map((s, i) => `<div><b class="rc">${i + 1}</b>${s}</div>`).join('') +
    '</div></div>'
  const zf = `<div class="abs zf blk" data-n="Zeitfenster" style="left:560px;top:820px;width:975px"><b>Das Glück hat ein Zeitfenster: </b>${ZEITFENSTER}</div>`
  return {
    css,
    inhalt: `<div class="body">${spalte}${kopf}${grid}${steps}${zf}</div>${tnbBand(daten, z, monat, pfad, 40, 1535)}`,
    klasse: 'vb',
    vorab: '<div class="colbg"></div>',
  }
}

// ------------------------------------------------------------------ Vorschlag C – Preistafel auf Hausfarbe
function vorschlagC(daten: SerienDaten, z: Zeitung, td: Tagesdaten, nGew: GewinnerAnzahl, monat: string, pfad: PfadFn): Teil {
  const F = z.farbe
  const HELL = mischen(F, '#FFFFFF', 0.22)
  const DUNKEL = mischen(F, '#000000', 0.3)
  const TINT = mischen(F, '#FFFFFF', 0.94)
  const GOLD = '#FFE08A'
  const css = `.vc{background:linear-gradient(160deg,${HELL} 0%,${F} 50%,${DUNKEL} 100%)}
.vc .hl{font-size:132px;line-height:.86;color:#fff;letter-spacing:-1px}
.vc .sub{font-size:32px;color:#fff;margin-top:8px} .vc .sub b{background:#fff;color:${F};padding:0 10px;border-radius:6px}
.vc .box{background:#fff;border-radius:18px}
.vc .lbl{font-size:15px;font-weight:800;letter-spacing:3px;color:#fff} .vc .box .lbl{color:${F}}
.vc .frage{font-size:28px;font-weight:800;line-height:1.15;margin:6px 0 12px}
.vc .ant{display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1.5px dashed #DDD}
.vc .ant .d{width:44px;height:44px;border-radius:10px;background:${F};color:#fff;font-weight:800;font-size:26px;display:flex;align-items:center;justify-content:center}
.vc .ant b{font-size:27px} .vc .ant small{font-size:15px;color:#666;margin-left:auto}
.vc table{width:100%;border-collapse:collapse}
.vc th{font-size:14px;letter-spacing:2px;color:#fff;background:${DUNKEL};text-align:left;padding:10px 14px;font-weight:800}
.vc td{padding:13px 10px;white-space:nowrap;border-bottom:1.5px solid #EEE;vertical-align:middle}
.vc td:nth-child(2),.vc th:nth-child(2){text-align:right;padding-right:22px}
.vc tr:nth-child(odd) td{background:${TINT}}
.vc .pk{font-size:13px;font-weight:800;color:${F};letter-spacing:1px}
.vc .bt{font-size:42px;font-variant-numeric:tabular-nums;line-height:1;color:${F};white-space:nowrap} .vc .an{font-size:19px;color:#555;font-weight:700;white-space:nowrap}
.vc .nr{font-size:26px;color:#1d1d1f} .vc .nr i{width:31px;height:31px;background:${F};color:#fff;font-size:21px}
.vc .pr{font-size:9px;color:#888;line-height:1.15;width:136px;white-space:normal}
.vc .steps{font-size:19.5px;line-height:1.3;color:#fff;list-style:none} .vc .steps li{display:flex;gap:12px;margin-bottom:8px}
.vc .steps li b{flex:none;width:30px;height:30px;border-radius:8px;background:#fff;color:${F};display:flex;align-items:center;justify-content:center;font-size:17px}
.vc .zf{font-size:16px;line-height:1.35;color:#fff} .vc .zf b{color:${GOLD}}
.vc .gq{font-size:15px;line-height:1.25;color:#fff;flex:1;min-width:0} .vc .gq b{font-size:22px;color:${GOLD};display:block}`
  const sch = scheine(SCHEINE_ORIGINAL.C, false)
  const kopf = `<div class="abs blk" data-n="Kopf" style="left:44px;top:34px"><div class="lbl" style="font-size:19px">${z.kicker} · ${td.tag}. SPIELTAG</div>
  <div class="hl rc" style="margin-top:4px">GELDREGEN</div><div class="sub">Mit einem Anruf bis zu <b class="rc">10.000 €</b> gewinnen</div></div>`
  const links = `<div class="abs blk" data-n="Frage/Schritte" style="left:44px;top:255px;width:520px">
  <div class="box" style="padding:18px 22px"><div class="lbl">GEWINNFRAGE · ${td.label.toUpperCase()}</div><div class="frage">${td.frage}</div>
   <div class="ant"><div class="d">1</div><b>${td.a1}</b><small>Endziffer 1</small></div>
   <div class="ant"><div class="d">2</div><b>${td.a2}</b><small>Endziffer 2</small></div></div>
  <div class="lbl" style="margin:20px 0 10px">SO EINFACH GEHT’S</div>
  <ol class="steps">${SCHRITTE.map((s, i) => `<li><b>${i + 1}</b><span>${s}</span></li>`).join('')}</ol>
  <div class="zf" style="margin-top:6px"><b>Das Glück hat ein Zeitfenster: </b>${ZEITFENSTER}</div></div>`
  const rows = PAKETE.map(
    ([a, b], i) => `<tr><td><div class="pk">PAKET ${i + 1}</div><div class="an">${a} Gewinne</div></td><td><span class="bt rc">${b} €</span></td>
  <td>${nummer(z, i + 1, 1)}</td><td>${nummer(z, i + 1, 2)}</td><td><div class="pr">${PREIS}</div></td></tr>`,
  ).join('')
  const tafel = `<div class="abs box blk" data-n="Geldpakete" style="left:600px;top:268px;width:930px;overflow:hidden">
  <table><tr><th>PAKET</th><th>GEWINN</th><th>ANTWORT 1</th><th>ANTWORT 2</th><th></th></tr>${rows}</table></div>`
  let gew: string
  if (START_HINWEIS && td.tag === 1) {
    gew =
      `<div class="abs blk" data-n="Gewinner" style="left:600px;top:786px;width:930px">` +
      `${startBlock(GOLD, '#fff', 'rgba(255,255,255,.65)', 'rgba(0,0,0,.12)', '', td.einfuehrung)}</div>`
  } else if (nGew === 4) {
    const g = td.g4
      .map((e) => {
        const [, name, betr, , ort] = e
        return `<div style="display:flex;gap:10px;align-items:center">${bild(e, 72, 72, '50%', 'border:3px solid #fff;')}<div class="gq"><b>${betr}</b><span class="nm">${name}</span><span class="nm">${ort}</span>${zusatz4(td, e)}</div></div>`
      })
      .join('')
    gew =
      `<div class="abs blk" data-n="Gewinner" style="left:600px;top:778px;width:930px"><div class="lbl" style="margin-bottom:8px">UNSERE GLÜCKSPILZE</div>` +
      `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">${g}</div></div>`
  } else {
    const [, name, betr, zit, ort] = td.g1
    gew =
      `<div class="abs blk" data-n="Gewinner" style="left:600px;top:778px;width:930px;display:flex;gap:20px;align-items:center">${bild(td.g1, 112, 112, '50%', 'border:4px solid #fff;')}` +
      `<div class="gq" style="font-size:17px"><span class="lbl">${gewLabel(td)}</span><b style="font-size:32px;margin:2px 0">${betr} – ${name}, ${ort}</b>${zit}</div></div>`
  }
  return { css, inhalt: `<div class="body">${sch}${kopf}${links}${tafel}${gew}</div>${tnbBand(daten, z, monat, pfad, 44, 1530)}`, klasse: 'vc', vorab: '' }
}

const VORSCHLAEGE = { A: vorschlagA, B: vorschlagB, C: vorschlagC } as const

// ------------------------------------------------------------------ Seiten
export type SeitenOptionen = { inline?: boolean }

/** Eine komplette, eigenständige HTML-Seite (eine Anzeige). Das Einpass-/Prüf-Skript ist eingebettet. */
export function seite(daten: SerienDaten, z: Zeitung, td: Tagesdaten, vorschlag: Vorschlag, nGew: GewinnerAnzahl, monat: string, pfad: PfadFn, opt: SeitenOptionen = {}): string {
  const [wmm, hmm] = z.format
  const H = pyRound((W * hmm) / wmm)
  const { css, inhalt, klasse, vorab } = VORSCHLAEGE[vorschlag](daten, z, td, nGew, monat, pfad)
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Geldregen ${z.id} ${monat} ST${td.tag} ${vorschlag} ${nGew}</title>
<style>${basisCss(pfad)}${css}</style></head><body>
<div class="ad ${klasse}" id="ad" data-name="${z.id}" data-h="${H}" data-wmm="${wmm}" data-hmm="${hmm}" style="height:${H}px">${vorab}${inhalt}</div>
${opt.inline ? '<script>window.__VORSCHAU=1</script>' : ''}${FIT_JS}</body></html>`
}

/** Eine Seite mit vielen Anzeigen + Prüftabelle oben (Bildschirm-Prüfung). */
export function pruefseite(daten: SerienDaten, eintraege: Eintrag[], monat: string, pfad: PfadFn): string {
  const cssAll = [basisCss(pfad)]
  const ads: string[] = []
  eintraege.forEach(({ z, td, v, g }, k) => {
    const [wmm, hmm] = z.format
    const H = pyRound((W * hmm) / wmm)
    const { css, inhalt, klasse, vorab } = VORSCHLAEGE[v](daten, z, td, g, monat, pfad)
    cssAll.push(css.split('.' + klasse).join(`#ad${k}`))
    ads.push(
      `<div class="zelle"><div class="ad ${klasse}" id="ad${k}" data-name="${z.id} · ST${td.tag} · ${v} · ${g} Gew. · ${wmm}x${hmm}" data-h="${H}" data-wmm="${wmm}" style="height:${H}px">${vorab}${inhalt}</div></div>`,
    )
  })
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Prüfseite</title><style>${cssAll.join('')}
body{font-family:Arial,sans-serif;padding:10px;background:#ddd} #bericht{border-collapse:collapse;font-size:13px;margin-bottom:12px;background:#fff} #bericht td,#bericht th{border:1px solid #bbb;padding:3px 6px;text-align:left}
#zoom{display:grid;grid-template-columns:repeat(3,${W}px);gap:40px} .zelle .ad{box-shadow:0 0 0 3px #999}</style></head><body>
<table id="bericht"></table><div id="zoom">${ads.join('')}</div>${FIT_JS}</body></html>`
}

/** 1. Spieltag mit Start-Hinweis: keine Gewinner → nur EINE Anzeige, Dateiname „ohne-Gewinner“ (wie gr_build.py). */
export function ohneGewinner(t: { tag: number }): boolean {
  return START_HINWEIS && t.tag === 1
}

/** Gewinner-Varianten eines Spieltags: am 1. Spieltag nur eine (ohne Gewinner). */
export function gewinnerVarianten(t: { tag: number }, liste: GewinnerAnzahl[]): GewinnerAnzahl[] {
  return ohneGewinner(t) ? [1] : liste
}

export function dateiname(z: Zeitung, monat: string, t: Spieltag, vorschlag: Vorschlag, nGew: GewinnerAnzahl): string {
  const [wmm, hmm] = z.format
  const dd = t.datum.slice(8, 10) + '-' + t.datum.slice(5, 7)
  const g = ohneGewinner(t) ? 'ohne-Gewinner' : `${nGew}-Gewinner`
  return `Geldregen_${monat}_ST${pad2(t.tag)}_${dd}_${z.id}_${vorschlag}_${g}_${wmm}x${hmm}`
}

/** Alle Einträge (Zeitung × Spieltag × Vorschlag × Gewinner) in der Reihenfolge des Python-Werkzeugs. */
export function eintraegeBilden(
  zeitungen: Zeitung[],
  tage: Spieltag[],
  vorschlaege: Vorschlag[],
  gewinner: GewinnerAnzahl[],
): Eintrag[] {
  const out: Eintrag[] = []
  for (const v of vorschlaege) for (const z of zeitungen) for (const t of tage) for (const g of gewinnerVarianten(t, gewinner)) out.push({ z, td: tagesdaten(z, t), v, g })
  return out
}
