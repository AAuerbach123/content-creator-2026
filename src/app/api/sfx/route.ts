// /api/sfx — ElevenLabs Sound Effects. Für den „Woooosch"-Logo-Einflug (2 s).
// Fällt bei fehlendem Zugriff mit klarer Fehlermeldung zurück; der Client kann
// dann einen mitgelieferten Fallback-Sound verwenden.

import { NextResponse } from 'next/server'
import { LIMITS, begrenzeText } from '@/lib/eingabe-limit'

export const runtime = 'nodejs'

type Anfrage = {
  prompt: string
  dauerSekunden?: number
  promptInfluence?: number // 0..1
}

export async function POST(request: Request) {
  let body: Anfrage
  try {
    body = (await request.json()) as Anfrage
  } catch {
    return NextResponse.json({ fehler: 'Body ist kein gültiges JSON.' }, { status: 400 })
  }
  if (!body.prompt || !body.prompt.trim()) {
    return NextResponse.json({ fehler: 'Feld „prompt" fehlt.' }, { status: 400 })
  }
  const laenge = begrenzeText('prompt', body.prompt, LIMITS.textKurz)
  if (!laenge.ok) return NextResponse.json({ fehler: laenge.nachricht }, { status: laenge.status })
  const dauer = body.dauerSekunden ?? 2.0
  if (typeof dauer !== 'number' || dauer <= 0 || dauer > 22) {
    return NextResponse.json({ fehler: 'dauerSekunden muss zwischen 0 und 22 liegen.' }, { status: 400 })
  }
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) {
    return NextResponse.json({ fehler: 'ELEVENLABS_API_KEY fehlt.' }, { status: 500 })
  }

  const antwort = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'xi-api-key': key,
    },
    body: JSON.stringify({
      text: body.prompt,
      duration_seconds: body.dauerSekunden ?? 2.0,
      prompt_influence: body.promptInfluence ?? 0.6,
    }),
  })

  if (!antwort.ok) {
    const text = await antwort.text()
    return NextResponse.json(
      { fehler: `ElevenLabs SFX ${antwort.status}: ${text.slice(0, 400)}` },
      { status: antwort.status },
    )
  }

  // Antwort ist die MP3 als binärer Body — wir wandeln in base64.
  const buffer = await antwort.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const b64 = btoa(bin)

  return NextResponse.json({ ok: true, audioBase64: b64, mimeType: 'audio/mpeg' })
}
