'use client'

import { useCallback, useEffect, useState } from 'react'
import { assetLaden, freigabeErstellen, freigabeLoeschen, freigabenFuerJob } from '@/lib/db'
import type { Freigabe, Job } from '@/lib/types'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'

// Panel für den Grafiker: Freigabe-Link erzeugen, teilen, Freigaben löschen.
// Der Link ist http://localhost:3000/review/<token> — kunden brauchen kein Login.
//
// Phase 6 #8: Beim Erzeugen wird die Freigabe zusätzlich auf den Server geschickt
// (Artefakt-Snapshot + Assets als Base64), damit der Kunden-Link in JEDEM Browser
// funktioniert. Lokal fällt der Server-Store auf `.freigaben/<token>.json` zurück.

async function blobZuBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(bin)
}

function hashesAusEbenen(ebenen: Job['artefakte'][number]['ebenen']): string[] {
  const set = new Set<string>()
  for (const e of ebenen) if (e.assetHash) set.add(e.assetHash)
  return Array.from(set)
}

export default function KorrekturportalPanel({ job, artefaktId }: { job: Job; artefaktId?: string }) {
  const { sprache } = useSprache()
  const [freigaben, setFreigaben] = useState<Freigabe[]>([])
  const [kopiert, setKopiert] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'lauft' | 'ok' | 'fehler'>>({})
  const [uploadModus, setUploadModus] = useState<Record<string, 'kv' | 'datei'>>({})
  const [fehlerMeldungen, setFehlerMeldungen] = useState<Record<string, string>>({})

  const laden = useCallback(async () => {
    setFreigaben(await freigabenFuerJob(job.id))
  }, [job.id])

  useEffect(() => {
    laden()
  }, [laden])

  const zumServerHochladen = useCallback(
    async (freigabe: Freigabe) => {
      const artefakt = job.artefakte.find((a) => a.id === freigabe.artefaktId)
      if (!artefakt) return
      setUploadStatus((alt) => ({ ...alt, [freigabe.id]: 'lauft' }))
      try {
        const assets: Record<string, { mimeType: string; base64: string }> = {}
        for (const hash of hashesAusEbenen(artefakt.ebenen)) {
          const a = await assetLaden(hash)
          if (!a) continue
          assets[hash] = { mimeType: a.mimeType, base64: await blobZuBase64(a.blob) }
        }
        const res = await fetch('/api/freigabe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: freigabe.id,
            jobId: freigabe.jobId,
            jobTitel: freigabe.jobTitel,
            artefaktId: freigabe.artefaktId,
            artefakt,
            assets,
            pins: freigabe.pins,
            erstelltAm: freigabe.erstelltAm,
          }),
        })
        const daten = (await res.json().catch(() => ({}))) as { ok?: boolean; modus?: 'kv' | 'datei'; fehler?: string }
        if (!res.ok || !daten.ok) {
          setUploadStatus((alt) => ({ ...alt, [freigabe.id]: 'fehler' }))
          setFehlerMeldungen((alt) => ({ ...alt, [freigabe.id]: daten.fehler || `HTTP ${res.status}` }))
          return
        }
        setUploadStatus((alt) => ({ ...alt, [freigabe.id]: 'ok' }))
        if (daten.modus) setUploadModus((alt) => ({ ...alt, [freigabe.id]: daten.modus! }))
      } catch (e) {
        setUploadStatus((alt) => ({ ...alt, [freigabe.id]: 'fehler' }))
        setFehlerMeldungen((alt) => ({ ...alt, [freigabe.id]: e instanceof Error ? e.message : String(e) }))
      }
    },
    [job.artefakte],
  )

  const pinsVomServerHolen = useCallback(async (freigabe: Freigabe) => {
    try {
      const res = await fetch(`/api/freigabe?token=${encodeURIComponent(freigabe.id)}`)
      const daten = (await res.json().catch(() => ({}))) as { ok?: boolean; freigabe?: { pins: Freigabe['pins'] } }
      if (daten.ok && daten.freigabe) {
        const updated: Freigabe = { ...freigabe, pins: daten.freigabe.pins }
        // Lokale IDB nur zur Anzeige
        await import('@/lib/db').then((db) => db.freigabeSpeichern(updated))
        setFreigaben((alt) => alt.map((f) => (f.id === freigabe.id ? updated : f)))
      }
    } catch {}
  }, [])

  const erzeugen = useCallback(async () => {
    if (!artefaktId) return
    const neu = await freigabeErstellen(job.id, artefaktId, job.titel)
    await laden()
    // Server-Upload direkt anstoßen
    await zumServerHochladen(neu)
  }, [artefaktId, job.id, job.titel, laden, zumServerHochladen])

  const link = (f: Freigabe) => {
    if (typeof window === 'undefined') return '/review/' + f.id
    return `${window.location.origin}/review/${f.id}`
  }

  const kopieren = async (f: Freigabe) => {
    try {
      await navigator.clipboard.writeText(link(f))
      setKopiert(f.id)
      setTimeout(() => setKopiert(null), 1500)
    } catch {}
  }

  const loeschen = async (f: Freigabe) => {
    await freigabeLoeschen(f.id)
    // Server-Löschung — Antwort ignoriert (best effort)
    try { await fetch(`/api/freigabe?token=${encodeURIComponent(f.id)}`, { method: 'DELETE' }) } catch {}
    await laden()
  }

  const offenePins = (f: Freigabe) => f.pins.filter((p) => p.status === 'offen').length
  const gesamt = (f: Freigabe) => f.pins.length

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{sprache === 'de' ? 'Korrekturportal' : 'Correction portal'}</span>
          <HilfePopover
            de={'Erzeugt einen Token-Link (/review/TOKEN), den du dem Verlag/Kunden schickst. Der Kunde klickt auf eine Stelle im Motiv und hinterlässt Text — du siehst die Pins hier mit Kommentar-Thread und Status. Cross-Browser dank Server-Speicher (Cloudflare KV online, Datei-Fallback lokal).'}
            en={'Creates a token link (/review/TOKEN) you share with the client. Client clicks on the artwork and leaves a note — you see the pins here with a comment thread and status. Cross-browser via server store (Cloudflare KV online, file fallback locally).'}
            anker="korrektur"
          />
        </div>
        <button
          type="button"
          onClick={erzeugen}
          disabled={!artefaktId}
          style={{
            background: '#34d399',
            color: '#0b0b0f',
            border: 'none',
            padding: '5px 12px',
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 700,
            cursor: artefaktId ? 'pointer' : 'not-allowed',
            opacity: artefaktId ? 1 : 0.55,
          }}
        >
          + {sprache === 'de' ? 'Freigabe' : 'Share'}
        </button>
      </div>

      {freigaben.length === 0 ? (
        <p style={{ margin: 0, fontSize: 11, opacity: 0.55 }}>
          {sprache === 'de'
            ? 'Noch keine Freigabe. Klick oben, um dem Kunden einen Review-Link zu geben.'
            : 'No share yet. Click above to give the customer a review link.'}
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {freigaben.map((f) => (
            <li
              key={f.id}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ opacity: 0.65 }}>{new Date(f.erstelltAm).toLocaleString()}</span>
                <span style={{ color: offenePins(f) > 0 ? '#fbbf24' : '#94a3b8' }}>
                  {offenePins(f)}/{gesamt(f)} {sprache === 'de' ? 'offen' : 'open'}
                </span>
              </div>
              <input
                type="text"
                value={link(f)}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  color: '#f5f5f7',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'ui-monospace, monospace',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, opacity: 0.55, marginRight: 'auto', alignSelf: 'center' }}>
                  {uploadStatus[f.id] === 'lauft' && (sprache === 'de' ? 'Lade hoch …' : 'Uploading …')}
                  {uploadStatus[f.id] === 'ok' &&
                    (sprache === 'de'
                      ? `Server: ${uploadModus[f.id] === 'kv' ? 'KV' : 'lokal'}`
                      : `Server: ${uploadModus[f.id] === 'kv' ? 'KV' : 'local'}`)}
                  {uploadStatus[f.id] === 'fehler' && `⚠ ${fehlerMeldungen[f.id] || 'Fehler'}`}
                </span>
                <button
                  type="button"
                  onClick={() => pinsVomServerHolen(f)}
                  style={{
                    background: 'transparent',
                    color: '#f5f5f7',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {sprache === 'de' ? 'Pins neu laden' : 'Refresh pins'}
                </button>
                <button
                  type="button"
                  onClick={() => zumServerHochladen(f)}
                  style={{
                    background: 'transparent',
                    color: '#f5f5f7',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {sprache === 'de' ? 'Neu hochladen' : 'Re-upload'}
                </button>
                <button
                  type="button"
                  onClick={() => kopieren(f)}
                  style={{
                    background: 'transparent',
                    color: '#f5f5f7',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {kopiert === f.id ? '✓' : sprache === 'de' ? 'Kopieren' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => loeschen(f)}
                  style={{
                    background: 'transparent',
                    color: '#fca5a5',
                    border: '1px solid rgba(252,165,165,0.35)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {sprache === 'de' ? 'Löschen' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
