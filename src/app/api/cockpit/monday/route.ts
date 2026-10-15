// /api/cockpit/monday – monday-Abgleich aus dem Cockpit.
//   GET                                   → Status (Schlüssel vorhanden? LIVE-Freigabe?)
//   POST { aktion: 'boards', workspaceId } → Ordner + Boards eines Arbeitsbereichs (nur lesen)
//   POST { aktion: 'verbinden', kampagneId, karte }   (Admin) → Board-Zuordnung speichern
//   POST { aktion: 'abgleich', kampagneId, bereich, nurLesen? } → Abgleich eines Bereichs
//   POST multipart (aktion=anzeige, kampagneId, monat, nr, gruppe, gewinner, vorschlag, ersetzen, datei) → PDF hochladen

import { dokLaden, dokSpeichern } from '@/lib/server/speicher'
import { gql, liveErlaubt } from '@/lib/server/monday'
import { abgleichen, anzeigeHochladen, type Bereich } from '@/lib/server/monday-abgleich'
import { mitRecht } from '@/lib/server/zugang'

export const runtime = 'nodejs'

const fehler = (e: unknown, status = 500) => Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status })

export async function GET(request: Request) {
  const z = await mitRecht(request, 'lesen')
  if ('antwort' in z) return z.antwort
  return Response.json({ token: Boolean(process.env.MONDAY_API_TOKEN), live: liveErlaubt() })
}

export async function POST(request: Request) {
  const typ = request.headers.get('content-type') ?? ''
  if (typ.startsWith('multipart/form-data')) {
    const z = await mitRecht(request, 'bearbeiten')
    if ('antwort' in z) return z.antwort
    try {
      const fd = await request.formData()
      const datei = fd.get('datei')
      if (!(datei instanceof Blob) || datei.size > 15 * 1024 * 1024) return fehler('PDF fehlt oder ist zu gross.', 400)
      const nr = Number(fd.get('nr'))
      const gewinner = Number(fd.get('gewinner')) === 4 ? 4 : 1
      const ziel = await anzeigeHochladen({
        kampagneId: String(fd.get('kampagneId') ?? ''), monat: String(fd.get('monat') ?? ''), nr, gruppe: String(fd.get('gruppe') ?? ''),
        gewinner, vorschlag: String(fd.get('vorschlag') ?? 'A'), datei, dateiname: String(fd.get('dateiname') ?? 'anzeige.pdf').replace(/[^\w.\-äöüÄÖÜß]+/g, '_'),
        ersetzen: fd.get('ersetzen') === '1',
      })
      return Response.json({ ok: true, ziel })
    } catch (e) {
      return fehler(e, 502)
    }
  }

  let b: { aktion?: string; workspaceId?: string; kampagneId?: string; karte?: unknown; bereich?: Bereich; nurLesen?: boolean }
  try { b = await request.json() } catch { return fehler('Ungültige Anfrage.', 400) }

  if (b.aktion === 'boards') {
    const z = await mitRecht(request, 'lesen')
    if ('antwort' in z) return z.antwort
    try {
      if (!b.workspaceId) {
        const d = await gql<{ workspaces: Array<{ id: string; name: string }> }>('query { workspaces(limit: 100) { id name } }')
        return Response.json({ workspaces: d.workspaces })
      }
      const d = await gql<{ folders: Array<{ id: string; name: string }>; boards: Array<{ id: string; name: string; board_kind: string; board_folder_id: string | null }> }>(
        'query ($w: [ID!]) { folders(workspace_ids: $w, limit: 100) { id name } boards(workspace_ids: $w, limit: 500, state: active) { id name board_kind board_folder_id } }',
        { w: [b.workspaceId] },
      )
      return Response.json({ ordner: d.folders, boards: d.boards.filter((x) => !/^unterelemente von/i.test(x.name) && !/^subitems of/i.test(x.name)) })
    } catch (e) {
      return fehler(e, 502)
    }
  }

  if (b.aktion === 'projektdetails') {
    // Rufnummern aus dem monday-Board „2. Projektdetails“ (Cash Call): Name, MWN Print, MWN Web, Hotline (nur lesen)
    const z = await mitRecht(request, 'lesen')
    if ('antwort' in z) return z.antwort
    try {
      const boardId = process.env.MONDAY_PROJEKTDETAILS_BOARD || '1062567155'
      const { boardLesen, normal } = await import('@/lib/server/monday')
      const board = await boardLesen(boardId)
      const sp = (t: string) => board.columns.find((c) => normal(c.title) === normal(t))?.id
      const ids = [sp('MWN Print'), sp('MWN Web'), sp('Hotline')].filter(Boolean) as string[]
      const mitWerten = await boardLesen(boardId, ids)
      const text = (i: (typeof mitWerten.items)[number], id?: string) => (id ? i.column_values?.find((c) => c.id === id)?.text ?? '' : '')
      const zeilen = mitWerten.items.map((i) => ({ name: i.name, mwnPrint: text(i, sp('MWN Print')), mwnWeb: text(i, sp('MWN Web')), hotline: text(i, sp('Hotline')) }))
      return Response.json({ board: board.name, zeilen })
    } catch (e) {
      return fehler(e, 502)
    }
  }

  if (b.aktion === 'verbinden') {
    const z = await mitRecht(request, 'admin')
    if ('antwort' in z) return z.antwort
    const kd = b.kampagneId ? await dokLaden('kampagne', b.kampagneId) : null
    if (!kd) return fehler('Kampagne nicht gefunden.', 404)
    const k = kd.daten as Record<string, unknown> & { monday?: Record<string, unknown> }
    const karte = (b.karte ?? {}) as Record<string, unknown>
    const id = (v: unknown) => (typeof v === 'string' && /^\d{5,20}$/.test(v) ? v : undefined)
    const anzeigen = Object.fromEntries(Object.entries((karte.anzeigen ?? {}) as Record<string, unknown>).filter(([m, v]) => /^\d{4}-\d{2}$/.test(m) && id(v)).map(([m, v]) => [m, v as string]))
    const neu = { ...(k.monday ?? {}), ordnerId: id(karte.ordnerId), projektplan: id(karte.projektplan), fragen: id(karte.fragen), vorlagen: id(karte.vorlagen), gewinner: id(karte.gewinner), anzeigen }
    try {
      await dokSpeichern('kampagne', kd.id, { ...k, monday: neu }, kd.version, z.benutzer.email)
      return Response.json({ ok: true, karte: neu })
    } catch (e) {
      return fehler(e, 409)
    }
  }

  if (b.aktion === 'abgleich') {
    const z = await mitRecht(request, 'bearbeiten')
    if ('antwort' in z) return z.antwort
    if (!b.kampagneId || !['projektplan', 'fragen', 'gewinner', 'anzeigen'].includes(String(b.bereich))) return fehler('Kampagne/Bereich fehlt.', 400)
    try {
      return Response.json({ bericht: await abgleichen(b.kampagneId, b.bereich as Bereich, z.benutzer.email, Boolean(b.nurLesen)) })
    } catch (e) {
      return fehler(e, 502)
    }
  }
  return fehler('Unbekannte Aktion.', 400)
}
