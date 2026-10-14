// /api/monday — Spieltage eines Serien-Spiels als Items in ein monday.com-Board übertragen.
// Schlüssel NUR aus der Umgebungsvariable MONDAY_API_TOKEN (lokal .env.local, online `wrangler secret put`).
// Einziger externer Aufruf: fetch an https://api.monday.com/v2 (GraphQL).
//
// Aktionen:
//   "spalten"     – Board + Spalten lesen, Zuordnung Spaltentitel → Feld anzeigen (schreibt nichts)
//   "uebertragen" – je Spieltag ein Item anlegen (Name „Spieltag NN“ + Spaltenwerte)
// Testmodus (Standard AN): nur privates Board, nur Text/Langtext/Datum/Zahl-Spalten; KEINE Personen-Spalten,
// KEINE Updates, KEINE Benachrichtigungen, keine neuen Status-Labels. Auch ohne Testmodus schreibt diese Route
// nie Personen-Spalten, Updates oder Benachrichtigungen – sie setzt dann zusätzlich Status-/Dropdown-Spalten.

import { NextResponse } from 'next/server'
import type { MondaySpieltag } from '@/lib/serie/monday-typen'

export const runtime = 'nodejs'

const MONDAY_URL = 'https://api.monday.com/v2'
const MAX_ITEMS = 40


type Feld = Exclude<keyof MondaySpieltag, 'name'>

type Anfrage = {
  aktion?: 'spalten' | 'uebertragen'
  boardId?: string
  testmodus?: boolean
  spieltage?: MondaySpieltag[]
}

type Spalte = { id: string; title: string; type: string }
type Board = { id: string; name: string; board_kind: string; columns: Spalte[] }

// Spaltentitel (klein, ohne Umlaute/Satzzeichen) → Feld
const TITEL: Record<Feld, string[]> = {
  datum: ['datum', 'date', 'spieltag datum', 'erscheinungstag', 'erscheinungsdatum', 'termin'],
  frage: ['frage', 'gewinnfrage', 'tagesfrage', 'aufgabe', 'question'],
  a1: ['antwort 1', 'antwort1', 'a1', 'answer 1'],
  a2: ['antwort 2', 'antwort2', 'a2', 'answer 2'],
  richtig: ['richtige antwort', 'richtig', 'losung', 'loesung', 'correct answer', 'answer'],
  dateiname: ['dateiname', 'datei', 'file name', 'filename', 'file'],
}
const TEST_TYPEN = new Set(['text', 'long_text', 'date', 'numbers'])
const VOLL_TYPEN = new Set([...TEST_TYPEN, 'status', 'dropdown'])

function normal(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fehler(text: string, status = 400) {
  return NextResponse.json({ ok: false, fehler: text }, { status })
}

async function gql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const r = await fetch(MONDAY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: token },
    body: JSON.stringify({ query, variables }),
  })
  const text = await r.text()
  let daten: { data?: T; errors?: { message?: string }[]; error_message?: string } = {}
  try {
    daten = JSON.parse(text)
  } catch {
    throw new Error(`monday ${r.status}: ${text.slice(0, 200)}`)
  }
  if (!r.ok || daten.errors?.length || daten.error_message) {
    const msg = daten.errors?.map((e) => e.message).join(' · ') || daten.error_message || text.slice(0, 200)
    throw new Error(`monday ${r.status}: ${msg}`)
  }
  return daten.data as T
}

function zuordnen(spalten: Spalte[], testmodus: boolean) {
  const erlaubt = testmodus ? TEST_TYPEN : VOLL_TYPEN
  const zuordnung: Partial<Record<Feld, Spalte>> = {}
  const ignoriert: { title: string; type: string; grund: string }[] = []
  for (const s of spalten) {
    if (s.id === 'name') continue
    const n = normal(s.title)
    const feld = (Object.keys(TITEL) as Feld[]).find((f) => !zuordnung[f] && TITEL[f].includes(n))
    if (!feld) {
      ignoriert.push({ title: s.title, type: s.type, grund: 'kein passender Titel' })
      continue
    }
    if (s.type === 'people' || s.type === 'multiple-person' || s.type === 'team') {
      ignoriert.push({ title: s.title, type: s.type, grund: 'Personen-Spalte – wird nie beschrieben' })
      continue
    }
    if (!erlaubt.has(s.type)) {
      ignoriert.push({ title: s.title, type: s.type, grund: testmodus ? 'Spaltentyp im Testmodus gesperrt' : 'Spaltentyp nicht unterstützt' })
      continue
    }
    zuordnung[feld] = s
  }
  return { zuordnung, ignoriert }
}

function wert(s: Spalte, v: string): unknown | undefined {
  if (!v) return undefined
  switch (s.type) {
    case 'text':
      return v.slice(0, 2000)
    case 'long_text':
      return { text: v.slice(0, 2000) }
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? { date: v } : undefined
    case 'numbers':
      return /^-?\d+([.,]\d+)?$/.test(v) ? v.replace(',', '.') : undefined
    case 'status':
      return { label: v.slice(0, 60) }
    case 'dropdown':
      return { labels: [v.slice(0, 60)] }
    default:
      return undefined
  }
}

export async function POST(request: Request) {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) {
    return fehler('MONDAY_API_TOKEN fehlt. Lokal in .env.local eintragen (siehe .env.local.example), online per `npx wrangler secret put MONDAY_API_TOKEN`. Danach den Server neu starten.', 500)
  }
  let body: Anfrage
  try {
    body = (await request.json()) as Anfrage
  } catch {
    return fehler('Body ist kein gültiges JSON.')
  }
  const boardId = String(body.boardId ?? '').trim()
  if (!/^\d{5,20}$/.test(boardId)) return fehler('Board-ID fehlt oder ist ungültig (nur Ziffern, steht in der Board-URL nach /boards/).')
  const testmodus = body.testmodus !== false

  let board: Board | undefined
  try {
    const d = await gql<{ boards: Board[] }>(
      token,
      'query ($ids: [ID!]) { boards(ids: $ids) { id name board_kind columns { id title type } } }',
      { ids: [boardId] },
    )
    board = d.boards?.[0]
  } catch (e) {
    return fehler(e instanceof Error ? e.message : String(e), 502)
  }
  if (!board) return fehler('Board nicht gefunden oder kein Zugriff mit diesem Token.', 404)
  if (testmodus && board.board_kind !== 'private') {
    return fehler(`Testmodus: Das Board „${board.name}“ ist nicht privat (Art: ${board.board_kind}). Bitte ein privates Test-Board nehmen – oder den Testmodus bewusst ausschalten.`, 409)
  }
  const { zuordnung, ignoriert } = zuordnen(board.columns, testmodus)
  const zuordnungAnzeige = Object.fromEntries(Object.entries(zuordnung).map(([f, s]) => [f, { title: s!.title, type: s!.type }]))

  if ((body.aktion ?? 'spalten') === 'spalten') {
    return NextResponse.json({ ok: true, board: { id: board.id, name: board.name, art: board.board_kind }, zuordnung: zuordnungAnzeige, ignoriert, testmodus })
  }

  const tage = Array.isArray(body.spieltage) ? body.spieltage : []
  if (!tage.length) return fehler('Keine Spieltage übergeben.')
  if (tage.length > MAX_ITEMS) return fehler(`Höchstens ${MAX_ITEMS} Spieltage je Übertragung.`)

  const angelegt: { name: string; id: string }[] = []
  const fehlerListe: { name: string; fehler: string }[] = []
  for (const t of tage) {
    const name = String(t.name ?? '').slice(0, 255) || 'Spieltag'
    const werte: Record<string, unknown> = {}
    for (const [f, s] of Object.entries(zuordnung) as [Feld, Spalte][]) {
      const w = wert(s, String(t[f] ?? ''))
      if (w !== undefined) werte[s.id] = w
    }
    try {
      const d = await gql<{ create_item: { id: string } }>(
        token,
        'mutation ($board: ID!, $name: String!, $werte: JSON, $neu: Boolean) { create_item(board_id: $board, item_name: $name, column_values: $werte, create_labels_if_missing: $neu) { id } }',
        { board: board.id, name, werte: JSON.stringify(werte), neu: !testmodus },
      )
      angelegt.push({ name, id: d.create_item.id })
    } catch (e) {
      fehlerListe.push({ name, fehler: e instanceof Error ? e.message : String(e) })
      if (fehlerListe.length >= 3 && !angelegt.length) break // offensichtlich grundsätzliches Problem
    }
  }
  return NextResponse.json({
    ok: fehlerListe.length === 0,
    board: { id: board.id, name: board.name, art: board.board_kind },
    zuordnung: zuordnungAnzeige,
    ignoriert,
    angelegt,
    fehler: fehlerListe.length ? `${fehlerListe.length} Item(s) nicht angelegt` : undefined,
    fehlerListe,
    testmodus,
  })
}
