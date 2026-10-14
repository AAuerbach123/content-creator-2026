'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { useSprache } from './SpracheProvider'
import HandbuchKnopf from './HandbuchKnopf'
import SpracheUmschalter from './SpracheUmschalter'
import KIZentrum from './KIZentrum'
import KartenGrid, { KREIS_AB_BREITE, useFenster } from './KartenGrid'
import JobDemo from './JobDemo'
import JobEditor from './JobEditor'
import OnboardingTour from './OnboardingTour'

// Root-Ansicht: entweder Startbildschirm (KI-Zentrum + Karten) oder JobEditor
// für einen konkreten Job. Wechsel via useState — kein Routing nötig.

export default function StartScreen() {
  const { T } = useSprache()
  const fenster = useFenster()
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

  const layout = fenster && fenster.w >= KREIS_AB_BREITE ? 'kreis' : 'raster'
  const schmal = !fenster || fenster.w < 640

  const kopfKnopf = {
    color: '#1d1d1f',
    textDecoration: 'none',
    fontSize: 12,
    padding: '5px 10px',
    border: '1px solid #D2D4DC',
    borderRadius: 6,
    background: '#ffffff',
  } as const

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        color: '#1d1d1f',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        position: 'relative',
        overflowX: 'clip',
        borderTop: '4px solid #C8102E',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: schmal ? '10px 14px' : '12px 24px',
          borderBottom: '1px solid #ECEDF1',
          background: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          {/* Telemedia-Logo (1119×388, rot/grau auf transparent) */}
          <img
            src="/telemedia-logo.png"
            alt={T('startLogoAlt')}
            width={1119}
            height={388}
            style={{ height: schmal ? 44 : 52, width: 'auto', display: 'block', flexShrink: 0 }}
          />
          {!schmal && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#6E7380',
                borderLeft: '1px solid #D2D4DC',
                paddingLeft: 14,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              {T('appName')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', color: '#1d1d1f' }}>
          <HandbuchKnopf anker="start" />
          <Link href="/uebersicht" style={kopfKnopf}>
            {T('startUebersicht')}
          </Link>
          <button
            type="button"
            onClick={() => setTourManuell(true)}
            title={T('startTourZeigen')}
            aria-label={T('startTourZeigen')}
            style={{
              width: 28,
              height: 28,
              padding: 0,
              borderRadius: '50%',
              background: '#ffffff',
              color: '#C8102E',
              border: '1.5px solid #C8102E',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
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
          padding: layout === 'kreis' ? '16px 24px 56px' : schmal ? '20px 14px 48px' : '28px 24px 56px',
          // bis die Fenstergröße bekannt ist unsichtbar → kein Springen Raster→Kreis
          opacity: fenster ? 1 : 0,
          transition: 'opacity 160ms ease',
          minWidth: 0,
        }}
      >
        <KartenGrid
          layout={layout}
          zentrum={({ kompakt }) => <KIZentrum onJobStart={jobOeffnen} kompakt={kompakt} />}
          onJobAngelegt={wecken}
          onJobOeffnen={jobOeffnen}
        />
        <div
          id="laufende-jobs"
          style={{
            width: '100%',
            maxWidth: 960,
            display: 'flex',
            justifyContent: 'center',
            scrollMarginTop: 16,
            marginTop: layout === 'kreis' ? 8 : 0,
          }}
        >
          <JobDemo aktualisierenNonce={nonce} onJobOeffnen={jobOeffnen} />
        </div>
      </main>

      <OnboardingTour manuell={tourManuell} onSchliessen={() => setTourManuell(false)} />
    </div>
  )
}
