// Client-seitiges Raster-Rendering für Artefakte.
// Zeichnet Bilder, Text und Hintergründe direkt in ein <canvas>-Element und
// gibt einen Blob im gewünschten Format zurück. Korrektes Pixel-Ratio für
// Retina-Export (2×) über den `skala`-Parameter.

import { assetLaden } from './db'
import type { Artefakt, Ebene } from './types'

const MM_PRO_INCH = 25.4

function pxProArtefakteinheit(artefakt: Artefakt, dpi = 300): number {
  if (artefakt.einheit === 'mm') return dpi / MM_PRO_INCH
  return 1
}

async function bildDatenUrl(hash?: string, dataUrl?: string): Promise<HTMLImageElement | null> {
  const src = await (async () => {
    if (hash) {
      const a = await assetLaden(hash)
      if (a) return URL.createObjectURL(a.blob)
    }
    return dataUrl
  })()
  if (!src) return null
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'))
    img.crossOrigin = 'anonymous'
    img.src = src
  })
}

function textZeichnen(ctx: CanvasRenderingContext2D, e: Ebene, skala: number) {
  const p = e.eigenschaften as Record<string, unknown>
  const text = (p.text as string) || e.name
  const groesse = ((p.schriftgroesse as number) || 24) * skala
  const gewicht = ((p.schriftgewicht as number) || 700)
  const familie = (p.schriftfamilie as string) || 'system-ui'
  const farbe = (p.farbe as string) || '#111'
  const hg = p.hintergrund as string | undefined
  const radius = ((p.radius as number) || 0) * skala

  ctx.save()
  ctx.translate(e.x * skala, e.y * skala)
  ctx.rotate(((e.drehung || 0) * Math.PI) / 180)
  const w = e.breite * skala
  const h = e.hoehe * skala

  if (hg) {
    ctx.fillStyle = hg
    if (radius > 0) {
      const r = Math.min(radius, w / 2, h / 2)
      ctx.beginPath()
      ctx.moveTo(r, 0)
      ctx.arcTo(w, 0, w, h, r)
      ctx.arcTo(w, h, 0, h, r)
      ctx.arcTo(0, h, 0, 0, r)
      ctx.arcTo(0, 0, w, 0, r)
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.fillRect(0, 0, w, h)
    }
  }

  ctx.fillStyle = farbe
  ctx.font = `${gewicht} ${groesse}px ${familie}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = hg ? 'center' : 'left'

  const padding = hg ? groesse * 0.3 : 0
  const lineHeight = groesse * 1.15
  const worte = text.split(/\s+/)
  const zeilen: string[] = []
  let aktuelleZeile = ''
  const maxBreite = w - padding * 2
  for (const wort of worte) {
    const test = aktuelleZeile ? aktuelleZeile + ' ' + wort : wort
    if (ctx.measureText(test).width > maxBreite && aktuelleZeile) {
      zeilen.push(aktuelleZeile)
      aktuelleZeile = wort
    } else {
      aktuelleZeile = test
    }
  }
  if (aktuelleZeile) zeilen.push(aktuelleZeile)

  const gesamthoehe = zeilen.length * lineHeight
  let startY = (h - gesamthoehe) / 2 + lineHeight / 2
  const xPos = hg ? w / 2 : padding

  for (const zeile of zeilen) {
    ctx.fillText(zeile, xPos, startY)
    startY += lineHeight
  }

  ctx.restore()
}

async function bildZeichnen(ctx: CanvasRenderingContext2D, e: Ebene, skala: number, isLogo = false) {
  const p = e.eigenschaften as Record<string, unknown>
  const bild = await bildDatenUrl(e.assetHash, (p.dataUrl as string) || (p.logoUrl as string))
  const w = e.breite * skala
  const h = e.hoehe * skala

  ctx.save()
  ctx.translate(e.x * skala, e.y * skala)
  ctx.rotate(((e.drehung || 0) * Math.PI) / 180)

  const fuell = p.fuellFarbe as string | undefined
  if (fuell) {
    ctx.fillStyle = fuell
    ctx.fillRect(0, 0, w, h)
  }
  if (bild) {
    if (isLogo) {
      // contain
      const r = Math.min(w / bild.width, h / bild.height)
      const nw = bild.width * r
      const nh = bild.height * r
      ctx.drawImage(bild, (w - nw) / 2, (h - nh) / 2, nw, nh)
    } else {
      // cover
      const r = Math.max(w / bild.width, h / bild.height)
      const nw = bild.width * r
      const nh = bild.height * r
      ctx.drawImage(bild, (w - nw) / 2, (h - nh) / 2, nw, nh)
    }
  }
  ctx.restore()
}

export async function artefaktRastern(
  artefakt: Artefakt,
  args: { skala?: number; dpi?: number; hintergrund?: string } = {},
): Promise<HTMLCanvasElement> {
  const einheitProPx = pxProArtefakteinheit(artefakt, args.dpi || 300)
  const skala = (args.skala || 1) * einheitProPx
  const breite = Math.round(artefakt.breite * skala)
  const hoehe = Math.round(artefakt.hoehe * skala)

  const canvas = document.createElement('canvas')
  canvas.width = breite
  canvas.height = hoehe
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D-Kontext nicht verfügbar')

  ctx.fillStyle = args.hintergrund || '#ffffff'
  ctx.fillRect(0, 0, breite, hoehe)

  for (const e of artefakt.ebenen) {
    if (e.sichtbar === false) continue
    if (e.typ === 'text') textZeichnen(ctx, e, skala)
    else if (e.typ === 'bild') await bildZeichnen(ctx, e, skala, false)
    else if (e.typ === 'logo') await bildZeichnen(ctx, e, skala, true)
  }
  return canvas
}

export async function artefaktAlsBlob(
  artefakt: Artefakt,
  format: 'png' | 'jpg' | 'webp',
  args: { skala?: number; dpi?: number; hintergrund?: string; qualitaet?: number } = {},
): Promise<Blob> {
  const canvas = await artefaktRastern(artefakt, args)
  const mime = format === 'png' ? 'image/png' : format === 'jpg' ? 'image/jpeg' : 'image/webp'
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob lieferte null'))), mime, args.qualitaet ?? 0.92)
  })
}

export function blobHerunterladen(blob: Blob, dateiname: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = dateiname
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function dateinameSanitisieren(titel: string): string {
  return (
    titel
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 60) || 'artefakt'
  )
}
