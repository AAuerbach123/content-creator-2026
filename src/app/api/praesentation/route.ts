// POST /api/praesentation
//   Body: { modus: 'einzel' | 'verlage' | 'varianten', eintraege: [{ verlag?, azsCent, rspShare }], ohneNotizen?, pdf? }
// Erzeugt eine oder viele PPTX (bei mehreren: ZIP). Mit `pdf: true` wandelt es jede PPTX zusätzlich per LibreOffice
// (`soffice --headless --convert-to pdf`) in ein PDF um – nur lokal, nur wenn LibreOffice im Standardpfad liegt.

import fs from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import JSZip from 'jszip'
import { erzeugenPraesentation, type Bilder } from '@/lib/praesentation/gsp2027'
import { nachbearbeiten } from '@/lib/praesentation/nachbearbeiten'

export const runtime = 'nodejs'

const execAsync = promisify(exec)

type Eintrag = { verlag?: string; azsCent: number; rspShare: number }
type Body = { modus: 'einzel' | 'verlage' | 'varianten'; eintraege: Eintrag[]; ohneNotizen?: boolean; pdf?: boolean }

const BILD_DATEIEN = [
  'aus2mach1', 'aus2mach1_kontrast', 'bruecke', 'fehler_a', 'fehler_b', 'fehler_b_markiert',
  'geldregen', 'geldregen_kontrast', 'gitter', 'jul1', 'jul2', 'jul3', 'jul4', 'kombi',
  'kuq_april', 'kuq_okt', 'tnb_strip',
] as const
const LOGOS = ['logo_rot', 'logo_weiss'] as const

async function bilderLaden(): Promise<Bilder> {
  // Bilder liegen bereits mit copy in public/praesentation/ (siehe OFFENE_PUNKTE.md #13)
  const basis = path.join(process.cwd(), 'public', 'praesentation')
  const result: Bilder = {}
  for (const name of [...BILD_DATEIEN, ...LOGOS]) {
    const ext = name.startsWith('logo_') ? '.png' : '.jpg'
    const p = path.join(basis, name + ext)
    try {
      const buf = await fs.readFile(p)
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg'
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`
      // Bildmaße kurz aus dem Header lesen (reicht für pptxgenjs „fit“)
      const dim = ext === '.png' ? pngGroesse(buf) : jpegGroesse(buf)
      result[name] = [dim.w, dim.h, dataUrl]
    } catch {
      throw new Error(`Bild fehlt: public/praesentation/${name}${ext}. Siehe OFFENE_PUNKTE.md #13.`)
    }
  }
  return result
}

function pngGroesse(buf: Buffer): { w: number; h: number } {
  // Width/Height stehen in bytes 16-23 (big-endian) direkt nach dem IHDR-Chunk-Header
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20)
  return { w, h }
}

function jpegGroesse(buf: Buffer): { w: number; h: number } {
  // SOFn-Marker finden (0xFFC0..0xFFCF außer 0xFFC4/0xFFC8/0xFFCC)
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue }
    const marker = buf[i + 1]
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = buf.readUInt16BE(i + 5)
      const w = buf.readUInt16BE(i + 7)
      return { w, h }
    }
    const len = buf.readUInt16BE(i + 2)
    i += 2 + len
  }
  return { w: 1600, h: 1200 }
}

function dateinameVariante(e: Eintrag): string {
  const az = String(Math.round(e.azsCent < 1 ? e.azsCent * 100 : e.azsCent)).padStart(2, '0')
  const sh = String(Math.round(e.rspShare < 1 ? e.rspShare * 100 : e.rspShare)).padStart(2, '0')
  const slug = (e.verlag || `${az}ct-${sh}pct`).replace(/[^a-z0-9äöüß+\-]+/gi, '_').replace(/^_+|_+$/g, '')
  return `Gewinnspielplan_2027_${slug}`
}

async function pdfBauen(pptxPfad: string, zielDir: string): Promise<string | null> {
  const soffice = '/Applications/LibreOffice.app/Contents/MacOS/soffice'
  try {
    await fs.access(soffice)
  } catch {
    return null
  }
  await execAsync(`"${soffice}" --headless --convert-to pdf --outdir "${zielDir}" "${pptxPfad}"`)
  const pdf = pptxPfad.replace(/\.pptx$/, '.pdf')
  return pdf
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return new Response(JSON.stringify({ fehler: 'Ungültiger JSON-Body' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
  if (!['einzel', 'verlage', 'varianten'].includes(body.modus) || !Array.isArray(body.eintraege) || body.eintraege.length === 0) {
    return new Response(JSON.stringify({ fehler: 'Bitte modus und eintraege angeben.' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
  let bilder: Bilder
  try {
    bilder = await bilderLaden()
  } catch (e) {
    return new Response(JSON.stringify({ fehler: (e as Error).message }), { status: 500, headers: { 'content-type': 'application/json' } })
  }

  // Jede Variante bauen (seriell – pptxgenjs hat globale Writer)
  const dateien: { name: string; pptx: Uint8Array; eintrag: Eintrag }[] = []
  for (const e of body.eintraege) {
    try {
      const roh = await erzeugenPraesentation({
        verlag: e.verlag,
        azsCent: e.azsCent,
        rspShare: e.rspShare,
        bilder,
        ohneNotizen: body.ohneNotizen,
      })
      const pptx = await nachbearbeiten(roh)
      dateien.push({ name: dateinameVariante(e) + '.pptx', pptx, eintrag: e })
    } catch (err) {
      return new Response(JSON.stringify({ fehler: (err as Error).message, verlag: e.verlag }), { status: 500, headers: { 'content-type': 'application/json' } })
    }
  }

  // PDF optional
  const pdfs: { name: string; data: Uint8Array }[] = []
  if (body.pdf) {
    const tmp = path.join(process.cwd(), '_praesentation_tmp')
    await fs.mkdir(tmp, { recursive: true })
    for (const d of dateien) {
      const pptxPfad = path.join(tmp, d.name)
      await fs.writeFile(pptxPfad, d.pptx)
      const pdfPfad = await pdfBauen(pptxPfad, tmp)
      if (!pdfPfad) {
        return new Response(JSON.stringify({
          fehler: 'LibreOffice fehlt unter /Applications/LibreOffice.app. Siehe OFFENE_PUNKTE.md #13 (brew install --cask libreoffice).',
        }), { status: 503, headers: { 'content-type': 'application/json' } })
      }
      pdfs.push({ name: path.basename(pdfPfad), data: await fs.readFile(pdfPfad) })
    }
  }

  // Rückgabe
  if (dateien.length === 1 && !body.pdf) {
    return new Response(dateien[0].pptx as BodyInit, {
      status: 200,
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'content-disposition': `attachment; filename="${dateien[0].name}"`,
      },
    })
  }
  const zip = new JSZip()
  dateien.forEach((d) => zip.file(d.name, d.pptx))
  pdfs.forEach((p) => zip.file(p.name, p.data))
  // Übersicht als CSV (XLSX ohne Abhängigkeit nicht sinnvoll)
  const uebersicht = ['Verlag;AZS pro Anruf;RSP-Anteil', ...body.eintraege.map((e) => {
    const az = e.azsCent < 1 ? e.azsCent * 100 : e.azsCent
    const sh = e.rspShare < 1 ? e.rspShare * 100 : e.rspShare
    return `${(e.verlag || '').replace(/;/g, ',')};${az.toFixed(0)} ct;${sh.toFixed(0)} %`
  })].join('\r\n')
  zip.file('Uebersicht_Verlage_Konditionen.csv', uebersicht)
  const zipData = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  return new Response(zipData as BodyInit, {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-disposition': 'attachment; filename="Gewinnspielplan_2027.zip"',
    },
  })
}
