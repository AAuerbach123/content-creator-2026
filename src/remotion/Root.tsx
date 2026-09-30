import { Composition } from 'remotion'
import type { Storyboard } from '@/lib/video-types'
import { VideoKomposition, videoAbmessungen } from './VideoKomposition'

// Beispiel-Storyboard als Fallback, wenn Remotion Studio ohne Job gestartet wird
// bzw. wenn kein aktuellesStoryboard-Modul existiert.
const BEISPIEL_STORYBOARD: Storyboard = {
  seitenverhaeltnis: '9:16',
  szenen: [
    { id: 'a', typ: 'logo-einflug', dauerSekunden: 2, reihenfolge: 0, wooosch: true, hintergrundFarbe: '#0b0b0f' },
    {
      id: 'b',
      typ: 'text-reveal',
      dauerSekunden: 4,
      reihenfolge: 1,
      titel: 'Was heute wichtig ist',
      aufzaehlung: ['Punkt eins', 'Punkt zwei', 'Punkt drei'],
      hintergrundFarbe: '#0b0b0f',
      textFarbe: '#f5f5f7',
      akzentFarbe: '#60a5fa',
    },
    { id: 'c', typ: 'logo-outro', dauerSekunden: 2, reihenfolge: 2, abbinderText: 'Danke fürs Zuschauen.' },
  ],
  ziellaengeSekunden: 8,
}

const FPS = 30

// Die Composition „Reel" lässt Breite/Höhe/Dauer per calculateMetadata aus dem
// eingegebenen Storyboard bestimmen — so kann der Server denselben Entry-Point
// für 9:16, 1:1 und 16:9 verwenden.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Reel"
        component={VideoKomposition}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={240}
        defaultProps={{ storyboard: BEISPIEL_STORYBOARD }}
        calculateMetadata={({ props }) => {
          const sb = ((props as { storyboard?: Storyboard }).storyboard || BEISPIEL_STORYBOARD)
          const dims = videoAbmessungen(sb.seitenverhaeltnis)
          const dauerFrames = Math.max(30, Math.round(sb.szenen.reduce((s, z) => s + z.dauerSekunden, 0) * FPS))
          return {
            width: dims.breite,
            height: dims.hoehe,
            durationInFrames: dauerFrames,
            fps: FPS,
            props: { storyboard: sb },
          }
        }}
      />
    </>
  )
}
