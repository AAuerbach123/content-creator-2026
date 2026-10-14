'use client'

import type { ReactNode } from 'react'

type Props = {
  titel?: string
  hinweis?: string
  children: ReactNode
  aktion?: ReactNode
}

export default function Karte({ titel, hinweis, children, aktion }: Props) {
  return (
    <section className="cockpit-karte">
      {(titel || aktion) && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          {titel && <h2>{titel}</h2>}
          {aktion}
        </header>
      )}
      {hinweis && <p>{hinweis}</p>}
      {children}
    </section>
  )
}
