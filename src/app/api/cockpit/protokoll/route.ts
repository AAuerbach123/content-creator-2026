// /api/cockpit/protokoll – wer hat wann was geändert (nur lesen).
import { protokollListe } from '@/lib/server/speicher'
import { mitRecht } from '@/lib/server/zugang'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const z = await mitRecht(request, 'lesen')
  if ('antwort' in z) return z.antwort
  const url = new URL(request.url)
  try {
    const liste = await protokollListe({
      limit: Number(url.searchParams.get('limit') ?? 200),
      typ: url.searchParams.get('typ') ?? undefined,
      dokId: url.searchParams.get('dokId') ?? undefined,
    })
    return Response.json({ eintraege: liste })
  } catch (e) {
    return Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
