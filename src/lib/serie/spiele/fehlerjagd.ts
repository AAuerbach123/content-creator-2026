// Fehlerjagd (Februar 2027, AZS oder RSP, NEU): zwei fast gleiche Fotos – wie viele Unterschiede hat das rechte Bild?
// Referenz-Implementierung für den Spiele-Katalog (Vorlage für weitere Spiele).
// Muster-Bilder: _bilder_chatgpt/fehler_1_* (5 Unterschiede) und fehler_2_* (6 Unterschiede), siehe BILDER_MIT_CHATGPT.md.

import { spieltage } from './kalender'
import type { Inhalt, SpielDef } from './typen'

const MUSTER = [
  { bild: 'muster1', richtig: '5', falsch: '7' },
  { bild: 'muster2', richtig: '6', falsch: '4' },
]

export const fehlerjagd: SpielDef = {
  id: 'fehlerjagd',
  name: 'Fehlerjagd',
  titel: 'Fehlerjagd',
  unterzeile: 'Unterschiede zählen und täglich <b>{TAGESPREIS}</b> gewinnen',
  monate: ['2027-02'],
  modell: 'AZS oder RSP',
  beschreibung: 'Bilderrätsel: zwei fast gleiche Fotos – wie viele Unterschiede hat das rechte Bild?',
  mechanik: { art: 'tagespreis', tagespreis: '500 €', supertag: '1.000 €' },
  antwort: 'ansagen',
  schritte: [
    'Vergleichen Sie beide Bilder und zählen Sie die Unterschiede.',
    'Rufen Sie die Gewinn-Hotline an und sprechen Sie die richtige Lösung (A oder B) auf.',
    'Richtig geantwortet? Dann sind Sie bei der Verlosung des Tagespreises dabei.',
  ],
  hinweis: { titel: 'Supermittwoch', text: 'Jeden Mittwoch verlosen wir 1.000 € statt 500 €.' },
  bilder: MUSTER.flatMap((m) => [`spiele/fehlerjagd/${m.bild}_original.jpg`, `spiele/fehlerjagd/${m.bild}_suchbild.jpg`]),
  musterInhalte(monat: string): Inhalt[] {
    return spieltage(monat).map((t) => {
      const m = MUSTER[(t.tag - 1) % MUSTER.length]
      const richtigOben = t.tag % 2 === 1
      return {
        tag: t.tag,
        datum: t.datum,
        label: t.label,
        frage: 'Wie viele Unterschiede hat das rechte Bild?',
        a1: richtigOben ? m.richtig : m.falsch,
        a2: richtigOben ? m.falsch : m.richtig,
        richtig: richtigOben ? 1 : 2,
        daten: { original: `spiele/fehlerjagd/${m.bild}_original.jpg`, suchbild: `spiele/fehlerjagd/${m.bild}_suchbild.jpg` },
        muster: true,
      }
    })
  },
  raetsel({ inhalt, box, pfad, akzent }) {
    const d = (inhalt.daten ?? {}) as { original?: string; suchbild?: string }
    const gap = 14
    const w = Math.floor((box.w - gap) / 2)
    const h = box.h - 26
    const bild = (src: string | undefined, label: string) =>
      `<figure class="fj-f" style="width:${w}px;height:${box.h}px"><figcaption>${label}</figcaption>` +
      (src ? `<div class="fj-b" style="height:${h}px;background-image:url('${pfad(src)}')"></div>` : `<div class="fj-b fj-leer" style="height:${h}px">Bild folgt</div>`) +
      '</figure>'
    return {
      css: `.fj{display:flex;gap:${gap}px} .fj-f{margin:0} .fj-f figcaption{font-size:13px;font-weight:800;letter-spacing:2.5px;color:#666;height:22px}
.fj-b{width:100%;border-radius:10px;background-size:cover;background-position:center;border:3px solid ${akzent}}
.fj-leer{background:#FFE45C;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px}`,
      html: `<div class="fj">${bild(d.original, 'ORIGINAL')}${bild(d.suchbild, 'SUCHBILD')}</div>`,
    }
  },
  offen: [
    'Fehlerjagd: Mechanik laut Jenny/Yasmina (05.10.2026): EINE Hotline, zwei Lösungen vorgegeben, Anrufer spricht die richtige Lösung auf und hinterlässt seine Daten – von Andreas G. bestätigt.',
    'Optionale Spracherkennung (sofortiges Feedback, Verlage buchen sie gegen 0,01 € pro Anruf dazu) – betrifft nur die Hotline, nicht die Anzeige.',
  ]
}
