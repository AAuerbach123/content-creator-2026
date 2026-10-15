import './cockpit.css'
import type { ReactNode } from 'react'
import CockpitKopf from './CockpitKopf'
import { IchAnbieter } from '@/components/cockpit/IchKontext'
import Statusleiste from '@/components/cockpit/Statusleiste'
import Einfuehrungstour from '@/components/cockpit/Einfuehrungstour'

export const metadata = {
  title: 'Cockpit 2027 · ContentCreator',
  description: 'Gemeinsames Arbeitswerkzeug von Telemedia für die Spielkonzepte 2027.',
}

export default function CockpitLayout({ children }: { children: ReactNode }) {
  return (
    <IchAnbieter>
      <div className="cockpit-root">
        <CockpitKopf />
        <Statusleiste />
        <main className="cockpit-inhalt" id="cockpit-inhalt">
          {children}
        </main>
        <Einfuehrungstour />
      </div>
    </IchAnbieter>
  )
}
