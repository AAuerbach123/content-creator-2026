// /api/cockpit/pdf – druckfertiges PDF einer Anzeige erzeugen.
//   POST { html, wmm, hmm } → application/pdf
// Masse wie serie-export.mjs: Seite = Anzeigenformat in mm, Inhalt auf 1575 px Layoutbreite skaliert.

import { mitRecht } from '@/lib/server/zugang'
import { pdfAusHtml } from '@/lib/server/pdf'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const z = await mitRecht(request, 'bearbeiten')
  if ('antwort' in z) return z.antwort
  let b: { html?: string; wmm?: number; hmm?: number }
  try { b = await request.json() } catch { return Response.json({ fehler: 'Ungültige Anfrage.' }, { status: 400 }) }
  const wmm = Number(b.wmm), hmm = Number(b.hmm)
  if (!b.html || b.html.length > 12_000_000 || !(wmm > 20 && wmm < 1000) || !(hmm > 20 && hmm < 1000)) return Response.json({ fehler: 'HTML/Format ungültig.' }, { status: 400 })
  try {
    const pdf = await pdfAusHtml(b.html, wmm, hmm, new URL(request.url).origin)
    return new Response(pdf, { headers: { 'content-type': 'application/pdf' } })
  } catch (e) {
    return Response.json({ fehler: 'PDF konnte nicht erzeugt werden: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 })
  }
}
