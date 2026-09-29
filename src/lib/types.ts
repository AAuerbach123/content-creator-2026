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
  beschreibung?: string
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
  sichtbar?: boolean
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
  kanal?: Kanal
  erstelltAm?: number
}

export type JobStatus = 'briefing' | 'in-arbeit' | 'fertig' | 'archiviert'

// Chat-Nachricht im Dialog mit der KI
export type Rolle = 'nutzer' | 'ki' | 'system'
export type Nachricht = {
  id: string
  rolle: Rolle
  text: string
  zeitpunkt: number
  metadaten?: Record<string, unknown>
}

// Vorschlag für eine visuelle Richtung (Weg A) — drei davon werden dem Grafiker gezeigt
export type Richtung = {
  id: string
  name: string
  layoutBeschreibung: string
  farbwelt: string[] // Hex-Farben
  tonalitaet: string
  beispielHeadline: string
  begruendung?: string
}

// Analyse einer hochgeladenen Vorlage (Weg C)
export type VorlagenAnalyse = {
  format?: { breite: number; hoehe: number; einheit: Einheit }
  farben: string[]
  schriftKandidaten: string[]
  textGefaesse: { name: string; text?: string }[]
  bemerkungen?: string
}

// Verlaufs-Eintrag (Regel 8: jede KI-Aktion sichtbar)
export type KIAktion = {
  id: string
  jobId?: string
  route: string // z.B. "/api/dialog", "/api/generate-image"
  modell?: string
  prompt: string
  antwortKurz?: string
  eingabeTokens?: number
  ausgabeTokens?: number
  kostenUsd?: number
  fehler?: string
  zeitpunkt: number
}

// Brand-Kit: CI-Farben/Schriften/Logos
export type BrandKit = {
  id: string
  name: string
  farben: string[]
  schriften: string[]
  logoAssetHash?: string
  quelle?: 'verlag' | 'kunde' | 'eigene'
}

export type Job = {
  id: string
  titel: string
  kanal?: Kanal
  ziel: string
  einstieg?: Einstiegsweg
  briefing: FrageAntwort[]
  vorlageRef?: string // Hash der hochgeladenen Vorlage in assets-Store
  vorlagenAnalyse?: VorlagenAnalyse
  richtungen?: Richtung[]
  gewaehlteRichtung?: string // id der gewählten Richtung
  schrittplan: Schritt[]
  artefakte: Artefakt[]
  dialog: Nachricht[]
  videoStoryboard?: import('./video-types').Storyboard
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

// Korrekturportal (Andreas-Wunsch 2026-09-29). Ein Verlag/Kunde bekommt einen
// tokenisierten Link auf ein Artefakt, klickt auf eine Stelle und hinterlässt
// einen Änderungswunsch. Alles ist rein clientseitig (IndexedDB) — kein Server
// hält Kundendaten. Der „Link" ist deshalb eine URL mit dem Job-Backup als
// Base64-Anhang; oder — später — ein Cloudflare-KV-Token. Für Phase 4 nutzen
// wir zunächst lokale Freigaben.
export type Freigabe = {
  id: string // = token, aus dem Link
  jobId: string
  artefaktId: string
  jobTitel: string
  erstelltAm: number
  pins: Korrekturpin[]
}

export type Pinstatus = 'offen' | 'erledigt' | 'abgelehnt'

export type Korrekturpin = {
  id: string
  x: number // 0..1 relativ zur Artefakt-Breite
  y: number // 0..1 relativ zur Artefakt-Höhe
  kommentar: string
  autor?: string
  status: Pinstatus
  erstelltAm: number
  antworten?: { autor?: string; text: string; erstelltAm: number }[]
}
