'use client'

// Foto zuschneiden (Vorschlag 6): Gesicht in den runden Ausschnitt schieben und zoomen – wie es in der Anzeige erscheint.
// Bedienung: Maus/Finger ziehen · Mausrad oder Regler zoomen · Pfeiltasten verschieben · +/- zoomen.
// Ergebnis: JPEG 800 × 800 (das Original bleibt zusätzlich gespeichert).

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import { useSprache } from '@/components/SpracheProvider'

const GROESSE = 320 // Anzeige im Dialog (px)
const AUSGABE = 800 // Ergebnis (px)

type Props = {
  quelle: string // Objekt- oder Server-URL des Originals
  onFertig: (zugeschnitten: Blob) => void
  onAbbrechen: () => void
}

export default function FotoZuschneider({ quelle, onFertig, onAbbrechen }: Props) {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const [bild, setBild] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1) // 1 = Bild füllt den Kreis gerade aus
  const [pos, setPos] = useState({ x: 0, y: 0 }) // Verschiebung in Anzeige-px
  const [fehler, setFehler] = useState<string | null>(null)
  const ziehen = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { setBild(img); setZoom(1); setPos({ x: 0, y: 0 }) }
    img.onerror = () => setFehler(de ? 'Bild konnte nicht geladen werden.' : 'Could not load image.')
    img.src = quelle
  }, [quelle, de])

  useEffect(() => { dialogRef.current?.focus() }, [])

  // Grundmassstab: kürzere Bildseite = Kreisdurchmesser
  const basis = bild ? GROESSE / Math.min(bild.naturalWidth, bild.naturalHeight) : 1

  const begrenzen = (p: { x: number; y: number }, z = zoom) => {
    if (!bild) return p
    const w = bild.naturalWidth * basis * z
    const h = bild.naturalHeight * basis * z
    const mx = Math.max(0, (w - GROESSE) / 2)
    const my = Math.max(0, (h - GROESSE) / 2)
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) }
  }

  const zeichnen = (ctx: CanvasRenderingContext2D, groesse: number) => {
    if (!bild) return
    const f = groesse / GROESSE
    const w = bild.naturalWidth * basis * zoom * f
    const h = bild.naturalHeight * basis * zoom * f
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, groesse, groesse)
    ctx.drawImage(bild, (groesse - w) / 2 + pos.x * f, (groesse - h) / 2 + pos.y * f, w, h)
  }

  useEffect(() => {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    zeichnen(ctx, GROESSE)
    // runde Maske (abgedunkelter Rand)
    ctx.save()
    ctx.fillStyle = 'rgba(28,27,34,0.55)'
    ctx.beginPath()
    ctx.rect(0, 0, GROESSE, GROESSE)
    ctx.arc(GROESSE / 2, GROESSE / 2, GROESSE / 2 - 2, 0, Math.PI * 2, true)
    ctx.fill('evenodd')
    ctx.strokeStyle = '#E8B64A'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(GROESSE / 2, GROESSE / 2, GROESSE / 2 - 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  })

  const zoomSetzen = (z: number) => {
    const neu = Math.min(4, Math.max(1, z))
    setZoom(neu)
    setPos((p) => begrenzen(p, neu))
  }

  const runter = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    ziehen.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
  }
  const bewegen = (e: PointerEvent<HTMLCanvasElement>) => {
    const z = ziehen.current
    if (!z) return
    setPos(begrenzen({ x: z.px + (e.clientX - z.x), y: z.py + (e.clientY - z.y) }))
  }
  const hoch = () => { ziehen.current = null }
  const rad = (e: WheelEvent<HTMLCanvasElement>) => { zoomSetzen(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)) }
  const taste = (e: KeyboardEvent<HTMLDivElement>) => {
    const s = e.shiftKey ? 20 : 5
    if (e.key === 'Escape') { e.preventDefault(); onAbbrechen() }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setPos((p) => begrenzen({ x: p.x - s, y: p.y })) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setPos((p) => begrenzen({ x: p.x + s, y: p.y })) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPos((p) => begrenzen({ x: p.x, y: p.y - s })) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setPos((p) => begrenzen({ x: p.x, y: p.y + s })) }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomSetzen(zoom * 1.1) }
    else if (e.key === '-') { e.preventDefault(); zoomSetzen(zoom / 1.1) }
  }

  const uebernehmen = () => {
    const c = document.createElement('canvas')
    c.width = AUSGABE
    c.height = AUSGABE
    const ctx = c.getContext('2d')
    if (!ctx || !bild) return
    zeichnen(ctx, AUSGABE)
    c.toBlob((b) => { if (b) onFertig(b) }, 'image/jpeg', 0.9)
  }

  return (
    <div className="cockpit-dialog-hintergrund" role="presentation" onClick={onAbbrechen}>
      <div
        className="cockpit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zuschneiden-titel"
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={taste}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="zuschneiden-titel" style={{ margin: '0 0 6px', fontSize: 18 }}>{de ? 'Foto zuschneiden' : 'Crop photo'}</h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--tm-grau)' }}>
          {de ? 'Gesicht in den Kreis ziehen. Zoomen mit Mausrad, Regler oder +/−. Pfeiltasten verschieben.' : 'Drag the face into the circle. Zoom with wheel, slider or +/−.'}
        </p>
        {fehler ? <p role="alert">{fehler}</p> : (
          <canvas
            ref={canvasRef}
            width={GROESSE}
            height={GROESSE}
            className="cockpit-zuschneide-flaeche"
            aria-label={de ? 'Bildausschnitt' : 'Image crop area'}
            onPointerDown={runter}
            onPointerMove={bewegen}
            onPointerUp={hoch}
            onPointerCancel={hoch}
            onWheel={rad}
          />
        )}
        <div className="cockpit-feld" style={{ marginTop: 12 }}>
          <label htmlFor="zuschneiden-zoom">{de ? 'Zoom' : 'Zoom'}</label>
          <input id="zuschneiden-zoom" type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => zoomSetzen(Number(e.target.value))} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="cockpit-knopf sekundaer" onClick={onAbbrechen}>{de ? 'Abbrechen' : 'Cancel'}</button>
          <button type="button" className="cockpit-knopf primaer" onClick={uebernehmen} disabled={!bild}>{de ? 'Ausschnitt übernehmen' : 'Use crop'}</button>
        </div>
      </div>
    </div>
  )
}
