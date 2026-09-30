// /api/generate-image — Bildgenerierung mit OpenAI gpt-image-Kette.
// Übernommen aus dem Ad-Creator, aber ohne SDK: rohes fetch für Cloudflare-Workers.
// Nimmt entweder einen bereits fertigen Prompt oder Motiv + Stil-Preset-ID entgegen.

import { NextResponse } from 'next/server'
import { stilById, stilPromptBauen } from '@/lib/stil-presets'
import { LIMITS } from '@/lib/eingabe-limit'

export const runtime = 'nodejs'

// Modell-Fallback wie im Ad-Creator (Regel 10: gpt-image-Kette bevorzugt).
const MODEL_KETTE = ['gpt-image-2', 'gpt-image-1.5', 'gpt-image-1']

// Preisschätzung pro Bild in USD (gpt-image-2 „medium"). Für den Verlaufs-Panel.
const PREIS_PRO_BILD_USD = 0.04

// IP-Substitutionen wie im Ad-Creator — Sicherheitsnetz gegen Content-Policy-Blocks.
const IP_SUBSTITUTIONS: [RegExp, string][] = [
  [/\bMickey Mouse\b/gi, 'cartoon mouse character'],
  [/\bDonald Duck\b/gi, 'cartoon duck character'],
  [/\bWalt Disney\b/gi, 'classic animation studio'],
  [/\bDisney\b/gi, 'fairytale animation'],
  [/\bPixar\b/gi, 'computer-animated film'],
  [/\bMarvel\b/gi, 'comic superhero'],
  [/\bSpider[- ]?Man\b/gi, 'spider-themed superhero'],
  [/\bIron Man\b/gi, 'armored superhero'],
  [/\bBatman\b/gi, 'bat-themed vigilante hero'],
  [/\bSuperman\b/gi, 'caped superhero'],
  [/\bWonder Woman\b/gi, 'warrior heroine'],
  [/\bStar Wars\b/gi, 'space opera'],
  [/\bDarth Vader\b/gi, 'dark armored space villain'],
  [/\bYoda\b/gi, 'small wise alien'],
  [/\bJedi\b/gi, 'space knight'],
  [/\bHarry Potter\b/gi, 'young wizard student'],
  [/\bHogwarts\b/gi, 'magical castle school'],
  [/\bDumbledore\b/gi, 'elderly wizard headmaster'],
  [/\bGandalf\b/gi, 'grey-bearded wizard'],
  [/\bMario\b/gi, 'Italian plumber game character'],
  [/\bPokemon\b/gi, 'creature-collecting game characters'],
]

function sanitize(prompt: string): { text: string; changed: boolean; ersetzt: string[] } {
  let text = prompt
  const ersetzt: string[] = []
  for (const [pattern, replacement] of IP_SUBSTITUTIONS) {
    if (pattern.test(text)) {
      const matches = text.match(pattern) || []
      for (const m of matches) ersetzt.push(`${m} → ${replacement}`)
      text = text.replace(pattern, replacement)
    }
  }
  return { text, changed: text !== prompt, ersetzt }
}

function istSafetyBlock(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    m.includes('safety system') ||
    m.includes('safety_system') ||
    m.includes('rejected by') ||
    m.includes('content policy') ||
    m.includes('content_policy_violation')
  )
}

async function bildErzeugen(
  prompt: string,
  kette: string[],
  orientierung: 'landscape' | 'portrait' | 'square',
): Promise<{ b64: string; modell: string } | { fehler: string }> {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return {
      fehler:
        'OPENAI_API_KEY fehlt. In .env.local (lokal) bzw. per `wrangler secret put OPENAI_API_KEY` (online) hinterlegen.',
    }
  }
  const size =
    orientierung === 'portrait'
      ? '1024x1536'
      : orientierung === 'square'
        ? '1024x1024'
        : '1536x1024'

  let letzterFehler = 'unbekannter Fehler'
  for (const modell of kette) {
    try {
      const antwort = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: modell,
          prompt,
          size,
          quality: 'medium',
          n: 1,
        }),
      })
      if (!antwort.ok) {
        const text = await antwort.text()
        letzterFehler = `${modell} → ${antwort.status}: ${text.slice(0, 300)}`
        if (istSafetyBlock(text)) return { fehler: letzterFehler }
        continue
      }
      const daten = (await antwort.json()) as { data?: { b64_json?: string; url?: string }[] }
      const item = daten.data?.[0]
      let b64 = item?.b64_json
      if (!b64 && item?.url) {
        const bild = await fetch(item.url)
        if (bild.ok) {
          const buf = await bild.arrayBuffer()
          const bytes = new Uint8Array(buf)
          let bin = ''
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
          b64 = btoa(bin)
        }
      }
      if (b64) return { b64, modell }
    } catch (e) {
      letzterFehler = `${modell} → ${e instanceof Error ? e.message : String(e)}`
    }
  }
  return { fehler: letzterFehler }
}

export async function POST(request: Request) {
  let body: {
    motiv?: string
    stil?: string
    prompt?: string
    orientierung?: 'landscape' | 'portrait' | 'square'
    preferredModel?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ fehler: 'Body ist kein gültiges JSON.' }, { status: 400 })
  }

  if (body.prompt && body.prompt.length > LIMITS.textMittel) {
    return NextResponse.json({ fehler: `Feld „prompt" ist zu lang (max ${LIMITS.textMittel}).` }, { status: 413 })
  }
  if (body.motiv && body.motiv.length > LIMITS.textKurz) {
    return NextResponse.json({ fehler: `Feld „motiv" ist zu lang (max ${LIMITS.textKurz}).` }, { status: 413 })
  }

  // Prompt bauen: entweder vorgegeben, oder aus Motiv + Stil-Preset.
  let prompt: string
  let stilLabel: string | undefined
  if (body.prompt && body.prompt.trim()) {
    prompt = body.prompt.trim()
  } else if (body.motiv && body.stil) {
    const preset = stilById(body.stil)
    if (!preset) {
      return NextResponse.json({ fehler: `Stil-Preset „${body.stil}" unbekannt.` }, { status: 400 })
    }
    prompt = stilPromptBauen(preset, body.motiv)
    stilLabel = preset.label
  } else {
    return NextResponse.json(
      { fehler: 'Entweder „prompt" oder „motiv" + „stil" angeben.' },
      { status: 400 },
    )
  }

  const orient = body.orientierung || 'landscape'
  const kette = body.preferredModel
    ? [body.preferredModel, ...MODEL_KETTE.filter((m) => m !== body.preferredModel)]
    : MODEL_KETTE

  let ergebnis = await bildErzeugen(prompt, kette, orient)
  let sanitizationHinweis: string | null = null

  if ('fehler' in ergebnis && istSafetyBlock(ergebnis.fehler)) {
    const { text, changed, ersetzt } = sanitize(prompt)
    if (changed) {
      sanitizationHinweis = `Marken-/IP-Begriffe ersetzt: ${ersetzt.slice(0, 3).join('; ')}`
      ergebnis = await bildErzeugen(text, kette, orient)
    }
  }

  if ('fehler' in ergebnis) {
    return NextResponse.json({ fehler: ergebnis.fehler }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    dataUrl: `data:image/png;base64,${ergebnis.b64}`,
    modell: ergebnis.modell,
    stilLabel,
    orientierung: orient,
    kostenUsd: PREIS_PRO_BILD_USD,
    sanitizationHinweis,
  })
}
