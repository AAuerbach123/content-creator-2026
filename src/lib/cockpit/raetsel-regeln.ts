// Prüfregeln je Spielkonzept für den Cockpit-Rätsel-Editor. Jede Raute aus den
// Flowcharts (Seiten 2–10) wird hier zu einer automatischen oder manuellen Prüfung.
// Ausgabe: Liste Klartext-Fehler (DE). Bei Erweiterung EN gleich mitpflegen.

import type { Kampagne, Spieltag } from './typen'

export type ZusatzEingabe = { quelle?: string }

export type Regeln = {
  pruefe: (spieltag: Spieltag | undefined, alle: Spieltag[], kampagne: Kampagne, zusatz?: ZusatzEingabe) => string[]
}

const basis: Regeln = {
  pruefe(spieltag) {
    if (!spieltag) return []
    const fehler: string[] = []
    const r = spieltag.raetsel
    if (!r.frage || r.frage.trim().length < 3) fehler.push('Frage/Aufgabe fehlt.')
    return fehler
  },
}

const geldregen: Regeln = {
  pruefe(spieltag, alle, _kampagne, zusatz) {
    if (!spieltag) return []
    const fehler = basis.pruefe(spieltag, alle, _kampagne, zusatz)
    const r = spieltag.raetsel
    if (!r.a1 || !r.a2) fehler.push('Beide Antworten (Endziffer 1 / 2) sind Pflicht.')
    if (r.richtig !== 1 && r.richtig !== 2) fehler.push('Richtige Antwort fehlt.')
    if (!zusatz?.quelle || zusatz.quelle.trim().length < 3) fehler.push('Quelle für den Faktencheck fehlt (Flowchart Seite 4 Pflicht).')
    // Doppelte Frage in derselben Kampagne
    const text = (r.frage ?? '').trim().toLowerCase()
    const doppelt = alle.filter((s) => s.id !== spieltag.id && (s.raetsel.frage ?? '').trim().toLowerCase() === text && text !== '').length
    if (doppelt > 0) fehler.push('Diese Frage kommt bereits an einem anderen Spieltag vor.')
    return fehler
  },
}

const aus2mach1: Regeln = {
  pruefe(spieltag, alle, _kampagne, zusatz) {
    if (!spieltag) return []
    const fehler = basis.pruefe(spieltag, alle, _kampagne, zusatz)
    const r = spieltag.raetsel
    if (!r.loesung || r.loesung.length < 4) fehler.push('Lösungswort fehlt oder ist zu kurz.')
    // Begriffspaare erwartet; bei Muster-Platzhalter nur Hinweis
    const d = r.daten as { begriffA?: string; begriffB?: string } | undefined
    if (!d?.begriffA || !d?.begriffB) fehler.push('Zwei Begriffe für die Bildidee fehlen (ergibt zusammen das Lösungswort).')
    return fehler
  },
}

const fehlerjagd: Regeln = {
  pruefe(spieltag) {
    if (!spieltag) return []
    const fehler = basis.pruefe(spieltag, [], {} as Kampagne)
    const d = spieltag.raetsel.daten as { anzahl?: number } | undefined
    if (!d || !d.anzahl || d.anzahl < 1 || d.anzahl > 15) fehler.push('Anzahl der Unterschiede fehlt (üblich 5 oder 7).')
    return fehler
  },
}

const bruecke: Regeln = {
  pruefe(spieltag) {
    if (!spieltag) return []
    const fehler = basis.pruefe(spieltag, [], {} as Kampagne)
    if (!spieltag.raetsel.loesung) fehler.push('Lösungswort fehlt.')
    const d = spieltag.raetsel.daten as { paare?: Array<{ links: string; rechts: string; bruecke: string }> } | undefined
    if (!d?.paare || d.paare.length < 3) fehler.push('Mindestens 3 Wortpaare + Brückenwort nötig.')
    return fehler
  },
}

const kombi: Regeln = {
  pruefe(spieltag) {
    if (!spieltag) return []
    const fehler = basis.pruefe(spieltag, [], {} as Kampagne)
    if (!spieltag.raetsel.loesung) fehler.push('Zusammengesetztes Wort fehlt.')
    return fehler
  },
}

const juli: Regeln = {
  pruefe(spieltag) {
    if (!spieltag) return []
    const fehler = basis.pruefe(spieltag, [], {} as Kampagne)
    const r = spieltag.raetsel
    if (!r.a1 || !r.a2) fehler.push('Zwei Antworten (Endziffer 1 / 2) sind Pflicht.')
    if (r.richtig !== 1 && r.richtig !== 2) fehler.push('Richtige Antwort fehlt.')
    return fehler
  },
}

const gitter: Regeln = {
  pruefe(spieltag) {
    if (!spieltag) return []
    const fehler = basis.pruefe(spieltag, [], {} as Kampagne)
    const d = spieltag.raetsel.daten as { woerter?: string[]; loesung?: string } | undefined
    if (!d?.woerter || d.woerter.length < 6) fehler.push('Mindestens 6 Wörter für das Gitter nötig.')
    if (!d?.loesung) fehler.push('Lösungswort (ergibt sich aus den Lösungsfeldern) fehlt.')
    return fehler
  },
}

const kreuzquer: Regeln = {
  pruefe(spieltag) {
    if (!spieltag) return []
    const fehler = basis.pruefe(spieltag, [], {} as Kampagne)
    if (!spieltag.raetsel.loesung) fehler.push('Lösungswort fehlt.')
    return fehler
  },
}

const REGISTRY: Record<string, Regeln> = {
  geldregen,
  aus2mach1,
  fehlerjagd,
  brueckenraetsel: bruecke,
  kombinieren: kombi,
  sommerPostkarte: juli,
  wahrOderErfunden: juli,
  sprichwortRaetsel: juli,
  schattenraetsel: juli,
  gitterraetsel: gitter,
  'kreuz-quer-april': kreuzquer,
  'kreuz-quer-oktober': kreuzquer,
}

export function pruefRegelnFuer(spielId: string): Regeln {
  return REGISTRY[spielId] ?? basis
}
