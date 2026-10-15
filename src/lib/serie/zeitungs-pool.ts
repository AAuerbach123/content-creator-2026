// Zeitungs-Pool = zeitungen.json (Geldregen-Referenz, unverändert) + zeitungen-weitere.json (Wissensquiz Juli 2026).
// Fehlende Teilnahmebedingungs-Angaben neuer Verlagsgruppen erscheinen als gelbe Platzhalter (nichts erfinden).

import { fehlt } from './generator'
import type { SerienDaten, Zeitung } from './types'

export type WeitereDatei = {
  tnb_gruppen_namen?: Record<string, string>
  wissensquiz_2026_07?: string[]
  zeitungen: Zeitung[]
}

export type Standards = {
  /** bestätigte Geldregen-Teilnehmer (zeitungen.json) */
  geldregen: string[]
  /** Teilnehmer Wissensquiz Juli 2026 – Standard für alle anderen Spiele */
  wissensquiz: string[]
}

export function poolBilden(daten: SerienDaten, weitere?: WeitereDatei | null): { daten: SerienDaten; standard: Standards } {
  const geldregen = daten.zeitungen.map((z) => z.id)
  if (!weitere?.zeitungen?.length) return { daten, standard: { geldregen, wissensquiz: geldregen } }
  const neu = weitere.zeitungen.filter((z) => !geldregen.includes(z.id))
  const tnb = { ...daten.tnb_gruppen }
  for (const z of neu) {
    if (!(z.tnb_gruppe in tnb)) tnb[z.tnb_gruppe] = fehlt(`[Verlagsangabe ${weitere.tnb_gruppen_namen?.[z.tnb_gruppe] ?? z.tnb_gruppe} folgt]`)
  }
  return {
    daten: { ...daten, tnb_gruppen: tnb, zeitungen: [...daten.zeitungen, ...neu] },
    standard: { geldregen, wissensquiz: weitere.wissensquiz_2026_07?.length ? weitere.wissensquiz_2026_07 : geldregen },
  }
}

export function standardTeilnehmer(spielId: string, s: Standards): string[] {
  return spielId === 'geldregen' ? s.geldregen : s.wissensquiz
}
