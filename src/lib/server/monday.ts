// monday.com-Abgleich des Cockpits (LOOP-Cockpit-Ausbau-Team.md, Phase 7). Das Cockpit führt, monday wird synchron gehalten.
//
// Schutz (verbindlich): Geschrieben wird nur in Boards, die privat sind ODER deren Name mit „TEST“ beginnt –
// ausser die Variable MONDAY_LIVE=1 ist gesetzt. Nie: Personen-Spalten, Updates, Benachrichtigungen, neue Status-Labels.
//
// Zuordnung über Namen (wie bei Telemedia üblich):
//   a) Projektplan  Element „Spieltag 01“            Spalten: Spieltag (Datum), Deadline (Datum+Zeit), Status, Notizen
//   b) Fragen       Element „Spieltag 01“            Spalten per Titel: Frage / Antwort 1 / Antwort 2 / Lösung …, Status
//   c2/c3 Anzeigen  Element „Anz Spieltag 01 · A“ oder „Anz Spieltag 01“; Datei-/Status-Spalten je Verlagsgruppe
//   d) Gewinner     Element „Spieltag 01 Gewinner 1“  Spalten: Name, Gewinner von Verlag/Titel, Info, Foto, Gewinnauszahlung

const MONDAY = 'https://api.monday.com/v2'

export type Spalte = { id: string; title: string; type: string; settings_str?: string }
export type Element = { id: string; name: string; column_values?: Array<{ id: string; text: string | null; value: string | null }> }
export type Board = { id: string; name: string; board_kind: string; columns: Spalte[]; items: Element[] }

export function token(): string {
  const t = process.env.MONDAY_API_TOKEN
  if (!t) throw new Error('MONDAY_API_TOKEN fehlt (lokal .env.local, online Cloudflare-Secret).')
  return t
}

export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(MONDAY, { method: 'POST', headers: { 'content-type': 'application/json', authorization: token(), 'API-Version': '2024-10' }, body: JSON.stringify({ query, variables }) })
  const text = await r.text()
  let d: { data?: T; errors?: Array<{ message?: string }>; error_message?: string } = {}
  try { d = JSON.parse(text) } catch { throw new Error(`monday ${r.status}: ${text.slice(0, 200)}`) }
  if (!r.ok || d.errors?.length || d.error_message) throw new Error(`monday ${r.status}: ${d.errors?.map((e) => e.message).join(' · ') || d.error_message || text.slice(0, 200)}`)
  return d.data as T
}

export const normal = (s: string) =>
  s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim()

export function liveErlaubt(): boolean {
  return process.env.MONDAY_LIVE === '1'
}

/** Darf in dieses Board geschrieben werden? */
export function schreibSchutz(b: Pick<Board, 'name' | 'board_kind'>): string | null {
  if (liveErlaubt()) return null
  if (b.board_kind === 'private' || /^test\b/i.test(b.name.trim())) return null
  return `Board „${b.name}“ ist weder privat noch ein TEST-Board. Schreiben in echte Boards erst nach Freigabe (Variable MONDAY_LIVE=1).`
}

export async function boardLesen(id: string, spalten?: string[]): Promise<Board> {
  const d = await gql<{ boards: Array<{ id: string; name: string; board_kind: string; columns: Spalte[]; items_page: { cursor: string | null; items: Element[] } }> }>(
    `query ($ids: [ID!], $sp: [String!]) { boards(ids: $ids) { id name board_kind columns { id title type settings_str }
      items_page(limit: 500) { cursor items { id name column_values(ids: $sp) { id text value } } } } }`,
    { ids: [id], sp: spalten ?? [] },
  )
  const b = d.boards?.[0]
  if (!b) throw new Error(`Board ${id} nicht gefunden oder kein Zugriff.`)
  let items = b.items_page.items
  let cursor = b.items_page.cursor
  while (cursor && items.length < 3000) {
    const n = await gql<{ next_items_page: { cursor: string | null; items: Element[] } }>(
      'query ($c: String!, $sp: [String!]) { next_items_page(limit: 500, cursor: $c) { cursor items { id name column_values(ids: $sp) { id text value } } } }',
      { c: cursor, sp: spalten ?? [] },
    )
    items = items.concat(n.next_items_page.items)
    cursor = n.next_items_page.cursor
  }
  return { id: b.id, name: b.name, board_kind: b.board_kind, columns: b.columns, items }
}

export function spalteMitTitel(b: Board, ...titel: string[]): Spalte | undefined {
  const t = titel.map(normal)
  return b.columns.find((c) => t.includes(normal(c.title)))
}

export function statusLabels(s: Spalte): string[] {
  try {
    const st = JSON.parse(s.settings_str ?? '{}') as { labels?: Record<string, string> | Array<{ label: string }> }
    if (Array.isArray(st.labels)) return st.labels.map((l) => l.label)
    return Object.values(st.labels ?? {})
  } catch {
    return []
  }
}

/** Nummer im Elementnamen, z. B. „Spieltag 01“, „Anz Spieltag 01 · A“, „Spieltag 01 Gewinner 2“. */
export function spieltagNr(name: string): number | null {
  const m = name.match(/spieltag\s*0*(\d{1,3})/i) ?? name.match(/anz\w*\s+\w*\s*0*(\d{1,3})/i)
  return m ? Number(m[1]) : null
}

export async function elementAnlegen(boardId: string, name: string, werte: Record<string, unknown>): Promise<string> {
  const d = await gql<{ create_item: { id: string } }>(
    'mutation ($b: ID!, $n: String!, $w: JSON) { create_item(board_id: $b, item_name: $n, column_values: $w, create_labels_if_missing: false) { id } }',
    { b: boardId, n: name.slice(0, 255), w: JSON.stringify(werte) },
  )
  return d.create_item.id
}

export async function werteSetzen(boardId: string, itemId: string, werte: Record<string, unknown>): Promise<void> {
  if (!Object.keys(werte).length) return
  await gql(
    'mutation ($b: ID!, $i: ID!, $w: JSON!) { change_multiple_column_values(board_id: $b, item_id: $i, column_values: $w, create_labels_if_missing: false) { id } }',
    { b: boardId, i: itemId, w: JSON.stringify(werte) },
  )
}

export async function dateiHochladen(itemId: string, spalteId: string, daten: Blob, dateiname: string): Promise<void> {
  const fd = new FormData()
  fd.append('query', `mutation ($file: File!) { add_file_to_column (item_id: ${Number(itemId)}, column_id: ${JSON.stringify(spalteId)}, file: $file) { id } }`)
  fd.append('variables[file]', daten, dateiname)
  const r = await fetch(MONDAY + '/file', { method: 'POST', headers: { authorization: token() }, body: fd })
  const d = (await r.json().catch(() => ({}))) as { errors?: Array<{ message?: string }>; error_message?: string }
  if (!r.ok || d.errors?.length || d.error_message) throw new Error(`Upload ${dateiname}: ${r.status} ${d.errors?.map((e) => e.message).join(' · ') || d.error_message || ''}`)
}

/** Spaltenwert für einen Typ bauen (nur sichere Typen). */
export function wert(s: Spalte, v: string | number | null | undefined): unknown | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const t = String(v)
  switch (s.type) {
    case 'text': return t.slice(0, 2000)
    case 'long_text': return { text: t.slice(0, 2000) }
    case 'numbers': return /^-?\d+([.,]\d+)?$/.test(t) ? t.replace(',', '.') : undefined
    case 'date': {
      const m = t.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/)
      return m ? (m[2] ? { date: m[1], time: m[2] + ':00' } : { date: m[1] }) : undefined
    }
    case 'status': {
      const label = statusLabels(s).find((l) => normal(l) === normal(t))
      return label ? { label } : undefined // nie neue Labels anlegen
    }
    default: return undefined
  }
}
