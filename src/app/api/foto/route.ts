// /api/foto – öffentlicher Foto-Upload für Gewinner (nur mit persönlichem Link, 7 Tage gültig).
//   GET  ?t=<token>  → { vorname, spiel, datum, einwilligungstext, eingegangen }
//   POST multipart { t, einwilligung: '1', foto } → Foto + Einwilligung im Spieltag speichern

import { assetAblegen, dokLaden, dokSpeichern, KonfliktFehler, protokollieren } from '@/lib/server/speicher'
import { telemediaMelden } from '@/lib/server/benachrichtigen'

export const runtime = 'nodejs'

const TOKEN = /^[0-9a-f]{64}$/
const STANDARD = 'Ich bin damit einverstanden, dass mein Foto zusammen mit meinem Namen, meinem Wohnort und dem Gewinnbetrag in der Gewinneranzeige der teilnehmenden Zeitungen veröffentlicht wird.'
const ungueltig = () => Response.json({ fehler: 'Dieser Link ist ungültig oder abgelaufen. Bitte melden Sie sich bei Telemedia.' }, { status: 403 })
const kopf = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' }

type Link = { token: string; spieltagId: string; gewinnerId: string; vorname: string; aktiv: boolean; ablaufAm: number; eingegangenAm?: number }

async function linkLaden(t: string | null): Promise<{ link: Link; version: number } | null> {
  if (!t || !TOKEN.test(t)) return null
  const d = await dokLaden('fotoLink', t)
  const l = d?.daten as Link | undefined
  if (!d || !l || !l.aktiv || l.ablaufAm < Date.now()) return null
  return { link: l, version: d.version }
}

export async function GET(request: Request) {
  const x = await linkLaden(new URL(request.url).searchParams.get('t')).catch(() => null)
  if (!x) return ungueltig()
  const tag = (await dokLaden('spieltag', x.link.spieltagId))?.daten as { datum?: string; kampagneId?: string } | undefined
  const text = ((await dokLaden('einstellung', 'einwilligungstext'))?.daten as { text?: string } | undefined)?.text || STANDARD
  return Response.json({ vorname: x.link.vorname, datum: tag?.datum ?? '', einwilligungstext: text, eingegangen: Boolean(x.link.eingegangenAm) }, { headers: kopf })
}

export async function POST(request: Request) {
  let fd: FormData
  try { fd = await request.formData() } catch { return Response.json({ fehler: 'Ungültige Anfrage.' }, { status: 400 }) }
  const x = await linkLaden(String(fd.get('t') ?? '')).catch(() => null)
  if (!x) return ungueltig()
  if (fd.get('einwilligung') !== '1') return Response.json({ fehler: 'Bitte bestätigen Sie die Einwilligung.' }, { status: 400 })
  const foto = fd.get('foto')
  if (!(foto instanceof Blob) || !/^image\/(jpeg|png|webp)$/.test(foto.type)) return Response.json({ fehler: 'Bitte ein Foto (JPG, PNG oder WebP) auswählen.' }, { status: 400 })
  if (foto.size > 12 * 1024 * 1024) return Response.json({ fehler: 'Das Foto ist zu gross (höchstens 12 MB).' }, { status: 413 })
  try {
    const hash = await assetAblegen(await foto.arrayBuffer(), foto.type)
    const jetzt = Date.now()
    for (let versuch = 0; versuch < 4; versuch++) {
      const d = await dokLaden('spieltag', x.link.spieltagId)
      if (!d) throw new Error('Spieltag nicht gefunden.')
      const s = d.daten as { gewinner: Array<Record<string, unknown> & { id: string }>; nr: number }
      if (!s.gewinner.some((g) => g.id === x.link.gewinnerId)) throw new Error('Gewinner nicht gefunden.')
      const neu = { ...s, gewinner: s.gewinner.map((g) => (g.id === x.link.gewinnerId ? { ...g, fotoHash: hash, fotoOriginalHash: hash, fotoEingangAm: jetzt, einwilligung: true, einwilligungQuelle: 'gewinner-link', einwilligungAm: jetzt } : g)), aktualisiertAm: jetzt }
      try {
        await dokSpeichern('spieltag', x.link.spieltagId, neu, d.version, `gewinner:${x.link.vorname}`)
        break
      } catch (e) {
        if (!(e instanceof KonfliktFehler) || versuch === 3) throw e
      }
    }
    await dokSpeichern('fotoLink', x.link.token, { ...x.link, eingegangenAm: jetzt }, x.version, 'gewinner').catch(() => undefined)
    await telemediaMelden({ art: 'foto', text: `Gewinnerfoto von ${x.link.vorname} ist eingegangen – bitte prüfen und zuschneiden.` }, new URL(request.url).origin)
    await protokollieren({ wer: `Gewinner ${x.link.vorname}`, typ: 'spieltag', dokId: x.link.spieltagId, aktion: 'sonstiges', zusammenfassung: 'Foto + Einwilligung über Foto-Link' })
    return Response.json({ ok: true }, { headers: kopf })
  } catch (e) {
    return Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
