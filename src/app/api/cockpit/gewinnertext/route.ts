// KI-Vorschlag für den Zusatztext unter dem Gewinnerbild (Cockpit · Gewinner vom Vortag).
// Aus Stichworten vom Anruf wird ein kurzer Satz. Vorher rief das Panel /api/dialog mit einem
// Format auf, das diese Route nicht kennt (HTTP 400) – daher eine eigene, schlanke Route.

import { NextResponse } from 'next/server'
import { claudeAnfragen, ClaudeFehler } from '@/lib/anthropic'
import { mitRecht } from '@/lib/server/zugang'

export const runtime = 'nodejs'

type Anfrage = { name?: string; ort?: string; betrag?: number; stichworte?: string; maxLen?: number }

export async function POST(request: Request) {
  const z = await mitRecht(request, 'bearbeiten')
  if ('antwort' in z) return z.antwort
  let b: Anfrage
  try {
    b = (await request.json()) as Anfrage
  } catch {
    return NextResponse.json({ fehler: 'Body ist kein gültiges JSON.' }, { status: 400 })
  }
  const stichworte = (b.stichworte ?? '').trim().slice(0, 300)
  if (!stichworte) return NextResponse.json({ fehler: 'Stichworte fehlen.' }, { status: 400 })
  const maxLen = Math.min(Math.max(Number(b.maxLen) || 45, 20), 200)
  const wer = `${(b.name ?? '').trim() || 'Gewinner/in'}${b.ort?.trim() ? ' aus ' + b.ort.trim() : ''}`

  const system =
    'Du schreibst kurze Zusatztexte für Gewinnerbilder in deutschen Zeitungsanzeigen. Genau ein kurzer Satz, sachlich-freundlich, ' +
    'echte Umlaute und ß, keine Anführungszeichen, keine Erfindungen über die Stichworte hinaus, keine Höflichkeitsfloskeln. ' +
    'Name und Betrag stehen bereits in der Anzeige – nicht wiederholen; mit „Sie“/„Er“ beginnen. Antworte nur mit dem Satz.'
  const sauber = (t: string) => t.trim().replace(/^["„“»«]+|["„“»«]+$/g, '').split('\n')[0].trim()
  try {
    let antwort = ''
    for (let versuch = 0; versuch < 2; versuch++) {
      const a = await claudeAnfragen({
        systemPrompt: system,
        nachrichten: [{
          role: 'user',
          content: `Gewinner: ${wer}, Betrag ${Number(b.betrag) || 0} €. Stichworte vom Anruf: ${stichworte}. ` +
            `Höchstens ${maxLen} Zeichen inklusive Leerzeichen${versuch ? ` – der letzte Vorschlag war zu lang („${antwort}“), bitte deutlich kürzer` : ''}.`,
        }],
        maxTokens: 120,
        temperature: 0.5,
      })
      antwort = sauber(a.text)
      if (antwort.length <= maxLen) break
    }
    return NextResponse.json({ antwort })
  } catch (e) {
    const status = e instanceof ClaudeFehler ? e.status : 500
    return NextResponse.json({ fehler: e instanceof Error ? e.message : 'Unbekannter Fehler' }, { status })
  }
}
