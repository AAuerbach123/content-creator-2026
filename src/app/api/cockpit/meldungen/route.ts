// /api/cockpit/meldungen – Glocke im Cockpit + Kunden benachrichtigen.
//   GET                      → letzte 50 Meldungen (mit „gelesen“ für mich)
//   POST { aktion: 'gelesen', ids }            → als gelesen markieren
//   POST { aktion: 'kunden', spieltagId }      → Verlage mit aktivem Link + Empfängern per E-Mail informieren

import { dokLaden, dokListe, dokSpeichern } from '@/lib/server/speicher'
import { kundenMelden, type Meldung } from '@/lib/server/benachrichtigen'
import { mitRecht } from '@/lib/server/zugang'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const z = await mitRecht(request, 'lesen')
  if ('antwort' in z) return z.antwort
  try {
    const liste = (await dokListe('meldung')).map((d) => ({ id: d.id, ...(d.daten as Meldung) })).sort((a, b) => b.am - a.am).slice(0, 50)
    return Response.json({ meldungen: liste.map((m) => ({ ...m, gelesenVonMir: m.gelesen?.includes(z.benutzer.email) ?? false, gelesen: undefined })) })
  } catch (e) {
    return Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let b: { aktion?: string; ids?: string[]; spieltagId?: string }
  try { b = await request.json() } catch { return Response.json({ fehler: 'Ungültig.' }, { status: 400 }) }
  if (b.aktion === 'gelesen') {
    const z = await mitRecht(request, 'lesen')
    if ('antwort' in z) return z.antwort
    for (const id of (b.ids ?? []).slice(0, 100)) {
      const d = await dokLaden('meldung', id)
      if (!d) continue
      const m = d.daten as Meldung
      if (m.gelesen?.includes(z.benutzer.email)) continue
      await dokSpeichern('meldung', id, { ...m, gelesen: [...(m.gelesen ?? []), z.benutzer.email] }, d.version, z.benutzer.email).catch(() => undefined)
    }
    return Response.json({ ok: true })
  }
  if (b.aktion === 'kunden') {
    const z = await mitRecht(request, 'freigeben')
    if ('antwort' in z) return z.antwort
    const s = b.spieltagId ? (await dokLaden('spieltag', b.spieltagId))?.daten as { nr: number; datum: string; verlagsStatus?: Record<string, string> } | undefined : undefined
    if (!s) return Response.json({ fehler: 'Spieltag nicht gefunden.' }, { status: 404 })
    const links = (await dokListe('portalLink')).map((d) => d.daten as { token: string; gruppe: string; name: string; aktiv: boolean; empfaenger?: string })
    const origin = new URL(request.url).origin
    const text = `Spieltag ${s.nr} (${new Date(s.datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })})`
    const ergebnis: string[] = []
    for (const l of links) {
      if (!l.aktiv || !l.empfaenger?.trim() || !(l.gruppe in (s.verlagsStatus ?? {}))) continue
      ergebnis.push(`${l.name}: ${await kundenMelden(l.empfaenger.split(','), l.name, `${origin}/portal/${l.token}`, text)}`)
    }
    return Response.json({ ergebnis })
  }
  return Response.json({ fehler: 'Unbekannte Aktion.' }, { status: 400 })
}
