'use client'

import { useCallback, useEffect, useState } from 'react'
import { alleJobsLaden, jobErstellen } from '@/lib/db'
import { useSprache } from './SpracheProvider'
import type { Schluessel } from '@/lib/i18n'

type KartenDef = {
  titel: Schluessel
  hinweis: Schluessel
  icon: string
  aktiv: boolean
  onClick?: () => void | Promise<void>
  badge?: string
}

export default function KartenGrid({ onJobAngelegt }: { onJobAngelegt?: () => void }) {
  const { T } = useSprache()
  const [jobAnzahl, setJobAnzahl] = useState(0)

  const nachladen = useCallback(async () => {
    setJobAnzahl((await alleJobsLaden()).length)
  }, [])

  useEffect(() => {
    nachladen()
  }, [nachladen])

  const neuerJob = useCallback(async () => {
    const nummer = (await alleJobsLaden()).length + 1
    await jobErstellen(`Job #${nummer}`, '')
    await nachladen()
    onJobAngelegt?.()
  }, [nachladen, onJobAngelegt])

  const karten: KartenDef[] = [
    { titel: 'cardNewJob', hinweis: 'cardNewJobHint', icon: '＋', aktiv: true, onClick: neuerJob },
    {
      titel: 'cardActiveJobs',
      hinweis: 'cardActiveJobsHint',
      icon: '▤',
      aktiv: false,
      badge: jobAnzahl > 0 ? String(jobAnzahl) : undefined,
    },
    { titel: 'cardBrandKits', hinweis: 'cardBrandKitsHint', icon: '◐', aktiv: false },
    { titel: 'cardTemplates', hinweis: 'cardTemplatesHint', icon: '▧', aktiv: false },
    { titel: 'cardAssets', hinweis: 'cardAssetsHint', icon: '⬒', aktiv: false },
    { titel: 'cardExports', hinweis: 'cardExportsHint', icon: '↥', aktiv: false },
  ]

  return (
    <section
      style={{
        width: '100%',
        maxWidth: 960,
        marginTop: 28,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}
    >
      {karten.map((karte) => (
        <button
          key={karte.titel}
          type="button"
          onClick={karte.onClick}
          disabled={!karte.aktiv}
          style={{
            position: 'relative',
            textAlign: 'left',
            background: karte.aktiv
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.025)',
            border: `1px solid ${
              karte.aktiv ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'
            }`,
            borderRadius: 14,
            padding: '18px 16px',
            color: '#f5f5f7',
            cursor: karte.aktiv ? 'pointer' : 'not-allowed',
            transition: 'background 120ms ease, border-color 120ms ease',
            opacity: karte.aktiv ? 1 : 0.55,
            fontFamily: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            minHeight: 108,
          }}
          onMouseEnter={(e) => {
            if (karte.aktiv) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.24)'
            }
          }}
          onMouseLeave={(e) => {
            if (karte.aktiv) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
            }
          }}
        >
          <span aria-hidden style={{ fontSize: 22, opacity: 0.85 }}>
            {karte.icon}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{T(karte.titel)}</span>
          <span style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.35 }}>{T(karte.hinweis)}</span>

          {karte.badge && (
            <span
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: '#f5f5f7',
                color: '#0b0b0f',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 999,
                minWidth: 20,
                textAlign: 'center',
              }}
            >
              {karte.badge}
            </span>
          )}

          {!karte.aktiv && (
            <span
              style={{
                position: 'absolute',
                bottom: 10,
                right: 12,
                fontSize: 10,
                opacity: 0.5,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {T('cardComingSoon')}
            </span>
          )}
        </button>
      ))}
    </section>
  )
}
