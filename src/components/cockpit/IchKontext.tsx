'use client'

// Angemeldete Person + Rechte für alle Cockpit-Seiten (lädt /api/cockpit/ich einmal).
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ichLaden, type Ich } from '@/lib/cockpit/daten-client'

type Wert = { ich: Ich | null; fehler: string | null }
const Kontext = createContext<Wert>({ ich: null, fehler: null })

export function IchAnbieter({ children }: { children: ReactNode }) {
  const [wert, setWert] = useState<Wert>({ ich: null, fehler: null })
  useEffect(() => {
    ichLaden().then((ich) => setWert({ ich, fehler: null })).catch((e) => setWert({ ich: null, fehler: e instanceof Error ? e.message : String(e) }))
  }, [])
  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>
}

export function useIch(): Wert & { darf: (r: 'bearbeiten' | 'gestalten' | 'freigeben' | 'admin') => boolean; name: string } {
  const w = useContext(Kontext)
  return {
    ...w,
    darf: (r) => Boolean(w.ich?.rechte[r]),
    name: w.ich?.benutzer.name ?? '…',
  }
}

export const ROLLEN_TEXT: Record<string, { de: string; en: string }> = {
  admin: { de: 'Admin', en: 'Admin' },
  redaktion: { de: 'Redaktion', en: 'Editorial' },
  grafik: { de: 'Grafik', en: 'Design' },
  pruefer: { de: 'Prüfer', en: 'Reviewer' },
  lesen: { de: 'Nur lesen', en: 'Read only' },
}
