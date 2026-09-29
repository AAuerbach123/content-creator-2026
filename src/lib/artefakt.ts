// Hilfen zum Erzeugen und Aktualisieren von Artefakten (Kanal → Standard-Layout).

import { kanalById } from './kanaele'
import type { Artefakt, Ebene, Kanal, Job } from './types'

type Layout = {
  hintergrund: Partial<Ebene>
  headline: Partial<Ebene>
  subline: Partial<Ebene>
  cta: Partial<Ebene>
  logo?: Partial<Ebene>
}

// Kanal-abhängige Standard-Positionen (0..1 → relative Position aufs Artefakt).
function relativLayout(kanal: Kanal | undefined): Layout {
  const istHoch = kanal === 'ig-story' || kanal === 'ig-reel' || kanal === 'kurzvideo' || kanal === 'ig-feed'
  if (istHoch) {
    return {
      hintergrund: { x: 0, y: 0, breite: 1, hoehe: 1 },
      headline: { x: 0.06, y: 0.55, breite: 0.88, hoehe: 0.18 },
      subline: { x: 0.06, y: 0.74, breite: 0.88, hoehe: 0.1 },
      cta: { x: 0.35, y: 0.86, breite: 0.3, hoehe: 0.08 },
      logo: { x: 0.06, y: 0.07, breite: 0.25, hoehe: 0.05 },
    }
  }
  // Landscape / Print
  return {
    hintergrund: { x: 0, y: 0, breite: 0.5, hoehe: 1 },
    headline: { x: 0.52, y: 0.15, breite: 0.44, hoehe: 0.22 },
    subline: { x: 0.52, y: 0.4, breite: 0.44, hoehe: 0.1 },
    cta: { x: 0.52, y: 0.55, breite: 0.28, hoehe: 0.08 },
    logo: { x: 0.52, y: 0.78, breite: 0.35, hoehe: 0.14 },
  }
}

function ebene(id: string, typ: Ebene['typ'], name: string, box: Partial<Ebene>, breite: number, hoehe: number, extra: Ebene['eigenschaften'] = {}): Ebene {
  return {
    id,
    typ,
    name,
    x: (box.x ?? 0) * breite,
    y: (box.y ?? 0) * hoehe,
    breite: (box.breite ?? 1) * breite,
    hoehe: (box.hoehe ?? 1) * hoehe,
    eigenschaften: extra,
    sichtbar: true,
  }
}

export function neuesArtefakt(kanal: Kanal | undefined, richtungFarben?: string[]): Artefakt {
  const preset = kanalById(kanal)
  const breite = preset?.breite || 1080
  const hoehe = preset?.hoehe || 1350
  const einheit = preset?.einheit || 'px'
  const layout = relativLayout(kanal)
  const primaer = richtungFarben?.[0] || '#0b0b0f'
  const akzent = richtungFarben?.[1] || '#f5f5f7'
  const grund = richtungFarben?.[2] || '#e5e7eb'

  const ebenen: Ebene[] = [
    ebene('bg', 'bild', 'Hintergrund', layout.hintergrund, breite, hoehe, {
      fuellFarbe: grund,
      objectFit: 'cover',
      motiv: '',
    }),
    ebene('headline', 'text', 'Headline', layout.headline, breite, hoehe, {
      text: 'Headline',
      farbe: primaer,
      schriftgroesse: einheit === 'mm' ? 22 : Math.round(hoehe * 0.06),
      schriftgewicht: 900,
      schriftfamilie: 'Montserrat, sans-serif',
    }),
    ebene('subline', 'text', 'Subline', layout.subline, breite, hoehe, {
      text: 'Subline',
      farbe: primaer,
      schriftgroesse: einheit === 'mm' ? 10 : Math.round(hoehe * 0.028),
      schriftgewicht: 400,
      schriftfamilie: 'Lexend, sans-serif',
    }),
    ebene('cta', 'text', 'CTA', layout.cta, breite, hoehe, {
      text: 'Jetzt handeln',
      farbe: '#ffffff',
      hintergrund: akzent,
      schriftgroesse: einheit === 'mm' ? 12 : Math.round(hoehe * 0.03),
      schriftgewicht: 700,
      schriftfamilie: 'Montserrat, sans-serif',
      radius: 8,
    }),
  ]

  if (layout.logo) {
    ebenen.push(
      ebene('logo', 'logo', 'Logo', layout.logo, breite, hoehe, {
        platzhalter: true,
      }),
    )
  }

  return {
    id: crypto.randomUUID(),
    format: preset ? `${preset.labelDe} ${preset.breite}×${preset.hoehe} ${preset.einheit}` : `Job ${breite}×${hoehe}`,
    breite,
    hoehe,
    einheit,
    ebenen,
    assetRefs: [],
    kanal,
    erstelltAm: Date.now(),
  }
}

export function ebeneAktualisieren(artefakt: Artefakt, id: string, aenderung: Partial<Ebene>): Artefakt {
  return {
    ...artefakt,
    ebenen: artefakt.ebenen.map((e) => (e.id === id ? { ...e, ...aenderung, eigenschaften: { ...e.eigenschaften, ...(aenderung.eigenschaften || {}) } } : e)),
  }
}

export function ebenenEigenschaftSetzen(
  artefakt: Artefakt,
  id: string,
  eigenschaft: string,
  wert: unknown,
): Artefakt {
  return {
    ...artefakt,
    ebenen: artefakt.ebenen.map((e) =>
      e.id === id ? { ...e, eigenschaften: { ...e.eigenschaften, [eigenschaft]: wert } } : e,
    ),
  }
}

export function assetRefSicherstellen(artefakt: Artefakt, hash: string): Artefakt {
  if (artefakt.assetRefs.includes(hash)) return artefakt
  return { ...artefakt, assetRefs: [...artefakt.assetRefs, hash] }
}

export function jobArtefaktSetzen(job: Job, artefakt: Artefakt): Job {
  return { ...job, artefakte: job.artefakte.some((a) => a.id === artefakt.id) ? job.artefakte.map((a) => (a.id === artefakt.id ? artefakt : a)) : [...job.artefakte, artefakt] }
}
