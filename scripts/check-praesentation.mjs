#!/usr/bin/env node
// Prüfung Phase 5: Rechenlogik + „keine Klick-Animationen“ in der portierten Präsentation.
// Baut per POST /api/praesentation (wenn der dev-Server läuft) eine Beispiel-Variante und prüft:
//  1. Die Beispielwerte für 33 ct / 70 %: Vergütung 39.600 €, Verdienst 36.800 €, RSP-Vergütung 50.680 €
//  2. In keiner Folien-XML steht ein <p:timing>-Knoten (OHNE_ANIM-Semantik).
//  3. Ohne Verlagsnamen erscheint kein „Für …“-Textfeld (objectName=VERLAG_NAME).
// Alternativ ohne Server: node scripts/check-praesentation.mjs offline → prüft nur die Rechenformel.
// Aufruf: node scripts/check-praesentation.mjs [URL=http://localhost:3000/api/praesentation]

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const argvUrl = process.argv[2]
const OFFLINE = argvUrl === 'offline'
const URL = argvUrl && argvUrl !== 'offline' ? argvUrl : 'http://localhost:3000/api/praesentation'

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

let fehler = 0
const pruefe = (ok, text) => { if (!ok) { fehler++; console.error('FEHLER: ' + text) } else console.log('OK   ' + text) }

// 1. Rechenlogik unabhängig von PPTX
function rechne(azsCent, rspShare) {
  const AZS_PREIS = 24 * 500 + 4 * 500
  const AZS_ANRUFE = 5000 * 24
  const AZS_ANTEIL = AZS_PREIS / 5
  const AZS_VERG = azsCent * AZS_ANRUFE / 100
  const AZS_VERDIENST = AZS_VERG - AZS_ANTEIL
  const RSP_ANRUFE = 1200000 * 20 / 100
  const RSP_UMSATZ = 36 * RSP_ANRUFE / 100
  const RSP_ANTEIL = 70000 * 20 / 100
  const RSP_BASIS = RSP_UMSATZ - RSP_ANTEIL
  const RSP_VERG = RSP_BASIS * rspShare / 100
  return { AZS_VERG, AZS_VERDIENST, RSP_VERG }
}
{
  const r = rechne(33, 70)
  pruefe(r.AZS_VERG === 39600, `AZS-Vergütung 33 ct × 120.000 = 39.600 € (ist ${r.AZS_VERG})`)
  pruefe(r.AZS_VERDIENST === 36800, `AZS-Verdienst 39.600 − 2.800 = 36.800 € (ist ${r.AZS_VERDIENST})`)
  pruefe(r.RSP_VERG === 50680, `RSP-Vergütung 70 % × 72.400 = 50.680 € (ist ${r.RSP_VERG})`)
}

if (OFFLINE) {
  console.log(fehler ? `${fehler} FEHLER` : 'ALLES OK (offline)')
  process.exit(fehler ? 1 : 0)
}

// 2. POST + PPTX-Inhalt prüfen
async function pptxZiehen(body) {
  const res = await fetch(URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return new Uint8Array(await res.arrayBuffer())
}

async function entpackeFolien(pptx) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(pptx)
  const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
  const result = {}
  for (const n of slides) result[n] = await zip.file(n).async('string')
  return result
}

try {
  // (a) Mit Verlag
  const mitVerlag = await pptxZiehen({ modus: 'einzel', eintraege: [{ verlag: 'Testverlag', azsCent: 33, rspShare: 70 }], ohneNotizen: true })
  const foliena = await entpackeFolien(mitVerlag)
  const alleXmla = Object.values(foliena).join('\n')
  pruefe(!alleXmla.includes('<p:timing'), 'Mit Verlag: keine <p:timing>-Knoten (OHNE_ANIM)')
  pruefe(alleXmla.includes('<p:fade'), 'Mit Verlag: Fade-Übergang vorhanden')
  pruefe(alleXmla.includes('39.600'), 'Mit Verlag: 39.600 € in der Abrechnung')
  pruefe(alleXmla.includes('50.680'), 'Mit Verlag: 50.680 € in der Abrechnung')
  pruefe(alleXmla.includes('Testverlag'), 'Mit Verlag: Verlagsname auf der Titelfolie')

  // (b) Ohne Verlag
  const ohne = await pptxZiehen({ modus: 'einzel', eintraege: [{ azsCent: 33, rspShare: 70 }], ohneNotizen: true })
  const folienb = await entpackeFolien(ohne)
  const alleXmlb = Object.values(folienb).join('\n')
  pruefe(!alleXmlb.includes('name="VERLAG_NAME"'), 'Ohne Verlag: Kein „Für …“-Textfeld (objectName=VERLAG_NAME)')
  pruefe(!alleXmlb.includes('<p:timing'), 'Ohne Verlag: keine <p:timing>-Knoten')

  // (c) IDs eindeutig je Folie
  for (const [name, xml] of Object.entries(foliena)) {
    const ids = [...xml.matchAll(/<p:cNvPr id="(\d+)"/g)].map((m) => m[1])
    const einzigartig = new Set(ids).size === ids.length
    pruefe(einzigartig, `${name}: ${ids.length} p:cNvPr-IDs, alle eindeutig`)
  }

  await fs.mkdir(path.join(wurzel, '_pruef'), { recursive: true })
  await fs.writeFile(path.join(wurzel, '_pruef', 'praesentation_testverlag.pptx'), mitVerlag)
} catch (e) {
  if ((e?.message ?? '').includes('ECONNREFUSED')) {
    console.log('Dev-Server nicht erreichbar – nur Offline-Prüfung ausgeführt. Starte `npm run dev` und rufe das Skript erneut auf.')
  } else {
    fehler++
    console.error('FEHLER: ' + (e?.message ?? e))
  }
}

console.log(fehler ? `${fehler} FEHLER` : 'ALLES OK')
process.exit(fehler ? 1 : 0)
