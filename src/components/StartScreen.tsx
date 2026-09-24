'use client'

import { useState } from 'react'
import { useSprache } from './SpracheProvider'
import SpracheUmschalter from './SpracheUmschalter'
import KIZentrum from './KIZentrum'
import KartenGrid from './KartenGrid'
import JobDemo from './JobDemo'

export default function StartScreen() {
  const { T } = useSprache()
  const [nonce, setNonce] = useState(0)
  const wecken = () => setNonce((n) => n + 1)

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0b0b0f',
        color: '#f5f5f7',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              opacity: 0.5,
            }}
          >
            {T('phaseLabel')}
          </span>
          <strong style={{ fontSize: 15, letterSpacing: '-0.01em' }}>{T('appName')}</strong>
        </div>
        <SpracheUmschalter />
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 24px 64px',
        }}
      >
        <KIZentrum />
        <KartenGrid onJobAngelegt={wecken} />
        <JobDemo aktualisierenNonce={nonce} />
      </main>
    </div>
  )
}
