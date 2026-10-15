'use client'

// Anzeigen direkt aus dem Cockpit erzeugen (Live-Vorschau, Gesamtprüfung, Kundenportal).
// Nutzt dieselben Generatoren wie der Serien-Modus (generator.ts für Geldregen, rahmen.ts für alle anderen).

import { anzeigeHtml, anzeigeHoehe, htmlPruefen, inhaltPruefen, serienDatenLaden, type SerienBasis, type VorschauArgs } from '../serie/serie-client'
import { gewinnerVarianten } from '../serie/generator'
import { htmlMaskieren } from '../serie/serie-ki'
import { spielFinden } from '../serie/spiele'
import type { Inhalt, SpielDef } from '../serie/spiele/typen'
import type { EchterGewinner, GewinnerAnzahl, Vorschlag, Zeitung } from '../serie/types'
import { assetAlsDataUrl } from './daten-client'
import { standardTeilnehmer } from '../serie/zeitungs-pool'
import type { Kampagne, Spieltag } from './typen'
import { datenMitStamm, einfuehrungLaden, stammLaden, type ZeitungenStamm } from './zeitungen-stamm'

let basisCache: Promise<SerienBasis> | null = null
const basisLaden = () => (basisCache ??= serienDatenLaden().catch((e) => { basisCache = null; throw e }))

export type AnzeigenKontext = {
  basis: SerienBasis
  spiel: SpielDef | null
  stamm?: ZeitungenStamm
  zeitungen: Zeitung[]
  einfuehrung?: { titel: string; text: string }
}

/** Basisdaten + Rufnummern/Teilnehmer des Spiels + Einführungstext für einen Monat. */
export async function kontextLaden(kampagne: Kampagne, monat: string): Promise<AnzeigenKontext> {
  const roh = await basisLaden()
  const stamm = await stammLaden(kampagne.spielId).catch(() => undefined)
  const basis: SerienBasis = stamm ? { ...roh, daten: datenMitStamm(roh.daten, stamm) } : roh
  const alle = basis.daten.zeitungen
  const ids = kampagne.verlage.length ? kampagne.verlage : stamm?.teilnehmer?.length ? stamm.teilnehmer : roh.standard ? standardTeilnehmer(kampagne.spielId, roh.standard) : null
  const zeitungen = ids ? alle.filter((z) => ids.includes(z.id)) : alle
  const ef = await einfuehrungLaden(kampagne.spielId, monat).catch(() => undefined)
  return {
    basis,
    spiel: kampagne.spielId === 'geldregen' ? null : spielFinden(kampagne.spielId) ?? null,
    stamm,
    zeitungen,
    einfuehrung: ef ? { titel: ef.titel, text: ef.text } : undefined,
  }
}

function label(datum: string): string {
  const d = new Date(datum + 'T12:00:00')
  const tag = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][d.getDay()]
  const monat = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][d.getMonth()]
  if (d.getDay() === 6) return `Samstag/Sonntag, ${d.getDate()}./${d.getDate() + 1}. ${monat}`
  return `${tag}, ${d.getDate()}. ${monat}`
}

/** Gewinner eines Spieltags für die Anzeige (nur mit Name + Einwilligung), Fotos als data:-URL. */
export async function echteGewinner(s: Spieltag): Promise<EchterGewinner[]> {
  const out: EchterGewinner[] = []
  for (const g of s.gewinner ?? []) {
    if (!g.name.trim() || !g.einwilligung) continue
    out.push({
      name: htmlMaskieren(g.name.trim()),
      ort: htmlMaskieren(g.ort.trim()),
      betrag: `${g.betrag.toLocaleString('de-DE')} €`,
      text: htmlMaskieren(g.gewinnertext.trim()),
      foto: g.fotoHash ? await assetAlsDataUrl(g.fotoHash) : undefined,
    })
  }
  return out
}

export async function inhaltFuer(kontext: AnzeigenKontext, s: Spieltag): Promise<Inhalt> {
  const r = s.raetsel ?? {}
  const gewinner = await echteGewinner(s)
  const inh: Inhalt = {
    tag: s.nr,
    datum: s.datum,
    label: label(s.datum),
    frage: r.frage ?? '',
    a1: r.a1,
    a2: r.a2,
    richtig: r.richtig,
    loesung: r.loesung,
    daten: r.daten,
    muster: false,
  }
  // Spiele ohne eigene Rätseldaten: Muster aus der Präsentation zeigen (gelb markiert, nicht druckfertig)
  if (kontext.spiel && !r.frage && !r.daten && !r.loesung) {
    const muster = kontext.spiel.musterInhalte(s.datum.slice(0, 7)).find((m) => m.tag === s.nr)
    if (muster) Object.assign(inh, { frage: muster.frage, daten: muster.daten, loesung: muster.loesung, jackpot: muster.jackpot, muster: true })
  }
  if (gewinner.length) inh.gewinner = gewinner
  if (s.nr === 1 && kontext.einfuehrung) inh.einfuehrung = kontext.einfuehrung
  return inh
}

export function argsFuer(kontext: AnzeigenKontext, z: Zeitung, inhalt: Inhalt, vorschlag: Vorschlag, gewinner: GewinnerAnzahl, monat: string): VorschauArgs {
  return { basis: kontext.basis, spiel: kontext.spiel, z, inhalt, vorschlag, gewinner, monat, kiText: true }
}

export function htmlFuer(a: VorschauArgs): string {
  return anzeigeHtml(a)
}

export const hoeheFuer = anzeigeHoehe

export type Problem = { zeitungId: string; zeitung: string; variante: string; text: string; art: 'fehler' | 'warnung' }

/** Prüft alle teilnehmenden Zeitungen × Gewinner-Varianten. Ruft fortschritt(fertig, gesamt) auf. */
export async function allePruefen(
  kontext: AnzeigenKontext,
  s: Spieltag,
  vorschlag: Vorschlag,
  fortschritt?: (fertig: number, gesamt: number) => void,
  abbrechen?: () => boolean,
): Promise<{ anzeigen: number; probleme: Problem[] }> {
  const monat = s.datum.slice(0, 7)
  const inhalt = await inhaltFuer(kontext, s)
  const varianten: GewinnerAnzahl[] = kontext.spiel ? [1, 4] : gewinnerVarianten(inhalt, [1, 4])
  const jobs = kontext.zeitungen.flatMap((z) => varianten.map((g) => ({ z, g })))
  const probleme: Problem[] = []
  let n = 0
  for (const { z, g } of jobs) {
    if (abbrechen?.()) break
    const a = argsFuer(kontext, z, inhalt, vorschlag, g, monat)
    const html = htmlFuer(a)
    const erg = await htmlPruefen(html, hoeheFuer(z))
    const variante = `${vorschlag} · ${g} ${g === 1 ? 'Gewinner' : 'Gewinner'}`
    if (!erg) probleme.push({ zeitungId: z.id, zeitung: z.name, variante, text: 'Prüfung lieferte kein Ergebnis (Zeitüberschreitung).', art: 'warnung' })
    else {
      for (const w of erg.warnungen) {
        const platzhalter = w.startsWith('Platzhalter')
        probleme.push({ zeitungId: z.id, zeitung: z.name, variante, text: w, art: platzhalter || erg.echt_ok ? 'warnung' : 'fehler' })
      }
    }
    const inh = inhaltPruefen(a, html)
    for (const f of inh.fehler) probleme.push({ zeitungId: z.id, zeitung: z.name, variante, text: f, art: 'fehler' })
    n++
    fortschritt?.(n, jobs.length)
  }
  return { anzeigen: n, probleme }
}

/** Fingerabdruck der druckrelevanten Inhalte – ändert sich etwas, muss neu geprüft werden. */
export function inhaltsStempel(s: Spieltag): string {
  const g = (s.gewinner ?? []).map((x) => [x.name, x.ort, x.betrag, x.gewinnertext, x.fotoHash, x.einwilligung])
  const json = JSON.stringify([s.raetsel, g])
  let h = 0
  for (let i = 0; i < json.length; i++) h = (Math.imul(31, h) + json.charCodeAt(i)) | 0
  return String(h >>> 0)
}
