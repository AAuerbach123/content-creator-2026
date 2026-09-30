import Dexie, { type Table } from 'dexie'
import type { Asset, EigeneVorlage, Freigabe, Job, KIAktion, Snapshot } from './types'
import { sha256Hex } from './hash'

const DB_NAME = 'ContentCreator2026'
const SNAPSHOT_LIMIT = 5 // Regel 3: letzte 5 Stände pro Job
const KI_VERLAUF_LIMIT = 500 // Verlaufs-Panel darf nicht unbegrenzt wachsen

class ContentCreatorDB extends Dexie {
  jobs!: Table<Job, string>
  assets!: Table<Asset, string>
  snapshots!: Table<Snapshot, string>
  kiAktionen!: Table<KIAktion, string>
  freigaben!: Table<Freigabe, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      jobs: 'id, kanal, status, aktualisiertAm',
      assets: 'hash, mimeType, hinzugefuegtAm',
      snapshots: 'id, jobId, erstelltAm',
    })
    // Version 2: Verlaufs-Store für KI-Aktionen (Regel 8)
    this.version(2).stores({
      jobs: 'id, kanal, status, aktualisiertAm',
      assets: 'hash, mimeType, hinzugefuegtAm',
      snapshots: 'id, jobId, erstelltAm',
      kiAktionen: 'id, jobId, route, zeitpunkt',
    })
    // Version 3: Korrekturportal-Freigaben
    this.version(3).stores({
      jobs: 'id, kanal, status, aktualisiertAm',
      assets: 'hash, mimeType, hinzugefuegtAm',
      snapshots: 'id, jobId, erstelltAm',
      kiAktionen: 'id, jobId, route, zeitpunkt',
      freigaben: 'id, jobId, artefaktId, erstelltAm',
    })
    // Version 4: Eigene Vorlagen-Bibliothek
    this.version(4).stores({
      jobs: 'id, kanal, status, aktualisiertAm, faelligAm',
      assets: 'hash, mimeType, hinzugefuegtAm',
      snapshots: 'id, jobId, erstelltAm',
      kiAktionen: 'id, jobId, route, zeitpunkt',
      freigaben: 'id, jobId, artefaktId, erstelltAm',
      vorlagen: 'id, name, kanal, erstelltAm',
    })
  }

  vorlagen!: Table<EigeneVorlage, string>
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
    dialog: [],
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

export async function jobLaden(id: string): Promise<Job | undefined> {
  return getDb().jobs.get(id)
}

export async function jobSpeichern(job: Job): Promise<void> {
  const aktualisiert: Job = { ...job, aktualisiertAm: Date.now() }
  await getDb().jobs.put(aktualisiert)
  await snapshotSchreiben(aktualisiert)
}

export async function jobLoeschen(id: string): Promise<void> {
  const db = getDb()
  await db.transaction('rw', db.jobs, db.snapshots, db.kiAktionen, async () => {
    await db.jobs.delete(id)
    const snapIds = await db.snapshots.where('jobId').equals(id).primaryKeys()
    if (snapIds.length) await db.snapshots.bulkDelete(snapIds as string[])
    const aktIds = await db.kiAktionen.where('jobId').equals(id).primaryKeys()
    if (aktIds.length) await db.kiAktionen.bulkDelete(aktIds as string[])
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

export async function assetsFuerJob(jobIds: string[]): Promise<Asset[]> {
  if (!jobIds.length) return []
  return getDb().assets.bulkGet(jobIds).then((a) => a.filter(Boolean) as Asset[])
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

// ------------------- KI-Verlauf (Regel 8) -------------------

export async function aktionSpeichern(aktion: KIAktion): Promise<void> {
  const db = getDb()
  await db.kiAktionen.add(aktion)
  const anzahl = await db.kiAktionen.count()
  if (anzahl > KI_VERLAUF_LIMIT) {
    const alte = await db.kiAktionen.orderBy('zeitpunkt').limit(anzahl - KI_VERLAUF_LIMIT).primaryKeys()
    await db.kiAktionen.bulkDelete(alte as string[])
  }
}

export async function aktionenFuerJob(jobId: string): Promise<KIAktion[]> {
  return getDb().kiAktionen.where('jobId').equals(jobId).sortBy('zeitpunkt')
}

export async function alleAktionen(limit = 100): Promise<KIAktion[]> {
  return getDb().kiAktionen.orderBy('zeitpunkt').reverse().limit(limit).toArray()
}

// ------------------- Korrekturportal-Freigaben -------------------

export async function freigabeErstellen(jobId: string, artefaktId: string, jobTitel: string): Promise<Freigabe> {
  const freigabe: Freigabe = {
    id: crypto.randomUUID(),
    jobId,
    artefaktId,
    jobTitel,
    erstelltAm: Date.now(),
    pins: [],
  }
  await getDb().freigaben.add(freigabe)
  return freigabe
}

export async function freigabeLaden(id: string): Promise<Freigabe | undefined> {
  return getDb().freigaben.get(id)
}

export async function freigabeSpeichern(freigabe: Freigabe): Promise<void> {
  await getDb().freigaben.put(freigabe)
}

export async function freigabenFuerJob(jobId: string): Promise<Freigabe[]> {
  return getDb().freigaben.where('jobId').equals(jobId).sortBy('erstelltAm')
}

export async function freigabeLoeschen(id: string): Promise<void> {
  await getDb().freigaben.delete(id)
}

// ------------------- Eigene Vorlagen -------------------

export async function vorlageSpeichern(v: EigeneVorlage): Promise<void> {
  await getDb().vorlagen.put(v)
}

export async function vorlagenLaden(): Promise<EigeneVorlage[]> {
  return getDb().vorlagen.orderBy('erstelltAm').reverse().toArray()
}

export async function vorlageLoeschen(id: string): Promise<void> {
  await getDb().vorlagen.delete(id)
}
