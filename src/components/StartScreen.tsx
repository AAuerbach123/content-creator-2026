'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { useSprache } from './SpracheProvider'
import HandbuchKnopf from './HandbuchKnopf'
import HilfePopover from './HilfePopover'
import SpracheUmschalter from './SpracheUmschalter'
import KIZentrum from './KIZentrum'
import KartenGrid from './KartenGrid'
import JobDemo from './JobDemo'
import JobEditor from './JobEditor'
import OnboardingTour from './OnboardingTour'

// Root-Ansicht: entweder Startbildschirm (KI-Zentrum + Karten) oder JobEditor
// für einen konkreten Job. Wechsel via useState — kein Routing nötig.

export default function StartScreen() {
  const { T, sprache } = useSprache()
  const [nonce, setNonce] = useState(0)
  const [offenerJob, setOffenerJob] = useState<string | null>(null)
  const [tourManuell, setTourManuell] = useState(false)

  const wecken = useCallback(() => setNonce((n) => n + 1), [])
  const jobOeffnen = useCallback((id: string) => setOffenerJob(id), [])
  const zurueck = useCallback(() => {
    setOffenerJob(null)
    setNonce((n) => n + 1)
  }, [])

  if (offenerJob) {
    return <JobEditor jobId={offenerJob} onZurueck={zurueck} />
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f6f5f2',
        color: '#0b0b0f',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Abgeschwächtes Telemedia-Logo als Hintergrund. Bewusst dezent
          (opacity ~0.07), damit die Schrift auf hellem Papier lesbar bleibt.
          `pointer-events:none` → kein Klick-Fänger. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/telemedia-logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'min(88vw, 1100px)',
          opacity: 0.08,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <strong style={{ fontSize: 15, letterSpacing: '-0.01em' }}>{T('appName')}</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <HandbuchKnopf anker="start" />
          <Link
            href="/uebersicht"
            style={{
              color: '#0b0b0f',
              textDecoration: 'none',
              fontSize: 12,
              padding: '5px 10px',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 5,
              opacity: 0.85,
            }}
          >
            {sprache === 'de' ? 'Übersicht' : 'Overview'}
          </Link>
          <button
            type="button"
            onClick={() => setTourManuell(true)}
            title={sprache === 'de' ? 'Kurz-Tour zeigen' : 'Show short tour'}
            style={{
              width: 26,
              height: 26,
              padding: 0,
              borderRadius: '50%',
              background: 'transparent',
              color: '#0b0b0f',
              border: '1px solid rgba(0,0,0,0.2)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ?
          </button>
          <SpracheUmschalter />
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 24px 64px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <KIZentrum onJobStart={jobOeffnen} />
        <KartenGrid onJobAngelegt={wecken} onJobOeffnen={jobOeffnen} />
        <JobDemo aktualisierenNonce={nonce} onJobOeffnen={jobOeffnen} />
      </main>

      <OnboardingTour manuell={tourManuell} onSchliessen={() => setTourManuell(false)} />
    </div>
  )
}
