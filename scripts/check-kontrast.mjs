#!/usr/bin/env node
// Phase 1 – prüft Kontraste der Cockpit-Markenfarben.
// Liest `src/app/cockpit/cockpit.css`, zieht die `--tm-*`-Werte und berechnet
// die WCAG-Kontraste der textrelevanten Paare. Fehler bei Kontrast < 4,5:1
// für normalen Text und < 3:1 für grosse / fette Flächen.
//
// Aufruf: node scripts/check-kontrast.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const css = fs.readFileSync(path.join(wurzel, 'src/app/cockpit/cockpit.css'), 'utf8')

const tokens = {}
for (const m of css.matchAll(/--([a-z-]+):\s*#([0-9A-Fa-f]{6})/g)) {
  tokens[m[1]] = '#' + m[2]
}

const hex2rgb = (h) => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}
const chan = (c) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}
const lum = (hex) => {
  const [r, g, b] = hex2rgb(hex)
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)
}
const kontrast = (a, b) => {
  const la = lum(a), lb = lum(b)
  const hi = Math.max(la, lb), lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

// Textrelevante Paare (Vordergrund, Hintergrund, min, name)
const PAARE = [
  ['tm-dunkel',  'tm-hell',  4.5, 'Haupttext auf heller Fläche'],
  ['tm-dunkel',  'tm-weiss', 4.5, 'Haupttext auf weisser Karte'],
  ['tm-grau',    'tm-weiss', 4.5, 'Sekundärtext auf Karte'],
  ['tm-grau',    'tm-hell',  4.5, 'Sekundärtext auf Grundfläche'],
  ['tm-weiss',   'tm-rot',   4.5, 'Primärknopf: weisser Text auf Rot'],
  ['tm-weiss',   'tm-dunkelrot', 4.5, 'Primärknopf Hover: Weiss auf Dunkelrot'],
  ['tm-rot',     'tm-hell',  3.0, 'Rot als Akzent auf Grundfläche (nicht-text)'],
  ['tm-rot',     'tm-weiss', 4.5, 'Roter Text auf Weiss (z. B. Textknopf)'],
]

let fehler = 0
console.log('Cockpit · Kontrast-Prüfung (Phase 1)')
console.log('=====================================\n')
for (const [vg, hg, min, label] of PAARE) {
  const a = tokens[vg], b = tokens[hg]
  if (!a || !b) { console.log(`? ${label}: Token fehlt (${vg} / ${hg})`); fehler++; continue }
  const k = kontrast(a, b)
  const ok = k >= min
  const marker = ok ? '✓' : '✗'
  console.log(`${marker} ${label}: ${a} auf ${b} = ${k.toFixed(2)}:1 (min ${min})`)
  if (!ok) fehler++
}

console.log()
if (fehler) {
  console.log(`✗ ${fehler} Paar${fehler === 1 ? '' : 'e'} unter dem Mindestkontrast.`)
  process.exit(1)
} else {
  console.log('✓ Alle textrelevanten Paare erreichen die WCAG-2.2-AA-Mindestkontraste.')
}
