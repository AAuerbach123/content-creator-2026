// Dünner Wrapper um die Anthropic Messages API — Cloudflare-Worker-freundlich,
// nur fetch(), keine SDK-Abhängigkeit.
//
// Verwendet:
//   - process.env.ANTHROPIC_API_KEY (lokal aus .env.local, online aus wrangler secret)
//   - Modell: Claude Sonnet 4.6 (aktueller Standard)
//
// Gibt zusätzlich Kosten-Schätzung zurück, damit /api/dialog sie in den KI-Verlauf schreiben kann.

export const CLAUDE_MODELL = 'claude-sonnet-4-6'

// Preis pro 1 M Tokens für Sonnet 4.6 (Stand 2026-09; für Verlaufs-Kostenschätzung, nicht abrechnungsrelevant)
const PREIS_INPUT_PRO_M = 3
const PREIS_OUTPUT_PRO_M = 15

export type ClaudeContent =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

export type ClaudeNachricht = {
  role: 'user' | 'assistant'
  content: string | ClaudeContent[]
}

export type ClaudeAntwort = {
  text: string
  eingabeTokens?: number
  ausgabeTokens?: number
  kostenUsd?: number
  modell: string
}

export type ClaudeAnfrage = {
  systemPrompt: string
  nachrichten: ClaudeNachricht[]
  maxTokens?: number
  temperature?: number
  modell?: string
}

export class ClaudeFehler extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ClaudeFehler'
  }
}

export async function claudeAnfragen(a: ClaudeAnfrage): Promise<ClaudeAntwort> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new ClaudeFehler(
      500,
      'ANTHROPIC_API_KEY fehlt. In .env.local (lokal) bzw. per `wrangler secret put ANTHROPIC_API_KEY` (online) hinterlegen.',
    )
  }

  const modell = a.modell || CLAUDE_MODELL

  const antwort = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modell,
      max_tokens: a.maxTokens ?? 1500,
      temperature: a.temperature ?? 0.7,
      system: a.systemPrompt,
      messages: a.nachrichten,
    }),
  })

  if (!antwort.ok) {
    const fehlerText = await antwort.text()
    throw new ClaudeFehler(antwort.status, `Claude ${antwort.status}: ${fehlerText.slice(0, 500)}`)
  }

  const daten = (await antwort.json()) as {
    content: { type: string; text?: string }[]
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const text = daten.content
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text as string)
    .join('\n')
    .trim()

  const eingabeTokens = daten.usage?.input_tokens
  const ausgabeTokens = daten.usage?.output_tokens
  const kostenUsd =
    eingabeTokens !== undefined && ausgabeTokens !== undefined
      ? (eingabeTokens * PREIS_INPUT_PRO_M + ausgabeTokens * PREIS_OUTPUT_PRO_M) / 1_000_000
      : undefined

  return { text, eingabeTokens, ausgabeTokens, kostenUsd, modell }
}

// Bequemer: JSON aus dem Text extrahieren, wenn wir strukturierte Antworten wollen.
export function jsonAusText<T>(text: string): T | null {
  // Erst versuchen, den kompletten Text als JSON zu parsen; sonst zwischen erstem { und letztem }.
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const start = trimmed.indexOf('{')
    const ende = trimmed.lastIndexOf('}')
    if (start >= 0 && ende > start) {
      try {
        return JSON.parse(trimmed.slice(start, ende + 1)) as T
      } catch {
        return null
      }
    }
    return null
  }
}
