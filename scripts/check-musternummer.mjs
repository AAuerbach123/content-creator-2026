#!/usr/bin/env node
// Prüfskript: Musternummer-Kollision (Phase 7 / Prüf-Loop).
// Findet Rufnummern im Quellcode (src/**), die mit echten Blöcken aus
// rufnummern.json kollidieren könnten. Muster-Nummern in Tests, Beispielen
// oder Dokumentation dürfen nicht wie „01379 4412…" aussehen, weil das echte
// Funke-Nummern sind.
//
// Regel: In Code/Dokumentation nur klar fiktive Nummern verwenden, die nicht
// im deutschen Mehrwertdienste-Bereich liegen (01801/02/…, 01805/06 gelten
// als Mehrwertdienste; Fiktion aus ITU E.164 Rufnummer-Reserve, z. B.
// 0900-BEISPIEL oder ISO-Testnummer 555 in einem freigehaltenen Block).
//
// Aufruf: node scripts/check-musternummer.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const wurzel = path.resolve(__dirname, '..')

const ruf = JSON.parse(fs.readFileSync(path.join(wurzel, 'public/rufnummern.json'), 'utf8'))

// Echte Nummern-Präfixe (5+ Ziffern) sammeln.
const echtePraefixe = new Set()
for (const z of ruf.zeitungen) {
  for (const n of z.wissensquiz?.nummern || []) {
    const d = n.replace(/\D/g, '')
    if (d.length >= 8) echtePraefixe.add(d.slice(0, 8))
  }
  const gp = z.geldregen?.mwnPrint?.replace(/\D/g, '')
  const gw = z.geldregen?.mwnWeb?.replace(/\D/g, '')
  if (gp && gp.length >= 6) echtePraefixe.add(gp.slice(0, 8))
  if (gw && gw.length >= 6) echtePraefixe.add(gw.slice(0, 8))
  const sh = z.wissensquiz?.serviceHotline?.replace(/\D/g, '')
  if (sh && sh.length >= 6) echtePraefixe.add(sh.slice(0, 8))
}

const ausnahmen = [
  'public/rufnummern.json',
  'public/verlage-presets.json',
  'scripts/check-musternummer.mjs',
  'scripts/check-rufnummern.mjs',
]

const kandidaten = []
function scanne(dir) {
  for (const eintrag of fs.readdirSync(dir, { withFileTypes: true })) {
    if (eintrag.name.startsWith('.') || eintrag.name === 'node_modules') continue
    const p = path.join(dir, eintrag.name)
    const rel = path.relative(wurzel, p)
    if (ausnahmen.includes(rel)) continue
    if (eintrag.isDirectory()) { scanne(p); continue }
    if (!/\.(ts|tsx|mjs|js|md|json)$/i.test(eintrag.name)) continue
    const text = fs.readFileSync(p, 'utf8')
    const funde = text.matchAll(/\b0[1-9][0-9]{3,4}[-\s]?[0-9]{4,10}\b/g)
    for (const m of funde) {
      const digits = m[0].replace(/\D/g, '')
      if (digits.length < 8) continue
      const praefix = digits.slice(0, 8)
      if (echtePraefixe.has(praefix)) {
        kandidaten.push({ datei: rel, nummer: m[0], zeile: text.slice(0, m.index).split('\n').length })
      }
    }
  }
}

for (const dir of ['src', 'scripts', 'AGENTS.md', 'README.md']) {
  const full = path.join(wurzel, dir)
  if (!fs.existsSync(full)) continue
  if (fs.statSync(full).isDirectory()) scanne(full)
  else {
    const text = fs.readFileSync(full, 'utf8')
    const funde = text.matchAll(/\b0[1-9][0-9]{3,4}[-\s]?[0-9]{4,10}\b/g)
    for (const m of funde) {
      const digits = m[0].replace(/\D/g, '')
      if (digits.length < 8) continue
      const praefix = digits.slice(0, 8)
      if (echtePraefixe.has(praefix)) {
        kandidaten.push({ datei: dir, nummer: m[0], zeile: text.slice(0, m.index).split('\n').length })
      }
    }
  }
}

console.log('Musternummer-Kollision')
console.log('======================')
console.log(`Reale Nummer-Präfixe (aus rufnummern.json): ${echtePraefixe.size}`)
if (kandidaten.length) {
  console.log('\nKollisionen gefunden — bitte Muster ersetzen:')
  for (const k of kandidaten) console.log(`  ✗ ${k.datei}:${k.zeile}  →  ${k.nummer}`)
  process.exit(1)
}
console.log('\n✓ Keine Musternummer im Code kollidiert mit echten Rufnummern-Blöcken.')
