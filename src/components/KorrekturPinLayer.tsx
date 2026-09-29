'use client'

// Klickbares Overlay über einem Artefakt-Renderer. Klick platziert einen neuen
// Pin (Nutzer gibt Kommentar ein). Bereits vorhandene Pins werden als Badges
// mit Nummer angezeigt; Klick öffnet den Kommentar-Thread.

import { useState } from 'react'
import type { Korrekturpin, Pinstatus } from '@/lib/types'

export default function KorrekturPinLayer({
  breite,
  hoehe,
  pins,
  bearbeitbar = true,
  onNeu,
  onAntwort,
  onStatus,
}: {
  breite: number
  hoehe: number
  pins: Korrekturpin[]
  bearbeitbar?: boolean
  onNeu?: (info: { x: number; y: number; kommentar: string; autor?: string }) => void
  onAntwort?: (pinId: string, antwort: { autor?: string; text: string }) => void
  onStatus?: (pinId: string, status: Pinstatus) => void
}) {
  const [neu, setNeu] = useState<{ x: number; y: number; text: string; autor: string } | null>(null)
  const [offenerPin, setOffenerPin] = useState<string | null>(null)

  const klick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!bearbeitbar || !onNeu) return
    if (neu) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setNeu({ x, y, text: '', autor: '' })
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        cursor: bearbeitbar && !neu ? 'crosshair' : 'default',
      }}
      onClick={klick}
    >
      {pins.map((p, idx) => {
        const farbe =
          p.status === 'offen' ? '#f59e0b' : p.status === 'erledigt' ? '#34d399' : '#94a3b8'
        return (
          <div key={p.id} style={{ position: 'absolute', left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOffenerPin(offenerPin === p.id ? null : p.id)
              }}
              style={{
                position: 'absolute',
                transform: 'translate(-50%, -100%)',
                background: farbe,
                color: '#0b0b0f',
                border: '2px solid #fff',
                borderRadius: '50% 50% 50% 4px',
                width: 26,
                height: 26,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
              }}
            >
              {idx + 1}
            </button>
            {offenerPin === p.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 12,
                  transform: 'translateY(-100%)',
                  background: '#ffffff',
                  color: '#0b0b0f',
                  padding: 10,
                  borderRadius: 10,
                  minWidth: 240,
                  fontSize: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  #{idx + 1} — {p.autor || 'anonym'}
                </div>
                <div>{p.kommentar}</div>
                {p.antworten?.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#f5f5f7',
                      padding: 6,
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                  >
                    <strong>{a.autor || 'Grafiker'}:</strong> {a.text}
                  </div>
                ))}
                {onAntwort && (
                  <AntwortFeld pinId={p.id} onAntwort={onAntwort} />
                )}
                {onStatus && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['offen', 'erledigt', 'abgelehnt'] as Pinstatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onStatus(p.id, s)}
                        style={{
                          background: p.status === s ? '#0b0b0f' : 'transparent',
                          color: p.status === s ? '#ffffff' : '#0b0b0f',
                          border: '1px solid rgba(0,0,0,0.2)',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {neu && bearbeitbar && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `${neu.x * 100}%`,
            top: `${neu.y * 100}%`,
            transform: 'translate(-50%, 8px)',
            background: '#ffffff',
            color: '#0b0b0f',
            padding: 10,
            borderRadius: 10,
            minWidth: 240,
            fontSize: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <input
            type="text"
            value={neu.autor}
            onChange={(e) => setNeu({ ...neu, autor: e.target.value })}
            placeholder="Ihr Name (optional)"
            style={{ padding: '5px 8px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 5, fontSize: 12 }}
          />
          <textarea
            value={neu.text}
            onChange={(e) => setNeu({ ...neu, text: e.target.value })}
            placeholder="Änderungswunsch beschreiben …"
            rows={3}
            autoFocus
            style={{ padding: '5px 8px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 5, fontSize: 12, resize: 'vertical', minHeight: 60 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
            <button
              type="button"
              onClick={() => setNeu(null)}
              style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.15)', padding: '4px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={!neu.text.trim()}
              onClick={() => {
                onNeu?.({ x: neu.x, y: neu.y, kommentar: neu.text.trim(), autor: neu.autor.trim() || undefined })
                setNeu(null)
              }}
              style={{
                background: '#0b0b0f',
                color: '#fff',
                border: 'none',
                padding: '4px 12px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: neu.text.trim() ? 'pointer' : 'not-allowed',
                opacity: neu.text.trim() ? 1 : 0.5,
              }}
            >
              Absenden
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AntwortFeld({
  pinId,
  onAntwort,
}: {
  pinId: string
  onAntwort: (pinId: string, antwort: { autor?: string; text: string }) => void
}) {
  const [text, setText] = useState('')
  const [autor, setAutor] = useState('')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 6 }}>
      <input
        type="text"
        value={autor}
        onChange={(e) => setAutor(e.target.value)}
        placeholder="Name (optional)"
        style={{ padding: '4px 6px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 4, fontSize: 11 }}
      />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.trim()) {
            onAntwort(pinId, { autor: autor.trim() || undefined, text: text.trim() })
            setText('')
          }
        }}
        placeholder="Antwort …"
        style={{ padding: '4px 6px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 4, fontSize: 11 }}
      />
    </div>
  )
}
