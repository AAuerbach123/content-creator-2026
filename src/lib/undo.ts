// Simpler Undo/Redo-Stapel für ein Artefakt. Hält die letzten N Zustände;
// „gleicher Zustand wie zuletzt" wird verworfen, damit Slider-Änderungen den
// Stapel nicht fluten.

import type { Artefakt } from './types'

export type UndoStapel = {
  vergangenheit: Artefakt[]
  zukunft: Artefakt[]
}

export const LEERER_STAPEL: UndoStapel = { vergangenheit: [], zukunft: [] }

const LIMIT = 40

export function stapelSchreiben(stapel: UndoStapel, altesArtefakt: Artefakt): UndoStapel {
  const letzter = stapel.vergangenheit.at(-1)
  if (letzter && JSON.stringify(letzter) === JSON.stringify(altesArtefakt)) return stapel
  const vergangenheit = [...stapel.vergangenheit, altesArtefakt]
  const beschnitten = vergangenheit.length > LIMIT ? vergangenheit.slice(vergangenheit.length - LIMIT) : vergangenheit
  return { vergangenheit: beschnitten, zukunft: [] }
}

export function stapelZurueck(stapel: UndoStapel, aktuell: Artefakt): { neu: UndoStapel; wieder?: Artefakt } {
  if (!stapel.vergangenheit.length) return { neu: stapel }
  const letzter = stapel.vergangenheit.at(-1) as Artefakt
  const vergangenheit = stapel.vergangenheit.slice(0, -1)
  return { neu: { vergangenheit, zukunft: [aktuell, ...stapel.zukunft] }, wieder: letzter }
}

export function stapelVor(stapel: UndoStapel, aktuell: Artefakt): { neu: UndoStapel; wieder?: Artefakt } {
  if (!stapel.zukunft.length) return { neu: stapel }
  const naechste = stapel.zukunft[0]
  const zukunft = stapel.zukunft.slice(1)
  return { neu: { vergangenheit: [...stapel.vergangenheit, aktuell], zukunft }, wieder: naechste }
}
