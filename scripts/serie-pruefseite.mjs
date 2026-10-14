#!/usr/bin/env node
// Erzeugt eine Prüfseite (viele Anzeigen eines Spiels, Bilder eingebettet, Prüftabelle oben) zur Sichtkontrolle.
// Aufruf: node scripts/serie-pruefseite.mjs <spielId> [Monat] [Zeitungen=alle|id,id] [Tage=1,2] [Vorschläge=A,B,C] [Gewinner=1,4] [Ziel.html]
// Beispiel: node scripts/serie-pruefseite.mjs fehlerjagd 2027-02 ta,sz,shz 1,3 A,B,C 1,4 _pruef/fehlerjagd.html

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tsLaden } from './lib/ts-laden.mjs'

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [spielId, monatArg, zArg = 'alle', tArg = '1', vArg = 'A,B,C', gArg = '1,4', zielArg] = process.argv.slice(2)
const K = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/index.ts'))
const R = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/rahmen.ts'))
const spiel = K.spielFinden(spielId)
if (!spiel) { console.error('Unbekanntes Spiel: ' + spielId + ' – vorhanden: ' + K.SPIELE.map((s) => s.id).join(', ')); process.exit(2) }
const monat = monatArg || spiel.monate[0]
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
const inhalte = spiel.musterInhalte(monat).filter((i) => tArg === 'alle' || tArg.split(',').includes(String(i.tag)))
const liste = []
for (const v of vArg.split(',')) for (const z of zeit) for (const inhalt of inhalte) for (const g of gArg.split(',').map(Number))
  liste.push({ spiel, daten, z, inhalt, vorschlag: v, gewinner: g, monat, pfad })
const html = R.spielPruefseite(liste, pfad)
const fehlend = [...cache.keys()].filter((k) => cache.get(k).startsWith('FEHLT:'))
const ziel = path.resolve(zielArg || path.join(wurzel, '_pruef', `${spielId}.html`))
fs.mkdirSync(path.dirname(ziel), { recursive: true })
fs.writeFileSync(ziel, html)
console.log(`${liste.length} Anzeigen → ${ziel}` + (fehlend.length ? `\nFEHLENDE BILDER: ${fehlend.join(', ')}` : ''))
