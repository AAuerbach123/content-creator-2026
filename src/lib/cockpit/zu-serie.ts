// Adapter: wandelt Cockpit-Kampagne + Spieltage in die Eingaben, die der
// bestehende Serien-Generator (generator.ts) und die Spiel-Definitionen heute
// erwarten. Kein zweiter Generator – nur eine Übersetzung.

import type { Inhalt } from '../serie/spiele/typen'
import type { Fragen, Spieltag as SerieSpieltag } from '../serie/types'
import type { Kampagne, Spieltag } from './typen'

/** Baut die `fragen_2027.json`-Struktur für den Serien-Modus (ein Monat).
 *  Nur sinnvoll für Spiele mit Antwortformat „zwei Antworten mit Endziffer".
 *  Fehlende Fragen bleiben leer, der Rahmen zeigt sie als Platzhalter.
 */
export function kampagneZuFragen(kampagne: Kampagne, spieltage: Spieltag[]): Fragen {
  const tage: SerieSpieltag[] = spieltage
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map((s): SerieSpieltag => ({
      tag: s.nr,
      datum: s.datum,
      label: dateLabel(s.datum),
      frage: s.raetsel.frage ?? '',
      a1: s.raetsel.a1 ?? '',
      a2: s.raetsel.a2 ?? '',
      richtig: s.raetsel.richtig ?? 1,
    }))
  return { [kampagne.monat]: tage }
}

/** Baut die `Inhalt`-Liste, die Spieldefinitionen für ihre Rätsel brauchen. */
export function kampagneZuInhalten(_kampagne: Kampagne, spieltage: Spieltag[]): Inhalt[] {
  return spieltage
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map((s): Inhalt => ({
      tag: s.nr,
      datum: s.datum,
      label: dateLabel(s.datum),
      frage: s.raetsel.frage ?? '',
      a1: s.raetsel.a1,
      a2: s.raetsel.a2,
      richtig: s.raetsel.richtig,
      loesung: s.raetsel.loesung,
      daten: s.raetsel.daten,
      muster: false,
    }))
}

function dateLabel(datum: string): string {
  const d = new Date(datum + 'T12:00:00')
  const tag = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][d.getDay()]
  const monat = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][d.getMonth()]
  return `${tag}, ${d.getDate()}. ${monat}`
}

/** Gewinner eines Cockpit-Spieltags in den Serien-Modus spiegeln (Store `serienGewinner`), damit Name,
 *  Ort, Betrag, Foto und Zusatztext in den Anzeigen erscheinen. Nur Gewinner mit Name UND Einwilligung.
 *  Einträge tragen die ID `cockpit:<spieltagId>:<gewinnerId>` und werden bei jeder Änderung ersetzt. */
export async function gewinnerNachSerie(kampagne: Kampagne, spieltag: Spieltag): Promise<number> {
  const { serienGewinnerLaden, serienGewinnerLoeschen, serienGewinnerSpeichern } = await import('./daten-client')
  const monat = spieltag.datum.slice(0, 7)
  const praefix = `cockpit:${spieltag.id}:`
  for (const alt of await serienGewinnerLaden(kampagne.spielId, monat)) {
    if (alt.id.startsWith(praefix)) await serienGewinnerLoeschen(alt.id)
  }
  let n = 0
  for (const g of spieltag.gewinner) {
    if (!g.name.trim() || !g.einwilligung) continue
    await serienGewinnerSpeichern({
      id: praefix + g.id,
      spielId: kampagne.spielId,
      monat,
      tag: spieltag.nr,
      zeitungen: [],
      name: g.name.trim(),
      ort: g.ort.trim(),
      betrag: `${g.betrag.toLocaleString('de-DE')} €`,
      text: g.gewinnertext.trim(),
      fotoHash: g.fotoHash,
      erstelltAm: Date.now(),
    })
    n++
  }
  return n
}
