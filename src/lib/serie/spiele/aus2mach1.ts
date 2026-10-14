// aus 2 mach 1 (Januar 2027, AZS oder RSP): Bilderrätsel – zwei Bilder ergeben zusammen einen Begriff (= Lösungswort),
// vorgegebene Buchstaben (Buchstabensalat-Kreise wie im Original 2026) helfen beim Lösen.
// Muster-Bilder: aus Original-Anzeigen ausgeschnitten (Ski/Schuh aus der 2026-Anzeige der Präsentation,
// Kaffee/Mühle aus der FUNKE-Anzeige „Aus 2 mach 1“ 2023) – für die Produktion werden neue Fotos gebraucht.

import { spieltage } from './kalender'
import type { Inhalt, SpielDef } from './typen'

// ------------------------------------------------------------------ gemeinsame Helfer (auch von kombinieren.ts genutzt)

/** Textfarbe auf der Akzentfläche: dunkel auf hellem Akzent (z. B. Gold), sonst Weiß */
export function textAufAkzent(akzent: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(akzent.trim())
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const hell = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return hell > 0.6 ? '#0D1B36' : '#fff'
}

export type KreisLayout = { d: number; gap: number; proZeile: number; zeilen: number; h: number; w: number }

/** Größe der Buchstaben-Kreise so wählen, dass n Kreise in w × maxH passen (größtmöglicher Durchmesser, max. maxD) */
export function kreisLayout(n: number, w: number, maxH: number, maxD = 48): KreisLayout {
  const gap = 8
  let best: KreisLayout = { d: 0, gap, proZeile: n, zeilen: 1, h: 0, w: 0 }
  for (let zeilen = 1; zeilen <= Math.max(1, n); zeilen++) {
    const proZeile = Math.ceil(n / zeilen)
    const d = Math.min(maxD, Math.floor((w - gap * (proZeile - 1)) / proZeile), Math.floor((maxH - gap * (zeilen - 1)) / zeilen))
    if (d > best.d) best = { d, gap, proZeile, zeilen, h: zeilen * d + (zeilen - 1) * gap, w: proZeile * d + (proZeile - 1) * gap }
    if (proZeile === 1) break
  }
  return best
}

/** Buchstabensalat als Kreise in Zeilen (zentriert) */
export function kreiseHtml(buchstaben: string[], lay: KreisLayout, cls: string): string {
  const zeilen: string[] = []
  for (let i = 0; i < buchstaben.length; i += lay.proZeile)
    zeilen.push(`<div class="${cls}-z">${buchstaben.slice(i, i + lay.proZeile).map((b) => `<span class="${cls}-k">${b}</span>`).join('')}</div>`)
  return zeilen.join('')
}

/** CSS für die Buchstaben-Kreise */
export function kreiseCss(cls: string, lay: KreisLayout, akzent: string): string {
  const fs = Math.max(14, Math.round(lay.d * 0.5))
  return `.${cls}-z{display:flex;justify-content:center;gap:${lay.gap}px;height:${lay.d}px} .${cls}-z+.${cls}-z{margin-top:${lay.gap}px}
.${cls}-k{flex:none;width:${lay.d}px;height:${lay.d}px;border-radius:50%;background:${akzent};color:${textAufAkzent(akzent)};font-family:RC,"Arial Narrow",sans-serif;font-weight:700;font-size:${fs}px;line-height:${lay.d}px;text-align:center}`
}

/** Buchstaben aus daten.buchstaben (String) – sonst aus der Lösung gemischt (deterministisch) */
export function buchstabenAus(daten: { buchstaben?: string }, loesung?: string): string[] {
  if (daten.buchstaben) return [...daten.buchstaben.replace(/\s/g, '').toUpperCase()]
  const l = [...(loesung ?? '').replace(/\s/g, '').toUpperCase()]
  // einfache, feste Mischung (jede 3. Stelle zuerst …), damit das Wort nicht lesbar bleibt
  const out: string[] = []
  for (let s = 0; s < 3; s++) for (let i = s; i < l.length; i += 3) out.push(l[i])
  return out
}

// ------------------------------------------------------------------ Spiel

const MUSTER = [
  // Original 2026 (Präsentation, Bild 8): Ski + Schuh = SKISCHUHE, Buchstaben wie im Original
  { bild1: 'muster1_ski', bild2: 'muster1_schuh', loesung: 'SKISCHUHE', buchstaben: 'SIHUSECHK' },
  // FUNKE-Anzeige 2023: Kaffee + Mühle = KAFFEEMÜHLE, Buchstaben wie im Original
  { bild1: 'muster2_kaffee', bild2: 'muster2_muehle', loesung: 'KAFFEEMÜHLE', buchstaben: 'FEMKEAHÜLEF' },
]

const bildPfad = (n: string) => `spiele/aus2mach1/${n}.jpg`

export const aus2mach1: SpielDef = {
  id: 'aus2mach1',
  name: 'aus 2 mach 1',
  titel: 'aus&nbsp;2 mach&nbsp;1',
  unterzeile: 'Bilderrätsel lösen und täglich <b>{TAGESPREIS}</b> gewinnen',
  monate: ['2027-01'],
  modell: 'AZS oder RSP',
  beschreibung: 'Bilderrätsel: Zwei Bilder ergeben zusammen einen Begriff (z. B. Ski + Schuh = Skischuhe); vorgegebene Buchstaben helfen.',
  mechanik: { art: 'tagespreis', tagespreis: '500 €', supertag: '1.000 €' },
  antwort: 'loesungswort',
  schritte: [
    'Beide Begriffe zu einem Wort verbinden – die Buchstaben helfen.',
    'Gewinn-Hotline anrufen und das Lösungswort nennen.',
    'Mit etwas Glück den Tagespreis gewinnen.',
  ],
  hinweis: { titel: 'Supermittwoch', text: 'Jeden Mittwoch verlosen wir 1.000 € statt 500 €.' },
  bilder: MUSTER.flatMap((m) => [bildPfad(m.bild1), bildPfad(m.bild2)]),
  musterInhalte(monat: string): Inhalt[] {
    return spieltage(monat).map((t) => {
      const m = MUSTER[(t.tag - 1) % MUSTER.length]
      return {
        tag: t.tag,
        datum: t.datum,
        label: t.label,
        frage: 'Welcher Begriff entsteht aus beiden Bildern?',
        loesung: m.loesung,
        daten: { bild1: bildPfad(m.bild1), bild2: bildPfad(m.bild2), buchstaben: m.buchstaben },
        muster: true,
      }
    })
  },
  raetsel({ inhalt, box, pfad, akzent }) {
    const d = (inhalt.daten ?? {}) as { bild1?: string; bild2?: string; buchstaben?: string }
    const bu = buchstabenAus(d, inhalt.loesung)
    const LBL = 22 // Zeile „Diese Buchstaben helfen“
    const ABST = 14 // Abstand Bilder ↔ Buchstaben
    const lay = kreisLayout(bu.length, box.w, Math.floor(box.h * 0.3))
    const plus = Math.min(56, Math.floor(box.w * 0.1))
    const bh = box.h - ABST - LBL - lay.h
    const bw = Math.floor((box.w - plus) / 2)
    const pd = Math.max(16, Math.round(plus * 0.5))
    const bild = (src: string | undefined) =>
      src
        ? `<div class="a2-b" style="width:${bw}px;height:${bh}px"><div class="a2-i" style="background-image:url('${pfad(src)}')"></div></div>`
        : `<div class="a2-b a2-leer" style="width:${bw}px;height:${bh}px">Bild folgt</div>`
    return {
      css:
        `.a2{width:${box.w}px;height:${box.h}px;overflow:hidden}
.a2-r{display:flex;align-items:center;height:${bh}px}
.a2-b{flex:none;box-sizing:border-box;border:3px solid ${akzent};border-radius:14px;background:#fff;padding:8px;overflow:hidden}
.a2-i{width:100%;height:100%;background-size:contain;background-repeat:no-repeat;background-position:center}
.a2-leer{background:#FFE45C;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px}
.a2-p{flex:none;width:${plus}px;display:flex;justify-content:center}
.a2-p span{width:${pd + 14}px;height:${pd + 14}px;border-radius:50%;background:${akzent};color:${textAufAkzent(akzent)};font-weight:800;font-size:${pd}px;line-height:${pd + 14}px;text-align:center}
.a2-l{height:${LBL}px;margin-top:${ABST}px;font-size:14px;font-weight:800;letter-spacing:2px;color:#555;text-align:center;white-space:nowrap}
` + kreiseCss('a2', lay, akzent),
      html:
        `<div class="a2"><div class="a2-r">${bild(d.bild1)}<div class="a2-p"><span>+</span></div>${bild(d.bild2)}</div>` +
        `<div class="a2-l">DIESE BUCHSTABEN HELFEN</div>${bu.length ? kreiseHtml(bu, lay, 'a2') : ''}</div>`,
    }
  },
  offen: [
    'aus 2 mach 1: Musterbilder aus der 2026-Anzeige (Ski/Schuh) bzw. FUNKE-Anzeige 2023 (Kaffee/Mühle) ausgeschnitten – Ski/Schuh nur ca. 350 px, für Produktion neue Fotos nötig.',
    'aus 2 mach 1: Lösungswort laut Original im Plural (SKISCHUHE), vorgegebene Buchstaben = Buchstaben des Lösungsworts gemischt (wie 2026).',
    'aus 2 mach 1: Inhalte (Bildpaare + Lösungswörter) für alle Spieltage im Januar 2027 fehlen noch.',
    'aus 2 mach 1: Antwort über eine Gewinn-Hotline (Lösungswort nennen) angenommen; Tagespreis 500 €, Supermittwoch 1.000 €.',
  ],
}
