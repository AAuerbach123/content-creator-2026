#!/usr/bin/env node
// Test für die Spiele „aus 2 mach 1“, „Kombinieren & Kassieren“ und „Brückenrätsel“ (noch nicht in index.ts registriert):
// lädt die Spiel-Dateien direkt, prüft die Muster-Inhalte und schreibt Prüfseiten nach _pruef/<id>.html
// (Zeitungen ta,sz,shz · Spieltage 1,3 · Vorschläge A,B,C · 1 und 4 Gewinner) sowie kleine Detailseiten _pruef/<id>_detail.html.
// Aufruf: node scripts/_test_bilderraetsel.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tsLaden } from './lib/ts-laden.mjs'

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sp = (d) => path.join(wurzel, 'src/lib/serie/spiele', d)
const R = tsLaden(sp('rahmen.ts'))
const T = tsLaden(path.join(wurzel, 'src/lib/serie/spiele/tnb.ts'))
const P = tsLaden(path.join(wurzel, 'src/lib/serie/pruefen.ts'))
const SPIELE = [tsLaden(sp('aus2mach1.ts')).aus2mach1, tsLaden(sp('kombinieren.ts')).kombinieren, tsLaden(sp('brueckenraetsel.ts')).brueckenraetsel]

const daten = JSON.parse(fs.readFileSync(path.join(wurzel, 'public/serie/zeitungen.json'), 'utf8'))
const assets = path.join(wurzel, 'public/serie/assets')
const MIME = { '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf' }
const cache = new Map()
const pfad = (n) => {
  if (!cache.has(n)) {
    const p = path.join(assets, n)
    cache.set(n, fs.existsSync(p) ? `data:${MIME[path.extname(n)]};base64,` + fs.readFileSync(p).toString('base64') : 'FEHLT:' + n)
  }
  return cache.get(n)
}

let fehler = 0
const pruefe = (ok, text) => { if (!ok) { fehler++; console.error('FEHLER: ' + text) } }
const sortiert = (s) => [...s.replace(/\s/g, '').toUpperCase()].sort().join('')

// ---------------------------------------------------------------- Inhalte prüfen
for (const spiel of SPIELE) {
  pruefe(spiel.modell === 'AZS oder RSP', spiel.id + ': Modell')
  pruefe(spiel.mechanik.art === 'tagespreis' && spiel.mechanik.tagespreis === '500 €' && spiel.mechanik.supertag === '1.000 €', spiel.id + ': Mechanik')
  pruefe(spiel.antwort === 'loesungswort', spiel.id + ': Antwortart')
  for (const b of spiel.bilder ?? []) pruefe(fs.existsSync(path.join(assets, b)), spiel.id + ': Bild fehlt ' + b)
  for (const monat of spiel.monate) {
    const inh = spiel.musterInhalte(monat)
    pruefe(inh.length >= 20, spiel.id + ': zu wenige Spieltage ' + inh.length)
    const geprueft = new Set()
    for (const i of inh) {
      pruefe(i.muster === true && !!i.loesung, spiel.id + ': Muster/Lösung fehlt (Tag ' + i.tag + ')')
      if (geprueft.has(i.loesung)) continue
      geprueft.add(i.loesung)
      const d = i.daten ?? {}
      if (d.buchstaben !== undefined) {
        pruefe(sortiert(d.buchstaben) === sortiert(i.loesung), `${spiel.id}: Buchstaben ${d.buchstaben} ≠ ${i.loesung}`)
        pruefe(d.buchstaben !== i.loesung, `${spiel.id}: Buchstaben nicht gemischt (${i.loesung})`)
      }
      for (const k of ['bild', 'bild1', 'bild2']) if (d[k]) pruefe(fs.existsSync(path.join(assets, d[k])), spiel.id + ': Bild fehlt ' + d[k])
      if (d.zeilen) {
        const loes = d.zeilen.map((z) => z.wort[z.pos]).join('')
        pruefe(loes === i.loesung, `${spiel.id}: Spalte ergibt ${loes}, erwartet ${i.loesung}`)
        pruefe(d.zeilen.length === i.loesung.length, spiel.id + ': Zeilenzahl ≠ Länge Lösungswort')
        pruefe(new Set(d.zeilen.map((z) => z.wort)).size === d.zeilen.length, spiel.id + ': Brückenwort doppelt')
        console.log(`  ${i.loesung}: ` + d.zeilen.map((z) => `${z.links}${z.wort} / ${z.wort}${z.rechts}`).join(' · '))
      }
    }
    console.log(`${spiel.id} ${monat}: ${inh.length} Spieltage, Muster: ${[...geprueft].join(', ')}`)
  }
}

// ---------------------------------------------------------------- Rätselfeld in allen Boxgrößen erzeugen (wirft nicht, kein NaN)
const BOXEN = [{ w: 836, h: 498 }, { w: 516, h: 558 }, { w: 840, h: 498 }]
for (const spiel of SPIELE)
  for (const i of spiel.musterInhalte(spiel.monate[0]).slice(0, 3))
    for (const box of BOXEN) {
      const t = spiel.raetsel({ z: daten.zeitungen[0], inhalt: i, akzent: '#F2C14E', vorschlag: 'A', box, pfad: (x) => x })
      pruefe(!/NaN|undefined|Infinity/.test(t.css + t.html), `${spiel.id}: NaN/undefined im Rätselfeld (${box.w}×${box.h})`)
    }

// ---------------------------------------------------------------- Prüfseiten schreiben
const ziel = path.join(wurzel, '_pruef')
fs.mkdirSync(ziel, { recursive: true })
const zeit = daten.zeitungen.filter((z) => ['ta', 'sz', 'shz'].includes(z.id))
for (const spiel of SPIELE) {
  const monat = spiel.monate[0]
  const inhalte = spiel.musterInhalte(monat).filter((i) => [1, 3].includes(i.tag))
  const liste = []
  for (const v of ['A', 'B', 'C']) for (const z of zeit) for (const inhalt of inhalte) for (const g of [1, 4])
    liste.push({ spiel, daten, z, inhalt, vorschlag: v, gewinner: g, monat, pfad })
  // Keine Schatten/Filter in der einzelnen Anzeige + kein Vorzählfaktor im TNB (Regel 06./07.10.2026)
  if (liste.length) {
    for (const err of P.pruefeKeineSchatten(R.spielSeite(liste[0]))) pruefe(false, spiel.id + ': ' + err)
    for (const err of P.pruefeKeinVorzaehlfaktor(spiel.mechanik.art, T.spielTnb(spiel, daten, zeit[0], monat))) pruefe(false, spiel.id + ': ' + err)
  }
  fs.writeFileSync(path.join(ziel, `${spiel.id}.html`), R.spielPruefseite(liste, pfad))
  // Detailseite: je Vorschlag eine Anzeige (ta, Tag 1 / sz, Tag 3 / shz, Tag 1)
  const detail = [['A', 'ta', 0, 1], ['B', 'sz', 1, 4], ['C', 'shz', 0, 1]].map(([v, zid, ii, g]) => ({
    spiel, daten, z: zeit.find((z) => z.id === zid), inhalt: inhalte[ii] ?? inhalte[0], vorschlag: v, gewinner: g, monat, pfad,
  }))
  fs.writeFileSync(path.join(ziel, `${spiel.id}_detail.html`), R.spielPruefseite(detail, pfad))
  console.log(`${spiel.id}: ${liste.length} Anzeigen → _pruef/${spiel.id}.html (+ _detail)`)
}
const fehlend = [...cache.keys()].filter((k) => cache.get(k).startsWith('FEHLT:'))
if (fehlend.length) { fehler++; console.error('FEHLENDE BILDER: ' + fehlend.join(', ')) }
console.log(fehler ? `${fehler} FEHLER` : 'ALLE PRÜFUNGEN OK')
process.exit(fehler ? 1 : 0)
