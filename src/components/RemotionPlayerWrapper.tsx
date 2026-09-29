'use client'

// Dünner Wrapper um @remotion/player. Ersetzt asset://<hash>-URLs im
// Storyboard durch die vom Aufrufer übergebenen Blob-URLs, damit der Player
// im Browser die IndexedDB-Blobs anzeigen kann.

import { Player } from '@remotion/player'
import { useMemo } from 'react'
import type { Storyboard } from '@/lib/video-types'
import { VideoKomposition } from '@/remotion/VideoKomposition'

function urlErsetzen<T>(wert: T, urls: Record<string, string>): T {
  if (typeof wert === 'string' && wert.startsWith('asset://')) {
    const hash = wert.slice('asset://'.length)
    return (urls[hash] || wert) as unknown as T
  }
  if (Array.isArray(wert)) return wert.map((w) => urlErsetzen(w, urls)) as unknown as T
  if (wert && typeof wert === 'object') {
    const neu: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(wert)) neu[k] = urlErsetzen(v, urls)
    return neu as T
  }
  return wert
}

export default function RemotionPlayerWrapper({
  storyboard,
  breite,
  hoehe,
  dauerFrames,
  assetUrls,
}: {
  storyboard: Storyboard
  breite: number
  hoehe: number
  dauerFrames: number
  assetUrls: Record<string, string>
}) {
  // Hier ersetzen wir alle asset://-Verweise im Storyboard durch die echten
  // Blob-URLs. Die Komposition selbst arbeitet dann mit Standard-URLs.
  const storyboardMitUrls = useMemo(() => {
    const kopie = JSON.parse(JSON.stringify(storyboard)) as Storyboard
    // Storyboard-Ebene: voiceover
    if (kopie.voiceover?.assetHash && assetUrls[kopie.voiceover.assetHash]) {
      // Hack: Wir speichern die URL in einem separaten Feld, das die Komposition lesen kann,
      // indem wir assetHash mit einem Präfix versehen — assetLaden wird nie aufgerufen.
      ;(kopie.voiceover as any).assetHash = 'url:' + assetUrls[kopie.voiceover.assetHash]
    }
    for (const s of kopie.szenen) {
      if ('logoAssetHash' in s && s.logoAssetHash && assetUrls[s.logoAssetHash]) {
        ;(s as any).logoAssetHash = 'url:' + assetUrls[s.logoAssetHash]
      }
      if ('bildAssetHash' in s && s.bildAssetHash && assetUrls[s.bildAssetHash]) {
        ;(s as any).bildAssetHash = 'url:' + assetUrls[s.bildAssetHash]
      }
      if ('bildAssetHashes' in s && s.bildAssetHashes) {
        s.bildAssetHashes = s.bildAssetHashes.map((h) => (assetUrls[h] ? 'url:' + assetUrls[h] : h))
      }
    }
    return kopie
  }, [assetUrls, storyboard])

  return (
    <Player
      component={VideoKomposition}
      inputProps={{ storyboard: storyboardMitUrls }}
      durationInFrames={dauerFrames}
      fps={30}
      compositionWidth={1080}
      compositionHeight={storyboard.seitenverhaeltnis === '9:16' ? 1920 : storyboard.seitenverhaeltnis === '16:9' ? Math.round(1080 * (9 / 16)) : 1080}
      style={{ width: breite, height: hoehe, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}
      controls
      loop
    />
  )
}
