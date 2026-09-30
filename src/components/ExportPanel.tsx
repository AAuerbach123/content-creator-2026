'use client'

import { useState } from 'react'
import { artefaktAlsBlob, blobHerunterladen, dateinameSanitisieren } from '@/lib/export-raster'
import { artefaktAlsPdf } from '@/lib/export-pdf'
import { adobeUebergabe, jobBackup, socialPaket } from '@/lib/export-paket'
import type { Artefakt, Job } from '@/lib/types'
import HilfePopover from './HilfePopover'
import { useSprache } from './SpracheProvider'

// Phase 4: Export-Optionen für ein Artefakt bzw. den ganzen Job.

export default function ExportPanel({ job, artefakt }: { job: Job; artefakt?: Artefakt }) {
  const { sprache } = useSprache()
  const [laedt, setLaedt] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [gewicht, setGewicht] = useState<string | null>(null)

  const dateinameBase = dateinameSanitisieren(job.titel)

  const raster = async (format: 'png' | 'jpg' | 'webp', skala: number) => {
    if (!artefakt) return
    setFehler(null)
    setLaedt(`${format}-${skala}x`)
    try {
      const blob = await artefaktAlsBlob(artefakt, format, { skala })
      const suffix = artefakt.format.replace(/\s+/g, '_')
      const dateiname = `${dateinameBase}_${suffix}_${skala}x.${format}`
      setGewicht(`${(blob.size / 1024).toFixed(1)} KB (${format.toUpperCase()} ${skala}×)`)
      blobHerunterladen(blob, dateiname)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(null)
    }
  }

  const printPdf = async () => {
    if (!artefakt) return
    setFehler(null)
    setLaedt('pdf')
    try {
      const blob = await artefaktAlsPdf(artefakt, { beschnittMm: 3, schnittmarken: true })
      const suffix = artefakt.format.replace(/\s+/g, '_')
      blobHerunterladen(blob, `${dateinameBase}_${suffix}.pdf`)
      setGewicht(`${(blob.size / 1024).toFixed(1)} KB (PDF)`)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(null)
    }
  }

  const socialZip = async () => {
    setFehler(null)
    setLaedt('social')
    try {
      const blob = await socialPaket(job)
      blobHerunterladen(blob, `${dateinameBase}_social.zip`)
      setGewicht(`${(blob.size / 1024).toFixed(1)} KB (Social-Paket)`)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(null)
    }
  }

  const backup = async () => {
    setFehler(null)
    setLaedt('backup')
    try {
      const blob = await jobBackup(job)
      blobHerunterladen(blob, `${dateinameBase}_backup.zip`)
      setGewicht(`${(blob.size / 1024).toFixed(1)} KB (Backup)`)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(null)
    }
  }

  const adobe = async () => {
    if (!artefakt) return
    setFehler(null)
    setLaedt('adobe')
    try {
      const blob = await adobeUebergabe(artefakt, job.titel)
      blobHerunterladen(blob, `${dateinameBase}_adobe.zip`)
      setGewicht(`${(blob.size / 1024).toFixed(1)} KB (Adobe-Paket)`)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(null)
    }
  }

  const knopf = (id: string, label: string, onClick: () => void, akzent = false) => (
    <button
      key={id}
      type="button"
      onClick={onClick}
      disabled={laedt !== null || (!artefakt && id !== 'social' && id !== 'backup')}
      style={{
        background: akzent ? '#f5f5f7' : 'rgba(255,255,255,0.08)',
        color: akzent ? '#0b0b0f' : '#f5f5f7',
        border: '1px solid rgba(255,255,255,0.15)',
        padding: '7px 12px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        cursor: laedt !== null ? 'not-allowed' : 'pointer',
        opacity: laedt !== null || (!artefakt && id !== 'social' && id !== 'backup') ? 0.5 : 1,
      }}
    >
      {laedt === id ? '…' : label}
    </button>
  )

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
      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{sprache === 'de' ? 'Exporte' : 'Exports'}</span>
        <HilfePopover
          de="Raster (PNG/JPG/WebP) 1× für Web, 2× für Retina. Vektor-PDF geht in mm mit 3 mm Beschnitt + Schnittmarken — genau so wollen Verlage die Anzeige. Social-Paket bündelt alle Artefakte + Captions. Adobe-Paket enthält PDF + Anleitung. Job-Backup = alles wieder öffnen können."
          en="Raster (PNG/JPG/WebP) 1× for web, 2× for Retina. Vector PDF in mm with 3 mm bleed + crop marks — the way publishers want ads. Social bundle: all artefacts + captions. Adobe bundle: PDF + how-to. Job backup = full reopen."
        />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {knopf('png-1', 'PNG 1×', () => raster('png', 1))}
        {knopf('png-2', 'PNG 2×', () => raster('png', 2))}
        {knopf('jpg-1', 'JPG 1×', () => raster('jpg', 1))}
        {knopf('jpg-2', 'JPG 2×', () => raster('jpg', 2))}
        {knopf('webp-1', 'WebP 1×', () => raster('webp', 1))}
        {knopf('webp-2', 'WebP 2×', () => raster('webp', 2))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {knopf('pdf', sprache === 'de' ? 'Vektor-PDF (mm + Beschnitt)' : 'Vector PDF (mm + bleed)', printPdf, true)}
        {knopf('adobe', sprache === 'de' ? 'Adobe-Paket' : 'Adobe package', adobe)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {knopf('social', sprache === 'de' ? 'Social-Paket (ZIP)' : 'Social package (ZIP)', socialZip)}
        {knopf('backup', sprache === 'de' ? 'Job-Backup (JSON + Assets)' : 'Job backup (JSON + assets)', backup)}
      </div>
      {gewicht && (
        <p style={{ margin: 0, fontSize: 11, opacity: 0.65 }}>{gewicht}</p>
      )}
      {fehler && (
        <p style={{ margin: 0, fontSize: 11, color: '#fecaca' }}>⚠ {fehler}</p>
      )}
    </section>
  )
}
