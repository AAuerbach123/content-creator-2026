// Spiele-Katalog 2027 – Registry. Reihenfolge = Gewinnspielkalender.
// Geldregen hat einen eigenen, freigegebenen Generator (../generator.ts) und steht hier nur als Eintrag für die Oberfläche.

import { aus2mach1 } from './aus2mach1'
import { brueckenraetsel } from './brueckenraetsel'
import { fehlerjagd } from './fehlerjagd'
import { schattenraetsel, sommerPostkarte, sprichwortRaetsel, wahrOderErfunden } from './juli'
import { kombinieren } from './kombinieren'
import { gitterraetsel, kreuzQuerApril, kreuzQuerOktober } from './kreuzquer'
import type { SpielDef } from './typen'

export type KatalogEintrag =
  | { art: 'geldregen'; id: 'geldregen'; name: string; monate: string[]; modell: 'RSP'; beschreibung: string }
  | { art: 'spiel'; id: string; name: string; monate: string[]; modell: string; beschreibung: string; spiel: SpielDef }

export const SPIELE: SpielDef[] = [
  aus2mach1, fehlerjagd, kreuzQuerApril, brueckenraetsel, kombinieren,
  sommerPostkarte, wahrOderErfunden, sprichwortRaetsel, schattenraetsel,
  gitterraetsel, kreuzQuerOktober,
]

export const GELDREGEN_EINTRAG: KatalogEintrag = {
  art: 'geldregen',
  id: 'geldregen',
  name: 'Geldregen',
  monate: ['2027-03', '2027-11', '2027-12'],
  modell: 'RSP',
  beschreibung: 'Eine Quizfrage, zwei Antworten, sechs Geldpakete von 100 bis 10.000 € – Hotline mit Endziffer der Antwort.',
}

export function katalog(): KatalogEintrag[] {
  const spiele: KatalogEintrag[] = SPIELE.map((s) => ({ art: 'spiel', id: s.id, name: s.name, monate: s.monate, modell: s.modell, beschreibung: s.beschreibung, spiel: s }))
  const alle = [GELDREGEN_EINTRAG, ...spiele]
  return alle.sort((a, b) => (a.monate[0] ?? '').localeCompare(b.monate[0] ?? ''))
}

export function spielFinden(id: string): SpielDef | undefined {
  return SPIELE.find((s) => s.id === id)
}
