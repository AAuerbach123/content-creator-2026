'use client'

import type { ReactNode } from 'react'

type Props = {
  titel: string
  text: string
  aktion?: ReactNode
}

export default function LeererZustand({ titel, text, aktion }: Props) {
  return (
    <div className="cockpit-leer">
      <h3>{titel}</h3>
      <p>{text}</p>
      {aktion}
    </div>
  )
}
