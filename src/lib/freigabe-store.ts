// Server-Store für Korrekturportal-Freigaben.
// Zwei Modi:
//  - Cloudflare KV (Binding `FREIGABEN`) — im Deployment und `wrangler dev`.
//  - Datei-Fallback (`.freigaben/<token>.json`) — für `npm run dev` auf dem Mac.
//
// Der Kunde bekommt einen Token-Link `/review/<token>`. Der Server hält:
//  - jobTitel, artefaktId
//  - Artefakt-Snapshot (JSON) und die referenzierten Assets als Base64.
//  - Pins (Änderungswünsche) mit Antworten und Status.

import fs from 'node:fs/promises'
import path from 'node:path'
import type { Artefakt, Korrekturpin } from './types'

export type ServerAsset = { mimeType: string; base64: string }

export type ServerFreigabe = {
  id: string
  jobId: string
  jobTitel: string
  artefaktId: string
  artefakt: Artefakt
  assets: Record<string, ServerAsset>
  pins: Korrekturpin[]
  erstelltAm: number
  aktualisiertAm: number
}

type KVLike = {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

async function tryGetKv(): Promise<KVLike | undefined> {
  try {
    const mod = (await import('@opennextjs/cloudflare')) as unknown as {
      getCloudflareContext?: (opts?: { async?: boolean }) => unknown
    }
    const fn = mod.getCloudflareContext
    if (!fn) return undefined
    let ctx: { env?: Record<string, unknown> } | undefined
    try {
      const res = fn({ async: true }) as Promise<{ env?: Record<string, unknown> }> | { env?: Record<string, unknown> }
      ctx = res && typeof (res as Promise<unknown>).then === 'function' ? await (res as Promise<{ env?: Record<string, unknown> }>) : (res as { env?: Record<string, unknown> })
    } catch {
      return undefined
    }
    const bindung = ctx?.env?.FREIGABEN as KVLike | undefined
    return bindung && typeof bindung.get === 'function' ? bindung : undefined
  } catch {
    return undefined
  }
}

function devDir(): string {
  return path.join(process.cwd(), '.freigaben')
}

async function dateiSpeichern(f: ServerFreigabe): Promise<void> {
  const dir = devDir()
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, `${f.id}.json`), JSON.stringify(f))
}

async function dateiLaden(id: string): Promise<ServerFreigabe | undefined> {
  try {
    const txt = await fs.readFile(path.join(devDir(), `${id}.json`), 'utf-8')
    return JSON.parse(txt) as ServerFreigabe
  } catch {
    return undefined
  }
}

async function dateiLoeschen(id: string): Promise<void> {
  try {
    await fs.rm(path.join(devDir(), `${id}.json`))
  } catch {}
}

export async function freigabeSpeichern(f: ServerFreigabe): Promise<void> {
  const kv = await tryGetKv()
  if (kv) {
    await kv.put(f.id, JSON.stringify(f))
    return
  }
  await dateiSpeichern(f)
}

export async function freigabeLaden(id: string): Promise<ServerFreigabe | undefined> {
  const kv = await tryGetKv()
  if (kv) {
    const txt = await kv.get(id)
    return txt ? (JSON.parse(txt) as ServerFreigabe) : undefined
  }
  return dateiLaden(id)
}

export async function freigabeLoeschen(id: string): Promise<void> {
  const kv = await tryGetKv()
  if (kv) {
    await kv.delete(id)
    return
  }
  await dateiLoeschen(id)
}

export async function speicherModus(): Promise<'kv' | 'datei'> {
  return (await tryGetKv()) ? 'kv' : 'datei'
}
