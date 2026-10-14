// Spiele-Katalog (alle Spiele aus dem Gewinnspielplan 2027): gemeinsame Typen.
// Ein Spiel liefert nur das, was es von anderen unterscheidet (Rätselfeld, Mechanik, Muster-Inhalte);
// Rahmen (Kopf, Antworten, Preise, Gewinner, Teilnahmebedingungen, Logos, Hausfarbe, Format) baut rahmen.ts.

import type { Einfuehrung, EchterGewinner, PfadFn, SerienDaten, Zeitung, GewinnerAnzahl, Vorschlag } from '../types'

/** Wie wird gespielt / gewonnen? */
export type Mechanik =
  /** Geldregen-Mechanik: 6 Geldpakete, je eigene Hotline + Endziffer 1/2 (Nummern = Geldregen-Nummern der Zeitung) */
  | { art: 'geldpakete' }
  /** Klassisches Rätselspiel (AZS): eine Gewinn-Hotline, Lösungswort ansagen; Tagespreis + optional Supertag (Mittwoch) */
  | { art: 'tagespreis'; tagespreis: string; supertag?: string }
  /** Juli-Spiele: eine Hotline + Endziffer 1/2; Tagespreis verlost + Jackpot im geheimen Zeitfenster */
  | { art: 'jackpot'; tagespreis: string }

/** Wie antwortet der Leser? */
/** 'zwei' = zwei Antworten mit Hotline-Endziffer 1/2 · 'ansagen' = zwei Antworten zur Auswahl, EINE Hotline, richtige
 *  Antwort wird am Telefon aufgesprochen (Fehlerjagd, Jenny 05.10.2026) · 'loesungswort' = Lösungswort ansagen */
export type Antwortart = 'zwei' | 'ansagen' | 'loesungswort'

/** Inhalt eines Spieltags (aus Muster oder aus importierter Inhalte-Datei). */
export type Inhalt = {
  tag: number
  datum: string // YYYY-MM-DD (erster Kalendertag des Spieltags)
  label: string // z. B. "Montag, 1. November" / "Samstag/Sonntag, 6./7. November"
  /** Frage bzw. Aufgabenstellung über dem Rätselfeld */
  frage: string
  /** bei Antwortart 'zwei' */
  a1?: string
  a2?: string
  richtig?: 1 | 2
  /** bei Antwortart 'loesungswort': Lösung (nur intern, wird NICHT gedruckt) und Anzahl Kästchen */
  loesung?: string
  /** Spielspezifische Daten fürs Rätselfeld (Bildnamen, Gitter, Wortlisten …) */
  daten?: Record<string, unknown>
  /** Jackpot-Betrag dieses Tages (nur Mechanik 'jackpot'), z. B. "1.000 €" */
  jackpot?: string
  /** Echte Gewinnerinnen/Gewinner dieses Spieltags (im ContentCreator erfasst) – ersetzen die Dummies */
  gewinner?: EchterGewinner[]
  /** Einführungstext am 1. Spieltag (im Cockpit erfasst); leer = Standard */
  einfuehrung?: Einfuehrung
  /** true = Inhalt ist ein Muster aus der Präsentation (wird gelb markiert, nicht für den Druck) */
  muster?: boolean
}

export type Box = { w: number; h: number }

export type RaetselKontext = {
  z: Zeitung
  inhalt: Inhalt
  /** Akzentfarbe (A: Gold, B/C: Hausfarbe) */
  akzent: string
  /** true = Rätselfeld liegt auf dunklem Grund (sonst weiß) – Rätselfeld selbst ist immer auf Weiß gesetzt */
  vorschlag: Vorschlag
  /** verfügbare Fläche in px (Layout-Raster 1575 px Breite) – das Rätselfeld MUSS hineinpassen */
  box: Box
  pfad: PfadFn
}

export type Teil = { css: string; html: string }

export type SpielDef = {
  id: string
  /** Anzeigename, z. B. "Kreuz & Quer" */
  name: string
  /** Schriftzug im Anzeigenkopf (darf <br> enthalten) */
  titel: string
  /** Unterzeile im Kopf; Platzhalter {TAGESPREIS} / {SUPERTAG} werden ersetzt */
  unterzeile: string
  /** Monate (YYYY-MM), in denen das Spiel laut Gewinnspielplan 2027 läuft */
  monate: string[]
  /** Modell laut Präsentation */
  modell: 'RSP' | 'AZS oder RSP'
  /** Kurzbeschreibung (Oberfläche) */
  beschreibung: string
  mechanik: Mechanik
  antwort: Antwortart
  /** "So einfach geht's" – 3 bis 4 kurze Schritte */
  schritte: string[]
  /** Hinweis-Kasten (z. B. Zeitfenster/Supermittwoch) */
  hinweis: { titel: string; text: string }
  /** Rätselfeld zeichnen; muss in ctx.box passen */
  raetsel: (ctx: RaetselKontext) => Teil
  /** Muster-Inhalte für alle Spieltage eines Monats (bis echte Inhalte importiert sind) */
  musterInhalte: (monat: string) => Inhalt[]
  /** Bild-Dateien (relativ zu /public/serie/assets/), die das Spiel braucht – für Export/Prüfung */
  bilder?: string[]
  /** Spielzeitraum innerhalb des Monats (Juli: 4 Spielwochen); Standard = ganzer Monat */
  zeitraum?: (monat: string) => { von: string; bis: string }
  /** Offene Punkte (erscheinen in der Oberfläche und in OFFENE_PUNKTE) */
  offen?: string[]
}

export type SpielSeitenArgs = {
  spiel: SpielDef
  daten: SerienDaten
  z: Zeitung
  inhalt: Inhalt
  vorschlag: Vorschlag
  gewinner: GewinnerAnzahl
  monat: string
  pfad: PfadFn
  inline?: boolean
}
