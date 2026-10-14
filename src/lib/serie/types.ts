// Serien-Modus (Geldregen 2027): gemeinsame Typen.
// Datenquellen liegen unter /public/serie/*.json (Kopie aus Geldregen_2027/daten).
// Regel: Fehlende Daten (z. B. Telefonnummer) werden NICHT erfunden – sie erscheinen als gelber Platzhalter.

export type Vorschlag = 'A' | 'B' | 'C'
export type GewinnerAnzahl = 1 | 4

export type Zeitung = {
  id: string
  name: string
  kicker: string
  /** Präfix inkl. Verlagsziffern, z. B. "01378 40 81"; null = Nummer fehlt (Platzhalter). */
  nummer: string | null
  /** Gewinn-Hotline der Rätselspiele (eine Nummer, ohne Endziffer); fehlt = gelber Platzhalter */
  raetsel_nummer?: string | null
  /** Format der Anzeige in mm: [Breite, Höhe] */
  format: [number, number]
  /** Logo-Dateien (ohne .png) von oben nach unten */
  logos: string[]
  /** Hausfarbe (Hex) */
  farbe: string
  farbe_quelle?: string
  tnb_gruppe: string
  hotline: string
  datenschutz: string
  veranstalter?: string
  orte: string[]
  pruefen?: string | string[]
}

export type SerienDaten = {
  _hinweis?: string
  /** Schlüssel = Gruppenkürzel, Wert = Anzeigename; `_reihenfolge` = Liste der Kürzel */
  tnb_gruppen: Record<string, string | string[]>
  hotline_texte: Record<string, string | null>
  datenschutz_texte: Record<string, string | null>
  veranstalter_texte: Record<string, string>
  zeitungen: Zeitung[]
  /** Aktionszeitraum je Monat für die TNB (durchgehende Aktion, z. B. Nov+Dez 2027); fehlt → Kalendermonat */
  aktionszeitraum?: Record<string, string>
}

export type Spieltag = {
  tag: number
  datum: string // YYYY-MM-DD
  label: string // z. B. "Montag, 1. November"
  frage: string
  a1: string
  a2: string
  richtig: 1 | 2
}

export type Fragen = Record<string, Spieltag[] | string> // Monat (YYYY-MM) → Spieltage; "_hinweis" → Text

export type TnbReferenz = Record<string, Record<string, string> | string>

/** (index im Gewinnerbild, Name, Betrag, Zitat/Text, Ort, optional Foto-URL eines echten Gewinners) */
export type GewinnerEintrag = [number, string, string, string, string, string?]

/** Echte Gewinnerin / echter Gewinner (im ContentCreator erfasst; ersetzt die Dummies) */
export type EchterGewinner = { name: string; ort: string; betrag: string; text: string; foto?: string }

/** Einführungstext am 1. Spieltag (ersetzt den Standard-Start-Hinweis). Leer = Standard. Klartext, wird beim Einsetzen maskiert. */
export type Einfuehrung = { titel?: string; text?: string }

export type Tagesdaten = {
  frage: string
  a1: string
  a2: string
  tag: number
  label: string
  g4: GewinnerEintrag[]
  g1: GewinnerEintrag
  /** true = echte Gewinner (Zusatztext wird auch in der 4er-Fassung gedruckt) */
  echt?: boolean
  /** eigener Einführungstext für den 1. Spieltag */
  einfuehrung?: Einfuehrung
}

/** Löst Bild-/Schrift-Namen (z. B. "logos/ta.png") in eine URL auf (relativ, absolut oder data:-URI). */
export type PfadFn = (name: string) => string

export type Eintrag = { z: Zeitung; td: Tagesdaten; v: Vorschlag; g: GewinnerAnzahl }

export type Pruefergebnis = {
  ok: boolean
  echt_ok: boolean
  warnungen: string[]
  tnb_pt: number
  skalierung: number
  band_px: number
}
