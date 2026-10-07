#!/usr/bin/env node
// Phase 6 – Testdaten für die Korrekturportal-Anbindung.
// Erzeugt 5 erfundene Portal-Rückmeldungen, lässt sie von /api/korrekturen/einordnen klassifizieren
// und prüft, dass Telefon-/TNB-Korrekturen NIE als automatisch anwendbar markiert werden.
// Nur Testdaten – kein echter Portal-Zugriff, keine echten Verlagsdaten.
// Aufruf: node scripts/_test_korrekturen.mjs [BASIS=http://localhost:3000]

import crypto from 'node:crypto'

const BASIS = process.argv[2] || 'http://localhost:3000'

const TEST = [
  {
    grp: 'SWMH', paper: 'swmh_Variante-1_mit-Gewinner_Spieltag-07', variant: '1', winner: 'mit',
    kategorie: 'Text', status: 'change', autor: 'Jenny Wiegandt', ts: Date.now(),
    text: 'Die Frage am Spieltag 7 enthält einen Tippfehler: „Gipfel“ statt „Giepfel“.',
  },
  {
    grp: 'SWMH', paper: 'swmh_Variante-1_mit-Gewinner_Spieltag-12', variant: '1', winner: 'mit',
    kategorie: 'Text', status: 'change', autor: 'Yasmina Salah', ts: Date.now() - 86400000,
    text: 'Bei Antwort 2 „Rom“ ist das korrekt, aber die Reihenfolge auf 1 und 2 bitte tauschen.',
  },
  {
    grp: 'Ippen', paper: 'ippen_Variante-1_mit-Gewinner_Spieltag-03', variant: '1', winner: 'mit',
    kategorie: 'Logo', status: 'change', autor: 'Grafik Ippen', ts: Date.now() - 2 * 86400000,
    text: 'Logo unten rechts ist zu klein – bitte etwa 20 % größer.',
  },
  {
    grp: 'Funke', paper: 'funke_Variante-1_mit-Gewinner_Spieltag-05', variant: '1', winner: 'mit',
    kategorie: 'Sonstiges', status: 'change', autor: 'Redaktion', ts: Date.now() - 3 * 86400000,
    text: 'Die Telefonnummer 01378 44 12 11 passt nicht zu unserer – bitte prüfen.',
  },
  {
    grp: 'Schwabo', paper: 'schwabo_Variante-1_mit-Gewinner_Spieltag-01', variant: '1', winner: 'mit',
    kategorie: 'Text', status: 'change', autor: 'Rechtsabteilung', ts: Date.now() - 4 * 86400000,
    text: 'Teilnahmebedingungen: Satz zum Datenschutz ergänzen (DSGVO-Konformität).',
  },
]

const mitIds = TEST.map((c) => ({
  ...c,
  id: crypto.createHash('sha256').update([c.grp, c.paper, c.variant, c.winner, c.ts, c.autor, c.text].join('§')).digest('hex').slice(0, 16),
}))

let fehler = 0
const pruefe = (ok, text) => { if (!ok) { fehler++; console.error('FEHLER: ' + text) } else console.log('OK   ' + text) }

const res = await fetch(BASIS + '/api/korrekturen/einordnen', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ korrekturen: mitIds }),
}).catch((e) => ({ ok: false, text: async () => (e?.message ?? String(e)) }))

if (!res.ok) {
  const txt = typeof res.text === 'function' ? await res.text() : 'HTTP ' + res.status
  console.log('Dev-Server nicht erreichbar oder Fehler: ' + txt)
  console.log('Starte `npm run dev` und rufe das Skript erneut auf.')
  process.exit(0)
}

const antwort = await res.json()
const liste = antwort.einordnungen ?? []
pruefe(Array.isArray(liste), 'Antwort enthält einordnungen-Array')
pruefe(liste.length === mitIds.length, `Einordnungen vorhanden (${liste.length}/${mitIds.length})`)

// Server-Guard-Check: Telefon + TNB nie automatisch
for (const e of liste) {
  if (e.feld === 'telefon' || e.feld === 'tnb') pruefe(!e.automatisch, `Rückmeldung ${e.id} (${e.feld}): nicht automatisch angewendet`)
}

console.log('\nErgebnis:')
for (const e of liste) {
  console.log(`  ${e.id.slice(0, 8)}  feld=${e.feld.padEnd(8)}  sicherheit=${(e.sicherheit * 100).toFixed(0)}%  automatisch=${e.automatisch}  ${JSON.stringify(e.ziel)}`)
}

console.log(fehler ? `\n${fehler} FEHLER` : '\nALLES OK')
process.exit(fehler ? 1 : 0)
