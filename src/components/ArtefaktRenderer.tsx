'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { assetLaden } from '@/lib/db'
import type { Artefakt, Ebene } from '@/lib/types'

// Ermöglicht, dass Aufrufer (z. B. Review-Seite) URLs pro Asset-Hash bereitstellen,
// ohne die IndexedDB zu bemühen. Wenn ein Override vorhanden ist, wird IDB übersprungen.
const AssetUrlContext = createContext<Record<string, string> | undefined>(undefined)

// Nur-Anzeige-Renderer für Artefakte in Phase 2. Skaliert das Artefakt in die
// verfügbare Breite. Der interaktive Konva-Editor kommt in Phase 3.

function ebeneStyle(e: Ebene, scale: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: e.x * scale,
    top: e.y * scale,
    width: e.breite * scale,
    height: e.hoehe * scale,
    transform: e.drehung ? `rotate(${e.drehung}deg)` : undefined,
    display: e.sichtbar === false ? 'none' : undefined,
    overflow: 'hidden',
  }
}

function TextEbene({ e, scale }: { e: Ebene; scale: number }) {
  const p = e.eigenschaften as Record<string, unknown>
  const groesse = ((p.schriftgroesse as number | undefined) || 24) * scale
  const style: React.CSSProperties = {
    ...ebeneStyle(e, scale),
    color: (p.farbe as string) || '#111',
    background: (p.hintergrund as string) || undefined,
    borderRadius: p.radius ? ((p.radius as number) * scale) : undefined,
    fontFamily: (p.schriftfamilie as string) || 'system-ui',
    fontWeight: (p.schriftgewicht as number) || 700,
    fontSize: groesse,
    lineHeight: 1.15,
    padding: p.hintergrund ? `${groesse * 0.3}px ${groesse * 0.5}px` : 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: p.hintergrund ? 'center' : 'flex-start',
    whiteSpace: 'pre-wrap',
    letterSpacing: '-0.01em',
  }
  return <div style={style}>{(p.text as string) || e.name}</div>
}

function useAssetUrl(hash?: string): string | undefined {
  const override = useContext(AssetUrlContext)
  const [url, setUrl] = useState<string | undefined>()
  useEffect(() => {
    if (!hash) return setUrl(undefined)
    if (override && override[hash]) {
      setUrl(override[hash])
      return
    }
    let abgebrochen = false
    let objURL: string | undefined
    assetLaden(hash)
      .then((a) => {
        if (abgebrochen || !a) return
        objURL = URL.createObjectURL(a.blob)
        setUrl(objURL)
      })
      .catch(() => {})
    return () => {
      abgebrochen = true
      if (objURL) URL.revokeObjectURL(objURL)
    }
  }, [hash, override])
  return url
}

function BildEbene({ e, scale }: { e: Ebene; scale: number }) {
  const p = e.eigenschaften as Record<string, unknown>
  const inlineData = p.dataUrl as string | undefined
  const url = useAssetUrl(e.assetHash) || inlineData

  const style: React.CSSProperties = {
    ...ebeneStyle(e, scale),
    background: (p.fuellFarbe as string) || 'rgba(200,200,200,0.4)',
  }

  return (
    <div style={style}>
      {url ? (
        <img
          src={url}
          alt={e.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: (p.objectFit as React.CSSProperties['objectFit']) || 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(0,0,0,0.35)',
            fontSize: 12 * scale + 8,
            fontFamily: 'system-ui',
          }}
        >
          {e.name}
        </div>
      )}
    </div>
  )
}

function LogoEbene({ e, scale }: { e: Ebene; scale: number }) {
  const p = e.eigenschaften as Record<string, unknown>
  const url = useAssetUrl(e.assetHash) || (p.dataUrl as string | undefined) || (p.logoUrl as string | undefined)
  return (
    <div
      style={{
        ...ebeneStyle(e, scale),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      {url ? (
        <img src={url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            border: '1px dashed rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(0,0,0,0.4)',
            fontSize: 12,
          }}
        >
          Logo
        </div>
      )}
    </div>
  )
}

export default function ArtefaktRenderer({
  artefakt,
  maxBreite = 640,
  hintergrund = '#f5f5f7',
  assetUrlOverride,
}: {
  artefakt: Artefakt
  maxBreite?: number
  hintergrund?: string
  assetUrlOverride?: Record<string, string>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [breite, setBreite] = useState(maxBreite)

  useEffect(() => {
    if (!containerRef.current) return
    const beobachter = new ResizeObserver((eintraege) => {
      for (const e of eintraege) {
        setBreite(Math.min(maxBreite, e.contentRect.width))
      }
    })
    beobachter.observe(containerRef.current)
    return () => beobachter.disconnect()
  }, [maxBreite])

  const scale = breite / artefakt.breite
  const hoehe = artefakt.hoehe * scale

  return (
    <AssetUrlContext.Provider value={assetUrlOverride}>
      <div ref={containerRef} style={{ width: '100%' }}>
        <div
          style={{
            position: 'relative',
            width: breite,
            height: hoehe,
            background: hintergrund,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
          }}
        >
          {artefakt.ebenen.map((e) => {
            if (e.typ === 'text') return <TextEbene key={e.id} e={e} scale={scale} />
            if (e.typ === 'bild') return <BildEbene key={e.id} e={e} scale={scale} />
            if (e.typ === 'logo') return <LogoEbene key={e.id} e={e} scale={scale} />
            return null
          })}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            opacity: 0.55,
            textAlign: 'right',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {artefakt.format}
        </div>
      </div>
    </AssetUrlContext.Provider>
  )
}
