'use client'

import { useState } from 'react'
import { assetSpeichern } from '@/lib/db'
import { vorlageAnalysieren } from '@/lib/dialog-client'
import type { VorlagenAnalyse } from '@/lib/types'
import { useSprache } from './SpracheProvider'

// Datei-Drop + Analyse via /api/analyze-template. Ruft onFertig mit
// { hash, analyse } auf; der Aufrufer schreibt beides in den Job.

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export default function VorlagenUpload({
  jobId,
  onFertig,
}: {
  jobId: string
  onFertig: (info: { hash: string; analyse: VorlagenAnalyse }) => void
}) {
  const { T, sprache } = useSprache()
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [erfolg, setErfolg] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const verarbeiten = async (datei: File) => {
    setFehler(null)
    setErfolg(false)
    setLaedt(true)
    try {
      const hash = await assetSpeichern(datei)
      const base64 = await fileToBase64(datei)
      const antwort = await vorlageAnalysieren({
        jobId,
        base64,
        mediaType: datei.type || 'image/png',
        sprache,
      })
      if (!antwort.ok || !antwort.daten) {
        throw new Error(antwort.fehler || 'unbekannter Analyse-Fehler')
      }
      setErfolg(true)
      onFertig({ hash, analyse: antwort.daten })
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(false)
    }
  }

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px dashed ${dragOver ? '#34d399' : 'rgba(255,255,255,0.2)'}`,
        borderRadius: 12,
        padding: 20,
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const datei = e.dataTransfer.files[0]
        if (datei) verarbeiten(datei)
      }}
    >
      <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>{T('vorlageUploadTitel')}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12, opacity: 0.65 }}>{T('vorlageUploadHinweis')}</p>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '18px 14px',
          background: 'rgba(0,0,0,0.35)',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 13,
          opacity: laedt ? 0.6 : 1,
        }}
      >
        <input
          type="file"
          accept="image/png,image/jpeg"
          style={{ display: 'none' }}
          disabled={laedt}
          onChange={(e) => {
            const datei = e.target.files?.[0]
            if (datei) verarbeiten(datei)
          }}
        />
        {laedt ? T('dialogLaedt') : T('vorlageUploadDrop')}
      </label>

      {erfolg && (
        <p style={{ marginTop: 10, color: '#34d399', fontSize: 12 }}>✓ {T('vorlageAnalysiert')}</p>
      )}
      {fehler && (
        <p style={{ marginTop: 10, color: '#fecaca', fontSize: 12 }}>⚠ {T('vorlageAnalyseFehler')} — {fehler}</p>
      )}
    </section>
  )
}
