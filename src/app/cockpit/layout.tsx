import './cockpit.css'
import type { ReactNode } from 'react'
import CockpitKopf from './CockpitKopf'

export const metadata = {
  title: 'Cockpit 2027 · ContentCreator',
  description: 'Einfaches Admin-Werkzeug für die Spielkonzepte 2027 (Jenny-tauglich).',
}

export default function CockpitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cockpit-root">
      <CockpitKopf />
      <main className="cockpit-inhalt" id="cockpit-inhalt">
        {children}
      </main>
    </div>
  )
}
