#!/usr/bin/env node
// Prüfskript Serien-Modus (Geldregen):
//  1. Der TypeScript-Generator liefert dieselbe HTML-Ausgabe (außerhalb des <script>-Blocks) wie das
//     Python-Werkzeug gr_build.py (Referenz: Geldregen_2027/_html/<Monat>/Vorschlag_X/*.html).
//  2. Die Inhaltsprüfung (pruefen.ts) meldet für alle Anzeigen keine Fehler.
// Aufruf:  node scripts/check-serie.mjs [Monat=2027-11] [Referenzordner]
// Referenzordner (optional) = .../Geldregen_2027/_html ; Standard: ~/Downloads/01_Projekte/Telemedia/Spiele_2027/Geldregen_2027/_html
// Ohne Referenz wird nur Punkt 2 geprüft.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tsLaden } from './lib/ts-laden.mjs'

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const monat = process.argv[2] || '2027-11'
const refRoot = process.argv[3] || process.env.SERIE_REFERENZ || path.join(os.homedir(), 'Downloads/01_Projekte/Telemedia/Spiele_2027/Geldregen_2027/_html')

const G = tsLaden(path.join(wurzel, 'src/lib/serie/generator.ts'))
const P = tsLaden(path.join(wurzel, 'src/lib/serie/pruefen.ts'))
const lies = (n) => JSON.parse(fs.readFileSync(path.join(wurzel, 'public/serie', n), 'utf8'))
const daten = lies('zeitungen.json')
const fragen = lies('fragen_2027.json')
const tnbRef = lies('tnb_referenz.json')

// Pfade wie im Python-Werkzeug (relativ von _html/<Monat>/Vorschlag_X nach werkzeug/assets)
const pfad = (n) => '../../../werkzeug/assets/' + n
const ohneSkript = (s) => s.replace(/<script>[\s\S]*?<\/script>/g, '<script></script>')

const tage = fragen[monat]
if (!Array.isArray(tage)) { console.error('Monat nicht in fragen_2027.json: ' + monat); process.exit(2) }
const eintraege = G.eintraegeBilden(daten.zeitungen, tage, ['A', 'B', 'C'], [1, 4])
const spieltag = new Map(tage.map((t) => [t.tag, t]))

let gleich = 0, abweichung = 0, fehlend = 0, fehlerAnz = 0
const proben = []
const platzhalter = new Set()
const refVorhanden = fs.existsSync(path.join(refRoot, monat))
for (const e of eintraege) {
  const t = spieltag.get(e.td.tag)
  const html = G.seite(daten, e.z, e.td, e.v, e.g, monat, pfad)
  const name = G.dateiname(e.z, monat, t, e.v, e.g) + '.html'
  const info = P.pruefeInhalt(daten, e, t, monat, html, tnbRef)
  info.platzhalter.forEach((p) => platzhalter.add(p))
  if (info.fehler.length) { fehlerAnz++; if (proben.length < 15) proben.push(name + ': ' + info.fehler.join(' | ')) }
  if (refVorhanden) {
    const rp = path.join(refRoot, monat, 'Vorschlag_' + e.v, name)
    if (!fs.existsSync(rp)) { fehlend++; if (proben.length < 15) proben.push('Referenz fehlt: ' + name); continue }
    const ref = fs.readFileSync(rp, 'utf8')
    if (ohneSkript(ref) === ohneSkript(html)) gleich++
    else {
      abweichung++
      if (proben.length < 15) {
        const a = ohneSkript(ref), b = ohneSkript(html); let i = 0
        while (i < a.length && a[i] === b[i]) i++
        proben.push(`ABWEICHUNG ${name} ab Zeichen ${i}:\n   Python: …${a.slice(Math.max(0, i - 60), i + 80)}\n   TS:     …${b.slice(Math.max(0, i - 60), i + 80)}`)
      }
    }
    // Skript-Block muss exakt gleich sein (Prüf-/Einpass-Logik)
    const sa = ref.match(/<script>(?!window)[\s\S]*?<\/script>/)?.[0], sb = html.match(/<script>(?!window)[\s\S]*?<\/script>/)?.[0]
    if (sa && sb && sa.replace(/\r/g, '') !== sb.replace(/\r/g, '')) { abweichung++; proben.push('Skript weicht ab: ' + name) }
  }
}
console.log(`Anzeigen erzeugt: ${eintraege.length} (${monat})`)
if (refVorhanden) console.log(`Vergleich mit Python-Ausgabe: ${gleich} identisch, ${abweichung} abweichend, ${fehlend} Referenz fehlt`)
else console.log('Keine Python-Referenz gefunden (' + refRoot + ') – nur Inhaltsprüfung.')
console.log(`Inhaltsprüfung: ${fehlerAnz} Anzeigen mit Fehlern`)
for (const p of [...platzhalter].sort()) console.log('  bekannt offen →', p)
proben.forEach((p) => console.log('  ' + p))
process.exit(fehlerAnz || abweichung || fehlend ? 1 : 0)
