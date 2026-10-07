// GET /api/korrekturen
//   Liefert die Korrekturen des Wissensquiz-Portals (Cloudflare-Pages, Cross-Browser) als normalisierte Liste.
//   Portal-URL + Master-Slug kommen aus .env.local (siehe docs/korrekturportal-anbindung.md):
//     KORREKTURPORTAL_URL=https://quiz-review.pages.dev
//     KORREKTURPORTAL_SLUG=be5ff27040
//   Lokal-only Route – wird im Cloudflare-Deploy nicht benötigt (die Portal-URL ist eigenständig).

import crypto from 'node:crypto'

export const runtime = 'nodejs'

export type RohKorrektur = {
  grp: string
  paper: string
  variant: '1' | '2' | string
  winner: 'mit' | 'ohne' | string
  kategorie: string
  status: 'ok' | 'change' | string
  text: string
  autor: string
  ts: number
}

export type Korrektur = RohKorrektur & { id: string }

function idBerechnen(c: RohKorrektur): string {
  const seed = [c.grp, c.paper, c.variant, c.winner, c.ts, c.autor, c.text].join('§')
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16)
}

export async function GET() {
  const url = process.env.KORREKTURPORTAL_URL
  const slug = process.env.KORREKTURPORTAL_SLUG
  if (!url || !slug) {
    return new Response(
      JSON.stringify({ fehler: 'KORREKTURPORTAL_URL oder KORREKTURPORTAL_SLUG fehlt in .env.local. Siehe docs/korrekturportal-anbindung.md.' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    )
  }
  try {
    const res = await fetch(url.replace(/\/$/, '') + '/api/comments?g=' + encodeURIComponent(slug), { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    const { comments } = (await res.json()) as { comments?: RohKorrektur[] }
    const liste: Korrektur[] = (comments ?? []).map((c) => ({ ...c, id: idBerechnen(c) }))
    return new Response(JSON.stringify({ korrekturen: liste, stand: Date.now() }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ fehler: (e as Error).message }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
}
