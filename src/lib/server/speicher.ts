// Zentraler Server-Speicher des Cockpits (LOOP-Cockpit-Ausbau-Team.md, Phase 1).
//
// Drei Modi:
//  - 'd1'    online: Cloudflare D1 (Binding COCKPIT_DB) für Dokumente + Protokoll,
//                    Cloudflare KV (Binding COCKPIT_ASSETS) für Fotos/Dateien (Schlüssel = SHA-256).
//  - 'datei' lokal (`npm run dev` ohne Cloudflare): JSON-Dateien unter `.cockpit-daten/`.
//  - 'fehlt' online, aber D1 noch nicht eingerichtet → klare Fehlermeldung statt stiller Datei-Ablage.
//
// Optimistisches Sperren: jedes Dokument hat `version`. Speichern mit veralteter Version → Konflikt.

import fs from 'node:fs/promises'
import path from 'node:path'

export type Dokument<T = unknown> = {
  typ: string
  id: string
  daten: T
  version: number
  aktualisiertAm: number
  aktualisiertVon: string
}

export type ProtokollEintrag = {
  id: string
  zeit: number
  wer: string
  typ: string
  dokId: string
  aktion: 'angelegt' | 'geaendert' | 'geloescht' | 'freigegeben' | 'portal' | 'monday' | 'anmeldung' | 'sonstiges'
  zusammenfassung: string
}

export class KonfliktFehler extends Error {
  constructor(public aktuell: Dokument | null) {
    super('Konflikt: Das Dokument wurde inzwischen geändert.')
  }
}

// ------------------------------------------------------------------ Bindings

type D1Ergebnis = { results?: unknown[]; meta?: { changes?: number } }
type D1Stmt = {
  bind(...werte: unknown[]): D1Stmt
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  run(): Promise<D1Ergebnis>
}
type D1Like = { prepare(sql: string): D1Stmt }
type KVLike = {
  get(key: string, opts: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>
  getWithMetadata?(key: string, opts: { type: 'arrayBuffer' }): Promise<{ value: ArrayBuffer | null; metadata: unknown }>
  put(key: string, value: ArrayBuffer | string, opts?: { metadata?: unknown }): Promise<void>
}

type Umgebung = { modus: 'd1' | 'datei' | 'fehlt'; db?: D1Like; kv?: KVLike }

let umgebungCache: Umgebung | null = null

export async function umgebung(): Promise<Umgebung> {
  if (umgebungCache) return umgebungCache
  // Lokal (`npm run dev` auf dem Mac) immer Datei-Modus – schnell, ohne wrangler-Nachbildung.
  const imWorker = typeof navigator !== 'undefined' && (navigator as { userAgent?: string }).userAgent === 'Cloudflare-Workers'
  if (!imWorker) {
    umgebungCache = { modus: 'datei' }
    return umgebungCache
  }
  let env: Record<string, unknown> | undefined
  try {
    const mod = (await import('@opennextjs/cloudflare')) as unknown as { getCloudflareContext?: (o?: { async?: boolean }) => unknown }
    if (mod.getCloudflareContext) {
      const res = mod.getCloudflareContext({ async: true }) as Promise<{ env?: Record<string, unknown> }> | { env?: Record<string, unknown> }
      const ctx = res && typeof (res as Promise<unknown>).then === 'function' ? await (res as Promise<{ env?: Record<string, unknown> }>) : (res as { env?: Record<string, unknown> })
      env = ctx?.env
    }
  } catch {
    env = undefined
  }
  const db = env?.COCKPIT_DB as D1Like | undefined
  const kv = env?.COCKPIT_ASSETS as KVLike | undefined
  if (db && typeof db.prepare === 'function') {
    await tabellenAnlegen(db)
    umgebungCache = { modus: 'd1', db, kv }
  } else {
    // nicht cachen: nach der Einrichtung soll es ohne Neustart funktionieren
    return { modus: 'fehlt' }
  }
  return umgebungCache
}

/** Tabellen beim ersten Zugriff anlegen (idempotent) – dann braucht die Einrichtung keine Migration. */
async function tabellenAnlegen(db: D1Like): Promise<void> {
  const sql = [
    'CREATE TABLE IF NOT EXISTS dokumente (typ TEXT NOT NULL, id TEXT NOT NULL, daten TEXT NOT NULL, version INTEGER NOT NULL, aktualisiert_am INTEGER NOT NULL, aktualisiert_von TEXT, PRIMARY KEY (typ, id))',
    'CREATE TABLE IF NOT EXISTS protokoll (id TEXT PRIMARY KEY, zeit INTEGER NOT NULL, wer TEXT, typ TEXT, dok_id TEXT, aktion TEXT, zusammenfassung TEXT)',
    'CREATE INDEX IF NOT EXISTS protokoll_zeit ON protokoll (zeit)',
  ]
  for (const s of sql) await db.prepare(s).run()
}

function fehltFehler(): Error {
  return new Error('Der zentrale Speicher ist online noch nicht eingerichtet (D1-Datenbank COCKPIT_DB fehlt). Bitte „Cockpit-Server einrichten.command“ ausführen.')
}

// ------------------------------------------------------------------ Datei-Modus (lokal)

const WURZEL = () => path.join(process.cwd(), '.cockpit-daten')
const sicher = (s: string) => {
  if (!/^[A-Za-z0-9._:@+-]{1,200}$/.test(s) || s.includes('..')) throw new Error('Ungültige ID: ' + s)
  return s.replace(/:/g, '__')
}
const dateiPfad = (typ: string, id: string) => path.join(WURZEL(), sicher(typ), sicher(id) + '.json')

async function dateiLaden(typ: string, id: string): Promise<Dokument | null> {
  try {
    return JSON.parse(await fs.readFile(dateiPfad(typ, id), 'utf8')) as Dokument
  } catch {
    return null
  }
}

async function dateiListe(typ: string): Promise<Dokument[]> {
  const dir = path.join(WURZEL(), sicher(typ))
  let namen: string[] = []
  try { namen = await fs.readdir(dir) } catch { return [] }
  const out: Dokument[] = []
  for (const n of namen) {
    if (!n.endsWith('.json')) continue
    try { out.push(JSON.parse(await fs.readFile(path.join(dir, n), 'utf8')) as Dokument) } catch { /* defekte Datei überspringen */ }
  }
  return out
}

// ------------------------------------------------------------------ Dokumente

const ausZeile = (r: Record<string, unknown>): Dokument => ({
  typ: String(r.typ),
  id: String(r.id),
  daten: JSON.parse(String(r.daten)),
  version: Number(r.version),
  aktualisiertAm: Number(r.aktualisiert_am),
  aktualisiertVon: String(r.aktualisiert_von ?? ''),
})

export async function dokLaden(typ: string, id: string): Promise<Dokument | null> {
  const u = await umgebung()
  if (u.modus === 'fehlt') throw fehltFehler()
  if (u.modus === 'datei') return dateiLaden(typ, id)
  const r = await u.db!.prepare('SELECT * FROM dokumente WHERE typ = ? AND id = ?').bind(typ, id).first<Record<string, unknown>>()
  return r ? ausZeile(r) : null
}

/** Liste eines Typs; optional nach einem Feld der Daten gefiltert (z. B. kampagneId). */
export async function dokListe(typ: string, filter?: { feld: string; wert: string }): Promise<Dokument[]> {
  const u = await umgebung()
  if (u.modus === 'fehlt') throw fehltFehler()
  if (filter && !/^[A-Za-z0-9_]{1,40}$/.test(filter.feld)) throw new Error('Ungültiges Filterfeld')
  if (u.modus === 'datei') {
    const alle = await dateiListe(typ)
    return filter ? alle.filter((d) => String((d.daten as Record<string, unknown>)?.[filter.feld] ?? '') === filter.wert) : alle
  }
  const stmt = filter
    ? u.db!.prepare(`SELECT * FROM dokumente WHERE typ = ? AND json_extract(daten, '$.${filter.feld}') = ?`).bind(typ, filter.wert)
    : u.db!.prepare('SELECT * FROM dokumente WHERE typ = ?').bind(typ)
  const { results } = await stmt.all<Record<string, unknown>>()
  return results.map(ausZeile)
}

/**
 * Speichert ein Dokument.
 * `version` = die Version, die der Client zuletzt gesehen hat (0 = neu). `null` = ohne Prüfung überschreiben (nur Server-intern).
 */
export async function dokSpeichern(typ: string, id: string, daten: unknown, version: number | null, wer: string): Promise<Dokument> {
  const u = await umgebung()
  if (u.modus === 'fehlt') throw fehltFehler()
  const jetzt = Date.now()
  const alt = await dokLaden(typ, id)
  if (version !== null && alt && alt.version !== version) throw new KonfliktFehler(alt)
  if (version !== null && !alt && version !== 0) throw new KonfliktFehler(null)
  const neu: Dokument = { typ, id, daten, version: (alt?.version ?? 0) + 1, aktualisiertAm: jetzt, aktualisiertVon: wer }

  if (u.modus === 'datei') {
    await fs.mkdir(path.dirname(dateiPfad(typ, id)), { recursive: true })
    await fs.writeFile(dateiPfad(typ, id), JSON.stringify(neu))
    return neu
  }
  const json = JSON.stringify(daten)
  if (alt) {
    const r = await u.db!
      .prepare('UPDATE dokumente SET daten = ?, version = ?, aktualisiert_am = ?, aktualisiert_von = ? WHERE typ = ? AND id = ? AND version = ?')
      .bind(json, neu.version, jetzt, wer, typ, id, alt.version)
      .run()
    if (!r.meta?.changes) throw new KonfliktFehler(await dokLaden(typ, id))
  } else {
    try {
      await u.db!
        .prepare('INSERT INTO dokumente (typ, id, daten, version, aktualisiert_am, aktualisiert_von) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(typ, id, json, neu.version, jetzt, wer)
        .run()
    } catch {
      throw new KonfliktFehler(await dokLaden(typ, id))
    }
  }
  return neu
}

export async function dokLoeschen(typ: string, id: string): Promise<void> {
  const u = await umgebung()
  if (u.modus === 'fehlt') throw fehltFehler()
  if (u.modus === 'datei') {
    try { await fs.rename(dateiPfad(typ, id), dateiPfad(typ, id) + '.geloescht') } catch { /* schon weg */ }
    return
  }
  await u.db!.prepare('DELETE FROM dokumente WHERE typ = ? AND id = ?').bind(typ, id).run()
}

// ------------------------------------------------------------------ Protokoll

export async function protokollieren(e: Omit<ProtokollEintrag, 'id' | 'zeit'>): Promise<void> {
  const u = await umgebung()
  if (u.modus === 'fehlt') return
  const eintrag: ProtokollEintrag = { id: crypto.randomUUID(), zeit: Date.now(), ...e, zusammenfassung: e.zusammenfassung.slice(0, 300) }
  try {
    if (u.modus === 'datei') {
      await fs.mkdir(WURZEL(), { recursive: true })
      await fs.appendFile(path.join(WURZEL(), '_protokoll.jsonl'), JSON.stringify(eintrag) + '\n')
      return
    }
    await u.db!
      .prepare('INSERT INTO protokoll (id, zeit, wer, typ, dok_id, aktion, zusammenfassung) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(eintrag.id, eintrag.zeit, eintrag.wer, eintrag.typ, eintrag.dokId, eintrag.aktion, eintrag.zusammenfassung)
      .run()
  } catch {
    // Protokoll darf die eigentliche Aktion nie verhindern
  }
}

export async function protokollListe(opt: { limit?: number; typ?: string; dokId?: string } = {}): Promise<ProtokollEintrag[]> {
  const u = await umgebung()
  if (u.modus === 'fehlt') throw fehltFehler()
  const limit = Math.min(Math.max(opt.limit ?? 200, 1), 1000)
  if (u.modus === 'datei') {
    let text = ''
    try { text = await fs.readFile(path.join(WURZEL(), '_protokoll.jsonl'), 'utf8') } catch { return [] }
    return text
      .split('\n')
      .filter(Boolean)
      .map((z) => JSON.parse(z) as ProtokollEintrag)
      .filter((e) => (!opt.typ || e.typ === opt.typ) && (!opt.dokId || e.dokId === opt.dokId))
      .sort((a, b) => b.zeit - a.zeit)
      .slice(0, limit)
  }
  let sql = 'SELECT * FROM protokoll'
  const werte: unknown[] = []
  const bed: string[] = []
  if (opt.typ) { bed.push('typ = ?'); werte.push(opt.typ) }
  if (opt.dokId) { bed.push('dok_id = ?'); werte.push(opt.dokId) }
  if (bed.length) sql += ' WHERE ' + bed.join(' AND ')
  sql += ' ORDER BY zeit DESC LIMIT ?'
  werte.push(limit)
  const { results } = await u.db!.prepare(sql).bind(...werte).all<Record<string, unknown>>()
  return results.map((r) => ({
    id: String(r.id), zeit: Number(r.zeit), wer: String(r.wer), typ: String(r.typ), dokId: String(r.dok_id),
    aktion: String(r.aktion) as ProtokollEintrag['aktion'], zusammenfassung: String(r.zusammenfassung),
  }))
}

// ------------------------------------------------------------------ Dateien (Fotos, Anzeigen, Excel)

export const ASSET_MAX = 12 * 1024 * 1024

async function sha256(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function assetAblegen(buf: ArrayBuffer, mime: string): Promise<string> {
  if (buf.byteLength > ASSET_MAX) throw new Error(`Datei zu gross (max. ${ASSET_MAX / 1024 / 1024} MB).`)
  const u = await umgebung()
  const hash = await sha256(buf)
  if (u.modus === 'fehlt') throw fehltFehler()
  if (u.modus === 'datei') {
    const dir = path.join(WURZEL(), '_assets')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, hash), Buffer.from(buf))
    await fs.writeFile(path.join(dir, hash + '.mime'), mime)
    return hash
  }
  if (!u.kv) throw new Error('Datei-Speicher (KV COCKPIT_ASSETS) fehlt. Bitte „Cockpit-Server einrichten.command“ ausführen.')
  await u.kv.put('asset:' + hash, buf, { metadata: { mime } })
  return hash
}

export async function assetHolen(hash: string): Promise<{ daten: ArrayBuffer; mime: string } | null> {
  if (!/^[0-9a-f]{64}$/.test(hash)) return null
  const u = await umgebung()
  if (u.modus === 'fehlt') throw fehltFehler()
  if (u.modus === 'datei') {
    try {
      const dir = path.join(WURZEL(), '_assets')
      const b = await fs.readFile(path.join(dir, hash))
      let mime = 'application/octet-stream'
      try { mime = (await fs.readFile(path.join(dir, hash + '.mime'), 'utf8')).trim() } catch { /* Standard */ }
      return { daten: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, mime }
    } catch {
      return null
    }
  }
  if (!u.kv) return null
  if (u.kv.getWithMetadata) {
    const r = await u.kv.getWithMetadata('asset:' + hash, { type: 'arrayBuffer' })
    if (!r.value) return null
    return { daten: r.value, mime: String((r.metadata as { mime?: string } | null)?.mime ?? 'application/octet-stream') }
  }
  const v = await u.kv.get('asset:' + hash, { type: 'arrayBuffer' })
  return v ? { daten: v, mime: 'application/octet-stream' } : null
}
