// /api/freigabe — Server-Routen für das Korrekturportal (Phase 6 #8).
//
// POST: neue Freigabe anlegen (mit Artefakt-Snapshot + Base64-Assets).
// GET  ?token=…: Freigabe abrufen (für Reviewer-Seite und Grafiker-Pin-Panel).
// PATCH: neuen Pin hinzufügen oder Status/Antwort ändern.
// DELETE ?token=…: Freigabe löschen.
//
// Speicher: Cloudflare KV (Binding FREIGABEN) online, Datei-Fallback lokal.

import { NextResponse } from 'next/server'
import { freigabeLaden, freigabeLoeschen, freigabeSpeichern, speicherModus } from '@/lib/freigabe-store'
import type { ServerAsset, ServerFreigabe } from '@/lib/freigabe-store'
import type { Korrekturpin } from '@/lib/types'
import { LIMITS } from '@/lib/eingabe-limit'

export const runtime = 'nodejs'

// Token = UUIDv4 (36 Zeichen, 128 Bit) — nicht ratbar, aber Format prüfen wir
// trotzdem, damit z. B. „../…"-Pfade in der Datei-Fallback-Ablage nicht möglich sind.
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function tokenGueltig(token: string | null): token is string {
  return !!token && TOKEN_RE.test(token)
}

export async function POST(request: Request) {
  const roh = await request.text()
  if (roh.length > LIMITS.freigabeGesamt) {
    return NextResponse.json(
      { fehler: `Freigabe zu gross (${Math.round(roh.length / 1024 / 1024)} MB, max ${Math.round(LIMITS.freigabeGesamt / 1024 / 1024)} MB).` },
      { status: 413 },
    )
  }
  let body: Partial<ServerFreigabe>
  try {
    body = JSON.parse(roh) as Partial<ServerFreigabe>
  } catch {
    return NextResponse.json({ fehler: 'Body ist kein gültiges JSON.' }, { status: 400 })
  }
  if (!body.id || !body.jobId || !body.artefakt || !body.artefaktId) {
    return NextResponse.json(
      { fehler: 'Pflichtfelder fehlen (id, jobId, artefaktId, artefakt).' },
      { status: 400 },
    )
  }
  if (!tokenGueltig(body.id)) {
    return NextResponse.json({ fehler: 'Ungültiger Token (UUIDv4 erwartet).' }, { status: 400 })
  }
  const now = Date.now()
  const freigabe: ServerFreigabe = {
    id: body.id,
    jobId: body.jobId,
    jobTitel: body.jobTitel || '',
    artefaktId: body.artefaktId,
    artefakt: body.artefakt,
    assets: (body.assets || {}) as Record<string, ServerAsset>,
    pins: body.pins || [],
    erstelltAm: body.erstelltAm || now,
    aktualisiertAm: now,
  }
  await freigabeSpeichern(freigabe)
  return NextResponse.json({ ok: true, modus: await speicherModus() })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!tokenGueltig(token)) return NextResponse.json({ fehler: 'token fehlt oder ist ungültig' }, { status: 400 })
  const freigabe = await freigabeLaden(token)
  if (!freigabe) return NextResponse.json({ fehler: 'Freigabe nicht gefunden' }, { status: 404 })
  return NextResponse.json({ ok: true, freigabe })
}

type PatchBody = {
  token?: string
  neuerPin?: { x: number; y: number; kommentar: string; autor?: string }
  pinId?: string
  status?: Korrekturpin['status']
  antwort?: { text: string; autor?: string }
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PatchBody
  if (!tokenGueltig(body.token || null)) return NextResponse.json({ fehler: 'token fehlt oder ist ungültig' }, { status: 400 })
  if (body.neuerPin?.kommentar && body.neuerPin.kommentar.length > LIMITS.textKurz) {
    return NextResponse.json({ fehler: `Kommentar zu lang (max ${LIMITS.textKurz}).` }, { status: 413 })
  }
  if (body.antwort?.text && body.antwort.text.length > LIMITS.textKurz) {
    return NextResponse.json({ fehler: `Antwort zu lang (max ${LIMITS.textKurz}).` }, { status: 413 })
  }
  const freigabe = await freigabeLaden(body.token as string)
  if (!freigabe) return NextResponse.json({ fehler: 'Freigabe nicht gefunden' }, { status: 404 })

  if (body.neuerPin) {
    const pin: Korrekturpin = {
      id: crypto.randomUUID(),
      x: Math.max(0, Math.min(1, body.neuerPin.x)),
      y: Math.max(0, Math.min(1, body.neuerPin.y)),
      kommentar: body.neuerPin.kommentar || '',
      autor: body.neuerPin.autor,
      status: 'offen',
      erstelltAm: Date.now(),
      antworten: [],
    }
    freigabe.pins.push(pin)
  } else if (body.pinId) {
    const pin = freigabe.pins.find((p) => p.id === body.pinId)
    if (!pin) return NextResponse.json({ fehler: 'Pin nicht gefunden' }, { status: 404 })
    if (body.status) pin.status = body.status
    if (body.antwort) {
      pin.antworten = pin.antworten || []
      pin.antworten.push({ text: body.antwort.text, autor: body.antwort.autor, erstelltAm: Date.now() })
    }
  } else {
    return NextResponse.json({ fehler: 'Kein neuerPin und keine pinId angegeben.' }, { status: 400 })
  }

  freigabe.aktualisiertAm = Date.now()
  await freigabeSpeichern(freigabe)
  return NextResponse.json({ ok: true, freigabe })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!tokenGueltig(token)) return NextResponse.json({ fehler: 'token fehlt oder ist ungültig' }, { status: 400 })
  await freigabeLoeschen(token)
  return NextResponse.json({ ok: true })
}
