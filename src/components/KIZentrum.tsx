'use client'

import { useCallback, useState } from 'react'
import { jobErstellen } from '@/lib/db'
import { dialogAufrufen, type EinstiegAntwort } from '@/lib/dialog-client'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'
import MikrofonKnopf from './MikrofonKnopf'

// KI-Zentrum: der große Einstiegs-Prompt. Bei „Los" legt es einen Job an,
// fragt /api/dialog nach dem erkannten Einstiegsweg und öffnet den JobEditor.

const EINSTIEG_ZU_JOB: Record<
  EinstiegAntwort['einstieg'],
  'A-ohne-vorstellung' | 'B-vorstellung-im-kopf' | 'C-vorlage' | undefined
> = {
  'A-ohne-vorstellung': 'A-ohne-vorstellung',
  'B-vorstellung-im-kopf': 'B-vorstellung-im-kopf',
  'C-vorlage': 'C-vorlage',
  nachfrage: undefined,
}

export default function KIZentrum({
  onJobStart,
  kompakt = false,
}: {
  onJobStart: (jobId: string) => void
  /** schmalere Variante für die Mitte des Funktionskreises */
  kompakt?: boolean
}) {
  const { T, sprache } = useSprache()
  const [text, setText] = useState('')
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const starten = useCallback(async () => {
    const t = text.trim()
    if (!t || laedt) return
    setFehler(null)
    setLaedt(true)
    try {
      const titel = t.slice(0, 60)
      const neuerJob = await jobErstellen(titel, t)

      // Erste KI-Nachricht in den Dialog aufnehmen (der Nutzer-Text als erste user-Nachricht)
      const jetzt = Date.now()
      const dialog: import('@/lib/types').Nachricht[] = [
        { id: crypto.randomUUID(), rolle: 'nutzer', text: t, zeitpunkt: jetzt },
      ]

      const antwort = await dialogAufrufen<EinstiegAntwort>('einstieg-erkennen', {
        jobId: neuerJob.id,
        sprache,
        nutzerText: t,
      })

      if (antwort.ok && antwort.daten) {
        const daten = antwort.daten
        const einstieg = EINSTIEG_ZU_JOB[daten.einstieg]
        const kanal = daten.kanal || undefined
        const kiText = daten.naechsteFrage || daten.vermutetesZiel || ''
        if (kiText) {
          dialog.push({
            id: crypto.randomUUID(),
            rolle: 'ki',
            text: kiText,
            zeitpunkt: Date.now(),
          })
        }
        const gepatcht = {
          ...neuerJob,
          einstieg,
          kanal: kanal && kanal in { zeitung:1,zeitschrift:1,'web-banner-mrec':1,'web-banner-leaderboard':1,'web-banner-skyscraper':1,'web-banner-billboard':1,'web-content':1,'ig-feed':1,'ig-story':1,'ig-reel':1,'fb-post':1,'linkedin-post':1,'x-post':1,kurzvideo:1 } ? (kanal as typeof neuerJob.kanal) : undefined,
          dialog,
        }
        const { jobSpeichern } = await import('@/lib/db')
        await jobSpeichern(gepatcht)
      } else {
        // KI hat gepatzt — der Job existiert trotzdem, wir öffnen ihn mit Fehler-Systemnachricht
        dialog.push({
          id: crypto.randomUUID(),
          rolle: 'system',
          text:
            (sprache === 'de'
              ? 'Der KI-Router hat gerade nicht geantwortet. Wähle den Einstieg manuell.'
              : 'The AI router did not respond. Pick your entry manually.') +
            (antwort.fehler ? ` (${antwort.fehler})` : ''),
          zeitpunkt: Date.now(),
        })
        const gepatcht = { ...neuerJob, dialog }
        const { jobSpeichern } = await import('@/lib/db')
        await jobSpeichern(gepatcht)
      }

      onJobStart(neuerJob.id)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(false)
    }
  }, [laedt, onJobStart, sprache, text])

  // Telemedia-Farben: Rot #C8102E (Los-Knopf, Akzent), Dunkelrot #9E0B22 (Hover),
  // zartrosa #F9E6EA / #FBF5F7 (Textfeld), Grau-Text #6E7380, Schrift #1d1d1f.
  const bereit = !!text.trim() && !laedt

  return (
    <section
      style={{
        width: '100%',
        maxWidth: 1000,
        background: '#ffffff',
        border: '1px solid #EBC5CD',
        borderTop: '5px solid #C8102E',
        borderRadius: kompakt ? 20 : 22,
        padding: kompakt ? '20px 22px 16px' : '34px 38px 26px',
        boxShadow: '0 18px 50px rgba(158,11,34,0.13), 0 2px 6px rgba(0,0,0,0.04)',
        color: '#1d1d1f',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: kompakt ? 10 : 14,
          gap: 8,
        }}
      >
        <label
          htmlFor="ki-input"
          style={{ fontSize: kompakt ? 24 : 32, fontWeight: 800, letterSpacing: '-0.01em', color: '#1d1d1f' }}
        >
          {T('kiPrompt')}
        </label>
        <span style={{ color: '#9E0B22', flexShrink: 0 }}>
          <HilfePopover
            de={'Das KI-Zentrum ist der Einstieg. Beschreib dein Ziel — die KI erkennt selbst, welcher der drei Wege passt (nur Ziel / Vorstellung im Kopf / Vorlage). „Los" legt einen Job an und öffnet den JobEditor.'}
            en={'The AI centre is the entry point. Describe your goal — the AI decides which of the three paths fits (goal only / idea in mind / reference). „Go" creates a job and opens the JobEditor.'}
            anker="ki-zentrum"
          />
        </span>
      </div>

      <textarea
        id="ki-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            starten()
          }
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#C8102E'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(200,16,46,0.15)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#E3C3CA'
          e.currentTarget.style.boxShadow = 'none'
        }}
        placeholder={T('kiPlaceholder')}
        rows={3}
        disabled={laedt}
        style={{
          width: '100%',
          display: 'block',
          resize: kompakt ? 'none' : 'vertical',
          minHeight: kompakt ? 110 : 170,
          background: '#FBF5F7',
          color: '#1d1d1f',
          border: '1.5px solid #E3C3CA',
          borderRadius: 12,
          padding: kompakt ? '12px 14px' : '16px 18px',
          fontSize: kompakt ? 17 : 20,
          lineHeight: 1.45,
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 120ms ease, box-shadow 120ms ease',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: kompakt ? 10 : 14,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: '#9E0B22' }}>
          <MikrofonKnopf onText={(t) => setText((v) => (v ? `${v} ${t}` : t))} />
        </span>

        <button
          type="button"
          onClick={starten}
          onMouseEnter={(e) => {
            if (bereit) e.currentTarget.style.background = '#9E0B22'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#C8102E'
          }}
          style={{
            background: '#C8102E',
            color: '#ffffff',
            border: 'none',
            padding: kompakt ? '12px 28px' : '15px 36px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: kompakt ? 17 : 19,
            cursor: bereit ? 'pointer' : 'not-allowed',
            opacity: bereit ? 1 : 0.5,
            letterSpacing: '0.02em',
            boxShadow: bereit ? '0 6px 16px rgba(200,16,46,0.30)' : 'none',
            transition: 'background 120ms ease',
            fontFamily: 'inherit',
          }}
          disabled={!bereit}
        >
          {laedt ? T('dialogLaedt') : `${T('kiSenden')} →`}
        </button>
      </div>

      {fehler && (
        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: '#9E0B22' }}>
          ⚠ {fehler}
        </p>
      )}

      {!kompakt && (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 11.5, color: '#6E7380' }}>{T('kiHinweis')}</p>
      )}
    </section>
  )
}
