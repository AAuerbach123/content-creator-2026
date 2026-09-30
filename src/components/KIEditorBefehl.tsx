'use client'

import { useState } from 'react'
import { dialogAufrufen, type EditorBefehlAntwort } from '@/lib/dialog-client'
import type { Artefakt, Ebene } from '@/lib/types'
import HilfePopover from './HilfePopover'
import MikrofonKnopf from './MikrofonKnopf'
import { useSprache } from './SpracheProvider'

// KI-Editor-Brücke: freier Befehl → /api/dialog editor-befehl → Operationen auf
// die Ebenen ausführen. Wenn die KI eine Ebene per Name identifiziert, mappen
// wir case-insensitiv auf die vorhandenen Ebenen.

type Operation = {
  ebeneId?: string
  operation?: string
  faktor?: number
  deltaX?: number
  deltaY?: number
  text?: string
  farbe?: string
  reihenfolge?: number
}

function ebeneFinden(artefakt: Artefakt, hinweis?: string): Ebene | undefined {
  if (!hinweis) return undefined
  const s = hinweis.toLowerCase()
  return (
    artefakt.ebenen.find((e) => e.id === hinweis) ||
    artefakt.ebenen.find((e) => e.id.toLowerCase() === s) ||
    artefakt.ebenen.find((e) => e.name.toLowerCase().includes(s))
  )
}

function operationAnwenden(artefakt: Artefakt, op: Operation): Artefakt {
  const ziel = ebeneFinden(artefakt, op.ebeneId)
  if (!ziel) return artefakt
  const neuEbene = (aend: Partial<Ebene>): Artefakt => ({
    ...artefakt,
    ebenen: artefakt.ebenen.map((e) =>
      e.id === ziel.id
        ? {
            ...e,
            ...aend,
            eigenschaften: { ...e.eigenschaften, ...(aend.eigenschaften || {}) },
          }
        : e,
    ),
  })

  switch (op.operation) {
    case 'skaliere':
      return neuEbene({
        breite: ziel.breite * (op.faktor || 1),
        hoehe: ziel.hoehe * (op.faktor || 1),
        eigenschaften: ziel.typ === 'text'
          ? { schriftgroesse: ((ziel.eigenschaften.schriftgroesse as number) || 24) * (op.faktor || 1) }
          : undefined,
      })
    case 'verschiebe':
      return neuEbene({
        x: ziel.x + (op.deltaX || 0),
        y: ziel.y + (op.deltaY || 0),
      })
    case 'setzeText':
      return neuEbene({ eigenschaften: { text: op.text || '' } })
    case 'setzeFarbe':
      return neuEbene({ eigenschaften: { farbe: op.farbe || '#111' } })
    case 'sperre':
      return neuEbene({ eigenschaften: { gesperrt: true } })
    case 'entferne':
      return { ...artefakt, ebenen: artefakt.ebenen.filter((e) => e.id !== ziel.id) }
    case 'aendereReihenfolge': {
      const idx = artefakt.ebenen.findIndex((e) => e.id === ziel.id)
      const neu = [...artefakt.ebenen]
      const zielIdx = Math.max(0, Math.min(neu.length - 1, op.reihenfolge ?? idx))
      const [entfernt] = neu.splice(idx, 1)
      neu.splice(zielIdx, 0, entfernt)
      return { ...artefakt, ebenen: neu }
    }
    default:
      return artefakt
  }
}

export default function KIEditorBefehl({
  jobId,
  artefakt,
  onAendern,
}: {
  jobId: string
  artefakt: Artefakt
  onAendern: (neu: Artefakt) => void
}) {
  const { sprache } = useSprache()
  const [text, setText] = useState('')
  const [laedt, setLaedt] = useState(false)
  const [antwort, setAntwort] = useState<EditorBefehlAntwort | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  const senden = async () => {
    if (!text.trim()) return
    setLaedt(true)
    setFehler(null)
    try {
      const kontext = {
        artefakt: {
          format: artefakt.format,
          breite: artefakt.breite,
          hoehe: artefakt.hoehe,
          einheit: artefakt.einheit,
          ebenen: artefakt.ebenen.map((e) => ({
            id: e.id,
            name: e.name,
            typ: e.typ,
            box: { x: e.x, y: e.y, breite: e.breite, hoehe: e.hoehe },
            eigenschaften: {
              text: e.eigenschaften.text,
              schriftgroesse: e.eigenschaften.schriftgroesse,
              farbe: e.eigenschaften.farbe,
            },
          })),
        },
      }
      const res = await dialogAufrufen<EditorBefehlAntwort>('editor-befehl', {
        jobId,
        sprache,
        nutzerText: text,
        jobKontext: kontext,
      })
      if (!res.ok || !res.daten) {
        setFehler(res.fehler || 'Kein JSON zurückbekommen.')
        return
      }
      setAntwort(res.daten)
      let neu = artefakt
      for (const op of res.daten.operationen || []) {
        neu = operationAnwenden(neu, op as Operation)
      }
      onAendern(neu)
      setText('')
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(false)
    }
  }

  return (
    <section
      style={{
        background: 'rgba(96,165,250,0.06)',
        border: '1px solid rgba(96,165,250,0.25)',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd' }}>
          {sprache === 'de' ? '💬 Freier Befehl an die KI (Editor)' : '💬 Freeform AI editor command'}
        </div>
        <HilfePopover
          de={'Sprich oder tippe deinen Wunsch — z. B. „mach die Headline größer und rück das Logo nach rechts". Die KI übersetzt das in konkrete Operationen (skaliere, verschiebe, setzeText, setzeFarbe, aendereReihenfolge, entferne).'}
          en={'Speak or type your wish — e.g. „make the headline bigger and push the logo right". The AI turns it into concrete ops (scale, move, setText, setColor, reorder, remove).'}
          anker="ki-editor-befehl"
        />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={text}
          placeholder={
            sprache === 'de'
              ? 'z. B. „mach die Headline größer und rück das Logo nach rechts"'
              : 'e.g. "make the headline bigger and push the logo right"'
          }
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && senden()}
          disabled={laedt}
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.35)',
            color: '#f5f5f7',
            border: '1px solid rgba(255,255,255,0.14)',
            padding: '7px 10px',
            borderRadius: 5,
            fontSize: 12,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <MikrofonKnopf klein onText={(t) => setText((v) => (v ? `${v} ${t}` : t))} />
        <button
          type="button"
          onClick={senden}
          disabled={laedt || !text.trim()}
          style={{
            background: '#60a5fa',
            color: '#0b0b0f',
            border: 'none',
            padding: '7px 14px',
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 700,
            cursor: laedt ? 'not-allowed' : 'pointer',
            opacity: laedt || !text.trim() ? 0.5 : 1,
          }}
        >
          {laedt ? '…' : sprache === 'de' ? 'Ausführen' : 'Run'}
        </button>
      </div>
      {antwort?.kommentar && (
        <p style={{ margin: 0, fontSize: 11, color: '#93c5fd' }}>ℹ {antwort.kommentar}</p>
      )}
      {fehler && <p style={{ margin: 0, fontSize: 11, color: '#fecaca' }}>⚠ {fehler}</p>}
    </section>
  )
}
