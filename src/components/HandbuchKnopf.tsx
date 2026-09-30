'use client'

import { useHandbuch } from './HandbuchProvider'
import { useSprache } from './SpracheProvider'

// Kleiner Knopf für die Kopfzeile jeder Ansicht (Phase 7).
// Öffnet das Handbuch als Overlay, ohne den laufenden Job zu verlassen.

export default function HandbuchKnopf({ anker }: { anker?: string }) {
  const { oeffnen } = useHandbuch()
  const { sprache } = useSprache()
  return (
    <button
      type="button"
      onClick={() => oeffnen(anker)}
      title={sprache === 'de' ? 'Handbuch öffnen' : 'Open manual'}
      style={{
        background: 'transparent',
        color: '#f5f5f7',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 5,
        padding: '5px 10px',
        fontSize: 12,
        cursor: 'pointer',
        fontFamily: 'inherit',
        opacity: 0.85,
      }}
    >
      {sprache === 'de' ? '📖 Handbuch' : '📖 Manual'}
    </button>
  )
}
