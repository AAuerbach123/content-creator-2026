#!/usr/bin/env node
// Test der Juli-Spiele (juli.ts, noch nicht im Katalog registriert): lädt juli.ts direkt und schreibt
// je Spiel eine Prüfseite nach _pruef/<id>.html (Zeitungen ta,sz,shz · Spieltage 1,2 · A,B,C · 1 und 4 Gewinner).
// Zusätzlich einfache Datenprüfungen (Zeitraum, Spieltage, Jackpot, Antworten, Bilder).
// Aufruf: node scripts/_test_juli.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tsLaden } from './lib/ts-laden.mjs'

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const J = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/juli.ts'))
const R = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/rahmen.ts'))
const T = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/tnb.ts'))
const P = tsLaden(path.join(wurzel, 'src/lib/serie/pruefen.ts'))
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

// Spielwochen Juli 2027 (Jenny/Yasmina 07.10.2026): 01.–11., 12.–18., 19.–25., 26.–31.07.
const ERWARTET = {
  'sommer-postkarte': ['01.07.2027', '11.07.2027', '1.000 €'],
  'wahr-oder-erfunden': ['12.07.2027', '18.07.2027', '2.000 €'],
  'sprichwort-raetsel': ['19.07.2027', '25.07.2027', '3.000 €'],
  schattenraetsel: ['26.07.2027', '31.07.2027', '5.000 €'],
}
const SPIELE = [J.sommerPostkarte, J.wahrOderErfunden, J.sprichwortRaetsel, J.schattenraetsel]
const fehler = []
const pruefe = (bed, text) => { if (!bed) fehler.push(text) }
const monat = '2027-07'
const zeit = daten.zeitungen.filter((z) => ['ta', 'sz', 'shz'].includes(z.id))
pruefe(zeit.length === 3, 'Zeitungen ta/sz/shz nicht vollständig gefunden: ' + zeit.map((z) => z.id).join(','))

for (const spiel of SPIELE) {
  const [von, bis, jp] = ERWARTET[spiel.id] ?? []
  pruefe(!!von, 'unerwartete id ' + spiel.id)
  pruefe(spiel.mechanik.art === 'jackpot' && spiel.mechanik.tagespreis === '500 €', spiel.id + ': Mechanik')
  pruefe(spiel.antwort === 'zwei' && spiel.modell === 'RSP' && spiel.monate.join() === monat, spiel.id + ': antwort/modell/monate')
  const zr = spiel.zeitraum(monat)
  pruefe(zr.von === von && zr.bis === bis, `${spiel.id}: Zeitraum ${zr.von}–${zr.bis}`)
  const tnb = T.spielTnb(spiel, daten, zeit[0], monat)
  pruefe(tnb.includes(`Aktionszeitraum vom ${von} bis ${bis}`), spiel.id + ': Aktionszeitraum fehlt in TNB')
  // Juli-Spiele (Mechanik 'jackpot') dürfen keinen Vorzählfaktor-Text enthalten (Jenny/Yasmina 07.10.2026)
  for (const vorz of P.pruefeKeinVorzaehlfaktor(spiel.mechanik.art, tnb)) pruefe(false, spiel.id + ': ' + vorz)
  const inh = spiel.musterInhalte(monat)
  const [, mm] = monat.split('-')
  const d0 = Number(von.slice(0, 2)), d1 = Number(bis.slice(0, 2))
  for (const i of inh) {
    const tagNr = Number(i.datum.slice(8, 10))
    pruefe(i.datum.slice(5, 7) === mm && tagNr >= d0 && tagNr <= d1, `${spiel.id} ST${i.tag}: Datum ${i.datum} außerhalb der Woche`)
    pruefe(i.jackpot === jp, `${spiel.id} ST${i.tag}: Jackpot ${i.jackpot}`)
    pruefe(i.muster === true && !!i.a1 && !!i.a2 && (i.richtig === 1 || i.richtig === 2), `${spiel.id} ST${i.tag}: a1/a2/richtig/muster`)
    pruefe(i.richtig === (i.tag % 2 === 1 ? 1 : 2), `${spiel.id} ST${i.tag}: richtige Antwort wechselt nicht 1/2`)
  }
  pruefe(inh.length > 0 && inh[0].tag === 1, spiel.id + ': Spieltage beginnen nicht bei 1')
  for (const b of spiel.bilder ?? []) pruefe(fs.existsSync(path.join(assets, b)), spiel.id + ': Bild fehlt ' + b)
  console.log(`${spiel.id}: ${inh.length} Spieltage (${inh[0].label} … ${inh[inh.length - 1].label}), Zeitraum ${zr.von}–${zr.bis}, Jackpot ${jp}`)

  // Prüfseite
  const liste = []
  const tage = inh.filter((i) => [1, 2].includes(i.tag))
  for (const v of ['A', 'B', 'C']) for (const z of zeit) for (const inhalt of tage) for (const g of [1, 4])
    liste.push({ spiel, daten, z, inhalt, vorschlag: v, gewinner: g, monat, pfad })
  const html = R.spielPruefseite(liste, pfad)
  const ziel = path.join(wurzel, '_pruef', `${spiel.id}.html`)
  fs.mkdirSync(path.dirname(ziel), { recursive: true })
  fs.writeFileSync(ziel, html)
  console.log(`  ${liste.length} Anzeigen → ${path.relative(wurzel, ziel)} (${Math.round(html.length / 1024)} KB)`)
}
const fehlend = [...cache.keys()].filter((k) => cache.get(k).startsWith('FEHLT:'))
if (fehlend.length) fehler.push('FEHLENDE BILDER: ' + fehlend.join(', '))
if (fehler.length) { console.error('FEHLER:\n  ' + fehler.join('\n  ')); process.exit(1) }
console.log('OK – alle Datenprüfungen bestanden.')
