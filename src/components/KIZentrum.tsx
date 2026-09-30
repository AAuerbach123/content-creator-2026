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

export default function KIZentrum({ onJobStart }: { onJobStart: (jobId: string) => void }) {
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

  return (
    <section
      style={{
        width: '100%',
        maxWidth: 760,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: '28px 28px 20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          gap: 8,
        }}
      >
        <label htmlFor="ki-input" style={{ fontSize: 20, fontWeight: 600 }}>
          {T('kiPrompt')}
        </label>
        <HilfePopover
          de={'Das KI-Zentrum ist der Einstieg. Beschreib dein Ziel — die KI erkennt selbst, welcher der drei Wege passt (nur Ziel / Vorstellung im Kopf / Vorlage). „Los" legt einen Job an und öffnet den JobEditor.'}
          en={'The AI centre is the entry point. Describe your goal — the AI decides which of the three paths fits (goal only / idea in mind / reference). „Go" creates a job and opens the JobEditor.'}
          anker="ki-zentrum"
        />
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
        placeholder={T('kiPlaceholder')}
        rows={3}
        disabled={laedt}
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
        <MikrofonKnopf onText={(t) => setText((v) => (v ? `${v} ${t}` : t))} />

        <button
          type="button"
          onClick={starten}
          style={{
            background: '#f5f5f7',
            color: '#0b0b0f',
            border: 'none',
            padding: '10px 22px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: text.trim() && !laedt ? 'pointer' : 'not-allowed',
            opacity: text.trim() && !laedt ? 1 : 0.5,
            letterSpacing: '0.02em',
          }}
          disabled={!text.trim() || laedt}
        >
          {laedt ? T('dialogLaedt') : `${T('kiSenden')} →`}
        </button>
      </div>

      {fehler && (
        <p style={{ marginTop: 12, fontSize: 12, color: '#fecaca' }}>
          ⚠ {fehler}
        </p>
      )}

      <p style={{ marginTop: 12, fontSize: 11, opacity: 0.5 }}>{T('kiHinweis')}</p>
    </section>
  )
}
