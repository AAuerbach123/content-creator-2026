import { Composition } from 'remotion'
import type { Storyboard } from '@/lib/video-types'
import { VideoKomposition, videoAbmessungen } from './VideoKomposition'

const BEISPIEL_STORYBOARD: Storyboard = {
  seitenverhaeltnis: '9:16',
  szenen: [
    { id: 'a', typ: 'logo-einflug', dauerSekunden: 2, reihenfolge: 0, wooosch: true, hintergrundFarbe: '#0b0b0f' },
    { id: 'b', typ: 'text-reveal', dauerSekunden: 4, reihenfolge: 1, titel: 'Was heute wichtig ist', aufzaehlung: ['Punkt eins', 'Punkt zwei', 'Punkt drei'], hintergrundFarbe: '#0b0b0f', textFarbe: '#f5f5f7', akzentFarbe: '#60a5fa' },
    { id: 'c', typ: 'logo-outro', dauerSekunden: 2, reihenfolge: 2, abbinderText: 'Danke fürs Zuschauen.' },
  ],
  ziellaengeSekunden: 8,
}

const FPS = 30

export const RemotionRoot: React.FC = () => {
  const storyboard: Storyboard = BEISPIEL_STORYBOARD
  const dims = videoAbmessungen(storyboard.seitenverhaeltnis)
  const dauerFrames = Math.max(30, Math.round(storyboard.szenen.reduce((s, z) => s + z.dauerSekunden, 0) * FPS))
  return (
    <>
      <Composition
        id="Reel"
        component={VideoKomposition}
        durationInFrames={dauerFrames}
        fps={FPS}
        width={dims.breite}
        height={dims.hoehe}
        defaultProps={{ storyboard }}
      />
    </>
  )
}
