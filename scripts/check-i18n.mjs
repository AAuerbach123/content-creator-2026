#!/usr/bin/env node
// Prüfskript: DE/EN-Parität im zentralen Wörterbuch.
// Prüft, dass jeder Schlüssel in `src/lib/i18n.ts` **beide** Sprachen hat
// (de + en) und der EN-Wert nicht leer ist.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const wurzel = path.resolve(__dirname, '..')

const p = path.join(wurzel, 'src/lib/i18n.ts')
const text = fs.readFileSync(p, 'utf8')

// Grobe Extraktion: jeder Block `KEY: { de: '…', en: '…' }` (auch mit `\n`).
// Wir lesen alle Schlüssel-Bezeichnungen und prüfen, ob der Block beide
// Sprachen enthält.
const re = /(^|\n)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*\{\s*([\s\S]*?)\},?/g
const fehler = []
const gezaehlt = { total: 0, deLeer: 0, enLeer: 0, deFehlt: 0, enFehlt: 0 }
let m
while ((m = re.exec(text))) {
  const key = m[2]
  const block = m[3]
  // ausschließen: dict, Woerterbuch, satisfies etc.
  if (['dict', 'Woerterbuch'].includes(key)) continue
  // muss `de: …` und `en: …` haben
  const hatDe = /\bde\s*:\s*['"`]([\s\S]*?)['"`]/.exec(block)
  const hatEn = /\ben\s*:\s*['"`]([\s\S]*?)['"`]/.exec(block)
  if (!hatDe && !hatEn) continue // gar kein Sprach-Block → z. B. typ-Objekt
  gezaehlt.total += 1
  if (!hatDe) { gezaehlt.deFehlt++; fehler.push(`${key}: DE fehlt`) }
  else if (!hatDe[1].trim()) { gezaehlt.deLeer++; fehler.push(`${key}: DE ist leer`) }
  if (!hatEn) { gezaehlt.enFehlt++; fehler.push(`${key}: EN fehlt`) }
  else if (!hatEn[1].trim()) { gezaehlt.enLeer++; fehler.push(`${key}: EN ist leer`) }
}

console.log('i18n-Parität')
console.log('============')
console.log(`Schlüssel geprüft: ${gezaehlt.total}`)
if (fehler.length) {
  console.log(`Fehler:            ${fehler.length}`)
  for (const f of fehler) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('\n✓ Alle DE/EN-Paare vorhanden.')
