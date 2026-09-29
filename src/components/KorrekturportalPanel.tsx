'use client'

import { useCallback, useEffect, useState } from 'react'
import { freigabeErstellen, freigabeLoeschen, freigabenFuerJob } from '@/lib/db'
import type { Freigabe, Job } from '@/lib/types'
import { useSprache } from './SpracheProvider'

// Panel für den Grafiker: Freigabe-Link erzeugen, teilen, Freigaben löschen.
// Der Link ist http://localhost:3000/review/<token> — kunden brauchen kein Login.

export default function KorrekturportalPanel({ job, artefaktId }: { job: Job; artefaktId?: string }) {
  const { sprache } = useSprache()
  const [freigaben, setFreigaben] = useState<Freigabe[]>([])
  const [kopiert, setKopiert] = useState<string | null>(null)

  const laden = useCallback(async () => {
    setFreigaben(await freigabenFuerJob(job.id))
  }, [job.id])

  useEffect(() => {
    laden()
  }, [laden])

  const erzeugen = useCallback(async () => {
    if (!artefaktId) return
    await freigabeErstellen(job.id, artefaktId, job.titel)
    await laden()
  }, [artefaktId, job.id, job.titel, laden])

  const link = (f: Freigabe) => {
    if (typeof window === 'undefined') return '/review/' + f.id
    return `${window.location.origin}/review/${f.id}`
  }

  const kopieren = async (f: Freigabe) => {
    try {
      await navigator.clipboard.writeText(link(f))
      setKopiert(f.id)
      setTimeout(() => setKopiert(null), 1500)
    } catch {}
  }

  const loeschen = async (f: Freigabe) => {
    await freigabeLoeschen(f.id)
    await laden()
  }

  const offenePins = (f: Freigabe) => f.pins.filter((p) => p.status === 'offen').length
  const gesamt = (f: Freigabe) => f.pins.length

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          {sprache === 'de' ? 'Korrekturportal' : 'Correction portal'}
        </div>
        <button
          type="button"
          onClick={erzeugen}
          disabled={!artefaktId}
          style={{
            background: '#34d399',
            color: '#0b0b0f',
            border: 'none',
            padding: '5px 12px',
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 700,
            cursor: artefaktId ? 'pointer' : 'not-allowed',
            opacity: artefaktId ? 1 : 0.55,
          }}
        >
          + {sprache === 'de' ? 'Freigabe' : 'Share'}
        </button>
      </div>

      {freigaben.length === 0 ? (
        <p style={{ margin: 0, fontSize: 11, opacity: 0.55 }}>
          {sprache === 'de'
            ? 'Noch keine Freigabe. Klick oben, um dem Kunden einen Review-Link zu geben.'
            : 'No share yet. Click above to give the customer a review link.'}
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {freigaben.map((f) => (
            <li
              key={f.id}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ opacity: 0.65 }}>{new Date(f.erstelltAm).toLocaleString()}</span>
                <span style={{ color: offenePins(f) > 0 ? '#fbbf24' : '#94a3b8' }}>
                  {offenePins(f)}/{gesamt(f)} {sprache === 'de' ? 'offen' : 'open'}
                </span>
              </div>
              <input
                type="text"
                value={link(f)}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  color: '#f5f5f7',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'ui-monospace, monospace',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => kopieren(f)}
                  style={{
                    background: 'transparent',
                    color: '#f5f5f7',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {kopiert === f.id ? '✓' : sprache === 'de' ? 'Kopieren' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => loeschen(f)}
                  style={{
                    background: 'transparent',
                    color: '#fca5a5',
                    border: '1px solid rgba(252,165,165,0.35)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {sprache === 'de' ? 'Löschen' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
