// KI-Gestaltungsvarianten auf Basis der festen Vorschläge A/B/C.
//
// Eine Variante ändert nur Farben, Titel und Unterzeile – Raster, Kacheln, Rufnummern, Teilnahmebedingungen
// und Gewinnerblock bleiben wie im geprüften Vorschlag. Ohne Variante entsteht die Anzeige unverändert
// (Geldregen bleibt bytegleich, Regel 5).
//
// Anwendung:
//  • Vorschlag A (dunkel/gold): die festen Farbwerte werden auf Grund- und Akzentfarbe umgerechnet.
//  • Vorschlag B/C: diese nutzen die Hausfarbe der Zeitung – die Variante kann sie durch eine Kampagnenfarbe ersetzen.
//  • Titel/Unterzeile: der erste Titel (`.hl`) und die erste Unterzeile (`.sub`) der Anzeige werden ersetzt.

import { mischen } from './generator'
import { htmlMaskieren } from './serie-ki'
import type { Vorschlag, Zeitung } from './types'

export type Variante = {
  id: string
  name: string
  basis: Vorschlag
  /** Titel; „|“ = Zeilenumbruch. Leer = Titel des Vorschlags */
  titel?: string
  /** Unterzeile; **fett** möglich. Leer = Unterzeile des Vorschlags */
  unterzeile?: string
  /** Grundfarbe (dunkel genug für weiße Schrift) */
  grund: string
  /** Akzentfarbe (Beträge, Ziffern, Linien) */
  akzent: string
  /** B/C: true = Grundfarbe statt Hausfarbe der Zeitung */
  eigeneFarbe?: boolean
  /** kurze Idee/Begründung der KI */
  idee?: string
}

const HEX = /^#[0-9a-fA-F]{6}$/

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

/** relative Leuchtdichte (WCAG) */
function lum(hex: string): number {
  const c = rgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export function kontrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** Farben lesbar machen: weiße Schrift auf Grund ≥ 4,5 : 1, Akzent auf Grund ≥ 3 : 1. */
export function farbenAbsichern(v: Variante): Variante {
  let grund = HEX.test(v.grund) ? v.grund.toUpperCase() : '#0D1B36'
  let akzent = HEX.test(v.akzent) ? v.akzent.toUpperCase() : '#F2C14E'
  for (let i = 0; i < 12 && kontrast(grund, '#FFFFFF') < 4.5; i++) grund = mischen(grund, '#000000', 0.15).toUpperCase()
  for (let i = 0; i < 12 && kontrast(akzent, grund) < 3; i++) akzent = mischen(akzent, '#FFFFFF', 0.2).toUpperCase()
  return { ...v, grund, akzent }
}

/** Zeitung für B/C mit Kampagnenfarbe statt Hausfarbe. */
export function zeitungFuerVariante(z: Zeitung, v: Variante | null | undefined, vorschlag: Vorschlag): Zeitung {
  if (!v || v.basis !== vorschlag || vorschlag === 'A' || !v.eigeneFarbe) return z
  return { ...z, farbe: v.grund }
}

function alle(s: string, such: string, ersatz: string): string {
  return s.split(such).join(ersatz).split(such.toLowerCase()).join(ersatz)
}

function rgba(hex: string): string {
  return `rgba(${rgb(hex).join(',')},`
}

function textHtml(t: string): string {
  return htmlMaskieren(t.trim())
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\s*\|\s*/g, '<br>')
}

const zeilenLaenge = (s: string) => Math.max(...s.replace(/<[^>]+>/g, '|').split('|').map((x) => x.trim().length), 1)

/** Variante auf fertiges Anzeigen-HTML anwenden (nur wenn v.basis === vorschlag). */
export function varianteAnwenden(html: string, v: Variante | null | undefined, vorschlag: Vorschlag): string {
  if (!v || v.basis !== vorschlag) return html
  let h = html
  const g = v.grund
  const a = v.akzent

  if (vorschlag === 'A') {
    // feste Farben von Vorschlag A (Geldregen + Spiele-Familie A)
    const tabelle: Array<[string, string]> = [
      ['#0D1B36', g],
      ['#1F3A6E', mischen(g, '#FFFFFF', 0.16)],
      ['#08122A', mischen(g, '#000000', 0.38)],
      ['#183161', mischen(g, '#FFFFFF', 0.12)],
      ['#11264D', mischen(g, '#FFFFFF', 0.06)],
      ['#F2C14E', a],
      ['#FFE7A3', mischen(a, '#FFFFFF', 0.45)],
      ['#C8902A', mischen(a, '#000000', 0.22)],
      ['#B07A16', mischen(a, '#000000', 0.35)],
      ['#C9D3E8', mischen(g, '#FFFFFF', 0.78)],
      ['#A9B6D3', mischen(g, '#FFFFFF', 0.66)],
      ['#DCE3F2', mischen(g, '#FFFFFF', 0.86)],
    ]
    for (const [alt, neu] of tabelle) h = alle(h, alt, neu)
    h = h.split('rgba(242,193,78,').join(rgba(a)).split('rgba(17,38,77,').join(rgba(mischen(g, '#FFFFFF', 0.06)))
  } else {
    // B/C: Gold-Ton für Gewinnernamen/Hinweise auf dunklem Grund
    h = alle(h, '#FFE08A', a)
  }

  if (v.titel?.trim()) {
    const neuMehr = textHtml(v.titel)
    const neuEin = textHtml(v.titel.replace(/\s*\|\s*/g, ' '))
    const svg = /(<svg class="hl"[^>]*width=")(\d+)("[^>]*>[\s\S]*?<text [^>]*?font-size=")(\d+)("[^>]*>)([^<]*)(<\/text>)/
    const m = h.match(svg)
    if (m) {
      // Vorschlag A Geldregen: Goldtitel als SVG – bei längerem Titel kleiner setzen (eine Zeile)
      const plain = v.titel.replace(/\|/g, ' ').trim()
      const faktor = Math.min(1, (m[6].length / Math.max(plain.length, 1)) * 1.08)
      const groesse = Math.max(70, Math.round(Number(m[4]) * faktor))
      h = h.replace(svg, (_x, p1, w, p3, _fs, p5, _t, p7) => `${p1}${w}${p3}${groesse}${p5}${htmlMaskieren(plain)}${p7}`)
    } else {
      h = h.replace(/(<div class="hl rc"[^>]*>)([\s\S]*?)(<\/div>)/, (_x, auf, alt: string, zu) => {
        // Zeilenumbruch nur, wenn der Originaltitel auch mehrzeilig ist (z. B. „Es regnet|Geld.“)
        const neu = /<br\s*\/?>/i.test(alt) ? neuMehr : neuEin
        const roh = zeilenLaenge(alt) / zeilenLaenge(neu)
        const faktor = roh < 1 ? roh * 0.92 : 1
        const inhalt = `<span style="white-space:nowrap${faktor < 1 ? `;font-size:${Math.max(50, Math.round(faktor * 100))}%` : ''}">${neu}</span>`
        return `${auf}${inhalt}${zu}`
      })
    }
  }
  if (v.unterzeile?.trim()) {
    h = h.replace(/(<div class="sub"[^>]*>)([\s\S]*?)(<\/div>)/, (_x, auf, _alt, zu) => `${auf}${textHtml(v.unterzeile!)}${zu}`)
  }
  return h
}
