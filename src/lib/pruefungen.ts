// Print-Prüfbericht und Barrierefreiheits-Prüfung für Artefakte.

import type { Artefakt, Ebene } from './types'
import { kanalById } from './kanaele'

export type PruefHinweis = { schwere: 'warnung' | 'info'; ebeneId?: string; text: string }

function hexZuRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (!m) return null
  const int = parseInt(m[1], 16)
  return [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff]
}

function luminanz([r, g, b]: [number, number, number]): number {
  const konv = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * konv(r) + 0.7152 * konv(g) + 0.0722 * konv(b)
}

export function kontrastRatio(vorne: string, hinten: string): number {
  const v = hexZuRgb(vorne)
  const h = hexZuRgb(hinten)
  if (!v || !h) return 0
  const lv = luminanz(v)
  const lh = luminanz(h)
  const heller = Math.max(lv, lh)
  const dunkler = Math.min(lv, lh)
  return (heller + 0.05) / (dunkler + 0.05)
}

export function pruefePrint(artefakt: Artefakt): PruefHinweis[] {
  const hinweise: PruefHinweis[] = []
  const preset = kanalById(artefakt.kanal)

  if (artefakt.einheit === 'mm' && preset) {
    // Bild-Auflösung schätzen: Asset-Blob-Größe kennen wir hier nicht — nur Layout-Fläche.
    // Wir geben einen Info-Hinweis, der Andreas erinnert.
    hinweise.push({
      schwere: 'info',
      text: `Zielauflösung ≥ ${preset.aufloesungDpi || 200} dpi — Bilder in mindestens dieser Kantenlänge einsetzen: ${
        Math.round(((preset.aufloesungDpi || 200) / 25.4) * artefakt.breite)
      } × ${Math.round(((preset.aufloesungDpi || 200) / 25.4) * artefakt.hoehe)} px.`,
    })
  }

  for (const e of artefakt.ebenen) {
    if (e.sichtbar === false) continue
    if (e.typ === 'text') {
      const p = e.eigenschaften as Record<string, unknown>
      const groesse = ((p.schriftgroesse as number) || 24)
      // Bei mm ist die schriftgroesse bereits in pt-Einheit (unser artefakt speichert die Größe
      // in der gleichen Einheit wie die Box). Für Zeitungen: 7 pt Untergrenze.
      if (artefakt.einheit === 'mm' && groesse < 7) {
        hinweise.push({ schwere: 'warnung', ebeneId: e.id, text: `Ebene „${e.name}": Schrift < 7 pt (aktuell ${groesse.toFixed(1)}).` })
      }
      if (artefakt.einheit === 'mm' && (e.x < 3 || e.y < 3 || e.x + e.breite > artefakt.breite - 3 || e.y + e.hoehe > artefakt.hoehe - 3)) {
        hinweise.push({ schwere: 'warnung', ebeneId: e.id, text: `Ebene „${e.name}": näher als 3 mm am Beschnitt — Text könnte abgeschnitten werden.` })
      }
      const farbe = (p.farbe as string) || '#111'
      const hg = (p.hintergrund as string) || '#ffffff'
      const kontrast = kontrastRatio(farbe, hg)
      if (kontrast && kontrast < 4.5) {
        hinweise.push({ schwere: 'warnung', ebeneId: e.id, text: `Ebene „${e.name}": Kontrast ${kontrast.toFixed(2)} — unter WCAG AA (4.5).` })
      }
    }
  }

  if (hinweise.length === 0) hinweise.push({ schwere: 'info', text: '✓ Keine Auffälligkeiten.' })
  return hinweise
}

export function pruefeBarrierefrei(artefakt: Artefakt): PruefHinweis[] {
  return pruefePrint(artefakt).filter((h) => h.text.includes('Kontrast') || h.text.includes('7 pt') || h.text.includes('WCAG'))
}
