// /api/bild-holen/sammeln — lokal: alle fertigen KI-Bilder aus einer gespeicherten Status-Antwort
// (creative_get_flow_run_status, als JSON-Datei abgelegt) in den Projektordner laden.
// Nur Dateien unter /var/folders bzw. /private/var/folders mit "creative_get_flow_run_status" im Namen; nur storage.googleapis.com.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Media = { generation_id?: string; master_url?: string; url?: string; prompt?: string }

export async function POST(request: Request) {
  const { datei } = (await request.json().catch(() => ({}))) as { datei?: string }
  if (!datei || !/^(\/private)?\/var\/folders\//.test(datei) || !datei.includes('creative_get_flow_run_status') || datei.includes('..'))
    return NextResponse.json({ ok: false, fehler: 'Datei nicht erlaubt' }, { status: 400 })
  const j = JSON.parse(fs.readFileSync(datei, 'utf8')) as { media?: Media[] }
  const ziel = path.join(os.homedir(), 'Downloads/01_Projekte/Telemedia/Spiele_2027/Moderne_Varianten_Telemedia-Spiele/_html/img/_neu')
  fs.mkdirSync(ziel, { recursive: true })
  const out: { id: string; bytes: number; prompt: string }[] = []
  for (const m of j.media ?? []) {
    const u = m.master_url ?? m.url
    if (!u || !m.generation_id || !/^https:\/\/storage\.googleapis\.com\//.test(u)) continue
    const r = await fetch(u)
    if (!r.ok) continue
    const buf = Buffer.from(await r.arrayBuffer())
    fs.writeFileSync(path.join(ziel, m.generation_id.replace(/[^A-Za-z0-9_-]/g, '') + '.png'), buf)
    out.push({ id: m.generation_id, bytes: buf.length, prompt: (m.prompt ?? '').slice(0, 60) })
  }
  return NextResponse.json({ ok: true, anzahl: out.length, bilder: out })
}
