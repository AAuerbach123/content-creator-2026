// /api/dialog — der KI-Dialog-Kern (Phase 1).
// Nimmt eine strukturierte Anfrage entgegen, wählt den passenden System-Prompt,
// ruft Claude Sonnet 4.6 und gibt strukturiertes JSON + Kosten-Schätzung zurück.

import { NextResponse } from 'next/server'
import {
  ClaudeFehler,
  claudeAnfragen,
  jsonAusText,
  type ClaudeNachricht,
} from '@/lib/anthropic'
import {
  SYSTEM_BRIEFING,
  SYSTEM_EDITOR_BEFEHL,
  SYSTEM_MC_VORLAGE,
  SYSTEM_RICHTUNGEN,
  SYSTEM_ROUTER,
  SYSTEM_SCHRITTPLAN,
} from '@/lib/dialog-prompts'

export const runtime = 'nodejs'

type Aktion =
  | 'einstieg-erkennen'
  | 'briefing-frage'
  | 'drei-richtungen'
  | 'schrittplan'
  | 'mc-vorlage'
  | 'editor-befehl'

type Anfrage = {
  aktion: Aktion
  sprache?: 'de' | 'en'
  nutzerText?: string
  jobKontext?: Record<string, unknown>
  historie?: { rolle: 'nutzer' | 'ki'; text: string }[]
}

function systemFuer(aktion: Aktion): string {
  switch (aktion) {
    case 'einstieg-erkennen':
      return SYSTEM_ROUTER
    case 'briefing-frage':
      return SYSTEM_BRIEFING
    case 'drei-richtungen':
      return SYSTEM_RICHTUNGEN
    case 'schrittplan':
      return SYSTEM_SCHRITTPLAN
    case 'mc-vorlage':
      return SYSTEM_MC_VORLAGE
    case 'editor-befehl':
      return SYSTEM_EDITOR_BEFEHL
  }
}

export async function POST(request: Request) {
  let body: Anfrage
  try {
    body = (await request.json()) as Anfrage
  } catch {
    return NextResponse.json({ fehler: 'Body ist kein gültiges JSON.' }, { status: 400 })
  }

  if (!body.aktion) {
    return NextResponse.json({ fehler: 'Feld „aktion" fehlt.' }, { status: 400 })
  }

  const system = systemFuer(body.aktion)

  // Nutzer-Nachricht bauen: einheitliches Format „Kontext + Auftrag"
  const kontextText = body.jobKontext
    ? `Kontext (Job):\n${JSON.stringify(body.jobKontext, null, 2)}\n\n`
    : ''
  const historieText =
    body.historie && body.historie.length
      ? `Dialog bisher:\n${body.historie
          .map((n) => `${n.rolle === 'nutzer' ? 'Nutzer' : 'KI'}: ${n.text}`)
          .join('\n')}\n\n`
      : ''
  const nutzerBlock = body.nutzerText ? `Nutzer sagt: ${body.nutzerText}\n\n` : ''
  const spracheHinweis = `Antwort-Sprache: ${body.sprache === 'en' ? 'englisch' : 'deutsch'}.\n\n`

  const nachrichten: ClaudeNachricht[] = [
    {
      role: 'user',
      content: `${spracheHinweis}${kontextText}${historieText}${nutzerBlock}Bitte antworte im vorgeschriebenen JSON-Format für Aktion „${body.aktion}".`,
    },
  ]

  try {
    const antwort = await claudeAnfragen({
      systemPrompt: system,
      nachrichten,
      maxTokens: body.aktion === 'drei-richtungen' ? 2200 : 1400,
      temperature: body.aktion === 'drei-richtungen' ? 0.9 : 0.6,
    })

    const daten = jsonAusText<Record<string, unknown>>(antwort.text)

    return NextResponse.json({
      ok: true,
      aktion: body.aktion,
      daten,
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
