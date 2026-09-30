// Client-Helpers für Voice + SFX + Sprechtext-Check (Regel „nicht ablesen").

import { aktionSpeichern, assetLaden, assetSpeichern } from './db'
import type { Storyboard, VoiceoverInfo, WortZeit } from './video-types'

export type TtsAntwort = {
  ok: boolean
  audioBase64?: string
  mimeType?: string
  voiceId?: string
  dauerSekunden?: number
  wortzeiten?: WortZeit[]
  fehler?: string
}

async function base64ZuBlob(b64: string, mime: string): Promise<Blob> {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function ttsAufrufen(args: {
  jobId?: string
  text: string
  voiceId?: string
}): Promise<TtsAntwort> {
  const antwortRaw = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: args.text, voiceId: args.voiceId }),
  })
  const daten = (await antwortRaw.json().catch(() => ({}))) as Record<string, unknown>
  const antwort: TtsAntwort = {
    ok: antwortRaw.ok && (daten.ok as boolean | undefined) !== false,
    audioBase64: daten.audioBase64 as string | undefined,
    mimeType: (daten.mimeType as string) || 'audio/mpeg',
    voiceId: daten.voiceId as string | undefined,
    dauerSekunden: daten.dauerSekunden as number | undefined,
    wortzeiten: daten.wortzeiten as WortZeit[] | undefined,
    fehler: (daten.fehler as string | undefined) || (antwortRaw.ok ? undefined : antwortRaw.statusText),
  }
  await aktionSpeichern({
    id: crypto.randomUUID(),
    jobId: args.jobId,
    route: '/api/tts',
    prompt: args.text.slice(0, 400),
    antwortKurz: antwort.dauerSekunden ? `${antwort.dauerSekunden.toFixed(2)}s` : undefined,
    fehler: antwort.fehler,
    zeitpunkt: Date.now(),
  })
  return antwort
}

export async function ttsAlsAsset(text: string, voiceId?: string, jobId?: string): Promise<{ info?: VoiceoverInfo; fehler?: string }> {
  const antwort = await ttsAufrufen({ jobId, text, voiceId })
  if (!antwort.ok || !antwort.audioBase64) return { fehler: antwort.fehler }
  const blob = await base64ZuBlob(antwort.audioBase64, antwort.mimeType || 'audio/mpeg')
  const hash = await assetSpeichern(blob)
  return {
    info: {
      voiceId: antwort.voiceId || voiceId || '',
      voiceName: '',
      text,
      assetHash: hash,
      dauerSekunden: antwort.dauerSekunden,
      wortzeiten: antwort.wortzeiten,
    },
  }
}

export async function sfxErzeugen(args: {
  prompt: string
  dauerSekunden?: number
  jobId?: string
}): Promise<{ hash?: string; fehler?: string }> {
  const antwortRaw = await fetch('/api/sfx', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: args.prompt, dauerSekunden: args.dauerSekunden ?? 2 }),
  })
  const daten = (await antwortRaw.json().catch(() => ({}))) as Record<string, unknown>
  if (!antwortRaw.ok || (daten.ok as boolean | undefined) === false || !daten.audioBase64) {
    await aktionSpeichern({
      id: crypto.randomUUID(),
      jobId: args.jobId,
      route: '/api/sfx',
      prompt: args.prompt.slice(0, 200),
      fehler: (daten.fehler as string) || antwortRaw.statusText,
      zeitpunkt: Date.now(),
    })
    return { fehler: (daten.fehler as string) || antwortRaw.statusText }
  }
  const blob = await base64ZuBlob(daten.audioBase64 as string, (daten.mimeType as string) || 'audio/mpeg')
  const hash = await assetSpeichern(blob)
  await aktionSpeichern({
    id: crypto.randomUUID(),
    jobId: args.jobId,
    route: '/api/sfx',
    prompt: args.prompt.slice(0, 200),
    antwortKurz: `${args.dauerSekunden ?? 2}s`,
    zeitpunkt: Date.now(),
  })
  return { hash }
}

// Sprechtext-Assistent: prüft die Vorgabe „nicht ablesen" (max. 4 gemeinsame
// Wörter in Folge mit dem Folientext) und „jeder Satz nur einmal".
export type SprechtextPruefung = {
  ok: boolean
  hinweise: string[]
  laengeSekundenGeschaetzt: number
}

function woerter(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function sprechtextPruefen(sprechtext: string, folientexte: string[], zielSekunden: number): SprechtextPruefung {
  const hinweise: string[] = []

  // Zu viele Wörter in Folge mit dem Folientext?
  const sprecher = woerter(sprechtext)
  const alleFolientexte = folientexte.flatMap(woerter)
  let treffer = 0
  let maxTreffer = 0
  for (let i = 0; i < sprecher.length; i++) {
    if (alleFolientexte.includes(sprecher[i])) {
      treffer++
      if (treffer > maxTreffer) maxTreffer = treffer
    } else {
      treffer = 0
    }
  }
  if (maxTreffer > 4) {
    hinweise.push(`⚠ ${maxTreffer} Wörter am Stück identisch zum Folientext (max. 4 erlaubt).`)
  }

  // Jeder Satz nur einmal?
  const saetze = sprechtext.split(/[.!?]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
  const gesehen = new Set<string>()
  const doppelt = new Set<string>()
  for (const s of saetze) {
    if (gesehen.has(s)) doppelt.add(s)
    gesehen.add(s)
  }
  if (doppelt.size > 0) {
    hinweise.push(`⚠ ${doppelt.size} Satz/Sätze wiederholen sich.`)
  }

  // Längen-Schätzung (deutsches Hochdeutsch ≈ 150 Wörter/min = 2,5/s)
  const geschaetzt = sprecher.length / 2.5
  if (zielSekunden && geschaetzt > zielSekunden * 1.1) {
    hinweise.push(`⚠ Text ist zu lang (≈ ${Math.round(geschaetzt)} s, Ziel ${zielSekunden} s).`)
  } else if (zielSekunden && geschaetzt < zielSekunden * 0.5) {
    hinweise.push(`ℹ Text ist deutlich kürzer als das Ziel (≈ ${Math.round(geschaetzt)} s).`)
  }

  return {
    ok: hinweise.length === 0 || (!hinweise.some((h) => h.startsWith('⚠'))),
    hinweise,
    laengeSekundenGeschaetzt: geschaetzt,
  }
}

// ------------------- MP4 rendern (lokal, per /api/render-video) -------------------

export type RenderErgebnis = {
  ratio: string
  dateiname: string
  download: string
  bytes: number
}

export type RenderAntwort = {
  ok: boolean
  ergebnisse?: RenderErgebnis[]
  fehler?: string | Array<{ ratio: string; fehler: string }>
}

function hashesAusStoryboard(sb: Storyboard): string[] {
  const set = new Set<string>()
  for (const s of sb.szenen) {
    const anySz = s as unknown as Record<string, unknown>
    if (typeof anySz.logoAssetHash === 'string') set.add(anySz.logoAssetHash)
    if (typeof anySz.bildAssetHash === 'string') set.add(anySz.bildAssetHash)
    if (Array.isArray(anySz.bildAssetHashes)) {
      for (const h of anySz.bildAssetHashes as string[]) if (typeof h === 'string') set.add(h)
    }
  }
  if (sb.voiceover?.assetHash) set.add(sb.voiceover.assetHash)
  return Array.from(set)
}

async function blobZuBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  let bin = ''
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(bin)
}

export async function mp4Rendern(args: {
  storyboard: Storyboard
  seitenverhaeltnisse?: Array<'9:16' | '1:1' | '16:9'>
  dateiname?: string
  jobId?: string
}): Promise<RenderAntwort> {
  const hashes = hashesAusStoryboard(args.storyboard)
  const assets: Array<{ hash: string; mimeType: string; base64: string }> = []
  for (const hash of hashes) {
    const a = await assetLaden(hash)
    if (!a) continue
    const base64 = await blobZuBase64(a.blob)
    assets.push({ hash, mimeType: a.mimeType, base64 })
  }
  const antwortRaw = await fetch('/api/render-video', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      storyboard: args.storyboard,
      assets,
      seitenverhaeltnisse: args.seitenverhaeltnisse,
      dateiname: args.dateiname,
    }),
  })
  const daten = (await antwortRaw.json().catch(() => ({}))) as Record<string, unknown>
  const antwort: RenderAntwort = {
    ok: antwortRaw.ok && (daten.ok as boolean | undefined) !== false,
    ergebnisse: daten.ergebnisse as RenderErgebnis[] | undefined,
    fehler:
      (daten.fehler as string | Array<{ ratio: string; fehler: string }> | undefined) ||
      (antwortRaw.ok ? undefined : antwortRaw.statusText),
  }
  await aktionSpeichern({
    id: crypto.randomUUID(),
    jobId: args.jobId,
    route: '/api/render-video',
    prompt: `MP4 (${(args.seitenverhaeltnisse || ['9:16']).join(', ')})`,
    antwortKurz: antwort.ergebnisse ? antwort.ergebnisse.map((e) => `${e.ratio}=${Math.round(e.bytes / 1024)}kB`).join(' · ') : undefined,
    fehler: typeof antwort.fehler === 'string' ? antwort.fehler : undefined,
    zeitpunkt: Date.now(),
  })
  return antwort
}
