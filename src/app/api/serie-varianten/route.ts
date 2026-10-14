// /api/serie-varianten — KI beim Aufsetzen eines (neuen) Spiels im Serien-Modus.
//  aktion "varianten":  3 Umsetzungsvarianten (A/B/C) für Titel, Unterzeile, Schritte, Hinweis – mit Zusatzvorgaben.
//  aktion "verbessern": 3 Formulierungs-Vorschläge für EIN Textfeld (Titel, Unterzeile, Hinweis, Schritt).
// Claude über den vorhandenen Helfer (src/lib/anthropic.ts, Schlüssel ANTHROPIC_API_KEY aus der Umgebung).
// Jede Antwort wird streng geprüft (src/lib/serie/serie-ki.ts) – sonst Fehlermeldung statt Anzeigentext.

import { NextResponse } from 'next/server'
import { ClaudeFehler, claudeJson } from '@/lib/anthropic'
import { spielFinden } from '@/lib/serie/spiele'
import { GRENZEN, erlaubteBetraege, sichtbar, variantenValidieren, verbesserungenValidieren, type TextFeld } from '@/lib/serie/serie-ki'
import type { SpielDef } from '@/lib/serie/spiele/typen'

export const runtime = 'nodejs'

type Anfrage = {
  aktion?: 'varianten' | 'verbessern'
  spielId?: string
  zeitung?: string
  zusatz?: string
  feld?: TextFeld
  text?: string
}

const REGELN = `Verbindliche Regeln:
- Sprache Deutsch, echte Umlaute und ß (niemals ae/oe/ue/ss als Ersatz).
- Zielgruppe: Zeitungsleserinnen und -leser (überwiegend 50+), klar, freundlich, seriös, keine Anglizismen.
- KEINE Telefonnummern, KEINE Preise pro Anruf, KEINE Teilnahmebedingungen, KEINE Rechts-, Garantie-, Kosten- oder Datenschutzaussagen (z. B. „garantiert“, „kostenlos“, „ab 18“).
- Geldbeträge NUR aus dieser Liste verwenden (keine anderen Zahlen mit €): {BETRAEGE}. In der Unterzeile den Tagespreis als Platzhalter {TAGESPREIS} schreiben.
- Die Spielmechanik (wie man antwortet und gewinnt) darf NICHT verändert werden – nur Ton, Wortwahl, Länge.
- Erlaubtes HTML: nur <b>…</b> und <br>. Sonst reiner Text.
- Antworte ausschließlich mit EINEM gültigen JSON-Objekt, ohne Codefence, ohne Text davor oder danach. In Texten typografische Anführungszeichen („…“) verwenden.`

function spielKontext(spiel: SpielDef): string {
  const m = spiel.mechanik
  const mech =
    m.art === 'geldpakete'
      ? 'Sechs Geldpakete (100 € bis 10.000 €), je eigene Hotline, Endziffer = Antwort 1 oder 2'
      : m.art === 'tagespreis'
        ? `Tagespreis ${m.tagespreis} wird unter den richtigen Anrufen verlost${m.supertag ? `, mittwochs ${m.supertag} (Supermittwoch)` : ''}`
        : `Tagespreis ${m.tagespreis} wird verlost, zusätzlich Jackpot im geheimen Zeitfenster`
  return JSON.stringify(
    {
      name: spiel.name,
      beschreibung: spiel.beschreibung,
      mechanik: mech,
      antwortart: spiel.antwort === 'zwei' ? 'zwei Antworten, Hotline mit Endziffer 1 oder 2' : spiel.antwort === 'ansagen' ? 'zwei Antworten zur Auswahl, eine Hotline, richtige Antwort am Telefon aufsprechen' : 'Lösungswort am Telefon nennen',
      bisher: { titel: spiel.titel, unterzeile: spiel.unterzeile, schritte: spiel.schritte, hinweis: spiel.hinweis },
    },
    null,
    2,
  )
}

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
  const spiel = body.spielId ? spielFinden(body.spielId) : undefined
  if (!spiel) return fehler('Unbekanntes Spiel (Feld „spielId“). Geldregen ist freigegeben und hat keine KI-Varianten.')
  const zusatz = (body.zusatz ?? '').slice(0, GRENZEN.zusatz)
  const zeitung = (body.zeitung ?? '').slice(0, 120)
  const betr = erlaubteBetraege(spiel)
  const regeln = REGELN.replace('{BETRAEGE}', betr.join(', ') || 'keine')

  let system: string
  let auftrag: string
  let maxTokens = 2600
  if ((body.aktion ?? 'varianten') === 'varianten') {
    system = `Du bist Werbetexter und Art Director für Gewinnspiel-Anzeigen in deutschen Tageszeitungen (Telemedia).
Du schlägst genau DREI Umsetzungsvarianten für den Text-Rahmen eines Spiels vor. Jede Variante gehört zu einer Gestaltungsfamilie:
A = „Goldene Nacht“ (Nachtblau/Gold, edel), B = „Hell & Hausfarbe“ (hell, ruhig, Farbspalte links), C = „Hausfarbe mit Verlauf“ (kräftig, plakativ).
Formuliere passend zur Familie und unterscheide die Varianten deutlich im Ton.
Längen (sichtbare Zeichen): titel ≤ ${GRENZEN.titel} (gern mit <br> zweizeilig), unterzeile ≤ ${GRENZEN.unterzeile}, schritte 3–4 Stück je ≤ ${GRENZEN.schritt}, hinweis.titel ≤ ${GRENZEN.hinweisTitel}, hinweis.text ≤ ${GRENZEN.hinweisText}, name ≤ ${GRENZEN.name}, begruendung ≤ 300.
Format: {"varianten":[{"vorschlag":"A","name":"…","begruendung":"…","titel":"…","unterzeile":"…","schritte":["…","…","…"],"hinweis":{"titel":"…","text":"…"}}, {…"B"…}, {…"C"…}]}
${regeln}`
    auftrag = `Spiel:\n${spielKontext(spiel)}\n\n${zeitung ? `Zeitung: ${zeitung}\n\n` : ''}Zusatzvorgaben des Grafikers: ${zusatz || '(keine)'}\n\nBitte jetzt die drei Varianten A, B, C als JSON.`
  } else {
    const feld = body.feld
    if (!feld || !['titel', 'unterzeile', 'hinweis', 'schritt'].includes(feld)) return fehler('Feld „feld“ fehlt oder ist ungültig.')
    const text = (body.text ?? '').slice(0, 600)
    if (!sichtbar(text)) return fehler('Feld „text“ ist leer.')
    const max = feld === 'titel' ? GRENZEN.titel : feld === 'unterzeile' ? GRENZEN.unterzeile : feld === 'schritt' ? GRENZEN.schritt : GRENZEN.hinweisText
    system = `Du bist Werbetexter für Gewinnspiel-Anzeigen in deutschen Tageszeitungen. Du verbesserst EIN Textfeld einer Anzeige: klarer, kürzer, lesefreundlicher – Inhalt und Mechanik bleiben gleich.
Liefere genau drei Vorschläge, jeweils höchstens ${max} sichtbare Zeichen.
Format: {"vorschlaege":["…","…","…"]}
${regeln}`
    auftrag = `Spiel:\n${spielKontext(spiel)}\n\nFeld: ${feld}\nBisheriger Text: ${text}\n\nZusatzvorgaben: ${zusatz || '(keine)'}\n\nBitte drei Vorschläge als JSON.`
    maxTokens = 900
  }

  try {
    const antwort = await claudeJson<Record<string, unknown>>({
      systemPrompt: system,
      nachrichten: [{ role: 'user', content: auftrag }],
      maxTokens,
      temperature: (body.aktion ?? 'varianten') === 'varianten' ? 0.9 : 0.7,
    })
    const kosten = { modell: antwort.modell, eingabeTokens: antwort.eingabeTokens, ausgabeTokens: antwort.ausgabeTokens, kostenUsd: antwort.kostenUsd }
    if (!antwort.daten) return NextResponse.json({ ok: false, fehler: 'Die KI hat kein gültiges JSON geliefert. Bitte noch einmal versuchen.', ...kosten }, { status: 502 })
    if ((body.aktion ?? 'varianten') === 'varianten') {
      const p = variantenValidieren(antwort.daten, spiel)
      if (!p.ok) return NextResponse.json({ ok: false, fehler: 'KI-Antwort abgelehnt: ' + p.grund, ...kosten }, { status: 422 })
      return NextResponse.json({ ok: true, varianten: p.varianten, ...kosten })
    }
    const p = verbesserungenValidieren(antwort.daten, spiel, body.feld as TextFeld)
    if (!p.ok) return NextResponse.json({ ok: false, fehler: 'KI-Antwort abgelehnt: ' + p.grund, ...kosten }, { status: 422 })
    return NextResponse.json({ ok: true, vorschlaege: p.vorschlaege, ...kosten })
  } catch (e) {
    if (e instanceof ClaudeFehler) return NextResponse.json({ ok: false, fehler: e.message }, { status: e.status })
    return NextResponse.json({ ok: false, fehler: e instanceof Error ? e.message : 'Unbekannter Fehler' }, { status: 500 })
  }
}
