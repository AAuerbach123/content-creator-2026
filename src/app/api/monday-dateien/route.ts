// /api/monday-dateien — fertige Anzeigen-PDFs eines Spieltags in die Datei-Spalten eines monday-Boards hochladen.
// Läuft lokal auf dem Mac (liest die PDFs von der Festplatte). Schlüssel NUR aus MONDAY_API_TOKEN (.env.local).
// Ein Aufruf = ein Spieltag (die Oberfläche ruft Spieltag für Spieltag auf und zeigt den Fortschritt).
//
// Quelle (nur diese Ordner sind erlaubt):
//   Geldregen:  ~/Downloads/01_Projekte/Telemedia/Spiele_2027/Geldregen_2027/Anzeigen_<Monat>/Vorschlag_<X>/
//   andere:     ~/Desktop/Serien-Anzeigen/<Spiel>_<Monat>/Vorschlag_<X>/   (aus „Serien-Anzeigen erstellen.command“)
// Ziel: Item, dessen Name auf die Spieltag-Nummer endet (z. B. „Anz Spieltag 01“); Datei-Spalte je Verlagsgruppe,
// gefunden über den Spaltentitel („Anzeige (FUNKE)“, „Anzeige (SWMH/NPG)“, „Anzeige (SWP)“, „Anzeige (Nürnberg)“,
// „Anzeige (SHZ)“, „Anzeige (SAAR)“, „Anzeige (NOZ)“). Gibt es getrennte Spalten „Anzeige (FUNKE) 1 Gewinner“ /
// „Anzeige (FUNKE) 4 Gewinner“ (siehe /api/monday-spalten-teilen), landen die PDFs in der passenden.
// Bereits hochgeladene Dateien (gleicher Name) werden übersprungen.
// Testmodus (Standard AN): nur private Boards. Es werden nie Personen, Status, Updates oder Benachrichtigungen geschrieben.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MONDAY = 'https://api.monday.com/v2'

type Anfrage = { boardId?: string; spiel?: string; ordner?: string; monat?: string; vorschlag?: string; gewinner?: number; tag?: number; testmodus?: boolean; ersetzen?: boolean }

// Verlagsgruppe (Feld „hotline“ in zeitungen.json) → Schlüsselwort im Spaltentitel
const GRUPPE: Record<string, string> = { FUNKE: 'funke', SWMH: 'swmh', SWP: 'swp', NUE: 'nurnberg', SHZ: 'shz', SAAR: 'saar', NOZ: 'noz' }

const normal = (s: string) =>
  s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim()

const fehler = (text: string, status = 400) => NextResponse.json({ ok: false, fehler: text }, { status })

async function gql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const r = await fetch(MONDAY, { method: 'POST', headers: { 'content-type': 'application/json', authorization: token }, body: JSON.stringify({ query, variables }) })
  const d = (await r.json().catch(() => ({}))) as { data?: T; errors?: { message?: string }[]; error_message?: string }
  if (!r.ok || d.errors?.length || d.error_message) throw new Error(`monday ${r.status}: ${d.errors?.map((e) => e.message).join(' · ') || d.error_message || ''}`)
  return d.data as T
}

async function hochladen(token: string, itemId: string, spalte: string, datei: string): Promise<void> {
  const fd = new FormData()
  fd.append('query', `mutation ($file: File!) { add_file_to_column (item_id: ${Number(itemId)}, column_id: ${JSON.stringify(spalte)}, file: $file) { id } }`)
  fd.append('variables[file]', new Blob([fs.readFileSync(datei)], { type: 'application/pdf' }), path.basename(datei))
  const r = await fetch(MONDAY + '/file', { method: 'POST', headers: { authorization: token }, body: fd })
  const d = (await r.json().catch(() => ({}))) as { errors?: { message?: string }[]; error_message?: string }
  if (!r.ok || d.errors?.length || d.error_message) throw new Error(`Upload ${path.basename(datei)}: ${r.status} ${d.errors?.map((e) => e.message).join(' · ') || d.error_message || ''}`)
}

export async function POST(request: Request) {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) return fehler('MONDAY_API_TOKEN fehlt. Lokal in .env.local eintragen (siehe .env.local.example) und den Server neu starten.', 500)
  let b: Anfrage
  try {
    b = (await request.json()) as Anfrage
  } catch {
    return fehler('Body ist kein gültiges JSON.')
  }
  const boardId = String(b.boardId ?? '').trim()
  const monat = String(b.monat ?? '')
  const vorschlag = String(b.vorschlag ?? 'A')
  const gewinner = Number(b.gewinner ?? 1)
  const tag = Number(b.tag)
  const testmodus = b.testmodus !== false
  if (!/^\d{5,20}$/.test(boardId)) return fehler('Board-ID ungültig.')
  if (!/^\d{4}-\d{2}$/.test(monat) || !/^[ABC]$/.test(vorschlag) || ![1, 4].includes(gewinner) || !(tag >= 1 && tag <= 99)) return fehler('Monat/Vorschlag/Gewinner/Spieltag ungültig.')

  // Quellordner (fest vorgegebene Basis – keine beliebigen Pfade)
  const home = os.homedir()
  let ordner: string
  if ((b.spiel ?? 'geldregen') === 'geldregen') {
    ordner = path.join(home, 'Downloads/01_Projekte/Telemedia/Spiele_2027/Geldregen_2027', `Anzeigen_${monat}`, `Vorschlag_${vorschlag}`)
  } else {
    const name = String(b.ordner ?? '')
    if (!/^[A-Za-z0-9ÄÖÜäöüß-]+_\d{4}-\d{2}$/.test(name)) return fehler('Ordnername ungültig.')
    ordner = path.join(home, 'Desktop/Serien-Anzeigen', name, `Vorschlag_${vorschlag}`)
  }
  if (!fs.existsSync(ordner)) return fehler('Ordner mit den PDFs nicht gefunden: ' + ordner, 404)
  const nn = String(tag).padStart(2, '0') // Spieltag-Nummer im Dateinamen (_ST27_ …); bei durchgehender Aktion > 31 möglich
  const pdfs = fs.readdirSync(ordner).filter((f) => f.endsWith('.pdf') && f.includes(`_ST${nn}_`) && (f.includes(`_${vorschlag}_${gewinner}-Gewinner_`) || f.includes(`_${vorschlag}_ohne-Gewinner_`))).sort() // 1. Spieltag: „ohne-Gewinner“ in die Spalte der gewählten Variante
  if (!pdfs.length) return fehler(`Keine PDFs für Spieltag ${nn} (Vorschlag ${vorschlag}, ${gewinner} Gewinner) in ${ordner}.`, 404)

  // Zeitung → Verlagsgruppe (aus public/serie/zeitungen.json)
  const zeitungen = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/serie/zeitungen.json'), 'utf8')).zeitungen as { id: string; hotline: string }[]
  const gruppeVon = (datei: string) => {
    const z = [...zeitungen].sort((x, y) => y.id.length - x.id.length).find((z) => datei.includes(`_${z.id}_${vorschlag}_`))
    return z ? z.hotline : null
  }

  type Board = { id: string; name: string; board_kind: string; columns: { id: string; title: string; type: string }[]; items_page: { items: { id: string; name: string }[] } }
  let board: Board | undefined
  try {
    const d = await gql<{ boards: Board[] }>(token, 'query ($ids: [ID!]) { boards(ids: $ids) { id name board_kind columns { id title type } items_page(limit: 200) { items { id name } } } }', { ids: [boardId] })
    board = d.boards?.[0]
  } catch (e) {
    return fehler(e instanceof Error ? e.message : String(e), 502)
  }
  if (!board) return fehler('Board nicht gefunden oder kein Zugriff.', 404)
  if (testmodus && board.board_kind !== 'private') return fehler(`Testmodus: Board „${board.name}“ ist nicht privat.`, 409)

  // Item je Spieltag und Vorschlag: „Anz Spieltag 01 · A“ (bevorzugt) – sonst „Anz Spieltag 01“ (ein Vorschlag je Board)
  const mitVorschlag = new RegExp(`Spieltag\\s*0?${tag}\\b.*[·\\-–]\\s*${vorschlag}$`)
  const item =
    board.items_page.items.find((i) => mitVorschlag.test(i.name.trim())) ??
    board.items_page.items.find((i) => new RegExp(`(^|\\D)0?${tag}$`).test(i.name.trim()))
  if (!item) return fehler(`Kein Item für Spieltag ${nn} / Vorschlag ${vorschlag} gefunden (Name z. B. „Anz Spieltag ${nn} · ${vorschlag}“ oder „Anz Spieltag ${nn}“).`, 404)
  const dateiSpalten = board.columns.filter((c) => c.type === 'file')
  // getrennte Spalten „Anzeige (FUNKE) 1 Gewinner“ / „… 4 Gewinner“ bevorzugt, sonst die gemeinsame Spalte
  const spalteFuer = (gruppe: string) => {
    const wort = GRUPPE[gruppe]
    const passend = dateiSpalten.filter((c) => normal(c.title).split(' ').includes(wort))
    const getrennt = passend.find((c) => normal(c.title).includes(`${gewinner} gew`))
    return getrennt ?? passend.find((c) => !normal(c.title).includes(' gew'))
  }

  // ersetzen: Ziel-Spalten dieses Items (nur die der gewählten Gewinner-Variante) zuerst leeren, dann alles neu hochladen
  if (b.ersetzen) {
    const ziele = [...new Set(pdfs.map((f) => { const g = gruppeVon(f); return g ? spalteFuer(g)?.id : undefined }).filter(Boolean))] as string[]
    if (ziele.length) {
      try {
        await gql(token, 'mutation ($b: ID!, $i: ID!, $v: JSON!) { change_multiple_column_values(board_id: $b, item_id: $i, column_values: $v) { id } }',
          { b: board.id, i: item.id, v: JSON.stringify(Object.fromEntries(ziele.map((id) => [id, { clear_all: true }]))) })
      } catch (e) {
        return fehler('Spalten leeren fehlgeschlagen: ' + (e instanceof Error ? e.message : String(e)), 502)
      }
    }
  }

  // vorhandene Dateien (Namen) je Spalte → nicht doppelt hochladen
  let vorhanden = ''
  if (!b.ersetzen) try {
    const d = await gql<{ items: { column_values: { id: string; text: string | null }[] }[] }>(token, 'query ($id: [ID!], $spalten: [String!]) { items(ids: $id) { column_values(ids: $spalten) { id text } } }', { id: [item.id], spalten: dateiSpalten.map((c) => c.id) }) // nur Datei-Spalten (Text-Spalten mit Dateinamen zählen nicht)
    vorhanden = (d.items?.[0]?.column_values ?? []).map((c) => c.text ?? '').join(' ')
  } catch {
    /* ohne Vorabprüfung weiter */
  }

  const hoch: string[] = []
  const uebersprungen: string[] = []
  const probleme: string[] = []
  for (const f of pdfs) {
    const g = gruppeVon(f)
    const s = g ? spalteFuer(g) : undefined
    if (!s) {
      probleme.push(`${f}: keine Datei-Spalte für Gruppe ${g ?? '?'}`)
      continue
    }
    if (vorhanden.includes(f.replace(/ /g, '%20')) || vorhanden.includes(f)) {
      uebersprungen.push(f)
      continue
    }
    try {
      await hochladen(token, item.id, s.id, path.join(ordner, f))
      hoch.push(f)
    } catch (e) {
      probleme.push(e instanceof Error ? e.message : String(e))
      if (probleme.length >= 3 && !hoch.length) break
    }
  }
  return NextResponse.json({ ok: probleme.length === 0, board: { id: board.id, name: board.name, art: board.board_kind }, item: item.name, hoch: hoch.length, uebersprungen: uebersprungen.length, probleme })
}
