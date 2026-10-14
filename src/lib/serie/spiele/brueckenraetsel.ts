// Brückenrätsel (Mai 2027, AZS oder RSP): Brückenwörter verbinden zwei Begriffe – links Wort A, rechts Wort C,
// gesucht B, so dass A+B und B+C je ein Wort ergeben (z. B. TEAM – LEITER – WAGEN). Die Buchstaben der Brückenwörter
// in der markierten Spalte ergeben das Lösungswort. Reines HTML/CSS-Raster, keine Bilder.

import { spieltage } from './kalender'
import type { Inhalt, SpielDef } from './typen'

/** Eine Rätselzeile: links + wort und wort + rechts sind deutsche Wörter; wort[pos] ist der Lösungsbuchstabe */
export type BrueckenZeile = { links: string; wort: string; rechts: string; pos: number }

// Muster (alle Verbindungen geprüft, Lösungswort = markierte Buchstaben von oben nach unten)
const MUSTER: { loesung: string; zeilen: BrueckenZeile[] }[] = [
  {
    loesung: 'SOMMER',
    zeilen: [
      { links: 'KINDER', wort: 'SPIEL', rechts: 'PLATZ', pos: 0 }, // Kinderspiel · Spielplatz
      { links: 'SCHWARZ', wort: 'BROT', rechts: 'ZEIT', pos: 2 }, // Schwarzbrot · Brotzeit
      { links: 'KUH', wort: 'MILCH', rechts: 'GLAS', pos: 0 }, // Kuhmilch · Milchglas
      { links: 'WOHN', wort: 'ZIMMER', rechts: 'PFLANZE', pos: 2 }, // Wohnzimmer · Zimmerpflanze
      { links: 'BERG', wort: 'SEE', rechts: 'STERN', pos: 1 }, // Bergsee · Seestern
      { links: 'FAHR', wort: 'RAD', rechts: 'WEG', pos: 0 }, // Fahrrad · Radweg
    ],
  },
  {
    loesung: 'STRAND',
    zeilen: [
      { links: 'MEER', wort: 'SALZ', rechts: 'STREUER', pos: 0 }, // Meersalz · Salzstreuer
      { links: 'KÜCHEN', wort: 'TISCH', rechts: 'DECKE', pos: 0 }, // Küchentisch · Tischdecke
      { links: 'LIEBES', wort: 'BRIEF', rechts: 'KASTEN', pos: 1 }, // Liebesbrief · Briefkasten
      { links: 'HAND', wort: 'BALL', rechts: 'SPIEL', pos: 1 }, // Handball · Ballspiel
      { links: 'VOLL', wort: 'MOND', rechts: 'LICHT', pos: 2 }, // Vollmond · Mondlicht
      { links: 'STROH', wort: 'DACH', rechts: 'RINNE', pos: 0 }, // Strohdach · Dachrinne
    ],
  },
  {
    loesung: 'URLAUB',
    zeilen: [
      { links: 'TASCHEN', wort: 'UHR', rechts: 'WERK', pos: 0 }, // Taschenuhr · Uhrwerk
      { links: 'STARK', wort: 'STROM', rechts: 'KABEL', pos: 2 }, // Starkstrom · Stromkabel
      { links: 'KERZEN', wort: 'LICHT', rechts: 'SCHALTER', pos: 0 }, // Kerzenlicht · Lichtschalter
      { links: 'KINDER', wort: 'WAGEN', rechts: 'HEBER', pos: 1 }, // Kinderwagen · Wagenheber
      { links: 'APFEL', wort: 'BAUM', rechts: 'KRONE', pos: 2 }, // Apfelbaum · Baumkrone
      { links: 'EIS', wort: 'BERG', rechts: 'SPITZE', pos: 0 }, // Eisberg · Bergspitze
    ],
  },
]

/** Lösungswort aus den Zeilen (Buchstabe an markierter Position) */
export function brueckenLoesung(zeilen: BrueckenZeile[]): string {
  return zeilen.map((z) => z.wort[z.pos] ?? '?').join('')
}

/** Brückenwörter-Liste alphabetisch (verrät die Reihenfolge nicht) */
function wortliste(zeilen: BrueckenZeile[]): string[] {
  return zeilen.map((z) => z.wort).sort((a, b) => a.localeCompare(b, 'de'))
}

const ERKL = 'Brückenwort so einsetzen, dass links und rechts je ein neues Wort entsteht (z. B. TEAM – LEITER – WAGEN). Die markierte Spalte ergibt das Lösungswort.'

export const brueckenraetsel: SpielDef = {
  id: 'brueckenraetsel',
  name: 'Brückenrätsel',
  titel: 'Brücken&shy;rätsel',
  unterzeile: 'Brücken bauen und täglich <b>{TAGESPREIS}</b> gewinnen',
  monate: ['2027-05'],
  modell: 'AZS oder RSP',
  beschreibung: 'Worträtsel: Brückenwörter verbinden je zwei Begriffe; die markierte Spalte ergibt das Lösungswort.',
  mechanik: { art: 'tagespreis', tagespreis: '500 €', supertag: '1.000 €' },
  antwort: 'loesungswort',
  schritte: [
    'Brückenwörter einsetzen und Lösungswort ablesen.',
    'Gewinn-Hotline anrufen und das Lösungswort nennen.',
    'Mit etwas Glück den Tagespreis gewinnen.',
  ],
  hinweis: { titel: 'Supermittwoch', text: 'Jeden Mittwoch verlosen wir 1.000 € statt 500 €.' },
  musterInhalte(monat: string): Inhalt[] {
    return spieltage(monat).map((t) => {
      const m = MUSTER[(t.tag - 1) % MUSTER.length]
      return {
        tag: t.tag,
        datum: t.datum,
        label: t.label,
        frage: 'Welche Wörter bilden die Brücken?',
        loesung: m.loesung,
        daten: { zeilen: m.zeilen },
        muster: true,
      }
    })
  },
  raetsel({ inhalt, box, akzent }) {
    const zeilen = ((inhalt.daten ?? {}) as { zeilen?: BrueckenZeile[] }).zeilen ?? []
    if (!zeilen.length)
      return {
        css: `.br-leer{width:${box.w}px;height:${box.h}px;background:#FFE45C;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px}`,
        html: '<div class="br-leer">Rätsel folgt</div>',
      }
    const n = zeilen.length
    const vor = Math.max(...zeilen.map((z) => z.pos)) // Kästchen links der Lösungsspalte
    const nach = Math.max(...zeilen.map((z) => z.wort.length - z.pos)) // ab Lösungsspalte nach rechts
    const spalten = vor + nach

    // feste Blöcke unter dem Raster
    const MARK = 22 // Zeile „LÖSUNGSWORT ▼“
    const ABST = 12
    const zeichenProZeile = Math.max(20, Math.floor(box.w / 7.6)) // 14-px-Text, großzügig geschätzt
    const erklH = Math.ceil(ERKL.length / zeichenProZeile) * 18
    const liste = wortliste(zeilen)
    const listeZ = Math.max(1, Math.ceil((liste.join(' · ').length * 13.5) / box.w)) // 18-px-Fettschrift, großzügig
    const listeH = 20 + listeZ * 24
    const rasterH = box.h - MARK - ABST - erklH - ABST - listeH

    // Schriftgröße der Randwörter und Kästchengröße so wählen, dass alles in die Breite passt
    const lMax = Math.max(...zeilen.map((z) => z.links.length))
    const rMax = Math.max(...zeilen.map((z) => z.rechts.length))
    let f = 22
    let lw = 0
    let rw = 0
    let k = 0
    for (; f >= 13; f--) {
      lw = Math.ceil(lMax * f * 0.66) + 8 // Roboto Condensed Bold, Großbuchstaben ≤ 0,62 em
      rw = Math.ceil(rMax * f * 0.66) + 8
      k = Math.min(46, Math.floor((box.w - lw - rw - 16) / spalten), Math.floor(rasterH / n))
      if (k >= Math.max(28, f * 1.6)) break
    }
    f = Math.max(13, f)
    k = Math.max(16, k)
    const rasterW = lw + 8 + spalten * k + 8 + rw
    const x0 = Math.max(0, Math.floor((box.w - rasterW) / 2))
    const mx = x0 + lw + 8 + vor * (k - 1.5) // linke Kante Lösungsspalte (Kästchen überlappen 1,5 px)

    const zeileHtml = (z: BrueckenZeile) => {
      const zellen: string[] = []
      for (let s = 0; s < spalten; s++) {
        const i = s - (vor - z.pos) // Buchstabenindex im Brückenwort
        const cls = i >= 0 && i < z.wort.length ? (s === vor ? 'br-c br-m' : 'br-c') : 'br-c br-x'
        zellen.push(`<span class="${cls}"></span>`)
      }
      return `<div class="br-z"><span class="br-a">${z.links}</span><span class="br-zl">${zellen.join('')}</span><span class="br-e">${z.rechts}</span></div>`
    }
    const tint = /^#[0-9a-f]{6}$/i.test(akzent) ? akzent + '33' : '#DDE6F0'
    const css = `.br{position:relative;width:${box.w}px;height:${box.h}px;overflow:hidden;color:#1d1d1f}
.br-mk{position:absolute;top:0;left:${Math.round(Math.max(0, Math.min(box.w - 180, mx + k / 2 - 90)))}px;width:180px;height:${MARK}px;text-align:center;font-size:13px;font-weight:800;letter-spacing:1px;color:#555;white-space:nowrap}
.br-mk b{color:${akzent === '#F2C14E' ? '#B07A16' : akzent}}
.br-r{position:absolute;top:${MARK}px;left:${x0}px;width:${rasterW}px}
.br-z{display:flex;align-items:center;height:${k}px}
.br-a,.br-e{flex:none;font-family:RC,"Arial Narrow",sans-serif;font-size:${f}px;font-weight:700;white-space:nowrap;overflow:hidden}
.br-a{width:${lw}px;text-align:right;margin-right:8px} .br-e{width:${rw}px;margin-left:8px}
.br-zl{display:flex;flex:none}
.br-c{flex:none;box-sizing:border-box;width:${k}px;height:${k}px;border:1.5px solid #8A8F98;margin-left:-1.5px;background:#fff}
.br-c:first-child{margin-left:0}
.br-z+.br-z{margin-top:-1.5px}
.br-x{border-color:transparent;background:transparent}
.br-m{background:${tint};border:3px solid ${akzent === '#F2C14E' ? '#0D1B36' : akzent};position:relative;z-index:1}
.br-t{position:absolute;left:0;right:0;top:${MARK + n * k + ABST}px;font-size:14px;line-height:18px;color:#444}
.br-l{position:absolute;left:0;right:0;top:${MARK + n * k + ABST + erklH + ABST}px}
.br-l small{display:block;font-size:13px;font-weight:800;letter-spacing:2px;color:#555;height:20px}
.br-l b{display:block;font-size:18px;line-height:24px;font-weight:800;color:${akzent === '#F2C14E' ? '#0D1B36' : akzent}}`
    const html =
      `<div class="br"><div class="br-mk"><b>▼</b> LÖSUNGSWORT <b>▼</b></div>` +
      `<div class="br-r">${zeilen.map(zeileHtml).join('')}</div>` +
      `<div class="br-t">${ERKL}</div>` +
      `<div class="br-l"><small>BRÜCKENWÖRTER (BITTE EINSETZEN)</small><b>${liste.join(' · ')}</b></div></div>`
    return { css, html }
  },
  offen: [
    'Brückenrätsel: Drei Muster-Rätsel selbst erstellt (SOMMER, STRAND, URLAUB) – echte Rätsel für alle Spieltage im Mai 2027 fehlen noch (Redaktion/Rätselagentur?).',
    'Brückenrätsel: Linke Wortteile wie WOHN, FAHR sind keine eigenständigen Wörter (wie im Original 2026: NÄH, SPRITZ) – ggf. abstimmen.',
    'Brückenrätsel: Antwort über eine Gewinn-Hotline (Lösungswort nennen) angenommen; Tagespreis 500 €, Supermittwoch 1.000 €.',
  ],
}
