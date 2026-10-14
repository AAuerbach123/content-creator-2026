'use client'

import type { ReactNode } from 'react'

type Props = {
  haupt: ReactNode
  neben?: ReactNode
}

export default function Aktionsleiste({ haupt, neben }: Props) {
  return (
    <div className="cockpit-aktionsleiste" role="toolbar">
      {neben}
      {haupt}
    </div>
  )
}
