'use client'

import { useState } from 'react'
import { useSprache } from './SpracheProvider'

// Phase 0: das KI-Feld steht optisch als Ankerpunkt, ist aber noch nicht
// an /api/dialog angebunden. Absenden zeigt nur den Text-Preview.

export default function KIZentrum() {
  const { T } = useSprache()
  const [text, setText] = useState('')
  const [antwort, setAntwort] = useState<string | null>(null)

  const senden = () => {
    if (!text.trim()) return
    setAntwort(text.trim())
  }

  return (
    <section
      style={{
        width: '100%',
        maxWidth: 760,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: '28px 28px 20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      }}
    >
      <label htmlFor="ki-input" style={{ display: 'block', fontSize: 20, fontWeight: 600, marginBottom: 14 }}>
        {T('kiPrompt')}
      </label>

      <textarea
        id="ki-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={T('kiPlaceholder')}
        rows={3}
        style={{
          width: '100%',
          resize: 'vertical',
          minHeight: 80,
          background: 'rgba(0,0,0,0.35)',
          color: '#f5f5f7',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          padding: '12px 14px',
          fontSize: 15,
          lineHeight: 1.5,
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled
            title={T('kiHinweis')}
            style={{
              background: 'transparent',
              color: 'rgba(245,245,247,0.55)',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'not-allowed',
            }}
          >
            {T('kiVorlage')}
          </button>
          <button
            type="button"
            disabled
            title={T('kiHinweis')}
            style={{
              background: 'transparent',
              color: 'rgba(245,245,247,0.55)',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'not-allowed',
            }}
          >
            🎙 {T('kiMikro')}
          </button>
        </div>

        <button
          type="button"
          onClick={senden}
          style={{
            background: '#f5f5f7',
            color: '#0b0b0f',
            border: 'none',
            padding: '10px 22px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            opacity: text.trim() ? 1 : 0.5,
            letterSpacing: '0.02em',
          }}
          disabled={!text.trim()}
        >
          {T('kiSenden')} →
        </button>
      </div>

      {antwort && (
        <div
          style={{
            marginTop: 16,
            padding: '10px 12px',
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.35)',
            borderRadius: 8,
            fontSize: 13,
            color: '#dbeafe',
          }}
        >
          <strong style={{ opacity: 0.85 }}>Echo (Phase 0):</strong> {antwort}
          <div style={{ opacity: 0.65, marginTop: 4, fontSize: 12 }}>{T('kiHinweis')}</div>
        </div>
      )}
    </section>
  )
}
