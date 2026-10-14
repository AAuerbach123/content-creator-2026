'use client'

import Link from 'next/link'
import { useSprache } from '@/components/SpracheProvider'
import HandbuchKnopf from '@/components/HandbuchKnopf'
import SpracheUmschalter from '@/components/SpracheUmschalter'
import RollenUmschalter, { useRolle } from '@/components/cockpit/RollenUmschalter'

export default function CockpitKopf() {
  const { T, sprache } = useSprache()
  const [rolle, setRolle] = useRolle()
  return (
    <header className="cockpit-kopf" role="banner">
      <Link href="/cockpit" aria-label={T('cockpitStartLink')} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
        <img src="/telemedia-logo.png" alt="Telemedia" />
        <h1>Cockpit 2027</h1>
      </Link>
      <nav className="cockpit-kopf-aktionen" aria-label={T('cockpitNavLabel')}>
        <RollenUmschalter rolle={rolle} onAendern={setRolle} sprache={sprache} />
        <SpracheUmschalter />
        <HandbuchKnopf />
        <Link href="/erweitert" className="cockpit-knopf text" aria-label={T('cockpitErweitert')}>
          {T('cockpitErweitert')}
        </Link>
      </nav>
    </header>
  )
}
