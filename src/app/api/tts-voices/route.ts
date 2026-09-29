// /api/tts-voices — Voice-Liste von ElevenLabs abrufen, gefiltert nach
// deutschsprachigen, hallfreien Stimmen. Cached im Speicher der Instanz.

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Voice = {
  voice_id: string
  name: string
  labels?: Record<string, string>
  preview_url?: string
}

let cache: { zeitpunkt: number; voices: Voice[] } | undefined
const TTL_MS = 5 * 60 * 1000

export async function GET() {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) {
    return NextResponse.json(
      { fehler: 'ELEVENLABS_API_KEY fehlt.' },
      { status: 500 },
    )
  }

  if (cache && Date.now() - cache.zeitpunkt < TTL_MS) {
    return NextResponse.json({ ok: true, voices: cache.voices, gecacht: true })
  }

  const antwort = await fetch('https://api.elevenlabs.io/v2/voices', {
    headers: { 'xi-api-key': key },
  })
  if (!antwort.ok) {
    const text = await antwort.text()
    return NextResponse.json(
      { fehler: `ElevenLabs ${antwort.status}: ${text.slice(0, 400)}` },
      { status: antwort.status },
    )
  }
  const daten = (await antwort.json()) as { voices?: Voice[] }
  const alle = daten.voices || []

  cache = { zeitpunkt: Date.now(), voices: alle }
  return NextResponse.json({ ok: true, voices: alle })
}
