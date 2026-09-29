// Social-Paket-Export + Job-Backup als ZIP.
// - Social-Paket: alle Artefakte + Captions.txt
// - Backup: job.json + assets/<hash>.<ext>
// - Adobe-Übergabe: PDF + Anleitung als TXT

import JSZip from 'jszip'
import { assetLaden } from './db'
import { artefaktAlsBlob, dateinameSanitisieren } from './export-raster'
import { artefaktAlsPdf } from './export-pdf'
import type { Artefakt, Job } from './types'

function mimeZuExt(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('svg')) return 'svg'
  if (mime.includes('pdf')) return 'pdf'
  return 'png'
}

export async function socialPaket(job: Job): Promise<Blob> {
  const zip = new JSZip()
  const basis = dateinameSanitisieren(job.titel)
  const captions: string[] = []
  captions.push(`# ${job.titel}`, '', `Ziel: ${job.ziel}`, '')

  for (const artefakt of job.artefakte) {
    const format = artefakt.format.replace(/\s+/g, '_')
    const blob = await artefaktAlsBlob(artefakt, 'png', { skala: 1 })
    zip.file(`${basis}_${format}.png`, blob)
    captions.push(`## ${artefakt.format}`, '(caption folgt)', '')
  }

  zip.file(`${basis}_captions.txt`, captions.join('\n'))
  return zip.generateAsync({ type: 'blob' })
}

export async function jobBackup(job: Job): Promise<Blob> {
  const zip = new JSZip()
  const basis = dateinameSanitisieren(job.titel)

  // job.json — ohne Blob-Referenzen; Referenzen bleiben als Hashes im JSON
  zip.file(`${basis}.json`, JSON.stringify(job, null, 2))

  // Assets: hash → binary
  const hashes = new Set<string>()
  for (const a of job.artefakte) {
    for (const h of a.assetRefs) hashes.add(h)
    for (const e of a.ebenen) if (e.assetHash) hashes.add(e.assetHash)
  }
  if (job.vorlageRef) hashes.add(job.vorlageRef)

  const assetsOrdner = zip.folder('assets')
  for (const hash of hashes) {
    const asset = await assetLaden(hash)
    if (!asset) continue
    const ext = mimeZuExt(asset.mimeType)
    assetsOrdner?.file(`${hash}.${ext}`, asset.blob)
  }

  return zip.generateAsync({ type: 'blob' })
}

export async function adobeUebergabe(artefakt: Artefakt, titel: string): Promise<Blob> {
  const zip = new JSZip()
  const basis = dateinameSanitisieren(titel)
  const pdf = await artefaktAlsPdf(artefakt, { beschnittMm: 3, schnittmarken: true })
  zip.file(`${basis}.pdf`, pdf)
  zip.file(
    'ANLEITUNG.txt',
    `Adobe-Übergabe für ${titel}\n\n` +
      `Diese PDF ist vektor-basiert (Texte + Formen als Vektor, Bilder eingebettet) und in mm-Größe für den Druck.\n\n` +
      `Öffnen in Adobe Illustrator:\n` +
      `1. Illustrator starten.\n` +
      `2. Datei → Öffnen → PDF wählen.\n` +
      `3. Alle Objekte bleiben editierbar.\n\n` +
      `Nach InDesign wandeln:\n` +
      `1. In Claude Desktop den Adobe-Connector aktivieren.\n` +
      `2. Aktion „PDF zu InDesign" mit dieser PDF starten.\n` +
      `3. Zwei-Klick-Upload folgen.\n`,
  )
  return zip.generateAsync({ type: 'blob' })
}
