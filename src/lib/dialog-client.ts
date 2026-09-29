// Client-Bibliothek: fasst /api/dialog- und /api/analyze-template-Aufrufe zusammen
// und schreibt jede KI-Aktion in den Verlaufs-Store (Regel 8).

import { aktionSpeichern } from './db'
import type { Job, KIAktion, Richtung, VorlagenAnalyse } from './types'

export type DialogAntwort<T = Record<string, unknown>> = {
  ok: boolean
  daten?: T
  rohtext?: string
  modell?: string
  eingabeTokens?: number
  ausgabeTokens?: number
  kostenUsd?: number
  fehler?: string
}

async function aktionInVerlauf(
  jobId: string | undefined,
  route: string,
  prompt: string,
  antwort: DialogAntwort<unknown>,
): Promise<void> {
  const eintrag: KIAktion = {
    id: crypto.randomUUID(),
    jobId,
    route,
    modell: antwort.modell,
    prompt: prompt.slice(0, 400),
    antwortKurz:
      antwort.daten !== undefined
        ? JSON.stringify(antwort.daten).slice(0, 400)
        : (antwort.rohtext || antwort.fehler || '').slice(0, 400),
    eingabeTokens: antwort.eingabeTokens,
    ausgabeTokens: antwort.ausgabeTokens,
    kostenUsd: antwort.kostenUsd,
    fehler: antwort.fehler,
    zeitpunkt: Date.now(),
  }
  try {
    await aktionSpeichern(eintrag)
  } catch {
    // Der Verlauf ist ein „nice to have"; nie den eigentlichen Aufruf blockieren.
  }
}

export type EinstiegAntwort = {
  einstieg: 'A-ohne-vorstellung' | 'B-vorstellung-im-kopf' | 'C-vorlage' | 'nachfrage'
  kanal: string | null
  vermutetesZiel: string
  naechsteFrage: string
  begruendung?: string
}

export type BriefingAntwort = {
  abgeschlossen: boolean
  naechsteFrage: string
  zusammenfassung?: string
  empfohlenerKanal?: string | null
}

export type RichtungenAntwort = { richtungen: Richtung[] }

export type SchrittplanAntwort = {
  schritte: { id: string; titel: string; beschreibung?: string }[]
}

export type MCFragenAntwort = {
  fragen: { id: string; frage: string; optionen: string[] }[]
}

export type EditorBefehlAntwort = {
  operationen: Array<Record<string, unknown>>
  kommentar?: string
}

export type DialogAktion =
  | 'einstieg-erkennen'
  | 'briefing-frage'
  | 'drei-richtungen'
  | 'schrittplan'
  | 'mc-vorlage'
  | 'editor-befehl'

export async function dialogAufrufen<T>(
  aktion: DialogAktion,
  args: {
    jobId?: string
    sprache?: 'de' | 'en'
    nutzerText?: string
    jobKontext?: Record<string, unknown>
    historie?: { rolle: 'nutzer' | 'ki'; text: string }[]
  },
): Promise<DialogAntwort<T>> {
  const antwortRaw = await fetch('/api/dialog', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      aktion,
      sprache: args.sprache,
      nutzerText: args.nutzerText,
      jobKontext: args.jobKontext,
      historie: args.historie,
    }),
  })

  const daten = (await antwortRaw.json().catch(() => ({}))) as Record<string, unknown>
  const antwort: DialogAntwort<T> = {
    ok: antwortRaw.ok && (daten.ok as boolean | undefined) !== false,
    daten: daten.daten as T | undefined,
    rohtext: daten.rohtext as string | undefined,
    modell: daten.modell as string | undefined,
    eingabeTokens: daten.eingabeTokens as number | undefined,
    ausgabeTokens: daten.ausgabeTokens as number | undefined,
    kostenUsd: daten.kostenUsd as number | undefined,
    fehler: (daten.fehler as string | undefined) || (antwortRaw.ok ? undefined : antwortRaw.statusText),
  }

  await aktionInVerlauf(args.jobId, '/api/dialog', args.nutzerText || aktion, antwort)
  return antwort
}

export async function vorlageAnalysieren(args: {
  jobId?: string
  base64: string
  mediaType: string
  sprache?: 'de' | 'en'
}): Promise<DialogAntwort<VorlagenAnalyse>> {
  const antwortRaw = await fetch('/api/analyze-template', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      base64: args.base64,
      mediaType: args.mediaType,
      sprache: args.sprache,
    }),
  })

  const daten = (await antwortRaw.json().catch(() => ({}))) as Record<string, unknown>
  const antwort: DialogAntwort<VorlagenAnalyse> = {
    ok: antwortRaw.ok && (daten.ok as boolean | undefined) !== false,
    daten: daten.analyse as VorlagenAnalyse | undefined,
    rohtext: daten.rohtext as string | undefined,
    modell: daten.modell as string | undefined,
    eingabeTokens: daten.eingabeTokens as number | undefined,
    ausgabeTokens: daten.ausgabeTokens as number | undefined,
    kostenUsd: daten.kostenUsd as number | undefined,
    fehler: (daten.fehler as string | undefined) || (antwortRaw.ok ? undefined : antwortRaw.statusText),
  }

  await aktionInVerlauf(args.jobId, '/api/analyze-template', 'Vorlagen-Bild', antwort)
  return antwort
}

// ------------------ Bild-Erzeugung ------------------

export type BildAntwort = {
  ok: boolean
  dataUrl?: string
  modell?: string
  stilLabel?: string
  orientierung?: string
  kostenUsd?: number
  sanitizationHinweis?: string | null
  fehler?: string
}

export async function bildErzeugen(args: {
  jobId?: string
  motiv?: string
  stil?: string
  prompt?: string
  orientierung?: 'landscape' | 'portrait' | 'square'
}): Promise<BildAntwort> {
  const antwortRaw = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  })
  const daten = (await antwortRaw.json().catch(() => ({}))) as Record<string, unknown>
  const antwort: BildAntwort = {
    ok: antwortRaw.ok && (daten.ok as boolean | undefined) !== false,
    dataUrl: daten.dataUrl as string | undefined,
    modell: daten.modell as string | undefined,
    stilLabel: daten.stilLabel as string | undefined,
    orientierung: daten.orientierung as string | undefined,
    kostenUsd: daten.kostenUsd as number | undefined,
    sanitizationHinweis: daten.sanitizationHinweis as string | null | undefined,
    fehler: (daten.fehler as string | undefined) || (antwortRaw.ok ? undefined : antwortRaw.statusText),
  }
  await aktionInVerlauf(
    args.jobId,
    '/api/generate-image',
    (args.motiv || args.prompt || '').slice(0, 400),
    { ...antwort, daten: antwort.dataUrl ? { modell: antwort.modell } : undefined },
  )
  return antwort
}

// ------------------ Text-Erzeugung ------------------

export type CopyAntwort = {
  ok: boolean
  slot?: string
  varianten?: string[]
  begruendung?: string
  rohtext?: string
  modell?: string
  eingabeTokens?: number
  ausgabeTokens?: number
  kostenUsd?: number
  fehler?: string
}

export async function copyErzeugen(args: {
  jobId?: string
  slot: 'headline' | 'subline' | 'cta' | 'body' | 'caption' | 'hashtags'
  briefing?: string
  ziel?: string
  kanal?: string
  ton?: 'nuechtern' | 'frech' | 'seriös' | 'werblich' | 'empathisch'
  sprache?: 'de' | 'en'
  laenge?: 'kurz' | 'mittel' | 'lang'
  anzahl?: number
}): Promise<CopyAntwort> {
  const antwortRaw = await fetch('/api/generate-copy', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  })
  const daten = (await antwortRaw.json().catch(() => ({}))) as Record<string, unknown>
  const antwort: CopyAntwort = {
    ok: antwortRaw.ok && (daten.ok as boolean | undefined) !== false,
    slot: daten.slot as string | undefined,
    varianten: (daten.varianten as string[] | undefined) || [],
    begruendung: daten.begruendung as string | undefined,
    rohtext: daten.rohtext as string | undefined,
    modell: daten.modell as string | undefined,
    eingabeTokens: daten.eingabeTokens as number | undefined,
    ausgabeTokens: daten.ausgabeTokens as number | undefined,
    kostenUsd: daten.kostenUsd as number | undefined,
    fehler: (daten.fehler as string | undefined) || (antwortRaw.ok ? undefined : antwortRaw.statusText),
  }
  await aktionInVerlauf(args.jobId, '/api/generate-copy', `${args.slot}: ${args.briefing || args.ziel || ''}`, {
    ok: antwort.ok,
    daten: antwort.varianten,
    modell: antwort.modell,
    eingabeTokens: antwort.eingabeTokens,
    ausgabeTokens: antwort.ausgabeTokens,
    kostenUsd: antwort.kostenUsd,
    fehler: antwort.fehler,
  })
  return antwort
}

// Reduzierte Job-Zusammenfassung für den Prompt (spart Tokens, behält relevante Felder)
export function jobFuerPrompt(job: Job): Record<string, unknown> {
  return {
    id: job.id,
    titel: job.titel,
    ziel: job.ziel,
    kanal: job.kanal,
    einstieg: job.einstieg,
    briefing: job.briefing.map((b) => ({
      frage: b.frage,
      antwort: b.antwort,
    })),
    gewaehlteRichtung: job.gewaehlteRichtung,
    schrittplan: job.schrittplan.map((s) => ({ titel: s.titel, status: s.status })),
    vorlagenAnalyse: job.vorlagenAnalyse,
  }
}
