// Verlagsgruppen = Feld „hotline“ in public/serie/zeitungen.json (FUNKE, SWMH, SWP, SHZ, NOZ, SAAR, NUE …).
// Dieselben Gruppen haben in monday je eine Datei- und Statusspalte („Anzeige (SWMH)“, „Status (SWMH)“)
// und bekommen im Kundenportal je einen eigenen Link.

import type { Zeitung } from '../serie/types'

export type Verlagsgruppe = { schluessel: string; name: string; zeitungen: Zeitung[] }

const ANZEIGE_NAME: Record<string, string> = { NUE: 'Nürnberg', ZVNW: 'Neue Westfälische (ZVNW)', AUGSBURGER: 'Augsburg', RHZ: 'Rhein-Zeitung', IPPEN: 'IPPEN' }

/** Schlüsselwort im monday-Spaltentitel (klein, ohne Umlaute) – wie /api/monday-dateien. */
export const MONDAY_STICHWORT: Record<string, string> = { FUNKE: 'funke', SWMH: 'swmh', SWP: 'swp', NUE: 'nurnberg', SHZ: 'shz', SAAR: 'saar', NOZ: 'noz', IPPEN: 'ippen', AUGSBURGER: 'augsburg', ZVNW: 'zvnw', RHZ: 'rhein' }

export const gruppenName = (schluessel: string) => ANZEIGE_NAME[schluessel] ?? schluessel

export function verlagsgruppen(zeitungen: Zeitung[], nurIds?: string[]): Verlagsgruppe[] {
  const map = new Map<string, Verlagsgruppe>()
  for (const z of zeitungen) {
    if (nurIds && nurIds.length && !nurIds.includes(z.id)) continue
    const k = z.hotline || '—'
    if (!map.has(k)) map.set(k, { schluessel: k, name: gruppenName(k), zeitungen: [] })
    map.get(k)!.zeitungen.push(z)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}
