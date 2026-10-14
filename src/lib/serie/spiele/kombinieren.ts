// Kombinieren & Kassieren (Juni 2027, AZS oder RSP): Ein Bild steht für ein Begriffspaar – beide Begriffe
// zusammen ergeben das Lösungswort (z. B. Baum + Haus = BAUMHAUS); vorgegebene Buchstaben helfen.
// Muster-Bild: aus der 2026-Anzeige der Präsentation (Bild 13) ausgeschnitten – für die Produktion werden neue Fotos gebraucht.

import { buchstabenAus, kreiseCss, kreiseHtml, kreisLayout, type KreisLayout } from './aus2mach1'
import { spieltage } from './kalender'
import type { Inhalt, SpielDef } from './typen'

const MUSTER = [
  // Original 2026: Baum mit Haus = BAUMHAUS, Buchstaben wie im Original; Bild 743 × 552 px
  { bild: 'muster1_baumhaus', loesung: 'BAUMHAUS', buchstaben: 'HBSUUAAM', verhaeltnis: 743 / 552 },
]

const bildPfad = (n: string) => `spiele/kombinieren/${n}.jpg`

export const kombinieren: SpielDef = {
  id: 'kombinieren',
  name: 'Kombinieren & Kassieren',
  // eigener Block mit kleinerer Schrift: passt in A/C einzeilig, in B zweizeilig (sonst ragt der Kopf ins Rätselfeld)
  titel: '<span style="display:block;font-size:.75em">Kombinieren &amp; Kassieren</span>',
  unterzeile: 'Begriffe kombinieren und täglich <b>{TAGESPREIS}</b> kassieren',
  monate: ['2027-06'],
  modell: 'AZS oder RSP',
  beschreibung: 'Bilderrätsel: Ein Motiv steht für ein Begriffspaar – beide zusammen ergeben das Lösungswort; vorgegebene Buchstaben helfen.',
  mechanik: { art: 'tagespreis', tagespreis: '500 €', supertag: '1.000 €' },
  antwort: 'loesungswort',
  schritte: [
    'Begriffspaar im Bild finden und zu einem Wort verbinden.',
    'Gewinn-Hotline anrufen und das Lösungswort nennen.',
    'Mit etwas Glück den Tagespreis gewinnen.',
  ],
  hinweis: { titel: 'Supermittwoch', text: 'Jeden Mittwoch verlosen wir 1.000 € statt 500 €.' },
  bilder: MUSTER.map((m) => bildPfad(m.bild)),
  musterInhalte(monat: string): Inhalt[] {
    return spieltage(monat).map((t) => {
      const m = MUSTER[(t.tag - 1) % MUSTER.length]
      return {
        tag: t.tag,
        datum: t.datum,
        label: t.label,
        frage: 'Welches Begriffspaar zeigt das Bild?',
        loesung: m.loesung,
        daten: { bild: bildPfad(m.bild), buchstaben: m.buchstaben, verhaeltnis: m.verhaeltnis },
        muster: true,
      }
    })
  },
  raetsel({ inhalt, box, pfad, akzent }) {
    const d = (inhalt.daten ?? {}) as { bild?: string; buchstaben?: string; verhaeltnis?: number }
    const bu = buchstabenAus(d, inhalt.loesung)
    const v = d.verhaeltnis && d.verhaeltnis > 0.3 && d.verhaeltnis < 4 ? d.verhaeltnis : 4 / 3
    const LBL = 22
    const ABST = 14

    // Variante 1: Buchstaben unter dem Bild
    const layU = kreisLayout(bu.length, box.w, Math.floor(box.h * 0.3))
    let uh = box.h - ABST - LBL - layU.h
    let uw = Math.min(box.w, Math.floor(uh * v))
    uh = Math.min(uh, Math.floor(uw / v))
    // Variante 2: Buchstaben rechts neben dem Bild (Spalte max. 3 Kreise breit)
    const spalte = Math.min(180, Math.floor(box.w * 0.3))
    const layR: KreisLayout = kreisLayout(bu.length, spalte, box.h - 2 * LBL - 8)
    let rw = box.w - ABST - Math.max(layR.w, 150)
    let rh = Math.min(box.h, Math.floor(rw / v))
    rw = Math.min(rw, Math.floor(rh * v))
    const rechts = rw * rh > uw * uh

    const iw = rechts ? rw : uw
    const ih = rechts ? rh : uh
    const lay = rechts ? layR : layU
    const bild = d.bild
      ? `<div class="kk-b" style="width:${iw}px;height:${ih}px;background-image:url('${pfad(d.bild)}')"></div>`
      : `<div class="kk-b kk-leer" style="width:${iw}px;height:${ih}px">Bild folgt</div>`
    const buchst = `<div class="kk-bu"><div class="kk-l">DIESE BUCHSTABEN HELFEN</div>${kreiseHtml(bu, lay, 'kk')}</div>`
    const css =
      `.kk{width:${box.w}px;height:${box.h}px;overflow:hidden;display:flex;${rechts ? `gap:${ABST}px;align-items:center;justify-content:center` : 'flex-direction:column;align-items:center'}}
.kk-b{flex:none;box-sizing:border-box;border:3px solid ${akzent};border-radius:14px;background-size:cover;background-position:center}
.kk-leer{background:#FFE45C;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px}
.kk-bu{flex:none;${rechts ? '' : `margin-top:${ABST}px;`}width:${rechts ? Math.max(layR.w, 150) : box.w}px}
.kk-l{height:${LBL}px;font-size:${rechts ? 13 : 14}px;font-weight:800;letter-spacing:${rechts ? 1 : 2}px;color:#555;text-align:center;white-space:${rechts ? 'normal' : 'nowrap'};line-height:1.1}
` + kreiseCss('kk', lay, akzent) + (rechts ? `\n.kk-l{height:auto;margin-bottom:8px}` : '')
    return { css, html: `<div class="kk">${bild}${buchst}</div>` }
  },
  offen: [
    'Kombinieren & Kassieren: Musterbild aus der 2026-Anzeige ausgeschnitten (743 × 552 px), für Produktion neue Fotos nötig.',
    'Kombinieren & Kassieren: nur ein Muster (BAUMHAUS) vorhanden – Bildmotive + Lösungswörter für alle Spieltage im Juni 2027 fehlen noch.',
    'Kombinieren & Kassieren: Antwort über eine Gewinn-Hotline (Lösungswort nennen) angenommen; Tagespreis 500 €, Supermittwoch 1.000 €.',
    'Kombinieren & Kassieren: Titel im Kopf verkleinert (0,75 ×), damit er in A/C einzeilig bleibt.',
  ],
}
