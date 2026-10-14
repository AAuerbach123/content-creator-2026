// Datenmodell für das Cockpit 2027 (Phase 2 LOOP-Cockpit-2027.md).
//
// Alle Daten liegen clientseitig (IndexedDB, Dexie v7). Grosse Binärdaten
// (Fotos, Vorlagen-PDFs) nie in dieses Modell einbetten – nur als Hash-Referenz
// in den Assets-Store (Regel 2).

export type SpielId = string

/** Modell für den Verlag (AZS = Auszahlungsspiel · RSP = Rundum-Sorglos) */
export type Modell = 'AZS' | 'RSP'

/** Antwort-Weg zum Preis (Lösungswort oder zwei Antworten mit Endziffer 1/2) */
export type Antwortformat = 'loesungswort' | 'zwei-endziffer'

/** Eine Preisstufe für Geldregen (Anzahl × Betrag in Euro) */
export type Preisstufe = {
  anzahl: number
  betrag: number // in Euro
  hotlineEndziffer?: 1 | 2
}

/** Preis-Konfiguration – abhängig vom Spielkonzept */
export type Preise =
  | { art: 'geldpakete'; stufen: Preisstufe[] }
  | { art: 'tagespreis'; tagespreis: number; supermittwoch?: number }
  | { art: 'juli'; wochen: Array<{ wocheNr: 1 | 2 | 3 | 4; tagespreis: number; jackpotAn: boolean; jackpotBetrag?: number }> }

/** Eine Kampagne: wird einmal eingerichtet und steuert die Spieltage. */
export type Kampagne = {
  id: string
  spielId: SpielId
  /** z. B. '2027-11' oder '2027-11+12' bei Geldregen Nov/Dez durchgehend */
  monat: string
  /** Falls Nov/Dez zusammen, zweites Monatskürzel */
  monatBis?: string
  /** IDs der teilnehmenden Zeitungen (aus zeitungen.json) */
  verlage: string[]
  modell: Modell
  preise: Preise
  antwortformat: Antwortformat
  /** Vorlagen-ID (Phase 3 Baustein V) oder Vorschlag A/B/C */
  vorlageId?: string
  vorlageAbc?: 'A' | 'B' | 'C'
  /** Spielspezifische Einstellungen – z. B. Bildstil, Gittergrösse */
  spielSpezifisch: Record<string, unknown>
  erstelltAm: number
  aktualisiertAm: number
}

/** Status eines Spieltags – korrespondiert mit StatusChip. */
export type SpieltagStatus = 'vorbereitet' | 'gewinner-fehlen' | 'raetsel-fehlt' | 'fehler' | 'freigegeben'

/** Rätselinhalte je Spieltag – spielspezifisches Feld `daten` wie in Inhalt */
export type SpieltagRaetsel = {
  frage?: string
  a1?: string
  a2?: string
  richtig?: 1 | 2
  loesung?: string
  quelle?: string // Pflichtfeld bei Geldregen (Flowchart Seite 4)
  daten?: Record<string, unknown>
}

/** Ein Gewinner / eine Gewinnerin für diesen Spieltag */
export type SpieltagGewinner = {
  id: string
  name: string
  ort: string
  betrag: number // in Euro
  fotoHash?: string
  einwilligung: boolean
  gewinnertext: string
}

/** Ein Spieltag einer Kampagne. */
export type Spieltag = {
  id: string
  kampagneId: string
  nr: number
  /** YYYY-MM-DD */
  datum: string
  istSupermittwoch?: boolean
  /** 1..4 bei Juli-Jackpot */
  jackpotWoche?: 1 | 2 | 3 | 4
  raetsel: SpieltagRaetsel
  gewinner: SpieltagGewinner[]
  status: SpieltagStatus
  /** Vier-Augen-Freigabe */
  freigabe?: { wer: string; wann: number; kommentar?: string }
  erstelltAm: number
  aktualisiertAm: number
}

/** Vorlage (Baustein V): entweder A/B/C oder importiert (per Datei + Analyse) */
export type CockpitVorlage = {
  id: string
  name: string
  /** Zieht aus /api/analyze-template oder manuell aus A/B/C abgeleitet */
  quelle: 'abc' | 'importiert'
  abc?: 'A' | 'B' | 'C'
  /** Hash einer hochgeladenen PDF/PNG-Datei im Assets-Store (Regel 2) */
  datasetHash?: string
  farben?: { primaer?: string; sekundaer?: string; akzent?: string }
  schriften?: string[]
  /** Feldzuordnung (Baustein V, Flowchart Seite 11): Titel, Rätselbereich, … */
  felder?: Record<string, { x: number; y: number; w: number; h: number } | undefined>
  gesperrt?: boolean
  erstelltAm: number
}
