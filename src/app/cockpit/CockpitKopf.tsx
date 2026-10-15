'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import HandbuchKnopf from '@/components/HandbuchKnopf'
import SpracheUmschalter from '@/components/SpracheUmschalter'
import { ROLLEN_TEXT, useIch } from '@/components/cockpit/IchKontext'
import Glocke from '@/components/cockpit/Glocke'

export default function CockpitKopf() {
  const { T, sprache } = useSprache()
  const de = sprache === 'de'
  const { ich, darf } = useIch()
  const pfad = usePathname()
  const [mehr, setMehr] = useState(false)
  const [menue, setMenue] = useState(false)
  const mehrRef = useRef<HTMLDivElement | null>(null)
  const rolle = ich ? ROLLEN_TEXT[ich.benutzer.rolle]?.[sprache] ?? ich.benutzer.rolle : ''

  useEffect(() => {
    if (!mehr) return
    const zu = (e: MouseEvent) => { if (mehrRef.current && !mehrRef.current.contains(e.target as Node)) setMehr(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMehr(false) }
    document.addEventListener('mousedown', zu)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', zu); document.removeEventListener('keydown', esc) }
  }, [mehr])
  useEffect(() => { setMehr(false); setMenue(false) }, [pfad])

  const aktiv = (p: string) => (pfad?.startsWith(p) ? 'page' : undefined)

  return (
    <header className="cockpit-kopf" role="banner">
      <Link href="/cockpit" aria-label={T('cockpitStartLink')} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
        <img src="/telemedia-logo.png" alt="Telemedia" />
        <h1>Cockpit 2027</h1>
      </Link>
      <div className="cockpit-kopf-mobil">
        <Glocke />
        <button type="button" className="cockpit-knopf sekundaer" aria-expanded={menue} aria-controls="cockpit-nav" onClick={() => setMenue(!menue)}>
          {menue ? (de ? '✕ Schliessen' : '✕ Close') : (de ? '☰ Menü' : '☰ Menu')}
        </button>
      </div>
      <nav id="cockpit-nav" className={`cockpit-kopf-aktionen${menue ? ' offen' : ''}`} aria-label={T('cockpitNavLabel')}>
        <Link href="/cockpit" className="cockpit-knopf text" aria-current={pfad === '/cockpit' ? 'page' : undefined}>{de ? 'Heute' : 'Today'}</Link>
        <Link href="/cockpit/kalender" className="cockpit-knopf text" aria-current={aktiv('/cockpit/kalender')} data-tour="kalender">{de ? 'Kalender' : 'Calendar'}</Link>
        <Link href="/cockpit/portal" className="cockpit-knopf text" aria-current={aktiv('/cockpit/portal')} data-tour="portal">{de ? 'Kundenportal' : 'Client portal'}</Link>
        <Link href="/cockpit/auszahlungen" className="cockpit-knopf text" aria-current={aktiv('/cockpit/auszahlungen')}>{de ? 'Auszahlungen' : 'Payouts'}</Link>
        <div className="cockpit-mehr" ref={mehrRef} data-tour="mehr">
          <button type="button" className="cockpit-knopf text" aria-expanded={mehr} aria-haspopup="menu" onClick={() => setMehr(!mehr)}>{de ? 'Mehr ▾' : 'More ▾'}</button>
          {mehr && (
            <div className="menue" role="menu">
              <Link role="menuitem" href="/cockpit/zeitungen">{de ? 'Zeitungen & Rufnummern' : 'Newspapers & numbers'}</Link>
              <Link role="menuitem" href="/cockpit/monday">monday</Link>
              <Link role="menuitem" href="/cockpit/protokoll">{de ? 'Protokoll' : 'Log'}</Link>
              {darf('admin') && <Link role="menuitem" href="/cockpit/team">{de ? 'Team & Einstellungen' : 'Team & settings'}</Link>}
            </div>
          )}
        </div>
        <span data-tour="glocke" className="nur-breit"><Glocke /></span>
        <button type="button" className="cockpit-knopf text" data-tour="hilfe" onClick={() => window.dispatchEvent(new Event('cockpit:tour'))} aria-label={de ? 'Einführung starten' : 'Start tour'} title={de ? 'Einführung starten' : 'Start tour'}>?</button>
        <HandbuchKnopf anker="cockpit" />
        <SpracheUmschalter />
        {ich && (
          <span className="cockpit-ich" title={ich.benutzer.email}>
            <span aria-hidden className="punkt">{ich.benutzer.name.slice(0, 1).toUpperCase()}</span>
            <span>{ich.benutzer.name}<small>{rolle}</small></span>
          </span>
        )}
      </nav>
    </header>
  )
}
