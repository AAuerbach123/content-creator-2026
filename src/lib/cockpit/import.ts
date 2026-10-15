// Import bestehender Serien-Daten (public/serie/*.json) als Cockpit-Kampagne.
// Erlaubt es, das Cockpit sofort mit echten Daten (Geldregen Nov/Dez 2027) zu testen.

import type { Fragen, SerienDaten, Spieltag as SerieSpieltag } from '../serie/types'
import type { Kampagne, Spieltag, SpieltagStatus } from './typen'
import { stammAnwenden, stammLaden } from './zeitungen-stamm'

export type ImportQuellen = { daten: SerienDaten; fragen: Fragen }

export async function quellenLaden(): Promise<ImportQuellen> {
  const [z, f] = await Promise.all([
    fetch('/serie/zeitungen.json').then((r) => r.json()),
    fetch('/serie/fragen_2027.json').then((r) => r.json()),
  ])
  const daten = await stammAnwenden(z as SerienDaten, 'geldregen')
  // Teilnehmende Zeitungen aus der hochgeladenen Liste (Cockpit → Zeitungen & Rufnummern); fehlt = alle
  const st = await stammLaden('geldregen')
  const teil = st?.teilnehmer?.length ? { ...daten, zeitungen: daten.zeitungen.filter((x) => st.teilnehmer!.includes(x.id)) } : daten
  return { daten: teil, fragen: f as Fragen }
}

/** Erstellt eine Geldregen-Kampagne für einen Monat aus dem freigegebenen JSON. */
export function geldregenImportieren(quellen: ImportQuellen, monat: string, verlagsIds: string[]): { kampagne: Kampagne; spieltage: Spieltag[] } | null {
  const tage = quellen.fragen[monat]
  if (!Array.isArray(tage)) return null
  const now = Date.now()
  const kampagneId = crypto.randomUUID()
  const kampagne: Kampagne = {
    id: kampagneId,
    spielId: 'geldregen',
    monat,
    verlage: verlagsIds.length > 0 ? verlagsIds : quellen.daten.zeitungen.map((z) => z.id),
    modell: 'RSP',
    preise: {
      art: 'geldpakete',
      stufen: [
        { anzahl: 1, betrag: 10000, hotlineEndziffer: 1 },
        { anzahl: 1, betrag: 2500, hotlineEndziffer: 2 },
        { anzahl: 1, betrag: 1000, hotlineEndziffer: 1 },
        { anzahl: 2, betrag: 500, hotlineEndziffer: 2 },
        { anzahl: 4, betrag: 250, hotlineEndziffer: 1 },
        { anzahl: 8, betrag: 100, hotlineEndziffer: 2 },
      ],
    },
    antwortformat: 'zwei-endziffer',
    spielSpezifisch: {},
    erstelltAm: now,
    aktualisiertAm: now,
  }
  const spieltage: Spieltag[] = (tage as SerieSpieltag[]).map((t): Spieltag => ({
    id: crypto.randomUUID(),
    kampagneId,
    nr: t.tag,
    datum: t.datum,
    raetsel: {
      frage: t.frage,
      a1: t.a1,
      a2: t.a2,
      richtig: t.richtig,
    },
    gewinner: [],
    status: raetselVollstaendig(t) ? ('gewinner-fehlen' as SpieltagStatus) : ('raetsel-fehlt' as SpieltagStatus),
    erstelltAm: now,
    aktualisiertAm: now,
  }))
  return { kampagne, spieltage }
}

function raetselVollstaendig(t: SerieSpieltag): boolean {
  return Boolean(t.frage && t.a1 && t.a2 && (t.richtig === 1 || t.richtig === 2))
}

// ------------------------------------------------------------------ Geldregen November + Dezember 2027 (durchgehend)

export const GELDREGEN_NOV_DEZ_ID = 'geldregen-2027-11-12'

/**
 * Stellt sicher, dass die durchgehende Geldregen-Kampagne Nov+Dez 2027 im Cockpit existiert
 * (53 Spieltage aus fragen_2027.json, Fragen inkl. Antworten). Feste IDs → kein Doppel-Anlegen.
 * Liefert true, wenn sie neu angelegt wurde.
 */
export async function geldregenNovDezSicherstellen(): Promise<boolean> {
  const dc = await import('./daten-client')
  if (await dc.kampagneLaden(GELDREGEN_NOV_DEZ_ID).catch(() => undefined)) return false
  const vorhanden = await dc.kampagneFuerSpiel('geldregen').catch(() => [])
  if (vorhanden.some((k) => k.monat.startsWith('2027-11') || k.monatBis === '2027-12')) return false
  const q = await quellenLaden()
  const nov = geldregenImportieren(q, '2027-11', [])
  const dez = geldregenImportieren(q, '2027-12', [])
  if (!nov || !dez) return false
  const now = Date.now()
  const kampagne: Kampagne = { ...nov.kampagne, id: GELDREGEN_NOV_DEZ_ID, monat: '2027-11', monatBis: '2027-12', erstelltAm: now, aktualisiertAm: now }
  await dc.kampagneSpeichern(kampagne)
  for (const s of [...nov.spieltage, ...dez.spieltage]) {
    await dc.spieltagSpeichern({ ...s, id: `${GELDREGEN_NOV_DEZ_ID}-t${String(s.nr).padStart(2, '0')}`, kampagneId: GELDREGEN_NOV_DEZ_ID })
  }
  return true
}
