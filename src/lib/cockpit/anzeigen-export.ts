'use client'

// Druckfertige Anzeigen-PDFs aus dem Cockpit: erzeugen (Server /api/cockpit/pdf), als ZIP laden, nach monday hochladen.

import JSZip from 'jszip'
import { anzeigeDateiname } from '../serie/serie-client'
import { gewinnerVarianten } from '../serie/generator'
import type { GewinnerAnzahl, Vorschlag } from '../serie/types'
import { argsFuer, htmlFuer, inhaltFuer, kontextLaden } from './anzeigen'
import type { Kampagne, Spieltag } from './typen'

export type Fortschritt = (fertig: number, gesamt: number, text: string) => void

async function pdfVomServer(html: string, wmm: number, hmm: number): Promise<Blob> {
  const r = await fetch('/api/cockpit/pdf', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ html, wmm, hmm }) })
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { fehler?: string }
    throw new Error(j.fehler ?? `PDF: HTTP ${r.status}`)
  }
  return r.blob()
}

type Auftrag = { zeitungId: string; gruppe: string; g: GewinnerAnzahl; dateiname: string; html: string; wmm: number; hmm: number }

async function auftraege(k: Kampagne, s: Spieltag, nurGruppe?: string): Promise<Auftrag[]> {
  const kontext = await kontextLaden(k, s.datum.slice(0, 7))
  const inhalt = await inhaltFuer(kontext, s)
  const vorschlag = ((k.vorlageAbc as Vorschlag) ?? 'A')
  const varianten: GewinnerAnzahl[] = kontext.spiel ? [1, 4] : gewinnerVarianten(inhalt, [1, 4])
  const out: Auftrag[] = []
  for (const z of kontext.zeitungen) {
    if (nurGruppe && z.hotline !== nurGruppe) continue
    for (const g of varianten) {
      const a = argsFuer(kontext, z, inhalt, vorschlag, g, s.datum.slice(0, 7))
      out.push({ zeitungId: z.id, gruppe: z.hotline, g, dateiname: anzeigeDateiname(a) + '.pdf', html: htmlFuer(a), wmm: z.format[0], hmm: z.format[1] })
    }
  }
  return out
}

/** Alle PDFs eines Spieltags als ZIP herunterladen. */
export async function zipHerunterladen(k: Kampagne, s: Spieltag, fortschritt?: Fortschritt, nurGruppe?: string): Promise<number> {
  const liste = await auftraege(k, s, nurGruppe)
  const zip = new JSZip()
  let n = 0
  for (const a of liste) {
    fortschritt?.(n, liste.length, a.dateiname)
    zip.file(a.dateiname, await pdfVomServer(a.html, a.wmm, a.hmm))
    n++
  }
  fortschritt?.(n, liste.length, 'ZIP …')
  const blob = await zip.generateAsync({ type: 'blob' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `Anzeigen_Spieltag_${String(s.nr).padStart(2, '0')}_${s.datum}${nurGruppe ? '_' + nurGruppe : ''}.zip`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 3000)
  return n
}

/** PDFs eines Spieltags erzeugen und in die Datei-Spalten des monday-Anzeigen-Boards laden. */
export async function nachMondayHochladen(k: Kampagne, s: Spieltag, ersetzen: boolean, fortschritt?: Fortschritt): Promise<{ hoch: number; fehler: string[] }> {
  const liste = await auftraege(k, s)
  const fehler: string[] = []
  const geleert = new Set<string>()
  let n = 0
  for (const a of liste) {
    fortschritt?.(n, liste.length, a.dateiname)
    try {
      const pdf = await pdfVomServer(a.html, a.wmm, a.hmm)
      const fd = new FormData()
      const schluessel = `${a.gruppe}:${a.g}`
      fd.append('kampagneId', k.id)
      fd.append('monat', s.datum.slice(0, 7))
      fd.append('nr', String(s.nr))
      fd.append('gruppe', a.gruppe)
      fd.append('gewinner', String(a.g))
      fd.append('vorschlag', (k.vorlageAbc as string) ?? 'A')
      fd.append('dateiname', a.dateiname)
      fd.append('ersetzen', ersetzen && !geleert.has(schluessel) ? '1' : '0') // Spalte nur beim ersten PDF der Gruppe leeren
      fd.append('datei', pdf, a.dateiname)
      const r = await fetch('/api/cockpit/monday', { method: 'POST', body: fd })
      const j = (await r.json().catch(() => ({}))) as { fehler?: string }
      if (!r.ok) throw new Error(j.fehler ?? `HTTP ${r.status}`)
      geleert.add(schluessel)
      n++
    } catch (e) {
      fehler.push(`${a.dateiname}: ${e instanceof Error ? e.message : String(e)}`)
      if (fehler.length >= 3 && n === 0) break
    }
  }
  fortschritt?.(liste.length, liste.length, 'fertig')
  return { hoch: n, fehler }
}
