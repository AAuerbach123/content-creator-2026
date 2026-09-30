'use client'

import { useState } from 'react'
import { alleJobsLaden, jobLaden, jobLoeschen, jobSpeichern } from '@/lib/db'
import type { Job } from '@/lib/types'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'

// Kleiner Performance-Check aus Phase 6.
// Misst die drei Kern-Operationen (Start, Job-Wechsel, Save) direkt in der DB
// und vergleicht gegen die Budgets aus dem Loop-Log.
//
//   Start   (alleJobsLaden)          < 200 ms
//   Wechsel (jobLaden + Snapshot)    < 150 ms
//   Save    (jobSpeichern)           < 100 ms

const BUDGETS = { start: 200, wechsel: 150, save: 100 }

type Ergebnis = { name: string; ms: number; budget: number; ok: boolean }

async function misst<T>(fn: () => Promise<T>): Promise<{ ms: number; wert: T }> {
  const t0 = performance.now()
  const wert = await fn()
  return { ms: performance.now() - t0, wert }
}

export default function PerformanceCheck() {
  const { sprache } = useSprache()
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([])
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const messen = async () => {
    setLaedt(true)
    setFehler(null)
    setErgebnisse([])
    try {
      // 1. Start: alle Jobs laden
      const start = await misst(() => alleJobsLaden())
      const startErgebnis: Ergebnis = {
        name: sprache === 'de' ? 'Start (alle Jobs)' : 'Start (all jobs)',
        ms: start.ms,
        budget: BUDGETS.start,
        ok: start.ms < BUDGETS.start,
      }

      // 2. Wechsel: einen Job laden (falls einer da ist)
      let wechselErgebnis: Ergebnis | null = null
      if (start.wert.length > 0) {
        const wechsel = await misst(() => jobLaden(start.wert[0].id))
        wechselErgebnis = {
          name: sprache === 'de' ? 'Job-Wechsel (jobLaden)' : 'Job switch (jobLaden)',
          ms: wechsel.ms,
          budget: BUDGETS.wechsel,
          ok: wechsel.ms < BUDGETS.wechsel,
        }
      }

      // 3. Save: Test-Job anlegen, speichern, löschen
      const jetzt = Date.now()
      const test: Job = {
        id: crypto.randomUUID(),
        titel: '__perf_test__',
        ziel: '',
        briefing: [],
        schrittplan: [],
        artefakte: [],
        dialog: [],
        status: 'briefing',
        erstelltAm: jetzt,
        aktualisiertAm: jetzt,
      }
      const save = await misst(() => jobSpeichern(test))
      const saveErgebnis: Ergebnis = {
        name: sprache === 'de' ? 'Save (jobSpeichern + Snapshot)' : 'Save (jobSpeichern + snapshot)',
        ms: save.ms,
        budget: BUDGETS.save,
        ok: save.ms < BUDGETS.save,
      }
      await jobLoeschen(test.id)

      const alle = [startErgebnis, ...(wechselErgebnis ? [wechselErgebnis] : []), saveErgebnis]
      setErgebnisse(alle)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(false)
    }
  }

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        color: '#f5f5f7',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Roboto, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {sprache === 'de' ? 'Performance-Check' : 'Performance check'}
          </h2>
          <HilfePopover
            de={'Misst Start (alle Jobs laden < 200 ms), Job-Wechsel (jobLaden < 150 ms), Save (jobSpeichern + Snapshot < 100 ms). Setzt kurz einen Test-Job an und löscht ihn wieder.'}
            en={'Measures start (load all jobs < 200 ms), job switch (jobLaden < 150 ms), save (jobSpeichern + snapshot < 100 ms). Briefly adds a test job and cleans it up.'}
            anker="performance"
          />
        </div>
        <button
          type="button"
          onClick={messen}
          disabled={laedt}
          style={{
            background: '#f5f5f7',
            color: '#0b0b0f',
            border: 'none',
            padding: '5px 12px',
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 700,
            cursor: laedt ? 'not-allowed' : 'pointer',
            opacity: laedt ? 0.55 : 1,
          }}
        >
          {laedt ? (sprache === 'de' ? 'Messe …' : 'Measuring …') : sprache === 'de' ? 'Messen' : 'Measure'}
        </button>
      </div>
      {fehler && <p style={{ margin: 0, fontSize: 11, color: '#fecaca' }}>⚠ {fehler}</p>}
      {ergebnisse.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ergebnisse.map((e) => (
            <li
              key={e.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 5,
                fontSize: 12,
                color: e.ok ? '#86efac' : '#fecaca',
              }}
            >
              <span>{e.name}</span>
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                {e.ms.toFixed(1)} ms {e.ok ? '✓' : '⚠'} (Budget {e.budget} ms)
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
