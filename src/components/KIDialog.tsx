'use client'

import { useEffect, useRef, useState } from 'react'
import { useSprache } from './SpracheProvider'
import MikrofonKnopf from './MikrofonKnopf'
import type { Nachricht } from '@/lib/types'

// Chat-artige Dialog-Anzeige. Zustandslos: bekommt Nachrichten + onSenden + onLaden.
// Kein Store-Wissen — verwaltet nur den Text-Puffer im Eingabefeld.

export default function KIDialog({
  nachrichten,
  onSenden,
  laedt,
  fehler,
  eingabeAktiv = true,
  platzhalter,
}: {
  nachrichten: Nachricht[]
  onSenden: (text: string) => void
  laedt?: boolean
  fehler?: string | null
  eingabeAktiv?: boolean
  platzhalter?: string
}) {
  const { T } = useSprache()
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [nachrichten.length, laedt])

  const senden = () => {
    const t = text.trim()
    if (!t || laedt || !eingabeAktiv) return
    onSenden(t)
    setText('')
  }

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontSize: 13,
          fontWeight: 600,
          opacity: 0.75,
          letterSpacing: '0.03em',
        }}
      >
        {T('dialogUeberschrift')}
      </header>

      <div
        ref={scrollRef}
        style={{
          padding: '16px 16px 4px',
          maxHeight: 480,
          minHeight: 200,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {nachrichten.map((n) => {
          const istKI = n.rolle === 'ki'
          const istSystem = n.rolle === 'system'
          return (
            <div
              key={n.id}
              style={{
                alignSelf: istSystem ? 'center' : istKI ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
                padding: '10px 14px',
                background: istSystem
                  ? 'rgba(255,255,255,0.05)'
                  : istKI
                    ? 'rgba(96,165,250,0.12)'
                    : 'rgba(245,245,247,0.9)',
                color: istSystem ? '#cbd5e1' : istKI ? '#dbeafe' : '#0b0b0f',
                border: istKI ? '1px solid rgba(96,165,250,0.28)' : 'none',
                borderRadius: istSystem ? 8 : 14,
                fontSize: istSystem ? 12 : 14,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontStyle: istSystem ? 'italic' : 'normal',
              }}
            >
              {n.text}
            </div>
          )
        })}

        {laedt && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '8px 14px',
              background: 'rgba(96,165,250,0.08)',
              color: '#dbeafe',
              border: '1px solid rgba(96,165,250,0.2)',
              borderRadius: 12,
              fontSize: 13,
              opacity: 0.85,
            }}
          >
            {T('dialogLaedt')}
          </div>
        )}

        {fehler && (
          <div
            style={{
              alignSelf: 'stretch',
              padding: '10px 12px',
              background: 'rgba(185,28,28,0.15)',
              border: '1px solid rgba(185,28,28,0.4)',
              borderRadius: 10,
              fontSize: 13,
              color: '#fecaca',
            }}
          >
            {T('dialogFehler')} {fehler ? `— ${fehler}` : ''}
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: 'rgba(0,0,0,0.25)',
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              senden()
            }
          }}
          placeholder={platzhalter || T('dialogPlaceholder')}
          rows={2}
          disabled={!eingabeAktiv || laedt}
          style={{
            width: '100%',
            resize: 'vertical',
            minHeight: 60,
            background: 'rgba(0,0,0,0.35)',
            color: '#f5f5f7',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 14,
            lineHeight: 1.5,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <MikrofonKnopf klein onText={(t) => setText((v) => (v ? v + ' ' + t : t))} />
          <button
            type="button"
            onClick={senden}
            disabled={!text.trim() || laedt || !eingabeAktiv}
            style={{
              background: '#f5f5f7',
              color: '#0b0b0f',
              border: 'none',
              padding: '8px 20px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: text.trim() && !laedt ? 'pointer' : 'not-allowed',
              opacity: text.trim() && !laedt ? 1 : 0.5,
            }}
          >
            {T('dialogSenden')} →
          </button>
        </div>
      </div>
    </section>
  )
}
