// /api/portal – öffentliche Schnittstelle des Kunden-Korrekturportals (ohne Login, nur mit gültigem Verlags-Link).
//   GET  ?t=<token>            → Daten der eigenen Verlagsgruppe (nur freigegebene Spieltage)
//   GET  ?t=<token>&h=<hash>   → Gewinnerfoto (nur wenn es in einem sichtbaren Spieltag vorkommt)
//   POST { t, aktion: 'ok'|'fehler'|'kommentar', spieltagId, von, text?, zeitungId?, x?, y? }

import { assetHolen } from '@/lib/server/speicher'
import { fotoErlaubt, linkPruefen, portalAktion, portalDaten, type PortalAktion } from '@/lib/server/portal'

export const runtime = 'nodejs'

const KEIN_ZUGANG = () => Response.json({ fehler: 'Dieser Link ist ungültig oder wurde gesperrt. Bitte wenden Sie sich an Telemedia.' }, { status: 403 })
const sicher = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' }

export async function GET(request: Request) {
  const url = new URL(request.url)
  const link = await linkPruefen(url.searchParams.get('t')).catch(() => null)
  if (!link) return KEIN_ZUGANG()
  const h = url.searchParams.get('h')
  try {
    if (url.searchParams.get('pdf') === '1') {
      const { portalPdf } = await import('@/lib/server/portal')
      const g = url.searchParams.get('g') === '4' ? 4 : 1
      const r = await portalPdf(link, String(url.searchParams.get('s') ?? ''), String(url.searchParams.get('z') ?? ''), g, url.origin)
      return new Response(r.pdf, { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="${r.dateiname}"`, ...sicher } })
    }
    if (h) {
      if (!/^[0-9a-f]{64}$/.test(h) || !(await fotoErlaubt(link, h))) return new Response('Nicht gefunden', { status: 404 })
      const a = await assetHolen(h)
      if (!a) return new Response('Nicht gefunden', { status: 404 })
      return new Response(a.daten, { headers: { 'content-type': a.mime, ...sicher } })
    }
    return Response.json({ gruppe: link.gruppe, name: link.name, kampagnen: await portalDaten(link) }, { headers: sicher })
  } catch (e) {
    return Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let body: Partial<PortalAktion> & { t?: string }
  try {
    const roh = await request.text()
    if (roh.length > 8000) return Response.json({ fehler: 'Zu viel Text.' }, { status: 413 })
    body = JSON.parse(roh)
  } catch {
    return Response.json({ fehler: 'Ungültige Anfrage.' }, { status: 400 })
  }
  const link = await linkPruefen(body.t ?? null).catch(() => null)
  if (!link) return KEIN_ZUGANG()
  if (!body.spieltagId || typeof body.spieltagId !== 'string') return Response.json({ fehler: 'Spieltag fehlt.' }, { status: 400 })
  if (!['ok', 'fehler', 'kommentar'].includes(String(body.aktion))) return Response.json({ fehler: 'Unbekannte Aktion.' }, { status: 400 })
  if (body.aktion === 'kommentar' && !String(body.text ?? '').trim()) return Response.json({ fehler: 'Bitte einen Kommentar eingeben.' }, { status: 400 })
  if (body.aktion === 'fehler' && !String(body.text ?? '').trim()) return Response.json({ fehler: 'Bitte kurz beschreiben, was korrigiert werden soll.' }, { status: 400 })
  const num = (v: unknown) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : undefined)
  try {
    await portalAktion(link, {
      aktion: body.aktion,
      spieltagId: body.spieltagId,
      von: String(body.von ?? ''),
      text: String(body.text ?? ''),
      zeitungId: String((body as { zeitungId?: string }).zeitungId ?? ''),
      x: num((body as { x?: number }).x),
      y: num((body as { y?: number }).y),
    } as PortalAktion)
    return Response.json({ ok: true }, { headers: sicher })
  } catch (e) {
    return Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 409 })
  }
}
