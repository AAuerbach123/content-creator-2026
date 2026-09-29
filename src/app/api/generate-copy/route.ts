// /api/generate-copy — Text-Bausteine mit Claude Sonnet:
// Headline, Subline, CTA, Body, Caption (Social), Hashtags.
// Immer 3 Varianten pro Slot; Ton wählbar.

import { NextResponse } from 'next/server'
import { ClaudeFehler, claudeAnfragen, jsonAusText } from '@/lib/anthropic'

export const runtime = 'nodejs'

type Slot = 'headline' | 'subline' | 'cta' | 'body' | 'caption' | 'hashtags'

type Anfrage = {
  slot: Slot
  briefing?: string
  ziel?: string
  kanal?: string
  ton?: 'nuechtern' | 'frech' | 'seriös' | 'werblich' | 'empathisch'
  sprache?: 'de' | 'en'
  laenge?: 'kurz' | 'mittel' | 'lang'
  anzahl?: number
}

const SLOT_ANWEISUNG: Record<Slot, string> = {
  headline: 'Kurze Überschrift, max. 8 Wörter, aktivierend, keine reißerischen Superlative.',
  subline: 'Sub-Headline, max. 15 Wörter, ergänzt die Headline mit einem Nutzen oder Detail.',
  cta: 'Call-to-Action, max. 5 Wörter, imperativ, klare Aktion.',
  body: '2–3 Sätze Fließtext für den Anzeigen-Körper.',
  caption: 'Social-Media-Caption 1–3 Sätze mit passendem Ton für den Kanal.',
  hashtags: '5–8 relevante Hashtags, ohne führendes Rautezeichen wiederholt (das # kommt einmal).',
}

const SYSTEM_COPY = `Du bist ein Texter für Anzeigen, Social Posts und Web-Banner. Du schlägst immer mehrere Varianten vor.

REGELN:
- Nichts erfinden: keine Kontaktdaten, Rechtsaussagen, Preisversprechen. Unbestätigtes markieren.
- Antworte STRIKT als valides JSON. Kein Fließtext davor oder danach, kein Markdown-Codefence.
- Verwende die Sprache aus dem Kontext (deutsch oder englisch).
- Halte den vorgegebenen Ton konsequent durch.
- Antwortformat:
  { "varianten": ["…", "…", "…"], "begruendung": "kurz warum genau diese drei" }
`

export async function POST(request: Request) {
  let body: Anfrage
  try {
    body = (await request.json()) as Anfrage
  } catch {
    return NextResponse.json({ fehler: 'Body ist kein gültiges JSON.' }, { status: 400 })
  }
  if (!body.slot || !(body.slot in SLOT_ANWEISUNG)) {
    return NextResponse.json(
      { fehler: `Feld „slot" fehlt oder ist ungültig. Erlaubt: ${Object.keys(SLOT_ANWEISUNG).join(', ')}` },
      { status: 400 },
    )
  }
  const anzahl = body.anzahl && body.anzahl > 0 && body.anzahl <= 6 ? body.anzahl : 3

  const auftrag = `Aufgabe: erzeuge ${anzahl} Varianten für den Slot „${body.slot}".
Slot-Regel: ${SLOT_ANWEISUNG[body.slot]}
Ziel: ${body.ziel || '(nicht angegeben)'}
Kanal: ${body.kanal || '(nicht angegeben)'}
Ton: ${body.ton || 'neutral'}
Länge: ${body.laenge || 'automatisch'}
Antwort-Sprache: ${body.sprache === 'en' ? 'englisch' : 'deutsch'}

Briefing:
${body.briefing || '(kein Briefing)'}
`

  try {
    const antwort = await claudeAnfragen({
      systemPrompt: SYSTEM_COPY,
      nachrichten: [{ role: 'user', content: auftrag }],
      maxTokens: 700,
      temperature: 0.8,
    })
    const daten = jsonAusText<{ varianten: string[]; begruendung?: string }>(antwort.text)

    return NextResponse.json({
      ok: true,
      slot: body.slot,
      varianten: daten?.varianten || [],
      begruendung: daten?.begruendung,
      rohtext: daten ? undefined : antwort.text,
      modell: antwort.modell,
      eingabeTokens: antwort.eingabeTokens,
      ausgabeTokens: antwort.ausgabeTokens,
      kostenUsd: antwort.kostenUsd,
    })
  } catch (fehler) {
    if (fehler instanceof ClaudeFehler) {
      return NextResponse.json({ fehler: fehler.message }, { status: fehler.status })
    }
    return NextResponse.json(
      { fehler: fehler instanceof Error ? fehler.message : 'Unbekannter Fehler' },
      { status: 500 },
    )
  }
}
