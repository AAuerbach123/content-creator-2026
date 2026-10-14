#!/usr/bin/env node
// Stapel-Export Serien-Anzeigen (läuft auf dem Mac, Google Chrome nötig) – alle Spiele des Katalogs inkl. Geldregen.
// Erzeugt je Anzeige ein Vektor-PDF (Text/Flächen Vektor, Fotos eingebettet), je Vorschlag-Ordner eine ZIP und einen
// Prüfbericht (CSV, Ergebnis des Einpass-/Prüf-Skripts). Bereits aktuelle PDFs werden übersprungen (Neustart nach Abbruch).
//
// Aufruf: node scripts/serie-export.mjs <spielId> [Monat] [Zeitungen=alle|id,id] [Vorschläge=A,B,C] [Gewinner=1,4] [Spieltage=n,m]
// Ablauf: 1× den ganzen Monat vorproduzieren, danach täglich nur den Spieltag mit den neuen Gewinnern (Tages-Update) –
// nur geänderte Anzeigen werden neu gerechnet.
//   Beispiel: node scripts/serie-export.mjs fehlerjagd 2027-02 alle A,B,C 1,4
//   Ohne Argumente: liest den neuesten „serie-auftrag*.json“ aus ~/Downloads (von der Seite /serie heruntergeladen).
// Ausgabe: ~/Desktop/Serien-Anzeigen/<Spiel>_<Monat>/Vorschlag_X/*.pdf + Vorschlag_X_alle.zip + Pruefbericht.csv
// Muster-Inhalte (gelb „MUSTER-INHALT“) sind NICHT für den Druck – echte Inhalte über die Seite /serie erfassen.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tsLaden } from './lib/ts-laden.mjs'

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const W = 1575

function auftragLesen() {
  const a = process.argv.slice(2)
  if (a.length) return { spiel: a[0], monat: a[1], zeitungen: a[2] || 'alle', vorschlaege: a[3] || 'A,B,C', gewinner: a[4] || '1,4' }
  const dl = path.join(os.homedir(), 'Downloads')
  const dateien = fs.existsSync(dl) ? fs.readdirSync(dl).filter((f) => /^serie-auftrag.*\.json$/.test(f)).map((f) => path.join(dl, f)) : []
  if (!dateien.length) throw new Error('Kein Auftrag: Spiel als Argument angeben oder auf /serie „Export-Auftrag herunterladen“.')
  dateien.sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs)
  console.log('Auftrag: ' + dateien[0])
  return JSON.parse(fs.readFileSync(dateien[0], 'utf8'))
}

const auftrag = auftragLesen()
const G = tsLaden(path.join(wurzel, 'src/lib/serie/generator.ts'))
const K = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/index.ts'))
const R = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/rahmen.ts'))
const lies = (n) => JSON.parse(fs.readFileSync(path.join(wurzel, 'public/serie', n), 'utf8'))
const daten = lies('zeitungen.json')
// Im Cockpit hochgeladene Rufnummern dieses Spiels (kommen im Auftrag mit; ohne Upload unverändert)
if (auftrag.nummern && typeof auftrag.nummern === 'object') {
  for (const z of daten.zeitungen) if (auftrag.nummern[z.id]) Object.assign(z, auftrag.nummern[z.id])
  console.log('Rufnummern aus dem Cockpit: ' + Object.keys(auftrag.nummern).length + ' Zeitungen')
}
const istGeldregen = auftrag.spiel === 'geldregen'
const spiel = istGeldregen ? null : K.spielFinden(auftrag.spiel)
if (!istGeldregen && !spiel) throw new Error('Unbekanntes Spiel: ' + auftrag.spiel + ' (vorhanden: geldregen, ' + K.SPIELE.map((s) => s.id).join(', ') + ')')
const monat = auftrag.monat || (spiel ? spiel.monate[0] : '2027-11')
const zeitungen = auftrag.zeitungen === 'alle' ? daten.zeitungen : daten.zeitungen.filter((z) => String(auftrag.zeitungen).split(',').includes(z.id))
const vorschlaege = String(auftrag.vorschlaege).split(',')
const gewinnerListe = String(auftrag.gewinner).split(',').map(Number)

// Inhalte: Geldregen aus fragen_2027.json, sonst Muster bzw. im Auftrag mitgelieferte Inhalte (von /serie)
let inhalte
if (Array.isArray(auftrag.inhalte) && auftrag.inhalte.length) inhalte = auftrag.inhalte
else if (istGeldregen) {
  const t = lies('fragen_2027.json')[monat]
  if (!Array.isArray(t)) throw new Error('Keine Geldregen-Fragen für ' + monat)
  inhalte = t
} else inhalte = spiel.musterInhalte(monat)

// Tages-Update: nur bestimmte Spieltage neu (z. B. nachdem die Gewinner des Tages eingetragen wurden)
const nurTage = Array.isArray(auftrag.tage) && auftrag.tage.length ? auftrag.tage.map(Number) : process.argv[7] ? process.argv[7].split(',').map(Number) : null
if (nurTage) {
  inhalte = inhalte.filter((i) => nurTage.includes(Number(i.tag)))
  console.log('Tages-Update: nur Spieltag ' + nurTage.join(', '))
}

const name = (istGeldregen ? 'Geldregen' : spiel.name.replace(/&/g, 'und').replace(/[^A-Za-z0-9ÄÖÜäöüß]+/g, '-')) + '_' + monat
const ziel = path.join(os.homedir(), 'Desktop', 'Serien-Anzeigen', name)
const htmlRoot = path.join(ziel, '_html')
const assets = path.join(wurzel, 'public/serie/assets')

// 1) HTML erzeugen (relative Pfade auf public/serie/assets)
let n = 0
const jobs = []
for (const v of vorschlaege) {
  const hd = path.join(htmlRoot, 'Vorschlag_' + v)
  fs.mkdirSync(hd, { recursive: true })
  const pfad = (nm) => path.relative(hd, path.join(assets, nm)).split(path.sep).join('/')
  for (const z of zeitungen) for (const inh of inhalte) for (const g of (istGeldregen ? G.gewinnerVarianten(inh, gewinnerListe) : gewinnerListe)) {
    let html, datei
    if (istGeldregen) {
      html = G.seite(daten, z, G.tagesdaten(z, inh, inh.gewinner, inh.einfuehrung), v, g, monat, pfad)
      datei = G.dateiname(z, monat, inh, v, g)
    } else {
      html = R.spielSeite({ spiel, daten, z, inhalt: inh, vorschlag: v, gewinner: g, monat, pfad })
      datei = R.spielDateiname(spiel, z, monat, inh, v, g)
    }
    const p = path.join(hd, datei + '.html')
    if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== html) fs.writeFileSync(p, html)
    jobs.push({ v, html: p, pdf: path.join(ziel, 'Vorschlag_' + v, datei + '.pdf'), z })
    n++
  }
}
console.log(`${n} Anzeigen vorbereitet → ${ziel}`)

// 2) PDFs mit Chrome (puppeteer-core aus dem Ad-Creator, nur lesen)
const puppeteer = require(path.join(os.homedir(), 'Desktop/wissensquiz/node_modules/puppeteer-core'))
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] })
const page = await browser.newPage()
const bericht = ['Datei;Vorschlag;Status;TNB_pt;Skalierung;Hinweise']
let neu = 0, skip = 0, warn = 0
for (const j of jobs) {
  fs.mkdirSync(path.dirname(j.pdf), { recursive: true })
  const [wmm, hmm] = j.z.format
  const H = Math.round((W * hmm) / wmm)
  try {
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
    await page.goto(pathToFileURL(j.html).href, { waitUntil: 'networkidle0' })
    await page.waitForFunction('window.__pruefung', { timeout: 20000 })
    const r = await page.evaluate(() => window.__pruefung)
    if (fs.existsSync(j.pdf) && fs.statSync(j.pdf).mtimeMs > fs.statSync(j.html).mtimeMs) skip++
    else {
      await page.pdf({ path: j.pdf, width: wmm + 'mm', height: hmm + 'mm', scale: (wmm * 96) / 25.4 / W, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, pageRanges: '1' })
      neu++
    }
    const status = r.ok ? 'ok' : r.echt_ok ? 'ok (Platzhalter)' : 'PRUEFEN'
    if (!r.echt_ok) warn++
    bericht.push([path.basename(j.pdf), 'Vorschlag_' + j.v, status, r.tnb_pt, r.skalierung, '"' + r.warnungen.join(' | ').replace(/[";]/g, "'") + '"'].join(';'))
  } catch (e) {
    warn++
    bericht.push([path.basename(j.pdf), 'Vorschlag_' + j.v, 'FEHLER', '', '', '"' + String(e.message || e).replace(/[";]/g, "'") + '"'].join(';'))
  }
  if ((neu + skip) % 25 === 0) process.stdout.write(`  ${neu + skip}/${jobs.length} …\n`)
}
await browser.close()
{
  // Prüfbericht zusammenführen: bestehende Zeilen behalten, neu geprüfte Anzeigen ersetzen (Tages-Update)
  const bp = path.join(ziel, 'Pruefbericht.csv')
  const alt = fs.existsSync(bp) ? fs.readFileSync(bp, 'utf8').replace(/^\uFEFF/, '').split('\n').slice(1).filter(Boolean) : []
  const zeilen = new Map(alt.map((z) => [z.split(';')[0], z]))
  for (const z of bericht.slice(1)) zeilen.set(z.split(';')[0], z)
  fs.writeFileSync(bp, '\uFEFF' + bericht[0] + '\n' + [...zeilen.values()].sort().join('\n') + '\n')
}

// 3) ZIP je Vorschlag-Ordner
for (const v of vorschlaege) {
  const d = path.join(ziel, 'Vorschlag_' + v)
  const zip = `Vorschlag_${v}_alle.zip`
  if (fs.existsSync(path.join(d, zip))) fs.renameSync(path.join(d, zip), path.join(d, zip + '.alt'))
  // alle PDFs des Ordners (auch aus früheren Läufen – beim Tages-Update bleibt die ZIP vollständig)
  const liste = fs.readdirSync(d).filter((f) => f.endsWith('.pdf')).sort().join('\n')
  execSync(`zip -q -j "${zip}" -@`, { cwd: d, input: liste })
  if (fs.existsSync(path.join(d, zip + '.alt'))) fs.renameSync(path.join(d, zip + '.alt'), path.join(htmlRoot, `alt_${v}_${Date.now()}.zip`))
}
console.log(`FERTIG: ${neu} PDFs neu, ${skip} übersprungen, ${warn} mit Hinweisen → ${path.join(ziel, 'Pruefbericht.csv')}`)
