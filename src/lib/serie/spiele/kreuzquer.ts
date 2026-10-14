// Kreuz & Quer (April 2027 mit Geldregen-Mechanik · Oktober 2027 AZS oder RSP) und Gitterrätsel (September 2027).
// Gemeinsamer Gitter-Renderer – reines HTML/CSS plus Inline-SVG-Pfeile (Vektor, keine Bilder):
//   · Kreuz & Quer: Schwedenrätsel – Fragefelder mit kleinem Fragetext und Pfeil zum Wortanfang.
//   · Gitterrätsel: leeres Gitter + Wortliste nach Länge; ein Wort ist als Starthilfe eingetragen.
// Lösungsfelder: Kreis (Schwedenrätsel) bzw. Farbfläche (Gitter) in Akzentfarbe + kleine Nummer.
// Zellgröße wird aus ctx.box berechnet (A/C breit ≈ 836 × 498, B schmal ≈ 516 × 558) – nichts ragt über die Box.
// Alle größen- und farbabhängigen Werte stehen inline: die Prüfseite legt das CSS vieler Anzeigen zusammen,
// Klassen-CSS ist deshalb konstant.
// Muster-Rätsel per Skript erzeugt und geprüft (alle Wortläufe in beiden Richtungen sind Wörter mit Frage bzw.
// in der Wortliste, Lösungswort = markierte Felder, Gitterrätsel mit Vorgabe eindeutig lösbar).

import { mischen, ZEITFENSTER } from '../generator'
import { spieltage } from './kalender'
import type { Inhalt, RaetselKontext, SpielDef, Teil } from './typen'

// ------------------------------------------------------------------ Datentypen

/** Pfeil eines Fragefelds: r = Wort beginnt rechts daneben (waagerecht), d = darunter (senkrecht),
 *  rd = beginnt rechts daneben und läuft senkrecht, dr = beginnt darunter und läuft waagerecht. */
export type Pfeil = 'r' | 'd' | 'rd' | 'dr'

/** Frage im Schwedenrätsel; Zeilenumbrüche im Fragetext mit „|“ (max. 9 Zeichen je Zeile, bei zwei Fragen in einem Feld max. 2 Zeilen). */
export type SchwedenFrage = { r: number; c: number; pfeil: Pfeil; text: string; wort: string }

/** Schwedenrätsel: zeilen = Gitter ('#' = Fragefeld, Buchstabe = Lösung, wird nicht gedruckt); loesungsfelder in Reihenfolge 1…n */
export type SchwedenDaten = { art: 'schweden'; zeilen: string[]; fragen: SchwedenFrage[]; loesungsfelder: [number, number][] }

/** Gitterrätsel: zeilen = Gitter ('.' = kein Feld, Buchstabe = Lösung); vorgabe = eingetragenes Startwort */
export type GitterDaten = {
  art: 'gitter'
  zeilen: string[]
  vorgabe: { r: number; c: number; richtung: 'a' | 'd'; wort: string }
  loesungsfelder: [number, number][]
}

type Lauf = { richtung: 'a' | 'd'; r: number; c: number; wort: string }

/** Alle waagerechten (a) und senkrechten (d) Buchstabenläufe ab 2 Zeichen */
export function wortlaeufe(zeilen: string[], istBuchstabe: (ch: string) => boolean): Lauf[] {
  const R = zeilen.length
  const C = zeilen[0]?.length ?? 0
  const at = (r: number, c: number) => (r >= 0 && r < R && c >= 0 && c < C ? zeilen[r][c] : '')
  const out: Lauf[] = []
  for (const richtung of ['a', 'd'] as const) {
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const ch = at(r, c)
        if (!ch || !istBuchstabe(ch)) continue
        const vor = richtung === 'a' ? at(r, c - 1) : at(r - 1, c)
        if (vor && istBuchstabe(vor)) continue // kein Laufanfang
        let wort = ''
        for (let k = 0; ; k++) {
          const x = richtung === 'a' ? at(r, c + k) : at(r + k, c)
          if (!x || !istBuchstabe(x)) break
          wort += x
        }
        if (wort.length >= 2) out.push({ richtung, r, c, wort })
      }
    }
  }
  return out
}

const istSchwedenBuchstabe = (ch: string) => ch !== '#'
const istGitterBuchstabe = (ch: string) => ch !== '.'

/** Lösungswort aus den markierten Feldern */
export function loesungAusFeldern(zeilen: string[], felder: [number, number][]): string {
  return felder.map(([r, c]) => zeilen[r]?.[c] ?? '?').join('')
}

/** Strukturprüfung Schwedenrätsel (für Muster und importierte Rätsel): leere Liste = in Ordnung */
export function schwedenPruefen(d: SchwedenDaten, loesung?: string): string[] {
  const f: string[] = []
  const C = d.zeilen[0]?.length ?? 0
  if (d.zeilen.some((z) => z.length !== C)) f.push('Zeilen unterschiedlich lang')
  const laeufe = wortlaeufe(d.zeilen, istSchwedenBuchstabe)
  const start = (q: SchwedenFrage): Lauf | undefined => {
    const r = q.pfeil === 'd' || q.pfeil === 'dr' ? q.r + 1 : q.r
    const c = q.pfeil === 'r' || q.pfeil === 'rd' ? q.c + 1 : q.c
    const richtung = q.pfeil === 'r' || q.pfeil === 'dr' ? 'a' : 'd'
    return laeufe.find((l) => l.r === r && l.c === c && l.richtung === richtung)
  }
  const belegt = new Set<Lauf>()
  const seiten = new Set<string>()
  for (const q of d.fragen) {
    if (d.zeilen[q.r]?.[q.c] !== '#') f.push(`Frage „${q.wort}“ steht nicht in einem Fragefeld`)
    const l = start(q)
    if (!l) f.push(`Frage „${q.wort}“: kein Wort am Pfeil`)
    else if (l.wort !== q.wort) f.push(`Frage „${q.wort}“: im Gitter steht ${l.wort}`)
    else belegt.add(l)
    const seite = `${q.r},${q.c},${q.pfeil === 'r' || q.pfeil === 'rd' ? 'R' : 'U'}`
    if (seiten.has(seite)) f.push(`Fragefeld ${q.r},${q.c}: zwei Pfeile auf derselben Seite`)
    seiten.add(seite)
    const zeilen = q.text.split('|')
    if (zeilen.some((z) => z.length > 10)) f.push(`Frage „${q.wort}“: Zeile länger als 10 Zeichen`)
  }
  for (const l of laeufe) if (!belegt.has(l)) f.push(`Wort ${l.wort} (${l.r},${l.c},${l.richtung}) hat keine Frage`)
  for (let r = 0; r < d.zeilen.length; r++)
    for (let c = 0; c < C; c++) {
      if (d.zeilen[r][c] !== '#') continue
      const n = d.fragen.filter((q) => q.r === r && q.c === c)
      if (!n.length) f.push(`Fragefeld ${r},${c} ohne Frage`)
      if (n.length === 2 && n.some((q) => q.text.split('|').length > 2)) f.push(`Fragefeld ${r},${c}: geteilte Frage mit mehr als 2 Zeilen`)
      if (n.length > 2) f.push(`Fragefeld ${r},${c}: mehr als zwei Fragen`)
    }
  for (const [r, c] of d.loesungsfelder) if (!istSchwedenBuchstabe(d.zeilen[r]?.[c] ?? '#')) f.push(`Lösungsfeld ${r},${c} ist kein Buchstabenfeld`)
  if (loesung && loesungAusFeldern(d.zeilen, d.loesungsfelder) !== loesung) f.push(`Lösungsfelder ergeben ${loesungAusFeldern(d.zeilen, d.loesungsfelder)} statt ${loesung}`)
  return f
}

/** Strukturprüfung Gitterrätsel inkl. Eindeutigkeit (Wörter nach Länge einsetzen, Vorgabe eingetragen) */
export function gitterPruefen(d: GitterDaten, loesung?: string): string[] {
  const f: string[] = []
  const laeufe = wortlaeufe(d.zeilen, istGitterBuchstabe)
  const woerter = laeufe.map((l) => l.wort)
  if (new Set(woerter).size !== woerter.length) f.push('Wort kommt doppelt vor')
  const v = laeufe.find((l) => l.r === d.vorgabe.r && l.c === d.vorgabe.c && l.richtung === d.vorgabe.richtung)
  if (!v || v.wort !== d.vorgabe.wort) f.push('Vorgabe passt nicht zum Gitter')
  if (loesung && loesungAusFeldern(d.zeilen, d.loesungsfelder) !== loesung) f.push(`Lösungsfelder ergeben ${loesungAusFeldern(d.zeilen, d.loesungsfelder)} statt ${loesung}`)
  if (!f.length && v) {
    const n = loesungenZaehlen(d.zeilen, laeufe, v, 2)
    if (n !== 1) f.push(n === 0 ? 'Gitter nicht lösbar' : 'Gitter nicht eindeutig lösbar')
  }
  return f
}

/** Zählt Lösungen (bis max), wenn alle Wörter außer der Vorgabe nach Länge eingesetzt werden müssen */
function loesungenZaehlen(zeilen: string[], laeufe: Lauf[], vorgabe: Lauf, max: number): number {
  const g: string[][] = zeilen.map((z) => z.split('').map((ch) => (ch === '.' ? '.' : '?')))
  const zellen = (l: Lauf) => Array.from(l.wort, (_, k) => (l.richtung === 'a' ? [l.r, l.c + k] : [l.r + k, l.c]) as [number, number])
  zellen(vorgabe).forEach(([r, c], k) => (g[r][c] = vorgabe.wort[k]))
  let anzahl = 0
  const suche = (offen: Lauf[], rest: string[]) => {
    if (anzahl >= max) return
    if (!offen.length) {
      anzahl++
      return
    }
    let best: { l: Lauf; k: string[] } | null = null
    for (const l of offen) {
      const muster = zellen(l).map(([r, c]) => g[r][c])
      const k = [...new Set(rest.filter((w) => w.length === muster.length && muster.every((m, i) => m === '?' || m === w[i])))]
      if (!best || k.length < best.k.length) best = { l, k }
    }
    if (!best) return
    for (const w of best.k) {
      const alt = zellen(best.l).map(([r, c]) => g[r][c])
      zellen(best.l).forEach(([r, c], i) => (g[r][c] = w[i]))
      const r2 = [...rest]
      r2.splice(r2.indexOf(w), 1)
      suche(offen.filter((x) => x !== best!.l), r2)
      zellen(best.l).forEach(([r, c], i) => (g[r][c] = alt[i]))
    }
  }
  const rest = laeufe.map((l) => l.wort)
  rest.splice(rest.indexOf(vorgabe.wort), 1)
  suche(laeufe.filter((l) => l !== vorgabe), rest)
  return anzahl
}

// ------------------------------------------------------------------ Hilfen für die Darstellung

/** Geschätzte Textbreite in px (Roboto Condensed Bold, eher großzügig) */
function textBreite(s: string, fs: number): number {
  let e = 0
  for (const ch of s) e += /[iljtfrI.,:;!'()|\-\s]/.test(ch) ? 0.3 : /[mwMW]/.test(ch) ? 0.82 : /[A-ZÄÖÜ]/.test(ch) ? 0.62 : 0.52
  return e * fs
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Akzent für Linien/Ziffern auf Weiß: helle Akzente (z. B. Gold) abdunkeln */
function akzentDunkel(a: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(a)) return '#333333'
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? mischen(a, '#000000', 0.45) : a
}
function akzentHell(a: string, t: number): string {
  return /^#[0-9a-f]{6}$/i.test(a) ? mischen(a, '#FFFFFF', t) : '#EEF1F5'
}

const LINIE = '#3A3A3C'
const MIN_FRAGE_PX = 11

/** Schriftgröße für einen Fragetext (Zeilen) in einem Feld w × h */
function frageSchrift(zeilen: string[], w: number, h: number): number {
  const breit = Math.max(...zeilen.map((z) => textBreite(z, 1)))
  const fs = Math.min(15, (w - 4) / breit, (h - 2) / (zeilen.length * 1.08))
  return Math.floor(fs * 10) / 10
}

/** Platzhalter, wenn (noch) keine Rätseldaten vorliegen */
function leer(box: { w: number; h: number }, text: string): Teil {
  return {
    css: '.kq-leer{background:#FFE45C;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px}',
    html: `<div class="kq-leer" style="width:${box.w}px;height:${box.h}px">${text}</div>`,
  }
}

const CSS_GITTER = `.kq{position:relative;overflow:hidden;color:#1d1d1f}
.kq-g{position:absolute}
.kq-z{position:absolute;box-sizing:border-box;overflow:hidden}
.kq-q{display:flex;align-items:center;justify-content:center;text-align:center;font-family:RC,"Arial Narrow",sans-serif;font-weight:700;line-height:1.05;color:#1d1d1f;overflow:hidden;width:100%}
.kq-kr{position:absolute;border-radius:50%;box-sizing:border-box}
.kq-nr{position:absolute;font-family:RC,"Arial Narrow",sans-serif;font-weight:700;line-height:1}
.kq-v{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:RC,"Arial Narrow",sans-serif;font-weight:700}
.kq-pf{position:absolute;left:0;top:0;overflow:visible}
.kq-lt{position:absolute;font-size:13px;font-weight:800;letter-spacing:2.5px;white-space:nowrap}
.kq-lk{position:absolute;box-sizing:border-box;border-radius:6px;background:#fff}
.kq-wl{position:absolute;box-sizing:border-box;border-radius:12px;font-family:RC,"Arial Narrow",sans-serif;font-weight:700;color:#1d1d1f;overflow:hidden}
.kq-wz{display:flex;gap:8px} .kq-wz b{flex:none;white-space:nowrap} .kq-wz span{flex:1;min-width:0}
.kq-wz s{text-decoration-thickness:2px;opacity:.55}`

// ------------------------------------------------------------------ Schwedenrätsel

/** Rätselfeld Kreuz & Quer. leiste = nummerierte Lösungswort-Kästchen zeigen (bei zwei Antworten zur Wahl). */
export function schwedenFeld(ctx: RaetselKontext, d: SchwedenDaten, leiste: boolean): Teil {
  const { box, akzent } = ctx
  const R = d.zeilen.length
  const C = d.zeilen[0].length
  const n = d.loesungsfelder.length
  const dunkel = akzentDunkel(akzent)
  const L = 2 // Linienstärke
  const LK = 40 // Kästchen der Lösungsleiste
  const LABEL_W = 150
  const passt = (w: number, h: number) => Math.floor(Math.min((w - L) / C, (h - L) / R))

  // Layout: ohne Leiste · Leiste unten (eine Zeile) · Leiste rechts (3 Kästchen je Zeile)
  let lage: 'ohne' | 'unten' | 'rechts' = 'ohne'
  let s = passt(box.w, box.h)
  const rechtsB = 3 * (LK + 6) + 4
  const rechtsH = 24 + Math.ceil(n / 3) * (LK + 6)
  if (leiste) {
    const unten = LABEL_W + n * (LK + 6) <= box.w ? passt(box.w, box.h - LK - 14) : 0
    const rechts = rechtsH <= box.h ? passt(box.w - rechtsB - 20, box.h) : 0
    lage = rechts > unten ? 'rechts' : 'unten'
    s = Math.max(rechts, unten)
  }
  const gw = C * s + L
  const gh = R * s + L
  const gesamtW = lage === 'rechts' ? gw + 20 + rechtsB : gw
  const gesamtH = lage === 'unten' ? gh + 14 + LK : Math.max(gh, lage === 'rechts' ? rechtsH : 0)
  const x0 = Math.max(0, Math.floor((box.w - gesamtW) / 2))
  const y0 = Math.max(0, Math.floor((box.h - gesamtH) / 2))

  const fragen = (r: number, c: number) =>
    d.fragen.filter((q) => q.r === r && q.c === c).sort((a, b) => Number(a.pfeil === 'd' || a.pfeil === 'dr') - Number(b.pfeil === 'd' || b.pfeil === 'dr'))
  const lnr = new Map(d.loesungsfelder.map(([r, c], i) => [`${r},${c}`, i + 1]))
  const tint = akzentHell(akzent, 0.82)
  const zellen: string[] = []
  const pfeile: string[] = []
  const innen = s - L
  const a = Math.max(6, Math.round(s * 0.13)) // Pfeilgröße
  const sw = Math.max(1.6, s * 0.03)
  // einheitliche Schriftgröße für alle Fragetexte (wie im gedruckten Schwedenrätsel)
  let fs = 15
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      if (d.zeilen[r][c] !== '#') continue
      const qs = fragen(r, c)
      const teilH = qs.length === 2 ? (innen - 1) / 2 : innen
      for (const q of qs) fs = Math.min(fs, frageSchrift(q.text.split('|'), innen, teilH))
    }
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const x = c * s + L
      const y = r * s + L
      const pos = `left:${x}px;top:${y}px;width:${innen}px;height:${innen}px`
      if (d.zeilen[r][c] !== '#') {
        const nr = lnr.get(`${r},${c}`)
        let inhalt = ''
        if (nr) {
          const k = Math.round(innen * 0.7)
          const o = Math.round((innen - k) / 2)
          const fs = Math.max(MIN_FRAGE_PX, Math.round(s * 0.2))
          inhalt =
            `<div class="kq-kr" style="left:${o}px;top:${o}px;width:${k}px;height:${k}px;border:${Math.max(2, Math.round(s * 0.035))}px solid ${dunkel}"></div>` +
            `<div class="kq-nr" style="right:2px;bottom:2px;font-size:${fs}px;color:${dunkel}">${nr}</div>`
        }
        zellen.push(`<div class="kq-z" style="${pos};background:#fff">${inhalt}</div>`)
        continue
      }
      // Fragefeld: eine Frage oder zwei (oben → Pfeil rechts, unten → Pfeil nach unten)
      const qs = fragen(r, c)
      const teilH = qs.length === 2 ? (innen - 1) / 2 : innen
      const html = qs
        .map((q, i) => `<div class="kq-q card" style="height:${teilH}px;font-size:${fs}px${i ? `;border-top:1px solid ${mischen(tint, '#000000', 0.25)}` : ''}">${q.text.split('|').map(esc).join('<br>')}</div>`)
        .join('')
      zellen.push(`<div class="kq-z" style="${pos};background:${tint}">${html}</div>`)
      // Pfeile (im Startfeld am Rand zum Fragefeld)
      qs.forEach((q, i) => {
        if (q.pfeil === 'r' || q.pfeil === 'rd') {
          const X = (c + 1) * s + L
          const yc = r * s + L + (qs.length === 2 ? (i === 0 ? teilH / 2 : teilH * 1.5) : innen / 2)
          if (q.pfeil === 'r') pfeile.push(`<path d="M${X} ${yc - a * 0.6}L${X + a} ${yc}L${X} ${yc + a * 0.6}Z"/>`)
          else {
            const xe = X + a * 0.9
            pfeile.push(`<path d="M${X} ${yc}H${xe}V${yc + a * 0.6}" fill="none" stroke="#1d1d1f" stroke-width="${sw}"/>`)
            pfeile.push(`<path d="M${xe - a * 0.5} ${yc + a * 0.55}L${xe + a * 0.5} ${yc + a * 0.55}L${xe} ${yc + a * 1.35}Z"/>`)
          }
        } else {
          const Y = (r + 1) * s + L
          const xc = c * s + L + innen / 2
          if (q.pfeil === 'd') pfeile.push(`<path d="M${xc - a * 0.6} ${Y}L${xc + a * 0.6} ${Y}L${xc} ${Y + a}Z"/>`)
          else {
            const x1 = c * s + L + innen * 0.3
            const ye = Y + a * 0.9
            pfeile.push(`<path d="M${x1} ${Y}V${ye}H${x1 + a * 0.6}" fill="none" stroke="#1d1d1f" stroke-width="${sw}"/>`)
            pfeile.push(`<path d="M${x1 + a * 0.55} ${ye - a * 0.5}L${x1 + a * 0.55} ${ye + a * 0.5}L${x1 + a * 1.35} ${ye}Z"/>`)
          }
        }
      })
    }
  }
  const svg = `<svg class="kq-pf" width="${gw}" height="${gh}" viewBox="0 0 ${gw} ${gh}" fill="#1d1d1f">${pfeile.join('')}</svg>`
  let leisteHtml = ''
  if (lage !== 'ohne') {
    const kaestchen = (i: number, x: number, y: number) =>
      `<div class="kq-lk" style="left:${x}px;top:${y}px;width:${LK}px;height:${LK}px;border:2.5px solid ${dunkel};background:${akzentHell(akzent, 0.88)}">` +
      `<div class="kq-nr" style="left:3px;top:2px;font-size:${MIN_FRAGE_PX + 1}px;color:${dunkel}">${i + 1}</div></div>`
    if (lage === 'unten') {
      const ly = y0 + gh + 14
      const bx = x0 + Math.max(LABEL_W, gw - n * (LK + 6) + 6)
      leisteHtml =
        `<div class="kq-lt" style="left:${bx - LABEL_W}px;top:${ly + LK / 2 - 8}px;width:${LABEL_W - 10}px;text-align:right;color:${dunkel}">LÖSUNGSWORT</div>` +
        d.loesungsfelder.map((_, i) => kaestchen(i, bx + i * (LK + 6), ly)).join('')
    } else {
      const lx = x0 + gw + 20
      const ly = y0 + Math.max(0, Math.floor((gh - rechtsH) / 2))
      leisteHtml =
        `<div class="kq-lt" style="left:${lx}px;top:${ly}px;color:${dunkel}">LÖSUNGSWORT</div>` +
        d.loesungsfelder.map((_, i) => kaestchen(i, lx + (i % 3) * (LK + 6), ly + 24 + Math.floor(i / 3) * (LK + 6))).join('')
    }
  }
  return {
    css: CSS_GITTER,
    html:
      `<div class="kq card" style="width:${box.w}px;height:${box.h}px">` +
      `<div class="kq-g" style="left:${x0}px;top:${y0}px;width:${gw}px;height:${gh}px;background:${LINIE}">${zellen.join('')}${svg}</div>` +
      `${leisteHtml}</div>`,
  }
}

// ------------------------------------------------------------------ Gitterrätsel

type ListenLayout = { s: number; fs: number; lage: 'rechts' | 'unten'; lw: number; lh: number }

/** Wortliste nach Länge gruppiert: [Länge, Wörter alphabetisch] */
function gruppen(woerter: string[]): [number, string[]][] {
  const m = new Map<number, string[]>()
  for (const w of woerter) m.set(w.length, [...(m.get(w.length) ?? []), w])
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([n, ws]) => [n, ws.sort((x, y) => x.localeCompare(y, 'de'))])
}

const LISTE_PAD = 10

/** Geschätzte Höhe der Wortliste bei Breite w und Schrift fs */
function listenHoehe(gr: [number, string[]][], w: number, fs: number): number {
  const labelW = textBreite('8 Buchstaben', fs) + 4
  const platz = w - 2 * LISTE_PAD - labelW - 8
  if (platz < fs * 4) return Infinity
  let zeilen = 0
  for (const [, ws] of gr) {
    let x = 0
    let z = 1
    for (const wort of ws) {
      const b = textBreite(wort + ', ', fs)
      if (x > 0 && x + b > platz) {
        z++
        x = 0
      }
      x += b
    }
    zeilen += z
  }
  // Sicherheitszuschlag 15 %: die Breitenschätzung liegt bei Ersatzschriften (Druck-Chrome) etwas zu knapp
  return Math.ceil((zeilen * fs * 1.3 + (gr.length - 1) * 3 + 2 * LISTE_PAD) * 1.35)
}

export function gitterFeld(ctx: RaetselKontext, d: GitterDaten): Teil {
  const { box, akzent } = ctx
  const R = d.zeilen.length
  const C = d.zeilen[0].length
  const B = 2 // Rahmenstärke
  const laeufe = wortlaeufe(d.zeilen, istGitterBuchstabe)
  const gr = gruppen(laeufe.map((l) => l.wort))
  const dunkel = akzentDunkel(akzent)

  // bestes Layout suchen: Liste rechts neben dem Gitter oder darunter
  let best: ListenLayout | null = null
  const bewerten = (k: ListenLayout) => {
    if (k.s < 24 || !isFinite(k.lh)) return
    if (!best || k.s + 1.5 * k.fs > best.s + 1.5 * best.fs) best = k
  }
  for (let fs = 17; fs >= 13; fs--) {
    for (const lw of [230, 260, 290, 320, 350]) {
      const lh = listenHoehe(gr, lw, fs)
      if (lh > box.h) continue
      bewerten({ s: Math.floor(Math.min((box.w - lw - 26 - B) / C, (box.h - B - 6) / R)), fs, lage: 'rechts', lw, lh })
    }
    const lh = listenHoehe(gr, box.w, fs)
    bewerten({ s: Math.floor(Math.min((box.w - B - 6) / C, (box.h - lh - 24 - B) / R)), fs, lage: 'unten', lw: box.w - 6, lh })
  }
  if (!best) return leer(box, 'Gitter passt nicht')
  const { s, fs, lage, lw, lh } = best as ListenLayout
  const gw = C * s + B
  const gh = R * s + B
  let gx: number, gy: number, lx: number, ly: number
  if (lage === 'rechts') {
    const gesamtW = gw + 20 + lw
    gx = Math.max(0, Math.floor((box.w - gesamtW) / 2))
    lx = gx + gw + 20
    gy = Math.max(0, Math.floor((box.h - gh) / 2))
    ly = Math.max(0, Math.floor((box.h - lh) / 2))
  } else {
    const gesamtH = gh + 14 + lh
    gx = Math.max(0, Math.floor((box.w - gw) / 2))
    gy = Math.max(0, Math.floor((box.h - gesamtH) / 2))
    lx = 0
    ly = gy + gh + 14
  }

  const vorg = new Map<string, string>()
  Array.from(d.vorgabe.wort).forEach((ch, k) => vorg.set(d.vorgabe.richtung === 'a' ? `${d.vorgabe.r},${d.vorgabe.c + k}` : `${d.vorgabe.r + k},${d.vorgabe.c}`, ch))
  const lnr = new Map(d.loesungsfelder.map(([r, c], i) => [`${r},${c}`, i + 1]))
  const tint = akzentHell(akzent, 0.7)
  const zellen: string[] = []
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (!istGitterBuchstabe(d.zeilen[r][c])) continue
      const nr = lnr.get(`${r},${c}`)
      const v = vorg.get(`${r},${c}`)
      let inhalt = ''
      if (v) inhalt += `<div class="kq-v" style="font-size:${Math.round(s * 0.58)}px">${esc(v)}</div>`
      if (nr) inhalt += `<div class="kq-nr" style="right:3px;bottom:2px;font-size:${Math.max(MIN_FRAGE_PX, Math.round(s * 0.26))}px;color:${dunkel}">${nr}</div>`
      zellen.push(
        `<div class="kq-z" style="left:${c * s}px;top:${r * s}px;width:${s + B}px;height:${s + B}px;border:${B}px solid ${LINIE};background:${nr ? tint : '#fff'}">${inhalt}</div>`,
      )
    }
  }
  const labelW = Math.ceil(textBreite('8 Buchstaben', fs) + 4)
  const liste = gr
    .map(
      ([n, ws]) =>
        `<div class="kq-wz"${n === gr[0][0] ? '' : ' style="margin-top:3px"'}><b style="width:${labelW}px;color:${dunkel}">${n} Buchstaben</b>` +
        `<span>${ws.map((w) => (w === d.vorgabe.wort ? `<s>${esc(w)}</s>` : esc(w))).join(', ')}</span></div>`,
    )
    .join('')
  return {
    css: CSS_GITTER,
    html:
      `<div class="kq card" style="width:${box.w}px;height:${box.h}px">` +
      `<div class="kq-g" style="left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px">${zellen.join('')}</div>` +
      `<div class="kq-wl card" style="left:${lx}px;top:${ly}px;width:${lw}px;height:${lh}px;padding:${LISTE_PAD}px;font-size:${fs}px;line-height:1.3;background:${akzentHell(akzent, 0.9)}">${liste}</div></div>`,
  }
}

// ------------------------------------------------------------------ Muster-Rätsel

type SchwedenMuster = { loesung: string; falsch: string; d: SchwedenDaten }
type GitterMuster = { loesung: string; d: GitterDaten }

// April: Lösungswort + gleich lange Falschlösung (zwei Antworten zur Wahl)
const APRIL: SchwedenMuster[] = [
  {
    loesung: 'OSTERN',
    falsch: 'OSTSEE',
    d: {
      art: 'schweden',
      zeilen: ['#O#A#I#P#', '#POL#GNOM', '#ARM#LUPE', '##A#ZUG#S', 'MENGE#ASS', '#IGEL#TEE', '#DELTA#ER'],
      fragen: [
        { r: 0, c: 0, pfeil: 'rd', wort: 'OPA', text: 'Groß-|vater' },
        { r: 0, c: 2, pfeil: 'd', wort: 'ORANGE', text: 'Süd-|frucht' },
        { r: 0, c: 2, pfeil: 'rd', wort: 'ALM', text: 'Berg-|weide' },
        { r: 0, c: 4, pfeil: 'rd', wort: 'IGLU', text: 'Schnee-|hütte' },
        { r: 0, c: 6, pfeil: 'd', wort: 'NUGAT', text: 'Nuss-|masse' },
        { r: 0, c: 6, pfeil: 'rd', wort: 'POP', text: 'Musik-|stil' },
        { r: 0, c: 8, pfeil: 'd', wort: 'MESSER', text: 'Schneid-|werk-|zeug' },
        { r: 1, c: 0, pfeil: 'r', wort: 'POL', text: 'End-|punkt der|Erd-|achse' },
        { r: 1, c: 4, pfeil: 'r', wort: 'GNOM', text: 'Zwerg' },
        { r: 2, c: 0, pfeil: 'r', wort: 'ARM', text: 'Körper-|teil' },
        { r: 2, c: 4, pfeil: 'd', wort: 'ZELT', text: 'Camping-|quartier' },
        { r: 2, c: 4, pfeil: 'r', wort: 'LUPE', text: 'Brenn-|glas' },
        { r: 3, c: 0, pfeil: 'dr', wort: 'MENGE', text: 'Anzahl' },
        { r: 3, c: 1, pfeil: 'd', wort: 'EID', text: 'Schwur' },
        { r: 3, c: 3, pfeil: 'd', wort: 'GEL', text: 'Frisier-|mittel' },
        { r: 3, c: 3, pfeil: 'r', wort: 'ZUG', text: 'Eisen-|bahn' },
        { r: 3, c: 7, pfeil: 'd', wort: 'SEE', text: 'Binnen-|gewässer' },
        { r: 4, c: 5, pfeil: 'r', wort: 'ASS', text: 'Spiel-|karte' },
        { r: 5, c: 0, pfeil: 'r', wort: 'IGEL', text: 'Stachel-|tier' },
        { r: 5, c: 5, pfeil: 'r', wort: 'TEE', text: 'Heiß-|getränk' },
        { r: 6, c: 0, pfeil: 'r', wort: 'DELTA', text: 'Fluss-|mündung' },
        { r: 6, c: 6, pfeil: 'r', wort: 'ER', text: 'persön-|liches|Fürwort' },
      ],
      loesungsfelder: [[1, 2], [4, 7], [6, 4], [4, 1], [6, 8], [1, 6]],
    },
  },
  {
    loesung: 'OSTEREI',
    falsch: 'OSTWIND',
    d: {
      art: 'schweden',
      zeilen: ['#E##I#A#B', 'OST#DELTA', '##O#EIMER', 'WURZEL#N#', '#FEE#ETNA', '#ERLE#EIS', '#ROT#WEST'],
      fragen: [
        { r: 0, c: 0, pfeil: 'dr', wort: 'OST', text: 'Himmels-|richtung' },
        { r: 0, c: 0, pfeil: 'rd', wort: 'ES', text: 'Für-|wort' },
        { r: 0, c: 2, pfeil: 'd', wort: 'TORERO', text: 'Stier-|kämpfer' },
        { r: 0, c: 3, pfeil: 'rd', wort: 'IDEE', text: 'Einfall' },
        { r: 0, c: 5, pfeil: 'd', wort: 'EILE', text: 'Hast' },
        { r: 0, c: 5, pfeil: 'rd', wort: 'ALM', text: 'Berg-|weide' },
        { r: 0, c: 7, pfeil: 'd', wort: 'TENNIS', text: 'Sport mit|Schläger' },
        { r: 0, c: 7, pfeil: 'rd', wort: 'BAR', text: 'Nacht-|lokal' },
        { r: 1, c: 3, pfeil: 'r', wort: 'DELTA', text: 'Fluss-|mündung' },
        { r: 2, c: 0, pfeil: 'dr', wort: 'WURZEL', text: 'Teil der|Pflanze' },
        { r: 2, c: 1, pfeil: 'd', wort: 'UFER', text: 'Fluss-|rand' },
        { r: 2, c: 3, pfeil: 'd', wort: 'ZELT', text: 'Camping-|quartier' },
        { r: 2, c: 3, pfeil: 'r', wort: 'EIMER', text: 'Wasser-|gefäß' },
        { r: 3, c: 6, pfeil: 'd', wort: 'TEE', text: 'Heiß-|getränk' },
        { r: 3, c: 8, pfeil: 'd', wort: 'AST', text: 'Baum-|teil' },
        { r: 4, c: 0, pfeil: 'r', wort: 'FEE', text: 'Märchen-|wesen' },
        { r: 4, c: 4, pfeil: 'r', wort: 'ETNA', text: 'Vulkan|auf|Sizilien' },
        { r: 5, c: 0, pfeil: 'r', wort: 'ERLE', text: 'Laub-|baum' },
        { r: 5, c: 5, pfeil: 'r', wort: 'EIS', text: 'gefrore-|nes|Wasser' },
        { r: 6, c: 0, pfeil: 'r', wort: 'ROT', text: 'Farbe' },
        { r: 6, c: 4, pfeil: 'r', wort: 'WEST', text: 'Himmels-|richtung' },
      ],
      loesungsfelder: [[6, 2], [1, 1], [1, 7], [2, 4], [3, 2], [5, 6], [2, 5]],
    },
  },
]

const OKTOBER: SchwedenMuster[] = [
  {
    loesung: 'KASTANIE',
    falsch: '',
    d: {
      art: 'schweden',
      zeilen: ['##R###G#A', 'U#OPA#ASS', 'H#TOR#SET', 'R##LOS#S#', '#ZU#MESSE', 'TON#ANKER', '#OST#FILZ'],
      fragen: [
        { r: 0, c: 0, pfeil: 'd', wort: 'UHR', text: 'Zeit-|messer' },
        { r: 0, c: 1, pfeil: 'rd', wort: 'ROT', text: 'Farbe' },
        { r: 0, c: 3, pfeil: 'd', wort: 'POL', text: 'End-|punkt der|Erd-|achse' },
        { r: 0, c: 4, pfeil: 'd', wort: 'AROMA', text: 'Duft' },
        { r: 0, c: 5, pfeil: 'rd', wort: 'GAS', text: 'luft-|artiger|Stoff' },
        { r: 0, c: 7, pfeil: 'd', wort: 'SESSEL', text: 'Polster-|sitz' },
        { r: 0, c: 7, pfeil: 'rd', wort: 'AST', text: 'Baum-|teil' },
        { r: 1, c: 1, pfeil: 'r', wort: 'OPA', text: 'Groß-|vater' },
        { r: 1, c: 5, pfeil: 'r', wort: 'ASS', text: 'Spiel-|karte' },
        { r: 2, c: 1, pfeil: 'r', wort: 'TOR', text: 'Pforte' },
        { r: 2, c: 5, pfeil: 'd', wort: 'SENF', text: 'Würz-|paste' },
        { r: 2, c: 5, pfeil: 'r', wort: 'SET', text: 'Satz beim|Tennis' },
        { r: 3, c: 1, pfeil: 'd', wort: 'ZOO', text: 'Tier-|park' },
        { r: 3, c: 2, pfeil: 'd', wort: 'UNS', text: 'Für-|wort' },
        { r: 3, c: 2, pfeil: 'r', wort: 'LOS', text: 'Lotterie-|schein' },
        { r: 3, c: 6, pfeil: 'd', wort: 'SKI', text: 'Winter-|sport-|gerät' },
        { r: 3, c: 8, pfeil: 'd', wort: 'ERZ', text: 'Metall-|gestein' },
        { r: 4, c: 0, pfeil: 'dr', wort: 'TON', text: 'Klang' },
        { r: 4, c: 0, pfeil: 'r', wort: 'ZU', text: 'ge-|schlossen' },
        { r: 4, c: 3, pfeil: 'r', wort: 'MESSE', text: 'Aus-|stellung' },
        { r: 5, c: 3, pfeil: 'r', wort: 'ANKER', text: 'hält das|Schiff|fest' },
        { r: 6, c: 0, pfeil: 'r', wort: 'OST', text: 'Himmels-|richtung' },
        { r: 6, c: 4, pfeil: 'r', wort: 'FILZ', text: 'gepresste|Wolle' },
      ],
      loesungsfelder: [[5, 6], [1, 4], [6, 2], [2, 8], [1, 6], [5, 2], [6, 6], [4, 5]],
    },
  },
  {
    loesung: 'HERBST',
    falsch: '',
    d: {
      art: 'schweden',
      zeilen: ['#T####B#A', '#ATOM#ARM', '#LAMA#RAT', 'A#SAMT#H#', 'U#C#AROMA', '#OHR#ODER', 'EHE#AGENT'],
      fragen: [
        { r: 0, c: 0, pfeil: 'rd', wort: 'TAL', text: 'Senke|zwischen|Bergen' },
        { r: 0, c: 2, pfeil: 'd', wort: 'TASCHE', text: 'Beutel' },
        { r: 0, c: 3, pfeil: 'd', wort: 'OMA', text: 'Groß-|mutter' },
        { r: 0, c: 4, pfeil: 'd', wort: 'MAMA', text: 'Mutter|(Kinder-|sprache)' },
        { r: 0, c: 5, pfeil: 'rd', wort: 'BAR', text: 'Nacht-|lokal' },
        { r: 0, c: 7, pfeil: 'd', wort: 'RAHMEN', text: 'Ein-|fassung' },
        { r: 0, c: 7, pfeil: 'rd', wort: 'AMT', text: 'Behörde' },
        { r: 1, c: 0, pfeil: 'r', wort: 'ATOM', text: 'kleinster|Bau-|stein' },
        { r: 1, c: 5, pfeil: 'r', wort: 'ARM', text: 'Körper-|teil' },
        { r: 2, c: 0, pfeil: 'd', wort: 'AU', text: 'Schmerz-|ruf' },
        { r: 2, c: 0, pfeil: 'r', wort: 'LAMA', text: 'Anden-|kamel' },
        { r: 2, c: 5, pfeil: 'd', wort: 'TROG', text: 'Futter-|krippe' },
        { r: 2, c: 5, pfeil: 'r', wort: 'RAT', text: 'Empfeh-|lung' },
        { r: 3, c: 1, pfeil: 'r', wort: 'SAMT', text: 'weicher|Stoff' },
        { r: 3, c: 6, pfeil: 'd', wort: 'ODE', text: 'feier-|liches|Gedicht' },
        { r: 3, c: 8, pfeil: 'd', wort: 'ART', text: 'Sorte' },
        { r: 4, c: 1, pfeil: 'd', wort: 'OH', text: 'Ausruf' },
        { r: 4, c: 3, pfeil: 'r', wort: 'AROMA', text: 'Duft' },
        { r: 5, c: 0, pfeil: 'dr', wort: 'EHE', text: 'Lebens-|bund' },
        { r: 5, c: 0, pfeil: 'r', wort: 'OHR', text: 'Hör-|organ' },
        { r: 5, c: 4, pfeil: 'r', wort: 'ODER', text: 'Grenz-|fluss' },
        { r: 6, c: 3, pfeil: 'r', wort: 'AGENT', text: 'Spion' },
      ],
      loesungsfelder: [[5, 2], [5, 7], [1, 7], [0, 6], [3, 2], [3, 5]],
    },
  },
]

const SEPTEMBER: GitterMuster[] = [
  {
    loesung: 'HERBST',
    d: {
      art: 'gitter',
      zeilen: [
        'F.......DIEB',
        'I.KUH.R....O',
        'N.A..TORNADO',
        'KOMMA.H.U..T',
        '..E.STRAND..',
        'TAL.S..L.ELF',
        'E....H.AAL.U',
        'EIS.PAAR.TAG',
        '.....I.M.A.E',
      ],
      vorgabe: { r: 2, c: 5, richtung: 'a', wort: 'TORNADO' },
      loesungsfelder: [[1, 4], [7, 0], [4, 6], [0, 11], [4, 4], [7, 9]],
    },
  },
  {
    loesung: 'PFLAUME',
    d: {
      art: 'gitter',
      zeilen: [
        '.SUPPE.KIWI.',
        '.E.U.L...A.D',
        'GNOM.FENSTER',
        '.S.A..S..T.A',
        'BEI.DACH.E.H',
        'E..H..H....T',
        'T.BUTTER.K..',
        'T..T...E.UFO',
        '.....SCHUH..',
      ],
      vorgabe: { r: 2, c: 5, richtung: 'a', wort: 'FENSTER' },
      loesungsfelder: [[0, 3], [7, 10], [1, 5], [1, 9], [6, 3], [2, 3], [4, 1]],
    },
  },
  {
    loesung: 'ERNTE',
    d: {
      art: 'gitter',
      zeilen: [
        '..S....REISE',
        'GRAS..A....I',
        '..L.R.A.LEIM',
        '.GORILLA.N.E',
        '..N.T..U.G.R',
        '.S..TEIG.E..',
        'MALVE..EILE.',
        '.N..RUM...I.',
        'EDEN...GOLD.',
      ],
      vorgabe: { r: 3, c: 1, richtung: 'a', wort: 'GORILLA' },
      loesungsfelder: [[6, 4], [1, 1], [4, 2], [5, 4], [0, 11]],
    },
  },
]

/** Wort für die Antwortkarte: „OSTERN“ → „Ostern“ */
function anzeigeWort(w: string): string {
  return w.charAt(0) + w.slice(1).toLowerCase()
}

/** Muster-Rätsel rotierend über alle Spieltage des Monats */
function schwedenInhalte(monat: string, muster: SchwedenMuster[], zwei: boolean): Inhalt[] {
  return spieltage(monat).map((t) => {
    const m = muster[(t.tag - 1) % muster.length]
    const n = m.d.loesungsfelder.length
    const basis: Inhalt = {
      tag: t.tag,
      datum: t.datum,
      label: t.label,
      frage: zwei ? `Welches Lösungswort ergeben die Felder 1–${n}?` : `Rätsel lösen: Die Felder 1–${n} ergeben das Lösungswort.`,
      loesung: m.loesung,
      daten: m.d,
      muster: true,
    }
    if (!zwei) return basis
    // richtige Antwort wechselt zwischen 1 und 2 (unabhängig vom Muster-Wechsel)
    const richtigOben = Math.floor((t.tag - 1) / 2) % 2 === 0
    return {
      ...basis,
      a1: anzeigeWort(richtigOben ? m.loesung : m.falsch),
      a2: anzeigeWort(richtigOben ? m.falsch : m.loesung),
      richtig: richtigOben ? 1 : 2,
    }
  })
}

function schwedenRaetsel(zwei: boolean) {
  return (ctx: RaetselKontext): Teil => {
    const d = ctx.inhalt.daten as SchwedenDaten | undefined
    if (!d || d.art !== 'schweden' || !d.zeilen?.length) return leer(ctx.box, 'Rätsel folgt')
    return schwedenFeld(ctx, d, zwei)
  }
}

const SUPERMITTWOCH = { titel: 'Supermittwoch', text: 'Jeden Mittwoch verlosen wir 1.000 € statt 500 €.' }

const OFFEN_KQ = [
  'Kreuz & Quer: Das Original 2026 war ein Bild-Kreuzworträtsel (Foto liefert Hinweise, einzelne Buchstaben vorgegeben); 2027 als Schwedenrätsel mit Fragefeldern (9 × 7) umgesetzt, ohne Foto – abstimmen.',
  'Kreuz & Quer: Gittergröße 9 × 7 ist auf die schmale Box der Familie B ausgelegt (Fragetext ≥ 11 px); größere Gitter nur mit kürzeren Fragen.',
  'Rätsel-Muster meiden Ä/Ö/Ü/ß im Gitter – Konvention für echte Rätsel klären (Umlaut in einem Feld oder AE/OE/UE/SS).',
]

export const kreuzQuerApril: SpielDef = {
  id: 'kreuzquer-april',
  name: 'Kreuz & Quer',
  titel: 'Kreuz &amp; Quer',
  unterzeile: 'Rätsel lösen und bis zu <b>{TAGESPREIS}</b> gewinnen',
  monate: ['2027-04'],
  modell: 'RSP',
  beschreibung: 'Schwedenrätsel: Die nummerierten Felder ergeben das Lösungswort – zwei Lösungswörter zur Wahl, sechs Geldpakete wie beim Geldregen.',
  mechanik: { art: 'geldpakete' },
  antwort: 'zwei',
  schritte: [
    'Rätsel lösen: Die nummerierten Felder ergeben das Lösungswort.',
    'Richtiges Lösungswort wählen: Antwort 1 oder 2.',
    'Wunsch-Geldpaket aussuchen und dessen Hotline mit der Endziffer Ihrer Antwort anrufen.',
  ],
  hinweis: { titel: 'Das Glück hat ein Zeitfenster', text: ZEITFENSTER },
  musterInhalte: (monat: string) => schwedenInhalte(monat, APRIL, true),
  raetsel: schwedenRaetsel(true),
  offen: [
    'Kreuz & Quer April: Spezial-Geldregen angenommen – zwei Lösungswörter zur Wahl (Endziffer 1/2), sechs Geldpakete mit Geldregen-Nummern der Zeitung, Zeitfenster-Gewinne.',
    'Kreuz & Quer April: Zwei Muster-Rätsel selbst erstellt (OSTERN/OSTSEE, OSTEREI/OSTWIND) – echte Rätsel für alle Spieltage fehlen (Redaktion/Rätselagentur?).',
    ...OFFEN_KQ,
  ],
}

export const kreuzQuerOktober: SpielDef = {
  id: 'kreuzquer-oktober',
  name: 'Kreuz & Quer',
  titel: 'Kreuz &amp; Quer',
  unterzeile: 'Rätsel lösen und täglich <b>{TAGESPREIS}</b> gewinnen',
  monate: ['2027-10'],
  modell: 'AZS oder RSP',
  beschreibung: 'Schwedenrätsel: Die nummerierten Felder ergeben das Lösungswort, das am Telefon genannt wird.',
  mechanik: { art: 'tagespreis', tagespreis: '500 €', supertag: '1.000 €' },
  antwort: 'loesungswort',
  schritte: [
    'Rätsel lösen: Die nummerierten Felder ergeben das Lösungswort.',
    'Gewinn-Hotline anrufen und das Lösungswort nennen.',
    'Mit etwas Glück den Tagespreis gewinnen.',
  ],
  hinweis: SUPERMITTWOCH,
  musterInhalte: (monat: string) => schwedenInhalte(monat, OKTOBER, false),
  raetsel: schwedenRaetsel(false),
  offen: [
    'Kreuz & Quer Oktober: Antwort über eine Gewinn-Hotline (Lösungswort nennen) angenommen; Tagespreis 500 €, Supermittwoch 1.000 €.',
    'Kreuz & Quer Oktober: Zwei Muster-Rätsel selbst erstellt (KASTANIE, HERBST) – echte Rätsel für alle Spieltage fehlen.',
    'Kreuz & Quer Oktober: Nummerierte Lösungswort-Leiste nur im April; im Oktober stehen die Lösungswort-Kästchen (ohne Nummern) im Antwortblock des Rahmens.',
    ...OFFEN_KQ,
  ],
}

export const gitterraetsel: SpielDef = {
  id: 'gitterraetsel',
  name: 'Gitterrätsel',
  titel: 'Gitter&shy;rätsel',
  unterzeile: 'Wörter einsetzen und täglich <b>{TAGESPREIS}</b> gewinnen',
  monate: ['2027-09'],
  modell: 'AZS oder RSP',
  beschreibung: 'Begriffe nach ihrer Länge ins Gitter einsetzen; die markierten Felder ergeben das Lösungswort.',
  mechanik: { art: 'tagespreis', tagespreis: '500 €', supertag: '1.000 €' },
  antwort: 'loesungswort',
  schritte: [
    'Wörter nach ihrer Länge ins Gitter einsetzen – ein Wort steht schon drin.',
    'Die markierten Felder ergeben das Lösungswort.',
    'Gewinn-Hotline anrufen und das Lösungswort nennen.',
  ],
  hinweis: SUPERMITTWOCH,
  musterInhalte(monat: string): Inhalt[] {
    return spieltage(monat).map((t) => {
      const m = SEPTEMBER[(t.tag - 1) % SEPTEMBER.length]
      return {
        tag: t.tag,
        datum: t.datum,
        label: t.label,
        frage: `Wörter einsetzen: Die Felder 1–${m.d.loesungsfelder.length} ergeben das Lösungswort.`,
        loesung: m.loesung,
        daten: m.d,
        muster: true,
      }
    })
  },
  raetsel(ctx) {
    const d = ctx.inhalt.daten as GitterDaten | undefined
    if (!d || d.art !== 'gitter' || !d.zeilen?.length) return leer(ctx.box, 'Rätsel folgt')
    return gitterFeld(ctx, d)
  },
  offen: [
    'Gitterrätsel: Drei Muster-Rätsel selbst erstellt (HERBST, PFLAUME, ERNTE), Eindeutigkeit mit Vorgabewort per Skript geprüft – echte Rätsel für alle Spieltage im September 2027 fehlen.',
    'Gitterrätsel: Antwort über eine Gewinn-Hotline (Lösungswort nennen) angenommen; Tagespreis 500 €, Supermittwoch 1.000 €.',
    'Gitterrätsel: Gitter frei geformt (12 × 9) statt der kompakten Blockform des Originals 2026; Lösungswort-Kästchen ohne Nummern im Antwortblock des Rahmens.',
    'Rätsel-Muster meiden Ä/Ö/Ü/ß im Gitter – Konvention für echte Rätsel klären (Umlaut in einem Feld oder AE/OE/UE/SS).',
  ],
}

/** Alle Muster prüfen (für Tests): Liste der Fehler, leer = in Ordnung */
export function kreuzQuerMusterPruefen(): string[] {
  const f: string[] = []
  for (const m of [...APRIL, ...OKTOBER]) {
    f.push(...schwedenPruefen(m.d, m.loesung).map((x) => `${m.loesung}: ${x}`))
    if (m.falsch && m.falsch.length !== m.loesung.length) f.push(`${m.loesung}: Falschlösung ${m.falsch} hat andere Länge`)
  }
  for (const m of SEPTEMBER) f.push(...gitterPruefen(m.d, m.loesung).map((x) => `${m.loesung}: ${x}`))
  return f
}
