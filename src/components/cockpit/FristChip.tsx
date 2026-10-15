'use client'

// Countdown für eine Tagesfrist (Vorschlag 2): grau > 30 min, gelb ≤ 30 min, rot überfällig, grün erledigt.
import { useEffect, useState } from 'react'
import { countdown, FRIST_TEXT, type Frist } from '@/lib/cockpit/tagesstatus'

export default function FristChip({ frist, de }: { frist: Frist; de: boolean }) {
  const [jetzt, setJetzt] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setJetzt(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  const c = countdown(frist.zeit, frist.erledigt, de, jetzt)
  const heute = frist.zeit.toDateString() === jetzt.toDateString()
  const uhr = heute
    ? frist.zeit.toLocaleTimeString(de ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
    : frist.zeit.toLocaleString(de ? 'de-DE' : 'en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  return (
    <span className={`cockpit-chip ${c.farbe}`} title={`${FRIST_TEXT[frist.art][de ? 'de' : 'en']} ${de ? 'bis' : 'by'} ${uhr}`}>
      <span aria-hidden>{c.farbe === 'gruen' ? '✓' : c.farbe === 'rot' ? '!' : '⏱'}</span>
      <span>{FRIST_TEXT[frist.art][de ? 'de' : 'en']} {uhr} · {c.text}</span>
    </span>
  )
}
