// Datenmodell für das Cockpit 2027 (LOOP-Cockpit-2027.md, erweitert in LOOP-Cockpit-Ausbau-Team.md).
//
// Alle Daten liegen zentral auf dem Server (/api/cockpit/daten, D1 online / Dateien lokal).
// Grosse Binärdaten (Fotos, Vorlagen-PDFs) nie in dieses Modell einbetten – nur als
// Hash-Referenz (/api/cockpit/assets).

import type { Variante } from '../serie/variante'

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
  /** Tagesfristen (Flowchart Ablauf 2): Anruf der Gewinner, Foto-Eingang, Anzeigen-Deadline – „HH:MM“ */
  fristen?: { anruf?: string; foto?: string; deadline?: string }
  /** Verbindung zu monday (Board-Satz a–d), gesetzt von /cockpit/monday */
  monday?: MondayKarte
  /** Gewählte KI-Gestaltungsvariante (Basis = vorlageAbc) – leer = Vorschlag unverändert */
  gestaltung?: Variante
  /** Zuletzt von der KI erzeugte Varianten (zum erneuten Ansehen) */
  varianten?: Variante[]
  erstelltAm: number
  aktualisiertAm: number
}

/** Standard-Fristen laut Flowchart „Ablauf 2: Spieltag“ (je Kampagne änderbar).
 *  Die Anzeigen-Deadline ist nicht festgelegt (monday: Spalte „Deadline“ je Spieltag) – nur anzeigen, wenn gesetzt. */
export const STANDARD_FRISTEN: { anruf: string; foto: string; deadline?: string } = { anruf: '11:00', foto: '14:00' }

/** monday-Board-Satz einer Kampagne (IDs; Zuordnung der Spalten über Titel). */
export type MondayKarte = {
  ordnerId?: string
  projektplan?: string
  fragen?: string
  vorlagen?: string
  /** Anzeigen-Board je Monat 'YYYY-MM' */
  anzeigen?: Record<string, string>
  gewinner?: string
  /** Spieltag-ID → monday-Element-ID je Board */
  elemente?: Record<string, { projektplan?: string; fragen?: string; vorlagen?: string; anzeigen?: string }>
  letzterAbgleich?: number
  fehler?: string
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
  /** Zeitung/Verlag, über die gewonnen wurde (monday „Gewinner von Verlag/Titel“) */
  verlagTitel?: string
  /** Original vor dem Zuschneiden (Phase 5) */
  fotoOriginalHash?: string
  /** Auszahlungs-Status wie monday „Gewinnauszahlung“ – keine Bankdaten im Cockpit */
  auszahlung?: Auszahlung
  /** monday-Element im Gewinner-Board */
  mondayItemId?: string
  /** Woher die Einwilligung stammt (Telefon = von Telemedia angehakt, Link = vom Gewinner selbst bestätigt) */
  einwilligungQuelle?: 'telefon' | 'gewinner-link'
  einwilligungAm?: number
  /** Foto kam über den Foto-Link des Gewinners */
  fotoEingangAm?: number
}

/** Persönlicher Foto-Link für einen Gewinner (öffentlich /foto/<token>, 7 Tage gültig). */
export type FotoLink = {
  token: string
  spieltagId: string
  gewinnerId: string
  vorname: string
  aktiv: boolean
  ablaufAm: number
  erstelltAm: number
  erstelltVon: string
  eingegangenAm?: number
}

/** Standard-Einwilligungstext für den Foto-Link – vor dem Einsatz von Telemedia rechtlich prüfen lassen (änderbar unter Team). */
export const STANDARD_EINWILLIGUNG = 'Ich bin damit einverstanden, dass mein Foto zusammen mit meinem Namen, meinem Wohnort und dem Gewinnbetrag in der Gewinneranzeige der teilnehmenden Zeitungen veröffentlicht wird.'

export type Auszahlung = 'daten-fehlen' | 'daten-vollstaendig' | 'foto-fehlt' | 'ueberwiesen' | 'keine-ueberweisung'

export const AUSZAHLUNG_TEXT: Record<Auszahlung, { de: string; en: string; monday: string }> = {
  'daten-fehlen': { de: 'Daten fehlen', en: 'Data missing', monday: 'Daten fehlen' },
  'daten-vollstaendig': { de: 'Daten vollständig', en: 'Data complete', monday: 'Daten vollständig' },
  'foto-fehlt': { de: 'Foto fehlt noch', en: 'Photo missing', monday: 'Foto fehlt noch' },
  ueberwiesen: { de: 'Gewinn überwiesen', en: 'Prize transferred', monday: 'Gewinn überwiesen' },
  'keine-ueberweisung': { de: 'keine Überweisung', en: 'no transfer', monday: 'keine ÜW' },
}

/** Freigabe-Ablauf je Spieltag × Verlagsgruppe – wie die monday-Statusspalten „Status (GRUPPE)“. */
export type VerlagsStatus = 'tmi-erstellen' | 'grafik-pruefen' | 'tmi-pruefen' | 'tmi-korrektur-ok' | 'verlag-ok' | 'verlag-fehler'

export const VERLAGS_STATUS_REIHE: VerlagsStatus[] = ['tmi-erstellen', 'grafik-pruefen', 'tmi-pruefen', 'tmi-korrektur-ok', 'verlag-ok', 'verlag-fehler']

export const VERLAGS_STATUS_TEXT: Record<VerlagsStatus, { de: string; en: string; farbe: 'grau' | 'gelb' | 'rot' | 'gruen' }> = {
  'tmi-erstellen': { de: 'TMI: erstellen', en: 'TMI: create', farbe: 'grau' },
  'grafik-pruefen': { de: 'Grafik: prüfen', en: 'Design: check', farbe: 'gelb' },
  'tmi-pruefen': { de: 'TMI: prüfen', en: 'TMI: check', farbe: 'gelb' },
  'tmi-korrektur-ok': { de: 'TMI: Korrektur OK', en: 'TMI: correction OK', farbe: 'gelb' },
  'verlag-ok': { de: 'Verlag: OK', en: 'Publisher: OK', farbe: 'gruen' },
  'verlag-fehler': { de: 'Verlag: Fehler', en: 'Publisher: error', farbe: 'rot' },
}

/** Kundenkommentar aus dem Korrekturportal (Pin auf der Anzeige oder allgemein). */
export type PortalKommentar = {
  id: string
  zeitungId: string
  /** 0..1 relativ zur Anzeige; fehlt = allgemeiner Kommentar */
  x?: number
  y?: number
  text: string
  von: string
  am: number
  erledigt?: boolean
  antwort?: string
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
  /** Anzeigen-Deadline aus monday (Projektplan, „YYYY-MM-DDTHH:MM“) */
  deadline?: string
  /** Inhalt bei der letzten Freigabe und davor – für „vorher / nachher“ im Kundenportal */
  freigabeFassung?: Fassung
  vorherigeFassung?: Fassung
  /** Vier-Augen-Freigabe */
  freigabe?: { wer: string; wann: number; kommentar?: string; uebersteuert?: boolean }
  /** Ergebnis der letzten Gesamtprüfung aller Zeitungen (Phase 4) */
  pruefung?: { am: number; von: string; anzeigen: number; fehler: number; warnungen: number; stempel?: string; probleme: Array<{ zeitungId: string; zeitung?: string; variante?: string; text: string; art: 'fehler' | 'warnung' }> }
  /** Freigabe-Ablauf je Verlagsgruppe (Kundenportal / monday) */
  verlagsStatus?: Record<string, VerlagsStatus>
  /** Kundenkommentare aus dem Korrekturportal je Verlagsgruppe */
  portalKommentare?: Record<string, PortalKommentar[]>
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

/** Druckrelevanter Inhalt eines Spieltags zu einem Zeitpunkt (für den Vergleich nach einer Korrektur). */
export type Fassung = {
  am: number
  raetsel: SpieltagRaetsel
  gewinner: Array<{ name: string; ort: string; betrag: number; gewinnertext: string; fotoHash?: string }>
}
