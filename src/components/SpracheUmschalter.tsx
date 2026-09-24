'use client'

import { useSprache } from './SpracheProvider'

export default function SpracheUmschalter() {
  const { sprache, setSprache, T } = useSprache()

  const button = (wert: 'de' | 'en', label: string) => {
    const aktiv = sprache === wert
    return (
      <button
        type="button"
        onClick={() => setSprache(wert)}
        aria-pressed={aktiv}
        style={{
          background: aktiv ? '#f5f5f7' : 'transparent',
          color: aktiv ? '#0b0b0f' : '#f5f5f7',
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.05em',
          cursor: aktiv ? 'default' : 'pointer',
          minWidth: 40,
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      role="group"
      aria-label={T('langAria')}
      style={{ display: 'inline-flex', gap: 6 }}
    >
      {button('de', 'DE')}
      {button('en', 'EN')}
    </div>
  )
}
