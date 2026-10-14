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
  stopGrund?: string
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
    stop_reason?: string
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

  return { text, eingabeTokens, ausgabeTokens, kostenUsd, modell, stopGrund: daten.stop_reason }
}

// JSON aus dem Text extrahieren – robust gegen die typischen KI-Fehler:
//  - Markdown-Codefence (```json … ```)
//  - Text vor/nach dem Objekt
//  - deutsche Anführungszeichen mit geradem Schluss: „Text" (häufigste Ursache!)
//  - unmaskierte " oder echte Zeilenumbrüche innerhalb von Strings
//  - Komma vor } oder ]
export function jsonAusText<T>(text: string): T | null {
  const kandidaten: string[] = []
  let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  kandidaten.push(t)
  const start = t.indexOf('{')
  const ende = t.lastIndexOf('}')
  if (start >= 0 && ende > start) {
    t = t.slice(start, ende + 1)
    kandidaten.push(t)
  }
  kandidaten.push(jsonReparieren(t))
  for (const k of kandidaten) {
    try {
      return JSON.parse(k) as T
    } catch {
      /* nächster Kandidat */
    }
  }
  return null
}

export function jsonReparieren(roh: string): string {
  // 1) „…" → „…“ (deutsches Anführungszeichen unten, gerades oben)
  let s = roh.replace(/„([^"„“\n]{0,200})"/g, '„$1“')
  // 2) Zeichenweise: " innerhalb eines Strings maskieren, wenn danach kein Struktur-Zeichen folgt
  let aus = ''
  let imString = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (imString) {
      if (c === '\\') {
        aus += c + (s[i + 1] ?? '')
        i++
        continue
      }
      if (c === '"') {
        let j = i + 1
        while (j < s.length && /\s/.test(s[j])) j++
        const naechstes = s[j]
        if (naechstes === undefined || naechstes === ',' || naechstes === '}' || naechstes === ']' || naechstes === ':') {
          imString = false
          aus += c
        } else {
          aus += '\\"'
        }
        continue
      }
      if (c === '\n') { aus += '\\n'; continue }
      if (c === '\r') continue
      if (c === '\t') { aus += '\\t'; continue }
      aus += c
    } else {
      if (c === '"') imString = true
      aus += c
    }
  }
  // 3) Komma vor schließender Klammer entfernen
  s = aus.replace(/,\s*([}\]])/g, '$1')
  return s
}

// Claude aufrufen und gültiges JSON erzwingen: bei Abbruch wegen Länge einmal mit mehr Tokens,
// bei kaputtem JSON einmal mit Reparatur-Auftrag nachfragen. Kosten werden summiert.
export async function claudeJson<T>(a: ClaudeAnfrage): Promise<ClaudeAntwort & { daten: T | null }> {
  let antwort = await claudeAnfragen(a)
  let daten = jsonAusText<T>(antwort.text)
  let kosten = antwort.kostenUsd ?? 0
  let ein = antwort.eingabeTokens ?? 0
  let ausg = antwort.ausgabeTokens ?? 0

  if (!daten && antwort.stopGrund === 'max_tokens') {
    antwort = await claudeAnfragen({ ...a, maxTokens: Math.min(8000, (a.maxTokens ?? 1500) * 2) })
    daten = jsonAusText<T>(antwort.text)
    kosten += antwort.kostenUsd ?? 0; ein += antwort.eingabeTokens ?? 0; ausg += antwort.ausgabeTokens ?? 0
  }
  if (!daten) {
    const reparatur = await claudeAnfragen({
      ...a,
      temperature: 0,
      maxTokens: Math.min(8000, (a.maxTokens ?? 1500) * 2),
      nachrichten: [
        ...a.nachrichten,
        { role: 'assistant', content: antwort.text.slice(0, 12000) || '{}' },
        {
          role: 'user',
          content:
            'Deine letzte Antwort war kein gültiges JSON. Gib denselben Inhalt noch einmal aus – ausschließlich als EIN gültiges JSON-Objekt, ohne Codefence und ohne Text davor oder danach. In Texten nur typografische Anführungszeichen („…“) verwenden oder " mit \\" maskieren.',
        },
      ],
    })
    const d2 = jsonAusText<T>(reparatur.text)
    kosten += reparatur.kostenUsd ?? 0; ein += reparatur.eingabeTokens ?? 0; ausg += reparatur.ausgabeTokens ?? 0
    if (d2) {
      daten = d2
      antwort = reparatur
    }
  }
  return { ...antwort, daten, kostenUsd: kosten, eingabeTokens: ein, ausgabeTokens: ausg }
}
