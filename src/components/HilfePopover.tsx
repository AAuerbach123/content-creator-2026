'use client'

import { useEffect, useRef, useState } from 'react'
import { useSprache } from './SpracheProvider'

// Kleiner „?"-Knopf mit Popover. DE/EN je Bereich, Text kommt via Props.
// Klick auf den Knopf toggelt das Popover, Klick außerhalb schließt es.

export default function HilfePopover({
  de,
  en,
  ausrichtung = 'rechts',
}: {
  de: string
  en: string
  ausrichtung?: 'links' | 'rechts'
}) {
  const { sprache } = useSprache()
  const [offen, setOffen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!offen) return
    const abschluss = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOffen(false)
    }
    document.addEventListener('mousedown', abschluss)
    return () => document.removeEventListener('mousedown', abschluss)
  }, [offen])

  const text = sprache === 'de' ? de : en

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-label={sprache === 'de' ? 'Hilfe' : 'Help'}
        style={{
          width: 20,
          height: 20,
          padding: 0,
          borderRadius: '50%',
          background: offen ? 'rgba(96,165,250,0.35)' : 'transparent',
          color: '#f5f5f7',
          border: '1px solid rgba(255,255,255,0.25)',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          lineHeight: 1,
          verticalAlign: 'middle',
        }}
      >
        ?
      </button>
      {offen && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: 26,
            [ausrichtung === 'rechts' ? 'right' : 'left']: 0,
            zIndex: 40,
            width: 280,
            background: '#0b0b0f',
            color: '#f5f5f7',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: 10,
            fontSize: 12,
            lineHeight: 1.5,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
        >
          {text}
        </div>
      )}
    </span>
  )
}
