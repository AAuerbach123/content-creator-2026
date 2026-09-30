'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ArtefaktRenderer from '@/components/ArtefaktRenderer'
import KorrekturPinLayer from '@/components/KorrekturPinLayer'
import type { Artefakt, Korrekturpin } from '@/lib/types'

// Review-Seite: /review/<token>.
// Neu (Phase 6 #8): lädt die Freigabe über /api/freigabe vom Server (KV oder
// Datei-Fallback). Der Kunde braucht keinen gemeinsamen Browser mit dem
// Grafiker — der Link funktioniert überall.

type ServerFreigabe = {
  id: string
  jobId: string
  jobTitel: string
  artefaktId: string
  artefakt: Artefakt
  assets: Record<string, { mimeType: string; base64: string }>
  pins: Korrekturpin[]
  erstelltAm: number
  aktualisiertAm: number
}

function base64ZuUrl(mimeType: string, base64: string): string {
  return `data:${mimeType || 'application/octet-stream'};base64,${base64}`
}

export default function ReviewSeite({ token }: { token: string }) {
  const [freigabe, setFreigabe] = useState<ServerFreigabe | null>(null)
  const [laden, setLaden] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  const laden_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/freigabe?token=${encodeURIComponent(token)}`)
      const daten = (await res.json()) as { ok?: boolean; freigabe?: ServerFreigabe; fehler?: string }
      if (!res.ok || !daten.ok || !daten.freigabe) {
        setFehler(daten.fehler || `Freigabe nicht gefunden (HTTP ${res.status}). Bitte den Absender bitten, den Link neu zu erzeugen.`)
        return
      }
      setFreigabe(daten.freigabe)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaden(false)
    }
  }, [token])

  useEffect(() => {
    laden_()
  }, [laden_])

  const assetUrls = useMemo(() => {
    const map: Record<string, string> = {}
    if (freigabe) {
      for (const [hash, a] of Object.entries(freigabe.assets)) {
        map[hash] = base64ZuUrl(a.mimeType, a.base64)
      }
    }
    return map
  }, [freigabe])

  const pinAnhaengen = useCallback(
    async ({ x, y, kommentar, autor }: { x: number; y: number; kommentar: string; autor?: string }) => {
      if (!freigabe) return
      const res = await fetch('/api/freigabe', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, neuerPin: { x, y, kommentar, autor } }),
      })
      const daten = (await res.json()) as { ok?: boolean; freigabe?: ServerFreigabe; fehler?: string }
      if (daten.ok && daten.freigabe) setFreigabe(daten.freigabe)
      else if (daten.fehler) setFehler(daten.fehler)
    },
    [freigabe, token],
  )

  if (laden) return <FullScreenText text="Lade Freigabe …" />
  if (fehler || !freigabe) return <FullScreenText text={fehler || 'Freigabe kann nicht geladen werden.'} />

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0b0b0f',
        color: '#f5f5f7',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        padding: '24px 20px',
      }}
    >
      <header style={{ maxWidth: 720, margin: '0 auto 20px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.5 }}>Freigabe</div>
        <h1 style={{ margin: '4px 0', fontSize: 18, fontWeight: 700 }}>{freigabe.jobTitel || 'Motiv'}</h1>
        <p style={{ margin: 0, opacity: 0.7, fontSize: 13, lineHeight: 1.5 }}>
          Klicken Sie auf eine Stelle im Motiv, um einen Änderungswunsch zu hinterlassen. Bereits
          gesetzte Pins können Sie anklicken, um zu antworten. Kein Konto nötig.
        </p>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <ArtefaktRenderer artefakt={freigabe.artefakt} maxBreite={720} assetUrlOverride={assetUrls} />
          <KorrekturPinLayer
            breite={freigabe.artefakt.breite}
            hoehe={freigabe.artefakt.hoehe}
            pins={freigabe.pins}
            bearbeitbar
            onNeu={pinAnhaengen}
          />
        </div>
        <p style={{ marginTop: 16, fontSize: 12, opacity: 0.55, textAlign: 'center' }}>
          {freigabe.pins.length === 0
            ? 'Noch kein Pin gesetzt.'
            : `${freigabe.pins.length} Pin${freigabe.pins.length === 1 ? '' : 's'} · ${
                freigabe.pins.filter((p) => p.status === 'offen').length
              } offen`}
        </p>
      </div>
    </div>
  )
}

function FullScreenText({ text }: { text: string }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f5f5f7',
        background: '#0b0b0f',
        fontFamily: 'system-ui, sans-serif',
        padding: 40,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 480 }}>{text}</div>
    </div>
  )
}
