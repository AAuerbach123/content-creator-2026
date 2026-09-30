// Rufnummern je Zeitung (Phase 7, Andreas 30.09.).
// Quelle: /public/rufnummern.json (55 Zeitungen; Wissensquiz Endziffern 1–5,
// Servicehotline, Geldregen MWN Print + MWN Web).
// Runtime: JSON wird beim ersten Zugriff geladen und gecached.
// Regel: Fehlt eine Nummer, wird nichts erfunden — `null`/`undefined` bleibt bestehen.

export type WissensquizNummern = {
  stamm: string
  nummern: string[] // Endziffern 1..5
  serviceHotline?: string | null
}

export type GeldregenNummern = {
  mwnPrint: string | null
  mwnWeb: string | null
}

export type ZeitungRufnummern = {
  gruppe: string
  zeitung: string
  presetIds: string[]
  wissensquiz: WissensquizNummern | null
  geldregen: GeldregenNummern | null
  hinweis?: string | null
}

export type RufnummernDatei = {
  _hinweis?: string
  quellen: Record<string, string>
  stand: string
  status: string
  online?: {
    handy: string | null
    laptopQr: string | null
    hinweis?: string
  }
  zeitungen: ZeitungRufnummern[]
}

let cache: RufnummernDatei | null = null
let laufendeAnfrage: Promise<RufnummernDatei> | null = null

export async function rufnummernLaden(): Promise<RufnummernDatei> {
  if (cache) return cache
  if (laufendeAnfrage) return laufendeAnfrage
  laufendeAnfrage = fetch('/rufnummern.json', { cache: 'force-cache' })
    .then((r) => {
      if (!r.ok) throw new Error(`rufnummern.json HTTP ${r.status}`)
      return r.json() as Promise<RufnummernDatei>
    })
    .then((daten) => {
      cache = daten
      return daten
    })
    .catch((e) => {
      laufendeAnfrage = null
      throw e
    })
  return laufendeAnfrage
}

// Nachschlage-Helfer: findet den Rufnummern-Eintrag für ein Verlags-Preset.
// `presetId` ist die `id` aus `verlage-presets.json`. Nicht jede ID hat einen
// Eintrag — dann kommt `undefined` zurück (nie erfundene Daten).
export function rufnummernFuerPreset(
  datei: RufnummernDatei,
  presetId: string,
): ZeitungRufnummern | undefined {
  return datei.zeitungen.find((z) => z.presetIds.includes(presetId))
}

// Gruppierung für die Tabelle in der UI.
export function rufnummernGruppieren(
  liste: ZeitungRufnummern[],
): Record<string, ZeitungRufnummern[]> {
  const gruppen: Record<string, ZeitungRufnummern[]> = {}
  for (const z of liste) {
    const g = z.gruppe || '—'
    ;(gruppen[g] = gruppen[g] || []).push(z)
  }
  return gruppen
}

// Freitext-Suche (Zeitung, Gruppe, presetId, Stamm-Nummer).
export function rufnummernSuchen(liste: ZeitungRufnummern[], suche: string): ZeitungRufnummern[] {
  const s = suche.trim().toLowerCase()
  if (!s) return liste
  return liste.filter((z) => {
    if (z.zeitung.toLowerCase().includes(s)) return true
    if (z.gruppe.toLowerCase().includes(s)) return true
    if (z.presetIds.some((p) => p.toLowerCase().includes(s))) return true
    if (z.wissensquiz?.stamm?.toLowerCase().includes(s)) return true
    if (z.wissensquiz?.nummern.some((n) => n.replace(/\s/g, '').includes(s.replace(/\s/g, '')))) return true
    if (z.geldregen?.mwnPrint?.toLowerCase().includes(s)) return true
    return false
  })
}

// Bequemer Doppel-Test: gibt es mindestens eine bestätigte Nummer?
export function hatVerwendbareNummer(z: ZeitungRufnummern): boolean {
  return Boolean(z.wissensquiz?.nummern?.length || z.geldregen?.mwnPrint || z.geldregen?.mwnWeb)
}
