#!/usr/bin/env node
// Prüfskript: Rufnummern-Vollständigkeit + Konsistenz.
// Prüft:
//   1. Alle 46 Verlags-Presets aus verlage-presets.json sind einem Eintrag in
//      rufnummern.json zugeordnet.
//   2. Jeder Wissensquiz-Eintrag hat genau 5 Nummern (Endziffer 1..5).
//   3. Der Stamm passt zur Nummer (letzte Ziffer variiert).
//   4. Keine Muster-/Platzhalter-Nummern (z. B. „01379 4412…") kollidieren mit
//      echten Blöcken aus rufnummern.json — siehe check-musternummer.mjs.
//   5. Keine doppelten Nummern in verschiedenen Wissensquiz-Blöcken derselben
//      Zeitung.
//
// Aufruf: node scripts/check-rufnummern.mjs bzw. npm run check-rufnummern

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const wurzel = path.resolve(__dirname, '..')

const ruf = JSON.parse(fs.readFileSync(path.join(wurzel, 'public/rufnummern.json'), 'utf8'))
const presetsRoh = JSON.parse(fs.readFileSync(path.join(wurzel, 'public/verlage-presets.json'), 'utf8'))

// Preset-IDs sammeln (rekursiv aus verlage-presets.json)
const presetIds = new Set()
function walk(v) {
  if (Array.isArray(v)) { for (const x of v) walk(x); return }
  if (v && typeof v === 'object') {
    if (typeof v.id === 'string') presetIds.add(v.id)
    for (const k of Object.keys(v)) walk(v[k])
  }
}
walk(presetsRoh)

const fehler = []
const warnungen = []

// 1. Preset-Abdeckung
const verbunden = new Set()
for (const z of ruf.zeitungen) {
  for (const p of z.presetIds || []) verbunden.add(p)
}
for (const id of presetIds) {
  if (!verbunden.has(id)) fehler.push(`Preset ohne Rufnummer-Eintrag: ${id}`)
}

// 2. Wissensquiz je 5 Nummern; Stamm passt
for (const z of ruf.zeitungen) {
  const wq = z.wissensquiz
  if (!wq) { warnungen.push(`Kein Wissensquiz-Eintrag: ${z.zeitung}`); continue }
  if (!Array.isArray(wq.nummern) || wq.nummern.length !== 5) {
    fehler.push(`${z.zeitung}: Wissensquiz braucht 5 Nummern (hat ${wq.nummern?.length ?? 0}).`)
    continue
  }
  const stamm = (wq.stamm || '').replace(/[^0-9x]/gi, '').toLowerCase()
  const stammBase = stamm.replace(/x$/i, '')
  const endziffernSoll = ['1', '2', '3', '4', '5']
  wq.nummern.forEach((nummer, i) => {
    const digits = nummer.replace(/\D/g, '')
    if (!digits.startsWith(stammBase)) {
      fehler.push(`${z.zeitung}: Nummer ${nummer} passt nicht zum Stamm ${wq.stamm}.`)
    }
    const endziffer = digits.slice(-1)
    if (endziffer !== endziffernSoll[i]) {
      fehler.push(`${z.zeitung}: Nummer #${i + 1} sollte auf ${endziffernSoll[i]} enden, ist ${endziffer}.`)
    }
  })
}

// 3. Doppelte Nummern innerhalb einer Zeitung (Print vs. Web)
for (const z of ruf.zeitungen) {
  const alle = []
  if (z.wissensquiz?.nummern) alle.push(...z.wissensquiz.nummern)
  if (z.geldregen?.mwnPrint && !/^kein/i.test(z.geldregen.mwnPrint)) alle.push(z.geldregen.mwnPrint)
  if (z.geldregen?.mwnWeb && !/^kein/i.test(z.geldregen.mwnWeb)) alle.push(z.geldregen.mwnWeb)
  const cnt = new Map()
  for (const n of alle) cnt.set(n, (cnt.get(n) ?? 0) + 1)
  for (const [n, c] of cnt) if (c > 1) warnungen.push(`${z.zeitung}: Nummer ${n} taucht ${c}× auf`)
}

console.log('Rufnummern-Prüfung')
console.log('===================')
console.log(`Zeitungen:       ${ruf.zeitungen.length}`)
console.log(`Preset-IDs:      ${presetIds.size}`)
console.log(`Verknüpft:       ${verbunden.size}`)
console.log(`Status:          ${ruf.status}`)
if (warnungen.length) {
  console.log('\nWarnungen (kein Fehler):')
  for (const w of warnungen) console.log('  · ' + w)
}
if (fehler.length) {
  console.log('\nFehler:')
  for (const f of fehler) console.log('  ✗ ' + f)
  console.log(`\n✗ ${fehler.length} Problem${fehler.length === 1 ? '' : 'e'} gefunden.`)
  process.exit(1)
}
console.log('\n✓ Rufnummern OK.')
