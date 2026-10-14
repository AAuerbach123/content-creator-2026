'use client'

import { useState } from 'react'
import HilfePopover from '@/components/HilfePopover'
import { useSprache } from '@/components/SpracheProvider'
import type { MondayAntwort, MondaySpieltag } from '@/lib/serie/monday-typen'
import { mondayAufrufen } from '@/lib/serie/serie-client'
import { GRAU_TEXT, eingabe, gesperrt, hinweisGelb, hinweisRot, karte, kartenTitel, knopf, knopfPrimaer, label } from './stil'

// monday.com-Schnittstelle: Spieltage als Items in ein Board übertragen (Server-Route /api/monday, Token nur
// als Umgebungsvariable MONDAY_API_TOKEN). Testmodus standardmäßig AN: nur privates Board, nur Text/Datum/Zahl,
// keine Personen, keine Updates, keine Benachrichtigungen.

type DateiArgs = { spielId: string; ordner: string; monat: string; vorschlag: string; gewinner: number; tage: number[] }
type DateiErgebnis = { tag: number; v?: string; ok: boolean; item?: string; hoch?: number; uebersprungen?: number; probleme?: string[]; fehler?: string }

export default function MondayPanel({ spieltage, muster, dateien }: { spieltage: MondaySpieltag[]; muster: boolean; dateien?: DateiArgs }) {
  const { T } = useSprache()
  const [boardId, setBoardId] = useState('')
  const [testmodus, setTestmodus] = useState(true)
  const [laedt, setLaedt] = useState<'spalten' | 'uebertragen' | null>(null)
  const [antwort, setAntwort] = useState<MondayAntwort | null>(null)

  const idOk = /^\d{5,20}$/.test(boardId.trim())
  const [upload, setUpload] = useState<{ laeuft: boolean; ergebnisse: DateiErgebnis[] } | null>(null)

  // Anzeigen-PDFs Spieltag für Spieltag in die Datei-Spalten hochladen (/api/monday-dateien, nur lokal auf dem Mac)
  const pdfsHochladen = async (alleDrei: boolean) => {
    if (!idOk || !dateien) return
    const vorschlaege = alleDrei ? ['A', 'B', 'C'] : [dateien.vorschlag]
    if (!window.confirm(`${T('serieMondayPdfBestaetigen')} ${dateien.tage.length} × ${vorschlaege.join(', ')}`)) return
    const ergebnisse: DateiErgebnis[] = []
    setUpload({ laeuft: true, ergebnisse })
    const auftraege = vorschlaege.flatMap((v) => dateien.tage.map((tag) => ({ v, tag })))
    for (const { v, tag } of auftraege) {
      try {
        const r = await fetch('/api/monday-dateien', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ boardId: boardId.trim(), spiel: dateien.spielId, ordner: dateien.ordner, monat: dateien.monat, vorschlag: v, gewinner: dateien.gewinner, tag, testmodus }),
        })
        const d = (await r.json()) as Omit<DateiErgebnis, 'tag'>
        ergebnisse.push({ tag, v, ...d })
      } catch (e) {
        ergebnisse.push({ tag, v, ok: false, fehler: e instanceof Error ? e.message : String(e) })
      }
      setUpload({ laeuft: true, ergebnisse: [...ergebnisse] })
      if (ergebnisse.length >= 2 && ergebnisse.every((x) => !x.ok && !x.hoch)) break // grundsätzliches Problem → abbrechen
    }
    setUpload({ laeuft: false, ergebnisse: [...ergebnisse] })
  }

  const los = async (aktion: 'spalten' | 'uebertragen') => {
    if (!idOk) return
    if (aktion === 'uebertragen') {
      const frage = `${T('serieMondayBestaetigen')} ${spieltage.length}${muster ? '\n\n' + T('serieMondayMusterWarnung') : ''}`
      if (!window.confirm(frage)) return
    }
    setLaedt(aktion)
    setAntwort(null)
    const a = await mondayAufrufen({ aktion, boardId: boardId.trim(), testmodus, spieltage: aktion === 'uebertragen' ? spieltage : undefined })
    setAntwort(a)
    setLaedt(null)
  }

  const felder: [string, string][] = [
    ['datum', T('serieMondayFeldDatum')],
    ['frage', T('serieMondayFeldFrage')],
    ['a1', T('serieMondayFeldA1')],
    ['a2', T('serieMondayFeldA2')],
    ['richtig', T('serieMondayFeldRichtig')],
    ['dateiname', T('serieMondayFeldDatei')],
  ]

  return (
    <section style={karte}>
      <h2 style={kartenTitel}>
        {T('serieMondayTitel')}
        <HilfePopover
          de="Legt je Spieltag ein Item im angegebenen monday-Board an (Name „Spieltag NN“, Datum, Frage, Antworten, richtige Antwort, Dateiname). Die Spalten werden über ihre Titel gefunden (z. B. „Datum“, „Frage“, „Antwort 1“, „Antwort 2“, „Richtige Antwort“, „Dateiname“). Testmodus: nur private Boards, keine Personen, keine Updates, keine Benachrichtigungen. Der Schlüssel MONDAY_API_TOKEN liegt nur auf dem Server."
          en="Creates one item per game day in the given monday board (name “Spieltag NN”, date, question, answers, correct answer, file name). Columns are matched by their titles (e.g. “Datum”, “Frage”, “Antwort 1”, “Antwort 2”, “Richtige Antwort”, “Dateiname”). Test mode: private boards only, no people, no updates, no notifications. The MONDAY_API_TOKEN key lives on the server only."
          anker="serie-monday"
          ausrichtung="links"
        />
      </h2>
      <label style={label} htmlFor="monday-board">
        {T('serieMondayBoard')}
      </label>
      <input
        id="monday-board"
        inputMode="numeric"
        value={boardId}
        onChange={(e) => setBoardId(e.target.value.replace(/[^\d]/g, ''))}
        placeholder={T('serieMondayBoardPlatzhalter')}
        style={eingabe}
      />
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, fontSize: 13 }}>
        <input type="checkbox" checked={testmodus} onChange={(e) => setTestmodus(e.target.checked)} style={{ marginTop: 2 }} />
        <span>{T('serieMondayTestmodus')}</span>
      </label>
      {!testmodus && <div style={{ ...hinweisGelb, marginTop: 6 }}>{T('serieMondayTestmodusAus')}</div>}
      <div style={{ fontSize: 12, color: GRAU_TEXT, marginTop: 8 }}>
        {T('serieMondayAnzahl')} {spieltage.length}
      </div>
      {muster && <div style={{ ...hinweisGelb, marginTop: 6 }}>{T('serieMondayMusterWarnung')}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <button type="button" onClick={() => los('spalten')} disabled={!idOk || !!laedt} style={{ ...knopf, ...(!idOk || laedt ? gesperrt : {}) }}>
          {laedt === 'spalten' ? T('serieLaedt') : T('serieMondaySpalten')}
        </button>
        <button
          type="button"
          onClick={() => los('uebertragen')}
          disabled={!idOk || !!laedt || !spieltage.length}
          style={{ ...knopfPrimaer, ...(!idOk || laedt || !spieltage.length ? gesperrt : {}) }}
        >
          {laedt === 'uebertragen' ? T('serieLaedt') : T('serieMondayUebertragen')}
        </button>
      </div>
      {antwort && !antwort.ok && antwort.fehler && <div style={{ ...hinweisRot, marginTop: 10 }}>{antwort.fehler}</div>}
      {antwort?.board && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          <div>
            <b>{antwort.board.name}</b> · {antwort.board.art} · {antwort.testmodus ? T('serieMondayTestmodusKurz') : T('serieMondayVollmodusKurz')}
          </div>
          <table style={{ borderCollapse: 'collapse', marginTop: 6, width: '100%' }}>
            <tbody>
              {felder.map(([f, name]) => {
                const s = antwort.zuordnung?.[f]
                return (
                  <tr key={f}>
                    <td style={{ padding: '2px 8px 2px 0', color: GRAU_TEXT }}>{name}</td>
                    <td style={{ padding: '2px 0', color: s ? '#1E8E3E' : '#9E0B22' }}>{s ? `→ ${s.title} (${s.type})` : T('serieMondayNichtGefunden')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!!antwort.ignoriert?.length && (
            <div style={{ marginTop: 6, color: GRAU_TEXT }}>
              {T('serieMondayIgnoriert')} {antwort.ignoriert.map((i) => `${i.title} (${i.grund})`).join(' · ')}
            </div>
          )}
          {antwort.angelegt && (
            <div style={{ marginTop: 6, color: '#1E8E3E' }}>
              {T('serieMondayAngelegt')} {antwort.angelegt.length}
            </div>
          )}
          {!!antwort.fehlerListe?.length && (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#9E0B22' }}>
              {antwort.fehlerListe.map((f, i) => (
                <li key={i}>
                  {f.name}: {f.fehler}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {dateien && (
        <div style={{ marginTop: 14, borderTop: '1px solid #ECEDF1', paddingTop: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{T('serieMondayPdfTitel')}</div>
          <div style={{ fontSize: 12, color: GRAU_TEXT, marginTop: 4 }}>
            {T('serieMondayPdfHinweis')} {T('serieVorschlag')} {dateien.vorschlag} · {dateien.gewinner} {T('serieGewinnerKurz')} · {dateien.tage.length} {T('serieSpieltage')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <button type="button" onClick={() => pdfsHochladen(true)} disabled={!idOk || !!upload?.laeuft} style={{ ...knopfPrimaer, ...(!idOk || upload?.laeuft ? gesperrt : {}) }}>
              {upload?.laeuft ? `${T('serieLaedt')} ${upload.ergebnisse.length}` : T('serieMondayPdfAlle')}
            </button>
            <button type="button" onClick={() => pdfsHochladen(false)} disabled={!idOk || !!upload?.laeuft} style={{ ...knopf, ...(!idOk || upload?.laeuft ? gesperrt : {}) }}>
              {T('serieMondayPdfKnopf')} ({T('serieVorschlag')} {dateien.vorschlag})
            </button>
          </div>
          {upload && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <div style={{ color: '#1E8E3E' }}>
                {T('serieMondayPdfHoch')} {upload.ergebnisse.reduce((a, e) => a + (e.hoch ?? 0), 0)} · {T('serieMondayPdfUebersprungen')} {upload.ergebnisse.reduce((a, e) => a + (e.uebersprungen ?? 0), 0)}
              </div>
              {upload.ergebnisse.filter((e) => !e.ok).map((e) => (
                <div key={`${e.v}-${e.tag}`} style={{ color: '#9E0B22' }}>
                  {e.v} · {e.tag}: {e.fehler || (e.probleme ?? []).slice(0, 2).join(' · ')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
