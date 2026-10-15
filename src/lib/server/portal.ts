// Kunden-Korrekturportal – Serverseite (LOOP-Cockpit-Ausbau-Team.md, Phase 6).
// Ein Link je Verlagsgruppe: /portal/<token>. Der Token ist 32 zufällige Bytes (hex) und zugleich die Dokument-ID.
// Kunden sehen nur: Spieltage, die Telemedia freigegeben hat, und nur die Zeitungen ihrer Gruppe.

import { dokLaden, dokListe, dokSpeichern, KonfliktFehler, protokollieren } from './speicher'

export type PortalLink = {
  token: string
  gruppe: string
  name: string
  aktiv: boolean
  erstelltAm: number
  erstelltVon: string
  gesperrtAm?: number
}

export const TOKEN_RE = /^[0-9a-f]{64}$/

export async function linkPruefen(token: string | null): Promise<PortalLink | null> {
  if (!token || !TOKEN_RE.test(token)) return null
  const d = await dokLaden('portalLink', token)
  const l = d?.daten as PortalLink | undefined
  return l && l.aktiv ? l : null
}

type Gewinner = { name: string; ort: string; betrag: number; gewinnertext: string; fotoHash?: string; einwilligung: boolean }
type SpieltagRoh = {
  id: string; kampagneId: string; nr: number; datum: string; status: string
  raetsel: Record<string, unknown>; gewinner: Gewinner[]
  verlagsStatus?: Record<string, string>
  portalKommentare?: Record<string, Array<Record<string, unknown>>>
  deadline?: string
  vorherigeFassung?: { am: number; raetsel: Record<string, unknown>; gewinner: Array<{ name: string; ort: string; betrag: number; gewinnertext: string; fotoHash?: string }> }
}
type KampagneRoh = { id: string; spielId: string; monat: string; vorlageAbc?: string; verlage: string[] }

/** Was der Kunde sehen darf (nur Daten, die ohnehin in seinen Anzeigen stehen). */
export async function portalDaten(link: PortalLink) {
  const kampagnen = (await dokListe('kampagne')).map((d) => d.daten as KampagneRoh)
  const out: Array<{ kampagne: Pick<KampagneRoh, 'id' | 'spielId' | 'monat' | 'vorlageAbc' | 'verlage'>; spieltage: unknown[]; aenderungen: Record<string, unknown>; teilnehmer?: string[]; einfuehrung?: { titel: string; text: string } }> = []
  for (const k of kampagnen) {
    const tage = (await dokListe('spieltag', { feld: 'kampagneId', wert: k.id })).map((d) => d.daten as SpieltagRoh)
    const sichtbar = tage.filter((s) => s.status === 'freigegeben' || (s.verlagsStatus && s.verlagsStatus[link.gruppe]))
    if (!sichtbar.length) continue
    const stamm = (await dokLaden('stamm', `zeitungen:${k.spielId}`))?.daten as { aenderungen?: Record<string, unknown>; teilnehmer?: string[] } | undefined
    const monat = (sichtbar[0]?.datum ?? k.monat).slice(0, 7)
    const ef = (await dokLaden('stamm', `einfuehrung:${k.spielId}:${monat}`))?.daten as { titel?: string; text?: string } | undefined
    out.push({
      kampagne: { id: k.id, spielId: k.spielId, monat: k.monat, vorlageAbc: k.vorlageAbc, verlage: k.verlage },
      aenderungen: stamm?.aenderungen ?? {},
      teilnehmer: stamm?.teilnehmer,
      einfuehrung: ef?.titel || ef?.text ? { titel: ef.titel ?? '', text: ef.text ?? '' } : undefined,
      spieltage: sichtbar
        .sort((a, b) => a.datum.localeCompare(b.datum))
        .map((s) => ({
          id: s.id, nr: s.nr, datum: s.datum, status: s.status,
          raetsel: s.raetsel,
          gewinner: (s.gewinner ?? []).filter((g) => g.einwilligung && g.name?.trim()).map((g) => ({ name: g.name, ort: g.ort, betrag: g.betrag, gewinnertext: g.gewinnertext, fotoHash: g.fotoHash, einwilligung: true })),
          verlagsStatus: s.verlagsStatus?.[link.gruppe] ?? null,
          kommentare: s.portalKommentare?.[link.gruppe] ?? [],
          deadline: s.deadline ?? null,
          vorher: s.vorherigeFassung ?? null,
        })),
    })
  }
  return out
}

/** Gehört das Foto zu einem für den Kunden sichtbaren Spieltag? */
export async function fotoErlaubt(link: PortalLink, hash: string): Promise<boolean> {
  const daten = await portalDaten(link)
  return daten.some((k) => (k.spieltage as Array<{ gewinner: Array<{ fotoHash?: string }>; vorher?: { gewinner: Array<{ fotoHash?: string }> } | null }>).some((s) => s.gewinner.some((g) => g.fotoHash === hash) || Boolean(s.vorher?.gewinner.some((g) => g.fotoHash === hash))))
}

export type PortalAktion =
  | { aktion: 'ok'; spieltagId: string; von: string; text?: string }
  | { aktion: 'fehler'; spieltagId: string; von: string; text?: string }
  | { aktion: 'kommentar'; spieltagId: string; von: string; text: string; zeitungId: string; x?: number; y?: number }

/** Status/Kommentar des Kunden in den Spieltag schreiben (mit Wiederholung bei gleichzeitiger Änderung). */
export async function portalAktion(link: PortalLink, a: PortalAktion): Promise<void> {
  for (let versuch = 0; versuch < 4; versuch++) {
    const d = await dokLaden('spieltag', a.spieltagId)
    if (!d) throw new Error('Spieltag nicht gefunden.')
    const s = d.daten as SpieltagRoh
    if (!(s.status === 'freigegeben' || s.verlagsStatus?.[link.gruppe])) throw new Error('Dieser Spieltag ist noch nicht zur Prüfung freigegeben.')
    const neu: SpieltagRoh = { ...s, verlagsStatus: { ...(s.verlagsStatus ?? {}) }, portalKommentare: { ...(s.portalKommentare ?? {}) } }
    const liste = [...(neu.portalKommentare![link.gruppe] ?? [])]
    const jetzt = Date.now()
    if (a.text?.trim()) {
      liste.push({
        id: crypto.randomUUID(),
        zeitungId: a.aktion === 'kommentar' ? a.zeitungId : '',
        x: a.aktion === 'kommentar' ? a.x : undefined,
        y: a.aktion === 'kommentar' ? a.y : undefined,
        text: a.text.trim().slice(0, 1000),
        von: a.von.trim().slice(0, 80) || 'Verlag',
        am: jetzt,
      })
    }
    neu.portalKommentare![link.gruppe] = liste
    if (a.aktion === 'ok') neu.verlagsStatus![link.gruppe] = 'verlag-ok'
    if (a.aktion === 'fehler') neu.verlagsStatus![link.gruppe] = 'verlag-fehler'
    try {
      await dokSpeichern('spieltag', a.spieltagId, { ...neu, aktualisiertAm: jetzt }, d.version, `portal:${link.gruppe}`)
      if (a.aktion === 'fehler' || a.aktion === 'ok') {
        const { telemediaMelden } = await import('./benachrichtigen')
        await telemediaMelden({
          art: a.aktion === 'fehler' ? 'korrektur' : 'freigabe-verlag',
          text: a.aktion === 'fehler' ? `${link.name} meldet eine Korrektur für Spieltag ${s.nr}${a.text ? ': „' + a.text.slice(0, 120) + '“' : ''}` : `${link.name} hat Spieltag ${s.nr} freigegeben`,
          link: '/cockpit/portal',
        })
      }
      await protokollieren({
        wer: `Kunde ${link.name} (${a.von.trim().slice(0, 40) || 'ohne Namen'})`,
        typ: 'portalStatus',
        dokId: a.spieltagId,
        aktion: 'portal',
        zusammenfassung: `Spieltag ${s.nr}: ${a.aktion === 'ok' ? 'Verlag OK' : a.aktion === 'fehler' ? 'Korrektur gemeldet' : 'Kommentar'}`,
      })
      return
    } catch (e) {
      if (!(e instanceof KonfliktFehler)) throw e
    }
  }
  throw new Error('Bitte erneut versuchen – der Spieltag wurde gerade bearbeitet.')
}

// ------------------------------------------------------------------ PDF für den Kunden (serverseitig gebaut – kein fremdes HTML)

import zeitungenJson from '../../../public/serie/zeitungen.json'
import weitereJson from '../../../public/serie/zeitungen-weitere.json'
import { anzeigeBauen } from '../serie/anzeige-bauen'
import { poolBilden, standardTeilnehmer, type WeitereDatei } from '../serie/zeitungs-pool'
import { spielFinden } from '../serie/spiele'
import { htmlMaskieren } from '../serie/serie-ki'
import type { Inhalt } from '../serie/spiele/typen'
import type { SerienDaten, Vorschlag, Zeitung } from '../serie/types'
import { assetHolen } from './speicher'
import { pdfAusHtml } from './pdf'

function bytesZuBase64(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}

export async function portalPdf(link: PortalLink, spieltagId: string, zeitungId: string, g: 1 | 4, origin: string): Promise<{ pdf: ArrayBuffer; dateiname: string }> {
  const daten = await portalDaten(link)
  const k = daten.find((x) => (x.spieltage as Array<{ id: string }>).some((s) => s.id === spieltagId))
  if (!k) throw new Error('Spieltag nicht sichtbar.')
  const s = (k.spieltage as Array<{ id: string; nr: number; datum: string; raetsel: Record<string, unknown>; gewinner: Array<{ name: string; ort: string; betrag: number; gewinnertext: string; fotoHash?: string }> }>).find((x) => x.id === spieltagId)!
  const pool = poolBilden(zeitungenJson as unknown as SerienDaten, weitereJson as unknown as WeitereDatei)
  const ids = k.kampagne.verlage.length ? k.kampagne.verlage : k.teilnehmer?.length ? k.teilnehmer : standardTeilnehmer(k.kampagne.spielId, pool.standard)
  const roh = pool.daten.zeitungen.find((z) => z.id === zeitungId)
  if (!roh || roh.hotline !== link.gruppe || !ids.includes(zeitungId)) throw new Error('Zeitung gehört nicht zu Ihrer Verlagsgruppe.')
  const z: Zeitung = { ...roh, ...((k.aenderungen[zeitungId] as Partial<Zeitung>) ?? {}) }
  const gewinner = []
  for (const x of s.gewinner) {
    let foto: string | undefined
    if (x.fotoHash) { const a = await assetHolen(x.fotoHash); if (a) foto = `data:${a.mime};base64,${bytesZuBase64(a.daten)}` }
    gewinner.push({ name: htmlMaskieren(x.name), ort: htmlMaskieren(x.ort), betrag: `${x.betrag.toLocaleString('de-DE')} €`, text: htmlMaskieren(x.gewinnertext ?? ''), foto })
  }
  const r = s.raetsel as { frage?: string; a1?: string; a2?: string; richtig?: 1 | 2; loesung?: string; daten?: Record<string, unknown> }
  const d = new Date(s.datum + 'T12:00:00')
  const inhalt: Inhalt = { tag: s.nr, datum: s.datum, label: d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }), frage: r.frage ?? '', a1: r.a1, a2: r.a2, richtig: r.richtig, loesung: r.loesung, daten: r.daten, muster: false }
  if (gewinner.length) inhalt.gewinner = gewinner
  if (s.nr === 1 && k.einfuehrung) inhalt.einfuehrung = k.einfuehrung
  const spiel = k.kampagne.spielId === 'geldregen' ? null : spielFinden(k.kampagne.spielId) ?? null
  const html = anzeigeBauen({ daten: pool.daten, spiel, z, inhalt, vorschlag: ((k.kampagne.vorlageAbc as Vorschlag) ?? 'A'), gewinner: g, monat: s.datum.slice(0, 7), pfad: (n) => `${origin}/serie/assets/${n}`, kiText: true })
  const pdf = await pdfAusHtml(html, z.format[0], z.format[1], origin)
  return { pdf, dateiname: `Anzeige_Spieltag_${String(s.nr).padStart(2, '0')}_${s.datum}_${z.id}_${g}-Gewinner.pdf` }
}
