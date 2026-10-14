'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSprache } from '@/components/SpracheProvider'
import { cockpitVorlagenLaden, cockpitVorlageLoeschen } from '@/lib/db'
import type { CockpitVorlage } from '@/lib/cockpit/typen'
import VorlagePanel from '@/components/cockpit/VorlagePanel'
import LeererZustand from '@/components/cockpit/LeererZustand'

export default function BausteinVSeite() {
  const { T, sprache } = useSprache()
  const [vorlagen, setVorlagen] = useState<CockpitVorlage[]>([])
  const [aktiv, setAktiv] = useState<CockpitVorlage | undefined>(undefined)

  useEffect(() => { void laden() }, [])
  const laden = async () => {
    const liste = await cockpitVorlagenLaden()
    setVorlagen(liste)
    if (liste.length && !aktiv) setAktiv(liste[0])
  }

  const loeschen = async (id: string) => {
    await cockpitVorlageLoeschen(id)
    setAktiv(undefined)
    await laden()
  }

  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <Link href="/cockpit" className="cockpit-knopf text">← {T('cockpitZurueck')}</Link>
        <h2 style={{ margin: '4px 0 0', fontSize: 22 }}>{T('cockpitBausteinV')}</h2>
      </header>

      <div className="cockpit-zweispalt">
        <VorlagePanel
          vorlage={aktiv}
          onGespeichert={(v) => {
            setAktiv(v)
            void laden()
          }}
        />

        <section className="cockpit-karte">
          <h2 style={{ margin: '0 0 10px' }}>{sprache === 'de' ? 'Vorlagen-Bibliothek' : 'Template library'}</h2>
          {vorlagen.length === 0 ? (
            <LeererZustand
              titel={sprache === 'de' ? 'Noch keine Vorlagen' : 'No templates yet'}
              text={sprache === 'de' ? 'Links eine erste Vorlage anlegen.' : 'Create a first template on the left.'}
            />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              {vorlagen.map((v) => (
                <li key={v.id} style={{ border: '1px solid var(--tm-linie)', borderRadius: 8, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{v.name}</strong><br />
                    <span style={{ fontSize: 12, color: 'var(--tm-grau)' }}>
                      {v.quelle === 'abc' ? `Vorschlag ${v.abc}` : 'Import'} · {new Date(v.erstelltAm).toLocaleDateString('de-DE')}
                      {v.gesperrt && ' · gesperrt'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="cockpit-knopf sekundaer" style={{ minHeight: 32, padding: '4px 10px', fontSize: 13 }} onClick={() => setAktiv(v)}>
                      {sprache === 'de' ? 'Öffnen' : 'Open'}
                    </button>
                    <button type="button" className="cockpit-knopf text" onClick={() => loeschen(v.id)}>
                      {sprache === 'de' ? 'Entfernen' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
