// Remotion-Einstiegspunkt für den lokalen Renderer.
// Wird von `npx remotion render` bzw. dem Studio genutzt.
// Compositions werden zur Laufzeit aus dem exportierten Storyboard gebaut.

import { registerRoot } from 'remotion'
import { RemotionRoot } from './Root'

registerRoot(RemotionRoot)
