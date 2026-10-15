// KI-Gestaltungsvarianten: je Vorschlag A, B, C eine Variante (Farben, Titel, Unterzeile).
// Raster, Rufnummern, Teilnahmebedingungen und Gewinnerblock bleiben unverändert (src/lib/serie/variante.ts).

import { NextResponse } from 'next/server'
import { claudeJson, ClaudeFehler } from '@/lib/anthropic'
import { mitRecht } from '@/lib/server/zugang'
import { farbenAbsichern, type Variante } from '@/lib/serie/variante'

export const runtime = 'nodejs'

type Anfrage = {
  spielName: string
  /** z. B. „November und Dezember 2027“ */
  zeitraum: string
  /** z. B. „10.000 €“ – muss in der Unterzeile genau so vorkommen */
  hoechstgewinn: string
  /** Titel/Unterzeile der Originalvorschläge (zur Orientierung) */
  original: Record<'A' | 'B' | 'C', { titel: string; unterzeile: string; stil: string }>
  wunsch?: string
}

const SYSTEM = `Du bist Art Director für Gewinnspielanzeigen in deutschen Tageszeitungen (Leserschaft eher 50+).
Es gibt drei feste, geprüfte Layouts A, B und C. Du erfindest für JEDES Layout genau eine Variante, die nur Farben, Titel und Unterzeile ändert.
Regeln:
- Deutsch, echte Umlaute und ß, keine Anglizismen, keine Markennamen, keine erfundenen Versprechen.
- titel: kurz und plakativ. A: eine Zeile, höchstens 12 Zeichen. B: zwei kurze Zeilen mit „|“ getrennt, je höchstens 10 Zeichen (wie „Es regnet|Geld.“). C: eine Zeile, höchstens 10 Zeichen, in Großbuchstaben (wie „GELDREGEN“).
- unterzeile: höchstens 48 Zeichen, muss den Höchstgewinn exakt so enthalten wie vorgegeben und ihn mit **…** hervorheben, z. B. „Mit einem Anruf bis zu **10.000 €** gewinnen“.
- grund: dunkle Grundfarbe als Hex (#RRGGBB), weiße Schrift muss darauf gut lesbar sein.
- akzent: helle, kräftige Akzentfarbe als Hex, gut lesbar auf der Grundfarbe (Beträge, Ziffern).
- eigeneFarbe (nur B und C): true = Grundfarbe ersetzt die Hausfarbe der Zeitung, false = Hausfarbe bleibt.
- name: 1–3 Wörter (z. B. „Winterabend“), idee: ein kurzer Satz, warum es passt.
- Die drei Varianten sollen sich deutlich voneinander unterscheiden und zum Zeitraum/Anlass passen.
Antworte ausschließlich mit JSON: {"varianten":[{"basis":"A","name":"","titel":"","unterzeile":"","grund":"#","akzent":"#","idee":""},{"basis":"B",…,"eigeneFarbe":true},{"basis":"C",…,"eigeneFarbe":true}]}`

export async function POST(request: Request) {
  const z = await mitRecht(request, 'gestalten')
  if ('antwort' in z) return z.antwort
  let b: Anfrage
  try {
    b = (await request.json()) as Anfrage
  } catch {
    return NextResponse.json({ fehler: 'Body ist kein gültiges JSON.' }, { status: 400 })
  }
  if (!b.spielName || !b.hoechstgewinn) return NextResponse.json({ fehler: 'spielName und hoechstgewinn fehlen.' }, { status: 400 })

  const auftrag =
    `Spiel: ${b.spielName}\nZeitraum: ${b.zeitraum}\nHöchstgewinn (exakt so schreiben): ${b.hoechstgewinn}\n` +
    (b.wunsch?.trim() ? `Wunsch der Redaktion: ${b.wunsch.trim().slice(0, 300)}\n` : '') +
    `Originale:\n` +
    (['A', 'B', 'C'] as const).map((v) => `${v}: ${b.original?.[v]?.stil ?? ''} – Titel „${b.original?.[v]?.titel ?? ''}“, Unterzeile „${b.original?.[v]?.unterzeile ?? ''}“`).join('\n')

  try {
    const a = await claudeJson<{ varianten?: Array<Partial<Variante>> }>({
      systemPrompt: SYSTEM,
      nachrichten: [{ role: 'user', content: auftrag }],
      maxTokens: 1200,
      temperature: 0.9,
    })
    const roh = a.daten?.varianten ?? []
    const varianten: Variante[] = (['A', 'B', 'C'] as const).map((basis, i) => {
      const r = roh.find((x) => x.basis === basis) ?? roh[i] ?? {}
      let unter = String(r.unterzeile ?? '').trim().slice(0, 70)
      if (!unter.includes(b.hoechstgewinn)) unter = `Mit einem Anruf bis zu **${b.hoechstgewinn}** gewinnen`
      const titel = String(r.titel ?? '').trim().slice(0, 30)
      return farbenAbsichern({
        id: crypto.randomUUID(),
        name: String(r.name ?? `Variante ${basis}`).trim().slice(0, 30),
        basis,
        titel: basis === 'B' ? titel : titel.replace(/\s*\|\s*/g, ' '),
        unterzeile: unter,
        grund: String(r.grund ?? ''),
        akzent: String(r.akzent ?? ''),
        eigeneFarbe: basis === 'A' ? undefined : r.eigeneFarbe !== false,
        idee: String(r.idee ?? '').trim().slice(0, 160),
      })
    })
    return NextResponse.json({ varianten, kostenUsd: a.kostenUsd })
  } catch (e) {
    const status = e instanceof ClaudeFehler ? e.status : 500
    return NextResponse.json({ fehler: e instanceof Error ? e.message : 'Unbekannter Fehler' }, { status })
  }
}
