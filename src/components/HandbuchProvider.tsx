'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import HandbuchOverlay from './HandbuchOverlay'

// Globaler Zustand für das Handbuch-Overlay. Jede Ansicht kann per
// `useHandbuch().oeffnen('anker')` das Handbuch aufmachen — ohne den
// laufenden Job zu verlassen.

type Wert = {
  offen: boolean
  aktuellerAnker?: string
  oeffnen: (anker?: string) => void
  schliessen: () => void
}

const Ctx = createContext<Wert | undefined>(undefined)

export function HandbuchProvider({ children }: { children: ReactNode }) {
  const [offen, setOffen] = useState(false)
  const [anker, setAnker] = useState<string | undefined>()

  const oeffnen = useCallback((a?: string) => {
    setAnker(a)
    setOffen(true)
  }, [])
  const schliessen = useCallback(() => setOffen(false), [])

  const wert = useMemo<Wert>(
    () => ({ offen, aktuellerAnker: anker, oeffnen, schliessen }),
    [offen, anker, oeffnen, schliessen],
  )

  return (
    <Ctx.Provider value={wert}>
      {children}
      {offen && <HandbuchOverlay ankerInitial={anker} onSchliessen={schliessen} />}
    </Ctx.Provider>
  )
}

export function useHandbuch(): Wert {
  const c = useContext(Ctx)
  if (!c) throw new Error('useHandbuch muss innerhalb von <HandbuchProvider> aufgerufen werden')
  return c
}
