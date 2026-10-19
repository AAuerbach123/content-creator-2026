// KI-Gestaltungsvarianten: je Vorschlag A, B, C eine Variante (Farben, Titel, Unterzeile, Lage der Geldscheine).
// Raster, Rufnummern, Teilnahmebedingungen und Gewinnerblock bleiben unverändert (src/lib/serie/variante.ts).
// Nur Rolle „Grafik“ (lokal: alle). modus 'scheine' = nur die Geldscheine einer Variante neu platzieren.

import { NextResponse } from 'next/server'
import { claudeJson, ClaudeFehler } from '@/lib/anthropic'
import { darfVarianten, mitRecht } from '@/lib/server/zugang'
import { ANZEIGE_BODY_H, ANZEIGE_W, farbenAbsichern, scheinAbsichern, scheinRechteck, STREUZONE, ueberdeckung, type Rechteck, type Schein, type Variante } from '@/lib/serie/variante'
import type { Vorschlag } from '@/lib/serie/types'

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
  /** true = Geldregen-Layouts mit Geldscheinen → Scheine mit platzieren */
  mitScheinen?: boolean
  /** Text-/Kachelflächen je Vorschlag (gemessen in der Vorschau, Anzeigen-Pixel) – dort keine Scheine */
  belegt?: Partial<Record<Vorschlag, Rechteck[]>>
  /** 'scheine' = nur Scheine für `basis` neu platzieren */
  modus?: 'alles' | 'scheine'
  basis?: Vorschlag
}

const SCHEIN_REGELN = `Geldscheine (50-, 100- und 200-Euro-Scheine als Fotos) platzierst du als Blickfang:
- Koordinaten in Anzeigen-Pixeln: Breite der Anzeige ${ANZEIGE_W}, Höhe des Gestaltungsbereichs ${ANZEIGE_BODY_H}; x/y = linke obere Ecke vor der Drehung.
- breite 140–320 px (Höhe = Breite × 0,56), drehung −30 bis 30 Grad, ebene 1–3 (3 liegt oben).
- 3 bis 7 Scheine, gemischte Werte, locker gestreut wie herabregnend; Scheine dürfen sich überlappen und am Rand angeschnitten sein (bis 40 % außerhalb).
- Bleibe in der angegebenen Streuzone und überdecke KEINE der angegebenen belegten Flächen (Titel, Frage, Geldpakete, Gewinner).`

function zoneText(v: Vorschlag, belegt?: Rechteck[]): string {
  const z = STREUZONE[v]
  const r = (x: Rechteck) => `[x ${Math.round(x.x)}, y ${Math.round(x.y)}, b ${Math.round(x.w)}, h ${Math.round(x.h)}]`
  return `Streuzone ${v}: ${r(z)}` + (belegt?.length ? `; belegt ${v}: ${belegt.slice(0, 14).map(r).join(' ')}` : '')
}

/** KI-Platzierung absichern: Werte begrenzen; liegt ein Schein auf Text, in der Streuzone den nächsten freien Platz suchen. */
function platzierungAbsichern(roh: unknown, v: Vorschlag, belegt: Rechteck[]): Schein[] {
  const liste = (Array.isArray(roh) ? roh : []).slice(0, 8).map((x) => scheinAbsichern(x as Partial<Schein>))
  const zone = STREUZONE[v]
  return liste.map((sc) => {
    const zuviel = (s: Schein) => belegt.some((b) => ueberdeckung(scheinRechteck(s), b) > 0.03)
    if (!zuviel(sc)) return sc
    let best: Schein | null = null
    let bestD = Infinity
    const h = sc.breite * 0.56
    for (let y = zone.y; y <= zone.y + zone.h - h * 0.6; y += 20) {
      for (let x = zone.x; x <= zone.x + zone.w - sc.breite * 0.6; x += 20) {
        const kand = { ...sc, x, y }
        if (zuviel(kand)) continue
        const d = (x - sc.x) ** 2 + (y - sc.y) ** 2
        if (d < bestD) { bestD = d; best = kand }
      }
    }
    return best ?? { ...sc, breite: Math.max(90, Math.round(sc.breite * 0.7)) }
  })
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
  const z = await mitRecht(request, 'lesen')
  if ('antwort' in z) return z.antwort
  if (!darfVarianten(z.benutzer)) return NextResponse.json({ fehler: 'Gestaltungsvarianten erzeugt nur die Grafik.' }, { status: 403 })
  let b: Anfrage
  try {
    b = (await request.json()) as Anfrage
  } catch {
    return NextResponse.json({ fehler: 'Body ist kein gültiges JSON.' }, { status: 400 })
  }
  if (!b.spielName || !b.hoechstgewinn) return NextResponse.json({ fehler: 'spielName und hoechstgewinn fehlen.' }, { status: 400 })

  if (b.modus === 'scheine') {
    const v: Vorschlag = b.basis === 'B' || b.basis === 'C' ? b.basis : 'A'
    try {
      const a = await claudeJson<{ scheine?: unknown[] }>({
        systemPrompt: `Du bist Art Director für Gewinnspielanzeigen. ${SCHEIN_REGELN}\nAntworte ausschließlich mit JSON: {"scheine":[{"wert":100,"x":0,"y":0,"breite":220,"drehung":-10,"ebene":1}]}`,
        nachrichten: [{ role: 'user', content: `Layout ${v}. ${zoneText(v, b.belegt?.[v])}. ${b.wunsch?.trim() ? 'Stimmung: ' + b.wunsch.trim().slice(0, 200) + '. ' : ''}Platziere die Scheine neu und anders als bisher.` }],
        maxTokens: 700,
        temperature: 1,
      })
      return NextResponse.json({ scheine: platzierungAbsichern(a.daten?.scheine, v, b.belegt?.[v] ?? []) })
    } catch (e) {
      const status = e instanceof ClaudeFehler ? e.status : 500
      return NextResponse.json({ fehler: e instanceof Error ? e.message : 'Unbekannter Fehler' }, { status })
    }
  }

  const auftrag =
    `Spiel: ${b.spielName}\nZeitraum: ${b.zeitraum}\nHöchstgewinn (exakt so schreiben): ${b.hoechstgewinn}\n` +
    (b.wunsch?.trim() ? `Wunsch der Redaktion: ${b.wunsch.trim().slice(0, 300)}\n` : '') +
    `Originale:\n` +
    (['A', 'B', 'C'] as const).map((v) => `${v}: ${b.original?.[v]?.stil ?? ''} – Titel „${b.original?.[v]?.titel ?? ''}“, Unterzeile „${b.original?.[v]?.unterzeile ?? ''}“`).join('\n') +
    (b.mitScheinen ? `\n\n${SCHEIN_REGELN}\n` + (['A', 'B', 'C'] as const).map((v) => zoneText(v, b.belegt?.[v])).join('\n') + '\nGib je Variante zusätzlich "scheine":[{"wert":100,"x":…,"y":…,"breite":…,"drehung":…,"ebene":1}] an.' : '')

  try {
    const a = await claudeJson<{ varianten?: Array<Partial<Variante>> }>({
      systemPrompt: SYSTEM,
      nachrichten: [{ role: 'user', content: auftrag }],
      maxTokens: b.mitScheinen ? 2200 : 1200,
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
        scheine: b.mitScheinen && Array.isArray((r as { scheine?: unknown }).scheine) ? platzierungAbsichern((r as { scheine?: unknown }).scheine, basis, b.belegt?.[basis] ?? []) : undefined,
      })
    })
    return NextResponse.json({ varianten, kostenUsd: a.kostenUsd })
  } catch (e) {
    const status = e instanceof ClaudeFehler ? e.status : 500
    return NextResponse.json({ fehler: e instanceof Error ? e.message : 'Unbekannter Fehler' }, { status })
  }
}
