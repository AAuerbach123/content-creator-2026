#!/usr/bin/env node
// Phase-7-Prüfskript.
// Listet alle Panels/Bereiche, die einen HilfePopover haben MÜSSEN, und schlägt
// fehl, wenn einer ohne (i) oder ohne Handbuch-Anker ist. Zusätzlich prüft es,
// dass jeder verwendete Anker im Handbuch existiert.
//
// Aufruf: node scripts/check-hilfe.mjs
//         npm run check-hilfe

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const wurzel = path.resolve(__dirname, '..')

// Liste aller Panels/Bereiche, die Phase 7 verlangt.
// Format: { datei, name, ankerZwang? }
const PFLICHT = [
  { datei: 'src/components/StartScreen.tsx', name: 'StartScreen (Header)' },
  { datei: 'src/components/KIZentrum.tsx', name: 'KI-Zentrum' },
  { datei: 'src/components/KartenGrid.tsx', name: 'Startkarten' },
  { datei: 'src/components/WegAuswahl.tsx', name: 'Weg-Auswahl (A/B/C)' },
  { datei: 'src/components/KIDialog.tsx', name: 'KI-Dialog' },
  { datei: 'src/components/RichtungenPanel.tsx', name: 'Drei Richtungen' },
  { datei: 'src/components/MCFragenPanel.tsx', name: 'MC-Fragen (Vorlage)' },
  { datei: 'src/components/VorlagenUpload.tsx', name: 'Vorlagen-Analyse' },
  { datei: 'src/components/SchrittplanPanel.tsx', name: 'Schrittplan' },
  { datei: 'src/components/KIVerlaufPanel.tsx', name: 'KI-Verlauf' },
  { datei: 'src/components/JobEditor.tsx', name: 'JobEditor (Header)' },
  { datei: 'src/components/ArtefaktWerkstatt.tsx', name: 'Artefakt-Werkstatt' },
  { datei: 'src/components/EditorAnsicht.tsx', name: 'Editor (Konva)' },
  { datei: 'src/components/EbenenPanel.tsx', name: 'Ebenen-Panel' },
  { datei: 'src/components/EbenenInspektor.tsx', name: 'Ebenen-Inspektor' },
  { datei: 'src/components/KIEditorBefehl.tsx', name: 'KI-Editor-Befehl' },
  { datei: 'src/components/BildErzeugung.tsx', name: 'Bild-Erzeugung' },
  { datei: 'src/components/CopyErzeugung.tsx', name: 'Copy-Erzeugung' },
  { datei: 'src/components/KanalWahl.tsx', name: 'Kanal-Wahl' },
  { datei: 'src/components/VerlagWahl.tsx', name: 'Verlag / Brand-Kit' },
  { datei: 'src/components/ExportPanel.tsx', name: 'Exporte' },
  { datei: 'src/components/KorrekturportalPanel.tsx', name: 'Korrekturportal (Grafiker)' },
  { datei: 'src/components/GrafikerPinAnsicht.tsx', name: 'Grafiker-Pin-Ansicht' },
  { datei: 'src/components/VideoStudio.tsx', name: 'Video-Studio (Header + Szenen + Stimmproben + Sprechtext + Prüfbericht + MP4)' },
  { datei: 'src/components/WerkzeugePanel.tsx', name: 'Werkzeuge' },
  { datei: 'src/components/KostenUebersicht.tsx', name: 'Kosten-Übersicht' },
  { datei: 'src/components/PerformanceCheck.tsx', name: 'Performance-Check' },
  { datei: 'src/components/SpracheUmschalter.tsx', name: 'Einstellungen (Sprache)' },
  { datei: 'src/app/uebersicht/UebersichtSeite.tsx', name: 'Übersicht (Header)' },
  { datei: 'src/app/review/[token]/ReviewSeite.tsx', name: 'Kunden-Review (Header)' },
  { datei: 'src/app/handbuch/HandbuchSeite.tsx', name: 'Handbuch-Seite (Header)' },
  { datei: 'src/app/rufnummern/RufnummernSeite.tsx', name: 'Rufnummern-Seite' },
  { datei: 'src/components/RufnummernInfo.tsx', name: 'Rufnummern-Info (nach Verlagswahl)' },
]

// Bekannte Anker aus dem Handbuch — als Fallback grep-basiert lesen, damit das
// Skript ohne Build läuft.
function ankerAusHandbuch() {
  const inhalt = fs.readFileSync(path.join(wurzel, 'src/lib/handbuch-inhalt.ts'), 'utf8')
  const anker = new Set()
  for (const m of inhalt.matchAll(/anker:\s*'([^']+)'/g)) anker.add(m[1])
  return anker
}

function ankerImCode(text, gesamt) {
  const anker = new Set()
  for (const m of text.matchAll(/anker=\{?['"]([\w-]+)['"]\}?/g)) anker.add(m[1])
  for (const m of text.matchAll(/anker="([\w-]+)"/g)) anker.add(m[1])
  // Ausdrücke wie `anker={karte.anker}` — dann sind die Anker in `anker: '...'`
  // in derselben Datei verstreut. Sammle Objekt-Anker als Fallback.
  const ausdruck = /anker=\{[a-zA-Z_.]+\.anker\}/.test(text)
  if (ausdruck) {
    for (const m of text.matchAll(/anker:\s*'([\w-]+)'/g)) anker.add(m[1])
  }
  return anker
}

const bekannteAnker = ankerAusHandbuch()

const fehler = []
const berichte = []

for (const p of PFLICHT) {
  const voll = path.join(wurzel, p.datei)
  if (!fs.existsSync(voll)) {
    fehler.push(`❌ ${p.name}: Datei fehlt (${p.datei})`)
    continue
  }
  const text = fs.readFileSync(voll, 'utf8')
  const nutztHilfe = /HilfePopover/.test(text)
  const nutztHandbuchKnopf = /HandbuchKnopf/.test(text)
  const anker = ankerImCode(text)

  if (!nutztHilfe && !nutztHandbuchKnopf) {
    fehler.push(`❌ ${p.name}: kein <HilfePopover> und kein <HandbuchKnopf> — mindestens eines der beiden ist Pflicht.`)
    continue
  }

  // Prüfe alle im Code verwendeten Anker gegen das Handbuch
  const unbekannt = [...anker].filter((a) => !bekannteAnker.has(a))
  if (unbekannt.length > 0) {
    fehler.push(`❌ ${p.name}: unbekannte Handbuch-Anker: ${unbekannt.join(', ')}`)
  } else if (nutztHilfe && anker.size === 0) {
    fehler.push(`❌ ${p.name}: <HilfePopover> ohne \`anker\` — Verweis ins Handbuch fehlt.`)
  } else {
    berichte.push(`✓ ${p.name}${anker.size ? ` → ${[...anker].join(', ')}` : ''}`)
  }
}

console.log('Hilfe-Prüfung (Phase 7)')
console.log('=======================')
console.log()
console.log(`Bekannte Anker im Handbuch: ${bekannteAnker.size}`)
console.log(`Geprüfte Panels/Bereiche:   ${PFLICHT.length}`)
console.log()
for (const b of berichte) console.log(b)
if (fehler.length) {
  console.log()
  console.log('Fehler:')
  for (const f of fehler) console.log(f)
  console.log()
  console.log(`✗ ${fehler.length} Problem${fehler.length === 1 ? '' : 'e'} gefunden.`)
  process.exit(1)
}

console.log()
console.log(`✓ Alle ${PFLICHT.length} Panels haben Hilfe.`)
