'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Artefakt } from '@/lib/types'
import { LEERER_STAPEL, stapelSchreiben, stapelVor, stapelZurueck, type UndoStapel } from '@/lib/undo'
import EbenenInspektor from './EbenenInspektor'
import EbenenPanel from './EbenenPanel'
import HilfePopover from './HilfePopover'
import KIEditorBefehl from './KIEditorBefehl'
import { useSprache } from './SpracheProvider'

// Konva ist reines DOM/Canvas — nur clientseitig laden (dynamic + ssr:false),
// damit der Server-Bundle sauber bleibt.
const KonvaEditor = dynamic(() => import('./KonvaEditor'), { ssr: false })

export default function EditorAnsicht({
  jobId,
  artefakt,
  onAendern,
}: {
  jobId: string
  artefakt: Artefakt
  onAendern: (neu: Artefakt) => void
}) {
  const { sprache } = useSprache()
  const [ausgewaehlteId, setAusgewaehlteId] = useState<string | undefined>()
  const [stapel, setStapel] = useState<UndoStapel>(LEERER_STAPEL)
  const letzterZustandRef = useRef<Artefakt>(artefakt)

  const aendernMitUndo = useCallback(
    (neu: Artefakt) => {
      setStapel((s) => stapelSchreiben(s, letzterZustandRef.current))
      letzterZustandRef.current = neu
      onAendern(neu)
    },
    [onAendern],
  )

  const undo = useCallback(() => {
    const { neu, wieder } = stapelZurueck(stapel, artefakt)
    setStapel(neu)
    if (wieder) {
      letzterZustandRef.current = wieder
      onAendern(wieder)
    }
  }, [artefakt, onAendern, stapel])

  const redo = useCallback(() => {
    const { neu, wieder } = stapelVor(stapel, artefakt)
    setStapel(neu)
    if (wieder) {
      letzterZustandRef.current = wieder
      onAendern(wieder)
    }
  }, [artefakt, onAendern, stapel])

  // Tastatur-Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (ausgewaehlteId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          aendernMitUndo({ ...artefakt, ebenen: artefakt.ebenen.filter((x) => x.id !== ausgewaehlteId) })
          setAusgewaehlteId(undefined)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [aendernMitUndo, artefakt, ausgewaehlteId, redo, undo])

  const [breite, setBreite] = useState(560)
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!containerRef.current) return
    const beobachter = new ResizeObserver((eintraege) => {
      for (const e of eintraege) setBreite(Math.min(700, e.contentRect.width))
    })
    beobachter.observe(containerRef.current)
    return () => beobachter.disconnect()
  }, [])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 260px',
        gap: 12,
        alignItems: 'start',
      }}
    >
      <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            onClick={undo}
            disabled={!stapel.vergangenheit.length}
            style={styleAktion}
          >
            ⟲ {sprache === 'de' ? 'Zurück' : 'Undo'}
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!stapel.zukunft.length}
            style={styleAktion}
          >
            ⟳ {sprache === 'de' ? 'Vor' : 'Redo'}
          </button>
          <div style={{ marginLeft: 'auto' }}>
            <HilfePopover
              de={'Konva-Editor. Verschieben/Skalieren/Drehen per Transformer, Doppelklick auf Text für Inline-Bearbeitung. Cmd/Ctrl+Z zurück, Cmd+Shift+Z vor, Delete löscht die ausgewählte Ebene.'}
              en={'Konva editor. Move/scale/rotate via transformer, double-click text for inline edit. Cmd/Ctrl+Z undo, Cmd+Shift+Z redo, Delete removes the selected layer.'}
              anker="editor"
            />
          </div>
        </div>
        <KonvaEditor
          artefakt={artefakt}
          breite={breite}
          ausgewaehlteId={ausgewaehlteId}
          onAuswahl={setAusgewaehlteId}
          onAendern={aendernMitUndo}
        />
        <KIEditorBefehl jobId={jobId} artefakt={artefakt} onAendern={aendernMitUndo} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EbenenPanel
          artefakt={artefakt}
          ausgewaehlteId={ausgewaehlteId}
          onAuswahl={setAusgewaehlteId}
          onAendern={aendernMitUndo}
        />
        <EbenenInspektor
          artefakt={artefakt}
          ausgewaehlteId={ausgewaehlteId}
          onAendern={aendernMitUndo}
        />
      </div>
    </div>
  )
}

const styleAktion: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: '#f5f5f7',
  border: '1px solid rgba(255,255,255,0.15)',
  padding: '6px 12px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}
