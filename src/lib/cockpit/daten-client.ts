'use client'

// Zentraler Speicher – Browser-Seite (LOOP-Cockpit-Ausbau-Team.md, Phase 1).
// Gleiche Funktionsnamen wie früher in db.ts, aber alle Daten liegen auf dem Server:
// Jede eingeloggte Person sieht denselben Stand.
//
// - Speichern läuft je Dokument in einer Warteschlange (schnelles Tippen erzeugt keine Konflikte).
// - Konflikt (jemand anderes hat inzwischen gespeichert) → Ereignis `cockpit:konflikt` → Banner „neu laden“.
// - Fehler (z. B. Server nicht eingerichtet) → Ereignis `cockpit:fehler`.

import type { CockpitVorlage, Kampagne, Spieltag } from './typen'
import type { SerienGewinner } from '../db'

type Dok<T> = { typ: string; id: string; daten: T; version: number; aktualisiertAm: number; aktualisiertVon: string }

const versionen = new Map<string, number>()
const schluessel = (typ: string, id: string) => `${typ}:${id}`

function melden(art: 'konflikt' | 'fehler' | 'gespeichert', detail: unknown) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cockpit:' + art, { detail }))
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) }, cache: 'no-store' })
  const j = (await r.json().catch(() => ({}))) as T & { fehler?: string; aktuell?: Dok<unknown> }
  if (r.status === 409) {
    const e = new Error('konflikt') as Error & { aktuell?: Dok<unknown> }
    e.aktuell = j.aktuell
    throw e
  }
  if (!r.ok) throw new Error(j.fehler ?? `HTTP ${r.status}`)
  return j
}

// ------------------------------------------------------------------ generisch

export async function dokListe<T>(typ: string, filter?: { feld: string; wert: string }): Promise<T[]> {
  const q = new URLSearchParams({ typ })
  if (filter) { q.set('feld', filter.feld); q.set('wert', filter.wert) }
  try {
    const { dokumente } = await api<{ dokumente: Dok<T>[] }>('/api/cockpit/daten?' + q)
    for (const d of dokumente) versionen.set(schluessel(typ, d.id), d.version)
    return dokumente.map((d) => d.daten)
  } catch (e) {
    melden('fehler', e instanceof Error ? e.message : String(e))
    throw e
  }
}

export async function dokMitMeta<T>(typ: string, id: string): Promise<Dok<T> | null> {
  const q = new URLSearchParams({ typ, id })
  const { dokument } = await api<{ dokument: Dok<T> | null }>('/api/cockpit/daten?' + q)
  if (dokument) versionen.set(schluessel(typ, id), dokument.version)
  return dokument
}

export async function dokLaden<T>(typ: string, id: string): Promise<T | undefined> {
  try {
    return (await dokMitMeta<T>(typ, id))?.daten
  } catch (e) {
    melden('fehler', e instanceof Error ? e.message : String(e))
    throw e
  }
}

type Warte = { daten: unknown; erfuellen: Array<() => void>; ablehnen: Array<(e: unknown) => void> }
const warteschlange = new Map<string, Warte>()
const laufend = new Set<string>()

async function abarbeiten(typ: string, id: string): Promise<void> {
  const k = schluessel(typ, id)
  if (laufend.has(k)) return
  laufend.add(k)
  try {
    while (warteschlange.has(k)) {
      const w = warteschlange.get(k)!
      warteschlange.delete(k)
      try {
        const { dokument } = await api<{ dokument: Dok<unknown> }>('/api/cockpit/daten', {
          method: 'PUT',
          body: JSON.stringify({ typ, id, daten: w.daten, version: versionen.get(k) ?? 0 }),
        })
        versionen.set(k, dokument.version)
        melden('gespeichert', { typ, id, wer: dokument.aktualisiertVon })
        w.erfuellen.forEach((f) => f())
      } catch (e) {
        const err = e as Error & { aktuell?: Dok<unknown> }
        if (err.message === 'konflikt') melden('konflikt', { typ, id, wer: err.aktuell?.aktualisiertVon, am: err.aktuell?.aktualisiertAm })
        else melden('fehler', err.message)
        w.ablehnen.forEach((f) => f(e))
      }
    }
  } finally {
    laufend.delete(k)
  }
}

/** Speichert (in Warteschlange je Dokument). Mehrere schnelle Aufrufe werden zusammengefasst. */
export function dokSpeichern(typ: string, id: string, daten: unknown): Promise<void> {
  const k = schluessel(typ, id)
  return new Promise<void>((erfuellen, ablehnen) => {
    const alt = warteschlange.get(k)
    if (alt) {
      alt.daten = daten
      alt.erfuellen.push(erfuellen)
      alt.ablehnen.push(ablehnen)
    } else {
      warteschlange.set(k, { daten, erfuellen: [erfuellen], ablehnen: [ablehnen] })
    }
    void abarbeiten(typ, id)
  })
}

export async function dokLoeschen(typ: string, id: string): Promise<void> {
  await api('/api/cockpit/daten?' + new URLSearchParams({ typ, id }), { method: 'DELETE' })
  versionen.delete(schluessel(typ, id))
}

// ------------------------------------------------------------------ Kampagnen & Spieltage

export const kampagneSpeichern = (k: Kampagne) => dokSpeichern('kampagne', k.id, { ...k, aktualisiertAm: Date.now() })
export const kampagneLaden = (id: string) => dokLaden<Kampagne>('kampagne', id)
export async function kampagneFuerSpiel(spielId: string): Promise<Kampagne[]> {
  const l = await dokListe<Kampagne>('kampagne', { feld: 'spielId', wert: spielId })
  return l.sort((a, b) => b.aktualisiertAm - a.aktualisiertAm)
}
export async function alleKampagnen(): Promise<Kampagne[]> {
  const l = await dokListe<Kampagne>('kampagne')
  return l.sort((a, b) => b.aktualisiertAm - a.aktualisiertAm)
}
export async function kampagneLoeschen(id: string): Promise<void> {
  for (const s of await spieltageLaden(id)) await dokLoeschen('spieltag', s.id)
  await dokLoeschen('kampagne', id)
}

export const spieltagSpeichern = (s: Spieltag) => dokSpeichern('spieltag', s.id, { ...s, aktualisiertAm: Date.now() })
export async function spieltageLaden(kampagneId: string): Promise<Spieltag[]> {
  const l = await dokListe<Spieltag>('spieltag', { feld: 'kampagneId', wert: kampagneId })
  return l.sort((a, b) => a.datum.localeCompare(b.datum))
}
export const spieltagLaden = (id: string) => dokLaden<Spieltag>('spieltag', id)
export const spieltagLoeschen = (id: string) => dokLoeschen('spieltag', id)

// ------------------------------------------------------------------ Vorlagen

export const cockpitVorlageSpeichern = (v: CockpitVorlage) => dokSpeichern('cockpitVorlage', v.id, v)
export async function cockpitVorlagenLaden(): Promise<CockpitVorlage[]> {
  const l = await dokListe<CockpitVorlage>('cockpitVorlage')
  return l.sort((a, b) => b.erstelltAm - a.erstelltAm)
}
export const cockpitVorlageLaden = (id: string) => dokLaden<CockpitVorlage>('cockpitVorlage', id)
export const cockpitVorlageLoeschen = (id: string) => dokLoeschen('cockpitVorlage', id)

// ------------------------------------------------------------------ Gewinner (Serien-Modus + Cockpit)

export async function serienGewinnerLaden(spielId: string, monat: string): Promise<SerienGewinner[]> {
  const l = await dokListe<SerienGewinner>('serienGewinner', { feld: 'spielId', wert: spielId })
  return l.filter((g) => g.monat === monat).sort((a, b) => a.tag - b.tag || a.erstelltAm - b.erstelltAm)
}
export const serienGewinnerSpeichern = (g: SerienGewinner) => dokSpeichern('serienGewinner', g.id, g)
export const serienGewinnerLoeschen = (id: string) => dokLoeschen('serienGewinner', id)

// ------------------------------------------------------------------ Dateien (Fotos)

const assetCache = new Map<string, string>()

/** Lädt eine Datei hoch, liefert den SHA-256-Hash. */
export async function assetSpeichern(blob: Blob): Promise<string> {
  const r = await fetch('/api/cockpit/assets', { method: 'PUT', body: blob, headers: { 'content-type': blob.type || 'application/octet-stream' } })
  const j = (await r.json().catch(() => ({}))) as { hash?: string; fehler?: string }
  if (!r.ok || !j.hash) {
    melden('fehler', j.fehler ?? `Hochladen fehlgeschlagen (HTTP ${r.status})`)
    throw new Error(j.fehler ?? `HTTP ${r.status}`)
  }
  return j.hash
}

/** URL zum direkten Anzeigen (<img src>). */
export const assetUrl = (hash: string) => `/api/cockpit/assets?h=${encodeURIComponent(hash)}`

/** Datei als data:-URL (für Anzeigen-HTML in iframes und Exporte). Fällt auf alte Browser-Daten zurück. */
export async function assetAlsDataUrl(hash: string): Promise<string | undefined> {
  if (assetCache.has(hash)) return assetCache.get(hash)
  let blob: Blob | undefined
  try {
    const r = await fetch(assetUrl(hash))
    if (r.ok) blob = await r.blob()
  } catch { /* weiter mit Altdaten */ }
  if (!blob) {
    try {
      const { assetLaden } = await import('../db')
      blob = (await assetLaden(hash))?.blob
    } catch { /* nichts */ }
  }
  if (!blob) return undefined
  const url = await new Promise<string>((ok, nein) => {
    const fr = new FileReader()
    fr.onload = () => ok(String(fr.result))
    fr.onerror = () => nein(fr.error)
    fr.readAsDataURL(blob!)
  })
  assetCache.set(hash, url)
  return url
}

// ------------------------------------------------------------------ Angemeldet als …

export type Ich = {
  benutzer: { email: string; name: string; rolle: 'admin' | 'redaktion' | 'grafik' | 'pruefer' | 'lesen'; modus: 'access' | 'lokal' | 'passwort' }
  rechte: { bearbeiten: boolean; gestalten: boolean; freigeben: boolean; admin: boolean; varianten?: boolean }
  speicher: 'd1' | 'datei' | 'fehlt'
}

let ichCache: Promise<Ich> | null = null
export function ichLaden(neu = false): Promise<Ich> {
  if (!ichCache || neu) {
    ichCache = api<Ich>('/api/cockpit/ich').catch((e) => {
      ichCache = null
      throw e
    })
  }
  return ichCache
}

// ------------------------------------------------------------------ Übernahme alter Browser-Daten

/** Einmalige Übernahme: Cockpit-Daten aus diesem Browser (IndexedDB) auf den Server hochladen. */
export async function browserDatenHochladen(fortschritt?: (text: string) => void): Promise<{ kampagnen: number; spieltage: number; gewinner: number; vorlagen: number; fotos: number }> {
  const { getDb } = await import('../db')
  const db = getDb()
  const zaehler = { kampagnen: 0, spieltage: 0, gewinner: 0, vorlagen: 0, fotos: 0 }
  const fotoHochladen = async (hash?: string): Promise<string | undefined> => {
    if (!hash) return undefined
    const a = await db.assets.get(hash)
    if (!a?.blob) return hash
    const neu = await assetSpeichern(a.blob)
    zaehler.fotos++
    return neu
  }
  for (const k of await db.kampagnen.toArray()) { await kampagneSpeichern(k); zaehler.kampagnen++ }
  fortschritt?.(`${zaehler.kampagnen} Kampagnen …`)
  for (const s of await db.spieltage.toArray()) {
    const gewinner = []
    for (const g of s.gewinner) gewinner.push({ ...g, fotoHash: await fotoHochladen(g.fotoHash) })
    await spieltagSpeichern({ ...s, gewinner })
    zaehler.spieltage++
  }
  fortschritt?.(`${zaehler.spieltage} Spieltage …`)
  for (const g of await db.serienGewinner.toArray()) {
    await serienGewinnerSpeichern({ ...g, fotoHash: await fotoHochladen(g.fotoHash) })
    zaehler.gewinner++
  }
  for (const v of await db.cockpitVorlagen.toArray()) { await cockpitVorlageSpeichern(v); zaehler.vorlagen++ }
  try {
    for (const e of await db.stammdaten.toArray()) await dokSpeichern('stamm', e.id, e)
  } catch { /* Store evtl. nicht vorhanden */ }
  fortschritt?.('fertig')
  return zaehler
}
