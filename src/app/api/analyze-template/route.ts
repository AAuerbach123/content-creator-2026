// /api/analyze-template — Vorlagen-Analyse (Weg C).
// Nimmt ein hochgeladenes Bild (PNG/JPG) oder eine PDF-Seite als Base64 entgegen,
// schickt sie an Claude Vision und liefert eine VorlagenAnalyse zurück
// (Farben, Schriften, Textgefäße, geschätztes Format).

import { NextResponse } from 'next/server'
import {
  ClaudeFehler,
  claudeAnfragen,
  jsonAusText,
  type ClaudeNachricht,
} from '@/lib/anthropic'
import { ERLAUBTE_BILD_MIMES, LIMITS, begrenzeBase64 } from '@/lib/eingabe-limit'

export const runtime = 'nodejs'

const SYSTEM_ANALYSE = `Du bist ein Grafiker-Assistent und analysierst eine hochgeladene Vorlage (Zeitungs- oder Zeitschriften-Anzeige, Social-Post, Screenshot). Ziel: die wichtigsten Gestaltungsmerkmale erkennen, damit der Grafiker sie übernehmen, aus dem Brand-Kit ziehen oder neu wählen kann.

Antworte STRIKT als valides JSON in einem einzigen Objekt, keine Erklärung davor oder danach, kein Markdown-Codefence.

Antwortformat:
{
  "format": { "breite": <zahl>, "hoehe": <zahl>, "einheit": "mm" | "px" },
  "farben": ["#RRGGBB", "#RRGGBB", ...],
  "schriftKandidaten": ["<z.B. Montserrat 900>", "<Lexend Regular>", ...],
  "textGefaesse": [
    { "name": "Headline", "text": "<Text falls lesbar>" },
    { "name": "Subline", "text": "<...>" },
    { "name": "Body", "text": "<...>" },
    { "name": "CTA", "text": "<...>" }
  ],
  "bemerkungen": "<1-2 Sätze zur Bildwelt/Layout>"
}

Wenn du eine Info nicht sicher lesen kannst, lass das Feld leer (leerer String / leeres Array). Erfinde nichts.`

export async function POST(request: Request) {
  let body: { base64: string; mediaType: string; sprache?: 'de' | 'en' }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ fehler: 'Body ist kein gültiges JSON.' }, { status: 400 })
  }

  if (!body.base64 || !body.mediaType) {
    return NextResponse.json(
      { fehler: 'Felder „base64" und „mediaType" werden benötigt.' },
      { status: 400 },
    )
  }
  if (!ERLAUBTE_BILD_MIMES.has(body.mediaType)) {
    return NextResponse.json(
      { fehler: `Nicht unterstützter Typ „${body.mediaType}". Erlaubt: PNG, JPG, WEBP, PDF.` },
      { status: 400 },
    )
  }
  const groesse = begrenzeBase64('base64', body.base64, LIMITS.base64Bild)
  if (!groesse.ok) return NextResponse.json({ fehler: groesse.nachricht }, { status: groesse.status })

  const spracheHinweis = `Antwort-Sprache für Freitext-Felder: ${
    body.sprache === 'en' ? 'englisch' : 'deutsch'
  }.`

  const nachrichten: ClaudeNachricht[] = [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: body.mediaType, data: body.base64 } },
        { type: 'text', text: `${spracheHinweis}\nBitte analysiere die Vorlage und antworte im JSON-Format.` },
      ],
    },
  ]

  try {
    const antwort = await claudeAnfragen({
      systemPrompt: SYSTEM_ANALYSE,
      nachrichten,
      maxTokens: 1400,
      temperature: 0.2,
    })

    const daten = jsonAusText<Record<string, unknown>>(antwort.text)

    return NextResponse.json({
      ok: true,
      analyse: daten,
      rohtext: daten ? undefined : antwort.text,
      modell: antwort.modell,
      eingabeTokens: antwort.eingabeTokens,
      ausgabeTokens: antwort.ausgabeTokens,
      kostenUsd: antwort.kostenUsd,
    })
  } catch (fehler) {
    if (fehler instanceof ClaudeFehler) {
      return NextResponse.json(
        { fehler: fehler.message, statusOben: fehler.status },
        { status: fehler.status },
      )
    }
    return NextResponse.json(
      { fehler: fehler instanceof Error ? fehler.message : 'Unbekannter Fehler' },
      { status: 500 },
    )
  }
}
