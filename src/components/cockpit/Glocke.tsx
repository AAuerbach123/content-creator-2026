'use client'

// Glocke im Cockpit-Kopf: Meldungen (Kundenkorrekturen, Freigaben der Verlage, Gewinnerfotos). Aktualisiert jede Minute.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'

type M = { id: string; art: string; text: string; link?: string; am: number; gelesenVonMir: boolean }

export default function Glocke() {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const [liste, setListe] = useState<M[]>([])
  const [offen, setOffen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  const laden = () => fetch('/api/cockpit/meldungen', { cache: 'no-store' }).then((r) => r.json()).then((j) => setListe(j.meldungen ?? [])).catch(() => undefined)
  useEffect(() => {
    void laden()
    const t = setInterval(laden, 60_000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (!offen) return
    const zu = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOffen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOffen(false) }
    document.addEventListener('mousedown', zu)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', zu); document.removeEventListener('keydown', esc) }
  }, [offen])

  const ungelesen = liste.filter((m) => !m.gelesenVonMir)
  const alleGelesen = async () => {
    await fetch('/api/cockpit/meldungen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aktion: 'gelesen', ids: ungelesen.map((m) => m.id) }) })
    void laden()
  }

  return (
    <div className="cockpit-glocke" ref={ref}>
      <button type="button" className="cockpit-knopf text" aria-expanded={offen} aria-label={de ? `Meldungen, ${ungelesen.length} neu` : `Notifications, ${ungelesen.length} new`} onClick={() => setOffen(!offen)}>
        <span aria-hidden>🔔</span>{ungelesen.length > 0 && <span className="zahl">{ungelesen.length}</span>}
      </button>
      {offen && (
        <div className="liste" role="dialog" aria-label={de ? 'Meldungen' : 'Notifications'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <b>{de ? 'Meldungen' : 'Notifications'}</b>
            {ungelesen.length > 0 && <button type="button" className="cockpit-knopf text" onClick={alleGelesen}>{de ? 'Alle gelesen' : 'Mark all read'}</button>}
          </div>
          {liste.length === 0 && <p className="leise">{de ? 'Keine Meldungen.' : 'No notifications.'}</p>}
          <ul>
            {liste.slice(0, 20).map((m) => (
              <li key={m.id} className={m.gelesenVonMir ? '' : 'neu'}>
                {m.link ? <Link href={m.link} onClick={() => setOffen(false)}>{m.text}</Link> : m.text}
                <small>{new Date(m.am).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
