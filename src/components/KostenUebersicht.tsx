'use client'

import { useEffect, useMemo, useState } from 'react'
import { alleAktionen, alleJobsLaden } from '@/lib/db'
import type { KIAktion } from '@/lib/types'
import { useSprache } from './SpracheProvider'

// Aggregiert die Kosten aus dem kiAktionen-Store. Zeigt Summe je Job und
// Gesamtsumme im aktuellen Monat. Bild-Aufrufe haben eine feste Schätzung
// (PREIS_PRO_BILD_USD = 0.04); Claude-Aufrufe rechnen mit tatsächlichen
// Token-Mengen.
// Phase 6: Budget-Alarm (localStorage) + Route-Aufschlüsselung.

const BUDGET_KEY = 'content-creator-2026:budget-usd'

export default function KostenUebersicht() {
  const { sprache } = useSprache()
  const [aktionen, setAktionen] = useState<KIAktion[]>([])
  const [jobTitel, setJobTitel] = useState<Record<string, string>>({})
  const [budget, setBudget] = useState<number>(20)

  useEffect(() => {
    Promise.all([alleAktionen(500), alleJobsLaden()]).then(([a, j]) => {
      setAktionen(a)
      const titel: Record<string, string> = {}
      for (const job of j) titel[job.id] = job.titel
      setJobTitel(titel)
    })
    if (typeof window !== 'undefined') {
      const gespeichert = parseFloat(window.localStorage.getItem(BUDGET_KEY) || '')
      if (gespeichert > 0) setBudget(gespeichert)
    }
  }, [])

  const budgetSetzen = (usd: number) => {
    setBudget(usd)
    if (typeof window !== 'undefined') window.localStorage.setItem(BUDGET_KEY, String(usd))
  }

  const jetzt = new Date()
  const monatStart = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1).getTime()

  const stats = useMemo(() => {
    const proJob: Record<string, { anzahl: number; usd: number; letzte?: number }> = {}
    const proRoute: Record<string, { anzahl: number; usd: number }> = {}
    let gesamt = 0
    let gesamtMonat = 0
    for (const a of aktionen) {
      const kosten = a.kostenUsd || 0
      gesamt += kosten
      if (a.zeitpunkt >= monatStart) gesamtMonat += kosten
      if (a.jobId) {
        const eintrag = proJob[a.jobId] || { anzahl: 0, usd: 0 }
        eintrag.anzahl++
        eintrag.usd += kosten
        eintrag.letzte = a.zeitpunkt
        proJob[a.jobId] = eintrag
      }
      const routeInfo = proRoute[a.route] || { anzahl: 0, usd: 0 }
      routeInfo.anzahl++
      routeInfo.usd += kosten
      proRoute[a.route] = routeInfo
    }
    return { proJob, proRoute, gesamt, gesamtMonat }
  }, [aktionen, monatStart])

  const jobs = Object.entries(stats.proJob).sort((a, b) => (b[1].letzte || 0) - (a[1].letzte || 0))
  const routen = Object.entries(stats.proRoute).sort((a, b) => b[1].usd - a[1].usd)

  const budgetAusnutzung = budget > 0 ? Math.min(1, stats.gesamtMonat / budget) : 0
  const budgetFarbe = budgetAusnutzung >= 1 ? '#f87171' : budgetAusnutzung >= 0.75 ? '#fbbf24' : '#34d399'

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
        color: '#f5f5f7',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Roboto, sans-serif',
      }}
    >
      <h2 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700 }}>
        {sprache === 'de' ? 'KI-Kosten (geschätzt)' : 'AI cost (estimated)'}
      </h2>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {sprache === 'de' ? 'Diesen Monat' : 'This month'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.gesamtMonat.toFixed(3)} USD</div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {sprache === 'de' ? 'Gesamt' : 'Total'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.gesamt.toFixed(3)} USD</div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {sprache === 'de' ? 'Aufrufe' : 'Calls'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{aktionen.length}</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
          <label>
            {sprache === 'de' ? 'Monats-Budget' : 'Monthly budget'}{' '}
            <input
              type="number"
              min={0}
              step={1}
              value={budget}
              onChange={(e) => budgetSetzen(parseFloat(e.target.value) || 0)}
              style={{
                width: 70,
                background: 'rgba(0,0,0,0.35)',
                color: '#f5f5f7',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 12,
              }}
            />{' '}
            USD
          </label>
          <span style={{ color: budgetFarbe }}>{Math.round(budgetAusnutzung * 100)} %</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${budgetAusnutzung * 100}%`, background: budgetFarbe }} />
        </div>
        {budgetAusnutzung >= 1 && (
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#fecaca' }}>
            {sprache === 'de'
              ? '⚠ Budget aufgebraucht. Weitere Aufrufe funktionieren, kosten aber extra.'
              : '⚠ Budget exhausted. Further calls still work but cost extra.'}
          </p>
        )}
      </div>

      <details style={{ marginBottom: 16 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, opacity: 0.85 }}>
          {sprache === 'de' ? 'Aufschlüsselung nach Route' : 'Breakdown by route'}
        </summary>
        <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {routen.map(([r, info]) => (
            <li
              key={r}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              <span>{r}</span>
              <span style={{ opacity: 0.65 }}>{info.anzahl}× · {info.usd.toFixed(3)} USD</span>
            </li>
          ))}
        </ul>
      </details>

      <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
        {sprache === 'de' ? 'Kosten pro Job' : 'Cost per job'}
      </div>
      {jobs.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, opacity: 0.55 }}>
          {sprache === 'de' ? 'Noch keine KI-Aufrufe.' : 'No AI calls yet.'}
        </p>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {jobs.map(([jobId, info]) => (
            <li
              key={jobId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 5,
                fontSize: 12,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {jobTitel[jobId] || jobId.slice(0, 8)}
              </span>
              <span style={{ opacity: 0.55 }}>{info.anzahl}× · {info.usd.toFixed(3)} USD</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
