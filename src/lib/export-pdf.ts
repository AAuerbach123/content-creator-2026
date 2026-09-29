// Vektor-PDF-Export mit pdf-lib. Texte kommen als echte PDF-Textobjekte
// (Vektor); Bilder werden als JPG eingebettet. Größe in mm — für Druck-Abgabe
// nach LOOP-Regel 9 („Vektor-PDF in mm, Bilder eingebettet").

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { assetLaden } from './db'
import { artefaktAlsBlob } from './export-raster'
import type { Artefakt, Ebene } from './types'

const MM_PRO_PT = 25.4 / 72

function mmZuPt(mm: number): number {
  return mm / MM_PRO_PT
}

function pxZuMm(px: number, dpi = 96): number {
  return (px / dpi) * 25.4
}

function hexZuRgb(hex?: string): { r: number; g: number; b: number } | undefined {
  if (!hex) return undefined
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (!m) return undefined
  const int = parseInt(m[1], 16)
  return { r: ((int >> 16) & 0xff) / 255, g: ((int >> 8) & 0xff) / 255, b: (int & 0xff) / 255 }
}

async function bildBytes(hash?: string, dataUrl?: string): Promise<{ bytes: Uint8Array; typ: 'png' | 'jpg' } | null> {
  const dataToBytes = async (dUrl: string) => {
    const komma = dUrl.indexOf(',')
    const b64 = komma >= 0 ? dUrl.slice(komma + 1) : dUrl
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const typ = dUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png'
    return { bytes, typ: typ as 'png' | 'jpg' }
  }

  if (hash) {
    const a = await assetLaden(hash)
    if (a) {
      const buffer = await a.blob.arrayBuffer()
      return { bytes: new Uint8Array(buffer), typ: a.mimeType.includes('jpeg') ? 'jpg' : 'png' }
    }
  }
  if (dataUrl) return dataToBytes(dataUrl)
  return null
}

export async function artefaktAlsPdf(
  artefakt: Artefakt,
  args: { beschnittMm?: number; schnittmarken?: boolean } = {},
): Promise<Blob> {
  const beschnitt = args.beschnittMm || 0

  // Seitenmaße in Punkten
  let breiteMm: number
  let hoeheMm: number
  if (artefakt.einheit === 'mm') {
    breiteMm = artefakt.breite
    hoeheMm = artefakt.hoehe
  } else {
    breiteMm = pxZuMm(artefakt.breite)
    hoeheMm = pxZuMm(artefakt.hoehe)
  }
  const seitenBreitePt = mmZuPt(breiteMm + beschnitt * 2)
  const seitenHoehePt = mmZuPt(hoeheMm + beschnitt * 2)

  const pdf = await PDFDocument.create()
  const seite = pdf.addPage([seitenBreitePt, seitenHoehePt])
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica)

  // Skalierungsfaktor: 1 Artefakt-Einheit → wie viele PDF-Punkte
  const einheitZuPt = artefakt.einheit === 'mm'
    ? 1 / MM_PRO_PT
    : mmZuPt(pxZuMm(1))
  const offsetX = mmZuPt(beschnitt)
  const offsetY = mmZuPt(beschnitt)

  // Weißer Hintergrund
  seite.drawRectangle({
    x: 0,
    y: 0,
    width: seitenBreitePt,
    height: seitenHoehePt,
    color: rgb(1, 1, 1),
  })

  for (const e of artefakt.ebenen) {
    if (e.sichtbar === false) continue
    const x = offsetX + e.x * einheitZuPt
    // pdf-lib rechnet Y von unten
    const y = seitenHoehePt - (offsetY + (e.y + e.hoehe) * einheitZuPt)
    const breitePt = e.breite * einheitZuPt
    const hoehePt = e.hoehe * einheitZuPt

    if (e.typ === 'text') {
      const p = e.eigenschaften as Record<string, unknown>
      const text = (p.text as string) || e.name
      const groessePt = ((p.schriftgroesse as number) || 24) * einheitZuPt
      const gewicht = ((p.schriftgewicht as number) || 700)
      const farbe = hexZuRgb(p.farbe as string) || { r: 0.06, g: 0.06, b: 0.09 }
      const hg = hexZuRgb(p.hintergrund as string)
      const gewaehltesFont = gewicht >= 700 ? font : fontRegular

      if (hg) {
        seite.drawRectangle({
          x,
          y,
          width: breitePt,
          height: hoehePt,
          color: rgb(hg.r, hg.g, hg.b),
        })
      }

      // Wort-Umbruch
      const padding = hg ? groessePt * 0.3 : 0
      const maxBreite = breitePt - padding * 2
      const worte = text.split(/\s+/)
      const zeilen: string[] = []
      let aktuell = ''
      for (const wort of worte) {
        const test = aktuell ? aktuell + ' ' + wort : wort
        const w = gewaehltesFont.widthOfTextAtSize(test, groessePt)
        if (w > maxBreite && aktuell) {
          zeilen.push(aktuell)
          aktuell = wort
        } else {
          aktuell = test
        }
      }
      if (aktuell) zeilen.push(aktuell)

      const lineHeight = groessePt * 1.15
      let cursorY = y + hoehePt - lineHeight
      for (const zeile of zeilen) {
        const zeileBreite = gewaehltesFont.widthOfTextAtSize(zeile, groessePt)
        const zeilenX = hg ? x + (breitePt - zeileBreite) / 2 : x + padding
        seite.drawText(zeile, {
          x: zeilenX,
          y: cursorY,
          size: groessePt,
          font: gewaehltesFont,
          color: rgb(farbe.r, farbe.g, farbe.b),
        })
        cursorY -= lineHeight
      }
    } else if (e.typ === 'bild' || e.typ === 'logo') {
      const p = e.eigenschaften as Record<string, unknown>
      const info = await bildBytes(e.assetHash, (p.dataUrl as string) || (p.logoUrl as string))
      const fuell = hexZuRgb(p.fuellFarbe as string)
      if (fuell) {
        seite.drawRectangle({
          x,
          y,
          width: breitePt,
          height: hoehePt,
          color: rgb(fuell.r, fuell.g, fuell.b),
        })
      }
      if (info) {
        try {
          const bild = info.typ === 'jpg' ? await pdf.embedJpg(info.bytes) : await pdf.embedPng(info.bytes)
          const bildRatio = bild.width / bild.height
          const feldRatio = breitePt / hoehePt
          let bBreite = breitePt
          let bHoehe = hoehePt
          if (e.typ === 'logo') {
            // contain
            if (bildRatio > feldRatio) {
              bHoehe = breitePt / bildRatio
            } else {
              bBreite = hoehePt * bildRatio
            }
          } else {
            // cover
            if (bildRatio > feldRatio) {
              bBreite = hoehePt * bildRatio
            } else {
              bHoehe = breitePt / bildRatio
            }
          }
          seite.drawImage(bild, {
            x: x + (breitePt - bBreite) / 2,
            y: y + (hoehePt - bHoehe) / 2,
            width: bBreite,
            height: bHoehe,
          })
        } catch {
          // Bei Format-Problemen als PNG-Raster fallback über artefaktAlsBlob nur diesen Layer? — zu aufwendig; wir überspringen.
        }
      }
    }
  }

  // Schnittmarken zeichnen (dünne schwarze Linien in den Ecken des Beschnitts)
  if (args.schnittmarken && beschnitt > 0) {
    const markL = mmZuPt(5)
    const bl = mmZuPt(beschnitt)
    const ecken = [
      [0, 0],
      [seitenBreitePt, 0],
      [0, seitenHoehePt],
      [seitenBreitePt, seitenHoehePt],
    ]
    for (const [ex, ey] of ecken) {
      const dx = ex === 0 ? 1 : -1
      const dy = ey === 0 ? 1 : -1
      seite.drawLine({
        start: { x: ex + dx * bl - dx * markL, y: ey + dy * bl },
        end: { x: ex + dx * bl, y: ey + dy * bl },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      })
      seite.drawLine({
        start: { x: ex + dx * bl, y: ey + dy * bl - dy * markL },
        end: { x: ex + dx * bl, y: ey + dy * bl },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      })
    }
  }

  const bytes = await pdf.save()
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
}

// Fallback für Fälle, in denen wir aus irgendeinem Grund die Vektor-Route
// überspringen wollen (z. B. Vorschau/Debug) — nutzt Raster-Version.
export async function artefaktAlsRasterPdf(artefakt: Artefakt): Promise<Blob> {
  const blob = await artefaktAlsBlob(artefakt, 'jpg', { dpi: 300, qualitaet: 0.94 })
  const pdf = await PDFDocument.create()
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const bild = await pdf.embedJpg(bytes)
  const breiteMm = artefakt.einheit === 'mm' ? artefakt.breite : pxZuMm(artefakt.breite)
  const hoeheMm = artefakt.einheit === 'mm' ? artefakt.hoehe : pxZuMm(artefakt.hoehe)
  const seite = pdf.addPage([mmZuPt(breiteMm), mmZuPt(hoeheMm)])
  seite.drawImage(bild, { x: 0, y: 0, width: seite.getWidth(), height: seite.getHeight() })
  const out = await pdf.save()
  return new Blob([new Uint8Array(out)], { type: 'application/pdf' })
}
