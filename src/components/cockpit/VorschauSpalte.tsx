'use client'

// Live-Vorschau neben dem Formular (Vorschlag 3): jede Eingabe erscheint sofort in der echten Anzeige.
// Umschalter: Zeitung · Gewinner-Fassung (1 / 4) · Gestaltungsvorschlag (A / B / C).

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import AnzeigeVorschau, { type PruefStatus } from '@/app/serie/AnzeigeVorschau'
import { argsFuer, hoeheFuer, htmlFuer, inhaltFuer, kontextLaden, type AnzeigenKontext } from '@/lib/cockpit/anzeigen'
import type { Kampagne, Spieltag } from '@/lib/cockpit/typen'
import type { Inhalt } from '@/lib/serie/spiele/typen'
import type { GewinnerAnzahl, Vorschlag } from '@/lib/serie/types'

type Props = { kampagne: Kampagne; spieltag?: Spieltag }

export default function VorschauSpalte({ kampagne, spieltag }: Props) {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const monat = spieltag?.datum.slice(0, 7) ?? kampagne.monat.slice(0, 7)
  const [kontext, setKontext] = useState<AnzeigenKontext | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [zeitungId, setZeitungId] = useState('')
  const [vorschlag, setVorschlag] = useState<Vorschlag>((kampagne.vorlageAbc as Vorschlag) ?? 'A')
  const [gewinnerWahl, setGewinnerWahl] = useState<'auto' | GewinnerAnzahl>('auto')
  const [inhalt, setInhalt] = useState<Inhalt | null>(null)
  const [pruef, setPruef] = useState<PruefStatus>({ laedt: true, ergebnis: null })
  const lauf = useRef(0)

  useEffect(() => {
    kontextLaden(kampagne, monat)
      .then((k) => { setKontext(k); setZeitungId((alt) => (k.zeitungen.some((z) => z.id === alt) ? alt : k.zeitungen[0]?.id ?? '')) })
      .catch((e) => setFehler(e instanceof Error ? e.message : String(e)))
  }, [kampagne, monat])

  // Inhalt (inkl. Fotos als data:-URL) neu bauen, kurz nach der letzten Eingabe
  useEffect(() => {
    if (!kontext || !spieltag) return
    const nr = ++lauf.current
    const t = setTimeout(() => {
      void inhaltFuer(kontext, spieltag).then((i) => { if (nr === lauf.current) setInhalt(i) })
    }, 250)
    return () => clearTimeout(t)
  }, [kontext, spieltag])

  const z = kontext?.zeitungen.find((x) => x.id === zeitungId) ?? kontext?.zeitungen[0]
  const autoGewinner: GewinnerAnzahl = (spieltag?.gewinner.filter((g) => g.name.trim()).length ?? 0) >= 2 ? 4 : 1
  const gewinner: GewinnerAnzahl = gewinnerWahl === 'auto' ? autoGewinner : gewinnerWahl
  const html = useMemo(() => (kontext && z && inhalt ? htmlFuer(argsFuer(kontext, z, inhalt, vorschlag, gewinner, monat)) : ''), [kontext, z, inhalt, vorschlag, gewinner, monat])

  if (fehler) return <p role="alert">{fehler}</p>
  if (!spieltag) return null

  const e = pruef.ergebnis
  const ampel = pruef.laedt ? 'grau' : !e ? 'gelb' : !e.echt_ok ? 'rot' : e.warnungen.length ? 'gelb' : 'gruen'

  return (
    <aside className="cockpit-vorschau-spalte" aria-label={de ? 'Live-Vorschau der Anzeige' : 'Live ad preview'}>
      <div className="steuer">
        <div className="cockpit-feld" style={{ marginBottom: 0 }}>
          <label htmlFor="vs-zeitung">{de ? 'Zeitung' : 'Newspaper'}</label>
          <select id="vs-zeitung" value={z?.id ?? ''} onChange={(ev) => setZeitungId(ev.target.value)}>
            {kontext?.zeitungen.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <div className="segment" role="radiogroup" aria-label={de ? 'Gewinner-Fassung' : 'Winner version'}>
          {(['auto', 1, 4] as const).map((w) => (
            <button key={String(w)} type="button" role="radio" aria-checked={gewinnerWahl === w} className={gewinnerWahl === w ? 'an' : ''} onClick={() => setGewinnerWahl(w)}>
              {w === 'auto' ? (de ? 'Auto' : 'Auto') : `${w} ${de ? 'Gew.' : 'win.'}`}
            </button>
          ))}
        </div>
        <div className="segment" role="radiogroup" aria-label={de ? 'Gestaltungsvorschlag' : 'Design proposal'}>
          {(['A', 'B', 'C'] as Vorschlag[]).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={vorschlag === v} className={vorschlag === v ? 'an' : ''} onClick={() => setVorschlag(v)}>{v}</button>
          ))}
        </div>
      </div>
      {html && z ? (
        <AnzeigeVorschau html={html} hoehe={hoeheFuer(z)} titel={de ? 'Anzeigen-Vorschau' : 'Ad preview'} maxHoehe={720} onPruefung={setPruef} />
      ) : (
        <p style={{ color: 'var(--tm-grau)' }}>{de ? 'Vorschau wird erstellt …' : 'Building preview …'}</p>
      )}
      <p className={`cockpit-chip ${ampel}`} role="status" style={{ marginTop: 8 }}>
        {pruef.laedt
          ? (de ? 'prüfe …' : 'checking …')
          : !e ? (de ? 'kein Prüfergebnis' : 'no check result')
            : !e.echt_ok ? (de ? `Problem: ${e.warnungen.filter((w) => !w.startsWith('Platzhalter')).join(' · ')}` : 'Problem found')
              : e.warnungen.length ? (de ? `Hinweis: ${e.warnungen.join(' · ')}` : 'Notes found')
                : (de ? 'Diese Fassung passt ✓' : 'This version fits ✓')}
      </p>
      {inhalt?.muster && <p style={{ fontSize: 12, color: '#6B4A00' }}>{de ? 'Noch kein eigenes Rätsel – gezeigt wird das Muster aus der Präsentation (gelb).' : 'No puzzle yet – showing the sample from the presentation.'}</p>}
    </aside>
  )
}
