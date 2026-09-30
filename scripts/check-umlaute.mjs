#!/usr/bin/env node
// Prüfskript: keine Ersatzschreibungen (ae/oe/ue/Ae/Oe/Ue/ss) in **sichtbaren**
// deutschen Strings. Für Zeitungen ist „nachzaehlen" statt „nachzählen"
// inakzeptabel.
//
// Prüft nur DE-Zeichenketten in den beiden zentralen Wörterbüchern:
//   - src/lib/i18n.ts: alle `de: '…'`
//   - src/lib/handbuch-inhalt.ts: DE-Blöcke (`de: '…'`, `deTitel: '…'`)
//
// Variablen-Namen, URL-Pfade und Import-Zeilen werden bewusst ignoriert.
//
// Aufruf: node scripts/check-umlaute.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const wurzel = path.resolve(__dirname, '..')

// Muster für typische Umlaut-Ersatzschreibungen (Wortstamm-Ausschnitt).
// Konservativ, damit englische Wörter (user, blue, queue) und Marken (Adobe)
// nicht anschlagen.
const VERDACHT = new RegExp(
  '\\b(?:' + [
    'nachzaehl', 'zaehlen', 'zaehler', 'zaehlung',
    'anzaehl', 'aendern', 'aenderung',
    'ueberall', 'uebersicht', 'ueberpruefen', 'ueberpruefung', 'uebersetzen', 'uebersetzung',
    'ausfuehr', 'anfuehr', 'zufuehr', 'zurueck',
    'fuellung', 'fuellen', 'ausfuellen',
    'grosse', 'grosser', 'grossen',
    'schliess', 'schliessen',
    'ruckwaerts', 'rueckwaerts',
    'anwaehl', 'auswaehl',
    'nachpruef', 'pruefen', 'pruefung',
    'schoene', 'schoen',
    'sued', 'nord',
    'ueberschrift',
    'zaehl',
    'foerder', 'foerderung',
    'kaese',
    'erwaerm',
    'luecke', 'luecken',
    'traeger',
    'maerz',
    'maessig',
    'hoehe', 'hoehen',
    'aehnlich',
    'fuer', 'nachfuer', 'zufuer',
    'gross',
  ].join('|') + ')\\w*',
  'i'
)

const zeilenFund = []

function pruefeDeStrings(rel) {
  const p = path.join(wurzel, rel)
  if (!fs.existsSync(p)) return
  const text = fs.readFileSync(p, 'utf8')
  const zeilen = text.split('\n')
  // finde `de: '…'` oder `de: "…"` oder `deTitel: '…'`
  const re = /\b(de|deTitel)\s*:\s*(['"`])([\s\S]*?)\2/g
  let m
  while ((m = re.exec(text))) {
    const wert = m[3]
    if (VERDACHT.test(wert)) {
      // Zeilennummer aus Position
      const linNr = text.slice(0, m.index).split('\n').length
      // Wort extrahieren
      const worte = wert.match(VERDACHT)
      zeilenFund.push({ datei: rel, zeile: linNr, wort: worte?.[0], kontext: wert.slice(0, 140) })
    }
  }
  // fallback: multi-line Templates werden bereits von der RegEx erfasst
}

pruefeDeStrings('src/lib/i18n.ts')
pruefeDeStrings('src/lib/handbuch-inhalt.ts')
pruefeDeStrings('src/lib/dialog-prompts.ts')

console.log('Umlaut-Ersatzschreibung')
console.log('=======================')
console.log(`Geprüfte Wörterbücher: i18n, handbuch-inhalt, dialog-prompts`)
if (zeilenFund.length) {
  console.log('\nVerdächtige Ersatzschreibungen (nur in sichtbaren DE-Strings):')
  for (const f of zeilenFund) console.log(`  ✗ ${f.datei}:${f.zeile}  →  "${f.wort}"  · Kontext: ${f.kontext}`)
  console.log('\n→ Bitte durch echte Umlaute (ä/ö/ü/ß) ersetzen.')
  process.exit(1)
}
console.log('\n✓ Keine Ersatzschreibungen in sichtbaren DE-Strings.')
