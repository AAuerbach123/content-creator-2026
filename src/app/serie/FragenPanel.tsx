'use client'

import { useState } from 'react'
import HilfePopover from '@/components/HilfePopover'
import MikrofonKnopf from '@/components/MikrofonKnopf'
import { useSprache } from '@/components/SpracheProvider'
import type { SerieFrage } from '@/lib/serie/serie-ki'
import { dateiHerunterladen, kiFragenHolen } from '@/lib/serie/serie-client'
import { GRAU_TEXT, eingabe, gesperrt, hinweisGelb, hinweisRot, karte, kartenTitel, knopf, knopfPrimaer, label } from './stil'

// „Tagesfragen vorschlagen (KI)“ – nur für Spiele mit zwei Antworten. Ergebnis ist klar als KI-Vorschlag markiert;
// auf Wunsch wird es in die Vorschau (und die monday-Übertragung) übernommen. Nichts wird automatisch gespeichert.

export default function FragenPanel({
  spielId,
  zweiAntworten,
  mitBildern,
  monat,
  labels,
  fragen,
  setFragen,
  aktiv,
  setAktiv,
}: {
  spielId: string
  zweiAntworten: boolean
  mitBildern: boolean
  monat: string
  labels: string[]
  fragen: SerieFrage[] | null
  setFragen: (f: SerieFrage[] | null) => void
  aktiv: boolean
  setAktiv: (a: boolean) => void
}) {
  const { T } = useSprache()
  const [anzahl, setAnzahl] = useState(0)
  const [zusatz, setZusatz] = useState('')
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [verworfen, setVerworfen] = useState<string[]>([])

  const n = Math.max(1, Math.min(labels.length || 1, anzahl || labels.length || 1))

  const holen = async () => {
    setLaedt(true)
    setFehler(null)
    setVerworfen([])
    const d = await kiFragenHolen({ monat, anzahl: n, spielId, zusatz, labels: labels.slice(0, n) })
    setLaedt(false)
    if (!d.ok || !d.fragen) {
      setFehler(d.fehler || T('serieKiFehler'))
      return
    }
    setFragen(d.fragen)
    setVerworfen(d.verworfen ?? [])
    setAktiv(true)
  }

  return (
    <section style={karte}>
      <h2 style={kartenTitel}>
        {T('serieFragenTitel')}
        <HilfePopover
          de="Die KI schlägt für die Spieltage des Monats je eine Frage mit zwei Antworten vor (nur bei Spielen mit zwei Antworten). Das ist ein Vorschlag: Fakten und Eindeutigkeit bitte selbst prüfen, bevor etwas gedruckt wird. „In Vorschau verwenden“ legt die Fragen in Reihenfolge auf die Spieltage."
          en="The AI proposes one question with two answers per game day of the month (only for games with two answers). It is a proposal: check facts and unambiguity yourself before anything is printed. “Use in preview” maps the questions onto the game days in order."
          anker="serie-ki"
          ausrichtung="links"
        />
      </h2>
      {!zweiAntworten ? (
        <div style={{ fontSize: 13, color: GRAU_TEXT }}>{T('serieFragenNurZwei')}</div>
      ) : (
        <>
          {mitBildern && <div style={{ ...hinweisGelb, marginBottom: 8 }}>{T('serieFragenBilderHinweis')}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ width: 110 }}>
              <label style={label} htmlFor="fragen-anzahl">
                {T('serieFragenAnzahl')}
              </label>
              <input
                id="fragen-anzahl"
                type="number"
                min={1}
                max={labels.length || 1}
                value={n}
                onChange={(e) => setAnzahl(Number(e.target.value))}
                style={eingabe}
              />
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <label style={label} htmlFor="fragen-zusatz">
                {T('serieZusatz')}
              </label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input id="fragen-zusatz" value={zusatz} onChange={(e) => setZusatz(e.target.value)} placeholder={T('serieFragenZusatzPlatzhalter')} style={eingabe} />
                <MikrofonKnopf klein onText={(t) => setZusatz((z) => (z ? z + ' ' : '') + t)} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={holen} disabled={laedt} style={{ ...knopfPrimaer, ...(laedt ? gesperrt : {}) }}>
              ✦ {laedt ? T('serieKiLaedt') : T('serieFragenKnopf')}
            </button>
            {fragen && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} />
                  {T('serieFragenVerwenden')}
                </label>
                <button
                  type="button"
                  style={knopf}
                  onClick={() =>
                    dateiHerunterladen(new File([JSON.stringify({ monat, quelle: 'KI-Vorschlag – bitte Fakten prüfen', fragen }, null, 2)], `KI-Fragen_${spielId}_${monat}.json`, { type: 'application/json' }))
                  }
                >
                  {T('serieFragenJson')}
                </button>
                <button
                  type="button"
                  style={knopf}
                  onClick={() => {
                    setFragen(null)
                    setAktiv(false)
                  }}
                >
                  {T('serieVerwerfen')}
                </button>
              </>
            )}
          </div>
          {fehler && <div style={{ ...hinweisRot, marginTop: 8 }}>{fehler}</div>}
          {fragen && (
            <div style={{ marginTop: 10 }}>
              <div style={{ ...hinweisGelb, fontWeight: 700 }}>⚠ {T('serieKiFaktenPruefen')}</div>
              <ol style={{ margin: '8px 0 0', paddingLeft: 22, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {fragen.map((f, i) => (
                  <li key={i}>
                    <div style={{ color: GRAU_TEXT, fontSize: 11 }}>{labels[i] ?? ''}</div>
                    <div>{f.frage}</div>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ fontWeight: f.richtig === 1 ? 700 : 400, color: f.richtig === 1 ? '#1E8E3E' : undefined }}>1: {f.a1}</span>
                      {' · '}
                      <span style={{ fontWeight: f.richtig === 2 ? 700 : 400, color: f.richtig === 2 ? '#1E8E3E' : undefined }}>2: {f.a2}</span>
                    </div>
                  </li>
                ))}
              </ol>
              {verworfen.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: GRAU_TEXT }}>
                  {T('serieFragenVerworfen')} {verworfen.join(' · ')}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
