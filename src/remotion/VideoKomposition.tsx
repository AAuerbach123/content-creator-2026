// Video-Komposition, die alle Szenen-Templates zusammensetzt.
// Wird sowohl im Browser-Player als auch beim lokalen Remotion-Rendering
// verwendet. Assets erwarten wir als Web-Bilder / Audio (URLs oder Blob-URLs) —
// die Web-App wandelt Asset-Hashes vorher in URLs um.

import { AbsoluteFill, Audio, Img, Sequence, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import type { BildKenBurnsSzene, KarussellSwipeSzene, LogoEinflugSzene, LogoOutroSzene, Storyboard, Szene, TextRevealSzene, VoiceoverInfo, WortZeit } from '@/lib/video-types'

export const FPS = 30

// Der Browser-Player ersetzt Hashes vorher durch echte Blob-URLs mit dem
// Präfix `url:`. Der lokale CLI-Render setzt hier später ein staticFile()
// bzw. eigene Resolver-Kette ein — für jetzt: `asset://` als Fallback
// (rendert Platzhalter, bis CLI-Setup nachgereicht).
function quelle(hash?: string): string {
  if (!hash) return ''
  if (hash.startsWith('url:')) return hash.slice('url:'.length)
  if (hash.startsWith('http://') || hash.startsWith('https://') || hash.startsWith('blob:') || hash.startsWith('data:')) return hash
  return `asset://${hash}`
}

export function videoAbmessungen(sv: Storyboard['seitenverhaeltnis']): { breite: number; hoehe: number } {
  switch (sv) {
    case '1:1':
      return { breite: 1080, hoehe: 1080 }
    case '16:9':
      return { breite: 1920, hoehe: 1080 }
    case '9:16':
    default:
      return { breite: 1080, hoehe: 1920 }
  }
}

// Wortsequenz aus den ElevenLabs-Wortzeitstempeln: welche Wörter sind bis jetzt gesprochen?
function gesprocheneWoerter(wortzeiten: WortZeit[] | undefined, sekunden: number): number {
  if (!wortzeiten) return 0
  for (let i = wortzeiten.length - 1; i >= 0; i--) {
    if (wortzeiten[i].start <= sekunden) return i + 1
  }
  return 0
}

function LogoEinflug({ szene }: { szene: LogoEinflugSzene }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  // Sanft abbremsend: großer Zoom → 1.0 in dauerSekunden.
  // spring config: startet groß, bremst sanft ab; „mass" hoch für weiches Ausrollen.
  const progress = spring({
    frame,
    fps,
    durationInFrames: szene.dauerSekunden * fps,
    config: { mass: 1, damping: 24, stiffness: 60 },
  })
  const scale = 4 - progress * 3
  return (
    <AbsoluteFill style={{ background: szene.hintergrundFarbe || '#0b0b0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {szene.logoAssetHash && (
        <Img
          src={quelle(szene.logoAssetHash)}
          style={{ maxWidth: '55%', maxHeight: '55%', transform: `scale(${scale})`, transformOrigin: 'center', objectFit: 'contain' }}
        />
      )}
    </AbsoluteFill>
  )
}

function TextReveal({ szene, voiceover }: { szene: TextRevealSzene; voiceover?: VoiceoverInfo }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const sekunden = frame / fps
  const aufz = szene.aufzaehlung || []

  // Wenn wir Wortzeitstempel haben und die Liste ins Voiceover eingebettet ist,
  // richten wir die Einflüge nach den ersten N Wörtern jeder Aufzählung. Sonst
  // gleichmäßig auf die Szenendauer verteilen.
  const sichtbareAnzahl = (() => {
    if (voiceover?.wortzeiten && voiceover.wortzeiten.length) {
      const gesprochen = gesprocheneWoerter(voiceover.wortzeiten, sekunden)
      const per = Math.ceil(voiceover.wortzeiten.length / (aufz.length + 1))
      return Math.min(aufz.length, Math.floor(gesprochen / per))
    }
    const proBullet = szene.dauerSekunden / (aufz.length + 1)
    return Math.floor(sekunden / proBullet)
  })()

  return (
    <AbsoluteFill style={{ background: szene.hintergrundFarbe || '#0b0b0f', color: szene.textFarbe || '#f5f5f7', padding: '10%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ fontSize: 84, fontWeight: 900, marginBottom: 40, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{szene.titel}</div>
      {aufz.map((eintrag, idx) => {
        const zeigen = idx < sichtbareAnzahl
        const opacity = interpolate(sekunden, [
          idx * (szene.dauerSekunden / (aufz.length + 1)),
          idx * (szene.dauerSekunden / (aufz.length + 1)) + 0.3,
        ], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24, opacity: zeigen ? opacity : 0, transform: `translateY(${zeigen ? 0 : 40}px)`, transition: 'transform 0.3s' }}>
            <span style={{ color: szene.akzentFarbe || '#60a5fa', fontSize: 64, lineHeight: 1 }}>›</span>
            <span style={{ fontSize: 44, lineHeight: 1.25, fontWeight: 600 }}>{eintrag}</span>
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

function BildKenBurns({ szene }: { szene: BildKenBurnsSzene }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / (szene.dauerSekunden * fps)
  const zoom = interpolate(t, [0, 1], [szene.zoomStart || 1.05, szene.zoomEnde || 1.25], { extrapolateRight: 'clamp' })
  const richtung = szene.richtung || 'zentrum'
  const map: Record<string, { x: number; y: number }> = {
    'links-oben': { x: -5, y: -5 },
    'rechts-oben': { x: 5, y: -5 },
    'links-unten': { x: -5, y: 5 },
    'rechts-unten': { x: 5, y: 5 },
    zentrum: { x: 0, y: 0 },
  }
  const richtungXY = map[richtung]
  const tx = interpolate(t, [0, 1], [0, richtungXY.x], { extrapolateRight: 'clamp' })
  const ty = interpolate(t, [0, 1], [0, richtungXY.y], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      {szene.bildAssetHash && (
        <Img
          src={quelle(szene.bildAssetHash)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom}) translate(${tx}%, ${ty}%)` }}
        />
      )}
      {szene.overlayText && (
        <div style={{ position: 'absolute', bottom: '15%', left: '8%', right: '8%', color: '#fff', fontSize: 48, fontWeight: 800, textShadow: '0 2px 12px rgba(0,0,0,0.65)', lineHeight: 1.2 }}>
          {szene.overlayText}
        </div>
      )}
    </AbsoluteFill>
  )
}

function KarussellSwipe({ szene }: { szene: KarussellSwipeSzene }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const proBild = szene.dauerSekunden / Math.max(1, szene.bildAssetHashes.length)
  const idx = Math.min(szene.bildAssetHashes.length - 1, Math.floor(frame / fps / proBild))
  const naechster = Math.min(szene.bildAssetHashes.length - 1, idx + 1)
  const restFrames = (frame / fps - idx * proBild) / proBild
  const shift = interpolate(restFrames, [0.7, 1], [0, -100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', transform: `translateX(${shift}%)`, transition: 'transform 0.2s' }}>
        <Img src={quelle(szene.bildAssetHashes[idx])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <Img src={quelle(szene.bildAssetHashes[naechster])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {szene.textUeberlagerungen?.[idx] && (
        <div style={{ position: 'absolute', bottom: '15%', left: '8%', right: '8%', color: '#fff', fontSize: 48, fontWeight: 800, textShadow: '0 2px 12px rgba(0,0,0,0.65)' }}>
          {szene.textUeberlagerungen[idx]}
        </div>
      )}
    </AbsoluteFill>
  )
}

function LogoOutro({ szene }: { szene: LogoOutroSzene }) {
  return (
    <AbsoluteFill style={{ background: '#0b0b0f', color: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 30 }}>
      {szene.logoAssetHash && (
        <Img src={quelle(szene.logoAssetHash)} style={{ maxWidth: '45%', maxHeight: '35%', objectFit: 'contain' }} />
      )}
      {szene.abbinderText && (
        <div style={{ fontSize: 44, fontWeight: 600, textAlign: 'center', maxWidth: '75%' }}>{szene.abbinderText}</div>
      )}
    </AbsoluteFill>
  )
}

function SzeneRenderer({ szene, voiceover }: { szene: Szene; voiceover?: VoiceoverInfo }) {
  switch (szene.typ) {
    case 'logo-einflug':
      return <LogoEinflug szene={szene as LogoEinflugSzene} />
    case 'text-reveal':
      return <TextReveal szene={szene as TextRevealSzene} voiceover={voiceover} />
    case 'bild-ken-burns':
      return <BildKenBurns szene={szene as BildKenBurnsSzene} />
    case 'karussell-swipe':
      return <KarussellSwipe szene={szene as KarussellSwipeSzene} />
    case 'logo-outro':
      return <LogoOutro szene={szene as LogoOutroSzene} />
  }
}

function UntertitelSpur({ voiceover, seitenverhaeltnis }: { voiceover?: VoiceoverInfo; seitenverhaeltnis: Storyboard['seitenverhaeltnis'] }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  if (!voiceover?.wortzeiten || !voiceover.wortzeiten.length) return null
  const sekunden = frame / fps
  // Fenster: 6 Wörter vor + aktuelles + 2 nach — kompakter Live-Untertitel
  const idx = voiceover.wortzeiten.findIndex((w) => sekunden >= w.start && sekunden <= w.ende)
  const zeigenBis = idx >= 0 ? idx + 3 : voiceover.wortzeiten.findIndex((w) => w.start > sekunden)
  const zeigenAb = Math.max(0, (zeigenBis >= 0 ? zeigenBis : voiceover.wortzeiten.length) - 6)
  const text = voiceover.wortzeiten.slice(zeigenAb, zeigenBis >= 0 ? zeigenBis : voiceover.wortzeiten.length)
    .map((w) => w.wort)
    .join(' ')
  const bottom = seitenverhaeltnis === '9:16' ? 310 + 40 : 60
  return (
    <div style={{ position: 'absolute', bottom, left: '6%', right: '6%', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.72)', color: '#fff', fontSize: 40, fontWeight: 700, padding: '10px 20px', borderRadius: 10, letterSpacing: '-0.005em', lineHeight: 1.2 }}>
        {text}
      </div>
    </div>
  )
}

export const VideoKomposition: React.FC<{ storyboard: Storyboard }> = ({ storyboard }) => {
  const { fps } = useVideoConfig()
  let cursor = 0
  return (
    <AbsoluteFill>
      {storyboard.szenen.map((szene) => {
        const start = Math.round(cursor * fps)
        const dauer = Math.round(szene.dauerSekunden * fps)
        cursor += szene.dauerSekunden
        return (
          <Sequence key={szene.id} from={start} durationInFrames={dauer}>
            <SzeneRenderer szene={szene} voiceover={storyboard.voiceover} />
          </Sequence>
        )
      })}

      {storyboard.voiceover?.assetHash && (
        <Sequence from={Math.round((storyboard.szenen[0]?.dauerSekunden || 2) * fps + 0.3 * fps)}>
          <Audio src={quelle(storyboard.voiceover.assetHash)} />
        </Sequence>
      )}

      <UntertitelSpur voiceover={storyboard.voiceover} seitenverhaeltnis={storyboard.seitenverhaeltnis} />
    </AbsoluteFill>
  )
}
