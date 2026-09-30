'use client'

import HilfePopover from './HilfePopover'
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
          background: aktiv ? '#b91c1c' : 'transparent',
          color: aktiv ? '#ffffff' : 'currentColor',
          border: '1px solid currentColor',
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
      style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
    >
      {button('de', 'DE')}
      {button('en', 'EN')}
      <HilfePopover
        de={'Sprache der Oberfläche. Standard ist Deutsch (Phase 6). Wahl bleibt in localStorage („content-creator-2026:sprache") und überschreibt die Browsersprache.'}
        en={'UI language. Default is German (Phase 6). Your choice sticks in localStorage („content-creator-2026:sprache") and overrides the browser language.'}
        anker="einstellungen"
      />
    </div>
  )
}
