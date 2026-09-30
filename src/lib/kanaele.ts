// Kanal-Wissen (LOOP Abschnitt 4). Diese Presets sind die Datenbasis für
// Artefakt-Formate, Safe-Zones und die System-Prompts von /api/dialog.

import type { Einheit, Kanal } from './types'

export type KanalPreset = {
  id: Kanal
  labelDe: string
  labelEn: string
  breite: number
  hoehe: number
  einheit: Einheit
  aufloesungDpi?: number
  safeZones?: { name: string; x: number; y: number; breite: number; hoehe: number }[]
  hinweiseDe: string[]
  hinweiseEn: string[]
  farbraum: 'CMYK' | 'RGB'
}

export const KANAL_PRESETS: KanalPreset[] = [
  {
    id: 'zeitung',
    labelDe: 'Zeitung (Print)',
    labelEn: 'Newspaper (Print)',
    breite: 200,
    hoehe: 140,
    einheit: 'mm',
    aufloesungDpi: 200,
    farbraum: 'CMYK',
    hinweiseDe: [
      'Anzeigenmaß in mm laut Verlagsspezifikation abfragen',
      'Anschnitt/Beschnitt nur wenn gefordert (üblich 3 mm)',
      'Effektive Bildauflösung ≥ 200 dpi, keine Schrift < 7 pt',
      'CMYK-tauglich denken (kein Neon-RGB, Tiefen begrenzen)',
      'Pflichtelement: „Anzeige"-Kennzeichnung',
    ],
    hinweiseEn: [
      'Ad dimensions in mm per publisher spec',
      'Bleed only when required (usually 3 mm)',
      'Image resolution ≥ 200 dpi, no text < 7 pt',
      'CMYK-safe (no neon RGB, limit shadow depth)',
      'Required label: "Advertisement"',
    ],
  },
  {
    id: 'zeitschrift',
    labelDe: 'Zeitschrift (Print)',
    labelEn: 'Magazine (Print)',
    breite: 210,
    hoehe: 297,
    einheit: 'mm',
    aufloesungDpi: 300,
    farbraum: 'CMYK',
    hinweiseDe: [
      '300 dpi, echter Beschnitt + Schnittmarken',
      'Feinere Typografie (Laufweite, Ligaturen)',
      'Glanzpapier verträgt sattere Farben',
      'PDF/X-Kompatibilität anstreben',
      'Platzierung (rechte/linke Seite, U2/U4) abfragen',
    ],
    hinweiseEn: [
      '300 dpi, real bleed + crop marks',
      'Refined typography (tracking, ligatures)',
      'Glossy paper handles richer colors',
      'Aim for PDF/X compatibility',
      'Ask for placement (right/left page, C2/C4)',
    ],
  },
  {
    id: 'web-banner-mrec',
    labelDe: 'Banner MRec 300×250',
    labelEn: 'Banner MRec 300×250',
    breite: 300,
    hoehe: 250,
    einheit: 'px',
    farbraum: 'RGB',
    hinweiseDe: ['Dateigewicht ≤ 150 KB, WebP/AVIF + JPG-Fallback', 'CTA klar, Kontrast WCAG AA'],
    hinweiseEn: ['File size ≤ 150 KB, WebP/AVIF + JPG fallback', 'Clear CTA, WCAG AA contrast'],
  },
  {
    id: 'web-banner-leaderboard',
    labelDe: 'Banner Leaderboard 728×90',
    labelEn: 'Banner Leaderboard 728×90',
    breite: 728,
    hoehe: 90,
    einheit: 'px',
    farbraum: 'RGB',
    hinweiseDe: ['Sehr schmal: Text minimal, Logo klein', 'Dateigewicht ≤ 150 KB'],
    hinweiseEn: ['Very narrow: minimal text, small logo', 'File size ≤ 150 KB'],
  },
  {
    id: 'web-banner-skyscraper',
    labelDe: 'Banner Skyscraper 160×600',
    labelEn: 'Banner Skyscraper 160×600',
    breite: 160,
    hoehe: 600,
    einheit: 'px',
    farbraum: 'RGB',
    hinweiseDe: ['Hochkant: vertikaler Aufbau', 'Dateigewicht ≤ 150 KB'],
    hinweiseEn: ['Vertical: stacked layout', 'File size ≤ 150 KB'],
  },
  {
    id: 'web-banner-billboard',
    labelDe: 'Banner Billboard 970×250',
    labelEn: 'Banner Billboard 970×250',
    breite: 970,
    hoehe: 250,
    einheit: 'px',
    farbraum: 'RGB',
    hinweiseDe: ['Prominente Fläche', 'Dateigewicht ≤ 200 KB'],
    hinweiseEn: ['Prominent placement', 'File size ≤ 200 KB'],
  },
  {
    id: 'web-content',
    labelDe: 'Web-Content-Bild',
    labelEn: 'Web Content Image',
    breite: 1600,
    hoehe: 900,
    einheit: 'px',
    farbraum: 'RGB',
    hinweiseDe: [
      'Responsive-Varianten (Desktop/Mobile)',
      'Alt-Text mitliefern (SEO/Barrierefreiheit)',
      'JPG/WebP; PNG nur bei Transparenz',
    ],
    hinweiseEn: [
      'Responsive variants (desktop/mobile)',
      'Provide alt text (SEO/accessibility)',
      'JPG/WebP; PNG only for transparency',
    ],
  },
  {
    id: 'ig-feed',
    labelDe: 'Instagram Feed 4:5',
    labelEn: 'Instagram Feed 4:5',
    breite: 1080,
    hoehe: 1350,
    einheit: 'px',
    farbraum: 'RGB',
    hinweiseDe: [
      'Alternative: 1080×1080 (1:1)',
      'Hook in den ersten Worten',
      'Wenig Text pro Kachel',
    ],
    hinweiseEn: [
      'Alternative: 1080×1080 (1:1)',
      'Hook in first words',
      'Minimal text per tile',
    ],
  },
  {
    id: 'ig-story',
    labelDe: 'Instagram Story',
    labelEn: 'Instagram Story',
    breite: 1080,
    hoehe: 1920,
    einheit: 'px',
    farbraum: 'RGB',
    safeZones: [
      { name: 'top-ui', x: 0, y: 0, breite: 1080, hoehe: 250 },
      { name: 'bottom-ui', x: 0, y: 1610, breite: 1080, hoehe: 310 },
    ],
    hinweiseDe: [
      'Safe-Zones oben (~250 px) und unten (~310 px) UI-frei',
      'Untertitel eingebrannt (stumm geschaut)',
    ],
    hinweiseEn: [
      'Safe zones top (~250 px) and bottom (~310 px) UI-free',
      'Burned-in subtitles (watched muted)',
    ],
  },
  {
    id: 'ig-reel',
    labelDe: 'Instagram Reel',
    labelEn: 'Instagram Reel',
    breite: 1080,
    hoehe: 1920,
    einheit: 'px',
    farbraum: 'RGB',
    safeZones: [
      { name: 'top-ui', x: 0, y: 0, breite: 1080, hoehe: 250 },
      { name: 'bottom-ui', x: 0, y: 1610, breite: 1080, hoehe: 310 },
    ],
    hinweiseDe: [
      '9:16, Hook in den ersten 3 Sekunden',
      'Untertitel eingebrannt',
      'Marken-Wiedererkennung (Logo, CI-Farben)',
    ],
    hinweiseEn: [
      '9:16, hook in first 3 seconds',
      'Burned-in subtitles',
      'Brand recognition (logo, CI colors)',
    ],
  },
  {
    id: 'fb-post',
    labelDe: 'Facebook Post',
    labelEn: 'Facebook Post',
    breite: 1200,
    hoehe: 630,
    einheit: 'px',
    farbraum: 'RGB',
    hinweiseDe: ['1200×630 = Standard-Open-Graph-Größe'],
    hinweiseEn: ['1200×630 = standard Open Graph size'],
  },
  {
    id: 'linkedin-post',
    labelDe: 'LinkedIn Post',
    labelEn: 'LinkedIn Post',
    breite: 1200,
    hoehe: 627,
    einheit: 'px',
    farbraum: 'RGB',
    hinweiseDe: ['Nüchterner Ton, B2B'],
    hinweiseEn: ['Sober tone, B2B'],
  },
  {
    id: 'x-post',
    labelDe: 'X Post',
    labelEn: 'X Post',
    breite: 1600,
    hoehe: 900,
    einheit: 'px',
    farbraum: 'RGB',
    hinweiseDe: ['16:9, kurze klare Botschaft'],
    hinweiseEn: ['16:9, short clear message'],
  },
  {
    id: 'kurzvideo',
    labelDe: 'Kurzvideo (bis 60 s)',
    labelEn: 'Short Video (up to 60 s)',
    breite: 1080,
    hoehe: 1920,
    einheit: 'px',
    farbraum: 'RGB',
    hinweiseDe: [
      'Storyboard zuerst: Hook (0–3 s) → Kern → CTA',
      'Formate 9:16 / 1:1 / 16:9 aus denselben Szenen',
      'Untertitel eingebrannt',
      'Voiceover Anneke (ElevenLabs), −16 LUFS, kein Hall',
    ],
    hinweiseEn: [
      'Storyboard first: hook (0–3 s) → core → CTA',
      'Formats 9:16 / 1:1 / 16:9 from same scenes',
      'Burned-in subtitles',
      'Voiceover Anneke (ElevenLabs), −16 LUFS, no reverb',
    ],
  },
]

export function kanalById(id: Kanal | undefined): KanalPreset | undefined {
  if (!id) return undefined
  return KANAL_PRESETS.find((p) => p.id === id)
}

export function kanalLabel(id: Kanal | undefined, sprache: 'de' | 'en'): string {
  const p = kanalById(id)
  if (!p) return id || ''
  return sprache === 'de' ? p.labelDe : p.labelEn
}
