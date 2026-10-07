#!/usr/bin/env node
// Test für src/lib/serie/spiele/fehlerjagd.ts: Muster-Inhalte, Prüfseite + Prüfungen (Schatten/Filter, kein
// Vorzählfaktor-Text ist nicht nötig weil tagespreis, aber die Schatten-Prüfung läuft).
// Aufruf: node scripts/_test_fehlerjagd.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tsLaden } from './lib/ts-laden.mjs'

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/fehlerjagd.ts')).fehlerjagd
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

let fehler = 0
const pruefe = (ok, text) => { if (!ok) { fehler++; console.error('FEHLER: ' + text) } }

const monat = F.monate[0]
const inhalte = F.musterInhalte(monat)
pruefe(inhalte.length >= 20, `fehlerjagd: zu wenige Spieltage (${inhalte.length})`)
pruefe(F.mechanik.art === 'tagespreis', 'fehlerjagd: Mechanik ≠ tagespreis')
pruefe(F.antwort === 'ansagen', 'fehlerjagd: Antwortart ≠ ansagen')
for (const b of F.bilder ?? []) pruefe(fs.existsSync(path.join(assets, b)), 'fehlerjagd: Bild fehlt ' + b)

const zeit = daten.zeitungen.filter((z) => ['ta', 'sz', 'shz', 'schwabo', 'swp'].includes(z.id))
const tage = inhalte.filter((i) => [1, 2].includes(i.tag))
const liste = []
for (const v of ['A', 'B', 'C']) for (const z of zeit) for (const inhalt of tage) for (const g of [1, 4])
  liste.push({ spiel: F, daten, z, inhalt, vorschlag: v, gewinner: g, monat, pfad })
// Keine Schatten/Filter + kein Vorzählfaktor bei Zeitschienen (hier tagespreis, also nur Schatten)
for (const err of P.pruefeKeineSchatten(R.spielSeite(liste[0]))) pruefe(false, 'fehlerjagd: ' + err)
for (const err of P.pruefeKeinVorzaehlfaktor(F.mechanik.art, T.spielTnb(F, daten, zeit[0], monat))) pruefe(false, 'fehlerjagd: ' + err)
const ziel = path.join(wurzel, '_pruef', 'fehlerjagd.html')
fs.mkdirSync(path.dirname(ziel), { recursive: true })
fs.writeFileSync(ziel, R.spielPruefseite(liste, pfad))
console.log(`fehlerjagd: ${liste.length} Anzeigen → _pruef/fehlerjagd.html`)
const fehlend = [...cache.keys()].filter((k) => cache.get(k).startsWith('FEHLT:'))
if (fehlend.length) console.log('FEHLENDE BILDER: ' + fehlend.join(', '))
console.log(fehler ? `${fehler} FEHLER` : 'ALLE PRÜFUNGEN OK')
process.exit(fehler ? 1 : 0)
