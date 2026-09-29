// Datenmodell für Kurzvideo-Storyboards (Phase 5). Wird als Feld `videoStoryboard`
// am Job gespeichert (siehe types.ts).

export type SzeneTyp = 'logo-einflug' | 'text-reveal' | 'bild-ken-burns' | 'karussell-swipe' | 'logo-outro'

export type SzeneBasis = {
  id: string
  typ: SzeneTyp
  dauerSekunden: number
  reihenfolge: number
  untertitel?: string
}

export type LogoEinflugSzene = SzeneBasis & {
  typ: 'logo-einflug'
  logoAssetHash?: string
  wooosch: boolean
  hintergrundFarbe?: string
}

export type TextRevealSzene = SzeneBasis & {
  typ: 'text-reveal'
  titel: string
  aufzaehlung?: string[]
  hintergrundFarbe?: string
  textFarbe?: string
  akzentFarbe?: string
}

export type BildKenBurnsSzene = SzeneBasis & {
  typ: 'bild-ken-burns'
  bildAssetHash?: string
  zoomStart?: number
  zoomEnde?: number
  richtung?: 'links-oben' | 'rechts-oben' | 'links-unten' | 'rechts-unten' | 'zentrum'
  overlayText?: string
}

export type KarussellSwipeSzene = SzeneBasis & {
  typ: 'karussell-swipe'
  bildAssetHashes: string[]
  textUeberlagerungen?: string[]
}

export type LogoOutroSzene = SzeneBasis & {
  typ: 'logo-outro'
  logoAssetHash?: string
  abbinderText?: string
}

export type Szene =
  | LogoEinflugSzene
  | TextRevealSzene
  | BildKenBurnsSzene
  | KarussellSwipeSzene
  | LogoOutroSzene

export type StimmProbe = {
  id: string
  voiceId: string
  name: string
  geschlecht: 'weiblich' | 'maennlich'
  assetHash?: string // mp3 im Asset-Store
  text: string
}

export type WortZeit = {
  wort: string
  start: number // Sekunden ab Voiceover-Start
  ende: number
}

export type VoiceoverInfo = {
  voiceId: string
  voiceName: string
  text: string
  assetHash?: string // MP3
  dauerSekunden?: number
  wortzeiten?: WortZeit[]
}

export type Storyboard = {
  szenen: Szene[]
  seitenverhaeltnis: '9:16' | '1:1' | '16:9'
  voiceover?: VoiceoverInfo
  stimmproben?: StimmProbe[]
  gewaehlteStimme?: string // voiceId
  ziellaengeSekunden?: number
}

export const STANDARDANNEKE_ID = 'm1xJVQ4AuvhAWXoSQdeA'
export const STANDARDANNEKE_NAME = 'Anneke'
