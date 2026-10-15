'use client'

// Einführungstour (Vorschlag 9): 6 kurze Schritte, startet beim ersten Besuch je Person automatisch,
// jederzeit über „?“ im Kopf. Hebt das jeweilige Element hervor; Esc beendet, Pfeiltasten blättern.

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import { dokLaden, dokSpeichern } from '@/lib/cockpit/daten-client'
import { useIch } from './IchKontext'

type Schritt = { ziel: string; titelDe: string; titelEn: string; textDe: string; textEn: string }

const SCHRITTE: Schritt[] = [
  { ziel: '[data-tour="heute"]', titelDe: 'Heute zu tun', titelEn: 'To do today', textDe: 'Jeden Morgen hier starten: Für jedes laufende Spiel steht der nächste Spieltag mit Ampel und Fristen. Klick auf einen offenen Punkt springt direkt an die Stelle.', textEn: 'Start here every morning: the next game day per running game with traffic light and deadlines. Click an open item to jump there.' },
  { ziel: '[data-tour="spiele"]', titelDe: 'Spiele', titelEn: 'Games', textDe: 'Jedes Spielkonzept hat einen eigenen Einstieg mit fünf Schritten: Vorlage, Kampagne, Rätsel, Gewinner, Prüfen und freigeben. Rechts siehst du immer die echte Anzeige.', textEn: 'Each game has five steps: template, campaign, puzzles, winners, check and approve. The real ad is always shown on the right.' },
  { ziel: '[data-tour="kalender"]', titelDe: 'Kalender', titelEn: 'Calendar', textDe: 'Alle Spieltage eines Monats auf einen Blick – grün fertig, gelb in Arbeit, rot Problem.', textEn: 'All game days of a month at a glance.' },
  { ziel: '[data-tour="portal"]', titelDe: 'Kundenportal', titelEn: 'Client portal', textDe: 'Hier bekommen die Verlage ihren Link. Du siehst, wer freigegeben oder eine Korrektur gemeldet hat, und kannst antworten.', textEn: 'Publishers get their link here. See who approved or requested corrections and reply.' },
  { ziel: '[data-tour="glocke"]', titelDe: 'Meldungen', titelEn: 'Notifications', textDe: 'Die Glocke meldet Kundenkorrekturen, Freigaben der Verlage und eingegangene Gewinnerfotos.', textEn: 'The bell reports client corrections, approvals and incoming winner photos.' },
  { ziel: '[data-tour="mehr"]', titelDe: 'Mehr', titelEn: 'More', textDe: 'Zeitungen & Rufnummern, monday-Abgleich, Protokoll und (für Admins) Team & Einstellungen. Das Handbuch daneben erklärt alles ausführlich.', textEn: 'Newspapers & numbers, monday sync, log and team settings. The manual explains everything in detail.' },
]

export default function Einfuehrungstour() {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const { ich } = useIch()
  const router = useRouter()
  const pfad = usePathname()
  const [schritt, setSchritt] = useState<number | null>(null)
  const [rahmen, setRahmen] = useState<DOMRect | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)

  const starten = useCallback(() => {
    if (pfad !== '/cockpit') { router.push('/cockpit?tour=1'); return }
    setSchritt(0)
  }, [pfad, router])

  // Auslöser: „?“ im Kopf, ?tour=1 in der Adresse, erster Besuch
  useEffect(() => {
    const h = () => starten()
    window.addEventListener('cockpit:tour', h)
    return () => window.removeEventListener('cockpit:tour', h)
  }, [starten])
  useEffect(() => {
    if (pfad !== '/cockpit') return
    if (new URLSearchParams(window.location.search).get('tour') === '1') { setSchritt(0); return }
    if (!ich) return
    let lokal = false
    try { lokal = Boolean(window.localStorage.getItem('cockpit:tour-gesehen')) } catch { /* egal */ }
    if (lokal) return
    dokLaden<{ tourGesehen?: boolean }>('benutzerEinstellung', ich.benutzer.email)
      .then((e) => { if (!e?.tourGesehen) setTimeout(() => setSchritt(0), 800) })
      .catch(() => undefined)
  }, [pfad, ich])

  const beenden = useCallback(() => {
    setSchritt(null)
    try { window.localStorage.setItem('cockpit:tour-gesehen', '1') } catch { /* egal */ }
    if (ich) void dokSpeichern('benutzerEinstellung', ich.benutzer.email, { tourGesehen: true }).catch(() => undefined)
  }, [ich])

  useLayoutEffect(() => {
    if (schritt === null) return
    const el = document.querySelector(SCHRITTE[schritt].ziel)
    if (!el) { setRahmen(null); return }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const messen = () => setRahmen(el.getBoundingClientRect())
    messen()
    const t = setTimeout(messen, 350)
    window.addEventListener('resize', messen)
    window.addEventListener('scroll', messen, true)
    boxRef.current?.focus()
    return () => { clearTimeout(t); window.removeEventListener('resize', messen); window.removeEventListener('scroll', messen, true) }
  }, [schritt])

  useEffect(() => {
    if (schritt === null) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') beenden()
      else if (e.key === 'ArrowRight') setSchritt((s) => (s !== null && s < SCHRITTE.length - 1 ? s + 1 : s))
      else if (e.key === 'ArrowLeft') setSchritt((s) => (s !== null && s > 0 ? s - 1 : s))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [schritt, beenden])

  if (schritt === null) return null
  const s = SCHRITTE[schritt]
  const r = rahmen
  const unten = r ? r.bottom + 12 : 120
  const links = r ? Math.min(Math.max(12, r.left), window.innerWidth - 372) : 24
  const platzUnten = r ? window.innerHeight - r.bottom > 220 : true

  return (
    <div className="cockpit-tour" role="presentation">
      {r && <div className="loch" style={{ left: r.left - 6, top: r.top - 6, width: r.width + 12, height: r.height + 12 }} />}
      <div
        ref={boxRef}
        className="box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-titel"
        tabIndex={-1}
        style={{ left: links, top: platzUnten ? unten : Math.max(12, (r?.top ?? 200) - 200) }}
      >
        <small>{schritt + 1} / {SCHRITTE.length}</small>
        <h2 id="tour-titel">{de ? s.titelDe : s.titelEn}</h2>
        <p>{de ? s.textDe : s.textEn}</p>
        <div className="knoepfe">
          <button type="button" className="cockpit-knopf text" onClick={beenden}>{de ? 'Beenden' : 'Close'}</button>
          {schritt > 0 && <button type="button" className="cockpit-knopf sekundaer" onClick={() => setSchritt(schritt - 1)}>{de ? 'Zurück' : 'Back'}</button>}
          {schritt < SCHRITTE.length - 1
            ? <button type="button" className="cockpit-knopf primaer" onClick={() => setSchritt(schritt + 1)}>{de ? 'Weiter' : 'Next'}</button>
            : <button type="button" className="cockpit-knopf primaer" onClick={beenden}>{de ? 'Los geht’s' : 'Let’s go'}</button>}
        </div>
      </div>
    </div>
  )
}
