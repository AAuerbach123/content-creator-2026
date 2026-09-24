import Dexie, { type Table } from 'dexie'
import type { Asset, Job, Snapshot } from './types'
import { sha256Hex } from './hash'

const DB_NAME = 'ContentCreator2026'
const SNAPSHOT_LIMIT = 5 // Regel 3: letzte 5 Stände pro Job

class ContentCreatorDB extends Dexie {
  jobs!: Table<Job, string>
  assets!: Table<Asset, string>
  snapshots!: Table<Snapshot, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      // Nur indizierte Felder listen; alles andere landet trotzdem im Datensatz.
      jobs: 'id, kanal, status, aktualisiertAm',
      assets: 'hash, mimeType, hinzugefuegtAm',
      snapshots: 'id, jobId, erstelltAm',
    })
  }
}

let instance: ContentCreatorDB | undefined

// Lazy Singleton — Dexie darf nur im Browser instanziiert werden (SSR-Schutz).
export function getDb(): ContentCreatorDB {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB ist nur im Browser verfügbar')
  }
  if (!instance) instance = new ContentCreatorDB()
  return instance
}

// ------------------- Jobs -------------------

export async function jobErstellen(titel: string, ziel = ''): Promise<Job> {
  const now = Date.now()
  const job: Job = {
    id: crypto.randomUUID(),
    titel,
    ziel,
    briefing: [],
    schrittplan: [],
    artefakte: [],
    status: 'briefing',
    erstelltAm: now,
    aktualisiertAm: now,
  }
  await getDb().jobs.add(job)
  await snapshotSchreiben(job)
  return job
}

export async function alleJobsLaden(): Promise<Job[]> {
  return getDb().jobs.orderBy('aktualisiertAm').reverse().toArray()
}

export async function jobSpeichern(job: Job): Promise<void> {
  const aktualisiert: Job = { ...job, aktualisiertAm: Date.now() }
  await getDb().jobs.put(aktualisiert)
  await snapshotSchreiben(aktualisiert)
}

export async function jobLoeschen(id: string): Promise<void> {
  const db = getDb()
  await db.transaction('rw', db.jobs, db.snapshots, async () => {
    await db.jobs.delete(id)
    const snapIds = await db.snapshots.where('jobId').equals(id).primaryKeys()
    if (snapIds.length) await db.snapshots.bulkDelete(snapIds as string[])
  })
}

// ------------------- Assets (contentadressiert, Regel 2) -------------------

// Speichert einen Blob im assets-Store und gibt den SHA-256-Hash zurück.
// Existiert der Inhalt bereits, wird NICHT dupliziert.
export async function assetSpeichern(blob: Blob): Promise<string> {
  const hash = await sha256Hex(blob)
  const existiert = await getDb().assets.get(hash)
  if (!existiert) {
    const asset: Asset = {
      hash,
      mimeType: blob.type || 'application/octet-stream',
      bytes: blob.size,
      blob,
      hinzugefuegtAm: Date.now(),
    }
    await getDb().assets.add(asset)
  }
  return hash
}

export async function assetLaden(hash: string): Promise<Asset | undefined> {
  return getDb().assets.get(hash)
}

// ------------------- Snapshots (Regel 3) -------------------

async function snapshotSchreiben(job: Job): Promise<void> {
  const db = getDb()
  const snap: Snapshot = {
    id: crypto.randomUUID(),
    jobId: job.id,
    erstelltAm: Date.now(),
    jobData: structuredClone(job),
  }
  await db.snapshots.add(snap)

  const alle = await db.snapshots.where('jobId').equals(job.id).sortBy('erstelltAm')
  if (alle.length > SNAPSHOT_LIMIT) {
    const zuLoeschen = alle.slice(0, alle.length - SNAPSHOT_LIMIT).map((s) => s.id)
    await db.snapshots.bulkDelete(zuLoeschen)
  }
}

export async function snapshotsFuerJob(jobId: string): Promise<Snapshot[]> {
  return getDb().snapshots.where('jobId').equals(jobId).sortBy('erstelltAm')
}
