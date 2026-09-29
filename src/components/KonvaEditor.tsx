'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type Konva from 'konva'
import { Group, Image as KImage, Layer, Rect, Stage, Text as KText, Transformer } from 'react-konva'
import { assetLaden } from '@/lib/db'
import type { Artefakt, Ebene } from '@/lib/types'

// Konva-basierter Editor (Phase 3). Zeigt das Artefakt in Editor-Skalierung,
// erlaubt Auswahl, Verschieben, Skalieren, Drehen, Inline-Text-Editing (via
// HTML-Overlay), und liefert bei jeder Änderung ein neues Artefakt an den
// Aufrufer zurück.

type Props = {
  artefakt: Artefakt
  breite: number
  onAendern: (neu: Artefakt) => void
  ausgewaehlteId?: string
  onAuswahl: (id?: string) => void
}

function useKImageBlob(hash?: string, inlineDataUrl?: string): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement | undefined>()
  useEffect(() => {
    let abgebrochen = false
    let objURL: string | undefined
    const laden = async () => {
      const src = await (async () => {
        if (hash) {
          const a = await assetLaden(hash)
          if (a) {
            objURL = URL.createObjectURL(a.blob)
            return objURL
          }
        }
        return inlineDataUrl
      })()
      if (!src) return
      const bild = new window.Image()
      bild.crossOrigin = 'anonymous'
      bild.onload = () => {
        if (!abgebrochen) setImg(bild)
      }
      bild.src = src
    }
    laden()
    return () => {
      abgebrochen = true
      if (objURL) URL.revokeObjectURL(objURL)
    }
  }, [hash, inlineDataUrl])
  return img
}

function BildEbeneKonva({
  ebene,
  scale,
  registerRef,
  onKlick,
  onWechsel,
}: {
  ebene: Ebene
  scale: number
  registerRef: (node: Konva.Node | null) => void
  onKlick: () => void
  onWechsel: (aend: Partial<Ebene>) => void
}) {
  const p = ebene.eigenschaften as Record<string, unknown>
  const bild = useKImageBlob(ebene.assetHash, p.dataUrl as string | undefined)
  return (
    <Group
      x={ebene.x * scale}
      y={ebene.y * scale}
      draggable
      onClick={onKlick}
      onTap={onKlick}
      ref={registerRef as (n: Konva.Group | null) => void}
      onDragEnd={(e) => onWechsel({ x: e.target.x() / scale, y: e.target.y() / scale })}
      onTransformEnd={(e) => {
        const node = e.target
        const sx = node.scaleX()
        const sy = node.scaleY()
        node.scaleX(1)
        node.scaleY(1)
        onWechsel({
          x: node.x() / scale,
          y: node.y() / scale,
          breite: Math.max(4, (ebene.breite * sx)),
          hoehe: Math.max(4, (ebene.hoehe * sy)),
          drehung: node.rotation(),
        })
      }}
      rotation={ebene.drehung || 0}
    >
      <Rect
        width={ebene.breite * scale}
        height={ebene.hoehe * scale}
        fill={(p.fuellFarbe as string) || 'rgba(200,200,200,0.4)'}
      />
      {bild && (
        <KImage
          image={bild}
          width={ebene.breite * scale}
          height={ebene.hoehe * scale}
          listening={false}
        />
      )}
    </Group>
  )
}

function TextEbeneKonva({
  ebene,
  scale,
  registerRef,
  onKlick,
  onDoppelklick,
  onWechsel,
}: {
  ebene: Ebene
  scale: number
  registerRef: (node: Konva.Node | null) => void
  onKlick: () => void
  onDoppelklick: () => void
  onWechsel: (aend: Partial<Ebene>) => void
}) {
  const p = ebene.eigenschaften as Record<string, unknown>
  const groesse = ((p.schriftgroesse as number | undefined) || 24) * scale
  const hg = p.hintergrund as string | undefined
  const radius = ((p.radius as number | undefined) || 0) * scale
  return (
    <Group
      x={ebene.x * scale}
      y={ebene.y * scale}
      draggable
      onClick={onKlick}
      onTap={onKlick}
      onDblClick={onDoppelklick}
      onDblTap={onDoppelklick}
      ref={registerRef as (n: Konva.Group | null) => void}
      onDragEnd={(e) => onWechsel({ x: e.target.x() / scale, y: e.target.y() / scale })}
      onTransformEnd={(e) => {
        const node = e.target
        const sx = node.scaleX()
        const sy = node.scaleY()
        node.scaleX(1)
        node.scaleY(1)
        const neueBreite = Math.max(4, ebene.breite * sx)
        const neueHoehe = Math.max(4, ebene.hoehe * sy)
        onWechsel({
          x: node.x() / scale,
          y: node.y() / scale,
          breite: neueBreite,
          hoehe: neueHoehe,
          drehung: node.rotation(),
          // Schrift proportional mitwachsen lassen
          eigenschaften: { schriftgroesse: ((p.schriftgroesse as number) || 24) * ((sx + sy) / 2) },
        })
      }}
      rotation={ebene.drehung || 0}
    >
      {hg && (
        <Rect
          width={ebene.breite * scale}
          height={ebene.hoehe * scale}
          fill={hg}
          cornerRadius={radius}
        />
      )}
      <KText
        text={(p.text as string) || ebene.name}
        fill={(p.farbe as string) || '#111'}
        fontSize={groesse}
        fontStyle={(p.schriftgewicht as number | undefined) && (p.schriftgewicht as number) >= 700 ? 'bold' : 'normal'}
        fontFamily={(p.schriftfamilie as string | undefined) || 'system-ui'}
        width={ebene.breite * scale}
        height={ebene.hoehe * scale}
        align={hg ? 'center' : 'left'}
        verticalAlign="middle"
        padding={hg ? groesse * 0.3 : 0}
        lineHeight={1.15}
        listening={false}
      />
    </Group>
  )
}

export default function KonvaEditor({
  artefakt,
  breite,
  onAendern,
  ausgewaehlteId,
  onAuswahl,
}: Props) {
  const scale = breite / artefakt.breite
  const hoehe = artefakt.hoehe * scale
  const trafoRef = useRef<Konva.Transformer | null>(null)
  const knotenRefs = useRef<Map<string, Konva.Node>>(new Map())
  const [editText, setEditText] = useState<{ id: string; x: number; y: number; breite: number; hoehe: number; wert: string; groesse: number } | null>(null)

  // Wenn Auswahl wechselt: Transformer an den passenden Knoten heften
  useEffect(() => {
    const trafo = trafoRef.current
    if (!trafo) return
    const knoten = ausgewaehlteId ? knotenRefs.current.get(ausgewaehlteId) : undefined
    if (knoten) {
      trafo.nodes([knoten])
    } else {
      trafo.nodes([])
    }
    trafo.getLayer()?.batchDraw()
  }, [ausgewaehlteId, artefakt])

  const ebeneAendern = useCallback(
    (id: string, aend: Partial<Ebene>) => {
      const neu: Artefakt = {
        ...artefakt,
        ebenen: artefakt.ebenen.map((e) =>
          e.id === id
            ? {
                ...e,
                ...aend,
                eigenschaften: { ...e.eigenschaften, ...(aend.eigenschaften || {}) },
              }
            : e,
        ),
      }
      onAendern(neu)
    },
    [artefakt, onAendern],
  )

  const textEditFertig = useCallback(
    (wert: string) => {
      if (!editText) return
      ebeneAendern(editText.id, { eigenschaften: { text: wert } })
      setEditText(null)
    },
    [editText, ebeneAendern],
  )

  return (
    <div style={{ position: 'relative', width: breite, height: hoehe }}>
      <Stage
        width={breite}
        height={hoehe}
        onClick={(e) => {
          if (e.target === e.target.getStage()) onAuswahl(undefined)
        }}
        style={{ background: '#f5f5f7', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.35)' }}
      >
        <Layer>
          {artefakt.ebenen.map((e) => {
            if (e.sichtbar === false) return null
            const registrieren = (node: Konva.Node | null) => {
              if (node) knotenRefs.current.set(e.id, node)
              else knotenRefs.current.delete(e.id)
            }
            const klick = () => onAuswahl(e.id)
            if (e.typ === 'text') {
              return (
                <TextEbeneKonva
                  key={e.id}
                  ebene={e}
                  scale={scale}
                  registerRef={registrieren}
                  onKlick={klick}
                  onDoppelklick={() => {
                    const p = e.eigenschaften as Record<string, unknown>
                    setEditText({
                      id: e.id,
                      x: e.x * scale,
                      y: e.y * scale,
                      breite: e.breite * scale,
                      hoehe: e.hoehe * scale,
                      wert: (p.text as string) || '',
                      groesse: ((p.schriftgroesse as number) || 24) * scale,
                    })
                  }}
                  onWechsel={(aend) => ebeneAendern(e.id, aend)}
                />
              )
            }
            if (e.typ === 'bild' || e.typ === 'logo') {
              return (
                <BildEbeneKonva
                  key={e.id}
                  ebene={e}
                  scale={scale}
                  registerRef={registrieren}
                  onKlick={klick}
                  onWechsel={(aend) => ebeneAendern(e.id, aend)}
                />
              )
            }
            return null
          })}
          <Transformer
            ref={trafoRef}
            rotateEnabled
            keepRatio={false}
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
              'top-center',
              'bottom-center',
            ]}
            anchorSize={9}
            anchorFill="#f5f5f7"
            anchorStroke="#60a5fa"
            borderStroke="#60a5fa"
          />
        </Layer>
      </Stage>

      {editText && (
        <textarea
          autoFocus
          value={editText.wert}
          onChange={(e) => setEditText({ ...editText, wert: e.target.value })}
          onBlur={() => textEditFertig(editText.wert)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditText(null)
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              textEditFertig(editText.wert)
            }
          }}
          style={{
            position: 'absolute',
            left: editText.x,
            top: editText.y,
            width: editText.breite,
            height: editText.hoehe,
            fontSize: editText.groesse,
            fontFamily: 'system-ui',
            fontWeight: 700,
            border: '2px solid #60a5fa',
            padding: 4,
            resize: 'none',
            background: 'rgba(255,255,255,0.95)',
            color: '#111',
            outline: 'none',
            borderRadius: 4,
          }}
        />
      )}
    </div>
  )
}
