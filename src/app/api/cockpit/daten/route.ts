// /api/cockpit/daten – zentraler Dokument-Speicher des Cockpits (alle Eingeloggten sehen denselben Stand).
//   GET    ?typ=…&id=…                → ein Dokument
//   GET    ?typ=…[&feld=…&wert=…]     → Liste (optional gefiltert, z. B. feld=kampagneId)
//   PUT    { typ, id, daten, version } → speichern (version = zuletzt gesehene, 0 = neu); 409 bei Konflikt
//   DELETE ?typ=…&id=…

import { dokLaden, dokListe, dokLoeschen, dokSpeichern, KonfliktFehler, protokollieren } from '@/lib/server/speicher'
import { mitRecht, type Recht } from '@/lib/server/zugang'

export const runtime = 'nodejs'

const TYPEN = new Set([
  'kampagne', 'spieltag', 'cockpitVorlage', 'stamm', 'serienGewinner',
  'portalLink', 'portalStatus', 'benutzer', 'mondayKarte', 'einstellung', 'benutzerEinstellung', 'fotoLink', 'meldung',
])
const NUR_ADMIN = new Set(['benutzer', 'portalLink', 'mondayKarte', 'einstellung'])
const MAX_BYTES = 900_000 // D1-Zeile klein halten (Fotos gehören in /api/cockpit/assets)

function schreibRecht(typ: string): Recht {
  if (NUR_ADMIN.has(typ)) return 'admin'
  if (typ === 'benutzerEinstellung') return 'lesen'
  return 'bearbeiten'
}

function typPruefen(typ: string | null): string | Response {
  if (!typ || !TYPEN.has(typ)) return Response.json({ fehler: 'Unbekannter Typ: ' + typ }, { status: 400 })
  return typ
}

function fehlerAntwort(e: unknown): Response {
  if (e instanceof KonfliktFehler) {
    return Response.json({ fehler: 'konflikt', aktuell: e.aktuell }, { status: 409 })
  }
  return Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 })
}

/** Kurze Beschreibung fürs Protokoll (ohne personenbezogene Details). */
function zusammenfassung(typ: string, daten: Record<string, unknown>): string {
  switch (typ) {
    case 'kampagne': return `Kampagne ${daten.spielId ?? ''} ${daten.monat ?? ''}`.trim()
    case 'spieltag': return `Spieltag ${daten.nr ?? ''} (${daten.datum ?? ''}) · Status ${daten.status ?? ''}`
    case 'serienGewinner': return `Gewinner Tag ${daten.tag ?? ''} (${daten.spielId ?? ''} ${daten.monat ?? ''})`
    case 'stamm': return `Stammdaten ${String(daten.id ?? '')}`
    case 'portalLink': return `Kundenlink ${daten.gruppe ?? ''} · ${daten.aktiv === false ? 'gesperrt' : 'aktiv'}`
    case 'benutzer': return `Benutzer ${daten.email ?? ''} · Rolle ${daten.rolle ?? ''}`
    default: return typ
  }
}

export async function GET(request: Request) {
  const z = await mitRecht(request, 'lesen')
  if ('antwort' in z) return z.antwort
  const url = new URL(request.url)
  const typ = typPruefen(url.searchParams.get('typ'))
  if (typ instanceof Response) return typ
  if (typ === 'benutzerEinstellung') {
    // nur eigene Einstellungen
    const d = await dokLaden(typ, z.benutzer.email).catch(fehlerAntwort)
    return d instanceof Response ? d : Response.json({ dokument: d })
  }
  try {
    const id = url.searchParams.get('id')
    if (id) return Response.json({ dokument: await dokLaden(typ, id) })
    const feld = url.searchParams.get('feld')
    const wert = url.searchParams.get('wert')
    const liste = await dokListe(typ, feld && wert !== null ? { feld, wert } : undefined)
    return Response.json({ dokumente: liste })
  } catch (e) {
    return fehlerAntwort(e)
  }
}

export async function PUT(request: Request) {
  let body: { typ?: string; id?: string; daten?: unknown; version?: number }
  const roh = await request.text()
  if (roh.length > MAX_BYTES) return Response.json({ fehler: 'Daten zu gross – Fotos bitte als Datei hochladen.' }, { status: 413 })
  try { body = JSON.parse(roh) } catch { return Response.json({ fehler: 'Kein gültiges JSON.' }, { status: 400 }) }
  const typ = typPruefen(body.typ ?? null)
  if (typ instanceof Response) return typ
  // Prüfer dürfen Spieltage freigeben (Status ändern), ohne Bearbeiten-Recht
  const recht: Recht = typ === 'spieltag' ? 'lesen' : schreibRecht(typ)
  const z = await mitRecht(request, recht)
  if ('antwort' in z) return z.antwort
  if (typ === 'spieltag') {
    const { darf } = await import('@/lib/server/zugang')
    if (!darf(z.benutzer, 'bearbeiten') && !darf(z.benutzer, 'freigeben')) {
      return Response.json({ fehler: 'Dafür fehlt dir die Berechtigung.' }, { status: 403 })
    }
  }
  const id = typ === 'benutzerEinstellung' ? z.benutzer.email : body.id
  if (!id || typeof id !== 'string' || id.length > 200) return Response.json({ fehler: 'id fehlt.' }, { status: 400 })
  if (body.daten === undefined) return Response.json({ fehler: 'daten fehlen.' }, { status: 400 })
  const version = typeof body.version === 'number' ? body.version : 0
  if (typ === 'kampagne') {
    // Gestaltungsvarianten ändern darf nur die Grafik; wählen (gestaltung = eine vorhandene Variante) darf jede/r mit Bearbeiten-Recht
    const { darfVarianten } = await import('@/lib/server/zugang')
    if (!darfVarianten(z.benutzer)) {
      const alt = (await dokLaden('kampagne', id).catch(() => null))?.daten as { varianten?: unknown[]; gestaltung?: unknown } | undefined
      const neu = body.daten as { varianten?: unknown[]; gestaltung?: unknown }
      const j = (x: unknown) => JSON.stringify(x ?? null)
      const variantenGeaendert = j(alt?.varianten) !== j(neu?.varianten)
      const gestaltungFremd = neu?.gestaltung != null && j(neu.gestaltung) !== j(alt?.gestaltung) && !(neu.varianten ?? []).some((v) => j(v) === j(neu.gestaltung))
      if (variantenGeaendert || gestaltungFremd) {
        return Response.json({ fehler: 'Gestaltungsvarianten erzeugen und ändern darf nur die Grafik.' }, { status: 403 })
      }
    }
  }
  try {
    const dok = await dokSpeichern(typ, id, body.daten, version, z.benutzer.email)
    if (typ !== 'benutzerEinstellung') {
      await protokollieren({
        wer: z.benutzer.email,
        typ,
        dokId: id,
        aktion: dok.version === 1 ? 'angelegt' : 'geaendert',
        zusammenfassung: zusammenfassung(typ, (body.daten ?? {}) as Record<string, unknown>),
      })
    }
    return Response.json({ dokument: dok })
  } catch (e) {
    return fehlerAntwort(e)
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const typ = typPruefen(url.searchParams.get('typ'))
  if (typ instanceof Response) return typ
  const z = await mitRecht(request, schreibRecht(typ))
  if ('antwort' in z) return z.antwort
  const id = url.searchParams.get('id')
  if (!id) return Response.json({ fehler: 'id fehlt.' }, { status: 400 })
  try {
    await dokLoeschen(typ, id)
    await protokollieren({ wer: z.benutzer.email, typ, dokId: id, aktion: 'geloescht', zusammenfassung: `${typ} gelöscht` })
    return Response.json({ ok: true })
  } catch (e) {
    return fehlerAntwort(e)
  }
}
