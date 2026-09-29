// Verlags-Presets aus dem Ad-Creator übernommen (Andreas-Wunsch 2026-09-29).
// Quelle: ~/Desktop/wissensquiz/public/verlage-presets.json (46 Einträge).
// Runtime: die JSON-Datei liegt in /public/verlage-presets.json und wird beim
// ersten Zugriff einmal geladen und gecached.

export type VerlagsFarben = {
  title: string
  question: string
  intro: string
  prize: string
  phone: string
  winners: string
  terms: string
}

export type VerlagsPreset = {
  id: string
  gruppe: string
  verlag: string
  titel: string
  titelKanonisch?: string
  fontFamily: string
  fontAvailable: boolean
  fontRaw: string
  colors: VerlagsFarben
  format: string // z.B. "315x220" in mm
  logoPosition: string
  logoUrl?: string | null
  phoneNumbers?: string[]
}

let cache: VerlagsPreset[] | null = null
let laufendeAnfrage: Promise<VerlagsPreset[]> | null = null

export async function verlagePresetsLaden(): Promise<VerlagsPreset[]> {
  if (cache) return cache
  if (laufendeAnfrage) return laufendeAnfrage
  laufendeAnfrage = fetch('/verlage-presets.json', { cache: 'force-cache' })
    .then((r) => {
      if (!r.ok) throw new Error(`verlage-presets.json HTTP ${r.status}`)
      return r.json()
    })
    .then((liste: VerlagsPreset[]) => {
      cache = liste
      return liste
    })
    .catch((e) => {
      laufendeAnfrage = null
      throw e
    })
  return laufendeAnfrage
}

export function verlagFormatParsen(format: string): { breite: number; hoehe: number } | null {
  const m = format.match(/^(\d+)\s*[x×]\s*(\d+)$/i)
  if (!m) return null
  return { breite: parseInt(m[1], 10), hoehe: parseInt(m[2], 10) }
}

export function verlagFarbenPalette(v: VerlagsPreset): string[] {
  const set = new Set<string>([
    v.colors.title,
    v.colors.question,
    v.colors.intro,
    v.colors.prize,
    v.colors.phone,
    v.colors.winners,
    v.colors.terms,
  ])
  return Array.from(set).filter(Boolean)
}

// Gruppierung nach Verlagsgruppe (z. B. FUNKE, IPPEN, SAAR) — für die Auswahl-UI.
export function verlageGruppieren(liste: VerlagsPreset[]): Record<string, VerlagsPreset[]> {
  const gruppen: Record<string, VerlagsPreset[]> = {}
  for (const v of liste) {
    const g = v.gruppe || v.verlag || '—'
    ;(gruppen[g] = gruppen[g] || []).push(v)
  }
  return gruppen
}
