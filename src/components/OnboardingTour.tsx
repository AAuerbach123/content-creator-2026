'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSprache } from './SpracheProvider'

// Fünf-Schritte-Onboarding als Modal. Zeigt sich nur beim ersten Öffnen des
// Tools; das localStorage-Flag `content-creator-2026:onboarding-fertig` hält
// die Wahl. Andreas kann die Tour über „?"-Knopf im Header wieder starten.

const STORAGE_KEY = 'content-creator-2026:onboarding-fertig'

const SCHRITTE_DE = [
  {
    titel: '1 · KI in der Mitte',
    text:
      'Beschreib dein Ziel im großen Feld — „Was produzieren wir heute?". Die KI erkennt selbst, ob du eine Vorlage, eine Vorstellung oder nur ein Ziel hast, und führt dich den passenden Weg.',
  },
  {
    titel: '2 · Drei Wege',
    text:
      'A) Nur ein Ziel: die KI schlägt drei Richtungen vor. B) Vorstellung im Kopf: die KI stellt max. 5 Fragen. C) Vorlage hochladen: die KI analysiert Farben, Schriften, Textgefäße.',
  },
  {
    titel: '3 · Erzeugen + Editieren',
    text:
      '„KI schlägt komplettes Design vor" füllt Bild, Headline, Sub und CTA in einem Rutsch. Danach umschalten auf „Editor": Ebenen ziehen, Doppelklick auf Text, Sprachbefehl an die KI.',
  },
  {
    titel: '4 · Abgeben',
    text:
      'PNG/JPG/WebP in 1× oder 2×, Vektor-PDF in mm für Print (Beschnitt + Schnittmarken), Social-Paket als ZIP, Adobe-Paket, Job-Backup. Kurzvideos rendern lokal via Remotion.',
  },
  {
    titel: '5 · Freigabe',
    text:
      'Im Korrekturportal-Bereich einen Link erzeugen und dem Verlag geben. Der Kunde klickt auf eine Stelle, hinterlässt den Wunsch — du siehst die Pins im Editor mit Kommentar-Thread und Status.',
  },
]

const SCHRITTE_EN = [
  {
    titel: '1 · AI in the center',
    text:
      'Describe your goal in the big field — "What are we producing today?". The AI figures out whether you have a reference, an idea or just a goal, and picks the right path.',
  },
  {
    titel: '2 · Three paths',
    text:
      'A) Only a goal: AI proposes three directions. B) Idea in mind: max 5 open questions. C) Upload reference: AI analyses colors, fonts, slots.',
  },
  {
    titel: '3 · Generate + edit',
    text:
      '"AI proposes complete design" fills image, headline, sub, CTA in one go. Switch to "Editor": drag layers, double-click text, AI voice command.',
  },
  {
    titel: '4 · Export',
    text:
      'PNG/JPG/WebP 1× or 2×, vector PDF in mm for print (bleed + crop marks), social ZIP, Adobe package, job backup. Short videos render locally via Remotion.',
  },
  {
    titel: '5 · Approval',
    text:
      'In the correction portal create a share link. Customer clicks the artwork, leaves the request — you see pins in your editor with a comment thread and status.',
  },
]

export default function OnboardingTour({ manuell = false, onSchliessen }: { manuell?: boolean; onSchliessen?: () => void }) {
  const { sprache } = useSprache()
  const [offen, setOffen] = useState(false)
  const [schritt, setSchritt] = useState(0)

  useEffect(() => {
    if (manuell) {
      setOffen(true)
      setSchritt(0)
      return
    }
    if (typeof window === 'undefined') return
    if (!window.localStorage.getItem(STORAGE_KEY)) setOffen(true)
  }, [manuell])

  const schliessen = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, '1')
    setOffen(false)
    onSchliessen?.()
  }, [onSchliessen])

  if (!offen) return null

  const liste = sprache === 'de' ? SCHRITTE_DE : SCHRITTE_EN
  const aktuell = liste[schritt]

  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#0b0b0f',
          color: '#f5f5f7',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 14,
          padding: 24,
          maxWidth: 480,
          width: '100%',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Roboto, sans-serif',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {liste.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= schritt ? '#60a5fa' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>{aktuell.titel}</h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.55, opacity: 0.85 }}>{aktuell.text}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={schliessen}
            style={{
              background: 'transparent',
              color: '#f5f5f7',
              border: 'none',
              padding: 0,
              fontSize: 12,
              opacity: 0.55,
              cursor: 'pointer',
            }}
          >
            {sprache === 'de' ? 'Überspringen' : 'Skip'}
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {schritt > 0 && (
              <button
                type="button"
                onClick={() => setSchritt((s) => s - 1)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#f5f5f7',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '8px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                ← {sprache === 'de' ? 'Zurück' : 'Back'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (schritt === liste.length - 1) schliessen()
                else setSchritt((s) => s + 1)
              }}
              style={{
                background: '#f5f5f7',
                color: '#0b0b0f',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {schritt === liste.length - 1
                ? sprache === 'de'
                  ? 'Los!'
                  : "Let's go!"
                : sprache === 'de'
                  ? 'Weiter'
                  : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
