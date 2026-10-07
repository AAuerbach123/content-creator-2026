#!/usr/bin/env node
// Test für src/lib/serie/spiele/kreuzquer.ts (Kreuz & Quer April/Oktober, Gitterrätsel September):
// 1. Muster-Rätsel strukturell prüfen (Wörter beider Richtungen, Fragen/Pfeile, Lösungswort, Eindeutigkeit Gitter)
// 2. Rätselfeld in den Boxen der Familien A/B/C rendern: Mindest-Schrift Fragetext ≥ 11 px, nichts außerhalb der Box
// 3. Prüfseiten nach _pruef/<id>.html schreiben (wie scripts/serie-pruefseite.mjs)
// Aufruf: node scripts/_test_kreuzquer.mjs [Zeitungen=ta,sz,shz] [Tage=1,3] [Vorschläge=A,B,C] [Gewinner=1,4]

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tsLaden } from './lib/ts-laden.mjs'

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [zArg = 'ta,sz,shz', tArg = '1,3', vArg = 'A,B,C', gArg = '1,4'] = process.argv.slice(2)
const KQ = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/kreuzquer.ts'))
const R = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/rahmen.ts'))
const T = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/tnb.ts'))
const P = tsLaden(path.join(wurzel, 'src/lib/serie/pruefen.ts'))
const SPIELE = [KQ.kreuzQuerApril, KQ.kreuzQuerOktober, KQ.gitterraetsel]
let fehler = 0
const melde = (ok, text) => {
  console.log((ok ? 'OK   ' : 'FEHLER ') + text)
  if (!ok) fehler++
}

// 1. Muster
const mf = KQ.kreuzQuerMusterPruefen()
melde(mf.length === 0, 'Muster-Rätsel strukturell' + (mf.length ? ': ' + mf.join(' | ') : ''))

// 2. Rätselfeld in den Boxen (Werte aus rahmen.ts: A 880×640, B 560×700, C 884×640 abzüglich Kopf/Ränder)
const BOXEN = { A: { w: 836, h: 498 }, B: { w: 516, h: 558 }, C: { w: 840, h: 498 } }
const AKZENTE = ['#F2C14E', '#C8102E', '#004B87']
for (const spiel of SPIELE) {
  const inhalte = spiel.musterInhalte(spiel.monate[0])
  const muster = [...new Map(inhalte.map((i) => [i.loesung, i])).values()]
  melde(inhalte.length >= 26, `${spiel.id}: ${inhalte.length} Spieltage, ${muster.length} Muster rotierend`)
  if (spiel.antwort === 'zwei') {
    const ok = inhalte.every((i) => i.a1 && i.a2 && i.a1.length === i.a2.length && (i.richtig === 1 ? i.a1 : i.a2).toUpperCase() === i.loesung)
    const beide = new Set(inhalte.map((i) => i.richtig)).size === 2
    melde(ok && beide, `${spiel.id}: a1/a2 gleich lang, richtige Antwort = Lösungswort, wechselt zwischen 1 und 2`)
  }
  for (const [fam, box] of Object.entries(BOXEN)) {
    for (const inhalt of muster) {
      for (const akzent of AKZENTE) {
        const t = spiel.raetsel({ z: {}, inhalt, akzent, vorschlag: fam, box, pfad: (n) => n })
        const fs = [...t.html.matchAll(/class="kq-q card" style="[^"]*font-size:([\d.]+)px/g)].map((m) => +m[1])
        const minFs = fs.length ? Math.min(...fs) : null
        // äußere Kanten aller absolut gesetzten Elemente der obersten Ebene (Gitter, Leiste, Liste)
        let raus = []
        for (const m of t.html.matchAll(/class="(kq-g|kq-wl card|kq-lk|kq-lt)" style="left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px/g)) {
          const [, k, l, o, w, h] = m
          if (+l + +w > box.w || +o + +h > box.h) raus.push(`${k} ${+l + +w}×${+o + +h}`)
        }
        if (akzent === AKZENTE[0])
          melde(
            (minFs === null || minFs >= 11) && !raus.length,
            `${spiel.id} ${fam} ${inhalt.loesung}: ` + (minFs === null ? 'Gitter' : `Fragetext min. ${minFs} px`) + (raus.length ? ' – ÜBERLAUF ' + raus.join(', ') : ', passt in ' + box.w + '×' + box.h),
          )
      }
    }
  }
}

// 3. Prüfseiten
const daten = JSON.parse(fs.readFileSync(path.join(wurzel, 'public/serie/zeitungen.json'), 'utf8'))
const assets = path.join(wurzel, 'public/serie/assets')
const MIME = { '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf' }
const cache = new Map()
const pfad = (n) => {
  if (!cache.has(n)) {
    const p = path.join(assets, n)
    cache.set(n, fs.existsSync(p) ? `data:${MIME[path.extname(n)]};base64,` + fs.readFileSync(p).toString('base64') : 'FEHLT:' + n)
  }
  return cache.get(n)
}
const zeit = zArg === 'alle' ? daten.zeitungen : daten.zeitungen.filter((z) => zArg.split(',').includes(z.id))
// Mechanik 'geldpakete' (Kreuz & Quer April) darf keinen Vorzählfaktor-Text enthalten (Jenny/Yasmina 07.10.2026)
for (const spiel of SPIELE) {
  const tnb = T.spielTnb(spiel, daten, zeit[0] ?? daten.zeitungen[0], spiel.monate[0])
  for (const vorz of P.pruefeKeinVorzaehlfaktor(spiel.mechanik.art, tnb)) melde(false, spiel.id + ': ' + vorz)
  if (spiel.mechanik.art === 'geldpakete')
    melde(tnb.includes('Vor Spielbeginn wurden für alle Gewinne Zeitfenster'), spiel.id + ': Zeitfenster-Satz in Teilnahmebedingungen (06.10.2026)')
}
for (const spiel of SPIELE) {
  const monat = spiel.monate[0]
  const inhalte = spiel.musterInhalte(monat).filter((i) => tArg === 'alle' || tArg.split(',').includes(String(i.tag)))
  const liste = []
  for (const v of vArg.split(',')) for (const z of zeit) for (const inhalt of inhalte) for (const g of gArg.split(',').map(Number))
    liste.push({ spiel, daten, z, inhalt, vorschlag: v, gewinner: g, monat, pfad })
  // Keine Schatten/Filter in der einzelnen Anzeige (Regel 06.10.2026)
  if (liste.length) for (const err of P.pruefeKeineSchatten(R.spielSeite(liste[0]))) melde(false, spiel.id + ': ' + err)
  const ziel = path.join(wurzel, '_pruef', `${spiel.id}.html`)
  fs.mkdirSync(path.dirname(ziel), { recursive: true })
  fs.writeFileSync(ziel, R.spielPruefseite(liste, pfad))
  // Detailseite mit wenigen Anzeigen (je Familie eine)
  const detail = ['A', 'B', 'C'].map((v, i) => ({ spiel, daten, z: zeit[i % zeit.length], inhalt: inhalte[i % inhalte.length], vorschlag: v, gewinner: i === 1 ? 4 : 1, monat, pfad }))
  fs.writeFileSync(path.join(wurzel, '_pruef', `${spiel.id}_detail.html`), R.spielPruefseite(detail, pfad))
  console.log(`${liste.length} Anzeigen → ${ziel}`)
}
const fehlend = [...cache.keys()].filter((k) => cache.get(k).startsWith('FEHLT:'))
if (fehlend.length) console.log('FEHLENDE BILDER: ' + fehlend.join(', '))
console.log(fehler ? `${fehler} FEHLER` : 'ALLES OK')
process.exit(fehler ? 1 : 0)
