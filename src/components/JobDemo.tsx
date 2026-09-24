'use client'

import { useCallback, useEffect, useState } from 'react'
import { alleJobsLaden, jobErstellen, jobLoeschen } from '@/lib/db'
import type { Job } from '@/lib/types'

export default function JobDemo() {
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
  }, [laden])

  const neuenJobAnlegen = useCallback(async () => {
    try {
      const nummer = (await alleJobsLaden()).length + 1
      await jobErstellen(`Test-Job #${nummer}`, 'Phase-0-Beispielziel')
      await laden()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    }
  }, [laden])

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
        marginTop: 32,
        width: '100%',
        maxWidth: 640,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, opacity: 0.9 }}>
          IndexedDB-Test · Store „jobs"
        </h2>
        <button
          type="button"
          onClick={neuenJobAnlegen}
          style={{
            background: '#f5f5f7',
            color: '#0b0b0f',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Leeren Job anlegen
        </button>
      </div>

      {fehler && (
        <p style={{ color: '#fca5a5', marginTop: 12, fontSize: 13 }}>Fehler: {fehler}</p>
      )}

      {jobs.length === 0 ? (
        <p style={{ opacity: 0.55, fontSize: 13, marginTop: 14 }}>
          Noch keine Jobs. Klick oben — der Job landet in der lokalen IndexedDB und bleibt
          nach Reload erhalten.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
          {jobs.map((job) => (
            <li
              key={job.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                marginBottom: 6,
                fontSize: 13,
                gap: 12,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <strong style={{ fontWeight: 600 }}>{job.titel}</strong>
                <span style={{ opacity: 0.5, marginLeft: 10 }}>
                  {new Date(job.erstelltAm).toLocaleTimeString('de-DE')}
                </span>
              </span>
              <button
                type="button"
                onClick={() => loeschen(job.id)}
                style={{
                  background: 'transparent',
                  color: '#fca5a5',
                  border: '1px solid rgba(252,165,165,0.4)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
