'use client'

import { useEffect, useRef, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import { ANZEIGE_BREITE, aufPruefungWarten } from '@/lib/serie/serie-client'
import type { Pruefergebnis } from '@/lib/serie/types'
import { GRAU_TEXT, HELLGRAU } from './stil'

// Live-Vorschau einer Anzeige: iframe (srcDoc = generierte Seite, 1575 px Layoutbreite), per transform auf die
// verfügbare Breite skaliert → kein horizontales Überlaufen auf Handy/Tablet/Laptop.
// Nach dem Laden liest sie window.__pruefung (Einpass-/Prüfskript fit-source.ts) aus dem iframe.

export type PruefStatus = { laedt: boolean; ergebnis: Pruefergebnis | null }

export default function AnzeigeVorschau({
  html,
  hoehe,
  titel,
  maxHoehe,
  onPruefung,
  onIframe,
}: {
  html: string
  hoehe: number
  titel: string
  maxHoehe?: number
  onPruefung?: (s: PruefStatus) => void
  /** bekommt das iframe-Element (für Export); bitte in einem Ref ablegen, nicht in State */
  onIframe?: (f: HTMLIFrameElement | null) => void
}) {
  const huelleRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const ladeNr = useRef(0)
  const [breite, setBreite] = useState(0)
  const pruefRef = useRef(onPruefung)
  useEffect(() => {
    pruefRef.current = onPruefung
  }, [onPruefung])

  useEffect(() => {
    const el = huelleRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBreite(el.clientWidth))
    ro.observe(el)
    setBreite(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    ladeNr.current += 1
    pruefRef.current?.({ laedt: true, ergebnis: null })
  }, [html])

  const beimLaden = async () => {
    const nr = ladeNr.current
    const f = iframeRef.current
    if (!f) return
    const ergebnis = await aufPruefungWarten(f)
    if (nr === ladeNr.current) pruefRef.current?.({ laedt: false, ergebnis })
  }

  let skala = breite > 0 ? Math.min(1, breite / ANZEIGE_BREITE) : 0
  if (maxHoehe && skala > 0) skala = Math.min(skala, maxHoehe / hoehe)

  return (
    <div ref={huelleRef} style={{ width: '100%', minWidth: 0 }}>
      <div
        style={{
          width: Math.floor(ANZEIGE_BREITE * skala),
          height: Math.floor(hoehe * skala),
          maxWidth: '100%',
          overflow: 'hidden',
          position: 'relative',
          border: `1px solid ${HELLGRAU}`,
          background: '#fafafa',
          margin: '0 auto',
        }}
      >
        {skala > 0 && (
          <iframe
            ref={(f) => {
              iframeRef.current = f
              onIframe?.(f) // Aufrufer speichert in einem Ref (kein State → keine Render-Schleife)
            }}
            title={titel}
            srcDoc={html}
            onLoad={beimLaden}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: ANZEIGE_BREITE,
              height: hoehe,
              border: 0,
              transform: `scale(${skala})`,
              transformOrigin: '0 0',
              background: '#fff',
            }}
          />
        )}
      </div>
    </div>
  )
}

/** Prüfampel: grün = ok · gelb = nur Platzhalter/Hinweise · rot = echte Probleme (mit Liste). */
export function PruefAmpel({
  status,
  fehler = [],
  hinweise = [],
  kompakt = false,
}: {
  status: PruefStatus
  fehler?: string[]
  hinweise?: string[]
  kompakt?: boolean
}) {
  const { T } = useSprache()
  const e = status.ergebnis
  const echteWarnungen = e ? e.warnungen.filter((w) => !w.startsWith('Platzhalter')) : []
  const platzhalter = e ? e.warnungen.filter((w) => w.startsWith('Platzhalter')) : []
  let farbe = '#9CA3AF'
  let text = T('serieAmpelLaedt')
  if (!status.laedt) {
    if (!e) {
      farbe = '#E0A800'
      text = T('serieAmpelKeinErgebnis')
    } else if (!e.echt_ok || fehler.length) {
      farbe = '#C8102E'
      text = T('serieAmpelRot')
    } else if (!e.ok || hinweise.length) {
      farbe = '#E0A800'
      text = T('serieAmpelGelb')
    } else {
      farbe = '#1E8E3E'
      text = T('serieAmpelGruen')
    }
  }
  const liste = [...fehler, ...echteWarnungen]
  const gelbListe = [...platzhalter, ...hinweise]
  return (
    <div role="status" style={{ fontSize: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span aria-hidden style={{ width: 14, height: 14, borderRadius: '50%', background: farbe, flexShrink: 0, boxShadow: '0 0 0 2px #fff, 0 0 0 3px ' + farbe }} />
        <b>{text}</b>
        {e && !kompakt && (
          <span style={{ color: GRAU_TEXT }}>
            · {T('serieAmpelSkalierung')} {e.skalierung} · TNB {String(e.tnb_pt).replace('.', ',')} pt
          </span>
        )}
      </div>
      {!kompakt && liste.length > 0 && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#9E0B22' }}>
          {liste.map((w, i) => (
            <li key={'r' + i}>{w}</li>
          ))}
        </ul>
      )}
      {!kompakt && gelbListe.length > 0 && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#7a5b00' }}>
          {gelbListe.map((w, i) => (
            <li key={'g' + i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
