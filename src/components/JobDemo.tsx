'use client'

import { useCallback, useEffect, useState } from 'react'
import { alleJobsLaden, jobLoeschen } from '@/lib/db'
import type { Job } from '@/lib/types'
import { useSprache } from './SpracheProvider'

// Debug-/Übersichts-Sektion: zeigt Persistenz-Beleg (Store „jobs") und dient bis
// Phase 2 zusätzlich als „Laufende Jobs"-Liste — Klick öffnet den Job-Editor.

export default function JobDemo({
  aktualisierenNonce,
  onJobOeffnen,
}: {
  aktualisierenNonce: number
  onJobOeffnen?: (id: string) => void
}) {
  const { T } = useSprache()
  const [jobs, setJobs] = useState<Job[]>([])
  const [fehler, setFehler] = useState<string | null>(null)

  const laden = useCallback(async () => {
    try {
      setFehler(null)
      setJobs(await alleJobsLaden())
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    laden()
  }, [laden, aktualisierenNonce])

  const loeschen = useCallback(
    async (id: string) => {
      await jobLoeschen(id)
      await laden()
    },
    [laden],
  )

  return (
    <section
      style={{
        marginTop: 28,
        width: '100%',
        maxWidth: 960,
        background: 'rgba(255,255,255,0.75)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12,
        padding: 18,
        color: '#0b0b0f',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, opacity: 0.7, letterSpacing: '0.05em' }}>
        {T('debugTitle')}
      </h2>

      {fehler && (
        <p style={{ color: '#b91c1c', marginTop: 10, fontSize: 13 }}>
          {T('debugError')}: {fehler}
        </p>
      )}

      {jobs.length === 0 ? (
        <p style={{ opacity: 0.55, fontSize: 13, marginTop: 10 }}>{T('debugEmpty')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
          {jobs.map((job) => (
            <li
              key={job.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.03)',
                marginBottom: 5,
                fontSize: 13,
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => onJobOeffnen?.(job.id)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#0b0b0f',
                  textAlign: 'left',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <strong style={{ fontWeight: 600 }}>{job.titel}</strong>
                <span style={{ opacity: 0.45, marginLeft: 10, fontSize: 12 }}>
                  {new Date(job.aktualisiertAm).toLocaleString()}
                </span>
                {job.einstieg && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      opacity: 0.6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {job.einstieg.split('-')[0]}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => loeschen(job.id)}
                style={{
                  background: 'transparent',
                  color: '#b91c1c',
                  border: '1px solid rgba(185,28,28,0.35)',
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {T('debugDelete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
