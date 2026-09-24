'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Sprache } from '@/lib/types'
import { uebersetze, type Schluessel } from '@/lib/i18n'

const STORAGE_KEY = 'content-creator-2026:sprache'

type SpracheContextWert = {
  sprache: Sprache
  setSprache: (s: Sprache) => void
  T: (schluessel: Schluessel) => string
}

const SpracheContext = createContext<SpracheContextWert | undefined>(undefined)

function anfangsSprache(): Sprache {
  if (typeof window === 'undefined') return 'de'
  const gespeichert = window.localStorage.getItem(STORAGE_KEY) as Sprache | null
  if (gespeichert === 'de' || gespeichert === 'en') return gespeichert
  return window.navigator.language.startsWith('en') ? 'en' : 'de'
}

export function SpracheProvider({ children }: { children: ReactNode }) {
  const [sprache, setSpracheState] = useState<Sprache>('de')

  useEffect(() => {
    setSpracheState(anfangsSprache())
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = sprache
  }, [sprache])

  const setSprache = useCallback((s: Sprache) => {
    setSpracheState(s)
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, s)
  }, [])

  const wert = useMemo<SpracheContextWert>(
    () => ({ sprache, setSprache, T: (k) => uebersetze(k, sprache) }),
    [sprache, setSprache],
  )

  return <SpracheContext.Provider value={wert}>{children}</SpracheContext.Provider>
}

export function useSprache(): SpracheContextWert {
  const ctx = useContext(SpracheContext)
  if (!ctx) throw new Error('useSprache muss innerhalb von <SpracheProvider> aufgerufen werden')
  return ctx
}
