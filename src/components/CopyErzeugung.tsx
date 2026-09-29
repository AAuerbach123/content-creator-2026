'use client'

import { useState } from 'react'
import { copyErzeugen, type CopyAntwort } from '@/lib/dialog-client'
import { useSprache } from './SpracheProvider'

type Slot = 'headline' | 'subline' | 'cta' | 'body' | 'caption' | 'hashtags'
const SLOTS: Slot[] = ['headline', 'subline', 'cta', 'body', 'caption', 'hashtags']

const SLOT_LABEL_DE: Record<Slot, string> = {
  headline: 'Headline',
  subline: 'Subline',
  cta: 'CTA',
  body: 'Body',
  caption: 'Caption (Social)',
  hashtags: 'Hashtags',
}
const SLOT_LABEL_EN: Record<Slot, string> = {
  headline: 'Headline',
  subline: 'Subline',
  cta: 'CTA',
  body: 'Body',
  caption: 'Caption (social)',
  hashtags: 'Hashtags',
}

const TOENE = ['nuechtern', 'frech', 'seriös', 'werblich', 'empathisch'] as const

export default function CopyErzeugung({
  jobId,
  briefing,
  ziel,
  kanal,
  onUebernehmen,
}: {
  jobId: string
  briefing?: string
  ziel?: string
  kanal?: string
  onUebernehmen: (slot: Slot, text: string) => void
}) {
  const { sprache } = useSprache()
  const [slot, setSlot] = useState<Slot>('headline')
  const [ton, setTon] = useState<(typeof TOENE)[number]>('nuechtern')
  const [antwort, setAntwort] = useState<CopyAntwort | null>(null)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const labels = sprache === 'de' ? SLOT_LABEL_DE : SLOT_LABEL_EN

  const holen = async () => {
    setLaedt(true)
    setFehler(null)
    try {
      const res = await copyErzeugen({ jobId, slot, briefing, ziel, kanal, ton, sprache, anzahl: 3 })
      if (!res.ok) setFehler(res.fehler || 'unbekannter Fehler')
      setAntwort(res)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(false)
    }
  }

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value as Slot)}
          style={{
            background: 'rgba(0,0,0,0.35)',
            color: '#f5f5f7',
            border: '1px solid rgba(255,255,255,0.14)',
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {SLOTS.map((s) => (
            <option key={s} value={s}>
              {labels[s]}
            </option>
          ))}
        </select>
        <select
          value={ton}
          onChange={(e) => setTon(e.target.value as (typeof TOENE)[number])}
          style={{
            background: 'rgba(0,0,0,0.35)',
            color: '#f5f5f7',
            border: '1px solid rgba(255,255,255,0.14)',
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {TOENE.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={holen}
          disabled={laedt}
          style={{
            background: '#f5f5f7',
            color: '#0b0b0f',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 13,
            cursor: laedt ? 'not-allowed' : 'pointer',
            opacity: laedt ? 0.55 : 1,
          }}
        >
          {laedt ? (sprache === 'de' ? 'Denke …' : 'Thinking …') : sprache === 'de' ? '3 Vorschläge' : '3 suggestions'}
        </button>
      </div>

      {fehler && <p style={{ margin: 0, color: '#fecaca', fontSize: 12 }}>⚠ {fehler}</p>}

      {antwort?.varianten && antwort.varianten.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {antwort.varianten.map((v, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: '#f5f5f7', flex: 1, lineHeight: 1.4 }}>{v}</span>
              <button
                type="button"
                onClick={() => onUebernehmen(slot, v)}
                style={{
                  background: '#f5f5f7',
                  color: '#0b0b0f',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {sprache === 'de' ? 'Nehmen' : 'Use'}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
