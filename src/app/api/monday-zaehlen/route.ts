// /api/monday-zaehlen — Kontrolle nach dem PDF-Upload: Anzahl Dateien je Item eines Boards (nur lesen).
// Schlüssel nur aus MONDAY_API_TOKEN. Liefert je Gruppe: Items, Dateien gesamt, Minimum/Maximum je Item, Items mit Abweichung.

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) return NextResponse.json({ ok: false, fehler: 'MONDAY_API_TOKEN fehlt.' }, { status: 500 })
  const { boardId, soll } = (await request.json().catch(() => ({}))) as { boardId?: string; soll?: number }
  if (!/^\d{5,20}$/.test(String(boardId ?? ''))) return NextResponse.json({ ok: false, fehler: 'Board-ID ungültig.' }, { status: 400 })
  const r = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: token },
    body: JSON.stringify({ query: 'query ($id: [ID!]) { boards(ids: $id) { name columns(types: [file]) { id title } items_page(limit: 200) { items { name group { title } assets { name } column_values(types: [file]) { id text } } } } }', variables: { id: [String(boardId)] } }),
  })
  type It = { name: string; group: { title: string }; assets: { name: string }[]; column_values: { id: string; text: string | null }[] }
  const d = (await r.json()) as { data?: { boards: { name: string; columns: { id: string; title: string }[]; items_page: { items: It[] } }[] }; errors?: unknown }
  const b = d.data?.boards?.[0]
  if (!b) return NextResponse.json({ ok: false, fehler: 'Board nicht gefunden', roh: d.errors }, { status: 404 })
  // Bei getrennten Spalten („… 1 Gewinner“ / „… 4 Gewinner“): Dateien in der falschen Spalte zählen
  const art = Object.fromEntries(b.columns.map((c) => [c.id, /\b1 Gew/.test(c.title) ? '1' : /\b4 Gew/.test(c.title) ? '4' : '']))
  let falscheSpalte = 0
  const falschBeispiele: string[] = []
  for (const it of b.items_page.items)
    for (const cv of it.column_values) {
      const a = art[cv.id]
      if (!a) continue
      const n = (cv.text ?? '').split(', ').filter((u) => u.includes(a === '1' ? '_4-Gewinner_' : '_1-Gewinner_')).length
      if (n) {
        falscheSpalte += n
        if (falschBeispiele.length < 5) falschBeispiele.push(`${it.name} / ${cv.id}: ${n}`)
      }
    }
  const gruppen: Record<string, { items: number; dateien: number; min: number; max: number; ein: number; vier: number; abweichend: string[] }> = {}
  for (const it of b.items_page.items) {
    const g = (gruppen[it.group.title] ??= { items: 0, dateien: 0, min: Infinity, max: 0, ein: 0, vier: 0, abweichend: [] })
    // gezählt wird, was in den Datei-Spalten steht (verschobene Dateien erscheinen nicht unter item.assets)
    const namen = [...new Set(it.column_values.flatMap((cv) => (cv.text ?? '').split(', ').filter(Boolean)))]
    const n = namen.length
    g.items++
    g.dateien += n
    g.min = Math.min(g.min, n)
    g.max = Math.max(g.max, n)
    g.ein += namen.filter((a) => a.includes('_1-Gewinner_')).length
    g.vier += namen.filter((a) => a.includes('_4-Gewinner_')).length
    if (soll && n !== soll) g.abweichend.push(`${it.name}: ${n}`)
  }
  return NextResponse.json({ ok: true, board: b.name, falscheSpalte, falschBeispiele, gruppen })
}
