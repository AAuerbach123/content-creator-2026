'use client'

import { useEffect, useRef, useState } from 'react'
import { useSprache } from './SpracheProvider'

// Web Speech API — dünner Wrapper. Nur Chrome/Edge/Safari (webkit).
// Ergibt beim Sprechen einen Zwischen- und einen finalen Text; gibt den finalen
// Text via onText an den Aufrufer zurück.

type Erk = {
  new (): Erk
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: (event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void
  onend: () => void
  onerror: (event: { error: string }) => void
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: Erk
    webkitSpeechRecognition?: Erk
  }
}

export default function MikrofonKnopf({
  onText,
  klein = false,
}: {
  onText: (text: string) => void
  klein?: boolean
}) {
  const { T, sprache } = useSprache()
  const [aktiv, setAktiv] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [verfuegbar, setVerfuegbar] = useState(true)
  const erkennerRef = useRef<InstanceType<Erk> | null>(null)

  useEffect(() => {
    const ctor =
      typeof window !== 'undefined'
        ? (window.SpeechRecognition || window.webkitSpeechRecognition)
        : undefined
    if (!ctor) setVerfuegbar(false)
  }, [])

  const starten = () => {
    const ctor =
      typeof window !== 'undefined'
        ? (window.SpeechRecognition || window.webkitSpeechRecognition)
        : undefined
    if (!ctor) {
      setVerfuegbar(false)
      return
    }
    setFehler(null)
    const erkenner = new ctor()
    erkenner.continuous = false
    erkenner.interimResults = false
    erkenner.lang = sprache === 'en' ? 'en-US' : 'de-DE'
    erkenner.onresult = (event) => {
      const letztes = event.results[event.results.length - 1]
      if (letztes && letztes.isFinal) {
        onText(letztes[0].transcript)
      }
    }
    erkenner.onend = () => setAktiv(false)
    erkenner.onerror = (e) => {
      setFehler(e.error || 'error')
      setAktiv(false)
    }
    erkennerRef.current = erkenner
    erkenner.start()
    setAktiv(true)
  }

  const stoppen = () => {
    erkennerRef.current?.stop()
    setAktiv(false)
  }

  if (!verfuegbar) {
    return (
      <span
        title={T('mikroNichtVerfuegbar')}
        style={{
          fontSize: klein ? 11 : 12,
          opacity: 0.4,
          padding: klein ? '4px 8px' : '6px 12px',
          border: '1px dashed rgba(255,255,255,0.2)',
          borderRadius: 6,
        }}
      >
        🎙 —
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={aktiv ? stoppen : starten}
        title={aktiv ? T('kiMikroAus') : T('kiMikro')}
        style={{
          background: aktiv ? '#b91c1c' : 'transparent',
          color: aktiv ? '#fee2e2' : '#f5f5f7',
          border: `1px solid ${aktiv ? '#7f1d1d' : 'rgba(255,255,255,0.15)'}`,
          padding: klein ? '4px 10px' : '8px 12px',
          borderRadius: 8,
          fontSize: klein ? 12 : 13,
          cursor: 'pointer',
          fontWeight: 600,
          transition: 'background 120ms ease',
        }}
      >
        🎙 {aktiv ? T('kiMikroAus') : T('kiMikro')}
      </button>
      {fehler && (
        <span style={{ marginLeft: 8, fontSize: 11, color: '#fca5a5' }}>
          {T('mikroFehler')}: {fehler}
        </span>
      )}
    </>
  )
}
