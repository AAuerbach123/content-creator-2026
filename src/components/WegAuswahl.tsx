'use client'

import { useSprache } from './SpracheProvider'
import type { Einstiegsweg } from '@/lib/types'

// Drei-Karten-Wahl: nur Ziel / Vorstellung im Kopf / Vorlage hochladen.
// Wird angezeigt, wenn ein Job noch keinen einstieg hat.

export default function WegAuswahl({
  onWahl,
}: {
  onWahl: (weg: Einstiegsweg) => void
}) {
  const { T } = useSprache()

  const karte = (
    weg: Einstiegsweg,
    titel: string,
    hinweis: string,
    icon: string,
    farbe: string,
  ) => (
    <button
      key={weg}
      type="button"
      onClick={() => onWahl(weg)}
      style={{
        flex: '1 1 240px',
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 22,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        color: '#f5f5f7',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform 120ms ease, border-color 120ms ease, background 120ms ease',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = farbe
        e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <span aria-hidden style={{ fontSize: 28 }}>
        {icon}
      </span>
      <strong style={{ fontSize: 16 }}>{titel}</strong>
      <span style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.45 }}>{hinweis}</span>
    </button>
  )

  return (
    <section>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{T('wegAuswahlTitel')}</h2>
      <p style={{ margin: '4px 0 18px', opacity: 0.65, fontSize: 13 }}>
        {T('wegAuswahlHinweis')}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {karte('A-ohne-vorstellung', T('wegA'), T('wegAHinweis'), '✳', '#60a5fa')}
        {karte('B-vorstellung-im-kopf', T('wegB'), T('wegBHinweis'), '◆', '#f59e0b')}
        {karte('C-vorlage', T('wegC'), T('wegCHinweis'), '⤒', '#34d399')}
      </div>
    </section>
  )
}
