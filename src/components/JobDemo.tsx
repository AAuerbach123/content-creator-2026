'use client'

import { useCallback, useEffect, useState } from 'react'
import { alleJobsLaden, jobLoeschen } from '@/lib/db'
import type { Job } from '@/lib/types'
import { useSprache } from './SpracheProvider'

// Debug-Sektion: zeigt Persistenz-Beleg (Store „jobs") bis Phase 1 die richtige
// „Laufende Jobs"-Ansicht liefert. Angelegt wird woanders (Karte „Neuer Job").

export default function JobDemo({ aktualisierenNonce }: { aktualisierenNonce: number }) {
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
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 18,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, opacity: 0.7, letterSpacing: '0.05em' }}>
        {T('debugTitle')}
      </h2>

      {fehler && (
        <p style={{ color: '#fca5a5', marginTop: 10, fontSize: 13 }}>
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
                background: 'rgba(255,255,255,0.04)',
                marginBottom: 5,
                fontSize: 13,
                gap: 12,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <strong style={{ fontWeight: 600 }}>{job.titel}</strong>
                <span style={{ opacity: 0.45, marginLeft: 10 }}>
                  {new Date(job.erstelltAm).toLocaleTimeString()}
                </span>
              </span>
              <button
                type="button"
                onClick={() => loeschen(job.id)}
                style={{
                  background: 'transparent',
                  color: '#fca5a5',
                  border: '1px solid rgba(252,165,165,0.35)',
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
