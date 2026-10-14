// /api/bild-holen — lokal: erzeugtes KI-Bild (signierte URL von storage.googleapis.com) in den Projektordner speichern.
// Nur dieser Host, nur Dateinamen ohne Pfad, Ziel fest: ~/Downloads/01_Projekte/Telemedia/Spiele_2027/Moderne_Varianten_Telemedia-Spiele/_html/img/
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const { url, name } = (await request.json().catch(() => ({}))) as { url?: string; name?: string }
  if (!url || !/^https:\/\/storage\.googleapis\.com\//.test(url)) return NextResponse.json({ ok: false, fehler: 'URL nicht erlaubt' }, { status: 400 })
  if (!name || !/^[a-z0-9_-]+\.(png|jpg|webp)$/i.test(name)) return NextResponse.json({ ok: false, fehler: 'Name ungültig' }, { status: 400 })
  const ziel = path.join(os.homedir(), 'Downloads/01_Projekte/Telemedia/Spiele_2027/Moderne_Varianten_Telemedia-Spiele/_html/img')
  fs.mkdirSync(ziel, { recursive: true })
  const r = await fetch(url)
  if (!r.ok) return NextResponse.json({ ok: false, fehler: 'HTTP ' + r.status }, { status: 502 })
  const buf = Buffer.from(await r.arrayBuffer())
  fs.writeFileSync(path.join(ziel, name), buf)
  return NextResponse.json({ ok: true, bytes: buf.length })
}
