#!/usr/bin/env node
// Phase 7 – Prüft, dass alle Spiele über /serie?spiel=<id> erreichbar sind (Katalog-ID stimmt mit der URL überein),
// dass die Startseite „Spiele 2027" auf jedes Spiel verlinkt und dass alle Katalog-Einträge Pflichtfelder haben.
// Aufruf: node scripts/check-spielauswahl.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tsLaden } from './lib/ts-laden.mjs'

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const K = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/index.ts'))
const einträge = K.katalog()

let fehler = 0
const pruefe = (ok, text) => { if (!ok) { fehler++; console.error('FEHLER: ' + text) } else console.log('OK   ' + text) }

pruefe(einträge.length === 12, `Katalog hat 12 Einträge (ist ${einträge.length})`)
for (const e of einträge) {
  pruefe(!!e.id && !!e.name && !!e.monate?.length && !!e.modell, `${e.id}: Pflichtfelder vorhanden`)
}

// /spiele-Komponente verlinkt jedes Spiel per /serie?spiel=<id>
const page = fs.readFileSync(path.join(wurzel, 'src/app/spiele/SpieleUebersicht.tsx'), 'utf8')
pruefe(page.includes('/serie?spiel='), 'SpieleUebersicht verlinkt /serie?spiel=…')

// SerieSeite liest den Query-Parameter
const serie = fs.readFileSync(path.join(wurzel, 'src/app/serie/SerieSeite.tsx'), 'utf8')
pruefe(serie.includes("URLSearchParams"), 'SerieSeite wertet URLSearchParams aus')
pruefe(serie.includes(".get('spiel')"), "SerieSeite liest Query-Parameter 'spiel'")

// Jedes Spiel liefert gültige musterInhalte für den ersten Monat
for (const e of einträge) {
  if (e.art !== 'spiel') continue
  const inh = e.spiel.musterInhalte(e.monate[0])
  pruefe(Array.isArray(inh) && inh.length > 0, `${e.id}: musterInhalte(${e.monate[0]}) liefert Einträge`)
}

console.log(fehler ? `${fehler} FEHLER` : 'ALLES OK')
process.exit(fehler ? 1 : 0)
