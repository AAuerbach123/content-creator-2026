// /api/tts — ElevenLabs Text-to-Speech mit Wortzeitstempeln.
// Regeln aus dem Präsentations-Skill: eleven_multilingual_v2, stability 0.55,
// similarity 0.8, style 0-0.1, speed 0.95, −16 LUFS (das LUFS-Ziel erreichen wir
// nicht in der API; wir bitten ElevenLabs um saubere Aufnahme, keinen Hall).
//
// Antwort: mp3 (base64) + Wortzeitstempel (character alignment → wort alignment
// heuristisch aus Whitespace).

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Anfrage = {
  text: string
  voiceId?: string
  stabilitaet?: number
  similarity?: number
  style?: number
  speed?: number
}

type ElevenLabsAntwort = {
  audio_base64?: string
  alignment?: {
    characters: string[]
    character_start_times_seconds: number[]
    character_end_times_seconds: number[]
  }
}

const STANDARD_VOICE = 'm1xJVQ4AuvhAWXoSQdeA' // Anneke

function wortzeitenAusZeichen(alignment: ElevenLabsAntwort['alignment']): { wort: string; start: number; ende: number }[] {
  if (!alignment) return []
  const woerter: { wort: string; start: number; ende: number }[] = []
  let aktuellesWort = ''
  let start: number | undefined
  let ende: number | undefined
  for (let i = 0; i < alignment.characters.length; i++) {
    const c = alignment.characters[i]
    if (c === ' ' || c === '\n' || c === '\t') {
      if (aktuellesWort && start !== undefined && ende !== undefined) {
        woerter.push({ wort: aktuellesWort, start, ende })
      }
      aktuellesWort = ''
      start = undefined
      ende = undefined
    } else {
      if (start === undefined) start = alignment.character_start_times_seconds[i]
      ende = alignment.character_end_times_seconds[i]
      aktuellesWort += c
    }
  }
  if (aktuellesWort && start !== undefined && ende !== undefined) {
    woerter.push({ wort: aktuellesWort, start, ende })
  }
  return woerter
}

export async function POST(request: Request) {
  let body: Anfrage
  try {
    body = (await request.json()) as Anfrage
  } catch {
    return NextResponse.json({ fehler: 'Body ist kein gültiges JSON.' }, { status: 400 })
  }
  if (!body.text || !body.text.trim()) {
    return NextResponse.json({ fehler: 'Feld „text" fehlt.' }, { status: 400 })
  }
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) {
    return NextResponse.json(
      {
        fehler:
          'ELEVENLABS_API_KEY fehlt. In .env.local (lokal) bzw. per `wrangler secret put ELEVENLABS_API_KEY` (online) hinterlegen. Rechte: Text to Speech, Voices (Read), Sound Effects.',
      },
      { status: 500 },
    )
  }

  const voiceId = body.voiceId || STANDARD_VOICE

  const antwort = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': key,
      },
      body: JSON.stringify({
        text: body.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: body.stabilitaet ?? 0.55,
          similarity_boost: body.similarity ?? 0.8,
          style: body.style ?? 0.05,
          use_speaker_boost: false,
        },
        // Speed liegt nicht in voice_settings — schnell/langsam via SSML im Text steuerbar,
        // hier bewusst weggelassen; Standard = natürlich.
      }),
    },
  )

  if (!antwort.ok) {
    const text = await antwort.text()
    return NextResponse.json(
      { fehler: `ElevenLabs ${antwort.status}: ${text.slice(0, 400)}` },
      { status: antwort.status },
    )
  }

  const daten = (await antwort.json()) as ElevenLabsAntwort
  if (!daten.audio_base64) {
    return NextResponse.json({ fehler: 'Keine Audio-Daten in der Antwort.' }, { status: 500 })
  }

  const wortzeiten = wortzeitenAusZeichen(daten.alignment)
  const letzteZeit = wortzeiten.length ? wortzeiten[wortzeiten.length - 1].ende : undefined

  return NextResponse.json({
    ok: true,
    audioBase64: daten.audio_base64,
    mimeType: 'audio/mpeg',
    voiceId,
    dauerSekunden: letzteZeit,
    wortzeiten,
  })
}
