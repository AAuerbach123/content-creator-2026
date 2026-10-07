// Juli 2027 (RSP): vier Spielwochen – täglich Tagespreis 500 € + Jackpot im geheimen Zeitfenster.
//   1. Woche 01.–11.07. Sommer-Postkarte (Jackpot 1.000 €) · 2. Woche 12.–18.07. Wahr oder erfunden? (2.000 €)
//   3. Woche 19.–25.07. Sprichwort-Rätsel (3.000 €)       · 4. Woche 26.–31.07. Schattenrätsel (5.000 €)
// Eine Hotline + Endziffer 1/2 (Antwortart 'zwei'). Texte/Mechanik aus jul_build.py (Juli-Dummies).
// Muster-Rätsel und Lösungen: BILDER_MIT_CHATGPT.md, Spielkonzepte_2027.md, online_portal/OFFENE_PUNKTE.md –
// nichts darüber hinaus erfunden. Gibt es nur ein bis zwei Muster, wiederholen sie sich in der Woche.

import { spieltage } from './kalender'
import type { Box, Inhalt, SpielDef, Teil } from './typen'

// ------------------------------------------------------------------ gemeinsame Bausteine
type Woche = { nr: number; von: number; bis: number; jackpot: string }

const WOCHE_1: Woche = { nr: 1, von: 1, bis: 11, jackpot: '1.000 €' }
const WOCHE_2: Woche = { nr: 2, von: 12, bis: 18, jackpot: '2.000 €' }
const WOCHE_3: Woche = { nr: 3, von: 19, bis: 25, jackpot: '3.000 €' }
const WOCHE_4: Woche = { nr: 4, von: 26, bis: 31, jackpot: '5.000 €' }

const pad = (n: number) => String(n).padStart(2, '0')

/** Aktionszeitraum einer Spielwoche als TT.MM.JJJJ (für die Teilnahmebedingungen) */
function wochenZeitraum(monat: string, w: Woche): { von: string; bis: string } {
  const [j, m] = monat.split('-')
  return { von: `${pad(w.von)}.${m}.${j}`, bis: `${pad(w.bis)}.${m}.${j}` }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const MECHANIK = { art: 'jackpot', tagespreis: '500 €' } as const

const UNTERZEILE = 'Täglich <b>{TAGESPREIS}</b> gewinnen – plus Jackpot!'

// „So einfach geht's“ – gekürzt aus jul_build.py schritte()
const SCHRITTE = [
  'Rätsel lösen und Antwort wählen.',
  'Die Hotline mit der <b>Endziffer Ihrer Antwort</b> anrufen (1 oder 2).',
  'Richtig? Dann sind Sie bei der Verlosung der 500 € dabei – und im geheimen Zeitfenster winkt der Jackpot.',
]

// Jackpot-Zeitfenster – gekürzt aus jul_build.py UHR (Stern verweist auf den Jackpot-Satz in den TNB)
const HINWEIS = {
  titel: 'Das Glück hat ein Zeitfenster',
  text: 'Einmal täglich öffnet sich für den Jackpot ein geheimes Zeitfenster (00:00–23:59 Uhr)*. Wer darin als Erster richtig anruft, gewinnt ihn sofort.',
}

const OFFEN_GEMEINSAM = [
  'Juli: Jackpot-Satz in den Teilnahmebedingungen und Hinweis „Wer darin als Erster richtig anruft, gewinnt ihn sofort“ (aus den Juli-Dummies) rechtlich prüfen – Gewinnermittlung Jackpot (erster richtiger Anruf im Zeitfenster) mit der TNB-Formulierung „per Zufall“ abgleichen.',
  'Juli: Spieltage je Woche ab 1 nummeriert. Wochen laut Jenny (05.10.2026): 01.–11., 12.–18., 19.–25., 26.–31.07. – jede Woche endet am Sonntag, Wochenenden bleiben zusammen.',
  'Juli: Feiertage werden nicht herausgenommen (wie kalender.ts).',
  'Juli: Musterbilder sind KI-generiert (Präsentation/ChatGPT) – echte Tagesinhalte (ein Bild + Lösung je Spieltag) fehlen noch.',
]

type Muster = { bild: string; richtig: string; falsch: string }

/** Spieltage der Woche; richtige Antwort abwechselnd auf 1 und 2, Muster rotieren. */
function wochenInhalte(
  monat: string,
  w: Woche,
  frage: string,
  muster: Muster[],
  daten: (m: Muster) => Record<string, unknown>,
): Inhalt[] {
  return spieltage(monat, w.von, w.bis).map((t) => {
    const m = muster[(t.tag - 1) % muster.length]
    const richtigOben = t.tag % 2 === 1
    return {
      tag: t.tag,
      datum: t.datum,
      label: t.label,
      frage,
      a1: richtigOben ? m.richtig : m.falsch,
      a2: richtigOben ? m.falsch : m.richtig,
      richtig: richtigOben ? 1 : 2,
      daten: daten(m),
      jackpot: w.jackpot,
      muster: true,
    }
  })
}

/** Halbtransparente Tönung der Akzentfarbe (nur für #RRGGBB, sonst neutrales Grau) */
function toenung(akzent: string, alpha: string): string {
  return /^#[0-9a-f]{6}$/i.test(akzent) ? akzent + alpha : '#F2F2F2'
}

/** Schätzt die größte Schriftgröße, mit der ein Text in w × h passt (grober Wortumbruch, eher vorsichtig). */
function passendeGroesse(text: string, w: number, h: number, max: number, min: number): number {
  const woerter = text.split(/\s+/).filter(Boolean)
  for (let fs = max; fs > min; fs -= 2) {
    const proZeile = Math.max(1, Math.floor(w / (fs * 0.6)))
    let zeilen = 1
    let laenge = 0
    for (const wort of woerter) {
      const l = wort.length
      if (laenge === 0) laenge = l
      else if (laenge + 1 + l <= proZeile) laenge += 1 + l
      else {
        zeilen++
        laenge = l
      }
      if (l > proZeile) zeilen += Math.floor(l / proZeile)
    }
    if (zeilen * fs * 1.2 <= h) return fs
  }
  return min
}

function leer(box: Box): string {
  return `<div class="jl-leer" style="width:${box.w}px;height:${box.h}px">Bild folgt</div>`
}

const CSS_GEMEINSAM = `.jl-leer{background:#FFE45C;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;border-radius:10px}
.jl-ein{position:relative;overflow:hidden;border-radius:10px}
.jl-ein>div{position:absolute;left:0;top:0;width:100%;height:100%;background-position:center 45%;background-size:cover;background-repeat:no-repeat}`

/** Bild füllt die Box vollständig (cover, Andreas 05.10.: keine grauen Streifen). Lösungsrelevante Bildteile
 *  müssen deshalb in der Bildmitte liegen – beim Bildauftrag (ChatGPT) Motiv mittig und mit Rand anlegen. */
function bildEingepasst(url: string, box: Box, oben: string, unten: string): string {
  return (
    `<div class="jl-ein" style="width:${box.w}px;height:${box.h}px;background:linear-gradient(180deg,${oben},${unten})">` +
    `<div style="background-image:url('${url}')"></div></div>`
  )
}

// ------------------------------------------------------------------ 1. Woche: Sommer-Postkarte
// Muster: Venedig ✔ / Verona (Spielkonzepte_2027.md, Muster-Anzeige 08). postkarte_1.png (Lissabon) und
// postkarte_2.png (Prag) aus BILDER_MIT_CHATGPT.md liegen noch nicht vor.
const POSTKARTE: Muster[] = [{ bild: 'spiele/sommer-postkarte/muster1.jpg', richtig: 'Venedig', falsch: 'Verona' }]

export const sommerPostkarte: SpielDef = {
  id: 'sommer-postkarte',
  name: 'Sommer-Postkarte',
  titel: 'Sommer-Postkarte',
  unterzeile: UNTERZEILE,
  monate: ['2027-07'],
  modell: 'RSP',
  beschreibung: '1. Juli-Woche (01.–11.07.): Aus welcher Stadt kommt die Postkarte? Tagespreis 500 € + Jackpot 1.000 € täglich.',
  mechanik: MECHANIK,
  antwort: 'zwei',
  schritte: SCHRITTE,
  hinweis: HINWEIS,
  bilder: POSTKARTE.map((m) => m.bild),
  zeitraum: (monat) => wochenZeitraum(monat, WOCHE_1),
  musterInhalte: (monat) =>
    wochenInhalte(monat, WOCHE_1, 'Aus welcher Stadt kommt die Postkarte?', POSTKARTE, (m) => ({ bild: m.bild, pos: '50% 30%' })),
  raetsel({ inhalt, box, pfad }): Teil {
    const d = (inhalt.daten ?? {}) as { bild?: string; pos?: string }
    const p = 12 // weißer Kartenrand
    const rand = 2 // Rahmenlinie 1,5 px je Seite (box-sizing: border-box) – aufgerundet
    const iw = box.w - 2 * p - 2 * rand
    const ih = box.h - 2 * p - 2 * rand
    const bw = Math.min(Math.round(ih * 0.75), Math.round(iw * 0.62)) // Bildseite (Hochformat)
    const gap = 18
    const rw = iw - bw - gap // „Rückseite“ mit Marke, Gruß, Adresszeilen
    const schmal = rw < 260
    const mw = schmal ? 92 : 118
    const mh = schmal ? 108 : 138
    const gruss = schmal ? 28 : 44
    const zeilen = schmal ? 3 : 4
    const bild = d.bild
      ? `<div class="pk-bild" style="width:${bw}px;height:${ih}px;background-image:url('${pfad(d.bild)}');background-position:${esc(d.pos ?? '50% 40%')}"></div>`
      : leer({ w: bw, h: ih })
    const stempel = schmal
      ? ''
      : `<div class="pk-stempel"><span>JULI</span><b>2027</b></div>`
    const marke =
      `<div class="pk-marke" style="width:${mw}px;height:${mh}px"><div class="pk-motiv">` +
      `<div class="pk-sonne" style="width:${Math.round(mw * 0.36)}px;height:${Math.round(mw * 0.36)}px"></div>` +
      `<div class="pk-wert" style="font-size:${schmal ? 13 : 16}px">2027</div></div></div>`
    const linien = Array.from({ length: zeilen }, () => '<div class="pk-linie"></div>').join('')
    return {
      css:
        CSS_GEMEINSAM +
        `
.pk{background:#fff;border:1.5px solid #DADDE2;border-radius:6px;display:flex;overflow:hidden}
.pk-bild{background-size:cover;background-repeat:no-repeat;border-radius:3px;flex:none}
.pk-rueck{flex:none;display:flex;flex-direction:column;justify-content:space-between;border-left:2px solid #E3E5E8;overflow:hidden}
.pk-kopf{display:flex;justify-content:space-between;align-items:flex-start}
.pk-marke{flex:none;margin-left:auto;background:#fff;border:4px dotted #C9CDD3;padding:4px;margin:4px 5px 0 0;transform:rotate(3deg)}
.pk-motiv{width:100%;height:100%;background:linear-gradient(180deg,#8FD3F4 0%,#5BB4E5 58%,#1E88C7 58%,#155E8C 100%);position:relative;overflow:hidden}
.pk-sonne{position:absolute;left:50%;top:16%;transform:translateX(-50%);border-radius:50%;background:#FFD54A;border:4px solid rgba(255,213,74,.35)}
.pk-wert{position:absolute;right:5px;bottom:3px;color:#fff;font-weight:800}
.pk-stempel{width:104px;height:104px;border:3px solid #6B7280;border-radius:50%;color:#6B7280;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-14deg);margin:14px 0 0 6px;font-weight:800;letter-spacing:2px;line-height:1.1}
.pk-stempel span{font-size:15px} .pk-stempel b{font-size:22px}
.pk-gruss{font-family:"Snell Roundhand","Brush Script MT","Segoe Script","Apple Chancery",cursive;color:#1F3A8A;line-height:1.1}
.pk-linie{height:2px;background:#C9CDD3;margin-top:${schmal ? 26 : 34}px}`,
      html:
        `<div class="pk" style="width:${box.w}px;height:${box.h}px;padding:${p}px;gap:${gap}px">${bild}` +
        `<div class="pk-rueck" style="width:${rw}px;height:${ih}px;padding-left:${Math.round(gap / 2)}px">` +
        `<div class="pk-kopf">${stempel}${marke}</div>` +
        `<div class="pk-gruss" style="font-size:${gruss}px">Viele Grüße aus …?</div>` +
        `<div class="pk-adr">${linien}</div></div></div>`,
    }
  },
  offen: [
    ...OFFEN_GEMEINSAM,
    'Sommer-Postkarte: nur ein Muster vorhanden (Venedig ✔ / Verona, Spielkonzepte_2027.md) – es wiederholt sich jeden Spieltag. postkarte_1.png (Lissabon/Porto) und postkarte_2.png (Prag/Budapest) laut BILDER_MIT_CHATGPT.md noch erstellen.',
    'Sommer-Postkarte: Handschrift-Schrift („Viele Grüße aus …?“) nutzt Systemschriften (Snell Roundhand/Brush Script) – beim Server-PDF ggf. Ersatzschrift.',
  ],
}

// ------------------------------------------------------------------ 2. Woche: Wahr oder erfunden?
// Muster aus BILDER_MIT_CHATGPT.md: Oktopus (wahr) und Honig (erfunden). Antworten fest: 1 = Wahr, 2 = Erfunden –
// durch die beiden Muster liegt die richtige Antwort abwechselnd auf 1 und 2.
const WAHR = [
  { bild: 'spiele/wahr-oder-erfunden/muster1.jpg', behauptung: 'Ein Oktopus hat drei Herzen.', richtig: 1 as const },
  { bild: 'spiele/wahr-oder-erfunden/muster2.jpg', behauptung: 'Honig verdirbt nach spätestens fünf Jahren.', richtig: 2 as const },
]

export const wahrOderErfunden: SpielDef = {
  id: 'wahr-oder-erfunden',
  name: 'Wahr oder erfunden?',
  titel: 'Wahr oder erfunden?',
  unterzeile: UNTERZEILE,
  monate: ['2027-07'],
  modell: 'RSP',
  beschreibung: '2. Juli-Woche (12.–18.07.): Eine Behauptung mit Bild – stimmt sie oder ist sie erfunden? Tagespreis 500 € + Jackpot 2.000 € täglich.',
  mechanik: MECHANIK,
  antwort: 'zwei',
  schritte: SCHRITTE,
  hinweis: HINWEIS,
  bilder: WAHR.map((m) => m.bild),
  zeitraum: (monat) => wochenZeitraum(monat, WOCHE_2),
  musterInhalte(monat: string): Inhalt[] {
    return spieltage(monat, WOCHE_2.von, WOCHE_2.bis).map((t) => {
      const m = WAHR[(t.tag - 1) % WAHR.length]
      return {
        tag: t.tag,
        datum: t.datum,
        label: t.label,
        frage: 'Stimmt diese Behauptung – oder ist sie erfunden?',
        a1: 'Wahr',
        a2: 'Erfunden',
        richtig: m.richtig,
        daten: { bild: m.bild, behauptung: m.behauptung },
        jackpot: WOCHE_2.jackpot,
        muster: true,
      }
    })
  },
  raetsel({ inhalt, box, pfad, akzent }): Teil {
    const d = (inhalt.daten ?? {}) as { bild?: string; behauptung?: string }
    const quer = box.w / box.h > 1.2
    const gap = 14
    // Querformat: Bild links, Behauptung rechts · Hochformat: Bild oben, Behauptung unten
    const bild: Box = quer ? { w: Math.round(box.w * 0.4), h: box.h } : { w: box.w, h: Math.round(box.h * 0.46) }
    const feld: Box = quer ? { w: box.w - bild.w - gap, h: box.h } : { w: box.w, h: box.h - bild.h - gap }
    const pad = 22
    const kopf = 30
    const text = d.behauptung ? `„${d.behauptung}“` : ''
    const fs = passendeGroesse(text, feld.w - 2 * pad - 8, feld.h - 2 * pad - kopf, quer ? 50 : 40, 18)
    const bildHtml = d.bild
      ? `<div class="we-bild" style="width:${bild.w}px;height:${bild.h}px;background-image:url('${pfad(d.bild)}')"></div>`
      : leer(bild)
    const behauptung = d.behauptung
      ? `<div class="we-zitat" style="font-size:${fs}px">„${esc(d.behauptung)}“</div>`
      : '<div class="we-zitat jl-leer" style="font-size:20px">Behauptung folgt</div>'
    return {
      css:
        CSS_GEMEINSAM +
        `
.we{display:flex}
.we-bild{flex:none;border-radius:10px;background-size:cover;background-position:50% 40%;background-repeat:no-repeat}
.we-feld{flex:none;border-radius:10px;display:flex;flex-direction:column;justify-content:center;overflow:hidden}
.we-kick{font-size:14px;font-weight:800;letter-spacing:3px;color:#555;height:30px}
.we-zitat{font-weight:800;line-height:1.2;color:#1d1d1f;overflow-wrap:break-word}`,
      html:
        `<div class="we" style="width:${box.w}px;height:${box.h}px;gap:${gap}px;flex-direction:${quer ? 'row' : 'column'}">${bildHtml}` +
        `<div class="we-feld" style="width:${feld.w}px;height:${feld.h}px;padding:${pad}px;background:${toenung(akzent, '1F')};border-left:6px solid ${akzent}">` +
        `<div class="we-kick">BEHAUPTUNG DES TAGES</div>${behauptung}</div></div>`,
    }
  },
  offen: [
    ...OFFEN_GEMEINSAM,
    'Wahr oder erfunden?: zwei Muster aus BILDER_MIT_CHATGPT.md („Ein Oktopus hat drei Herzen.“ = wahr, „Honig verdirbt nach spätestens fünf Jahren.“ = erfunden) wechseln sich ab; Antworten fest 1 = Wahr, 2 = Erfunden.',
    'Wahr oder erfunden?: Behauptungen der echten Spieltage brauchen eine Quelle (Faktencheck) – Schriftgröße passt sich der Textlänge an.',
  ],
}

// ------------------------------------------------------------------ 3. Woche: Sprichwort-Rätsel
// Muster aus BILDER_MIT_CHATGPT.md / Spielkonzepte_2027.md. oben/unten = Randfarben des Bildes (Hintergrund bei „contain“).
const SPRICHWORT: (Muster & { oben: string; unten: string })[] = [
  { bild: 'spiele/sprichwort-raetsel/muster1.jpg', richtig: 'Die Katze im Sack kaufen', falsch: 'Die Katze aus dem Sack lassen', oben: '#4D3F35', unten: '#64391F' },
  { bild: 'spiele/sprichwort-raetsel/muster2.jpg', richtig: 'Tomaten auf den Augen haben', falsch: 'Einen Kater haben', oben: '#848981', unten: '#B5A8A2' },
]

function eingepasstRaetsel({ inhalt, box, pfad }: { inhalt: Inhalt; box: Box; pfad: (n: string) => string }): Teil {
  const d = (inhalt.daten ?? {}) as { bild?: string; oben?: string; unten?: string }
  const farbe = (f: string | undefined) => (f && /^#[0-9a-f]{3,8}$/i.test(f) ? f : '#2B2B2B')
  return {
    css: CSS_GEMEINSAM,
    html: d.bild ? bildEingepasst(pfad(d.bild), box, farbe(d.oben), farbe(d.unten)) : leer(box),
  }
}

export const sprichwortRaetsel: SpielDef = {
  id: 'sprichwort-raetsel',
  name: 'Sprichwort-Rätsel',
  titel: 'Sprichwort-Rätsel',
  unterzeile: UNTERZEILE,
  monate: ['2027-07'],
  modell: 'RSP',
  beschreibung: '3. Juli-Woche (19.–25.07.): Ein Bild stellt ein Sprichwort dar – welches? Tagespreis 500 € + Jackpot 3.000 € täglich.',
  mechanik: MECHANIK,
  antwort: 'zwei',
  schritte: SCHRITTE,
  hinweis: HINWEIS,
  bilder: SPRICHWORT.map((m) => m.bild),
  zeitraum: (monat) => wochenZeitraum(monat, WOCHE_3),
  musterInhalte: (monat) =>
    wochenInhalte(monat, WOCHE_3, 'Welches Sprichwort ist hier dargestellt?', SPRICHWORT, (m) => {
      const s = m as (typeof SPRICHWORT)[number]
      return { bild: s.bild, oben: s.oben, unten: s.unten }
    }),
  raetsel: (ctx) => eingepasstRaetsel(ctx),
  offen: [
    ...OFFEN_GEMEINSAM,
    'Sprichwort-Rätsel: zwei Muster aus BILDER_MIT_CHATGPT.md (Katze im Sack kaufen ✔ / Katze aus dem Sack lassen; Tomaten auf den Augen haben ✔ / Einen Kater haben) wechseln sich ab.',
  ],
}

// ------------------------------------------------------------------ 4. Woche: Schattenrätsel
// Muster 1 = schatten_1.png/schatten.jpg: Leuchtturm-Schatten auf dem Meer (Lösung: online_portal/OFFENE_PUNKTE.md,
// build_ads_neu.py – Ein Leuchtturm ✔ / Ein Kirchturm). Muster 2 = schatten_2.png: Windmühle ✔ / Kirchturm.
const SCHATTEN: (Muster & { oben: string; unten: string })[] = [
  { bild: 'spiele/schattenraetsel/muster1.jpg', richtig: 'Ein Leuchtturm', falsch: 'Ein Kirchturm', oben: '#487A8D', unten: '#204954' },
  { bild: 'spiele/schattenraetsel/muster2.jpg', richtig: 'Eine Windmühle', falsch: 'Ein Kirchturm', oben: '#998F91', unten: '#543312' },
]

export const schattenraetsel: SpielDef = {
  id: 'schattenraetsel',
  name: 'Schattenrätsel',
  titel: 'Schatten&shy;rätsel',
  unterzeile: UNTERZEILE,
  monate: ['2027-07'],
  modell: 'RSP',
  beschreibung: '4. Juli-Woche (26.–31.07.): Nur der Schatten ist zu sehen – wer wirft ihn? Tagespreis 500 € + Jackpot 5.000 € täglich.',
  mechanik: MECHANIK,
  antwort: 'zwei',
  schritte: SCHRITTE,
  hinweis: HINWEIS,
  bilder: SCHATTEN.map((m) => m.bild),
  zeitraum: (monat) => wochenZeitraum(monat, WOCHE_4),
  musterInhalte: (monat) =>
    wochenInhalte(monat, WOCHE_4, 'Wer wirft hier den Schatten?', SCHATTEN, (m) => {
      const s = m as (typeof SCHATTEN)[number]
      return { bild: s.bild, oben: s.oben, unten: s.unten }
    }),
  raetsel: (ctx) => eingepasstRaetsel(ctx),
  offen: [
    ...OFFEN_GEMEINSAM,
    'Schattenrätsel: Muster 1 (Leuchtturm-Schatten auf dem Meer) – BILDER_MIT_CHATGPT.md beschreibt schatten_1.png noch als Giraffe/Kamel, die Datei zeigt aber den Leuchtturm; Lösung „Ein Leuchtturm“ laut online_portal/OFFENE_PUNKTE.md. Bitte bestätigen.',
    'Schattenrätsel: Muster 2 (Windmühle ✔ / Kirchturm) aus BILDER_MIT_CHATGPT.md.',
  ],
}
