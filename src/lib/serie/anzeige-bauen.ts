// Anzeige als HTML bauen – ohne Browser-Abhängigkeiten (für Browser UND Server, z. B. PDF im Kundenportal).
// Gleiche Logik wie serie-client.anzeigeHtml (die nutzt diese Funktion).

import { seite, tagesdaten } from './generator'
import { htmlMaskieren } from './serie-ki'
import { spielSeite } from './spiele/rahmen'
import type { Inhalt, SpielDef } from './spiele/typen'
import type { GewinnerAnzahl, PfadFn, SerienDaten, Spieltag, Vorschlag, Zeitung } from './types'
import { varianteAnwenden, zeitungFuerVariante, type Variante } from './variante'

export type BauArgs = {
  daten: SerienDaten
  /** null = Geldregen (freigegebener Generator) */
  spiel: SpielDef | null
  z: Zeitung
  inhalt: Inhalt
  vorschlag: Vorschlag
  gewinner: GewinnerAnzahl
  monat: string
  pfad: PfadFn
  /** true = Frage/Antworten sind Benutzertext → für Geldregen HTML-maskieren */
  kiText?: boolean
  /** KI-Gestaltungsvariante (gilt nur, wenn variante.basis === vorschlag) */
  variante?: Variante | null
}

export function alsSpieltag(inh: Inhalt, maskieren: boolean): Spieltag {
  const m = (s: string) => (maskieren ? htmlMaskieren(s) : s)
  return {
    tag: inh.tag,
    datum: inh.datum,
    label: inh.label,
    frage: m(inh.frage || '[Frage folgt]'),
    a1: m(inh.a1 || '[Antwort 1]'),
    a2: m(inh.a2 || '[Antwort 2]'),
    richtig: inh.richtig ?? 1,
  }
}

export function anzeigeBauen(a: BauArgs): string {
  const z = zeitungFuerVariante(a.z, a.variante, a.vorschlag)
  let html: string
  if (!a.spiel) {
    const t = alsSpieltag(a.inhalt, !!a.kiText)
    html = seite(a.daten, z, tagesdaten(z, t, a.inhalt.gewinner, a.inhalt.einfuehrung), a.vorschlag, a.gewinner, a.monat, a.pfad)
  } else {
    html = spielSeite({ spiel: a.spiel, daten: a.daten, z, inhalt: a.inhalt, vorschlag: a.vorschlag, gewinner: a.gewinner, monat: a.monat, pfad: a.pfad })
  }
  return varianteAnwenden(html, a.variante, a.vorschlag)
}
