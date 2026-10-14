'use client'

import type { ReactNode } from 'react'

type Props = {
  titel?: string
  umschalter?: ReactNode
  children: ReactNode
}

export default function VorschauRahmen({ titel, umschalter, children }: Props) {
  return (
    <aside className="cockpit-vorschau" aria-label={titel ?? 'Vorschau'}>
      {(titel || umschalter) && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          {titel && <strong>{titel}</strong>}
          {umschalter}
        </header>
      )}
      {children}
    </aside>
  )
}
