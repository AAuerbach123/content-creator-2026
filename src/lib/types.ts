// Datenmodell ContentCreator2026 (LOOP Abschnitt 3).
// Jobs referenzieren Assets nur über Content-Hashes (Regel 2 — nie Binärdaten in Job-Datensätze).

export type Sprache = 'de' | 'en'

export type Kanal =
  | 'zeitung'
  | 'zeitschrift'
  | 'web-banner'
  | 'web-content'
  | 'ig-feed'
  | 'ig-story'
  | 'ig-reel'
  | 'fb-post'
  | 'linkedin-post'
  | 'x-post'
  | 'kurzvideo'

export type Einstiegsweg = 'A-ohne-vorstellung' | 'B-vorstellung-im-kopf' | 'C-vorlage'

export type FrageTyp = 'offen' | 'multiple-choice'

export type FrageAntwort = {
  id: string
  frage: string
  typ: FrageTyp
  optionen?: string[]
  antwort?: string
  gestelltAm: number
  beantwortetAm?: number
}

export type SchrittStatus = 'offen' | 'ki-vorschlag' | 'angenommen' | 'manuell'

export type Schritt = {
  id: string
  titel: string
  status: SchrittStatus
  reihenfolge: number
}

export type EbeneTyp = 'text' | 'bild' | 'form' | 'logo' | 'video-platzhalter'

export type Ebene = {
  id: string
  typ: EbeneTyp
  name: string
  x: number
  y: number
  breite: number
  hoehe: number
  drehung?: number
  eigenschaften: Record<string, unknown>
  assetHash?: string // Referenz in den assets-Store (Regel 2)
}

export type Einheit = 'mm' | 'px'

export type Artefakt = {
  id: string
  format: string // z.B. "IG Feed 4:5", "Zeitung 200x140mm"
  breite: number
  hoehe: number
  einheit: Einheit
  ebenen: Ebene[]
  assetRefs: string[] // alle in ebenen referenzierten Hashes, redundant für schnelle Cleanup-Checks
}

export type JobStatus = 'briefing' | 'in-arbeit' | 'fertig' | 'archiviert'

export type Job = {
  id: string
  titel: string
  kanal?: Kanal
  ziel: string
  einstieg?: Einstiegsweg
  briefing: FrageAntwort[]
  vorlageRef?: string // Hash der hochgeladenen Vorlage in assets-Store
  schrittplan: Schritt[]
  artefakte: Artefakt[]
  status: JobStatus
  erstelltAm: number
  aktualisiertAm: number
}

// Content-adressiertes Asset (Regel 2): Primärschlüssel = SHA-256 des Blob-Inhalts.
// Gleiches Bild zweimal hochgeladen → nur einmal gespeichert.
export type Asset = {
  hash: string
  mimeType: string
  bytes: number
  blob: Blob
  hinzugefuegtAm: number
}

// Automatischer Snapshot je Job (Regel 3). Die letzten 5 werden aufbewahrt.
export type Snapshot = {
  id: string
  jobId: string
  erstelltAm: number
  jobData: Job // tiefe Kopie zum Zeitpunkt des Snapshots
}
