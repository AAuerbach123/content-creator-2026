'use client'

// 1. Spieltag: noch keine Gewinner → Einführungstext („Heute beginnt …", ca. 4 Zeilen) statt Gewinnerblock.
// Gespeichert je Spiel + Monat; der Serien-Modus setzt ihn in alle Anzeigen des 1. Spieltags ein.
// Leer = Standardtext der Vorlage.

import { useEffect, useRef, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import { EINFUEHRUNG_TEXT_MAX, EINFUEHRUNG_TITEL_MAX, einfuehrungLaden, einfuehrungSpeichern } from '@/lib/cockpit/zeitungen-stamm'
import Feld from './Feld'
import Hinweis from './Hinweis'
import Karte from './Karte'

type Props = { spielId: string; spielName: string; monat: string }

export default function EinfuehrungKarte({ spielId, spielName, monat }: Props) {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const [titel, setTitel] = useState('')
  const [text, setText] = useState('')
  const [stand, setStand] = useState<'leer' | 'speichert' | 'gespeichert'>('leer')
  const geladen = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    geladen.current = false
    einfuehrungLaden(spielId, monat).then((e) => {
      setTitel(e?.titel ?? '')
      setText(e?.text ?? '')
      setStand(e ? 'gespeichert' : 'leer')
      geladen.current = true
    })
  }, [spielId, monat])

  // Autosave (0,6 s nach der letzten Eingabe)
  useEffect(() => {
    if (!geladen.current) return
    if (timer.current) clearTimeout(timer.current)
    setStand('speichert')
    timer.current = setTimeout(() => {
      if (titel.length > EINFUEHRUNG_TITEL_MAX || text.length > EINFUEHRUNG_TEXT_MAX) return
      void einfuehrungSpeichern(spielId, monat, titel, text).then(() => setStand(titel.trim() || text.trim() ? 'gespeichert' : 'leer'))
    }, 600)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [titel, text, spielId, monat])

  const standardTitel = spielId === 'geldregen' ? 'Heute startet der Geldregen!' : `Heute startet ${spielName}!`
  const zeilen = text.split('\n').length

  return (
    <Karte titel={de ? '1. Spieltag · Einführungstext' : 'Day 1 · Introduction text'}>
      <Hinweis art="gold">
        {de
          ? 'Am 1. Spieltag gibt es noch keine Gewinner. Hier steht stattdessen ein Einführungstext. Bleibt das Feld leer, wird der Standardtext gedruckt.'
          : 'There are no winners on day 1. An introduction text is shown instead. If left empty, the default text is printed.'}
      </Hinweis>
      <div style={{ marginTop: 14 }}>
        <Feld
          art="text"
          label={de ? 'Überschrift (freiwillig)' : 'Heading (optional)'}
          wert={titel}
          onAendern={setTitel}
          platzhalter={standardTitel}
          zaehler={{ ist: titel.length, max: EINFUEHRUNG_TITEL_MAX }}
        />
        <Feld
          art="textarea"
          label={de ? 'Einführungstext (ca. 4 Zeilen)' : 'Introduction text (approx. 4 lines)'}
          hilfe={de ? 'Zeilenumbrüche mit Enter werden übernommen.' : 'Line breaks (Enter) are kept.'}
          wert={text}
          onAendern={setText}
          zeilen={4}
          zaehler={{ ist: text.length, max: EINFUEHRUNG_TEXT_MAX }}
          fehler={zeilen > 5 ? (de ? 'Höchstens 5 Zeilen – sonst passt der Text nicht in die Anzeige.' : 'At most 5 lines – otherwise the text will not fit.') : undefined}
          platzhalter={de
            ? 'z. B. Heute beginnt unser großes Gewinnspiel! Rufen Sie an, beantworten Sie die Frage des Tages und gewinnen Sie mit etwas Glück bis zu 10.000 €. Ab morgen stellen wir Ihnen hier die Gewinner vor.'
            : 'e.g. Our big prize draw starts today! …'}
        />
        <span className={`cockpit-speicherstand${stand === 'gespeichert' ? ' aktiv' : ''}`} role="status">
          {stand === 'speichert' ? (de ? 'Speichert …' : 'Saving …') : stand === 'gespeichert' ? (de ? '✓ Gespeichert – erscheint in allen Anzeigen des 1. Spieltags' : '✓ Saved – appears in all day-1 ads') : (de ? 'Standardtext wird verwendet' : 'Default text in use')}
        </span>
      </div>
    </Karte>
  )
}
