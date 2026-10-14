// /api/serie-fragen — KI schlägt Tagesfragen (Frage + 2 Antworten + richtige Antwort) für einen Monat vor.
// Nur für Spiele mit zwei Antworten (Geldregen u. a.). Ergebnis ist ein VORSCHLAG: Die Oberfläche markiert ihn
// deutlich („KI-Vorschlag – bitte Fakten prüfen“); nichts geht ungeprüft in den Druck.
// Claude über src/lib/anthropic.ts (ANTHROPIC_API_KEY aus der Umgebung).

import { NextResponse } from 'next/server'
import { ClaudeFehler, claudeJson } from '@/lib/anthropic'
import { GRENZEN, fragenValidieren } from '@/lib/serie/serie-ki'
import { spielFinden } from '@/lib/serie/spiele'
import { MONATE } from '@/lib/serie/spiele/kalender'

export const runtime = 'nodejs'

type Anfrage = { monat?: string; anzahl?: number; spielId?: string; zusatz?: string; labels?: string[] }

function fehler(text: string, status = 400) {
  return NextResponse.json({ ok: false, fehler: text }, { status })
}

export async function POST(request: Request) {
  let body: Anfrage
  try {
    body = (await request.json()) as Anfrage
  } catch {
    return fehler('Body ist kein gültiges JSON.')
  }
  const monat = body.monat ?? ''
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monat)) return fehler('Feld „monat“ muss JJJJ-MM sein.')
  const anzahl = Math.round(Number(body.anzahl))
  if (!(anzahl >= 1 && anzahl <= 31)) return fehler('Feld „anzahl“ muss zwischen 1 und 31 liegen.')
  let spielText = 'Geldregen: eine Quizfrage zum Allgemeinwissen, zwei Antworten; Leser rufen die Hotline mit der Endziffer ihrer Antwort an.'
  if (body.spielId && body.spielId !== 'geldregen') {
    const spiel = spielFinden(body.spielId)
    if (!spiel) return fehler('Unbekanntes Spiel.')
    if (spiel.antwort !== 'zwei') return fehler('Dieses Spiel hat keine zwei Antworten (Lösungswort) – Tagesfragen passen hier nicht.')
    spielText = `${spiel.name}: ${spiel.beschreibung}`
  }
  const labels = Array.isArray(body.labels) ? body.labels.slice(0, anzahl).map((l) => String(l).slice(0, 60)) : []
  const zusatz = (body.zusatz ?? '').slice(0, GRENZEN.zusatz)
  const [jahr, m] = monat.split('-').map(Number)

  const system = `Du schreibst Tagesfragen für ein Telefon-Gewinnspiel in deutschen Tageszeitungen (Leser überwiegend 50+).
Jede Frage hat genau zwei Antworten; genau eine ist eindeutig und nachprüfbar richtig, die andere eindeutig falsch, aber plausibel.
Regeln:
- Deutsch, echte Umlaute und ß (nie ae/oe/ue als Ersatz).
- Allgemeinwissen, leicht bis mittel, freundlich; gern mit Bezug zur Jahreszeit/zum Monat. KEINE Politik, Religion im Streitfall, Krankheit, Unglücke, Werbung, Marken.
- Nur Fakten, die du sicher weißt. Keine Jahrestage, Zahlen oder Rekorde, bei denen du unsicher bist.
- Keine Telefonnummern, keine Preise, keine Rechtsaussagen.
- Frage höchstens ${GRENZEN.frage} Zeichen, jede Antwort höchstens ${GRENZEN.antwort} Zeichen (sie stehen in kleinen Antwortfeldern).
- Richtige Antwort ausgewogen verteilen (etwa gleich oft 1 und 2), keine Frage doppelt.
Format (nur EIN JSON-Objekt, ohne Codefence): {"fragen":[{"frage":"…","a1":"…","a2":"…","richtig":1}]}`

  const auftrag = `Spiel: ${spielText}
Monat: ${MONATE[m]} ${jahr}
Anzahl Fragen: ${anzahl}
${labels.length ? `Spieltage (in dieser Reihenfolge): ${labels.join(' | ')}\n` : ''}Zusatzvorgaben: ${zusatz || '(keine)'}
Bitte genau ${anzahl} Fragen als JSON.`

  try {
    const antwort = await claudeJson<Record<string, unknown>>({
      systemPrompt: system,
      nachrichten: [{ role: 'user', content: auftrag }],
      maxTokens: Math.min(8000, 400 + anzahl * 120),
      temperature: 0.8,
    })
    const kosten = { modell: antwort.modell, eingabeTokens: antwort.eingabeTokens, ausgabeTokens: antwort.ausgabeTokens, kostenUsd: antwort.kostenUsd }
    if (!antwort.daten) return NextResponse.json({ ok: false, fehler: 'Die KI hat kein gültiges JSON geliefert. Bitte noch einmal versuchen.', ...kosten }, { status: 502 })
    const p = fragenValidieren(antwort.daten, anzahl)
    if (!p.ok) return NextResponse.json({ ok: false, fehler: 'KI-Antwort abgelehnt: ' + p.grund, ...kosten }, { status: 422 })
    return NextResponse.json({ ok: true, fragen: p.fragen, verworfen: p.verworfen, ...kosten })
  } catch (e) {
    if (e instanceof ClaudeFehler) return NextResponse.json({ ok: false, fehler: e.message }, { status: e.status })
    return NextResponse.json({ ok: false, fehler: e instanceof Error ? e.message : 'Unbekannter Fehler' }, { status: 500 })
  }
}
