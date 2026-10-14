'use client'

import { useEffect, useState } from 'react'

export type Rolle = 'grafiker' | 'redaktion' | 'pruefer'

const KEY = 'cockpit:rolle'

export function useRolle(): [Rolle, (r: Rolle) => void] {
  const [rolle, setRolle] = useState<Rolle>('redaktion')
  useEffect(() => {
    const g = (typeof window !== 'undefined' && window.localStorage.getItem(KEY)) as Rolle | null
    if (g === 'grafiker' || g === 'redaktion' || g === 'pruefer') setRolle(g)
  }, [])
  const setzen = (r: Rolle) => {
    setRolle(r)
    if (typeof window !== 'undefined') window.localStorage.setItem(KEY, r)
  }
  return [rolle, setzen]
}

type Props = { rolle: Rolle; onAendern: (r: Rolle) => void; sprache?: 'de' | 'en' }

export default function RollenUmschalter({ rolle, onAendern, sprache = 'de' }: Props) {
  const bez = sprache === 'de'
    ? { grafiker: 'Grafiker', redaktion: 'Redaktion', pruefer: 'Prüfer' }
    : { grafiker: 'Designer', redaktion: 'Editorial', pruefer: 'Reviewer' }
  return (
    <div role="radiogroup" aria-label={sprache === 'de' ? 'Rolle' : 'Role'} style={{ display: 'inline-flex', gap: 4 }}>
      {(['grafiker', 'redaktion', 'pruefer'] as Rolle[]).map((r) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={rolle === r}
          onClick={() => onAendern(r)}
          className={`cockpit-knopf ${rolle === r ? 'primaer' : 'sekundaer'}`}
          style={{ minHeight: 36, padding: '6px 12px', fontSize: 13 }}
        >
          {bez[r]}
        </button>
      ))}
    </div>
  )
}
