'use client'

import { useState } from 'react'
import HilfePopover from '@/components/HilfePopover'
import { useSprache } from '@/components/SpracheProvider'
import { dateiHerunterladen, kannTeilen, mailDateienErzeugen, type MailDateien } from '@/lib/serie/serie-client'
import type { Zeitung } from '@/lib/serie/types'
import { GRAU_TEXT, gesperrt, hinweisGelb, hinweisRot, knopf, knopfPrimaer } from './stil'

// „Gestaltungsvorschlag per E-Mail senden“: erzeugt Anhänge aus der aktuellen Vorschau (PDF + PNG + HTML;
// kann der Browser kein Bild erzeugen: nur HTML) und öffnet über navigator.share das Mail-Programm.
// Fallback: Dateien herunterladen + mailto:-Entwurf („Bitte Datei anhängen“). Das Tool sendet NIE selbst.
// Zwei Schritte, weil navigator.share eine frische Nutzer-Geste braucht (nach dem Erzeugen wäre sie verbraucht).

export default function MailPanel({
  html,
  iframe,
  z,
  dateiname,
  beschreibung,
}: {
  html: string
  iframe: () => HTMLIFrameElement | null
  z: Zeitung
  dateiname: string
  /** z. B. „Fehlerjagd · Frankenpost · Vorschlag B · 1. Spieltag“ */
  beschreibung: string
}) {
  const { T } = useSprache()
  const [laedt, setLaedt] = useState(false)
  const [paket, setPaket] = useState<(MailDateien & { fuer: string }) | null>(null)
  const [meldung, setMeldung] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  const aktuell = paket && paket.fuer === html ? paket : null
  const betreff = `${T('serieMailBetreff')}: ${beschreibung}`
  const text = (anhaengen: boolean) =>
    [
      T('serieMailAnrede'),
      '',
      `${T('serieMailText')} ${beschreibung}.`,
      T('serieMailNurAnsicht'),
      ...(anhaengen ? ['', `${T('serieMailBitteAnhaengen')} ${(aktuell?.dateien ?? []).map((f) => f.name).join(', ')}`] : []),
    ].join('\n')

  const vorbereiten = async () => {
    setLaedt(true)
    setFehler(null)
    setMeldung(null)
    try {
      const p = await mailDateienErzeugen({ html, iframe: iframe(), z, name: dateiname, titel: betreff })
      setPaket({ ...p, fuer: html })
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaedt(false)
    }
  }

  const teilen = async () => {
    if (!aktuell) return
    setFehler(null)
    try {
      await navigator.share({ files: aktuell.dateien, title: betreff, text: text(false) })
      setMeldung(T('serieMailGeteilt'))
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setFehler(`${T('serieMailTeilenFehler')} ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const fallback = () => {
    if (!aktuell) return
    aktuell.dateien.forEach((f, i) => setTimeout(() => dateiHerunterladen(f), i * 400))
    const mailto = `mailto:?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text(true))}`
    setTimeout(() => {
      window.location.href = mailto
    }, aktuell.dateien.length * 400 + 200)
    setMeldung(T('serieMailHeruntergeladen'))
  }

  const teilenMoeglich = aktuell ? kannTeilen(aktuell.dateien) : false

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={vorbereiten} disabled={laedt} style={{ ...knopfPrimaer, ...(laedt ? gesperrt : {}) }}>
          ✉ {laedt ? T('serieMailLaedt') : T('serieMailKnopf')}
        </button>
        <HilfePopover
          de="Erzeugt aus der aktuellen Vorschau die Anhänge (PDF und PNG als Ansicht, dazu die Anzeige als HTML-Datei) und öffnet dein Mail-Programm über „Teilen“. Geht das im Browser nicht, werden die Dateien heruntergeladen und ein E-Mail-Entwurf geöffnet – dann die Dateien selbst anhängen. Das Tool verschickt nie selbst etwas."
          en="Creates the attachments from the current preview (PDF and PNG as a view, plus the ad as an HTML file) and opens your mail app via Share. If the browser cannot share files, the files are downloaded and an e-mail draft opens – attach the files yourself. The tool never sends anything itself."
          anker="serie-mail"
          ausrichtung="links"
        />
      </div>
      {aktuell && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: GRAU_TEXT }}>
            {T('serieMailBereit')} {aktuell.dateien.map((f) => `${f.name} (${Math.max(1, Math.round(f.size / 1024))} KB)`).join(' · ')}
          </div>
          {aktuell.nurHtml && (
            <div style={hinweisGelb}>
              {T('serieMailNurHtml')} {aktuell.hinweis ? `(${aktuell.hinweis})` : ''}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {teilenMoeglich && (
              <button type="button" onClick={teilen} style={knopfPrimaer}>
                {T('serieMailTeilen')}
              </button>
            )}
            <button type="button" onClick={fallback} style={knopf}>
              {T('serieMailFallback')}
            </button>
          </div>
          {!teilenMoeglich && <div style={{ fontSize: 12, color: GRAU_TEXT }}>{T('serieMailKeinTeilen')}</div>}
        </div>
      )}
      {meldung && <div style={{ marginTop: 6, fontSize: 12, color: '#1E8E3E' }}>{meldung}</div>}
      {fehler && <div style={{ ...hinweisRot, marginTop: 6 }}>{fehler}</div>}
    </div>
  )
}
