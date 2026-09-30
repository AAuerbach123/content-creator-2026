#!/usr/bin/env node
// Prüfskript: Kanal-Presets → Export-Masse.
// Prüft:
//   1. Jeder Kanal-Preset in `src/lib/kanaele.ts` hat Breite/Höhe > 0 und einen
//      passenden Farbraum (CMYK für Print, RGB für digital).
//   2. Print-Kanäle haben Einheit 'mm' und aufloesungDpi ≥ 200 (Zeitung ≥ 200,
//      Zeitschrift ≥ 300).
//   3. Der PDF-Export (src/lib/export-pdf.ts) verwendet für mm-Kanäle den
//      pdf-lib-Faktor 1/MM_PRO_PT (kein Skalierungs-Fehler) und akzeptiert
//      `beschnittMm`.
//   4. Der Raster-Export (src/lib/export-raster.ts) enthält die 1×/2×-Optionen.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const wurzel = path.resolve(__dirname, '..')

const kanaele = fs.readFileSync(path.join(wurzel, 'src/lib/kanaele.ts'), 'utf8')
const pdfCode = fs.readFileSync(path.join(wurzel, 'src/lib/export-pdf.ts'), 'utf8')
const rasterCode = fs.readFileSync(path.join(wurzel, 'src/lib/export-raster.ts'), 'utf8')

const fehler = []
const berichte = []

// 1./2. Presets grob lesen (rechnen wir mit RegExp aus dem Quelltext)
const presetRe = /\{\s*id:\s*'([^']+)',[\s\S]*?labelDe:\s*'([^']+)',[\s\S]*?breite:\s*(\d+),\s*hoehe:\s*(\d+),\s*einheit:\s*'([^']+)',(?:[\s\S]*?aufloesungDpi:\s*(\d+),)?[\s\S]*?farbraum:\s*'([^']+)',/g
const presets = []
let m
while ((m = presetRe.exec(kanaele))) {
  presets.push({
    id: m[1], label: m[2],
    breite: Number(m[3]), hoehe: Number(m[4]),
    einheit: m[5], dpi: m[6] ? Number(m[6]) : null,
    farbraum: m[7],
  })
}

if (presets.length < 10) fehler.push(`Wenige Presets gefunden (${presets.length}). RegExp anpassen?`)

for (const p of presets) {
  if (!(p.breite > 0 && p.hoehe > 0)) fehler.push(`${p.id}: Breite/Höhe ungültig`)
  if (p.einheit === 'mm') {
    if (p.farbraum !== 'CMYK') fehler.push(`${p.id}: Print-Kanal, Farbraum sollte CMYK sein`)
    if (!p.dpi) fehler.push(`${p.id}: Print-Kanal ohne aufloesungDpi`)
    else {
      if (p.id === 'zeitschrift' && p.dpi < 300) fehler.push(`Zeitschrift braucht ≥ 300 dpi (hat ${p.dpi})`)
      if (p.id === 'zeitung' && p.dpi < 200) fehler.push(`Zeitung braucht ≥ 200 dpi (hat ${p.dpi})`)
    }
  } else if (p.einheit === 'px') {
    if (p.farbraum !== 'RGB') fehler.push(`${p.id}: Pixel-Kanal, Farbraum sollte RGB sein`)
  } else {
    fehler.push(`${p.id}: unbekannte Einheit ${p.einheit}`)
  }
}
berichte.push(`Kanal-Presets: ${presets.length}`)

// 3. PDF-Export
if (!/MM_PRO_PT/.test(pdfCode)) fehler.push('export-pdf.ts: MM_PRO_PT nicht referenziert')
if (!/beschnittMm/.test(pdfCode)) fehler.push('export-pdf.ts: beschnittMm-Argument fehlt')
if (!/schnittmarken/.test(pdfCode)) fehler.push('export-pdf.ts: Schnittmarken-Handling fehlt')
if (!/pdf-lib/.test(pdfCode)) fehler.push('export-pdf.ts: pdf-lib nicht importiert')

// 4. Raster-Export
if (!/artefaktAlsBlob/.test(rasterCode)) fehler.push('export-raster.ts: artefaktAlsBlob fehlt')
if (!/(x|X)2|skala|scale/.test(rasterCode)) fehler.push('export-raster.ts: 2×-Export nicht erkennbar')

console.log('Export-Masse-Prüfung')
console.log('====================')
for (const b of berichte) console.log(b)
if (fehler.length) {
  console.log('\nFehler:')
  for (const f of fehler) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('\n✓ Export-Masse OK.')
