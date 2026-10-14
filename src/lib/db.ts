import Dexie, { type Table } from 'dexie'
import type { Asset, EigeneVorlage, Freigabe, Job, KIAktion, Snapshot } from './types'
import { sha256Hex } from './hash'
import type { GespeicherteVariante } from './serie/serie-ki'
import type { CockpitVorlage, Kampagne, Spieltag } from './cockpit/typen'
import type { StammEintrag } from './cockpit/zeitungen-stamm'

/** Echte Gewinnerin / echter Gewinner im Serien-Modus. Foto liegt im Assets-Store (Hash), nie im Datensatz. */
export type SerienGewinner = {
  id: string
  spielId: string
  monat: string
  /** Spieltag, in dessen Anzeige die Person erscheint */
  tag: number
  /** Zeitungs-IDs, in deren Anzeige die Person erscheint; leer = alle Zeitungen */
  zeitungen: string[]
  name: string
  ort: string
  betrag: string
  text: string
  fotoHash?: string
  erstelltAm: number
}

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
    // Version 5: Serien-Modus – übernommene Umsetzungsvarianten je Spiel (Titel/Unterzeile/Schritte/Hinweis)
    this.version(5).stores({
      jobs: 'id, kanal, status, aktualisiertAm, faelligAm',
      assets: 'hash, mimeType, hinzugefuegtAm',
      snapshots: 'id, jobId, erstelltAm',
      kiAktionen: 'id, jobId, route, zeitpunkt',
      freigaben: 'id, jobId, artefaktId, erstelltAm',
      vorlagen: 'id, name, kanal, erstelltAm',
      serienVarianten: 'id, spielId, erstelltAm',
    })
    // Version 6: Serien-Modus – echte Gewinnerinnen/Gewinner (Foto als Asset-Hash, Regel 2)
    this.version(6).stores({
      jobs: 'id, kanal, status, aktualisiertAm, faelligAm',
      assets: 'hash, mimeType, hinzugefuegtAm',
      snapshots: 'id, jobId, erstelltAm',
      kiAktionen: 'id, jobId, route, zeitpunkt',
      freigaben: 'id, jobId, artefaktId, erstelltAm',
      vorlagen: 'id, name, kanal, erstelltAm',
      serienVarianten: 'id, spielId, erstelltAm',
      serienGewinner: 'id, [spielId+monat], tag, erstelltAm',
    })
    // Version 7: Cockpit 2027 – Kampagnen, Spieltage, Cockpit-Vorlagen (Phase 2 LOOP-Cockpit-2027.md)
    this.version(7).stores({
      jobs: 'id, kanal, status, aktualisiertAm, faelligAm',
      assets: 'hash, mimeType, hinzugefuegtAm',
      snapshots: 'id, jobId, erstelltAm',
      kiAktionen: 'id, jobId, route, zeitpunkt',
      freigaben: 'id, jobId, artefaktId, erstelltAm',
      vorlagen: 'id, name, kanal, erstelltAm',
      serienVarianten: 'id, spielId, erstelltAm',
      serienGewinner: 'id, [spielId+monat], tag, erstelltAm',
      kampagnen: 'id, spielId, monat, aktualisiertAm',
      spieltage: 'id, kampagneId, datum, status',
      cockpitVorlagen: 'id, name, erstelltAm',
    })
    // Version 8: Stammdaten (Zeitungen & Rufnummern aus Upload; Original-JSON bleibt unverändert)
    this.version(8).stores({
      jobs: 'id, kanal, status, aktualisiertAm, faelligAm',
      assets: 'hash, mimeType, hinzugefuegtAm',
      snapshots: 'id, jobId, erstelltAm',
      kiAktionen: 'id, jobId, route, zeitpunkt',
      freigaben: 'id, jobId, artefaktId, erstelltAm',
      vorlagen: 'id, name, kanal, erstelltAm',
      serienVarianten: 'id, spielId, erstelltAm',
      serienGewinner: 'id, [spielId+monat], tag, erstelltAm',
      kampagnen: 'id, spielId, monat, aktualisiertAm',
      spieltage: 'id, kampagneId, datum, status',
      cockpitVorlagen: 'id, name, erstelltAm',
      stammdaten: 'id',
    })
  }

  vorlagen!: Table<EigeneVorlage, string>
  serienVarianten!: Table<GespeicherteVariante, string>
  serienGewinner!: Table<SerienGewinner, string>
  kampagnen!: Table<Kampagne, string>
  spieltage!: Table<Spieltag, string>
  cockpitVorlagen!: Table<CockpitVorlage, string>
  stammdaten!: Table<StammEintrag, string>
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
  await db.transaction('rw', db.jobs, db.snapshots, db.kiAktionen, db.freigaben, async () => {
    await db.jobs.delete(id)
    const snapIds = await db.snapshots.where('jobId').equals(id).primaryKeys()
    if (snapIds.length) await db.snapshots.bulkDelete(snapIds as string[])
    const aktIds = await db.kiAktionen.where('jobId').equals(id).primaryKeys()
    if (aktIds.length) await db.kiAktionen.bulkDelete(aktIds as string[])
    const freiIds = await db.freigaben.where('jobId').equals(id).primaryKeys()
    if (freiIds.length) await db.freigaben.bulkDelete(freiIds as string[])
  })
  // Assets werden von mehreren Jobs geteilt (contentadressiert, Regel 2) —
  // deshalb NICHT hier löschen. `assetsAufraeumen()` sammelt später verwaiste
  // Hashes ein.
}

// Aufräumfunktion: entfernt Assets, deren Hash in keinem Job/Artefakt/Snapshot
// mehr referenziert wird. Liefert Anzahl gelöschter Assets zurück.
export async function assetsAufraeumen(): Promise<{ geloescht: number; behalten: number }> {
  const db = getDb()
  const [jobs, snaps, vorlagen, gewinner] = await Promise.all([
    db.jobs.toArray(),
    db.snapshots.toArray(),
    db.vorlagen.toArray(),
    db.serienGewinner.toArray(),
  ])
  const gebraucht = new Set<string>()
  // Gewinnerfotos des Serien-Modus sind ebenfalls Assets → nie als verwaist löschen
  for (const g of gewinner) if (g.fotoHash) gebraucht.add(g.fotoHash)
  const sammle = (job: Job | undefined) => {
    if (!job) return
    for (const a of job.artefakte || []) {
      for (const e of a.ebenen || []) {
        if (e.assetHash) gebraucht.add(e.assetHash)
        const p = e.eigenschaften as Record<string, unknown> | undefined
        if (p && typeof p === 'object') {
          for (const k of ['assetHash', 'logoAssetHash', 'bildAssetHash']) {
            const v = (p as Record<string, unknown>)[k]
            if (typeof v === 'string') gebraucht.add(v)
          }
        }
      }
    }
    if (job.videoStoryboard) {
      const sb = job.videoStoryboard as unknown as { szenen?: Array<Record<string, unknown>>; voiceover?: { assetHash?: string } }
      for (const s of sb.szenen || []) {
        for (const k of ['logoAssetHash', 'bildAssetHash']) {
          const v = s[k]
          if (typeof v === 'string') gebraucht.add(v)
        }
        const arr = s.bildAssetHashes
        if (Array.isArray(arr)) for (const h of arr) if (typeof h === 'string') gebraucht.add(h)
      }
      if (sb.voiceover?.assetHash) gebraucht.add(sb.voiceover.assetHash)
    }
  }
  for (const j of jobs) sammle(j)
  for (const s of snaps) sammle(s.jobData as Job)
  for (const v of vorlagen) {
    for (const e of v.ebenen || []) {
      if (e.assetHash) gebraucht.add(e.assetHash)
    }
  }
  const alleAssets = await db.assets.toArray()
  const toDelete = alleAssets.filter((a) => !gebraucht.has(a.hash)).map((a) => a.hash)
  if (toDelete.length) await db.assets.bulkDelete(toDelete)
  return { geloescht: toDelete.length, behalten: alleAssets.length - toDelete.length }
}

// Quota-Check: prüft den Browser-Speicher-Rest (per Storage-Manager, falls
// verfügbar). Für Warnbanner im UI.
export async function speicherStatus(): Promise<{ verfuegbarMb?: number; genutztMb?: number; grenzeMb?: number }> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return {}
    const e = await navigator.storage.estimate()
    const genutzt = e.usage ?? 0
    const grenze = e.quota ?? 0
    return {
      genutztMb: Math.round(genutzt / 1024 / 1024),
      grenzeMb: Math.round(grenze / 1024 / 1024),
      verfuegbarMb: Math.max(0, Math.round((grenze - genutzt) / 1024 / 1024)),
    }
  } catch {
    return {}
  }
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

// ------------------- Serien-Modus: gespeicherte Umsetzungsvarianten -------------------

export async function serienVarianteSpeichern(v: GespeicherteVariante): Promise<void> {
  await getDb().serienVarianten.put(v)
}

export async function serienVariantenLaden(spielId: string): Promise<GespeicherteVariante[]> {
  const liste = await getDb().serienVarianten.where('spielId').equals(spielId).toArray()
  return liste.sort((a, b) => b.erstelltAm - a.erstelltAm)
}

export async function serienVarianteLoeschen(id: string): Promise<void> {
  await getDb().serienVarianten.delete(id)
}

// ------------------- Serien-Gewinner -------------------

export async function serienGewinnerLaden(spielId: string, monat: string): Promise<SerienGewinner[]> {
  const liste = await getDb().serienGewinner.where('[spielId+monat]').equals([spielId, monat]).toArray()
  return liste.sort((a, b) => a.tag - b.tag || a.erstelltAm - b.erstelltAm)
}

export async function serienGewinnerSpeichern(g: SerienGewinner): Promise<void> {
  await getDb().serienGewinner.put(g)
}

export async function serienGewinnerLoeschen(id: string): Promise<void> {
  await getDb().serienGewinner.delete(id)
}

// ------------------- Cockpit 2027: Kampagnen -------------------

export async function kampagneSpeichern(k: Kampagne): Promise<void> {
  const aktuell: Kampagne = { ...k, aktualisiertAm: Date.now() }
  await getDb().kampagnen.put(aktuell)
}

export async function kampagneLaden(id: string): Promise<Kampagne | undefined> {
  return getDb().kampagnen.get(id)
}

export async function kampagneFuerSpiel(spielId: string): Promise<Kampagne[]> {
  const liste = await getDb().kampagnen.where('spielId').equals(spielId).toArray()
  return liste.sort((a, b) => b.aktualisiertAm - a.aktualisiertAm)
}

export async function alleKampagnen(): Promise<Kampagne[]> {
  return getDb().kampagnen.orderBy('aktualisiertAm').reverse().toArray()
}

export async function kampagneLoeschen(id: string): Promise<void> {
  const db = getDb()
  await db.transaction('rw', db.kampagnen, db.spieltage, async () => {
    await db.kampagnen.delete(id)
    const ids = await db.spieltage.where('kampagneId').equals(id).primaryKeys()
    if (ids.length) await db.spieltage.bulkDelete(ids as string[])
  })
}

// ------------------- Cockpit 2027: Spieltage -------------------

export async function spieltagSpeichern(s: Spieltag): Promise<void> {
  const aktuell: Spieltag = { ...s, aktualisiertAm: Date.now() }
  await getDb().spieltage.put(aktuell)
}

export async function spieltageLaden(kampagneId: string): Promise<Spieltag[]> {
  const liste = await getDb().spieltage.where('kampagneId').equals(kampagneId).toArray()
  return liste.sort((a, b) => a.datum.localeCompare(b.datum))
}

export async function spieltagLaden(id: string): Promise<Spieltag | undefined> {
  return getDb().spieltage.get(id)
}

export async function spieltagLoeschen(id: string): Promise<void> {
  await getDb().spieltage.delete(id)
}

// ------------------- Cockpit 2027: Vorlagen (Baustein V) -------------------

export async function cockpitVorlageSpeichern(v: CockpitVorlage): Promise<void> {
  await getDb().cockpitVorlagen.put(v)
}

export async function cockpitVorlagenLaden(): Promise<CockpitVorlage[]> {
  return getDb().cockpitVorlagen.orderBy('erstelltAm').reverse().toArray()
}

export async function cockpitVorlageLaden(id: string): Promise<CockpitVorlage | undefined> {
  return getDb().cockpitVorlagen.get(id)
}

export async function cockpitVorlageLoeschen(id: string): Promise<void> {
  await getDb().cockpitVorlagen.delete(id)
}
