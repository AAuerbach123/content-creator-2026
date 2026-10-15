'use client'

// Meldet Konflikte („inzwischen von X geändert“) und Speicherfehler aus dem zentralen Speicher.
import { useEffect, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import { useIch } from './IchKontext'

type Konflikt = { wer?: string; am?: number }

export default function Statusleiste() {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const { ich, fehler: ichFehler } = useIch()
  const [konflikt, setKonflikt] = useState<Konflikt | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    const k = (e: Event) => setKonflikt(((e as CustomEvent).detail ?? {}) as Konflikt)
    const f = (e: Event) => setFehler(String((e as CustomEvent).detail ?? ''))
    window.addEventListener('cockpit:konflikt', k)
    window.addEventListener('cockpit:fehler', f)
    return () => {
      window.removeEventListener('cockpit:konflikt', k)
      window.removeEventListener('cockpit:fehler', f)
    }
  }, [])

  const speicherFehlt = ich?.speicher === 'fehlt'
  if (!konflikt && !fehler && !speicherFehlt && !ichFehler) return null

  return (
    <div className="cockpit-statusleiste" role="alert">
      {konflikt && (
        <div className="cockpit-hinweis gold">
          {de
            ? `${konflikt.wer ? konflikt.wer : 'Jemand anderes'} hat diese Daten ${konflikt.am ? 'um ' + new Date(konflikt.am).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' ' : ''}gerade geändert. Deine letzte Eingabe wurde nicht gespeichert.`
            : `${konflikt.wer ?? 'Someone else'} just changed this data. Your last input was not saved.`}
          <button type="button" className="cockpit-knopf primaer" style={{ marginLeft: 12, minHeight: 36 }} onClick={() => window.location.reload()}>
            {de ? 'Neu laden' : 'Reload'}
          </button>
        </div>
      )}
      {(fehler || speicherFehlt || ichFehler) && !konflikt && (
        <div className="cockpit-hinweis">
          <strong>{de ? 'Speichern nicht möglich: ' : 'Cannot save: '}</strong>
          {speicherFehlt
            ? (de ? 'Der zentrale Speicher ist online noch nicht eingerichtet. Bitte Andreas informieren („Cockpit-Server einrichten“).' : 'Central storage is not set up online yet.')
            : (ichFehler ?? fehler)}
          {fehler && (
            <button type="button" className="cockpit-knopf text" onClick={() => setFehler(null)} style={{ marginLeft: 8 }}>
              {de ? 'Ausblenden' : 'Dismiss'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
