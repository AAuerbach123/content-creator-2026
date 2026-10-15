// /api/cockpit/assets – Fotos und Dateien zentral ablegen (Schlüssel = SHA-256, unveränderlich).
//   PUT  (Body = Datei, Content-Type = MIME) → { hash }
//   GET  ?h=<hash>                            → Datei (lange cachebar)

import { assetAblegen, assetHolen } from '@/lib/server/speicher'
import { mitRecht } from '@/lib/server/zugang'

export const runtime = 'nodejs'

const ERLAUBT = /^(image\/(jpeg|png|webp|gif)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|text\/csv|text\/html)$/

export async function PUT(request: Request) {
  const z = await mitRecht(request, 'bearbeiten')
  if ('antwort' in z) return z.antwort
  const mime = (request.headers.get('content-type') ?? '').split(';')[0].trim()
  if (!ERLAUBT.test(mime)) return Response.json({ fehler: 'Dateityp nicht erlaubt: ' + mime }, { status: 415 })
  try {
    const hash = await assetAblegen(await request.arrayBuffer(), mime)
    return Response.json({ hash })
  } catch (e) {
    return Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const z = await mitRecht(request, 'lesen')
  if ('antwort' in z) return z.antwort
  const hash = new URL(request.url).searchParams.get('h') ?? ''
  try {
    const a = await assetHolen(hash)
    if (!a) return new Response('Nicht gefunden', { status: 404 })
    return new Response(a.daten, {
      headers: {
        'content-type': a.mime,
        'cache-control': 'private, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch (e) {
    return Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
