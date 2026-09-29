'use client'

import { useCallback, useEffect, useState } from 'react'
import ArtefaktRenderer from '@/components/ArtefaktRenderer'
import KorrekturPinLayer from '@/components/KorrekturPinLayer'
import { freigabeLaden, freigabeSpeichern, jobLaden } from '@/lib/db'
import type { Artefakt, Freigabe, Job, Korrekturpin } from '@/lib/types'

// Review-Seite: /review/<token>. Zeigt das Artefakt und lässt den Kunden Pins
// setzen. Kein Login. Daten liegen ausschließlich in der lokalen IndexedDB
// dieses Browsers — für Cross-Browser-Sharing kommt später eine echte
// Cloudflare-KV-Route.

export default function ReviewSeite({ token }: { token: string }) {
  const [freigabe, setFreigabe] = useState<Freigabe | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [artefakt, setArtefakt] = useState<Artefakt | null>(null)
  const [laden, setLaden] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    let abgebrochen = false
    ;(async () => {
      try {
        const f = await freigabeLaden(token)
        if (!f) {
          if (!abgebrochen) setFehler('Freigabe nicht gefunden. Bitte den Absender bitten, den Link neu zu erzeugen.')
          return
        }
        const j = await jobLaden(f.jobId)
        if (!j) {
          if (!abgebrochen) setFehler('Job nicht gefunden.')
          return
        }
        const a = j.artefakte.find((x) => x.id === f.artefaktId)
        if (!a) {
          if (!abgebrochen) setFehler('Artefakt nicht gefunden.')
          return
        }
        if (!abgebrochen) {
          setFreigabe(f)
          setJob(j)
          setArtefakt(a)
        }
      } catch (e) {
        if (!abgebrochen) setFehler(e instanceof Error ? e.message : String(e))
      } finally {
        if (!abgebrochen) setLaden(false)
      }
    })()
    return () => {
      abgebrochen = true
    }
  }, [token])

  const pinAnhaengen = useCallback(
    async ({ x, y, kommentar, autor }: { x: number; y: number; kommentar: string; autor?: string }) => {
      if (!freigabe) return
      const neu: Korrekturpin = {
        id: crypto.randomUUID(),
        x,
        y,
        kommentar,
        autor,
        status: 'offen',
        erstelltAm: Date.now(),
        antworten: [],
      }
      const aktualisiert = { ...freigabe, pins: [...freigabe.pins, neu] }
      setFreigabe(aktualisiert)
      await freigabeSpeichern(aktualisiert)
    },
    [freigabe],
  )

  if (laden) {
    return <FullScreenText text="Lade Freigabe …" />
  }
  if (fehler || !freigabe || !artefakt || !job) {
    return <FullScreenText text={fehler || 'Freigabe kann nicht geladen werden.'} />
  }

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
        <h1 style={{ margin: '4px 0', fontSize: 18, fontWeight: 700 }}>{job.titel}</h1>
        <p style={{ margin: 0, opacity: 0.7, fontSize: 13, lineHeight: 1.5 }}>
          Klicken Sie auf eine Stelle im Motiv, um einen Änderungswunsch zu hinterlassen. Bereits
          gesetzte Pins können Sie anklicken, um zu antworten. Kein Konto nötig.
        </p>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <ArtefaktRenderer artefakt={artefakt} maxBreite={720} />
          <KorrekturPinLayer
            breite={artefakt.breite}
            hoehe={artefakt.hoehe}
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
