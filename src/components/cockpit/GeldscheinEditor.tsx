'use client'

// Geldscheine frei platzieren (nur Grafik). Die KI hat zuerst platziert – hier verschiebt der Grafiker
// mit der Maus (oder Pfeiltasten), ändert Größe, Drehung, Wert und Ebene, fügt Scheine hinzu oder löscht sie.
// Die Anzeige im Hintergrund wird ohne Scheine gezeigt, die Scheine liegen als bewegliche Bilder darüber.
// Liegt ein Schein auf Text (Titel, Frage, Geldpakete, Gewinner …), wird er rot markiert.

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import { ANZEIGE_W, scheinAbsichern, scheinRechteck, SCHEIN_VERHAELTNIS, ueberdeckung, type Rechteck, type Schein, type ScheinWert } from '@/lib/serie/variante'

type Props = {
  /** Anzeige ohne Geldscheine */
  html: string
  hoehe: number
  scheine: Schein[]
  original: Schein[]
  onFertig: (s: Schein[]) => void
  onAbbrechen: () => void
  /** KI platziert neu; bekommt die belegten Flächen */
  onKi?: (belegt: Rechteck[]) => Promise<Schein[] | null>
}

/** Text-/Kachelflächen der Anzeige messen (Anzeigen-Pixel). */
export function belegtMessen(f: HTMLIFrameElement | null): Rechteck[] {
  const d = f?.contentDocument
  if (!d) return []
  const body = d.querySelector('.body') as HTMLElement | null
  const o = body?.getBoundingClientRect()
  if (!o) return []
  return [...d.querySelectorAll('.body .blk')].map((el) => {
    const r = (el as HTMLElement).getBoundingClientRect()
    return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height }
  }).filter((r) => r.w > 20 && r.h > 10)
}

const bildUrl = (w: ScheinWert) => `/serie/assets/bn${w}o.jpg`

export default function GeldscheinEditor({ html, hoehe, scheine: start, original, onFertig, onAbbrechen, onKi }: Props) {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const [liste, setListe] = useState<Schein[]>(start.map((s) => scheinAbsichern(s)))
  const [aktiv, setAktiv] = useState<number | null>(start.length ? 0 : null)
  const [belegt, setBelegt] = useState<Rechteck[]>([])
  const [kiLaeuft, setKiLaeuft] = useState(false)
  const [meldung, setMeldung] = useState<string | null>(null)
  const huelle = useRef<HTMLDivElement>(null)
  const iframe = useRef<HTMLIFrameElement>(null)
  const [breite, setBreite] = useState(1000)
  const zug = useRef<{ i: number; sx: number; sy: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const el = huelle.current
    if (!el) return
    const ro = new ResizeObserver(() => setBreite(el.clientWidth))
    ro.observe(el)
    setBreite(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const s = Math.min(breite / ANZEIGE_W, 760 / hoehe)

  const messen = useCallback(() => {
    // Schrift/Bilder brauchen einen Moment
    setTimeout(() => setBelegt(belegtMessen(iframe.current)), 400)
  }, [])

  const aendern = (i: number, teil: Partial<Schein>) => setListe((l) => l.map((x, k) => (k === i ? scheinAbsichern({ ...x, ...teil }) : x)))

  const runter = (i: number) => (e: RPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setAktiv(i)
    zug.current = { i, sx: e.clientX, sy: e.clientY, ox: liste[i].x, oy: liste[i].y }
  }
  const bewegen = (e: RPointerEvent<HTMLDivElement>) => {
    const z = zug.current
    if (!z) return
    aendern(z.i, { x: z.ox + (e.clientX - z.sx) / s, y: z.oy + (e.clientY - z.sy) / s })
  }
  const hoch = () => { zug.current = null }

  const taste = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onAbbrechen(); return }
    if (aktiv === null) return
    const d = e.shiftKey ? 20 : 4
    const sc = liste[aktiv]
    if (!sc) return
    if (e.key === 'ArrowLeft') aendern(aktiv, { x: sc.x - d })
    else if (e.key === 'ArrowRight') aendern(aktiv, { x: sc.x + d })
    else if (e.key === 'ArrowUp') aendern(aktiv, { y: sc.y - d })
    else if (e.key === 'ArrowDown') aendern(aktiv, { y: sc.y + d })
    else if (e.key === 'Delete' || e.key === 'Backspace') { loeschen(); }
    else return
    e.preventDefault()
  }

  const hinzu = (wert: ScheinWert) => {
    const neu = scheinAbsichern({ wert, x: ANZEIGE_W / 2 - 110, y: 60, breite: 220, drehung: Math.round(Math.random() * 30 - 15), ebene: 3 })
    setListe((l) => [...l, neu])
    setAktiv(liste.length)
  }
  const loeschen = () => {
    if (aktiv === null) return
    setListe((l) => l.filter((_, k) => k !== aktiv))
    setAktiv(null)
  }
  const kopieren = () => {
    if (aktiv === null) return
    const sc = liste[aktiv]
    setListe((l) => [...l, scheinAbsichern({ ...sc, x: sc.x + 40, y: sc.y + 30 })])
    setAktiv(liste.length)
  }
  const ki = async () => {
    if (!onKi) return
    setKiLaeuft(true)
    setMeldung(null)
    try {
      const neu = await onKi(belegt)
      if (neu) { setListe(neu); setAktiv(neu.length ? 0 : null) }
    } catch (e) {
      setMeldung(String(e))
    } finally {
      setKiLaeuft(false)
    }
  }

  const konflikte = useMemo(() => liste.map((sc) => belegt.some((b) => ueberdeckung(scheinRechteck(sc), b) > 0.03)), [liste, belegt])
  const sc = aktiv !== null ? liste[aktiv] : null

  return (
    <div className="cockpit-dialog-hintergrund" role="presentation">
      <div className="cockpit-dialog cockpit-schein-dialog" role="dialog" aria-modal="true" aria-labelledby="schein-titel" tabIndex={-1} onKeyDown={taste}>
        <h2 id="schein-titel" style={{ margin: '0 0 4px', fontSize: 18 }}>{de ? 'Geldscheine platzieren' : 'Place banknotes'}</h2>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--tm-grau)' }}>
          {de
            ? 'Scheine mit der Maus verschieben, anklicken zum Bearbeiten. Pfeiltasten verschieben fein (mit Umschalt größer), Entf löscht. Rot = liegt auf Text.'
            : 'Drag notes with the mouse; click to edit. Arrow keys nudge, Delete removes. Red = covers text.'}
        </p>

        <div ref={huelle} style={{ width: '100%' }}>
          <div className="cockpit-schein-flaeche" style={{ width: ANZEIGE_W * s, height: hoehe * s }} onPointerMove={bewegen} onPointerUp={hoch} onPointerCancel={hoch} onPointerDown={(e) => { if (e.target === e.currentTarget) setAktiv(null) }}>
            <iframe
              ref={iframe}
              title={de ? 'Anzeige ohne Geldscheine' : 'Ad without notes'}
              srcDoc={html}
              onLoad={messen}
              tabIndex={-1}
              style={{ position: 'absolute', left: 0, top: 0, width: ANZEIGE_W, height: hoehe, border: 0, transform: `scale(${s})`, transformOrigin: '0 0', pointerEvents: 'none' }}
            />
            {liste.map((x, i) => (
              <div
                key={i}
                role="button"
                aria-label={`${x.wert} € ${de ? 'Schein' : 'note'} ${i + 1}`}
                aria-pressed={aktiv === i}
                className={`cockpit-schein${aktiv === i ? ' aktiv' : ''}${konflikte[i] ? ' konflikt' : ''}`}
                onPointerDown={runter(i)}
                style={{
                  left: x.x * s,
                  top: x.y * s,
                  width: x.breite * s,
                  height: x.breite * SCHEIN_VERHAELTNIS * s,
                  transform: `rotate(${x.drehung}deg)`,
                  zIndex: 10 + x.ebene,
                  backgroundImage: `url(${bildUrl(x.wert)})`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="cockpit-schein-leiste">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([50, 100, 200] as const).map((w) => (
              <button key={w} type="button" className="cockpit-knopf sekundaer" onClick={() => hinzu(w)}>+ {w} €</button>
            ))}
            {onKi && (
              <button type="button" className="cockpit-knopf sekundaer" disabled={kiLaeuft} onClick={() => void ki()}>
                {kiLaeuft ? (de ? 'KI platziert …' : 'AI placing …') : (de ? 'KI neu platzieren' : 'AI re-place')}
              </button>
            )}
            <button type="button" className="cockpit-knopf text" onClick={() => { setListe(original.map((o) => scheinAbsichern(o))); setAktiv(null) }}>{de ? 'Wie im Vorschlag' : 'As in proposal'}</button>
            <button type="button" className="cockpit-knopf text" onClick={() => { setListe([]); setAktiv(null) }}>{de ? 'Alle entfernen' : 'Remove all'}</button>
          </div>

          {sc && aktiv !== null ? (
            <div className="cockpit-schein-eigenschaften" aria-label={de ? 'Gewählter Schein' : 'Selected note'}>
              <label>{de ? 'Wert' : 'Value'}
                <select value={sc.wert} onChange={(e) => aendern(aktiv, { wert: Number(e.target.value) as ScheinWert })}>
                  <option value={50}>50 €</option><option value={100}>100 €</option><option value={200}>200 €</option>
                </select>
              </label>
              <label>{de ? 'Größe' : 'Size'} <span>{sc.breite} px</span>
                <input type="range" min={90} max={420} value={sc.breite} onChange={(e) => aendern(aktiv, { breite: Number(e.target.value) })} />
              </label>
              <label>{de ? 'Drehung' : 'Rotation'} <span>{sc.drehung}°</span>
                <input type="range" min={-45} max={45} value={sc.drehung} onChange={(e) => aendern(aktiv, { drehung: Number(e.target.value) })} />
              </label>
              <label>{de ? 'Ebene' : 'Layer'}
                <select value={sc.ebene} onChange={(e) => aendern(aktiv, { ebene: Number(e.target.value) as 1 | 2 | 3 })}>
                  <option value={1}>{de ? 'hinten' : 'back'}</option><option value={2}>{de ? 'Mitte' : 'middle'}</option><option value={3}>{de ? 'vorn' : 'front'}</option>
                </select>
              </label>
              <button type="button" className="cockpit-knopf text" onClick={kopieren}>{de ? 'Kopieren' : 'Duplicate'}</button>
              <button type="button" className="cockpit-knopf text" onClick={loeschen}>{de ? 'Löschen' : 'Delete'}</button>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--tm-grau)' }}>{de ? 'Schein anklicken, um Größe, Drehung und Wert zu ändern.' : 'Click a note to edit it.'}</p>
          )}
        </div>

        {konflikte.some(Boolean) && (
          <p role="status" style={{ margin: '8px 0 0', color: '#8B1A1A', fontSize: 13 }}>
            {de ? `${konflikte.filter(Boolean).length} Schein(e) liegen auf Text – bitte verschieben, sonst ist die Anzeige schlecht lesbar.` : 'Some notes cover text.'}
          </p>
        )}
        {meldung && <p role="alert" style={{ margin: '8px 0 0', fontSize: 13 }}>{meldung}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" className="cockpit-knopf sekundaer" onClick={onAbbrechen}>{de ? 'Abbrechen' : 'Cancel'}</button>
          <button type="button" className="cockpit-knopf primaer" onClick={() => onFertig(liste)}>{de ? 'Platzierung übernehmen' : 'Apply placement'}</button>
        </div>
      </div>
    </div>
  )
}
