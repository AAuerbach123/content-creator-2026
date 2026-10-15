// Ampel je Spieltag + Tagesfristen (LOOP-Cockpit-Ausbau-Team.md, Phase 3 – Vorschläge 1, 2, 5).
//
// Arbeitsweise (Flowchart „Ablauf 2: Spieltag“): Die Anzeige eines Spieltags wird am Werktag davor
// fertiggestellt – Gewinner vom Vortag anrufen (bis 11:00), Foto (bis 14:00), Freigabe (Deadline).
// „Heute zu tun“ = je laufender Kampagne der nächste noch nicht freigegebene Spieltag ab morgen
// plus alle überfälligen (Datum ≤ heute, nicht freigegeben).

import { STANDARD_FRISTEN, type Kampagne, type Spieltag, type VerlagsStatus } from './typen'

export type Punkt = { schluessel: string; ok: boolean; teil?: boolean; textDe: string; textEn: string; phase: number }

export type Ampel = {
  farbe: 'gruen' | 'gelb' | 'rot' | 'grau'
  punkte: Punkt[]
  offen: number
}

function raetselOk(k: Kampagne, s: Spieltag): boolean {
  const r = s.raetsel ?? {}
  if (k.antwortformat === 'zwei-endziffer') return Boolean(r.frage?.trim() && r.a1?.trim() && r.a2?.trim())
  return Boolean(r.frage?.trim() || r.loesung?.trim() || (r.daten && Object.keys(r.daten).length))
}

export function spieltagAmpel(k: Kampagne, s: Spieltag, verlagsGruppen: string[] = []): Ampel {
  const punkte: Punkt[] = []
  punkte.push({ schluessel: 'raetsel', ok: raetselOk(k, s), textDe: 'Rätsel', textEn: 'Puzzle', phase: 2 })
  if (s.nr > 1) {
    const g = s.gewinner ?? []
    const mitName = g.filter((x) => x.name.trim()).length
    const fotos = g.filter((x) => x.fotoHash).length
    const einw = g.filter((x) => x.einwilligung).length
    punkte.push({ schluessel: 'gewinner', ok: mitName > 0, textDe: `Gewinner ${mitName}`, textEn: `Winners ${mitName}`, phase: 3 })
    punkte.push({ schluessel: 'fotos', ok: g.length > 0 && fotos === g.length, teil: fotos > 0 && fotos < g.length, textDe: `Fotos ${fotos}/${g.length}`, textEn: `Photos ${fotos}/${g.length}`, phase: 3 })
    punkte.push({ schluessel: 'einwilligung', ok: g.length > 0 && einw === g.length, teil: einw > 0 && einw < g.length, textDe: `Einwilligung ${einw}/${g.length}`, textEn: `Consent ${einw}/${g.length}`, phase: 3 })
  }
  if (s.pruefung) {
    punkte.push({ schluessel: 'pruefung', ok: s.pruefung.fehler === 0, textDe: s.pruefung.fehler ? `Prüfung: ${s.pruefung.fehler} Fehler` : 'Prüfung ✓', textEn: s.pruefung.fehler ? `Check: ${s.pruefung.fehler} errors` : 'Check ✓', phase: 4 })
  }
  punkte.push({ schluessel: 'freigabe', ok: s.status === 'freigegeben', textDe: 'Freigabe', textEn: 'Approval', phase: 4 })
  if (verlagsGruppen.length) {
    const vs = s.verlagsStatus ?? {}
    const okN = verlagsGruppen.filter((g) => vs[g] === 'verlag-ok').length
    const fehlerN = verlagsGruppen.filter((g) => vs[g] === 'verlag-fehler').length
    punkte.push({
      schluessel: 'verlage', ok: okN === verlagsGruppen.length, teil: okN > 0 && okN < verlagsGruppen.length,
      textDe: fehlerN ? `Verlage: ${fehlerN} Korrektur` : `Verlage ${okN}/${verlagsGruppen.length}`,
      textEn: fehlerN ? `Publishers: ${fehlerN} correction` : `Publishers ${okN}/${verlagsGruppen.length}`, phase: 4,
    })
  }
  const offen = punkte.filter((p) => !p.ok).length
  const verlagFehler = Object.values(s.verlagsStatus ?? {}).includes('verlag-fehler' as VerlagsStatus)
  const farbe: Ampel['farbe'] = s.status === 'fehler' || verlagFehler || (s.pruefung && s.pruefung.fehler > 0)
    ? 'rot'
    : offen === 0 ? 'gruen' : punkte.some((p) => p.ok || p.teil) ? 'gelb' : 'grau'
  return { farbe, punkte, offen }
}

// ------------------------------------------------------------------ Datum / Fristen

export const heuteIso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Spieltage, an denen heute gearbeitet werden muss: überfällige + nächster offener ab morgen. */
/** Offen = noch nicht freigegeben ODER ein Verlag hat im Kundenportal eine Korrektur gemeldet. */
export function istOffen(s: Spieltag): boolean {
  return s.status !== 'freigegeben' || Object.values(s.verlagsStatus ?? {}).includes('verlag-fehler')
}

export function heuteZuTun(spieltage: Spieltag[], heute = heuteIso()): { ueberfaellig: Spieltag[]; naechster?: Spieltag; korrekturen: Spieltag[] } {
  const sortiert = [...spieltage].sort((a, b) => a.datum.localeCompare(b.datum))
  const ueberfaellig = sortiert.filter((s) => s.datum <= heute && istOffen(s))
  const naechster = sortiert.find((s) => s.datum > heute && istOffen(s))
  // spätere Spieltage mit Kundenkorrektur zusätzlich zeigen
  const korrekturen = sortiert.filter((s) => s.datum > heute && s !== naechster && Object.values(s.verlagsStatus ?? {}).includes('verlag-fehler'))
  return { ueberfaellig, naechster, korrekturen }
}

export type Frist = { art: 'anruf' | 'foto' | 'deadline'; zeit: Date; erledigt: boolean }

function zeitHeute(hhmm: string, basis = new Date()): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(basis)
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

/** Heutige Fristen für die Arbeit am Spieltag s (nur relevante, mit Erledigt-Status). */
export function fristenFuer(k: Kampagne, s: Spieltag, jetzt = new Date()): Frist[] {
  const f = { ...STANDARD_FRISTEN, ...(k.fristen ?? {}) }
  const g = s.gewinner ?? []
  const out: Frist[] = []
  if (s.nr > 1) {
    out.push({ art: 'anruf', zeit: zeitHeute(f.anruf, jetzt), erledigt: g.some((x) => x.name.trim()) })
    out.push({ art: 'foto', zeit: zeitHeute(f.foto, jetzt), erledigt: g.length > 0 && g.every((x) => x.fotoHash) })
  }
  // Deadline: aus monday (Projektplan, je Spieltag mit Datum+Zeit) – sonst Tageszeit aus den Kampagnen-Fristen
  if (s.deadline && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s.deadline)) out.push({ art: 'deadline', zeit: new Date(s.deadline), erledigt: s.status === 'freigegeben' })
  else if (f.deadline) out.push({ art: 'deadline', zeit: zeitHeute(f.deadline, jetzt), erledigt: s.status === 'freigegeben' })
  return out
}

/** Text + Farbe für einen Countdown. */
export function countdown(zeit: Date, erledigt: boolean, de: boolean, jetzt = new Date()): { text: string; farbe: 'gruen' | 'grau' | 'gelb' | 'rot' } {
  if (erledigt) return { text: de ? 'erledigt' : 'done', farbe: 'gruen' }
  const min = Math.round((zeit.getTime() - jetzt.getTime()) / 60000)
  const dauer = (m: number) => {
    if (m >= 48 * 60) { const t = Math.round(m / 1440); return de ? `${t} Tage` : `${t} days` }
    return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`
  }
  if (min < 0) return { text: de ? `überfällig seit ${dauer(-min)}` : `overdue by ${dauer(-min)}`, farbe: 'rot' }
  if (min <= 30) return { text: de ? `noch ${dauer(min)}` : `${dauer(min)} left`, farbe: 'gelb' }
  return { text: de ? `noch ${dauer(min)}` : `${dauer(min)} left`, farbe: 'grau' }
}

export const FRIST_TEXT = {
  anruf: { de: 'Gewinner anrufen', en: 'Call winners' },
  foto: { de: 'Fotos da', en: 'Photos in' },
  deadline: { de: 'Freigabe', en: 'Approval' },
} as const

export function datumLang(iso: string, de: boolean): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString(de ? 'de-DE' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ------------------------------------------------------------------ Gewinnplan (Vorschlag 5)

/** Prüft die erfassten Gewinner eines Spieltags gegen den Gewinnplan der Kampagne. Liefert Fehlermeldungen (DE). */
export function gewinnplanPruefen(k: Kampagne, s: Spieltag): { summe: number; maxSumme: number | null; fehler: string[] } {
  const g = (s.gewinner ?? []).filter((x) => x.name.trim())
  const summe = g.reduce((a, x) => a + (x.betrag || 0), 0)
  const fehler: string[] = []
  if (k.preise.art === 'geldpakete') {
    const max = k.preise.stufen.reduce((a, st) => a + st.anzahl * st.betrag, 0)
    for (const st of k.preise.stufen) {
      const n = g.filter((x) => x.betrag === st.betrag).length
      if (n > st.anzahl) fehler.push(`${n} Gewinner mit ${st.betrag.toLocaleString('de-DE')} € – laut Gewinnplan höchstens ${st.anzahl} pro Spieltag.`)
    }
    const unbekannt = g.filter((x) => !k.preise.art || !(k.preise as { stufen: Array<{ betrag: number }> }).stufen.some((st) => st.betrag === x.betrag))
    if (unbekannt.length) fehler.push(`${unbekannt.length} Gewinner mit einem Betrag, der im Gewinnplan nicht vorkommt.`)
    return { summe, maxSumme: max, fehler }
  }
  if (k.preise.art === 'tagespreis') {
    const max = s.istSupermittwoch && k.preise.supermittwoch ? k.preise.supermittwoch : k.preise.tagespreis
    if (summe > max) fehler.push(`Gewinnsumme ${summe.toLocaleString('de-DE')} € übersteigt den Tagespreis (${max.toLocaleString('de-DE')} €).`)
    return { summe, maxSumme: max, fehler }
  }
  return { summe, maxSumme: null, fehler }
}
