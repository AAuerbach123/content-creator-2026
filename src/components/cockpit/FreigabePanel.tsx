'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import type { Kampagne, Spieltag } from '@/lib/cockpit/typen'
import { spieltagSpeichern } from '@/lib/db'
import { useRolle } from './RollenUmschalter'
import { pruefRegelnFuer } from '@/lib/cockpit/raetsel-regeln'
import Feld from './Feld'
import Hinweis from './Hinweis'
import Karte from './Karte'
import LeererZustand from './LeererZustand'
import StatusChip from './StatusChip'

type Props = {
  spielId: string
  kampagne?: Kampagne
  spieltag?: Spieltag
  onAendern: () => void
}

export default function FreigabePanel({ spielId, kampagne, spieltag, onAendern }: Props) {
  const { sprache } = useSprache()
  const [rolle] = useRolle()
  const [kommentar, setKommentar] = useState('')
  const [laedt, setLaedt] = useState(false)
  const [melder, setMelder] = useState<string | null>(null)
  const regeln = useMemo(() => pruefRegelnFuer(spielId), [spielId])

  useEffect(() => {
    // Cmd/Ctrl+Enter als Shortcut für „Prüfen und freigeben"
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        void freigeben()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spieltag, kampagne])

  if (!kampagne || !spieltag) {
    return (
      <LeererZustand
        titel={sprache === 'de' ? 'Nichts zu prüfen' : 'Nothing to review'}
        text={sprache === 'de' ? 'Erst Kampagne + Spieltage anlegen.' : 'Create a campaign and game days first.'}
      />
    )
  }

  const prueffehler = (() => {
    const fehler = regeln.pruefe(spieltag, [], kampagne, { quelle: '' })
    // Gewinner-Prüfungen
    if (spieltag.nr > 1) {
      if (spieltag.gewinner.length === 0) fehler.push(sprache === 'de' ? 'Für diesen Spieltag sind noch keine Gewinner erfasst.' : 'No winners for this day yet.')
      for (const g of spieltag.gewinner) {
        if (!g.name.trim()) fehler.push(`Gewinner ohne Namen (ID ${g.id.slice(0, 6)}).`)
        if (!g.einwilligung) fehler.push(sprache === 'de' ? `Einwilligung von ${g.name || 'Gewinner'} fehlt.` : `Consent for ${g.name || 'winner'} missing.`)
        const max = spieltag.gewinner.length >= 2 ? 45 : 90
        if (g.gewinnertext.length > max) fehler.push(sprache === 'de' ? `Gewinnertext zu lang (${g.gewinnertext.length}/${max}).` : `Winner text too long (${g.gewinnertext.length}/${max}).`)
      }
    }
    return fehler
  })()

  const freigeben = async () => {
    if (prueffehler.length > 0) return
    setLaedt(true)
    const neu: Spieltag = {
      ...spieltag,
      status: 'freigegeben',
      freigabe: { wer: rolle, wann: Date.now(), kommentar: kommentar || undefined },
      aktualisiertAm: Date.now(),
    }
    await spieltagSpeichern(neu)
    onAendern()
    setLaedt(false)
    setMelder(sprache === 'de' ? 'Spieltag freigegeben.' : 'Game day approved.')
  }

  const korrektur = async () => {
    setLaedt(true)
    const neu: Spieltag = {
      ...spieltag,
      status: 'fehler',
      freigabe: { wer: rolle, wann: Date.now(), kommentar: kommentar || 'Korrektur erbeten' },
      aktualisiertAm: Date.now(),
    }
    await spieltagSpeichern(neu)
    onAendern()
    setLaedt(false)
    setMelder(sprache === 'de' ? 'Korrektur eingetragen – zurück an Redaktion.' : 'Correction requested – back to editorial.')
  }

  const istPruefer = rolle === 'pruefer'

  return (
    <Karte
      titel={sprache === 'de' ? `Prüfen und freigeben · Tag ${spieltag.nr}` : `Check and approve · Day ${spieltag.nr}`}
      aktion={<StatusChip status={spieltag.status} sprache={sprache} />}
    >
      {prueffehler.length === 0 ? (
        <Hinweis art="gold">
          {sprache === 'de'
            ? 'Alle automatischen Prüfungen (Pflichtfelder, Beträge, Lösung) sind grün. Zur Freigabe: Cmd/Ctrl+Enter.'
            : 'All automatic checks (fields, amounts, solution) pass. To approve: Cmd/Ctrl+Enter.'}
        </Hinweis>
      ) : (
        <Hinweis art="rot" rolle="alert">
          <strong>{sprache === 'de' ? 'Fehler gefunden' : 'Errors found'}:</strong>
          <ul style={{ margin: '4px 0 0 16px' }}>
            {prueffehler.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </Hinweis>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="cockpit-knopf primaer"
          disabled={laedt || prueffehler.length > 0}
          onClick={freigeben}
        >
          {sprache === 'de' ? 'Prüfen und freigeben' : 'Check and approve'}
          <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>⌘↩</span>
        </button>
        {istPruefer && (
          <button type="button" className="cockpit-knopf sekundaer" disabled={laedt} onClick={korrektur}>
            {sprache === 'de' ? 'Korrektur anmerken' : 'Request correction'}
          </button>
        )}
      </div>

      <section style={{ marginTop: 16 }}>
        <Feld
          art="textarea"
          label={sprache === 'de' ? 'Kommentar (optional)' : 'Comment (optional)'}
          wert={kommentar}
          onAendern={setKommentar}
          hilfe={sprache === 'de' ? 'Wird mit der Freigabe/Korrektur gespeichert.' : 'Stored with the approval/correction.'}
        />
      </section>

      {melder && <Hinweis art="gold">{melder}</Hinweis>}

      <section style={{ marginTop: 16 }}>
        <strong>{sprache === 'de' ? 'Hinweis zum Export' : 'Export note'}</strong>
        <p style={{ fontSize: 13, color: 'var(--tm-grau)' }}>
          {sprache === 'de'
            ? 'Nach Freigabe erzeugt der Serien-Modus (/serie) die Anzeigen für alle Zeitungen und lädt sie nach monday hoch (ersetzt die alte Fassung). Diese Verbindung bleibt zunächst im bestehenden Serien-Modus; sie wird im nächsten Loop in das Cockpit integriert.'
            : 'After approval, the series mode (/serie) generates ads for all newspapers and uploads them to monday (replacing the old version). This link stays in the existing series mode for now; it will be integrated into the cockpit in a follow-up loop.'}
        </p>
      </section>
    </Karte>
  )
}
