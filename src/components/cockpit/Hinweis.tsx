'use client'

import type { ReactNode } from 'react'

type Props = {
  art?: 'rot' | 'gold'
  children: ReactNode
  rolle?: 'status' | 'alert'
}

export default function Hinweis({ art = 'rot', children, rolle = 'status' }: Props) {
  return (
    <div className={`cockpit-hinweis${art === 'gold' ? ' gold' : ''}`} role={rolle} aria-live="polite">
      {children}
    </div>
  )
}
