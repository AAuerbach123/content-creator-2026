'use client'

// Phase 5 „Prüfen und freigeben“ (Vorschlag 4):
// 1. Pflichtfelder (Regeln je Spiel, Gewinner, Einwilligung, Textlänge)
// 2. „Alle Zeitungen prüfen“: jede Anzeige wird erzeugt und vom Einpass-Skript geprüft – nur Probleme werden gelistet
// 3. Freigabe erst bei grüner Prüfung des aktuellen Stands; Admin kann übersteuern (wird protokolliert)
// Nach der Freigabe stehen alle Verlagsgruppen auf „TMI: Korrektur OK“ → Kunden prüfen im Korrekturportal.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSprache } from '@/components/SpracheProvider'
import { VERLAGS_STATUS_TEXT, type Kampagne, type Spieltag, type VerlagsStatus } from '@/lib/cockpit/typen'
import { spieltagSpeichern } from '@/lib/cockpit/daten-client'
import { allePruefen, inhaltsStempel, kontextLaden, type Problem } from '@/lib/cockpit/anzeigen'
import { verlagsgruppen } from '@/lib/cockpit/verlagsgruppen'
import { gewinnplanPruefen } from '@/lib/cockpit/tagesstatus'
import { useIch } from './IchKontext'
import { pruefRegelnFuer } from '@/lib/cockpit/raetsel-regeln'
import Feld from './Feld'
import Hinweis from './Hinweis'
import Karte from './Karte'
import LeererZustand from './LeererZustand'
import StatusChip from './StatusChip'
import type { Vorschlag } from '@/lib/serie/types'

type Props = {
  spielId: string
  kampagne?: Kampagne
  spieltag?: Spieltag
  onAendern: () => void
  onSpeichern?: (s: Spieltag) => void
}

export default function FreigabePanel({ spielId, kampagne, spieltag, onAendern, onSpeichern }: Props) {
  const { sprache } = useSprache()
  const de = sprache === 'de'
  const { ich, darf } = useIch()
  const wer = ich?.benutzer.email ?? 'unbekannt'
  const [kommentar, setKommentar] = useState('')
  const [laedt, setLaedt] = useState(false)
  const [melder, setMelder] = useState<string | null>(null)
  const [lauf, setLauf] = useState<{ fertig: number; gesamt: number } | null>(null)
  const [uebersteuern, setUebersteuern] = useState(false)
  const abbruch = useRef(false)
  const freigabeRef = useRef<() => void>(() => undefined)
  const regeln = useMemo(() => pruefRegelnFuer(spielId), [spielId])

  // Cmd/Ctrl+Enter = freigeben
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        freigabeRef.current()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (!kampagne || !spieltag) {
    return (
      <LeererZustand
        titel={de ? 'Nichts zu prüfen' : 'Nothing to review'}
        text={de ? 'Erst Kampagne + Spieltage anlegen.' : 'Create a campaign and game days first.'}
      />
    )
  }

  const speichern = async (neu: Spieltag) => {
    if (onSpeichern) onSpeichern(neu)
    else { await spieltagSpeichern(neu); onAendern() }
  }

  const pflichtFehler = (() => {
    const fehler = regeln.pruefe(spieltag, [], kampagne, { quelle: spieltag.raetsel?.quelle ?? '' })
    if (spieltag.nr > 1) {
      if (spieltag.gewinner.length === 0) fehler.push(de ? 'Für diesen Spieltag sind noch keine Gewinner erfasst.' : 'No winners for this day yet.')
      for (const g of spieltag.gewinner) {
        if (!g.name.trim()) fehler.push(de ? 'Gewinner ohne Namen.' : 'Winner without name.')
        if (!g.einwilligung) fehler.push(de ? `Einwilligung von ${g.name || 'Gewinner'} fehlt.` : `Consent for ${g.name || 'winner'} missing.`)
        const max = spieltag.gewinner.length >= 2 ? 45 : 90
        if (g.gewinnertext.length > max) fehler.push(de ? `Zusatztext von ${g.name || 'Gewinner'} zu lang (${g.gewinnertext.length}/${max}).` : `Winner text too long (${g.gewinnertext.length}/${max}).`)
      }
      fehler.push(...gewinnplanPruefen(kampagne, spieltag).fehler)
    }
    return fehler
  })()

  const stempel = inhaltsStempel(spieltag)
  const p = spieltag.pruefung
  const pruefungAktuell = Boolean(p && p.stempel === stempel)
  const pruefungGruen = pruefungAktuell && p!.fehler === 0
  const vorschlag: Vorschlag = (kampagne.vorlageAbc as Vorschlag) ?? 'A'
  const kannFreigeben = pflichtFehler.length === 0 && (pruefungGruen || (uebersteuern && darf('admin'))) && darf('freigeben')

  const pruefen = async () => {
    setLaedt(true)
    setMelder(null)
    abbruch.current = false
    try {
      const k = await kontextLaden(kampagne, spieltag.datum.slice(0, 7))
      const erg = await allePruefen(k, spieltag, vorschlag, (fertig, gesamt) => setLauf({ fertig, gesamt }), () => abbruch.current)
      const fehler = erg.probleme.filter((x) => x.art === 'fehler').length
      await speichern({
        ...spieltag,
        pruefung: {
          am: Date.now(), von: wer, anzeigen: erg.anzeigen, fehler, warnungen: erg.probleme.length - fehler, stempel,
          probleme: erg.probleme.slice(0, 200).map((x: Problem) => ({ zeitungId: x.zeitungId, zeitung: x.zeitung, variante: x.variante, text: x.text, art: x.art })),
        },
        aktualisiertAm: Date.now(),
      })
      setMelder(fehler === 0
        ? (de ? `${erg.anzeigen} Anzeigen geprüft – keine Fehler.` : `${erg.anzeigen} ads checked – no errors.`)
        : (de ? `${erg.anzeigen} Anzeigen geprüft – ${fehler} Fehler, siehe Liste.` : `${erg.anzeigen} ads checked – ${fehler} errors.`))
    } catch (e) {
      setMelder((de ? 'Prüfung nicht möglich: ' : 'Check failed: ') + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLaedt(false)
      setLauf(null)
    }
  }

  const freigeben = async () => {
    if (!kannFreigeben || laedt) return
    setLaedt(true)
    let gruppen: string[] = []
    try {
      const k = await kontextLaden(kampagne, spieltag.datum.slice(0, 7))
      gruppen = verlagsgruppen(k.zeitungen).map((g) => g.schluessel)
    } catch { /* Gruppen später */ }
    const vs: Record<string, VerlagsStatus> = { ...(spieltag.verlagsStatus ?? {}) }
    for (const g of gruppen) if (vs[g] !== 'verlag-ok') vs[g] = 'tmi-korrektur-ok'
    // Fassung merken: Kunden sehen nach einer Korrektur „vorher / nachher“
    const fassung = {
      am: Date.now(),
      raetsel: spieltag.raetsel,
      gewinner: spieltag.gewinner.filter((g) => g.einwilligung && g.name.trim()).map((g) => ({ name: g.name, ort: g.ort, betrag: g.betrag, gewinnertext: g.gewinnertext, fotoHash: g.fotoHash })),
    }
    await speichern({
      ...spieltag,
      status: 'freigegeben',
      verlagsStatus: vs,
      vorherigeFassung: spieltag.freigabeFassung ?? spieltag.vorherigeFassung,
      freigabeFassung: fassung,
      freigabe: { wer, wann: Date.now(), kommentar: kommentar || undefined, uebersteuert: !pruefungGruen ? true : undefined },
      aktualisiertAm: Date.now(),
    })
    setLaedt(false)
    setMelder(de ? 'Spieltag freigegeben. Die Verlage können jetzt im Kundenportal prüfen.' : 'Game day approved. Publishers can now review in the client portal.')
    // Verlage mit hinterlegten E-Mail-Empfängern informieren (nur wenn der E-Mail-Versand eingerichtet ist)
    setTimeout(() => {
      void fetch('/api/cockpit/meldungen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aktion: 'kunden', spieltagId: spieltag.id }) })
        .then((r) => r.json())
        .then((j: { ergebnis?: string[] }) => { if (j.ergebnis?.length) setMelder((alt) => `${alt ?? ''} ${de ? 'Verlage informiert' : 'Publishers notified'}: ${j.ergebnis!.join(' · ')}`) })
        .catch(() => undefined)
    }, 1500)
  }
  freigabeRef.current = () => { void freigeben() }

  const korrektur = async () => {
    setLaedt(true)
    await speichern({ ...spieltag, status: 'fehler', freigabe: { wer, wann: Date.now(), kommentar: kommentar || 'Korrektur erbeten' }, aktualisiertAm: Date.now() })
    setLaedt(false)
    setMelder(de ? 'Korrektur eingetragen – zurück an die Redaktion.' : 'Correction requested – back to editorial.')
  }

  const fehlerListe = p?.probleme.filter((x) => x.art === 'fehler') ?? []
  const warnListe = p?.probleme.filter((x) => x.art === 'warnung') ?? []

  return (
    <Karte
      titel={de ? `Prüfen und freigeben · Tag ${spieltag.nr}` : `Check and approve · Day ${spieltag.nr}`}
      aktion={<StatusChip status={spieltag.status} sprache={sprache} />}
    >
      <ol className="cockpit-pruefschritte">
        <li className={pflichtFehler.length ? 'offen' : 'ok'}>
          <strong>{de ? '1 · Pflichtfelder' : '1 · Required fields'}</strong>
          {pflichtFehler.length === 0
            ? <span> ✓</span>
            : <ul>{pflichtFehler.map((f, i) => <li key={i}>{f}</li>)}</ul>}
        </li>
        <li className={pruefungGruen ? 'ok' : 'offen'}>
          <strong>{de ? '2 · Alle Zeitungen prüfen' : '2 · Check all newspapers'}</strong>
          {p && !pruefungAktuell && <span className="cockpit-chip gelb" style={{ marginLeft: 8 }}>{de ? 'seit der letzten Prüfung geändert' : 'changed since last check'}</span>}
          {pruefungAktuell && (
            <span style={{ marginLeft: 8 }} className={`cockpit-chip ${p!.fehler ? 'rot' : 'gruen'}`}>
              {de ? `${p!.anzeigen} Anzeigen · ${p!.fehler} Fehler · ${p!.warnungen} Hinweise` : `${p!.anzeigen} ads · ${p!.fehler} errors · ${p!.warnungen} notes`}
            </span>
          )}
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="cockpit-knopf sekundaer" onClick={pruefen} disabled={laedt}>
              {lauf ? `${de ? 'Prüfe' : 'Checking'} ${lauf.fertig}/${lauf.gesamt} …` : (de ? 'Alle Zeitungen prüfen' : 'Check all newspapers')}
            </button>
            {lauf && <button type="button" className="cockpit-knopf text" onClick={() => { abbruch.current = true }}>{de ? 'Abbrechen' : 'Cancel'}</button>}
            {lauf && <progress max={lauf.gesamt} value={lauf.fertig} style={{ width: 160 }} aria-label={de ? 'Fortschritt der Prüfung' : 'Check progress'} />}
          </div>
          {pruefungAktuell && fehlerListe.length > 0 && (
            <ul className="cockpit-problemliste">
              {fehlerListe.map((x, i) => <li key={i} className="fehler"><b>{x.zeitung ?? x.zeitungId}</b> <small>{x.variante}</small> – {x.text}</li>)}
            </ul>
          )}
          {pruefungAktuell && warnListe.length > 0 && (
            <details style={{ marginTop: 6 }}>
              <summary>{de ? `${warnListe.length} Hinweise (z. B. Platzhalter)` : `${warnListe.length} notes`}</summary>
              <ul className="cockpit-problemliste">
                {warnListe.map((x, i) => <li key={i}><b>{x.zeitung ?? x.zeitungId}</b> <small>{x.variante}</small> – {x.text}</li>)}
              </ul>
            </details>
          )}
        </li>
        <li className={spieltag.status === 'freigegeben' ? 'ok' : 'offen'}>
          <strong>{de ? '3 · Freigeben' : '3 · Approve'}</strong>
          <Feld
            art="textarea"
            label={de ? 'Kommentar (optional)' : 'Comment (optional)'}
            wert={kommentar}
            onAendern={setKommentar}
            hilfe={de ? 'Wird mit der Freigabe/Korrektur gespeichert.' : 'Stored with the approval/correction.'}
          />
          {darf('admin') && !pruefungGruen && pflichtFehler.length === 0 && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 10 }}>
              <input type="checkbox" checked={uebersteuern} onChange={(e) => setUebersteuern(e.target.checked)} />
              {de ? 'Ohne grüne Gesamtprüfung freigeben (Admin, wird protokolliert)' : 'Approve without green check (admin, logged)'}
            </label>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="cockpit-knopf primaer" disabled={laedt || !kannFreigeben} onClick={freigeben}>
              {de ? 'Freigeben' : 'Approve'}
              <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>⌘↩</span>
            </button>
            {darf('freigeben') && (
              <button type="button" className="cockpit-knopf sekundaer" disabled={laedt} onClick={korrektur}>
                {de ? 'Korrektur anmerken' : 'Request correction'}
              </button>
            )}
          </div>
          {!darf('freigeben') && <p style={{ fontSize: 13 }}>{de ? 'Freigeben dürfen Redaktion, Prüfer und Admin.' : 'Editorial, reviewers and admins can approve.'}</p>}
          {!kannFreigeben && darf('freigeben') && pflichtFehler.length === 0 && !pruefungGruen && (
            <p style={{ fontSize: 13 }}>{de ? 'Zuerst „Alle Zeitungen prüfen“ – die Freigabe ist erst bei grüner Prüfung möglich.' : 'Run “Check all newspapers” first.'}</p>
          )}
          {spieltag.freigabe && (
            <p style={{ fontSize: 13, marginTop: 8 }}>
              {de ? 'Zuletzt: ' : 'Last: '}{spieltag.status === 'freigegeben' ? (de ? 'freigegeben' : 'approved') : (de ? 'Korrektur' : 'correction')}
              {' · '}{spieltag.freigabe.wer}{' · '}{new Date(spieltag.freigabe.wann).toLocaleString(de ? 'de-DE' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}
              {spieltag.freigabe.uebersteuert ? (de ? ' · ohne grüne Prüfung' : ' · without green check') : ''}
              {spieltag.freigabe.kommentar ? ` · „${spieltag.freigabe.kommentar}“` : ''}
            </p>
          )}
        </li>
      </ol>

      {melder && <Hinweis art="gold">{melder}</Hinweis>}

      {spieltag.status === 'freigegeben' && (
        <p style={{ marginTop: 12 }}>
          <a href="/cockpit/monday" className="cockpit-knopf sekundaer">{de ? 'Anzeigen-PDFs erzeugen (ZIP / nach monday) →' : 'Create ad PDFs (ZIP / monday) →'}</a>
        </p>
      )}

      {Object.keys(spieltag.verlagsStatus ?? {}).length > 0 && (
        <section style={{ marginTop: 16 }}>
          <strong>{de ? 'Rückmeldungen der Verlage (Kundenportal)' : 'Publisher feedback (client portal)'}</strong>
          <ul className="cockpit-problemliste" style={{ marginTop: 6 }}>
            {Object.entries(spieltag.verlagsStatus ?? {}).map(([g, st]) => {
              const offen = (spieltag.portalKommentare?.[g] ?? []).filter((c) => !c.erledigt)
              return (
                <li key={g} className={st === 'verlag-fehler' ? 'fehler' : ''}>
                  <b>{g}</b>: {VERLAGS_STATUS_TEXT[st]?.[de ? 'de' : 'en'] ?? st}
                  {offen.length > 0 && <> · {offen.map((c) => `„${c.text}“ (${c.von})`).join(' · ')}</>}
                </li>
              )
            })}
          </ul>
          <a href="/cockpit/portal" className="cockpit-knopf text" style={{ paddingLeft: 0 }}>{de ? 'Im Kundenportal bearbeiten →' : 'Handle in client portal →'}</a>
        </section>
      )}
    </Karte>
  )
}
