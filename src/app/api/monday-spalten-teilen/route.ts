// /api/monday-spalten-teilen — Datei-Spalten „Anzeige (X)“ eines Boards in „Anzeige (X) 1 Gewinner“ und
// „Anzeige (X) 4 Gewinner“ aufteilen. Die PDFs werden NICHT neu hochgeladen, sondern per Asset-ID verschoben.
// Schlüssel nur aus MONDAY_API_TOKEN. Testmodus (Standard AN): nur private Boards. Keine Personen/Updates/Benachrichtigungen.
// Mehrfach aufrufbar: bereits aufgeteilte Spalten und verschobene Dateien werden erkannt.

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 600

const MONDAY = 'https://api.monday.com/v2'

type Datei = { name: string; assetId: number; isImage?: string; fileType?: string }
type Spalte = { id: string; title: string; type: string }

async function gql<T>(token: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  for (let versuch = 1; ; versuch++) {
    const r = await fetch(MONDAY, { method: 'POST', headers: { 'content-type': 'application/json', authorization: token }, body: JSON.stringify({ query, variables }) })
    const d = (await r.json().catch(() => ({}))) as { data?: T; errors?: { message?: string }[]; error_message?: string }
    if (r.ok && !d.errors?.length && !d.error_message) return d.data as T
    if (versuch >= 3) throw new Error(`monday ${r.status}: ${d.errors?.map((e) => e.message).join(' · ') || d.error_message || ''}`)
    await new Promise((ok) => setTimeout(ok, 3000 * versuch))
  }
}

const basis = (titel: string) => titel.match(/^Anzeige \((.+)\)\s*(?:(1|4) Gew\S*)?$/)

export async function POST(request: Request) {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) return NextResponse.json({ ok: false, fehler: 'MONDAY_API_TOKEN fehlt.' }, { status: 500 })
  const { boardId, testmodus } = (await request.json().catch(() => ({}))) as { boardId?: string; testmodus?: boolean }
  if (!/^\d{5,20}$/.test(String(boardId ?? ''))) return NextResponse.json({ ok: false, fehler: 'Board-ID ungültig.' }, { status: 400 })
  const id = Number(boardId)

  try {
    const b = (await gql<{ boards: { name: string; board_kind: string; columns: Spalte[] }[] }>(token, `query { boards(ids:[${id}]) { name board_kind columns { id title type } } }`)).boards[0]
    if (!b) return NextResponse.json({ ok: false, fehler: 'Board nicht gefunden.' }, { status: 404 })
    if (testmodus !== false && b.board_kind !== 'private') return NextResponse.json({ ok: false, fehler: `Testmodus: Board „${b.name}“ ist nicht privat.` }, { status: 409 })

    // 1) Spalten: „Anzeige (X)“ → „Anzeige (X) 1 Gewinner“ + neue „Anzeige (X) 4 Gewinner“ direkt dahinter
    const dateiSpalten = b.columns.filter((c) => c.type === 'file' && basis(c.title))
    const paare: { gruppe: string; ein: string; vier: string }[] = []
    const gruppen = [...new Set(dateiSpalten.map((c) => basis(c.title)![1]))]
    for (const g of gruppen) {
      const zuG = dateiSpalten.filter((c) => basis(c.title)![1] === g)
      const ein = zuG.find((c) => basis(c.title)![2] !== '4')!
      let vier = zuG.find((c) => basis(c.title)![2] === '4')
      const titel1 = `Anzeige (${g}) 1 Gewinner`
      const titel4 = `Anzeige (${g}) 4 Gewinner`
      if (ein.title !== titel1) await gql(token, 'mutation ($b: ID!, $c: String!, $t: String!) { change_column_title(board_id: $b, column_id: $c, title: $t) { id } }', { b: String(id), c: ein.id, t: titel1 })
      if (!vier) {
        const neu = await gql<{ create_column: Spalte }>(token, 'mutation ($b: ID!, $t: String!, $nach: ID) { create_column(board_id: $b, title: $t, column_type: file, after_column_id: $nach) { id title type } }', { b: String(id), t: titel4, nach: ein.id })
        vier = neu.create_column
      } else if (vier.title !== titel4) {
        await gql(token, 'mutation ($b: ID!, $c: String!, $t: String!) { change_column_title(board_id: $b, column_id: $c, title: $t) { id } }', { b: String(id), c: vier.id, t: titel4 })
      }
      paare.push({ gruppe: g, ein: ein.id, vier: vier.id })
    }

    // 2) Dateien verschieben (alle Items, seitenweise)
    const spaltenIds = paare.flatMap((p) => [p.ein, p.vier])
    type Item = { id: string; name: string; column_values: { id: string; value: string | null }[] }
    const items: Item[] = []
    let seite = (await gql<{ boards: { items_page: { cursor: string | null; items: Item[] } }[] }>(token, 'query ($b: [ID!], $s: [String!]) { boards(ids: $b) { items_page(limit: 100) { cursor items { id name column_values(ids: $s) { id value } } } } }', { b: [String(id)], s: spaltenIds })).boards[0].items_page
    items.push(...seite.items)
    while (seite.cursor) {
      seite = (await gql<{ next_items_page: { cursor: string | null; items: Item[] } }>(token, 'query ($c: String!, $s: [String!]) { next_items_page(limit: 100, cursor: $c) { cursor items { id name column_values(ids: $s) { id value } } } }', { c: seite.cursor, s: spaltenIds })).next_items_page
      items.push(...seite.items)
    }

    let verschoben = 0
    let geaendert = 0
    const probleme: string[] = []
    const dateien = (it: Item, sp: string): Datei[] => {
      const v = it.column_values.find((c) => c.id === sp)?.value
      try {
        return v ? ((JSON.parse(v) as { files?: Datei[] }).files ?? []) : []
      } catch {
        return []
      }
    }
    for (const it of items) {
      const neu: Record<string, unknown> = {}
      for (const p of paare) {
        const alt1 = dateien(it, p.ein)
        const alt4 = dateien(it, p.vier)
        const weg = alt1.filter((f) => f.name.includes('_4-Gewinner_'))
        const bleib = alt1.filter((f) => !f.name.includes('_4-Gewinner_'))
        const zurueck = alt4.filter((f) => f.name.includes('_1-Gewinner_'))
        if (!weg.length && !zurueck.length) continue
        const vier = [...alt4.filter((f) => !f.name.includes('_1-Gewinner_')), ...weg].filter((f, i, a) => a.findIndex((x) => x.assetId === f.assetId) === i)
        const ein = [...bleib, ...zurueck]
        const fmt = (l: Datei[]) => ({ files: l.map((f) => ({ name: f.name, assetId: f.assetId, isImage: f.isImage ?? 'false', fileType: f.fileType ?? 'ASSET' })) })
        neu[p.ein] = ein.length ? fmt(ein) : { clear_all: true }
        neu[p.vier] = fmt(vier)
        verschoben += weg.length + zurueck.length
      }
      if (!Object.keys(neu).length) continue
      try {
        await gql(token, 'mutation ($b: ID!, $i: ID!, $v: JSON!) { change_multiple_column_values(board_id: $b, item_id: $i, column_values: $v) { id } }', { b: String(id), i: it.id, v: JSON.stringify(neu) })
        geaendert++
      } catch (e) {
        probleme.push(`${it.name}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    return NextResponse.json({ ok: probleme.length === 0, board: b.name, spalten: paare, items: items.length, geaendert, verschoben, probleme })
  } catch (e) {
    return NextResponse.json({ ok: false, fehler: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
