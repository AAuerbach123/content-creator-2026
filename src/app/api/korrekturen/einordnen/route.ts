// POST /api/korrekturen/einordnen
//   Nimmt eine Liste Portal-Korrekturen und ordnet jede per Claude ein: Feld, Ziel (Zeitung/Monat/Spieltag/Vorschlag),
//   Sicherheit (0..1), automatisch-übernehmbar?  Telefon- und Teilnahmebedingungen werden grundsätzlich NIE
//   automatisch angewendet – rechtlich relevant.
//
// Antwort je Eintrag:
//   { id, feld: 'frage'|'antwort'|'name'|'ort'|'telefon'|'logo'|'tnb'|'format'|'unklar',
//     ziel: { zeitung?, monat?, spieltag?, vorschlag? },  sicherheit: number,  automatisch: boolean,
//     begruendung: string }

import { ClaudeFehler, claudeJson } from '@/lib/anthropic'
import type { Korrektur } from '../route'

type ClaudeJsonResult<T> = Awaited<ReturnType<typeof claudeJson<T>>>

export const runtime = 'nodejs'

type Einordnung = {
  id: string
  feld: 'frage' | 'antwort' | 'name' | 'ort' | 'telefon' | 'logo' | 'tnb' | 'format' | 'unklar'
  ziel: { zeitung?: string; monat?: string; spieltag?: number; vorschlag?: 'A' | 'B' | 'C' }
  sicherheit: number
  automatisch: boolean
  begruendung: string
}

const SYSTEM =
  'Du ordnest Verlags-Rückmeldungen aus einem Druckkorrektur-Portal den konkreten Feldern einer Spiele-Anzeige zu. ' +
  'Antworte ausschließlich mit JSON gemäß Schema. Erfinde nichts – wenn eine Angabe (Zeitung/Monat/Spieltag/Vorschlag) im Text nicht steht, lass sie weg. ' +
  'Mögliche Felder: frage, antwort, name, ort, telefon, logo, tnb, format, unklar. ' +
  'Telefonnummern und Teilnahmebedingungen (tnb) werden niemals automatisch übernommen (automatisch=false), auch bei Sicherheit 1.0. ' +
  'Sicherheit (0..1): wie sicher ist die Zuordnung Feld + Ziel. automatisch=true nur, wenn Sicherheit ≥ 0.9 UND Feld ≠ telefon/tnb UND Ziel enthält Zeitung + Spieltag.'

export async function POST(req: Request) {
  let body: { korrekturen?: Korrektur[] }
  try {
    body = (await req.json()) as { korrekturen?: Korrektur[] }
  } catch {
    return new Response(JSON.stringify({ fehler: 'Ungültiger JSON-Body' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
  const liste = body.korrekturen ?? []
  if (liste.length === 0) return new Response(JSON.stringify({ einordnungen: [] }), { status: 200, headers: { 'content-type': 'application/json' } })

  const kurz = liste.map((k) => ({
    id: k.id,
    paper: k.paper,
    variant: k.variant,
    winner: k.winner,
    kategorie: k.kategorie,
    status: k.status,
    text: k.text,
    autor: k.autor,
  }))

  try {
    const r: ClaudeJsonResult<{ einordnungen: Einordnung[] }> = await claudeJson<{ einordnungen: Einordnung[] }>({
      systemPrompt: SYSTEM,
      nachrichten: [
        {
          role: 'user',
          content:
            'Hier sind ' + liste.length + ' Korrekturen aus dem Portal. Ordne jede ein. ' +
            'Der Feldname `paper` enthält häufig Zeitungs-Dateinamen (z. B. „SWMH_Variante-1_mit-Gewinner_Spieltag-07.pdf“) – daraus kannst du Zeitung/Variante/Spieltag ableiten. ' +
            'Antworte NUR mit JSON der Form {"einordnungen":[{"id":"…","feld":"…","ziel":{…},"sicherheit":0.x,"automatisch":true|false,"begruendung":"…"}]}.\n\n' +
            JSON.stringify(kurz),
        },
      ],
      maxTokens: 4000,
      temperature: 0.1,
    })
    const einordnungen = (r.daten?.einordnungen ?? []).map((e) => {
      const feld = e.feld
      const automatisch = feld !== 'telefon' && feld !== 'tnb' && e.sicherheit >= 0.9 && e.automatisch
      return { ...e, automatisch }
    })
    return new Response(JSON.stringify({ einordnungen, kostenUsd: r.kostenUsd ?? 0 }), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (e) {
    if (e instanceof ClaudeFehler) {
      return new Response(JSON.stringify({ fehler: e.message, status: e.status }), { status: 502, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ fehler: (e as Error).message }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}
