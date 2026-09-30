// /api/render-video — rendert das echte Job-Storyboard lokal per Remotion (Node).
// Läuft NUR in `npm run dev` (bzw. `next start`) auf dem Mac, nicht auf Cloudflare
// Workers — der Worker hat keinen Chromium/Node-Zugriff für Rendering.
//
// Ablauf:
//  1. Client sendet Storyboard + Base64-Assets aus IndexedDB.
//  2. Server schreibt Assets nach `public/remotion/<hash>.<ext>` (dedupliziert per
//     Dateiname → Hash).
//  3. Hashes im Storyboard werden auf `url:/remotion/<hash>.<ext>` umgemappt.
//  4. Remotion bündelt `src/remotion/index.tsx` und rendert `Reel` je gewünschtem
//     Seitenverhältnis nach `public/renders/<name>-<ratio>.mp4`.
//  5. Antwort: Download-URLs (`/renders/…`), zusätzlich `out/`-Kopie.
//
// Deploy-Grenze: Auf Cloudflare Workers wird der Import von @remotion/bundler
// scheitern → wir fangen das ab und geben eine klare Fehlermeldung zurück.

import { NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'
import type { Storyboard } from '@/lib/video-types'
import { LIMITS } from '@/lib/eingabe-limit'

export const runtime = 'nodejs'
export const maxDuration = 600 // bis 10 min, falls Bundling + drei Renderings länger dauern

// Läuft nur lokal (Node-Runtime auf dem Mac). In Cloudflare Workers gibt es
// keine Chromium/Bundler-Umgebung — wir erkennen das an fehlendem `process.cwd`
// bzw. fehlender Node-Umgebung und schalten die Route online sauber ab.
function istLokaleNodeUmgebung(): boolean {
  try {
    return typeof process !== 'undefined' && typeof process.cwd === 'function' && !process.env.CF_PAGES && !process.env.CLOUDFLARE_WORKERS
  } catch {
    return false
  }
}

type Anfrage = {
  storyboard: Storyboard
  assets?: Array<{ hash: string; mimeType: string; base64: string }>
  seitenverhaeltnisse?: Array<'9:16' | '1:1' | '16:9'>
  dateiname?: string
}

const RATIO_MAP = {
  '9:16': { suffix: '9x16' },
  '1:1': { suffix: '1x1' },
  '16:9': { suffix: '16x9' },
} as const

function endungAusMime(mimeType: string): string {
  const m = (mimeType || '').toLowerCase()
  if (m.includes('png')) return 'png'
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg'
  if (m.includes('webp')) return 'webp'
  if (m.includes('svg')) return 'svg'
  if (m.includes('gif')) return 'gif'
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3'
  if (m.includes('wav')) return 'wav'
  if (m.includes('ogg')) return 'ogg'
  if (m.includes('mp4')) return 'mp4'
  return 'bin'
}

function safeDateiname(s: string | undefined, fallback: string): string {
  const roh = (s || fallback).trim() || fallback
  return roh.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 60) || fallback
}

function hashesAusStoryboard(sb: Storyboard): Set<string> {
  const set = new Set<string>()
  for (const s of sb.szenen) {
    if ('logoAssetHash' in s && s.logoAssetHash) set.add(s.logoAssetHash)
    if ('bildAssetHash' in s && s.bildAssetHash) set.add(s.bildAssetHash)
    if ('bildAssetHashes' in s && Array.isArray((s as { bildAssetHashes?: string[] }).bildAssetHashes)) {
      for (const h of (s as { bildAssetHashes: string[] }).bildAssetHashes) set.add(h)
    }
  }
  if (sb.voiceover?.assetHash) set.add(sb.voiceover.assetHash)
  return set
}

function storyboardMitUrls(sb: Storyboard, mapping: Record<string, string>): Storyboard {
  const kopie = JSON.parse(JSON.stringify(sb)) as Storyboard
  for (const s of kopie.szenen) {
    const anySz = s as unknown as Record<string, unknown>
    if (typeof anySz.logoAssetHash === 'string' && mapping[anySz.logoAssetHash]) {
      anySz.logoAssetHash = mapping[anySz.logoAssetHash]
    }
    if (typeof anySz.bildAssetHash === 'string' && mapping[anySz.bildAssetHash]) {
      anySz.bildAssetHash = mapping[anySz.bildAssetHash]
    }
    if (Array.isArray(anySz.bildAssetHashes)) {
      anySz.bildAssetHashes = (anySz.bildAssetHashes as string[]).map((h) => mapping[h] || h)
    }
  }
  if (kopie.voiceover?.assetHash && mapping[kopie.voiceover.assetHash]) {
    kopie.voiceover.assetHash = mapping[kopie.voiceover.assetHash]
  }
  return kopie
}

export async function POST(request: Request) {
  if (!istLokaleNodeUmgebung()) {
    return NextResponse.json(
      { fehler: 'Video-Rendern läuft nur lokal (npm run dev auf dem Mac), nicht auf Cloudflare Workers.' },
      { status: 501 },
    )
  }
  let body: Anfrage
  try {
    body = (await request.json()) as Anfrage
  } catch {
    return NextResponse.json({ fehler: 'Body ist kein gültiges JSON.' }, { status: 400 })
  }
  if (!body.storyboard || !Array.isArray(body.storyboard.szenen)) {
    return NextResponse.json({ fehler: 'Feld „storyboard" fehlt oder ist ungültig.' }, { status: 400 })
  }
  // Grösse der Base64-Assets prüfen (Regel: Uploadgrenzen).
  const gesamtBase64 = (body.assets || []).reduce((s, a) => s + (a.base64?.length || 0), 0)
  const gesamtBytes = Math.ceil(gesamtBase64 * 3 / 4)
  if (gesamtBytes > LIMITS.base64Gesamt) {
    return NextResponse.json(
      { fehler: `Assets zu gross (${Math.round(gesamtBytes / 1024 / 1024)} MB, max ${Math.round(LIMITS.base64Gesamt / 1024 / 1024)} MB).` },
      { status: 413 },
    )
  }
  for (const a of body.assets || []) {
    if (!a?.hash || typeof a.hash !== 'string' || !/^[a-f0-9]{16,}$/i.test(a.hash)) {
      return NextResponse.json({ fehler: `Asset-Hash ungültig: ${a?.hash}` }, { status: 400 })
    }
  }
  const ratios = body.seitenverhaeltnisse?.length ? body.seitenverhaeltnisse : ['9:16']

  // Remotion nur lazy laden — im Cloudflare-Worker-Bundle ist es nicht verfügbar.
  // Wichtig: den Modulnamen als String zusammensetzen, damit esbuild
  // (Next.js UND @opennextjs/cloudflare) das Modul NICHT statisch analysiert
  // und mit-bündelt. `@remotion/bundler` zieht `@rspack/binding` mit einer
  // nativen `.node`-Datei mit; das kann esbuild nicht laden.
  const remotionBundlerName = ['@remotion', 'bundler'].join('/')
  const remotionRendererName = ['@remotion', 'renderer'].join('/')
  let bundle:
    | ((opts: { entryPoint: string; publicDir?: string }) => Promise<string>)
    | undefined
  let selectComposition: unknown, renderMedia: unknown
  try {
    ;({ bundle } = (await import(remotionBundlerName)) as {
      bundle: (opts: { entryPoint: string; publicDir?: string }) => Promise<string>
    })
    ;({ selectComposition, renderMedia } = await import(remotionRendererName))
  } catch (e) {
    return NextResponse.json(
      {
        fehler:
          'Remotion-Renderer nicht verfügbar. Der Video-Export läuft nur lokal (npm run dev auf dem Mac), nicht in Cloudflare Workers. Detail: ' +
          (e instanceof Error ? e.message : String(e)),
      },
      { status: 500 },
    )
  }
  if (!bundle) {
    return NextResponse.json({ fehler: 'bundle() nicht ladbar.' }, { status: 500 })
  }

  const wurzel = process.cwd()
  const publicDir = path.join(wurzel, 'public')
  const publicRemotionDir = path.join(publicDir, 'remotion')
  const rendersDir = path.join(publicDir, 'renders')
  const outDir = path.join(wurzel, 'out')
  await fs.mkdir(publicRemotionDir, { recursive: true })
  await fs.mkdir(rendersDir, { recursive: true })
  await fs.mkdir(outDir, { recursive: true })

  // Assets in public/remotion ablegen (dedupliziert per Hash). Wir prüfen den
  // Storyboard-Bedarf und schreiben nur, was fehlt.
  const gebraucht = hashesAusStoryboard(body.storyboard)
  const mapping: Record<string, string> = {}
  const assetsMap = new Map<string, { mimeType: string; base64: string }>()
  for (const a of body.assets || []) assetsMap.set(a.hash, { mimeType: a.mimeType, base64: a.base64 })

  const fehlend: string[] = []
  for (const hash of gebraucht) {
    const daten = assetsMap.get(hash)
    if (!daten) {
      // Vielleicht liegt eine ältere Datei schon in public/remotion — dann OK.
      const kandidaten = ['png', 'jpg', 'webp', 'svg', 'mp3', 'wav', 'gif']
      let gefunden: string | null = null
      for (const ext of kandidaten) {
        try {
          await fs.access(path.join(publicRemotionDir, `${hash}.${ext}`))
          gefunden = `${hash}.${ext}`
          break
        } catch {}
      }
      if (gefunden) {
        mapping[hash] = `url:/remotion/${gefunden}`
      } else {
        fehlend.push(hash)
      }
      continue
    }
    const endung = endungAusMime(daten.mimeType)
    const dateiName = `${hash}.${endung}`
    const zielpfad = path.join(publicRemotionDir, dateiName)
    try {
      await fs.access(zielpfad)
    } catch {
      const bytes = Buffer.from(daten.base64, 'base64')
      await fs.writeFile(zielpfad, bytes)
    }
    mapping[hash] = `url:/remotion/${dateiName}`
  }

  if (fehlend.length) {
    return NextResponse.json(
      {
        fehler:
          'Fehlende Asset-Daten (Client muss Base64 mitschicken): ' +
          fehlend.slice(0, 5).join(', ') +
          (fehlend.length > 5 ? ` (+${fehlend.length - 5} weitere)` : ''),
      },
      { status: 400 },
    )
  }

  const dateibasis = safeDateiname(body.dateiname, 'reel')

  const entry = path.join(wurzel, 'src', 'remotion', 'index.tsx')

  let bundleLoc: string
  try {
    bundleLoc = await bundle({ entryPoint: entry, publicDir })
  } catch (e) {
    return NextResponse.json(
      { fehler: 'Bundle fehlgeschlagen: ' + (e instanceof Error ? e.message : String(e)) },
      { status: 500 },
    )
  }

  const selectFn = selectComposition as (opts: {
    serveUrl: string
    id: string
    inputProps: unknown
  }) => Promise<{ width: number; height: number; durationInFrames: number; fps: number }>
  const renderFn = renderMedia as (opts: {
    composition: unknown
    serveUrl: string
    codec: 'h264'
    outputLocation: string
    inputProps: unknown
  }) => Promise<unknown>

  const ergebnisse: Array<{ ratio: string; dateiname: string; download: string; bytes: number }> = []
  const fehlerRatio: Array<{ ratio: string; fehler: string }> = []
  for (const ratio of ratios) {
    const meta = RATIO_MAP[ratio as keyof typeof RATIO_MAP]
    if (!meta) continue
    const sbFuerRatio: Storyboard = { ...body.storyboard, seitenverhaeltnis: ratio as Storyboard['seitenverhaeltnis'] }
    const angepasst = storyboardMitUrls(sbFuerRatio, mapping)
    const inputProps = { storyboard: angepasst }
    try {
      const composition = await selectFn({ serveUrl: bundleLoc, id: 'Reel', inputProps })
      const zieldatei = `${dateibasis}-${meta.suffix}.mp4`
      const zielpfadPublic = path.join(rendersDir, zieldatei)
      await renderFn({
        composition,
        serveUrl: bundleLoc,
        codec: 'h264',
        outputLocation: zielpfadPublic,
        inputProps,
      })
      // Kopie in out/ (klassischer Remotion-Output)
      const outKopie = path.join(outDir, zieldatei)
      try {
        await fs.copyFile(zielpfadPublic, outKopie)
      } catch {}
      const stat = await fs.stat(zielpfadPublic)
      ergebnisse.push({
        ratio,
        dateiname: zieldatei,
        download: `/renders/${zieldatei}`,
        bytes: stat.size,
      })
    } catch (e) {
      fehlerRatio.push({ ratio, fehler: e instanceof Error ? e.message : String(e) })
    }
  }

  return NextResponse.json({
    ok: fehlerRatio.length === 0,
    ergebnisse,
    fehler: fehlerRatio.length ? fehlerRatio : undefined,
  })
}
