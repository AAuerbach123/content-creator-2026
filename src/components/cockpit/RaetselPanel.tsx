'use client'

import { useMemo, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import type { Kampagne, Spieltag } from '@/lib/cockpit/typen'
import { spieltagSpeichern } from '@/lib/cockpit/daten-client'
import Feld from './Feld'
import Hinweis from './Hinweis'
import Karte from './Karte'
import LeererZustand from './LeererZustand'
import StatusChip from './StatusChip'
import { pruefRegelnFuer } from '@/lib/cockpit/raetsel-regeln'

type Props = {
  spielId: string
  kampagne?: Kampagne
  spieltage: Spieltag[]
  aktiverSpieltag?: string
  onAendern: (spieltagId: string) => void
  /** Sofort im Zustand übernehmen + im Hintergrund speichern (Spielseite) */
  onSpeichern?: (s: Spieltag) => void
}

export default function RaetselPanel({ spielId, kampagne, spieltage, aktiverSpieltag, onAendern, onSpeichern }: Props) {
  const { sprache } = useSprache()
  const [modus, setModus] = useState<'stapel' | 'tag'>('tag')
  const [laedt, setLaedt] = useState(false)

  const aktiv = useMemo(() => spieltage.find((s) => s.id === aktiverSpieltag) ?? spieltage[0], [spieltage, aktiverSpieltag])
  const regeln = pruefRegelnFuer(spielId)

  if (!kampagne) {
    return (
      <LeererZustand
        titel={sprache === 'de' ? 'Noch keine Kampagne' : 'No campaign yet'}
        text={sprache === 'de' ? 'Erst Phase 2 „Kampagne einstellen" abschließen.' : 'Complete phase 2 "Set up campaign" first.'}
      />
    )
  }
  if (!spieltage.length) {
    return (
      <LeererZustand
        titel={sprache === 'de' ? 'Noch keine Spieltage' : 'No game days yet'}
        text={sprache === 'de' ? 'Kampagne mit Spieltagen anlegen oder bestehende Daten übernehmen.' : 'Create a campaign with game days or import existing data.'}
      />
    )
  }

  const feldSetzen = async (feld: 'frage' | 'a1' | 'a2' | 'richtig' | 'loesung' | 'quelle', wert: string | number) => {
    if (!aktiv) return
    setLaedt(true)
    const neu: Spieltag = { ...aktiv, raetsel: { ...aktiv.raetsel, [feld]: wert }, aktualisiertAm: Date.now() }
    if (onSpeichern) { onSpeichern(neu); setLaedt(false); return }
    await spieltagSpeichern(neu)
    onAendern(neu.id)
    setLaedt(false)
  }

  const quelle = aktiv?.raetsel.quelle ?? ''
  const regelFehler = regeln.pruefe(aktiv, spieltage, kampagne, { quelle })

  return (
    <>
      <Karte titel={sprache === 'de' ? 'Rätsel erstellen' : 'Create puzzle'}>
        <Feld
          art="select"
          label={sprache === 'de' ? 'Modus' : 'Mode'}
          wert={modus}
          onAendern={(w) => setModus(w as 'stapel' | 'tag')}
          optionen={[
            { wert: 'tag', name: sprache === 'de' ? 'Täglich: nächster Spieltag' : 'Daily: next game day' },
            { wert: 'stapel', name: sprache === 'de' ? 'Stapel: ganze Kampagne' : 'Batch: whole campaign' },
          ]}
          hilfe={sprache === 'de'
            ? 'Stapel-Modus: KI erstellt Vorschläge für alle offenen Spieltage. Redaktion geht die Liste danach durch.'
            : 'Batch mode: AI proposes puzzles for all open game days; editorial reviews the list afterwards.'}
        />

        <Feld
          art="select"
          label={sprache === 'de' ? 'Spieltag' : 'Game day'}
          wert={aktiv?.id ?? ''}
          onAendern={(id) => onAendern(id)}
          optionen={spieltage.map((s) => ({ wert: s.id, name: `Tag ${s.nr} · ${s.datum}` }))}
        />

        {aktiv && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <StatusChip status={aktiv.status} sprache={sprache} />
              <span className="cockpit-speicherstand" aria-live="polite">
                {laedt ? (sprache === 'de' ? 'speichert …' : 'saving …') : (sprache === 'de' ? 'gespeichert · gerade eben' : 'saved · just now')}
              </span>
            </div>
            {kampagne.antwortformat === 'zwei-endziffer' ? (
              <>
                <Feld
                  art="textarea"
                  label={sprache === 'de' ? 'Frage' : 'Question'}
                  wert={aktiv.raetsel.frage ?? ''}
                  onAendern={(w) => feldSetzen('frage', w)}
                  pflicht
                />
                <Feld
                  art="text"
                  label={sprache === 'de' ? 'Antwort 1' : 'Answer 1'}
                  wert={aktiv.raetsel.a1 ?? ''}
                  onAendern={(w) => feldSetzen('a1', w)}
                  pflicht
                />
                <Feld
                  art="text"
                  label={sprache === 'de' ? 'Antwort 2' : 'Answer 2'}
                  wert={aktiv.raetsel.a2 ?? ''}
                  onAendern={(w) => feldSetzen('a2', w)}
                  pflicht
                />
                <Feld
                  art="select"
                  label={sprache === 'de' ? 'Richtige Antwort' : 'Correct answer'}
                  wert={String(aktiv.raetsel.richtig ?? 1)}
                  onAendern={(w) => feldSetzen('richtig', Number(w))}
                  optionen={[{ wert: '1', name: 'Antwort 1' }, { wert: '2', name: 'Antwort 2' }]}
                />
                {spielId === 'geldregen' && (
                  <Feld
                    art="text"
                    label={sprache === 'de' ? 'Quelle (Faktencheck – Pflicht)' : 'Source (fact check – required)'}
                    wert={quelle}
                    onAendern={(w) => feldSetzen('quelle', w)}
                    pflicht
                    hilfe={sprache === 'de'
                      ? 'Flowchart Seite 4: Fakt geprüft (Quelle)? Pflichtfeld, bevor der Spieltag freigegeben werden darf.'
                      : 'Flowchart page 4: fact checked (source)? Required before approval.'}
                  />
                )}
              </>
            ) : (
              <>
                <Feld
                  art="textarea"
                  label={sprache === 'de' ? 'Rätsel-Aufgabe' : 'Puzzle task'}
                  wert={aktiv.raetsel.frage ?? ''}
                  onAendern={(w) => feldSetzen('frage', w)}
                  pflicht
                />
                <Feld
                  art="text"
                  label={sprache === 'de' ? 'Lösungswort' : 'Solution word'}
                  wert={aktiv.raetsel.loesung ?? ''}
                  onAendern={(w) => feldSetzen('loesung', w)}
                  pflicht
                />
              </>
            )}
            {regelFehler.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <Hinweis art="rot" rolle="alert">
                  <strong>{sprache === 'de' ? 'Prüfung' : 'Checks'}:</strong>
                  <ul style={{ margin: '4px 0 0 16px' }}>
                    {regelFehler.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </Hinweis>
              </div>
            )}
          </>
        )}
      </Karte>
    </>
  )
}
